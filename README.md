# insectdraw

Procedurally generated insect plates in the style of Victorian natural-history
specimen illustrations. Same spirit as [fishdraw](https://github.com/LingDong-/fishdraw),
but for insects.

- Single self-contained `index.html` — no dependencies, no build step.
- Seeded PRNG (mulberry32): the same seed always draws the same insect.
- Dorsal view, bilaterally symmetric: the right half is generated and mirrored.
- Line art only: black strokes on white, no fills (other than white masking),
  no gradients/opacity/filters, minimum stroke 0.5px — suitable for e-ink.
- Twelve body plans: beetle, moth (with a butterfly variant), fly, crane fly,
  bee, wasp, dragonfly, damselfly, grasshopper, lacewing, cicada, mayfly.

## Use

Open `index.html` in a browser. Enter a seed and **Generate**, hit **Random**,
or **Daily** (seed = FNV-1a hash of today's `YYYY-MM-DD`, so the plate is
the same all day and changes tomorrow). The seed is also mirrored into the
URL hash, so `index.html#1234` is a shareable link.

For a daily e-ink display, `generateInsect(dailySeed())` returns the SVG
string; the `<svg>` has a `600×600` viewBox and scales cleanly.

## Venation

Wings are drawn from real vein layouts rather than generic radiating lines.
Longitudinal veins use a shared "sweep" model (fused in the basal stalk,
running parallel to the costa, then swinging to meet the margin at a set
angle), vein weight follows anatomy (heavy costa, strong radial veins, light
cubital/anal veins and crossveins), and most wings carry a marginal fringe.


- **Dragonfly** — primary longitudinals (Sc to the nodus, R1 under the costa to
  the tip, then R2–R4 / MA / MP / CuA / CuP fanning to the margin), aligned
  antenodal and postnodal crossveins, a hatched pterostigma, and secondary
  venation generated as a Voronoi tessellation of each inter-vein strip from
  Poisson-spaced sites — the mechanism proposed by
  [Hoffmann et al. 2018, PNAS](https://www.pnas.org/doi/10.1073/pnas.1721248115)
  (inhibitory centres between primary veins).
- **Butterfly / moth** — Comstock–Needham layout: closed discal cell, Sc+R1
  along the costa, R2–R5 fanning from the cell's upper corner, M1–M3 off the
  discocellular, Cu1/Cu2 off the lower edge, 1A to the inner margin.
- **Fly** — Muscid pattern: Sc, R1, R2+3 to the costa, R4+5 to the apex, M1+2
  with its forward bend, CuA1 and A1, with r-m / dm-cu / bm-cu crossveins and
  an alula lobe at the base.
- **Bee** — costal vein to a hatched stigma, marginal cell, three submarginal
  cells, discoidal cells; hindwing with hamuli.
- **Crane fly** — the Nematoceran plan: forked M, discal cell, narrow stalked wings.
- **Grasshopper** — tegmina with longitudinals and Voronoi reticulation.
- **Lacewing** — Sc and R1 hugging the costa with a ladder of costal crossveins,
  8–11 Rs branches with twigged (forked) ends, two gradate crossvein series.
- **Cicada** — heavy costa, basal cells closed by a nodal line, apical cells to
  the margin, ambient vein inside the tip.
- **Damselfly** — the dragonfly model on petiolate (stalked) wings.
- **Mayfly** — triangular forewing with 10–14 fanning longitudinals and dense
  crossveins, vestigial hindwing, three tail filaments.

## Dev

```
node tests/check.js 3000    # runs the engine over N seeds: NaN/fit/leg-attachment/determinism checks
python3 -m http.server 8765 # then open tests/sheet.html?seeds=1,2,3,4,5,6&cols=3 for a contact sheet
```
