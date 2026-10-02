# insectdraw

Procedurally generated insect plates in the style of Victorian natural-history
specimen illustrations. Same spirit as [fishdraw](https://github.com/LingDong-/fishdraw),
but for insects.

**Live:** https://adroz.github.io/insectdraw/ — `#<seed>` in the URL picks a plate; no hash shows today's.

- Single self-contained `index.html` — no dependencies, no build step.
- Seeded PRNG (mulberry32): the same seed always draws the same insect.
- Dorsal view, bilaterally symmetric: the right half is generated and mirrored.
- Line art only: black strokes on white, no fills (other than white masking),
  no gradients/opacity/filters, minimum stroke 0.5px — suitable for e-ink.
- Twelve body plans: beetle, moth (with a butterfly variant), fly, crane fly,
  bee, wasp, dragonfly, damselfly, grasshopper, lacewing, cicada, mayfly.
- Deterministic names: each seed also gets a Latin-style binomial (genus and
  gender-agreed epithet built from order-appropriate Greek/Latin roots) and an
  English common name, drawn
  from a separate PRNG stream so the drawing is unaffected. They are rendered
  as a Victorian plate caption below the insect and exposed as `meta.name`
  / `insectName(seed, type, variant)`.

## Use

Open `index.html` in a browser. Enter a seed and **Generate**, hit **Random**,
or **Daily** (seed = FNV-1a hash of today's `YYYY-MM-DD`, so the plate is
the same all day and changes tomorrow). **Back** steps through the seeds you
have viewed in this session (up to 100), so a plate that flashed past on
Random can be recovered. **Compare** opens a second, independent pane with
its own seed, controls and Back history, for cycling one side against the
other. The seeds are mirrored into the URL hash, so `index.html#1234` is a
shareable link and `index.html#1234|5678` opens both panes; editing the hash
by hand renders those seeds too.

For a daily e-ink display, `generateInsect(dailySeed())` returns the SVG
string; the `<svg>` has a `600×600` viewBox and scales cleanly.

## Venation

Wings are drawn from real vein layouts rather than generic radiating lines,
following the rules in `docs/wing-venation-spec.md`, which were derived from
the reference plates and photographs in `docs/ref/`. Most orders build their
venation on a small **wing graph**: named nodes in outline-relative
coordinates, longitudinal veins as chains of nodes emitted as one undulating
curve, crossveins as tilted bowed edges between chains, closed cells in the
basal two-thirds of the wing, and stubs fading into open membrane at the apex.
Nothing runs straight across the wing and junctions are Y-shaped, not right
angles. Pterostigmata are lenses on the costa (solid, cross-hatched, axis-
shaded or stippled), tapering into Sc+R and R1. Vein weight follows anatomy
(heavy costa, basal stems, light crossveins and apical stubs), and most wings
carry a marginal fringe.

Every winged body plan rolls a set of **wing genes** per seed before drawing.
First a **family** with its own topology (hymenoptera: apid, vespid,
ichneumonid, sawfly, chalcid; diptera: muscid, nematoceran, syrphid, tabanid,
asilid, tipulid; lepidoptera: nymphalid, satyrine, pierid, lycaenid,
papilionid, noctuid, geometrid, arctiid, saturniid, sphingid), then
**posture** (wing angle, fore/hind spread, span), the **outline** (apex
position and pointedness, breadth, trailing-edge fullness, hindwing size,
stalks, tails, scallops), the count and curvature of the longitudinal veins,
the **cell plan** (submarginal / discoidal / recurrent / apical cells,
areolet, basal vein, discal-cell corners, forked or stalked branches),
crossvein spacing, **line weight** (heavy basal longitudinals or not) and
optional landmarks (hatched or dark pterostigma, nodal and gradate series,
triangle, intercalaries, ambient vein). The family only sets the ranges, so
two plates of the same order never share a wing. The discrete part of this
choice is exposed as `meta.wingSig`, and `tests/check.js` fails if any one
signature covers more than a tenth of a body plan's plates. Every
margin-terminating vein ends on an outline sample.


- **Dragonfly** — primary longitudinals (Sc to the nodus, R1 under the costa to
  the tip, then R2–R4 / MA / MP / CuA / CuP fanning to the margin, undulating
  with the cell rows), aligned antenodal and postnodal crossveins, arculus,
  discoidal triangle, bridge vein, a pterostigma between C and R1 with
  thickened end crossveins, and secondary venation generated as a Voronoi
  tessellation of a row lattice in each inter-vein strip (one row = a ladder of
  quadrilaterals, several rows = hexagonal mesh), after
  [Hoffmann et al. 2018, PNAS](https://www.pnas.org/doi/10.1073/pnas.1721248115).
- **Butterfly / moth** — Comstock–Needham layout: closed discal cell, Sc+R1
  along the costa, R2–R5 fanning from the cell's upper corner, M1–M3 off the
  discocellular, Cu1/Cu2 off the lower edge, 1A to the inner margin.
- **Fly** — Sc, R1, R2+3 to the costa, R4+5 to the apex, M1 bent forward
  (muscid), forked (nematoceran) or straight (asilid), tabanid R4 fork, the
  closed cells br / bm / dm / cup, a small stigma where Sc ends, syrphid vena
  spuria.
- **Bee / wasp** — family cell plans (apid, vespid, ichneumonid, sawfly,
  chalcid): Sc+R into the stigma, R1 closing the marginal cell, Rs through
  the submarginal corners, basal vein, M and Cu stubs into the open apex,
  recurrent veins, areolet, cu-a and anal cells; hindwing with hamuli.
- **Crane fly** — the Nematoceran plan: forked M, discal cell, narrow stalked wings.
- **Grasshopper** — tegmina with longitudinals and Voronoi reticulation.
- **Lacewing** — Sc and R1 hugging the costa with a ladder of costal crossveins,
  the intramedian cell at the root of Rs, 8–14 curved pectinate Rs branches
  with twigged ends, 1–3 zigzag gradate series.
- **Cicada** — Sc+R, M, CuA, CuP heavy and parallel to the nodal line, apical
  veins forking as trees to the ambient vein, peripheral membrane left blank,
  anal veins to the clavus.
- **Damselfly** — the dragonfly model on petiolate (stalked) wings.
- **Mayfly** — triangular forewing with 10–14 fanning longitudinals and dense
  crossveins, vestigial hindwing, three tail filaments.

## Legs, eyes, antennae

Drawn from the morphology notes in `docs/research-legs-eyes-antennae.md`:
six-segment legs (coxa, trochanter, femur, tibia, 3–5 tarsomeres, pretarsus
with paired claws and an arolium — paired pulvilli on flies), apical tibial
spurs, spine rows on the correct edge (saltatorial grasshopper tibia, odonate
prey basket, cicada fore femora), a chevron muscle pattern on the grasshopper
femur, a corbicula and flat basitarsus on the bee hind leg, and engraver's
hatching on the far side of each femur and tibia. Compound eyes are a
hexagonal ommatidia lattice clipped to an order-specific outline (holoptic
fly, dorsally meeting dragonfly, dumbbell damselfly, kidney bee, notched
beetle) with a white highlight. Antennae follow the order: filiform,
moniliform, serrate, lamellate, clubbed/hooked, bipectinate/pectinate,
geniculate (scape, pedicel, flagellum), aristate and setaceous, each rising
from a drawn antennal socket.

## Dev

```
node tests/check.js 3000                     # runs the engine over N seeds: NaN/fit/leg-attachment/determinism/wing-uniqueness checks
node tests/sheet.js out.png 3 wasp:6         # contact sheet PNG via headless Chromium (first 6 wasp seeds, 3 columns)
node tests/sheet.js out.png 3 1,2,3,4,5,6    # ... or explicit seeds; set CHROMIUM=/path/to/chrome if it is not found
python3 -m http.server 8765                  # or open tests/sheet.html?seeds=1,2,3,4,5,6&cols=3 in a browser
```

See `CLAUDE.md` for the working rules (e-ink constraints, PRNG discipline,
what to verify before a change counts as done).
