/**
 * 🌙 Luna Learning System - COMPREHENSIVE DEADLOCK PREVENTION UPDATE
 * 
 * INCIDENT LEARNED: AsyncLock + proper-lockfile deadlocks (Nov 4, 2025)
 * - Root cause: AsyncLock.acquire() + proper-lockfile creating nested promise chains
 * - Impact: 6 hours debugging, all player operations timing out at 5s
 * - Solution: Remove all locking, direct JSON I/O, background DB sync
 * - Prevention: Runtime guards, safe-mode bypass, automatic detection
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../logger';

// 🧠 LUNA'S EXPANDED INCIDENT TYPES
type LunaIncidentType = 
  | 'ES_MODULE' 
  | 'DATABASE_FIELD' 
  | 'DIRECTORY_STRUCTURE' 
  | 'EVENT_EMITTER' 
  | 'IMAGE_LOADING' 
  | 'API_TIMEOUT'
  | 'ASYNC_LOCK_DEADLOCK' // 🆕 NEW: The AsyncLock incident type
  | 'JSON_FIRST_BLOCKING' // 🆕 NEW: JSON-first operations being blocked
  | 'PROPER_LOCKFILE_HANG' // 🆕 NEW: File locking never releasing
  | 'PROMISE_CHAIN_DEADLOCK'; // 🆕 NEW: Nested promises never resolving

interface LearningEntry {
  timestamp: Date;
  errorPattern: string;
  errorType: LunaIncidentType;
  solution: string;
  codeExample?: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  preventionChecks: string[];
  incidentId?: string;
  debuggingTimeHours?: number;
  rootCauseModule?: string;
  fixCommitSha?: string;
}

// 🛡️ SAFE MODE: Runtime protection against known bad patterns
interface SafeModeConfig {
  enabled: boolean;
  bypassAsyncLock: boolean;
  bypassProperLockfile: boolean;
  maxOperationTimeMs: number;
  autoFixEnabled: boolean;
}

class LunaLearningSystem {
  private readonly learningPath: string;
  private readonly safeModeConfigPath: string;
  private knowledgeBase: LearningEntry[] = [];
  private safeModeConfig: SafeModeConfig;
  private loadingPromise: Promise<void> | null = null;
  
  // 📊 RUNTIME METRICS: Track operation timings to detect slowdowns
  private operationTimings = new Map<string, number[]>();
  private deadlockDetectionActive = true;

  constructor() {
    this.learningPath = path.join(process.cwd(), 'LunaBug', 'luna-learning.json');
    this.safeModeConfigPath = path.join(process.cwd(), 'LunaBug', 'safe-mode.json');
    
    // 🛡️ DEFAULT SAFE MODE CONFIG
    this.safeModeConfig = {
      enabled: true,
      bypassAsyncLock: true, // LEARNED: Always bypass AsyncLock
      bypassProperLockfile: true, // LEARNED: Always bypass proper-lockfile
      maxOperationTimeMs: 1000, // LEARNED: JSON operations should be <1s
      autoFixEnabled: process.env.NODE_ENV !== 'production'
    };
  }

  // 🔧 ENHANCED: Load with AsyncLock incident knowledge
  private async loadKnowledgeBase(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    
    this.loadingPromise = this._loadKnowledgeBase();
    return this.loadingPromise;
  }
  
  private async _loadKnowledgeBase(): Promise<void> {
    try {
      const lunaDir = path.dirname(this.learningPath);
      await fs.mkdir(lunaDir, { recursive: true });
      
      // Load safe mode config
      await this.loadSafeModeConfig();
      
      try {
        const data = await fs.readFile(this.learningPath, 'utf8');
        
        if (!data || data.trim() === '') {
          console.log('🌙 Luna learning file is empty, creating with AsyncLock incident knowledge');
          this.knowledgeBase = [];
          await this.createEnhancedKnowledgeBase();
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          
          if (Array.isArray(parsed)) {
            this.knowledgeBase = parsed.map(entry => ({
              ...entry,
              timestamp: new Date(entry.timestamp)
            }));
            
            // 🧠 ENSURE ASYNCLOCK INCIDENT IS IN KNOWLEDGE BASE
            const hasAsyncLockIncident = this.knowledgeBase.some(e => e.errorType === 'ASYNC_LOCK_DEADLOCK');
            if (!hasAsyncLockIncident) {
              console.log('🌙 Adding AsyncLock deadlock incident to Luna\'s knowledge...');
              await this.addAsyncLockIncident();
            }
            
            console.log(`🌙 Luna loaded ${this.knowledgeBase.length} learning entries (AsyncLock prevention active)`);
          } else {
            throw new Error('Invalid data structure: expected array');
          }
        } catch (parseError) {
          console.error('🌙 Luna JSON parse error:', parseError);
          await this.recoverFromCorruption();
        }
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          console.log('🌙 Luna starting fresh with enhanced knowledge base');
          this.knowledgeBase = [];
          await this.createEnhancedKnowledgeBase();
        } else {
          console.error('🌙 Luna file error:', fileError);
          this.knowledgeBase = [];
        }
      }
    } catch (error) {
      console.error('🌙 Luna initialization error:', error);
      this.knowledgeBase = [];
    }
  }

  // 🛡️ SAFE MODE: Load and manage safe-mode configuration
  private async loadSafeModeConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.safeModeConfigPath, 'utf8');
      const parsed = JSON.parse(data);
      this.safeModeConfig = { ...this.safeModeConfig, ...parsed };
      console.log('🌙 🛡️ Safe mode config loaded:', this.safeModeConfig);
    } catch (error) {
      // Use defaults, save them
      await this.saveSafeModeConfig();
      console.log('🌙 🛡️ Safe mode initialized with defaults');
    }
  }

  private async saveSafeModeConfig(): Promise<void> {
    try {
      const lunaDir = path.dirname(this.safeModeConfigPath);
      await fs.mkdir(lunaDir, { recursive: true });
      await fs.writeFile(this.safeModeConfigPath, JSON.stringify(this.safeModeConfig, null, 2), 'utf8');
    } catch (error) {
      console.error('🌙 Failed to save safe mode config:', error);
    }
  }

  // 🧠 CREATE COMPREHENSIVE KNOWLEDGE BASE WITH ASYNCLOCK INCIDENT
  private async createEnhancedKnowledgeBase(): Promise<void> {
    const enhancedLearnings: LearningEntry[] = [
      {
        timestamp: new Date(),
        errorPattern: 'JSON Parse Error in Luna Learning System',
        errorType: 'ES_MODULE',
        impact: 'HIGH',
        solution: 'Implement robust JSON parsing with error recovery, atomic writes, and validation.',
        codeExample: `// ✅ Safe JSON parsing
try {
  const data = await fs.readFile(path, 'utf8');
  if (!data || data.trim() === '') return [];
  return JSON.parse(data);
} catch (error) {
  console.error('JSON parse error:', error);
  return [];
}`,
        preventionChecks: [
          'Validate JSON data before parsing',
          'Use atomic file writes for JSON saves',
          'Backup corrupted files before replacing'
        ]
      },
      // 🚨 THE BIG ONE: AsyncLock deadlock incident
      {
        timestamp: new Date(),
        incidentId: 'ASYNCLOCK_DEADLOCK_NOV_2025',
        errorPattern: 'Player operations timing out at 5000ms with AsyncLock acquire() never resolving',
        errorType: 'ASYNC_LOCK_DEADLOCK',
        impact: 'CRITICAL',
        debuggingTimeHours: 6,
        rootCauseModule: 'AsyncLock + proper-lockfile',
        solution: 'Remove AsyncLock and proper-lockfile completely. Use direct JSON I/O with background DB sync.',
        codeExample: `// ❌ PROBLEMATIC (causes deadlocks)
const lock = new AsyncLock();
return await lock.acquire(playerId, async () => {
  const release = await lockfile.lock(filePath);
  // ... operations that never complete
});

// ✅ FIXED (direct operations)
const current = await this.loadPlayer(playerId);
const updated = { ...current, ...updates };
await fs.writeFile(jsonPath, JSON.stringify(updated));
this.cache.set(playerId, updated);
// DB sync in background (non-blocking)
this.syncToDatabaseBackground(playerId, updated);`,
        preventionChecks: [
          'Never use AsyncLock in JSON-first player state operations',
          'Never use proper-lockfile for player data persistence',
          'Always prefer direct JSON I/O over complex locking',
          'Use background DB sync, never blocking await',
          'Add console.time() to detect operations >1s',
          'Test all player operations complete in <1s',
          'Avoid nested promise chains in state management'
        ]
      },
      {
        timestamp: new Date(),
        errorPattern: 'proper-lockfile acquire hanging indefinitely',
        errorType: 'PROPER_LOCKFILE_HANG',
        impact: 'CRITICAL',
        solution: 'Replace with atomic file writes using fs.writeFile + temp files.',
        codeExample: `// ❌ PROBLEMATIC
const release = await lockfile.lock(filePath, { retries: 5 });
// ... operation hangs here

// ✅ FIXED
const tmp = filePath + '.tmp';
await fs.writeFile(tmp, data);
await fs.rename(tmp, filePath); // Atomic`,
        preventionChecks: [
          'Use atomic file operations instead of file locking',
          'Always set lock timeouts and retries limits',
          'Prefer temp-file-then-rename pattern for atomic writes'
        ]
      },
      {
        timestamp: new Date(),
        errorPattern: 'Admin editor saves to DB but JSON-first runtime loads from JSON files',
        errorType: 'JSON_FIRST_BLOCKING',
        impact: 'HIGH',
        solution: 'Admin editors must write to JSON files AND database, then refresh in-memory cache.',
        codeExample: `// ✅ Admin save pattern
// 1. Save to main-gamedata JSON
await saveUpgradeToJSON(upgrade);
// 2. Save to database (background)
storage.createUpgrade(upgrade);
// 3. Refresh memory cache
masterDataService.reloadUpgrades();
// 4. Return updated data to client
res.json({ upgrades: getUpgradesFromMemory() });`,
        preventionChecks: [
          'Admin editors must update JSON files, not just database',
          'Always refresh in-memory cache after admin edits',
          'Return updated data to client for immediate UI refresh',
          'Use JSON-first for runtime, DB for persistence'
        ]
      }
    ];
    
    this.knowledgeBase = enhancedLearnings;
    await this.saveKnowledgeBase();
    
    console.log('🌙 🧠 Luna enhanced knowledge base created with AsyncLock prevention');
  }

  // 🚨 ADD SPECIFIC ASYNCLOCK INCIDENT TO KNOWLEDGE BASE
  private async addAsyncLockIncident(): Promise<void> {
    const incident: LearningEntry = {
      timestamp: new Date(),
      incidentId: 'ASYNCLOCK_DEADLOCK_NOV_2025',
      errorPattern: 'withTimeout(...) timed out after 5000ms + AsyncLock acquire never resolving',
      errorType: 'ASYNC_LOCK_DEADLOCK',
      impact: 'CRITICAL',
      debuggingTimeHours: 6,
      rootCauseModule: 'async-lock + proper-lockfile',
      fixCommitSha: 'e0d03409503298b7ae83bcc75cac13b21dd83411',
      solution: 'Complete removal of AsyncLock and proper-lockfile. Direct JSON I/O with background DB sync.',
      codeExample: `// 🚨 NEVER USE THIS PATTERN IN JSON-FIRST SYSTEMS:
class BadPlayerStateManager {
  private locks = new Map<string, AsyncLock>();
  
  async updatePlayer(playerId: string, updates: any) {
    const lock = this.getLock(playerId);
    return await lock.acquire(playerId, async () => { // 💀 DEADLOCK POINT
      const release = await lockfile.lock(filePath); // 💀 HANG POINT
      // Operations never complete...
    });
  }
}

// ✅ SAFE PATTERN: Direct operations
class SafePlayerStateManager {
  private cache = new Map<string, PlayerState>();
  
  async updatePlayer(playerId: string, updates: any) {
    const current = await this.loadPlayer(playerId);
    const updated = { ...current, ...updates };
    
    // Direct JSON write (atomic)
    await fs.writeFile(jsonPath, JSON.stringify(updated));
    this.cache.set(playerId, updated);
    
    // DB sync in background (non-blocking)
    this.syncToDatabase(playerId, updated).catch(console.error);
    
    return updated;
  }
}`,
      preventionChecks: [
        'NEVER use AsyncLock in player state operations',
        'NEVER use proper-lockfile for JSON persistence',
        'Operations must complete in <1s, not 5s+',
        'Use direct JSON I/O with atomic writes',
        'Database sync must be background/non-blocking',
        'Add timing instrumentation to detect slowdowns',
        'Prefer simple cache + JSON over complex state management'
      ]
    };
    
    this.knowledgeBase.push(incident);
    await this.saveKnowledgeBase();
  }

  // 🔧 ENHANCED: Safe JSON saving with corruption recovery
  private async saveKnowledgeBase(): Promise<void> {
    try {
      const lunaDir = path.dirname(this.learningPath);
      await fs.mkdir(lunaDir, { recursive: true });
      
      // 🛡️ SAFE MODE: Use atomic writes (learned from AsyncLock incident)
      const tempPath = `${this.learningPath}.tmp`;
      const jsonData = JSON.stringify(this.knowledgeBase, null, 2);
      
      // Validate JSON before writing
      try {
        JSON.parse(jsonData);
      } catch (validateError) {
        console.error('🌙 Luna JSON validation failed before save:', validateError);
        return;
      }
      
      await fs.writeFile(tempPath, jsonData, 'utf8');
      await fs.rename(tempPath, this.learningPath); // Atomic operation
      
      console.log(`🌙 🧠 Luna knowledge base saved (${this.knowledgeBase.length} entries)`);
    } catch (error) {
      console.error('🌙 Luna save error:', error);
    }
  }

  private async recoverFromCorruption(): Promise<void> {
    console.log('🌙 🩹 Luna recovering from corrupted knowledge base...');
    
    const backupPath = `${this.learningPath}.corrupted.${Date.now()}`;
    try {
      await fs.copyFile(this.learningPath, backupPath);
      console.log(`🌙 Corrupted knowledge backed up to: ${backupPath}`);
    } catch {}
    
    this.knowledgeBase = [];
    await this.createEnhancedKnowledgeBase();
  }

  // 🔍 DEADLOCK DETECTION: Monitor operation timings in real-time
  recordOperationTiming(operation: string, durationMs: number): void {
    if (!this.deadlockDetectionActive) return;
    
    const timings = this.operationTimings.get(operation) || [];
    timings.push(durationMs);
    
    // Keep only recent timings (last 10)
    if (timings.length > 10) {
      timings.shift();
    }
    
    this.operationTimings.set(operation, timings);
    
    // 🚨 DETECT DEADLOCK PATTERN
    if (timings.length >= 3) {
      const recentTimings = timings.slice(-3);
      const averageMs = recentTimings.reduce((sum, t) => sum + t, 0) / recentTimings.length;
      
      if (averageMs > 5000) {
        console.error(`🌙 🚨 DEADLOCK DETECTED: ${operation} averaging ${Math.round(averageMs)}ms`);
        
        // Auto-enable safe mode
        if (this.safeModeConfig.autoFixEnabled) {
          console.log('🌙 🛡️ AUTO-ENABLING SAFE MODE DUE TO DEADLOCK DETECTION');
          this.enableSafeMode(operation, averageMs);
        }
      }
    }
  }

  // 🛡️ ENABLE SAFE MODE: Bypass problematic modules
  private async enableSafeMode(operation: string, averageMs: number): Promise<void> {
    this.safeModeConfig.enabled = true;
    
    if (operation.includes('playerState') || operation.includes('getPlayer') || operation.includes('updatePlayer')) {
      this.safeModeConfig.bypassAsyncLock = true;
      this.safeModeConfig.bypassProperLockfile = true;
    }
    
    await this.saveSafeModeConfig();
    
    // Train Luna on this detection
    await this.trainOnPattern({
      timestamp: new Date(),
      errorPattern: `Auto-detected deadlock in ${operation} (${averageMs}ms average)`,
      errorType: 'ASYNC_LOCK_DEADLOCK',
      impact: 'CRITICAL',
      solution: 'Safe mode automatically enabled. AsyncLock and proper-lockfile bypassed.',
      preventionChecks: [
        'Monitor operation timings continuously',
        'Auto-enable safe mode when >5s average detected',
        'Alert developers to deadlock patterns'
      ]
    });
    
    console.log('🌙 🛡️ Safe mode training complete');
  }

  // 🔍 PUBLIC: Check if safe mode should bypass specific modules
  getSafeModeConfig(): SafeModeConfig {
    return { ...this.safeModeConfig };
  }

  shouldBypassAsyncLock(): boolean {
    return this.safeModeConfig.enabled && this.safeModeConfig.bypassAsyncLock;
  }

  shouldBypassProperLockfile(): boolean {
    return this.safeModeConfig.enabled && this.safeModeConfig.bypassProperLockfile;
  }

  getMaxOperationTime(): number {
    return this.safeModeConfig.maxOperationTimeMs;
  }

  // 🔍 PUBLIC: Enhanced prevention checklist with AsyncLock knowledge
  async getPreventionChecklist(): Promise<string[]> {
    await this.loadKnowledgeBase();
    
    const allChecks = this.knowledgeBase.flatMap(entry => entry.preventionChecks);
    const checkCounts = new Map<string, number>();
    allChecks.forEach(check => {
      checkCounts.set(check, (checkCounts.get(check) || 0) + 1);
    });
    
    // Prioritize AsyncLock prevention checks
    const prioritizedChecks = [
      'NEVER use AsyncLock in player state operations',
      'NEVER use proper-lockfile for JSON persistence', 
      'Operations must complete in <1s, not 5s+',
      'Use direct JSON I/O with atomic writes',
      'Database sync must be background/non-blocking'
    ];
    
    const otherChecks = Array.from(checkCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([check]) => check)
      .filter(check => !prioritizedChecks.includes(check));
    
    return [...prioritizedChecks, ...otherChecks].slice(0, 25);
  }

  async runPreventionScan(): Promise<{ warnings: string[]; criticalIssues: string[]; safeModeStatus: SafeModeConfig }> {
    await this.loadKnowledgeBase();
    
    const warnings: string[] = [];
    const criticalIssues: string[] = [];
    
    // 🔍 SCAN FOR ASYNCLOCK PATTERNS IN CODEBASE
    try {
      const serverDir = path.join(process.cwd(), 'server');
      const utilsDir = path.join(serverDir, 'utils');
      
      // Check for AsyncLock imports (should be removed)
      const files = await fs.readdir(utilsDir).catch(() => []);
      for (const file of files.filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
        try {
          const content = await fs.readFile(path.join(utilsDir, file), 'utf8');
          
          if (content.includes('AsyncLock') || content.includes('async-lock')) {
            criticalIssues.push(`⚠️ AsyncLock detected in ${file} - REMOVE IMMEDIATELY`);
          }
          
          if (content.includes('proper-lockfile') || content.includes('lockfile.lock')) {
            criticalIssues.push(`⚠️ proper-lockfile detected in ${file} - REMOVE IMMEDIATELY`);
          }
          
          if (content.includes('lock.acquire(') && content.includes('playerState')) {
            criticalIssues.push(`⚠️ Lock acquisition in player state detected in ${file}`);
          }
          
        } catch {}
      }
      
      // Check operation timings
      for (const [operation, timings] of this.operationTimings.entries()) {
        if (timings.length >= 3) {
          const avgMs = timings.reduce((sum, t) => sum + t, 0) / timings.length;
          if (avgMs > 3000) {
            warnings.push(`🐌 ${operation} averaging ${Math.round(avgMs)}ms (should be <1000ms)`);
          }
        }
      }
      
    } catch (scanError) {
      warnings.push('Could not scan codebase for AsyncLock patterns');
    }
    
    return {
      warnings,
      criticalIssues,
      safeModeStatus: this.safeModeConfig
    };
  }

  async getLearningSummary() {
    await this.loadKnowledgeBase();
    
    const byType = this.knowledgeBase.reduce((acc, entry) => {
      acc[entry.errorType] = (acc[entry.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byImpact = this.knowledgeBase.reduce((acc, entry) => {
      acc[entry.impact] = (acc[entry.impact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const criticalIncidents = this.knowledgeBase.filter(e => e.impact === 'CRITICAL');
    const totalDebuggingHours = this.knowledgeBase
      .filter(e => e.debuggingTimeHours)
      .reduce((sum, e) => sum + (e.debuggingTimeHours || 0), 0);
    
    return {
      totalLearnings: this.knowledgeBase.length,
      byErrorType: byType,
      byImpact: byImpact,
      criticalIncidents: criticalIncidents.length,
      totalDebuggingHours,
      preventionChecks: (await this.getPreventionChecklist()).length,
      safeModeActive: this.safeModeConfig.enabled,
      asyncLockPrevention: this.safeModeConfig.bypassAsyncLock,
      lastUpdated: this.knowledgeBase.length > 0 
        ? Math.max(...this.knowledgeBase.map(e => new Date(e.timestamp).getTime()))
        : null,
      recentOperationTimings: Object.fromEntries(
        Array.from(this.operationTimings.entries()).map(([op, timings]) => [
          op, 
          {
            count: timings.length,
            averageMs: timings.length > 0 ? Math.round(timings.reduce((s, t) => s + t, 0) / timings.length) : 0,
            maxMs: timings.length > 0 ? Math.max(...timings) : 0
          }
        ])
      ),
      status: 'AsyncLock deadlock prevention active - JSON-first operations protected'
    };
  }

  // 🆕 TRAIN LUNA ON PATTERNS (Enhanced with safe mode integration)
  async trainOnPattern(pattern: LearningEntry): Promise<void> {
    await this.loadKnowledgeBase();
    
    // Record timing if provided
    if (pattern.debuggingTimeHours && pattern.debuggingTimeHours > 3) {
      console.log(`🌙 🚨 CRITICAL PATTERN LEARNED: ${pattern.errorType} (${pattern.debuggingTimeHours}h debug time)`);
      
      // Auto-update safe mode for critical patterns
      if (pattern.errorType === 'ASYNC_LOCK_DEADLOCK' || pattern.errorType === 'PROPER_LOCKFILE_HANG') {
        this.safeModeConfig.bypassAsyncLock = true;
        this.safeModeConfig.bypassProperLockfile = true;
        await this.saveSafeModeConfig();
        console.log('🌙 🛡️ Safe mode auto-updated to prevent recurrence');
      }
    }
    
    this.knowledgeBase.push(pattern);
    
    // Keep knowledge base manageable (last 50 entries)
    if (this.knowledgeBase.length > 50) {
      this.knowledgeBase = this.knowledgeBase
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);
    }
    
    await this.saveKnowledgeBase();
  }

  // 🆕 AUTO-FIX GENERATOR: Create patches for known issues
  async generateAutoFix(errorType: LunaIncidentType): Promise<string | null> {
    await this.loadKnowledgeBase();
    
    const matchingIncident = this.knowledgeBase.find(e => e.errorType === errorType);
    if (!matchingIncident) return null;
    
    switch (errorType) {
      case 'ASYNC_LOCK_DEADLOCK':
        return `// 🌙 LUNA AUTO-FIX: Remove AsyncLock deadlock

// 1. Remove these imports:
// import AsyncLock from 'async-lock';
// import lockfile from 'proper-lockfile';

// 2. Replace with direct operations:
class SimplePlayerStateManager {
  private cache = new Map<string, PlayerState>();
  
  async updatePlayer(playerId: string, updates: any) {
    const current = await this.loadFromJSON(playerId);
    const updated = { ...current, ...updates };
    
    await this.saveToJSON(playerId, updated);
    this.cache.set(playerId, updated);
    
    // Background DB sync
    this.syncToDatabase(playerId, updated).catch(console.error);
    
    return updated;
  }
}

// 3. Test operations complete in <1s`;
        
      case 'JSON_FIRST_BLOCKING':
        return `// 🌙 LUNA AUTO-FIX: Admin editor JSON-first sync

// Admin routes must write JSON + DB + refresh memory:
app.post('/api/admin/upgrades', async (req, res) => {
  const upgrade = req.body;
  
  // 1. Save to JSON (runtime source)
  await saveUpgradeToJSON(upgrade);
  
  // 2. Save to DB (background)
  storage.createUpgrade(upgrade).catch(console.error);
  
  // 3. Refresh memory
  await masterDataService.reloadUpgrades();
  
  // 4. Return fresh data
  res.json({ upgrades: getUpgradesFromMemory() });
});`;
        
      default:
        return null;
    }
  }

  // 🆕 EMERGENCY MODE: Bypass all problematic modules immediately
  async activateEmergencyMode(): Promise<void> {
    console.log('🌙 🚨 LUNA EMERGENCY MODE ACTIVATED');
    
    this.safeModeConfig = {
      enabled: true,
      bypassAsyncLock: true,
      bypassProperLockfile: true,
      maxOperationTimeMs: 500, // Even stricter in emergency
      autoFixEnabled: true
    };
    
    await this.saveSafeModeConfig();
    
    // Train on emergency activation
    await this.trainOnPattern({
      timestamp: new Date(),
      errorPattern: 'Emergency mode activated due to system deadlock',
      errorType: 'ASYNC_LOCK_DEADLOCK',
      impact: 'CRITICAL',
      solution: 'All blocking modules bypassed. Direct operations only.',
      preventionChecks: [
        'Emergency mode bypasses all known problematic modules',
        'Operations limited to 500ms maximum',
        'Auto-fix enabled for immediate remediation'
      ]
    });
    
    console.log('🌙 🚨 Emergency mode configured and trained');
  }

  // 🆕 METRICS: Get detailed operation analysis
  getOperationMetrics(): Record<string, { averageMs: number; maxMs: number; count: number; status: string }> {
    const metrics: Record<string, any> = {};
    
    for (const [operation, timings] of this.operationTimings.entries()) {
      const averageMs = timings.reduce((sum, t) => sum + t, 0) / timings.length;
      const maxMs = Math.max(...timings);
      
      let status = 'healthy';
      if (averageMs > 3000) status = 'critical';
      else if (averageMs > 1000) status = 'warning';
      
      metrics[operation] = {
        averageMs: Math.round(averageMs),
        maxMs,
        count: timings.length,
        status
      };
    }
    
    return metrics;
  }
}

// 🌙 Global singleton with enhanced capabilities
export const lunaLearning = new LunaLearningSystem();

// 🌙 RUNTIME TIMING HELPER: Use this to train Luna on operation speeds
export const lunaTimeOperation = <T>(operationName: string, promise: Promise<T>): Promise<T> => {
  const start = Date.now();
  return promise.finally(() => {
    const duration = Date.now() - start;
    lunaLearning.recordOperationTiming(operationName, duration);
  });
};

console.log('🌙 🧠 Luna Learning System enhanced with AsyncLock deadlock prevention');

export default lunaLearning;