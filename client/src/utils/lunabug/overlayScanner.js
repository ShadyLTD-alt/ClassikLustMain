// LunaBug plugin - Overlay/Modal/Conflicts Scanner -- v1.0
// Scans DOM for overlays, modals, duplicate menus, double-close issues

function scanOverlays() {
  const overlays = [];
  document.querySelectorAll('body *').forEach(el => {
    const style = window.getComputedStyle(el);
    if (
      ['fixed', 'absolute'].includes(style.position) &&
      (parseInt(style.zIndex, 10) >= 20 || el.className.match(/(modal|dialog|overlay|menu)/i))
    ) {
      overlays.push({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        zIndex: style.zIndex,
        display: style.display,
        bounding: el.getBoundingClientRect(),
      });
    }
  });
  // Check for duplicate/overlapping overlays
  const conflictPairs = [];
  for (let i = 0; i < overlays.length; i++) {
    for (let j = i + 1; j < overlays.length; j++) {
      const a = overlays[i].bounding, b = overlays[j].bounding;
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
        conflictPairs.push([overlays[i], overlays[j]]);
      }
    }
  }
  console.table(overlays);
  if (conflictPairs.length) {
    console.error('💥 Overlay/modal conflict detected:', conflictPairs);
  } else {
    console.log('✅ No overlay/modal conflicts detected.');
  }
  return overlays;
}

if (typeof window !== 'undefined') {
  window.LunaOverlayScan = scanOverlays;
}

export { scanOverlays };