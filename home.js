const body = document.body;
const scene = document.querySelector(".constellation");
const nodeField = document.querySelector(".node-field");
const projectLinks = document.querySelectorAll(".project-link");
const music = document.querySelector(".bg-music");
const audioToggle = document.querySelector(".audio-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let departureTimer = null;
let isDeparting = false;

// --- Decorative voxel node field around the star ---
function seedNodeField() {
  if (!nodeField) return;
  const count = window.innerWidth < 640 ? 14 : 22;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    // Keep a clear zone around the central star / consciousness label.
    let x;
    let y;
    let tries = 0;
    do {
      x = Math.random() * 100;
      y = Math.random() * 100;
      tries += 1;
    } while (Math.hypot(x - 50, y - 48) < 18 && tries < 12);

    const size = 6 + Math.round(Math.random() * 18);
    const box = document.createElement("i");
    box.style.setProperty("--x", `${x.toFixed(2)}%`);
    box.style.setProperty("--y", `${y.toFixed(2)}%`);
    box.style.setProperty("--s", `${size}px`);
    box.style.setProperty("--o", (0.4 + Math.random() * 0.5).toFixed(2));
    box.style.setProperty("--dx", `${(Math.random() * 16 - 8).toFixed(1)}px`);
    box.style.setProperty("--dy", `${(Math.random() * 16 - 8).toFixed(1)}px`);
    box.style.setProperty("--dur", `${(7 + Math.random() * 8).toFixed(1)}s`);
    box.style.setProperty("--delay", `-${(Math.random() * 8).toFixed(1)}s`);
    fragment.append(box);
  }
  nodeField.append(fragment);
}

function driftProjectLinks() {
  projectLinks.forEach((link, index) => {
    if (link.classList.contains("core-link")) return;
    link.style.setProperty("--dx", `${(Math.random() * 12 - 6).toFixed(1)}px`);
    link.style.setProperty("--dy", `${(Math.random() * 12 - 6).toFixed(1)}px`);
    link.style.setProperty("--dur", `${(10 + index * 1.6).toFixed(1)}s`);
    link.style.setProperty("--delay", `-${(index * 1.3).toFixed(1)}s`);
  });
}

seedNodeField();
driftProjectLinks();

// --- Ambient music (browsers block autoplay until a user gesture) ---
let musicWanted = true;

function tryPlayMusic() {
  if (!music || !musicWanted) return;
  music.volume = 0.55;
  music.play().then(() => body.classList.add("sound-on")).catch(() => {});
}

audioToggle?.addEventListener("click", () => {
  musicWanted = !musicWanted;
  audioToggle.setAttribute("aria-pressed", String(musicWanted));
  if (musicWanted) {
    tryPlayMusic();
  } else {
    music?.pause();
    body.classList.remove("sound-on");
  }
});

// First interaction anywhere unlocks and starts playback.
window.addEventListener("pointerdown", tryPlayMusic, { once: true });

// --- Synthesized "interspace travel" whoosh on departure (no asset) ---
function playWarpSound() {
  if (reducedMotion.matches) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const dur = 1.25;

    // Rising tone.
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + dur);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.22, now + dur * 0.8);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(oscGain).connect(ctx.destination);

    // Airy noise sweep for the "space travel" texture.
    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) channel[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(6000, now + dur);
    noiseFilter.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.16, now + dur * 0.85);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + dur);
    noise.stop(now + dur);
    window.setTimeout(() => ctx.close().catch(() => {}), (dur + 0.2) * 1000);
  } catch {
    // Sound is a nicety; never block navigation on it.
  }
}

// --- Hyperspace warp field: stars streak toward the chosen node, then whiteout ---
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

// --- Click a node -> warp toward it -> whiteout -> navigate ---
for (const link of projectLinks) {
  link.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
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
  const rect = selectedLink.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  selectedLink.classList.add("is-selected");
  body.classList.add("is-departing");
  playWarpSound();

  if (reducedMotion.matches) {
    body.classList.add("is-traveling");
    departureTimer = window.setTimeout(() => window.location.assign(destination), 80);
    return;
  }

  startWarp(centerX - viewportCenterX, centerY - viewportCenterY);

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
  for (const link of projectLinks) link.classList.remove("is-selected");
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) resetDeparture();
});
