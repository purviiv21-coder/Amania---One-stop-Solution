import { ClubProfile, ExtractedEvent } from './final_types';

export const SCAN_SERVER_URL = process.env.EXPO_PUBLIC_SCAN_SERVER_URL || 'http://127.0.0.1:8787';

export async function scanEventPoster(uri: string): Promise<ExtractedEvent> {
  const image = await fetch(uri);
  const blob = await image.blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Could not read the poster image.'));
      else resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('Could not read the poster image.'));
    reader.readAsDataURL(blob);
  });
  let response: Response;
  try {
    response = await fetch(`${SCAN_SERVER_URL}/api/scan-poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mimeType: blob.type || 'image/jpeg', imageBase64: data }),
    });
  } catch {
    throw new Error(`Can't reach the scan server at ${SCAN_SERVER_URL}. Start it with npm run scan-server; for USB use adb reverse tcp:8787 tcp:8787.`);
  }
  const payload = await response.json().catch(() => ({})) as { error?: string; event?: ExtractedEvent };
  if (!response.ok) throw new Error(payload.error || `Poster scan failed (${response.status}).`);
  if (!payload.event?.title) throw new Error('The scanner could not find event details. Try a clear, well-lit poster.');
  return payload.event;
}

export async function generateWhyAttend(event: ExtractedEvent): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${SCAN_SERVER_URL}/api/why-attend`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }),
    });
  } catch {
    throw new Error(`Can't reach the scan server at ${SCAN_SERVER_URL}.`);
  }
  const payload = await response.json().catch(() => ({})) as { error?: string; why?: string };
  if (!response.ok) throw new Error(payload.error || `Could not prepare event note (${response.status}).`);
  return payload.why || '';
}

export type ClubChatTurn = { role: 'user' | 'assistant'; text: string };

export async function askClubGuide(question: string, clubs: ClubProfile[], history: ClubChatTurn[]): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${SCAN_SERVER_URL}/api/club-chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, clubs, history: history.slice(-8) }),
    });
  } catch {
    throw new Error(`Can’t reach the club guide at ${SCAN_SERVER_URL}. Start the scan server with npm run scan-server and, over USB, run adb reverse tcp:8787 tcp:8787.`);
  }
  const payload = await response.json().catch(() => ({})) as { answer?: string; error?: string };
  if (!response.ok) throw new Error(payload.error || `The club guide could not answer (${response.status}).`);
  if (!payload.answer?.trim()) throw new Error('Gemma 4 returned an empty answer. Please try again.');
  return payload.answer.trim();
}

export async function draftClubDescription(club: Pick<ClubProfile, 'name' | 'category' | 'tagline' | 'about' | 'whyJoin' | 'achievements' | 'joiningInfo'>): Promise<[string, string]> {
  let response: Response;
  try {
    response = await fetch(`${SCAN_SERVER_URL}/api/club-description`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ club }),
    });
  } catch {
    throw new Error(`Can’t reach the club guide at ${SCAN_SERVER_URL}. Start the scan server and, over USB, run adb reverse tcp:8787 tcp:8787.`);
  }
  const payload = await response.json().catch(() => ({})) as { paragraphs?: unknown; error?: string };
  if (!response.ok) throw new Error(payload.error || `Gemma 4 could not draft the description (${response.status}).`);
  if (!Array.isArray(payload.paragraphs) || payload.paragraphs.length !== 2 || payload.paragraphs.some((item) => typeof item !== 'string')) {
    throw new Error('Gemma 4 returned an incomplete draft. Try again.');
  }
  return [String(payload.paragraphs[0]), String(payload.paragraphs[1])];
}
