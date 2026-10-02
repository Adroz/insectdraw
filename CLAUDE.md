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
- Terminal veins must end on the outline: use `marginTargets`, `tipPoint`, or evaluate
  `topAt`/`botAt` at the same x as the endpoint. Only anatomically open cells may stop short.
- Venation follows `docs/wing-venation-spec.md` and the references in `docs/ref/`. New wing
  code goes on the `wingGraph` helper (nodes, chains, edges, stubs, ladders, stigma): no
  straight full-span veins, no 90° junctions, closed cells where the reference has them.
  Before calling a wing done, put a 4× zoom next to its reference image and compare.

## Verify before claiming done

```
node tests/check.js 3000                 # invariants + determinism + wing uniqueness
node tests/sheet.js /tmp/wasp.png 3 wasp:6    # contact sheet via headless Chromium; LOOK at it
```

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
