// LunaBug backend plugin: Overlay Conflict Scanner v1.0
// Standalone, NOT dependent on frontend code. Scans /client/static/index.html and build files for overlay/modal issues

const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

async function scanOverlaysServerSide() {
  const indexPath = path.join(process.cwd(), 'client', 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('🔴 LunaBug Overlay Scanner: No client/dist/index.html found');
    return null;
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  const dom = new JSDOM(html);
  const overlays = [];
  const elements = dom.window.document.querySelectorAll('*');
  elements.forEach(el => {
    const style = el.getAttribute('style') || '';
    const className = el.getAttribute('class') || '';
    if (style.includes('z-index') || className.match(/modal|dialog|overlay|menu/i)) {
      overlays.push({
        tag: el.tagName,
        id: el.id,
        className,
        style
      });
    }
  });
  if (overlays.length > 1) {
    console.warn('🔴 [LunaBug] Overlays Detected:', overlays);
  } else {
    console.log('🟢 [LunaBug] No overlay/modal conflicts in index.html/build!');
  }
  return overlays;
}

module.exports = {
  name: 'overlayScanner',
  description: 'Scans built index.html for modal/overlay DOM conflicts',
  run: scanOverlaysServerSide
};
