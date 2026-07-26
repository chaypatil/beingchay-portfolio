import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../consciousness/map-page.js", import.meta.url), "utf8");
const shell = await readFile(new URL("../consciousness/index.html", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /history\.pushState\([^)]*["']\/consciousness\//,
  "The landing transition must not create a back-stack entry with an in-place DOM."
);
assert.match(
  source,
  /history\.replaceState\([^)]*["']\/consciousness\//,
  "The landing transition should replace the landing history entry."
);
assert.match(
  source,
  /PROJECT_DESTINATIONS[\s\S]*fallout[\s\S]*https:\/\/fall0ut\.in[\s\S]*c2x[\s\S]*\/c2x\//,
  "FALLØUT and C2X need explicit direct destinations."
);
assert.match(
  source,
  /bindMobileHorizontalSwipe\(libraryRail[\s\S]*onLeft:[\s\S]*setPanelCollapsed\("rail", true\)/,
  "The mobile library must collapse with a left swipe."
);
assert.doesNotMatch(
  shell,
  /id=["']depth-(?:back|forward)["']/,
  "Retired Z controls must not be present in the current shell."
);

console.log("consciousness regression checks passed");
