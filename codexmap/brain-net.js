import { BRAIN_MESH } from "./brain-mesh.js";
import { NODE_REGION } from "../consciousness/brain/brain-mapping.js";

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute float aPhase;
uniform vec2 uScale;
uniform vec2 uRotation;
uniform float uZoom;
varying float vPhase;
varying float vDepth;

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
  float perspective = 1.0 / (1.0 + point.z * 0.048);
  gl_Position = vec4(
    point.x * uScale.x * uZoom * perspective,
    point.y * uScale.y * uZoom * perspective,
    point.z * 0.025,
    1.0
  );
  vPhase = aPhase;
  vDepth = point.z;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec4 uColor;
uniform vec3 uPulseColor;
uniform float uTime;
uniform float uSignal;
varying float vPhase;
varying float vDepth;

void main() {
  float cycle = fract(vPhase - uTime * 0.31);
  float head = smoothstep(0.12, 0.0, abs(cycle - 0.5));
  float tail = smoothstep(0.28, 0.0, abs(cycle - 0.41)) * 0.28;
  float pulse = clamp(head + tail, 0.0, 1.0) * uSignal;
  vec3 color = mix(uColor.rgb, uPulseColor, pulse);
  float depthFade = clamp(0.58 + vDepth * 0.075, 0.2, 1.0);
  float alpha = (uColor.a + pulse * (1.0 - uColor.a)) * depthFade;
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

function smoothRange(edge0, edge1, value) {
  const progress = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return progress * progress * (3 - 2 * progress);
}

// The source mesh remains the Blender-authored topology. This lightweight
// sculpting pass gives that topology a recognizable cerebral silhouette:
// broader paired hemispheres, a top cleft, a raised posterior underside and a
// hanging temporal area. It is an illustration, never an anatomical claim.
function sculptCerebrum([sourceX, sourceY, sourceZ]) {
  let x = sourceX;
  let y = sourceY;
  let z = sourceZ * 1.24;
  const front = Math.exp(-Math.pow((x + 4.15) / 2.15, 2));
  const rear = Math.exp(-Math.pow((x - 4.35) / 1.75, 2));
  const temporal = Math.exp(-Math.pow((x - .15) / 2.75, 2))
    * smoothRange(.18, 1, Math.abs(z) / 4.35);

  // A rounder frontal dome and a slightly tapered occipital pole.
  x -= front * .18;
  x -= rear * .16 * smoothRange(-.3, 1.9, y);
  if (y > 0) y += front * .22 + (1 - rear) * .08;

  // Lift the rear underside to leave a readable cerebellar notch, while the
  // lateral temporal lobes retain their lower, fuller silhouette.
  if (y < -.7) {
    y += rear * smoothRange(-2.9, -1.05, -y) * .68;
    y -= temporal * .42;
  }

  // Separate the hemispheres near the crown. From frontal angles this avoids
  // the flattened single-shell look and preserves a central longitudinal gap.
  const crown = smoothRange(.35, 2.8, y);
  const midline = Math.exp(-Math.pow(z / .72, 2));
  if (crown > 0 && midline > .02) {
    const side = z === 0 ? (x < 0 ? -1 : 1) : Math.sign(z);
    z += side * .28 * crown * midline;
    y -= .24 * crown * midline;
  }

  return [x, y, z];
}

const BRAIN_VERTICES = BRAIN_MESH.vertices.map(sculptCerebrum);

function appendLine(positions, phases, start, end, phase) {
  positions.push(...start, ...end);
  phases.push(phase, phase + .035);
}

// Separate wire volumes make the silhouette legible as a brain rather than an
// egg: a folded cerebellum beneath the rear and a short curved brainstem.
function buildAnatomyLines() {
  const positions = [];
  const phases = [];
  const rings = 8;
  const segments = 16;
  const cerebellumPoint = (ring, segment) => {
    const latitude = -Math.PI / 2 + Math.PI * ring / rings;
    const longitude = Math.PI * 2 * segment / segments;
    const fold = 1 + .08 * Math.sin(longitude * 5 + latitude * 3);
    return [
      3.55 + Math.cos(latitude) * Math.cos(longitude) * 1.72 * fold,
      -2.22 + Math.sin(latitude) * 1.08 * fold,
      Math.cos(latitude) * Math.sin(longitude) * 1.72 * fold
    ];
  };
  for (let ring = 0; ring <= rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const phase = (ring * segments + segment) / ((rings + 1) * segments);
      appendLine(
        positions,
        phases,
        cerebellumPoint(ring, segment),
        cerebellumPoint(ring, (segment + 1) % segments),
        phase
      );
      if (ring < rings) {
        appendLine(
          positions,
          phases,
          cerebellumPoint(ring, segment),
          cerebellumPoint(ring + 1, segment),
          phase + .17
        );
      }
    }
  }

  const stemRings = 7;
  const stemSegments = 10;
  const stemPoint = (ring, segment) => {
    const progress = ring / stemRings;
    const angle = Math.PI * 2 * segment / stemSegments;
    const radius = .64 - progress * .22;
    return [
      1.35 - progress * .36 + Math.cos(angle) * radius,
      -2.28 - progress * 2.08,
      Math.sin(angle) * radius * .82
    ];
  };
  for (let ring = 0; ring <= stemRings; ring += 1) {
    for (let segment = 0; segment < stemSegments; segment += 1) {
      const phase = .45 + (ring * stemSegments + segment) / 300;
      appendLine(
        positions,
        phases,
        stemPoint(ring, segment),
        stemPoint(ring, (segment + 1) % stemSegments),
        phase
      );
      if (ring < stemRings) {
        appendLine(
          positions,
          phases,
          stemPoint(ring, segment),
          stemPoint(ring + 1, segment),
          phase + .11
        );
      }
    }
  }
  return { positions:new Float32Array(positions), phases:new Float32Array(phases) };
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
    const points = path.map(point => Array.isArray(point) ? sculptCerebrum(point) : BRAIN_VERTICES[point]);
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
  for (let index = 0; index < BRAIN_VERTICES.length; index += 1) {
    const [x, y, z] = BRAIN_VERTICES[index];
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
  return hashString(node.id) % BRAIN_VERTICES.length;
}

export function mountBrainNet(canvas, {
  nodes = [],
  markerLayer,
  onSelect = () => {},
  onProjectionFrame = () => {},
  isPrivate = node => node.privacy !== "public",
  transparent = false,
  interactive = true,
  autoRotate = true,
  interactionTarget = canvas,
  active = true
}) {
  const gl = canvas.getContext("webgl", {
    alpha:transparent,
    antialias:false,
    depth:true,
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

  const positions = new Float32Array(BRAIN_VERTICES.flat());
  const edgeIndices = new Uint16Array(BRAIN_MESH.edges.flat());
  const phaseZero = new Float32Array(BRAIN_MESH.vertices.length);
  const signalGeometry = buildLineGeometry([...BRAIN_MESH.paths, ...BRAIN_MESH.axons]);
  const anatomyGeometry = buildAnatomyLines();
  const meshPositionBuffer = createBuffer(gl, positions);
  const meshPhaseBuffer = createBuffer(gl, phaseZero);
  const meshIndexBuffer = createBuffer(gl, edgeIndices, gl.ELEMENT_ARRAY_BUFFER);
  const signalPositionBuffer = createBuffer(gl, signalGeometry.positions);
  const signalPhaseBuffer = createBuffer(gl, signalGeometry.phases);
  const anatomyPositionBuffer = createBuffer(gl, anatomyGeometry.positions);
  const anatomyPhaseBuffer = createBuffer(gl, anatomyGeometry.phases);

  let projectionEntries = [];
  let markerEntries = [];

  function setProjectionNodes(nextNodes) {
    projectionEntries = nextNodes.map((node, index) => ({
      node,
      point:BRAIN_VERTICES[chooseNodeVertex(node, index)]
    }));
    if (!markerLayer) return;
    markerLayer.replaceChildren();
    markerEntries = projectionEntries.map(entry => {
      const { node } = entry;
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
      return { button, node, point:entry.point };
    });
  }

  setProjectionNodes(nodes);

  const compact = matchMedia("(max-width: 760px)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 1;
  let height = 1;
  let yaw = compact ? -.34 : -.22;
  let pitch = compact ? .18 : .23;
  let zoom = compact ? .9 : 1;
  let pointer = null;
  let animationFrame = 0;
  let running = active;
  let sizeDirty = true;

  function resize() {
    if (!sizeDirty) return;
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
    sizeDirty = false;
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
    const perspective = 1 / (1 + z * .048);
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
    const background = transparent
      ? [0, 0, 0, 0]
      : dark ? [0.022, .025, .028, 1] : [.95, .95, .935, 1];
    const meshColor = dark ? [.28, .72, .43, .3] : [.035, .24, .12, .48];
    const axonColor = dark ? [.18, .56, .31, .18] : [.025, .19, .09, .28];
    gl.clearColor(...background);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.useProgram(program);
    gl.uniform2f(uniforms.scale, ...scales());
    gl.uniform2f(uniforms.rotation, yaw, pitch);
    gl.uniform1f(uniforms.zoom, zoom);
    gl.uniform1f(uniforms.time, now / 1000);
    gl.uniform3f(uniforms.pulseColor, dark ? .24 : .03, dark ? 1 : .48, dark ? .53 : .2);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    bindGeometry(meshPositionBuffer, meshPhaseBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
    gl.uniform4f(uniforms.color, ...meshColor);
    gl.uniform1f(uniforms.signal, 0);
    gl.drawElements(gl.LINES, edgeIndices.length, gl.UNSIGNED_SHORT, 0);

    bindGeometry(anatomyPositionBuffer, anatomyPhaseBuffer);
    gl.uniform4f(uniforms.color, ...meshColor);
    gl.uniform1f(uniforms.signal, 0);
    gl.drawArrays(gl.LINES, 0, anatomyGeometry.phases.length);

    bindGeometry(signalPositionBuffer, signalPhaseBuffer);
    gl.uniform4f(uniforms.color, ...axonColor);
    gl.uniform1f(uniforms.signal, 0);
    gl.drawArrays(gl.LINES, 0, signalGeometry.phases.length);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform4f(uniforms.color, dark ? .08 : .02, dark ? .25 : .18, dark ? .14 : .08, dark ? .08 : .16);
    gl.uniform1f(uniforms.signal, 1);
    gl.drawArrays(gl.LINES, 0, signalGeometry.phases.length);

    markerEntries.forEach(entry => {
      const point = project(entry.point);
      const depthOpacity = Math.max(.16, Math.min(1, .64 + point.z * .075));
      entry.button.style.transform = `translate3d(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px,0) scale(${Math.max(.72, Math.min(1.22, point.perspective)).toFixed(3)})`;
      entry.button.style.opacity = depthOpacity.toFixed(2);
      entry.button.style.zIndex = String(50 + Math.round(point.z * 3));
    });
    onProjectionFrame(projectionEntries.map(entry => ({
      id:entry.node.id,
      ...project(entry.point)
    })));
  }

  function animate(now) {
    if (!running) return;
    animationFrame = requestAnimationFrame(animate);
    if (document.hidden) return;
    if (!pointer && !reducedMotion && autoRotate) yaw += compact ? .0007 : .00055;
    draw(now);
  }

  if (interactive) {
    interactionTarget.addEventListener("pointerdown", event => {
      if (!running || event.target.closest?.(".node")) return;
      if (event.button !== undefined && event.button !== 0) return;
      pointer = { id:event.pointerId, x:event.clientX, y:event.clientY, yaw, pitch };
      interactionTarget.setPointerCapture?.(event.pointerId);
    });
    interactionTarget.addEventListener("pointermove", event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      yaw = pointer.yaw + (event.clientX - pointer.x) * .006;
      pitch = Math.max(-.8, Math.min(.8, pointer.pitch + (event.clientY - pointer.y) * .005));
    });
    const release = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer = null;
      try { interactionTarget.releasePointerCapture?.(event.pointerId); } catch {}
    };
    interactionTarget.addEventListener("pointerup", release);
    interactionTarget.addEventListener("pointercancel", release);
    interactionTarget.addEventListener("wheel", event => {
      if (!running) return;
      event.preventDefault();
      zoom = Math.max(.72, Math.min(1.65, zoom * Math.exp(-event.deltaY * .001)));
    }, { passive:false });
  }
  const resizeObserver = new ResizeObserver(() => {
    sizeDirty = true;
    if (running && reducedMotion) draw(performance.now());
  });
  resizeObserver.observe(canvas);

  if (reducedMotion) {
    if (running) draw(0);
  } else if (running) {
    animationFrame = requestAnimationFrame(animate);
  }
  return {
    redraw:() => draw(performance.now()),
    setNodes(nextNodes) {
      setProjectionNodes(nextNodes);
      if (running) draw(performance.now());
    },
    setActive(nextActive) {
      const next = Boolean(nextActive);
      if (running === next) return;
      running = next;
      pointer = null;
      if (!running) {
        cancelAnimationFrame(animationFrame);
        return;
      }
      if (reducedMotion) draw(performance.now());
      else animationFrame = requestAnimationFrame(animate);
    }
  };
}
