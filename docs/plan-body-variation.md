# Plan: per-seed variation for legs, body, head, eyes and antennae

Status: two plans in one file. The first, the per-seed genes for legs, body, head, eyes and antennae, has all seven
steps implemented (steps 1–6 on 2026-10-02, step 7 mirror skew on 2026-10-07); it follows the wing-genes work (see
README "Venation" and `meta.wingSig`). The second, "Nine plates, nine insects (#30)" at the end, is open: the
perceptual criterion (`tests/perceptual.js`) and nine steps, one ticket per order (#48–#55, and #72 for the
grasshopper, added by #57); step 2 (cicada, #49) is done.

### Status detail

- **Step 1, done.** `rollBodyGenes(type, P)` runs right after the proportions roll (`ORDERS[type].proportions`) and returns
  `B` (`legs[pair]`, `abd`, `thorax`, `head`, `ant`, `sig`); every drawing block reads from it.
  `meta.bodySig` joins `B.sig`; `tests/check.js` prints the table and applies the 10% / 50% rule.
  The wing-family pick is hoisted into the entry's `proportions` roll as `P.fam` (the wing blocks read it);
  beetles roll `ground / rove / scarab / longhorn / weevil`, grasshoppers `acridid / tettigoniid /
  tetrigid`. `meta.recipe` is now `P.fam` for every order.
- **Step 2, done.** Leg family ranges (`legs` in each `ORDERS` entry, since #4), pose families (`LEG_POSES`
  in the legs block: `spread`, `walking`, `tucked`, `raised`, odonate `basket`), per-pair
  attachment and inset, segment ratios, thickness / swelling / flare, armature, tarsomeres, curl.
  Joint angles are rolled in the legs block and validated against the body (ordering, mirror
  line, abdomen outline, pair clearance, fit) with re-roll → spread → old fixed angles as
  fallbacks; `meta.legRoll` records what happened. Tibia directions are absolute ranges (`tib`)
  rather than folds, otherwise a steep femur swings the tibia across the body. Invariants are
  asserted in `tests/check.js` on `meta.legs[i].pts` and `meta.abdomen.profile`.
  Deviation from the text above: "saltatorial hind femur 1.8–2.4× tibia" is anatomically off
  (a grasshopper hind tibia is about as long as its femur); implemented as hind femur
  1.6–2.1× the mid femur with tibia 0.9–1.05× femur. The per-pair mirror skew (step 7) is not
  done.
- **Step 3, done.** Abdomen profile from the order's anchors with the widest point slid, a tip
  shape enum, petiole width / length, width factor; segmentation (count, start, bow, weight,
  doubled lines); markings families; terminalia (ovipositor by family, cerci, valves, mayfly
  filaments 2–3, odonate appendages); keel and side ticks. Lateral bulge and overlapping
  tergite arcs were not added.
- **Step 4, done** (ranges in `docs/research-thorax.md`, "Rules derived"). Profile from the order's
  anchors with the pronotum front rolled against the head width, widest point, hump (a dipped
  shoulder before the peak), propodeal waist on bee / wasp, length 0.85–1.2; beetles roll a pronotum
  shape (cordate / transverse / quadrate / rounded, biased by body family), grasshoppers a posterior
  margin (truncate / angulate / rounded). Sutures are per order rather than `subSeg` thirds: fly
  postpronotal edge + transverse suture (complete 40% / interrupted) + scutoscutellar; hymenopteran
  collar, scutoscutellar, metanotal, notauli, parapsidal lines, median; odonate collar, mid-dorsal
  carina, oblique humeral suture (single / double, hatched antehumeral stripe); grasshopper carina
  (D or O crest), 2–3 sulci with the principal at 0.5–0.7, lateral carinae; cicada collar,
  paramedian sutures, cruciform elevation; crane-fly V suture; lacewing / mayfly ground plan.
  Scutellum shape triangle / lunule / bilobed / cruciform with width 0.12–0.65, hatched shadow,
  axillae; surface: contour hatching 2–4 nested lines per side (any order without pile), beetle
  punctation (fine / coarse) with bead and basal foveae, fly vittae 2 / 4 with humeral calli and
  bristle rows, pile ticks (moth always, bee 60%) with interior ticks, moth patagia and crest.
  Tegula rx 3–7, ry / rx 0.5–0.8, tilt 20–40°, centred on the wing block's forewing root
  (`wingRoots` in the order's `ORDERS` entry, which the wing block reads too, since #4), moth
  tegulae with hair ticks. Deviations from the text above: "notopleural lines (flies)" became the
  humeral calli + bristle rows the references actually show in dorsal view; the plan's "pronotum
  width 0.8–1.3× head" is per order (beetle 1.0–1.5, odonata 0.4–0.7, see the research table).
  `tests/check.js` adds: thorax width > 4 at every wing root, scutellum inside the body outline,
  bodySig ≥ 98% distinct.
- **Step 5, done.** Head genes in `rollBodyGenes` (`B.head`, the entry's `head` ranges with family overrides `headFams`),
  grounded in `docs/research-head-eyes.md`: outline enum (`round` / `transverse` / `triangular` /
  `elongate`) built by `headOutlinePts` from a warped unit circle with a flattened front margin,
  genal swelling, a front bump (odonate frons, cicada postclypeus rounded or pointed with striae,
  crane fly snout) and an occipital notch; the W/H ratio roll rewrites `P.headH`, so `headTop`,
  `headCy`, `P.headW`, `P.headH` keep meaning bounding box and centre. Eyes as ranges (centre,
  radii, tilt, dent mirrored per side, highlight) with fly holoptic / dichoptic, gomphid-style
  separated odonate eyes and the male mayfly turban pair; eye style `lattice` / `stipple` / `plain`
  with a pitch gene floored at `1.8 / p5 plate scale` per order (`headScaleP5` in `ORDERS`). Ocelli 0–3 with
  arrangements (triangle / line / odonate frons+seam / grasshopper laterals / moth behind the eyes /
  rove median). Mouthparts by what shows from above: ground-beetle sickle mandibles (crossing,
  serrated) with labrum and palps, hymenopteran mandible tips, weevil rostrum, lepidopteran palps
  and proboscis coil, clypeus bow, asilid dish and mystax. Markings: frontal stripe, hatched
  vertex, rim hair. Beetle, grasshopper and cicada heads are inserted under the thorax path so
  the pronotum covers the back of the head. `meta.head` (outline, eyes, ocelli, rostrum) and
  `meta.headOutline` are exposed; `tests/check.js` asserts eyes inside the head bbox (≤ 10 %
  overhang), ocelli inside the outline and `bodySig` ≥ 98 % distinct per type.
  Deviations from the text above: grasshopper mandibles are not drawn (hypognathous, hidden from
  above; palps and the fastigium furrow instead); the fly proboscis is not drawn (hidden under the
  head); the antennal socket table `AB` is untouched (step 6 can snap it to `meta.headOutline`).
- **Step 6, done.** Research first (`research-antennae.md`, six references in `ref/ant-*`), then
  `rollAntGenes` in `rollBodyGenes`: per-order / per-family weighted kind lists (`ant` in `ORDERS`:
  filiform, moniliform, serrate, pectinate, bipectinate, plumose, clubbed with gradual / abrupt /
  hooked / upcurved clubs, lamellate, geniculate with an optional club, aristate with plumose /
  bare / pubescent arista, stylate with annuli or a style, setaceous), length in head widths, body
  lengths or forewing lengths by kind, segment counts, scape fraction and elbow, rami count /
  length / peak / sweep, lamella count and spread, arista and style lengths, socket position and
  radius. The pose (base angle, outward curvature, tip droop) is rolled from one of five families
  (`ANT_POSES`: v, wide, costal, face, arc, swept) and validated in the antennae block, which now
  runs after the legs: no point of the right antenna at x < max(0.5, 0.6 × shaft width) (the left is
  the mirror image, so that is the no-crossing rule), the antenna alone must not push the plate
  scale under 0.6, and wherever the legs reach ahead of the thorax, in any pose, the antenna keeps
  clear of them (#7; beside the body it lies over them); re-roll up to 24 times, then a known-good
  forward pose. `meta.antennae` exposes the geometry and `tests/check.js` asserts it; the discrete
  genes are on `B.sig`. Over 300 seeds per type the fallback fires on under 1% of moths and
  damselflies and nowhere else (`docs/research-antennae.md` R-D).
  Deviations from the text above: lengths are per kind and reference (0.1 hw for a cicada bristle,
  1.6 body lengths for a longhorn), not "0.4–2.5× head width"; inward curvature is limited to −5°
  on the costal pose because anything larger crosses the midline on a long antenna; droop is 0–15°
  and only on the forward poses. The legacy `antenna` / `antLen` fields in each entry's `proportions` roll
  are no longer read but were left in place so the rng stream of the family pick does not move.
- **Known, outside this plan (fixed by #26):** the cicada wing span (`abdomen length / sin(theta) × 1.0–1.12`
  in the wing block) pushed ~0.4% of cicadas below plate scale 0.55; since #26 the span is
  anatomical (1.46–1.72 root-to-abdomen-tip lengths, independent of the sweep) and the cicada's
  median plate scale is about 1.04.

## Goal

Cycling Random should never show two plates of the same order with the same body. Today the
wings differ but the insect under them is the same drawing with 3–15% jitter: the legs sit at
the same three attachment points with the same angles, the abdomen and thorax are one profile
per order, the head is one ellipse with one eye table, and the antenna type is fixed per
order. The target is the same discipline as the wings: a per-seed **body genes** object with
family-biased ranges, a discrete `meta.bodySig`, and a uniqueness check in `tests/check.js`.

Success criteria:

- Nine plates of one order on a contact sheet read as nine species, not one species redrawn.
- `node tests/check.js 3000` passes with `bodySig` under the same 10% / 50% rule as `wingSig`.
- No leg crosses the abdomen or the opposite leg; coxae still start under the thorax edge
  (existing invariants) and every plate still fits the 600×600 plate at scale ≥ 0.55.
- Everything stays line art under the e-ink constraints in `CLAUDE.md`.

## What is fixed today (from `index.html`)

| part | fixed per order | per-seed today |
|---|---|---|
| legs | three `specs` (attachment `t`, four joint `dirs`, four `lens`), thickness table, tarsomere count, spine/spur rules | ±6° on all joints together, ±8% on lengths |
| abdomen | profile `abdAnchors`, `abdW`/`abdLen`, segment start `startT`, hatch rules, bee stripes, side ticks | 3% anchor wobble, 12–15% size jitter, `abdSeg` 4–8, wasp ovipositor 60% |
| thorax | `thoraxAnchors`, `thoraxW`/`thoraxLen`, suture pattern per order, scutellum | `subSeg` 1–3, 3% wobble, size jitter |
| head | ellipse `headW`×`headH`, eye table `E` (centre, radii, dent, highlight), ocelli positions, mandibles / clypeus | 12–15% size jitter |
| antennae | kind per order (moth picks from 2–4), socket table `AB`, `antLen` | 15–20% length jitter, one bend sign |

## Architecture

1. **`rollBodyGenes(type, fam)`** runs once, right after the body plan and proportions are
   chosen and before layout. It returns `B` with sub-objects `B.legs[pair]`, `B.abd`,
   `B.thorax`, `B.head`, `B.ant`. Every drawing block reads from `B` instead of literals.
2. **Family coherence.** The wing block already picks a family (`apid`, `ichneumonid`,
   `papilionid` …). Hoist that pick to the proportions roll so body and wings share it: an
   ichneumonid gets the long antennae, petiolate abdomen and long ovipositor that go with its
   wing; a sawfly gets the broad sessile abdomen; a sphingid gets the fusiform body. Orders
   without wing families get body families of their own (beetle: ground / rove / scarab /
   longhorn / weevil; grasshopper: short-horned / long-horned / pygmy).
3. **Ranges, not values.** Each family gives `[min, max]` per gene; the order's table gives
   the defaults. A gene is a number, a boolean, or a small enum (pose family, tip shape).
4. **`meta.bodySig`** joins the enums, counts and quantised continuous genes (same
   convention as `wingSig`). `tests/check.js` applies the 10% / 50% rule and prints the
   table.
5. **PRNG order.** `rollBodyGenes` draws from `rng` before the layout, so every seed's legs,
   body and wings change together once this lands. That is expected; the body plan (first
   draw) and names (own PRNG) do not move. Document it in the commit message.

## Legs

Genes per pair (front, mid, hind), with per-pair ranges so the three never collide:

- **attachment** `t` along the thorax: front 0.12–0.32, mid 0.42–0.62, hind 0.72–0.92; plus a
  coxa inset 3–8 px from the thorax edge (today fixed at 5).
- **pose family** (enum, rolled once for the insect): `spread` (as now), `walking` (front
  forward, mid out, hind back, alternating bend), `tucked` (all legs close to the body,
  tibiae folded under the femora: pinned-specimen look), `raised` (front pair lifted toward
  the head, mantid-like; dragonfly/damselfly basket is a special case of this).
- **joint angles**: each of the four `dirs` gets its own range per pair and pose, e.g. hind
  femur 20–45°, hind tibia 70–110°, tarsus 90–130°. Front and hind may not overlap mid:
  enforce ordering `front < mid < hind` at the femur tip after rolling, re-roll otherwise.
- **segment proportions**: femur : tibia : tarsus ratios per family (saltatorial hind
  femur 1.8–2.4× tibia; cursorial 1.0–1.2; raptorial fore femur thick and short), tibia
  bend direction and amount, tarsomere count where the order allows (beetle 4–5, bee 5,
  fly 5, grasshopper 3–4), tarsus curl 4–20°.
- **thickness**: `wk` per pair (hind legs stouter), femur swelling 1.0–1.7 (bee/beetle
  swollen hind femora), tibia flare at the apex.
- **armature**: spine density and length, which edge, spur count 0–2, hair fringe (bee hind
  tibia, fly bristles), tarsal pads, claw length. Roll presence and density separately.
- **asymmetry**: keep bilateral symmetry (the plate style depends on it), but allow a
  2–6° per-pair skew so left and right do not read as a mirror-stamp when the eye compares
  them. Needs the mirror step to accept a per-pair transform.

Invariants to add to `tests/check.js`: no leg polyline intersects the abdomen outline below
the thorax; tarsus tips stay inside the plate; pair ordering holds.

## Abdomen

- **profile**: anchors rolled from ranges: widest-point position 0.25–0.65, width 0.7–1.3×
  the order default, tip shape enum (`pointed`, `rounded`, `truncate`, `clubbed`, `petiolate`
  with a 0.08–0.2 waist), lateral bulge 0–0.08, dorsal keel line 0/1.
- **segmentation**: count (already), first-segment start 0.05–0.35, segment line bow 0.08–0.3,
  line weight D or F, intersegmental double lines 0/1, overlapping tergite arcs 0/1.
- **markings family** (enum, family-biased): `plain`, `banded` (bee stripes generalised:
  n bands, band width, hatch density), `spotted` (one spot per segment, size, position),
  `striped` (longitudinal dark lines), `tip-dark` (last 1–3 segments hatched), `hairy`
  (tick fringe density 2–5 px, length).
- **terminalia**: cerci (count 0/2/3, length 0.1–0.9× abdomen), ovipositor/sting (length,
  curvature, sheath lines), claspers (dragonfly appendages: length and spread), mayfly
  filaments (2–3, length, splay).
- **texture**: side-tick density, pleural fold line 0/1, pilosity ticks.

## Thorax

- **profile**: pronotum width 0.8–1.3× head, humped mesonotum 0–0.15, waist before the
  abdomen 0–0.12 (petiole), overall length 0.85–1.2× default.
- **sutures**: `subSeg` 1–3 kept; positions rolled instead of equal thirds; suture bow and
  weight; median line 0/1; parapsidal lines 0/1 (hymenoptera); notopleural lines (flies).
- **scutellum**: size 0.15–0.4 of width, shape enum (`triangle`, `lunule`, `bilobed`), hatched 0/1.
- **surface**: pile ticks (moth/bee: density and length), punctation dots (beetle), stripes
  (hoverfly-style 2–4 longitudinal bands), humeral calli.
- **tegulae**: size 3–7 px, shape ratio, present per order (as now) but drawn over the wing
  root at the rolled root position.

## Head

- **shape**: width/height 0.8–1.6, outline enum (`round`, `transverse` (dragonfly/fly),
  `triangular` (grasshopper, mantid-like), `elongate` (weevil/snout)), vertex flat 0/1,
  genal swelling 0–0.15.
- **eyes**: per order the table stays, but each entry becomes a range: centre x ±0.08,
  radii ×0.7–1.4, tilt −25–25°, dent depth 0–0.35, highlight position; eye style enum
  (`lattice` as now, `stipple`, `plain-with-highlight`) with lattice spacing 1.8–3 px.
- **ocelli**: count 0–3, arrangement (`triangle`, `line`), radius 0.8–1.6 px, position range.
- **mouthparts**: mandibles (length 0.1–0.4 head, curvature, serration 0/1), proboscis
  (fly: length and bulb; lepidoptera: coiled spiral 0/1), rostrum (cicada: length under the
  head), palps 0/1 (length, segments), clypeus line bow.
- **markings**: frontal stripe, hatched vertex, hair ticks on the face.

## Antennae

- **kind**: per order a weighted list instead of one value (beetle: filiform / moniliform /
  serrate / lamellate / clubbed / geniculate; fly: aristate / stylate / plumose; moth:
  bipectinate / pectinate / filiform / clubbed-hooked (butterflies); bee/wasp: geniculate /
  filiform; grasshopper: filiform short / long-horned).
- **geometry**: length 0.4–2.5× head width by kind, segment count (6–40 by kind), base
  angle −30–30° from the order default, shaft curvature −40–40°, tip droop 0–30°, scape
  length (geniculate), club size and shape (gradual / abrupt / hooked), pectination length
  and density, arista bristle length.
- **socket**: position range around the table value, socket radius 1–2.5 px.

## Sequencing

1. `rollBodyGenes` + `bodySig` + test, wired to the existing literals with ranges equal to
   today's values (no visual change, proves the plumbing). Hoist wing families.
2. Legs (biggest visual win): pose family, attachment and angle ranges, pair-ordering
   invariant, abdomen-intersection test.
3. Abdomen profile, tip shapes, markings families, terminalia.
4. Thorax profile and sutures, scutellum, surface.
5. Head shape, eye ranges and styles, ocelli, mouthparts.
6. Antennae kinds and geometry.
7. Per-pair mirror skew (needs the mirror step to accept transforms; last because it touches
   the assembly code).

Each step: contact sheet of 9 seeds for every affected order before and after, `check.js`
3000, then README/CLAUDE updates. Steps 2–6 are independent after step 1 and can run as
separate agents in worktrees if wanted; step 7 waits for all of them.

## Risks

- **Fit.** Wider leg splay and longer antennae push the bbox; the plate scale may drop below
  0.55 on long-legged orders (crane fly, grasshopper). Clamp splay by the free width that the
  fit would leave, or let the scale floor fail the test and tune ranges down.
- **Leg/body intersection.** Pose families that fold the tibia under the femur must still
  keep tarsi out of the abdomen outline. Draw order hides some of it (legs under the body)
  but the test should catch tarsi crossing the abdomen edge.
- **E-ink.** More ticks and hatching on small parts can drop below the 1.8 px spacing floor at
  low plate scales. Scale densities by `meta.scale` once known, or keep densities
  conservative on small orders.
- **Rendering cost.** Lattice eyes and dense pile are the expensive parts; keep the element
  count near today's average (~1800) by trading density for presence.

- **Step 7, done (2026-10-07).** Each leg pair rolls a skew of 2–6° either way (`B.legs[i].skew`, in
  `bodySig`). After the right-side legs pass `legsOk`, the same set rotated about each pair's coxa by
  its skew is validated again (midline, abdomen, crossings, fit); the angles are halved up to twice
  and zeroed if the rotated set still fails (full strength survives on ~85% of seeds, zeroed on ~3%).
  The legs layer is assembled as the right legs plus, per pair, `scale(-1,1) rotate(skew cx cy)` about
  the coxa, so the left legs are no longer a stamp of the right. The rotated joints are added to the
  plate bbox. `meta.legSkew` and `meta.legs[i].skew` / `pivot` expose it; `tests/check.js` re-runs the
  mirror-line, abdomen and crossing checks on the rotated set. Wings, antennae and body stay exactly
  mirrored: the plate style depends on that symmetry and the venation mirror is load-bearing.

# Nine plates, nine insects (#30)

Status: plan, 2026-10-13, measured on main at 4a9ad53. Steps 1–8 below are filed as one implementation ticket
per order, #48–#55 (numbers in the step headings). Nothing here changes the engine.

The seven steps above made every body choice a gene and `bodySig` passes its 10% / 50% rule on every type, yet the
2026-10-07 audit read nine plates of most orders as one to four distinct insects (GLOSSARY "Distinct insects"; the
audit wrote "species"): moth 2/9, butterfly 1/9, lacewing 2/9, mayfly 3/9, cicada 2–3/9, dragonfly 3–4/9, crane fly
2–3/9 (one pose on all nine), fly 3–4/9 (the wing outline dominates), beetles one insect redrawn within each family.
Bee and wasp were the only orders reading as 5–7 distinct insects. A signature counts discrete genes; two plates can
differ in every one of them and still look alike, because most genes move small things (a suture, an eye style, a 4°
skew) while the silhouette (wing set, abdomen shape, leg pose, overall proportions) stays the order's one drawing.

## Perceptual criterion

Proposed in #30 (PR #56, an unattended run, 2026-10-13), pending Nik's sign-off: judge uniqueness perceptually
instead of replacing the `bodySig` rule, which stays as it is. **The smallest difference between any two plates of a
type, rendered as 100 px thumbnails, must reach the type's floor.** Implemented as a report, `tests/perceptual.js`;
it is not wired into `tests/check.js` and fails nothing.

**Measure.** Plate k of type T is `generateInsectDetailed(k, { type: T })`, k = 1..60. Each plate goes through the
panel pipeline (`tests/raster.js` `grey`) at 100 px with the caption band cropped off (the name must not count), is
blurred with a gaussian of sigma 3 px, and every pair is compared by its ink difference
`Σ|inkA − inkB| / Σ(inkA + inkB)` in %, ink = 255 − grey. The report prints, per type and for the moth's two
variants, the minimum over all pairs and its seeds (the criterion), the 5th percentile and median of all pairs, and
`sheet9`, the median over 300 fixed 9-plate subsets of each subset's closest pair (what one `random:9` sheet shows).
`--view body` redraws the plate's own layers minus wings, elytra and tegulae at the plate's transform, to tell a
repeated body from a repeated wing set; `--from` takes another seed block; `--pairs k` lists the k closest pairs.

**Why this measure.** Sixty combinations were tried on main (view plate / body × raw grey difference, ink-normalised
difference, correlation, chamfer distance between line pixels × blur sigma 0–5 × min / p5 / sheet9), scoring the
margin between the lower of bee and wasp and the highest of the orders the audit named:

- the raw mean grey difference ranks plates by how much ink they carry, upside down: butterfly 3.61, lacewing 3.38,
  moth 3.04 at the top, bee 2.32 and wasp 2.40 in the middle;
- unblurred, every metric over-counts a thin line drifting by a pixel (crane fly legs, fly wing margins): the
  chamfer distance puts the crane fly (0.83) level with the wasp (0.84), correlation puts crane fly (44.0) and beetle
  (41.6) above the bee (40.8);
- normalising by the ink and blurring at sigma 3 was the best of the sixty: every named order under the bee except
  the crane fly, and it is the version kept.

The closest pairs it finds were checked by eye and are the right ones: cicada 13,41, dragonfly 26,32, fly 7,12,
crane fly 4,48, lacewing 38,44, mayfly 37,49 are each one insect drawn twice; beetle 15,18 is one ground beetle
with a different antenna; the bee's closest pair (26,53, two vespid-form bees) differs in legs and abdomen.

**Calibration on main** (N = 60; `min` is the criterion; the 61–120 and 121–180 columns are the same measure on the
next seed blocks, to show its noise; `body` is `--view body` on seeds 1–60):

| type | min 1–60 | closest | min 61–120 | min 121–180 | body | sheet9 | audit 2026-10-07 |
|---|---|---|---|---|---|---|---|
| wasp | 12.32 | 3,47 | 12.11 | 11.11 | 11.47 | 17.19 | 5–7 / 9 |
| bee | 10.31 | 26,53 | 9.58 | 9.95 | 9.98 | 13.98 | 5–7 / 9 |
| crane fly | 11.28 | 4,48 | 9.92 | 11.01 | 12.99 | 15.56 | 2–3 / 9, one pose |
| fly | 10.59 | 7,12 | 9.68 | 7.11 | 9.54 | 14.12 | 3–4 / 9, wings dominate |
| moth (both) | 9.17 | 10,38 | 11.27 | 9.15 | 9.20 | 15.33 | — |
| moth variant | 9.17 | 10,38 | 10.16 | — | 9.90 | 14.35 | 2 / 9 |
| butterfly | 8.75 | 47,72 | 7.56 | — | 8.72 | 14.92 | 1 / 9 |
| beetle | 8.93 | 15,18 | 11.99 | 12.30 | 10.25 | 15.07 | one insect per family |
| grasshopper | 8.24 | 9,17 | 9.54 | 7.51 | 8.06 | 12.11 | not named |
| lacewing | 7.77 | 38,44 | 7.25 | 4.73 | 7.50 | 11.95 | 2 / 9 |
| mayfly | 7.47 | 37,49 | 5.78 | 7.35 | 7.43 | 11.49 | 3 / 9 |
| dragonfly | 6.27 | 26,32 | 6.67 | 6.69 | 5.36 | 9.82 | 3–4 / 9 |
| cicada | 6.20 | 13,41 | 6.09 | 5.71 | 6.69 | 9.01 | 2–3 / 9 |
| damselfly | 5.28 | 33,54 | 4.87 | 6.13 | 4.24 | 8.71 | not named |

**Floor.** 10.0 for every type, 12.5 for the crane fly and the fly. Bee (10.31) and wasp (12.32) pass on the
canonical block; every order the audit named fails. The crane fly and the fly need the higher floor because their
plates are mostly single strokes (legs, wing margin): the measure scores their closest pairs at 11.3 and 10.6 although
those pairs are visibly the same insect, so they are held to the wasp's level. Damselfly and grasshopper, which
the audit did not name, fall under 10.0 too: the damselfly is the lowest type of all and joins the dragonfly in step 1;
the grasshopper was left to its open tickets (#22, #23); #57 re-measured it after them, found it still under, and
added step 9 (#72).

**Limits, stated so nobody over-reads the number.**

- The minimum is an extreme value: it moves by about ±1 between seed blocks (bee 10.31 / 9.58 / 9.95) and falls as
  N grows (at N = 180 the bee's is 7.70), so runs are compared only at N = 60, seeds 1–60, and a ticket passes on that
  block. The floor separates the tiers, it does not rank neighbours within ±1.
- It sees ink, not anatomy: a wing set swung by 10° moves it as much as a new abdomen family. That is the point (the
  eye sees the same), but a ticket cannot buy its way past the floor with jitter that is not anatomy; every change
  still answers to the references, the sheet and `tests/check.js`.
- It is not a gate. Wiring it into `tests/check.js` waits until the nine steps below have landed and the floor has
  been re-tuned on the result.

**How a ticket uses it.** Before: `node tests/perceptual.js 60 --type <type> --pairs 3` on main, and
`--view body`; after: the same on the branch. Both runs go in the PR with the before / after sheets
(`node tests/sheet.js out.png 3 random:9 --type <type>`) and the three closest pairs rendered side by side.
Because the floor was fitted on seeds 1–60 and the minimum moves by about ±1 between blocks, a ticket also reports
the second block, `--from 61`, before and after: the minimum there must rise as well and land within 1 of the floor,
and `sheet9` must rise on both blocks. A change that clears the floor on 1–60 alone is fitted to that block.

## Plan

Ordered by how far each order sits under its floor. Each step is one ticket and independent of the others. Shared
rules for all of them:

- New families are rolled in the order's `proportions` as `P.fam` (dragonfly, damselfly, cicada, lacewing and mayfly
  have none today; the crane fly's is the constant `tipulid`). A new `rng()` there moves every later roll of that
  type's seeds; say so in the commit. Family weights go in the entry, the per-family ranges in the gene tables
  (`abd`, `thorax`, `head`, `legs`, `ant` overrides), never as `type ===` / `fam ===` literals inside a section.
- Every new discrete choice goes on `B.sig`; the 10% / 50% `bodySig` rule and every `tests/check.js` invariant stay
  as they are (legs off the abdomen and wings (#8), antenna clearance (#6, #7), plate scale ≥ 0.55, e-ink floors).
- A wing *set* (the angle the wings are spread at) is a body-plan gene the wing block reads, rolled with the body;
  the venation inside the wing does not change in these steps.
- New anatomy is grounded first: a short note in the matching `docs/research-*.md` (or a new one) with references in
  `docs/ref/`, the way steps 4–6 were.

1. **Odonata: family habitus and wing set, #48** (dragonfly 6.27, damselfly 5.28). The sheets show one drawing: wings
   straight out at one angle, the abdomen a uniform rod, the legs one basket. Families: dragonfly aeshnid (long
   slender abdomen, eyes meeting broadly), libellulid (short, broad, flattened abdomen 1.8–2.5× the current width,
   tapering from S3), gomphid (eyes apart, which `apart` already rolls; clubbed S7–S9), corduliid (waisted at S3, a
   slight club); damselfly coenagrionid (thin rod), lestid (wings held half open, swept back 20–35°), calopterygid
   (broad, unstalked wings, longer abdomen), platycnemidid (broad, flattened mid and hind tibiae). Genes: abdomen
   width profile per family (rod / broad / club / waisted), wing set (forewing sweep −10…+15°, hindwing a further
   0–12°, both on the root, nothing in the venation), bolder dorsal abdomen pattern families (paired spots, rings,
   dark tip) as hatch bands, leg pose basket / tucked under the thorax. Grounded in `research-thorax.md` (Odonata),
   `research-head-eyes.md` (gomphid eyes); the abdomen families need a note.

   **Done (2026-10-14), floor not reached.** Implemented as specified (`docs/research-odonata-habitus.md`, refs
   `docs/ref/odo-hab-*`): `P.fam` for both suborders, the abdomen width profiles (`ABD_PROFILES`), rings and a 2-4
   segment dark tip, the wing set (`B.wingSet`, the entry's `wingSet`), the tucked leg pose and the platycnemidid
   tibiae; `odoHabitus` in `tests/check.js` asserts them. Measured with `tests/perceptual.js`, N = 60, before (backlog
   at e8b95af) → after:

   | type | min 1–60 | min 61–120 | sheet9 1–60 | sheet9 61–120 | median 1–60 | body min 1–60 | body sheet9 1–60 |
   |---|---|---|---|---|---|---|---|
   | dragonfly | 6.05 → 6.07 | 7.54 → 6.92 | 9.02 → 12.40 | 9.96 → 11.41 | 21.52 → 30.86 | 4.54 → 7.22 | 9.38 → 10.21 |
   | damselfly | 5.41 → 5.21 | 7.71 → 7.42 | 9.36 → 11.00 | 10.14 → 11.01 | 21.86 → 28.44 | 4.61 → 4.02 | 7.00 → 6.95 |

   `sheet9` and the median rise on both blocks and a seeds 1–9 sheet reads as about 6–7 insects (was 3) for the
   dragonfly and 5–6 (was 2–3) for the damselfly, but the minimum stays where it was. Why: the thumbnail's ink is
   mostly wing (outline and mesh), so the closest pair is always two plates whose wings are set at nearly the same
   angles, whatever their abdomens (dragonfly 4,51: a waisted corduliid and a broad libellulid, 6.07). The wing set has
   little room: a dragonfly's broad wings on close roots need about 40° between them to meet only at the roots (#18,
   `ODO_ROOT`), and its hindwing cannot sweep past `ODO_HIND_MAX` (22°) without its anal lobe narrowing or reaching over
   the abdomen, so most forewing sweeps resolve to the same drawn pair. Raising the minimum needs a lever on the wings
   themselves, outside this step: wing outline families per family (the aeshnid's narrow hindwing base against the
   libellulid's broad one), pigment bands or basal patches as hatch (*Calopteryx*, *Libellula*), and the zygopteran
   resting pose with the wings closed over the abdomen.
2. **Cicada: wing set, body breadth, mesonotum pattern, #49** (6.20). Same tented spread and the same stout body on all
   nine. Genes: wing set from spread to half-open to roofed over the abdomen (in dorsal view the tegmina cover the
   abdomen and meet along the midline, the hindwings hidden: the resting pose of most cicada plates); forewing
   breadth and apex (narrow and pointed / broad and round); family habitus: cicadine (broad, tymbal covers showing at
   the abdomen base), cicadettine (slender, small, narrow head), platypleurine (pronotal collar flared into lateral
   flanges wider than the head); mesonotum markings (the paired obconical spots and the M mark, as hatched shapes);
   abdomen width / taper families. Grounded in `research-thorax.md` (Hemiptera) and `research-head-eyes.md`
   (cicada); #26 fixes the forelegs and composition first or alongside.
   **Done (#49, 2026-10-14)**, grounded in `research-cicada-habitus.md`: family `P.fam` (cicadine with tymbal covers,
   small slender cicadettine, platypleurine with the flared collar), abdomen taper (barrel / cone / spindle), wing set
   spread / half-open / roofed (`B.wing`, the roofed tegmina laid over the abdomen and meeting on the midline, the
   hindwing hidden), forewing narrow-pointed / broad-round, hatched mesonotum marks (obconical spots, M, both, none).
   `node tests/perceptual.js 60 --type cicada`: seeds 1-60 min 5.95 on main (6.99 on backlog after #26) -> 10.09,
   sheet9 8.82 -> 15.15; seeds 61-120 min 5.76 (7.12) -> 10.55, sheet9 8.36 -> 16.55; `--view body` 6.74 -> 11.86
   and 5.21 -> 10.78.
3. **Mayfly: family habitus, hindwing size, tails, #50** (7.47). One triangular wing set, one body, two or three tails of
   one length. Families: ephemerid (large, three tails, dark dorsal triangles on the tergites), baetid (small, two
   tails, a tiny or absent hindwing), heptageniid (flattened, broad head, two tails), caenid (no hindwing, broad
   forewings, three tails). Genes: hindwing size class (large / small / absent), tail count 2 / 3 and length
   0.8–2.5× the abdomen (the largest silhouette lever on this order), tail splay, male foreleg length and pose
   (held forward along the antennae), abdomen width profile and tergite pattern families. #20 (the reference image
   is a stonefly) and #21 are wing / attachment fixes that should land first or with it.
4. **Lacewing: Neuroptera families, #51** (7.77). Four spread wings, long filiform antennae, slender abdomen on every
   plate. Families with their own habitus: chrysopid (as now), hemerobiid (smaller, moniliform antennae, broader
   wings), myrmeleontid (antlion: abdomen 1.3–1.6× the wing length reaching past the wings, short clubbed antennae),
   ascalaphid (owlfly: antennae as long as the body with an abrupt club, large eyes), mantispid (raptorial forelegs
   on a long prothorax, the `raised` pose with a folded tibia), osmylid (stippled wing spots). Genes: family, abdomen
   length relative to the wing, pronotum length (0.1–0.6 of the thorax), antenna kind per family (the `clubbed` kind
   exists), foreleg family. Wing-outline changes (nemopterid ribbons) are out of scope. #19 corrects the forelegs.
   **Done (#51, 2026-10-14).** The six families, with a wing set gene (spread / forward / swept) and the antlion's
   abdomen at 1.3–1.6 forewings (the reference measures ~1.25); rules and references in
   `docs/research-neuroptera-families.md`, checks `neuFamily`, `neuAntenna`, `neuAbdomen`, `neuPronotum`,
   `neuRaptorial`, `neuEyes`, `neuSpots`, `neuFamilies`. `tests/perceptual.js 60 --type lacewing`, before (backlog
   f1abafd, after #19) → after: seeds 1–60 min 8.30 (13,24) → 10.39 (37,57), sheet9 11.77 → 16.89; seeds 61–120
   7.18 → 9.45, sheet9 11.99 → 17.36; `--view body` 8.18 → 11.18 and 10.27 → 10.44.
5. **Lepidoptera: abdomen families, leg pose and wing set, #52** (moth 9.17, butterfly 8.75). The audit: same abdomen,
   same hairy thorax, same raised-foreleg V, same hind-leg stubs. Genes by `P.fam`: sphingid (long fusiform abdomen
   tapering to a point, lateral spot row), saturniid (short, stout, hairy), geometrid (slender, long), arctiid
   (dorsal spot row, banded), noctuid (medium, dorsal crests); papilionid (long slender), lycaenid (small, short),
   nymphalid (forelegs reduced to brushes: four walking legs showing). Leg pose families beyond the raised V (spread,
   walking, hidden under the wings). Wing set: the forewing's hind margin square to the body (the setting-board
   pose, as now), swept back into a delta (sphingid, noctuid at rest) or pushed forward, with the hindwing overlap
   following. Grounded in `research-lepidoptera-wings.md` and `research-thorax.md` (Lepidoptera); #13 and #27 cover
   the pattern bands and the head.
6. **Beetle: within-family genes, #53** (8.93). Families differ already; inside one family it is the same beetle. Genes:
   elytral outline (parallel, oval, rounded, tapering apex; square or rounded shoulders), elytral sculpture families
   (striae, puncture rows, costae, smooth, tubercles; #24 does the texture rendering) and pattern families (spots,
   bands, stripes as hatch shapes), pronotum : elytra width ratio, pronotal armature (scarab cephalic and pronotal
   horns, longhorn lateral spines), mandible size (stag-beetle mandibles in the scarab group or a lucanid family),
   foretibia type (fossorial toothed / slender), plus the round families the sheet never shows (coccinellid,
   chrysomelid) as new entries in the `P.fam` pick. Grounded in `research-thorax.md` (Coleoptera) and
   `research-head-eyes.md`; #25 and #47 cover the head, antennae and longhorn forelegs.
7. **Fly: wing set and abdomen families, #54** (10.59 under 12.5; body view 9.54). The wing outline covers the body on
   every plate. Genes: wing set (spread / half-folded / folded over the abdomen, scissor-wise, the resting pose that
   shows the abdomen's sides and is how most fly plates are drawn), abdomen family by `P.fam` (syrphid flat oval with
   bands, tachinid round with bristle rows, asilid long and tapering, tabanid broad and flat, bombyliid round and
   hairy, conopid petiolate), abdominal macrochaetae, leg pose and length per family (asilid long raptorial legs).
   #9 and #10 cover the wing outline and venation.
8. **Crane fly: pose families and Tipulomorpha families, #55** (11.28 under 12.5). One leg pose on every plate, and the
   wings always spread. Genes: leg pose families for very long legs (spread as now; trailing, hind pairs swept back
   past the abdomen tip; forward, front pair reaching ahead past the antennae; and a pose with the mid legs out and
   the others back, the usual pinned-specimen look), per-pair length ratios (front or hind longest), wing set
   (spread / folded over the abdomen, the limoniid resting pose), families: tipulid (as now), limoniid (smaller,
   shorter legs, wings folded), ctenophorine (pectinate antennae, banded wasp-like abdomen), pediciid (patterned
   wings, which the wing block may only stipple). Acceptance adds a pose count: at least three leg-pose families
   each on ≥ 15% of 300 seeds.

9. **Grasshopper: tegmen length, tetrigid pronotum, ovipositor and wing set, #72** (9.44 after #22 and #23). Appended
   after steps 1–8 rather than ranked among them (their numbers are already in their tickets). Added by #57, which
   re-measured the grasshopper on `backlog` at bdd7f7c, after #22 (tegmen, hindwing fan, pronotum saddle) and #23
   (hind femur, antennae) merged. `node tests/perceptual.js 60 --type grasshopper`, main at 4a9ad53 →
   backlog:

   | block | min | closest pair (backlog) | sheet9 (backlog) | body min |
   |---|---|---|---|---|
   | seeds 1–60 | 8.24 → 9.44 | 25,35 (main 9,17) | 12.58 (main 12.11) | 8.06 → 12.68 |
   | seeds 61–120 | 9.54 → 8.95 | 108,120 | 12.26 | 10.77 (backlog) |
   | seeds 121–180 | 7.51 → 7.54 | 142,165 | 12.53 | — |

   Still under 10.0 on every block, but the body view now clears it on both: what repeats is the wing cover. The
   tegmina are always 1.05–1.18× the abdomen, so every plate carries the same long folded rod of archedictyon over
   the abdomen, and it is most of the thumbnail's ink; every closest pair (25,35 acridids, 3,17 tettigoniids, 108,120
   and 142,165 tetrigids drawn as acridids) is two plates of one family with tegmina of one length. Genes, by `P.fam`:
   tegmen length class (macropterous as now; brachypterous, tegmina 0.25–0.6 of the abdomen with the tergites showing
   behind; micropterous lateral pads, as on *Pholidoptera* and *Ephippiger*), the hindwing fan only when macropterous;
   the tetrigid pronotum prolonged back over the abdomen to its tip, tapering to a point, with the tegmina reduced to
   scales (the groundhopper's defining character); the tettigoniid ovipositor as a sabre 0.5–1.0× the abdomen; a wing
   set, folded (as now) or the setting-board pose with the hindwing fan opened (band-winged Oedipodinae); a resting
   hind-leg pose with the femur along the body. Grounded in `research-thorax.md` (Orthoptera); the wing-length classes
   and the tetrigid pronotum need a note. Blocked by #8 for the hind-leg pose.

Not in this plan: bee and wasp (above the floor; #12 is a separate habitus fix).
