// 🌙 Luna Bug - Initialization Module
// This file provides the main entry point for @lunabug/init alias

// Re-export the main Luna class
const LunaBug = require('./luna');

// Convenience methods for easy initialization
const createLuna = () => new LunaBug();

const autoStart = async (delayMs = 2000) => {
  const luna = new LunaBug();
  
  setTimeout(async () => {
    try {
      await luna.start();
      console.log('✅ Luna auto-started successfully');
    } catch (error) {
      console.error('❌ Luna auto-start failed:', error);
    }
  }, delayMs);
  
  return luna;
};

// Export everything for flexible usage
module.exports = {
  LunaBug,
  createLuna,
  autoStart,
  // Direct class export for require('./init').LunaBug
  default: LunaBug
};

// Also support ES6 imports if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports.LunaBug = LunaBug;
  module.exports.default = LunaBug;
}