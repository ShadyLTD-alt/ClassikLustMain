// LunaBug backend plugin: Overlay Conflict Scanner v1.0 (CommonJS for maximum compatibility)
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

async function scanOverlaysServerSide() {
  // Scan actual path: /dist/public/index.html
  const indexPath = path.join(process.cwd(), 'dist', 'public', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('🔴 LunaBug Overlay Scanner: No dist/public/index.html found');
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
    console.log('🟢 [LunaBug] No overlay/modal conflicts in dist/public/index.html/build!');
  }
  return overlays;
}

module.exports = {
  name: 'overlayScanner',
  description: 'Scans built dist/public/index.html for modal/overlay DOM conflicts',
  run: scanOverlaysServerSide
};
