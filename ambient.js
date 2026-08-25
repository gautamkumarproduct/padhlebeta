// Cursor-reactive spotlight for .ambient — sets CSS vars the background
// gradient reads. On touch devices there's no pointer, so we drift the
// spotlight in a slow idle loop instead, keeping the page feeling alive.
(function () {
  const root = document.documentElement;
  function setPos(x, y) {
    root.style.setProperty('--mx', x + 'px');
    root.style.setProperty('--my', y + 'px');
  }

  let hasPointer = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      hasPointer = true;
      setPos(e.clientX, e.clientY);
    },
    { passive: true },
  );

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let t = 0;
  function idleDrift() {
    if (!hasPointer) {
      t += 0.004;
      const x = 50 + Math.sin(t) * 22;
      const y = 45 + Math.cos(t * 0.8) * 16;
      setPos(x + 'vw', y + 'vh');
    }
    requestAnimationFrame(idleDrift);
  }
  requestAnimationFrame(idleDrift);
})();
