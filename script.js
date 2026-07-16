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
    const desktopScale = Math.max(window.innerWidth / screenWidth, window.innerHeight / screenHeight) * 1.01;
    const mobileScale = Math.min(Math.max((window.innerWidth / screenWidth) * 1.1, 1.08), 1.24);
    const targetScale = window.innerWidth < 768 ? mobileScale : desktopScale;

    metrics = {
      start: hero.offsetTop,
      end: hero.offsetTop + hero.offsetHeight - window.innerHeight,
      targetScale,
      targetX: window.innerWidth / 2 - (sceneLeft + screenCenterX),
      targetY: window.innerHeight / 2 - (sceneTop + screenCenterY),
      liveStartLeft: sceneLeft + screen.offsetLeft,
      liveStartTop: sceneTop + screen.offsetTop,
      liveStartWidth: screenWidth,
      liveStartHeight: screenHeight,
      liveEndLeft: 0,
      liveEndTop: 0,
      liveEndWidth: window.innerWidth,
      liveEndHeight: window.innerHeight,
      headlineStart: window.innerWidth < 768 ? 15.5 : Math.min(Math.max(window.innerWidth * 0.022, 24), 38),
      headlineEnd: Math.min(Math.max(window.innerWidth * 0.046, 54), 70),
      subheadlineStart: window.innerWidth < 768 ? 9 : Math.min(Math.max(window.innerWidth * 0.0112, 14), 20),
      subheadlineEnd: Math.min(Math.max(window.innerWidth * 0.014, 18), 22),
      ctaHeightStart: window.innerWidth < 768 ? 29 : Math.min(Math.max(window.innerWidth * 0.04, 46), 60),
      ctaHeightEnd: 60,
      ctaFontStart: window.innerWidth < 768 ? 8.5 : Math.min(Math.max(window.innerWidth * 0.0105, 13), 18),
      ctaFontEnd: 16,
      ctaWidthStart: window.innerWidth < 768 ? 160 : 310,
      ctaWidthEnd: 300,
      headlineWidthStart: Math.min(screenWidth * 0.94, 860),
      headlineWidthEnd: Math.min(window.innerWidth * 0.94, 1360),
      subheadlineWidthStart: Math.min(screenWidth * 0.78, 640),
      subheadlineWidthEnd: Math.min(window.innerWidth * 0.7, 760),
      actionsWidthStart: Math.min(screenWidth * 0.76, 640),
      actionsWidthEnd: Math.min(window.innerWidth * 0.72, 680),
      screenCenterViewportX: sceneLeft + screenCenterX,
      screenCenterViewportY: sceneTop + screenCenterY,
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
    const screenWidth = metrics.liveStartWidth * scale;
    const screenHeight = metrics.liveStartHeight * scale;
    const screenLeft = metrics.screenCenterViewportX + x - screenWidth / 2;
    const screenTop = metrics.screenCenterViewportY + y - screenHeight / 2;
    const settleProgress = ease(clamp((progress - 0.62) / 0.38, 0, 1));
    const sceneOpacity = 1 - settleProgress;
    const liveLeft = lerp(screenLeft, metrics.liveEndLeft, settleProgress);
    const liveTop = lerp(screenTop, metrics.liveEndTop, settleProgress);
    const liveWidth = lerp(screenWidth, metrics.liveEndWidth, settleProgress);
    const liveHeight = lerp(screenHeight, metrics.liveEndHeight, settleProgress);

    scene.style.setProperty("--scene-scale", scale.toFixed(4));
    scene.style.setProperty("--scene-x", `${x.toFixed(2)}px`);
    scene.style.setProperty("--scene-y", `${y.toFixed(2)}px`);
    scene.style.setProperty("--scene-opacity", sceneOpacity.toFixed(4));
    liveContent.style.setProperty("--live-left", `${liveLeft.toFixed(2)}px`);
    liveContent.style.setProperty("--live-top", `${liveTop.toFixed(2)}px`);
    liveContent.style.setProperty("--live-width", `${liveWidth.toFixed(2)}px`);
    liveContent.style.setProperty("--live-height", `${liveHeight.toFixed(2)}px`);
    liveContent.style.setProperty("--headline-size", `${lerp(metrics.headlineStart, metrics.headlineEnd, progress).toFixed(2)}px`);
    liveContent.style.setProperty("--subheadline-size", `${lerp(metrics.subheadlineStart, metrics.subheadlineEnd, progress).toFixed(2)}px`);
    liveContent.style.setProperty("--cta-height", `${lerp(metrics.ctaHeightStart, metrics.ctaHeightEnd, progress).toFixed(2)}px`);
    liveContent.style.setProperty("--cta-font-size", `${lerp(metrics.ctaFontStart, metrics.ctaFontEnd, progress).toFixed(2)}px`);
    liveContent.style.setProperty("--cta-width", `${lerp(metrics.ctaWidthStart, metrics.ctaWidthEnd, progress).toFixed(2)}px`);
    liveContent.style.setProperty("--headline-width", `${lerp(metrics.headlineWidthStart, metrics.headlineWidthEnd, progress).toFixed(2)}px`);
    liveContent.style.setProperty("--subheadline-width", `${lerp(metrics.subheadlineWidthStart, metrics.subheadlineWidthEnd, progress).toFixed(2)}px`);
    liveContent.style.setProperty("--actions-width", `${lerp(metrics.actionsWidthStart, metrics.actionsWidthEnd, progress).toFixed(2)}px`);
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
