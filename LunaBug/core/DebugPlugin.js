/**
 * LunaBug/core/DebugPlugin.js
 * 
 * Base class / contract all plugins must follow.
 * 
 * What it does:
 * ✅ Defines expected structure: name, init(), start(), stop()
 * ✅ Enforces consistency across modules
 * ❌ Does not implement actual logic (plugins extend this)
 */

class DebugPlugin {
  constructor(name) {
    this.name = name;
  }

  async init(context) {
    throw new Error(`${this.name}: init() not implemented`);
  }

  async start() {
    console.log(`[${this.name}] start() not implemented`);
  }

  async stop() {
    console.log(`[${this.name}] stop() not implemented`);
  }
}

export default DebugPlugin;