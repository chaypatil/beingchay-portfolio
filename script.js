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

function initConsultationHero() {
  const hero = document.querySelector(".consultation-scroll-hero");
  if (!hero) return;

  const scene = hero.querySelector(".consultation-scene");
  const screen = hero.querySelector(".consultation-screen-layer");
  const processSection = document.querySelector("#process");
  const secondaryCta = hero.querySelector(".consultation-secondary-cta");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!scene || !screen) return;

  window.setTimeout(() => {
    hero.classList.add("is-powered-on");
  }, reducedMotion.matches ? 0 : 500);

  if (reducedMotion.matches) return;

  let metrics = null;
  let ticking = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (start, end, progress) => start + (end - start) * progress;
  const ease = (progress) => progress * progress * (3 - 2 * progress);

  function measure() {
    const sceneWidth = scene.offsetWidth;
    const sceneHeight = scene.offsetHeight;
    const screenWidth = screen.offsetWidth;
    const screenHeight = screen.offsetHeight;
    const screenCenterX = screen.offsetLeft + screenWidth / 2;
    const screenCenterY = screen.offsetTop + screenHeight / 2;
    const sceneLeft = (window.innerWidth - sceneWidth) / 2;
    const sceneTop = (window.innerHeight - sceneHeight) / 2;
    const desktopScale = Math.max(window.innerWidth / screenWidth, window.innerHeight / screenHeight) * 0.94;
    const mobileScale = Math.min(Math.max((window.innerWidth / screenWidth) * 1.1, 1.08), 1.24);
    const targetScale = window.innerWidth < 768 ? mobileScale : desktopScale;

    metrics = {
      start: hero.offsetTop,
      end: hero.offsetTop + hero.offsetHeight - window.innerHeight,
      targetScale,
      targetX: window.innerWidth / 2 - (sceneLeft + screenCenterX),
      targetY: window.innerHeight / 2 - (sceneTop + screenCenterY),
    };

    scene.style.setProperty("--scene-origin-x", `${(screenCenterX / sceneWidth) * 100}%`);
    scene.style.setProperty("--scene-origin-y", `${(screenCenterY / sceneHeight) * 100}%`);
  }

  function render() {
    ticking = false;
    if (!metrics) measure();

    const distance = Math.max(metrics.end - metrics.start, 1);
    const rawProgress = (window.scrollY - metrics.start) / distance;
    const progress = ease(clamp(rawProgress, 0, 1));
    const scale = lerp(1, metrics.targetScale, progress);
    const x = lerp(0, metrics.targetX, progress);
    const y = lerp(0, metrics.targetY, progress);

    scene.style.setProperty("--scene-scale", scale.toFixed(4));
    scene.style.setProperty("--scene-x", `${x.toFixed(2)}px`);
    scene.style.setProperty("--scene-y", `${y.toFixed(2)}px`);
  }

  function requestRender() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(render);
  }

  function resetMetrics() {
    metrics = null;
    requestRender();
  }

  secondaryCta?.addEventListener("click", (event) => {
    if (!processSection) return;
    event.preventDefault();
    processSection.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", "#process");
  });

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", resetMetrics);
  window.addEventListener("orientationchange", resetMetrics);
  window.addEventListener("load", resetMetrics);

  measure();
  render();
}

initConsultationHero();
