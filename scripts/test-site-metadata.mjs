import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function attr(html, selector, attribute = "content") {
  const tag = html.match(selector)?.[0] ?? "";
  return tag.match(new RegExp(`${attribute}="([^"]+)"`))?.[1] ?? "";
}

function metadata(relativePath) {
  const html = read(relativePath);
  return {
    html,
    title: html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "",
    description: attr(html, /<meta name="description"[^>]*>/i),
    canonical: attr(html, /<link rel="canonical"[^>]*>/i, "href"),
    ogTitle: attr(html, /<meta property="og:title"[^>]*>/i),
    ogDescription: attr(html, /<meta property="og:description"[^>]*>/i),
    ogUrl: attr(html, /<meta property="og:url"[^>]*>/i),
    ogImage: attr(html, /<meta property="og:image"[^>]*>/i),
    twitterCard: attr(html, /<meta name="twitter:card"[^>]*>/i),
    twitterTitle: attr(html, /<meta name="twitter:title"[^>]*>/i),
    twitterDescription: attr(html, /<meta name="twitter:description"[^>]*>/i),
    twitterImage: attr(html, /<meta name="twitter:image"[^>]*>/i)
  };
}

function assertComplete(relativePath, canonical) {
  const meta = metadata(relativePath);
  assert(meta.title.length >= 8, `${relativePath}: title is missing or too short`);
  assert(meta.description.length >= 50, `${relativePath}: description is missing or too short`);
  assert.equal(meta.canonical, canonical, `${relativePath}: canonical URL`);
  assert.equal(meta.ogTitle, meta.twitterTitle, `${relativePath}: social titles disagree`);
  assert(meta.ogDescription.length >= 40, `${relativePath}: Open Graph description`);
  assert.equal(meta.ogDescription, meta.twitterDescription, `${relativePath}: social descriptions disagree`);
  assert.equal(meta.ogUrl, canonical, `${relativePath}: Open Graph URL`);
  assert(meta.ogImage.startsWith("https://beingchay.com/"), `${relativePath}: absolute Open Graph image`);
  assert.equal(meta.ogImage, meta.twitterImage, `${relativePath}: social images disagree`);
  assert.equal(meta.twitterCard, "summary_large_image", `${relativePath}: Twitter card`);
  assert(!/work note/i.test(meta.description), `${relativePath}: placeholder description survived`);
  return meta;
}

const rootMeta = assertComplete("index.html", "https://beingchay.com/");
assert.equal(rootMeta.ogImage, "https://beingchay.com/assets/central-light-hero.png");
assert(!/constellation behind/i.test(rootMeta.description), "stale landing description survived");

const consciousnessMeta = assertComplete(
  "consciousness/index.html",
  "https://beingchay.com/consciousness/"
);
assert.equal(consciousnessMeta.ogImage, "https://beingchay.com/assets/central-light-hero.png");

const portfolioMeta = assertComplete("c2x/index.html", "https://beingchay.com/portfolio/");
assert.equal(
  portfolioMeta.ogImage,
  "https://beingchay.com/assets/consultation-hero-desktop.png",
  "C2X must not fall back to the Fallout image in its page body"
);
assert(!/fallout/i.test(portfolioMeta.ogImage), "C2X preview points at Fallout");

assertComplete("c2x/book/index.html", "https://beingchay.com/portfolio/book/");

for (const slug of ["everis", "fallout", "pebble", "peoplebox-ai", "prosp", "soileum", "ticombo"]) {
  assertComplete(
    `c2x/work/${slug}/index.html`,
    `https://beingchay.com/portfolio/work/${slug}/`
  );
}

console.log("site metadata regression tests passed");
