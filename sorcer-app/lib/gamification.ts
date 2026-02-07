import type { Badge, UserStats, LeaderboardEntry } from "@/types/gamification";

// ─── Score Calculation ───────────────────────────────────────────────────────

export function calculateSustainabilityScore(
  carbonSaved: number,
  promptsCount: number,
  ecoModePercent: number
): number {
  if (promptsCount === 0) return 0;
  const carbonFactor = Math.min(carbonSaved / 500, 1) * 40;
  const ecoFactor = (ecoModePercent / 100) * 40;
  const volumeFactor = Math.min(promptsCount / 1000, 1) * 20;
  return Math.round(carbonFactor + ecoFactor + volumeFactor);
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatCarbonAmount(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  if (kg >= 1) return `${kg.toFixed(1)}kg`;
  return `${(kg * 1000).toFixed(0)}g`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Badge Definitions ───────────────────────────────────────────────────────

const BADGE_DEFS: Omit<Badge, "unlocked" | "unlockedAt" | "progress">[] = [
  { id: "carbon_hero_1", name: "Seedling Saver", description: "Save 10kg CO₂", icon: "🌱", rarity: "common" },
  { id: "carbon_hero_2", name: "Forest Guardian", description: "Save 100kg CO₂", icon: "🌲", rarity: "rare" },
  { id: "carbon_hero_3", name: "Carbon Titan", description: "Save 500kg CO₂", icon: "🏔️", rarity: "epic" },
  { id: "carbon_hero_4", name: "Planet Keeper", description: "Save 1,000kg CO₂", icon: "🌍", rarity: "legendary" },
  { id: "eco_warrior_1", name: "Green Apprentice", description: "Use eco mode 50 times", icon: "🧙", rarity: "common" },
  { id: "eco_warrior_2", name: "Eco Mage", description: "Use eco mode 100 times", icon: "🧙‍♂️", rarity: "rare" },
  { id: "eco_warrior_3", name: "Eco Archmage", description: "Use eco mode 500 times", icon: "⚡", rarity: "epic" },
  { id: "streak_1", name: "Consistent Caster", description: "7-day streak", icon: "🔥", rarity: "common" },
  { id: "streak_2", name: "Relentless Wizard", description: "30-day streak", icon: "💫", rarity: "rare" },
  { id: "streak_3", name: "Eternal Flame", description: "100-day streak", icon: "☀️", rarity: "legendary" },
  { id: "efficiency_1", name: "Precision Caster", description: "Achieve 90+ sustainability score", icon: "🎯", rarity: "epic" },
  { id: "explorer_1", name: "Realm Explorer", description: "Use 5+ data center regions", icon: "🗺️", rarity: "rare" },
  { id: "early_adopter", name: "First Scroll", description: "Join in the first month", icon: "📜", rarity: "legendary" },
  { id: "volume_1", name: "Prolific Scribe", description: "Send 1,000 prompts", icon: "✍️", rarity: "rare" },
];

function badgeTarget(id: string): number {
  const targets: Record<string, number> = {
    carbon_hero_1: 10, carbon_hero_2: 100, carbon_hero_3: 500, carbon_hero_4: 1000,
    eco_warrior_1: 50, eco_warrior_2: 100, eco_warrior_3: 500,
    streak_1: 7, streak_2: 30, streak_3: 100,
    efficiency_1: 90, explorer_1: 5, early_adopter: 1, volume_1: 1000,
  };
  return targets[id] ?? 1;
}

function badgeCurrent(id: string, stats: UserStats): number {
  if (id.startsWith("carbon_hero")) return stats.carbonSaved;
  if (id.startsWith("eco_warrior")) return Math.round(stats.promptsCount * stats.ecoModePercent / 100);
  if (id.startsWith("streak")) return stats.streak;
  if (id === "efficiency_1") return stats.sustainabilityScore;
  if (id === "explorer_1") return 3; // mock
  if (id === "early_adopter") return 1; // mock
  if (id === "volume_1") return stats.promptsCount;
  return 0;
}

export function getBadgesForUser(stats: UserStats): Badge[] {
  return BADGE_DEFS.map((def) => {
    const target = badgeTarget(def.id);
    const current = badgeCurrent(def.id, stats);
    const unlocked = current >= target;
    return {
      ...def,
      unlocked,
      unlockedAt: unlocked ? new Date(Date.now() - Math.random() * 30 * 86400000) : undefined,
      progress: { current: Math.min(current, target), target },
    };
  });
}

export function getAchievementProgress(
  badgeId: string,
  stats: UserStats
): { current: number; target: number; percent: number } {
  const target = badgeTarget(badgeId);
  const current = Math.min(badgeCurrent(badgeId, stats), target);
  return { current, target, percent: Math.round((current / target) * 100) };
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

export const MOCK_USER_STATS: UserStats = {
  userId: "user_001",
  carbonSaved: 127.5,
  promptsCount: 342,
  sustainabilityScore: 82,
  rank: 14,
  streak: 12,
  avgCarbonPerPrompt: 0.37,
  bestDay: { date: "2026-01-23", carbonSaved: 8.4 },
  favoriteModel: "Gemini 2.5 Flash Lite",
  topRegion: "us-central1 (The Dalles)",
  joinedAt: new Date("2025-12-01"),
  lastActiveAt: new Date(),
  ecoModePercent: 78,
  weeklyData: [
    { day: "Mon", carbon: 2.1 },
    { day: "Tue", carbon: 3.4 },
    { day: "Wed", carbon: 1.8 },
    { day: "Thu", carbon: 4.2 },
    { day: "Fri", carbon: 2.9 },
    { day: "Sat", carbon: 1.2 },
    { day: "Sun", carbon: 0.8 },
  ],
  modelUsage: [
    { model: "Gemini Flash Lite", count: 180, color: "#4B6A4C" },
    { model: "Claude Haiku", count: 95, color: "#DDA059" },
    { model: "GPT-5.2", count: 67, color: "#B52121" },
  ],
};

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { userId: "u1", name: "EcoMancer", avatar: "🧙‍♂️", carbonSaved: 892.3, promptsCount: 2341, sustainabilityScore: 97, rank: 1, badgeCount: 12 },
  { userId: "u2", name: "GreenOracle", avatar: "🌿", carbonSaved: 754.1, promptsCount: 1892, sustainabilityScore: 95, rank: 2, badgeCount: 11 },
  { userId: "u3", name: "CarbonSlayer", avatar: "⚔️", carbonSaved: 681.7, promptsCount: 1654, sustainabilityScore: 93, rank: 3, badgeCount: 10 },
  { userId: "u4", name: "TreeWhisperer", avatar: "🌳", carbonSaved: 543.2, promptsCount: 1432, sustainabilityScore: 91, rank: 4, badgeCount: 9 },
  { userId: "u5", name: "WindRider", avatar: "🌬️", carbonSaved: 498.6, promptsCount: 1287, sustainabilityScore: 89, rank: 5, badgeCount: 8 },
  { userId: "u6", name: "SolarSage", avatar: "☀️", carbonSaved: 421.0, promptsCount: 1156, sustainabilityScore: 87, rank: 6, badgeCount: 8 },
  { userId: "u7", name: "MossKnight", avatar: "🛡️", carbonSaved: 367.4, promptsCount: 987, sustainabilityScore: 86, rank: 7, badgeCount: 7 },
  { userId: "u8", name: "LeafBlade", avatar: "🍃", carbonSaved: 312.8, promptsCount: 876, sustainabilityScore: 85, rank: 8, badgeCount: 7 },
  { userId: "u9", name: "FrostGuard", avatar: "❄️", carbonSaved: 256.1, promptsCount: 743, sustainabilityScore: 84, rank: 9, badgeCount: 6 },
  { userId: "u10", name: "EmberWitch", avatar: "🔮", carbonSaved: 198.5, promptsCount: 654, sustainabilityScore: 83, rank: 10, badgeCount: 6 },
  { userId: "u11", name: "StormCaller", avatar: "⛈️", carbonSaved: 167.2, promptsCount: 543, sustainabilityScore: 82, rank: 11, badgeCount: 5 },
  { userId: "u12", name: "DuskWarden", avatar: "🌅", carbonSaved: 145.8, promptsCount: 487, sustainabilityScore: 81, rank: 12, badgeCount: 5 },
  { userId: "u13", name: "RiverSong", avatar: "🌊", carbonSaved: 132.1, promptsCount: 412, sustainabilityScore: 80, rank: 13, badgeCount: 4 },
  { userId: "user_001", name: "You", avatar: "🧙", carbonSaved: 127.5, promptsCount: 342, sustainabilityScore: 82, rank: 14, badgeCount: 5 },
  { userId: "u15", name: "CloudDancer", avatar: "☁️", carbonSaved: 98.3, promptsCount: 298, sustainabilityScore: 78, rank: 15, badgeCount: 4 },
  { userId: "u16", name: "StoneMage", avatar: "🪨", carbonSaved: 76.4, promptsCount: 234, sustainabilityScore: 74, rank: 16, badgeCount: 3 },
  { userId: "u17", name: "FlameKeeper", avatar: "🕯️", carbonSaved: 54.2, promptsCount: 187, sustainabilityScore: 70, rank: 17, badgeCount: 3 },
  { userId: "u18", name: "NightOwl", avatar: "🦉", carbonSaved: 32.1, promptsCount: 123, sustainabilityScore: 65, rank: 18, badgeCount: 2 },
  { userId: "u19", name: "Wanderer", avatar: "🚶", carbonSaved: 18.7, promptsCount: 76, sustainabilityScore: 58, rank: 19, badgeCount: 1 },
  { userId: "u20", name: "Newcomer", avatar: "🌟", carbonSaved: 5.2, promptsCount: 23, sustainabilityScore: 42, rank: 20, badgeCount: 1 },
];
