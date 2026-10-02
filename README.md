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

### Comparing one part across many seeds

`parts.html` draws a grid of a single body part (wings, legs, antennae, head,
abdomen or body) for random seeds, optionally forcing every seed to one body
plan, so you can judge how varied, say, wasp wings are. **Reroll** (or the
space bar) regenerates the grid, click pins a cell so it survives rerolls,
shift-click opens that seed as a full plate, **Back** restores the previous
grid. Serve the directory over HTTP (`python3 -m http.server`); the page
loads the engine from `index.html`. The underlying call is
`generatePart(seed, type, part, size)`, which returns the right-hand part
cropped to its own bounding box; `generateInsectDetailed(seed, { type })`
forces the body plan without disturbing the rest of the seed's randomness,
so a forced wasp is the same drawing the seed would produce if it had rolled
a wasp anyway.

## Venation

Wings are drawn from real vein layouts rather than generic radiating lines,
following the rules in `docs/wing-venation-spec.md`, which were derived from
the reference plates and photographs in `docs/ref/`. Every winged order is
**grown** by one engine (`growVeins`, after Hoffmann et al. 2018): the order's
Comstock–Needham trunks are smooth lanes built once, branches fork off them,
the named crossveins of the order (basal vein, nodal line, discocellular,
gradates, antenodals ...) and the secondaries grown from inhibitory sites
along each strip are all clipped to their two lanes and slid until they meet
them at 105–140°, so no junction is square and nothing dangles; the strips
are ladders of quadrilaterals where narrow and Voronoi meshes where wide,
cells shrinking toward the tip and trailing edge. Closed cells sit where the
reference has them and open membrane where it does not. Pterostigmata are lenses on the costa (solid, cross-hatched, axis-
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


- **Dragonfly** — smooth primaries (Sc to the nodus, R1 under the costa to the
  apex, R2 one cell below it, then R3 / MA / MP / CuA / CuP / A1 bowing with the
  outline to the apex and hind margin, undulating with the cell rows) handed to
  the same growth engine as the bees: aligned antenodals, subnodus, pterostigma
  end crossveins, arculus, discoidal triangle and bridge are named crossveins;
  every strip between two primaries is a ladder of quadrilaterals whose rungs
  meet them at 105–140° where it is narrower than 1.6 cells, and rows of
  pentagons / hexagons from a Voronoi of Poisson-spaced sites where it is wider
  (hindwing anal field, the cubital region, the tip), cells shrinking toward the
  tip and trailing edge, no free ends; libellulid-small to aeshnid-large by the
  `cells` gene; after
  [Hoffmann et al. 2018, PNAS](https://www.pnas.org/doi/10.1073/pnas.1721248115).
- **Butterfly / moth** — Comstock–Needham layout grown as lanes: closed discal
  cell whose discocellular is three crossveins placed by the angle rule (a soft
  chevron pointing at the base, M1 and M2 leaving its bends), Sc+R1 along the
  costa, R2 from the cell's upper corner and R3–R5 stalked on a common stem,
  M3 and Cu1 off the lower corner, Cu2 off the lower edge, 2A to the tornus and
  a short 3A; no other crossveins; hindwing with a hooked humeral vein.
- **Fly** — grown like the bee and wasp wings: smooth lanes for Sc and R1 (to
  the costa), Rs forking off R1 and again into R2+3 (costa) and R4+5 (apex), M,
  CuA1, CuA2 bending back onto A1 to close cup, A1 (+ A2), with the named
  crossveins h, r-m, bm-cu and dm-cu placed at 105–140° so br, bm, cup and dm
  close and nothing dangles; the apex past dm-cu is open membrane. The family
  decides how M1 ends: bent forward to the margin behind the apex or onto R4+5
  so r4+5 closes (muscid, syrphid), forked into M1 / M2 (+ M3) (nematoceran),
  or three branches to the margin with R4 forking off R4+5 (tabanid, asilid).
  Small stigma where Sc ends, syrphid vena spuria, alula and halteres.
- **Bee / wasp** — grown rather than templated: smooth longitudinal lanes
  (Sc+R into the stigma, R1 closing the marginal cell, Rs forking off Sc+R, an
  M+Cu stem forking at the basal vein, A) carry the family's named crossveins
  (basal vein, r-m submarginals or the ichneumonid areolet, recurrents, cu-a)
  plus crossveins grown from inhibitory sites along each strip, every one
  clipped to its two lanes and slid until it meets them at 105–140°, so no
  junction is square and nothing dangles; the apex past the last cell is open
  membrane with M and Cu fading into it. Apids three submarginals and a heavy
  basal vein, vespids a long narrow first discoidal, ichneumonids a big stigma
  and a tiny areolet, sawflies dense with closed anal cells, chalcids bare;
  hindwing grown the same way, with hamuli.
- **Crane fly** — the same growth with the Limonia plan: narrow stalked wing, Sc
  and R1 running far out under the costa, a late Rs fork, forked M with M3, cup
  open (CuA2, A1 and A2 each to the hind margin), denser inhibitory sites so a
  few extra cells appear.
- **Grasshopper** — the tegmen as its own wing frame: Sc, R, M and Cu as
  near-parallel lanes (Cu forking near the base, R near the tip, an optional
  light intercalated vein), the archedictyon grown as one row of leaning rungs
  where a strip is narrow and rows of near-rectangular polygons where it is
  wider, finer toward the apex; the folded hindwing fan as radiating lanes with
  ladder rungs.
- **Lacewing** — Sc, R1 and Rs as smooth offsets under the costa (Rs rooted on
  R1 near the base), a costal ladder of 20–35 placed crossveins, the intramedian
  cell closed by two rungs at the root of Rs, 8–14 pectinate branches forking
  off Rs toward the hind margin with twigged ends, 1–3 gradate series stepping
  through the branches as zigzag staircases, sparse grown rungs in between, M
  and Cu short to the hind margin.
- **Cicada** — Sc+R, M, CuA, CuP as bowed lanes (M and CuA on a short common
  stem) to a nodal line that is one chain of crossveins at a single slant, the
  apical veins leaving the nodal nodes through short stems and ending on the
  ambient vein (a lane along the inset outline), the optional ulnar row across
  them, peripheral membrane left blank, anal veins to the clavus.
- **Damselfly** — the dragonfly model on petiolate (stalked) wings: the fan
  leaves the end of the petiole from two fused stems, a quadrilateral below the
  arculus, and ladders nearly everywhere with a two-row mesh only at the tip.
- **Mayfly** — triangular forewing with Sc and R1 under the costa and 7–13
  longitudinals radiating from the root (each bent by a fading share of the
  costa's bow), intercalaries starting free in mid-wing, every strip a one-row
  ladder of leaning rungs with cells shrinking toward the tip and trailing edge
  and the costal ladder densest; small sparse hindwing, often lost; three tail
  filaments.

## Body

The insect under the wings rolls a set of **body genes** per seed too
(`rollBodyGenes`, right after the proportions). The family is shared with the
wings where the order has one (an ichneumonid gets long slender legs and a long
sheathed ovipositor with its ichneumonid wing; a chalcid short legs with swollen
hind femora; an apid hairy legs and a corbicula), and beetles and grasshoppers
roll body families of their own (ground / rove / scarab / longhorn / weevil;
acridid / tettigoniid / tetrigid). **Legs**: a pose family rolled once per
insect (spread, walking, tucked, raised mantid-like forelegs, the odonate prey
basket), per-pair attachment and coxa inset, joint-angle ranges per pair and
pose, femur : tibia : tarsus ratios, overall length and thickness, femur
swelling and tibial flare, tarsomere count, tarsus curl, and armature rolled
as presence and density separately (spine rows, apical spurs, hair fringes,
pads, claw length). A pose is checked against the body before it is drawn:
femur tips ordered along the axis, nothing on the mirror line, no leg inside
the abdomen outline, no two legs touching, and the legs alone never push the
plate scale under 0.62; a bad pose is re-rolled. **Abdomen**: the order's
profile with the widest point slid along the axis, a tip shape (pointed,
rounded, truncate, clubbed), petiole width and length, width factor,
segmentation (count, start, bow, weight, doubled lines), a markings family
(plain, banded, spotted, striped, tip-dark, hairy) and terminalia by family
(ovipositor length, curvature and sheath; cerci; mayfly filaments two or
three; odonate appendages). **Thorax** (`docs/research-thorax.md`): the
profile re-rolled from the order's anchors (pronotum width against the head,
widest point, mesonotal hump, propodeal waist, length; beetle pronotum shape
cordate / transverse / quadrate / rounded, grasshopper posterior margin), the
order's dorsal lines (fly transverse suture complete or interrupted, hymenopteran
collar, notauli and parapsidal lines, odonate mid-dorsal carina and oblique
humeral sutures, grasshopper sulci and carinae, crane-fly V suture, cicada
paramedian sutures), a scutellum (triangle, lunule, bilobed, cruciform; hatched
or not), a surface family (contour hatching along the sides, beetle punctation,
hoverfly vittae, pile ticks, humeral calli, bristle rows, patagia, crest) and a
tegula of rolled size and tilt centred on the forewing root the wing block uses. **Head**: an outline per order (round, transverse
with the odonate frons bump or the cicada postclypeus, triangular with a
fastigium, elongate with ground-beetle jaws or a weevil rostrum), eyes rolled
as ranges with holoptic or dichoptic flies, meeting or separated odonate eyes
and three engraving styles (hexagonal lattice, stipple, plain with a
highlight), ocelli 0–3 by order, and the mouthparts that show from above
(sickle mandibles, mandible tips, palps, a coiled proboscis, clypeus bow),
from `docs/research-head-eyes.md`. The discrete part is exposed as
`meta.bodySig`, held to the same 10% / 50% rule as `wingSig` by
`tests/check.js`, which also asserts the leg invariants above on
`meta.legs[i].pts` and the eye / ocelli containment on `meta.head`. Antenna genes are still the plan in `docs/plan-body-variation.md`.

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
node tests/check.js 3000                     # runs the engine over N seeds: NaN/fit/leg-pose/determinism/wing+body-uniqueness checks
node tests/sheet.js out.png 3 wasp:6         # contact sheet PNG via headless Chromium (first 6 wasp seeds, 3 columns)
node tests/sheet.js out.png 3 1,2,3,4,5,6    # ... or explicit seeds; set CHROMIUM=/path/to/chrome if it is not found
node tests/sheet.js out.png 4 random:12 --part wings --type wasp   # one part only, 12 random seeds all forced to wasps
python3 -m http.server 8765                  # or open tests/sheet.html?seeds=1,2,3,4,5,6&cols=3 in a browser
```

See `CLAUDE.md` for the working rules (e-ink constraints, PRNG discipline,
what to verify before a change counts as done).
