import { create } from 'zustand';

interface CrisisState {
  isActive: boolean;
  crisisHealthScore: number;
  originalHealthScore: number;
  conflictMessage: string;
  
  // Actions
  activateCrisis: (currentHealth: number) => void;
  deactivateCrisis: () => void;
  getDisplayHealthScore: (defaultHealth: number) => number;
}

export const useCrisisStore = create<CrisisState>((set, get) => ({
  isActive: false,
  crisisHealthScore: 45,
  originalHealthScore: 85,
  conflictMessage: "CRITICAL: Engineering deadline mismatch detected!",
  
  activateCrisis: (currentHealth: number) => {
    set({
      isActive: true,
      originalHealthScore: currentHealth,
      crisisHealthScore: 45,
    });
  },
  
  deactivateCrisis: () => {
    set((state) => ({
      isActive: false,
      crisisHealthScore: state.originalHealthScore,
    }));
  },
  
  getDisplayHealthScore: (defaultHealth: number) => {
    const state = get();
    return state.isActive ? state.crisisHealthScore : defaultHealth;
  },
}));

// Hook to use in components
export function useCrisisMode() {
  const { 
    isActive, 
    crisisHealthScore, 
    originalHealthScore,
    conflictMessage,
    activateCrisis, 
    deactivateCrisis,
    getDisplayHealthScore 
  } = useCrisisStore();
  
  return {
    isCrisisActive: isActive,
    crisisHealthScore,
    originalHealthScore,
    conflictMessage,
    activateCrisis,
    deactivateCrisis,
    getDisplayHealthScore,
  };
}