export interface UserProfile {
  id: string;
  name: string;
  department: string;
  year: number;
  phoneWhatsApp: string;
  avatarUrl: string;
}

export interface SkillProfile {
  id: string;
  userId: string;
  skillsOffering: string[];
  skillsNeeded: string[];
  bio: string;
}

export interface SkillSwipe {
  swiperUserId: string;
  targetUserId: string;
  action: 'LIKE' | 'PASS';
  timestamp: number;
}

export interface SkillMatch {
  id: string;
  userAId: string;
  userBId: string;
  status: 'ACTIVE' | 'CLOSED';
  messageCount: number;
  maxMessages: number;
}

export interface MatchMessage {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  isAiIcebreaker: boolean;
  timestamp: number;
}

export interface GoodsListing {
  id: string;
  sellerId: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
  askingPrice: number;
  suggestedMrp: number;
  isApprovedByAi: boolean;
  status: 'AVAILABLE' | 'PENDING' | 'SOLD';
}

export interface TradeSnapshot {
  users: UserProfile[];
  skills: SkillProfile[];
  swipes: SkillSwipe[];
  matches: SkillMatch[];
  messages: MatchMessage[];
  goods: GoodsListing[];
}

export interface TradeRepository {
  getSnapshot(): Promise<TradeSnapshot>;
  recordSwipe(swipe: SkillSwipe): Promise<SkillMatch | null>;
  resetSkillDeck(userId: string): Promise<void>;
  getMatchMessages(matchId: string): Promise<MatchMessage[]>;
  addMessage(matchId: string, senderId: string, text: string, isAiIcebreaker?: boolean): Promise<MatchMessage>;
  createGoodsListing(listing: Omit<GoodsListing, 'id' | 'status'>): Promise<GoodsListing>;
  updateGoodsListing(listing: GoodsListing): Promise<void>;
}
