"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type EnergyMode = "auto" | "manual";

interface EnergyContextType {
  isEcoMode: boolean;
  isAutoMode: boolean;
  mode: EnergyMode;
  selectedModelId: string | null;
  toggleEcoMode: () => void;
  setEcoMode: (mode: boolean) => void;
  setMode: (mode: EnergyMode) => void;
  setSelectedModelId: (modelId: string | null) => void;
}

const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [isEcoMode, setIsEcoMode] = useState(true);
  const [mode, setMode] = useState<EnergyMode>("auto");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const toggleEcoMode = () => {
    setIsEcoMode(!isEcoMode);
  };

  const setEcoMode = (ecoMode: boolean) => {
    setIsEcoMode(ecoMode);
  };

  const handleSetMode = (newMode: EnergyMode) => {
    setMode(newMode);
    if (newMode === "auto") {
      setSelectedModelId(null); // Let backend decide
    }
  };

  const handleSetSelectedModelId = (modelId: string | null) => {
    setSelectedModelId(modelId);
    if (modelId) {
      setMode("manual"); // Switch to manual when user selects specific model
    }
  };

  return (
    <EnergyContext.Provider
      value={{
        isEcoMode,
        isAutoMode: mode === "auto",
        mode,
        selectedModelId,
        toggleEcoMode,
        setEcoMode,
        setMode: handleSetMode,
        setSelectedModelId: handleSetSelectedModelId,
      }}
    >
      {children}
    </EnergyContext.Provider>
  );
}

export function useEnergy() {
  const context = useContext(EnergyContext);
  if (context === undefined) {
    throw new Error("useEnergy must be used within an EnergyProvider");
  }
  return context;
}
