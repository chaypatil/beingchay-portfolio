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
