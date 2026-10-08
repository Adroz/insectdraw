# insectdraw — agent notes

Procedural Victorian-style insect plates. Read `README.md` first; this file is the working
contract for changes.

## Shape of the project

- The engine lives in `index.html` inside `<script id="engine">` (pure generation, no DOM), with that
  page's CSS and its short UI script at the end; `compare.html` and `parts.html` are small pages that
  fetch the engine from it. No build step, no dependencies.
- A plate is drawn by `drawPlate`, a ~30-line orchestrator that calls one module-scope function per
  section in a fixed order: `rollProportions` (the size table and family pick), `layoutBody` (body
  genes, thorax and abdomen profiles, wing roots), `drawAbdomen`, `drawThorax`, `drawHead`,
  `drawTegulae`, `drawLegs`, the order's wing function from its `ORDERS` entry (`wingsLepidoptera`,
  `wingsDiptera`, `wingsNeuroptera`, `wingsCicada`, `wingsEphemeroptera`, `wingsHymenoptera`,
  `wingsOdonata`, `wingsElytra`, `wingsOrthoptera`), then `drawAntennae` (after the wings, so the
  pose can be checked against their outlines) and `assemblePlate`.
  `rollProportions` takes the type and returns `P`; every other section takes one context object `C`
  (`seed`, `type`, `order` (the type's `ORDERS` entry), `dev`, `replay`, `L`, `meta`, `outerBox` from
  the orchestrator; `P`, `B`, `thorax`, `abdomen`, `abdHW`, `headTop`, `headCy` added by `layoutBody`),
  destructures only the
  fields it reads, and draws into `C.L` / `C.meta`. The call order is the rng order: never reorder the
  calls, and a new section that draws goes in as another function on `C`, not inline in `drawPlate`.
  A refactor that must not change any drawing proves it with `tests/snapshot.js`: `git show
  main:index.html > /tmp/old.html`, `node tests/snapshot.js write before.json 3000 --engine /tmp/old.html`,
  then `node tests/snapshot.js check before.json 3000` on the new engine (every plate, every tenth
  device plate, every fiftieth part crop, byte for byte; a fixture of a different size fails the check).
- One registry per order (#4): an order is one entry in `ORDERS` (just above `rollBodyGenes`), holding
  everything the engine knows about it under one key: its `proportions` roll, the `abd` / `thorax` /
  `head` (+ `headFams`) / `legs` / `ant` gene tables, `headScaleP5`, `wingRoots`, its `wings` function
  and its `names` (+ `variantNames`). `TYPES` is the registry's key list in pick order (the plate's
  first rng draw indexes it), so a new order goes at the END of the table; inserting or reordering
  re-rolls every seed. Sections read `C.order` (or `ORDERS[type]`); a per-order fact a section needs
  goes into the entry, never into a new table keyed by type inside the section. The engine exports
  `ORDERS` read-only and `tests/check.js` asserts every entry's shape. **Adding an order** is one
  entry plus one wing function: write the entry (copy the nearest order's and edit the ranges), write
  the wing function (lanes, named crossveins, `meta.wingSig`, `meta.wingStats`, outlines through
  `makeWing`), name it in `wings`, and give `wingRoots` the `t` values the function uses. The sections'
  remaining `type ===` cases (thorax dorsal lines, the tegula list, leg thickness) are drawing rules
  with defaults, so an order without them still draws; prefer an opt-in field on the entry or `B` to
  a new `type ===` test.
- Every node consumer (`tests/*.js`, `scripts/render-daily.js`) loads the engine through
  `tests/engine.js` (`loadEngine`), the pages fetch `index.html` and match the tag, and the crowpanel-ha
  Dockerfile takes the script block containing `module.exports`. The contract they share (one tagged
  block that is the exporting one, DOM-free, deterministic per seed, the agreed export list) is written
  in README "Engine contract" and asserted by `engineContract()` in `tests/engine.js`, which
  `tests/check.js` runs first. Keep the `<script id="engine">` tag and the `module.exports` block at the
  bottom of the engine intact; a new export goes into `EXPORTS` in `tests/engine.js` in the same commit.
- `docs/` holds the morphology research the drawing rules are derived from. Add a note there
  when a new body part or venation plan is grounded in a reference.
  `docs/plan-body-variation.md` is the open plan for giving legs, body, head and antennae the
  same per-seed "genes" treatment the wings have.

## Hard constraints (e-ink plates)

- Line art only: black strokes on white. No fills except `#fff` masking, no gradients, opacity,
  filters or `url()` references in the SVG. `tests/check.js` fails on any of these.
- Minimum stroke 0.5 px after the plate scale; use the `SW.H/O/D/F` tokens, never literal widths.
- Hatching spacing never below ~1.8 px or e-ink fills in.
- Output must be deterministic per seed and fit the 600×600 plate with the caption band.
- Device plates (ADR 0001): `generateInsect(seed, { devicePx })` draws the same insect with every
  stroke weight ≥ 1.0 device px and every hatch / mesh pitch ≥ 2.5 device px
  (`floor × 600 / devicePx` plate px; the numbers are the engine's exported `DEVICE`), the
  subtitle dropped under 10 device px and the binomial floored at 24 device px (the gate measures
  that its thresholded letters do not fragment). Strokes are floored at the token substitution; pitches at
  draw time through `floorPitch(v)` (body units), which also records `meta.minPitch`. Every
  repeated mark at a spacing goes through `floorPitch`, never a literal step: hatch bands,
  lattice, mesh cells, pile, fringe, and the limb and antenna marks too (shading, spines, comb
  rows, herringbone, arista rami, club annuli), crossvein ladders and the stigma's lines
  (`floorFrac` for a step given as a fraction of a length, `floorSamples` for marks at every
  k-th sample). A site the floor misses leaves the device assertion in `tests/check.js` blind to
  it. A fan's pitch is held at its nearest outline point; a second hatch family over a first
  takes `floorPitch(v, 2)`. Without `devicePx` the output is byte-for-byte unchanged; `npm test`
  and the device block of `tests/check.js` are the two gates.

## Randomness rules

- A device plate is drawn twice from the same stream: pass 1 is the default plate and gives the
  scale, pass 2 redraws with the floors, so the type, genes and `bodySig` are re-rolled
  identically. A clamped site that draws rng jitter per element (stipple dots, mesh sites,
  ladder rungs) consumes a different number of draws on pass 2, so it must end with
  `rngSync()`: pass 1 records its stream position there and pass 2 restores it, keeping every
  roll outside the site identical. `meta.wingSig` / `wingStats` on a device plate are pass 1's
  by construction; pass 2's own sit on `meta.device`, where `tests/check.js` asserts the
  venation rules on them.

- `rng` is a single mulberry32 stream seeded from the plate seed. The first draw picks the body
  plan, then proportions, legs, head, then wings. Adding or removing `rng()` calls inside a block
  only changes what follows that block for the same seed; the body plan and everything drawn
  earlier stay put.
- Names use their own PRNG (`insectName`) and must never touch the drawing's `rng`.
- Per-seed variation is the whole point. Each winged body plan rolls a "wing genes" object
  (outline shape, vein counts, cell plan, crossvein spacing ...) at the top of its wing block and
  exposes a discrete `meta.wingSig`. `tests/check.js` fails if one signature covers more than 10%
  of a type's plates or fewer than half the plates are distinct. When you add a structural
  choice, add it to the signature; when you add a wing type, give it a signature.
- The body has the same contract: `rollBodyGenes(type, P)` rolls every per-seed body choice
  (leg family and pose, attachment, ratios, armature, abdomen profile, tip, markings, terminalia)
  right after the proportions, and `meta.bodySig` (`B.sig` joined) is held to the same 10% / 50%
  rule. Drawing blocks read `B`, never roll their own literals; push every new discrete choice
  onto `B.sig`. The wing family is rolled in the entry's `proportions` as `P.fam` so body and wings
  share it; wing blocks read it, they do not roll it. Leg poses are validated against the body
  in the legs block (`legsOk`: ordering, mirror line, abdomen outline, pair clearance, fit) and
  re-rolled; `tests/check.js` asserts the result on `meta.legs[i].pts`, so a new pose or family
  range must keep those invariants rather than relax the test. The left legs are the right legs rotated per pair by `B.legs[i].skew` about the coxa
  (`L.legPairs` in the assembly); any new check on the right legs should also run on the rotated
  set, as `tests/check.js` does. Antennae follow the same shape:
  `rollAntGenes` (the entry's `ant` table, poses from `ANT_POSES`) rolls the genes, `antennaGeom` builds the
  geometry without rng, and the antennae block (after the legs and the wings) validates the pose: no point of
  the right antenna reaches the mirror line (the left is its mirror image, so that is the
  no-crossing rule), the antenna alone does not push the plate scale under 0.6, raised forelegs are kept
  clear, no point lies inside a wing, elytron or tegmen outline (`meta.wingOutlines`, pushed by `makeWing`
  and the elytra; a swept pose that fails is re-rolled forward and nearly straight); re-roll,
  then a known-good pose. `tests/check.js` asserts it on `meta.antennae.pts`. Curvature is signed
  outward-positive; keep inward curvature tiny or the long kinds will cross.
- Legs and wings attach through `thorax.yAt(t)` / `thorax.hwAt(y)`, so the thorax profile
  (`B.thorax.anchors` → `P.thoraxAnchors`) must keep `bodyPart`'s interface and stay wide where
  they land. A wing block roots its wings at its order's `wingRoots` (`C.order.wingRoots`, forewing
  first; the tegula sits on the first entry and `tests/check.js` asserts the thorax has width there),
  never at a literal `t`: a root moves by editing the entry. The one exception is the orthopteran
  tegmen, drawn from under the pronotum's hind margin (`thorax.yBot - 6`); the grasshopper entry's
  roots are the anatomical positions the width check holds.
- The head is drawn from `B.head` (the entry's `head` / `headFams` tables, rolled in `rollBodyGenes`, rules in
  `docs/research-head-eyes.md`). `P.headW` / `P.headH` / `headTop` / `headCy` stay the bounding box
  and centre of the head; the drawn capsule is `meta.headOutline` (closed polyline, body coords) and
  `meta.head` carries the eyes, ocelli and rostrum that `tests/check.js` asserts (eyes inside the
  bbox with ≤ 10 % overhang, ocelli inside the outline). Eye lattice pitch is floored at
  `1.8 / order.headScaleP5` so facets never fill in on e-ink; update the entry if an order's
  plate scale changes.
- Terminal veins must end on the outline: use `marginTargets`, `tipPoint`, or evaluate
  `topAt`/`botAt` at the same x as the endpoint. Only anatomically open cells may stop short.
- Venation follows `docs/wing-venation-spec.md` and the references in `docs/ref/`. Every winged
  order is on `growVeins` (lanes that fork, named crossveins and site rungs placed by the angle
  rule, ladder / mesh regimes; see the spec's Growth section), with `wingGraph` underneath for
  nodes, margins, the stigma and emission. New wing code goes the same way: lanes for the order's
  trunks, `named` entries for its anatomical crossveins, `wingStats` exposed and asserted by
  `tests/check.js`: no straight full-span veins, no 90° junctions, closed cells where the
  reference has them, nothing dangling. Before calling a wing done, put a 4× zoom next to its
  reference image and compare.

## Verify before claiming done

```
node tests/check.js 3000                 # invariants + determinism + wing uniqueness
npm test                                 # e-ink survival gate: per-layer survival at device size 440
npm run check:daily                      # daily plate script: files, sidecar, 1-bit 440 raster
node tests/pages.js                      # the three pages in headless Chromium: chrome, panes, hash, redirect
node tests/snapshot.js write|check f.json 3000 [--engine old.html]   # byte-identity fixture for engine refactors (write on the old engine, check on the new)
node tests/sheet.js /tmp/wasp.png 3 wasp:6    # contact sheet via headless Chromium; LOOK at it
```

For a part in isolation use `node tests/sheet.js out.png 4 random:12 --part wings --type wasp`
or open `parts.html` over HTTP and Reroll. `generatePart` relies on the `partStart()`/`partEnd()`
brackets around each section call in `drawPlate` (`meta.partBox` by section name); keep those
brackets if you move or add a section, and force a type with `generateInsectDetailed(seed, { type })`
(the type pick is still drawn from the stream, so forcing never shifts the other rolls).

Always render a sheet for every body plan you touched and compare against the previous
render. Numbers passing is not the same as the plates looking varied and anatomically sane.
`node tests/sheet.js out.png 3 1,2,3,4,5,6` takes explicit seeds; `type:count` takes the first
N seeds of a type (variants `butterfly`/`moth` work too).

## Conventions

- Keep the engine free of DOM access. Three pages: `index.html` (one pane, hash `#seed`; a
  two-seed hash `#a|b` redirects to the compare page), `compare.html` (two panes built by a
  `makePane` factory, hash `#a|b`) and `parts.html` (a grid of one part). Each page's UI script
  is the only DOM code on that page; the main page's and the compare page's pane code are two
  copies on purpose, so `index.html` stays one self-contained file and the compare page can
  diverge as an experimenting tool. Add pane controls inside the pane markup, not as static
  HTML. The engine stays inline in `index.html`; `compare.html` and `parts.html` fetch it from
  there (so they need HTTP), as do the tests through `tests/engine.js`. `node tests/pages.js`
  asserts the pages' DOM in headless Chromium.
- Local wing coordinates: x along the span, y across it (negative toward the costa), transformed
  by `wing.T`. Build outlines as point lists through `makeWing`.
- Comment venation by its anatomical name (Sc, R1, Rs, M, Cu, A, discal cell, nodus ...) so the
  code can be checked against the research notes.
- Never commit on the user's behalf; propose a commit message when a change is verified.

## Agent skills

### Issue tracker

GitHub Issues on `Adroz/insectdraw`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical labels, unchanged (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root (created lazily). See `docs/agents/domain.md`.
