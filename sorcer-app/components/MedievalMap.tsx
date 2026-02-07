"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Leaf, Zap, Flame } from "lucide-react";

interface DataCenter {
  id: string;
  name: string;
  x: number;
  y: number;
  carbonIntensity: "low" | "medium" | "high";
  region: string;
}

export function MedievalMap() {
  const [selectedCenter, setSelectedCenter] = useState<DataCenter | null>(null);

  // Mock data centers with medieval fantasy names
  const dataCenters: DataCenter[] = [
    { id: "1", name: "Rivendell Core", x: 25, y: 30, carbonIntensity: "low", region: "Elven Lands" },
    { id: "2", name: "Moria Depths", x: 70, y: 60, carbonIntensity: "high", region: "Dwarven Mines" },
    { id: "3", name: "Lothlórien Grove", x: 40, y: 45, carbonIntensity: "low", region: "Golden Wood" },
    { id: "4", name: "Gondor Harbor", x: 55, y: 25, carbonIntensity: "medium", region: "White City" },
    { id: "5", name: "Rohan Plains", x: 80, y: 35, carbonIntensity: "low", region: "Horse Lords" },
    { id: "6", name: "Isengard Tower", x: 35, y: 70, carbonIntensity: "high", region: "Wizard's Vale" },
  ];

  const getCarbonColor = (intensity: string) => {
    switch (intensity) {
      case "low": return "#10b981";
      case "medium": return "#f59e0b";
      case "high": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getCarbonIcon = (intensity: string) => {
    switch (intensity) {
      case "low": return Leaf;
      case "medium": return Zap;
      case "high": return Flame;
      default: return MapPin;
    }
  };

  return (
    <div className="fixed inset-0 bg-void/95 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="relative w-full max-w-6xl mx-auto p-8">
        {/* Close Button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 p-2 rounded-lg border border-white/10 bg-black/20 backdrop-blur-md text-mist hover:border-mana/50 transition-all duration-200 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Medieval Map Container */}
        <div className="relative bg-gradient-to-br from-amber-50/10 to-amber-100/5 border-2 border-amber-200/30 rounded-2xl shadow-2xl overflow-hidden">
          {/* Parchment Texture Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/5 via-transparent to-amber-200/10 pointer-events-none"></div>
          
          {/* Map Title */}
          <div className="relative text-center mb-6 pt-6">
            <h2 className="text-3xl font-bold text-amber-200 mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              The Realms of Digital Power
            </h2>
            <p className="text-amber-300/80 text-sm">Carbon Intensity Across the Lands</p>
          </div>

          {/* Map SVG */}
          <div className="relative px-8 pb-8">
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-96 md:h-[500px]"
              style={{ 
                background: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                filter: 'sepia(0.3) contrast(1.1)'
              }}
            >
              {/* Medieval-style map border */}
              <rect 
                x="5" y="5" width="90" height="90" 
                fill="none" 
                stroke="#92400e" 
                strokeWidth="2" 
                strokeDasharray="5,3"
                rx="2"
              />
              
              {/* Decorative compass rose */}
              <g transform="translate(85, 15)">
                <circle cx="0" cy="0" r="8" fill="none" stroke="#92400e" strokeWidth="1" />
                <path d="M0,-6 L2,0 L0,6 L-2,0 Z" fill="#92400e" />
                <text x="0" y="-12" textAnchor="middle" fill="#92400e" fontSize="4" fontWeight="bold">N</text>
              </g>

              {/* Data Centers as Medieval Locations */}
              {dataCenters.map((center) => {
                const Icon = getCarbonIcon(center.carbonIntensity);
                const color = getCarbonColor(center.carbonIntensity);
                
                return (
                  <g key={center.id}>
                    {/* Location circle */}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r="4"
                      fill={color}
                      stroke="#92400e"
                      strokeWidth="1"
                      className="cursor-pointer hover:r-5 transition-all duration-200"
                      onClick={() => setSelectedCenter(center)}
                      style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' }}
                    />
                    
                    {/* Pulsing effect for low carbon */}
                    {center.carbonIntensity === "low" && (
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r="6"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1"
                        opacity="0.5"
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Icon */}
                    <foreignObject x={center.x - 8} y={center.y - 8} width="16" height="16">
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon size={12} color={color} />
                      </div>
                    </foreignObject>
                    
                    {/* Location label */}
                    <text
                      x={center.x}
                      y={center.y + 12}
                      textAnchor="middle"
                      fill="#92400e"
                      fontSize="3"
                      fontWeight="bold"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {center.name}
                    </text>
                  </g>
                );
              })}

              {/* Connecting paths (trade routes) */}
              <path
                d="M 25 30 Q 40 20 55 25"
                fill="none"
                stroke="#92400e"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.3"
              />
              <path
                d="M 70 60 Q 60 50 40 45"
                fill="none"
                stroke="#92400e"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.3"
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-6 px-8">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-600" />
              <span className="text-amber-200 text-sm">Low Carbon</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-amber-200 text-sm">Medium Carbon</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-600" />
              <span className="text-amber-200 text-sm">High Carbon</span>
            </div>
          </div>
        </div>

        {/* Selected Center Details */}
        {selectedCenter && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-void/95 border border-amber-200/30 rounded-xl p-6 backdrop-blur-md max-w-md">
            <h3 className="text-xl font-bold text-amber-200 mb-3">{selectedCenter.name}</h3>
            <div className="space-y-2">
              <p className="text-amber-300"><span className="font-medium">Region:</span> {selectedCenter.region}</p>
              <p className="text-amber-300">
                <span className="font-medium">Carbon Intensity:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  selectedCenter.carbonIntensity === "low" ? "bg-green-600/20 text-green-400" :
                  selectedCenter.carbonIntensity === "medium" ? "bg-amber-600/20 text-amber-400" :
                  "bg-red-600/20 text-red-400"
                }`}>
                  {selectedCenter.carbonIntensity.toUpperCase()}
                </span>
              </p>
              <div className="flex items-center gap-2 mt-3">
                {(() => {
                  const Icon = getCarbonIcon(selectedCenter.carbonIntensity);
                  return <Icon className="w-5 h-5" color={getCarbonColor(selectedCenter.carbonIntensity)} />;
                })()}
                <span className="text-amber-300 text-sm">
                  {selectedCenter.carbonIntensity === "low" ? "Powered by renewable energy" :
                   selectedCenter.carbonIntensity === "medium" ? "Mixed energy sources" :
                   "Coal-powered infrastructure"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
