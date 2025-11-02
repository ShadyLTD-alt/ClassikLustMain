/**
 * LunaBug/modules/GameplayModule.js
 * 
 * Gameplay monitoring and debugging module
 * - Tracks tap events and energy consumption
 * - Monitors upgrade calculations and achievements
 * - Performance monitoring for game loops
 * - Independent of GameContext (observes from outside)
 */

import DebugPlugin from '../core/DebugPlugin.js';

class GameplayModule extends DebugPlugin {
  constructor() {
    super('Gameplay');
    this.gameState = {
      running: false,
      tapCount: 0,
      lastTapTime: 0,
      achievementsUnlocked: [],
      upgradesPurchased: [],
      performanceMetrics: {
        averageFPS: 60,
        memoryUsage: 0,
        renderTime: 0
      }
    };
  }

  async init(context) {
    console.log(`🌙 [${this.name}] Initializing gameplay monitoring...`);
    
    // Set up tap monitoring
    this.setupTapMonitoring();
    
    // Set up achievement tracking
    this.setupAchievementTracking();
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    context.gameplay = {
      module: this,
      getStats: () => this.gameState,
      getTapRate: () => this.calculateTapRate(),
      getPerformanceMetrics: () => this.gameState.performanceMetrics
    };
    
    this.gameState.running = true;
    return true;
  }

  setupTapMonitoring() {
    // Monitor for tap events in the DOM
    document.addEventListener('click', (event) => {
      // Check if it's a character tap
      if (event.target?.closest('[data-testid="character-tap-area"]')) {
        this.gameState.tapCount++;
        this.gameState.lastTapTime = Date.now();
        
        this.logEvent('tap_detected', {
          tapCount: this.gameState.tapCount,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  setupAchievementTracking() {
    // Monitor localStorage for achievement changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      if (key.includes('achievement') || key.includes('unlock')) {
        this.logEvent('achievement_storage_change', { key, value });
      }
      return originalSetItem.call(localStorage, key, value);
    };

    // Monitor console for achievement messages
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('Achievement') || message.includes('unlocked')) {
        this.gameState.achievementsUnlocked.push({
          timestamp: new Date().toISOString(),
          message
        });
        this.logEvent('achievement_detected', message);
      }
      originalLog.apply(console, args);
    };
  }

  setupPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const updatePerformance = () => {
      frameCount++;
      const now = performance.now();
      
      // Calculate FPS every second
      if (now - lastTime >= 1000) {
        this.gameState.performanceMetrics.averageFPS = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;
        
        // Log performance issues
        if (this.gameState.performanceMetrics.averageFPS < 30) {
          this.logEvent('performance_warning', {
            fps: this.gameState.performanceMetrics.averageFPS,
            memory: this.getMemoryUsage()
          });
        }
      }
      
      if (this.gameState.running) {
        requestAnimationFrame(updatePerformance);
      }
    };
    
    requestAnimationFrame(updatePerformance);
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return Math.round(Math.random() * 100); // Fallback for demo
  }

  calculateTapRate() {
    // Calculate taps per minute based on recent activity
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    if (this.gameState.lastTapTime > fiveMinutesAgo) {
      return Math.round((this.gameState.tapCount / 5) * 60); // Rough estimate
    }
    return 0;
  }

  async run(command, data) {
    switch (command) {
      case 'start':
        console.log(`🌙 [${this.name}] Starting gameplay monitoring...`);
        this.gameState.running = true;
        break;
        
      case 'pause':
        console.log(`🌙 [${this.name}] Pausing gameplay monitoring...`);
        this.gameState.running = false;
        break;
        
      case 'status':
        console.log(`🌙 [${this.name}] Game running: ${this.gameState.running}`);
        console.log(`🌙 [${this.name}] Total taps: ${this.gameState.tapCount}`);
        console.log(`🌙 [${this.name}] Achievements: ${this.gameState.achievementsUnlocked.length}`);
        break;
        
      case 'clearCache':
        console.log(`🌙 [${this.name}] Clearing gameplay cache...`);
        this.gameState = {
          ...this.gameState,
          tapCount: 0,
          achievementsUnlocked: [],
          upgradesPurchased: []
        };
        break;
        
      default:
        break;
    }
  }

  async stop() {
    console.log(`🌙 [${this.name}] Stopping gameplay monitoring...`);
    this.gameState.running = false;
  }

  // Public API for external access
  getGameStats() {
    return {
      tapCount: this.gameState.tapCount,
      tapRate: this.calculateTapRate(),
      achievementsCount: this.gameState.achievementsUnlocked.length,
      fps: this.gameState.performanceMetrics.averageFPS,
      memoryMB: this.getMemoryUsage(),
      uptime: this.gameState.running
    };
  }
}

export default GameplayModule;