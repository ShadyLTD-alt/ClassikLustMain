import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameContext } from '../hooks/useGameContext';
import { debouncedSave } from '../utils/debouncedSave';

interface FloatingNumber {
  id: string;
  value: string;
  x: number;
  y: number;
  timestamp: number;
  type: 'lp' | 'energy' | 'combo' | 'crit';
}

interface TappingAreaProps {
  className?: string;
  onTap?: (reward: number) => void;
}

const TappingArea: React.FC<TappingAreaProps> = ({ className = '', onTap }) => {
  const { gameData, updateGameData } = useGameContext();
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const tappingRef = useRef<HTMLDivElement>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Game balance constants
  const ENERGY_COST_PER_TAP = 1;
  const BASE_LP_REWARD = 1;
  const COMBO_TIMEOUT = 2000; // 2 seconds
  const MAX_COMBO = 50;
  const CRIT_CHANCE = 0.05; // 5% base crit chance
  const COMBO_DECAY_TIME = 3000; // 3 seconds
  
  // Calculate tap reward with bonuses
  const calculateTapReward = useCallback((combo: number): { lp: number; isCrit: boolean } => {
    const level = gameData?.level || 2;
    const upgrades = gameData?.upgrades || {};
    
    // Base reward calculation
    let baseLp = BASE_LP_REWARD + Math.floor(level * 0.5);
    
    // Apply upgrade multipliers
    const tapMultiplier = 1 + ((upgrades.tapPower || 0) * 0.25); // Each upgrade = +25%
    const passiveBonus = 1 + ((upgrades.passiveIncome || 0) * 0.1); // Each upgrade = +10%
    
    // Combo multiplier (caps at 5x)
    const comboMultiplier = Math.min(5.0, 1 + (combo * 0.05)); // +5% per combo, max 5x
    
    // Character bonus (based on selected character)
    const characterBonus = 1.2; // Default 20% bonus
    
    // Calculate final LP
    let finalLp = Math.floor(baseLp * tapMultiplier * passiveBonus * comboMultiplier * characterBonus);
    
    // Critical hit chance
    const luck = gameData?.luck || 0;
    const critChance = CRIT_CHANCE + (luck * 0.001) + ((upgrades.criticalHit || 0) * 0.02);
    const isCrit = Math.random() < critChance;
    
    if (isCrit) {
      finalLp *= 3; // 3x multiplier for crits
    }
    
    return { lp: finalLp, isCrit };
  }, [gameData]);
  
  // Handle tap with proper energy management
  const handleTap = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const currentEnergy = gameData?.energy || 0;
    const maxEnergy = gameData?.maxEnergy || 1000;
    const currentLP = gameData?.lustPoints || 0;
    
    // Check if player has enough energy
    if (currentEnergy < ENERGY_COST_PER_TAP) {
      // Show "Not enough energy" feedback
      addFloatingNumber({
        value: 'No Energy!',
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY,
        type: 'energy'
      });
      return;
    }
    
    // Calculate combo
    const now = Date.now();
    let newCombo = comboCount;
    
    if (now - lastTapTime < COMBO_TIMEOUT) {
      newCombo = Math.min(MAX_COMBO, comboCount + 1);
    } else {
      newCombo = 1; // Reset combo
    }
    
    setComboCount(newCombo);
    setLastTapTime(now);
    
    // Reset combo timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => {
      setComboCount(0);
    }, COMBO_DECAY_TIME);
    
    // Calculate rewards
    const { lp: lpReward, isCrit } = calculateTapReward(newCombo);
    
    // Update game state IMMEDIATELY (optimistic update)
    const newEnergy = currentEnergy - ENERGY_COST_PER_TAP;
    const newLP = currentLP + lpReward;
    
    // CRITICAL: Update local state FIRST for instant UI response
    const immediateUpdate = {
      energy: newEnergy,
      lustPoints: newLP
    };
    
    updateGameData(immediateUpdate);
    
    // Queue save operation (DEBOUNCED)
    debouncedSave.queue(immediateUpdate);
    
    // Add visual feedback
    addFloatingNumber({
      value: isCrit ? `${lpReward} CRIT!` : `+${lpReward}`,
      x: event.nativeEvent.offsetX + (Math.random() - 0.5) * 40,
      y: event.nativeEvent.offsetY + (Math.random() - 0.5) * 20,
      type: isCrit ? 'crit' : 'lp'
    });
    
    // Show combo feedback
    if (newCombo > 5) {
      addFloatingNumber({
        value: `${newCombo}x COMBO!`,
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY - 40,
        type: 'combo'
      });
    }
    
    // Callback for parent components
    if (onTap) {
      onTap(lpReward);
    }
    
    // Log for debugging (but not spammy)
    if (newCombo % 10 === 0 || isCrit) {
      console.log(`🌙 Tap: +${lpReward} LP, -${ENERGY_COST_PER_TAP} energy, ${newCombo}x combo${isCrit ? ' CRIT!' : ''}`);
    }
    
  }, [gameData, comboCount, lastTapTime, calculateTapReward, updateGameData, onTap]);
  
  // Add floating number animation
  const addFloatingNumber = useCallback((params: Omit<FloatingNumber, 'id' | 'timestamp'>) => {
    const newNumber: FloatingNumber = {
      ...params,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    };
    
    setFloatingNumbers(prev => [...prev, newNumber]);
    
    // Remove after animation completes
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(num => num.id !== newNumber.id));
    }, 2000);
  }, []);
  
  // Auto-cleanup old floating numbers
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setFloatingNumbers(prev => prev.filter(num => now - num.timestamp < 2500));
    }, 1000);
    
    return () => clearInterval(cleanup);
  }, []);
  
  // Get style for floating numbers
  const getFloatingNumberStyle = (number: FloatingNumber) => {
    const age = Date.now() - number.timestamp;
    const progress = Math.min(age / 2000, 1); // 2 second animation
    
    const baseStyle = {
      position: 'absolute' as const,
      left: `${number.x}px`,
      top: `${number.y - (progress * 80)}px`, // Float upward
      opacity: 1 - progress,
      transform: `scale(${1 + progress * 0.2})`,
      pointerEvents: 'none' as const,
      zIndex: 1000,
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      transition: 'none'
    };
    
    // Type-specific styling
    switch (number.type) {
      case 'crit':
        return {
          ...baseStyle,
          color: '#ff6b6b',
          fontSize: '20px',
          textShadow: '0 0 10px #ff6b6b, 2px 2px 4px rgba(0,0,0,0.8)'
        };
      case 'combo':
        return {
          ...baseStyle,
          color: '#ffd93d',
          fontSize: '16px',
          textShadow: '0 0 8px #ffd93d, 2px 2px 4px rgba(0,0,0,0.8)'
        };
      case 'energy':
        return {
          ...baseStyle,
          color: '#ff4757',
          fontSize: '14px'
        };
      default: // lp
        return {
          ...baseStyle,
          color: '#2ed573',
          fontSize: '16px'
        };
    }
  };
  
  return (
    <div 
      ref={tappingRef}
      className={`relative select-none cursor-pointer overflow-hidden ${className}`}
      onClick={handleTap}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Tappable area content (character image, etc.) */}
      <div className="w-full h-full flex items-center justify-center">
        {/* Character display would go here */}
        <div className="text-center text-white/80">
          <div className="text-lg font-semibold mb-2">Tap to earn points!</div>
          {comboCount > 1 && (
            <div className="text-yellow-400 font-bold animate-pulse">
              {comboCount}x COMBO
            </div>
          )}
        </div>
      </div>
      
      {/* Floating numbers */}
      {floatingNumbers.map(number => (
        <div 
          key={number.id}
          className="pointer-events-none"
          style={getFloatingNumberStyle(number)}
        >
          {number.value}
        </div>
      ))}
      
      {/* Energy warning overlay */}
      {(gameData?.energy || 0) < ENERGY_COST_PER_TAP && (
        <div className="absolute inset-0 bg-red-900/30 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center text-red-400">
            <div className="text-xl font-bold mb-2">⚡ Not Enough Energy!</div>
            <div className="text-sm">Wait for energy to regenerate or use an upgrade</div>
          </div>
        </div>
      )}
      
      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 text-xs text-white/50 bg-black/50 p-2 rounded">
          <div>Energy: {gameData?.energy || 0}/{gameData?.maxEnergy || 1000}</div>
          <div>LP: {(gameData?.lustPoints || 0).toLocaleString()}</div>
          <div>Combo: {comboCount}x</div>
          <div>Save Status: {debouncedSave.status().saving ? 'Saving...' : debouncedSave.status().pendingChanges ? 'Pending' : 'Saved'}</div>
        </div>
      )}
    </div>
  );
};

export default TappingArea;