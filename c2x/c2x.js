const body = document.body;
const header = document.querySelector(".c2x-header");
const hero = document.querySelector(".hero-section");
const revealLayer = document.querySelector(".hero-layer--reveal");
const contactSection = document.querySelector(".contact-section");
const contactRevealLayer = document.querySelector(".contact-layer--reveal");
const axisAnchor = document.querySelector(".axis-anchor");
const menuButton = document.querySelector(".menu-button");
const menuButtonLabel = menuButton?.querySelector("span:first-child");
const menuPanel = document.querySelector(".menu-panel");
const menuClose = document.querySelector(".menu-close");
const menuScrim = document.querySelector(".menu-scrim");
const menuLinks = document.querySelectorAll(".menu-nav a");
const timeNodes = document.querySelectorAll("[data-ist-time]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const axisEl = document.querySelector(".c2x-axis");
const SPINE_DRAW_SPEED = 300;
const SPINE_DRAW_MIN_MS = 3000;
const SPINE_DRAW_MAX_MS = 20000;
const SPINE_THICKEN_MS = 1500;
const SPINE_TRIGGER_SCROLL_Y = 10;

let lenis = null;

let lastScrollY = window.scrollY;
let restX = Math.round(window.innerWidth * 0.5);
let revealX = restX;
let targetX = restX;
let revealWidth = 1.5;
let targetWidth = 1.5;
let revealFrame = null;
let resizeFrame = null;
let headerTimer = null;
let spineTotalHeight = 0;
let spineDrawn = false;

let contactRevealX = window.innerWidth / 2;
let contactTargetX = contactRevealX;
let contactRevealWidth = 1.5;
let contactTargetWidth = 1.5;
let contactRevealFrame = null;

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

function rebuildAxisSegments(startY) {
  if (!axisEl) return;
  axisEl.innerHTML = "";
  const boxTop = startY;
  const sections = document.querySelectorAll(".c2x-section");
  let maxBottom = boxTop;
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    const sectionTopAbs = rect.top + window.scrollY;
    const sectionBottomAbs = sectionTopAbs + rect.height;
    const segTop = sectionTopAbs - boxTop;
    const segBottom = sectionBottomAbs - boxTop;
    if (segBottom <= 0) continue;
    const seg = document.createElement("span");
    seg.className = "c2x-axis-seg" + (section.classList.contains("blue-section") ? " is-inverted" : "");
    seg.style.top = `${Math.max(0, segTop)}px`;
    seg.style.height = `${segBottom - Math.max(0, segTop)}px`;
    axisEl.appendChild(seg);
    maxBottom = Math.max(maxBottom, sectionBottomAbs);
  }
  spineTotalHeight = Math.max(1, maxBottom - boxTop);
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
  rebuildAxisSegments(Math.max(0, startY));
  updateRevealClip();
}

function triggerSpineDraw() {
  if (spineDrawn || !axisEl) return;
  spineDrawn = true;
  const drawMs = Math.min(
    SPINE_DRAW_MAX_MS,
    Math.max(SPINE_DRAW_MIN_MS, (spineTotalHeight / SPINE_DRAW_SPEED) * 1000)
  );
  body.style.setProperty("--spine-draw-duration", `${Math.round(drawMs)}ms`);
  body.style.setProperty("--spine-thicken-duration", `${SPINE_THICKEN_MS}ms`);
  window.requestAnimationFrame(() => {
    body.style.setProperty("--spine-bottom-inset", "0px");
    axisEl.classList.add("is-drawn");
  });
  axisAnchor?.classList.add("is-lit");
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

function updateContactRevealClip() {
  const width = Math.max(1, contactRevealWidth);
  const left = Math.max(0, contactRevealX - width / 2);
  const right = Math.max(0, window.innerWidth - (contactRevealX + width / 2));
  body.style.setProperty("--contact-clip-left", `${left.toFixed(2)}px`);
  body.style.setProperty("--contact-clip-right", `${right.toFixed(2)}px`);
}

function animateContactReveal() {
  contactRevealX += (contactTargetX - contactRevealX) * 0.06;
  contactRevealWidth += (contactTargetWidth - contactRevealWidth) * 0.18;
  updateContactRevealClip();

  if (Math.abs(contactTargetX - contactRevealX) > 0.2 || Math.abs(contactTargetWidth - contactRevealWidth) > 0.2) {
    contactRevealFrame = window.requestAnimationFrame(animateContactReveal);
  } else {
    contactRevealX = contactTargetX;
    contactRevealWidth = contactTargetWidth;
    updateContactRevealClip();
    contactRevealFrame = null;
  }
}

function startContactRevealLoop() {
  if (!contactRevealFrame) contactRevealFrame = window.requestAnimationFrame(animateContactReveal);
}

function setContactRevealTarget(clientX, width = 112) {
  const min = 24;
  const max = window.innerWidth - 24;
  contactTargetX = Math.min(Math.max(clientX, min), max);
  contactTargetWidth = width;
  startContactRevealLoop();
}

function resetContactReveal() {
  contactTargetWidth = 1.5;
  startContactRevealLoop();
}

function showHeaderBriefly(currentY) {
  if (!header) return;
  header.classList.remove("is-hidden");
  window.clearTimeout(headerTimer);
  if (currentY > 80) {
    headerTimer = window.setTimeout(() => header.classList.add("is-hidden"), 850);
  }
}

function maybeTriggerSpineFromScroll(currentY) {
  if (!spineDrawn && currentY > SPINE_TRIGGER_SCROLL_Y) triggerSpineDraw();
}

function handleScroll(currentY) {
  maybeTriggerSpineFromScroll(currentY);
  if (!header) return;
  const delta = currentY - lastScrollY;
  const fastUp = delta < -8;
  const nearHero = hero ? currentY < hero.offsetHeight * 0.82 : currentY < 120;

  if (currentY < 36 || nearHero) {
    header.classList.remove("is-hidden");
    window.clearTimeout(headerTimer);
  } else if (fastUp) {
    showHeaderBriefly(currentY);
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

window.addEventListener("resize", handleResize);

if (!reducedMotion.matches && typeof window.Lenis === "function") {
  lenis = new window.Lenis({
    duration: 1.1,
    autoRaf: true,
  });
  document.documentElement.style.scrollBehavior = "auto";
  lenis.on("scroll", (instance) => handleScroll(instance.scroll));

  for (const link of document.querySelectorAll('a[href^="#"]')) {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target);
    });
  }
} else {
  window.addEventListener("scroll", () => handleScroll(window.scrollY), { passive: true });
}

window.addEventListener("wheel", () => triggerSpineDraw(), { passive: true, once: true });
window.addEventListener("touchmove", () => triggerSpineDraw(), { passive: true, once: true });

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

if (!reducedMotion.matches && contactSection && contactRevealLayer) {
  contactSection.addEventListener("pointerenter", (event) => setContactRevealTarget(event.clientX));
  contactSection.addEventListener("pointermove", (event) => setContactRevealTarget(event.clientX));
  contactSection.addEventListener("pointerleave", resetContactReveal);
  contactSection.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches[0]) setContactRevealTarget(event.touches[0].clientX);
    },
    { passive: true }
  );
  contactSection.addEventListener("touchend", resetContactReveal, { passive: true });
  contactSection.addEventListener("touchcancel", resetContactReveal, { passive: true });
}

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(setAxisFromAnchor));
  });
}

setAxisFromAnchor();
resetReveal();
updateContactRevealClip();
updateIstTime();
window.setInterval(updateIstTime, 60000);
