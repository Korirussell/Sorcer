export interface UserStats {
  userId: string;
  carbonSaved: number;
  promptsCount: number;
  sustainabilityScore: number;
  rank: number;
  streak: number;
  avgCarbonPerPrompt: number;
  bestDay: { date: string; carbonSaved: number };
  favoriteModel: string;
  topRegion: string;
  joinedAt: Date;
  lastActiveAt: Date;
  ecoModePercent: number;
  weeklyData: { day: string; carbon: number }[];
  modelUsage: { model: string; count: number; color: string }[];
}

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: { current: number; target: number };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar: string;
  carbonSaved: number;
  promptsCount: number;
  sustainabilityScore: number;
  rank: number;
  badgeCount: number;
}

export type LeaderboardFilter = "all-time" | "month" | "week";
export type LeaderboardSort = "carbonSaved" | "sustainabilityScore" | "promptsCount";
