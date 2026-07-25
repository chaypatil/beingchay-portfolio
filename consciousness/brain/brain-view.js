import { REGIONS } from "./brain-regions.js";
import { NODE_REGION } from "./brain-mapping.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSvgElement(documentRef, name, attributes = {}) {
  const element = documentRef.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function deterministicJitter(regionId, index) {
  const phase = (hashString(regionId) / 4294967296) * Math.PI * 2;
  const radius = 24 + Math.floor(index / 4) * 24;
  const angle = phase + index * GOLDEN_ANGLE;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

export function renderBrain(svgEl, { nodes = [], onSelect } = {}) {
  if (!svgEl?.ownerDocument || typeof svgEl.replaceChildren !== "function") {
    throw new TypeError("renderBrain requires an SVG element.");
  }

  const documentRef = svgEl.ownerDocument;
  const fragment = documentRef.createDocumentFragment();
  const regionById = new Map(REGIONS.map(region => [region.id, region]));

  svgEl.setAttribute("viewBox", "0 0 1000 650");
  svgEl.setAttribute("role", "img");
  svgEl.setAttribute("aria-label", "Artistic head drawers and their associated themes");

  for (const region of REGIONS) {
    const path = createSvgElement(documentRef, "path", {
      class: "brain-region",
      d: region.path,
      "data-region": region.id
    });
    const title = createSvgElement(documentRef, "title");
    title.textContent = `${region.label}: ${region.blurb}`;
    path.append(title);
    fragment.append(path);
  }

  const nodesByRegion = new Map(REGIONS.map(region => [region.id, []]));
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const mapping = NODE_REGION[node?.id];
    if (!mapping || !regionById.has(mapping.region)) continue;
    nodesByRegion.get(mapping.region).push(node);
  }

  for (const region of REGIONS) {
    const regionNodes = nodesByRegion
      .get(region.id)
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));

    regionNodes.forEach((node, index) => {
      const [jitterX, jitterY] = deterministicJitter(region.id, index);
      const radius = Number.isFinite(Number(node.r)) ? Math.max(2, Number(node.r)) : 6;
      const circle = createSvgElement(documentRef, "circle", {
        class: "brain-node",
        cx: (region.centroid[0] + jitterX).toFixed(2),
        cy: (region.centroid[1] + jitterY).toFixed(2),
        r: radius,
        "data-node-id": node.id,
        "data-region": region.id,
        role: "button",
        tabindex: "0",
        "aria-label": `${node.label || node.id}, ${region.label} drawer`
      });
      const title = createSvgElement(documentRef, "title");
      title.textContent = node.label || node.id;
      circle.append(title);

      const selectNode = () => {
        if (typeof onSelect === "function") onSelect(node.id);
      };
      circle.addEventListener("click", selectNode);
      circle.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectNode();
      });
      fragment.append(circle);
    });
  }

  for (const region of REGIONS) {
    const label = createSvgElement(documentRef, "text", {
      class: "brain-label",
      x: region.centroid[0],
      y: region.centroid[1],
      "data-region": region.id,
      "text-anchor": "middle"
    });
    label.textContent = region.label;
    fragment.append(label);
  }

  svgEl.replaceChildren(fragment);
}
