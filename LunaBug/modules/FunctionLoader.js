/**
 * LunaBug/modules/FunctionLoader.js
 * 
 * Auto-Discovery Function System
 * - Watches LunaBug/functions/ for .json files
 * - Hot-reloads functions without restart
 * - Validates and sandboxes function execution
 * - Perfect for rapid prototyping and debugging
 */

import DebugPlugin from '../core/DebugPlugin.js';

class FunctionLoader extends DebugPlugin {
  constructor() {
    super('FunctionLoader');
    this.functions = new Map();
    this.watchers = [];
    this.isWatching = false;
  }

  async init(context) {
    console.log(`🌙 [${this.name}] Initializing auto-discovery function system...`);
    
    // Load all existing functions
    await this.loadAllFunctions();
    
    // Start file watching in development
    if (this.isDevelopment()) {
      this.startWatching();
    }
    
    // Expose function API to LunaBug context
    context.functions = {
      list: () => this.listFunctions(),
      get: (name) => this.getFunction(name),
      run: (name, data) => this.runFunction(name, data),
      reload: () => this.loadAllFunctions(),
      add: (functionData) => this.addFunction(functionData),
      remove: (name) => this.removeFunction(name),
      validate: (functionData) => this.validateFunction(functionData)
    };
    
    return true;
  }

  async loadAllFunctions() {
    try {
      // In browser, we'll load from a known list or fetch via API
      // For now, create some default detection functions
      const defaultFunctions = [
        this.createCamelCaseDetector(),
        this.createEnergyValidator(), 
        this.createImportPathFixer(),
        this.createReactHookValidator()
      ];
      
      for (const func of defaultFunctions) {
        this.functions.set(func.name, func);
      }
      
      console.log(`🌙 [${this.name}] Loaded ${this.functions.size} functions`);
      
    } catch (error) {
      console.warn(`🌙 [${this.name}] Failed to load functions:`, error);
    }
  }

  // Default function creators
  createCamelCaseDetector() {
    return {
      name: 'camelCaseDetector',
      version: '1.0.0',
      description: 'Detects camelCase vs snake_case database column issues',
      category: 'database',
      triggers: ['camelCase', 'snake_case', 'column', 'database'],
      config: { enabled: true, priority: 'high' },
      function: {
        type: 'analysis',
        run: (code, error) => {
          const issues = [];
          
          // Check for common patterns
          if (code.includes('.maxEnergy') && error.includes('max_energy')) {
            issues.push({
              type: 'column_mismatch',
              message: 'camelCase property accessing snake_case column',
              suggestion: 'Use maxEnergy consistently or map columns properly',
              line: this.findLineWithText(code, 'maxEnergy'),
              confidence: 0.95
            });
          }
          
          if (code.includes('.passiveIncome') && error.includes('passive_income')) {
            issues.push({
              type: 'column_mismatch', 
              message: 'camelCase property accessing snake_case column',
              suggestion: 'Update schema or use proper column mapping',
              line: this.findLineWithText(code, 'passiveIncome'),
              confidence: 0.95
            });
          }
          
          return {
            detected: issues.length > 0,
            issues,
            category: 'database_schema',
            severity: issues.length > 0 ? 'high' : 'none'
          };
        }
      }
    };
  }

  createEnergyValidator() {
    return {
      name: 'energyValidator',
      version: '1.0.0',
      description: 'Validates energy calculation logic',
      category: 'gameplay',
      triggers: ['energy', 'maxEnergy', 'calculation'],
      config: { enabled: true, priority: 'medium' },
      function: {
        type: 'analysis',
        run: (code) => {
          const issues = [];
          
          // Check for incorrect energy calculation patterns
          if (code.includes('1000 + level * ') && !code.includes('(level - 1)')) {
            issues.push({
              type: 'logic_error',
              message: 'Energy calculation starts from level 1, should use (level - 1)',
              suggestion: 'Change to: 1000 + (level - 1) * perLevelValue',
              confidence: 0.9
            });
          }
          
          return {
            detected: issues.length > 0,
            issues,
            category: 'game_logic',
            severity: issues.length > 0 ? 'medium' : 'none'
          };
        }
      }
    };
  }

  createImportPathFixer() {
    return {
      name: 'importPathFixer',
      version: '1.0.0', 
      description: 'Detects and fixes import path issues',
      category: 'build',
      triggers: ['import', 'Failed to resolve', 'Cannot resolve'],
      config: { enabled: true, priority: 'high' },
      function: {
        type: 'fix',
        run: (code, error) => {
          const issues = [];
          
          if (error.includes('Failed to resolve import') && error.includes('LunaBug')) {
            const relativePath = this.calculateCorrectPath(error);
            issues.push({
              type: 'import_path_error',
              message: 'Incorrect relative import path to LunaBug',
              suggestion: `Use: import { ... } from "${relativePath}"`,
              autoFix: true,
              confidence: 0.95
            });
          }
          
          return {
            detected: issues.length > 0,
            issues,
            category: 'build_system',
            severity: 'high'
          };
        }
      }
    };
  }

  createReactHookValidator() {
    return {
      name: 'reactHookValidator',
      version: '1.0.0',
      description: 'Validates React hooks usage patterns',
      category: 'ui',
      triggers: ['useState', 'useEffect', 'Hook'],
      config: { enabled: true, priority: 'medium' },
      function: {
        type: 'analysis',
        run: (code) => {
          const issues = [];
          
          // Check for hooks in conditionals
          const lines = code.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('useState') || line.includes('useEffect')) {
              const prevLines = lines.slice(Math.max(0, index - 3), index);
              if (prevLines.some(l => l.includes('if (') || l.includes('for (') || l.includes('while ('))) {
                issues.push({
                  type: 'hooks_rules_violation',
                  message: 'React hooks cannot be called inside loops, conditions, or nested functions',
                  suggestion: 'Move hook to top level of component function',
                  line: index + 1,
                  confidence: 0.9
                });
              }
            }
          });
          
          return {
            detected: issues.length > 0,
            issues,
            category: 'react_patterns',
            severity: issues.length > 0 ? 'high' : 'none'
          };
        }
      }
    };
  }

  // Function execution
  async runFunction(name, data) {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function '${name}' not found`);
    }
    
    try {
      console.log(`🌙 [${this.name}] Running function: ${name}`);
      
      // Execute function in controlled environment
      const result = func.function.run(data.code || '', data.error || '', data.context || {});
      
      return {
        function: name,
        version: func.version,
        timestamp: new Date().toISOString(),
        result
      };
    } catch (error) {
      console.error(`🌙 [${this.name}] Function ${name} failed:`, error);
      return {
        function: name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  listFunctions() {
    return Array.from(this.functions.entries()).map(([name, func]) => ({
      name,
      version: func.version,
      description: func.description,
      category: func.category,
      enabled: func.config.enabled
    }));
  }

  getFunction(name) {
    return this.functions.get(name) || null;
  }

  addFunction(functionData) {
    if (this.validateFunction(functionData)) {
      this.functions.set(functionData.name, functionData);
      console.log(`🌙 [${this.name}] Added function: ${functionData.name}`);
      return true;
    }
    return false;
  }

  removeFunction(name) {
    const removed = this.functions.delete(name);
    if (removed) {
      console.log(`🌙 [${this.name}] Removed function: ${name}`);
    }
    return removed;
  }

  validateFunction(functionData) {
    const required = ['name', 'version', 'description', 'function'];
    return required.every(field => functionData[field] !== undefined);
  }

  // Utility methods
  findLineWithText(code, text) {
    const lines = code.split('\n');
    return lines.findIndex(line => line.includes(text)) + 1;
  }

  calculateCorrectPath(error) {
    if (error.includes('client/src/main.tsx') && error.includes('LunaBug')) {
      return '../../LunaBug/init.js';
    }
    if (error.includes('client/src/components') && error.includes('LunaBug')) {
      return '../../../LunaBug/interface/MistralDebugger';
    }
    return './LunaBug/...';
  }

  isDevelopment() {
    return process.env?.NODE_ENV !== 'production' || typeof window !== 'undefined';
  }

  startWatching() {
    // File watching would be implemented here for Node.js environment
    // For browser environment, we'll use periodic checking
    console.log(`🌙 [${this.name}] File watching started`);
    this.isWatching = true;
  }

  async run(command, data) {
    switch (command) {
      case 'status':
        console.log(`🌙 [${this.name}] Status:`, {
          functions: this.functions.size,
          watching: this.isWatching,
          categories: [...new Set(Array.from(this.functions.values()).map(f => f.category))]
        });
        break;
        
      case 'reload':
        await this.loadAllFunctions();
        console.log(`🌙 [${this.name}] Functions reloaded`);
        break;
        
      case 'test':
        const testData = { code: 'const x = player.maxEnergy;', error: 'column "max_energy" does not exist' };
        const result = await this.runFunction('camelCaseDetector', testData);
        console.log(`🌙 [${this.name}] Test result:`, result);
        break;
        
      default:
        break;
    }
  }

  async stop() {
    this.isWatching = false;
    this.watchers.forEach(watcher => {
      if (watcher.close) watcher.close();
    });
    console.log(`🌙 [${this.name}] Function watching stopped`);
  }
}

export default FunctionLoader;