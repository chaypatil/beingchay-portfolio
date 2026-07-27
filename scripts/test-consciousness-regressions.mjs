import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../consciousness/map-page.js", import.meta.url), "utf8");
const shell = await readFile(new URL("../consciousness/index.html", import.meta.url), "utf8");

assert.match(
  source,
  /history\.pushState\([^)]*["']\/consciousness\//,
  "The landing must remain in history so mobile Back returns to it."
);
assert.doesNotMatch(
  source,
  /history\.replaceState\([^)]*["']\/consciousness\//,
  "Entering the map must not erase the landing from browser history."
);
assert.match(
  source,
  /PROJECT_DESTINATIONS[\s\S]*fallout[\s\S]*https:\/\/fall0ut\.in[\s\S]*c2x[\s\S]*\/c2x\//,
  "FALLØUT and C2X need explicit direct destinations."
);
assert.match(
  source,
  /bindNativeTouchSwipe\(libraryRail[\s\S]*direction:"left"[\s\S]*setPanelCollapsed\("rail", true\)/,
  "The mobile library must observe native touch swipes instead of fighting browser scrolling."
);
assert.match(
  source,
  /bindNativeTouchSwipe\(detailPanel[\s\S]*direction:"down"[\s\S]*setPanelCollapsed\("detail", true\)/,
  "The mobile detail sheet must close with a native downward swipe."
);
assert.match(
  source,
  /if \(!compactMap\)[\s\S]*width:1000[\s\S]*return \{ width:1000, height:650/,
  "Mobile must retain the desktop map geometry instead of stretching it vertically."
);
assert.doesNotMatch(
  shell,
  /id=["']depth-(?:back|forward)["']/,
  "Retired Z controls must not be present in the current shell."
);

console.log("consciousness regression checks passed");
