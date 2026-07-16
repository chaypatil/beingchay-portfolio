const body = document.body;
const scene = document.querySelector(".constellation-scene");
const lightField = document.querySelector(".light-field");
const trigger = document.querySelector(".light-trigger");
const projectLinks = document.querySelectorAll(".project-link");

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
}

window.visualViewport?.addEventListener("resize", () => {
  if (window.visualViewport.scale > 1.01) setFocused(true);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setFocused(false);
});
