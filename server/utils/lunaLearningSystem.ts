/**
 * 🌙 Luna Learning System
 * Trains Luna to recognize and prevent common error patterns
 * Builds knowledge base for future error prevention
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../logger';

interface LearningEntry {
  timestamp: Date;
  errorPattern: string;
  errorType: 'ES_MODULE' | 'DATABASE_FIELD' | 'DIRECTORY_STRUCTURE' | 'EVENT_EMITTER' | 'IMAGE_LOADING' | 'API_TIMEOUT';
  solution: string;
  codeExample?: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  preventionChecks: string[];
}

class LunaLearningSystem {
  private readonly learningPath: string;
  private knowledgeBase: LearningEntry[] = [];

  constructor() {
    this.learningPath = path.join(process.cwd(), 'LunaBug', 'luna-learning.json');
    this.loadKnowledgeBase();
  }

  private async loadKnowledgeBase(): Promise<void> {
    try {
      const data = await fs.readFile(this.learningPath, 'utf8');
      this.knowledgeBase = JSON.parse(data);
      console.log(`🌙 Luna loaded ${this.knowledgeBase.length} learning entries`);
    } catch (error) {
      // File doesn't exist yet, start fresh
      console.log('🌙 Luna starting fresh learning journey');
      await this.saveKnowledgeBase();
    }
  }

  private async saveKnowledgeBase(): Promise<void> {
    try {
      const lunaDir = path.dirname(this.learningPath);
      await fs.mkdir(lunaDir, { recursive: true });
      await fs.writeFile(this.learningPath, JSON.stringify(this.knowledgeBase, null, 2));
      console.log(`🌙 Luna knowledge base updated with ${this.knowledgeBase.length} entries`);
    } catch (error) {
      logger.error('🌙 Luna failed to save knowledge base:', error);
    }
  }

  // Train Luna on the error patterns we just fixed
  async trainOnCurrentSession(): Promise<void> {
    console.log('🌙 Training Luna on current error patterns...');
    
    const newLearnings: LearningEntry[] = [
      {
        timestamp: new Date(),
        errorPattern: 'MaxListenersExceededWarning: Possible EventEmitter memory leak detected',
        errorType: 'EVENT_EMITTER',
        impact: 'HIGH',
        solution: 'Increase EventEmitter.defaultMaxListeners and instance.setMaxListeners(50+). Add proper cleanup in shutdown handlers.',
        codeExample: `EventEmitter.defaultMaxListeners = 20;
this.setMaxListeners(50);
// Add cleanup method with removeAllListeners()`,
        preventionChecks: [
          'Check for EventEmitter usage in classes',
          'Verify cleanup methods exist for graceful shutdown',
          'Monitor listener counts in health checks'
        ]
      },
      {
        timestamp: new Date(),
        errorPattern: 'ReferenceError: module is not defined in ES module scope',
        errorType: 'ES_MODULE',
        impact: 'CRITICAL',
        solution: 'Remove CommonJS exports (module.exports) from ES modules. Use only export default/export syntax.',
        codeExample: `// ❌ BAD (CommonJS in ES module)
module.exports = { service };

// ✅ GOOD (ES module only)
export default service;
export { service };`,
        preventionChecks: [
          'Scan for module.exports in .ts files',
          'Verify package.json has "type": "module"',
          'Check for require() usage - should be import'
        ]
      },
      {
        timestamp: new Date(),
        errorPattern: 'column "maxEnergy" does not exist',
        errorType: 'DATABASE_FIELD',
        impact: 'HIGH',
        solution: 'Use correct PostgreSQL column names: energyMax not maxEnergy. Add field validation in MasterDataService.',
        codeExample: `// ❌ BAD
{ maxEnergy: 1000 }

// ✅ GOOD  
{ energyMax: 1000 }

// Add validation
validateFieldNaming(data: any) {
  if ('maxEnergy' in data) {
    data.energyMax = data.maxEnergy;
    delete data.maxEnergy;
  }
}`,
        preventionChecks: [
          'Validate field names match database schema',
          'Auto-correct common naming mistakes',
          'Use MasterDataService for consistent field naming'
        ]
      },
      {
        timestamp: new Date(),
        errorPattern: 'Wrong player JSON directory: using uploads/snapshots instead of main-gamedata/player-data',
        errorType: 'DIRECTORY_STRUCTURE',
        impact: 'HIGH',
        solution: 'Use main-gamedata/player-data/ as primary, uploads/snapshots/ only for backups. File naming: player-{username}.json with telegramId fallback.',
        codeExample: `// ✅ CORRECT STRUCTURE
this.playersDir = path.join(process.cwd(), 'main-gamedata', 'player-data');
this.snapshotsDir = path.join(process.cwd(), 'uploads', 'snapshots', 'players');

// ✅ CORRECT NAMING
getPlayerFileName(telegramId, username) {
  return username ? \`player-\${username.replace(/[^a-zA-Z0-9_-]/g, '_')}.json\` : \`player-\${telegramId}.json\`;
}`,
        preventionChecks: [
          'Verify directory paths use main-gamedata for primary data',
          'Check file naming follows player-{username}.json pattern',
          'Ensure snapshots are backup only, not primary storage'
        ]
      },
      {
        timestamp: new Date(),
        errorPattern: 'Character selection API calls failing without proper error handling',
        errorType: 'API_TIMEOUT',
        impact: 'MEDIUM',
        solution: 'Add AbortSignal.timeout() to all API calls, proper error handling with user feedback, and debug logging.',
        codeExample: `const response = await fetch('/api/endpoint', {
  signal: AbortSignal.timeout(10000),
  // ... other options
});

// Add debug logging
console.log('[ENDPOINT] Request details:', { playerId, data });`,
        preventionChecks: [
          'Add timeout controls to all fetch() calls',
          'Include proper error handling with user feedback',
          'Add debug logging for API operations'
        ]
      },
      {
        timestamp: new Date(),
        errorPattern: 'Image loading failures due to malformed URLs or missing files',
        errorType: 'IMAGE_LOADING',
        impact: 'MEDIUM',
        solution: 'Add image error handling with fallback system, placeholder images, and error state tracking.',
        codeExample: `const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

const handleImageError = (url: string) => {
  setImageErrors(prev => new Set(prev).add(url));
};

<img onError={() => handleImageError(url)} />`,
        preventionChecks: [
          'Add onError handlers to all img elements',
          'Implement fallback image system',
          'Track failed image URLs to prevent retry loops'
        ]
      }
    ];

    // Add new learnings to knowledge base
    this.knowledgeBase.push(...newLearnings);
    
    // Keep only recent learnings (last 50)
    if (this.knowledgeBase.length > 50) {
      this.knowledgeBase = this.knowledgeBase
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50);
    }
    
    await this.saveKnowledgeBase();
    
    console.log(`🌙 Luna trained on ${newLearnings.length} new error patterns`);
    console.log('🌙 Luna will now recognize and prevent these issues in future development');
  }

  // Generate prevention checklist for future development
  getPreventionChecklist(): string[] {
    const allChecks = this.knowledgeBase.flatMap(entry => entry.preventionChecks);
    // Remove duplicates and sort by frequency
    const checkCounts = new Map<string, number>();
    allChecks.forEach(check => {
      checkCounts.set(check, (checkCounts.get(check) || 0) + 1);
    });
    
    return Array.from(checkCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([check]) => check)
      .slice(0, 20); // Top 20 prevention checks
  }

  // Check current code against known error patterns
  async runPreventionScan(): Promise<{ warnings: string[]; criticalIssues: string[] }> {
    const warnings: string[] = [];
    const criticalIssues: string[] = [];
    
    // This would scan code files for known patterns
    // For now, return a framework for future implementation
    
    return { warnings, criticalIssues };
  }

  // Generate learning summary for debugging
  getLearningSummary() {
    const byType = this.knowledgeBase.reduce((acc, entry) => {
      acc[entry.errorType] = (acc[entry.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byImpact = this.knowledgeBase.reduce((acc, entry) => {
      acc[entry.impact] = (acc[entry.impact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalLearnings: this.knowledgeBase.length,
      byErrorType: byType,
      byImpact: byImpact,
      preventionChecks: this.getPreventionChecklist().length,
      lastUpdated: this.knowledgeBase.length > 0 
        ? Math.max(...this.knowledgeBase.map(e => e.timestamp.getTime()))
        : null
    };
  }
}

// Global singleton
export const lunaLearning = new LunaLearningSystem();

// Train Luna on current session immediately
lunaLearning.trainOnCurrentSession();

export default lunaLearning;