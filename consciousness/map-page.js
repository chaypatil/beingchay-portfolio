import { publicNodes, publicEdges, typeMeta } from "./graph-data.js";



let nodes = publicNodes.map(node => ({ ...node, relations: node.relations ? [...node.relations] : [] }));
let edges = [...publicEdges];

const svg = document.querySelector("#map-canvas");
const ns = "http://www.w3.org/2000/svg";
let nodeById = new Map();
let activeNodeId = "agency";
let activeFilter = "all";
let compactMap = window.matchMedia("(max-width: 768px)").matches;
let resizeFrame = 0;
let pointById = new Map();
let nodePositions = new Map();
let dragState = null;
let canvasDrag = null;
let suppressClickUntil = 0;
let depthMode = false;
let camera = { panX:0, panY:0, zoom:.82, yaw:0, pitch:0 };
// Space mode is the beingchay landing: same map, connections and chrome hidden,
// a star at the centre. Paper mode is the consciousness page proper.
let spaceMode = document.body.classList.contains("space-mode");
// Everything drifts slowly around the centre on both layers. Just noticeable.
const AUTO_YAW_RATE = 0.018;
let autoYaw = 0;
const publicNodeIds = new Set(publicNodes.map(node => node.id));
const positionStorageKey = "consciousness-public-layout-v1";
const interfaceStorageKey = "consciousness-interface-v1";
let savedPublicPositions = {};

try {
  savedPublicPositions = JSON.parse(localStorage.getItem(positionStorageKey) || "{}");
} catch {
  savedPublicPositions = {};
}

function el(name, attrs = {}) {
  const node = document.createElementNS(ns, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getNodePosition(node) {
  if (nodePositions.has(node.id)) return nodePositions.get(node.id);
  const saved = publicNodeIds.has(node.id) ? savedPublicPositions[node.id] : null;
  const position = {
    x:Number.isFinite(saved?.x) ? saved.x : node.x,
    y:Number.isFinite(saved?.y) ? saved.y : node.y,
    z:Number.isFinite(saved?.z) ? saved.z : ((hashString(node.id) % 241) - 120)
  };
  nodePositions.set(node.id, position);
  return position;
}

function savePublicPositions() {
  const serializable = {};
  for (const node of publicNodes) {
    const position = nodePositions.get(node.id);
    if (!position) continue;
    serializable[node.id] = {
      x:Number(position.x.toFixed(2)),
      y:Number(position.y.toFixed(2)),
      z:Number(position.z.toFixed(2))
    };
  }
  try {
    localStorage.setItem(positionStorageKey, JSON.stringify(serializable));
  } catch {
    // The spatial layout is optional; the graph still works without storage.
  }
}

function graphLayout() {
  if (!compactMap) {
    return { width:1000, height:650, xScale:1, xOffset:0, yScale:1, yOffset:0, rightEdge:790 };
  }
  const width = 640;
  const ratio = Math.max(1, svg.clientHeight) / Math.max(320, svg.clientWidth);
  const height = Math.max(650, Math.round(width * ratio));
  const verticalPadding = 96;
  return {
    width,
    height,
    xScale:.61,
    xOffset:12,
    yScale:(height - verticalPadding) / 650,
    yOffset:verticalPadding / 2,
    rightEdge:480
  };
}

function applyCamera(layout) {
  const base = layout || graphLayout();
  const vw = base.width / camera.zoom;
  const vh = base.height / camera.zoom;
  camera.panX = clamp(camera.panX, -base.width, base.width);
  camera.panY = clamp(camera.panY, -base.height, base.height);
  svg.setAttribute("viewBox", `${camera.panX.toFixed(2)} ${camera.panY.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
}

function clientToLayout(clientX, clientY) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x:0, y:0 };
  return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
}

function zoomAt(clientX, clientY, factor) {
  const before = clientToLayout(clientX, clientY);
  camera.zoom = clamp(camera.zoom * factor, 0.45, 6);
  applyCamera();
  const after = clientToLayout(clientX, clientY);
  camera.panX += before.x - after.x;
  camera.panY += before.y - after.y;
  applyCamera();
}

function resetCamera() {
  camera = { panX:0, panY:0, zoom:.82, yaw:0, pitch:0 };
  applyCamera();
}

function projectNode(node, layout) {
  const position = getNodePosition(node);
  const baseX = layout.xOffset + position.x * layout.xScale;
  const baseY = layout.yOffset + position.y * layout.yScale;
  const centerX = layout.width / 2;
  const centerY = layout.height / 2;
  if (!depthMode) {
    return { x:baseX, y:baseY, z:0, scale:spaceMode ? .68 : 1 };
  }
  const px = baseX - centerX;
  const py = baseY - centerY;
  const pz = clamp(position.z, -180, 180);
  const yaw = camera.yaw + autoYaw;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const rx = px * cosY + pz * sinY;
  let rz = -px * sinY + pz * cosY;
  const cosX = Math.cos(camera.pitch), sinX = Math.sin(camera.pitch);
  const ry = py * cosX - rz * sinX;
  rz = py * sinX + rz * cosX;
  const scale = 900 / (900 - rz);
  return {
    x:centerX + rx * scale,
    y:centerY + ry * scale,
    z:rz,
    scale: spaceMode ? scale * .68 : scale
  };
}

function renderSignalField(layer, pointById) {
  const palette = ["#0a0a0a", "#0a0a0a", "#0a0a0a", "#2447a8", "#277052"];
  for (const node of nodes) {
    const point = pointById.get(node.id);
    const random = randomFrom(hashString(node.id));
    const pixelCount = node.r >= 13 ? 7 : 4;
    for (let index = 0; index < pixelCount; index += 1) {
      const size = [2, 3, 4, 6, 8][Math.floor(random() * 5)] * clamp(point.scale, .82, 1.18);
      const spread = compactMap ? 33 : 48;
      const x = point.x + (random() - .5) * spread * 2;
      const y = point.y + (random() - .5) * spread * 1.55;
      const fill = palette[Math.floor(random() * palette.length)];
      const width = index === 0 && random() > .64 ? size * (2 + Math.floor(random() * 4)) : size;
      const pixel = el("rect", {
        class:"signal-pixel",
        x:(x - width / 2).toFixed(1),
        y:(y - size / 2).toFixed(1),
        width,
        height:size,
        fill,
        style:`--pixel-opacity:${fill === "#0a0a0a" ? (.1 + random() * .18).toFixed(2) : (.28 + random() * .28).toFixed(2)};--flicker:${(3.5 + random() * 5).toFixed(1)}s;--delay:-${(random() * 6).toFixed(1)}s`
      });
      layer.append(pixel);
    }
  }
}

function runBootSequence() {
  const field = document.querySelector("#boot-field");
  if (!field || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    field?.remove();
    return;
  }
  const layout = graphLayout();
  const targets = [...pointById.values()];
  if (!targets.length) {
    field.remove();
    return;
  }
  const random = randomFrom(0xC0A5C10);
  const colors = [
    "#0a0a0a", "#0a0a0a", "#0a0a0a", "#0a0a0a", "#0a0a0a",
    "#efeee8", "#efeee8", "#efeee8", "#efeee8",
    "#2447a8", "#277052", "#613cff"
  ];
  const count = compactMap ? 190 : 320;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const block = document.createElement("i");
    const target = targets[Math.floor(random() * targets.length)];
    const color = colors[Math.floor(random() * colors.length)];
    const width = random() > .84 ? 18 + Math.floor(random() * 44) : 3 + Math.floor(random() * 13);
    const height = random() > .9 ? 2 + Math.floor(random() * 5) : 3 + Math.floor(random() * 14);
    block.className = "boot-block";
    block.style.setProperty("--sx", `${(-3 + random() * 106).toFixed(2)}%`);
    block.style.setProperty("--sy", `${(-3 + random() * 106).toFixed(2)}%`);
    block.style.setProperty("--tx", `${(target.x / layout.width * 100).toFixed(2)}%`);
    block.style.setProperty("--ty", `${(target.y / layout.height * 100).toFixed(2)}%`);
    block.style.setProperty("--bw", `${width}px`);
    block.style.setProperty("--bh", `${height}px`);
    block.style.setProperty("--block-color", color);
    block.style.setProperty("--duration", `${(1.35 + random() * .65).toFixed(2)}s`);
    block.style.setProperty("--delay", `${(random() * .34).toFixed(2)}s`);
    if (color === "#efeee8") block.style.setProperty("--block-border", "1px solid #0a0a0a");
    if (color !== "#0a0a0a" && color !== "#efeee8") {
      block.style.setProperty("--block-shadow", "2px 0 0 #0a0a0a");
    }
    fragment.append(block);
  }
  field.append(fragment);
  requestAnimationFrame(() => requestAnimationFrame(() => field.classList.add("running")));
  window.setTimeout(() => field.remove(), 2700);
}

function renderGraph() {
  svg.replaceChildren();
  nodeById = new Map(nodes.map(node => [node.id, node]));
  const layout = graphLayout();
  applyCamera(layout);
  pointById = new Map(nodes.map(node => [node.id, projectNode(node, layout)]));
  const signalLayer = el("g", { class:"signal-field", "aria-hidden":"true" });
  const edgeLayer = el("g", { class:"edges" });
  const nodeLayer = el("g", { class:"nodes" });
  svg.append(signalLayer, edgeLayer, nodeLayer);
  renderSignalField(signalLayer, pointById);

  for (const [fromId, toId, label] of edges) {
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    if (!from || !to) continue;
    const fromPoint = pointById.get(fromId);
    const toPoint = pointById.get(toId);
    const line = el("line", { x1:fromPoint.x, y1:fromPoint.y, x2:toPoint.x, y2:toPoint.y, class:"edge", "data-from":fromId, "data-to":toId });
    const text = el("text", { x:(fromPoint.x+toPoint.x)/2, y:(fromPoint.y+toPoint.y)/2 - 5, class:"edge-label", "text-anchor":"middle", "data-from":fromId, "data-to":toId });
    text.textContent = label;
    edgeLayer.append(line, text);
  }

  const depthOrdered = [];
  nodes.forEach((node, index) => {
    const meta = typeMeta[node.type];
    const point = pointById.get(node.id);
    const labelOnLeft = point.x > layout.rightEdge;
    const hitSize = Math.max(compactMap ? 76 : 54, node.r * 2 + 18);
    const group = el("g", {
      class:`node${node.r >= 13 ? " major" : ""}${node.privacy === "locked" ? " locked" : ""}`,
      transform:`translate(${point.x} ${point.y}) scale(${point.scale.toFixed(3)})`,
      tabindex:"0", role:"button",
      "aria-label":node.privacy === "locked" ? "Private person node. Unlock to reveal." : `${node.label}, ${meta.label}`,
      "data-id":node.id, "data-type":node.type,
      style:`--node-color:${meta.color};--delay:-${((index % 9) * .47).toFixed(2)}s;--drift:${(4.8 + (index % 7) * .43).toFixed(2)}s`
    });
    const hitArea = el("rect", { class:"hit-area", x:-hitSize/2, y:-hitSize/2, width:hitSize, height:hitSize });
    const visual = el("g", { class:"node-visual", "aria-hidden":"true" });
    const haloSize = (node.r + 9) * 2;
    const coreSize = node.r * 2;
    const pointSize = Math.max(4, node.r * .32);
    const halo = el("rect", { class:"halo", x:-haloSize/2, y:-haloSize/2, width:haloSize, height:haloSize });
    const ghostA = el("rect", { class:"ghost ghost-a", x:-coreSize/2, y:-coreSize/2, width:coreSize, height:coreSize });
    const ghostB = el("rect", { class:"ghost ghost-b", x:-coreSize/2, y:-coreSize/2, width:coreSize, height:coreSize });
    const core = el("rect", { class:"core", x:-coreSize/2, y:-coreSize/2, width:coreSize, height:coreSize });
    const pointMark = el("rect", { class:"point", x:-pointSize/2, y:-pointSize/2, width:pointSize, height:pointSize });
    const text = el("text", { x:labelOnLeft ? -(node.r + 9) : node.r + 9, y:3, "text-anchor":labelOnLeft ? "end" : "start" });
    text.textContent = node.label;
    visual.append(halo, ghostA, ghostB, core, pointMark);
    group.append(hitArea, visual);
    if (node.privacy === "locked") {
      const direction = labelOnLeft ? -1 : 1;
      const barWidth = node.redactionWidth || 54;
      const barX = labelOnLeft ? -(node.r + 9) - barWidth : node.r + 9;
      const redaction = el("rect", { class:"redaction-bar", x:barX, y:-5, width:barWidth, height:10 });
      const scratch = el("line", {
        class:"redaction-scratch",
        x1:barX + 4 * direction,
        y1:-1,
        x2:barX + barWidth - 4 * direction,
        y2:1
      });
      group.append(redaction, scratch);
    } else {
      group.append(text);
    }
    group.addEventListener("pointerdown", event => beginNodeDrag(event, node.id));
    group.addEventListener("click", event => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      selectNode(node.id, true);
    });
    group.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (spaceMode) {
          group.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true }));
        }
        else selectNode(node.id, true);
      }
    });
    depthOrdered.push({ group, z:point.z });
  });
  // Paint far nodes first so near ones overlap them, and so the star can be
  // slotted at its own depth and genuinely occlude whatever sits behind it.
  depthOrdered.sort((a, b) => a.z - b.z);
  let starPlaced = false;
  for (const entry of depthOrdered) {
    if (!starPlaced && entry.z >= 0) {
      const star = buildStar();
      if (star) nodeLayer.append(star);
      starPlaced = true;
    }
    nodeLayer.append(entry.group);
  }
  if (!starPlaced) {
    const star = buildStar();
    if (star) nodeLayer.append(star);
  }
  applyFilter();
  if (dragState) {
    document.querySelectorAll(".node").forEach(item => item.classList.toggle("active", item.dataset.id === activeNodeId));
    document.querySelectorAll(".edge").forEach(line => line.classList.toggle("hot", line.dataset.from === activeNodeId || line.dataset.to === activeNodeId));
  } else {
    selectNode(activeNodeId, false);
  }
}

function clientPoint(event) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x:0, y:0 };
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
}

function beginNodeDrag(event, id) {
  if (event.button !== undefined && event.button !== 0) return;
  const node = nodeById.get(id);
  if (!node) return;
  const position = getNodePosition(node);
  dragState = {
    id,
    pointerId:event.pointerId,
    mode:event.shiftKey ? "z" : "xy",
    startClientX:event.clientX,
    startClientY:event.clientY,
    startPoint:clientPoint(event),
    startPosition:{ ...position },
    moved:false
  };
  document.body.classList.add("node-dragging");
  event.preventDefault();
}

function moveDraggedNode(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const node = nodeById.get(dragState.id);
  if (!node) return;
  const hasMoved = Math.hypot(event.clientX - dragState.startClientX, event.clientY - dragState.startClientY) > 3;
  if (hasMoved && !dragState.moved) {
    activeNodeId = dragState.id;
    svg.setPointerCapture?.(event.pointerId);
  }
  const position = getNodePosition(node);
  if (dragState.mode === "z") {
    const nextZ = dragState.startPosition.z + (dragState.startClientY - event.clientY) * 1.15;
    position.z = clamp(nextZ, -180, 180);
  } else {
    const layout = graphLayout();
    const currentPoint = clientPoint(event);
    const depthScale = depthMode ? 900 / (900 - clamp(dragState.startPosition.z, -180, 180)) : 1;
    const dx = (currentPoint.x - dragState.startPoint.x) / depthScale;
    const dy = (currentPoint.y - dragState.startPoint.y) / depthScale;
    position.x = clamp(dragState.startPosition.x + dx / layout.xScale, -120, 1120);
    position.y = clamp(dragState.startPosition.y + dy / layout.yScale, -120, 770);
  }
  dragState.moved = dragState.moved || hasMoved;
  renderGraph();
}

function finishNodeDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const moved = dragState.moved;
  if (moved) {
    suppressClickUntil = performance.now() + 220;
    savePublicPositions();
  }
  dragState = null;
  document.body.classList.remove("node-dragging");
  try { svg.releasePointerCapture?.(event.pointerId); } catch {}
  // Replacing the SVG here used to remove a stationary click target before
  // the browser emitted `click`. Only a real drag needs a final repaint.
  if (moved) renderGraph();
}

function beginCanvasDrag(event) {
  if (dragState || canvasDrag) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (event.target.closest?.(".node")) return;
  canvasDrag = {
    pointerId:event.pointerId,
    mode:event.shiftKey ? "pan" : "orbit",
    startClientX:event.clientX,
    startClientY:event.clientY,
    startPanX:camera.panX,
    startPanY:camera.panY,
    startYaw:camera.yaw,
    startPitch:camera.pitch
  };
  document.body.classList.add("canvas-dragging");
  if (canvasDrag.mode === "orbit") document.body.classList.add("orbiting");
  svg.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveCanvasDrag(event) {
  if (!canvasDrag || event.pointerId !== canvasDrag.pointerId) return;
  if (canvasDrag.mode === "orbit") {
    camera.yaw = canvasDrag.startYaw + (event.clientX - canvasDrag.startClientX) * 0.006;
    camera.pitch = clamp(canvasDrag.startPitch + (event.clientY - canvasDrag.startClientY) * 0.006, -1.05, 1.05);
    renderGraph();
  } else {
    const base = graphLayout();
    const rect = svg.getBoundingClientRect();
    const unitX = (base.width / camera.zoom) / Math.max(1, rect.width);
    const unitY = (base.height / camera.zoom) / Math.max(1, rect.height);
    camera.panX = canvasDrag.startPanX - (event.clientX - canvasDrag.startClientX) * unitX;
    camera.panY = canvasDrag.startPanY - (event.clientY - canvasDrag.startClientY) * unitY;
    applyCamera(base);
  }
}

function finishCanvasDrag(event) {
  if (!canvasDrag || event.pointerId !== canvasDrag.pointerId) return;
  canvasDrag = null;
  document.body.classList.remove("canvas-dragging", "orbiting");
  try { svg.releasePointerCapture?.(event.pointerId); } catch {}
}

function onWheel(event) {
  event.preventDefault();
  const factor = Math.exp(-event.deltaY * 0.0016);
  zoomAt(event.clientX, event.clientY, factor);
}

function selectNode(id, openMobile) {
  const node = nodeById.get(id);
  if (!node) return;
  if (node.privacy === "locked") {
    openPrivateDialog();
    return;
  }
  activeNodeId = id;
  const meta = typeMeta[node.type];
  document.querySelectorAll(".node").forEach(item => item.classList.toggle("active", item.dataset.id === id));
  document.querySelectorAll(".edge").forEach(line => line.classList.toggle("hot", line.dataset.from === id || line.dataset.to === id));
  document.querySelector("#detail-panel").style.setProperty("--node-color", meta.color);
  document.querySelector("#detail-type").textContent = meta.label;
  document.querySelector("#detail-title").textContent = node.label.replace("THIS MIRROR", "The mirror looks back.");
  document.querySelector("#detail-summary").textContent = node.summary;
  document.querySelector("#detail-confidence").textContent = node.confidence;
  document.querySelector("#detail-era").textContent = node.era;
  document.querySelector("#detail-status").textContent = node.status;
  document.querySelector("#detail-source").innerHTML = `${node.source}<span class="source-meta">${node.sourceMeta}</span>`;
  document.querySelector("#inference-note").textContent = `MODEL NOTE / ${node.note}`;
  const list = document.querySelector("#relation-list");
  list.replaceChildren();
  for (const [targetId, relationship] of node.relations) {
    const target = nodeById.get(targetId);
    const item = document.createElement("div");
    item.className = "relation";
    item.innerHTML = `<span>${target?.label || targetId.replaceAll("-"," ")}</span><em>${relationship}</em>`;
    list.append(item);
  }
  if (openMobile && window.innerWidth <= 768) {
    setPanelCollapsed("detail", false);
    document.querySelector("#detail-panel").classList.add("open");
  }
}

function buildFilters() {
  const counts = nodes.reduce((result, node) => {
    result[node.type] = (result[node.type] || 0) + 1;
    return result;
  }, {});
  const filterList = document.querySelector("#filter-list");
  filterList.replaceChildren();
  const entries = [["all", {label:"Everything", color:"#0a0a0a"}, nodes.length], ...Object.entries(typeMeta).filter(([key]) => counts[key]).map(([key, meta]) => [key, meta, counts[key]])];
  for (const [key, meta, count] of entries) {
    const button = document.createElement("button");
    button.className = "filter" + (key === "all" ? " active" : "");
    button.dataset.filter = key;
    button.innerHTML = `<span class="filter-label"><span class="swatch" style="--swatch:${meta.color}"></span>${meta.label}</span><span class="count">${String(count).padStart(2,"0")}</span>`;
    button.addEventListener("click", () => {
      activeFilter = key;
      document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
      applyFilter();
    });
    filterList.append(button);
  }
}

function applyFilter() {
  document.querySelectorAll(".node").forEach(item => item.classList.toggle("dim", activeFilter !== "all" && item.dataset.type !== activeFilter));
}

function readInterfaceState() {
  try {
    return JSON.parse(localStorage.getItem(interfaceStorageKey) || "{}");
  } catch {
    return {};
  }
}

function writeInterfaceState() {
  try {
    localStorage.setItem(interfaceStorageKey, JSON.stringify({
      rail:document.body.classList.contains("rail-collapsed"),
      detail:document.body.classList.contains("detail-collapsed"),
      depth:depthMode
    }));
  } catch {
    // Interface preferences are non-essential.
  }
}

function setPanelCollapsed(panel, collapsed, persist = true) {
  const className = `${panel}-collapsed`;
  document.body.classList.toggle(className, collapsed);
  const toggle = document.querySelector(panel === "rail" ? "#rail-toggle" : "#detail-toggle");
  toggle?.setAttribute("aria-pressed", String(collapsed));
  if (panel === "detail" && collapsed) document.querySelector("#detail-panel")?.classList.remove("open");
  if (persist) writeInterfaceState();
}

function setDepthMode(enabled, persist = true) {
  depthMode = enabled;
  document.body.classList.toggle("depth-mode", enabled);
  document.querySelector("#depth-toggle")?.setAttribute("aria-pressed", String(enabled));
  if (enabled && camera.yaw === 0 && camera.pitch === 0) {
    camera.yaw = 0.6;
    camera.pitch = -0.32;
  }
  if (!enabled) { camera.yaw = 0; camera.pitch = 0; }
  if (persist) writeInterfaceState();
  renderGraph();
}

function adjustSelectedDepth(delta) {
  const node = nodeById.get(activeNodeId);
  if (!node || node.privacy === "locked") return;
  if (!depthMode) setDepthMode(true);
  const position = getNodePosition(node);
  position.z = clamp(position.z + delta, -180, 180);
  savePublicPositions();
  renderGraph();
}

const privateDialog = document.querySelector("#private-dialog");
const privatePassword = document.querySelector("#private-password");
const privateError = document.querySelector("#private-error");
const privateSubmit = document.querySelector("#private-submit");
let privateIntent = "layer";

function openPrivateDialog(intent = "layer") {
  privateIntent = intent;
  privateError.textContent = "";
  if (!privateDialog.open) privateDialog.showModal();
  requestAnimationFrame(() => privatePassword.focus());
}

function setPrivateState(unlocked) {
  document.body.classList.toggle("private-mode", unlocked);
  const toggle = document.querySelector("#privacy-toggle");
  toggle.setAttribute("aria-pressed", String(unlocked));
  toggle.setAttribute("aria-label", unlocked ? "Lock private layer" : "Unlock private layer");
  document.querySelector("#privacy-label").textContent = unlocked ? "private model" : "public layer";
}

function lockPrivate() {
  nodes = publicNodes.map(node => ({ ...node, relations: node.relations ? [...node.relations] : [] }));
  edges = [...publicEdges];
  for (const id of [...nodePositions.keys()]) {
    if (!publicNodeIds.has(id)) nodePositions.delete(id);
  }
  activeNodeId = "agency";
  activeFilter = "all";
  setPrivateState(false);
  buildFilters();
  renderGraph();
}

document.querySelector("#privacy-toggle").addEventListener("click", () => {
  if (document.body.classList.contains("private-mode")) lockPrivate();
  else openPrivateDialog("layer");
});

document.querySelector("#private-dialog-close").addEventListener("click", () => privateDialog.close());

privateDialog.addEventListener("close", () => {
  privatePassword.value = "";
  privateError.textContent = "";
});

document.querySelector("#private-form").addEventListener("submit", async event => {
  event.preventDefault();
  const intent = privateIntent;
  privateSubmit.disabled = true;
  privateError.textContent = "";
  try {
    const response = await fetch("/api/consciousness-private", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ password: privatePassword.value, intent })
    });
    if (!response.ok) throw new Error(response.status === 401 ? "Wrong password" : "Private layer unavailable");
    const payload = await response.json();
    if (intent === "codexmap") {
      if (payload?.ok !== true) throw new Error("Private layer unavailable");
      privateDialog.close();
      window.location.assign("/codexmap/");
      return;
    }
    if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges) || typeof payload.relationAdditions !== "object") {
      throw new Error("Private layer unavailable");
    }
    const unlockedPublic = publicNodes
      .filter(node => node.privacy !== "locked")
      .map(node => ({ ...node, relations: [...(node.relations || []), ...(payload.relationAdditions[node.id] || [])] }));
    nodes = [...unlockedPublic, ...payload.nodes];
    edges = [...publicEdges, ...payload.edges];
    activeNodeId = "agency";
    activeFilter = "all";
    setPrivateState(true);
    buildFilters();
    renderGraph();
    privateDialog.close();
  } catch (error) {
    privateError.textContent = error.message;
    privatePassword.select();
  } finally {
    privateSubmit.disabled = false;
  }
});

document.querySelectorAll(".view-tab").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".view-tab").forEach(tab => tab.classList.toggle("active", tab === button));
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `view-${button.dataset.view}`));
  document.body.classList.toggle("view-map-active", button.dataset.view === "map");
}));

document.querySelectorAll(".thread-link").forEach(button => button.addEventListener("click", () => {
  const focus = button.dataset.focus;
  const nodeId = focus === "expression" ? "information-gap" : focus;
  selectNode(nodeId, true);
}));

document.querySelector("#detail-head").addEventListener("click", () => {
  if (window.innerWidth <= 768) setPanelCollapsed("detail", true);
});

svg.addEventListener("pointerdown", beginCanvasDrag);
svg.addEventListener("pointermove", moveDraggedNode);
svg.addEventListener("pointermove", moveCanvasDrag);
svg.addEventListener("pointerup", finishNodeDrag);
svg.addEventListener("pointerup", finishCanvasDrag);
svg.addEventListener("pointercancel", finishNodeDrag);
svg.addEventListener("pointercancel", finishCanvasDrag);
svg.addEventListener("wheel", onWheel, { passive:false });

document.querySelector("#rail-toggle").addEventListener("click", () => {
  setPanelCollapsed("rail", !document.body.classList.contains("rail-collapsed"));
});

document.querySelector("#detail-toggle").addEventListener("click", () => {
  const willCollapse = !document.body.classList.contains("detail-collapsed");
  setPanelCollapsed("detail", willCollapse);
  if (!willCollapse && window.innerWidth <= 768) document.querySelector("#detail-panel").classList.add("open");
});

let bgMusic = document.querySelector("#bg-music");
const soundToggle = document.querySelector("#sound-toggle");
let soundWanted = true;
let spaceTransitDone = false;

function tryPlayAmbient() {
  if (!bgMusic || !soundWanted) return;
  bgMusic.volume = .5;
  bgMusic.play().then(() => {
    document.body.classList.add("sound-on");
    soundToggle?.setAttribute("aria-pressed", "true");
  }).catch(() => {
    // Browsers block playback until a real gesture; the toggle still works.
  });
}

soundToggle?.addEventListener("click", () => {
  soundWanted = !soundWanted;
  if (soundWanted) {
    tryPlayAmbient();
  } else {
    bgMusic?.pause();
    document.body.classList.remove("sound-on");
    soundToggle.setAttribute("aria-pressed", "false");
  }
});

window.addEventListener("pointerdown", tryPlayAmbient, { once:true });
window.addEventListener("keydown", tryPlayAmbient, { once:true });
window.addEventListener("touchstart", tryPlayAmbient, { once:true, passive:true });

// ---------------------------------------------------------------------------
// Audio crossfade: track 1 (landing) → track 2 (consciousness).
// Both pages share one document, so we crossfade in-place. Track 2 plays
// from a fresh Audio object so it starts immediately while track 1 fades.
// After the fade, track2 replaces bgMusic so the SND toggle keeps working.
// ---------------------------------------------------------------------------
function crossfadeToTrack2() {
  if (!bgMusic || !soundWanted) return;
  const origMusic = bgMusic;
  const track2 = new Audio("/assets/smoke-state-2.mp3");
  track2.loop = true;
  track2.volume = 0;
  track2.play().catch(() => {});

  const fadeDuration = 1200;
  const startTime = performance.now();
  const startVol = origMusic.volume || 0.5;
  const targetVol = 0.5;

  function tick(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / fadeDuration);
    // Ease-in-out cubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    origMusic.volume = Math.max(0, startVol * (1 - ease));
    track2.volume = targetVol * ease;
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      // Track 2 is now fully faded in. Retire track 1, promote track 2
      // as the ambient player so the SND toggle keeps working.
      origMusic.pause();
      origMusic.src = "";
      bgMusic = track2;
    }
  }
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Space transit: black fragments break apart → white emerges → colored
// fragments converge to node positions. Replaces boot-sequence when
// transitioning from the landing (space-mode) to the consciousness page.
// ---------------------------------------------------------------------------
function runSpaceTransit() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layout = graphLayout();
  const targets = [...pointById.values()];
  if (!targets.length) return;

  const field = document.createElement("div");
  field.className = "space-transit-field";
  field.setAttribute("aria-hidden", "true");
  document.body.append(field);

  const random = randomFrom(0xD4A5E10);
  // Colors: mostly black (space), some paper-white, some node-type colors.
  const darkColors = ["#050506", "#0a0a0a", "#0b0b0d", "#111111"];
  const nodeColors = ["#766bff", "#613cff", "#294dff", "#3157a8", "#713a9f", "#1f6b4f"];
  const paperColor = "#efeee8";

  const count = compactMap ? 200 : 340;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const block = document.createElement("i");
    const target = targets[Math.floor(random() * targets.length)];
    const width = random() > .84 ? 18 + Math.floor(random() * 48) : 3 + Math.floor(random() * 14);
    const height = random() > .9 ? 2 + Math.floor(random() * 5) : 3 + Math.floor(random() * 14);

    // Decide role: dark fragment (scatter away) or colored/some-dark (converge)
    const isColoredConverge = i < count * 0.22;
    const isDarkConverge = !isColoredConverge && i < count * 0.28;
    const isScatter = !isColoredConverge && !isDarkConverge;

    let color;
    if (isColoredConverge) {
      color = nodeColors[Math.floor(random() * nodeColors.length)];
    } else if (isDarkConverge) {
      color = random() > 0.5 ? "#0a0a0a" : paperColor;
    } else {
      color = darkColors[Math.floor(random() * darkColors.length)];
    }

    // Starting position: scattered across the full viewport
    const sx = (-3 + random() * 106).toFixed(2);
    const sy = (-3 + random() * 106).toFixed(2);

    block.className = "space-transit-block " + (isScatter ? "scatter" : "converge");
    block.style.setProperty("--sx", `${sx}%`);
    block.style.setProperty("--sy", `${sy}%`);
    block.style.setProperty("--bw", `${width}px`);
    block.style.setProperty("--bh", `${height}px`);
    block.style.setProperty("--block-color", color);

    if (isScatter) {
      // Exit point: fly toward a random edge
      const edge = Math.floor(random() * 4);
      const ex = edge === 0 ? -15 : edge === 1 ? 115 : (-10 + random() * 120);
      const ey = edge === 2 ? -15 : edge === 3 ? 115 : (-10 + random() * 120);
      block.style.setProperty("--ex", `${ex.toFixed(1)}%`);
      block.style.setProperty("--ey", `${ey.toFixed(1)}%`);
      block.style.setProperty("--duration", `${(0.9 + random() * 0.7).toFixed(2)}s`);
      block.style.setProperty("--delay", `${(random() * 0.25).toFixed(2)}s`);
    } else {
      // Converge toward a real node position
      block.style.setProperty("--tx", `${(target.x / layout.width * 100).toFixed(2)}%`);
      block.style.setProperty("--ty", `${(target.y / layout.height * 100).toFixed(2)}%`);
      block.style.setProperty("--duration", `${(1.1 + random() * 0.6).toFixed(2)}s`);
      block.style.setProperty("--delay", `${(0.15 + random() * 0.35).toFixed(2)}s`);
    }

    if (color === paperColor) block.style.setProperty("--block-border", "1px solid #0a0a0a");
    if (!darkColors.includes(color) && color !== paperColor) {
      block.style.setProperty("--block-shadow", "2px 0 0 #0a0a0a");
    }

    fragment.append(block);
  }

  field.append(fragment);
  // Remove the overlay after animations complete
  window.setTimeout(() => field.remove(), 2200);
}

document.querySelector("#layout-reset").addEventListener("click", () => {
  nodePositions.clear();
  savedPublicPositions = {};
  try { localStorage.removeItem(positionStorageKey); } catch {}
  resetCamera();
  renderGraph();
});

document.querySelector("#ask-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.querySelector("#ask-input");
  const question = input.value.trim();
  if (!question) return;
  const conversation = document.querySelector("#conversation");
  const user = document.createElement("p");
  user.className = "message user";
  user.textContent = question;
  const mirror = document.createElement("p");
  mirror.className = "message mirror";
  const lower = question.toLowerCase();
  mirror.textContent = lower.includes("love") || lower.includes("desire")
    ? "The current model sees desire as more than attraction. Distance creates an image of who he might become, then he pursues both the person and that possible self. This is a synthesis, not a settled fact."
    : lower.includes("afraid") || lower.includes("fear")
      ? "The strongest recurring fear is not simple failure. It is the possibility that failure invalidates the identity built around it. Evidence is mixed because Fallout records decisive action under risk."
      : "The public model does not have enough evidence to answer that cleanly yet. It can show related threads, but the honest response is an open question rather than a personality verdict.";
  const evidence = document.createElement("p");
  evidence.className = "evidence-line";
  evidence.textContent = "Public synthesis · evidence boundary preserved · private sources withheld";
  conversation.append(user, mirror, evidence);
  input.value = "";
  conversation.scrollTop = conversation.scrollHeight;
});

window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    const nextCompactMap = window.matchMedia("(max-width: 768px)").matches;
    if (nextCompactMap !== compactMap || nextCompactMap) {
      compactMap = nextCompactMap;
      renderGraph();
    }
  });
}, { passive:true });

const initialInterfaceState = readInterfaceState();
setPanelCollapsed("rail", initialInterfaceState.rail === true, false);
setPanelCollapsed("detail", initialInterfaceState.detail ?? compactMap, false);
depthMode = true;
document.body.classList.add("depth-mode");
camera.yaw = 0.6;
camera.pitch = -0.32;

buildFilters();
renderGraph();
// Boot sequence runs on normal page load only — when transitioning from
// space-mode the transit animation replaces it as one continuous motion.
if (!spaceTransitDone) runBootSequence();

try {
  const { prepare, layout } = await import("/consciousness/pretext.js");
  await document.fonts.ready;
  const prepared = new Map();
  const elements = document.querySelectorAll("[data-pretext]");
  const prepareElement = element => prepared.set(element, prepare(element.textContent, getComputedStyle(element).font));
  elements.forEach(prepareElement);
  const relayout = () => {
    for (const [element, handle] of prepared) {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      if (!Number.isFinite(lineHeight) || element.clientWidth < 1) continue;
      const result = layout(handle, element.clientWidth, lineHeight);
      element.style.minHeight = `${Math.ceil(result.height)}px`;
    }
  };
  elements.forEach(element => {
    if (element.contentEditable === "true") {
      new MutationObserver(() => { prepareElement(element); relayout(); }).observe(element, { childList:true, subtree:true, characterData:true });
    }
  });
  new ResizeObserver(relayout).observe(document.body);
  relayout();
} catch (error) {
  console.info("Pretext enhancement unavailable; native responsive layout remains active.", error);
}

/* ---------------------------------------------------------------------------
   Space mode: the star, the slow orbit, and the switch back to paper.
   --------------------------------------------------------------------------- */

// A contained light source rather than a disc: the bloom reaches transparency
// well before its geometry ends, and the four spikes taper inside the frame.
function buildStar() {
  if (!spaceMode) return null;
  const layout = graphLayout();
  const cx = layout.width / 2;
  const cy = layout.height / 2;
  const group = el("g", { class:"star-group", "aria-hidden":"true" });

  const defs = el("defs");
  defs.innerHTML = `
    <radialGradient id="star-halo">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="22%" stop-color="#ffffff" stop-opacity="0.075"/>
      <stop offset="58%" stop-color="#ffffff" stop-opacity="0.012"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="star-bloom">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
      <stop offset="24%" stop-color="#ffffff" stop-opacity="0.72"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="star-core">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="34%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="64%" stop-color="#ffffff" stop-opacity="0.52"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="star-spike-h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="34%" stop-color="#ffffff" stop-opacity="0.035"/>
      <stop offset="46%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.88"/>
      <stop offset="54%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="66%" stop-color="#ffffff" stop-opacity="0.035"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="star-spike-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="34%" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="46%" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.82"/>
      <stop offset="54%" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="66%" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="star-bloom-soft" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="star-soft" x="-60%" y="-500%" width="220%" height="1100%">
      <feGaussianBlur stdDeviation="1.8"/>
    </filter>
    <filter id="star-soft-v" x="-500%" y="-60%" width="1100%" height="220%">
      <feGaussianBlur stdDeviation="1.8"/>
    </filter>`;
  group.append(defs);

  group.append(el("circle", { class:"star-halo", cx, cy, r:128, fill:"url(#star-halo)" }));
  group.append(el("circle", {
    class:"star-bloom", cx, cy, r:58,
    fill:"url(#star-bloom)", filter:"url(#star-bloom-soft)"
  }));
  group.append(el("ellipse", {
    class:"star-spike", cx, cy, rx:320, ry:2.4,
    fill:"url(#star-spike-h)", filter:"url(#star-soft)"
  }));
  group.append(el("ellipse", {
    class:"star-spike", cx, cy, rx:2.1, ry:230,
    fill:"url(#star-spike-v)", filter:"url(#star-soft-v)"
  }));
  group.append(el("circle", { class:"star-core", cx, cy, r:27, fill:"url(#star-core)" }));
  return group;
}

// Light per-frame update: only transforms and line endpoints move, so the
// signal field and the DOM structure are left alone.
let orbitFrame = 0;
let resortTick = 0;
function tickOrbit(now) {
  orbitFrame = window.requestAnimationFrame(tickOrbit);
  if (dragState || canvasDrag) return;
  autoYaw = (now / 1000) * AUTO_YAW_RATE;
  if (!depthMode) return;

  const layout = graphLayout();
  pointById = new Map(nodes.map(node => [node.id, projectNode(node, layout)]));

  for (const group of svg.querySelectorAll(".node")) {
    const point = pointById.get(group.dataset.id);
    if (!point) continue;
    group.setAttribute("transform", `translate(${point.x} ${point.y}) scale(${point.scale.toFixed(3)})`);
  }
  for (const line of svg.querySelectorAll(".edge")) {
    const from = pointById.get(line.dataset.from);
    const to = pointById.get(line.dataset.to);
    if (!from || !to) continue;
    line.setAttribute("x1", from.x); line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x); line.setAttribute("y2", to.y);
  }
  for (const label of svg.querySelectorAll(".edge-label")) {
    const from = pointById.get(label.dataset.from);
    const to = pointById.get(label.dataset.to);
    if (!from || !to) continue;
    label.setAttribute("x", ((from.x + to.x) / 2).toFixed(2));
    label.setAttribute("y", (((from.y + to.y) / 2) - 5).toFixed(2));
  }

  // Rotation changes what is in front of what. Re-sorting every frame would
  // thrash the DOM, so restack a few times a second instead: slow orbit, no
  // visible popping, and the star keeps occluding whatever is behind it.
  resortTick += 1;
  if (resortTick % 20 !== 0) return;
  const layer = svg.querySelector(".nodes");
  if (!layer) return;
  const star = layer.querySelector(".star-group");
  const ordered = [...layer.querySelectorAll(".node")]
    .map(group => ({ group, z:pointById.get(group.dataset.id)?.z ?? 0 }))
    .sort((a, b) => a.z - b.z);
  let placed = false;
  for (const entry of ordered) {
    if (star && !placed && entry.z >= 0) { layer.append(star); placed = true; }
    layer.append(entry.group);
  }
  if (star && !placed) layer.append(star);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  orbitFrame = window.requestAnimationFrame(tickOrbit);
}

// In space mode the top switch dismantles the space into the paper page.
// Node clicks show a prompt; project nodes follow their public backlinks.
// On the consciousness page, the codexmap toggle requires the private key.
if (spaceMode) {
  let transitStarted = false;
  let pendingNodeId = null;

  // Build a prompt dialog reusing the private-dialog styling.
  const transitDialog = document.createElement("dialog");
  transitDialog.className = "private-dialog";
  transitDialog.id = "transit-dialog";
  transitDialog.setAttribute("aria-labelledby", "transit-dialog-title");
  transitDialog.innerHTML = [
    '<header class="private-dialog-head">',
    '  <span class="private-dialog-title" id="transit-dialog-title">Cloud Consciousness</span>',
    '  <button class="private-dialog-close" id="transit-dialog-close" type="button" aria-label="Close">\u00d7</button>',
    '</header>',
    '<div class="transit-dialog-body">',
    '  <p class="transit-dialog-question">Open this node in Cloud Consciousness?</p>',
    '  <button class="transit-dialog-enter" type="button" id="open-consciousness-btn">Open \u2192</button>',
    '</div>'
  ].join("\n");
  document.body.append(transitDialog);

  transitDialog.querySelector("#transit-dialog-close").addEventListener("click", () => transitDialog.close());

  transitDialog.querySelector("#open-consciousness-btn").addEventListener("click", () => {
    transitDialog.close();
    beginSpaceTransit(pendingNodeId);
  });

  function beginSpaceTransit(preSelectNodeId) {
    if (transitStarted) return;
    transitStarted = true;
    spaceTransitDone = true;

    // 1. Audio: crossfade track 1 → track 2 immediately.
    crossfadeToTrack2();

    // 2. Visual: launch the black→white fragment transit overlay.
    runSpaceTransit();

    // 3. Existing dismantle: fade nodes and star.
    document.body.classList.add("dismantling");

    // 4. After the transit overlay has covered the background shift,
    //    strip space-mode so the paper skin takes over underneath.
    window.setTimeout(() => {
      spaceMode = false;
      document.body.classList.remove("space-mode", "dismantling");
      window.history.pushState({}, "", "/consciousness/");
      if (preSelectNodeId) activeNodeId = preSelectNodeId;
      renderGraph();
      // No runBootSequence — the transit animation IS the boot equivalent.
    }, 620);
  }

  const modeSwitch = document.querySelector("#deep-toggle");
  modeSwitch?.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!spaceMode) {
      openPrivateDialog("codexmap");
      return;
    }
    beginSpaceTransit(null);
  }, true);

  // Nodes either follow a project backlink or open the map prompt.
  svg.addEventListener("click", event => {
    if (transitStarted) return;
    const nodeGroup = event.target.closest?.(".node");
    if (!nodeGroup) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingNodeId = nodeGroup.dataset.id || null;
    const node = nodeById.get(pendingNodeId);
    if (node?.backlink) {
      window.location.assign(new URL(node.backlink, window.location.href).href);
      return;
    }
    if (!transitDialog.open) transitDialog.showModal();
  }, true);
} else {
  // Consciousness page: codexmap toggle requires the private key.
  const deepToggle = document.querySelector("#deep-toggle");
  deepToggle?.addEventListener("click", event => {
    event.preventDefault();
    openPrivateDialog("codexmap");
  });
}
