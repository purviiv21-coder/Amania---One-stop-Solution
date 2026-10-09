import { SCAN_SERVER_URL } from '../data/final_api';
import { SkillProfile, UserProfile } from './tradeTypes';

export type AiSource = 'Gemma 4' | 'Offline demo';
export type GoodsReview = { approved: boolean; reason: string; source: AiSource };
export type AiText = { text: string; source: AiSource };

async function imagePayload(uri: string): Promise<{ mimeType: string; imageBase64: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Could not read the listing photo.'));
      else resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('Could not read the listing photo.'));
    reader.readAsDataURL(blob);
  });
  return { mimeType: blob.type || 'image/jpeg', imageBase64 };
}

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${SCAN_SERVER_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : `Trade AI request failed (${response.status}).`;
    if (response.status === 503 && /GEMINI_API_KEY is missing/i.test(message)) throw Object.assign(new Error(message), { offlineFallback: true });
    throw new Error(message);
  }
  return payload;
}

function isOffline(error: unknown): boolean { return error instanceof TypeError || Boolean(error && typeof error === 'object' && 'offlineFallback' in error); }

export async function makeSkillIcebreaker(self: UserProfile, selfSkills: SkillProfile | undefined, other: UserProfile, otherSkills: SkillProfile | undefined): Promise<AiText> {
  const local = offlineIcebreaker(self, selfSkills, other, otherSkills);
  try {
    const payload = await post('/api/trade/icebreaker', { self, selfSkills, other, otherSkills });
    if (typeof payload.text !== 'string' || !payload.text.trim()) throw new Error('Gemma 4 returned an empty icebreaker.');
    return { text: payload.text.trim(), source: 'Gemma 4' };
  } catch {
    // Chat should remain usable when the optional AI endpoint is offline, rate limited, or misconfigured.
    return { text: local, source: 'Offline demo' };
  }
}

function offlineIcebreaker(self: UserProfile, own: SkillProfile | undefined, other: UserProfile, theirs: SkillProfile | undefined): string {
  const offered = theirs?.skillsOffering[0] || 'a skill';
  const wanted = own?.skillsNeeded.find((item) => theirs?.skillsOffering.some((skill) => skill.toLowerCase() === item.toLowerCase())) || own?.skillsOffering[0] || 'something you know';
  return `✨ Gemma Icebreaker: ${other.name.split(' ')[0]} can show you ${offered}, and you can help with ${wanted}. What should you make together?`;
}

export async function inspectGoodsPhoto(title: string, category: string, uri: string): Promise<GoodsReview> {
  try {
    const image = await imagePayload(uri);
    const payload = await post('/api/trade/goods-check', { title, category, ...image });
    if (typeof payload.approved !== 'boolean' || typeof payload.reason !== 'string') throw new Error('Gemma 4 returned an incomplete photo review.');
    return { approved: payload.approved, reason: payload.reason, source: 'Gemma 4' };
  } catch (error) {
    if (!isOffline(error)) throw error;
    const rejected = /weapon|drug|alcohol|tobacco|explicit|adult content|exam paper|answer key|counterfeit/i.test(`${title} ${category}`);
    return { approved: !rejected, reason: rejected ? 'This item is not suitable for a campus goods listing.' : 'Offline demo review: the title and category look campus-appropriate. Connect Gemma 4 for image review.', source: 'Offline demo' };
  }
}

export async function generateGoodsDescription(title: string, category: string, askingPrice: number, mrp: number, uri: string): Promise<AiText> {
  try {
    const image = await imagePayload(uri);
    const payload = await post('/api/trade/goods-description', { title, category, askingPrice, mrp, ...image });
    if (typeof payload.text !== 'string' || !payload.text.trim()) throw new Error('Gemma 4 returned an empty listing description.');
    return { text: payload.text.trim(), source: 'Gemma 4' };
  } catch (error) {
    if (!isOffline(error)) throw error;
    return { text: `${title} for campus pickup. ${category} listing, priced at ₹${askingPrice} (retail MRP ₹${mrp}). Add condition and meetup details before posting.`, source: 'Offline demo' };
  }
}
