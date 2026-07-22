const body = document.body;
const header = document.querySelector(".c2x-header");
const hero = document.querySelector(".hero-section");
const revealLayer = document.querySelector(".hero-layer--reveal");
const axisAnchor = document.querySelector(".axis-anchor");
const menuButton = document.querySelector(".menu-button");
const menuButtonLabel = menuButton?.querySelector("span:first-child");
const menuPanel = document.querySelector(".menu-panel");
const menuClose = document.querySelector(".menu-close");
const menuScrim = document.querySelector(".menu-scrim");
const menuLinks = document.querySelectorAll(".menu-nav a");
const timeNodes = document.querySelectorAll("[data-ist-time]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let lastScrollY = window.scrollY;
let restX = Math.round(window.innerWidth * 0.62);
let revealX = restX;
let targetX = restX;
let revealWidth = 1.5;
let targetWidth = 1.5;
let revealFrame = null;
let resizeFrame = null;
let headerTimer = null;

function updateIstTime() {
  if (!timeNodes.length) return;
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const value = `${formatter.format(new Date())} IST`;
  for (const node of timeNodes) node.textContent = value;
}

function setMenuButtonState(isOpen) {
  if (!menuButton) return;
  menuButton.setAttribute("aria-expanded", String(isOpen));
  if (menuButtonLabel) menuButtonLabel.textContent = isOpen ? "Close" : "Menu";
}

function openMenu() {
  if (menuPanel) menuPanel.hidden = false;
  window.requestAnimationFrame(() => {
    menuPanel?.classList.add("is-open");
  });
  menuPanel?.setAttribute("aria-hidden", "false");
  if (menuScrim) menuScrim.hidden = false;
  body.classList.add("menu-open");
  setMenuButtonState(true);
}

function closeMenu() {
  menuPanel?.classList.remove("is-open");
  menuPanel?.setAttribute("aria-hidden", "true");
  if (menuScrim) menuScrim.hidden = true;
  body.classList.remove("menu-open");
  setMenuButtonState(false);
  window.setTimeout(() => {
    if (!menuPanel?.classList.contains("is-open") && menuPanel) menuPanel.hidden = true;
  }, 320);
}

function toggleMenu() {
  if (menuPanel?.classList.contains("is-open")) {
    closeMenu();
  } else {
    openMenu();
  }
}

function setAxisFromAnchor() {
  if (!axisAnchor) return;
  const rect = axisAnchor.getBoundingClientRect();
  const sectionInner = document.querySelector("#work .section-inner") || document.querySelector(".section-inner");
  const innerLeft = sectionInner ? sectionInner.getBoundingClientRect().left : 0;
  const x = rect.left + rect.width / 2;
  const startY = rect.bottom + window.scrollY - 2;
  restX = Math.round(x);
  targetX = restX;
  if (Math.abs(revealX - restX) < 4 || targetWidth <= 2) revealX = restX;
  body.style.setProperty("--axis-x", `${restX}px`);
  body.style.setProperty("--axis-local-x", `${Math.round(restX - innerLeft)}px`);
  body.style.setProperty("--axis-start-y", `${Math.max(0, Math.round(startY))}px`);
  updateRevealClip();
}

function updateRevealClip() {
  const width = Math.max(1, revealWidth);
  const left = Math.max(0, revealX - width / 2);
  const right = Math.max(0, window.innerWidth - (revealX + width / 2));
  body.style.setProperty("--clip-left", `${left.toFixed(2)}px`);
  body.style.setProperty("--clip-right", `${right.toFixed(2)}px`);
}

function animateReveal() {
  revealX += (targetX - revealX) * 0.06;
  revealWidth += (targetWidth - revealWidth) * 0.18;
  updateRevealClip();

  if (Math.abs(targetX - revealX) > 0.2 || Math.abs(targetWidth - revealWidth) > 0.2) {
    revealFrame = window.requestAnimationFrame(animateReveal);
  } else {
    revealX = targetX;
    revealWidth = targetWidth;
    updateRevealClip();
    revealFrame = null;
  }
}

function startRevealLoop() {
  if (!revealFrame) revealFrame = window.requestAnimationFrame(animateReveal);
}

function setRevealTarget(clientX, width = 112) {
  const min = 24;
  const max = window.innerWidth - 24;
  targetX = Math.min(Math.max(clientX, min), max);
  targetWidth = width;
  startRevealLoop();
}

function resetReveal() {
  targetX = restX;
  targetWidth = 1.5;
  startRevealLoop();
}

function showHeaderBriefly() {
  if (!header) return;
  header.classList.remove("is-hidden");
  window.clearTimeout(headerTimer);
  if (window.scrollY > 80) {
    headerTimer = window.setTimeout(() => header.classList.add("is-hidden"), 850);
  }
}

function handleScroll() {
  if (!header) return;
  const currentY = window.scrollY;
  const delta = currentY - lastScrollY;
  const fastUp = delta < -8;
  const nearHero = hero ? currentY < hero.offsetHeight * 0.82 : currentY < 120;

  if (currentY < 36 || nearHero) {
    header.classList.remove("is-hidden");
    window.clearTimeout(headerTimer);
  } else if (fastUp) {
    showHeaderBriefly();
  } else {
    header.classList.add("is-hidden");
  }

  lastScrollY = currentY;
}

function handleResize() {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(setAxisFromAnchor);
}

menuButton?.addEventListener("click", toggleMenu);
menuClose?.addEventListener("click", closeMenu);
menuScrim?.addEventListener("click", closeMenu);

for (const link of menuLinks) {
  link.addEventListener("click", closeMenu);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("resize", handleResize);

if (!reducedMotion.matches && hero && revealLayer) {
  hero.addEventListener("pointerenter", (event) => setRevealTarget(event.clientX));
  hero.addEventListener("pointermove", (event) => setRevealTarget(event.clientX));
  hero.addEventListener("pointerleave", resetReveal);
  hero.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches[0]) setRevealTarget(event.touches[0].clientX);
    },
    { passive: true }
  );
  hero.addEventListener("touchend", resetReveal, { passive: true });
  hero.addEventListener("touchcancel", resetReveal, { passive: true });
}

if (document.fonts?.ready) {
  document.fonts.ready.then(setAxisFromAnchor);
}

setAxisFromAnchor();
resetReveal();
updateIstTime();
window.setInterval(updateIstTime, 60000);
