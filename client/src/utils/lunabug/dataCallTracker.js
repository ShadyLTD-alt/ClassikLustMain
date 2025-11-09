// LunaBug Plugin: Data Call (Duplicate/Overlay) Tracker v1.0
// Tracks fetch and React Query data calls, reports redundant usage

class DataCallTracker {
  constructor() {
    this.calls = [];
    this.duplicates = [];
    this.enabled = false;
  }
  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.calls = [];
    this.duplicates = [];
    const origFetch = window.fetch;
    window.fetch = (...args) => {
      const url = args[0];
      const timestamp = Date.now();
      const stack = new Error().stack;
      const caller = this.extractCaller(stack);
      this.recordCall({ url, timestamp, caller, method: args[1]?.method || 'GET', type: 'fetch' });
      return origFetch(...args);
    };
    console.log('🔍 Data Call Tracker started');
  }
  stop() {
    this.enabled = false;
    console.log('🔍 Data Call Tracker stopped');
  }
  recordCall(call) {
    this.calls.push(call);
    const recent = this.calls.filter(c => c.url === call.url && call.timestamp - c.timestamp < 5000 && c !== call);
    if (recent.length > 0) {
      this.duplicates.push({url: call.url,count: recent.length + 1,callers: [call.caller, ...recent.map(c => c.caller)],timestamps: [call.timestamp, ...recent.map(c => c.timestamp)]});
      console.warn(`🚨 DUPLICATE API CALL DETECTED:`,{url: call.url,count: recent.length + 1,callers: [call.caller, ...recent.map(c => c.caller)].filter(Boolean)});
    }
  }
  extractCaller(stack) {
    const lines = stack.split('\n');
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('dataCallTracker') && !line.includes('fetch')) {
        const match = line.match(/at (\w+)/) || line.match(/(\w+)@/);
        return match ? match[1] : 'Unknown';
      }
    }
    return 'Unknown';
  }
  getReport() {
    const callsByUrl = {};
    this.calls.forEach(call => {
      if (!callsByUrl[call.url]) {
        callsByUrl[call.url] = [];
      }
      callsByUrl[call.url].push(call);
    });
    const report = {
      totalCalls: this.calls.length,
      uniqueEndpoints: Object.keys(callsByUrl).length,
      duplicateDetections: this.duplicates.length,
      mostCalledEndpoints: Object.entries(callsByUrl)
        .map(([url, calls]) => ({url,count: calls.length,callers: [...new Set(calls.map(c => c.caller))]}))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      duplicates: this.duplicates
    };
    return report;
  }
  printReport() {
    const report = this.getReport();
    console.log('📊 DATA CALL TRACKER REPORT');
    console.table(report.mostCalledEndpoints);
    if (report.duplicates.length > 0) {
      console.table(report.duplicates);
    } else {
      console.log('✅ No duplicate call patterns detected!');
    }
    return report;
  }
  reset() {
    this.calls = [];
    this.duplicates = [];
    console.log('🔄 Data Call Tracker reset');
  }
}

export const dataCallTracker = new DataCallTracker();
if (typeof window !== 'undefined') {
  window.DataCallTracker = dataCallTracker;
}
export default dataCallTracker;
