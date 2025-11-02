// 🌙 Luna Bug - Initialization Module (ESM-compatible)
// Provides stable exports for both CJS and ESM importers

const LunaBug = require('./luna');

// Factory creators
function createLuna() { return new LunaBug(); }
function initLunaBug() { return new LunaBug(); }

// CJS exports
module.exports = LunaBug;
module.exports.default = LunaBug;
module.exports.LunaBug = LunaBug;
module.exports.createLuna = createLuna;
module.exports.initLunaBug = initLunaBug;

// ESM interop
if (typeof exports !== 'undefined') {
  exports.default = LunaBug;
  exports.LunaBug = LunaBug;
  exports.createLuna = createLuna;
  exports.initLunaBug = initLunaBug;
}
