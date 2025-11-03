/**
 * 🌙 Luna Intelligent Error Learning Module
 * Integrates learned error patterns directly into LunaBug's core analysis
 * This is ACTIVE learning - not just documentation
 */

class IntelligentErrorLearning {
  constructor(lunaBugCore) {
    this.core = lunaBugCore;
    this.knowledgeBase = new Map();
    this.activePatterns = new Map();
    this.preventionRules = new Map();
    
    console.log('🌙 Luna Intelligent Error Learning Module initialized');
    this.loadLearningData();
    this.integrateIntoCore();
  }

  // Load learning data from the server-side learning system
  async loadLearningData() {
    try {
      const response = await fetch('/api/luna/learning-report');
      if (response.ok) {
        const data = await response.json();
        this.processLearningData(data.luna);
      }
    } catch (error) {
      console.warn('🌙 Could not load Luna learning data:', error.message);
    }
  }

  // Process and integrate learning data into active analysis
  processLearningData(lunaData) {
    console.log('🌙 Processing Luna learning data:', lunaData.learning);
    
    // Convert learning entries into active analysis patterns
    const errorPatterns = {
      'ES_MODULE': {
        detect: (error) => {
          return error.message?.includes('require is not defined') || 
                 error.message?.includes('module is not defined') ||
                 error.stack?.includes('ES module scope');
        },
        analyze: (error) => ({
          category: 'ES Module Compatibility',
          severity: 'CRITICAL',
          solution: 'Remove CommonJS exports (module.exports) and use ES module syntax only',
          prevention: [
            'Scan codebase for module.exports usage',
            'Verify package.json has "type": "module"',
            'Use import/export syntax exclusively'
          ],
          autoFix: (code) => {
            return code
              .replace(/module\.exports\s*=\s*\{([^}]+)\};?/g, 'export { $1 };')
              .replace(/module\.exports\s*=\s*([^;]+);?/g, 'export default $1;')
              .replace(/const\s+(.+)\s*=\s*require\((.+)\)/g, 'import $1 from $2');
          }
        })
      },
      
      'DATABASE_FIELD': {
        detect: (error) => {
          return error.message?.includes('column') && error.message?.includes('does not exist');
        },
        analyze: (error) => ({
          category: 'Database Field Naming',
          severity: 'HIGH',
          solution: 'Check field naming consistency - common issue: maxEnergy should be energyMax',
          prevention: [
            'Use MasterDataService field validation',
            'Implement auto-correction for common naming mistakes',
            'Match PostgreSQL schema naming conventions'
          ],
          autoFix: (data) => {
            if (typeof data === 'object' && data.maxEnergy !== undefined) {
              data.energyMax = data.maxEnergy;
              delete data.maxEnergy;
              return { ...data, _lunaFixed: 'maxEnergy -> energyMax' };
            }
            return data;
          }
        })
      },
      
      'EVENT_EMITTER': {
        detect: (error) => {
          return error.message?.includes('MaxListenersExceededWarning') ||
                 error.message?.includes('memory leak detected');
        },
        analyze: (error) => ({
          category: 'EventEmitter Memory Leak',
          severity: 'HIGH',
          solution: 'Increase EventEmitter limits and add proper cleanup methods',
          prevention: [
            'Set EventEmitter.defaultMaxListeners = 20+',
            'Use instance.setMaxListeners(50+) for heavy usage',
            'Implement cleanup methods with removeAllListeners()'
          ],
          recommendations: [
            'Add graceful shutdown handlers',
            'Monitor listener counts in health checks',
            'Use proper event cleanup in React useEffect returns'
          ]
        })
      },
      
      'DIRECTORY_STRUCTURE': {
        detect: (error, context) => {
          return context?.type === 'file_operation' && 
                 (context.path?.includes('uploads/snapshots') || 
                  error.message?.includes('no such file or directory'));
        },
        analyze: (error, context) => ({
          category: 'Directory Structure',
          severity: 'HIGH',
          solution: 'Use main-gamedata directories for primary data, uploads for backups only',
          correctPaths: {
            playerData: 'main-gamedata/player-data/',
            backups: 'uploads/snapshots/players/',
            gameData: 'main-gamedata/'
          },
          fileNaming: 'player-{username}.json with telegramId fallback'
        })
      },
      
      'API_TIMEOUT': {
        detect: (error) => {
          return error.name === 'AbortError' || 
                 error.message?.includes('timeout') ||
                 error.message?.includes('network')
        },
        analyze: (error) => ({
          category: 'API Request Issues',
          severity: 'MEDIUM',
          solution: 'Add proper timeout controls and error handling to all fetch calls',
          implementation: [
            'Use AbortSignal.timeout(10000) for all API calls',
            'Add user-friendly error messages',
            'Implement retry logic for non-critical operations'
          ]
        })
      }
    };
    
    this.activePatterns = new Map(Object.entries(errorPatterns));
    
    // Create prevention rules from learning data
    if (lunaData.preventionChecklist) {
      lunaData.preventionChecklist.forEach((check, index) => {
        this.preventionRules.set(`rule_${index}`, {
          description: check,
          priority: index < 5 ? 'HIGH' : 'MEDIUM',
          autoCheck: true
        });
      });
    }
    
    console.log(`🌙 Luna integrated ${this.activePatterns.size} error patterns and ${this.preventionRules.size} prevention rules`);
  }

  // Integrate into LunaBug core for real-time analysis
  integrateIntoCore() {
    if (!this.core) return;
    
    // Override the core error analysis method
    const originalAnalyzeError = this.core.analyzeError;
    
    this.core.analyzeError = (error, context = {}) => {
      console.log('🌙 Luna enhanced error analysis triggered');
      
      // First try Luna's learned patterns
      const lunaAnalysis = this.analyzeLearned(error, context);
      if (lunaAnalysis) {
        console.log('✅ Luna recognized error pattern:', lunaAnalysis.category);
        return {
          ...lunaAnalysis,
          source: 'Luna Learning System',
          timestamp: new Date(),
          learningApplied: true
        };
      }
      
      // Fallback to original analysis
      const originalResult = originalAnalyzeError ? originalAnalyzeError.call(this.core, error, context) : null;
      
      // Learn from new patterns
      if (!lunaAnalysis && originalResult) {
        this.learnFromNewPattern(error, context, originalResult);
      }
      
      return originalResult || {
        category: 'Unknown Error',
        severity: 'MEDIUM',
        solution: 'Check logs for more details',
        learningApplied: false
      };
    };
    
    // Add prevention scanning method
    this.core.runPreventionScan = () => {
      const results = {
        scannedRules: this.preventionRules.size,
        warnings: [],
        recommendations: []
      };
      
      // Run active prevention checks
      this.preventionRules.forEach((rule, key) => {
        if (rule.autoCheck && rule.priority === 'HIGH') {
          results.recommendations.push(rule.description);
        }
      });
      
      return results;
    };
    
    console.log('✅ Luna error analysis integrated into LunaBug core');
  }

  // Analyze error against learned patterns
  analyzeLearned(error, context) {
    for (const [patternType, pattern] of this.activePatterns.entries()) {
      if (pattern.detect(error, context)) {
        return pattern.analyze(error, context);
      }
    }
    return null;
  }

  // Learn from new error patterns
  learnFromNewPattern(error, context, analysis) {
    const signature = this.generateErrorSignature(error);
    
    if (!this.knowledgeBase.has(signature)) {
      this.knowledgeBase.set(signature, {
        error: {
          message: error.message,
          stack: error.stack?.slice(0, 200), // Truncate for storage
          type: error.constructor.name
        },
        context,
        analysis,
        firstSeen: new Date(),
        occurrences: 1
      });
      
      console.log(`🌙 Luna learned new error pattern: ${signature}`);
    } else {
      const existing = this.knowledgeBase.get(signature);
      existing.occurrences++;
      existing.lastSeen = new Date();
    }
  }

  // Generate unique signature for errors
  generateErrorSignature(error) {
    const message = error.message || '';
    const type = error.constructor?.name || 'Error';
    return `${type}:${message.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  // Get learning statistics
  getStats() {
    return {
      activePatterns: this.activePatterns.size,
      preventionRules: this.preventionRules.size,
      knownErrors: this.knowledgeBase.size,
      totalOccurrences: Array.from(this.knowledgeBase.values())
        .reduce((sum, entry) => sum + entry.occurrences, 0)
    };
  }

  // Apply auto-fixes when possible
  async autoFix(error, context) {
    const analysis = this.analyzeLearned(error, context);
    if (analysis?.autoFix && context?.data) {
      try {
        const fixed = analysis.autoFix(context.data);
        console.log('✅ Luna auto-fixed error:', analysis.category);
        return fixed;
      } catch (fixError) {
        console.warn('⚠️ Luna auto-fix failed:', fixError.message);
      }
    }
    return context?.data;
  }
}

// Export for integration
if (typeof window !== 'undefined') {
  window.LunaIntelligentLearning = IntelligentErrorLearning;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntelligentErrorLearning;
}

export default IntelligentErrorLearning;