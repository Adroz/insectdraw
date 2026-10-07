# insectdraw — agent notes

Procedural Victorian-style insect plates. Read `README.md` first; this file is the working
contract for changes.

## Shape of the project

- Everything lives in `index.html`: CSS, a small UI block, the engine inside `<script id="engine">`
  (pure generation, no DOM) and a short UI script at the end. No build step, no dependencies.
- `tests/check.js` and `tests/sheet.js` extract the engine script with a regex on
  `<script id="engine">` and run it under `node vm`, so keep that tag and the
  `module.exports` block at the bottom of the engine intact.
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

## Randomness rules

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
  onto `B.sig`. The wing family is rolled in the proportions switch as `P.fam` so body and wings
  share it; wing blocks read it, they do not roll it. Leg poses are validated against the body
  in the legs block (`legsOk`: ordering, mirror line, abdomen outline, pair clearance, fit) and
  re-rolled; `tests/check.js` asserts the result on `meta.legs[i].pts`, so a new pose or family
  range must keep those invariants rather than relax the test. The left legs are the right legs rotated per pair by `B.legs[i].skew` about the coxa
  (`L.legPairs` in the assembly); any new check on the right legs should also run on the rotated
  set, as `tests/check.js` does. Antennae follow the same shape:
  `rollAntGenes` (tables `ANT_FAMS`, `ANT_POSES`) rolls the genes, `antennaGeom` builds the
  geometry without rng, and the antennae block (after the legs) validates the pose: no point of
  the right antenna reaches the mirror line (the left is its mirror image, so that is the
  no-crossing rule), the plate scale stays above 0.6, raised forelegs are kept clear; re-roll,
  then a known-good pose. `tests/check.js` asserts it on `meta.antennae.pts`. Curvature is signed
  outward-positive; keep inward curvature tiny or the long kinds will cross.
- Legs and wings attach through `thorax.yAt(t)` / `thorax.hwAt(y)`, so the thorax profile
  (`B.thorax.anchors` → `P.thoraxAnchors`) must keep `bodyPart`'s interface and stay wide where
  they land. The wing blocks' root positions are mirrored in the `WING_ROOTS` table in
  `generateInsectDetailed` (the tegula sits on the first entry; `tests/check.js` asserts width
  there): change a wing block's root `t` and update the table in the same commit.
- The head is drawn from `B.head` (order table `HD` in `rollBodyGenes`, rules in
  `docs/research-head-eyes.md`). `P.headW` / `P.headH` / `headTop` / `headCy` stay the bounding box
  and centre of the head; the drawn capsule is `meta.headOutline` (closed polyline, body coords) and
  `meta.head` carries the eyes, ocelli and rostrum that `tests/check.js` asserts (eyes inside the
  bbox with ≤ 10 % overhang, ocelli inside the outline). Eye lattice pitch is floored at
  `1.8 / HEAD_SCALE_P5[type]` so facets never fill in on e-ink; update that table if an order's
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
node tests/sheet.js /tmp/wasp.png 3 wasp:6    # contact sheet via headless Chromium; LOOK at it
```

For a part in isolation use `node tests/sheet.js out.png 4 random:12 --part wings --type wasp`
or open `parts.html` over HTTP and Reroll. `generatePart` relies on `partStart()`/`partEnd()`
bracketing each drawing section in `generateInsectDetailed`; keep those brackets if you move
sections, and force a type with `generateInsectDetailed(seed, { type })` (the type pick is
still drawn from the stream, so forcing never shifts the other rolls).

Always render a sheet for every body plan you touched and compare against the previous
render. Numbers passing is not the same as the plates looking varied and anatomically sane.
`node tests/sheet.js out.png 3 1,2,3,4,5,6` takes explicit seeds; `type:count` takes the first
N seeds of a type (variants `butterfly`/`moth` work too).

## Conventions

- Keep the engine free of DOM access; the UI script at the bottom is the only place that
  touches `document`, `location` or `history`. It builds the panes with a `makePane` factory
  (pane A always shown, pane B behind Compare); add controls there, not as static HTML, so
  both panes get them. The hash format is `#a` or `#a|b`.
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
