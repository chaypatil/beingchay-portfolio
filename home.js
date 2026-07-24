const body = document.body;
const scene = document.querySelector(".constellation-scene");
const lightField = document.querySelector(".light-field");
const trigger = document.querySelector(".light-trigger");
const projectLinks = document.querySelectorAll(".project-link");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let departureTimer = null;
let isDeparting = false;

function setFocused(isFocused) {
  body.classList.toggle("is-focused", isFocused);
  trigger?.setAttribute("aria-pressed", String(isFocused));
  trigger?.setAttribute(
    "aria-label",
    isFocused ? "Move the projects away" : "Bring the projects closer",
  );
}

async function revealScene() {
  try {
    await lightField?.decode();
  } catch {
    // The image can still render if decode is unavailable or interrupted.
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => body.classList.add("is-ready"));
  });
}

revealScene();

trigger?.addEventListener("click", () => {
  setFocused(!body.classList.contains("is-focused"));
});

scene?.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) return;
    event.preventDefault();
    setFocused(true);
  },
  { passive: false },
);

for (const link of projectLinks) {
  link.addEventListener("pointerenter", () => setFocused(true));
  link.addEventListener("focus", () => setFocused(true));
  link.addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    beginDeparture(link);
  });
}

// --- Hyperspace warp field: stars streak toward the chosen star, then whiteout ---
const warpCanvas = document.querySelector(".warp-field");
const warpCtx = warpCanvas?.getContext("2d");
let warpStars = [];
let warpRaf = 0;
let warpStart = 0;
let warpDir = { x: 0, y: 0 };
let warpW = 0;
let warpH = 0;

function sizeWarp() {
  if (!warpCanvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  warpW = window.innerWidth;
  warpH = window.innerHeight;
  warpCanvas.width = Math.round(warpW * dpr);
  warpCanvas.height = Math.round(warpH * dpr);
  warpCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seedStars() {
  const count = warpW < 700 ? 260 : 460;
  warpStars = [];
  for (let i = 0; i < count; i += 1) {
    warpStars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
  }
}

function drawWarp(now) {
  if (!warpCtx) return;
  const t = Math.min(1, (now - warpStart) / 1300);
  const ease = t * t;
  const cx = warpW / 2 + warpDir.x * warpW * 0.22;
  const cy = warpH / 2 + warpDir.y * warpH * 0.22;
  const spread = Math.max(warpW, warpH) * 0.55;
  const speed = 0.004 + ease * 0.05;

  warpCtx.clearRect(0, 0, warpW, warpH);
  warpCtx.lineCap = "round";

  for (const star of warpStars) {
    star.z -= speed;
    if (star.z <= 0.02) {
      star.z = 1;
      star.x = Math.random() * 2 - 1;
      star.y = Math.random() * 2 - 1;
    }
    const dz = speed * (1 + ease * 9);
    const zPrev = Math.min(1, star.z + dz);
    const k = spread / star.z;
    const kPrev = spread / zPrev;
    const depth = 1 - star.z;
    warpCtx.strokeStyle = `rgba(255,255,255,${(0.12 + depth * 0.85).toFixed(3)})`;
    warpCtx.lineWidth = 0.6 + depth * 2.4;
    warpCtx.beginPath();
    warpCtx.moveTo(cx + star.x * kPrev, cy + star.y * kPrev);
    warpCtx.lineTo(cx + star.x * k, cy + star.y * k);
    warpCtx.stroke();
  }

  if (t < 1) warpRaf = window.requestAnimationFrame(drawWarp);
}

function startWarp(dirX, dirY) {
  if (!warpCtx) return;
  sizeWarp();
  seedStars();
  const mag = Math.hypot(dirX, dirY) || 1;
  warpDir = { x: dirX / mag, y: dirY / mag };
  warpStart = window.performance.now();
  window.cancelAnimationFrame(warpRaf);
  warpRaf = window.requestAnimationFrame(drawWarp);
}

function stopWarp() {
  window.cancelAnimationFrame(warpRaf);
  warpRaf = 0;
  if (warpCtx) warpCtx.clearRect(0, 0, warpW, warpH);
}

window.addEventListener("resize", () => {
  if (warpRaf) sizeWarp();
});

function beginDeparture(selectedLink) {
  if (isDeparting) return;
  isDeparting = true;

  const destination = selectedLink.href;
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;
  const travelScale = window.innerWidth < 700 ? 4.8 : 5.2;
  const frozenPositions = [];

  for (const link of projectLinks) {
    const rect = link.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    frozenPositions.push({ link, centerX, centerY });
  }

  const selectedPosition = frozenPositions.find(({ link }) => link === selectedLink);
  if (!selectedPosition) {
    window.location.assign(destination);
    return;
  }

  for (const { link, centerX, centerY } of frozenPositions) {
    link.style.left = `${centerX}px`;
    link.style.top = `${centerY}px`;
  }

  const travelX = -(selectedPosition.centerX - viewportCenterX) * travelScale;
  const travelY = -(selectedPosition.centerY - viewportCenterY) * travelScale;

  selectedLink.classList.add("is-selected");
  body.style.setProperty("--travel-x", `${travelX.toFixed(2)}px`);
  body.style.setProperty("--travel-y", `${travelY.toFixed(2)}px`);
  body.style.setProperty("--travel-scale", travelScale.toFixed(2));
  body.classList.add("is-departing");
  scene?.setAttribute("aria-busy", "true");

  if (reducedMotion.matches) {
    body.classList.add("is-traveling");
    departureTimer = window.setTimeout(() => window.location.assign(destination), 80);
    return;
  }

  startWarp(
    selectedPosition.centerX - viewportCenterX,
    selectedPosition.centerY - viewportCenterY,
  );

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => body.classList.add("is-traveling"));
  });

  departureTimer = window.setTimeout(() => {
    window.location.assign(destination);
  }, 1320);
}

function resetDeparture() {
  if (departureTimer) window.clearTimeout(departureTimer);
  departureTimer = null;
  isDeparting = false;
  stopWarp();
  body.classList.remove("is-departing", "is-traveling");
  body.style.removeProperty("--travel-x");
  body.style.removeProperty("--travel-y");
  body.style.removeProperty("--travel-scale");
  scene?.removeAttribute("aria-busy");

  for (const link of projectLinks) {
    link.classList.remove("is-selected");
    link.style.removeProperty("left");
    link.style.removeProperty("top");
  }
}

window.visualViewport?.addEventListener("resize", () => {
  if (window.visualViewport.scale > 1.01) setFocused(true);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setFocused(false);
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) resetDeparture();
});
