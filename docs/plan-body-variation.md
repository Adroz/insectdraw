# Plan: per-seed variation for legs, body, head, eyes and antennae

Status: steps 1–3 and 5 implemented, 2026-10-02 (plumbing, legs, abdomen, head); steps 4, 6, 7
(thorax, antennae, mirror skew) still open. Follows the wing-genes work (see README "Venation" and
`meta.wingSig`).

### Status detail

- **Step 1, done.** `rollBodyGenes(type, P)` runs right after the proportions switch and returns
  `B` (`legs[pair]`, `abd`, `thorax`, `head`, `ant`, `sig`); every drawing block reads from it.
  `meta.bodySig` joins `B.sig`; `tests/check.js` prints the table and applies the 10% / 50% rule.
  The wing-family pick is hoisted into the proportions switch as `P.fam` (the wing blocks read it);
  beetles roll `ground / rove / scarab / longhorn / weevil`, grasshoppers `acridid / tettigoniid /
  tetrigid`. `meta.recipe` is now `P.fam` for every order.
- **Step 2, done.** Leg family ranges (`LEG_FAMS` in `rollBodyGenes`), pose families (`LEG_POSES`
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
- **Step 5, done.** Head genes in `rollBodyGenes` (`B.head`, order table `HD` with family overrides `FO`),
  grounded in `docs/research-head-eyes.md`: outline enum (`round` / `transverse` / `triangular` /
  `elongate`) built by `headOutlinePts` from a warped unit circle with a flattened front margin,
  genal swelling, a front bump (odonate frons, cicada postclypeus rounded or pointed with striae,
  crane fly snout) and an occipital notch; the W/H ratio roll rewrites `P.headH`, so `headTop`,
  `headCy`, `P.headW`, `P.headH` keep meaning bounding box and centre. Eyes as ranges (centre,
  radii, tilt, dent mirrored per side, highlight) with fly holoptic / dichoptic, gomphid-style
  separated odonate eyes and the male mayfly turban pair; eye style `lattice` / `stipple` / `plain`
  with a pitch gene floored at `1.8 / p5 plate scale` per order (`HEAD_SCALE_P5`). Ocelli 0–3 with
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
- **Known, outside this plan:** the cicada wing span (`abdomen length / sin(theta) × 1.0–1.12`
  in the wing block) pushes ~0.4% of cicadas below plate scale 0.55 on the baseline engine as
  well; which seeds hit it moves with the rng stream, so `check.js 3000` can show one to three.

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
   `papilionid` …). Hoist that pick to the proportions switch so body and wings share it: an
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
