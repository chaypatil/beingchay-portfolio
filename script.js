const pretextNodes = Array.from(document.querySelectorAll("[data-pretext]"));

async function hydratePretext() {
  if (!pretextNodes.length) return;
  try {
    const { prepare, layout } = await import("https://esm.sh/@chenglou/pretext");
    await document.fonts.ready;
    const prepared = new Map();

    function prepareAll() {
      for (const node of pretextNodes) {
        const style = getComputedStyle(node);
        prepared.set(node, {
          handle: prepare(node.textContent.trim(), style.font),
          lineHeight: parseFloat(style.lineHeight),
        });
      }
    }

    function relayout() {
      for (const [node, item] of prepared) {
        const result = layout(item.handle, node.clientWidth, item.lineHeight);
        node.style.minHeight = `${Math.ceil(result.height)}px`;
      }
    }

    prepareAll();
    relayout();
    new ResizeObserver(relayout).observe(document.body);
  } catch {
    document.documentElement.dataset.pretext = "fallback";
  }
}

hydratePretext();

function setupConsultationZoom() {
  const hero = document.querySelector("[data-consult-zoom]");
  if (!hero) return;

  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 640px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function updateZoom() {
    if (mobile.matches || reducedMotion.matches) {
      root.style.setProperty("--consult-zoom-scale", "1");
      return;
    }

    const rect = hero.getBoundingClientRect();
    const scrollable = Math.max(1, rect.height - window.innerHeight);
    const raw = Math.min(1, Math.max(0, -rect.top / scrollable));
    const eased = 1 - Math.pow(1 - raw, 2);
    root.style.setProperty("--consult-zoom-scale", (1 + eased * 0.18).toFixed(3));
  }

  updateZoom();
  window.addEventListener("scroll", updateZoom, { passive: true });
  window.addEventListener("resize", updateZoom);
  mobile.addEventListener("change", updateZoom);
  reducedMotion.addEventListener("change", updateZoom);
}

setupConsultationZoom();
