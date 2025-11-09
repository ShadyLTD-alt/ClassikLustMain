// LunaBug Plugin: Periodic Self-Checker & Reporter
// Periodically runs overlay scan, data call tracker, component monitor, and prints alerts if issues found

function periodicLunaSelfCheck(intervalMs = 10000) {
  if (window.__LUNACHECK_RUNNING) return;
  window.__LUNACHECK_RUNNING = true;
  let count = 0;

  async function runChecks() {
    try {
      // UI Overlays
      if (window.LunaOverlayScan) {
        const overlays = window.LunaOverlayScan();
        if (overlays && overlays.length > 1) {
          console.warn('🌙 LunaCheck: Multiple overlays/menus are active:', overlays);
        }
      }
      // Data Call Tracker
      if (window.DataCallTracker) {
        const report = window.DataCallTracker.getReport();
        if (report.duplicates.length > 0) {
          console.error('🌙 LunaCheck: Duplicate data call patterns found:');
          console.table(report.duplicates);
        }
      }
      // Component Monitor
      if (window.LunaComponentMonitor) {
        window.LunaComponentMonitor.printStatus();
      }
      count++;
      if (count % 6 === 0) {
        console.log('🟢 Luna periodic self-check running smoothly (every', intervalMs/1000, 'seconds)');
      }
    } catch (error) {
      console.error('❌ Luna self-check error:', error);
    } finally {
      setTimeout(runChecks, intervalMs);
    }
  }
  runChecks();
  console.log('🌙 LunaBug: Periodic self-check ENABLED');
}

if (typeof window !== 'undefined') {
  window.LunaPeriodicCheck = periodicLunaSelfCheck;
}

export { periodicLunaSelfCheck };
