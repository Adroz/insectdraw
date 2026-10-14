#!/usr/bin/env node
// Runs the engine from index.html over many seeds and checks structural invariants.
//
//   node tests/check.js [N | --seeds A-B] [--only name,name]
//
// N (default 3000) checks seeds 1..N; --seeds A-B checks that range instead (the two are exclusive). --only runs just
// the named checks (a name from PRE, CHECKS or POST below; an unknown or empty list exits 2 and lists them, so a
// selection can never pass by running nothing). The invariants are a table of named check functions: CHECKS run per
// seed as (meta, svg, fail, ctx) (a check that returns a promise, as lepInk does, is awaited), where fail(msg) records
// a failure for that seed, ctx.seed is the seed, ctx.sampled
// is true on every SAMPLE-th seed (the gate of the slow extras: part crops, the 800 px device plate) and ctx.dev is
// the device plate at DEV px, drawn once on first use (so a check that never reads it costs nothing). PRE and POST
// run once as (fail), before and after the seed loop, where fail(msg, type) records a seed-0 finding under the
// check's name (or the type given). Adding an invariant is adding one entry; the order of the tables is the order
// the failures are recorded and reported in.
'use strict';
const { loadEngine, engineContract } = require('./engine');
const raster = require('./raster');
const E = loadEngine();

const MESH = new Set(['dragonfly', 'damselfly', 'mayfly', 'grasshopper']);   // orders whose wing sig counts mesh cells
const DEV = 440;   // device plate size the device checks draw at (spec #32, ADR 0001)
const SAMPLE = 50;   // the slow extras (parts, the 800 px device plate) run on every SAMPLE-th seed
const SAMPLED = ['parts', 'device'];   // the checks that read ctx.sampled, for the report
const failures = [];
const typeCount = {};
const wingSigs = {};   // type -> Map(structural wing signature -> count)
const bodySigs = {};   // type -> Map(structural body signature -> count)
let elTotal = 0;
const dipStats = {};   // Diptera family (meta.fam) -> { type, wl, rm, bmcu } per plate (CHECKS.dipAspect), asserted by POST.dipAspect
const DIP_REF = { muscid: 0.40, syrphid: 0.40, tabanid: 0.40, nemato: 0.35, asilid: 0.30, tipulid: 0.30 };   // reference forewing W/L per family (#9)
const DIP_MIN = 15;   // plates a family needs before its median is asserted
// #10, stated here from the references rather than read from the engine's family table, so a wrong table fails the gate
const DIP_RUNG_FAMS = ['muscid', 'syrphid', 'tabanid'];   // the short-rung plan: r-m always drawn, r-m and bm-cu at most DIP_RUNG_MAX
const DIP_RUNG_MAX = 0.06;   // per-plate cap on r-m and bm-cu, fraction of the span
const DIP_BMCU_ALWAYS = ['tabanid', 'asilid'];   // families whose bm cell is always closed by bm-cu
// #11, stated from the references (hym-apis: marginal + SM1-SM3 + ME1-ME2; Vespidae the same plan; hym-ichneumonidae-diagram:
// the areolet, the small cell between 2r-m and the first r-m just past the stigma's distal end), not read from the engine's family table
const HYM_CELLS = { apid: { sub: 3, disc: 2 }, vespid: { sub: 3, disc: 2 } };   // closed submarginal / discoidal cells per family
const HYM_AREOLET = ['ichneumonid'];   // families that always close an areolet
const HYM_AREOLET_MAX = 0.08;   // the areolet is tiny: its two r-m at most this far apart (fraction of the span; ~0.06 on the diagram)
// #12, from the habitus (Apis / Bombus: abdomen broader than the thorax, short legs, the hind tibia a broad corbicula,
// head about as wide as the thorax, three ocelli in a triangle on the vertex; research-antennae: bee scape 0.3-0.4)
const BEE_FAMS = ['apid'];   // the bee families the engine draws; type bee rolls only these, type wasp none
const BEE = { abd: 1.05, tibia: 1.5, head: 0.8, ocelli: 0.6, scape: [0.27, 0.4] };
const beeSeen = { hymFamilies: 0, beeAbdomen: 0, beeLegs: 0, beeCorbicula: 0, beeHead: 0, beeOcelli: 0, beeLattice: 0, beeScape: 0 };   // plates each #12 check asserted on, for POST.beeSeen
let beeSeenPlates = 0;   // bee plates in the run, counted by the seed loop whichever checks are selected
const BEE_MIN = 20;   // bee plates a run needs before a #12 check that never ran fails rather than being reported (~8% of plates are bees; no lattice bee in 20 has odds 0.4^20)
// #19, from the references (neu-nothochrysa: 2-5 rungs in the R1-Rs strip; M beside Rs for ~45% of the span, then forked,
// the intramedian cell a small rhombus between Rs and the fork; Chrysopidae forelegs slender walking legs under the prothorax)
// r1rs: rungs in the R1-Rs strip; forkMin: M forks at or past this fraction of the span; beside: M at most this many R1-Rs
// gaps under Rs before its fork (one cell, as R1-Rs); imMax: the im cell at most this long (span fractions); poses: the
// foreleg pose families; femurMin: the fore femur at most 50 degrees toward the head from straight out (raised is 64-88)
const NEU = { r1rs: [2, 6], forkMin: 0.28, beside: 1.5, imMax: 0.15, poses: ['walking', 'spread'], femurMin: -50 };
const neuSeen = { neuR1Rs: 0, neuMedia: 0, neuForeleg: 0 };   // lacewing plates each #19 check asserted on, for POST.neuSeen
let neuSeenPlates = 0;   // lacewing plates in the run, counted by the seed loop whichever checks are selected
const NEU_MIN = 20;   // lacewing plates a run needs before a #19 check that never ran fails rather than being reported (~8% of plates)
const maxHw = prof => Math.max(...prof.map(p => p[1])), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const hymSeen = {};   // Hymenoptera family -> plates hymCells saw, so POST.hymCells can tell a family that never appears (a rename) from a short run
// #17, from the references (odo-damsel-ris1921: a coenagrionid, two antenodals and the quadrilateral from the arculus;
// Calopterygidae carry an antenodal ladder) and the common names of each family, stated here rather than read from the engine
const ODO_NOUNS = { coenagrionid: ['Bluet', 'Damsel', 'Dancer', 'Forktail', 'Sprite', 'Bluetail', 'Redtail'], calopterygid: ['Demoiselle', 'Jewelwing', 'Rubyspot'] };
const ODO_LADDER_MIN = 5;   // antenodals on a ladder wing (the ticket's 5-9 on the damselflies it calls a ladder)
const ODO_Q_GAP = 0.02;   // the quadrilateral's proximal side within this of the arculus (span fractions)
const odoSeen = {};   // damselfly family -> plates odoAntenodal saw, for POST.odoAntenodal
// #18, from the references (odo-anax-ris1921, odo-dragonfly) and the 2026-10-07 audit, stated here rather than read from the engine:
// mesh cells under 3 plate px read as stipple on the panel (the libellulid end of the cells gene drew ~2 px); an anisopteran
// hindwing is widest at its base, its anal lobe against the body (the chord a tenth of the way out is at least ODO_LOBE of
// the widest, which lies in the basal third); the fore and hind wing outlines meet only near the roots (no overlap past
// ODO_ROOT of the hindwing's span from its root; it ran to 35-40%); the pterostigma is 4-8% of the span (it reached 11-12%)
const ODO_CELL_PX = 3, ODO_LOBE = 0.9, ODO_LOBE_AT = 0.1, ODO_ROOT = 0.15, ODO_STIGMA = 0.08;
const odoRun = { cell: Infinity, cellSeed: 0, overlap: 0, overlapSeed: 0 };   // over the run, for the report (POST.odoMesh)
const ODO_MIN = 40;   // damselfly plates a run needs before a family with no plate fails rather than being reported
const HYM_MIN = 40;   // Hymenoptera plates a run needs before a named family with no plate fails rather than being reported (~0.2% odds of no ichneumonid by chance)
// #13: a lepidopteran plate's wings (meta.lepInkSvg, every element of the wing layer, as on the plate) rasterised at 600 px,
// antialiased ink averaged over every 9 x 9 px window: a window at LEP_INK_MAX or more reads as a black blotch on the 1-bit
// panel. Measured this way on the full plate at 147bbee, the ticket's evidence seeds gave 1067-1570 px of such windows per
// moth and 6617 on butterfly 66 (the audit's 1444-1575 and 7038, on Chromium's raster). A solid window fails when the tone
// layers (hatch, stipple, fringe) put at least LEP_TONE_SHARE of its ink there, i.e. its ink less the line art's alone
// (meta.lepArtSvg: outline, costa, veins, band edges, cross-lines, spot rings). A solid window the line art makes on its own
// (the costa beside Sc and R1, a vein fork) is converging line art, not tone (#67; #14 for the other orders): the
// report counts those plates, the gate does not fail them.
const LEP_INK_MAX = 0.55, LEP_TONE_SHARE = 0.25, LEP_WIN = 9;
const lepInk = {};   // variant -> { n, share, seed, art } over the run, for the report (POST.lepInk)
let lepRun = 0;      // plates lepInk saw (any type), so POST.lepInk can tell a lost variant from a short run
const LEP_MIN = 40;  // lepidopteran plates a run needs before a variant with no plate fails (~0.6^40: no butterfly by chance)
// #14: no two lane centre-lines of a growVeins wing (meta.wingLanes: the drawn lanes and the wall lanes the outline draws, body
// coordinates, one entry per wing) closer than LANE_FLOOR plate px, except within LANE_JOIN px of a junction of the lane, a
// point where it touches another lane (a fork, an end on a neighbour, a node three lanes share), so a Y passes and a bar
// does not; the numbers are stated here rather than read from the engine. Which orders it covers is the registry's
// (ORDERS[type].laneFloor === false opts one out: the moth's wings are #67's, lepInk; the beetle has no lanes).
const LANE_FLOOR = 1.8, LANE_JOIN = 6, LANE_TOUCH = 0.3, LANE_STEP = 0.5;
const laneRun = {};   // type -> { n, worst, seed } over the run: the closest non-junction approach, for the report
// #15: the marks inside an abdominal segment (the segment line and its doubled membrane line, the plain curves, the banded
// / tip-dark hatch, the side ticks or pile) keep ABD_PITCH plate px apart at plate scale, so a narrow plate's segments do
// not read as dark bars and two families never interleave at the rim (the damselfly's S1-S4).
// meta.abdMarks.segs lists each segment's drawn transverse marks (body units: y at the rim, and the bezier midpoint's y on
// the midline for the bowed lines; a tick is compared at the rim only, at its outer end's y); every neighbouring pair but a
// segment line and the membrane line doubling it is held to the floor at both, and the spot and stripe hatch pitches in
// .pitches are too. Not covered: a spot's hatch lines against its own rim, and the tip segment against the outline's tip
// (it has no segment line at its end). The number is stated here, not read from the engine.
const ABD_PITCH = 3;
const abdRun = {};    // type -> { n, worst, seed, at } over the run: the closest pair of abdominal marks, for the report
// #15: on a beetle the elytral striae converge toward the apex (and fan out of a narrow base), and half the beetles carry
// a puncture row between each pair. meta.elytra holds the drawn striae (polylines, body units), the punctures' centres
// and the elytron's outline (closed along the suture); this check measures them itself, point to segment: no stria point
// within ELY_PITCH plate px of another stria or the outline, and no puncture within it of a stria, the outline or another
// puncture. The number is stated here, not read from the engine.
const ELY_PITCH = 3;
const elyRun = { n: 0, worst: Infinity, seed: 0, at: '' };   // over the run: the closest elytral pair, for the report
const median = a => { if (!a.length) return NaN; const b = a.slice().sort((x, y) => x - y), k = b.length >> 1; return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2; };
// breadth over length of a closed outline along its principal axes (the long axis is the first PCA axis)
const pcaAspect = poly => {
  let mx = 0, my = 0; for (const p of poly) { mx += p[0]; my += p[1]; } mx /= poly.length; my /= poly.length;
  let sxx = 0, syy = 0, sxy = 0; for (const p of poly) { const dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy), u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]];
  const ext = d => { const pr = poly.map(p => p[0] * d[0] + p[1] * d[1]); return Math.max(...pr) - Math.min(...pr); };
  return ext(v) / ext(u);
};

// ---- geometry helpers shared by the checks ----
const inPoly = (p, poly) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; };
// half-width of a sampled body profile ([y, hw] every 2 px, rounded to 0.1) at y: 0 outside it, where "outside" past
// the last sample tolerates tol (the thorax sites pass 0.11 for the last sample's rounding, the abdomen sites 0)
const profHw = (prof, y, tol = 0) => {
  if (!prof.length || y < prof[0][0]) return 0;
  const last = prof[prof.length - 1];
  if (y > last[0]) return y - last[0] < tol ? last[1] : 0;
  const k = Math.min(prof.length - 2, Math.floor((y - prof[0][0]) / 2)), a = prof[k], b = prof[k + 1];
  return a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (y - a[0]) / (b[0] - a[0]));
};
const drawn = svg => (svg.match(/<(path|line|polyline|circle)\b/g) || []).length;   // elements drawn on a plate or a part crop
const segsCross = (a, b, c, d) => { const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
const rotAbout = (p, c, deg) => { const a = deg * Math.PI / 180, dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
const skewedPts = leg => leg.pts.map(p => rotAbout(p, leg.pivot, leg.skew));   // the left leg before mirroring: the right leg rotated about its coxa by its skew (plan step 7)
const ANT_LEG_CLEAR = 2.5;   // antLegs: asserted clearance beyond the leg's half width (engine: 3 + the antenna's half width, at least 3.65)
const ptSegDist = (p, u, v) => { const wx = v[0] - u[0], wy = v[1] - u[1], l2 = wx * wx + wy * wy, t = l2 ? Math.max(0, Math.min(1, ((p[0] - u[0]) * wx + (p[1] - u[1]) * wy) / l2)) : 0; return Math.hypot(p[0] - u[0] - wx * t, p[1] - u[1] - wy * t); };
const segDist = (a, b, c, d) => segsCross(a, b, c, d) ? 0 : Math.min(ptSegDist(a, c, d), ptSegDist(b, c, d), ptSegDist(c, a, b), ptSegDist(d, a, b));   // shortest distance between segments ab and cd
// a point in body coordinates to plate coordinates, after the plate scale and fit
const toPlate = (meta, p) => [300 + p[0] * meta.scale, meta.fitted.minY + (p[1] - meta.bbox.minY) * meta.scale];
// the mean ink (1 - grey) of every LEP_WIN x LEP_WIN window of a 600 px raster, indexed by the window's top-left pixel
const inkWindows = async svg => {
  const { data, info } = await raster.grey(svg, 600).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels, k = LEP_WIN, I = new Float64Array((w + 1) * (h + 1)), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += (255 - data[(y * w + x) * ch]) / 255; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
  for (let y = 0; y + k <= h; y++) for (let x = 0; x + k <= w; x++) out[y * w + x] = (I[(y + k) * (w + 1) + x + k] - I[y * (w + 1) + x + k] - I[(y + k) * (w + 1) + x] + I[y * (w + 1) + x]) / (k * k);
  return { win: out, w };
};
const texts = s => (s.match(/<text\b/g) || []).length;
const capSize = svg => +(svg.match(/<text[^>]*font-size="([\d.]+)"/) || [])[1];   // the caption is the first <text> of the plate
// one leg set (right side as drawn, or the left side = each pair rotated about its coxa by its skew before mirroring):
// nothing on the mirror line, nothing inside the abdomen below the thorax, tarsus tips on the plate, no pair crossing
const checkLegSet = (meta, sets, label, fail) => {
  sets.forEach((pts, i) => {
    const pair = meta.legs[i].pair;
    if (pts.some(p => p[0] < 0)) fail(pair + label + ' leg crosses the mirror line');
    for (let k = 3; k + 1 < pts.length; k++) {   // femur tip onward, sampled every 2 px
      const a = pts[k], b = pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
      for (let q = 0; q <= n; q++) { const x = a[0] + (b[0] - a[0]) * q / n, y = a[1] + (b[1] - a[1]) * q / n; if (y > meta.thorax.yBot && x < profHw(meta.abdomen.profile, y) - 0.5) { fail(pair + label + ' leg inside the abdomen'); break; } }
    }
    const [tx, ty] = toPlate(meta, pts[pts.length - 1]);
    if (tx < 0 || tx > 600 || ty < 0 || ty > 600) fail(pair + label + ' tarsus tip outside the plate');
  });
  for (let a = 0; a < sets.length; a++) for (let b = a + 1; b < sets.length; b++) {
    const A = sets[a], Bp = sets[b]; let hit = false;
    for (let k = 2; k + 1 < A.length && !hit; k++) for (let m = 2; m + 1 < Bp.length; m++) if (segsCross(A[k], A[k + 1], Bp[m], Bp[m + 1])) { hit = true; break; }
    if (hit) fail(meta.legs[a].pair + ' and ' + meta.legs[b].pair + label + ' legs cross');
  }
};

// the closest approach (plate px, looked for out to twice the floor) of two lanes of one wing frame away from their
// junctions: { d, a, b }, or null when none comes that close
const laneGap = (frame, scale) => {
  const lanes = frame.lanes.map(l => l.pieces.map(pc => pc.pts.map(p => [p[0] * scale, p[1] * scale])));
  const cs = 2 * LANE_FLOOR, grid = new Map(), key = (i, j) => i * 100003 + j;
  lanes.forEach((pcs, li) => { for (const pts of pcs) for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1];
    for (let gx = Math.floor(Math.min(a[0], b[0]) / cs); gx <= Math.floor(Math.max(a[0], b[0]) / cs); gx++) for (let gy = Math.floor(Math.min(a[1], b[1]) / cs); gy <= Math.floor(Math.max(a[1], b[1]) / cs); gy++) { const k = key(gx, gy); (grid.get(k) || grid.set(k, []).get(k)).push([li, a, b]); } } });
  let worst = null;
  lanes.forEach((pcs, li) => {
    if (frame.lanes[li].wall) return;   // a wall lane is the outline; its distance to a drawn lane is measured from the drawn side
    const S = [];   // samples at most LANE_STEP apart
    for (const pts of pcs) for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / LANE_STEP)); for (let k = 0; k <= n; k++) S.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    const near = new Map(), touch = [];   // other lane -> distance per sample; the lane's junctions
    S.forEach((p, i) => { const gx = Math.floor(p[0] / cs), gy = Math.floor(p[1] / cs);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const [lj, a, b] of grid.get(key(gx + dx, gy + dy)) || []) {
        if (lj === li) continue;
        const d = ptSegDist(p, a, b); let r = near.get(lj); if (!r) near.set(lj, r = new Float64Array(S.length).fill(Infinity)); if (d < r[i]) r[i] = d;
      } });
    S.forEach((p, i) => { for (const r of near.values()) if (r[i] < LANE_TOUCH) { touch.push(p); break; } });
    for (const [lj, r] of near) {
      S.forEach((p, i) => { if (r[i] < cs && (!worst || r[i] < worst.d) && touch.every(t => Math.hypot(p[0] - t[0], p[1] - t[1]) > LANE_JOIN)) worst = { d: r[i], a: frame.lanes[li].id, b: frame.lanes[lj].id }; });
    }
  });
  return worst;
};

// ---- whole-run checks before the seed loop: (fail) => void, fail(msg, type) records a seed-0 finding ----
const PRE = {
  // the engine contract (README "Engine contract", tests/engine.js): one tagged block, the one that exports, DOM-free,
  // the agreed export list; a consumer that scrapes by tag and one that scrapes by module.exports must get the same code
  engine(fail) {
    for (const msg of engineContract()) fail('engine contract: ' + msg);
  },
  // The order registry (#4): ORDERS is the one table every per-order fact lives in, keyed by type in pick order (TYPES
  // is its key list, so the first rng draw indexes the registry). Every entry carries what the sections read: the
  // proportions roll, the abdomen / thorax / head / leg / antenna gene tables, the 5th-percentile head scale, the wing
  // roots the wing block and the tegula read (0-2 fractions of the thorax, forewing first) and the root x factor, the
  // tegula and leg-thickness opt-ins, the wing section function and the name tables. A new order is one entry plus one
  // wing function, so a half entry is a failure here, not a crash a thousand seeds in. The family keys of the override
  // tables (headFams, legs, ant) must be families the entry's proportions roll can produce: a mistyped key would
  // otherwise fall back to the base table silently. proportions is rolled here directly (it is rng-driven, so the
  // module rng is seeded by one plate first) and must set the fields layoutBody and the sections read.
  registry(fail) {
    const rfail = msg => fail('order registry: ' + msg);
    const O = E.ORDERS;
    const frac = x => typeof x === 'number' && x > 0 && x <= 1;
    const range2 = r => Array.isArray(r) && r.length === 2 && r.every(x => typeof x === 'number') && r[0] <= r[1];
    const namesBad = n => !n ? 'missing' : !Array.isArray(n.tails) || !n.tails.length || n.tails.some(t => !Array.isArray(t) || t.length !== 2 || !/^[mfn]$/.test(t[1])) ? 'tails is not a list of [tail, gender]'
      : !n.common || !Array.isArray(n.common.nouns) || !n.common.nouns.length || typeof n.common.base !== 'string' ? 'common has no nouns / base' : null;
    const P_FIELDS = ['headW', 'headH', 'thoraxW', 'thoraxLen', 'abdW', 'abdLen', 'legScale'];   // numbers > 0 after proportions
    if (!O || typeof O !== 'object') return rfail('the engine exports no ORDERS table');
    if (Object.keys(O).join() !== E.TYPES.join()) rfail('TYPES is not the registry key list in order: [' + E.TYPES + '] vs [' + Object.keys(O) + ']');
    E.generateInsect(1);   // seeds the engine's module rng so proportions can be rolled outside a plate
    for (const type of E.TYPES) {
      const o = O[type], f = msg => rfail(type + ': ' + msg);
      if (!o) { f('no entry'); continue; }
      for (const k of ['abd', 'thorax', 'head', 'legs']) if (!o[k] || typeof o[k] !== 'object') f(k + ' gene table missing');
      if (!o.ant || !o.ant.base || !o.ant.base.kinds) f('antenna table has no base kinds');
      if (!(typeof o.headScaleP5 === 'number' && o.headScaleP5 > 0)) f('headScaleP5 missing');
      if (!Array.isArray(o.wingRoots) || o.wingRoots.length > 2 || o.wingRoots.some(t => !(typeof t === 'number' && t >= 0 && t <= 1))) f('wingRoots is not 0-2 fractions of the thorax: ' + JSON.stringify(o.wingRoots));
      else if (o.wingRoots.length === 2 && !(o.wingRoots[0] < o.wingRoots[1])) f('forewing root is not ahead of the hindwing root: ' + JSON.stringify(o.wingRoots));
      if (o.wingRootX !== undefined && !frac(o.wingRootX)) f('wingRootX is not a fraction of the thorax half-width: ' + o.wingRootX);
      if (o.tegula && (!range2(o.tegula.rx) || (o.tegula.hairs !== undefined && !range2(o.tegula.hairs)))) f('tegula is not { rx: [min, max], hairs?: [min, max] }: ' + JSON.stringify(o.tegula));
      if (o.tegula && o.wingRootX === undefined) f('tegula without a wingRootX to sit at');
      if (o.legThick !== undefined && !(typeof o.legThick === 'number' && o.legThick > 0)) f('legThick is not a positive factor: ' + o.legThick);
      if (o.laneFloor !== undefined && typeof o.laneFloor !== 'boolean') f('laneFloor is not a boolean: ' + o.laneFloor);
      if (typeof o.wings !== 'function') f('wings is not a function');
      const nb = namesBad(o.names); if (nb) f('names: ' + nb);
      for (const v of Object.keys(o.variantNames || {})) { const vb = namesBad(o.variantNames[v]); if (vb) f('variantNames.' + v + ': ' + vb); }
      if (typeof o.proportions !== 'function') { f('proportions is not a function'); continue; }
      // roll the proportions: every required field set, and every family the override tables key on is rollable
      const fams = new Set();
      for (let i = 0; i < 400; i++) {
        const P = { variant: null, fam: null, abdOverlap: 8 };
        o.proportions(P); fams.add(P.fam);
        if (i) continue;
        for (const k of P_FIELDS) if (!(typeof P[k] === 'number' && P[k] > 0)) f('proportions leaves P.' + k + ' unset: ' + P[k]);
        for (const k of ['thoraxAnchors', 'abdAnchors']) if (!Array.isArray(P[k]) || P[k].length < 3 || P[k].some(a => !Array.isArray(a) || a.length !== 2)) f('proportions leaves P.' + k + ' unset or malformed');
      }
      for (const [tab, T] of [['headFams', o.headFams || {}], ['legs', o.legs || {}], ['ant', o.ant || {}]])
        for (const k of Object.keys(T)) if (k !== 'base' && !fams.has(k)) f(tab + '.' + k + ' keys a family the proportions roll never produces (rolled: ' + [...fams].filter(Boolean).join('/') + ')');
    }
  },
};

// ---- per-seed checks: (meta, svg, fail, ctx) => void; ctx = { seed, sampled, dev }, dev the device plate at DEV px ----
const CHECKS = {
  // the plate is a drawing: no bad numbers, the same bytes every time, a bodySig, and forcing the rolled type is a no-op
  sanity(meta, svg, fail, { seed }) {
    if (!meta.bodySig) fail('no bodySig');
    if (/NaN|Infinity|undefined|null/.test(svg)) fail('bad number in svg');
    if (E.generateInsect(seed) !== svg) fail('non-deterministic');
    if (E.generateInsectDetailed(seed, { type: meta.type }).svg !== svg) fail('forcing the rolled type changes the drawing');
  },
  // part crops (every SAMPLE-th seed): no bad numbers, something drawn
  parts(meta, svg, fail, { seed, sampled }) {
    if (!sampled) return;
    for (const part of E.PARTS) {
      const p = E.generatePart(seed, meta.type, part).svg;
      if (/NaN|Infinity|undefined/.test(p)) fail('bad number in part svg: ' + part);
      if (drawn(p) < 1) fail('empty part: ' + part);
    }
  },
  // enough drawn, inside the 600 x 600 plate, not shrunk past readability
  fit(meta, svg, fail) {
    const els = drawn(svg);
    if (els < 60) fail('too few elements: ' + els);
    const f = meta.fitted;
    if (f.minX < 0 || f.maxX > 600 || f.minY < 0 || f.maxY > 600) fail('does not fit: ' + JSON.stringify(f));
    if (meta.scale < 0.55) fail('scale too small: ' + meta.scale.toFixed(3));
  },
  // e-ink: stroke widths >= 0.5 after scale, and none of the constructs an e-ink raster cannot show
  eink(meta, svg, fail) {
    const sws = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(x => Number(x[1]) * meta.scale);
    if (sws.some(w => w < 0.49)) fail('stroke width below 0.5 after scale');
    if (/opacity|gradient|filter|url\(/.test(svg)) fail('non-eink construct present');
  },
  // Thorax: the wing block and the tegula root the wings at the registry's wingRoots (t along the thorax; the engine
  // copies them onto meta.thorax.wingRoots, which must agree); the rolled profile must still have width there, and the
  // scutellum must sit inside the body outline (thorax, or the abdomen / elytra where it hangs over the junction, as a
  // beetle's does).
  thorax(meta, svg, fail) {
    const reg = E.ORDERS && E.ORDERS[meta.type], roots = reg ? reg.wingRoots : null;
    if (!roots) fail('no registry entry for the type');
    const th = meta.thorax;
    if (!th.profile || th.profile.length < 3) fail('no thorax profile');
    if (roots && JSON.stringify(th.wingRoots) !== JSON.stringify(roots)) fail('meta.thorax.wingRoots is not the registry\'s: ' + JSON.stringify(th.wingRoots));
    for (const t of roots || []) {
      const hw = profHw(th.profile, th.yTop + t * (th.yBot - th.yTop), 0.11);
      if (hw <= 4) fail('thorax too narrow at a wing root: hw ' + hw.toFixed(1) + ' at t=' + t);
    }
    for (const p of th.scutellum) {
      const hw = p[1] <= th.yBot ? profHw(th.profile, p[1], 0.11) : profHw(meta.abdomen.profile, p[1], 0.11);
      if (Math.abs(p[0]) > hw + 0.6) { fail('scutellum outside the body outline'); break; }
    }
  },
  // Legs: three right legs attached on the thorax outline, and the pose invariants (meta.legs[i].pts is the joint
  // polyline of the right-hand leg: attach, coxa, trochanter, femur tip, tibia tip, tarsomeres, claw tip). The engine
  // re-rolls a pose that breaks these; here we assert the result.
  legs(meta, svg, fail) {
    if (meta.legs.length !== 3) fail('expected 3 right legs, got ' + meta.legs.length);
    for (const leg of meta.legs) {
      if (leg.y < meta.thorax.yTop || leg.y > meta.thorax.yBot) fail(leg.pair + ' leg attaches outside thorax y-range');
      if (leg.x > leg.hw + 0.01) fail(leg.pair + ' coxa starts outside thorax outline');
      if (leg.x < leg.hw * 0.5) fail(leg.pair + ' coxa starts too far inside thorax (' + leg.x.toFixed(1) + ' vs hw ' + leg.hw.toFixed(1) + ')');
      if (leg.hw < 8) fail(leg.pair + ' thorax half-width at attachment suspiciously small: ' + leg.hw.toFixed(1));
    }
    const byPair = {}; for (const leg of meta.legs) byPair[leg.pair] = leg;
    const fr = byPair.front, mi = byPair.mid, hi = byPair.hind;
    if (fr && mi && hi && !(fr.femurTip[1] < mi.femurTip[1] && mi.femurTip[1] < hi.femurTip[1])) fail('femur tips not ordered front < mid < hind along the body');
    // saltatorial hind femur (docs/research-legs-eyes-antennae.md: "hind femur enormous"): it must read as a jumping leg, so
    // it is at least 1.8x as wide as the mid femur and between 3 and 5 times as long as it is wide
    if (meta.type === 'grasshopper' && hi && mi && hi.femW !== undefined) {
      if (hi.femW < 1.8 * mi.femW) fail('grasshopper hind femur only ' + (hi.femW / mi.femW).toFixed(2) + 'x the mid femur width');
      const r = hi.femLen / hi.femW; if (r < 3 || r > 5) fail('grasshopper hind femur length/width ' + r.toFixed(2) + ' outside 3-5');
    }
    checkLegSet(meta, meta.legs.map(l => l.pts), '', fail);
  },
  // mirror skew (plan step 7): the left legs are the right legs rotated 0-6 degrees about their own coxa, then mirrored;
  // the rotated set must hold the same pose invariants as the right legs
  legSkew(meta, svg, fail) {
    if (!meta.legSkew || meta.legSkew.length !== 3) return fail('no legSkew on meta');
    for (const leg of meta.legs) { const a = Math.abs(leg.skew); if (a !== 0 && (a < 2 || a > 6)) fail(leg.pair + ' leg skew ' + leg.skew.toFixed(1) + ' outside 2-6 degrees (or 0)'); }
    checkLegSet(meta, meta.legs.map(skewedPts), ' skewed', fail);
  },
  // Head (meta.head, docs/research-head-eyes.md): every compound eye stays inside the head's bounding box with at most
  // 10% of its extent overhanging on any side (cicada and odonate eyes bulge past the capsule, never past headW), and
  // every ocellus lies inside the drawn head outline.
  head(meta, svg, fail) {
    const h = meta.head;
    if (!h || !h.outline || h.outline.length < 8 || !h.eyes.length) return fail('no head outline / eyes in meta.head');
    const x0 = -h.W / 2, x1 = h.W / 2, y0 = h.top, y1 = h.top + h.H;
    for (const e of h.eyes) {
      const a = (e.rot || 0) * Math.PI / 180, ex = Math.hypot(e.rx * Math.cos(a), e.ry * Math.sin(a)), ey = Math.hypot(e.rx * Math.sin(a), e.ry * Math.cos(a));
      const overX = Math.max(x0 - (e.cx - ex), (e.cx + ex) - x1) / (2 * ex), overY = Math.max(y0 - (e.cy - ey), (e.cy + ey) - y1) / (2 * ey);
      if (overX > 0.1 || overY > 0.1) { fail('eye overhangs the head bbox by more than 10%: ' + Math.round(Math.max(overX, overY) * 100) + '%'); break; }
    }
    for (const o of h.ocelli) if (![[o[0] - o[2], o[1]], [o[0] + o[2], o[1]], [o[0], o[1] - o[2]], [o[0], o[1] + o[2]]].every(p => inPoly(p, h.outline))) { fail('ocellus outside the head outline'); break; }
  },
  // Antenna invariants (meta.antennae.pts: shaft samples plus the far ends of club, rami, lamellae and arista of the
  // right-hand antenna). The left antenna is the mirror image, so no point may reach the mirror line; the tip must
  // land on the plate. The engine re-rolls the pose and falls back to a forward pose; here we assert the result.
  antennae(meta, svg, fail) {
    const an = meta.antennae;
    if (!an || !an.pts || an.pts.length < 2) return fail('no antenna geometry');
    if (an.pts.some(p => p[0] < 0.5)) fail('antenna crosses the mirror line (' + an.kind + ' ' + an.pose + ')');
    const [tx, ty] = toPlate(meta, an.tip);
    if (tx < 0 || tx > 600 || ty < 0 || ty > 600) fail('antenna tip outside the plate');
    if (!meta.bodySig.includes(an.kind)) fail('antenna kind missing from bodySig');
    // wings (#6): the antennae are drawn after the wings and the pose is re-rolled until no sampled point of the right
    // antenna lies inside any wing, elytron or tegmen outline (meta.wingOutlines, right side, body coordinates)
    const wings = meta.wingOutlines || [];
    if (!wings.length) fail('no wing outlines on meta');
    if (wings.some(poly => an.pts.some(p => inPoly(p, poly)))) fail('antenna point inside a wing outline (' + an.kind + ' ' + an.pose + ')');
  },
  // antennae vs legs (#7, research-antennae R-D): in every leg pose, no segment of the right antenna's centre-lines
  // (meta.antennae.lines: shaft, scape, club axis, arista, style, every ramus and lamella) comes within the leg's half
  // width + ANT_LEG_CLEAR of a leg segment (femur onward) that reaches ahead of the thorax, on the right legs and on
  // the skewed left set. Beside the body (both ends of the antenna segment below the thorax top) the antenna lies over
  // the legs, as on a plate. The engine holds 3 px + both half widths (the antenna's at least 0.65) and re-rolls the
  // pose; here we assert the result with a margin for float rounding, so a regression toward 2 px is caught.
  antLegs(meta, svg, fail) {
    const an = meta.antennae, yTop = meta.thorax.yTop;
    if (!an || !an.lines || !an.lines.length) return fail('no antenna centre-lines on meta');
    for (const ln of an.lines) if (!(ln.w > 0) || !ln.pl || ln.pl.length < 2) return fail('antenna centre-line without a width or two points (' + an.kind + ')');
    for (const [label, get] of [['', leg => leg.pts], [' skewed', skewedPts]]) for (const leg of meta.legs) {
      if (!leg.segHw || leg.segHw.length !== leg.pts.length - 1 || leg.segHw.some(h => !(h >= 0))) return fail('no per-segment half widths on meta.legs');
      const pts = get(leg);
      for (let k = 2; k + 1 < pts.length; k++) {
        if (Math.min(pts[k][1], pts[k + 1][1]) >= yTop + 4) continue;
        for (const ln of an.lines) for (let i = 0; i + 1 < ln.pl.length; i++) {
          const a = ln.pl[i], b = ln.pl[i + 1];
          if (a[1] > yTop && b[1] > yTop) continue;
          const d = segDist(a, b, pts[k], pts[k + 1]);
          if (d < leg.segHw[k] + ANT_LEG_CLEAR) return fail('antenna within ' + d.toFixed(1) + ' of the' + label + ' ' + leg.pair + ' leg ahead of the thorax (' + an.kind + ' ' + an.pose + ', legs ' + meta.legRoll.pose + ')');
        }
      }
    }
  },
  // #12 the caption and the drawing agree: type bee draws bee families only and type wasp none of them
  hymFamilies(meta, svg, fail) {
    if (meta.type !== 'bee' && meta.type !== 'wasp') return;
    beeSeen.hymFamilies++;
    if (meta.type === 'bee' && !BEE_FAMS.includes(meta.fam)) fail('bee plate rolls the non-bee family ' + meta.fam);
    if (meta.type === 'wasp' && BEE_FAMS.includes(meta.fam)) fail('wasp plate rolls the bee family ' + meta.fam);
  },
  // #12 bees read as bees, one entry per trait of the habitus (Apis / Bombus); each counts the plates it asserted on in
  // beeSeen, so POST.beeSeen fails a long run where one of them never ran.
  // the abdomen broader than the thorax
  beeAbdomen(meta, svg, fail) {
    if (meta.type !== 'bee') return;
    beeSeen.beeAbdomen++;
    const r = maxHw(meta.abdomen.profile) / maxHw(meta.thorax.profile);
    if (r < BEE.abd) fail('bee abdomen ' + r.toFixed(2) + 'x the thorax width (want >= ' + BEE.abd + ')');
  },
  // short legs: no leg (femur + tibia + tarsus) longer than the abdomen
  beeLegs(meta, svg, fail) {
    if (meta.type !== 'bee') return;
    beeSeen.beeLegs++;
    const abLen = meta.abdomen.yBot - meta.abdomen.yTop;
    for (const leg of meta.legs) {   // pts: attach, coxa, trochanter, femur tip, tibia tip, tarsomeres, claw tip
      let len = 0; for (let k = 2; k + 2 < leg.pts.length; k++) len += dist(leg.pts[k], leg.pts[k + 1]);
      if (len > abLen) fail('bee ' + leg.pair + ' leg ' + (len / abLen).toFixed(2) + 'x the abdomen length (want <= 1)');
    }
  },
  // the hind tibia a corbicula (the engine draws its fringe and comb rows), BEE.tibia times the mid tibia's width
  beeCorbicula(meta, svg, fail) {
    if (meta.type !== 'bee') return;
    beeSeen.beeCorbicula++;
    if (!meta.bodyGenes.legs[2].corbicula) fail('bee hind leg without the fringed corbicula');
    const hind = meta.legs.find(l => l.pair === 'hind'), mid = meta.legs.find(l => l.pair === 'mid');
    if (hind.segHw[3] < BEE.tibia * mid.segHw[3]) fail('bee hind tibia only ' + (hind.segHw[3] / mid.segHw[3]).toFixed(2) + 'x the mid tibia width (want >= ' + BEE.tibia + ')');
  },
  // a head nearly as wide as the thorax
  beeHead(meta, svg, fail) {
    if (meta.type !== 'bee') return;
    beeSeen.beeHead++;
    const r = meta.head.W / (2 * maxHw(meta.thorax.profile));
    if (r < BEE.head) fail('bee head ' + r.toFixed(2) + 'x the thorax width (want >= ' + BEE.head + ')');
  },
  // three ocelli in a triangle on the vertex, not a row: the laterals behind the median by BEE.ocelli of their offset
  beeOcelli(meta, svg, fail) {
    if (meta.type !== 'bee') return;
    beeSeen.beeOcelli++;
    const oc = meta.head.ocelli;
    if (oc.length !== 3) return fail('bee with ' + oc.length + ' ocelli');
    const med = oc.find(o => Math.abs(o[0]) < 1e-9), lat = oc.find(o => o[0] > 0);
    if (!med || !lat || lat[1] - med[1] < BEE.ocelli * lat[0]) fail('bee ocelli are not a triangle: height ' + (med && lat ? ((lat[1] - med[1]) / lat[0]).toFixed(2) : '?') + ' of the lateral offset (want >= ' + BEE.ocelli + ')');
  },
  // a lattice eye is worked over the whole eye, the highlight included (before #12 the highlight was left bare, so
  // the honeycomb sat on the lower inner part only): every lattice eye draws cells inside its highlight
  beeLattice(meta, svg, fail) {
    if (meta.type !== 'bee' || meta.bodyGenes.head.eye.style !== 'lattice') return;
    beeSeen.beeLattice++;
    for (const e of meta.head.eyes) {
      if (!(e.hlCells >= 0)) fail('bee lattice eye without hlCells on meta.head.eyes');
      else if (e.hlCells < 1) fail('bee eye lattice leaves its highlight unworked');
    }
  },
  // a geniculate antenna whose scape is about a third of it (research-antennae: bee scape 0.3-0.4)
  beeScape(meta, svg, fail) {
    if (meta.type !== 'bee') return;
    beeSeen.beeScape++;
    const an = meta.antennae;
    if (an.kind !== 'geniculate') return fail('bee antenna is ' + an.kind + ', not geniculate');
    const pl = an.lines[0].pl; let fl = 0; for (let i = 1; i < pl.length; i++) fl += dist(pl[i], pl[i - 1]);   // pts: base, elbow, pedicel tip; lines[0].pl the flagellum
    const scape = dist(an.pts[0], an.pts[1]), share = scape / (scape + dist(an.pts[1], an.pts[2]) + fl);
    if (share < BEE.scape[0] || share > BEE.scape[1]) fail('bee scape ' + share.toFixed(2) + ' of the antenna (want ' + BEE.scape.join('-') + ')');
  },
  // swallowtail: the hindwing veins must not converge into the tail root; the two vein endpoints nearest the tail tip must be
  // at least 6% of the span apart from each other (the engine exposes meta.lepHindEnds and meta.lepTail when a tail is rolled)
  swallowtail(meta, svg, fail) {
    if (!(meta.type === 'moth' && meta.lepTail && meta.lepHindEnds)) return;
    const tip = meta.lepTail.tip, W = meta.lepTail.W;
    const near = meta.lepHindEnds.map(p => ({ p, d: Math.hypot(p[0] - tip[0], p[1] - tip[1]) })).sort((a, b) => a.d - b.d).slice(0, 2);
    if (near.length === 2) { const sep = Math.hypot(near[0].p[0] - near[1].p[0], near[0].p[1] - near[1].p[1]); if (sep < W * 0.06) fail('swallowtail: two hindwing veins converge at the tail root (' + (sep / W).toFixed(3) + ' of span apart)'); }
    const atTip = meta.lepHindEnds.filter(p => Math.hypot(p[0] - tip[0], p[1] - tip[1]) < W * 0.02).length;
    if (atTip !== 1) fail('swallowtail: ' + atTip + ' hindwing veins end at the tail tip (want exactly one, ref lep-papilio)');
  },
  // Device plate (spec #32, ADR 0001): generateInsect(seed, { devicePx }) draws the same insect with every stroke weight
  // clamped to >= DEVICE.strokePx device px and every hatch / mesh pitch to >= DEVICE.pitchPx device px, in plate units
  // floor x 600 / devicePx (DEVICE is the engine's exported contract). The option adds no rng draw: pass 2 re-rolls the
  // type / variant and bodySig from the same stream, so their equality is a real assertion. meta.wingSig / wingStats are
  // pass 1's by construction (the engine copies them, so their equality only checks the copy); pass 2's own are on
  // meta.device and are held to the venation rules in the wings check. The pitch is read from meta.minPitch, which every
  // pitch site reports after its clamp (plate px, i.e. after the plate scale), so the default plate must report one too
  // or the number is dead. The caption subtitle (11 px) is dropped when it would fall under DEVICE.subtitleMinPx device
  // px (devicePx < 600 x subtitleMinPx / 11, i.e. 546): absent at 440, present with no option and at 800. The binomial
  // stays, floored at 24 device px on a device plate (ticket #38, ADR 0001): 32.7 plate px at 440, 18 at 800, 16
  // (unchanged) with no option. Worked examples, not the engine's formula, so a wrong constant cannot agree with itself.
  // The gate (tests/eink.js) measures that the caption reads after the threshold. The 800 px plate is drawn on the
  // sampled seeds only.
  device(meta, svg, fail, { seed, sampled, dev }) {
    const devK = 600 / DEV, D = E.DEVICE, dm = dev.meta;
    if (dm.type !== meta.type || dm.variant !== meta.variant) fail('device plate rolls a different type');
    if (dm.bodySig !== meta.bodySig) fail('device plate rolls a different bodySig');
    if (dm.wingSig !== meta.wingSig) fail('device plate does not carry the default wingSig');
    if (!dm.device || dm.device.px !== DEV || dm.device.strokeFloor !== D.strokePx * devK) fail('device plate reports no meta.device');
    if (dm.scale !== meta.scale) fail('device plate has a different plate scale (a floored site moved the bounding box)');
    if (E.generateInsect(seed, { devicePx: DEV }) !== dev.svg) fail('device plate non-deterministic');
    if (/NaN|Infinity|undefined|null/.test(dev.svg)) fail('bad number in device svg');
    if (/opacity|gradient|filter|url\(/.test(dev.svg)) fail('non-eink construct present on the device plate');
    const dsw = [...dev.svg.matchAll(/stroke-width="([\d.]+)"/g)].map(x => Number(x[1]) * dm.scale);
    if (!dsw.length) fail('device plate has no strokes');
    if (dsw.some(w => w < D.strokePx * devK - 0.01)) fail('device stroke width below ' + D.strokePx + ' device px: ' + Math.min(...dsw).toFixed(3) + ' plate px');
    if (!(typeof meta.minPitch === 'number' && isFinite(meta.minPitch) && meta.minPitch > 0)) fail('default plate reports no minPitch');
    if (!(typeof dm.minPitch === 'number' && isFinite(dm.minPitch) && dm.minPitch > 0)) fail('device plate reports no minPitch');
    else if (dm.minPitch < D.pitchPx * devK - 0.01) fail('device hatch pitch below ' + D.pitchPx + ' device px: ' + dm.minPitch.toFixed(3) + ' plate px');
    if (texts(svg) !== 2) fail('default plate caption is not binomial + subtitle');
    if (texts(dev.svg) !== 1) fail('device plate at 440 keeps the subtitle');
    if (!dev.svg.includes(meta.name.binomial.replace(/&/g, '&amp;'))) fail('device plate lost the binomial');
    if (sampled && texts(E.generateInsect(seed, { devicePx: 800 })) !== 2) fail('device plate at 800 drops the subtitle');
    if (capSize(svg) !== 16) fail('default plate binomial is not 16 px');
    if (capSize(dev.svg) !== 32.7) fail('device plate binomial at 440 is ' + capSize(dev.svg) + ' px, not 32.7');
    if (sampled && capSize(E.generateInsect(seed, { devicePx: 800 })) !== 18) fail('device plate binomial at 800 is not 18 px');
  },
  // grown venation (every winged type: bee / wasp / fly / cranefly / dragonfly / damselfly / lacewing / mayfly /
  // grasshopper / cicada / moth): every crossvein junction is obtuse within R-D's band, no crossvein is dropped more
  // often than one is placed, and nothing in the wings layer degenerates to a single-point polyline. The angle band is
  // asserted on the rungs placed by the slide rule (minAngle / maxAngle are measured on those); the edges of the
  // multi-row Voronoi regions (Odonata, the grasshopper archedictyon) are the research model itself and are slid toward
  // the band where possible but never dropped, so they are exempt, as are structural obliques with their own band (the
  // odonate triangle side and bridge, the middle piece of the lepidopteran discocellular). A moth plate's only joins
  // are the six discocellular pieces, and a piece the rule cannot place is drawn straight between its nodes so the
  // cell still closes, so the drop-count test does not apply to it.
  // The same rules run on the device plate's own stats (meta.device.wingStats, pass 2's): the pitch floor may thin a
  // ladder or a mesh, but never past the research minimums, and never into a bad junction or a dangling piece.
  // Diptera wing outline (#9): collects each fly / crane fly forewing's breadth over length (PCA of the outline, so the
  // posture and the root do not count) and its r-m and bm-cu lengths as fractions of the span (wingStats.rm / .bmcu, as
  // drawn); the medians are asserted per family in POST.dipAspect
  dipAspect(meta, svg, fail) {
    if (meta.type !== 'fly' && meta.type !== 'cranefly') return;
    if (!meta.fam) return fail('Diptera plate has no meta.fam');
    const s = meta.wingStats || {}, fam = meta.fam, o = dipStats[fam] ||= { type: meta.type, wl: [], rm: [], bmcu: [] };
    o.wl.push(pcaAspect(meta.wingOutlines[0]));
    if (typeof s.rm !== 'number') return fail('Diptera wingStats has no r-m length');
    if (s.rm > 0) o.rm.push(s.rm);
    if (s.bmcu > 0) o.bmcu.push(s.bmcu);
  },
  // Diptera short rungs (#10): Tabanidae and Asilidae always close bm with bm-cu, and on the muscid / syrphid / tabanid
  // plan r-m and bm-cu are short rungs on every plate, never a long oblique (dip-eristalis: ~5.5% of the span)
  dipRungs(meta, svg, fail, { dev }) {
    if (meta.type !== 'fly' || !meta.fam) return;
    const fam = meta.fam, rungs = DIP_RUNG_FAMS.includes(fam);
    const one = (s, what) => {
      if (!s) return fail(what + 'Diptera ' + fam + ' wing has no wingStats');
      if (rungs && !(s.rm > 0)) fail(what + 'Diptera ' + fam + ' wing has no r-m (br left open)');
      if (DIP_BMCU_ALWAYS.includes(fam) && !(s.bmcu > 0)) fail(what + 'Diptera ' + fam + ' wing has no bm-cu (bm left open)');
      if (rungs && (s.rm > DIP_RUNG_MAX || s.bmcu > DIP_RUNG_MAX)) fail(what + 'Diptera ' + fam + ' crossvein too long: r-m ' + (s.rm || 0).toFixed(3) + ', bm-cu ' + (s.bmcu || 0).toFixed(3) + ' of the span (max ' + DIP_RUNG_MAX + ')');
    };
    one(meta.wingStats, '');
    one(dev.meta.device.wingStats, 'device plate: ');   // pass 2's geometry, as the wings check reads it
  },
  // Hymenoptera cell plan (#11): the Rs-M band holds the named submarginal cells and the M-Cu band the discoidals, never
  // an even ladder (wingStats.submarginal / .discoidal count the closed cells, rungs included); the ichneumonid closes its
  // areolet, a tiny cell (wingStats.areolet / .areoletLen); and no hindwing vein fades out in the membrane (wingStats.hStubs,
  // every family)
  hymCells(meta, svg, fail, { dev }) {
    if (meta.type !== 'bee' && meta.type !== 'wasp') return;
    if (!meta.fam) return fail('Hymenoptera plate has no meta.fam');
    const fam = meta.fam, want = HYM_CELLS[fam];
    hymSeen[fam] = (hymSeen[fam] || 0) + 1;
    const one = (s, what) => {
      if (!s || typeof s.submarginal !== 'number' || typeof s.discoidal !== 'number') return fail(what + 'Hymenoptera wingStats has no submarginal / discoidal count');
      if (want && (s.submarginal !== want.sub || s.discoidal !== want.disc)) fail(what + 'Hymenoptera ' + fam + ' cell plan: ' + s.submarginal + ' submarginal / ' + s.discoidal + ' discoidal cells (want ' + want.sub + ' / ' + want.disc + ')');
      if (HYM_AREOLET.includes(fam) && !(s.areolet && s.areoletLen <= HYM_AREOLET_MAX)) fail(what + 'Hymenoptera ' + fam + ' wing has no areolet' + (s.areolet ? ' (the cell is ' + s.areoletLen.toFixed(3) + ' of the span long, max ' + HYM_AREOLET_MAX + ')' : ''));
      if (s.hStubs !== 0) fail(what + 'Hymenoptera hindwing vein ends in the membrane (' + s.hStubs + ' stub lanes)');
    };
    one(meta.wingStats, '');
    one(dev.meta.device.wingStats, 'device plate: ');   // pass 2's geometry
  },
  // Odonata diagnostic cells (#17): every anisopteran wing closes its discoidal triangle and every zygopteran its
  // quadrilateral, and every odonate wing has its subnodus (odo-anax-ris1921, odo-damsel-ris1921): wingStats.discoidal and
  // .subnodus count the wings (of 2) where they were placed; the triangle lies distal to the arculus (wingStats.triOff: the
  // smallest distance on a wing from the arculus to the triangle's base, span fractions)
  odoCells(meta, svg, fail, { dev }) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const cell = meta.type === 'dragonfly' ? 'discoidal triangle' : 'quadrilateral';
    const one = (s, what) => {
      if (!s || typeof s.discoidal !== 'number' || typeof s.subnodus !== 'number') return fail(what + 'odonate wingStats has no discoidal / subnodus count');
      if (s.discoidal !== 2) fail(what + 'odonate wing without its ' + cell + ': ' + s.discoidal + ' of 2 wings');
      if (s.subnodus !== 2) fail(what + 'odonate wing without its subnodus: ' + s.subnodus + ' of 2 wings');
      if (meta.type === 'dragonfly' && !(s.triOff > 0)) fail(what + 'dragonfly discoidal triangle not distal to the arculus: ' + (s.triOff === undefined ? 'no triOff' : s.triOff.toFixed(3)) + ' of the span');
    };
    one(meta.wingStats, '');
    one(dev.meta.device.wingStats, 'device plate: ');   // pass 2's geometry
  },
  // Odonata mesh (#18): the narrowest cell laid out on either wing (wingStats.cellMin, body units: the closest two
  // neighbouring sites of a mesh or a ladder, i.e. the cell's width across their shared crossvein) at the plate scale
  odoMesh(meta, svg, fail, { seed }) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const c = meta.wingStats && meta.wingStats.cellMin;
    if (!(typeof c === 'number' && isFinite(c))) return fail('odonate wingStats has no cellMin');
    const px = c * meta.scale;
    if (px < odoRun.cell) { odoRun.cell = px; odoRun.cellSeed = seed; }
    if (px < ODO_CELL_PX) fail('odonate mesh cell ' + px.toFixed(2) + ' px at plate scale (min ' + ODO_CELL_PX + ')');
  },
  // Odonata hindwing (#18): an anisopteran hindwing (meta.wingOutlines[1], body coordinates) has an anal lobe: its chord,
  // measured across the axis from the root (the middle of the outline's points nearest the body) to the farthest point,
  // is widest in the basal third and no narrower than ODO_LOBE of that a tenth of the way out
  odoHindwing(meta, svg, fail) {
    if (meta.type !== 'dragonfly') return;
    const hw = meta.wingOutlines && meta.wingOutlines[1];
    if (!hw) return fail('dragonfly plate has no hindwing outline');
    const xMin = Math.min(...hw.map(p => p[0])), near = hw.filter(p => p[0] < xMin + 1);
    const root = [near.reduce((a, p) => a + p[0], 0) / near.length, near.reduce((a, p) => a + p[1], 0) / near.length];
    const tip = hw.reduce((b, p) => dist(p, root) > dist(b, root) ? p : b, hw[0]), span = dist(tip, root);
    const u = [(tip[0] - root[0]) / span, (tip[1] - root[1]) / span], v = [-u[1], u[0]];
    const chord = t => {   // extent across the axis of the outline's crossings of the station t
      const d = t * span, ys = [];
      for (let i = 0; i < hw.length; i++) {
        const a = hw[i], b = hw[(i + 1) % hw.length], da = (a[0] - root[0]) * u[0] + (a[1] - root[1]) * u[1], db = (b[0] - root[0]) * u[0] + (b[1] - root[1]) * u[1];
        if ((da - d) * (db - d) > 0 || da === db) continue;
        const f = (d - da) / (db - da), q = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        ys.push((q[0] - root[0]) * v[0] + (q[1] - root[1]) * v[1]);
      }
      return ys.length < 2 ? 0 : Math.max(...ys) - Math.min(...ys);
    };
    let best = 0, bestT = 0;
    for (let t = 0.02; t < 0.98; t += 0.01) { const c = chord(t); if (c > best) { best = c; bestT = t; } }
    if (bestT > 1 / 3) fail('dragonfly hindwing widest at ' + Math.round(bestT * 100) + '% of the span, not in the basal third');
    const lobe = chord(ODO_LOBE_AT) / best;
    if (lobe < ODO_LOBE) fail('dragonfly hindwing has no anal lobe: the chord at ' + ODO_LOBE_AT * 100 + '% of the span is ' + lobe.toFixed(2) + ' of the widest (min ' + ODO_LOBE + ')');
  },
  // Odonata wing overlap (#18): no point of either outline (meta.wingOutlines[0..1]) lies inside the other farther than
  // ODO_ROOT of the hindwing's span (body x, root to tip) from the hindwing's root
  odoOverlap(meta, svg, fail, { seed }) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const [fw, hw] = meta.wingOutlines || [];
    if (!fw || !hw) return fail('odonate plate has fewer than two wing outlines');
    const x0 = Math.min(...hw.map(p => p[0])), x1 = Math.max(...hw.map(p => p[0]));
    let far = 0;
    for (const [a, b] of [[fw, hw], [hw, fw]]) for (const p of a) if (inPoly(p, b)) far = Math.max(far, (p[0] - x0) / (x1 - x0));
    if (far > odoRun.overlap) { odoRun.overlap = far; odoRun.overlapSeed = seed; }
    if (far > ODO_ROOT) fail('odonate fore and hind wings overlap to ' + Math.round(far * 100) + '% of the hindwing span (max ' + ODO_ROOT * 100 + '%)');
  },
  // Odonata pterostigma (#18): wingStats.stigma, the longest pterostigma on either wing along the costa, as a fraction of
  // that wing's span (root to apex), is at most ODO_STIGMA
  odoStigma(meta, svg, fail) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const st = meta.wingStats && meta.wingStats.stigma;
    if (typeof st !== 'number') return fail('odonate wingStats has no stigma length');
    if (st > ODO_STIGMA) fail('odonate pterostigma ' + (st * 100).toFixed(1) + '% of the span (max ' + ODO_STIGMA * 100 + '%)');
  },
  // Odonata antenodals as the family cue (#17): a coenagrionid damselfly has exactly two antenodals (Ax1, Ax2) and a
  // calopterygid a ladder, as does every dragonfly (wingStats.antMin / .antMax: the fewest and most antenodals placed on
  // one wing); the common name's noun is one of the drawn family's; and the damselfly quadrilateral starts at the arculus
  // (wingStats.qGap: the largest distance on a wing from the arculus to the quadrilateral's proximal side, span fractions)
  odoAntenodal(meta, svg, fail, { dev }) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const fam = meta.type === 'dragonfly' ? 'anisopteran' : meta.fam;
    if (meta.type === 'damselfly') {
      if (!ODO_NOUNS[fam]) return fail('damselfly plate has no antenodal family (meta.fam ' + fam + ')');
      odoSeen[fam] = (odoSeen[fam] || 0) + 1;
      const words = meta.name.common.split(' '), other = Object.keys(ODO_NOUNS).filter(f => f !== fam).flatMap(f => ODO_NOUNS[f]);
      if (!ODO_NOUNS[fam].some(n => words.includes(n)) || other.some(n => words.includes(n))) fail('damselfly name disagrees with its antenodals: "' + meta.name.common + '" on a ' + fam);
    }
    const one = (s, what) => {
      if (!s || typeof s.antMin !== 'number') return fail(what + 'odonate wingStats has no antenodal count');
      if (fam === 'coenagrionid' && (s.antMin !== 2 || s.antMax !== 2)) fail(what + 'coenagrionid antenodals not exactly 2: ' + s.antMin + '-' + s.antMax);
      if (fam !== 'coenagrionid' && s.antMin < ODO_LADDER_MIN) fail(what + fam + ' antenodal ladder too short: ' + s.antMin + ' (min ' + ODO_LADDER_MIN + ')');
      if (meta.type === 'damselfly' && !(s.qGap <= ODO_Q_GAP)) fail(what + 'damselfly quadrilateral floats off the arculus: ' + (s.qGap === undefined ? 'no qGap' : s.qGap.toFixed(3)) + ' of the span (max ' + ODO_Q_GAP + ')');
    };
    one(meta.wingStats, '');
    one(dev.meta.device.wingStats, 'device plate: ');   // pass 2's geometry
  },
  // #19 lacewing (neu-nothochrysa): the strip under R1 (R1-Rs) carries a few rungs, 2-5 on the reference, never none (Sc,
  // R1 and Rs would read as three ruled parallels) and never the costal ladder's density; the engine reports the
  // forewing's R1-Rs rung count as wingStats.r1rs. Default and device plate (pass 2's geometry).
  neuR1Rs(meta, svg, fail, { dev }) {
    if (meta.type !== 'lacewing') return;
    neuSeen.neuR1Rs++;
    for (const [s, what] of [[meta.wingStats, ''], [dev.meta.device.wingStats, 'device plate: ']]) {
      if (!s || typeof s.r1rs !== 'number') { fail(what + 'lacewing wingStats has no r1rs'); continue; }
      if (s.r1rs < NEU.r1rs[0] || s.r1rs > NEU.r1rs[1]) fail(what + 'lacewing R1-Rs strip rung count outside ' + NEU.r1rs[0] + '-' + NEU.r1rs[1] + ': ' + s.r1rs);
    }
  },
  // #19 lacewing M (neu-nothochrysa): M runs beside Rs from its root, then forks well before the hind margin (no single
  // long diagonal), and the intramedian cell is a small closed cell between Rs and the fork: one Rs-M rung on the stem
  // before the fork, one on the anterior branch after it. wingStats.media: { fork, end (span fractions of the fork and
  // M's margin end), beside (largest M-Rs gap before the fork, in R1-Rs gaps), mpMargin (the posterior branch ends on
  // the outline), im: [u, u] (the two rungs, span fractions, null when one was not placed) }. Default and device plate.
  neuMedia(meta, svg, fail, { dev }) {
    if (meta.type !== 'lacewing') return;
    neuSeen.neuMedia++;
    for (const [s, what] of [[meta.wingStats, ''], [dev.meta.device.wingStats, 'device plate: ']]) {
      const m = s && s.media;
      if (!m) { fail(what + 'lacewing wingStats has no media'); continue; }
      if (!(m.fork >= NEU.forkMin && m.fork < m.end - 0.05)) fail(what + 'lacewing M does not fork from ' + NEU.forkMin + ' of the span and before the margin: fork ' + (+m.fork).toFixed(2) + ', end ' + (+m.end).toFixed(2));
      if (!m.mpMargin) fail(what + 'lacewing M posterior branch does not reach the margin');
      if (!(m.beside <= NEU.beside)) fail(what + 'lacewing M leaves Rs before its fork (max ' + NEU.beside + ' R1-Rs gaps under it): ' + (+m.beside).toFixed(2));
      const im = m.im || [];
      if (!(im[0] < m.fork && im[1] > m.fork)) fail(what + 'lacewing intramedian cell not closed across the M fork: rungs at ' + im.map(u => u === null ? 'none' : u.toFixed(2)).join(', '));
      else if (im[1] - im[0] > NEU.imMax) fail(what + 'lacewing intramedian cell longer than ' + NEU.imMax + ' of the span: ' + (im[1] - im[0]).toFixed(2));
    }
  },
  // #19 lacewing forelegs (Chrysopidae): slender walking legs under the prothorax, not a mantid's raised forelegs. The
  // fore coxa attaches on the prothorax (ahead of the pronotal collar, meta.bodyGenes.thorax.lines[0]), the pose family
  // rolled and drawn is walking or spread (never raised), and the femur (trochanter to femur tip, meta.legs[0].pts) points
  // out from the body no more than NEU.femurMin degrees toward the head; on the right legs and the skewed left set.
  neuForeleg(meta, svg, fail) {
    if (meta.type !== 'lacewing') return;
    neuSeen.neuForeleg++;
    const fr = meta.legs.find(l => l.pair === 'front'), collar = meta.bodyGenes.thorax.lines[0];
    if (!fr || !collar) return fail('lacewing plate has no front leg / pronotal collar');
    const yCollar = meta.thorax.yTop + collar.t * (meta.thorax.yBot - meta.thorax.yTop);
    if (!(fr.y < yCollar)) fail('lacewing fore coxa behind the pronotal collar (want it on the prothorax): y ' + fr.y.toFixed(1) + ', collar ' + yCollar.toFixed(1));
    if (!NEU.poses.includes(meta.bodyGenes.pose) || !NEU.poses.includes(meta.legRoll.pose)) fail('lacewing leg pose not ' + NEU.poses.join(' / ') + ': rolled ' + meta.bodyGenes.pose + ', drawn ' + meta.legRoll.pose);
    for (const [label, pts] of [['', fr.pts], [' skewed', skewedPts(fr)]]) {
      const a = Math.atan2(pts[3][1] - pts[2][1], pts[3][0] - pts[2][0]) * 180 / Math.PI;
      if (a < NEU.femurMin) fail('lacewing' + label + ' fore femur raised more than ' + (-NEU.femurMin) + ' degrees toward the head: ' + (-a).toFixed(0));
    }
  },
  wings(meta, svg, fail, { dev }) {
    const checkWingStats = (s, what) => {
      if (!s) return fail(what + 'no wingStats on a grown wing');
      if (s.joins > 0 && (s.minAngle < 100 || s.maxAngle > 145)) fail(what + 'junction angle outside 100-145: ' + s.minAngle.toFixed(1) + '-' + s.maxAngle.toFixed(1));
      if (meta.type !== 'moth' && s.dropped > s.joins) fail(what + 'more crossveins dropped than placed: ' + s.dropped + ' > ' + s.joins);
      if ((meta.type === 'dragonfly' || meta.type === 'damselfly') && s.rungs < 40) fail(what + 'too few ladder rungs on an odonate: ' + s.rungs);
      if (meta.type === 'mayfly' && s.rungs < 60) fail(what + 'too few ladder rungs on a mayfly: ' + s.rungs);
      if (meta.type === 'lacewing' && s.rungs < 40) fail(what + 'too few rungs on a lacewing: ' + s.rungs);
      if (meta.type === 'cicada' && s.joins < 4) fail(what + 'cicada nodal line incomplete: ' + s.joins + ' joins');
    };
    if (meta.type !== 'beetle') {
      checkWingStats(meta.wingStats, '');
      checkWingStats(dev.meta.device.wingStats, 'device plate: ');
      // pass 2's own signature: a mesh order (odonata, mayfly, the grasshopper archedictyon) counts its cells, which the
      // pitch floor coarsens; every other order's sig is lanes, joins and forks, and the device drawing must keep them
      // (measured 2026-10-07: equal on every one of 3000 seeds for those orders)
      if (!dev.meta.device.wingSig) fail('device plate has no wingSig of its own');
      else if (!MESH.has(meta.type) && dev.meta.device.wingSig !== meta.wingSig) fail('device plate draws a different vein plan: ' + dev.meta.device.wingSig);
    }
    const dangling = (layers, what) => { for (const w of layers.wings) { const pl = w.match(/<polyline points="([^"]*)"/); if (pl && pl[1].trim().split(/\s+/).length < 2) fail(what + 'wing polyline with fewer than 2 points'); } };
    dangling(meta.layers, '');
    dangling(dev.meta.layers, 'device plate: ');
  },
  // #14: lanes keep LANE_FLOOR px apart at plate scale away from their junctions (laneGap), on the default plate and on the
  // device plate (heavier strokes, the same centre-lines' floor); every order the registry does not opt out (ORDERS[type].laneFloor === false: the beetle, the moth, #67)
  laneSep(meta, svg, fail, { seed, dev }) {
    if (E.ORDERS[meta.type].laneFloor === false) {   // the registry opts the order out (the beetle, the moth: #67); it must then draw no floored lanes
      if (meta.wingLanes && meta.wingLanes.length) fail('lanes on meta.wingLanes for an order the registry opts out of the lane floor');
      return;
    }
    const o = laneRun[meta.type] ||= { n: 0, worst: Infinity, seed: 0 };
    o.n++;
    for (const [m, what] of [[meta, ''], [dev.meta, 'device plate: ']]) {
      if (!m.wingLanes || !m.wingLanes.length) { fail(what + 'no lane polylines on meta.wingLanes'); continue; }
      m.wingLanes.forEach((fr, i) => {
        const w = laneGap(fr, m.scale);
        if (!w) return;
        if (!what && w.d < o.worst) { o.worst = w.d; o.seed = seed; }
        if (w.d < LANE_FLOOR) fail(what + 'lanes fuse: ' + w.a + ' and ' + w.b + ' ' + w.d.toFixed(2) + ' px apart away from a junction (wing ' + i + ', floor ' + LANE_FLOOR + ')');
      });
    }
  },
  // #15: abdominal marks ABD_PITCH px apart at plate scale (meta.abdMarks), on the default plate and on the device plate
  abdPitch(meta, svg, fail, { seed, dev }) {
    const o = abdRun[meta.type] ||= { n: 0, worst: Infinity, seed: 0, at: '' };
    o.n++;
    for (const [m, what] of [[meta, ''], [dev.meta, 'device plate: ']]) {
      const A = m.abdMarks;
      if (!A || !Array.isArray(A.segs) || !Array.isArray(A.pitches)) { fail(what + 'no abdominal marks on meta.abdMarks'); continue; }
      let worst = Infinity, at = '';
      A.segs.forEach((seg, i) => {
        const ms = seg.slice().sort((a, b) => a.y - b.y);
        for (let j = 1; j < ms.length; j++) {
          const a = ms[j - 1], b = ms[j];
          if (a.k === 'edge' && b.k === 'membrane') continue;   // a segment line and the membrane line doubling it are one joint
          let d = (b.y - a.y) * m.scale;
          if (a.mid !== null && b.mid !== null) d = Math.min(d, (b.mid - a.mid) * m.scale);
          if (d < worst) { worst = d; at = 'segment ' + i + ' ' + a.k + '/' + b.k; }
        }
      });
      for (const [site, v] of A.pitches) if (v * m.scale < worst) { worst = v * m.scale; at = site; }
      if (!what && worst < o.worst) { o.worst = worst; o.seed = seed; o.at = at; }
      if (worst < ABD_PITCH - 1e-6) fail(what + 'abdominal marks closer than ' + ABD_PITCH + ' px: ' + worst.toFixed(2) + ' px (' + at + ')');
    }
  },
  // #15: elytral striae and punctures ELY_PITCH px apart at plate scale (meta.elytra), on the default plate and on the device plate
  elytraPitch(meta, svg, fail, { seed, dev }) {
    if (meta.type !== 'beetle') return;
    elyRun.n++;
    const ptSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const toPl = (p, pl) => { let d = Infinity; for (let i = 0; i + 1 < pl.length; i++) d = Math.min(d, ptSeg(p, pl[i], pl[i + 1])); return d; };
    for (const [m, what] of [[meta, ''], [dev.meta, 'device plate: ']]) {
      const Y = m.elytra;
      if (!Y || !Array.isArray(Y.striae) || !Array.isArray(Y.dots) || !Array.isArray(Y.outline)) { fail(what + 'no elytral marks on meta.elytra'); continue; }
      if (!Y.striae.length) fail(what + 'the elytron draws no striae');
      let worst = Infinity, at = '';
      const near = (d, where) => { if (d * m.scale < worst) { worst = d * m.scale; at = where; } };
      Y.striae.forEach((pl, k) => {
        for (const p of pl) {
          near(toPl(p, Y.outline), 'stria ' + k + ' / outline');
          Y.striae.forEach((ql, j) => { if (j > k) near(toPl(p, ql), 'stria ' + k + ' / stria ' + j); });
        }
      });
      Y.dots.forEach((c, i) => {
        near(toPl(c, Y.outline), 'puncture / outline');
        Y.striae.forEach((pl, k) => near(toPl(c, pl), 'puncture / stria ' + k));
        for (let j = i + 1; j < Y.dots.length; j++) near(Math.hypot(c[0] - Y.dots[j][0], c[1] - Y.dots[j][1]), 'puncture / puncture');
      });
      if (!what && worst < elyRun.worst) { elyRun.worst = worst; elyRun.seed = seed; elyRun.at = at; }
      if (worst < ELY_PITCH - 1e-6) fail(what + 'elytral marks closer than ' + ELY_PITCH + ' px: ' + worst.toFixed(2) + ' px (' + at + ')');
    }
  },
  // #13: no lepidopteran wing window reaches LEP_INK_MAX ink at 600 px with the tone layers putting LEP_TONE_SHARE or more
  // of it there (darks keep their tone by hatch pitch, not by stacking a second full family; the hatch keeps off the line
  // art and the other wing; the fringe keeps off the other wing, the costa and the tail). Every lep plate is rasterised
  // twice (sharp, ~60 ms), not a sample, so a blotch on any seed fails the gate.
  async lepInk(meta, svg, fail, { seed }) {
    lepRun++;
    if (meta.type !== 'moth') return;
    if (!meta.lepInkSvg || !meta.lepArtSvg) return fail('no wing rasters (meta.lepInkSvg / lepArtSvg) on a lepidopteran plate');
    const ink = await inkWindows(meta.lepInkSvg), art = (await inkWindows(meta.lepArtSvg)).win;
    let share = 0, at = -1, artSolid = false;
    ink.win.forEach((v, i) => {
      if (v < LEP_INK_MAX) return;
      if (art[i] >= LEP_INK_MAX) artSolid = true;
      if (v - art[i] > share) { share = v - art[i]; at = i; }
    });
    const o = lepInk[meta.variant] ||= { n: 0, share: 0, seed: 0, art: 0 };
    o.n++; if (artSolid) o.art++; if (share > o.share) { o.share = share; o.seed = seed; }
    const c = LEP_WIN >> 1, xy = at < 0 ? '' : (at % ink.w + c) + ',' + (Math.floor(at / ink.w) + c);
    if (share >= LEP_TONE_SHARE) fail('lep wing solid at 1 bit from its tone layers: a ' + LEP_WIN + 'x' + LEP_WIN + ' window at ' + ink.win[at].toFixed(3) + ' ink (max ' + LEP_INK_MAX + '), ' + share.toFixed(3) + ' of it tone (max ' + LEP_TONE_SHARE + '), centred at ' + xy + ' px');
  },
};

// ---- whole-run checks after the seed loop: (fail) => void, fail(msg, type) records a seed-0 finding ----
// Wing uniqueness: every winged type exposes meta.wingSig, a discrete signature of its outline and
// vein plan (counts, cell plan, apex shape ...). Within a type no signature may dominate, otherwise
// plates start to read as repeats when cycling through random seeds.
// Body uniqueness: every plate exposes meta.bodySig (pose family, leg family, attachment, joint angles, armature,
// segment counts ...), held to the same rule so the insect under the wings varies as much as the wings do.
// The body signature carries far more discrete genes (legs, abdomen, thorax) than a wing's, so it is held to a
// stricter floor: at least 98% of a type's plates must be distinct.
const sigStats = m => ({ n: [...m.values()].reduce((a, b) => a + b, 0), top: Math.max(...m.values()) });   // plates counted, largest repeat
const sigReport = sigs => {   // the per-type table printed in the report (seeds, distinct, topShare)
  const report = {};
  for (const key in sigs) {
    const m = sigs[key], { n, top } = sigStats(m);
    report[key] = { seeds: n, distinct: m.size, topShare: Math.round(top / n * 1000) / 10 + '%' };
  }
  return report;
};
const sigRule = (sigs, what, distinctFloor, fail) => {
  for (const key in sigs) {
    const m = sigs[key], { n, top } = sigStats(m);
    if (n < 40) continue;
    if (top / n > 0.1) fail(what + ' signature repeats: one layout covers ' + Math.round(top / n * 100) + '% of ' + key + ' plates', key);
    if (m.size < n * distinctFloor) fail(what + ' signature repeats: only ' + m.size + ' distinct layouts in ' + n + ' ' + key + ' plates', key);
  }
};
const POST = {
  // Diptera wing outline (#9): the median forewing W/L per family within 0.05 of its reference (dip-eristalis 0.40 for
  // the muscid / syrphid / tabanid plan, dip-asilid-photo 0.30, dip-limonia 0.30, and no crane fly median above 0.35;
  // the nematoceran flies have no reference image and take 0.35, between the brachycerans and the crane fly), and the
  // median r-m and bm-cu at most 5% of the span (3-5.5% on the three references; 16-18% before #9). A family needs
  // DIP_MIN plates for its median to mean anything, so a short run reports what it skipped instead of passing silently.
  dipAspect(fail) {
    const skipped = [];
    for (const fam in DIP_REF) {
      const o = dipStats[fam], ref = DIP_REF[fam];
      if (!o || o.wl.length < DIP_MIN) { skipped.push(fam + ' (' + (o ? o.wl.length : 0) + ')'); continue; }
      const wl = median(o.wl), rm = o.rm.length ? median(o.rm) : 1, bmcu = o.bmcu.length ? median(o.bmcu) : 1, t = o.type;
      if (Math.abs(wl - ref) > 0.05) fail('Diptera ' + fam + ' forewing W/L median ' + wl.toFixed(3) + ' is not within 0.05 of the reference ' + ref, t);
      if (fam === 'tipulid' && wl > 0.35) fail('crane fly forewing W/L median ' + wl.toFixed(3) + ' above 0.35', t);
      if (rm > 0.05 || bmcu > 0.05) fail('Diptera ' + fam + ' crossveins too long: r-m ' + rm.toFixed(3) + ', bm-cu ' + bmcu.toFixed(3) + ' of the span (max 0.05)', t);
    }
    console.log('Diptera W/L medians:', Object.keys(dipStats).map(f => f + ' ' + median(dipStats[f].wl).toFixed(3) + ' (n ' + dipStats[f].wl.length + ', r-m ' + median(dipStats[f].rm).toFixed(3) + ', bm-cu ' + median(dipStats[f].bmcu).toFixed(3) + ')').join('; ') +
      (skipped.length ? '; too few plates to assert (< ' + DIP_MIN + '): ' + skipped.join(', ') : ''));
  },
  // hymCells asserts a family only on its own plates, so a family the engine stops producing (a rename) would pass by
  // silence: every named family needs a plate once the run has HYM_MIN Hymenoptera plates; a shorter run reports it.
  hymCells(fail) {
    const total = Object.values(hymSeen).reduce((a, b) => a + b, 0), fams = [...Object.keys(HYM_CELLS), ...HYM_AREOLET];
    const missing = fams.filter(f => !hymSeen[f]);
    if (missing.length && total >= HYM_MIN) fail('no Hymenoptera plate of family ' + missing.join(', ') + ' in ' + total + ' Hymenoptera plates: the cell-plan assertions for it never ran');
    console.log('Hymenoptera cell plans asserted on:', fams.map(f => f + ' ' + (hymSeen[f] || 0)).join(', ') +
      (missing.length && total < HYM_MIN ? '; too few Hymenoptera plates (' + total + ' < ' + HYM_MIN + ') to require ' + missing.join(', ') : ''));
  },
  // the report for CHECKS.odoMesh / odoOverlap: the narrowest odonate mesh cell and the farthest overlap seen
  odoMesh() {
    console.log('odonate mesh: narrowest cell ' + (odoRun.cell === Infinity ? 'none' : odoRun.cell.toFixed(2) + ' px (seed ' + odoRun.cellSeed + ', floor ' + ODO_CELL_PX + ')') +
      '; farthest fore/hind overlap ' + Math.round(odoRun.overlap * 100) + '% of the hindwing span (seed ' + odoRun.overlapSeed + ', max ' + ODO_ROOT * 100 + '%)');
  },
  // odoAntenodal asserts a damselfly family only on its own plates: both need a plate once the run has ODO_MIN damselflies
  odoAntenodal(fail) {
    const total = Object.values(odoSeen).reduce((a, b) => a + b, 0), missing = Object.keys(ODO_NOUNS).filter(f => !odoSeen[f]);
    if (missing.length && total >= ODO_MIN) fail('no damselfly plate of family ' + missing.join(', ') + ' in ' + total + ' damselfly plates: its antenodal assertions never ran');
    console.log('damselfly antenodal families asserted on:', Object.keys(ODO_NOUNS).map(f => f + ' ' + (odoSeen[f] || 0)).join(', ') +
      (missing.length && total < ODO_MIN ? '; too few damselfly plates (' + total + ' < ' + ODO_MIN + ') to require ' + missing.join(', ') : ''));
  },
  // the report for CHECKS.lepInk: plates rasterised per variant, the largest tone share of a solid window, and the plates
  // with a solid window from the line art alone; a run long enough to hold both variants fails without one (never by silence)
  lepInk(fail) {
    const total = Object.values(lepInk).reduce((a, o) => a + o.n, 0), missing = ['moth', 'butterfly'].filter(v => !lepInk[v]);
    if (missing.length && total >= LEP_MIN) fail('no ' + missing.join(' / ') + ' plate in ' + total + ' lepidopteran plates: the lepInk gate never ran on it');
    if (!total && lepRun >= 1000) fail('no lepidopteran plate in ' + lepRun + ' plates: the lepInk gate never ran');
    console.log('lep wing ink (largest tone share of a solid ' + LEP_WIN + 'x' + LEP_WIN + ' window, max ' + LEP_TONE_SHARE + '; plates solid from line art alone):',
      ['moth', 'butterfly'].map(v => lepInk[v] ? v + ' ' + lepInk[v].share.toFixed(3) + ' (seed ' + lepInk[v].seed + ', n ' + lepInk[v].n + ', line art ' + lepInk[v].art + ')' : v + ' none').join('; ') +
      (missing.length && total < LEP_MIN ? '; too few lepidopteran plates (' + total + ' < ' + LEP_MIN + ') to require ' + missing.join(', ') : ''));
  },
  // the report for CHECKS.abdPitch: plates per type and the closest pair of abdominal marks seen
  abdPitch() {
    console.log('abdomen pitch (closest pair of abdominal marks, px; floor ' + ABD_PITCH + '):', Object.keys(abdRun).map(t => t + ' ' + (abdRun[t].worst === Infinity ? 'none' : abdRun[t].worst.toFixed(2) + ' (seed ' + abdRun[t].seed + ', ' + abdRun[t].at + ')') + ' n ' + abdRun[t].n).join('; '));
  },
  // the report for CHECKS.elytraPitch: beetle plates and the closest elytral pair seen
  elytraPitch() {
    console.log('elytral pitch (closest pair of striae / punctures / outline, px; floor ' + ELY_PITCH + '):', elyRun.worst === Infinity ? 'none' : elyRun.worst.toFixed(2) + ' (seed ' + elyRun.seed + ', ' + elyRun.at + ')', 'n ' + elyRun.n);
  },
  // the report for CHECKS.laneSep: plates per type and the closest non-junction approach seen
  laneSep() {
    console.log('lane floor (closest non-junction approach of two lanes, px; floor ' + LANE_FLOOR + '):', Object.keys(laneRun).map(t => t + ' ' + (laneRun[t].worst === Infinity ? '> ' + 2 * LANE_FLOOR : laneRun[t].worst.toFixed(2) + ' (seed ' + laneRun[t].seed + ')') + ' n ' + laneRun[t].n).join('; '));
  },
  // the #12 checks assert only on bee (and wasp) plates, so a short run or a type that stopped drawing would pass them
  // by silence: once the run has BEE_MIN bee plates every one of them must have run; a shorter run reports the counts.
  beeSeen(fail) {
    const bees = beeSeenPlates, idle = Object.keys(beeSeen).filter(k => ran.has(k) && !beeSeen[k]);
    if (idle.length && bees >= BEE_MIN) fail('#12 bee checks that never ran in ' + bees + ' bee plates: ' + idle.join(', '));
    console.log('#12 bee checks asserted on (of ' + bees + ' bee plates):', Object.keys(beeSeen).filter(k => ran.has(k)).map(k => k + ' ' + beeSeen[k]).join(', ') +
      (bees < BEE_MIN ? '; too few bee plates (' + bees + ' < ' + BEE_MIN + ') to require every check' : ''));
  },
  // the #19 checks assert only on lacewing plates: once the run has NEU_MIN of them every selected one must have run
  neuSeen(fail) {
    const n = neuSeenPlates, idle = Object.keys(neuSeen).filter(k => ran.has(k) && !neuSeen[k]);
    if (idle.length && n >= NEU_MIN) fail('#19 lacewing checks that never ran in ' + n + ' lacewing plates: ' + idle.join(', '));
    console.log('#19 lacewing checks asserted on (of ' + n + ' lacewing plates):', Object.keys(neuSeen).filter(k => ran.has(k)).map(k => k + ' ' + neuSeen[k]).join(', ') +
      (n < NEU_MIN ? '; too few lacewing plates (' + n + ' < ' + NEU_MIN + ') to require every check' : ''));
  },
  signatures(fail) {
    sigRule(wingSigs, 'wing', 0.5, fail);
    sigRule(bodySigs, 'body', 0.98, fail);
  },
  // Daily seed: the day boundary is Brisbane midnight (UTC+10, no DST), i.e. 14:00 UTC.
  daily(fail) {
    const dfail = msg => fail('daily seed: ' + msg);
    const before = E.dailySeed(new Date('2026-10-07T13:59:59Z'));   // 23:59:59 Brisbane, 7 Oct
    const after = E.dailySeed(new Date('2026-10-07T14:00:00Z'));    // 00:00:00 Brisbane, 8 Oct
    if (before === after) dfail('instants either side of 14:00 UTC give the same day');
    if (E.brisbaneDay(new Date('2026-10-07T13:59:59Z')) !== '2026-10-07') dfail('brisbaneDay of 13:59:59Z is not 2026-10-07');
    if (E.brisbaneDay(new Date('2026-10-07T14:00:00Z')) !== '2026-10-08') dfail('brisbaneDay of 14:00:00Z is not 2026-10-08');
    if (before !== E.hashString('2026-10-07')) dfail('13:59:59Z is not the Brisbane 2026-10-07 seed');
    if (after !== E.hashString('2026-10-08')) dfail('14:00:00Z is not the Brisbane 2026-10-08 seed');
    if (E.dailySeed(new Date('2026-10-07T02:00:00Z')) !== E.hashString('2026-10-07')) dfail('midday Brisbane instant gives the wrong seed');
    if (E.dailySeed(new Date('2026-10-07T20:00:00Z')) !== E.hashString('2026-10-08')) dfail('evening UTC instant is not the next Brisbane day');
    if (E.dailySeed() !== E.dailySeed(new Date())) dfail('no-argument call disagrees with the Date form for now');
  },
};

// ---- the run: arguments, the seed loop over the selected checks, the report ----
const NAMES = [...Object.keys(PRE), ...Object.keys(CHECKS), ...Object.keys(POST)];
function parseArgs(argv) {
  let n = null, from = 1, to = null, only = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') {
      only = (argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!only.length) throw new Error('--only wants a comma-separated list of check names; the checks are: ' + NAMES.join(', '));
    } else if (a === '--seeds') {
      const m = /^(\d+)-(\d+)$/.exec(argv[++i] || '');
      if (!m) throw new Error('--seeds wants a range A-B');
      from = +m[1]; to = +m[2];
    } else if (/^\d+$/.test(a)) n = +a;
    else throw new Error('unknown argument ' + a);
  }
  if (n !== null && to !== null) throw new Error('give N (seeds 1..N) or --seeds A-B, not both');
  if (to === null) to = n === null ? 3000 : n;
  if (from < 1 || to < from) throw new Error('--seeds range must be ascending and start at 1 or above');
  const bad = (only || []).filter(x => !NAMES.includes(x));
  if (bad.length) throw new Error('unknown check(s) ' + bad.join(', ') + '; the checks are: ' + NAMES.join(', '));
  return { from, to, only };
}
const selected = (table, only) => Object.keys(table).filter(k => !only || only.includes(k));
const POST_FOR = { beeSeen: Object.keys(beeSeen), neuSeen: Object.keys(neuSeen) };   // a POST entry that also runs when a check it audits is selected
const ran = new Set();   // the CHECKS this run selected, so a POST audit asks only about those
const onceFail = name => (msg, type) => failures.push({ seed: 0, type: type || name, msg });   // fail for a PRE / POST entry

async function run() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  const { from, to, only } = args, count = to - from + 1;
  const pre = selected(PRE, only), checks = selected(CHECKS, only);
  const post = Object.keys(POST).filter(k => !only || only.includes(k) || (POST_FOR[k] || []).some(c => only.includes(c)));
  for (const k of checks) ran.add(k);
  let sampledCount = 0;
  for (const name of pre) PRE[name](onceFail(name));
  for (let seed = from; seed <= to; seed++) {
    const { svg, meta } = E.generateInsectDetailed(seed);
    const key = meta.variant || meta.type;
    typeCount[key] = (typeCount[key] || 0) + 1;
    if (meta.type === 'bee') beeSeenPlates++;
    if (meta.type === 'lacewing') neuSeenPlates++;
    if (meta.wingSig) { const m = wingSigs[key] ||= new Map(); m.set(meta.wingSig, (m.get(meta.wingSig) || 0) + 1); }
    if (meta.bodySig) { const m = bodySigs[key] ||= new Map(); m.set(meta.bodySig, (m.get(meta.bodySig) || 0) + 1); }
    elTotal += drawn(svg);
    const fail = msg => failures.push({ seed, type: key, msg });
    const sampled = seed % SAMPLE === 0; if (sampled) sampledCount++;
    let devPlate = null;
    const ctx = { seed, sampled, get dev() { return devPlate ||= E.generateInsectDetailed(seed, { devicePx: DEV }); } };
    for (const name of checks) { const r = CHECKS[name](meta, svg, fail, ctx); if (r && r.then) await r; }   // lepInk rasterises (async)
  }
  for (const name of post) POST[name](onceFail(name));

  console.log('seeds checked:', count, ...(from === 1 ? [] : ['(' + from + '-' + to + ')']));
  if (only) console.log('checks run:', [...pre, ...checks, ...post].join(', '));
  // the sampled extras assert nothing on a range with no SAMPLE-th seed: report their count on any --only / --seeds
  // run, and on every run where it is zero, so a short run cannot pass them by silence (the default report is unchanged)
  const sampledRun = checks.filter(k => SAMPLED.includes(k));
  if (sampledRun.length && (only || from !== 1 || !sampledCount))
    console.log('sampled every ' + SAMPLE + 'th seed (' + sampledRun.join(', ') + '):', sampledCount, 'of', count, 'seeds' + (sampledCount ? '' : ' -- the sampled assertions did not run'));
  console.log('type distribution:', typeCount);
  console.log('wing signatures:', sigReport(wingSigs));
  console.log('body signatures:', sigReport(bodySigs));
  console.log('avg elements:', Math.round(elTotal / count));
  console.log('daily seed today:', E.dailySeed());
  if (failures.length) {
    console.log('FAILURES:', failures.length);
    const byMsg = {};
    for (const f of failures) (byMsg[f.seed === 0 ? f.msg : f.msg.split(':')[0]] ||= []).push(f.seed + '(' + f.type + ')');   // whole-file findings (seed 0) keep their full message
    for (const k in byMsg) console.log(' -', k, ':', byMsg[k].length, 'e.g.', byMsg[k].slice(0, 6).join(' '));
    process.exit(1);
  }
  console.log('OK');
}

run().catch(e => { console.error(e); process.exit(1); });
