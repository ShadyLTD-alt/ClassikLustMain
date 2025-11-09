// LunaBug Plugin: Console/Component API Usage Tracer (helper)
// Inspects all mounted React components for patterns of unmounted/broken/double render

class ComponentRegistrationMonitor {
  constructor() {
    this.mounted = new Set();
    this.duplicates = [];
    this.enabled = false;
  }
  register(name) {
    if (this.mounted.has(name)) {
      this.duplicates.push(name);
      console.warn(`🔍 Duplicate component mounted: ${name}`);
    }
    this.mounted.add(name);
  }
  unregister(name) {
    this.mounted.delete(name);
  }
  printStatus() {
    console.log('🌙 Mounted Components:', Array.from(this.mounted));
    if (this.duplicates.length > 0) {
      console.error('⚠️ Duplicate component mounts detected:', this.duplicates);
    } else {
      console.log('✅ No duplicate mounts detected!');
    }
  }
  reset() {
    this.mounted = new Set();
    this.duplicates = [];
  }
}

window.LunaComponentMonitor = new ComponentRegistrationMonitor();
export default window.LunaComponentMonitor;
