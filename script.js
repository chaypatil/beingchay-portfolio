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
  const liveContent = hero.querySelector(".consultation-live-screen-content");
  const processSection = document.querySelector("#process");
  const secondaryCta = hero.querySelector(".consultation-secondary-cta");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileLayout = window.matchMedia("(max-width: 767px)");
  if (!scene || !screen || !liveContent) return;

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  function forceHeroStart() {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  forceHeroStart();
  window.requestAnimationFrame(forceHeroStart);
  window.addEventListener("pageshow", forceHeroStart);

  window.setTimeout(() => {
    hero.classList.add("is-powered-on");
  }, reducedMotion.matches ? 0 : 500);

  if (reducedMotion.matches || mobileLayout.matches) return;

  let metrics = null;
  let ticking = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const ease = (progress) => progress * progress * (3 - 2 * progress);

  function measure() {
    const sceneWidth = scene.offsetWidth;
    const sceneHeight = scene.offsetHeight;
    const screenWidth = screen.offsetWidth;
    const screenHeight = screen.offsetHeight;
    const sceneLeft = (window.innerWidth - sceneWidth) / 2;
    const sceneTop = (window.innerHeight - sceneHeight) / 2;

    metrics = {
      start: hero.offsetTop,
      end: hero.offsetTop + hero.offsetHeight - window.innerHeight,
      liveStartLeft: sceneLeft + screen.offsetLeft,
      liveStartTop: sceneTop + screen.offsetTop,
      liveStartWidth: screenWidth,
      liveStartHeight: screenHeight,
      headlineStart: Math.min(Math.max(screenWidth * 0.046, 32), 42),
      subheadlineStart: Math.min(Math.max(screenWidth * 0.022, 16), 19),
      ctaHeightStart: Math.min(Math.max(screenWidth * 0.067, 52), 58),
      ctaFontStart: Math.min(Math.max(screenWidth * 0.019, 14), 16),
      ctaWidthStart: Math.min(Math.max(screenWidth * 0.37, 270), 305),
    };
  }

  function render() {
    ticking = false;
    if (!metrics) measure();

    const distance = Math.max(metrics.end - metrics.start, 1);
    const rawProgress = (window.scrollY - metrics.start) / distance;
    const shutdownProgress = ease(clamp(rawProgress, 0, 1));

    hero.style.setProperty("--shutdown-progress", shutdownProgress.toFixed(4));
    hero.classList.toggle("is-shutting-down", rawProgress > 0.001);
    liveContent.style.setProperty("--live-left", `${metrics.liveStartLeft.toFixed(2)}px`);
    liveContent.style.setProperty("--live-top", `${metrics.liveStartTop.toFixed(2)}px`);
    liveContent.style.setProperty("--live-width", `${metrics.liveStartWidth.toFixed(2)}px`);
    liveContent.style.setProperty("--live-height", `${metrics.liveStartHeight.toFixed(2)}px`);
    liveContent.style.setProperty("--headline-size", `${metrics.headlineStart.toFixed(2)}px`);
    liveContent.style.setProperty("--subheadline-size", `${metrics.subheadlineStart.toFixed(2)}px`);
    liveContent.style.setProperty("--cta-height", `${metrics.ctaHeightStart.toFixed(2)}px`);
    liveContent.style.setProperty("--cta-font-size", `${metrics.ctaFontStart.toFixed(2)}px`);
    liveContent.style.setProperty("--cta-width", `${metrics.ctaWidthStart.toFixed(2)}px`);
    liveContent.style.pointerEvents = shutdownProgress > 0.85 ? "none" : "auto";
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

function initBookingFlow() {
  const form = document.querySelector(".booking-form");
  if (!form) return;

  const packageSelect = form.querySelector("#package");
  const packageLinks = document.querySelectorAll("[data-package-choice]");
  const formShell = document.querySelector(".booking-form-shell");
  const success = document.querySelector(".booking-success");
  const params = new URLSearchParams(window.location.search);
  const requestedPackage = params.get("package");

  if (packageSelect) {
    if (requestedPackage === "sprint") {
      packageSelect.value = "Context-to-Execution Sprint - $3,000";
    } else if (requestedPackage === "audit") {
      packageSelect.value = "Context Leak Audit - $500";
    }
  }

  for (const link of packageLinks) {
    link.addEventListener("click", () => {
      if (!packageSelect) return;
      packageSelect.value = link.dataset.packageChoice || "";
    });
  }

  if (params.get("submitted") === "true" && formShell && success) {
    formShell.hidden = true;
    success.hidden = false;
    document.title = "Inquiry received | beingchay";
    window.requestAnimationFrame(() => {
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}

initBookingFlow();
