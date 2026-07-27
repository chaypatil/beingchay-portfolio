import { BRAIN_MESH } from "./brain-mesh.js";
import { NODE_REGION } from "../consciousness/brain/brain-mapping.js";

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute float aPhase;
uniform vec2 uScale;
uniform vec2 uRotation;
uniform float uZoom;
varying float vPhase;

vec3 rotatePoint(vec3 point) {
  float cy = cos(uRotation.x);
  float sy = sin(uRotation.x);
  float cp = cos(uRotation.y);
  float sp = sin(uRotation.y);
  vec3 yawed = vec3(
    point.x * cy + point.z * sy,
    point.y,
    -point.x * sy + point.z * cy
  );
  return vec3(
    yawed.x,
    yawed.y * cp - yawed.z * sp,
    yawed.y * sp + yawed.z * cp
  );
}

void main() {
  vec3 point = rotatePoint(aPosition);
  float perspective = 1.0 / (1.0 + point.z * 0.035);
  gl_Position = vec4(
    point.x * uScale.x * uZoom * perspective,
    point.y * uScale.y * uZoom * perspective,
    point.z * 0.025,
    1.0
  );
  vPhase = aPhase;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec4 uColor;
uniform vec3 uPulseColor;
uniform float uTime;
uniform float uSignal;
varying float vPhase;

void main() {
  float cycle = fract(vPhase - uTime * 0.115);
  float head = smoothstep(0.16, 0.0, abs(cycle - 0.5));
  float tail = smoothstep(0.34, 0.0, abs(cycle - 0.42)) * 0.32;
  float pulse = clamp(head + tail, 0.0, 1.0) * uSignal;
  vec3 color = mix(uColor.rgb, uPulseColor, pulse);
  float alpha = uColor.a + pulse * (1.0 - uColor.a);
  gl_FragColor = vec4(color, alpha);
}
`;

const REGION_TARGETS = {
  prefrontal:[-4.25, .55],
  motor:[-1.35, 2.05],
  parietal:[1.25, 2.12],
  occipital:[4.45, .82],
  temporal:[1.65, -1.72],
  insula:[-.55, -.25],
  limbic:[.35, .35],
  cerebellum:[3.72, -1.78],
  brainstem:[1.1, -2.42],
  default:[0, 0]
};

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Brain shader failed");
  }
  return shader;
}

function createProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Brain program failed");
  }
  return program;
}

function buildLineGeometry(paths) {
  const positions = [];
  const phases = [];
  paths.forEach((path, pathIndex) => {
    const seed = (hashString(`path-${pathIndex}`) % 1000) / 1000;
    const points = path.map(point => Array.isArray(point) ? point : BRAIN_MESH.vertices[point]);
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      positions.push(...start, ...end);
      phases.push(seed + index / points.length, seed + (index + 1) / points.length);
    }
  });
  return { positions:new Float32Array(positions), phases:new Float32Array(phases) };
}

function createBuffer(gl, data, target = gl.ARRAY_BUFFER) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return buffer;
}

function nearestVertex(target, offset) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < BRAIN_MESH.vertices.length; index += 1) {
    const [x, y, z] = BRAIN_MESH.vertices[index];
    const dx = x - target[0];
    const dy = y - target[1];
    const distance = dx * dx + dy * dy + z * z * .08 + ((index + offset) % 11) * .008;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function chooseNodeVertex(node, index) {
  const mapping = NODE_REGION[node.id];
  if (mapping?.region) {
    const target = REGION_TARGETS[mapping.region] || REGION_TARGETS.default;
    const seed = hashString(node.id);
    const jittered = [
      target[0] + ((seed % 100) / 100 - .5) * 1.15,
      target[1] + (((seed >>> 8) % 100) / 100 - .5) * .86
    ];
    return nearestVertex(jittered, index);
  }
  return hashString(node.id) % BRAIN_MESH.vertices.length;
}

export function mountBrainNet(canvas, {
  nodes,
  markerLayer,
  onSelect = () => {},
  isPrivate = node => node.privacy !== "public"
}) {
  const gl = canvas.getContext("webgl", {
    alpha:false,
    antialias:false,
    depth:false,
    powerPreference:"high-performance",
    preserveDrawingBuffer:false
  });
  if (!gl) throw new Error("WebGL is unavailable");

  const program = createProgram(gl);
  const attributes = {
    position:gl.getAttribLocation(program, "aPosition"),
    phase:gl.getAttribLocation(program, "aPhase")
  };
  const uniforms = {
    scale:gl.getUniformLocation(program, "uScale"),
    rotation:gl.getUniformLocation(program, "uRotation"),
    zoom:gl.getUniformLocation(program, "uZoom"),
    color:gl.getUniformLocation(program, "uColor"),
    pulseColor:gl.getUniformLocation(program, "uPulseColor"),
    time:gl.getUniformLocation(program, "uTime"),
    signal:gl.getUniformLocation(program, "uSignal")
  };

  const positions = new Float32Array(BRAIN_MESH.vertices.flat());
  const edgeIndices = new Uint16Array(BRAIN_MESH.edges.flat());
  const phaseZero = new Float32Array(BRAIN_MESH.vertices.length);
  const signalGeometry = buildLineGeometry([...BRAIN_MESH.paths, ...BRAIN_MESH.axons]);
  const meshPositionBuffer = createBuffer(gl, positions);
  const meshPhaseBuffer = createBuffer(gl, phaseZero);
  const meshIndexBuffer = createBuffer(gl, edgeIndices, gl.ELEMENT_ARRAY_BUFFER);
  const signalPositionBuffer = createBuffer(gl, signalGeometry.positions);
  const signalPhaseBuffer = createBuffer(gl, signalGeometry.phases);

  const markerEntries = nodes.map((node, index) => {
    const button = document.createElement("button");
    const privateNode = isPrivate(node);
    button.className = `brain-marker${privateNode ? " is-private" : ""}`;
    button.type = "button";
    button.dataset.nodeId = node.id;
    button.setAttribute("aria-label", node.label);
    button.innerHTML = `<i aria-hidden="true"></i><span></span>`;
    button.querySelector("span").textContent = node.label;
    button.addEventListener("click", () => onSelect(node.id));
    markerLayer.append(button);
    return {
      button,
      node,
      point:BRAIN_MESH.vertices[chooseNodeVertex(node, index)]
    };
  });

  let width = 1;
  let height = 1;
  let yaw = -.18;
  let pitch = .23;
  let zoom = 1;
  let pointer = null;
  let lastPaint = 0;
  const compact = matchMedia("(max-width: 760px)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frameInterval = compact ? 50 : 33;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, compact ? 1 : 1.25);
    const nextWidth = Math.max(1, Math.round(bounds.width * dpr));
    const nextHeight = Math.max(1, Math.round(bounds.height * dpr));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    width = bounds.width;
    height = bounds.height;
    gl.viewport(0, 0, nextWidth, nextHeight);
  }

  function rotatedPoint(source) {
    const [x, y, z] = source;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const yawX = x * cy + z * sy;
    const yawZ = -x * sy + z * cy;
    return [
      yawX,
      y * cp - yawZ * sp,
      y * sp + yawZ * cp
    ];
  }

  function scales() {
    const portrait = height > width;
    return [1 / (portrait ? 8.1 : 13.2), 1 / (portrait ? 5.7 : 4.5)];
  }

  function project(source) {
    const [x, y, z] = rotatedPoint(source);
    const [scaleX, scaleY] = scales();
    const perspective = 1 / (1 + z * .035);
    return {
      x:(x * scaleX * zoom * perspective * .5 + .5) * width,
      y:(.5 - y * scaleY * zoom * perspective * .5) * height,
      z,
      perspective
    };
  }

  function bindGeometry(positionBuffer, phaseBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, phaseBuffer);
    gl.enableVertexAttribArray(attributes.phase);
    gl.vertexAttribPointer(attributes.phase, 1, gl.FLOAT, false, 0, 0);
  }

  function draw(now = 0) {
    resize();
    const dark = document.documentElement.dataset.theme !== "light";
    const background = dark ? [0.022, .025, .028, 1] : [.95, .95, .935, 1];
    const meshColor = dark ? [.43, .47, .53, .25] : [.12, .13, .14, .22];
    const axonColor = dark ? [.34, .39, .45, .13] : [.17, .18, .19, .12];
    gl.clearColor(...background);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uniforms.scale, ...scales());
    gl.uniform2f(uniforms.rotation, yaw, pitch);
    gl.uniform1f(uniforms.zoom, zoom);
    gl.uniform1f(uniforms.time, now / 1000);
    gl.uniform3f(uniforms.pulseColor, .24, 1, .53);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    bindGeometry(meshPositionBuffer, meshPhaseBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
    gl.uniform4f(uniforms.color, ...meshColor);
    gl.uniform1f(uniforms.signal, 0);
    gl.drawElements(gl.LINES, edgeIndices.length, gl.UNSIGNED_SHORT, 0);

    bindGeometry(signalPositionBuffer, signalPhaseBuffer);
    gl.uniform4f(uniforms.color, ...axonColor);
    gl.uniform1f(uniforms.signal, 0);
    gl.drawArrays(gl.LINES, 0, signalGeometry.phases.length);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform4f(uniforms.color, .08, .25, .14, dark ? .08 : .06);
    gl.uniform1f(uniforms.signal, 1);
    gl.drawArrays(gl.LINES, 0, signalGeometry.phases.length);

    markerEntries.forEach(entry => {
      const point = project(entry.point);
      const depthOpacity = Math.max(.16, Math.min(1, .64 + point.z * .075));
      entry.button.style.transform = `translate3d(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px,0) scale(${Math.max(.72, Math.min(1.22, point.perspective)).toFixed(3)})`;
      entry.button.style.opacity = depthOpacity.toFixed(2);
      entry.button.style.zIndex = String(50 + Math.round(point.z * 3));
    });
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (document.hidden || now - lastPaint < frameInterval) return;
    lastPaint = now;
    if (!pointer && !reducedMotion) yaw += .00045;
    draw(now);
  }

  canvas.addEventListener("pointerdown", event => {
    if (event.button !== undefined && event.button !== 0) return;
    pointer = { id:event.pointerId, x:event.clientX, y:event.clientY, yaw, pitch };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    yaw = pointer.yaw + (event.clientX - pointer.x) * .006;
    pitch = Math.max(-.8, Math.min(.8, pointer.pitch + (event.clientY - pointer.y) * .005));
  });
  const release = event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null;
    try { canvas.releasePointerCapture?.(event.pointerId); } catch {}
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    zoom = Math.max(.72, Math.min(1.65, zoom * Math.exp(-event.deltaY * .001)));
  }, { passive:false });
  addEventListener("resize", resize, { passive:true });

  if (reducedMotion) draw(0);
  else requestAnimationFrame(animate);
  return { redraw:() => draw(performance.now()) };
}
