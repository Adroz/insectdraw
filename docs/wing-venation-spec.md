# Wing venation: what the references show and how we generate it

Status: implemented 2026-10-02 for Hymenoptera, Odonata, Cicadidae, Diptera, Neuroptera, Ephemeroptera and the lepidopteran discocellular; the grasshopper archedictyon. Supersedes `research-hymenoptera-wings.md`. Reference images
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

Rules: graph template per family (node table in `index.html`, normalised to span × half-breadth),
positions rolled ±5–8%, bows rolled; stubs on M and Cu; stigma lens per R5 with depth
0.08–0.14 of breadth (ichneumonid 0.14–0.2, chalcid small); submarginal/discoidal counts per
family; areolet as two close r-m crossveins; marginal cell open/closed gene.

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

Rules: nodus and stigma positions as now; longitudinals as chains with a sinusoidal undulation
of amplitude 1–2% of span and period one cell; ladder regime for every strip narrower than
1.3× cell size (costal, subcostal, R1–R2, damselfly everything), reticulation elsewhere with
`cells` gene; arculus, triangle/quadrilateral, bridge, subnodus as heavier edges; stigma per R5
(odonate variant) with end crossveins.

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

Rules: graph with the basal cells closed by the nodal line; apical veins as chains with two
nodes each (bow) ending on the ambient vein, never on the margin; ambient vein as an inset
copy of the outline from costa-apex round to the clavus; peripheral membrane left blank;
6–9 apical cells; crossveins oblique (R2).

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

Rules: graph template per family (muscid / nematoceran / syrphid / tabanid / asilid /
tipulid) with the named cells closed, r-m and dm-cu positions rolled, M1 bend gene, R4 fork
gene (tabanid), stubs for CuA2 and A2; stigma per R5 (small).

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

Rules: keep the Comstock–Needham graph; dcv as a 2–3 node chain with bends; R stalk gene
already present, extend to R3–R5 common stem; add humeral vein and 3A; vein convexity per R1.

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

Rules: branches as chains with one mid node (bow outward); gradates as zigzag polylines whose
steps follow the branch spacing; im cell as a 4-node rhombus; costal ladder rung spacing gene.

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
longitudinals, rung spacing ≈ strip width) instead of Voronoi; fan hindwing ladder spacing gene.

## Generation model

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

Done: steps 1–9 below. Open: the lepidopteran humeral vein. Each implemented order was compared at 4× against its reference.

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
