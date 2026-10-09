import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoodsListing, SkillMatch, SkillSwipe, TradeRepository, TradeSnapshot, UserProfile } from './tradeTypes';

export const DEMO_TRADE_USER_ID = 'demo-you';
const STORAGE_KEY = '@amania/trade/v1';

const demoUsers: UserProfile[] = [
  { id: DEMO_TRADE_USER_ID, name: 'You', department: 'Computer Science', year: 2, phoneWhatsApp: '+91 90000 00001', avatarUrl: '' },
  { id: 'rohan', name: 'Rohan Mehta', department: 'Information Science', year: 3, phoneWhatsApp: '+91 98765 43210', avatarUrl: 'https://i.pravatar.cc/240?img=12' },
  { id: 'aisha', name: 'Aisha Rao', department: 'Electronics', year: 2, phoneWhatsApp: '+91 98765 43211', avatarUrl: 'https://i.pravatar.cc/240?img=47' },
  { id: 'kavya', name: 'Kavya Nair', department: 'Mechanical Engineering', year: 1, phoneWhatsApp: '+91 98765 43212', avatarUrl: 'https://i.pravatar.cc/240?img=44' },
  { id: 'arjun', name: 'Arjun Das', department: 'Computer Science', year: 4, phoneWhatsApp: '+91 98765 43213', avatarUrl: 'https://i.pravatar.cc/240?img=11' },
];

export const MOCK_TRADE_SNAPSHOT: TradeSnapshot = {
  users: demoUsers,
  skills: [
    { id: 'skill-you', userId: DEMO_TRADE_USER_ID, skillsOffering: ['Figma', 'UI design'], skillsNeeded: ['Python', 'Data structures'], bio: 'I’m learning by building small campus projects and looking for a skill swap.' },
    { id: 'skill-rohan', userId: 'rohan', skillsOffering: ['Python', 'Data structures'], skillsNeeded: ['Figma', 'UI design'], bio: 'I like turning messy ideas into small projects. Happy to teach Python over a coffee between classes.' },
    { id: 'skill-aisha', userId: 'aisha', skillsOffering: ['Figma', 'Poster design'], skillsNeeded: ['Arduino', 'Embedded C'], bio: 'Design student at heart, electronics student by timetable. Looking for a project partner.' },
    { id: 'skill-kavya', userId: 'kavya', skillsOffering: ['3D printing', 'CAD'], skillsNeeded: ['Photography', 'Video editing'], bio: 'Usually in the workshop or looking for a new campus project to join.' },
    { id: 'skill-arjun', userId: 'arjun', skillsOffering: ['React Native', 'Git'], skillsNeeded: ['Public speaking', 'Pitch decks'], bio: 'Built a few student apps and would love to help someone get their first prototype running.' },
  ],
  swipes: [{ swiperUserId: 'rohan', targetUserId: DEMO_TRADE_USER_ID, action: 'LIKE', timestamp: Date.now() - 60_000 }],
  matches: [],
  messages: [],
  goods: [
    { id: 'goods-calculator', sellerId: 'rohan', title: 'Casio scientific calculator', category: 'Calculators', imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=80', description: 'FX-991EX, lightly used and all keys work. Can meet near the library.', askingPrice: 650, suggestedMrp: 1400, isApprovedByAi: true, status: 'AVAILABLE' },
    { id: 'goods-labcoat', sellerId: 'aisha', title: 'Lab coat · size M', category: 'Lab Gear', imageUrl: 'https://images.unsplash.com/photo-1581093458791-9d42e3c3c6cf?auto=format&fit=crop&w=900&q=80', description: 'Clean lab coat, worn for one semester. Pick up on campus.', askingPrice: 350, suggestedMrp: 800, isApprovedByAi: true, status: 'AVAILABLE' },
    { id: 'goods-textbook', sellerId: 'kavya', title: 'Engineering Mechanics', category: 'Textbooks', imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80', description: 'Good condition, notes on a few chapters, no missing pages.', askingPrice: 400, suggestedMrp: 950, isApprovedByAi: true, status: 'AVAILABLE' },
    { id: 'goods-headphones', sellerId: 'arjun', title: 'USB-C headphones', category: 'Electronics', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', description: 'Spare wired headphones. Tested and working.', askingPrice: 500, suggestedMrp: 1100, isApprovedByAi: true, status: 'AVAILABLE' },
  ],
};

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function mergeById<T extends { id: string }>(seed: T[], saved: unknown): T[] {
  if (!Array.isArray(saved)) return clone(seed);
  const byId = new Map(seed.map((item) => [item.id, item]));
  for (const item of saved as T[]) if (item && typeof item.id === 'string') byId.set(item.id, item);
  return [...byId.values()];
}

/** Offline-first repository used by the hackathon build. Replace this class with a Supabase,
 * Firebase, or SQLite adapter without changing screens or the repository contract. */
export class MockTradeRepository implements TradeRepository {
  private snapshot: TradeSnapshot = clone(MOCK_TRADE_SNAPSHOT);
  private ready: Promise<void>;

  constructor() {
    this.ready = AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try {
        const stored = JSON.parse(saved) as Partial<TradeSnapshot>;
        const swipeMap = new Map<string, SkillSwipe>();
        for (const swipe of [...MOCK_TRADE_SNAPSHOT.swipes, ...(Array.isArray(stored.swipes) ? stored.swipes : [])]) swipeMap.set(`${swipe.swiperUserId}:${swipe.targetUserId}`, swipe);
        this.snapshot = {
          users: mergeById(MOCK_TRADE_SNAPSHOT.users, stored.users),
          skills: mergeById(MOCK_TRADE_SNAPSHOT.skills, stored.skills),
          swipes: [...swipeMap.values()],
          matches: mergeById(MOCK_TRADE_SNAPSHOT.matches, stored.matches),
          messages: mergeById(MOCK_TRADE_SNAPSHOT.messages, stored.messages),
          goods: mergeById(MOCK_TRADE_SNAPSHOT.goods, stored.goods),
        };
      }
      catch { this.snapshot = clone(MOCK_TRADE_SNAPSHOT); }
    }).catch(() => { this.snapshot = clone(MOCK_TRADE_SNAPSHOT); });
  }

  private async persist(): Promise<void> { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot)); }
  async getSnapshot(): Promise<TradeSnapshot> { await this.ready; return clone(this.snapshot); }

  async recordSwipe(swipe: SkillSwipe): Promise<SkillMatch | null> {
    await this.ready;
    const existingIndex = this.snapshot.swipes.findIndex((item) => item.swiperUserId === swipe.swiperUserId && item.targetUserId === swipe.targetUserId);
    const existing = existingIndex >= 0 ? this.snapshot.swipes[existingIndex] : null;
    if (existing?.action === 'LIKE') return null;
    if (existingIndex >= 0) this.snapshot.swipes[existingIndex] = swipe;
    else this.snapshot.swipes.push(swipe);
    const reverse = this.snapshot.swipes.find((item) => item.swiperUserId === swipe.targetUserId && item.targetUserId === swipe.swiperUserId && item.action === 'LIKE');
    let match: SkillMatch | null = null;
    if (swipe.action === 'LIKE' && reverse) {
      match = this.snapshot.matches.find((item) => item.status === 'ACTIVE' && ((item.userAId === swipe.swiperUserId && item.userBId === swipe.targetUserId) || (item.userAId === swipe.targetUserId && item.userBId === swipe.swiperUserId))) ?? null;
      if (!match) {
        match = { id: `match-${Date.now()}-${swipe.targetUserId}`, userAId: swipe.swiperUserId, userBId: swipe.targetUserId, status: 'ACTIVE', messageCount: 0, maxMessages: 8 };
        this.snapshot.matches.push(match);
      }
    }
    await this.persist();
    return match ? clone(match) : null;
  }

  async resetSkillDeck(userId: string): Promise<void> {
    await this.ready;
    this.snapshot.swipes = this.snapshot.swipes.filter((item) => item.swiperUserId !== userId);
    await this.persist();
  }

  async getMatchMessages(matchId: string) { await this.ready; return clone(this.snapshot.messages.filter((item) => item.matchId === matchId).sort((a, b) => a.timestamp - b.timestamp)); }

  async addMessage(matchId: string, senderId: string, text: string, isAiIcebreaker = false) {
    await this.ready;
    const match = this.snapshot.matches.find((item) => item.id === matchId && item.status === 'ACTIVE');
    if (!match) throw new Error('This skill match is no longer active.');
    if (!isAiIcebreaker && match.messageCount >= match.maxMessages) throw new Error('Message limit reached. Share contact details and meet on campus.');
    const message = { id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId, senderId, text: text.trim(), isAiIcebreaker, timestamp: Date.now() };
    if (!message.text) throw new Error('Write a message first.');
    this.snapshot.messages.push(message);
    if (!isAiIcebreaker) match.messageCount += 1;
    await this.persist();
    return clone(message);
  }

  async createGoodsListing(listing: Omit<GoodsListing, 'id' | 'status'>) {
    await this.ready;
    const saved: GoodsListing = { ...listing, id: `goods-${Date.now()}`, status: listing.isApprovedByAi ? 'AVAILABLE' : 'PENDING' };
    this.snapshot.goods.unshift(saved);
    await this.persist();
    return clone(saved);
  }

  async updateGoodsListing(listing: GoodsListing) {
    await this.ready;
    this.snapshot.goods = this.snapshot.goods.map((item) => item.id === listing.id ? clone(listing) : item);
    await this.persist();
  }
}
