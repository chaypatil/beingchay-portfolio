// Stylized left-facing side profile for a 1000 x 650 SVG viewBox.
// These shapes are visual drawers, not a claim about anatomy or a person's body.
//
// Geometry guide:
// - The face/front is on the left; the back of the head is on the right.
// - The first five paths tile the large outer silhouette.
// - Cerebellum and brainstem form the lower-right tail of the silhouette.
// - Limbic and insula are smaller overlays drawn last.
// - Each path is intentionally independent: nudge its control points and centroid together.

export const REGIONS = [
  {
    id: "prefrontal",
    label: "Prefrontal",
    blurb: "A drawer for plans, choices, self-authorship, and the urge to steer.",
    // Front cap: nudge the leftmost x values to change the forehead profile.
    path: "M150 340 C105 285 112 200 160 137 C215 65 320 55 407 95 L424 186 C381 230 365 287 374 365 C294 397 205 390 150 340 Z",
    centroid: [270, 235]
  },
  {
    id: "motor",
    label: "Motor",
    blurb: "A drawer for action, rhythm, momentum, and thought becoming movement.",
    // Upper-middle band: the 407/548 top points set its width.
    path: "M407 95 C455 75 505 78 548 95 L558 188 C505 224 476 280 480 352 L374 365 C365 287 381 230 424 186 Z",
    centroid: [455, 220]
  },
  {
    id: "parietal",
    label: "Parietal",
    blurb: "A drawer for patterns, structure, scale, and pieces becoming a whole.",
    // Crown: raise or lower the first curve to change the top silhouette.
    path: "M548 95 C648 82 744 115 800 179 L742 304 C660 320 567 342 480 352 C476 280 505 224 558 188 Z",
    centroid: [635, 205]
  },
  {
    id: "occipital",
    label: "Occipital",
    blurb: "A drawer for images, symbols, colour, and worlds pictured before they exist.",
    // Rear cap: the 875 x coordinate controls how far the skull extends.
    path: "M800 179 C849 231 878 291 875 351 C873 398 855 439 827 468 L742 406 C747 370 747 336 742 304 Z",
    centroid: [815, 315]
  },
  {
    id: "temporal",
    label: "Temporal",
    blurb: "A drawer for sound, stories, memory, language, and cultural imprint.",
    // Lower lobe: the 341/665 points control the jaw-like sweep.
    path: "M374 365 C480 352 575 345 662 324 C694 316 720 309 742 304 C747 336 747 370 742 406 L665 494 C557 514 439 493 341 442 C334 412 345 385 374 365 Z",
    centroid: [545, 420]
  },
  {
    id: "cerebellum",
    label: "Cerebellum",
    blurb: "A drawer for repetition, craft, timing, and fluency earned through practice.",
    // Lower-rear bulb: move 832/851 to reshape its outer roundness.
    path: "M646 486 C690 440 769 426 832 462 C875 486 884 530 851 557 C804 597 708 582 636 531 Z",
    centroid: [755, 515]
  },
  {
    id: "brainstem",
    label: "Brainstem",
    blurb: "A drawer for endurance, urgency, survival, and the force to keep going.",
    // Downward stem: the final two 625 y values control its length.
    path: "M535 420 C580 428 624 450 646 486 L636 531 C618 561 607 592 610 625 L535 625 C540 580 532 547 510 514 C492 487 488 455 500 425 Z",
    centroid: [565, 535]
  },
  {
    id: "limbic",
    label: "Limbic",
    blurb: "A drawer for longing, attachment, fear, conviction, and emotional gravity.",
    // Inner crescent: widen the 430/675 span to make the arc more prominent.
    path: "M430 235 C495 190 590 190 650 235 C690 265 700 315 675 350 C655 375 630 390 600 402 L565 365 C610 345 630 320 625 290 C618 255 575 235 530 240 C490 245 455 265 435 295 L405 270 C410 255 418 245 430 235 Z",
    centroid: [555, 270]
  },
  {
    id: "insula",
    label: "Insula",
    blurb: "A drawer for inner weather, felt intensity, and private friction.",
    // Inner island: its four main curves can be nudged without changing the silhouette.
    path: "M460 300 C500 265 565 255 615 285 C640 305 640 340 615 362 C565 390 500 375 465 345 C450 330 448 315 460 300 Z",
    centroid: [535, 325]
  }
];
