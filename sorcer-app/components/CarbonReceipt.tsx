"use client";

import { useState } from "react";
import { X, Leaf, Zap, Flame, Clock, TrendingDown } from "lucide-react";

export function CarbonReceipt() {
  const [isAnimating, setIsAnimating] = useState(false);

  // Mock receipt data
  const receiptData = {
    id: "RXN-2024-0207-1337",
    timestamp: new Date().toISOString(),
    items: [
      {
        description: "AI Model: Eco Mode (Google Gemini)",
        carbonSaved: "0.023 kg CO₂",
        energySource: "98% Renewable",
        cost: "$0.004"
      },
      {
        description: "Data Processing: Cloud Region US-West",
        carbonSaved: "0.015 kg CO₂", 
        energySource: "85% Hydroelectric",
        cost: "$0.003"
      },
      {
        description: "Network Transfer: Global CDN",
        carbonSaved: "0.008 kg CO₂",
        energySource: "92% Solar",
        cost: "$0.002"
      }
    ],
    totals: {
      carbonSaved: "0.046 kg CO₂",
      equivalentTrees: "0.8 trees planted",
      moneySaved: "$0.009",
      sustainabilityScore: 95
    }
  };

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      window.history.back();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-void/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className={`relative bg-linear-to-br from-white to-gray-50 rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${
        isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg border border-gray-200 bg-white/80 hover:bg-gray-100 transition-all duration-200"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Receipt Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Carbon Receipt</h2>
                <p className="text-sm text-gray-500">Environmental Impact Report</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Transaction ID</p>
              <p className="text-xs font-mono text-gray-700">{receiptData.id}</p>
            </div>
          </div>
        </div>

        {/* Receipt Items */}
        <div className="p-6 space-y-4">
          {receiptData.items.map((item, index) => {
            const getIcon = (source: string) => {
              if (source.includes("Renewable") || source.includes("Solar") || source.includes("Hydro")) return Leaf;
              if (source.includes("Mixed")) return Zap;
              return Flame;
            };
            
            const Icon = getIcon(item.energySource);
            
            return (
              <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="p-2 rounded-lg bg-green-50">
                  <Icon className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 font-medium">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{item.energySource}</span>
                    <span className="text-xs font-bold text-green-600">{item.carbonSaved}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-gray-700">{item.cost}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals Section */}
        <div className="bg-linear-to-br from-mana/10 to-toxic/10 border border-mana/30 rounded-xl p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Carbon Saved:</span>
              <span className="text-lg font-bold text-green-600">{receiptData.totals.carbonSaved}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Equivalent Trees:</span>
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-600" />
                <span className="text-lg font-bold text-green-600">{receiptData.totals.equivalentTrees}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Money Saved:</span>
              <span className="text-lg font-bold text-green-600">{receiptData.totals.moneySaved}</span>
            </div>

            {/* Sustainability Score */}
            <div className="mt-4 pt-3 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sustainability Score:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full mx-0.5 ${
                          i < Math.floor(receiptData.totals.sustainabilityScore / 20)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-green-600">{receiptData.totals.sustainabilityScore}/100</span>
                </div>
              </div>
            </div>

            {/* Environmental Impact Message */}
            <div className="mt-4 p-3 bg-green-100/50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700">
                  Your choice saved <span className="font-bold">{receiptData.totals.carbonSaved}</span> compared to traditional AI models!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Footer */}
        <div className="bg-gray-50 px-6 py-3 rounded-b-2xl border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(receiptData.timestamp).toLocaleString()}</span>
            </div>
            <span>Thank you for choosing sustainable AI!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
