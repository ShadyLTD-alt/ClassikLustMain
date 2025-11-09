// 🌙 Luna Bug - Initialization Module (ESM)
import LunaBug from './luna.js';

// Factory creators
function createLuna() { 
  return new LunaBug(); 
}

function initLunaBug() { 
  return new LunaBug(); 
}

// Clean ESM exports
export default LunaBug;
export { LunaBug, createLuna, initLunaBug };