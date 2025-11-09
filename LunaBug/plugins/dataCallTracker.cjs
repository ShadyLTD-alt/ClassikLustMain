// LunaBug backend plugin: Data Call Duplication Tracker
// Scans server logs for repeated API calls/endpoints to catch redundant backend requests

const fs = require('fs');
const path = require('path');

function parseEndpoint(line) {
  // crude: look for /api/ or routes, extract afterwards
  const match = line.match(/(GET|POST|PATCH|PUT|DELETE) (\/api\/[^\s"]+)/);
  if (match) return match[2];
  return null;
}

async function run(logFile = null) {
  logFile = logFile || path.join(process.cwd(), 'logs', 'server.log');
  if (!fs.existsSync(logFile)) {
    console.warn(`[LunaBug] No server log at ${logFile}`);
    return null;
  }
  const lines = fs.readFileSync(logFile, 'utf8').split('\n');
  const endpointCalls = {};
  for (const line of lines) {
    const endpoint = parseEndpoint(line);
    if (!endpoint) continue;
    if (!endpointCalls[endpoint]) endpointCalls[endpoint] = 0;
    endpointCalls[endpoint]++;
  }
  // Find duplicates/excess
  const report = Object.entries(endpointCalls)
    .filter(([url, count]) => count > 3)
    .map(([url, count]) => ({ url, count }));
  if (report.length > 0) {
    console.warn('[LunaBug] Duplicate/redundant data endpoints detected:', report);
  } else {
    console.log('[LunaBug] No redundant data endpoints found in logs.');
  }
  return report;
}

module.exports = {
  name: 'dataCallTracker',
  description: 'Scans server logs for duplicate/redundant API endpoint requests',
  run
};
