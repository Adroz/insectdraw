# How insect wing veins branch and join — research notes

2026-10-02. Written to answer "do we need a model of branching?" after the first grown
hymenopteran wings showed jogs at junctions (veins kinked abruptly where a crossvein
landed) and cells that still looked improvised. Sources are primary literature; the rules at
the end are what we derive from them for `growVeins`.

## Sources read

1. Hoffmann, Donoughe, Li, Salcedo, Rycroft (2018). *A simple developmental model
   recapitulates complex insect wing venation patterns.* PNAS 115(40):9905–9910.
   https://doi.org/10.1073/pnas.1721248115 (open copy: https://escholarship.org/uc/item/0c93j6cq)
2. Salcedo, Hoffmann, Donoughe, Mahadevan (2019). *Computational analysis of size, shape and
   structure of insect wings.* Biology Open 8:bio040774. https://doi.org/10.1242/bio.040774
3. de Celis & Diaz-Benjumea (2003). *Developmental basis for vein pattern variations in insect
   wings.* Int. J. Dev. Biol. 47:653–663. https://ijdb.ehu.eus/article/pdf/14756341
4. Runions, Fuhrer, Lane, Federl, Rolland-Lagan, Prusinkiewicz (2005). *Modeling and
   visualization of leaf venation patterns.* ACM TOG 24(3):702–711.
   https://algorithmicbotany.org/papers/venation.sig2005.pdf
5. *Golden ratio in venation patterns of dragonfly wings* (2023), PMC10185545.
   https://pmc.ncbi.nlm.nih.gov/articles/PMC10185545/
6. Comstock–Needham system summary (Wikipedia, *Insect wing*, "Venation").
7. Wootton / Combes & Daniel background via (2), on vein thickness gradients.

## What the papers establish

### Two kinds of vein, two kinds of process (1, 3)

- **Primary (longitudinal) veins** are positioned deterministically by a prepattern. Their
  relative positions are the same left and right and across the species. They are the
  Comstock–Needham veins: C, Sc, R (R1 + Rs → R2–R5), M (MA/MP → M1–M4), Cu (CuA/CuP), A1–A3.
- **Secondary veins (crossveins)** are placed by a stochastic process *after* the primaries:
  no left/right match in the same individual (1, Fig. 1A), unique on every wing. In Drosophila
  the two crossveins form later than the longitudinals and under separate genetic control (3).
- Consequence for us: roll the longitudinal plan once per family with small positional
  variation; roll the crossveins freely per seed. That is what `growVeins` does; the
  literature confirms the split.

### Longitudinal veins branch by dichotomy at characteristic points (3, 6)

- "The main veins bifurcate at characteristic proximo-distal points, giving rise to
  quasi-parallel branches reaching the wing margin independently" (3, §2). Rs forks
  dichotomously into R2–R5; M into MA/MP then M1–M4; Cu into Cu1/Cu2 (6).
- Between the two branches of any fork there is an interpolated (intercalary) vein of the
  opposite corrugation (6). Visible as the intercalaries of mayflies and odonates.
- Longitudinals normally reach the margin. In Diptera and Hymenoptera some stop short and
  are "joined distally by transverse veins forming closed cells" (3, §5). So closed cells at
  the apex are the exception that defines those two orders; elsewhere the apex is open.
- Vein reduction with small size is by **fusion** of adjacent veins (partial or complete,
  proximal or distal) or **elimination** of branches, not by random deletion (3, §4).
- Thickness: veins are thickest at the base and leading edge and thin distally; primary
  thickness correlates with the spacing of secondary veins around it (1, Fig. 5): thick
  primaries sit in regions of large cells.

### Secondary veins: an inhibitory-field / Voronoi process (1)

- Hypothesis, supported across 232 odonate species and tested on a lacewing and a
  grasshopper: evenly spaced inhibitory centres emerge in each region bounded by primaries;
  secondary veins form at the signal's local minima; this is well approximated by a
  **Voronoi tessellation of evenly spaced seeds**.
- Empirical features that follow (1, Results):
  - secondary veins that terminate in space (free ends) are "extraordinarily rare";
  - **180° joints rarely occur** (a crossvein almost never passes straight through a
    longitudinal; junctions are Y-shaped three-way nodes);
  - domains tend to be the same size as their immediate neighbours (size varies smoothly);
  - **ladders of rectangles between closely spaced parallel primaries, pentagons and hexagons
    where primaries are far apart.**
- Density of inhibitory centres is the one free parameter per region; the model needs it from
  the real wing (or from primary thickness as a proxy).
- Growth: the pattern is laid down on a small convex wing pad, then the wing grows
  anisotropically, which stretches domains along the span near the trailing edge. Cells are
  rounder near the tip, more rectangular at the base.

### Domain geometry across orders (2)

- Sparse venation (Diptera, Hymenoptera) → few large rectangular domains with big
  fractional area; dense venation (Odonata, Orthoptera) → many small round domains.
- Within a wing, odonate domains are rectangular near the base and rounder toward the
  tip; leading edge has few domains, trailing edge hundreds.
- Vein junctions are overwhelmingly degree-3; degree-4 (true crossings) are uncommon.

### Junction angles (5)

- At three-way junctions on dragonfly wings the two angles that are not the largest peak at
  **111°** (fore 111.1°, hind 112.2°). Modelled as golden-ratio partitions of the
  polygon's regular interior angle. Golden-angle junctions concentrate at the trailing edge
  and tip. Practical reading: junction angles sit between 105° and 140°, centred on about
  110–120°, and never 90°.

### Growth algorithms that give these shapes (4)

- Runions et al. grow veins toward auxin sources: each vein node steps by a fixed distance
  in the direction of the **normalised sum of unit vectors toward the sources it is nearest
  to**; sources are removed when a vein comes within a kill distance.
- Branching is emergent: when one vein node is the closest to two sources on different sides,
  the next steps split. "Unnatural sharp angles" appear only when veins step toward one
  source; the averaging over several sources keeps bends smooth.
- **Closed (looping) venation**: a source is allowed to attract several veins (those in its
  *relative neighbourhood*) and is only removed when all of them arrive, so veins meet and
  anastomose. That is the mechanism that produces crossveins joining two longitudinals.
- Vein width by Murray's law: parent radius^n = sum of child radius^n, n ≈ 3, computed from
  the tips back to the base, so width grows smoothly toward the base.

## What this says about the circled artifacts

The jogs in the screenshot come from three things the literature rules out:

1. **Instant deflection at a junction.** Our `deflect` shifted a lane's track by a step over a
   short window at the join point. Real primaries are smooth curves; the "kink" at a cell corner
   is the crossvein meeting at ~110–120°, not the longitudinal changing course. The longitudinal
   bends gently over the whole cell length because the inhibitory field pushes it, not because
   it jumps at the node.
2. **Crossveins drawn perpendicular to the chord.** They are the Voronoi edges between two
   inhibitory centres, so they lean to bisect the segment between two cells and meet each
   longitudinal at an obtuse angle. Tilting the far end along the lane by a fixed `tilt` gets
   this roughly, but the tilt should come from the lane direction so the junction angle, not the
   chord offset, is what is controlled.
3. **Free-ended joins.** A join that lands where two lanes are not yet separated, or lands past
   the open line, produces a dangling segment. The papers say free ends are near-absent.

## Rules for `growVeins` v2

- R-A **Primary plan**: lanes = Comstock–Needham trunks for the order; forks happen at
  characteristic u for each named branch (Rs at 0.2–0.35 of span, M into M1/M2 at 0.5–0.65 …)
  with ±8% jitter; family removes branches by fusion (merge two lanes' targets) or elimination,
  never by random deletion mid-wing. Keep per-order lane tables; let the family pick which
  forks exist.
- R-B **Longitudinal shape**: a lane is a smooth curve (one Catmull–Rom through base, 1–2
  interior control points, target). No per-junction displacement. Curvature genes: bow amount
  and where the bow peaks.
- R-C **Crossveins by sites**: inside each strip between adjacent lanes, place inhibitory
  sites by Poisson-disc with radius = local strip width × k (k ≈ 0.9–1.3; family gene) along
  the strip's axis, then emit the perpendicular bisector segments between consecutive sites,
  clipped to the two lanes. That is the 1-D Voronoi of the strip and yields a ladder of
  near-rectangular cells with obtuse corners when the lanes diverge. Where the strip is wider
  than ~2.2 cells, drop a second row of sites (2-D Voronoi) so pentagons/hexagons appear.
- R-D **Junction angle**: after placing a crossvein, rotate it about its midpoint so both
  end angles lie in [105°, 140°]; reject and resample if impossible.
- R-E **No free ends**: a crossvein exists only if both ends land on lanes that exist at that
  u; stubs are longitudinal only (M, Cu in Hymenoptera; CuA2 in Diptera).
- R-F **Open apex**: joins stop at `uOpen`; family gene (Odonata 1.0, Hymenoptera 0.7–0.9,
  Diptera 0.75, Lepidoptera 0.55 i.e. only the discal cell).
- R-G **Weight**: Murray-style, from tips to base: a lane's weight increases by one level
  after each fork it is parent to; crossveins one level below the lighter of their two lanes.
- R-H **Density gradient**: site radius shrinks toward the trailing edge and tip (1, 2), so
  cells get smaller and rounder there; a per-order factor.

## Open questions

- Hymenoptera and Diptera cell closure: the papers describe it but give no rule for *which*
  longitudinals stop short. Use the family tables (apid: M and Cu stop after the 2nd
  discoidal; ichneumonid: M stops at the areolet …), measured from `ref/`.
- Where exactly Rs leaves R in Hymenoptera (at the basal vein vs under the stigma) differs by
  family; keep as a gene.
