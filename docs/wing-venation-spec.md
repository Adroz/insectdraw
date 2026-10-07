# Wing venation: what the references show and how we generate it

Status: implemented 2026-10-02 for every winged order (Hymenoptera, Odonata, Cicadidae, Diptera, Neuroptera, Ephemeroptera, Lepidoptera, Orthoptera), all eight grown by `growVeins` v2 since the same day, and audited at 4x against the references; see Status below. Supersedes `research-hymenoptera-wings.md`. Reference images
are in `ref/` with sources and licences in `ref/README.md`. `research-lepidoptera-wings.md`
still covers lepidopteran *patterns* (tone, hatching); this document covers veins and cells
for every order.

## Why the current wings read as fake

Compared against the references, the generated wings fail in the same five ways in every
order:

1. **Straight rods.** Longitudinal veins are one polyline from base to margin. Real veins are
   chains of gently curved segments that change direction at every cell corner; nothing runs
   straight for more than one cell.
2. **Right angles.** Crossveins are dropped vertically between two veins. Real crossveins meet
   longitudinals at 100–130°, and three veins meeting at a corner share the angles roughly
   evenly, so cells are rounded trapezoids and hexagons, never rectangles.
3. **No closed cells.** Crossveins are sprinkled; they do not enclose anything. In the
   references the basal two-thirds of a hymenopteran or dipteran wing is a mosaic of closed
   cells, and the apical third is open membrane with vein stubs fading into it.
4. **Pterostigma as a box.** It is a lens / teardrop bounded by the costa above and a curve
   below, tapering into Sc+R at its base and R1 at its tip, deepest a third of the way along.
5. **Flat line weight.** Costa and basal stems are 2–3× the weight of crossveins; veins taper
   toward the margin.

## Universal rules (all orders)

- **R1. Veins are splines through nodes.** A longitudinal vein is a chain of nodes; between
  consecutive nodes the vein bows by 2–8% of the segment length, alternating side so the vein
  undulates. Emit each chain as one smooth curve so bends at nodes are soft.
- **R2. Junctions are Y-shaped.** Where a crossvein meets a longitudinal, the angle on each
  side is 100–140°, never 90°. Roll the crossvein's far endpoint along the other vein by
  ±10–25% of the cell length to tilt it.
- **R3. Cells are closed polygons.** Define the wing as a planar graph: nodes with ids, edges
  between them. The family picks the graph (which cells exist); the seed rolls node positions
  within ranges and bow amounts. Draw the graph, not individual veins.
- **R4. Open apex.** Beyond the last closed cell the membrane is open. Longitudinals continue
  as stubs that lose weight (D → F) and stop short (hymenoptera, diptera `cup`), or reach the
  margin (lepidoptera, odonata, mayfly, cicada reaches the ambient vein instead).
- **R5. Pterostigma is organic.** Top edge = the costa between `xa` and `xb`; bottom edge = a
  smooth curve from the costa at `xa`, dipping to `depth` at 30–45% of the way along, back to
  the costa at `xb`. Pointed at both ends (hymenoptera), or a rounded-ended parallelogram
  between C and R1 with a thickened crossvein at each end (odonata). Fill: solid black, or
  shaded (dense cross-hatch, axis-parallel lines, stipple). Veins meet it exactly at its ends.
- **R6. Crossvein regimes by strip width.** Narrow strip (width < ~1.2× cell size): a
  *ladder* of parallel rungs, each tilted 5–20°, spacing roughly equal to strip width.
  Wide area: *reticulation* (Poisson sites + Voronoi, cell size ∝ local strip width; rows
  along the strip near the longitudinals). Neuroptera add *gradate series*: zigzag staircases
  through the branches.
- **R7. Weight hierarchy.** C: `SW.H`; basal stems (Sc+R, R+M, M+Cu, Cu) `SW.O`; branches
  `SW.D`; crossveins and apical stubs `SW.F`. A heavy-vein gene may promote one level, capped
  at `SW.O` for anything but the costa.
- **R8. Endpoints on the outline.** Any vein that reaches the margin ends on an outline
  sample (`tipPoint`, `nearestOutlinePoint`). Stubs may stop short only where the reference
  shows an open cell.

## Per-order observations and rules

### Hymenoptera (ref: hym-ross, hym-colletes, hym-apis, hym-bombus, hym-ichneumonidae-diagram, hym-ichneumon, hym-vespula)

Observed:

- Costa heavy from base to the pterostigma; beyond the stigma the edge is **R1**, lighter,
  which bends inward near the apex to close the **marginal cell** (open in some wasps).
- **Sc+R** runs under the costa and enters the stigma's base. **Rs** leaves Sc+R well before
  the stigma (bee: at the basal vein; ichneumonid: at 1r under the stigma).
- The apical half has three longitudinals under R1: Rs (bounds marginal/submarginal cells),
  M (bounds submarginal/discoidal), Cu (bounds discoidal/cubital), joined by r-m and m-cu
  crossveins. Apid: three submarginals, two discoidals, two cubitals; vespid: one long narrow
  first discoidal; ichneumonid: tiny **areolet** under the stigma, long marginal cell; sawfly:
  three of everything plus closed anal cells; chalcid: no cells, a thick submarginal vein into
  a small stigma with a hooked stigmal vein.
- **M+Cu** leave the base as one stem that splits at the **basal vein** (bee: strong, almost
  vertical). The large basal "R" cell is the wedge between Sc+R and M+Cu.
- M and Cu end as stubs 10–20% of span beyond their last cell, fading into open membrane.
- Hindwing: three longitudinals, 1–3 crossveins, a jugal lobe, hamuli on the leading edge.
- Vespula photo: veins are brown, 1.5–2.5× membrane-hair width, with slightly swollen nodes.

Rules: grown (see *Growth, not templates*). Lanes Sc+R (pinned to the stigma), R1 (from the
stigma to the marginal node), Rs, M+Cu (deterministic fork at the basal vein), A, optional second
cubital and anal lanes; family sets join density (sawfly dense, apid mid, vespid sparse, chalcid
none), fork count (sawfly 1–3), `uOpen` (0.72–0.9), stub odds; stigma lens per R5.

### Odonata (ref: odo-dragonfly, odo-anax-ris1921, odo-damsel-ris1921)

Observed:

- **Costa** heavy with a **nodus** notch at 40–50% span where Sc ends. **Antenodal** crossveins
  (C–Sc and Sc–R1, aligned) and **postnodal** crossveins (C–R1) form ladders; the first two
  antenodals are thicker (primaries).
- **Pterostigma** near the tip between C and R1: an elongated cell 4–8% of span, rounded
  parallelogram, solid, with a thickened crossvein at each end and R1 running under it.
- **R+M** fused at the base, splitting at the **arculus** (~15–20% span); below the arculus the
  **triangle** (dragonfly) or **quadrilateral** (damselfly).
- Longitudinals R2, IR2, R3, IR3, R4, MA, MP, CuA, CuP, A1 fan to the margin; **all undulate**
  because they follow the rows of cells. Intercalaries (IR2, IR3) start mid-wing.
- Cells: one-cell-wide ladders between longitudinals from the base to about two-thirds span,
  widening to 2–3 cells (hexagonal) toward the margin and in the hindwing anal field. Cell size
  grows toward the hind margin and base; smallest along the costa and at the tip.
- Damselfly (Ris 2): petiolate, almost every cell a quadrilateral in neat rows.

Rules (implemented 2026-10-02 on `growVeins` v2, after Hoffmann et al. 2018; see
`research-vein-branching.md`):

- **Primaries** are built once as smooth curves and handed to `growVeins` as pre-built lanes.
  Sc and R1 are offsets from the costa with the nodal notch smoothed out (C–Sc and Sc–R1 each
  ~5% of the chord before the nodus, C–R1 ~7% after it, as on Ris plate 1), Sc ending on the
  costa at the nodus and R1 just under the apex. R2 runs one cell under R1 (an absolute gap, so
  that strip is a one-row ladder to the tip); R3..A1 are laid out as fractions of the depth from
  R1 to the hind margin, so every primary bows with the outline, and each eases to the margin
  by a power curve that is steeper for the upper veins. Targets: R1 at the outline sample before
  the apex, the fan evenly by arc length from the apex back along the hind margin to 42% span.
  Undulation genes (`und`, `period`, `wig`) as before; no primary has a kink. A damselfly's fan
  leaves the end of the petiole from two fused stems (Sc+R+M above, Cu+A below).
- **Wall lanes**: the costa and the trailing edge, 0.3 inside the outline and ending at the apex,
  are lanes that are never drawn (`noDraw`), so the costal strips and the anal field are strips
  like any other and every cell closes against a vein or the margin.
- **Named crossveins** through `place` (angle rule, slide, no dangling): the antenodals as aligned
  C–Sc–R1 pairs (`then` chains the Sc–R1 segment at the same lean; the first two heavier), the
  subnodus (C–R1 at the nodus, O), the two pterostigma end crossveins (lean gene 18–38° from
  perpendicular, O, lower end distal; the strip under the stigma is a `gap` with no other
  crossvein), the arculus stepping from R2 through the fan to the median lane (O), the discoidal
  triangle (two rungs from one point, the long side with a relaxed band) or the damselfly
  quadrilateral (two rungs), and the bridge (a short oblique R1–R2 behind the subnodus).
- **Secondaries, regime per strip segment**: cell size `cell(u, s)` = 0.03 Lw × `cells` gene
  (libellulid 0.7 .. aeshnid 1.3; damselfly 1.0–1.5) × (1 − 0.3 u) × (1 − 0.25 s), floored at
  3.2 units; the postnodal ladder uses its own `postStep`. Along every strip, where
  width / cell < 1.6 the segment is a **ladder**: evenly spaced sites, each rung the bisector of
  two neighbours clipped to the two primaries and slid until both junctions lie in 105–140°
  (target gene 108–124°, `lean` gene), rungs 0.8–1.25 cells apart. Where width / cell ≥ 1.6 it
  is a **mesh**: rows = round(width / cell) of sites on a staggered lattice (hexagonal packing;
  the outer rows zigzag across by the `zig` gene so their bisectors lean on the primaries),
  thinned by a Poisson test, and the Voronoi of them clipped to the region. A mesh region is
  closed on both ends by real crossveins (named walls, or rungs placed at the regime
  transitions) or by the outline at the tip, so no edge ends in space; edges ending on a
  primary are slid along it within 0.3 cell toward the band where possible, never dropped.
  Result: ladders of quadrilaterals in the costal strips, R1–R2 and the damselfly nearly
  everywhere; two or more rows of pentagons and hexagons in the MP–CuA–CuP region, the
  hindwing anal field and toward the tip; neighbours similar in size; every junction three-way
  except the aligned antenodals and the arculus, which cross their intermediate vein by design.
- `meta.wingStats` carries joins, dropped, rungs, min / max / mean rung angle, and the counts
  of ladder and mesh segments; `tests/check.js` asserts the rung band (mesh edges exempt).

### Hemiptera, Cicadidae (ref: cic-cicada)

Observed:

- Basal half: **Sc+R**, **M**, **CuA**, **CuP** heavy and nearly parallel, closing long basal
  cells (radial, median, cubital) with a short **nodal line** of crossveins.
- Apical half: **RA, RP, M1–M4, CuA1, CuA2** (8 apical cells) fan to the **ambient vein**, a
  continuous vein running round the apex and hind margin 6–10% of breadth inside the outline;
  the **peripheral membrane** outside it is empty. Apical cells are elongated polygons with
  curved sides and oblique ends, not straight-sided.
- Anal veins A1–A3 short, to the hind margin near the base; clavus with A1 fold.
- Hindwing: same plan at half size, ambient vein too.

Rules: grown by `growVeins` v2. Lane plan (u = span fraction, s = chord fraction from the costa):

| lane | from (u, s) | to | notes |
|---|---|---|---|
| Sc+R | (0.02, 0.3) | nodal node N0 (u `nx0` 0.46–0.6, s 0.14) | O (H with the heavy gene); bow −`bow` (0.015–0.04) |
| M+CuA | (0.02, 0.44) | `mcu` (u 0.1–0.2) | the common stem (`mcuFork` odds 0.7); CuA forks off it |
| M | `mcu` (or the base) | N1 (u nx0 − slant/3, s 0.33) | O / H; bow −0.8 `bow` |
| CuA | fork off M+CuA | N2 (s 0.53) | O; bow +`bow` |
| CuP | (0.02, 0.62) | N3 (u nx0 − slant, s 0.72) | D |
| apical stems | N0 / N1 / N2 | 20–45% of the way to their targets' mean | D; one stem per nodal node that carries 2+ branches, two sub-stems when M carries 3–4 |
| RA, RP, M1–M4, CuA1, CuA2 | the stems' ends | nodes on the ambient vein's apical arc (x > 0.68) | D; lanes sharing nodes, common `apBow` ±0.03 |
| ambient vein | pre-built: the outline inset by `inset` × 1.6, costa → apex → clavus, as two monotone lanes | – | D, `noJoin` |
| A1–A3 | `wingGraph` chains | clavus | D / F |

Named crossveins, all through `place`: the **nodal line** as one `then` chain Sc+R → M → CuA → CuP so
its four pieces keep one slant (`slant` 0.04–0.14 of the span back toward the base); 1–3 **m-cua**
rungs in the median cell; the optional Sc+R–M rung in the radial cell (`scr` 0.5); the **ulnar row**
(`ulnar` 0.6) across the apical lanes at 45–60% of their length. `noSites`: a cicada has no other
crossveins, and `uOpen` is the nodal line. The hindwing is the same plan at half size with one apical
branch per nodal node. `meta.wingStats` carries the placed joins; 14 per plate on average, under 1%
dropped.

### Diptera (ref: dip-eristalis, dip-asilid-photo, dip-limonia)

Observed:

- **C** heavy to the apex with a costal break; **Sc** ends on the costa at ~45%; **R1** ends on
  the costa at ~65%; **R2+3** ends on the costa at ~85%; **R4+5** ends at the apex, dipping toward
  M1 in syrphids. **M1** bends forward near its end (muscids) or runs to the margin (asilids).
- Closed cells: **br** (basal radial), **bm** (basal medial), **cup** (anal, closed by CuA2+A1),
  **dm** (discal medial, closed by dm-cu), **r4+5** (closed when M1 meets R4+5). Asilid: discal
  cell `dc` with M1, M2, M3 all reaching the margin; crane fly: the same plan plus a discal
  cell and many more cells (Limonia).
- Corners are obtuse; dm-cu is bowed; bm-cu and r-m are short and oblique.
- Small dark **pterostigma** on the costa at Sc's end. **Vena spuria** in syrphids.
- Alula and calypter lobes at the base.

Rules: grown by `growVeins` v2 (see *Growth, not templates*), the second order on it after
Hymenoptera. Lane plan measured on dip-eristalis and the Comstock Diptera plan (u = span fraction,
s = chord fraction from the costa; every value is a per-seed roll inside the range; tipulid ranges
in brackets where they differ):

| lane | from (u, s) | to | notes |
|---|---|---|---|
| C | – | apex | `costaEls`, H; costal spines gene |
| Sc | (0.02, 0.2) | costa at u 0.42–0.55 [0.6–0.7] | D; hugs the costa (bow −0.02..−0.06); the small stigma lens sits at its end |
| R1 | (0.02, 0.3) | costa at u 0.6–0.72 [0.76–0.84] | D; the stem before the Rs fork is O |
| Rs | fork off R1 at u 0.17–0.23 | apex node, or `r45J` (u mEnd + 0.12–0.16, s 0.3) when r4+5 closes | O to its own fork, then D as R4+5 (O with the heavy gene); `R45b` carries it on from `r45J` to the apex |
| R2+3 | fork off Rs at u 0.48–0.62 [0.62–0.72] | costa at u 0.8–0.9 | D; concave toward the costa |
| R4 | fork off Rs at u 0.66–0.74 | costa at r23 + 0.05 | tabanid and asilid only |
| M | (0.02, 0.45) | `mE` (u mEnd 0.7–0.8, s 0.5) in bend families; `mF` (u mf, s 0.5) in fork / three | D (O if heavy); carries r-m, bm-cu, dm-cu |
| M1 (bend) | `mE` | `r45J` (r4+5 closed: a long oblique vein as in eristalis), or the elbow `m1K` (u mEnd + 0.07–0.1, s 0.5 − bend 0.1–0.16) and on to the margin just behind the apex | muscid: the two-lane elbow is the bent M1 |
| M1, M2 (fork / three) | `mF` | hind margin at u 0.95 / 0.88 [0.96 / 0.89] | M2 odds 0.75 in nematocerans, always in tabanid / asilid |
| M3 | fork off M at dm-cu + 0.02 | hind margin at u 0.81 [0.82] | odds 0.5 nemato, 0.8 tipulid, always tabanid / asilid |
| CuA1 | (0.02, 0.6) | `cuK` (u dm-cu + 0.01–0.03, s 0.74), then `CuA1b` down to the margin at dm-cu + 0.05–0.1 [0.04–0.08] | D (O if heavy); dm's lower edge sits at s ≈ 0.75 as in eristalis, so the drop to the margin is short |
| CuA2 | (0.02, 0.64) | `cupJ` (u 0.28–0.4, s 0.84): cup closes; [margin at u 0.54–0.62, cup open] | D; strong negative bow (−0.1..−0.14) so it runs out, then bends down onto A1 |
| A1 | (0.02, 0.8) | `cupJ` [margin at cu2 − 0.16] | D |
| A1c | `cupJ` | margin at cu2 + 0.05 | A1+CuA2, the short way on to the margin |
| A2 | (0.02, 0.9) | margin at u 0.14–0.24 | F; odds 0.3–0.6, always in tipulids |

Named crossveins, all through `place` so their junction angles are enforced and counted: **h**
Sc–R1 at u 0.1–0.17 (odds 0.7–0.8); **r-m** Rs–M just basal of the Rs fork (fork − 0.03..0.1, never
below 0.4); **bm-cu** M–CuA1 at u 0.33–0.42 [0.42–0.52] (odds 0.8–1); **dm-cu** M–CuA1 at u 0.6–0.7
[0.62–0.72], bowed toward the apex. The cup closure and the r4+5 closure are lane junctions (three
lanes sharing a node) rather than crossveins: M1 meets R4+5 at ~150°, a fusion of longitudinals,
outside R-D's band for a crossvein. Crossvein bows stay within ±0.06: a bow rotates both end
tangents of the arc by about atan(4·bow), so a −0.1 bow on dm-cu could never satisfy both junction
angles.

Family parameters (ky = breadth / span; k = site spacing / strip width; sepAbs = narrowest strip,
as a fraction of the span, that carries sites):

| family | ky | len | M1 mode | r4+5 closed | R4 fork | cup | k | sepAbs | uOpen |
|---|---|---|---|---|---|---|---|---|---|
| muscid | 0.92–1.1 | 1.05–1.28 | bend | 0.5 | – | closed | 2.5–4 | 0.1 | 0.7–0.8 |
| nemato | 0.85–1.0 | 1.05–1.25 | fork (M3 0.5) | – | – | closed | 2.5–4 | 0.1 | 0.72–0.8 |
| syrphid | 0.95–1.1 | 1.08–1.28 | bend | always | – | closed | 2.5–4 | 0.1 | 0.72–0.8 |
| tabanid | 1.08–1.2 | 1.05–1.2 | three | – | always | closed | 2.5–3.5 | 0.1 | 0.74–0.8 |
| asilid | 0.72–0.84 | 1.2–1.35 | three | – | always | closed | 2.5–4 | 0.1 | 0.74–0.8 |
| tipulid | 0.56–0.68 | 0.95–1.05 | fork (M3 0.8) | – | – | open | 1.6–2.4 | 0.055 | 0.88–0.92 |

Sites: with `sepAbs` 0.1 the basal bundle and every strip narrower than a tenth of the span carry
no sites, so a fly gets 0–1 secondary rungs (3.3–3.8 joins per wing, nearly all named), as in the
references; crane flies get 1–3 extra rungs (4.6 joins). `noPair` keeps cup, the anal field, the
subcostal strip and r2+3 clean, and the strip under R1 in everything but crane flies. The syrphid
vena spuria is a plain `wingGraph` chain between Rs and M (it is a fold, so it joins nothing and
is allowed to cross r-m). Stigma per R5 (small, at Sc's end), alula lobe, fringe, costal spines,
halteres and the posture genes are unchanged from the template version. `meta.wingStats` is
asserted by `tests/check.js`; the signature carries lane, join and fork counts plus every family
switch (r4+5 closed, R4, M2, M3, A2, h, bm-cu, stigma style, heavy).

### Lepidoptera (ref: lep-agrotis, lep-papilio)

Observed:

- Closed **discal cell** with a bent **discocellular** (dcv) made of two or three straight-ish
  pieces meeting at obtuse angles, not one smooth arc.
- **R2–R5** are **stalked**: R3+R4+R5 share a stem off the cell's upper corner and branch
  successively; R1 and Sc run separately along the costa.
- M1–M3 off the dcv, Cu1 and Cu2 off the lower cell edge, all gently convex toward the apex;
  1A vestigial (dotted), 2A to the tornus, 3A short at the base.
- Hindwing: humeral vein, Sc+R1 along the costa, Rs, M1–M3, Cu1–2, 2A, 3A; cell shorter.
- Papilio: veins thicker and the margin scalloped between vein ends.

Rules: grown by `growVeins` v2 (`lepVeins`), with no site rungs because a lepidopteran wing has none.
Every vein is a pre-built bowed lane (chord-fraction control points dip toward the tornus on these
outlines, so the arcs are absolute): the discal cell's top edge (b → U, convex to the costa, O) and
bottom edge (b → D, O), Sc (Sc+R1 on the hindwing, O), the R stalk from U (O) with R3–R5 rooted on it
(`parent`) one after another and the last two at its end (`stalk` gene), R2 from U, M1 and M2 from the
discocellular bends, M3 and Cu1 from the lower corner D, Cu2 rooted on the lower edge at 55–75%, 2A to
the tornus, 3A short (odds 0.6, F); all branches D (O with the heavy gene). The **discocellular** is
three named crossveins placed independently by the angle rule: U → M1 just past its root, M1's root →
M2 just past its root, M2's root → the lower edge at D. The bends are measured against the cell's
chord U → D: the upper piece leans back from it by 34–46°, the middle piece runs parallel to it (its
own band 90–152°, since M2 leaves it nearly square on the references), the lower piece leans forward
by 29–41°, the back offsets capped at 4.5% / 3.5% of the span, so the dcv is a soft chevron pointing
at the base on every family's cell; M1 and M2 are trimmed to start where their piece lands. A piece
the rule cannot place (1.6 of 6 per plate) is drawn straight between its nodes so the cell always
closes. The humeral vein is a hooked `bowed` arc from the root of Sc+R1 (`hum` gene). The veins array
keeps the shape the pattern code reads: [cellTop, cellBot, dcv, Sc, (humeral), (stalk)] then the
marginal veins apex → inner margin, each with `.sw`; `meta.wingStats` sums both wings' pieces.

### Neuroptera, Chrysopidae (ref: neu-nothochrysa, neu-chrysoperla)

Observed:

- **Costal ladder** of 20–35 crossveins from base to apex between C and Sc; Sc and R1 run
  parallel and fuse near the apex.
- **Rs** runs below R1 and gives off 8–14 **pectinate branches**, each curving down to the
  margin and forking at the tip (end-twigging). The **intramedian cell (im)** is a small rhombus
  at the root of Rs.
- Two **gradate series**: zigzag staircases of crossveins stepping outward through the branches
  (inner at ~50%, outer at ~75% of the branch length).
- Cells are lozenges: the branches and gradates cross at ~60°.

Rules: grown by `growVeins` v2. Lane plan:

| lane | built as | notes |
|---|---|---|
| C | wall lane 0.3 inside the costa, `noDraw` | the outline draws it |
| Sc | pre-built offset under the costa: depth 0.025 + `costal` (0.07–0.11) × sin^0.7 of the span, ending on the costa at 0.965 | O |
| R1 | the same offset plus `sub` (0.04–0.06 of the chord), ending on the costa at 0.978 | D (O when heavy) |
| Rs | pre-built: rooted on R1 at `rsFork` (0.07–0.12) through `parent` (the root is a junction on both), one cell under R1 (`rsGap` × the Sc–R1 gap, absolute) to the apex | D / O |
| B0..Bn | forks off Rs at u from rsFork + 0.12 to `rsEnd` (0.78–0.88), aimed at outline nodes along the hind margin from M's end to just short of the apex, trailing edge first; one bowed arc each (`bowB` 0.03–0.09, leaving Rs at a shallow angle) | D; 8–14 (5–11 on the hindwing) |
| M, Mf | (0.02, 0.36) to the hind margin at `mX` 0.28–0.4, bow −0.06..−0.12; Mf forks off M (odds 0.5) | D |
| Cu | (0.02, 0.5) to the hind margin at `cuX` 0.16–0.26 | F |

Named crossveins through `place`: the **costal ladder** C–Sc every `ladder` (0.022–0.038) of the span,
leaning toward the apex (20–35 rungs); the **intramedian cell** as two Rs–M rungs at rsFork + 0.03 and
+ 0.12; the **gradate series** (1–3 at 42–78% of the branches): each rung leaves branch i at t and is
aimed at branch i+1 at t − `zig` (7–12%), with its own target angle `gradAng` 108–116° (`angT`) so it
leans more than the ladders and the series reads as a staircase, the next rung leaving branch i+1 at t
again (`drift`); 1–4 **m-cu** rungs. Sites (`k` 1.4–2.2, `minSep` 0.05) fill the R1–Rs strip and the
outer parts of the inter-branch strips; `uOpen` 1.0; the subcostal strip and M–Cu are `noPair`. Every
branch, Rs, M and Cu end-twig on the outline. 137 joins per plate, 3 dropped, mean angle 117°.

### Ephemeroptera (ref: eph-mayfly-1956)

Observed:

- Triangular forewing with 9–15 longitudinals (C, Sc, R1, Rs, M1+2, M3+4, Cu1, Cu2, 1A–5A) and
  **intercalaries (IR)** between them that start mid-wing.
- Dense ladders of crossveins between every pair of longitudinals, rungs tilted toward the
  apex; costal ladder densest.
- Longitudinals bow toward the trailing edge and undulate.
- Hindwing small and rounded, often lost.

Rules: grown by `growVeins` v2, the ladder regime everywhere. The forewing is a triangle with the apex at
the top corner (a domed outline sent Rs diving away from R1 and no rung could bridge them). Lanes: C and
the trailing edge as `noDraw` walls; Sc and R1 as pre-built offsets under the costa (`sub` 0.035–0.055 of
the chord each, Sc ending on the costa at 0.9, R1 at the apex, O / D); 7–13 fan lanes (`nV` − 2: Rs, M,
Cu1, Cu2, 1A..) as rays from the root to targets spaced by arc length along the hind margin from the
apex back to 22% span, each bent by a share of the costa's convexity that fades toward the trailing
edge (`pow0` 0.8–1.0 × (1 − f)^1.2, measured against the ray's own chord) and undulating (`und`); the
first three D, the rest F; intercalaries (`inter` 0.6) between alternate pairs as free lanes from `u0i`
0.4–0.5 to the margin (F). No named crossveins: every strip is a one-row ladder of sites at the local
spacing (`evenSites`, `k` 1.0–1.4) with an absolute cell `cells` × 0.035 span × (1 − 0.3 u)(1 − 0.25 s),
the costal ladder on its own `costStep` (0.022–0.034); `uOpen` 1.0. Two `growVeins` knobs were added
for this order (defaults keep every other order byte-identical): `gapNear` 0.2 (a lane shared by two
ladders cannot keep half a spacing clear of the junctions the first one left) and `reachW` 0.7 (a rung
across a wide apical strip must slide further than one spacing to lean into the band). Hindwing: the
same with 3 fan lanes and a 1.6× coarser cell, present with odds 0.8. 220 rungs per plate, mean angle
117°, 17 dropped.

### Orthoptera, tegmen (ref: orth-grasshopper)

Observed:

- **C, Sc, R, M, Cu** run almost parallel for the whole length; Cu forks near the base (CuA,
  CuP); R forks near the tip.
- The membrane between them is an **archedictyon**: a fine grid of square-ish cells arranged in
  rows along the veins, finer toward the apex.
- Hindwing is a fan of anal veins with ladder crossveins.

Rules: grown by `growVeins` v2 on a wing frame of its own. The tegmen was drawn in body coordinates;
it is now a `makeWing` frame pointing down the body (`frame`: local x along the tegmen, local −y toward
its outer edge, which is the costa; the straight inner edge on the midline is the hind margin), so
`wingGraph`, `topAt` / `botAt` and the strip loop apply unchanged. Lanes: C and the inner margin as
`noDraw` walls; Sc (s 0.1 → the costa at `scEnd` 0.68–0.82, O), R (s 0.24 → the apex, D / O) with Rs
forking off at `rFork` 0.58–0.72 to the inner margin at 0.96, M (s 0.42 → 0.9), Cu (s 0.6 → 0.8)
forking at `cuFork` 0.1–0.2 into CuP (→ 0.62), an anal vein (odds 0.6, F) and a light intercalated vein
between R and M from u 0.3 (`subRow` 0.6, F). The **archedictyon** is the mesh regime (`rows2`, `rowsAt`
1.4) with an absolute cell of `cell` 0.11–0.16 × the tegmen's width (6–9 cells across, 0.8× in the costal
row, × (1 − 0.3 u) toward the apex) and a low `zig` 0.04–0.1, so a narrow strip is one row of leaning
rungs and a wider one rows of near-rectangular polygons rather than hexagons; `uOpen` 1.0. The folded
hindwing fan (odds 0.7) is a second frame: 5–9 anal lanes radiating from the root to targets by arc
length along the outer margin, each a one-row ladder of rungs at `fanCell` 0.05–0.08 of the tegmen
length. Both frames draw into `covers`, the fan first. 360 joins per plate, mean angle 117°.

## Generation model

See `research-vein-branching.md` for the literature behind the growth model (Hoffmann et al.
2018 inhibitory-field / Voronoi secondaries; de Celis 2003 dichotomous primaries and closed
cells; Runions 2005 growth toward sources with anastomosis; junction angles ~110–120°).

### Growth, not templates

A fixed cell template with jittered corners always reads as the same wing. The references read as
a growth process, so `growVeins(g, G)` grows the venation. The current engine is **v2, site-based**,
written to the rules R-A..R-H of `research-vein-branching.md` after v1's junction jogs were traced
to its `deflect` step:

- **Lanes** (R-A, R-B) are the Comstock–Needham trunks of the order, each one smooth curve built
  once from its base, one or two interior control points (a per-lane `bow` gene) and its target,
  and never moved afterwards. Anatomy pins a few: Sc+R ends in the pterostigma, R1 leaves its tip
  and closes the marginal cell with Rs, M+Cu is one stem. A **fork** starts a child lane on the
  parent's curve: the ones a family always has (Cu at the basal vein, Rs off Sc+R) plus `forks`
  random ones per seed aimed between the parent's target and its neighbour's.
- **Named crossveins** (basal vein, r-m for the submarginals or the areolet, the recurrents
  1m-cu / 2m-cu, cu-a, the anal crossvein) are placed first at the family table's u positions by the
  same clip-and-slide code as everything else. Structural ones (the basal vein, which Rs forks from
  in apids; the Cu1b fork) go before the random forks so no lane is ever grown across a crossvein.
- **Sites** (R-C): in every strip between adjacent lanes, over the u-interval where both are alive
  and separated by `minSep`, inhibitory sites walk along the strip at spacing = local strip width
  × `k` (family gene; apid 2.0–2.8, vespid 1.8–2.6, ichneumonid 1.5–2.2, sawfly 0.9–1.4), restarting
  from every wall (the strip's ends and its named crossveins). Each crossvein is the bisector of two
  consecutive sites clipped to the two lane curves, so a cell is 0.85–1.8 spacings long. Mesh-veined
  orders (Odonata) pass `rows2` with an absolute `cell` size: each strip is then cut into segments
  that are one-row ladders where width / cell < 1.6 and rows of Voronoi cells where it is wider,
  every mesh segment closed by crossveins or the margin (see the Odonata rules above).
  `minSepAbs` (a fraction of the span, default 0) additionally drops strips narrower than an absolute
  width: `minSep` is a chord fraction, so on its own it lets sites into the tight basal bundle of a
  fly wing, where real wings have no secondaries.
- **Junction angle** (R-D): the near end is fixed; the far end slides along its lane within one
  spacing until the obtuse angle between crossvein and lane lies in [105°, 140°] at both ends
  (target `angle` gene 112–128°, `lean` gene preferring the costal end distal as in the references);
  a crossvein that cannot satisfy both, or that would land next to another junction or cross a third
  lane, is dropped. Nothing dangles (R-E): a crossvein exists only with both ends on lanes.
- **Open apex** (R-F): joins stop at `uOpen`; a stub lane is cut `stubLen` past its last junction and
  drawn at `SW.F` from there.
- **Weight** (R-G): stems `SW.O` (Sc+R, M+Cu to its fork), named branches `SW.D`, A and
  crossveins `SW.F`; a lane that forks is one level above its branch before the fork (capped at O);
  a crossvein is one level below its lighter lane. The basal vein is O in bees, D in wasps.
- **Density gradient** (R-H): site spacing shrinks toward the tip and trailing edge by `grad`.

`growVeins` returns `{ lanes, joins, forks, stats }`; `stats = { joins, dropped, minAngle, maxAngle,
rungs, angSum, ladders, multi }` is exposed as `meta.wingStats` by every winged order and asserted by
`tests/check.js` (the 105–140 band on slide-placed rungs; mesh edges and structural obliques with their
own band are exempt). Each join also carries its polyline (`joins[i][3]`) so an order can assemble a
chain from placed pieces (the lepidopteran discocellular). The family only sets which lanes, forks and
named crossveins exist and the site spacing, so two wasps differ in topology, not only in node
positions; lane, join and fork counts and the hindwing size go into `meta.wingSig`. All eight orders
use this now: Hymenoptera and Diptera (closed named cells, open apex), Odonata, Ephemeroptera and
Orthoptera (`uOpen` 1.0, ladders and meshes to the margin), Neuroptera (named ladder, im cell and
gradates plus sparse sites), Cicadidae and Lepidoptera (named crossveins only, `noSites`). Later orders
added a few general knobs, each defaulting to the previous behaviour: a pre-built lane may name a
`parent` so its root is a junction on both (lacewing Rs on R1); a named crossvein may carry its own
target angle `angT` inside the band (gradates); a `then` step may be `{ b, ub, reach, ang }` to aim its
own far end; `gapNear` and `reachW` for ladder-everywhere orders (see Ephemeroptera). Diptera showed two
things Hymenoptera did not:
a lane that is already diving where a named crossvein lands (CuA1 under dm-cu, M under r-m in the
forked families) makes the two junction angles differ by the lanes' divergence and the crossvein is
dropped, so the dive starts at a junction node (`cuK`, `mE` / `mF`) as it does in the references;
and a lane that must end on another lane (M1 onto R4+5, CuA2 onto A1) is written as lanes sharing a
node, as the Hymenoptera marginal cell already was.

What changed from v1: lanes are no longer `wingGraph` chains with a node per junction (that is what
kinked them) and the `off` / `deflect` machinery is gone; crossveins come from sites rather than a
per-step probability; junction angles are measured and enforced instead of approximated by a fixed
`tilt`; the first cubital cell, the basal R wedge and the marginal cell are never crossed; and
cells are 1.5–3× longer than wide as in `ref/hym-apis.png` (the research note's k ≈ 0.9–1.3 is right
for odonate-style meshes, not for hymenopteran ladders).


A small planar-graph engine added to the engine script, used by every wing block:

```
const g = wingGraph(wing);                  // local coordinates of `wing`
g.node('S0', [x, y]);                       // named node
g.margin('mA', x, 'top'|'bot'|'tip');       // node snapped to the outline
g.edge('a', 'b', { vein: 'r-m', sw, bow, tilt });   // one bowed segment
g.chain(['A', 'n1', 'S0'], { vein: 'Sc+R', sw, bows: [...] });   // undulating longitudinal
g.stub('d2', dir, len, sw);                 // vein fading into open membrane
g.ladder('R1', 'Rs', n, tilt, sw);          // rungs between two chains (regime R6)
g.reticulate(polygonNodeIds, cellFn, sw);   // Voronoi inside a closed cell
g.stigma(xa, xb, depth, peak, style);       // pterostigma lens (R5)
L.wings.push(...g.emit());                  // chains → smooth curves, edges → bowed veins
```

- Node positions are specified in normalised wing space (u along the span 0–1, v across
  −1…+1 in half-breadths) and scaled by the wing's `Lw`/`w`, so a family template is
  independent of the rolled outline.
- Chains with the same `vein` name are emitted as one Catmull-Rom curve through the nodes
  with bowed midpoints inserted, so they undulate (R1) rather than kink.
- `tilt` on a crossvein slides its far endpoint along the target chain (R2).
- Stigma `style`: `solid` (black fill; the single allowed black fill, see CLAUDE.md), `cross`
  (two hatch sets at 1.5 px), `axis` (lines along the lens), `stipple`.
- `meta.wingSig` gains the family and the regime choices; `tests/check.js` unchanged.

## Status

Done: steps 1–9 below, including the lepidopteran humeral vein. Audit of 2026-10-02 (4× zooms beside
the references, seeds listed per order) and what it changed:

- Lepidoptera (lep-agrotis, lep-papilio; seeds 8, 23, 51, 65): R3–R5 now leave one stem successively
  instead of fanning from a point; bows raised to 2–6% of the chord and signed per vein; stems and cell
  edges heavier than branches; hindwing Sc+R1 starts inside the costa with a hooked humeral vein. Pass.
- Cicadidae (cic-cicada; seeds 2, 3, 17): basal veins were straight rods to a square nodal line; now
  three-segment chains, M+CuA stem, slanted zigzag nodal line, apical veins with two nodes. Pass.
- Hymenoptera (hym-apis, hym-ross, hym-ichneumonidae-diagram; bee 12, 24, 60, wasp 20, 69, 124):
  submarginals close, basal vein slants back, costa stops at the stigma; r-m and recurrent crossveins
  now carry an explicit lean so none sits square. Pass.
- Hymenoptera, second audit (same refs; bee 12, 24, 60, wasp 20, 70, 124) after `growVeins` v2: no
  jog at any junction, every junction 105–140° over 3000 seeds (`wingStats`), named cells closed with
  no dangling ends, M and Cu fade past `uOpen`, ichneumonid areolet now a small cell under the
  stigma, stems O / branches D / crossveins F. Pass.
- Diptera (dip-eristalis, dip-asilid-photo; fly 9, 15, 29, 75): br, bm, dm, cup close; r-m and dm-cu
  oblique; the muscid M1 bend reads as a curve. No change needed. Pass.
- Diptera, second audit (dip-eristalis, dip-asilid-photo, dip-limonia; fly 9, 15, 29, 75, cranefly 6,
  10) after moving to `growVeins` v2: lanes smooth, every crossvein junction 105–140° over 3000 seeds
  (`wingStats`), br / bm / cup / dm closed, r4+5 closed by a long oblique M1 in syrphids and half the
  muscids, the muscid elbow a real bend to the margin behind the apex, CuA1 turning down at dm-cu's
  foot, no rungs in the basal bundle (`minSepAbs`), tipulids with the Limonia plan plus a few extra
  cells, asilid and tabanid with R4 and M1–M3 to the margin. Named crossveins drop on under 1% of
  wings (7% of tabanids, the broad wing, lose bm-cu). Pass.
- Neuroptera (neu-nothochrysa; seeds 1, 16, 22): gradates read as one oblique line; now true zigzags;
  a branch could double back to the costal side at the apex (fixed); twigs now end on the outline. Pass.
- Ephemeroptera (seeds 4, 36): quick check, unchanged. Pass.
- Odonata, second audit (odo-anax-ris1921, odo-damsel-ris1921; dragonfly 18, 27, 49, damselfly 30, 41)
  after moving the secondaries onto `growVeins` v2: R1 used to end on the costa at 62% span and the
  damselfly's fan overlapped itself in the petiole (both fixed); rungs now lean 105–140° (mean
  112–121° over the audited seeds, none square), mesh regions of similar-sized pentagons / hexagons
  close against rungs or the margin with no free end, R1 is smooth across the nodus. Pass.
- Orthoptera (orth-grasshopper; seeds 14, 21): archedictyon rungs were near-square; lean raised. Pass.

Audit of 2026-10-02, after the last five orders moved onto `growVeins` v2 (sheets of nine random seeds per
body plan, 4× zooms beside the references, `check.js 3000` with the angle band asserted on every winged
type; bee / wasp / fly / cranefly / dragonfly / damselfly byte-identical to before for seeds 12, 20, 24,
60, 70, 124, 18, 27, 30, 9, 15, 6):

- Neuroptera (neu-nothochrysa, neu-chrysoperla; seeds 1, 16, 22, 36): the first grown version had the
  branches leaving Rs toward the costal side and the gradates leaning with the ladders so no staircase
  showed; branches now bend down from a shallow start and the gradates carry their own target angle.
  Costal ladder, im cell, 1–3 staircases, twigged ends, 105–140° everywhere, mean 117°. Pass.
- Ephemeroptera (eph-mayfly-1956; seeds 4, 7, 13, 36): the domed outline sent Rs diving from R1 so the
  R1–Rs strip had no rungs, and chord-fraction fan lanes bunched toward the costa; the forewing is now a
  triangle with the apex at the top corner, the fan radiates from the root, `gapNear` / `reachW` let the
  ladders fill every strip. A trial of the mesh regime in the apical strips was dropped: the reference
  is one-row ladders to the margin. Pass.
- Orthoptera (orth-grasshopper; seeds 14, 21): the first cell size (a fraction of the tegmen length)
  gave ladders only; sized from the width it gives 6–9 cells across with rows of near-square polygons in
  the wider strips, finer at the apex, as in the photo. Pass.
- Cicadidae (cic-cicada; seeds 2, 3): the nodal line is one slanted chain, every basal cell closes, the
  apical veins leave the nodal nodes through short stems and end on the ambient vein, the peripheral
  membrane is blank. Pass.
- Lepidoptera (lep-agrotis, lep-papilio; seeds 8, 239, 3908901906): the first grown discocellular
  folded into a deep V on broad pierid cells because the back offsets compounded the chord's own slant,
  and a dropped upper piece silently ended the chain; the leans are now measured against the chord with
  the middle piece parallel to it, and the pieces are placed independently. The patterns (bands, ocelli,
  stigmata, fringe) render unchanged on butterfly and moth sheets. Pass.

## Sequencing

1. Engine helpers (`wingGraph`, `stigma`, `ladder`, chain emission). No visual change.
2. Hymenoptera on the graph (apid first, overlay against `ref/hym-apis.png`), then the other
   families. Stigma lens replaces the current wedge.
3. Odonata: undulating chains, ladder regime for narrow strips, odonate stigma, arculus/triangle.
4. Cicada: nodal line, ambient vein, apical cells to the ambient vein.
5. Diptera: cell graph per family.
6. Lepidoptera: bent dcv, R3–R5 stem, humeral, 3A.
7. Neuroptera: curved pectinate branches, im cell, zigzag gradates.
8. Mayfly: ladders with tilt, intercalaries.
9. Grasshopper: grid regime.

Each step: contact sheet for the order, zoom of one wing beside the reference, `check.js 3000`.

## Verification bar

A step is done when a 4× zoom of a generated wing placed beside the reference shows: no
straight full-span vein, no 90° junction, closed cells where the reference has them, open
membrane where it does not, the stigma as a lens, and the weight hierarchy of R7.

## Follow-ups noted at the 2026-10-02 merge (all closed 2026-10-07)

- Lacewing: the note said the ladder spilled into the Sc–R1 strip; that strip was already in
  `noPair`. The dense rungs were in the R1–Rs strip (the only site strip under the costa). Closed
  by `pairK` on `growVeins`: that pair now takes sites at 3.2–4.5× the costal spacing (`kR1Rs`
  gene, in the signature), leaving 2–5 rungs as on neu-nothochrysa; `check.js` asserts ≤ 6.
- Swallowtail: the note said to aim 2A and Cu2 either side of the tail root. The real cause was
  `marginTargets` sampling the outline by index, so the tail lobe's dense samples pulled three to
  five veins into it. Closed the other way round, following lep-papilio: targets are sampled from
  the outline with the tail lobe removed and exactly one vein (the one whose target angle is
  nearest the tail) runs to the tail tip. `check.js` asserts exactly one endpoint at the tip and
  the next two at least 6% of the span apart.
- Grasshopper hind femur: width now a fraction (0.24–0.33) of the femur's final length instead of
  an absolute the thickness factor could thin. Working estimate; no leg reference in `ref/` yet.
  `check.js` asserts hind femur ≥ 1.8× the mid femur width and 3–5× as long as wide.
- Bee/wasp antenna crossing: closed by the antenna step (body plan step 6).
