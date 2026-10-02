# Wing venation: what the references show and how we generate it

Status: implemented 2026-10-02 for every winged order (Hymenoptera, Odonata, Cicadidae, Diptera, Neuroptera, Ephemeroptera, Lepidoptera, Orthoptera) and audited at 4x against the references the same day; see Status below. Supersedes `research-hymenoptera-wings.md`. Reference images
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

Rules: graph with the basal cells closed by the nodal line; each basal vein a three-segment chain
with alternating bows (R1); M and CuA leave a short common stem (`mcuFork` gene) as in the photo;
the nodal line slants back toward the base and zigzags (`zig` gene: N1 a little distal, N2 a little
basal) so every crossvein meets its veins obliquely (R2); apical veins as chains with two offset
nodes ending on the ambient vein, never on the margin; ambient vein as an inset copy of the outline
from costa-apex round to the clavus; peripheral membrane left blank; 6–9 apical cells.

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

Rules: keep the Comstock–Needham graph; dcv as a 2–3 node chain with bends; R2 from the cell corner,
R3–R5 leaving one bowed stem one after another (`stalk` gene = how many steps before the last two fork);
humeral vein hooked from the root of Sc+R1 to the hindwing costa (`hum` gene, its reach); 3A; bows per R1
signed by vein (R convex to the costa, Cu / 2A convex to the hind margin, M nearly straight); weight per R7
(cell edges and stems `SW.O`, branches `SW.D`, 3A / humeral `SW.F`).

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

Rules: branches as chains with one mid node (bow outward); gradates as zigzag staircases: each
rung leans outward by `zig` (7–12% of a branch) from branch i to i+1 and the next rung leaves
branch i+1 behind where the last one landed (`drift`), so rung / riser / rung alternate; branch
targets only on the hind margin and apex (never the costal side, so no branch doubles back);
twigs fork at 90% of the branch and end on the outline; im cell as a 4-node rhombus; costal
ladder rung spacing gene.

### Ephemeroptera (ref: eph-mayfly-1956)

Observed:

- Triangular forewing with 9–15 longitudinals (C, Sc, R1, Rs, M1+2, M3+4, Cu1, Cu2, 1A–5A) and
  **intercalaries (IR)** between them that start mid-wing.
- Dense ladders of crossveins between every pair of longitudinals, rungs tilted toward the
  apex; costal ladder densest.
- Longitudinals bow toward the trailing edge and undulate.
- Hindwing small and rounded, often lost.

Rules: longitudinal chains per R1; ladder regime everywhere, rung tilt 10–25°; intercalary
gene; hindwing presence gene (already).

### Orthoptera, tegmen (ref: orth-grasshopper)

Observed:

- **C, Sc, R, M, Cu** run almost parallel for the whole length; Cu forks near the base (CuA,
  CuP); R forks near the tip.
- The membrane between them is an **archedictyon**: a fine grid of square-ish cells arranged in
  rows along the veins, finer toward the apex.
- Hindwing is a fan of anal veins with ladder crossveins.

Rules: longitudinals as near-parallel chains; grid regime (rows of rungs between consecutive
longitudinals, rung spacing ≈ strip width, rungs leaning 15–45% of a cell so the grid is rhombic
rather than square) instead of Voronoi; fan hindwing ladder spacing gene.

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

`growVeins` returns `{ lanes, joins, forks, stats }`; `stats = { joins, dropped, minAngle, maxAngle }`
is exposed as `meta.wingStats` for bee, wasp, fly and cranefly and asserted by `tests/check.js`. The
family only sets which lanes, forks and named crossveins exist and the site spacing, so two wasps
differ in topology, not only in node positions; lane, join and fork counts and the hindwing size go
into `meta.wingSig`. Hymenoptera (fore and hind) and Diptera use this now; the orders below still
use explicit templates and are candidates to move. Diptera showed two things Hymenoptera did not:
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
