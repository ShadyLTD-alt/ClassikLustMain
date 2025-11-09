#!/usr/bin/env node
// Core LunaBug CLI runner for plugin execution, works with both .js and .mjs plugins in LunaBug/plugins

const path = require('path');
const fs = require('fs');

function showHelp() {
  console.log('Usage: node LunaBug/core/lunabug.js --run pluginName');
  console.log('Scans core LunaBug/plugins for pluginName.js or pluginName.mjs and runs exported run()');
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--run')) {
    showHelp();
    process.exit(1);
  }
  const pluginName = args[args.indexOf('--run') + 1];
  if (!pluginName) {
    showHelp();
    process.exit(1);
  }
  const dir = path.join(process.cwd(), 'LunaBug', 'plugins');
  const candidates = [`${pluginName}.js`, `${pluginName}.mjs`];
  let file, plugin;
  for (const c of candidates) {
    const p = path.join(dir, c);
    if (fs.existsSync(p)) {
      file = p;
      break;
    }
  }
  if (!file) {
    console.error(`[LunaBug runner] Plugin not found: ${pluginName}`);
    process.exit(2);
  }
  plugin = require(file);
  if (!plugin || typeof plugin.run !== 'function') {
    console.error(`[LunaBug runner] Plugin file found, but no .run() export: ${file}`);
    process.exit(3);
  }
  // Support async or sync .run
  Promise.resolve(plugin.run()).then(() => {
    console.log(`[LunaBug runner] Plugin ${pluginName} finished.`);
  }).catch(e => {
    console.error(`[LunaBug runner] Plugin ${pluginName} error:`, e);
    process.exit(4);
  });
}

main();
