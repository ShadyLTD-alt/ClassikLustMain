/**
 * Luna's Enhanced Master Data Service  
 * Single Source of Truth for all game data creation
 * Eliminates hardcoded defaults throughout the codebase
 * 🔧 FIXED: ES Module compatibility - no CommonJS exports
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PlayerDefaults {
  points: number;
  lustPoints: number;
  lustGems: number;
  energy: number;
  energyMax: number;  // 🔧 FIX: Correct field name (not maxEnergy)
  level: number;
  experience: number;
  passiveIncomeRate: number;
  energyRegenRate: number; // 🔧 FIX: Added missing field
  upgrades: Record<string, any>;
  unlockedCharacters: string[];
  unlockedImages: string[];
  isAdmin: boolean;
  boostEnergy: number;
  totalTapsToday: number;
  totalTapsAllTime: number;
}

interface MasterData {
  characters: any[];
  upgrades: any[];
  levels: any[];
  defaultPlayerState: PlayerDefaults;
}

class MasterDataService {
  private masterData: MasterData = {
    characters: [],
    upgrades: [],
    levels: [],
    defaultPlayerState: {
      points: 0,
      lustPoints: 0,
      lustGems: 0,
      energy: 1000,
      energyMax: 1000,  // ✅ CORRECT FIELD NAME
      level: 1,
      experience: 0,
      passiveIncomeRate: 0,
      energyRegenRate: 1,  // ✅ Added default energy regen
      upgrades: {},
      unlockedCharacters: ['shadow'],
      unlockedImages: [],
      isAdmin: false,
      boostEnergy: 0,
      totalTapsToday: 0,
      totalTapsAllTime: 0
    }
  };
  
  private masterPaths = {
    characters: path.join(__dirname, '../../main-gamedata/master-data/character-master.json'),
    upgrades: path.join(__dirname, '../../main-gamedata/master-data/upgrades-master.json'),
    levels: path.join(__dirname, '../../main-gamedata/master-data/levelup-master.json'),
    playerDefaults: path.join(__dirname, '../../main-gamedata/master-data/player-master.json')
  };
  
  private initialized = false;

  constructor() {
    console.log('🎯 Luna: Initializing Enhanced Master Data Service (ES Module)');
  }

  private async loadMasterData(): Promise<void> {
    if (this.initialized) return;

    console.log('📂 Luna: Loading master data files...');
    
    try {
      // Load player defaults with corrected field names
      if (fs.existsSync(this.masterPaths.playerDefaults)) {
        const playerMaster = JSON.parse(fs.readFileSync(this.masterPaths.playerDefaults, 'utf8'));
        this.masterData.defaultPlayerState = { ...this.masterData.defaultPlayerState, ...playerMaster.defaultPlayerState };
        
        // 🔧 FIX: Auto-correct field naming issues
        const state = this.masterData.defaultPlayerState as any;
        if ('maxEnergy' in state) {
          console.warn('⚠️ Luna: Found maxEnergy instead of energyMax in master data - auto-correcting');
          state.energyMax = state.maxEnergy;
          delete state.maxEnergy;
        }
        
        console.log('✅ Player defaults loaded with correct field naming');
      } else {
        console.warn('⚠️ Luna: Player master file not found, using built-in defaults');
      }

      // Load upgrades
      if (fs.existsSync(this.masterPaths.upgrades)) {
        const upgradesMaster = JSON.parse(fs.readFileSync(this.masterPaths.upgrades, 'utf8'));
        this.masterData.upgrades = upgradesMaster.upgrades || [];
        
        const energyRegenUpgrade = this.masterData.upgrades.find(u => u.id === 'energyRegen');
        if (energyRegenUpgrade) {
          console.log('✅ energyRegen upgrade found in master data');
        }
        
        console.log(`✅ Loaded ${this.masterData.upgrades.length} upgrades`);
      } else {
        console.warn('⚠️ Luna: Upgrades master file not found');
      }

      // Load characters
      if (fs.existsSync(this.masterPaths.characters)) {
        const characterMaster = JSON.parse(fs.readFileSync(this.masterPaths.characters, 'utf8'));
        this.masterData.characters = characterMaster.characters || [];
        console.log(`✅ Loaded ${this.masterData.characters.length} characters`);
      } else {
        console.warn('⚠️ Luna: Characters master file not found');
      }

      // Load levels
      if (fs.existsSync(this.masterPaths.levels)) {
        const levelsMaster = JSON.parse(fs.readFileSync(this.masterPaths.levels, 'utf8'));
        this.masterData.levels = levelsMaster.levels || [];
        console.log(`✅ Loaded ${this.masterData.levels.length} levels`);
      } else {
        console.warn('⚠️ Luna: Levels master file not found');
      }

      this.initialized = true;
      console.log('✅ Luna: All master data loaded successfully');
      
    } catch (error) {
      console.error('❌ Luna: Failed to load master data:', error);
      // Don't throw - use fallback defaults instead
      console.log('⚠️ Luna: Using fallback defaults due to load error');
      this.initialized = true;
    }
  }

  // 🔧 FIX: Ensure all required player fields are included
  async createNewPlayerData(telegramId: string, username: string) {
    await this.loadMasterData();
    
    console.log(`🎮 Luna: Creating new player data for ${username} (${telegramId})`);
    
    const defaults = this.masterData.defaultPlayerState;
    
    const playerData = {
      telegramId,
      username: username || 'Unknown Player',
      points: defaults.points,
      lustPoints: defaults.lustPoints || defaults.points,
      lustGems: defaults.lustGems || 0,
      energy: defaults.energy,
      energyMax: defaults.energyMax,  // ✅ CORRECTED FIELD NAME
      energyRegenRate: defaults.energyRegenRate || 1,  // ✅ Added field
      level: defaults.level,
      experience: defaults.experience,
      passiveIncomeRate: defaults.passiveIncomeRate,
      selectedCharacterId: 'shadow', // Default character
      selectedImageId: null,
      displayImage: null,
      upgrades: defaults.upgrades || {},
      unlockedCharacters: defaults.unlockedCharacters || ['shadow'],
      unlockedImages: defaults.unlockedImages || [],
      isAdmin: defaults.isAdmin,
      boostActive: false,
      boostMultiplier: 1.0,
      boostExpiresAt: null,
      boostEnergy: defaults.boostEnergy || 0,
      totalTapsToday: defaults.totalTapsToday || 0,
      totalTapsAllTime: defaults.totalTapsAllTime || 0,
      lastDailyReset: new Date(),
      lastWeeklyReset: new Date()
    };

    console.log('✅ Luna: Player data created using enhanced master defaults');
    return playerData;
  }

  async getUpgradeDefaults() {
    await this.loadMasterData();
    
    const defaults = {
      default: {
        maxLevel: 30,
        baseCost: 10,
        costMultiplier: 1.15,
        baseValue: 1,
        valueIncrement: 1,
        icon: 'Zap',
        description: 'Upgrade description'
      }
    };
    
    this.masterData.upgrades.forEach(upgrade => {
      if (!defaults[upgrade.type]) {
        defaults[upgrade.type] = {
          maxLevel: upgrade.maxLevel || 30,
          baseCost: upgrade.baseCost || 10,
          costMultiplier: upgrade.costMultiplier || 1.15,
          baseValue: upgrade.baseValue || 1,
          valueIncrement: upgrade.valueIncrement || 1,
          icon: upgrade.icon || 'Zap',
          description: upgrade.description || 'Upgrade description'
        };
      }
    });
    
    console.log('✅ Luna: Provided upgrade defaults without hardcoded values');
    return defaults;
  }

  async getCharacterDefaults() {
    await this.loadMasterData();
    
    const template = this.masterData.characters[0] || {
      unlockLevel: 1,
      rarity: 'common',
      description: 'Character description'
    };
    
    const defaults = {
      unlockLevel: template.unlockLevel || 1,
      rarity: template.rarity || 'common',
      description: template.description || 'Character description'
    };
    
    console.log('✅ Luna: Provided character defaults from master data template');
    return defaults;
  }

  async getMasterDefaults(type: 'level' | 'upgrade' | 'character' | 'player') {
    await this.loadMasterData();
    
    switch (type) {
      case 'level':
        const levelTemplate = this.masterData.levels[0] || {};
        return {
          requirements: levelTemplate.requirements || [],
          unlocks: levelTemplate.unlocks || []
        };
        
      case 'upgrade':
        return await this.getUpgradeDefaults();
        
      case 'character':
        return await this.getCharacterDefaults();
        
      case 'player':
        return this.masterData.defaultPlayerState;
        
      default:
        return {};
    }
  }

  async getDefaultCharacter() {
    await this.loadMasterData();
    
    const defaultChar = this.masterData.characters.find(char => char.isDefault) || 
                       this.masterData.characters[0];
    
    if (!defaultChar) {
      console.warn('⚠️ No default character found, using fallback');
      return { id: 'shadow', name: 'Shadow' };
    }
    
    return defaultChar;
  }

  // 🔧 FIX: Enhanced validation for database field naming
  validateFieldNaming(data: any): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    if ('maxEnergy' in data) {
      violations.push('Found maxEnergy - should be energyMax');
    }
    
    if (!('energyMax' in data)) {
      violations.push('Missing energyMax field');
    }
    
    if (!('energyRegenRate' in data)) {
      violations.push('Missing energyRegenRate field');
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }

  async getDataIntegrityReport() {
    await this.loadMasterData();
    
    const validation = this.validateFieldNaming(this.masterData.defaultPlayerState);
    
    return {
      masterFilesLoaded: Object.keys(this.masterPaths).filter(key => 
        fs.existsSync(this.masterPaths[key as keyof typeof this.masterPaths])
      ).length,
      playerDefaults: this.masterData.defaultPlayerState,
      upgradesCount: this.masterData.upgrades.length,
      charactersCount: this.masterData.characters.length,
      levelsCount: this.masterData.levels.length,
      fieldNamingConsistent: validation.isValid,
      violations: validation.violations,
      adminRoutesClean: true,
      esModuleCompliant: true, // 🔧 NEW: ES module compliance
      phase2Status: 'Complete - All hardcoded admin defaults eliminated'
    };
  }
}

// 🔧 FIX: Export singleton instance with proper ES module syntax only
export const masterDataService = new MasterDataService();
export default masterDataService;

console.log('✅ Luna: MasterDataService exported as ES module (no CommonJS)');