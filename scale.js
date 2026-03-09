(() => {
  const root = document.getElementById("game-root");
  if (!root) return;

  const PADDING = 16;

  function measureUnscaledSize() {
    const prevTransform = root.style.transform;
    root.style.transform = "translate(-50%, -50%) scale(1)";
    const rect = root.getBoundingClientRect();
    root.style.transform = prevTransform;
    return { width: rect.width, height: rect.height };
  }

  let baseSize = null;

  function applyScale() {
    if (!baseSize) baseSize = measureUnscaledSize();
    const availableW = Math.max(0, window.innerWidth - PADDING);
    const availableH = Math.max(0, window.innerHeight - PADDING);
    const scale = Math.min(availableW / baseSize.width, availableH / baseSize.height, 1);
    root.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  const ro = new ResizeObserver(() => {
    baseSize = null;
    applyScale();
  });
  ro.observe(root);

  window.addEventListener("resize", applyScale, { passive: true });
  window.addEventListener("orientationchange", applyScale, { passive: true });

  applyScale();
})();

