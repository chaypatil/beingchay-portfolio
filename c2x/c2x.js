const root = document.documentElement;
const body = document.body;
const page = document.querySelector(".c2x-page");
const toggle = document.querySelector(".spine-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(pointer: coarse)");
let idleTimer = null;

function setSpineX(clientX) {
  const padding = 24;
  const clamped = Math.min(Math.max(clientX, padding), window.innerWidth - padding);
  root.style.setProperty("--spine-x", `${clamped}px`);
}

function centerSpine() {
  root.style.setProperty("--spine-x", "50vw");
}

function updateToggle() {
  const isOn = !body.classList.contains("spine-off");
  if (!toggle) return;
  toggle.setAttribute("aria-pressed", String(isOn));
  toggle.textContent = isOn ? "Line on" : "Line off";
}

toggle?.addEventListener("click", () => {
  body.classList.toggle("spine-off");
  updateToggle();
});

if (!reducedMotion.matches && !coarsePointer.matches && page) {
  page.addEventListener("pointermove", (event) => {
    if (body.classList.contains("spine-off")) return;
    setSpineX(event.clientX);
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(centerSpine, 900);
  });

  page.addEventListener("pointerleave", centerSpine);
  window.addEventListener("blur", centerSpine);
} else {
  centerSpine();
}

updateToggle();
