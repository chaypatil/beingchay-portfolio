const body = document.body;
const header = document.querySelector(".c2x-header");
const hero = document.querySelector(".hero-section");
const heroLine = document.querySelector(".hero-blue-line");
const menuButton = document.querySelector(".menu-button");
const menuPanel = document.querySelector(".menu-panel");
const menuClose = document.querySelector(".menu-close");
const menuScrim = document.querySelector(".menu-scrim");
const menuLinks = document.querySelectorAll(".menu-nav a");
const timeNode = document.querySelector("#ist-time");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(pointer: coarse)");

let lastScrollY = window.scrollY;
let lastScrollT = performance.now();
let headerTimer = null;
let heroIdleTimer = null;

function updateIstTime() {
  if (!timeNode) return;
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  timeNode.textContent = `${formatter.format(new Date())} IST`;
}

function openMenu() {
  if (menuPanel) menuPanel.hidden = false;
  window.requestAnimationFrame(() => {
    menuPanel?.classList.add("is-open");
  });
  menuPanel?.setAttribute("aria-hidden", "false");
  menuButton?.setAttribute("aria-expanded", "true");
  if (menuScrim) menuScrim.hidden = false;
  body.classList.add("menu-open");
}

function closeMenu() {
  menuPanel?.classList.remove("is-open");
  menuPanel?.setAttribute("aria-hidden", "true");
  menuButton?.setAttribute("aria-expanded", "false");
  if (menuScrim) menuScrim.hidden = true;
  body.classList.remove("menu-open");
  window.setTimeout(() => {
    if (!menuPanel?.classList.contains("is-open") && menuPanel) menuPanel.hidden = true;
  }, 280);
}

function showHeaderBriefly() {
  if (!header) return;
  header.classList.remove("is-hidden");
  window.clearTimeout(headerTimer);
  if (window.scrollY > 80) {
    headerTimer = window.setTimeout(() => header.classList.add("is-hidden"), 950);
  }
}

function handleScroll() {
  if (!header) return;
  const now = performance.now();
  const currentY = window.scrollY;
  const velocity = Math.abs(currentY - lastScrollY) / Math.max(now - lastScrollT, 1);

  if (currentY < 36) {
    header.classList.remove("is-hidden");
    window.clearTimeout(headerTimer);
  } else if (velocity > 1.05) {
    showHeaderBriefly();
  } else {
    header.classList.add("is-hidden");
  }

  lastScrollY = currentY;
  lastScrollT = now;
}

function setHeroLineX(clientX) {
  if (!hero || !heroLine) return;
  const rect = hero.getBoundingClientRect();
  const x = Math.min(Math.max(clientX - rect.left, 24), rect.width - 24);
  heroLine.style.setProperty("--hero-line-x", `${x}px`);
}

function resetHeroLine() {
  if (!hero || !heroLine) return;
  hero.classList.remove("is-line-active");
  heroLine.style.setProperty("--hero-line-x", "62%");
}

menuButton?.addEventListener("click", openMenu);
menuClose?.addEventListener("click", closeMenu);
menuScrim?.addEventListener("click", closeMenu);

for (const link of menuLinks) {
  link.addEventListener("click", closeMenu);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.addEventListener("scroll", handleScroll, { passive: true });

if (!reducedMotion.matches && !coarsePointer.matches && hero) {
  hero.addEventListener("pointermove", (event) => {
    setHeroLineX(event.clientX);
    hero.classList.add("is-line-active");
    window.clearTimeout(heroIdleTimer);
    heroIdleTimer = window.setTimeout(resetHeroLine, 650);
  });

  hero.addEventListener("pointerleave", resetHeroLine);
} else {
  resetHeroLine();
}

updateIstTime();
window.setInterval(updateIstTime, 30000);
