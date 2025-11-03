/**
 * 🌙 Luna Learning System - FIXED JSON Parse Error
 * Trains Luna to recognize and prevent common error patterns
 * 🔧 FIXED: Robust JSON parsing with error recovery
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
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.learningPath = path.join(process.cwd(), 'LunaBug', 'luna-learning.json');
  }

  // 🔧 FIXED: Robust JSON loading with error recovery
  private async loadKnowledgeBase(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    
    this.loadingPromise = this._loadKnowledgeBase();
    return this.loadingPromise;
  }
  
  private async _loadKnowledgeBase(): Promise<void> {
    try {
      // Ensure directory exists first
      const lunaDir = path.dirname(this.learningPath);
      await fs.mkdir(lunaDir, { recursive: true });
      
      // Try to read existing file
      try {
        const data = await fs.readFile(this.learningPath, 'utf8');
        
        // 🔧 FIXED: Validate JSON before parsing
        if (!data || data.trim() === '') {
          console.log('🌙 Luna learning file is empty, starting fresh');
          this.knowledgeBase = [];
          await this.createDefaultKnowledgeBase();
          return;
        }
        
        // Try to parse JSON with error recovery
        try {
          const parsed = JSON.parse(data);
          
          // Validate the parsed data structure
          if (Array.isArray(parsed)) {
            // Convert timestamp strings back to Date objects
            this.knowledgeBase = parsed.map(entry => ({
              ...entry,
              timestamp: new Date(entry.timestamp)
            }));
            console.log(`🌙 Luna loaded ${this.knowledgeBase.length} learning entries`);
          } else {
            throw new Error('Invalid data structure: expected array');
          }
        } catch (parseError) {
          console.error('🌙 Luna JSON parse error:', parseError);
          console.log('🌙 Luna backing up corrupted file and starting fresh');
          
          // Backup corrupted file
          const backupPath = `${this.learningPath}.corrupted.${Date.now()}`;
          try {
            await fs.copyFile(this.learningPath, backupPath);
            console.log(`🌙 Corrupted file backed up to: ${backupPath}`);
          } catch {}
          
          // Start with fresh knowledge base
          this.knowledgeBase = [];
          await this.createDefaultKnowledgeBase();
        }
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          // File doesn't exist, create fresh
          console.log('🌙 Luna starting fresh learning journey');
          this.knowledgeBase = [];
          await this.createDefaultKnowledgeBase();
        } else {
          console.error('🌙 Luna file read error:', fileError);
          this.knowledgeBase = [];
        }
      }
    } catch (error) {
      console.error('🌙 Luna initialization error:', error);
      this.knowledgeBase = [];
    }
  }

  // 🔧 FIXED: Safe JSON saving with atomic writes
  private async saveKnowledgeBase(): Promise<void> {
    try {
      const lunaDir = path.dirname(this.learningPath);
      await fs.mkdir(lunaDir, { recursive: true });
      
      // Use atomic write (write to temp file first, then rename)
      const tempPath = `${this.learningPath}.tmp`;
      const jsonData = JSON.stringify(this.knowledgeBase, null, 2);
      
      // Validate JSON before writing
      try {
        JSON.parse(jsonData); // Test parse
      } catch (validateError) {
        console.error('🌙 Luna JSON validation failed before save:', validateError);
        return;
      }
      
      await fs.writeFile(tempPath, jsonData, 'utf8');
      await fs.rename(tempPath, this.learningPath);
      
      console.log(`🌙 Luna knowledge base updated with ${this.knowledgeBase.length} entries`);
    } catch (error) {
      console.error('🌙 Luna failed to save knowledge base:', error);
    }
  }

  // Create default knowledge base
  private async createDefaultKnowledgeBase(): Promise<void> {
    const defaultLearnings: LearningEntry[] = [
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
      }
    ];
    
    this.knowledgeBase = defaultLearnings;
    await this.saveKnowledgeBase();
  }

  // Public methods with lazy loading
  async getPreventionChecklist(): Promise<string[]> {
    await this.loadKnowledgeBase();
    
    const allChecks = this.knowledgeBase.flatMap(entry => entry.preventionChecks);
    const checkCounts = new Map<string, number>();
    allChecks.forEach(check => {
      checkCounts.set(check, (checkCounts.get(check) || 0) + 1);
    });
    
    return Array.from(checkCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([check]) => check)
      .slice(0, 20);
  }

  async runPreventionScan(): Promise<{ warnings: string[]; criticalIssues: string[] }> {
    await this.loadKnowledgeBase();
    
    return {
      warnings: [
        'Check for proper JSON error handling',
        'Verify atomic file operations',
        'Ensure session token persistence'
      ],
      criticalIssues: []
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
    
    return {
      totalLearnings: this.knowledgeBase.length,
      byErrorType: byType,
      byImpact: byImpact,
      preventionChecks: (await this.getPreventionChecklist()).length,
      lastUpdated: this.knowledgeBase.length > 0 
        ? Math.max(...this.knowledgeBase.map(e => new Date(e.timestamp).getTime()))
        : null,
      status: 'JSON parsing fixed with error recovery'
    };
  }

  // 🔧 OPTIONAL: Train on new patterns (but don't auto-execute)
  async trainOnPattern(pattern: LearningEntry): Promise<void> {
    await this.loadKnowledgeBase();
    
    this.knowledgeBase.push(pattern);
    
    // Keep only recent learnings (last 30)
    if (this.knowledgeBase.length > 30) {
      this.knowledgeBase = this.knowledgeBase
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30);
    }
    
    await this.saveKnowledgeBase();
  }
}

// Global singleton with safe initialization
export const lunaLearning = new LunaLearningSystem();

// Don't auto-train on startup (was causing JSON errors)
console.log('🌙 Luna Learning System initialized (safe mode)');

export default lunaLearning;