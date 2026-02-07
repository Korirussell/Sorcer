"use client";

import { useState } from "react";
import { X, Trophy, Leaf, Zap, Flame, TrendingUp, Users, Globe } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  carbonSaved: string;
  promptsCount: number;
  sustainabilityScore: number;
  rank: number;
  badges: string[];
}

export function ProfileComparison() {
  const [selectedTab, setSelectedTab] = useState<"overview" | "leaderboard">("overview");

  // Mock user data
  const currentUser: UserProfile = {
    id: "user1",
    name: "Anonymous Sorcer",
    avatar: "🧙‍♂️",
    carbonSaved: "127.5 kg CO₂",
    promptsCount: 342,
    sustainabilityScore: 87,
    rank: 42,
    badges: ["Eco Warrior", "Carbon Saver", "Green Mage"]
  };

  // Mock leaderboard data
  const leaderboard: UserProfile[] = [
    {
      id: "user1",
      name: "Anonymous Sorcer",
      avatar: "🧙‍♂️",
      carbonSaved: "127.5 kg CO₂",
      promptsCount: 342,
      sustainabilityScore: 87,
      rank: 42,
      badges: ["Eco Warrior", "Carbon Saver"]
    },
    {
      id: "user2", 
      name: "GreenWizard",
      avatar: "🧙",
      carbonSaved: "256.3 kg CO₂",
      promptsCount: 567,
      sustainabilityScore: 94,
      rank: 15,
      badges: ["Eco Master", "Tree Guardian", "Nature's Ally"]
    },
    {
      id: "user3",
      name: "CarbonDruid",
      avatar: "🧙‍♀️", 
      carbonSaved: "189.7 kg CO₂",
      promptsCount: 423,
      sustainabilityScore: 91,
      rank: 23,
      badges: ["Forest Protector", "Renewable Champion"]
    },
    {
      id: "user4",
      name: "TechMage",
      avatar: "🧙‍♂️",
      carbonSaved: "89.2 kg CO₂", 
      promptsCount: 298,
      sustainabilityScore: 76,
      rank: 67,
      badges: ["Efficiency Expert"]
    },
    {
      id: "user5",
      name: "EarthGuardian",
      avatar: "🧙‍♀️",
      carbonSaved: "312.8 kg CO₂",
      promptsCount: 612,
      sustainabilityScore: 96,
      rank: 8,
      badges: ["Carbon Legend", "Eco Titan", "World Saver"]
    }
  ].sort((a, b) => a.rank - b.rank);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-yellow-600";
    return "text-orange-600";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank <= 10) return "⭐";
    return "";
  };

  return (
    <div className="fixed inset-0 bg-void/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-mist">Sorcer Community</h2>
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg border border-white/10 bg-black/20 backdrop-blur-md text-mist hover:border-mana/50 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedTab === "overview"
                  ? "bg-mana/20 text-mana border border-mana/30"
                  : "text-mist/70 hover:text-mist hover:bg-white/5"
              }`}
            >
              Your Profile
            </button>
            <button
              onClick={() => setSelectedTab("leaderboard")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedTab === "leaderboard"
                  ? "bg-mana/20 text-mana border border-mana/30"
                  : "text-mist/70 hover:text-mist hover:bg-white/5"
              }`}
            >
              Leaderboard
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {selectedTab === "overview" && (
            <div className="space-y-6">
              {/* User Profile Card */}
              <div className="bg-gradient-to-br from-mana/10 to-toxic/10 border border-mana/30 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-6xl">{currentUser.avatar}</div>
                  <div>
                    <h3 className="text-xl font-bold text-mist">{currentUser.name}</h3>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-mana" />
                      <span className="text-mist">Rank #{currentUser.rank}</span>
                      <span className="text-2xl">{getRankIcon(currentUser.rank)}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="w-4 h-4 text-mana" />
                      <span className="text-sm text-mist/70">Carbon Saved</span>
                    </div>
                    <p className="text-2xl font-bold text-mana">{currentUser.carbonSaved}</p>
                  </div>
                  
                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-toxic" />
                      <span className="text-sm text-mist/70">Prompts</span>
                    </div>
                    <p className="text-2xl font-bold text-mist">{currentUser.promptsCount}</p>
                  </div>
                  
                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-mana" />
                      <span className="text-sm text-mist/70">Sustainability</span>
                    </div>
                    <p className={`text-2xl font-bold ${getScoreColor(currentUser.sustainabilityScore)}`}>
                      {currentUser.sustainabilityScore}/100
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-mist mb-3">Achievements</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.badges.map((badge, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-mana/20 border border-mana/30 rounded-full text-mist text-sm font-medium"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === "leaderboard" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-mist mb-4">Global Sustainability Rankings</h3>
              
              {/* Leaderboard */}
              <div className="space-y-3">
                {leaderboard.map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      user.id === currentUser.id
                        ? "bg-mana/10 border-mana/30"
                        : "bg-black/20 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex items-center gap-2 w-16">
                      <span className="text-lg font-bold text-mist">#{user.rank}</span>
                      <span className="text-xl">{getRankIcon(user.rank)}</span>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-2xl">{user.avatar}</div>
                      <div className="flex-1">
                        <p className="font-medium text-mist">{user.name}</p>
                        <div className="flex items-center gap-3 text-sm text-mist/70">
                          <span className="flex items-center gap-1">
                            <Leaf className="w-3 h-3" />
                            {user.carbonSaved}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {user.promptsCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className={`text-xl font-bold ${getScoreColor(user.sustainabilityScore)}`}>
                        {user.sustainabilityScore}
                      </p>
                      <p className="text-xs text-mist/60">Score</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Performers Highlight */}
              <div className="mt-6 p-4 bg-gradient-to-r from-mana/10 to-toxic/10 border border-mana/30 rounded-xl">
                <h4 className="text-lg font-semibold text-mist mb-3">🏆 Top Performers</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🥇</div>
                    <p className="font-medium text-mist">{leaderboard[0].name}</p>
                    <p className="text-sm text-mana">{leaderboard[0].sustainabilityScore}/100</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🌿</div>
                    <p className="font-medium text-mist">Most Eco-Friendly</p>
                    <p className="text-sm text-mana">{leaderboard.reduce((max, user) => 
                      parseFloat(user.carbonSaved) > parseFloat(max.carbonSaved) ? user : max
                    ).carbonSaved}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">⚡</div>
                    <p className="font-medium text-mist">Most Active</p>
                    <p className="text-sm text-toxic">{leaderboard.reduce((max, user) => 
                      user.promptsCount > max.promptsCount ? user : max
                    ).promptsCount} prompts</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
