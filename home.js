import { publicNodes, typeMeta } from "./consciousness/graph-data.js";

const body = document.body;
const sky = document.querySelector(".node-sky");
const star = document.querySelector(".star");
const prompt = document.querySelector(".open-prompt");
const promptLabel = document.querySelector(".open-prompt-node");
const promptConfirm = document.querySelector(".open-prompt-confirm");
const promptCancel = document.querySelector(".open-prompt-cancel");
const deepToggle = document.querySelector(".deep-toggle");
const music = document.querySelector(".bg-music");
const audioToggle = document.querySelector(".audio-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// The consciousness map authors its layout in a 1000x650 space. We reuse those
// exact coordinates so the landing reads as a preview of the same constellation.
const SPACE_W = 1000;
const SPACE_H = 650;
const CENTER_X = SPACE_W / 2;
const CENTER_Y = SPACE_H / 2;

const camera = { yaw: 0.6, pitch: -0.28 };
let canvasDrag = null;
let isDeparting = false;
let departureTimer = null;
let clock = 0;

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Same depth seed the consciousness map uses, so nodes keep their relative depth.
const items = publicNodes.map((node) => {
  const seed = hashString(node.id);
  return {
    node,
    z: (seed % 241) - 120,
    driftPhase: (seed % 1000) / 1000 * Math.PI * 2,
    driftRate: 0.12 + ((seed >> 5) % 60) / 400,
    driftX: 4 + ((seed >> 9) % 9),
    driftY: 3 + ((seed >> 13) % 8),
    el: null,
    scale: 1
  };
});

function buildNodes() {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const { node } = item;
    const meta = typeMeta[node.type] || typeMeta.question;
    const isPillar = Boolean(node.backlink);
    const locked = node.privacy === "locked";

    const el = document.createElement(node.backlink ? "a" : "button");
    el.className = "sky-node" + (isPillar ? " pillar" : "") + (locked ? " locked" : "");
    el.dataset.id = node.id;
    if (node.backlink) {
      el.href = node.backlink;
      if (/^https?:/.test(node.backlink)) el.rel = "external";
    } else {
      el.type = "button";
    }
    el.setAttribute(
      "aria-label",
      locked ? "Private node. Opens Cloud Consciousness." : node.label
    );

    const box = document.createElement("span");
    box.className = "sky-box";
    const size = Math.round(node.r * (isPillar ? 1.5 : 1.25));
    box.style.setProperty("--box", `${size}px`);
    box.style.setProperty("--tone", locked ? "#0a0a0a" : meta.color);

    const label = document.createElement("span");
    label.className = "sky-label";
    label.textContent = locked ? "" : node.label;

    el.append(box, label);
    item.el = el;
    fragment.append(el);
  }
  sky.append(fragment);
}

function project(item, time) {
  const { node } = item;
  // Gentle ambient drift, then the same perspective rotation as the map.
  const wobble = reducedMotion.matches ? 0 : 1;
  const dx = Math.sin(time * item.driftRate + item.driftPhase) * item.driftX * wobble;
  const dy = Math.cos(time * item.driftRate * 0.8 + item.driftPhase) * item.driftY * wobble;

  const px = node.x + dx - CENTER_X;
  const py = node.y + dy - CENTER_Y;
  const pz = item.z;

  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  const rx = px * cosY + pz * sinY;
  let rz = -px * sinY + pz * cosY;

  const cosX = Math.cos(camera.pitch);
  const sinX = Math.sin(camera.pitch);
  const ry = py * cosX - rz * sinX;
  rz = py * sinX + rz * cosX;

  const scale = 900 / (900 - rz);
  // Pull the whole field in from the edges so no node, label or shadow clips.
  const FIT = 0.86;
  return {
    x: 50 + ((CENTER_X + rx * scale) / SPACE_W * 100 - 50) * FIT,
    y: 50 + ((CENTER_Y + ry * scale) / SPACE_H * 100 - 50) * FIT,
    scale,
    rz
  };
}

function frame(now) {
  clock = now / 1000;
  for (const item of items) {
    const p = project(item, clock);
    item.scale = p.scale;
    const el = item.el;
    el.style.left = `${p.x.toFixed(3)}%`;
    el.style.top = `${p.y.toFixed(3)}%`;
    el.style.transform = `translate(-50%, -50%) scale(${p.scale.toFixed(3)})`;
    // Depth cue: further back reads dimmer and sits behind the star glow.
    el.style.opacity = clamp(0.32 + (p.scale - 0.85) * 1.6, 0.18, 1).toFixed(3);
    el.style.zIndex = String(Math.round(p.scale * 100));
  }
  // Lens flares slide against the rotation, which sells the star as a 3D object.
  if (star) {
    star.style.setProperty("--flare-x", `${(Math.sin(camera.yaw) * 42).toFixed(1)}px`);
    star.style.setProperty("--flare-y", `${(Math.sin(camera.pitch) * 30).toFixed(1)}px`);
    star.style.setProperty("--flare-spin", `${(camera.yaw * 34).toFixed(2)}deg`);
  }
  window.requestAnimationFrame(frame);
}

// --- Orbit by dragging empty space, same grammar as the consciousness map ---
function beginDrag(event) {
  if (event.target.closest(".sky-node, .deep-toggle, .audio-toggle, .open-prompt")) return;
  canvasDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startYaw: camera.yaw,
    startPitch: camera.pitch
  };
  body.classList.add("orbiting");
}

function moveDrag(event) {
  if (!canvasDrag || event.pointerId !== canvasDrag.pointerId) return;
  camera.yaw = canvasDrag.startYaw + (event.clientX - canvasDrag.startX) * 0.005;
  camera.pitch = clamp(canvasDrag.startPitch + (event.clientY - canvasDrag.startY) * 0.005, -0.9, 0.9);
}

function endDrag() {
  canvasDrag = null;
  body.classList.remove("orbiting");
}

window.addEventListener("pointerdown", beginDrag);
window.addEventListener("pointermove", moveDrag);
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

// --- Opening a node ---
let pendingDestination = null;

function askToOpen(node) {
  pendingDestination = "consciousness/";
  promptLabel.textContent = node.privacy === "locked" ? "a private node" : node.label.toLowerCase();
  prompt.hidden = false;
  window.requestAnimationFrame(() => body.classList.add("prompt-open"));
  promptConfirm.focus();
}

function closePrompt() {
  body.classList.remove("prompt-open");
  pendingDestination = null;
  window.setTimeout(() => { prompt.hidden = true; }, 220);
}

promptCancel?.addEventListener("click", closePrompt);
promptConfirm?.addEventListener("click", () => {
  if (!pendingDestination) return;
  const destination = pendingDestination;
  body.classList.remove("prompt-open");
  prompt.hidden = true;
  beginDeparture(destination, 0, 0);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && body.classList.contains("prompt-open")) closePrompt();
});

function onNodeActivate(event) {
  const el = event.target.closest(".sky-node");
  if (!el) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const item = items.find((entry) => entry.node.id === el.dataset.id);
  if (!item) return;
  if (item.node.backlink) {
    const rect = el.getBoundingClientRect();
    beginDeparture(
      item.node.backlink,
      rect.left + rect.width / 2 - window.innerWidth / 2,
      rect.top + rect.height / 2 - window.innerHeight / 2
    );
  } else {
    askToOpen(item.node);
  }
}

sky.addEventListener("click", onNodeActivate);

// --- Deep dive toggle (brain view lands here once the module is ready) ---
deepToggle?.addEventListener("click", () => {
  const on = deepToggle.getAttribute("aria-pressed") !== "true";
  deepToggle.setAttribute("aria-pressed", String(on));
  body.classList.toggle("deep-on", on);
  if (on) beginDeparture("consciousness/", 0, 0);
});

// --- Ambient audio ---
let musicWanted = true;

function tryPlayMusic() {
  if (!music || !musicWanted) return;
  music.volume = 0.55;
  music.play().then(() => body.classList.add("sound-on")).catch(() => {});
}

audioToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  musicWanted = !musicWanted;
  audioToggle.setAttribute("aria-pressed", String(musicWanted));
  if (musicWanted) {
    tryPlayMusic();
  } else {
    music?.pause();
    body.classList.remove("sound-on");
  }
});

window.addEventListener("pointerdown", tryPlayMusic, { once: true });

// --- Escalating interspace whoosh, synthesized so it costs no asset ---
function playWarpSound() {
  if (reducedMotion.matches) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const dur = 1.25;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + dur);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.2, now + dur * 0.8);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(oscGain).connect(ctx.destination);

    const size = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) channel[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(6000, now + dur);
    filter.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.15, now + dur * 0.85);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + dur);
    noise.stop(now + dur);
    window.setTimeout(() => ctx.close().catch(() => {}), (dur + 0.2) * 1000);
  } catch {
    // Sound is a nicety; never block navigation on it.
  }
}

// --- Hyperspace warp out ---
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
  for (const s of warpStars) {
    s.z -= speed;
    if (s.z <= 0.02) {
      s.z = 1;
      s.x = Math.random() * 2 - 1;
      s.y = Math.random() * 2 - 1;
    }
    const dz = speed * (1 + ease * 9);
    const zPrev = Math.min(1, s.z + dz);
    const k = spread / s.z;
    const kPrev = spread / zPrev;
    const depth = 1 - s.z;
    warpCtx.strokeStyle = `rgba(255,255,255,${(0.12 + depth * 0.85).toFixed(3)})`;
    warpCtx.lineWidth = 0.6 + depth * 2.4;
    warpCtx.beginPath();
    warpCtx.moveTo(cx + s.x * kPrev, cy + s.y * kPrev);
    warpCtx.lineTo(cx + s.x * k, cy + s.y * k);
    warpCtx.stroke();
  }
  if (t < 1) warpRaf = window.requestAnimationFrame(drawWarp);
}

function beginDeparture(destination, dirX, dirY) {
  if (isDeparting) return;
  isDeparting = true;
  body.classList.add("is-departing");
  playWarpSound();

  if (reducedMotion.matches || !warpCtx) {
    window.location.assign(destination);
    return;
  }

  sizeWarp();
  const count = warpW < 700 ? 260 : 460;
  warpStars = [];
  for (let i = 0; i < count; i += 1) {
    warpStars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
  }
  const mag = Math.hypot(dirX, dirY) || 1;
  warpDir = { x: dirX / mag, y: dirY / mag };
  warpStart = window.performance.now();
  warpRaf = window.requestAnimationFrame(drawWarp);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => body.classList.add("is-traveling"));
  });
  departureTimer = window.setTimeout(() => window.location.assign(destination), 1320);
}

window.addEventListener("resize", () => {
  if (warpRaf) sizeWarp();
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  window.clearTimeout(departureTimer);
  isDeparting = false;
  window.cancelAnimationFrame(warpRaf);
  warpRaf = 0;
  if (warpCtx) warpCtx.clearRect(0, 0, warpW, warpH);
  body.classList.remove("is-departing", "is-traveling");
});

buildNodes();
window.requestAnimationFrame(frame);
