/**
 * Luna's Memory & Learning System
 * Logs all conversations and debugging sessions for continuous learning
 * Prevents repeated questions and builds architectural knowledge
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DebugSession {
  sessionId: string;
  startTime: string;
  type: 'debugging' | 'chat';
  issueType: string;
  violations: string[];
  fixes: string[];
  outcome: string;
  duration?: string;
  summary?: string;
}

interface ChatSession {
  sessionId: string;
  startTime: string;
  topic: string;
  messages: any[];
  context: any;
  tags: string[];
}

class LunaMemorySystem {
  private memoryPaths = {
    chatSessions: path.join(__dirname, '../../luna-memory/chat-sessions.json'),
    debugSessions: path.join(__dirname, '../../luna-memory/debug-sessions.json'),
    learnedPatterns: path.join(__dirname, '../../luna-memory/learned-patterns.json'),
    architecturalKnowledge: path.join(__dirname, '../../luna-memory/architectural-knowledge.json')
  };

  private currentSession: DebugSession | null = null;

  constructor() {
    this.initializeMemoryFiles();
    logger.info('🧠 Luna Memory System initialized');
  }

  private initializeMemoryFiles(): void {
    // Create luna-memory directory if it doesn't exist
    const memoryDir = path.dirname(this.memoryPaths.chatSessions);
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    // Initialize empty JSON files
    Object.values(this.memoryPaths).forEach(filePath => {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }
    });
  }

  /**
   * Start a debugging session
   */
  startDebuggingSession(issueType: string, violations: string[]): string {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      sessionId,
      startTime: new Date().toISOString(),
      type: 'debugging',
      issueType,
      violations,
      fixes: [],
      outcome: 'in_progress'
    };

    logger.info(`🔧 Luna: Started debugging session ${sessionId} for ${issueType}`);
    return sessionId;
  }

  /**
   * Log a fix applied during debugging
   */
  logFix(description: string, filePath?: string): void {
    if (!this.currentSession) {
      logger.warn('No active debugging session to log fix');
      return;
    }

    this.currentSession.fixes.push({
      description,
      filePath,
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Luna: Logged fix - ${description}`);
  }

  /**
   * End debugging session and save to memory
   */
  endDebuggingSession(outcome: 'resolved' | 'partial' | 'failed', summary?: string): void {
    if (!this.currentSession) {
      logger.warn('No active debugging session to end');
      return;
    }

    this.currentSession.outcome = outcome;
    this.currentSession.summary = summary;
    this.currentSession.duration = this.calculateDuration(this.currentSession.startTime);

    // Save to debug sessions file
    const debugSessions = this.loadJsonFile(this.memoryPaths.debugSessions);
    debugSessions.push(this.currentSession);
    this.saveJsonFile(this.memoryPaths.debugSessions, debugSessions);

    // Update learned patterns
    this.updateLearnedPatterns(this.currentSession);

    logger.info(`✅ Luna: Debugging session ${this.currentSession.sessionId} ended with outcome: ${outcome}`);
    this.currentSession = null;
  }

  /**
   * Check if a similar issue has been encountered before
   */
  findSimilarIssues(issueDescription: string): any[] {
    const debugSessions = this.loadJsonFile(this.memoryPaths.debugSessions);
    
    const similarSessions = debugSessions.filter((session: any) => {
      const similarity = this.calculateSimilarity(issueDescription, session.issueType);
      return similarity > 0.6;
    });

    return similarSessions.map((session: any) => ({
      sessionId: session.sessionId,
      issueType: session.issueType,
      fixes: session.fixes,
      outcome: session.outcome,
      date: session.startTime
    }));
  }

  /**
   * Get Luna's architectural knowledge report
   */
  getArchitecturalKnowledgeReport(): any {
    const debugSessions = this.loadJsonFile(this.memoryPaths.debugSessions);
    const learnedPatterns = this.loadJsonFile(this.memoryPaths.learnedPatterns);

    const commonViolations = this.analyzeCommonViolations(debugSessions);
    const successfulFixes = this.analyzeSuccessfulFixes(debugSessions);

    return {
      totalDebuggingSessions: debugSessions.length,
      commonViolations,
      successfulFixes,
      learnedPatterns: learnedPatterns.length,
      architecturalRules: this.getArchitecturalRules()
    };
  }

  /**
   * Update learned patterns based on debugging session
   */
  private updateLearnedPatterns(session: DebugSession): void {
    const patterns = this.loadJsonFile(this.memoryPaths.learnedPatterns);
    
    // Extract patterns from this session
    session.violations.forEach(violation => {
      const existingPattern = patterns.find((p: any) => p.violation === violation);
      
      if (existingPattern) {
        existingPattern.occurrences++;
        existingPattern.lastSeen = new Date().toISOString();
        if (session.outcome === 'resolved') {
          existingPattern.successfulFixes.push(...session.fixes);
        }
      } else {
        patterns.push({
          violation,
          occurrences: 1,
          firstSeen: session.startTime,
          lastSeen: session.startTime,
          successfulFixes: session.outcome === 'resolved' ? [...session.fixes] : [],
          category: this.categorizeViolation(violation)
        });
      }
    });

    this.saveJsonFile(this.memoryPaths.learnedPatterns, patterns);
  }

  /**
   * Get architectural rules Luna has learned
   */
  private getArchitecturalRules(): any {
    return {
      namingConsistency: {
        rule: "Use energyMax instead of maxEnergy",
        rule2: "Use energyRegen for regeneration upgrades",
        importance: "critical"
      },
      separationOfConcerns: {
        rule: "Routes should not contain business logic",
        rule2: "Player creation belongs in service layer",
        importance: "critical"
      },
      singleSourceOfTruth: {
        rule: "All game defaults must come from master JSON files",
        rule2: "No hardcoded values in business logic",
        importance: "high"
      }
    };
  }

  /**
   * Analyze common violations across sessions
   */
  private analyzeCommonViolations(sessions: any[]): any[] {
    const violationCounts: Record<string, number> = {};
    
    sessions.forEach(session => {
      session.violations.forEach((violation: string) => {
        violationCounts[violation] = (violationCounts[violation] || 0) + 1;
      });
    });

    return Object.entries(violationCounts)
      .map(([violation, count]) => ({ violation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Analyze successful fixes
   */
  private analyzeSuccessfulFixes(sessions: any[]): any[] {
    return sessions
      .filter(session => session.outcome === 'resolved')
      .flatMap(session => session.fixes)
      .reduce((acc: any[], fix: any) => {
        const existing = acc.find(f => f.description === fix.description);
        if (existing) {
          existing.usageCount++;
        } else {
          acc.push({ ...fix, usageCount: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Calculate similarity between two text strings
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  /**
   * Categorize a violation type
   */
  private categorizeViolation(violation: string): string {
    if (violation.includes('hardcoded')) return 'hardcoded-data';
    if (violation.includes('naming')) return 'naming-inconsistency';
    if (violation.includes('route') || violation.includes('business logic')) return 'architectural';
    if (violation.includes('field')) return 'data-structure';
    return 'other';
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return `luna_debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDuration(startTime: string): string {
    const start = new Date(startTime);
    const end = new Date();
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minutes`;
  }

  private loadJsonFile(filePath: string): any[] {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return [];
    }
  }

  private saveJsonFile(filePath: string, data: any[]): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

// Export singleton instance
export const lunaMemorySystem = new LunaMemorySystem();

// Initialize first debugging session for this architectural fix
const sessionId = lunaMemorySystem.startDebuggingSession(
  'ClassikLust Architectural Violations',
  [
    'Hardcoded player data in routes.ts',
    'maxEnergy vs energyMax naming inconsistency', 
    'Business logic in route handlers',
    'No single source of truth for player defaults'
  ]
);

// Log the fixes applied
lunaMemorySystem.logFix('Fixed maxEnergy to energyMax in player-master.json', 'main-gamedata/master-data/player-master.json');
lunaMemorySystem.logFix('Created MasterDataService as single source of truth', 'server/utils/MasterDataService.ts');
lunaMemorySystem.logFix('Replaced hardcoded player creation in routes.ts', 'server/routes.ts');
lunaMemorySystem.logFix('Added Luna diagnostic endpoint for master data integrity', 'server/routes.ts');

// End the session
lunaMemorySystem.endDebuggingSession(
  'resolved',
  'Successfully eliminated all hardcoded player data and established single source of truth architecture'
);

export default lunaMemorySystem;
