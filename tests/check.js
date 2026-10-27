#!/usr/bin/env node
// Runs the engine from index.html over many seeds and checks structural invariants.
//
//   node tests/check.js [N | --seeds A-B] [--only name,name] [--jobs J]
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
//
// --jobs J (default: the machine's cores less two, at least 1) runs the seed loop in J worker processes (this file again,
// with the internal --worker flag), each over a contiguous shard of the range; the parent runs PRE, folds the workers'
// run state back into its own in seed order through the RUN_STATE merge table, runs POST and prints the report, the same
// report a serial run prints (tests/parity.js holds that). --jobs 1 is the serial run in this process. A new module-scope
// accumulator a check or the seed loop writes is one line in RUN_STATE, saying how two shards' values combine.
'use strict';
const { loadEngine, engineContract, ENGINE_RE } = require('./engine');
const os = require('os');
const { fork } = require('child_process');
const raster = require('./raster');
const { epithetProblems, repeatedStem, FAM_NOUN_SPEC, hasPhrase, geneProblems, antRare, duplicateShare, DUP_MAX, wingKinds, wingProblems, pigmentWords, namesPigment, PIG_WORD_MIN, tableKey } = require('./names');
const E = loadEngine();

const MESH = new Set(['dragonfly', 'damselfly', 'mayfly', 'grasshopper']);   // orders whose wing sig counts mesh cells
// #23 grasshopper hind femur, measured on docs/ref/leg-orth-femur.jpg (lateral micrograph, 4.4 long per depth, deepest at
// 0.19 of the length) and the PSM 1891 engraving (3.6, deepest at 0.24); see docs/research-legs-eyes-antennae.md
const HIND_FEMUR = { ratio: [3.6, 4.8], peak: [0.12, 0.4], herring: [0.1, 0.8] };
// #23 grasshopper antennae: no plate under this scale because of the antenna alone, the antenna within this many times
// the half width of the rest of the plate, a tetrigid antenna at least this many head widths long
const GRASS_ANT = { scale: 1.0, width: 1.3, tetrigid: 0.5 };
// junction-angle band of the slide-placed rungs, per order (#59, Nik 2026-10-14): every winged order keeps R-D's 100-145;
// the mayfly's rungs meet the veins near-perpendicular, leaning either way (eph-ameletus-li2021, spec Ephemeroptera obs 9),
// so its band is the reference's, about 88-125
const RUNG_BAND = { mayfly: [88, 125] }, RUNG_BAND_ALL = [100, 145];
// #59 mayfly venation, stated from eph-ameletus-li2021 (docs/wing-venation-spec.md, Ephemeroptera; obs numbers in brackets),
// asserted on meta.mayfly (each wing's outline, lanes { id, kind, parent, pl } and rungs [a, b, u], wing-local: x along the
// span from the root, y across it, negative toward the costa). aspect: forewing length over its greatest width (ref 2.5);
// apex: the apex's depth from the front of the wing, a fraction of the width (the costal corner; ref 0.21); deep: where
// the hind margin is deepest, a fraction of the length (ref 0.45); sag: the costa's furthest from its chord between
// sagFrom of the length and the apex, a fraction of the length (nearly straight, ref 0.03) (1); ends: vein ends on the
// margin, branches and long intercalaries (6); stems: veins leaving the base behind R1, at least stemGap of the length
// apart at stemAt (4); forks: branches leaving a stem in the basal half, at least forks of them, before forkMax (4);
// cost: the C-Sc rungs per length over the apical third at least cost times those over the basal half (3); marg: short
// marginal intercalaries in the outer half, at least marg[0], each starting past margFrom of the length and at most
// marg[1] of the length long, and margRung of them closing a cell (10, 7); cub: cubital veinlets, ending before cubEnd
// of the length, each bowed at least cubBow of its chord (8); lean: each lean way on at least this share of the leaning
// rungs and the mean junction angle at most meanMax (9); hind: the hindwing's length over the forewing's (12, 0.33), its
// length over width, the veins behind Sc (R1 and the radiating veins), and the costal process: the costal edge's peak
// between proc[0] and proc[1] of the length with a notch behind it at least notch of the length deep
const EPH = { aspect: [2.2, 2.9], apex: 0.35, deep: [0.35, 0.55], sag: 0.05, sagFrom: 0.1, sagTo: 0.9, ends: [12, 16], stems: [5, 7], stemAt: 0.08, stemGap: 0.012,
  forks: 3, forkMax: 0.55, cost: 1.5, marg: [3, 0.2], margFrom: 0.45, margRung: 0.5, cub: [4, 7], cubEnd: 0.5, cubBow: 0.03, lean: 0.2, meanMax: 110,
  hind: { len: [0.2, 0.38], aspect: [1.3, 2.0], veins: [7, 10], proc: [0.05, 0.3], notch: 0.02 },
  // #21: the apex (no outline point more than apexOver of the length in front of the costal tangent taken over 0.7-0.85 of
  // the length; the tightest bend past 0.85 a circle of at least apexR of the length through points apexArc either side);
  // open cells (no gap between neighbouring rungs of a strip more than `open` times the strip's median gap)
  apexOver: 0.001, apexR: 0.03, apexArc: 0.015, open: 3, openMin: 4 };
// #50 mayfly habitus (docs/research-ephemeroptera-habitus.md, refs eph-hab-*), read off the drawn plate and meta.mayfly
// ({ fam, sex, hindClass (the hindwing size class), tails: { n, splay (class), pts: [outer, middle?] } (right side, body
// coordinates), tergites: { kind, polys } }):
// - fams: the four families, each with its tail count (tails) and the hindwing classes it may draw (hindFams); the
//   forewing's length to width on a caenid (broad forewings) in caenidAspect, every other family keeps EPH.aspect;
// - hind: the hindwing's length over the forewing's per size class (large is #59's EPH.hind.len), and a small one's
//   veins behind Sc (smallVeins) and length to width (smallAspect);
// - tailLen: each tail's drawn length over the abdomen's, splay: the outer tail's root-to-tip chord off straight back,
//   per splay class, in degrees (splayTol either side); every tail point inside the plate's fitted box (they count
//   toward the fit);
// - habitus, on the drawn outlines: a heptageniid's head at least headBroad x the thorax's width and its abdomen at
//   least abdBroad x it (flattened), a baetid's abdomen at most abdSlender x it, a caenid's abdomen at most caenidAbd x
//   the forewing's length and an ephemerid's at least ephemeridAbd x it;
// - foreMale / foreFemale: the fore leg (femur to claw) over the mid leg's, at least foreMale on a male, at most
//   foreFemale on a female; a male's fore tarsus ends ahead of the head's front (held forward along the antennae);
// - tergites: the pattern family one of `tergites`; the dorsal triangles each inside the abdomen outline (in by triIn),
//   apex forward, on the midline;
// - share: every family, hindwing class, tail count, sex and splay class on at least this share of a run's mayflies,
//   once the run has shareMin of them
const EPH_HAB = { fams: ['ephemerid', 'baetid', 'heptageniid', 'caenid'], tails: { ephemerid: 3, baetid: 2, heptageniid: 2, caenid: 3 },
  hindFams: { ephemerid: ['large'], heptageniid: ['large'], baetid: ['small', 'absent'], caenid: ['absent'] }, caenidAspect: [1.85, 2.2],
  hind: { large: [0.2, 0.38], small: [0.08, 0.18] }, smallVeins: [2, 4], smallAspect: [1.8, 3.4],
  tailLen: [0.8, 2.5], tailTol: 0.03, splay: { close: [4, 13], spread: [14, 25], wide: [26, 40] }, splayTol: 1.5,
  headBroad: 1.0, abdBroad: 0.72, abdSlender: 0.62, caenidAbd: 0.85, ephemeridAbd: 0.85, foreMale: 1.6, foreFemale: 1.35,
  tergites: ['plain', 'banded', 'spotted', 'striped', 'tipdark', 'triangles'], triIn: 0.3, share: 0.1, shareMin: 100,
  // the wing set (meta.mayfly.set): the forewing's root-to-apex line in body coordinates, degrees below the horizontal
  // (+ toward the tail): pushed forward, square (straight out) or swept back, setTol either side
  sets: { forward: [-26, -12], square: [-10, 1], back: [3, 15] }, setTol: 0.5 };
const ephHab = { fams: {}, hind: {}, tails: {}, sex: {}, splay: {}, sets: {} };   // over the run, for POST.ephShares
const ephSeen = { ephOutline: 0, ephFan: 0, ephCostal: 0, ephMarginal: 0, ephCubital: 0, ephLean: 0, ephHind: 0, ephLanes: 0, ephApex: 0, ephMask: 0, ephForeleg: 0, ephOpen: 0,
  ephFamily: 0, ephHindSize: 0, ephTails: 0, ephForeLen: 0, ephTergites: 0, ephWingSet: 0 };   // mayfly plates each #59 / #21 / #50 check asserted on, for POST.ephSeen
let ephSeenPlates = 0, ephHindPlates = 0;   // mayfly plates (with a hindwing) in the run, counted by the seed loop whichever checks are selected
const EPH_MIN = 20;   // mayfly plates a run needs before a #59 check that never ran fails rather than being reported
// geometry for the #59 checks (wing-local polylines)
const lerp = (a, b, t) => a + (b - a) * t;
const segX = (p, q, a, b) => {   // proper crossing of segments pq and ab
  const o = (u, v, w) => Math.sign((v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]));
  return o(p, q, a) * o(p, q, b) < 0 && o(a, b, p) * o(a, b, q) < 0;
};
const plCross = (A, B) => { for (let i = 0; i + 1 < A.length; i++) for (let j = 0; j + 1 < B.length; j++) if (segX(A[i], A[i + 1], B[j], B[j + 1])) return A[i]; return null; };
const plYat = (pl, x) => { for (let i = 0; i + 1 < pl.length; i++) { const a = pl[i], b = pl[i + 1]; if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return null; };
const ptSegD = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)); return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]); };
const ptPlD = (p, pl, closed) => { let m = Infinity; for (let i = 0; i + 1 < pl.length; i++) m = Math.min(m, ptSegD(p, pl[i], pl[i + 1])); if (closed) m = Math.min(m, ptSegD(p, pl[pl.length - 1], pl[0])); return m; };
const outlineYs = (poly, x) => { const ys = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) ys.push(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])); } return ys; };
const DEV = 440;   // device plate size the device checks draw at (spec #32, ADR 0001)
const SAMPLE = 50;   // the slow extras (parts, the 800 px device plate) run on every SAMPLE-th seed
const SAMPLED = ['parts', 'device'];   // the checks that read ctx.sampled, for the report
let sampledCount = 0;   // SAMPLE-th seeds in the run, for the report
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
// #54: the families drawn on another family's venation plan (research-diptera-habitus.md: the tachinid's is the calyptrate
// muscid plan, the bee fly's R4 / R5 apart with M to the margin as the tabanid's, the conopid's cell r4+5 closed as the syrphid's)
const DIP_PLAN = { tachinid: 'muscid', bombyliid: 'tabanid', conopid: 'syrphid' };
// #55: the crane fly families other than Tipulidae are drawn on the tipulid venation plan (dip-limonia is a limoniid; the
// venation stays as #9 drew it), so their W/L joins the tipulid median
Object.assign(DIP_PLAN, { limoniid: 'tipulid', ctenophorine: 'tipulid', pediciid: 'tipulid' });
// #54 fly wing set (docs/research-diptera-habitus.md, refs dip-hab-*): a set specimen spreads its wings (the angle #9
// drew, theta the root-to-apex line in degrees below the horizontal), a half-folded fly holds them swept back in a delta
// (a tabanid or muscid at rest), and the resting pose most fly plates show folds them back over the abdomen scissor-wise,
// each wing's hind margin over the midline so the pair overlaps there. theta: the wing block's angle per set (meta.wingTheta);
// cross: on a folded plate the right wing reaches at least this far past the midline (it overlaps its mirror image);
// side: and at some y beside the abdomen its outer edge stays at least this far inside the abdomen's side (the sides
// show); share: every set on at least this share of a run's fly plates, asserted once the run has shareMin of them
const DIP_SET = { theta: { spread: [24, 56], half: [58, 72], folded: [94, 118] }, cross: 4, side: 1.5, share: 0.15, shareMin: 100 };
// #54 fly families and their abdomens in dorsal view (docs/research-diptera-habitus.md, refs dip-hab-*), read off the drawn
// outlines: lw is the abdomen's length per its widest width. round (Tachinidae, Bombyliidae): lw at most `round`; long
// (Asilidae): lw at least `long` and tapering, its half width at t 0.8 at most `taper` of the widest; broad (Tabanidae): at
// least `broad` x the thorax's widest and widest in its basal half; petiolate (Conopidae): a waist, its half width over t
// 0.02-0.2 at most `waist` of the widest, and widest behind t `club`; oval (Syrphidae): lw within `oval`, banded or spotted;
// slender (the nematocerans): at most `slender` x the thorax's widest. Every family on at least `share` of a run's fly plates.
const DIP_HAB = { fams: ['muscid', 'nemato', 'syrphid', 'tabanid', 'asilid', 'tachinid', 'bombyliid', 'conopid'], share: 0.06,
  round: 1.45, long: 2.6, taper: 0.65, broad: 1.15, waist: 0.5, club: 0.45, oval: [1.1, 2.3], ovalMarks: ['banded', 'spotted'], slender: 0.85 };
// #54 abdominal macrochaetae (refs dip-hab-tachina: the stout bristles along the hind margins of the tergites standing out
// past the abdomen's sides; dip-hab-bombylius: the dense pile all round it): meta.fly.chaetae { kind: 'bristle' | 'fur',
// marks: [[base, tip]] right side, body coordinates } or null. Every mark's base within `onRim` of the abdomen's outline, its
// tip outside the outline and behind its base; `always`: the families that always carry them (tachinid bristles, bombyliid
// fur); a bristle at least `len` x the pile's longest
const DIP_CHAETAE = { onRim: 1.5, always: { tachinid: 'bristle', bombyliid: 'fur' }, minMarks: 4 };
// #54 legs per family (refs dip-asilid-photo, dip-hab-tachina): a robber fly's legs are long and raptorial, the hind leg
// (femur on, as drawn on meta.legs[2].pts) at least `asilidHind` x the body's length (thorax front to abdomen tip) and the
// fore femur spined; a tachinid's legs bristly, every pair spined
const DIP_LEGS = { asilidHind: 0.85 };
const dipSet = { sets: {}, fams: {} };   // over the run, for POST.dipShares
// #52 Lepidoptera wing set (docs/research-lepidoptera-habitus.md "Wing set", refs lep-hab-*): the forewing's hind (inner)
// margin, the line from its basal inner-margin point to the tornus (meta.lep.fore: inner and tornus, body coordinates), in
// degrees below the horizontal (+ toward the tail): square to the body on a setting board (the pose #13 drew), swept back
// into a delta, the hindwing tucked forward under the forewing (a moth at rest), or pushed forward past square (the
// hindwing showing whole behind), within tol of the band (the delta's is the rolled 26-46 less what the wing turns off the
// midline, below).
// midline: no forewing within this of the midline (its inner margin and its mirror image's would close into a seam over
// the body or cross in an X) and no hindwing within hindMidline (it never crosses its pair). covered: the overlap follows
// the set: over a run, the median share of the hindwing's area under the forewing is highest under a delta and lowest under
// a forward set (asserted once each set has coveredMin plates). share: every set on at least this share of a run's moths
// and of its butterflies once the run has shareMin of each; fams: the families that mostly rest in a delta draw it on at
// least deltaFam of their plates
const LEP_SET = { margin: { square: [-8, 12], delta: [14, 46], forward: [-20, -10] }, tol: 0.5, midline: 6, hindMidline: 1, coveredMin: 10,
  share: 0.12, shareMin: 100, deltaFams: ['sphingid', 'noctuid'], deltaFam: 0.4 };
const lepSet = { sets: {}, fams: {}, cov: { square: [], delta: [], forward: [] }, poses: {}, hidden: [0, 0], brushMid: [0, 0] };   // over the run, for POST.lepShares; hidden: [hidden plates, of them with LEP_LEGS.hiddenPairs pairs hidden]
// #52 lepidopteran abdomen families (docs/research-lepidoptera-habitus.md), read off the drawn outlines:
// lw the abdomen's length per its widest width, aw its widest over the thorax's widest, fw its length over the forewing's
// (root to its farthest outline point). sphingid: long and fusiform (lw >= long, fw >= longFw), widest ahead of `fusiT` and
// tapering to a point (half width at t 0.9 at most `point` of the widest), a lateral spot row (at least `spots` spots,
// each centred at least `lateral` of the half width out); saturniid: short and stout (lw <= stout, aw >= stoutAw), hairy;
// geometrid: slender (aw <= slender, lw >= long); arctiid: a dorsal spot row (at least `spots` spots on the midline, within
// `dorsal` of the half width) or banded; noctuid: medium (lw within medium) with dorsal crests on crest plates (tufts on the
// midline of the basal segments, at least `crests`); papilionid: long and slender (lw >= papilio, aw <= slender); lycaenid:
// small and short (fw <= small). Every spot and crest inside the abdomen outline.
// #52 lepidopteran legs (docs/research-lepidoptera-habitus.md): the pose families (meta.legRoll.pose): raised (the
// forelegs held forward in a V, as every plate drew them), spread (out to the sides: a fore femur that is not a brush at least `spreadFemur`
// degrees from straight ahead, 0 straight out, -90 straight ahead), walking, hidden (out under the wings and foreshortened: at least one pair fully
// hidden, no sample of it outside a wing or the body, and `hiddenPairs` pairs on at least `hiddenShare` of the run's hidden
// plates; #8's placement may turn a pair that cannot stay under a small hindwing out to show cleanly); brush: the nymphalids' (Nymphalidae,
// with the satyrines) forelegs reduced to short hairy brushes, the fore leg (femur on) at most `brush` x the mid leg, with
// the mid pair showing ahead of the wings where the forelegs would stand on at least `brushMid` of the run's nymphalid plates
// whose forewings are not pushed forward over that room (#8's placement may hide a pair that cannot show cleanly) (the hind pair shows where the hindwing leaves it
// room; a butterfly's hindwing usually covers it, as on set specimens). share: every pose on at least this share of the run's moths (the
// moth variant) once it has shareMin
const LEP_LEGS = { poses: ['raised', 'spread', 'walking', 'hidden'], spreadFemur: -45, hiddenPairs: 2, hiddenShare: 0.85, brushFams: ['nymphalid', 'satyrine'], brush: 0.5, brushMid: 0.85, share: 0.12, shareMin: 100 };
const LEP_ABD = { long: 3.4, longFw: 0.75, fusiT: 0.45, point: 0.45, spots: 3, lateral: 0.5, stout: 2.8, stoutAw: 0.8, slender: 0.7, dorsal: 0.2,
  medium: [2.2, 4.0], crests: 2, papilio: 5.0, small: 0.68, arctiid: ['dorsal', 'banded'] };
// #55 crane fly habitus (docs/research-tipulomorpha-habitus.md, refs crane-hab-*), read off the drawn plate (meta.cranefly,
// meta.legs, the outlines). fams: the Tipulomorpha families the crane fly draws. poses: the leg pose families; a pose that is
// drawn as rolled (meta.legRoll.pose) and a pair the wing rule (#8) did not repair must look like its pose: trailing, the
// hind leg's claw past the abdomen's tip and the mid tibia pointing back at least `trailBack` degrees from straight out;
// forward, the fore claw ahead of every antenna point (reaching past the antennae); pinned, the mid leg held straight out,
// femur base to tibia end within `pinnedOut` degrees of square to the body. ratio: the longer of the fore and hind leg (femur
// to claw, as drawn) is the one the gene names. sets: the wing angle (meta.wingTheta) per wing set; a folded wing reaches
// `cross` past the midline (scissor-wise over the abdomen, as a limoniid rests: Limoniidae "fold the wings along the back").
// ctenophorine (Ctenophora): comb antennae, a banded abdomen at least `ctenoBroad` x the thorax's widest; pediciid (Pedicia):
// a stippled wing pattern of at least `patternDots` dots, every one inside a wing; a `punctate` family (Limoniidae: wings
// "monochromatic or punctate") may stipple spots, on some plates and not others; no other family stipples its wings.
// Over a run: at least `posesMin` pose families each on `poseShare` of the crane fly plates, every family on `famShare`,
// every wing set on `setShare` (asserted once the run has shareMin crane flies), and the limoniid smaller with shorter legs
// than the tipulid: its median body length (head top to abdomen tip) at most `limSmall` of the tipulid's and its median
// longest leg per body length at most `limLeg` of the tipulid's.
const CRANE = { fams: ['tipulid', 'limoniid', 'ctenophorine', 'pediciid'], poses: ['spread', 'trailing', 'forward', 'pinned'], ratios: ['front', 'hind'],
  sets: { spread: [36, 68], folded: [94, 118] }, cross: 4, trailBack: 60, pinnedOut: 25, ctenoBroad: 0.9, ctenoAnt: ['pectinate', 'bipectinate'], patternDots: 30, punctate: ['limoniid'], punctShare: 0.2,
  poseShare: 0.15, posesMin: 3, famShare: 0.1, setShare: 0.15, shareMin: 100, limSmall: 0.85, limLeg: 0.9 };
const craneRun = { fams: {}, poses: {}, sets: {}, body: {}, leg: {}, punct: {} };   // over the run, for POST.craneShares
const legReach = pts => { let d = 0; for (let i = 2; i + 1 < pts.length; i++) d += dist(pts[i], pts[i + 1]); return d; };   // femur base to claw tip, as drawn
// #11, stated from the references (hym-apis: marginal + SM1-SM3 + ME1-ME2; Vespidae the same plan; hym-ichneumonidae-diagram:
// the areolet, the small cell between 2r-m and the first r-m just past the stigma's distal end), not read from the engine's family table
const HYM_CELLS = { apid: { sub: 3, disc: 2 }, vespid: { sub: 3, disc: 2 } };   // closed submarginal / discoidal cells per family
const HYM_AREOLET = ['ichneumonid'];   // families that always close an areolet
const HYM_AREOLET_MAX = 0.08;   // the areolet is tiny: its two r-m at most this far apart (fraction of the span; ~0.06 on the diagram)
// #12, from the habitus (Apis / Bombus: abdomen broader than the thorax, short legs, the hind tibia a broad corbicula,
// head about as wide as the thorax, three ocelli in a triangle on the vertex; research-antennae: bee scape 0.3-0.4)
const BEE_FAMS = ['apid'];   // the bee families the engine draws; type bee rolls only these, type wasp none
const BEE = { abd: 1.05, tibia: 1.5, head: 0.8, ocelli: 0.6, scape: [0.27, 0.4] };
// #65 the corbicula shows (the hind leg posed back so the tibia lies behind the hindwing's trailing edge, the layer order
// unchanged; Nik 2026-10-26: the bee's wing set changed to make room for it, the legCap kept): a plate shows its basket when at least `vis` of the hind tibia's
// length (knee to tibia tip) lies outside every wing and the body and behind a wing (a wing outline straight ahead of it,
// toward the head: not out in front of the costa beside the mid leg), on the right leg and on the skewed left one; at least
// `share` of a run's bee plates show it (the ticket: 7 of 9), once the run has BEE_MIN bee plates
const BEE_BASKET = { vis: 0.5, share: 7 / 9 };
const basketRun = { n: 0, shown: 0, worst: [] };   // over the run, for POST.beeBasket: bee plates, those showing the basket, the least visible
// #83 the corbicula search no longer costs a bee plate seconds: no bee plate takes longer than `k` times the median
// non-bee plate to generate. Under #83's loader the bound was 3x (worst bee plate about 2x, an unchecked basket search
// 5-20x); #86's function-scope loader made the median plate about 7x faster but a bee's leg search only about 3x (that
// time is real work, not global lookups), so the ratios grew: the worst bee plates in 1-3000 (2993, forced bee 18) now run
// about 5x and the unchecked search of the engine before #83 runs 30-90x (1849 93x, forced bee 117 70x). 10 sits between
// with room for noise on both sides. The seed loop times every plate (plateMs); POST.beeTime
// re-times, in this process and back to back, each bee plate over the bound and the `ref` non-bee plates nearest the
// run's median, best of `tries` each, so a slow shard, a GC pause or a busy machine cannot fail a plate on its own
const BEE_TIME = { k: 10, ref: 5, tries: 3, minOther: 20 };
const plateMs = { bee: [], other: [] };   // [seed, ms] of every plate in the run, generation only, for POST.beeTime
const beeSeen = { hymFamilies: 0, beeAbdomen: 0, beeLegs: 0, beeCorbicula: 0, beeBasket: 0, beeBasketLabel: 0, beeHead: 0, beeOcelli: 0, beeLattice: 0, beeScape: 0 };   // plates each #12 check asserted on, for POST.beeSeen
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
// #51 Neuroptera families (docs/research-neuroptera-families.md, refs neu-myrmeleon, neu-libelloides, neu-mantispa,
// neu-osmylus, neu-hemerobius), stated from the references rather than read from the engine's tables. fams: the families a
// lacewing plate rolls; famsAll: a run with this many lacewing plates has drawn every family
const NEU_FAMS = { fams: ['chrysopid', 'hemerobiid', 'myrmeleontid', 'ascalaphid', 'mantispid', 'osmylid'], famsAll: 60 };
// ant: per family, the antenna kinds drawn, the club (clubbed kinds) and the drawn length in body lengths (head top to
// abdomen tip): the hemerobiid's moniliform, the antlion's short gradual club, the owlfly's body-long antenna with an
// abrupt club, the mantidfly's short antenna
const NEU_ANT = { chrysopid: { kinds: ['filiform', 'moniliform'], len: [0.4, 1] }, hemerobiid: { kinds: ['moniliform'], len: [0.3, 0.65] },
  myrmeleontid: { kinds: ['clubbed'], club: 'gradual', len: [0.12, 0.35] }, ascalaphid: { kinds: ['clubbed'], club: 'abrupt', len: [0.7, 1.1] },
  mantispid: { kinds: ['moniliform', 'filiform'], len: [0.1, 0.35] }, osmylid: { kinds: ['filiform'], len: [0.3, 0.7] } };
// abdWing: the abdomen's length over the forewing's (root to the farthest outline point): the antlion's 1.3-1.6
// (the ticket's; neu-myrmeleon measures about 1.25 on a set specimen, a female or a short male), its tip past every wing by past body units;
// every other family's wings longer than the abdomen (chrysopids 0.37-0.67 before #51)
const NEU_ABD = { antlion: [1.25, 1.65], past: 2, other: [0.3, 0.9] };
// pron: the pronotum's length (the pronotal collar, meta.bodyGenes.thorax.lines[0].t, a fraction of the thorax) on every
// lacewing, the mantidfly's long prothorax (neu-mantispa: the prothorax as long as the pterothorax or longer) and every
// other family's short one; the wing roots and the mid and hind coxae on the pterothorax behind it
const NEU_PRON = { all: [0.1, 0.6], mantispid: [0.38, 0.6], other: [0.1, 0.25] };
// raptor: the mantidfly's raptorial forelegs (neu-mantispa): the femur raised toward the head at least femur degrees from
// straight out, the tibia folded back against it (at least fold degrees between the femur's and the tibia's directions),
// the femur stout (at most stout times as long as its widest)
const NEU_RAPTOR = { femur: -30, fold: 120, stout: 4.2 };
// spots: the osmylid's stippled forewing spots (neu-osmylus): at least n spots of at least dots dots each, every dot inside
// a wing outline; no other family's wings are spotted
const NEU_SPOTS = { n: 3, dots: 4 };
// eyes: the owlfly's and the mantidfly's large eyes (neu-libelloides, neu-mantispa): each eye at least eye of the head's
// width across (meta.head: eyes[].rx, W), larger than a chrysopid's (0.22-0.28)
const NEU_EYES = { big: ['ascalaphid', 'mantispid'], eye: 0.3 };
const neuFamRun = {};   // family -> lacewing plates of it in the run, for POST.neuFamilies
const maxHw = prof => Math.max(...prof.map(p => p[1])), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// #22 grasshopper, from the references (orth-grasshopper: the hindwing folds under the tegmen, the tegmina overlap along
// the inner margin and their apices part; the archedictyon is rows of near-rectangular cells; thorax-orth-grasshopper and
// research-thorax.md: the pronotum is a saddle, widest over the metazona, with lateral carinae and a hind margin that
// projects back over the tegmina). fanOut: how far (body units) the fan may stand past its tegmen's costa; overlap: the
// inner margin crosses the midline by at least this over the middle of the tegmen; apexX: each apex at least this far
// on its own side; tip: the last fraction of the tegmen length that stays clear of the midline; oblique: the share of
// the archedictyon's cell outlines that may run obliqueBand degrees off the tegmen's axis (a honeycomb has a third),
// asserted on a plate with cellsMin cells or more (seed 2103: 49 cells, mostly at the tapering tip, 22%); onVein: an
// intercalary's root within this of another vein; base: a lane rooted within this fraction of the length of the tegmen's
// base starts at the base; metazona: the pronotum is widest behind this fraction of its length; prozona: and at most this
// fraction of that width ahead of the principal sulcus; hind: its half width at the hind margin at most this fraction of
// the widest (an angled or rounded margin, never truncate); carinae: the lateral carina kinds the bodySig carries
const ORTH = { fanOut: 0.5, overlap: 1, apexX: 2, tip: 0.04, oblique: 0.2, obliqueBand: [20, 65], cellsMin: 60, onVein: 0.75, base: 0.12, metazona: 0.55, prozona: 0.96, hind: 0.6, carinae: ['straight', 'incurved', 'outcurved'] };
// #72 grasshopper body variation (docs/research-orthoptera-habitus.md). cls: the tegmen's length class as its drawn
// reach (down the body from its root, meta.orth.root; on an open plate the outline point furthest from the root) per abdomen length, from the ticket and the research
// note: macropterous as #22 drew every plate, brachypterous 0.25-0.6 (Chorthippus females, Metrioptera), micropterous
// short lateral pads (Pholidoptera, Ephippiger), the groundhopper's lateral scales; tol on either side for the outline's
// smoothing. show: a brachypterous plate leaves at least this share of the abdomen bare behind its tegmina (the tergites
// showing). A micropterous pad or a scale never reaches the midline (lateral, minX > 0). tetrigid: the pronotum's
// process (meta.orth.process, closed, body coordinates) reaches the abdomen's tip or past it and tapers to a point (its
// half width over the last `tipLen` of its length at most `point` of its widest). ovi: the tettigoniid's sabre as drawn
// (meta.orth.ovi.len) per abdomen length, any other family's valves at most `valves` of it. open: the setting-board pose,
// only on a macropterous acridid: the tegmen's root-to-apex line `teg` degrees past straight out toward the tail, the
// opened hindwing (meta.orth.hind) and the tegmen never across the midline. along: the hind femur held along the body,
// its direction (degrees, 0 out, 90 straight back) in this band. share: over a run of shareMin grasshopper plates or more,
// every class, the open set and the along pose each on at least that share of the plates they can occur on.
const ORTH72 = { cls: { macro: [1.05, 1.18], brachy: [0.25, 0.6], micro: [0.1, 0.22], scale: [0.06, 0.16] }, tol: 0.03, show: 0.3,
  tetrigid: { tipLen: 0.05, point: 0.2 }, ovi: { sabre: [0.5, 1.0], valves: 0.15, kinds: ['straight', 'upcurved'] },
  open: { teg: [-5, 35] }, along: [55, 88], share: { cls: 0.08, open: 0.08, along: 0.15 }, shareMin: 60 };
const orth72Run = { cls: {}, sets: {}, hind: {}, n: 0 };   // over the run's grasshoppers, for POST.orthShares
const orthSeen = { orthFan: 0, orthTegmina: 0, orthCells: 0, orthIntercalary: 0, orthPronotum: 0, orthTegmen: 0, orthTetrigid: 0, orthOvipositor: 0, orthWingSet: 0, orthHindLeg: 0 };   // grasshopper plates each #22 check asserted on, for POST.orthSeen
let orthSeenPlates = 0;   // grasshopper plates in the run, counted by the seed loop whichever checks are selected
const ORTH_MIN = 20;   // grasshopper plates a run needs before a #22 check that never ran fails rather than being reported (~8% of plates)
// #26 cicada (Cicadidae), from the references (cic-cicada: Sc+R, M, CuA and CuP four heavy trunks from the base, the anal
// veins short, in the clavus; a set specimen holds the forewings swept back 30-45 degrees, the hindwing root behind the
// forewing's and under its clavus, so the hindwing shows only from under the forewing's hind margin; Cicadidae fore femora
// stout, armed beneath with 2-3 strong teeth). sweep: the forewing's root-to-apex line, degrees below the horizontal, within
// tol; scale: the median plate scale of the run's cicadas at least this; trunks: the trunk lanes (MCu, the M+CuA stem, when
// drawn) every piece at the outline weight, heavy times the crossvein weight or more; femur: the fore femur at most this
// many times as long as its widest; teeth: at least this many drawn; tibia: the fore tibia's drawn direction classes
// (degrees, 0 straight out, negative toward the head): forward of the first bound, back of the second, out between; at
// least two classes each on poseShare of the cicada plates; midline: no forewing point nearer the midline than this
const CIC = { sweep: [30, 45], tol: 1, scale: 0.95, trunks: ['ScR', 'M', 'CuA', 'CuP'], stem: 'MCu', heavy: 2.5, femur: 3, teeth: 2, tibia: [-60, 0], poseShare: 0.15, midline: 2 };
// #49 cicada wing set (docs/research-cicada-habitus.md, refs hab-cic-*): a set specimen spreads its tegmina (#26's
// 30-45 degrees), a half-open one holds them at 50-66, and at rest (the roofed set, the pose of most cicada photographs)
// the tegmina lie back over the abdomen, the root-to-apex line within 10 degrees of straight back, their inner (claval)
// margins meeting along the midline and the hindwings hidden under them. sweep: the forewing's root-to-apex line per set
// (CIC.tol either side); roofMid: on a roofed plate the tegmen's inner margin lies within this of the midline beside the
// whole abdomen and no nearer than roofIn (it meets its mirror image, never crosses it), its outer margin covers the
// abdomen's side; share: every set, forewing shape, family and marking on at least this share of a run's cicadas,
// asserted once the run has shareMin of them (a 300-seed run has about 25, too few to hold a 1-in-4 kind to 15%)
const CIC_SET = { sweep: { spread: [30, 45], half: [50, 66], roofed: [80, 100] }, roofMid: 1.5, roofIn: 0.3, share: 0.15, shareMin: 100 };
// #49 forewing shape (refs: Cicadettini tegmina about 3x as long as wide, narrow with a pointed apex; Platypleurini and
// the broad Cicadini 2-2.6x, the apex rounded): on a spread or half-open plate the forewing's depth across its
// root-apex line, per that line's length, at most narrow[1] on a narrow wing and at least broad[0] on a broad one
const CIC_SHAPE = { narrow: [0, 0.33], broad: [0.35, 1] };
// #49 family habitus (docs/research-cicada-habitus.md): cicadine abdomen at least `broad` x the thorax's widest, with
// the tymbal covers drawn at the abdomen base (within `tymbalT` of its length) and reaching past its outline;
// cicadettine abdomen at most `slender` x the thorax's widest and the head at most `head` x it; platypleurine pronotal
// collar (the thorax ahead of `collarT` of its length) flared to at least `flange` x the head's half width
const CIC_HAB = { fams: ['cicadine', 'cicadettine', 'platypleurine'], broad: 0.9, slender: 0.9, head: 0.95, flange: 1.12, collarT: 0.45, tymbalT: 0.3 };
// #49 mesonotum markings (refs: the paired obconical spots and the M mark of the cicada mesonotum): every mark a closed
// hatched shape inside the thorax outline (in by `in`), behind the pronotal collar and ahead of the cruciform elevation
const CIC_MARKS = { kinds: ['none', 'obconic', 'M', 'both'], in: 0.5 };
const cicSet = { sets: {}, shapes: {}, fams: {}, marks: {} };   // over the run, for POST.cicShares
const cicSeen = { cicSweep: 0, cicScale: 0, cicTrunks: 0, cicForeleg: 0, cicHindRoot: 0, cicWingSet: 0, cicWingShape: 0, cicHabitus: 0, cicMarks: 0 };   // cicada plates each #26 check asserted on, for POST.cicSeen
let cicSeenPlates = 0;   // cicada plates in the run, counted by the seed loop whichever checks are selected
const CIC_MIN = 20;   // cicada plates a run needs before a #26 check that never ran fails, and before the run medians are asserted (~8% of plates)
const cicRun = { scales: [], tibia: { forward: 0, out: 0, back: 0 } };   // over the run, for POST.cicScale / POST.cicForeleg
// a cicada's wings by their roots (meta.wingOutlines, right side, body coordinates; each closed outline starts at its root):
// the forewing is the one rooted further forward
const cicWings = meta => { const w = meta.wingOutlines.slice().sort((a, b) => a[0][1] - b[0][1]); return { fore: w[0], hind: w[1] }; };
// the x where a horizontal line at y leaves a closed polygon on the right (its outer edge), or null when it misses it
const rightmostAt = (poly, y) => {
  let best = null;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > y) === (b[1] > y)) continue;
    const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
    if (best === null || x > best) best = x;
  }
  return best;
};
const leftmostAt = (poly, y) => { const m = rightmostAt(poly.map(p => [-p[0], p[1]]), y); return m === null ? null : -m; };
const distToPl = (p, pl) => { let d = Infinity; for (let i = 0; i + 1 < pl.length; i++) { const a = pl[i], b = pl[i + 1], v = [b[0] - a[0], b[1] - a[1]], L2 = v[0] * v[0] + v[1] * v[1] || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / L2)); d = Math.min(d, Math.hypot(p[0] - a[0] - t * v[0], p[1] - a[1] - t * v[1])); } return d; };
// #28 names: the names table a plate's common name comes from (the variant's, else the order's), and the run's common names
const namesTable = (type, variant) => { const o = E.ORDERS[type]; return (variant && o.variantNames && o.variantNames[variant]) || o.names; };
const commons = [];
const pigNames = { n: 0, named: 0 };   // #82 pigmented odonate plates, and those whose common name names the pigment
const hymSeen = {};   // Hymenoptera family -> plates hymCells saw, so POST.hymCells can tell a family that never appears (a rename) from a short run
// #17, from the references (odo-damsel-ris1921: a coenagrionid, two antenodals and the quadrilateral from the arculus;
// Calopterygidae carry an antenodal ladder) and the common names of each family, stated here rather than read from the engine
const ODO_NOUNS = { coenagrionid: ['Bluet', 'Damsel', 'Dancer', 'Forktail', 'Sprite', 'Bluetail', 'Redtail'], calopterygid: ['Demoiselle', 'Jewelwing', 'Rubyspot'],
  lestid: ['Spreadwing', 'Reedling'], platycnemidid: ['Featherleg', 'Threadtail'] };   // #48: Lestidae and Platycnemididae carry two antenodals too
const ODO_TWO_AX = ['coenagrionid', 'lestid', 'platycnemidid'];   // the families with exactly two antenodals (Ax1, Ax2)
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
// #48, from the references (docs/research-odonata-habitus.md; odo-hab-* in docs/ref) and the ticket, stated here rather than
// read from the engine: every odonate plate draws one of its suborder's families; each dragonfly family draws its abdomen
// silhouette, measured on meta.abdomen.profile (half widths along the abdomen, t = 0 at its base): libellulid broad (at
// most ODO_HAB.broad times as long as its widest width, against about 11 for the rod; widest in the basal half, tapering
// to under ODO_HAB.taper of it by t 0.85), gomphid clubbed at S7-S9 (the widest over t 0.6-0.92 at least ODO_HAB.club x the narrowest over
// 0.25-0.55), corduliid waisted at S3 (the narrowest over t 0.12-0.3 at most ODO_HAB.waist x the widest over the first 0.12),
// a rod (aeshnid, every damselfly) no wider anywhere over t 0.15-0.8 than ODO_HAB.rod x its narrowest there. A lestid holds
// its wings half open, the forewing axis (root to its farthest point) swept back at least ODO_HAB.lestid degrees; a
// platycnemidid's mid and hind tibiae are at least ODO_HAB.tibia x as wide as its fore tibia. The wing set gene stays in
// the ticket's ranges (forewing sweep -10..+15, the lestid's 20..35, the hindwing a further 0..12 degrees).
const ODO_FAMS = { dragonfly: ['aeshnid', 'libellulid', 'gomphid', 'corduliid'], damselfly: ['coenagrionid', 'lestid', 'calopterygid', 'platycnemidid'] };
const ODO_PROFILE = { aeshnid: ['rod', 'waisted'], libellulid: ['broad'], gomphid: ['club'], corduliid: ['waisted'], coenagrionid: ['rod'], lestid: ['rod'], calopterygid: ['rod'], platycnemidid: ['rod'] };
const ODO_HAB = { broad: 6, taper: 0.7, club: 1.3, waist: 0.75, rod: 1.4, lestid: 15, tibia: 1.8, fw: [-10, 15], fwLestid: [20, 35], hw: [0, 12], poseShare: 0.15,
  // #73 the open damselfly's set, wider: the hindwing a further 8..30 degrees (under ~11 the pair is turned apart to meet only
  // at the roots anyway, so smaller rolls all drew one set), the lestid's forewing 18..48 (Lestes rests half to well open)
  dam: { fw: [-16, 20], hw: [8, 30] }, damLestid: { fw: [18, 48], hw: [10, 28] } };
const ODO_PATTERNS = ['plain', 'banded', 'spotted', 'rings', 'tipdark'];   // the dorsal pattern families every odonate run must show
const odoHab = { fam: {}, pose: {}, mark: {}, plates: 0 };   // over the run, for POST.odoHabitus
// #27 odonate and butterfly heads, from the references and the ticket, stated here rather than read from the engine:
// - a dragonfly's eyes meet along a seam on top of the head (head-odo-tillyard1917 A, 'me'): each eye's outline
//   (meta.head.eyes[i].pl, body units) stays on its own side of the midline (within ODO_EYE.cross), the two share a
//   straight run on the midline at least ODO_EYE.seam of the eye's length, and the eye's lattice or stipple
//   (meta.head.eyes[i].marks, the tone's centres) runs to within ODO_EYE.reach pitches of that seam; only the gomphid
//   holds its eyes apart (research-head-eyes.md), its inner margins at least ODO_EYE.apart head widths off the midline;
// - a damselfly's antenna socket (meta.antennae.sr) is at most ODO_EYE.socket of its smallest ocellus's radius, so the
//   dorsal head reads as three ocelli between the eyes, not five equal rings (head-odo-damselfly; the dragonfly keeps its
//   socket ring: its antennae are fine strokes that need the ring to survive at device size, tests/eink.js);
// - a butterfly's club is never hooked (ant-butterfly-tips-bingham: the hooked apiculus is the skippers', k Tagiades; the
//   plate draws no skipper family). The proboscis, which lies coiled under the head where a dorsal view cannot see it,
//   is not drawn because the engine has no gene for it (index.html, the head genes), not because a check holds it.
const ODO_EYE = { cross: 0.05, seam: 0.25, reach: 1.5, apart: 0.04, socket: 0.5 };
const headSeen = { odoEyes: 0, odoSockets: 0, lepHead: 0 };   // plates each #27 check asserted on, for POST.headSeen
const ODO_MIN = 40;   // damselfly plates a run needs before a family with no plate fails rather than being reported
// #73 wing pigment, from the references (docs/research-odonata-habitus.md "Wing pigment"; odo-hab-* in docs/ref) and the
// ticket, stated here rather than read from the engine: a plate's pigment patches (meta.odoPig.patches) are kinds its family
// carries (an empty list is a clear wing); a whole-wing tone (full, Calopteryx virgo / Aeshna grandis) stands alone; the tone
// is hatch, never a fill: meta.odoPig.hatch holds each wing's hatch segments (body coordinates), every one inside its wing's
// outline (meta.wingOutlines), and neighbouring hatch lines at least ODO_PIG.px plate px apart (a device plate: the device
// pitch floor), measured across the lines themselves. Over a run each suborder draws every kind it has once it has
// ODO_PIG.min plates.
const ODO_PIG = { px: 2, min: 150, kinds: { aeshnid: ['basal', 'wash', 'full'], libellulid: ['basal', 'wash', 'nodal', 'band', 'tips'], gomphid: ['basal', 'wash'], corduliid: ['basal', 'wash', 'nodal', 'tips'],
  coenagrionid: ['wash', 'tips', 'band'], lestid: ['band'], calopterygid: ['basal', 'band', 'tips', 'full'], platycnemidid: [] } };
const odoPigRun = { plates: {}, kinds: {}, clear: {}, pitch: Infinity, seed: 0 };   // over the run, for POST.odoPigment
// #73 the zygopteran resting pose (docs/research-odonata-habitus.md "Resting pose"), stated from the references: a damselfly
// may rest with its wings closed back over the abdomen (meta.odoRest.closed): each wing's axis (root to its farthest point)
// swept back ODO_REST.ang degrees from square, and no point of either outline across the midline (the left wings are the
// mirror image, so a crossing would draw the two sides through each other). A dragonfly never rests closed. Over a run
// the closed pose is on ODO_REST.share of the damselflies and every family in ODO_REST.fams closes at least once.
const ODO_REST = { ang: [45, 90], share: [0.15, 0.55], fams: ['coenagrionid', 'calopterygid', 'platycnemidid'] };
const odoRestRun = { plates: 0, closed: 0, fams: {} };
// #73 the pigment is a tone, never a fill, on the panel: the device plate's wings as drawn (meta.odoInkSvg) and without the
// pigment's hatch (meta.odoArtSvg) go through the panel pipeline (tests/raster.js bits, DEV px, threshold 128), and no
// ODO_SOLID x ODO_SOLID block of black pixels appears that is not within ODO_SOLID px of a block the wing alone already has
// (its solid pterostigma, a heavy vein junction). The 600 px 9x9 window measure of lepInk does not transfer: the odonate
// mesh alone already reaches ~0.56 there on most plates, without a pigment, and reads as lines at 1 bit.
const ODO_SOLID = 5;
const odoInkRun = { n: 0, worst: 0, seed: 0 };
const solidBlocks = async svg => {
  const { data, info } = await raster.bits(svg, DEV).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels, k = ODO_SOLID, black = (x, y) => data[(y * w + x) * ch] < 128, out = [];
  for (let y = 0; y + k <= h; y++) for (let x = 0; x + k <= w; x++) { let all = true; for (let j = 0; j < k && all; j++) for (let i = 0; i < k; i++) if (!black(x + i, y + j)) { all = false; break; } if (all) out.push([x, y]); }
  return out;
};
const HYM_MIN = 40;   // Hymenoptera plates a run needs before a named family with no plate fails rather than being reported (~0.2% odds of no ichneumonid by chance)
// #13: a lepidopteran plate's wings (meta.lepInkSvg, every element of the wing layer, as on the plate) rasterised at 600 px,
// antialiased ink averaged over every 9 x 9 px window: a window at LEP_INK_MAX or more reads as a black blotch on the 1-bit
// panel. Measured this way on the full plate at 147bbee, the ticket's evidence seeds gave 1067-1570 px of such windows per
// moth and 6617 on butterfly 66 (the audit's 1444-1575 and 7038, on Chromium's raster). Any solid window fails, whatever
// made it (#67): the message splits its ink into the line art's alone (meta.lepArtSvg: outline, costa, veins, band edges,
// cross-lines, spot rings; #67's costa beside Sc and R1, a vein fork, a zigzag cross-line) and the tone layers' (hatch,
// stipple, fringe; #13's stacked hatch families), so it says which of the two to look at.
// 0.56, not 0.55 (#75, Nik 2026-10-26): moth 1924's front-edge window is 0.558, a heavy vein ~7 px under the costa with a
// fork between them; Nik looked at the plate and its 1-bit zoom and judged it fine, so the limit sits just above it
const LEP_INK_MAX = 0.56, LEP_WIN = 9;
const lepInk = {};   // variant -> { n, max, seed, art } over the run: the darkest window and its line-art ink, for the report (POST.lepInk)
let lepRun = 0;      // plates lepInk saw (any type), so POST.lepInk can tell a lost variant from a short run
const LEP_MIN = 40;  // lepidopteran plates a run needs before a variant with no plate fails (~0.6^40: no butterfly by chance)
// #14: no two lane centre-lines of a growVeins wing (meta.wingLanes: the drawn lanes and the wall lanes the outline draws, body
// coordinates, one entry per wing) closer than LANE_FLOOR plate px, except within LANE_JOIN px of a junction of the lane, a
// point where it touches another lane (a fork, an end on a neighbour, a node three lanes share), so a Y passes and a bar
// does not; the numbers are stated here rather than read from the engine. Which orders it covers is the registry's
// (ORDERS[type].laneFloor === false opts one out: the beetle has no lanes; the moth's veins go through it too since #67).
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
// #15: on a beetle the elytral striae converge toward the apex (and fan out of a narrow base), and a punctate beetle draws
// them as rows of punctures (#24). meta.elytra holds the drawn striae (polylines, body units), the punctures' centres
// and the elytron's outline (closed along the suture); this check measures them itself, point to segment: no stria point
// within ELY_PITCH plate px of another stria or the outline, and no puncture within it of a stria other than its own
// (meta.elytra.dotStria), the outline or another puncture. The number is stated here, not read from the engine.
const ELY_PITCH = 3;
const elyRun = { n: 0, worst: Infinity, seed: 0, at: '' };   // over the run: the closest elytral pair, for the report
// #24, from docs/research-thorax.md (Coleoptera; ref thorax-col-engraving): the pronotum 1.1-1.5x wider than long and
// 0.55-0.9 of the elytral width. Measured on the drawn outlines: the thorax profile (the beetle's visible thorax is the
// pronotum) and the elytron outline (meta.elytra.outline, one elytron closed along the suture). Stated here, not read
// from the engine.
const BEETLE = { pronWL: [1.1, 1.5], pronEly: [0.55, 0.9] };
// #24: the elytral texture (thorax-col-engraving: tone from striae converging at the apex, the punctures dots or dashes IN
// the striae, never a grid of dots between them). meta.elytra.style is the body gene (meta.bodyGenes.elytra.style, on
// bodySig): 'smooth' draws the striae as lines and no punctures; 'punctate' draws each stria as a row of punctures and no
// line; 'dashed' as dashes ELY_PITCH px apart along it and no line. Every puncture and dash lies on a stria's run
// (within ELY_ON body units of meta.elytra.striae), and once a run has ELY_STYLE_MIN beetle plates each style must
// hold at least ELY_STYLE_SHARE of them. #53 adds the sculpture families of docs/research-thorax.md: 'costate', a few
// raised costae drawn as heavier lines (2 to ELY_COSTAE striae, meta.elytra.weight 'D'); 'glabrous', a smooth shining
// elytron with only the sutural stria (one line); 'tubercle', rows of tubercles (rings at least ELY_TUB_R body units
// across the radius) along the striae, each ELY_PITCH px clear of the next along its row.
const ELY_STYLES = ['smooth', 'punctate', 'dashed', 'costate', 'glabrous', 'tubercle'], ELY_ON = 0.05, ELY_STYLE_MIN = 40, ELY_STYLE_SHARE = 0.1;
const ELY_LINES = ['smooth', 'costate', 'glabrous'], ELY_COSTAE = 4, ELY_TUB_R = 1.2;
const elyStyles = {};   // style -> beetle plates, for POST.elytraTexture
// #24, the rove beetle (Staphylinidae; the audit's reference): elytra about the pronotum's length (ROVE.ely, elytra / pronotum
// length) and truncate (the hind margin at least ROVE.trunc of the elytron's width within ROVE.edge of its end), over a long
// abdomen that tapers (its half-width ROVE.tipK of its widest or less at ROVE.tipT of its length: not a flat-bottomed box)
// with every tergite past the elytra hatched (meta.abdMarks: a 'hatch' mark in each segment whose top lies below them), at
// least ROVE.exposed of them. Stated here from the reference, not read from the engine.
const ROVE = { ely: [0.8, 1.3], trunc: 0.6, edge: 0.04, tipT: 0.95, tipK: 0.45, exposed: 3 };
let roveSeen = 0, beetlePlates = 0;   // rove plates roveBody asserted on, and beetle plates in the run (counted by the seed loop)
const beetleRun = { n: 0, wl: [Infinity, -Infinity], pe: [Infinity, -Infinity] };   // over the run: the ranges seen, for the report
// #25 beetle head and antennae, stated from the references, not read from the engine:
// - no beetle has ocelli (beetleOcelli; the audit found a median ocellus on a rove);
// - the weevil's antennae insert on the rostrum (head-col-weevil: the scape leaves the side of the rostrum about a quarter
//   of the way from the head on a long Curculio rostrum, nearer the middle on a short one), so the socket
//   (meta.antennae.base) lies on the rostrum's side (within WEEVIL.edge body units of its half width) between
//   WEEVIL.along of its length ahead of the capsule front (meta.head.top; the rostrum's tip is top - rostrum.len);
// - a carabid (the ground family) draws two sickle mandibles (head-col-carabus: stout jaws from the front corners that
//   hook inward to tips at the midline, the labrum and palps showing in the open space between them, never a closed
//   leaf): meta.head.mand holds each jaw's outline (closed polyline, body units); each jaw reaches CARABID.len head widths
//   ahead of the capsule front, its tip within CARABID.tipX head widths of the midline, its base outside CARABID.baseX,
//   and at half the jaws' length their inner edges stand at least CARABID.gap head widths apart;
// - a longhorn's antenna (ant-longhorn-dorcadion: thick, segmented, about the body's length, swept back beside the
//   elytra): the shaft as drawn at most LONGHORN.len[1] (at least LONGHORN.len[0]) body lengths (head front to abdomen tip),
//   the shaft at its narrowest at least the detail stroke wide on the plate (LONGHORN.minPx plate px, so never a
//   hairline) and at its base at least LONGHORN.baseW head widths, the pose 'swept', no point ahead of the head's front,
//   the tip beside the elytra (between their top and LONGHORN.tipBack of their length past their end, and within
//   LONGHORN.tipOut elytral half widths of the midline)
const WEEVIL = { along: [0.15, 0.7], edge: 1.5 };
const CARABID = { len: [0.22, 0.55], tipX: 0.12, baseX: 0.22, gap: 0.12 };
const LONGHORN = { len: [0.7, 1.3], minPx: 0.8, baseW: 0.1, tipBack: 0.15, tipOut: 1.9 };
const colSeen = { beetleOcelli: 0, weevilSocket: 0, carabidMandibles: 0, longhornAntenna: 0 };   // beetle plates each #25 check asserted on, for POST.colSeen
// #53 beetle families and within-family genes, stated from docs/research-thorax.md (Coleoptera) and the references there,
// not read from the engine:
// - the families a beetle plate draws (COL_FAMS): the five of #24 plus the round ones the sheet never showed, the
//   ladybird (Coccinellidae: elytra together about as broad as long, a hemisphere from above) and the leaf beetle
//   (Chrysomelidae: a short convex oval), and the stag beetle (Lucanidae); the elytra together, breadth over length
//   (meta.elytra.outline: one elytron, so twice its half width over its length, elyAspect), lie in their build's band
//   (COL_BUILD below; #53's family bands, ladybird 0.85-1.3 and leaf beetle 0.68-1.0, split by build in #74)
const COL_FAMS = ['ground', 'rove', 'scarab', 'longhorn', 'weevil', 'coccinellid', 'chrysomelid', 'lucanid'];
const elyAspect = outline => { const ys = outline.map(p => p[1]); return 2 * Math.max(...outline.map(p => p[0])) / (Math.max(...ys) - Math.min(...ys)); };
// - the round families' build (#74; meta.bodyGenes.build, on bodySig as 'bd' + its name): a weevil slender (Lixus),
//   stout or globose (Otiorhynchus, Curculio), a ladybird broad, round or oval (Halyzia, Calvia), a leaf beetle elongate
//   (Donacia, Lema), oval or broad (Cassida); every other family has none. The elytra together, breadth over length as
//   for COL_FAMS, lie in the build's band (COL_BUILD); a globose or slender body
//   never wears an elytral outline that contradicts it (COL_BUILD_NOT: no tapering globose weevil, no rounded slender
//   one or parallel slender one, no rounded elongate or parallel broad leaf beetle)
const COL_BUILD = {
  weevil: { slender: [0.32, 0.67], stout: [0.43, 0.96], globose: [0.62, 1.27] },
  coccinellid: { broad: [0.99, 1.3], round: [0.89, 1.19], oval: [0.75, 1.01] },
  chrysomelid: { elongate: [0.52, 0.74], oval: [0.66, 0.95], broad: [0.82, 1.1] } };
const COL_BUILD_NOT = { 'weevil:globose': ['tapering', 'parallel'], 'weevil:slender': ['rounded', 'parallel'], 'chrysomelid:elongate': ['rounded'], 'chrysomelid:broad': ['parallel'] };
// - the spot layout (#74; meta.bodyGenes.elytra.pat.layout on a spotted or dark elytron, on bodySig as 'sl' + its name):
//   scatter (#53's fixed layout per count), margin (a row down the outer margin: every spot's centre in the outer half of
//   the elytron's width at its height) or suture (a row beside the suture: every centre in the inner half); two or more
//   spots in a row stand one above the other (SPOT_ROW: their centres' x within that share of the half width)
const SPOT_LAYOUTS = ['scatter', 'margin', 'suture'], SPOT_ROW = 0.12;
// - the elytral outline (meta.bodyGenes.elytra.outline, on bodySig as 'eo' + its initial and the shoulder's) as drawn, the
//   half width of meta.elytra.outline at a fraction t of its length over its widest (w(t)): parallel, the sides parallel
//   over the disc (w(0.2), w(0.6) >= par); oval, widest about the middle (widest between oval.at) and narrowing to both
//   ends (w(0.1), w(0.8) <= oval.ends); rounded, broad to a round apex (w(0.8) >= round); tapering, widest at the
//   shoulders and narrowing to a pointed apex (widest at or before taper.at, w(0.8) <= taper.end); the shoulders square
//   (w(0.03) >= sq) or rounded (w(0.03) <= rd). A truncate elytron (the rove's) has no outline gene.
const ELY_OUTLINES = ['parallel', 'oval', 'rounded', 'tapering'];
const ELY_SHAPE = { par: 0.9, oval: { at: [0.28, 0.62], ends: 0.88 }, round: 0.75, taper: { at: 0.35, end: 0.62 }, sq: 0.8, rd: 0.74 };
// - the elytral pattern (meta.bodyGenes.elytra.pattern, on bodySig as 'ep' + its initial), drawn as hatched shapes
//   (meta.elytra.pattern: regions, closed polylines, and hatch, the hatch segments): none draws nothing; spots at least
//   two regions (one on a ladybird), bands at least one, a stripe one, dark (the whole elytron hatched round pale spots,
//   meta.elytra.pattern.holes, no hatch middle inside one) one; every region and hatch end inside the elytron (within ELY_IN body
//   units of its outline), every hatch segment's middle inside a region, and the hatch lines ELY_PITCH px apart at plate
//   scale on the default and the device plate (measured across the lines, which are parallel on one elytron)
const ELY_PATTERNS = ['none', 'spots', 'bands', 'stripe', 'dark'], ELY_IN = 0.6;
// - the pronotal pattern (meta.bodyGenes.thorax.pronPat, on bodySig as 'pp' + its initial; the ladybird's spots and dark
//   disc, a leaf beetle's vittae): none, disc (one dark disc), sides (dark sides round a pale disc, two regions), spots
//   (two), vittae (two), drawn as hatched shapes (meta.thorax.pattern) inside the pronotum's outline (meta.thorax.profile,
//   within ELY_IN), the hatch ELY_PITCH px apart at plate scale on the default and the device plate
const PRON_PATTERNS = { none: 0, disc: 1, sides: 2, spots: 2, vittae: 2 };
// - the pronotum : elytra width class (meta.bodyGenes.thorax.pronClass, on bodySig as 'pr' + its initial): the drawn
//   pronotum's width over both elytra's (as beetleProportions measures it) lies in PRON_CLASS[class], three overlapping
//   thirds of the research band BEETLE.pronEly (a narrow carabid pronotum to one nearly the elytra's width)
const PRON_CLASS = { narrow: [0.55, 0.71], mid: [0.65, 0.81], broad: [0.75, 0.9] };
// - pronotal armature (meta.bodyGenes.armature, on bodySig as 'ar' + the horn's initial or '-' and 's' for spines): a horn
//   only on a scarab (Dynastinae, Geotrupinae: a cephalic horn rising from the head, a pronotal horn projecting forward
//   over it), lateral pronotal spines only on a longhorn (Cerambycidae). meta.armature: horn { kind, base, tip } and the
//   right side's spines [{ base, tip }]: a cephalic horn's base inside the head outline, a pronotal horn's on the
//   pronotum; the tip near the midline (ARM.tipX head widths) and at least ARM.ahead head widths ahead of its base's part
//   (the head's front / the pronotum's); a spine's base on the pronotal margin (within ARM.edge body units) and its tip
//   ARM.spine[0]-ARM.spine[1] of the pronotum's half width out past it
const ARM = { horn: ['scarab'], spines: ['longhorn'], tipX: 0.15, ahead: 0.2, edge: 2, spine: [0.2, 0.6] };
// - a stag beetle's mandibles (Lucanidae; ref thorax-col-lucanus-jacobson, docs/research-thorax.md): two antler-like jaws
//   (meta.head.mand) each reaching STAG.len head widths ahead of the head's front, bowed out to at least STAG.spread head
//   widths from the midline and curving back in to a tip within STAG.tipX of it, with an inner tooth
//   (meta.head.mandTeeth, one point per jaw, between the head's front and the jaw's tip); the jaw size class
//   (major from STAG.major head widths, else minor) is tallied
const STAG = { len: [0.55, 1.15], spread: 0.42, tipX: 0.3, major: 0.8 };
// - the fore tibia (meta.bodyGenes.legs[0].tibTeeth, on bodySig as 'ft' + the count): fossorial, toothed along its outer
//   edge (FOSS.teeth teeth; Scarabaeidae, Lucanidae, the digging carabids), only on the FOSS.fams families, or slender (0).
//   Drawn: meta.legs[0].tib.teeth is the gene's count, and each tooth tip (meta.legs[0].tib.tips) stands at least
//   FOSS.out of the tibia's widest width off its axis, on the side away from the midline, over FOSS.at of its length (the
//   apical tooth at the tip)
const FOSS = { fams: ['scarab', 'lucanid', 'ground'], teeth: [2, 4], out: 0.4, at: [0.3, 1.15] };   // at: the apical tooth stands at the tip
const colFams = {};   // family -> beetle plates, for POST.colGenes
const colTally = {};   // gene -> value -> beetle plates, for POST.colGenes
const tally = (g, v) => { const T = colTally[g] ||= {}; T[v] = (T[v] || 0) + 1; };
const COL_SHARE = 0.05, COL_GENE_MIN = 20;   // ... and a gene is held to it once COL_GENE_MIN plates rolled it (a family's own gene: its plates)   // a gene value drawn on fewer of the plates that roll the gene is one the sheet never shows
const COL_VALUES = { build: Object.keys(COL_BUILD).flatMap(f => Object.keys(COL_BUILD[f]).map(b => f + ':' + b)), spotLayout: SPOT_LAYOUTS, outline: ELY_OUTLINES, shoulder: ['square', 'rounded'], pattern: ELY_PATTERNS, pronPattern: Object.keys(PRON_PATTERNS), pronClass: Object.keys(PRON_CLASS), horn: ['none', 'cephalic', 'pronotal'], spines: ['0', '1'], stag: ['minor', 'major'], foretibia: ['slender', 'toothed'] };
const COL_GENE_CHECKS = ['colFamily', 'elytraOutline', 'elytraPattern', 'pronotumPattern', 'pronotumRatio', 'beetleArmature', 'stagMandibles', 'foretibia', 'colBuild', 'spotLayout'];   // the #53 and #74 checks POST.colGenes audits
const COL_MIN = 40;   // beetle plates a run needs before a #25 check that never ran fails rather than being reported (a family is 1/9 of beetles since #53: no weevil in 40 has odds 0.009)
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
// #53 a hatch's line spacing (body units): the segments [a, b] must share one direction (null if not), and the spacing is
// the smallest step between their distinct offsets along its normal (Infinity for fewer than two lines)
const hatchGap = H => {
  if (H.length < 2) return Infinity;
  const [a0, b0] = H[0], L0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]), d = [(b0[0] - a0[0]) / L0, (b0[1] - a0[1]) / L0];
  if (H.some(([a, b]) => Math.abs((b[0] - a[0]) * d[1] - (b[1] - a[1]) * d[0]) > 1e-3 * Math.hypot(b[0] - a[0], b[1] - a[1]) + 1e-6)) return null;
  const off = [...new Set(H.map(([a]) => Math.round((a[0] * d[1] - a[1] * d[0]) * 1e4) / 1e4))].sort((x, y) => x - y);
  let gap = Infinity; for (let i = 1; i < off.length; i++) gap = Math.min(gap, off[i] - off[i - 1]);
  return gap;
};
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
// the body's half width at y on a plate: the wider of the thorax and abdomen profiles (the engine's underBody reads the same)
const bodyHwAt = (meta, y) => Math.max(profHw(meta.thorax.profile, y, 0.11), profHw(meta.abdomen.profile, y));
const rotAbout = (p, c, deg) => { const a = deg * Math.PI / 180, dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
const skewedPts = leg => leg.pts.map(p => rotAbout(p, leg.pivot, leg.skew));   // the left leg before mirroring: the right leg rotated about its coxa by its skew (plan step 7)
const LEG_WING_CLEAR = 1.5;   // legWings: a joint's disc beyond its half width, the engine's WING_LEG_CLEAR (the same 16 rim points, and the same body: both read meta's sampled thorax and abdomen profiles)
const legRun = {};   // type -> { n, reroll, repaired, placed } over the run (CHECKS.legWings, for POST.legWings): plates whose body-only pose roll re-rolled, whose rolled pose broke against the wings and was repaired, and where a pair was placed first
const sweptRun = {};   // type -> { n, scales, under } over the run's swept-antenna beetle and grasshopper plates (CHECKS.sweptForelegs, for POST.sweptReport); the scales
// themselves, not their sum, so a sharded run (#77) adds them in seed order and its mean is the serial run's to the last bit
const SWEPT_SCALE = 0.7;   // #47: the plate scale a swept plate is counted under in POST.sweptReport
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
  // #86 the contract check still catches what it guards now that loadEngine runs the block in a function scope: each case
  // is the real engine block with one breach spliced in, written to a temp copy of index.html, and must be reported. The
  // global is reached by a computed name so only the run under vm (not the source scan) can catch it; a top-level
  // `return` is legal in a function body but a SyntaxError in a page's <script>, so the loader must still reject it as running the block as a script does
  contractGuard(fail) {
    const fs = require('fs'), path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const block = html.match(ENGINE_RE)[1];
    const cases = [
      ['a browser global reached at load', b => b.replace(/\n\/\/ ---------- PRNG/, "\nglobalThis['loc' + 'ation'].href;\n// ---------- PRNG"), /throws when run under vm: .*'href'/],
      ['a missing export', b => b.replace(/, CAPTION_H \}/, ' }'), /exports differ from the contract/],
      ['a top-level return', b => b.replace(/\n\/\/ ---------- PRNG/, "\nif (typeof module === 'undefined') return;\n// ---------- PRNG"), /throws when run under vm: .*\breturn\b/i],
    ];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'insectdraw-contract-'));
    try {
      for (const [name, breach, want] of cases) {
        const bad = breach(block);
        if (bad === block) { fail('engine contract guard: the ' + name + ' case no longer applies to the engine block'); continue; }
        const file = path.join(dir, 'index.html');
        fs.writeFileSync(file, html.replace(block, () => bad));
        const got = engineContract(file);
        if (!got.some(m => want.test(m))) fail('engine contract guard: ' + name + ' is not reported (got: ' + (got.join('; ') || 'no problems') + ')');
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
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
      if (o.elytra !== undefined && (!o.elytra || !o.elytra.styles || !range2(o.elytra.pitch) || !range2(o.elytra.dash) || Object.values(o.elytra.fams || {}).some(e => e.len !== undefined && !range2(e.len)))) f('elytra is not { styles, pitch: [min, max], dash: [min, max], fams?: { fam: { len?: [min, max], truncate?, outlines?, square? } } }');
      if (o.pronotum !== undefined && (!o.pronotum || !range2(o.pronotum.wl) || !range2(o.pronotum.ely))) f('pronotum is not { wl: [min, max], ely: [min, max] }: ' + JSON.stringify(o.pronotum));
      if (o.foreCoxa !== undefined && !(o.foreCoxa && o.foreCoxa.clear >= 0 && typeof o.foreCoxa.dir === 'number')) f('foreCoxa is not { clear >= 0, dir (degrees) }: ' + JSON.stringify(o.foreCoxa));
      if (o.laneFloor !== undefined && typeof o.laneFloor !== 'boolean') f('laneFloor is not a boolean: ' + o.laneFloor);
      // #51: or named sets { name: { w, fw, hw } } with abdWing (optional since #52: the moth's wing length is its span gene), the family's sets replacing the order's
      const setsBad = w => !w.sets || (w.abdWing !== undefined && !range2(w.abdWing)) || Object.values(w.sets).some(v => !(v.w > 0) || !range2(v.fw) || !range2(v.hw));
      if (o.wingSet !== undefined && (!o.wingSet || (o.wingSet.sets ? setsBad(o.wingSet) || Object.values(o.wingSet.fams || {}).some(w => (w.sets || w.abdWing) && setsBad(Object.assign({}, o.wingSet, w)))
        : !range2(o.wingSet.fw) || !range2(o.wingSet.hw) || Object.values(o.wingSet.fams || {}).some(w => (w.fw && !range2(w.fw)) || (w.hw && !range2(w.hw))))))
        f('wingSet is not { fw: [min, max], hw: [min, max], fams?: { fam: { fw?, hw? } } } nor { abdWing?, sets: { set: { w, fw, hw } }, fams? }: ' + JSON.stringify(o.wingSet));
      if (o.wingPlans !== undefined && Object.values(o.wingPlans).some(f => Object.keys(o.wingPlans).includes(f))) f('wingPlans maps a family onto another mapped family: ' + JSON.stringify(o.wingPlans));
      if (o.chaetae !== undefined && Object.values(o.chaetae).some(c => !(o.chaetaeKinds || {})[c.kind] || !(c.p > 0 && c.p <= 1))) f('chaetae is not { fam: { kind (a chaetaeKinds key), p in (0, 1] } }: ' + JSON.stringify(o.chaetae));
      if (o.wingSetFams !== undefined && Object.values(o.wingSetFams).some(w => Object.keys(w).some(k => !(o.wingSets || {})[k]))) f('wingSetFams weighs a set wingSets does not have');
      // #50 the mayfly's opt-ins: legSexes keyed by sex; tails with a splay band per class and a count and length per family;
      // hindwing weighing only its size classes (or absent)
      if (o.legSexes !== undefined && Object.keys(o.legSexes).some(k => !['male', 'female'].includes(k))) f('legSexes keys something other than male / female: ' + Object.keys(o.legSexes));
      if (o.tails !== undefined && (!o.tails.splay || Object.keys(o.tails.splays || {}).some(k => !range2(o.tails.splay[k])) || !range2(o.tails.curve) || Object.values(o.tails.fams || {}).some(t => !(t.n === 2 || t.n === 3) || !range2(t.len))))
        f('tails is not { splay: { class: [min, max] }, splays: { class: w }, curve: [min, max], fams: { fam: { n: 2 | 3, len: [min, max] } } }');
      if (o.hindwing !== undefined && Object.values(o.hindwing.fams || {}).some(w => Object.keys(w).some(k => k !== 'absent' && !range2((o.hindwing.len || {})[k])))) f('hindwing.fams weighs a class hindwing.len has no range for');
      if (o.antFit !== undefined && !(o.antFit && o.antFit.scale > 0 && o.antFit.width > 0)) f('antFit is not { scale, width } (both > 0): ' + JSON.stringify(o.antFit));
      // #72 the grasshopper's orth table: a length range per tegmen class, the families' class weights only over those
      // classes, and the open set's, the along pose's, the groundhopper process's and the sabre's ranges
      if (o.orth !== undefined) {
        const t = o.orth, w = t.open || {}, al = t.along || {};
        if (!t.tegmen || Object.values(t.tegmen).some(c => !range2(c.len) || !c.ends || (c.lobe && c.lobe !== 'pad' && c.lobe !== 'scale')) || Object.values(t.tegFams || {}).some(x => Object.keys(x).some(k => !t.tegmen[k])) || !range2(w.teg) || !range2(w.hind) || !range2(w.anal)
          || !range2(al.F) || !range2(al.tib) || !range2(al.T) || Object.values(t.process || {}).some(v => !range2(v.reach) || !range2(v.w)) || Object.values(t.ovipositor || {}).some(v => !range2(v.len) || !v.kinds)
          || Object.values(t.sets || {}).some(x => Object.keys(x).some(k => k !== 'folded' && k !== 'open')) || Object.values(t.hindPoses || {}).some(x => Object.keys(x).some(k => k !== 'splayed' && k !== 'along')))
          f('orth is not { tegmen: { class: { len, ends, lobe?: pad / scale, wK? } }, tegFams, sets (folded / open), open: { teg, hind, anal }, hindPoses (splayed / along), along: { F, tib, T }, process: { fam: { reach, w } }, ovipositor: { fam: { len, kinds } } }');
      }
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
      for (const [tab, T] of [['headFams', o.headFams || {}], ['abdFams', o.abdFams || {}], ['legs', o.legs || {}], ['ant', o.ant || {}], ['famScale', o.famScale || {}], ['wingFams', o.wingFams || {}], ['elytra.fams', (o.elytra && o.elytra.fams) || {}], ['wingSet.fams', (o.wingSet && o.wingSet.fams) || {}], ['wingSetFams', o.wingSetFams || {}], ['wingPlans', o.wingPlans || {}], ['chaetae', o.chaetae || {}],
        ['tails.fams', (o.tails && o.tails.fams) || {}], ['hindwing.fams', (o.hindwing && o.hindwing.fams) || {}], ['foreFams', o.foreFams || {}],
        ['orth.tegFams', (o.orth && o.orth.tegFams) || {}], ['orth.sets', (o.orth && o.orth.sets) || {}], ['orth.hindPoses', (o.orth && o.orth.hindPoses) || {}], ['orth.ovipositor', (o.orth && o.orth.ovipositor) || {}], ['orth.process', (o.orth && o.orth.process) || {}],
        ['armature', o.armature || {}], ['pronotum.shapes', (o.pronotum && o.pronotum.shapes) || {}], ['pronotum.classW', (o.pronotum && o.pronotum.classW) || {}], ['pronotum.patterns', (o.pronotum && o.pronotum.patterns) || {}],
        ['wingPig', o.wingPig || {}], ['rest.fams', (o.rest && o.rest.fams) || {}]])
        for (const k of Object.keys(T)) if (k !== 'base' && !fams.has(k)) f(tab + '.' + k + ' keys a family the proportions roll never produces (rolled: ' + [...fams].filter(Boolean).join('/') + ')');
    }
  },
  // Latin agreement (#29): every epithet stem x genus gender the engine declines (E.EPITHETS) is written out once in
  // tests/names.js FORMS, from the Latin, and none ends -oris / -ore (saltator is a noun, not a class B adjective)
  epithets(fail) {
    for (const msg of epithetProblems(E.EPITHETS)) fail('epithet: ' + msg);
  },
  // Family nouns (#28): a names table whose order rolls two or more families (per variant) has a noun list per family
  // (common.famNouns) keyed only by families it rolls, the lists disjoint (so a noun names one family), and holding the
  // nouns the ticket names (tests/names.js FAM_NOUN_SPEC: an ichneumonid is an Ichneumon, a papilionid a Swallowtail)
  nameFamilies(fail) {
    E.generateInsect(1);   // seeds the module rng so proportions can be rolled outside a plate
    const rolled = {};   // names-table key (variant or type) -> Set of families
    for (const type of E.TYPES) for (let i = 0; i < 400; i++) {
      const P = { variant: null, fam: null, abdOverlap: 8 };
      E.ORDERS[type].proportions(P);
      const key = (P.variant && E.ORDERS[type].variantNames && E.ORDERS[type].variantNames[P.variant]) ? P.variant : type;
      (rolled[key] ||= { type, variant: key === type ? null : P.variant, fams: new Set() }).fams.add(P.fam);
    }
    for (const key in rolled) {
      const { type, variant, fams } = rolled[key], c = namesTable(type, variant).common, fn = c.famNouns || {}, f = msg => fail('names ' + key + ': ' + msg);
      const real = [...fams].filter(Boolean);
      if (real.length >= 2) for (const fam of real) if (!Array.isArray(fn[fam]) || !fn[fam].length) f('no family nouns for ' + fam);
      for (const fam of Object.keys(fn)) if (!real.includes(fam) && type !== 'damselfly')   // the damselfly's families are its antenodal plans, set by the wing block (#17)
        f('famNouns.' + fam + ' keys a family the order never rolls');
      const owner = {};
      for (const fam of Object.keys(fn)) for (const n of fn[fam]) { if (owner[n] && owner[n] !== fam) f('noun ' + n + ' is in both ' + owner[n] + ' and ' + fam); owner[n] = fam; }
      for (const fam in (FAM_NOUN_SPEC[key] || {})) for (const n of FAM_NOUN_SPEC[key][fam]) if (!(fn[fam] || c.nouns).includes(n)) f(fam + ' has no noun ' + n);
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
    // #51 an entry with a prothorax gene keeps its roots on the pterothorax behind the rolled pronotum (T.pron, laid out for
    // T.pron0): a root at t sits at pron + (t - pron0)(1 - pron)/(1 - pron0)
    const T = meta.bodyGenes.thorax, want = reg && reg.prothorax ? roots.map(t => T.pron + (t - T.pron0) * (1 - T.pron) / (1 - T.pron0)) : roots;
    if (want && th.wingRoots.some((t, i) => Math.abs(t - want[i]) > 1e-9) || (want && th.wingRoots.length !== want.length)) fail('meta.thorax.wingRoots is not the registry\'s: ' + JSON.stringify(th.wingRoots));
    for (const t of th.wingRoots || []) {
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
    // it is at least 1.8x as wide as the mid femur (its proportions are the hindFemur check)
    if (meta.type === 'grasshopper' && hi && mi && hi.femW !== undefined) {
      if (hi.femW < 1.8 * mi.femW) fail('grasshopper hind femur only ' + (hi.femW / mi.femW).toFixed(2) + 'x the mid femur width');
    }
    checkLegSet(meta, meta.legs.map(l => l.pts), '', fail);
  },
  // #23 the saltatorial hind femur as drawn (meta.legs[2].fem: trochanter-to-knee length, outline width every twentieth,
  // the span the herringbone chevrons cover) against docs/ref/leg-orth-femur.jpg: HIND_FEMUR.ratio long per widest width,
  // widest in the proximal third (not at the trochanter: a drumstick, not a carrot), chevrons over the whole outer face
  hindFemur(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    const f = meta.legs[2] && meta.legs[2].fem;
    if (!f || !(f.L > 0) || !f.widths || f.widths.length !== 21) return fail('no drawn hind femur profile on meta.legs[2].fem');
    const wMax = Math.max(...f.widths), at = f.widths.indexOf(wMax) / 20, r = f.L / wMax;
    if (r < HIND_FEMUR.ratio[0] || r > HIND_FEMUR.ratio[1]) fail('grasshopper hind femur length/width ' + r.toFixed(2) + ' outside ' + HIND_FEMUR.ratio.join('-'));
    if (at < HIND_FEMUR.peak[0] || at > HIND_FEMUR.peak[1]) fail('grasshopper hind femur widest at ' + at.toFixed(2) + ' of its length, not in ' + HIND_FEMUR.peak.join('-'));
    if (!f.herring || f.herring[0] > HIND_FEMUR.herring[0] || f.herring[1] < HIND_FEMUR.herring[1]) fail('grasshopper hind femur herringbone covers ' + JSON.stringify(f.herring && f.herring.map(x => +x.toFixed(2))) + ', not ' + HIND_FEMUR.herring.join('-') + ' of the face');
  },
  // mirror skew (plan step 7): the left legs are the right legs rotated 0-6 degrees about their own coxa, then mirrored;
  // the rotated set must hold the same pose invariants as the right legs
  legSkew(meta, svg, fail) {
    if (!meta.legSkew || meta.legSkew.length !== 3) return fail('no legSkew on meta');
    for (const leg of meta.legs) { const a = Math.abs(leg.skew); if (a !== 0 && (a < 2 || a > 6)) fail(leg.pair + ' leg skew ' + leg.skew.toFixed(1) + ' outside 2-6 degrees (or 0)'); }
    checkLegSet(meta, meta.legs.map(skewedPts), ' skewed', fail);
  },
  // legs and wings (#8, decision "under the wing, cleanly"): the legs are drawn under the wings' white fill (and under the
  // body), so each pair, right side and skewed left set, against meta.wingOutlines (right side, body coordinates), from
  // the femur base on, sampled every ~2 px, either
  //  - shows: once a sample is visible no later one is hidden (no re-entry under a wing or the body, no stub between two
  //    wings), every sample from the tibia tip on lies outside every wing (the tibia's end and the whole tarsus show,
  //    never a claw poking out), and no joint's disc (its half width + LEG_WING_CLEAR) straddles a wing margin (no
  //    knee or tarsal joint as a knot on the margin; a joint under the body is not drawn: the leg leaves the body there); or
  //  - is fully hidden: no sample's disc reaches past the wings and the body (nothing pokes out).
  // A sample is hidden when it is inside a wing outline or within the thorax or abdomen profile.
  legWings(meta, svg, fail) {
    const r = meta.legRoll, run = legRun[meta.variant || meta.type] ||= { n: 0, reroll: 0, repaired: 0, placed: 0 };
    run.n++; if (r.attempts > 1) run.reroll++; if (r.wingFirst) run.repaired++; if ((r.repaired || []).some(x => /placed first/.test(x))) run.placed++;
    const wings = meta.wingOutlines || [];
    if (!wings.length) return fail('no wing outlines on meta');
    const bodyHw = y => bodyHwAt(meta, y);
    const inWing = p => wings.some(poly => inPoly(p, poly));
    const state = p => inWing(p) ? 'W' : Math.abs(p[0]) < bodyHw(p[1]) ? 'B' : 'V';   // in a wing, under the body, visible
    const disc = (p, r) => { const s = new Set([state(p)]); for (let a = 0; a < 16; a++) s.add(state([p[0] + r * Math.cos(a * Math.PI / 8), p[1] + r * Math.sin(a * Math.PI / 8)])); return s; };
    for (const [label, get] of [['', leg => leg.pts], [' skewed', skewedPts]]) for (const leg of meta.legs) {
      const pts = get(leg), samples = [];   // [point, segment index for its half width, is a joint]
      for (let k = 2; k + 1 < pts.length; k++) {
        const a = pts[k], b = pts[k + 1], n = Math.max(1, Math.ceil(dist(a, b) / 2));
        for (let q = k === 2 ? 0 : 1; q <= n; q++) samples.push([[a[0] + (b[0] - a[0]) * (q / n), a[1] + (b[1] - a[1]) * (q / n)], Math.min(q === n ? k + 1 : k, pts.length - 2), q === 0 || q === n, q === n ? k + 1 : k]);
      }
      const what = leg.pair + label + ' leg';
      if (!samples.some(s => state(s[0]) === 'V')) {
        const poke = samples.find(([p, k]) => disc(p, leg.segHw[k] + LEG_WING_CLEAR).has('V'));
        if (poke) fail(what + ' hidden under the wings but pokes out: at ' + poke[0].map(v => v.toFixed(1)).join(','));
        continue;
      }
      let out = false, why = null;
      for (const [p, k, joint, j] of samples) {
        const s = state(p);
        if (s !== 'V' && out) { why = 'emerges and goes back under the ' + (s === 'W' ? 'wing' : 'body'); break; }
        if (s === 'V') out = true;
        if (j >= 4 && s === 'W') { why = 'tibia end or tarsus under a wing (a stub)'; break; }
        if (joint && Math.abs(p[0]) >= bodyHw(p[1])) { const d = disc(p, leg.segHw[k] + LEG_WING_CLEAR); if (d.has('V') && d.has('W')) { why = 'joint on a wing margin (a knot)'; break; } }
      }
      if (why) fail(what + ' ' + why);
    }
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
  // #23 grasshopper antennae: the antenna alone never pulls the plate under scale GRASS_ANT.scale (the plate scale
  // against the scale of meta.antennae.box0, the box before the antennae: body, legs and wings, with the same margins and
  // 1.3 cap as assemblePlate), the right antenna reaches no further out than GRASS_ANT.width x that box's half width (so
  // the whole pair spans at most that many times the rest of the plate), and a tetrigid's shaft is at least
  // GRASS_ANT.tetrigid head widths long as drawn
  grasshopperAntenna(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    const an = meta.antennae, b = an && an.box0;
    if (!b || !(an.headW > 0)) return fail('no pre-antenna box / head width on meta.antennae');
    const hw = Math.max(Math.abs(b.minX), b.maxX), sc0 = Math.min(552 / (2 * hw), 507 / (b.maxY - b.minY), 1.3);
    if (meta.scale < Math.min(GRASS_ANT.scale, sc0) - 1e-6) fail('grasshopper antenna alone pulls the plate under scale ' + GRASS_ANT.scale + ' (' + an.pose + ')');
    const out = Math.max(...an.pts.map(p => p[0]));
    if (out > GRASS_ANT.width * hw + 1e-6) fail('grasshopper antenna reaches past ' + GRASS_ANT.width + 'x the body box half width (' + an.pose + ')');
    if (an.fam === 'tetrigid') {
      const pl = an.lines[0].pl; let len = 0;
      for (let i = 1; i < pl.length; i++) len += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
      if (len < GRASS_ANT.tetrigid * an.headW) fail('tetrigid antenna under ' + GRASS_ANT.tetrigid + ' head widths long');
    }
  },
  // #47 a long-horned plate (beetle or grasshopper) whose antennae are rolled swept folds its forelegs beside the head, so
  // the sweep clears them under #7's rule as rolled: the antenna is never re-rolled for a leg (meta.antennae.reasons) nor
  // laid forward in a fallback pose (meta.antennae.why with its tip ahead of the head's front, meta.head.top: #7's forward
  // V; a longhorn's back sweep that finds no room between its elytra and ANT_BACK_OUT (#25) keeps its own, backward,
  // fallback), and the fore femur and tibia stay behind the head's front
  sweptForelegs(meta, svg, fail) {
    if ((meta.type !== 'beetle' && meta.type !== 'grasshopper') || !meta.antennae || meta.antennae.pose !== 'swept') return;
    const an = meta.antennae, fore = meta.legs[0];
    const R = sweptRun[meta.type] ||= { n: 0, scales: [], under: 0 };
    R.n++; R.scales.push(meta.scale); if (meta.scale < SWEPT_SCALE) R.under++;
    if (an.reasons.includes('legs')) fail('swept antenna re-rolled for a leg (' + meta.fam + ', legs ' + meta.legRoll.pose + '; reasons ' + an.reasons.join(',') + ')');
    if (an.why && an.tip[1] < meta.head.top) fail('swept antenna laid forward in its fallback pose after ' + an.why + ' (' + meta.fam + ')');
    if (fore.pts.slice(2, 5).some(p => p[1] < meta.head.top)) fail('swept plate with the fore femur or tibia ahead of the head (' + meta.fam + ', legs ' + meta.legRoll.pose + ')');
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
  // #65 the corbicula is seen, not just its tarsus: the share of the hind tibia (pts[3] knee to pts[4] tibia tip) outside
  // every wing outline and the body profiles, sampled every ~1 px, the lesser of the right leg and the skewed left one;
  // tallied for POST.beeBasket (a per-run share: the ticket asks for 7 of 9 plates, not every one)
  beeBasket(meta, svg, fail, { seed }) {
    if (meta.type !== 'bee') return;
    beeSeen.beeBasket++;
    const hind = meta.legs.find(l => l.pair === 'hind'), wings = meta.wingOutlines || [];
    if (!hind || !wings.length) return fail('bee plate without a hind leg or wing outlines on meta');
    const bodyHw = y => bodyHwAt(meta, y);
    const behindWing = p => wings.some(w => w.some((a, i) => { const b = w[(i + 1) % w.length]; if ((a[0] > p[0]) === (b[0] > p[0])) return false; return a[1] + (b[1] - a[1]) * (p[0] - a[0]) / (b[0] - a[0]) < p[1]; }));   // an outline edge crosses the line toward the head
    const shown = pts => {
      const a = pts[3], b = pts[4], n = Math.max(2, Math.ceil(dist(a, b)));
      let v = 0;
      for (let q = 0; q <= n; q++) { const p = [a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n]; if (Math.abs(p[0]) >= bodyHw(p[1]) && !wings.some(w => inPoly(p, w)) && behindWing(p)) v++; }
      return v / (n + 1);
    };
    const vis = Math.min(shown(hind.pts), shown(skewedPts(hind)));
    basketRun.n++;
    if (vis >= BEE_BASKET.vis) basketRun.shown++;
    else basketRun.worst.push(seed + ' (' + vis.toFixed(2) + ')');
  },
  // #83 meta.legRoll.basket says what the basket rule did, honestly: 'shown' (the repair held it), 'dropped' only when it
  // is the basket rule that failed (no pose showed the basket, and without the rule #8's wing rule settled the legs, so
  // legRoll.wingWhy is null), 'unplaced' when #8's rule alone found no pose either (the basket was never what failed)
  beeBasketLabel(meta, svg, fail) {
    if (meta.type !== 'bee') return;
    beeSeen.beeBasketLabel++;
    const lr = meta.legRoll || {}, b = lr.basket;
    if (!['shown', 'dropped', 'unplaced'].includes(b)) return fail('bee legRoll.basket ' + JSON.stringify(b) + ' (want shown, dropped or unplaced)');
    if (b !== 'unplaced' && lr.wingWhy) fail('bee legRoll.basket ' + b + ' but #8 found no pose (wingWhy ' + lr.wingWhy + '; want unplaced)');
    if (b === 'unplaced' && !lr.wingWhy) fail('bee legRoll.basket unplaced but #8 settled the legs (want dropped or shown)');
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
    const s = meta.wingStats || {}, fam = DIP_PLAN[meta.fam] || meta.fam, o = dipStats[fam] ||= { type: meta.type, wl: [], rm: [], bmcu: [] };
    o.wl.push(pcaAspect(meta.wingOutlines[0]));
    if (typeof s.rm !== 'number') return fail('Diptera wingStats has no r-m length');
    if (s.rm > 0) o.rm.push(s.rm);
    if (s.bmcu > 0) o.bmcu.push(s.bmcu);
  },
  // #54 the fly's wing set (meta.fly.set, rolled with the body, read by wingsDiptera) against DIP_SET: the drawn angle in
  // the set's band; folded wings overlap their mirror images over the midline and leave the abdomen's sides showing
  dipWingSet(meta, svg, fail) {
    if (meta.type !== 'fly') return;
    const set = meta.fly && meta.fly.set, band = DIP_SET.theta[set];
    if (!band) return fail('fly plate has no known wing set on meta.fly: ' + set);
    dipSet.sets[set] = (dipSet.sets[set] || 0) + 1;
    const th = meta.wingTheta;
    if (!(th >= band[0] && th <= band[1])) fail('fly wing angle ' + (+th).toFixed(1) + ' outside the ' + set + ' band ' + band.join('-'));
    if (set !== 'folded') return;
    const w = meta.wingOutlines[0], xMin = Math.min(...w.map(p => p[0]));
    if (xMin > -DIP_SET.cross) fail('folded fly wing does not cross the midline: reaches x ' + xMin.toFixed(1) + ' (want <= -' + DIP_SET.cross + ')');
    const ab = meta.abdomen.profile.filter(([y, hw]) => y > meta.thorax.yBot + 2 && hw > 3);
    if (!ab.some(([y, hw]) => { const x = rightmostAt(w, y); return x === null || x < hw - DIP_SET.side; })) fail('folded fly wings cover the abdomen\'s sides along its whole length');
  },
  // #52 the lepidopteran wing set (meta.lep.set, rolled with the body, read by wingsLepidoptera): the forewing's inner margin
  // in the set's band, and the hindwing's share under the forewing following it
  lepWingSet(meta, svg, fail) {
    if (meta.type !== 'moth') return;
    const m = meta.lep || {}, band = LEP_SET.margin[m.set], v = meta.variant;
    if (!band) return fail('lepidopteran plate has no known wing set on meta.lep: ' + m.set);
    const S = lepSet.sets[v] ||= {}; S[m.set] = (S[m.set] || 0) + 1;
    const F = lepSet.fams[meta.fam] ||= { n: 0, delta: 0 }; F.n++; if (m.set === 'delta') F.delta++;
    const ang = Math.atan2(m.fore.tornus[1] - m.fore.inner[1], m.fore.tornus[0] - m.fore.inner[0]) * 180 / Math.PI;
    if (ang < band[0] - LEP_SET.tol || ang > band[1] + LEP_SET.tol) fail('lepidopteran forewing inner margin outside its set: ' + ang.toFixed(1) + ' degrees (' + m.set + ': ' + band.join('-') + ')');
    const minX = Math.min(...meta.wingOutlines[0].map(p => p[0]));
    if (Math.abs(minX) < LEP_SET.midline - 0.05) fail('lepidopteran forewing ends ' + minX.toFixed(1) + ' from the midline (a seam with its pair; want >= ' + LEP_SET.midline + ' either side)');
    const hMinX = Math.min(...meta.wingOutlines[1].map(p => p[0]));
    if (hMinX < LEP_SET.hindMidline - 0.05) fail('lepidopteran hindwing reaches ' + hMinX.toFixed(1) + ' from the midline (crosses its pair; want >= ' + LEP_SET.hindMidline + ')');
    const [fw, hw] = meta.wingOutlines, xs = hw.map(p => p[0]), ys = hw.map(p => p[1]);
    let n = 0, under = 0;
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2) if (inPoly([x, y], hw)) { n++; if (inPoly([x, y], fw)) under++; }
    lepSet.cov[m.set].push(n ? under / n : 0);
  },
  // #52 the lepidopteran leg pose families and the nymphalid brush forelegs, on the drawn legs (meta.legs[i].pts) against
  // meta.wingOutlines and the body profiles (a sample is hidden inside a wing or the body, as legWings reads it)
  lepLegs(meta, svg, fail) {
    if (meta.type !== 'moth') return;
    const pose = meta.legRoll.pose, wings = meta.wingOutlines;
    if (!LEP_LEGS.poses.includes(pose)) return fail('lepidopteran leg pose not a known family: ' + pose);
    if (meta.variant === 'moth') lepSet.poses[pose] = (lepSet.poses[pose] || 0) + 1;
    const bodyHw = y => bodyHwAt(meta, y);
    const shows = pts => { for (let k = 2; k + 1 < pts.length; k++) { const a = pts[k], b = pts[k + 1], n = Math.max(1, Math.ceil(dist(a, b) / 2));
      for (let q = 0; q <= n; q++) { const p = [a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n]; if (!wings.some(w => inPoly(p, w)) && Math.abs(p[0]) >= bodyHw(p[1])) return true; } } return false; };
    const len = pts => { let L = 0; for (let k = 2; k + 1 < pts.length; k++) L += dist(pts[k], pts[k + 1]); return L; };
    const [fore, mid, hind] = meta.legs;
    if (pose === 'hidden') {
      const h = meta.legs.filter(l => !shows(l.pts)).length;
      lepSet.hidden[0]++; if (h >= LEP_LEGS.hiddenPairs) lepSet.hidden[1]++;
      if (h < 1) fail('lepidopteran legs posed hidden show every pair');
    }
    if (pose === 'spread' && !fore.brush && !(meta.legRoll.repaired || []).some(r => /^front/.test(r))) {   // as rolled: #8's repair may turn a foreleg to clear the wings
      const a = Math.atan2(fore.pts[3][1] - fore.pts[2][1], fore.pts[3][0] - fore.pts[2][0]) * 180 / Math.PI; if (a < LEP_LEGS.spreadFemur) fail('lepidopteran forelegs posed spread are raised: femur at ' + a.toFixed(1) + ' degrees (min ' + LEP_LEGS.spreadFemur + ')'); }
    if (LEP_LEGS.brushFams.includes(meta.fam)) {
      if (!fore.brush) fail(meta.fam + ' foreleg not a brush');
      if (len(fore.pts) > LEP_LEGS.brush * len(mid.pts)) fail(meta.fam + ' foreleg not reduced: ' + (len(fore.pts) / len(mid.pts)).toFixed(2) + 'x the mid leg (max ' + LEP_LEGS.brush + ')');
      if (meta.lep.set !== 'forward') { lepSet.brushMid[0]++; if (shows(mid.pts)) lepSet.brushMid[1]++; }   // forewings pushed forward cover the room ahead of them
    }
  },
  // #52 the lepidopteran family's abdomen (meta.fam) against LEP_ABD, on the drawn outlines and meta.lep.abd's marks
  lepAbdomen(meta, svg, fail) {
    if (meta.type !== 'moth') return;
    const fam = meta.fam, H = LEP_ABD, la = meta.lep && meta.lep.abd;
    if (!la) return fail('lepidopteran plate has no abdomen record on meta.lep.abd');
    const ab = meta.abdomen, abW = maxHw(ab.profile), thW = maxHw(meta.thorax.profile), len = ab.yBot - ab.yTop, lw = len / (2 * abW), aw = abW / thW;
    const fwo = meta.wingOutlines[0], fl = Math.max(...fwo.map(p => dist(p, fwo[0]))), fw = len / fl;
    const hw = t => profHw(ab.profile, ab.yTop + t * len), r = v => (+v).toFixed(2);
    const widestT = () => { let b = 0; for (let t = 0; t <= 1.0001; t += 0.01) if (hw(t) > hw(b)) b = t; return b; };
    for (const sp of la.spots.concat(la.crests)) if (Math.abs(sp[0]) + (sp[2] || 0) > profHw(ab.profile, sp[1])) return fail(fam + ' abdomen mark outside the outline at y ' + r(sp[1]));
    const along = (pts, lo, hi) => pts.filter(p => { const h = profHw(ab.profile, p[1]); return h > 0 && Math.abs(p[0]) >= lo * h && Math.abs(p[0]) <= hi * h; }).length;
    if (fam === 'sphingid') {
      if (lw < H.long || fw < H.longFw) fail('sphingid abdomen not long: ' + r(lw) + 'x its width, ' + r(fw) + ' of the forewing (min ' + H.long + ', ' + H.longFw + ')');
      if (widestT() > H.fusiT) fail('sphingid abdomen widest at t ' + r(widestT()) + ' (max ' + H.fusiT + ')');
      if (hw(0.9) > H.point * abW) fail('sphingid abdomen not pointed: ' + r(hw(0.9) / abW) + ' of its width at t 0.9 (max ' + H.point + ')');
      if (along(la.spots, H.lateral, 1) < H.spots) fail('sphingid abdomen has ' + along(la.spots, H.lateral, 1) + ' lateral spots (min ' + H.spots + ')');
    }
    if (fam === 'saturniid') {
      if (lw > H.stout || aw < H.stoutAw) fail('saturniid abdomen not short and stout: ' + r(lw) + 'x its width, ' + r(aw) + 'x the thorax (max ' + H.stout + ', min ' + H.stoutAw + ')');
      if (la.mark !== 'hairy') fail('saturniid abdomen not hairy: ' + la.mark);
    }
    if (fam === 'geometrid' && (aw > H.slender || lw < H.long)) fail('geometrid abdomen not slender: ' + r(aw) + 'x the thorax, ' + r(lw) + 'x its width (max ' + H.slender + ', min ' + H.long + ')');
    if (fam === 'arctiid') {
      if (!H.arctiid.includes(la.mark)) fail('arctiid abdomen neither spotted nor banded: ' + la.mark);
      if (la.mark === 'dorsal' && along(la.spots, 0, H.dorsal) < H.spots) fail('arctiid dorsal spot row has ' + along(la.spots, 0, H.dorsal) + ' spots (min ' + H.spots + ')');
    }
    if (fam === 'noctuid') {
      if (lw < H.medium[0] || lw > H.medium[1]) fail('noctuid abdomen not medium: ' + r(lw) + 'x its width (' + H.medium.join('-') + ')');
      if (la.crest && along(la.crests, 0, H.dorsal) < H.crests) fail('noctuid dorsal crests: ' + la.crests.length + ' (min ' + H.crests + ')');
    }
    if (fam === 'papilionid' && (lw < H.papilio || aw > H.slender)) fail('papilionid abdomen not long and slender: ' + r(lw) + 'x its width, ' + r(aw) + 'x the thorax (min ' + H.papilio + ', max ' + H.slender + ')');
    if (fam === 'lycaenid' && fw > H.small) fail('lycaenid abdomen not short: ' + r(fw) + ' of the forewing (max ' + H.small + ')');
  },
  // #54 the fly family's abdomen (meta.fly.fam) against DIP_HAB, on the drawn abdomen and thorax outlines
  dipHabitus(meta, svg, fail) {
    if (meta.type !== 'fly') return;
    const fam = meta.fly && meta.fly.fam, H = DIP_HAB;
    if (!H.fams.includes(fam)) return fail('fly plate has no known family on meta.fly: ' + fam);
    dipSet.fams[fam] = (dipSet.fams[fam] || 0) + 1;
    const ab = meta.abdomen, abW = maxHw(ab.profile), thW = maxHw(meta.thorax.profile), lw = (ab.yBot - ab.yTop) / (2 * abW);
    const hw = t => profHw(ab.profile, ab.yTop + t * (ab.yBot - ab.yTop));
    const widestT = () => { let b = 0; for (let t = 0; t <= 1.0001; t += 0.01) if (hw(t) > hw(b)) b = t; return b; };
    const r = (v, d = 2) => (+v).toFixed(d);
    if ((fam === 'tachinid' || fam === 'bombyliid') && lw > H.round) fail(fam + ' abdomen not round: ' + r(lw) + ' times as long as wide (max ' + H.round + ')');
    if (fam === 'asilid') {
      if (lw < H.long) fail('asilid abdomen not long: ' + r(lw) + ' times as long as wide (min ' + H.long + ')');
      if (hw(0.8) > H.taper * abW) fail('asilid abdomen does not taper: ' + r(hw(0.8) / abW) + ' of its width at t 0.8 (max ' + H.taper + ')');
    }
    if (fam === 'tabanid') {
      if (abW < H.broad * thW) fail('tabanid abdomen not broad: ' + r(abW / thW) + 'x the thorax (min ' + H.broad + ')');
      if (widestT() > 0.5) fail('tabanid abdomen not widest in its basal half (t ' + r(widestT()) + ')');
    }
    if (fam === 'conopid') {
      let w = Infinity; for (let t = 0.02; t <= 0.2; t += 0.01) w = Math.min(w, hw(t));
      if (w > H.waist * abW) fail('conopid abdomen not petiolate: ' + r(w / abW) + ' of its width at the base (max ' + H.waist + ')');
      if (widestT() < H.club) fail('conopid abdomen widest at t ' + r(widestT()) + ', not behind ' + H.club);
    }
    if (fam === 'syrphid') {
      if (lw < H.oval[0] || lw > H.oval[1]) fail('syrphid abdomen not a flat oval: ' + r(lw) + ' times as long as wide (want ' + H.oval.join('-') + ')');
      const mark = meta.bodyGenes.abd.mark; if (!H.ovalMarks.includes(mark)) fail('syrphid abdomen ' + mark + ', not ' + H.ovalMarks.join(' / '));
    }
    if (fam === 'nemato' && abW > H.slender * thW) fail('nematoceran abdomen not slender: ' + r(abW / thW) + 'x the thorax (max ' + H.slender + ')');
  },
  // #54 abdominal macrochaetae and pile (meta.fly.chaetae) against DIP_CHAETAE
  dipChaetae(meta, svg, fail) {
    if (meta.type !== 'fly') return;
    const c = meta.fly && meta.fly.chaetae, want = DIP_CHAETAE.always[meta.fly && meta.fly.fam];
    if (want && (!c || c.kind !== want)) return fail(meta.fly.fam + ' abdomen has no ' + want + ' (meta.fly.chaetae ' + (c && c.kind) + ')');
    if (!c) return;
    if (c.marks.length < DIP_CHAETAE.minMarks) return fail('fly abdominal ' + c.kind + ' has only ' + c.marks.length + ' marks');
    const prof = meta.abdomen.profile;
    for (const [b, t] of c.marks) {
      if (Math.abs(b[0] - profHw(prof, b[1], 2)) > DIP_CHAETAE.onRim) return fail('fly abdominal ' + c.kind + ' base off the rim at ' + b.map(v => v.toFixed(1)));
      if (t[0] <= profHw(prof, t[1], 2)) return fail('fly abdominal ' + c.kind + ' tip inside the abdomen at ' + t.map(v => v.toFixed(1)));
      if (t[1] < b[1] - 0.01) return fail('fly abdominal ' + c.kind + ' points forward');
    }
  },
  // #54 the family's legs against DIP_LEGS
  dipLegs(meta, svg, fail) {
    if (meta.type !== 'fly') return;
    const fam = meta.fly && meta.fly.fam, G = meta.bodyGenes.legs;
    if (fam === 'asilid') {
      const pts = meta.legs[2].pts, body = meta.abdomen.yBot - meta.thorax.yTop;
      let d = 0; for (let i = 2; i + 1 < pts.length; i++) d += dist(pts[i], pts[i + 1]);
      if (d < DIP_LEGS.asilidHind * body) fail('asilid hind leg not long: ' + (d / body).toFixed(2) + 'x the body (min ' + DIP_LEGS.asilidHind + ')');
      if (!(G[0].spines && G[0].spines.femur)) fail('asilid fore femur not spined (raptorial)');
    }
    if (fam === 'tachinid' && !G.every(g => g.spines)) fail('tachinid legs not bristly on every pair');
  },
  // #55 the crane fly's leg pose family and fore / hind length ratio (CRANE), on the right legs as drawn
  cranePose(meta, svg, fail) {
    if (meta.type !== 'cranefly') return;
    const c = meta.cranefly, roll = meta.legRoll, pose = roll && roll.pose;
    if (!c || !CRANE.ratios.includes(c.ratio)) return fail('crane fly plate has no known leg ratio on meta.cranefly: ' + (c && c.ratio));
    if (!CRANE.poses.includes(pose) && pose !== 'safe') return fail('crane fly leg pose ' + pose + ' is not a crane fly pose family');
    craneRun.poses[pose] = (craneRun.poses[pose] || 0) + 1;
    const fixed = new Set((roll.repaired || []).map(s => s.split(' ')[0])), J = meta.legs.map(l => l.pts), deg = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    const r = v => (+v).toFixed(1);
    if (pose === 'trailing') {
      if (!fixed.has('hind') && J[2][J[2].length - 1][1] <= meta.abdomen.yBot) fail('trailing crane fly hind leg ends at y ' + r(J[2][J[2].length - 1][1]) + ', not past the abdomen tip ' + r(meta.abdomen.yBot));
      if (!fixed.has('mid') && deg(J[1][3], J[1][4]) < CRANE.trailBack) fail('trailing crane fly mid tibia at ' + r(deg(J[1][3], J[1][4])) + ' degrees, not swept back (min ' + CRANE.trailBack + ')');
    }
    if (pose === 'forward' && !fixed.has('front')) {
      const antY = Math.min(...meta.antennae.pts.map(p => p[1])), tip = J[0][J[0].length - 1][1];
      if (tip >= antY) fail('forward crane fly foreleg ends at y ' + r(tip) + ', not ahead of the antennae (' + r(antY) + ')');
    }
    if (pose === 'pinned' && !fixed.has('mid')) {
      const a = deg(J[1][2], J[1][4]);
      if (Math.abs(a) > CRANE.pinnedOut) fail('pinned crane fly mid leg at ' + r(a) + ' degrees, not held straight out (max ' + CRANE.pinnedOut + ')');
    }
    const fore = legReach(J[0]), hind = legReach(J[2]);
    if (c.ratio === 'front' && !(fore > hind)) fail('crane fly fore leg ' + r(fore) + ' not longer than the hind ' + r(hind) + ' (ratio front)');
    if (c.ratio === 'hind' && !(hind > fore)) fail('crane fly hind leg ' + r(hind) + ' not longer than the fore ' + r(fore) + ' (ratio hind)');
  },
  // #55 the crane fly family's habitus (CRANE) on the drawn plate
  craneHabitus(meta, svg, fail) {
    if (meta.type !== 'cranefly') return;
    const fam = meta.cranefly && meta.cranefly.fam;
    if (!CRANE.fams.includes(fam)) return fail('crane fly plate has no known family on meta.cranefly: ' + fam);
    craneRun.fams[fam] = (craneRun.fams[fam] || 0) + 1;
    const body = meta.abdomen.yBot, leg = Math.max(...meta.legs.map(l => legReach(l.pts))) / body;
    (craneRun.body[fam] ||= []).push(body); (craneRun.leg[fam] ||= []).push(leg);
    const pat = meta.wingStats && meta.wingStats.pattern;
    if (fam === 'ctenophorine') {
      if (!CRANE.ctenoAnt.includes(meta.antenna)) fail('ctenophorine antenna ' + meta.antenna + ', not ' + CRANE.ctenoAnt.join(' / '));
      if (meta.bodyGenes.abd.mark !== 'banded') fail('ctenophorine abdomen ' + meta.bodyGenes.abd.mark + ', not banded');
      const k = maxHw(meta.abdomen.profile) / maxHw(meta.thorax.profile);
      if (k < CRANE.ctenoBroad) fail('ctenophorine abdomen ' + k.toFixed(2) + 'x the thorax, not broad (min ' + CRANE.ctenoBroad + ')');
    }
    if (CRANE.punctate.includes(fam)) (craneRun.punct[fam] ||= []).push(!!(pat && pat.dots.length));
    if (fam !== 'pediciid' && !CRANE.punctate.includes(fam)) { if (pat && pat.dots.length) fail(fam + ' wing carries a stippled pattern'); return; }
    if (fam === 'pediciid' && (!pat || pat.dots.length < CRANE.patternDots)) return fail('pediciid wing pattern has ' + (pat ? pat.dots.length : 0) + ' dots, want ' + CRANE.patternDots + '+');
    if (pat && pat.dots.some(p => !meta.wingOutlines.some(o => inPoly(p, o)))) fail(fam + ' wing pattern dot outside the wings');
  },
  // #55 the crane fly's wing set (meta.cranefly.set) against CRANE.sets; a folded wing crosses the midline
  craneWingSet(meta, svg, fail) {
    if (meta.type !== 'cranefly') return;
    const set = meta.cranefly && meta.cranefly.set, band = CRANE.sets[set];
    if (!band) return fail('crane fly plate has no known wing set on meta.cranefly: ' + set);
    craneRun.sets[set] = (craneRun.sets[set] || 0) + 1;
    const th = meta.wingTheta;
    if (!(th >= band[0] && th <= band[1])) fail('crane fly wing angle ' + (+th).toFixed(1) + ' outside the ' + set + ' band ' + band.join('-'));
    if (set === 'folded' && Math.min(...meta.wingOutlines[0].map(p => p[0])) > -CRANE.cross) fail('folded crane fly wing does not cross the midline');
  },
  // Diptera short rungs (#10): Tabanidae and Asilidae always close bm with bm-cu, and on the muscid / syrphid / tabanid
  // plan r-m and bm-cu are short rungs on every plate, never a long oblique (dip-eristalis: ~5.5% of the span)
  dipRungs(meta, svg, fail, { dev }) {
    if (meta.type !== 'fly' || !meta.fam) return;
    const fam = DIP_PLAN[meta.fam] || meta.fam, rungs = DIP_RUNG_FAMS.includes(fam);
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
    if (meta.odoRest && meta.odoRest.closed) return;   // #73 closed at rest, the forewing lies over the hindwing (odoRest)
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
      if (ODO_TWO_AX.includes(fam) && (s.antMin !== 2 || s.antMax !== 2)) fail(what + fam + ' antenodals not exactly 2: ' + s.antMin + '-' + s.antMax);
      if (!ODO_TWO_AX.includes(fam) && s.antMin < ODO_LADDER_MIN) fail(what + fam + ' antenodal ladder too short: ' + s.antMin + ' (min ' + ODO_LADDER_MIN + ')');
      if (meta.type === 'damselfly' && !(s.qGap <= ODO_Q_GAP)) fail(what + 'damselfly quadrilateral floats off the arculus: ' + (s.qGap === undefined ? 'no qGap' : s.qGap.toFixed(3)) + ' of the span (max ' + ODO_Q_GAP + ')');
    };
    one(meta.wingStats, '');
    one(dev.meta.device.wingStats, 'device plate: ');   // pass 2's geometry
  },
  // Odonata habitus (#48): the family, its abdomen silhouette, the wing set, the leg pose and the platycnemidid tibiae (ODO_HAB above)
  odoHabitus(meta, svg, fail) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const fam = meta.fam, B = meta.bodyGenes || {}, A = B.abd || {};
    if (!ODO_FAMS[meta.type].includes(fam)) return fail(meta.type + ' plate draws no family of its suborder (meta.fam ' + fam + ')');
    odoHab.plates++; odoHab.fam[fam] = (odoHab.fam[fam] || 0) + 1;
    const pose = meta.legRoll && meta.legRoll.pose; odoHab.pose[pose] = (odoHab.pose[pose] || 0) + 1;
    odoHab.mark[A.mark] = (odoHab.mark[A.mark] || 0) + 1;
    if (!ODO_PROFILE[fam].includes(A.profile)) fail(fam + ' abdomen profile ' + A.profile + ', not ' + ODO_PROFILE[fam].join(' / '));
    const ab = meta.abdomen, hw = t => profHw(ab.profile, ab.yTop + t * (ab.yBot - ab.yTop));
    const over = (t0, t1, f) => { let v = f === 'max' ? 0 : Infinity; for (let t = t0; t <= t1 + 1e-9; t += 0.01) v = f === 'max' ? Math.max(v, hw(t)) : Math.min(v, hw(t)); return v; };
    const abW = maxHw(ab.profile), lw = (ab.yBot - ab.yTop) / (2 * abW);
    if (A.profile === 'broad') {
      if (lw > ODO_HAB.broad) fail('libellulid abdomen not broad: ' + lw.toFixed(1) + ' times as long as wide (max ' + ODO_HAB.broad + ')');
      if (over(0, 0.5, 'max') < abW * 0.99) fail('libellulid abdomen not widest in its basal half');
      if (hw(0.85) > ODO_HAB.taper * abW) fail('libellulid abdomen does not taper: ' + (hw(0.85) / abW).toFixed(2) + ' of its width at t 0.85');
    }
    if (A.profile === 'club' && over(0.6, 0.92, 'max') < ODO_HAB.club * over(0.25, 0.55, 'min')) fail('gomphid abdomen not clubbed: S7-S9 ' + (over(0.6, 0.92, 'max') / over(0.25, 0.55, 'min')).toFixed(2) + 'x the mid abdomen (min ' + ODO_HAB.club + ')');
    if (A.profile === 'waisted' && over(0.12, 0.3, 'min') > ODO_HAB.waist * over(0, 0.12, 'max')) fail('abdomen not waisted at S3: ' + (over(0.12, 0.3, 'min') / over(0, 0.12, 'max')).toFixed(2) + ' of S1-S2 (max ' + ODO_HAB.waist + ')');
    if (A.profile === 'rod' && over(0.15, 0.8, 'max') > ODO_HAB.rod * over(0.15, 0.8, 'min')) fail('rod abdomen not a rod: ' + (over(0.15, 0.8, 'max') / over(0.15, 0.8, 'min')).toFixed(2) + 'x its narrowest (max ' + ODO_HAB.rod + ')');
    const ws = B.wingSet, R = meta.type === 'damselfly' ? (fam === 'lestid' ? ODO_HAB.damLestid : ODO_HAB.dam) : { fw: ODO_HAB.fw, hw: ODO_HAB.hw };
    if (!ws || !(ws.fw >= R.fw[0] && ws.fw <= R.fw[1]) || !(ws.hw >= R.hw[0] && ws.hw <= R.hw[1])) fail('odonate wing set ' + JSON.stringify(ws) + ' outside forewing ' + R.fw.join('..') + ', hindwing +' + R.hw.join('..'));
    if (fam === 'lestid') {
      const fw = meta.wingOutlines && meta.wingOutlines[0];
      if (!fw) return fail('lestid plate has no forewing outline');
      const xMin = Math.min(...fw.map(p => p[0])), near = fw.filter(p => p[0] < xMin + 1), root = [near.reduce((a, p) => a + p[0], 0) / near.length, near.reduce((a, p) => a + p[1], 0) / near.length];
      const tip = fw.reduce((b, p) => dist(p, root) > dist(b, root) ? p : b, fw[0]), ang = Math.atan2(tip[1] - root[1], tip[0] - root[0]) * 180 / Math.PI;
      if (ang < ODO_HAB.lestid) fail('lestid forewing not held half open: swept back ' + ang.toFixed(1) + ' degrees (min ' + ODO_HAB.lestid + ')');
    }
    if (fam === 'platycnemidid') {
      const tw = meta.legs.map(l => l.tib && l.tib.wMax);
      if (!tw.every(w => w > 0)) return fail('platycnemidid legs have no tibia widths on meta.legs[i].tib');
      if (Math.min(tw[1], tw[2]) < ODO_HAB.tibia * tw[0]) fail('platycnemidid mid / hind tibiae not broad: ' + (Math.min(tw[1], tw[2]) / tw[0]).toFixed(2) + 'x the fore tibia (min ' + ODO_HAB.tibia + ')');
    }
  },
  // #73 the zygopteran resting pose (ODO_REST above)
  odoRest(meta, svg, fail) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const R = meta.odoRest;
    if (!R || typeof R.closed !== 'boolean') return fail('odonate plate has no resting-pose record (meta.odoRest)');
    if (meta.type === 'dragonfly') { if (R.closed) fail('dragonfly drawn with its wings closed'); return; }
    odoRestRun.plates++;
    if (!R.closed) return;
    odoRestRun.closed++; odoRestRun.fams[meta.fam] = (odoRestRun.fams[meta.fam] || 0) + 1;
    (meta.wingOutlines || []).slice(0, 2).forEach((ol, i) => {
      const xMin = Math.min(...ol.map(p => p[0])), near = ol.filter(p => p[0] < xMin + 1), root = [near.reduce((a, p) => a + p[0], 0) / near.length, near.reduce((a, p) => a + p[1], 0) / near.length];
      const tip = ol.reduce((b, p) => dist(p, root) > dist(b, root) ? p : b, ol[0]), ang = Math.atan2(tip[1] - root[1], tip[0] - root[0]) * 180 / Math.PI;
      if (ang < ODO_REST.ang[0] || ang > ODO_REST.ang[1]) fail('closed damselfly ' + (i ? 'hindwing' : 'forewing') + ' swept back ' + ang.toFixed(1) + ' degrees (want ' + ODO_REST.ang.join('..') + ')');
      if (xMin < 0) fail('closed damselfly ' + (i ? 'hindwing' : 'forewing') + ' crosses the midline by ' + (-xMin).toFixed(2));
    });
  },
  // #73 wing pigment as hatch (ODO_PIG above), on the default and the device plate
  odoPigment(meta, svg, fail, { seed, dev }) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    const one = (m, floorPx, what) => {
      const P = m.odoPig;
      if (!P || !Array.isArray(P.patches) || !Array.isArray(P.hatch)) return fail(what + 'odonate plate has no wing pigment record (meta.odoPig)');
      const ok = ODO_PIG.kinds[meta.fam] || [];
      for (const q of P.patches) if (!ok.includes(q.name)) fail(what + meta.fam + ' wing pigment ' + q.name + ', not ' + (ok.join(' / ') || 'clear'));
      if (P.patches.length > 1 && P.patches.some(q => q.name === 'full')) fail(what + 'whole-wing tone drawn with other patches: ' + P.patches.map(q => q.name).join(', '));
      if (P.patches.length && !P.hatch.some(h => h.segs.length)) fail(what + 'wing pigment ' + P.patches.map(q => q.name).join(', ') + ' rolled but no hatch drawn');
      if (!P.patches.length && P.hatch.some(h => h.segs.length)) fail(what + 'clear wing drew pigment hatch');
      for (const h of P.hatch) {
        const ol = m.wingOutlines && m.wingOutlines[h.wing];
        if (!ol) return fail(what + 'pigment hatch on wing ' + h.wing + ', which has no outline');
        const out = h.segs.find(([p, q]) => !inPoly([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ol));   // its ends lie on the outline
        if (out) fail(what + 'pigment hatch outside its wing at ' + out[0].map(v => v.toFixed(1)).join(','));
        const gap = hatchGap(h.segs);
        if (gap === null) { fail(what + 'pigment hatch lines not parallel on wing ' + h.wing); continue; }
        const px = gap * m.scale;
        if (!what && px < odoPigRun.pitch) { odoPigRun.pitch = px; odoPigRun.seed = seed; }
        if (px < floorPx - 0.02) fail(what + 'pigment hatch lines ' + px.toFixed(2) + ' px apart (min ' + floorPx.toFixed(2) + ')');
      }
    };
    one(meta, ODO_PIG.px, '');
    one(dev.meta, Math.max(ODO_PIG.px, E.DEVICE.pitchPx * 600 / DEV), 'device plate: ');
    const P = meta.odoPig; if (!P || !P.patches) return;
    const t = meta.type; odoPigRun.plates[t] = (odoPigRun.plates[t] || 0) + 1; odoPigRun.kinds[t] ||= {};
    if (!P.patches.length) odoPigRun.clear[t] = (odoPigRun.clear[t] || 0) + 1;
    for (const q of P.patches) odoPigRun.kinds[t][q.name] = (odoPigRun.kinds[t][q.name] || 0) + 1;
  },
  // #27 the dragonfly's eyes meet along a seam (or stand apart on a gomphid); ODO_EYE above
  odoEyes(meta, svg, fail) {
    if (meta.type !== 'dragonfly') return;
    headSeen.odoEyes++;
    const h = meta.head, eyes = h.eyes;
    if (eyes.length !== 2) return fail('dragonfly head draws ' + eyes.length + ' eyes');
    if (meta.fam === 'gomphid') {
      const inner = Math.min(...eyes.map(e => Math.abs(e.cx) - e.rx));
      if (inner < ODO_EYE.apart * h.W) fail('gomphid eyes not apart: inner margins ' + (inner / h.W).toFixed(3) + ' head widths off the midline (min ' + ODO_EYE.apart + ')');
      return;
    }
    for (const e of eyes) {
      const s = Math.sign(e.cx);
      if (!e.pl || e.pl.length < 8) return fail(meta.fam + ' eye has no seam outline on meta.head.eyes[i].pl (eyes not cut at the midline)');
      const over = Math.max(...e.pl.map(p => -s * p[0]));
      if (over > ODO_EYE.cross) return fail(meta.fam + ' eye crosses the midline by ' + over.toFixed(2));
      const on = e.pl.filter(p => Math.abs(p[0]) <= ODO_EYE.cross), ys = on.map(p => p[1]);
      const seam = on.length ? Math.max(...ys) - Math.min(...ys) : 0, len = 2 * e.ry;
      if (seam < ODO_EYE.seam * len) return fail(meta.fam + ' eyes meet along ' + (seam / len).toFixed(2) + ' of the eye length (min ' + ODO_EYE.seam + ')');
      if (!e.marks || !e.marks.length) return fail('dragonfly eye has no lattice or stipple centres on meta.head.eyes[i].marks');
      const reach = Math.min(...e.marks.map(p => Math.abs(p[0])));
      if (reach > ODO_EYE.reach * e.pitch) return fail(meta.fam + ' eye tone stops ' + (reach / e.pitch).toFixed(2) + ' pitches short of the seam (max ' + ODO_EYE.reach + ')');
    }
  },
  // #27 the damselfly's antenna sockets stay small beside the ocelli (ODO_EYE.socket)
  odoSockets(meta, svg, fail) {
    if (meta.type !== 'damselfly') return;
    headSeen.odoSockets++;
    const oc = meta.head.ocelli, sr = meta.antennae.sr;
    if (!oc.length) return fail(meta.type + ' draws no ocelli');
    if (!(sr > 0)) return fail('no antenna socket radius on meta.antennae.sr');
    const r = Math.min(...oc.map(o => o[2]));
    if (sr > ODO_EYE.socket * r + 1e-9) fail(meta.type + ' antenna socket ' + sr.toFixed(2) + ' against ocellus ' + r.toFixed(2) + ' (max ' + ODO_EYE.socket + 'x)');
  },
  // #27 the butterfly's antenna club is never a skipper's hook. (#27 also took the proboscis out of the dorsal head; the
  // engine has no proboscis gene left to roll or record, so there is nothing for a check to assert, and none is kept.)
  lepHead(meta, svg, fail) {
    if (meta.type !== 'moth') return;
    headSeen.lepHead++;
    if (meta.variant === 'butterfly' && meta.antennae.club === 'hooked') fail('butterfly antenna club hooked (' + meta.fam + '): a skipper feature');
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
    if (meta.type !== 'lacewing' || meta.fam === 'mantispid') return;   // #51: the mantidfly's are raptorial (neuRaptorial)
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
  // #51 the lacewing family (P.fam, meta.fam) is one of the Neuroptera families the plate draws, and on the bodySig
  neuFamily(meta, svg, fail) {
    if (meta.type !== 'lacewing') return;
    neuFamRun[meta.fam] = (neuFamRun[meta.fam] || 0) + 1;
    if (!NEU_FAMS.fams.includes(meta.fam)) return fail('lacewing family not one of ' + NEU_FAMS.fams.join(' / ') + ': ' + meta.fam);
    if (!meta.bodySig.split(',').includes(meta.fam)) fail('lacewing family ' + meta.fam + ' not on the bodySig');
  },
  // #51 the lacewing's antenna is its family's (NEU_ANT): kind, club, and drawn length against the body
  neuAntenna(meta, svg, fail) {
    if (meta.type !== 'lacewing' || !NEU_ANT[meta.fam]) return;
    const want = NEU_ANT[meta.fam], an = meta.antennae, A = meta.bodyGenes.ant;
    const bl = meta.abdomen.yBot - meta.head.top, len = A.len * an.lenK / bl;
    if (!want.kinds.includes(an.kind)) fail(meta.fam + ' antenna not ' + want.kinds.join(' / ') + ': ' + an.kind);
    if (want.club && an.club !== want.club) fail(meta.fam + ' antenna club not ' + want.club + ': ' + an.club);
    if (len < want.len[0] || len > want.len[1]) fail(meta.fam + ' antenna ' + len.toFixed(2) + ' body lengths, not ' + want.len.join('-'));
  },
  // #51 the abdomen against the forewing (NEU_ABD): the antlion's reaches past the wings
  neuAbdomen(meta, svg, fail) {
    if (meta.type !== 'lacewing') return;
    const w = meta.wingOutlines.slice().sort((a, b) => a[0][1] - b[0][1]), fore = w[0];
    const foreL = Math.max(...fore.map(p => dist(p, fore[0]))), abdL = meta.abdomen.yBot - meta.abdomen.yTop, r = abdL / foreL;
    const band = meta.fam === 'myrmeleontid' ? NEU_ABD.antlion : NEU_ABD.other;
    if (r < band[0] || r > band[1]) fail(meta.fam + ' abdomen ' + r.toFixed(2) + ' forewing lengths, not ' + band.join('-'));
    const wingBot = Math.max(...w.flat().map(p => p[1]));
    if (meta.fam === 'myrmeleontid' && !(meta.abdomen.yBot > wingBot + NEU_ABD.past)) fail('antlion abdomen tip does not reach past the wings: tip ' + meta.abdomen.yBot.toFixed(1) + ', wings to ' + wingBot.toFixed(1));
  },
  // #51 the pronotum's length (NEU_PRON): the mantidfly's long prothorax, the wings and the mid and hind legs behind it
  neuPronotum(meta, svg, fail) {
    if (meta.type !== 'lacewing') return;
    const t = meta.bodyGenes.thorax.lines[0].t, th = meta.thorax, yC = th.yTop + t * (th.yBot - th.yTop);
    const band = meta.fam === 'mantispid' ? NEU_PRON.mantispid : NEU_PRON.other;
    if (t < NEU_PRON.all[0] || t > NEU_PRON.all[1] || t < band[0] || t > band[1]) fail(meta.fam + ' pronotum ' + t.toFixed(2) + ' of the thorax, not ' + band.join('-'));
    for (const r of th.wingRoots) if (!(r > t)) fail(meta.fam + ' wing root at ' + r.toFixed(2) + ' on the pronotum (collar ' + t.toFixed(2) + ')');
    for (const leg of meta.legs) if (leg.pair !== 'front' && !(leg.y > yC)) fail(meta.fam + ' ' + leg.pair + ' coxa on the pronotum');
  },
  // #51 the mantidfly's raptorial forelegs (NEU_RAPTOR), on the right legs and the skewed left set
  neuRaptorial(meta, svg, fail) {
    if (meta.type !== 'lacewing' || meta.fam !== 'mantispid') return;
    const fr = meta.legs.find(l => l.pair === 'front'), deg = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    for (const [label, pts] of [['', fr.pts], [' skewed', skewedPts(fr)]]) {
      const aF = deg(pts[2], pts[3]), aT = deg(pts[3], pts[4]), fold = Math.abs(((aT - aF) % 360 + 540) % 360 - 180);
      if (aF > NEU_RAPTOR.femur) fail('mantidfly' + label + ' fore femur not raised toward the head: ' + aF.toFixed(0) + ' degrees');
      if (fold < NEU_RAPTOR.fold) fail('mantidfly' + label + ' fore tibia not folded back on the femur: ' + fold.toFixed(0) + ' degrees');
    }
    if (fr.femLen / fr.femW > NEU_RAPTOR.stout) fail('mantidfly fore femur not stout: ' + (fr.femLen / fr.femW).toFixed(2) + 'x as long as wide');
  },
  // #51 the osmylid's stippled wing spots (NEU_SPOTS, meta.wingStats.spots: { dots: [[x, y] body coords] } per spot)
  neuSpots(meta, svg, fail) {
    if (meta.type !== 'lacewing') return;
    const spots = (meta.wingStats && meta.wingStats.spots) || [];
    if (meta.fam !== 'osmylid') { if (spots.length) fail(meta.fam + ' wings carry osmylid spots'); return; }
    if (spots.length < NEU_SPOTS.n) fail('osmylid forewing has ' + spots.length + ' stippled spots, want ' + NEU_SPOTS.n + '+');
    for (const sp of spots) {
      if (sp.dots.length < NEU_SPOTS.dots) { fail('osmylid wing spot of ' + sp.dots.length + ' dots'); break; }
      if (sp.dots.some(p => !meta.wingOutlines.some(o => inPoly(p, o)))) { fail('osmylid wing spot dot outside the wings'); break; }
    }
  },
  // #51 the owlfly's and the mantidfly's large eyes (NEU_EYES)
  neuEyes(meta, svg, fail) {
    if (meta.type !== 'lacewing' || !NEU_EYES.big.includes(meta.fam)) return;
    const h = meta.head, k = Math.max(...h.eyes.map(e => 2 * e.rx)) / h.W;
    if (k < NEU_EYES.eye) fail(meta.fam + ' eye ' + k.toFixed(2) + ' of the head width, want ' + NEU_EYES.eye + '+');
  },
  // #22 the folded hindwing fan (meta.orth.fan, right side, body coordinates) never stands out past the costa of its
  // tegmen (meta.orth.tegmen): at every height the fan reaches no further out than the tegmen's outer edge there, and
  // past the tegmen's apex no further out than the apex, so it shows only beside the midline and at the tip
  orthFan(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthFan++;
    const o = meta.orth;
    if (!o || !o.tegmen) return fail('no tegmen outline on meta.orth');
    if (!o.fan) return;
    const T = o.tegmen, apex = T.reduce((m, p) => p[1] > m[1] ? p : m), top = Math.min(...T.map(p => p[1]));
    let worst = -Infinity, at = null;
    for (const p of o.fan) {
      const edge = p[1] > apex[1] ? apex[0] : p[1] < top ? -Infinity : rightmostAt(T, p[1]);
      const out = edge === null ? Infinity : p[0] - edge;
      if (out > worst) { worst = out; at = p; }
    }
    if (worst > ORTH.fanOut) fail('grasshopper hindwing fan stands ' + worst.toFixed(1) + ' out past the tegmen costa at y ' + at[1].toFixed(1));
  },
  // #22 the tegmina overlap along the inner margin and their apices part: the right tegmen's inner margin crosses the
  // midline by ORTH.overlap or more over the middle of its length (the left one, drawn over it, hides that strip), its
  // apex lies ORTH.apexX or more out on its own side, and its last ORTH.tip of length stays clear of the midline (no X);
  // on the tegmina folded over the abdomen (#72: macropterous and brachypterous, not the open set or a lateral pad)
  orthTegmina(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthTegmina++;
    const T = meta.orth && meta.orth.tegmen, G = meta.bodyGenes.orth;
    if (!T) return fail('no tegmen outline on meta.orth');
    if (G && (G.set === 'open' || (G.cls !== 'macro' && G.cls !== 'brachy'))) return;   // #72: an open set or a lateral pad has its own rules (orthWingSet, orthTegmen)
    const apex = T.reduce((m, p) => p[1] > m[1] ? p : m), top = Math.min(...T.map(p => p[1])), len = apex[1] - top;
    let shallow = -Infinity;
    for (let f = 0.15; f <= 0.75; f += 0.05) { const x = leftmostAt(T, top + f * len); shallow = Math.max(shallow, x === null ? Infinity : x); }
    if (shallow > -ORTH.overlap) fail('grasshopper tegmina do not overlap along the inner margin: the inner edge reaches only x ' + shallow.toFixed(1) + ' (want <= -' + ORTH.overlap + ')');
    if (apex[0] < ORTH.apexX) fail('grasshopper tegmen apex at x ' + apex[0].toFixed(1) + ', not ' + ORTH.apexX + ' clear of the midline');
    const cross = T.filter(p => p[1] >= apex[1] - ORTH.tip * len && p[0] <= 0);
    if (cross.length) fail('grasshopper tegmen apices cross: the tip reaches x ' + Math.min(...cross.map(p => p[0])).toFixed(1) + ' within ' + ORTH.tip + ' of the apex');
  },
  // #22 the archedictyon is rows of near-rectangular cells, not a honeycomb: the cells the tegmen grew (meta.orth.cells,
  // body coordinates, where the tegmen runs along y) have their sides along the tegmen or across it. A grid's sides are
  // 0 or 90 degrees off the tegmen's axis; a honeycomb's are 90 and +-30, so a third of its length is oblique. At most
  // ORTH.oblique of the cells' outline length lies between ORTH.obliqueBand degrees off the axis.
  orthCells(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthCells++;
    const c = meta.orth && meta.orth.cells;
    if (!Array.isArray(c)) return fail('no archedictyon cells on meta.orth');
    let tot = 0, obl = 0;
    const turn = ((meta.orth.axis === undefined ? 90 : meta.orth.axis) - 90) * Math.PI / 180, cs = Math.cos(turn), sn = Math.sin(turn);   // #72: an open tegmen's axis turned back onto y
    for (const cell of c) for (let i = 0; i < cell.length; i++) {
      const a = cell[i], b = cell[(i + 1) % cell.length], L = dist(a, b), dx = b[0] - a[0], dy = b[1] - a[1], ux = dx * cs + dy * sn, uy = -dx * sn + dy * cs;
      const ang = Math.atan2(Math.abs(ux), Math.abs(uy)) * 180 / Math.PI;
      tot += L; if (ang >= ORTH.obliqueBand[0] && ang <= ORTH.obliqueBand[1]) obl += L;
    }
    if (c.length < ORTH.cellsMin) return;   // a sparse mesh (the tegmen mostly ladders, which are rows by construction) is too few cells to measure
    if (tot && obl / tot > ORTH.oblique) fail('grasshopper archedictyon is a honeycomb, not rows of rectangles: ' + Math.round(obl / tot * 100) + '% of the cell sides oblique (max ' + ORTH.oblique * 100 + '%)');
  },
  // #22 every intercalary vein starts on a vein: in the tegmen's drawn lanes (the meta.wingLanes entry with R), a lane
  // whose root (the end of its drawn pieces nearest the base) is not at the tegmen's base (within ORTH.base of its length)
  // lies within ORTH.onVein of another lane or wall
  orthIntercalary(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthIntercalary++;
    const T = meta.orth && meta.orth.tegmen, fr = (meta.wingLanes || []).find(w => w.lanes.some(l => l.id === 'R'));
    if (!T || !fr) return fail('no tegmen outline / lanes on meta');
    // #72 measured along the tegmen's axis from its root (meta.orth.root / .axis; down the body on a folded tegmen)
    const r0 = meta.orth.root || [0, Math.min(...T.map(p => p[1]))], ax = (meta.orth.axis === undefined ? 90 : meta.orth.axis) * Math.PI / 180;
    const along = p => (p[0] - r0[0]) * Math.cos(ax) + (p[1] - r0[1]) * Math.sin(ax), top = Math.min(...T.map(along)), len = Math.max(...T.map(along)) - top;
    const drawn = fr.lanes.filter(l => !l.wall && l.pieces.length);
    for (const l of drawn) {
      const root = l.pieces.flatMap(pc => [pc.pts[0], pc.pts[pc.pts.length - 1]]).reduce((m, p) => along(p) < along(m) ? p : m);   // its end nearest the base (a lane carried onto another by a connector piece roots there)
      if (along(root) - top <= ORTH.base * len) continue;
      const d = Math.min(...fr.lanes.filter(m => m !== l).flatMap(m => m.pieces.map(pc => distToPl(root, pc.pts))));
      if (d > ORTH.onVein) fail('grasshopper tegmen lane ' + l.id + ' starts in the membrane, ' + d.toFixed(1) + ' from the nearest vein');
    }
  },
  // #22 the pronotum is a saddle (meta.thorax.profile is its dorsal outline): widest over the metazona (behind
  // ORTH.metazona of its length), narrower over the prozona, its hind margin projecting back over the tegmina (an angle
  // or a curve, never truncate), with lateral carinae of a kind the bodySig carries
  orthPronotum(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthPronotum++;
    const th = meta.thorax, prof = th.profile, len = th.yBot - th.yTop, T = meta.bodyGenes.thorax;
    const w = maxHw(prof), at = (prof.find(p => p[1] === w)[0] - th.yTop) / len;
    if (at < ORTH.metazona) fail('grasshopper pronotum widest at ' + at.toFixed(2) + ' of its length, not over the metazona (>= ' + ORTH.metazona + ')');
    const pro = Math.min(...prof.filter(p => (p[0] - th.yTop) / len >= 0.15 && (p[0] - th.yTop) / len <= 0.5).map(p => p[1]));
    if (pro > ORTH.prozona * w) fail('grasshopper pronotum not narrower over the prozona: ' + (pro / w).toFixed(2) + ' of its widest');
    const hind = prof[prof.length - 1][1];
    if (hind > ORTH.hind * w) fail('grasshopper pronotum hind margin truncate: ' + (hind / w).toFixed(2) + ' of its widest at the hind margin');
    const kind = T.latCar && T.latCar.kind;
    if (!ORTH.carinae.includes(kind)) fail('grasshopper pronotum has no lateral carinae of a known kind: ' + kind);
    else if (!meta.bodySig.split(',').includes('lc' + kind[0])) fail('grasshopper lateral carina kind ' + kind + ' not in the bodySig');
  },
  // #72 the tegmen's length class (ORTH72.cls) as drawn, on the bodySig; the folded hindwing fan only under macropterous
  // tegmina; a brachypterous plate's tergites show behind its tegmina; a micropterous pad or a groundhopper's scale lateral
  orthTegmen(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthTegmen++;
    const o = meta.orth, G = meta.bodyGenes.orth;
    if (!o || !o.tegmen || !o.root || !G) return fail('no tegmen outline, root or orth genes on meta');
    const band = ORTH72.cls[G.cls];
    if (!band) return fail('grasshopper tegmen class unknown: ' + G.cls);
    orth72Run.n++; orth72Run.cls[G.cls] = (orth72Run.cls[G.cls] || 0) + 1;
    if (!meta.bodySig.split(',').includes('tg' + G.cls)) fail('grasshopper tegmen class ' + G.cls + ' not in the bodySig');
    const abdLen = meta.abdomen.yBot - meta.abdomen.yTop, reach = (G.set === 'open' ? Math.max(...o.tegmen.map(p => dist(p, o.root))) : Math.max(...o.tegmen.map(p => p[1])) - o.root[1]) / abdLen;   // down the body from the root, or out from it when open
    if (reach < band[0] - ORTH72.tol || reach > band[1] + ORTH72.tol) fail('grasshopper ' + G.cls + ' tegmen reaches ' + reach.toFixed(2) + ' abdomen lengths, not ' + band.join('-'));
    if (o.fan && G.cls !== 'macro') fail('grasshopper folded hindwing fan under ' + G.cls + ' tegmina');
    if (G.cls === 'brachy') {
      const bare = (meta.abdomen.yBot - Math.max(...o.tegmen.map(p => p[1]))) / abdLen;
      if (bare < ORTH72.show) fail('brachypterous grasshopper shows only ' + bare.toFixed(2) + ' of its abdomen behind the tegmina (want ' + ORTH72.show + '+)');
    }
    if ((G.cls === 'micro' || G.cls === 'scale') && Math.min(...o.tegmen.map(p => p[0])) <= 0) fail('grasshopper ' + G.cls + ' tegmen reaches the midline (a lateral pad never does)');
  },
  // #72 the groundhopper's pronotum (meta.orth.process) prolonged back to the abdomen's tip or past it, tapering to a point,
  // with the tegmina reduced to scales; no other family draws the process
  orthTetrigid(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthTetrigid++;
    const o = meta.orth || {}, G = meta.bodyGenes.orth || {}, P = o.process;
    if (meta.fam !== 'tetrigid') { if (P) fail(meta.fam + ' draws a tetrigid pronotal process'); return; }
    if (!P) return fail('tetrigid without its pronotal process on meta.orth.process');
    if (G.cls !== 'scale') fail('tetrigid tegmina ' + G.cls + ', not scales');
    const y0 = Math.min(...P.map(p => p[1])), y1 = Math.max(...P.map(p => p[1])), w = Math.max(...P.map(p => Math.abs(p[0])));
    if (y1 < meta.abdomen.yBot) fail('tetrigid pronotum ends ' + (meta.abdomen.yBot - y1).toFixed(1) + ' short of the abdomen tip');
    const tipW = Math.max(...P.filter(p => p[1] >= y1 - ORTH72.tetrigid.tipLen * (y1 - y0)).map(p => Math.abs(p[0])));
    if (tipW > ORTH72.tetrigid.point * w) fail('tetrigid pronotum does not taper to a point: ' + (tipW / w).toFixed(2) + ' of its widest at the tip');
  },
  // #72 the tettigoniid's sabre ovipositor (ORTH72.ovi) as drawn; every other family's valves short
  orthOvipositor(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthOvipositor++;
    const ov = meta.bodyGenes.abd.ovipositor, d = meta.orth && meta.orth.ovi;
    if (!ov) { if (d) fail('ovipositor drawn on a plate whose genes have none'); return; }
    if (!d || !d.tip) return fail('grasshopper ovipositor not recorded on meta.orth.ovi');
    const k = (d.tip[1] - meta.abdomen.yBot) / (meta.abdomen.yBot - meta.abdomen.yTop);   // the drawn tip's reach past the abdomen
    if (meta.fam === 'tettigoniid') {
      if (k < ORTH72.ovi.sabre[0] - 0.01 || k > ORTH72.ovi.sabre[1] + 0.01) fail('tettigoniid ovipositor ' + k.toFixed(2) + ' abdomen lengths, not ' + ORTH72.ovi.sabre.join('-'));
      if (!ORTH72.ovi.kinds.includes(d.kind)) fail('tettigoniid ovipositor of unknown kind ' + d.kind);
      if (!meta.bodySig.split(',').includes('ov' + d.kind[0])) fail('tettigoniid ovipositor kind not in the bodySig');
    } else if (k > ORTH72.ovi.valves) fail(meta.fam + ' ovipositor valves ' + k.toFixed(2) + ' abdomen lengths, more than ' + ORTH72.ovi.valves);
  },
  // #72 the wing set: folded, or the setting-board pose (only on a macropterous acridid) with the tegmen held out
  // ORTH72.open.teg past straight out and the hindwing opened beside it, neither across the midline
  orthWingSet(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthWingSet++;
    const o = meta.orth || {}, G = meta.bodyGenes.orth || {};
    if (G.set !== 'folded' && G.set !== 'open') return fail('grasshopper wing set unknown: ' + G.set);
    if (!meta.bodySig.split(',').includes('ws' + G.set[0])) fail('grasshopper wing set not in the bodySig');
    if (G.cls === 'macro' && meta.fam === 'acridid') orth72Run.sets[G.set] = (orth72Run.sets[G.set] || 0) + 1;
    if (G.set === 'folded') { if (o.hind) fail('folded grasshopper draws an opened hindwing'); return; }
    if (G.cls !== 'macro' || meta.fam !== 'acridid') fail('open wing set on a ' + G.cls + ' ' + meta.fam);
    if (!o.hind) return fail('open grasshopper without its opened hindwing on meta.orth.hind');
    let apex = o.root; for (const p of o.tegmen) if (dist(p, o.root) > dist(apex, o.root)) apex = p;
    const a = Math.atan2(apex[1] - o.root[1], apex[0] - o.root[0]) * 180 / Math.PI;
    if (a < ORTH72.open.teg[0] || a > ORTH72.open.teg[1]) fail('open grasshopper tegmen at ' + a.toFixed(1) + ' degrees, not ' + ORTH72.open.teg.join('-'));
    for (const [what, poly] of [['tegmen', o.tegmen], ['hindwing', o.hind]]) if (Math.min(...poly.map(p => p[0])) < 0) fail('open grasshopper ' + what + ' crosses the midline');
  },
  // #72 the hind-leg pose: splayed (as #8 drew every plate) or the femur held along the body (ORTH72.along), on the bodySig
  orthHindLeg(meta, svg, fail) {
    if (meta.type !== 'grasshopper') return;
    orthSeen.orthHindLeg++;
    const G = meta.bodyGenes.orth || {};
    if (G.hind !== 'splayed' && G.hind !== 'along') return fail('grasshopper hind-leg pose unknown: ' + G.hind);
    orth72Run.hind[G.hind] = (orth72Run.hind[G.hind] || 0) + 1;
    if (!meta.bodySig.split(',').includes('hl' + G.hind[0])) fail('grasshopper hind-leg pose not in the bodySig');
    if (G.hind !== 'along') return;
    const j = meta.legs[2].pts, a = Math.atan2(j[3][1] - j[2][1], j[3][0] - j[2][0]) * 180 / Math.PI;
    if (a < ORTH72.along[0] || a > ORTH72.along[1]) fail('grasshopper hind femur held along the body at ' + a.toFixed(1) + ' degrees, not ' + ORTH72.along.join('-'));
  },
  // #26 the forewing's sweep: the line from its root to the outline point furthest from it (the apex) lies CIC.sweep
  // degrees below the horizontal (set specimens; the audited plates held them at 15-25 and the plates came out at 0.81);
  // since #49 the band is the wing set's (CIC_SET.sweep; spread is #26's CIC.sweep)
  cicSweep(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicSweep++;
    const { fore } = cicWings(meta), root = fore[0], set = meta.cicada && meta.cicada.set, band = CIC_SET.sweep[set];
    if (!band) return fail('cicada plate has no known wing set on meta.cicada: ' + set);
    let apex = root; for (const p of fore) if (dist(p, root) > dist(apex, root)) apex = p;
    const a = Math.atan2(apex[1] - root[1], apex[0] - root[0]) * 180 / Math.PI;
    if (a < band[0] - CIC.tol || a > band[1] + CIC.tol) fail('cicada forewing sweep outside ' + band.join('-') + ' degrees below the horizontal (' + set + '): ' + a.toFixed(1));
  },
  // #26 the plate scale, collected for POST.cicScale (the run's median)
  cicScale(meta) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicScale++;
    cicRun.scales.push(meta.scale);
  },
  // #26 the four basal trunks (Sc+R, M, CuA, CuP, and the M+CuA stem where it is drawn) at the outline weight on every
  // drawn piece of the forewing (meta.wingLanes, the forewing's entry last: the hindwing is grown first), and that weight
  // CIC.heavy times the crossvein (fine) weight or more, so they read heavier than the crossveins at plate scale
  cicTrunks(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicTrunks++;
    const W = meta.weights, fw = meta.wingLanes[meta.wingLanes.length - 1];
    if (!(W.O >= CIC.heavy * W.F)) fail('cicada outline weight under ' + CIC.heavy + 'x the fine weight: ' + W.O + ' vs ' + W.F);
    for (const id of CIC.trunks.concat(CIC.stem)) {
      const ln = fw && fw.lanes.find(l => l.id === id);
      if (!ln) { if (id !== CIC.stem) fail('cicada forewing has a trunk missing: ' + id); continue; }
      const w = Math.min(...ln.pieces.flatMap(pc => pc.w));
      if (!(w >= W.O - 1e-9)) fail('cicada forewing trunk under the outline weight: ' + id + ' at ' + w + ' (want ' + W.O + ')');
    }
  },
  // #26 the foreleg (meta.legs[0], as drawn): a stout femur (trochanter to knee per widest width at most CIC.femur) armed
  // with CIC.teeth or more teeth (fem.teeth); the fore tibia's direction (pts[3] -> pts[4], on the right legs) is counted
  // into its class for POST.cicForeleg
  cicForeleg(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicForeleg++;
    const fr = meta.legs.find(l => l.pair === 'front'), f = fr && fr.fem;
    if (!f) return fail('cicada plate has no drawn front femur');
    const r = f.L / Math.max(...f.widths);
    if (r > CIC.femur) fail('cicada fore femur not stout (at most ' + CIC.femur + 'x as long as wide): ' + r.toFixed(2));
    if (!(f.teeth >= CIC.teeth)) fail('cicada fore femur under ' + CIC.teeth + ' teeth: ' + (f.teeth || 0));
    const p = fr.pts, a = Math.atan2(p[4][1] - p[3][1], p[4][0] - p[3][0]) * 180 / Math.PI;
    cicRun.tibia[a < CIC.tibia[0] ? 'forward' : a > CIC.tibia[1] ? 'back' : 'out']++;
  },
  // #26 the hindwing root behind the forewing's and under it (inside the forewing outline), no point of the hindwing
  // outline that the forewing does not cover lying ahead of the hindwing root (its costal edge never peeks out in front
  // of the forewing base), and the forewing's clavus off the midline (CIC.midline)
  cicHindRoot(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    if (meta.cicada && meta.cicada.set === 'roofed') return;   // #49: the hindwing is hidden under the roofed tegmina (cicWingSet)
    cicSeen.cicHindRoot++;
    const { fore, hind } = cicWings(meta), fr = fore[0], hr = hind[0];
    if (!(hr[1] > fr[1])) fail('cicada hindwing root not behind the forewing root: y ' + hr[1].toFixed(1) + ' vs ' + fr[1].toFixed(1));
    if (!inPoly(hr, fore)) fail('cicada hindwing root not under the forewing');
    const ahead = hind.filter(p => p[1] < hr[1] && !inPoly(p, fore));
    if (ahead.length) fail('cicada hindwing edge ahead of its root outside the forewing: ' + ahead.length + ' points, up to ' + Math.max(...ahead.map(p => hr[1] - p[1])).toFixed(1) + ' ahead');
    const mx = Math.min(...fore.map(p => p[0]));
    if (mx < CIC.midline) fail('cicada forewing within ' + CIC.midline + ' of the midline: x ' + mx.toFixed(1));
  },
  // #49 the wing set: meta.cicada.set is one of CIC_SET.sweep's (counted for POST.cicShares). A roofed plate draws the
  // forewing alone (the hindwing hidden under it: any hindwing outline lies wholly inside the forewing's), and wherever
  // the abdomen runs behind the thorax its side is covered: the tegmen's span at that y reaches from within roofMid of
  // the midline (never nearer than roofIn) out past the abdomen's edge
  cicWingSet(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicWingSet++;
    const set = meta.cicada && meta.cicada.set;
    if (!CIC_SET.sweep[set]) return fail('cicada plate has no known wing set on meta.cicada: ' + set);
    cicSet.sets[set] = (cicSet.sets[set] || 0) + 1;
    if (set !== 'roofed') return;
    const { fore, hind } = cicWings(meta);
    if (hind && hind.some(p => !inPoly(p, fore))) fail('roofed cicada hindwing shows from under the tegmen');
    const ab = meta.abdomen.profile.filter(([y, hw]) => y > meta.thorax.yBot + 2 && hw > 0.5);
    if (!ab.length) return fail('roofed cicada has no abdomen behind the thorax');
    let worst = null;
    for (const [y, hw] of ab) {
      const lo = leftmostAt(fore, y), hi = rightmostAt(fore, y);
      const why = lo === null ? 'no tegmen' : lo > CIC_SET.roofMid ? 'inner margin at x ' + lo.toFixed(1) : lo < CIC_SET.roofIn ? 'inner margin over the midline at x ' + lo.toFixed(1) : hi < hw ? 'outer margin ' + hi.toFixed(1) + ' inside the abdomen edge ' + hw.toFixed(1) : null;
      if (why) { worst = 'y ' + y.toFixed(1) + ': ' + why; break; }
    }
    if (worst) fail('roofed cicada tegmen does not cover the abdomen along the midline: ' + worst);
  },
  // #49 the forewing's shape: on a spread or half-open plate its depth across the root-apex line per that line's length
  // within the shape's CIC_SHAPE band (a roofed tegmen is folded over the body, so its outline is not the wing's)
  cicWingShape(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicWingShape++;
    const shape = meta.cicada && meta.cicada.shape, band = CIC_SHAPE[shape];
    if (!band) return fail('cicada plate has no known forewing shape on meta.cicada: ' + shape);
    cicSet.shapes[shape] = (cicSet.shapes[shape] || 0) + 1;
    if (meta.cicada.set === 'roofed') return;
    const { fore } = cicWings(meta), root = fore[0];
    let apex = root; for (const p of fore) if (dist(p, root) > dist(apex, root)) apex = p;
    const L = dist(apex, root), u = [(apex[0] - root[0]) / L, (apex[1] - root[1]) / L];
    const across = fore.map(p => (p[1] - root[1]) * u[0] - (p[0] - root[0]) * u[1]), r = (Math.max(...across) - Math.min(...across)) / L;
    if (r < band[0] || r > band[1]) fail('cicada ' + shape + ' forewing depth / length ' + r.toFixed(3) + ' outside ' + band.join('-'));
  },
  // #49 the family habitus, read off the drawn outlines (meta.thorax.profile, meta.abdomen.profile, meta.head) and the
  // tymbal covers (meta.cicada.tymbals, right side, body coordinates), against CIC_HAB
  cicHabitus(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicHabitus++;
    const c = meta.cicada || {}, fam = c.fam;
    if (!CIC_HAB.fams.includes(fam)) return fail('cicada plate has no known family on meta.cicada: ' + fam);
    cicSet.fams[fam] = (cicSet.fams[fam] || 0) + 1;
    const th = meta.thorax, thW = maxHw(th.profile), abW = maxHw(meta.abdomen.profile), headHw = meta.head.W / 2;
    const ab0 = meta.abdomen.profile[0][0], abLen = meta.abdomen.profile[meta.abdomen.profile.length - 1][0] - ab0;
    const ty = c.tymbals || null;
    if (fam === 'cicadine') {
      if (abW < CIC_HAB.broad * thW) fail('cicadine abdomen not broad: ' + (abW / thW).toFixed(2) + 'x the thorax (want >= ' + CIC_HAB.broad + ')');
      if (!ty || ty.length < 4) fail('cicadine plate has no tymbal cover');
      else {
        if (ty.some(p => p[1] < ab0 - 2 || p[1] > ab0 + CIC_HAB.tymbalT * abLen)) fail('cicadine tymbal cover outside the abdomen base');
        if (!ty.some(p => p[0] > profHw(meta.abdomen.profile, p[1]) + 1)) fail('cicadine tymbal cover does not show past the abdomen outline');
      }
    } else if (ty && ty.length) fail(fam + ' plate draws tymbal covers (cicadine only)');
    if (fam === 'cicadettine') {
      if (abW > CIC_HAB.slender * thW) fail('cicadettine abdomen not slender: ' + (abW / thW).toFixed(2) + 'x the thorax (want <= ' + CIC_HAB.slender + ')');
      if (headHw > CIC_HAB.head * thW) fail('cicadettine head not narrow: ' + (headHw / thW).toFixed(2) + 'x the thorax (want <= ' + CIC_HAB.head + ')');
    }
    if (fam === 'platypleurine') {
      const yC = th.yTop + CIC_HAB.collarT * (th.yBot - th.yTop), fl = maxHw(th.profile.filter(p => p[0] <= yC));
      if (fl < CIC_HAB.flange * headHw) fail('platypleurine pronotal collar not flared: ' + (fl / headHw).toFixed(2) + 'x the head half width (want >= ' + CIC_HAB.flange + ')');
    }
  },
  // #49 the mesonotum markings (meta.cicada.marks: { kind, polys }, polys closed, body coordinates, both sides): the kind
  // one of CIC_MARKS.kinds (counted for POST.cicShares), every shape inside the thorax outline, behind the collar
  // (meta.cicada.collarY) and ahead of the cruciform elevation (the scutellum's front)
  cicMarks(meta, svg, fail) {
    if (meta.type !== 'cicada') return;
    cicSeen.cicMarks++;
    const mk = meta.cicada && meta.cicada.marks;
    if (!mk || !CIC_MARKS.kinds.includes(mk.kind)) return fail('cicada plate has no known mesonotum marking on meta.cicada: ' + (mk && mk.kind));
    cicSet.marks[mk.kind] = (cicSet.marks[mk.kind] || 0) + 1;
    if ((mk.kind === 'none') !== !mk.polys.length) fail('cicada marking ' + mk.kind + ' with ' + mk.polys.length + ' shapes');
    const yS = Math.min(...meta.thorax.scutellum.map(p => p[1]));
    for (const poly of mk.polys) for (const p of poly) {
      if (Math.abs(p[0]) > profHw(meta.thorax.profile, p[1]) - CIC_MARKS.in) return fail('cicada marking outside the thorax outline at ' + p.map(v => v.toFixed(1)));
      if (p[1] < meta.cicada.collarY || p[1] > yS) return fail('cicada marking outside the mesonotum (collar ' + meta.cicada.collarY.toFixed(1) + ', cruciform ' + yS.toFixed(1) + '): y ' + p[1].toFixed(1));
    }
  },
  // #59 forewing outline (1): about 2.5 times as long as wide, the apex the costal corner, the hind margin deepest near
  // 45% of the length, the costa nearly straight from near the base to where the apex rounds off (#21)
  ephOutline(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephOutline++;
    const f = meta.mayfly && meta.mayfly.fore;
    if (!f) return fail('mayfly plate has no meta.mayfly.fore');
    const P = f.outline, Lx = Math.max(...P.map(p => p[0])), yT = Math.min(...P.map(p => p[1])), yB = Math.max(...P.map(p => p[1])), W = yB - yT;
    const apex = P.find(p => p[0] === Lx), lowest = P.find(p => p[1] === yB);
    const aspect = meta.mayfly.fam === 'caenid' ? EPH_HAB.caenidAspect : EPH.aspect;   // #50: the caenid's broad forewing
    if (Lx / W < aspect[0] || Lx / W > aspect[1]) fail('mayfly forewing length to width ' + (Lx / W).toFixed(2) + ' outside ' + aspect.join('-'));
    if ((apex[1] - yT) / W > EPH.apex) fail('mayfly forewing apex not at the costal corner: ' + ((apex[1] - yT) / W).toFixed(2) + ' of the width behind the front (max ' + EPH.apex + ')');
    if (lowest[0] / Lx < EPH.deep[0] || lowest[0] / Lx > EPH.deep[1]) fail('mayfly hind margin deepest at ' + (lowest[0] / Lx).toFixed(2) + ' of the length (want ' + EPH.deep.join('-') + ')');
    // the costa from sagFrom to sagTo of the length, where the rounded apex (#21) begins: the chord to the apex point
    // itself would measure the apex's curve, which lies off the costa's line by design
    const x0 = EPH.sagFrom * Lx, y0 = Math.min(...outlineYs(P, x0)), x1 = EPH.sagTo * Lx, y1 = Math.min(...outlineYs(P, x1));
    let sag = 0;
    for (let k = 1; k < 40; k++) { const x = lerp(x0, x1, k / 40), ys = outlineYs(P, x); if (!ys.length) continue; sag = Math.max(sag, Math.abs(Math.min(...ys) - lerp(y0, y1, k / 40))); }
    if (sag / Lx > EPH.sag) fail('mayfly costa domed: ' + (sag / Lx).toFixed(3) + ' of the length off its chord (max ' + EPH.sag + ')');
  },
  // #59 the fan (4, 6): a few stems a strip apart at the base, branches forking off them in the basal half, 12-16 vein ends
  // (stems, branches, long intercalaries) on the margin
  ephFan(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephFan++;
    const f = meta.mayfly && meta.mayfly.fore;
    if (!f) return fail('mayfly plate has no meta.mayfly.fore');
    const Lx = Math.max(...f.outline.map(p => p[0]));
    const stems = f.lanes.filter(l => l.kind === 'stem'), br = f.lanes.filter(l => l.kind === 'branch'), ends = f.lanes.filter(l => ['stem', 'branch', 'inter'].includes(l.kind));
    if (stems.length < EPH.stems[0] || stems.length > EPH.stems[1]) fail('mayfly fan stems ' + stems.length + ' (want ' + EPH.stems.join('-') + ')');
    const ys = stems.map(l => plYat(l.pl, EPH.stemAt * Lx));
    if (ys.some(y => y === null)) fail('mayfly fan stem does not reach back to ' + EPH.stemAt + ' of the length');
    else { const so = ys.slice().sort((a, b) => a - b); let gap = Infinity; for (let i = 1; i < so.length; i++) gap = Math.min(gap, so[i] - so[i - 1]); if (gap / Lx < EPH.stemGap) fail('mayfly fan stems converge at the base: ' + (gap / Lx).toFixed(3) + ' of the length apart (min ' + EPH.stemGap + ')'); }
    const basal = br.filter(l => l.parent && stems.some(st => st.id === l.parent) && l.pl[0][0] / Lx <= EPH.forkMax);
    if (basal.length < EPH.forks) fail('mayfly fan forks ' + basal.length + ' branches off its stems in the basal half (min ' + EPH.forks + ')');
    if (ends.length < EPH.ends[0] || ends.length > EPH.ends[1]) fail('mayfly vein ends on the margin ' + ends.length + ' (want ' + EPH.ends.join('-') + ')');
    for (const l of ends) { const e = l.pl[l.pl.length - 1]; if (ptPlD(e, f.outline, true) > 0.01 * Lx) { fail('mayfly vein ' + l.id + ' ends off the margin'); break; } }
  },
  // #59 no two veins cross (a branch or veinlet leaves its parent at its first point), on both wings
  ephLanes(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephLanes++;
    for (const w of ['fore', 'hind']) {
      const m = meta.mayfly && meta.mayfly[w];
      if (!m) { if (w === 'fore') fail('mayfly plate has no meta.mayfly.fore'); continue; }
      for (let i = 0; i < m.lanes.length; i++) for (let j = i + 1; j < m.lanes.length; j++) {
        const a = m.lanes[i], b = m.lanes[j];   // a branch's first point lies on its parent: its first segment touches the parent there, it does not cross it
        const hit = plCross(b.parent === a.id ? a.pl : a.pl.slice(a.parent === b.id ? 1 : 0), b.pl.slice(b.parent === a.id ? 1 : 0));
        if (hit) return fail('mayfly ' + w + 'wing veins cross: ' + a.id + ' and ' + b.id + ' near x ' + hit[0].toFixed(1));
      }
    }
  },
  // #59 the costal field (3): C-Sc rungs sparse over the basal half, dense over the apical third
  ephCostal(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephCostal++;
    const f = meta.mayfly && meta.mayfly.fore;
    if (!f) return fail('mayfly plate has no meta.mayfly.fore');
    const c = f.joins.filter(j => (j[0] === 'C' && j[1] === 'Sc') || (j[0] === 'Sc' && j[1] === 'C')).map(j => j[2]);
    const uSc = f.lanes.find(l => l.id === 'Sc'), uEnd = uSc.pl[uSc.pl.length - 1][0] / f.L;
    const basal = c.filter(u => u < 0.5).length / 0.5, apical = c.filter(u => u > uEnd - 0.3 && u <= uEnd).length / 0.3;
    if (!(apical >= EPH.cost * basal) || !apical) fail('mayfly costal rungs not crowded apically: ' + apical.toFixed(1) + ' per length over the apical third vs ' + basal.toFixed(1) + ' over the basal half (want ' + EPH.cost + 'x)');
  },
  // #59 marginal intercalaries (7) and polygons (10): short free veins between the vein ends along the outer half of the
  // margin, most of them closing a small cell (a rung to them)
  ephMarginal(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephMarginal++;
    const f = meta.mayfly && meta.mayfly.fore;
    if (!f) return fail('mayfly plate has no meta.mayfly.fore');
    const m = f.lanes.filter(l => l.kind === 'marg');
    if (m.length < EPH.marg[0]) return fail('mayfly marginal intercalaries ' + m.length + ' (min ' + EPH.marg[0] + ')');
    for (const l of m) {
      const len = l.pl[l.pl.length - 1][0] - l.pl[0][0];
      if (l.pl[0][0] < EPH.margFrom * f.L || len > EPH.marg[1] * f.L) return fail('mayfly marginal intercalary ' + l.id + ' not short and in the outer half: from ' + (l.pl[0][0] / f.L).toFixed(2) + ', ' + (len / f.L).toFixed(2) + ' long');
    }
    const rung = m.filter(l => f.joins.some(j => j[0] === l.id || j[1] === l.id)).length;
    if (rung < EPH.margRung * m.length) fail('mayfly marginal polygons: ' + rung + ' of ' + m.length + ' marginal intercalaries close a cell');
  },
  // #59 cubital veinlets (8): 4-7 curved veinlets from CuA / CuP to the hind margin in the basal half
  ephCubital(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephCubital++;
    const f = meta.mayfly && meta.mayfly.fore;
    if (!f) return fail('mayfly plate has no meta.mayfly.fore');
    const v = f.lanes.filter(l => l.kind === 'cub');
    if (v.length < EPH.cub[0] || v.length > EPH.cub[1]) fail('mayfly cubital veinlets ' + v.length + ' (want ' + EPH.cub.join('-') + ')');
    for (const l of v) {
      const a = l.pl[0], b = l.pl[l.pl.length - 1], ch = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!['CuA', 'CuP'].includes(l.parent)) return fail('mayfly cubital veinlet ' + l.id + ' does not leave CuA or CuP');
      if (b[0] > EPH.cubEnd * f.L) return fail('mayfly cubital veinlet ' + l.id + ' ends at ' + (b[0] / f.L).toFixed(2) + ' of the length (max ' + EPH.cubEnd + ')');
      if (Math.max(...l.pl.map(p => ptSegD(p, a, b))) < EPH.cubBow * ch) return fail('mayfly cubital veinlet ' + l.id + ' is straight');
      if (ptPlD(b, f.outline, true) > 0.01 * f.L) return fail('mayfly cubital veinlet ' + l.id + ' ends off the margin');
    }
  },
  // #59 rung lean (9): near-perpendicular, leaning either way (no herringbone): wingStats.leans [costal end distal, costal
  // end proximal] over the rungs leaning more than a few degrees; default and device plate
  ephLean(meta, svg, fail, { dev }) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephLean++;
    for (const [s, what] of [[meta.wingStats, ''], [dev.meta.device.wingStats, 'device plate: ']]) {
      if (!s || !s.leans) { fail(what + 'mayfly wingStats has no leans'); continue; }
      const [a, b] = s.leans, n = a + b;
      if (!n || Math.min(a, b) < EPH.lean * n) fail(what + 'mayfly rungs lean one way: ' + a + ' / ' + b);
      if (s.meanAngle > EPH.meanMax) fail(what + 'mayfly rungs not near-perpendicular: mean junction ' + s.meanAngle.toFixed(1) + ' (max ' + EPH.meanMax + ')');
    }
  },
  // #21 a smooth rounded apex: the costa runs into the apex without a hook or spur (no outline point in front of the costal
  // tangent) and the apex is a curve, not a point
  ephApex(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephApex++;
    const f = meta.mayfly && meta.mayfly.fore;
    if (!f) return fail('mayfly plate has no meta.mayfly.fore');
    const P = f.outline, n = P.length, Lx = Math.max(...P.map(p => p[0])), top = x => Math.min(...outlineYs(P, x));
    const xa = 0.7 * Lx, xb = 0.85 * Lx, ya = top(xa), yb = top(xb);
    let over = 0, at = 0;
    for (const p of P) if (p[0] > xb) { const d = ya + (yb - ya) * (p[0] - xa) / (xb - xa) - p[1]; if (d > over) { over = d; at = p[0]; } }
    if (over > EPH.apexOver * Lx) fail('mayfly forewing apex hooks ' + (over / Lx).toFixed(4) + ' of the length in front of the costal tangent at ' + (at / Lx).toFixed(3) + ' (max ' + EPH.apexOver + ')');
    const step = (i, dir) => { let j = i, d = 0; while (d < EPH.apexArc * Lx) { const k = (j + dir + n) % n; d += Math.hypot(P[k][0] - P[j][0], P[k][1] - P[j][1]); j = k; } return P[j]; };
    let rMin = Infinity, rAt = 0;
    for (let i = 0; i < n; i++) {
      const b = P[i]; if (b[0] < xb) continue;
      const a = step(i, -1), c = step(i, 1), cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      const r = cr ? Math.hypot(b[0] - c[0], b[1] - c[1]) * Math.hypot(a[0] - c[0], a[1] - c[1]) * Math.hypot(a[0] - b[0], a[1] - b[1]) / (2 * cr) : Infinity;
      if (r < rMin) { rMin = r; rAt = b[0]; }
    }
    if (rMin < EPH.apexR * Lx) fail('mayfly forewing apex pointed: bend radius ' + (rMin / Lx).toFixed(4) + ' of the length at ' + (rAt / Lx).toFixed(3) + ' (min ' + EPH.apexR + ')');
  },
  // #21 the hindwing lies under the forewing: painted first (the forewing's white fill masks it, so no hindwing vein shows
  // across a forewing rung), and every one of its veins rooted under the forewing or the thorax (the root fan never shows)
  ephMask(meta, svg, fail) {
    if (meta.type !== 'mayfly' || !(meta.mayfly && meta.mayfly.hind)) return;
    ephSeen.ephMask++;
    const { fore: f, hind: h, paint } = meta.mayfly;
    if (!paint || paint.indexOf('hind') < 0 || paint.indexOf('hind') > paint.indexOf('fore')) return fail('mayfly hindwing not painted under the forewing: ' + JSON.stringify(paint));
    if (!f.base || !h.base) return fail('mayfly wings carry no base / th on meta.mayfly');
    const T = w => p => { const a = w.th * Math.PI / 180; return [w.base[0] + p[0] * Math.cos(a) - p[1] * Math.sin(a), w.base[1] + p[0] * Math.sin(a) + p[1] * Math.cos(a)]; };
    const fo = f.outline.map(T(f)), hidden = p => inPoly(p, fo) || Math.abs(p[0]) <= profHw(meta.thorax.profile, p[1]);
    for (const l of h.lanes) {
      const p = T(h)(l.pl[0]);
      if (!hidden(p)) return fail('mayfly hindwing vein ' + l.id + ' rooted in the open at ' + p.map(v => v.toFixed(1)) + ', not under the forewing or the thorax');
    }
  },
  // #21 the fore coxa sits on the prothorax below the head: the leg is rooted between the thorax front and the forewing
  // root, its femur starts behind the head, and it comes out from under the body behind the head (not beside the eyes,
  // where a long foreleg held forward reads as an antenna); right leg and its skewed left copy
  ephForeleg(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephForeleg++;
    const leg = meta.legs && meta.legs.find(l => l.pair === 'front');
    if (!leg) return fail('mayfly plate has no front leg on meta.legs');
    const hb = Math.max(...meta.head.outline.map(p => p[1])), th = meta.thorax, yF = th.yTop + th.wingRoots[0] * (th.yBot - th.yTop);
    const r = leg.pts[0];
    if (r[1] < th.yTop || r[1] > yF) fail('mayfly fore coxa rooted at y ' + r[1].toFixed(1) + ', off the prothorax (' + th.yTop.toFixed(1) + '-' + yF.toFixed(1) + ')');
    for (const [pts, side] of [[leg.pts, 'right'], [skewedPts(leg), 'left']]) {
      if (pts[2][1] < hb) { fail('mayfly ' + side + ' fore femur starts beside the head: y ' + pts[2][1].toFixed(1) + ' ahead of the head\'s back ' + hb.toFixed(1)); continue; }
      let e = null;
      for (let i = 0; i + 1 < pts.length && !e; i++) { const a = pts[i], b = pts[i + 1], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25)); for (let q = 0; q <= k; q++) { const p = [a[0] + (b[0] - a[0]) * q / k, a[1] + (b[1] - a[1]) * q / k]; if (!inPoly(p, meta.head.outline) && Math.abs(p[0]) > profHw(th.profile, p[1])) { e = p; break; } } }
      if (e && e[1] < hb) fail('mayfly ' + side + ' foreleg comes out from under the body beside the head: y ' + e[1].toFixed(1) + ' (head back ' + hb.toFixed(1) + ')');
    }
  },
  // #21 no open cell beside crowded ones: in every forewing strip of openMin rungs or more (the costal strip excepted: it
  // is sparse over the basal half by design, #59), no two neighbouring rungs more than `open` times the strip's median gap apart
  ephOpen(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephOpen++;
    const f = meta.mayfly && meta.mayfly.fore;
    if (!f) return fail('mayfly plate has no meta.mayfly.fore');
    const by = {};
    for (const j of f.joins) if (j[0] !== 'C' && j[1] !== 'C') (by[j[0] + '|' + j[1]] ||= []).push(j[2]);
    for (const k in by) {
      const u = by[k].sort((a, b) => a - b); if (u.length < EPH.openMin) continue;
      const g = []; for (let i = 1; i < u.length; i++) g.push(u[i] - u[i - 1]);
      const med = g.slice().sort((a, b) => a - b)[g.length >> 1], i = g.indexOf(Math.max(...g));
      if (g[i] > EPH.open * med) return fail('mayfly open cell in strip ' + k + ': rungs at ' + u[i].toFixed(3) + ' and ' + u[i + 1].toFixed(3) + ', ' + (g[i] / med).toFixed(1) + 'x the strip\'s median gap (max ' + EPH.open + ')');
    }
  },
  // #50 the family habitus, on the drawn outlines (meta.thorax / meta.abdomen profiles, meta.head, meta.mayfly.fore)
  ephFamily(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephFamily++;
    const m = meta.mayfly || {}, fam = m.fam;
    if (!EPH_HAB.fams.includes(fam)) return fail('mayfly plate has no known family on meta.mayfly: ' + fam);
    if (meta.fam !== fam) fail('mayfly meta.fam not the drawn family: ' + meta.fam + ' vs ' + fam);
    ephHab.fams[fam] = (ephHab.fams[fam] || 0) + 1;
    if (!['male', 'female'].includes(m.sex)) return fail('mayfly plate has no sex on meta.mayfly: ' + m.sex);
    ephHab.sex[m.sex] = (ephHab.sex[m.sex] || 0) + 1;
    const thW = maxHw(meta.thorax.profile), abW = maxHw(meta.abdomen.profile), headHw = meta.head.W / 2;
    const ap = meta.abdomen.profile, abLen = ap[ap.length - 1][0] - ap[0][0], fL = m.fore ? Math.max(...m.fore.outline.map(p => p[0])) : null;
    if (fam === 'heptageniid') {
      if (headHw < EPH_HAB.headBroad * thW) fail('heptageniid head not broad: ' + (headHw / thW).toFixed(2) + 'x the thorax (want >= ' + EPH_HAB.headBroad + ')');
      if (abW < EPH_HAB.abdBroad * thW) fail('heptageniid abdomen not flattened: ' + (abW / thW).toFixed(2) + 'x the thorax (want >= ' + EPH_HAB.abdBroad + ')');
    }
    if (fam === 'baetid' && abW > EPH_HAB.abdSlender * thW) fail('baetid abdomen not slender: ' + (abW / thW).toFixed(2) + 'x the thorax (want <= ' + EPH_HAB.abdSlender + ')');
    if (fam === 'caenid' && fL && abLen > EPH_HAB.caenidAbd * fL) fail('caenid abdomen not short: ' + (abLen / fL).toFixed(2) + 'x the forewing (want <= ' + EPH_HAB.caenidAbd + ')');
    if (fam === 'ephemerid' && fL && abLen < EPH_HAB.ephemeridAbd * fL) fail('ephemerid abdomen not long: ' + (abLen / fL).toFixed(2) + 'x the forewing (want >= ' + EPH_HAB.ephemeridAbd + ')');
  },
  // #50 the hindwing size class: one the family may draw; absent draws none, small and large are their share of the forewing
  ephHindSize(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephHindSize++;
    const m = meta.mayfly || {}, c = m.hindClass;
    if (!['large', 'small', 'absent'].includes(c)) return fail('mayfly plate has no known hindwing class on meta.mayfly: ' + c);
    ephHab.hind[c] = (ephHab.hind[c] || 0) + 1;
    if (EPH_HAB.hindFams[m.fam] && !EPH_HAB.hindFams[m.fam].includes(c)) fail('mayfly hindwing class not its family\'s: ' + m.fam + ' draws ' + c + ' (want ' + EPH_HAB.hindFams[m.fam].join(' / ') + ')');
    if (c === 'absent') { if (m.hind) fail('mayfly with an absent hindwing draws one'); return; }
    if (!m.hind) return fail('mayfly with a ' + c + ' hindwing draws none');
    const Lx = Math.max(...m.hind.outline.map(p => p[0])), Lf = Math.max(...m.fore.outline.map(p => p[0])), band = EPH_HAB.hind[c];
    if (Lx / Lf < band[0] || Lx / Lf > band[1]) fail('mayfly hindwing out of its size class: ' + c + ' ' + (Lx / Lf).toFixed(2) + ' of the forewing (want ' + band.join('-') + ')');
    if (c === 'small') {
      const ys = m.hind.outline.map(p => p[1]), W = Math.max(...ys) - Math.min(...ys), nV = m.hind.lanes.filter(l => l.id !== 'Sc').length;
      if (Lx / W < EPH_HAB.smallAspect[0] || Lx / W > EPH_HAB.smallAspect[1]) fail('mayfly small hindwing length to width: ' + (Lx / W).toFixed(2) + ' (want ' + EPH_HAB.smallAspect.join('-') + ')');
      if (nV < EPH_HAB.smallVeins[0] || nV > EPH_HAB.smallVeins[1]) fail('mayfly small hindwing veins behind Sc: ' + nV + ' (want ' + EPH_HAB.smallVeins.join('-') + ')');
    }
  },
  // #50 the tails (cerci and the median filament): the family's count, each drawn 0.8-2.5 abdomen lengths long, the outer
  // tail's chord off straight back in its splay class, and every point inside the plate's box (the fit counts them)
  ephTails(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephTails++;
    const m = meta.mayfly || {}, t = m.tails;
    if (!t || !t.pts || !t.pts.length) return fail('mayfly plate has no tails on meta.mayfly');
    ephHab.tails[t.n] = (ephHab.tails[t.n] || 0) + 1;
    if (t.n !== EPH_HAB.tails[m.fam]) fail('mayfly tail count not its family\'s: ' + m.fam + ' has ' + t.n + ' (want ' + EPH_HAB.tails[m.fam] + ')');
    if (t.pts.length !== (t.n === 3 ? 2 : 1)) fail('mayfly tail lines: ' + t.n + ' tails drawn as ' + t.pts.length + ' lines on the right side');
    const band = EPH_HAB.splay[t.splay];
    if (!band) return fail('mayfly tail splay class unknown: ' + t.splay);
    ephHab.splay[t.splay] = (ephHab.splay[t.splay] || 0) + 1;
    const ap = meta.abdomen.profile, abLen = ap[ap.length - 1][0] - ap[0][0];
    for (const pl of t.pts) {
      let len = 0; for (let i = 1; i < pl.length; i++) len += dist(pl[i], pl[i - 1]);
      if (len < (EPH_HAB.tailLen[0] - EPH_HAB.tailTol) * abLen || len > (EPH_HAB.tailLen[1] + EPH_HAB.tailTol) * abLen) fail('mayfly tail length: ' + (len / abLen).toFixed(2) + ' abdomen lengths (want ' + EPH_HAB.tailLen.join('-') + ')');
      const b = meta.bbox;
      for (const p of pl) if (p[0] < b.minX - 0.01 || p[0] > b.maxX + 0.01 || p[1] < b.minY - 0.01 || p[1] > b.maxY + 0.01) { fail('mayfly tail leaves the plate box at ' + p.map(v => v.toFixed(1)) + ' (the tails count toward the fit)'); break; }
    }
    const o = t.pts[0], a = o[0], b = o[o.length - 1], ang = Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
    if (o.some(p => p[0] < a[0] - 0.01)) fail('mayfly outer tail turns in toward the midline (the cerci cross)');
    if (ang < band[0] - EPH_HAB.splayTol || ang > band[1] + EPH_HAB.splayTol) fail('mayfly outer tail splay: ' + ang.toFixed(1) + ' degrees off straight back (' + t.splay + ': ' + band.join('-') + ')');
    if (t.n === 3) { const mid = t.pts[1]; if (mid.some(p => Math.abs(p[0]) > 0.5)) fail('mayfly median filament off the midline'); }
  },
  // #50 the male's long forelegs held forward along the antennae, the female's short ones (fore leg from the femur over the mid leg's)
  ephForeLen(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephForeLen++;
    const m = meta.mayfly || {}, legLen = l => { let s = 0; for (let i = 3; i < l.pts.length; i++) s += dist(l.pts[i], l.pts[i - 1]); return s; };
    const fore = meta.legs.find(l => l.pair === 'front'), mid = meta.legs.find(l => l.pair === 'mid');
    if (!fore || !mid) return fail('mayfly plate has no front or mid leg on meta.legs');
    const r = legLen(fore) / legLen(mid);
    if (m.sex === 'male') {
      if (r < EPH_HAB.foreMale) fail('male mayfly foreleg short: ' + r.toFixed(2) + 'x the mid leg (want >= ' + EPH_HAB.foreMale + ')');
      const headFront = Math.min(...meta.head.outline.map(p => p[1])), tip = fore.pts[fore.pts.length - 1];
      if (tip[1] > headFront) fail('male mayfly foreleg not held forward: its tip at y ' + tip[1].toFixed(1) + ' behind the head front ' + headFront.toFixed(1));
    } else if (r > EPH_HAB.foreFemale) fail('female mayfly foreleg long: ' + r.toFixed(2) + 'x the mid leg (want <= ' + EPH_HAB.foreFemale + ')');
  },
  // #50 the wing set: the forewing's root-to-apex line (body coordinates, through makeWing's placement) in the set's band
  ephWingSet(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephWingSet++;
    const m = meta.mayfly || {}, band = EPH_HAB.sets[m.set];
    if (!band) return fail('mayfly plate has no known wing set on meta.mayfly: ' + m.set);
    ephHab.sets[m.set] = (ephHab.sets[m.set] || 0) + 1;
    const f = m.fore, a = f.th * Math.PI / 180, ap = [f.base[0] + f.apex[0] * Math.cos(a) - f.apex[1] * Math.sin(a), f.base[1] + f.apex[0] * Math.sin(a) + f.apex[1] * Math.cos(a)];
    const ang = Math.atan2(ap[1] - f.base[1], ap[0] - f.base[0]) * 180 / Math.PI;
    if (ang < band[0] - EPH_HAB.setTol || ang > band[1] + EPH_HAB.setTol) fail('mayfly forewing sweep outside its set: ' + ang.toFixed(1) + ' degrees (' + m.set + ': ' + band.join('-') + ')');
  },
  // #50 the tergite pattern: a known family; the ephemerid's dorsal triangles inside the abdomen outline, apex forward on the midline
  ephTergites(meta, svg, fail) {
    if (meta.type !== 'mayfly') return;
    ephSeen.ephTergites++;
    const tg = meta.mayfly && meta.mayfly.tergites;
    if (!tg || !EPH_HAB.tergites.includes(tg.kind)) return fail('mayfly plate has no known tergite pattern on meta.mayfly: ' + (tg && tg.kind));
    if (tg.kind !== meta.bodyGenes.abd.mark) fail('mayfly tergite pattern not the abdomen mark: ' + tg.kind + ' vs ' + meta.bodyGenes.abd.mark);
    if ((tg.kind === 'triangles') !== !!(tg.polys && tg.polys.length)) return fail('mayfly tergite pattern and triangles disagree: ' + tg.kind + ' with ' + (tg.polys ? tg.polys.length : 0) + ' triangles');
    for (const poly of tg.polys || []) {
      if (poly.length !== 3) return fail('mayfly dorsal triangle corners: ' + poly.length);
      for (const p of poly) if (Math.abs(p[0]) > profHw(meta.abdomen.profile, p[1]) - EPH_HAB.triIn) return fail('mayfly dorsal triangle outside the abdomen at ' + p.map(v => v.toFixed(1)));
      const apex = poly[0];
      if (Math.abs(apex[0]) > 0.01 || !(apex[1] < poly[1][1] && apex[1] < poly[2][1]) || Math.abs(poly[1][0] + poly[2][0]) > 0.01) return fail('mayfly dorsal triangle not apex forward on the midline');
    }
  },
  // #59 hindwing (12): about a third of the forewing, a rounded oval with an angular costal process near the base, 7-10
  // veins behind Sc
  ephHind(meta, svg, fail) {
    if (meta.type !== 'mayfly' || !(meta.mayfly && meta.mayfly.hind)) return;
    ephSeen.ephHind++;
    if (meta.mayfly.hindClass === 'small') return;   // #50: a small hindwing is held by ephHindSize
    const h = meta.mayfly.hind, f = meta.mayfly.fore, E2 = EPH.hind;
    const Lx = Math.max(...h.outline.map(p => p[0])), W = Math.max(...h.outline.map(p => p[1])) - Math.min(...h.outline.map(p => p[1]));
    const Lf = Math.max(...f.outline.map(p => p[0]));
    if (Lx / Lf < E2.len[0] || Lx / Lf > E2.len[1]) fail('mayfly hindwing ' + (Lx / Lf).toFixed(2) + ' of the forewing (want ' + E2.len.join('-') + ')');
    if (Lx / W < E2.aspect[0] || Lx / W > E2.aspect[1]) fail('mayfly hindwing length to width ' + (Lx / W).toFixed(2) + ' (want ' + E2.aspect.join('-') + ')');
    const nV = h.lanes.filter(l => l.id !== 'Sc').length;
    if (nV < E2.veins[0] || nV > E2.veins[1]) fail('mayfly hindwing veins behind Sc ' + nV + ' (want ' + E2.veins.join('-') + ')');
    const top = x => { const ys = outlineYs(h.outline, x); return ys.length ? Math.min(...ys) : null; };
    let pk = null;
    for (let k = 0; k <= 50; k++) { const x = lerp(E2.proc[0], E2.proc[1], k / 50) * Lx, y = top(x); if (y !== null && (!pk || y < pk[1])) pk = [x, y]; }
    let notch = 0;
    if (pk) for (let k = 1; k <= 30; k++) { const x = pk[0] + k / 30 * 0.2 * Lx, y = top(x); if (y !== null) notch = Math.max(notch, y - pk[1]); }
    if (!pk || notch < E2.notch * Lx) fail('mayfly hindwing has no costal process: notch ' + (notch / Lx).toFixed(3) + ' of the length behind its peak (min ' + E2.notch + ')');
  },
  wings(meta, svg, fail, { dev }) {
    const checkWingStats = (s, what) => {
      if (!s) return fail(what + 'no wingStats on a grown wing');
      const band = RUNG_BAND[meta.type] || RUNG_BAND_ALL;
      if (s.joins > 0 && (s.minAngle < band[0] || s.maxAngle > band[1])) fail(what + 'junction angle outside ' + band.join('-') + ': ' + s.minAngle.toFixed(1) + '-' + s.maxAngle.toFixed(1));
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
  // device plate (heavier strokes, the same centre-lines' floor); every order the registry does not opt out (ORDERS[type].laneFloor === false: the beetle)
  laneSep(meta, svg, fail, { seed, dev }) {
    if (E.ORDERS[meta.type].laneFloor === false) {   // the registry opts the order out (the beetle); it must then draw no floored lanes
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
  // #24: the pronotum's proportions against the research ranges (BEETLE)
  beetleProportions(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    const th = meta.thorax, Y = meta.elytra;
    if (!Y || !Array.isArray(Y.outline)) return fail('no elytron outline on meta.elytra');
    const pw = 2 * maxHw(th.profile), pl = th.yBot - th.yTop, ew = 2 * Math.max(...Y.outline.map(p => p[0]));
    const wl = pw / pl, pe = pw / ew;
    beetleRun.n++;
    beetleRun.wl = [Math.min(beetleRun.wl[0], wl), Math.max(beetleRun.wl[1], wl)]; beetleRun.pe = [Math.min(beetleRun.pe[0], pe), Math.max(beetleRun.pe[1], pe)];
    if (wl < BEETLE.pronWL[0] || wl > BEETLE.pronWL[1]) fail('pronotum width / length outside ' + BEETLE.pronWL.join('-') + ': ' + wl.toFixed(2) + ' (' + meta.fam + ')');
    if (pe < BEETLE.pronEly[0] || pe > BEETLE.pronEly[1]) fail('pronotum / elytra width outside ' + BEETLE.pronEly.join('-') + ': ' + pe.toFixed(2) + ' (' + meta.fam + ')');
  },
  // #24: the rove beetle's short truncate elytra over a tapering, hatched abdomen (ROVE)
  roveBody(meta, svg, fail) {
    if (meta.type !== 'beetle' || meta.fam !== 'rove') return;
    roveSeen++;
    const th = meta.thorax, Y = meta.elytra, ab = meta.abdomen;
    if (!Y || !Array.isArray(Y.outline)) return fail('no elytron outline on meta.elytra');
    const ys = Y.outline.map(p => p[1]), eTop = Math.min(...ys), eBot = Math.max(...ys), ew = Math.max(...Y.outline.map(p => p[0]));
    const k = (eBot - eTop) / (th.yBot - th.yTop);
    if (k < ROVE.ely[0] || k > ROVE.ely[1]) fail('rove elytra ' + k.toFixed(2) + 'x the pronotum length (want ' + ROVE.ely.join('-') + ')');
    const hind = Math.max(...Y.outline.filter(p => p[1] >= eBot - ROVE.edge * (eBot - eTop)).map(p => p[0]));
    if (hind < ROVE.trunc * ew) fail('rove elytra not truncate: hind margin ' + (hind / ew).toFixed(2) + ' of the width (want >= ' + ROVE.trunc + ')');
    const aLen = ab.yBot - ab.yTop, tip = profHw(ab.profile, ab.yTop + ROVE.tipT * aLen) / maxHw(ab.profile);
    if (tip > ROVE.tipK) fail('rove abdomen does not taper: ' + tip.toFixed(2) + ' of its width at ' + ROVE.tipT + ' of its length (want <= ' + ROVE.tipK + ')');
    const exposed = meta.abdMarks.segs.filter(seg => { const top = seg.find(m => m.k === 'edge'); return top && Math.min(...seg.filter(m => m.k === 'edge').map(m => m.y)) > eBot; });
    if (exposed.length < ROVE.exposed) fail('rove abdomen shows ' + exposed.length + ' tergites past the elytra (want >= ' + ROVE.exposed + ')');
    if (exposed.some(seg => !seg.some(m => m.k === 'hatch'))) fail('a rove tergite past the elytra is not hatched');
  },
  // #53: the beetle family is one of COL_FAMS (the round families' aspect: colBuild)
  colFamily(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    if (!COL_FAMS.includes(meta.fam)) return fail('beetle family ' + meta.fam + ' is not one of ' + COL_FAMS.join('/'));
    colFams[meta.fam] = (colFams[meta.fam] || 0) + 1;
  },
  // #74: the round families' build (COL_BUILD) as drawn, and never against the elytral outline (COL_BUILD_NOT)
  colBuild(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    const b = meta.bodyGenes.build, bands = COL_BUILD[meta.fam];
    if (!bands) return b ? fail(meta.fam + ' has a build (' + b + '); only ' + Object.keys(COL_BUILD).join('/') + ' do') : undefined;
    if (!(b in bands)) return fail(meta.fam + ' build ' + b + ' is not one of ' + Object.keys(bands).join('/'));
    if (!meta.bodySig.split(',').includes('bd' + b)) fail('build missing from bodySig');
    tally('build', meta.fam + ':' + b);
    const not = COL_BUILD_NOT[meta.fam + ':' + b] || [], G = meta.bodyGenes.elytra;
    if (not.includes(G.outline)) fail('a ' + b + ' ' + meta.fam + ' with ' + G.outline + ' elytra');
    const Y = meta.elytra;
    if (!Y || !Array.isArray(Y.outline)) return fail('no elytron outline on meta.elytra');
    const k = elyAspect(Y.outline), band = bands[b];
    if (k < band[0] || k > band[1]) fail(b + ' ' + meta.fam + ' elytra ' + k.toFixed(2) + ' as broad as long (want ' + band.join('-') + ')');
  },
  // #74: the spot layout of a spotted or dark elytron (SPOT_LAYOUTS) as drawn: the spots' centres on meta.elytra.pattern
  spotLayout(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    const G = meta.bodyGenes.elytra, kind = G && G.pattern;
    if (kind !== 'spots' && kind !== 'dark') return;
    const lay = G.pat.layout;
    if (!SPOT_LAYOUTS.includes(lay)) return fail('spot layout ' + lay + ' is not one of ' + SPOT_LAYOUTS.join('/'));
    if (!meta.bodySig.split(',').includes('sl' + lay)) fail('spot layout missing from bodySig');
    tally('spotLayout', lay);
    const Y = meta.elytra, Pt = Y.pattern, rings = kind === 'dark' ? Pt.holes : Pt.regions;
    if (!rings.length) return fail(kind + ' elytron with no spot drawn (' + lay + ')');
    const hwAt = y => { let best = 0; for (let i = 0; i + 1 < Y.outline.length; i++) { const a = Y.outline[i], c = Y.outline[i + 1]; if ((a[1] - y) * (c[1] - y) <= 0 && a[1] !== c[1]) best = Math.max(best, a[0] + (c[0] - a[0]) * (y - a[1]) / (c[1] - a[1])); } return best; };
    const cs = rings.map(r => { const xs = r.map(p => p[0]), ys = r.map(p => p[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; });
    const fx = cs.map(c => c[0] / hwAt(c[1]));
    if (lay === 'margin' && fx.some(f => f < 0.5)) fail('margin spots off the margin: ' + fx.map(f => f.toFixed(2)).join(' '));
    if (lay === 'suture' && fx.some(f => f > 0.5)) fail('suture spots off the suture: ' + fx.map(f => f.toFixed(2)).join(' '));
    if (lay !== 'scatter' && cs.length > 1 && Math.max(...fx) - Math.min(...fx) > SPOT_ROW) fail(lay + ' spots not in a row: ' + fx.map(f => f.toFixed(2)).join(' '));
  },
  // #53: the elytral outline and shoulders as drawn (ELY_SHAPE)
  elytraOutline(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    const G = meta.bodyGenes.elytra, Y = meta.elytra;
    if (!G || !Y || !Array.isArray(Y.outline)) return fail('no elytra genes / outline on meta');
    if (G.outline === null && meta.fam === 'rove') return;   // the truncate elytron
    if (!ELY_OUTLINES.includes(G.outline) || !['square', 'rounded'].includes(G.shoulder)) return fail('elytral outline gene ' + G.outline + ' / shoulder ' + G.shoulder + ' is not one of ' + ELY_OUTLINES.join('/') + ' x square/rounded');
    if (!meta.bodySig.split(',').includes('eo' + G.outline[0] + G.shoulder[0])) fail('elytral outline missing from bodySig');
    tally('outline', G.outline); tally('shoulder', G.shoulder);
    const ys = Y.outline.map(p => p[1]), y0 = Math.min(...ys), len = Math.max(...ys) - y0;
    const hw = t => { const y = y0 + t * len; let best = 0; for (let i = 0; i + 1 < Y.outline.length; i++) { const a = Y.outline[i], b = Y.outline[i + 1]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) best = Math.max(best, a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); } return best; };
    const W = Math.max(...Y.outline.map(p => p[0])), w = t => hw(t) / W;
    let at = 0; for (let t = 0; t <= 1; t += 0.01) if (hw(t) > hw(at)) at = t;
    const S = ELY_SHAPE, bad = m => fail(G.outline + ' elytra: ' + m + ' (' + meta.fam + ')');
    if (G.outline === 'parallel' && (w(0.2) < S.par || w(0.6) < S.par)) bad('sides not parallel, w(0.2) ' + w(0.2).toFixed(2) + ', w(0.6) ' + w(0.6).toFixed(2));
    if (G.outline === 'oval' && (at < S.oval.at[0] || at > S.oval.at[1] || w(0.1) > S.oval.ends || w(0.8) > S.oval.ends)) bad('widest at ' + at.toFixed(2) + ', w(0.1) ' + w(0.1).toFixed(2) + ', w(0.8) ' + w(0.8).toFixed(2));
    if (G.outline === 'rounded' && w(0.8) < S.round) bad('apex not broad, w(0.8) ' + w(0.8).toFixed(2));
    if (G.outline === 'tapering' && (at > S.taper.at || w(0.8) > S.taper.end)) bad('widest at ' + at.toFixed(2) + ', w(0.8) ' + w(0.8).toFixed(2));
    if (G.shoulder === 'square' && w(0.03) < S.sq) bad('shoulders not square, w(0.03) ' + w(0.03).toFixed(2));
    if (G.shoulder === 'rounded' && w(0.03) > S.rd) bad('shoulders not rounded, w(0.03) ' + w(0.03).toFixed(2));
  },
  // #53: the elytral pattern as hatched shapes inside the elytron (ELY_PATTERNS), on the default and the device plate
  elytraPattern(meta, svg, fail, { dev }) {
    if (meta.type !== 'beetle') return;
    const kind = meta.bodyGenes.elytra && meta.bodyGenes.elytra.pattern;
    if (!ELY_PATTERNS.includes(kind)) return fail('elytral pattern gene ' + kind + ' is not one of ' + ELY_PATTERNS.join('/'));
    if (!meta.bodySig.split(',').includes('ep' + kind[0])) fail('elytral pattern missing from bodySig');
    tally('pattern', kind);
    const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const inside = (p, poly) => { if (inPoly(p, poly)) return true; for (let i = 0; i + 1 < poly.length; i++) if (segD(p, poly[i], poly[i + 1]) <= ELY_IN) return true; return false; };
    for (const [m, what] of [[meta, ''], [dev.meta, 'device plate: ']]) {
      const Y = m.elytra, Pt = Y && Y.pattern;
      if (!Pt || Pt.kind !== kind || !Array.isArray(Pt.regions) || !Array.isArray(Pt.hatch)) { fail(what + 'meta.elytra.pattern is not the gene: ' + (Pt && Pt.kind)); continue; }
      const nR = Pt.regions.length, want = { none: [0, 0], spots: [meta.fam === 'coccinellid' ? 1 : 2, 99], bands: [1, 99], stripe: [1, 1], dark: [1, 1] }[kind];
      if (nR < want[0] || nR > want[1]) fail(what + kind + ' pattern with ' + nR + ' regions');
      if (kind === 'none' && Pt.hatch.length) fail(what + 'an unpatterned elytron with hatch');
      if (kind !== 'none' && !Pt.hatch.length) fail(what + kind + ' pattern without hatch');
      if (Pt.regions.some(r => r.length < 4 || r.some(p => !inside(p, Y.outline)))) fail(what + kind + ' region outside the elytron');
      if (Pt.hatch.some(([a, b]) => !inside(a, Y.outline) || !inside(b, Y.outline))) fail(what + kind + ' hatch outside the elytron');
      if (Pt.hatch.some(([a, b]) => !Pt.regions.some(r => inside([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], r)))) fail(what + kind + ' hatch outside its shapes');
      if (kind === 'dark' && (!Array.isArray(Pt.holes) || !Pt.holes.length)) fail(what + 'a dark elytron without pale spots');
      if (Pt.hatch.some(([a, b]) => (Pt.holes || []).some(h => inPoly([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], h)))) fail(what + 'hatch inside a pale spot');
      const g = hatchGap(Pt.hatch);
      if (g === null) fail(what + 'hatch lines not parallel');
      else if (g * m.scale < ELY_PITCH - 1e-3) fail(what + 'pattern hatch ' + (g * m.scale).toFixed(2) + ' px apart (want >= ' + ELY_PITCH + ')');
    }
  },
  // #53: the pronotal pattern (PRON_PATTERNS) as hatched shapes inside the pronotum
  pronotumPattern(meta, svg, fail, { dev }) {
    if (meta.type !== 'beetle') return;
    const kind = meta.bodyGenes.thorax.pronPat;
    if (!(kind in PRON_PATTERNS)) return fail('pronotal pattern gene ' + kind + ' is not one of ' + Object.keys(PRON_PATTERNS).join('/'));
    if (!meta.bodySig.split(',').includes('pp' + kind[0])) fail('pronotal pattern missing from bodySig');
    tally('pronPattern', kind);
    for (const [m, what] of [[meta, ''], [dev.meta, 'device plate: ']]) {
      const Pt = m.thorax.pattern, th = m.thorax;
      if (!Pt || Pt.kind !== kind) { fail(what + 'meta.thorax.pattern is not the gene'); continue; }
      if (Pt.regions.length !== PRON_PATTERNS[kind]) fail(what + kind + ' pronotum with ' + Pt.regions.length + ' regions');
      if (kind !== 'none' && !Pt.hatch.length) fail(what + kind + ' pronotum without hatch');
      const inPron = p => p[1] >= th.yTop - ELY_IN && p[1] <= th.yBot + ELY_IN && Math.abs(p[0]) <= profHw(th.profile, Math.min(Math.max(p[1], th.yTop), th.yBot - 0.01), 0.11) + ELY_IN;
      if (Pt.regions.some(r => r.some(p => !inPron(p))) || Pt.hatch.some(h => !h.every(inPron))) fail(what + kind + ' pronotal pattern outside the pronotum');
      const g = hatchGap(Pt.hatch);
      if (g === null) fail(what + 'pronotal hatch lines not parallel');
      else if (g * m.scale < ELY_PITCH - 1e-3) fail(what + 'pronotal hatch ' + (g * m.scale).toFixed(2) + ' px apart (want >= ' + ELY_PITCH + ')');
    }
  },
  // #53: the pronotum : elytra width class as drawn (PRON_CLASS)
  pronotumRatio(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    const c = meta.bodyGenes.thorax.pronClass, Y = meta.elytra;
    if (!(c in PRON_CLASS)) return fail('pronotum width class ' + c + ' is not one of ' + Object.keys(PRON_CLASS).join('/'));
    if (!meta.bodySig.split(',').includes('pr' + c[0])) fail('pronotum width class missing from bodySig');
    tally('pronClass', c);
    const pe = 2 * maxHw(meta.thorax.profile) / (2 * Math.max(...Y.outline.map(p => p[0])));
    if (pe < PRON_CLASS[c][0] || pe > PRON_CLASS[c][1]) fail(c + ' pronotum ' + pe.toFixed(2) + ' of the elytral width (want ' + PRON_CLASS[c].join('-') + ', ' + meta.fam + ')');
  },
  // #53: the pronotal armature (ARM): scarab horns, longhorn lateral spines
  beetleArmature(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    const G = meta.bodyGenes.armature, A = meta.armature, h = meta.head, th = meta.thorax;
    if (!G || !A) return fail('no armature gene / meta.armature on a beetle');
    const tok = 'ar' + (G.horn ? G.horn[0] : '-') + (G.spines ? 's' : '');
    if (!meta.bodySig.split(',').includes(tok)) fail('armature missing from bodySig (' + tok + ')');
    if (G.horn && !ARM.horn.includes(meta.fam)) fail('a horn on a ' + meta.fam);
    if (G.spines && !ARM.spines.includes(meta.fam)) fail('pronotal spines on a ' + meta.fam);
    if (ARM.horn.includes(meta.fam)) tally('horn', G.horn || 'none');
    if (ARM.spines.includes(meta.fam)) tally('spines', G.spines ? '1' : '0');
    if (!!G.horn !== !!A.horn || (G.horn && A.horn.kind !== G.horn)) return fail('the drawn horn is not the gene');
    if (A.horn) {
      const { base, tip } = A.horn, front = G.horn === 'cephalic' ? h.top : th.yTop;
      if (G.horn === 'cephalic' && !inPoly(base, h.outline)) fail('cephalic horn base outside the head');
      if (G.horn === 'pronotal' && (base[1] < th.yTop || base[1] > th.yBot || Math.abs(base[0]) > profHw(th.profile, base[1], 0.11))) fail('pronotal horn base off the pronotum');
      if (Math.abs(tip[0]) > ARM.tipX * h.W) fail('horn tip off the midline: ' + (tip[0] / h.W).toFixed(2) + ' head widths');
      if (front - tip[1] < ARM.ahead * h.W) fail(G.horn + ' horn reaches only ' + ((front - tip[1]) / h.W).toFixed(2) + ' head widths ahead (want >= ' + ARM.ahead + ')');
    }
    if (!!G.spines !== !!(A.spines && A.spines.length)) return fail('the drawn spines are not the gene');
    for (const sp of A.spines || []) {
      const hb = profHw(th.profile, sp.base[1], 0.11), ht = profHw(th.profile, Math.min(Math.max(sp.tip[1], th.yTop), th.yBot - 0.01), 0.11);
      if (Math.abs(sp.base[0] - hb) > ARM.edge) fail('pronotal spine base off the margin');
      const out = (sp.tip[0] - ht) / ht;
      if (out < ARM.spine[0] || out > ARM.spine[1]) fail('pronotal spine reaches ' + out.toFixed(2) + ' of the half width out (want ' + ARM.spine.join('-') + ')');
    }
  },
  // #53: the stag beetle's antler mandibles (STAG)
  stagMandibles(meta, svg, fail) {
    if (meta.type !== 'beetle' || meta.fam !== 'lucanid') return;
    const h = meta.head, M = h.mand, W = h.W, T = h.mandTeeth;
    if (!Array.isArray(M) || M.length !== 2 || !Array.isArray(T) || T.length !== 2) return fail('stag beetle without two jaws and two inner teeth on meta.head');
    let reach = Infinity;
    M.forEach((j, i) => {
      const ys = j.map(p => p[1]), tipY = Math.min(...ys), tip = j[ys.indexOf(tipY)], len = (h.top - tipY) / W, out = Math.max(...j.map(p => Math.abs(p[0]))) / W;
      reach = Math.min(reach, len);
      if (len < STAG.len[0] || len > STAG.len[1]) fail('stag mandible length ' + len.toFixed(2) + ' head widths (want ' + STAG.len.join('-') + ')');
      if (out < STAG.spread) fail('stag mandible bowed out only ' + out.toFixed(2) + ' head widths (want >= ' + STAG.spread + ')');
      if (Math.abs(tip[0]) / W > STAG.tipX) fail('stag mandible tip ' + (Math.abs(tip[0]) / W).toFixed(2) + ' head widths off the midline (want <= ' + STAG.tipX + ')');
      if (!(T[i][1] < h.top && T[i][1] > tipY)) fail('stag mandible tooth not along the jaw');
    });
    tally('stag', reach >= STAG.major ? 'major' : 'minor');
  },
  // #53: the fore tibia, fossorial (toothed) or slender (FOSS)
  foretibia(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    const n = meta.bodyGenes.legs[0].tibTeeth, tib = meta.legs[0].tib, pts = meta.legs[0].pts;
    if (!(n === 0 || (n >= FOSS.teeth[0] && n <= FOSS.teeth[1]))) return fail('fore tibia teeth gene ' + n);
    if (!meta.bodySig.split(',').includes('ft' + n)) fail('fore tibia type missing from bodySig');
    if (FOSS.fams.includes(meta.fam)) tally('foretibia', n ? 'toothed' : 'slender');
    else if (n) fail('a toothed fore tibia on a ' + meta.fam);
    if (!tib || tib.teeth !== n || (tib.tips || []).length !== n) return fail('fore tibia draws ' + (tib && tib.teeth) + ' teeth, gene ' + n);
    const a = pts[3], b = pts[4], L = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    for (const p of tib.tips) {
      const s = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L, foot = [a[0] + d[0] * s * L, a[1] + d[1] * s * L], off = Math.hypot(p[0] - foot[0], p[1] - foot[1]);
      if (s < FOSS.at[0] || s > FOSS.at[1]) fail('fore tibia tooth at ' + s.toFixed(2) + ' of the tibia (want ' + FOSS.at.join('-') + ')');
      if (off < FOSS.out * tib.wMax) fail('fore tibia tooth stands ' + (off / tib.wMax).toFixed(2) + ' of the tibia width off its axis (want >= ' + FOSS.out + ')');
      if (p[0] < foot[0]) fail('fore tibia tooth on the inner edge');
    }
  },
  // #25: no ocelli on a beetle
  beetleOcelli(meta, svg, fail) {
    if (meta.type !== 'beetle') return;
    colSeen.beetleOcelli++;
    if (meta.head.ocelli.length) fail('beetle draws ocelli: ' + meta.head.ocelli.length + ' (' + meta.fam + ')');
  },
  // #25: the weevil's antenna socket on the rostrum (WEEVIL)
  weevilSocket(meta, svg, fail) {
    if (meta.type !== 'beetle' || meta.fam !== 'weevil') return;
    colSeen.weevilSocket++;
    const h = meta.head, ro = h.rostrum, b = meta.antennae.base;
    if (!ro) return fail('weevil without a rostrum on meta.head');
    const along = (h.top - b[1]) / ro.len;
    if (along < WEEVIL.along[0] || along > WEEVIL.along[1]) fail('weevil antenna socket not on the rostrum: ' + along.toFixed(2) + ' of its length ahead of the head (want ' + WEEVIL.along.join('-') + ')');
    if (Math.abs(Math.abs(b[0]) - ro.w / 2) > WEEVIL.edge) fail('weevil antenna socket off the rostrum side: x ' + b[0].toFixed(1) + ', rostrum half width ' + (ro.w / 2).toFixed(1));
  },
  // #25: a carabid's two sickle mandibles (CARABID)
  carabidMandibles(meta, svg, fail) {
    if (meta.type !== 'beetle' || meta.fam !== 'ground') return;
    colSeen.carabidMandibles++;
    const h = meta.head, M = h.mand, W = h.W;
    if (!Array.isArray(M) || M.length !== 2 || M.some(j => !Array.isArray(j) || j.length < 8)) return fail('carabid without two mandible outlines on meta.head.mand');
    let reach = Infinity;
    for (const j of M) {
      const ys = j.map(p => p[1]), tipY = Math.min(...ys), tip = j[ys.indexOf(tipY)], len = (h.top - tipY) / W;
      reach = Math.min(reach, h.top - tipY);
      if (len < CARABID.len[0] || len > CARABID.len[1]) fail('carabid mandible length: ' + len.toFixed(2) + ' head widths (want ' + CARABID.len.join('-') + ')');
      if (Math.abs(tip[0]) > CARABID.tipX * W) fail('carabid mandible tip off the midline: ' + (Math.abs(tip[0]) / W).toFixed(2) + ' head widths (want <= ' + CARABID.tipX + ')');
      if (Math.max(...j.map(p => Math.abs(p[0]))) < CARABID.baseX * W) fail('carabid mandible base inside ' + CARABID.baseX + ' head widths of the midline');
    }
    // the open space between the jaws at half their reach: the inner edges (the jaw points nearest the midline at that y)
    const y = h.top - reach / 2, inner = M.map(j => { let best = Infinity; for (let i = 0; i < j.length; i++) { const a = j[i], c = j[(i + 1) % j.length]; if ((a[1] - y) * (c[1] - y) <= 0 && a[1] !== c[1]) best = Math.min(best, Math.abs(a[0] + (c[0] - a[0]) * (y - a[1]) / (c[1] - a[1]))); } return best; });
    if (!(Math.min(...inner) * 2 >= CARABID.gap * W)) fail('carabid jaws close into one shape: the gap at half their length ' + (Math.min(...inner) * 2 / W).toFixed(2) + ' head widths (want >= ' + CARABID.gap + ')');
  },
  // #25: a longhorn's antenna, thick, about body length and swept back beside the elytra (LONGHORN)
  longhornAntenna(meta, svg, fail) {
    if (meta.type !== 'beetle' || meta.fam !== 'longhorn') return;
    colSeen.longhornAntenna++;
    const an = meta.antennae, h = meta.head, Y = meta.elytra;
    if (!an || !(an.wTip > 0) || !Y) return fail('no longhorn shaft widths (meta.antennae.wTip) or elytra on meta');
    const pl = an.lines[0].pl; let len = 0;
    for (let i = 1; i < pl.length; i++) len += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
    const bl = meta.abdomen.yBot - h.top, k = len / bl;
    if (k < LONGHORN.len[0] || k > LONGHORN.len[1]) fail('longhorn antenna length: ' + k.toFixed(2) + ' body lengths (want ' + LONGHORN.len.join('-') + ')');
    if (an.wTip * meta.scale < LONGHORN.minPx) fail('longhorn antenna a hairline: ' + (an.wTip * meta.scale).toFixed(2) + ' plate px at its narrowest (want >= ' + LONGHORN.minPx + ')');
    if (an.lines[0].w < LONGHORN.baseW * h.W) fail('longhorn antenna base too thin: ' + (an.lines[0].w / h.W).toFixed(2) + ' head widths (want >= ' + LONGHORN.baseW + ')');
    if (an.pose !== 'swept') fail('longhorn antenna not swept: ' + an.pose);
    if (an.pts.some(p => p[1] < h.top)) fail('longhorn antenna reaches ahead of the head (' + an.pose + ')');
    const ys = Y.outline.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), ehw = Math.max(...Y.outline.map(p => p[0]));
    if (an.tip[1] < y0 || an.tip[1] > y1 + LONGHORN.tipBack * (y1 - y0)) fail('longhorn antenna tip not beside the elytra: ' + ((an.tip[1] - y0) / (y1 - y0)).toFixed(2) + ' of their length');
    if (an.tip[0] > LONGHORN.tipOut * ehw) fail('longhorn antenna tip too far out: ' + (an.tip[0] / ehw).toFixed(2) + ' elytral half widths (want <= ' + LONGHORN.tipOut + ')');
  },
  // #24: the puncture style gene and its marks on the striae (ELY_STYLES), on the default plate and on the device plate
  elytraTexture(meta, svg, fail, { dev }) {
    if (meta.type !== 'beetle') return;
    const G = meta.bodyGenes.elytra, style = G && G.style;
    if (!ELY_STYLES.includes(style)) return fail('no elytral puncture style gene (bodyGenes.elytra.style): ' + style);
    if (!meta.bodySig.split(',').includes('ely' + style[0])) fail('elytral puncture style missing from bodySig');
    elyStyles[style] = (elyStyles[style] || 0) + 1;
    const ptSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const onStria = (p, Y) => Y.striae.some(pl => { for (let i = 0; i + 1 < pl.length; i++) if (ptSeg(p, pl[i], pl[i + 1]) <= ELY_ON) return true; return false; });
    for (const [m, what] of [[meta, ''], [dev.meta, 'device plate: ']]) {
      const Y = m.elytra;
      if (!Y || Y.style !== style) { fail(what + 'meta.elytra.style is not the gene: ' + (Y && Y.style)); continue; }
      const dashes = Y.dashes || [];
      const lined = ELY_LINES.includes(style);
      if (lined && (Y.dots.length || dashes.length)) fail(what + style + ' elytra with punctures or dashes');
      if (!lined && Y.lines) fail(what + style + ' striae drawn as lines too');
      if (lined && !Y.lines) fail(what + style + ' striae not drawn as lines');
      if (style === 'costate' && (Y.weight !== 'D' || Y.striae.length < 2 || Y.striae.length > ELY_COSTAE)) fail(what + 'costate elytra with ' + Y.striae.length + ' costae drawn at weight ' + Y.weight);
      if (style !== 'costate' && Y.weight !== 'F') fail(what + style + ' striae drawn at weight ' + Y.weight);
      if (style === 'glabrous' && Y.striae.length !== 1) fail(what + 'glabrous elytra with ' + Y.striae.length + ' striae (want the sutural stria alone)');
      if (style === 'punctate' && (Y.dots.length < Y.striae.length * 3 || dashes.length)) fail(what + 'punctate striae with ' + Y.dots.length + ' punctures on ' + Y.striae.length + ' striae, ' + dashes.length + ' dashes');
      if (style === 'tubercle') {
        if (Y.dots.length < Y.striae.length * 2 || dashes.length || !(Y.dotR >= ELY_TUB_R)) fail(what + 'tubercle rows with ' + Y.dots.length + ' tubercles of radius ' + Y.dotR + ' on ' + Y.striae.length + ' striae');
        for (let i = 1; i < Y.dots.length; i++) if (Y.dotStria[i] === Y.dotStria[i - 1] && (Math.hypot(Y.dots[i][0] - Y.dots[i - 1][0], Y.dots[i][1] - Y.dots[i - 1][1]) - 2 * Y.dotR) * m.scale < ELY_PITCH - 1e-6) { fail(what + 'tubercles closer than ' + ELY_PITCH + ' px along a row'); break; }
      } else if (style === 'punctate' && Y.dotR >= ELY_TUB_R) fail(what + 'punctures as large as tubercles');
      if (style === 'dashed' && (dashes.length < Y.striae.length * 2 || Y.dots.length)) fail(what + 'dashed striae with ' + dashes.length + ' dashes on ' + Y.striae.length + ' striae, ' + Y.dots.length + ' punctures');
      if (Y.dots.some(c => !onStria(c, Y))) fail(what + 'a puncture off the striae');
      if (dashes.some(d => !d.pts.every(p => onStria(p, Y)))) fail(what + 'a dash off the striae');
      for (let i = 1; i < dashes.length; i++) {   // consecutive dashes of one stria: the gap between them
        const a = dashes[i - 1].pts, b = dashes[i].pts;
        if (dashes[i - 1].stria === dashes[i].stria && Math.hypot(b[0][0] - a[a.length - 1][0], b[0][1] - a[a.length - 1][1]) * m.scale < ELY_PITCH - 1e-6) fail(what + 'dashes closer than ' + ELY_PITCH + ' px along a stria');
      }
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
        Y.striae.forEach((pl, k) => { if (!Y.dotStria || Y.dotStria[i] !== k) near(toPl(c, pl), 'puncture / stria ' + k); });   // a punctate stria's punctures lie on it (#24)
        for (let j = i + 1; j < Y.dots.length; j++) near(Math.hypot(c[0] - Y.dots[j][0], c[1] - Y.dots[j][1]), 'puncture / puncture');
      });
      if (!what && worst < elyRun.worst) { elyRun.worst = worst; elyRun.seed = seed; elyRun.at = at; }
      if (worst < ELY_PITCH - 1e-6) fail(what + 'elytral marks closer than ' + ELY_PITCH + ' px: ' + worst.toFixed(2) + ' px (' + at + ')');
    }
  },
  // #13, #67: no lepidopteran wing window reaches LEP_INK_MAX ink at 600 px, whatever made it (darks keep their tone by hatch
  // pitch, not by stacking a second full family; the hatch keeps off the line art and the other wing; the fringe keeps off
  // the other wing, the costa and the tail; the veins go through the lane floor with the costa as a wall; cross-line teeth
  // keep out of narrow cells; band edges and cross-lines stop short of the costa and the veins; spot rings keep apart).
  // Every lep plate is rasterised twice (sharp, ~60 ms), not a sample, so a blotch on any seed fails the gate.
  async lepInk(meta, svg, fail, { seed }) {
    lepRun++;
    if (meta.type !== 'moth') return;
    if (!meta.lepInkSvg || !meta.lepArtSvg) return fail('no wing rasters (meta.lepInkSvg / lepArtSvg) on a lepidopteran plate');
    const ink = await inkWindows(meta.lepInkSvg), art = (await inkWindows(meta.lepArtSvg)).win;
    let at = 0;
    ink.win.forEach((v, i) => { if (v > ink.win[at]) at = i; });
    const v = ink.win[at], o = lepInk[meta.variant] ||= { n: 0, max: 0, seed: 0, art: 0 };
    o.n++; if (v > o.max) { o.max = v; o.seed = seed; o.art = art[at]; }
    const c = LEP_WIN >> 1;
    if (v >= LEP_INK_MAX) fail('lep wing solid at 1 bit: a ' + LEP_WIN + 'x' + LEP_WIN + ' window at ' + v.toFixed(3) + ' ink (max ' + LEP_INK_MAX + '), ' + art[at].toFixed(3) + ' of it line art and ' + (v - art[at]).toFixed(3) + ' tone, centred at ' + (at % ink.w + c) + ',' + (Math.floor(at / ink.w) + c) + ' px');
  },
  // #73 the odonate wing pigment adds no solid block to the 1-bit wings (ODO_SOLID above); every pigmented plate's device
  // plate is rasterised twice
  async odoInk(meta, svg, fail, { seed, dev }) {
    if (meta.type !== 'dragonfly' && meta.type !== 'damselfly') return;
    if (!meta.odoPig || !meta.odoPig.hatch.some(h => h.segs.length)) return;
    const m = dev.meta;
    if (!m.odoInkSvg || !m.odoArtSvg) return fail('no wing rasters (meta.odoInkSvg / odoArtSvg) on a pigmented odonate device plate');
    const ink = await solidBlocks(m.odoInkSvg), art = await solidBlocks(m.odoArtSvg), near = new Set();
    for (const [x, y] of art) for (let dy = -ODO_SOLID; dy <= ODO_SOLID; dy++) for (let dx = -ODO_SOLID; dx <= ODO_SOLID; dx++) near.add((x + dx) + ',' + (y + dy));
    const fresh = ink.filter(([x, y]) => !near.has(x + ',' + y));
    odoInkRun.n++;
    if (fresh.length > odoInkRun.worst) { odoInkRun.worst = fresh.length; odoInkRun.seed = seed; }
    if (fresh.length) fail('odonate wing pigment solid at 1 bit: ' + fresh.length + ' new ' + ODO_SOLID + 'x' + ODO_SOLID + ' black blocks, the first at ' + fresh[0].join(',') + ' device px');
  },
  // the common name never repeats a stem (#29): no two of its words equal ignoring case, nor one the start of another
  // when the shorter has 4+ letters ("Dark Darkling", "Blue-tailed Bluet"); tests/names.js repeatedStem
  nameStems(meta, svg, fail) {
    const r = repeatedStem(meta.name.common);
    if (r) fail('common name repeats a stem: "' + meta.name.common + '" (' + r.join(' / ') + ')');
  },
  // the common name's noun is the drawn family's (#28): a table with family nouns gives the plate one of meta.fam's and
  // none of another family's (an ichneumonid is never a "Gall Wasp", a papilionid never a "Brown")
  nameFamily(meta, svg, fail) {
    const fn = namesTable(meta.type, meta.variant).common.famNouns;
    if (!fn || !meta.fam) return;
    if (!fn[meta.fam]) return fail('names table has no family nouns for the drawn ' + meta.fam);
    const common = meta.name.common;
    if (!fn[meta.fam].some(n => hasPhrase(common, n))) fail('common name has no ' + meta.fam + ' noun: "' + common + '"');
    for (const fam in fn) if (fam !== meta.fam) for (const n of fn[fam]) if (hasPhrase(common, n)) fail('common name carries the ' + fam + ' noun ' + n + ' on a ' + meta.fam + ': "' + common + '"');
  },
  // the common name agrees with the body genes (#28): no marking or antenna word the plate does not draw, and a gene word
  // whenever the plate has one to give (tests/names.js geneProblems: a marking other than plain, a rare antenna kind)
  nameGenes(meta, svg, fail) {
    commons.push(meta.name.common);
    for (const p of geneProblems(meta.name.common, meta.bodyGenes.abd.mark, meta.antenna, antRare(E.ORDERS, meta.type, meta.bodyGenes.fam, meta.antenna), pigmentWords(wingKinds(meta))))
      fail('common name disagrees with the genes: ' + p + ' ("' + meta.name.common + '")');
  },
  // the common name agrees with the drawn wing (#82): no wing pattern word (tests/names.js WING_CLAIMS) the plate does not
  // draw, unless its names table leaves the word free (WING_UNDRAWN); colour words claim nothing. Tallies the pigment share.
  nameWings(meta, svg, fail) {
    const kinds = wingKinds(meta), common = meta.name.common;
    for (const p of wingProblems(common, tableKey(E.ORDERS, meta.type, meta.variant), kinds)) fail('common name claims an undrawn wing: ' + p + ' ("' + common + '")');
    if (kinds.length) { pigNames.n++; if (namesPigment(common, kinds)) pigNames.named++; }
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
  // #82 (b): pigmented odonates name their pigment on at least PIG_WORD_MIN of their plates
  nameWings(fail) {
    if (!pigNames.n) return;
    const share = pigNames.named / pigNames.n;
    if (share < PIG_WORD_MIN) fail('pigmented odonates named for their wing: ' + pigNames.named + ' of ' + pigNames.n + ' (' + (share * 100).toFixed(1) + '%, min ' + PIG_WORD_MIN * 100 + '%)');
    console.log('odonate pigment words: ' + pigNames.named + ' of ' + pigNames.n + ' pigmented plates (' + (share * 100).toFixed(1) + '%)');
  },
  // duplicate common names (#28): under DUP_MAX of the run's plates share a common name with an earlier plate
  nameGenes(fail) {
    const share = duplicateShare(commons);
    if (share >= DUP_MAX) fail('common names repeat: ' + (share * 100).toFixed(1) + '% of ' + commons.length + ' plates share an earlier plate\'s name (max ' + DUP_MAX * 100 + '%)');
    console.log('common names: ' + new Set(commons).size + ' distinct in ' + commons.length + ' plates (' + (share * 100).toFixed(1) + '% repeat)');
  },
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
  // odoHabitus over the run: once it has ODO_MIN odonate plates, every family, both leg poses (each on ODO_HAB.poseShare of
  // the plates) and every dorsal pattern family must have been drawn, so a family that never rolls cannot pass by silence
  odoHabitus(fail) {
    const n = odoHab.plates, fams = [...ODO_FAMS.dragonfly, ...ODO_FAMS.damselfly];
    console.log('odonate habitus over ' + n + ' plates: ' + fams.map(f => f + ' ' + (odoHab.fam[f] || 0)).join(', ') + '; poses ' + JSON.stringify(odoHab.pose) + '; patterns ' + JSON.stringify(odoHab.mark));
    if (n < ODO_MIN) return console.log('  too few odonate plates (' + n + ' < ' + ODO_MIN + ') to require every family, pose and pattern');
    const missing = fams.filter(f => !odoHab.fam[f]).concat(ODO_PATTERNS.filter(m => !odoHab.mark[m]));
    if (missing.length) fail('odonate families / patterns never drawn in ' + n + ' plates: ' + missing.join(', '));
    for (const p of ['basket', 'tucked']) if ((odoHab.pose[p] || 0) < ODO_HAB.poseShare * n) fail('odonate leg pose ' + p + ' on ' + (odoHab.pose[p] || 0) + ' of ' + n + ' plates (min ' + ODO_HAB.poseShare * 100 + '%)');
  },
  // the report for CHECKS.odoInk: pigmented odonate device plates rasterised and the most solid blocks the pigment added
  odoInk() {
    console.log('odonate pigment at 1 bit: ' + odoInkRun.n + ' pigmented device plates, most new solid ' + ODO_SOLID + 'x' + ODO_SOLID + ' blocks ' + odoInkRun.worst + (odoInkRun.worst ? ' (seed ' + odoInkRun.seed + ')' : ''));
  },
  // odoRest over the run: once it has ODO_MIN damselflies, the closed pose's share and every family that closes
  odoRest(fail) {
    const n = odoRestRun.plates, sh = n ? odoRestRun.closed / n : 0;
    console.log('damselfly resting pose: closed on ' + odoRestRun.closed + ' of ' + n + ' plates ' + JSON.stringify(odoRestRun.fams));
    if (n < ODO_MIN) return;
    if (sh < ODO_REST.share[0] || sh > ODO_REST.share[1]) fail('damselfly closed resting pose on ' + Math.round(sh * 100) + '% of plates (want ' + ODO_REST.share.map(v => v * 100).join('-') + '%)');
    const missing = ODO_REST.fams.filter(f => !odoRestRun.fams[f]);
    if (missing.length) fail('no closed resting pose in ' + n + ' damselflies for ' + missing.join(', '));
  },
  // odoPigment over the run: once a suborder has ODO_PIG.min plates, every pigment kind its families carry has been drawn
  odoPigment(fail) {
    console.log('odonate wing pigment: ' + ['dragonfly', 'damselfly'].map(t => t + ' ' + (odoPigRun.plates[t] || 0) + ' plates, clear ' + (odoPigRun.clear[t] || 0) + ', ' + JSON.stringify(odoPigRun.kinds[t] || {})).join('; ') +
      '; closest hatch lines ' + (odoPigRun.pitch === Infinity ? 'none' : odoPigRun.pitch.toFixed(2) + ' px (seed ' + odoPigRun.seed + ')'));
    for (const [t, fams] of Object.entries(ODO_FAMS)) {
      const n = odoPigRun.plates[t] || 0, want = [...new Set(fams.flatMap(f => ODO_PIG.kinds[f]))], missing = want.filter(k => !(odoPigRun.kinds[t] || {})[k]);
      if (n >= ODO_PIG.min && missing.length) fail(t + ' wing pigment never drawn in ' + n + ' plates: ' + missing.join(', '));
    }
  },
  // the report for CHECKS.lepInk: plates rasterised per variant and the darkest window seen (with its line-art share); a run
  // long enough to hold both variants fails without one (never by silence)
  lepInk(fail) {
    const total = Object.values(lepInk).reduce((a, o) => a + o.n, 0), missing = ['moth', 'butterfly'].filter(v => !lepInk[v]);
    if (missing.length && total >= LEP_MIN) fail('no ' + missing.join(' / ') + ' plate in ' + total + ' lepidopteran plates: the lepInk gate never ran on it');
    if (!total && lepRun >= 1000) fail('no lepidopteran plate in ' + lepRun + ' plates: the lepInk gate never ran');
    console.log('lep wing ink (darkest ' + LEP_WIN + 'x' + LEP_WIN + ' window, max ' + LEP_INK_MAX + '):',
      ['moth', 'butterfly'].map(v => lepInk[v] ? v + ' ' + lepInk[v].max.toFixed(3) + ' (seed ' + lepInk[v].seed + ', line art ' + lepInk[v].art.toFixed(3) + ', n ' + lepInk[v].n + ')' : v + ' none').join('; ') +
      (missing.length && total < LEP_MIN ? '; too few lepidopteran plates (' + total + ' < ' + LEP_MIN + ') to require ' + missing.join(', ') : ''));
  },
  // the report for CHECKS.legWings (#8): per type, the share of plates whose leg pose re-rolled against the body, whose
  // rolled pose broke against the wings and was repaired (no rng), and where a pair had to be placed before the others
  legWings() {
    const pc = (k, n) => Math.round(100 * k / n) + '%';
    console.log('legs (body re-roll / wing repair / pair placed first, of n):', Object.keys(legRun).map(t => { const o = legRun[t]; return t + ' ' + pc(o.reroll, o.n) + '/' + pc(o.repaired, o.n) + '/' + pc(o.placed, o.n) + ' n ' + o.n; }).join('; '));
  },
  // the report for CHECKS.abdPitch: plates per type and the closest pair of abdominal marks seen
  abdPitch() {
    console.log('abdomen pitch (closest pair of abdominal marks, px; floor ' + ABD_PITCH + '):', Object.keys(abdRun).map(t => t + ' ' + (abdRun[t].worst === Infinity ? 'none' : abdRun[t].worst.toFixed(2) + ' (seed ' + abdRun[t].seed + ', ' + abdRun[t].at + ')') + ' n ' + abdRun[t].n).join('; '));
  },
  // the report for CHECKS.roveBody: a run with ELY_STYLE_MIN beetle plates must hold a rove (1/6 of the family roll)
  roveBody(fail) {
    const n = beetlePlates;
    if (!roveSeen && n >= ELY_STYLE_MIN) fail('no rove beetle in ' + n + ' beetle plates: roveBody never ran', 'beetle');
    console.log('rove beetle plates asserted on:', roveSeen, 'of', n, 'beetle plates' + (n < ELY_STYLE_MIN ? '; too few beetle plates (' + n + ' < ' + ELY_STYLE_MIN + ') to require one' : ''));
  },
  // the report for CHECKS.elytraTexture: beetle plates per puncture style; a run with ELY_STYLE_MIN beetles holds each style's share
  elytraTexture(fail) {
    const n = Object.values(elyStyles).reduce((a, b) => a + b, 0);
    if (n >= ELY_STYLE_MIN) for (const st of ELY_STYLES) if ((elyStyles[st] || 0) < n * ELY_STYLE_SHARE) fail('elytral style ' + st + ' on ' + (elyStyles[st] || 0) + ' of ' + n + ' beetle plates (min ' + ELY_STYLE_SHARE * 100 + '%)', 'beetle');
    console.log('elytral puncture styles (beetle plates):', ELY_STYLES.map(st => st + ' ' + (elyStyles[st] || 0)).join(', ') + (n < ELY_STYLE_MIN ? '; too few beetle plates (' + n + ' < ' + ELY_STYLE_MIN + ') to require each style' : ''));
  },
  // the report for CHECKS.beetleProportions: the ranges seen
  beetleProportions() {
    const f = r => r[0] === Infinity ? 'none' : r[0].toFixed(2) + '-' + r[1].toFixed(2);
    console.log('beetle pronotum (w/l, pronotum/elytra width; research ' + BEETLE.pronWL.join('-') + ', ' + BEETLE.pronEly.join('-') + '):', f(beetleRun.wl) + ', ' + f(beetleRun.pe), 'n ' + beetleRun.n);
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
  // #65 the report for CHECKS.beeBasket: once the run has BEE_MIN bee plates, at least BEE_BASKET.share of them show the
  // corbicula (BEE_BASKET.vis of the hind tibia outside the wings and the body)
  beeBasket(fail) {
    const { n, shown } = basketRun;
    if (n >= BEE_MIN && shown < n * BEE_BASKET.share) fail('bee corbicula shown on ' + shown + ' of ' + n + ' bee plates (want >= ' + Math.round(BEE_BASKET.share * 100) + '%); hidden e.g. ' + basketRun.worst.slice(0, 6).join(', '), 'bee');
    console.log('#65 bee corbicula shown (>= ' + BEE_BASKET.vis + ' of the hind tibia clear of the wings and body, behind a wing):', shown, 'of', n, 'bee plates' +
      (n < BEE_MIN ? '; too few bee plates (' + n + ' < ' + BEE_MIN + ') to require the share' : '') + (basketRun.worst.length ? '; hidden e.g. ' + basketRun.worst.slice(0, 6).join(', ') : ''));
  },
  // #83 the report for BEE_TIME: every bee plate over k times the median non-bee plate is re-timed here against the
  // non-bee plates nearest that median (best of `tries` each, back to back), and fails when it is still over the bound
  beeTime(fail) {
    const other = plateMs.other.map(r => r[1]);
    if (!plateMs.bee.length || other.length < BEE_TIME.minOther) { console.log('#83 bee plate time: too few plates to time (' + plateMs.bee.length + ' bee, ' + other.length + ' non-bee)'); return; }
    const med = median(other), over = plateMs.bee.filter(r => r[1] > BEE_TIME.k * med);
    if (over.length) {
      const retime = (seed, opts) => { let m = Infinity; for (let t = 0; t < BEE_TIME.tries; t++) { const t0 = process.hrtime.bigint(); E.generateInsectDetailed(seed, opts); m = Math.min(m, Number(process.hrtime.bigint() - t0) / 1e6); } return m; };
      const ref = median(plateMs.other.slice().sort((a, b) => Math.abs(a[1] - med) - Math.abs(b[1] - med) || a[0] - b[0]).slice(0, BEE_TIME.ref).map(r => retime(r[0])));
      const slow = over.map(r => [r[0], retime(r[0])]).filter(r => r[1] > BEE_TIME.k * ref);
      if (slow.length) fail(slow.length + ' bee plate(s) take over ' + BEE_TIME.k + 'x the median non-bee plate (' + ref.toFixed(0) + ' ms): ' + slow.sort((a, b) => b[1] - a[1]).slice(0, 6).map(r => r[0] + ' (' + (r[1] / ref).toFixed(1) + 'x)').join(', '), 'bee');
    }
    console.log('#83 bee plate time: ' + plateMs.bee.length + ' bee plates against the median of ' + other.length + ' non-bee plates (bound ' + BEE_TIME.k + 'x)');
  },
  // the #19 checks assert only on lacewing plates: once the run has NEU_MIN of them every selected one must have run
  neuSeen(fail) {
    const n = neuSeenPlates, idle = Object.keys(neuSeen).filter(k => ran.has(k) && !neuSeen[k]);
    if (idle.length && n >= NEU_MIN) fail('#19 lacewing checks that never ran in ' + n + ' lacewing plates: ' + idle.join(', '));
    console.log('#19 lacewing checks asserted on (of ' + n + ' lacewing plates):', Object.keys(neuSeen).filter(k => ran.has(k)).map(k => k + ' ' + neuSeen[k]).join(', ') +
      (n < NEU_MIN ? '; too few lacewing plates (' + n + ' < ' + NEU_MIN + ') to require every check' : ''));
  },
  // #51 every Neuroptera family is drawn once the run has NEU_FAMS.famsAll lacewing plates
  neuFamilies(fail) {
    const n = Object.values(neuFamRun).reduce((a, b) => a + b, 0), missing = NEU_FAMS.fams.filter(f => !neuFamRun[f]);
    if (n >= NEU_FAMS.famsAll && missing.length) fail('lacewing families never drawn in ' + n + ' lacewing plates: ' + missing.join(', '), 'lacewing');
    console.log('#51 lacewing families:', JSON.stringify(neuFamRun));
  },
  // the #22 checks assert only on grasshopper plates: once the run has ORTH_MIN of them every selected one must have run
  orthSeen(fail) {
    const n = orthSeenPlates, idle = Object.keys(orthSeen).filter(k => ran.has(k) && !orthSeen[k]);
    if (idle.length && n >= ORTH_MIN) fail('#22 grasshopper checks that never ran in ' + n + ' grasshopper plates: ' + idle.join(', '));
    console.log('#22 grasshopper checks asserted on (of ' + n + ' grasshopper plates):', Object.keys(orthSeen).filter(k => ran.has(k)).map(k => k + ' ' + orthSeen[k]).join(', ') +
      (n < ORTH_MIN ? '; too few grasshopper plates (' + n + ' < ' + ORTH_MIN + ') to require every check' : ''));
  },
  // #72 the run's grasshoppers: every tegmen class on ORTH72.share.cls of them, the open set on .open of the macropterous
  // acridids and the along pose on .along of them, once the run has ORTH72.shareMin
  orthShares(fail) {
    const n = orth72Run.n || Object.values(orth72Run.hind).reduce((a, b) => a + b, 0);
    if (!n) return;
    const enough = n >= ORTH72.shareMin, tot = c => Object.values(c).reduce((a, b) => a + b, 0);
    if (enough && orth72Run.n) { const thin = Object.keys(ORTH72.cls).filter(k => (orth72Run.cls[k] || 0) < ORTH72.share.cls * orth72Run.n); if (thin.length) fail('grasshopper tegmen classes under their share: ' + thin.join(', ') + ' ' + JSON.stringify(orth72Run.cls), 'grasshopper'); }
    if (enough && tot(orth72Run.sets) && (orth72Run.sets.open || 0) < ORTH72.share.open * tot(orth72Run.sets)) fail('open wing set on too few macropterous acridids ' + JSON.stringify(orth72Run.sets), 'grasshopper');
    if (enough && tot(orth72Run.hind) && (orth72Run.hind.along || 0) < ORTH72.share.along * tot(orth72Run.hind)) fail('along hind-leg pose on too few grasshoppers ' + JSON.stringify(orth72Run.hind), 'grasshopper');
    console.log('#72 grasshopper (n ' + n + (enough ? '' : ', too few to assert, < ' + ORTH72.shareMin) + '): tegmen classes ' + JSON.stringify(orth72Run.cls) + ', macropterous acridid sets ' + JSON.stringify(orth72Run.sets) + ', hind legs ' + JSON.stringify(orth72Run.hind));
  },
  // the #25 checks assert only on beetle plates (three of them on one family each): once the run has COL_MIN beetle plates
  // every selected one must have run
  colSeen(fail) {
    const n = beetlePlates, idle = Object.keys(colSeen).filter(k => ran.has(k) && !colSeen[k]);
    if (idle.length && n >= COL_MIN) fail('#25 beetle checks that never ran in ' + n + ' beetle plates: ' + idle.join(', '), 'beetle');
    console.log('#25 beetle checks asserted on (of ' + n + ' beetle plates):', Object.keys(colSeen).filter(k => ran.has(k)).map(k => k + ' ' + colSeen[k]).join(', ') +
      (n < COL_MIN ? '; too few beetle plates (' + n + ' < ' + COL_MIN + ') to require every check' : ''));
  },
  // the #27 head checks each assert on one order's plates: every selected one must have run on some plate
  headSeen(fail) {
    const idle = Object.keys(headSeen).filter(k => ran.has(k) && !headSeen[k]);
    if (idle.length) fail('#27 head checks that never ran: ' + idle.join(', '));
    console.log('#27 head checks asserted on:', Object.keys(headSeen).filter(k => ran.has(k)).map(k => k + ' ' + headSeen[k]).join(', '));
  },
  // #53 the run's beetles: once it has COL_MIN beetle plates every family of COL_FAMS has been drawn
  colGenes(fail) {
    const n = beetlePlates, fmt = o => Object.keys(o).sort().map(k => k + ' ' + o[k]).join(', ');
    if (n >= COL_MIN && ran.has('colFamily')) for (const f of COL_FAMS) if (!colFams[f]) fail('beetle family ' + f + ' never drawn in ' + n + ' beetle plates', 'beetle');
    // every value of a gene a selected check tallies is drawn on at least COL_SHARE of the beetle plates that roll the gene
    for (const g in colTally) { const T = colTally[g], tot = Object.values(T).reduce((a, b) => a + b, 0);
      if (n >= COL_MIN && tot >= COL_GENE_MIN) for (const v of COL_VALUES[g]) if ((T[v] || 0) < COL_SHARE * tot) fail('beetle ' + g + ' ' + v + ' on ' + (T[v] || 0) + ' of ' + tot + ' plates (min ' + COL_SHARE * 100 + '%)', 'beetle');
      console.log('#53 beetle ' + g + ':', fmt(T)); }
    console.log('#53 beetle families (of ' + n + ' beetle plates):', fmt(colFams) + (n < COL_MIN ? '; too few beetle plates (' + n + ' < ' + COL_MIN + ') to require each' : ''));
  },
  // #47 the run's swept-antenna beetle and grasshopper plates: none under SWEPT_SCALE, and their mean plate scale (reported)
  sweptReport(fail) {
    for (const t in sweptRun) if (sweptRun[t].under) fail(sweptRun[t].under + ' swept-antenna ' + t + ' plates under scale ' + SWEPT_SCALE, t);
    console.log('#47 swept-antenna plates:', Object.keys(sweptRun).sort().map(t => t + ' ' + sweptRun[t].n + ' (mean scale ' + (sweptRun[t].scales.reduce((a, b) => a + b, 0) / sweptRun[t].n).toFixed(3) + ')').join(', ') || 'none');
  },
  // #26 the run's cicadas: the median plate scale at least CIC.scale (0.81 before #26), once the run has CIC_MIN of them
  cicScale(fail) {
    const n = cicRun.scales.length, m = median(cicRun.scales);
    if (n >= CIC_MIN && !(m >= CIC.scale)) fail('cicada median plate scale ' + m.toFixed(3) + ' under ' + CIC.scale + ' (' + n + ' plates)', 'cicada');
    console.log('#26 cicada median scale:', n ? m.toFixed(3) : '-', '(n ' + n + (n < CIC_MIN ? '; too few to assert, < ' + CIC_MIN : '') + ')');
  },
  // #26 the foreleg pose varies: at least two of the fore tibia's direction classes each on CIC.poseShare of the cicada plates
  cicForeleg(fail) {
    const t = cicRun.tibia, n = t.forward + t.out + t.back, held = Object.keys(t).filter(k => t[k] >= CIC.poseShare * n);
    if (n >= CIC_MIN && held.length < 2) fail('cicada fore tibia held one way: ' + JSON.stringify(t) + ' (want two classes on ' + CIC.poseShare + ' of the plates)', 'cicada');
    console.log('#26 cicada fore tibia classes:', JSON.stringify(t));
  },
  // #49 the run's cicadas: every wing set, forewing shape, family and marking on at least CIC_SET.share of them, once
  // the run has CIC_SET.shareMin
  cicShares(fail) {
    for (const [what, counts, kinds] of [['wing sets', cicSet.sets, Object.keys(CIC_SET.sweep)], ['forewing shapes', cicSet.shapes, Object.keys(CIC_SHAPE)], ['families', cicSet.fams, CIC_HAB.fams], ['mesonotum markings', cicSet.marks, CIC_MARKS.kinds]]) {
      const n = Object.values(counts).reduce((a, b) => a + b, 0);
      if (!n) continue;   // its check was not selected
      const thin = kinds.filter(k => (counts[k] || 0) < CIC_SET.share * n);
      if (n >= CIC_SET.shareMin && thin.length) fail('cicada ' + what + ' under ' + CIC_SET.share + ' of the plates: ' + thin.join(', ') + ' ' + JSON.stringify(counts), 'cicada');
      console.log('#49 cicada ' + what + ':', JSON.stringify(counts) + (n < CIC_SET.shareMin ? ' (too few to assert, < ' + CIC_SET.shareMin + ')' : ''));
    }
  },
  // #52 every lepidopteran wing set on at least LEP_SET.share of the run's moths and of its butterflies, and the families that
  // rest in a delta drawing it on at least LEP_SET.deltaFam of their plates (a run too short is reported, never passed by silence)
  lepShares(fail) {
    for (const v of Object.keys(lepSet.sets)) {   // the wing sets
      const counts = lepSet.sets[v], n = Object.values(counts).reduce((a, b) => a + b, 0);
      const thin = Object.keys(LEP_SET.margin).filter(k => (counts[k] || 0) < LEP_SET.share * n);
      if (n >= LEP_SET.shareMin && thin.length) fail(v + ' wing sets under ' + LEP_SET.share + ' of the plates: ' + thin.join(', ') + ' ' + JSON.stringify(counts), v);
      console.log('#52 ' + v + ' wing sets:', JSON.stringify(counts) + (n < LEP_SET.shareMin ? ' (too few to assert, < ' + LEP_SET.shareMin + ')' : ''));
    }
    { const counts = lepSet.poses, n = Object.values(counts).reduce((a, b) => a + b, 0), thin = LEP_LEGS.poses.filter(k => (counts[k] || 0) < LEP_LEGS.share * n);
      if (n && n >= LEP_LEGS.shareMin && thin.length) fail('moth leg poses under ' + LEP_LEGS.share + ' of the plates: ' + thin.join(', ') + ' ' + JSON.stringify(counts), 'moth');
      const [bn, bk] = lepSet.brushMid;
      if (bn >= 20 && bk < LEP_LEGS.brushMid * bn) fail('nymphalid mid (walking) legs show on ' + bk + ' of ' + bn + ' plates (want >= ' + LEP_LEGS.brushMid + ')', 'butterfly');
      if (bn) console.log('#52 nymphalid mid legs showing:', bk + ' of ' + bn);
      const [hn, hk] = lepSet.hidden;
      if (hn >= 20 && hk < LEP_LEGS.hiddenShare * hn) fail('lepidopteran hidden poses hide ' + LEP_LEGS.hiddenPairs + ' pairs on ' + hk + ' of ' + hn + ' plates (want >= ' + LEP_LEGS.hiddenShare + ')', 'moth');
      if (hn) console.log('#52 hidden leg poses with ' + LEP_LEGS.hiddenPairs + ' pairs hidden:', hk + ' of ' + hn);
      if (n) console.log('#52 moth leg poses:', JSON.stringify(counts) + (n < LEP_LEGS.shareMin ? ' (too few to assert, < ' + LEP_LEGS.shareMin + ')' : '')); }
    { const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], C = lepSet.cov;
      if (Object.values(C).every(a => a.length >= LEP_SET.coveredMin) && !(med(C.delta) > med(C.square) && med(C.square) > med(C.forward)))
        fail('lepidopteran hindwing overlap does not follow the set: median share under the forewing delta ' + med(C.delta).toFixed(2) + ', square ' + med(C.square).toFixed(2) + ', forward ' + med(C.forward).toFixed(2), 'moth');
      if (C.square.length) console.log('#52 hindwing share under the forewing (median):', Object.keys(C).map(k => k + ' ' + (C[k].length ? med(C[k]).toFixed(2) : '-')).join(', ')); }
    for (const f of LEP_SET.deltaFams) {
      const F = lepSet.fams[f];
      if (F && F.n >= 20 && F.delta < LEP_SET.deltaFam * F.n) fail(f + ' rests in a delta on ' + F.delta + ' of ' + F.n + ' plates (want >= ' + LEP_SET.deltaFam + ')', 'moth');
    }
  },
  // #54 every fly wing set and every family on at least DIP_SET.share of the run's fly plates (a run too short to hold the
  // share is reported, never passed by silence)
  dipShares(fail) {
    for (const [what, counts, kinds] of [['wing sets', dipSet.sets, Object.keys(DIP_SET.theta)], ['families', dipSet.fams, DIP_HAB.fams]]) {
      const n = Object.values(counts).reduce((a, b) => a + b, 0);
      if (!n) continue;   // its check was not selected
      const thin = kinds.filter(k => (counts[k] || 0) < (what === 'families' ? DIP_HAB.share : DIP_SET.share) * n);
      if (n >= DIP_SET.shareMin && thin.length) fail('fly ' + what + ' under their share of the plates: ' + thin.join(', ') + ' ' + JSON.stringify(counts), 'fly');
      console.log('#54 fly ' + what + ':', JSON.stringify(counts) + (n < DIP_SET.shareMin ? ' (too few to assert, < ' + DIP_SET.shareMin + ')' : ''));
    }
  },
  // #55 the run's crane flies (CRANE): pose families, families and wing sets on their shares, the limoniid smaller with
  // shorter legs than the tipulid; a run with too few crane flies reports the counts, never passes them by silence
  craneShares(fail) {
    const n = Object.values(craneRun.poses).reduce((a, b) => a + b, 0) || Object.values(craneRun.fams).reduce((a, b) => a + b, 0) || Object.values(craneRun.sets).reduce((a, b) => a + b, 0);
    if (!n) return;   // none of its checks was selected
    const enough = n >= CRANE.shareMin, share = c => Object.values(c).reduce((a, b) => a + b, 0);
    if (share(craneRun.poses)) {
      const big = CRANE.poses.filter(k => (craneRun.poses[k] || 0) >= CRANE.poseShare * share(craneRun.poses));
      if (enough && big.length < CRANE.posesMin) fail('crane fly leg poses: only ' + big.length + ' families on ' + CRANE.poseShare * 100 + '% of the plates (want ' + CRANE.posesMin + ') ' + JSON.stringify(craneRun.poses), 'cranefly');
    }
    for (const [what, counts, kinds, min] of [['families', craneRun.fams, CRANE.fams, CRANE.famShare], ['wing sets', craneRun.sets, Object.keys(CRANE.sets), CRANE.setShare]]) {
      const m = share(counts);
      if (!m) continue;
      const thin = kinds.filter(k => (counts[k] || 0) < min * m);
      if (enough && thin.length) fail('crane fly ' + what + ' under their share of the plates: ' + thin.join(', ') + ' ' + JSON.stringify(counts), 'cranefly');
    }
    for (const fam of CRANE.punctate) {   // a punctate family draws both plain and spotted wings
      const v = craneRun.punct[fam] || [], k = v.filter(Boolean).length;
      if (v.length >= CRANE.shareMin * CRANE.famShare && (k < CRANE.punctShare * v.length || k > (1 - CRANE.punctShare) * v.length)) fail(fam + ' wings punctate on ' + k + ' of ' + v.length + ' plates (want both plain and punctate, each ' + CRANE.punctShare * 100 + '%+)', 'cranefly');
    }
    const B = craneRun.body, Lg = craneRun.leg;
    if (enough && B.limoniid && B.tipulid) {
      if (median(B.limoniid) > CRANE.limSmall * median(B.tipulid)) fail('limoniid median body ' + median(B.limoniid).toFixed(0) + ' not under ' + CRANE.limSmall + ' of the tipulid\'s ' + median(B.tipulid).toFixed(0), 'cranefly');
      if (median(Lg.limoniid) > CRANE.limLeg * median(Lg.tipulid)) fail('limoniid median leg / body ' + median(Lg.limoniid).toFixed(2) + ' not under ' + CRANE.limLeg + ' of the tipulid\'s ' + median(Lg.tipulid).toFixed(2), 'cranefly');
    }
    console.log('#55 crane fly (n ' + n + (enough ? '' : ', too few to assert, < ' + CRANE.shareMin) + '): poses ' + JSON.stringify(craneRun.poses) + ', families ' + JSON.stringify(craneRun.fams) + ', wing sets ' + JSON.stringify(craneRun.sets) +
      (B.limoniid && B.tipulid ? ', body limoniid / tipulid ' + median(B.limoniid).toFixed(0) + ' / ' + median(B.tipulid).toFixed(0) + ', leg / body ' + median(Lg.limoniid).toFixed(2) + ' / ' + median(Lg.tipulid).toFixed(2) : ''));
  },
  // #50 the run's mayflies: every family, hindwing class, tail count, sex, splay class and wing set on at least EPH_HAB.share of
  // them, once the run has EPH_HAB.shareMin
  ephShares(fail) {
    for (const [what, counts, kinds] of [['families', ephHab.fams, EPH_HAB.fams], ['hindwing classes', ephHab.hind, ['large', 'small', 'absent']], ['tail counts', ephHab.tails, ['2', '3']],
      ['sexes', ephHab.sex, ['male', 'female']], ['tail splays', ephHab.splay, Object.keys(EPH_HAB.splay)], ['wing sets', ephHab.sets, Object.keys(EPH_HAB.sets)]]) {
      const n = Object.values(counts).reduce((a, b) => a + b, 0);
      if (!n) continue;   // its check was not selected
      const thin = kinds.filter(k => (counts[k] || 0) < EPH_HAB.share * n);
      if (n >= EPH_HAB.shareMin && thin.length) fail('mayfly ' + what + ' under ' + EPH_HAB.share + ' of the plates: ' + thin.join(', ') + ' ' + JSON.stringify(counts), 'mayfly');
      console.log('#50 mayfly ' + what + ':', JSON.stringify(counts) + (n < EPH_HAB.shareMin ? ' (too few to assert, < ' + EPH_HAB.shareMin + ')' : ''));
    }
  },
  // the #26 checks assert only on cicada plates: once the run has CIC_MIN of them every selected one must have run
  // the #59 checks assert only on mayfly plates: once the run has EPH_MIN of them every selected one must have run
  ephSeen(fail) {
    const n = ephSeenPlates, idle = Object.keys(ephSeen).filter(k => ran.has(k) && !ephSeen[k] && (!['ephHind', 'ephMask'].includes(k) || ephHindPlates));
    if (idle.length && n >= EPH_MIN) fail('#59 / #21 mayfly checks that never ran in ' + n + ' mayfly plates: ' + idle.join(', '));
    console.log('#59 / #21 mayfly checks asserted on (of ' + n + ' mayfly plates):', Object.keys(ephSeen).filter(k => ran.has(k)).map(k => k + ' ' + ephSeen[k]).join(', ') +
      (n < EPH_MIN ? '; too few mayfly plates (' + n + ' < ' + EPH_MIN + ') to require every check' : ''));
  },
  cicSeen(fail) {
    const n = cicSeenPlates, idle = Object.keys(cicSeen).filter(k => ran.has(k) && !cicSeen[k]);
    if (idle.length && n >= CIC_MIN) fail('#26 cicada checks that never ran in ' + n + ' cicada plates: ' + idle.join(', '));
    console.log('#26 cicada checks asserted on (of ' + n + ' cicada plates):', Object.keys(cicSeen).filter(k => ran.has(k)).map(k => k + ' ' + cicSeen[k]).join(', ') +
      (n < CIC_MIN ? '; too few cicada plates (' + n + ' < ' + CIC_MIN + ') to require every check' : ''));
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
const JOBS_DEFAULT = Math.max(1, os.cpus().length - 2);   // worker processes when --jobs is not given: leave two cores to the machine
function parseArgs(argv) {
  let n = null, from = 1, to = null, only = null, jobs = JOBS_DEFAULT, worker = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') {
      only = (argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!only.length) throw new Error('--only wants a comma-separated list of check names; the checks are: ' + NAMES.join(', '));
    } else if (a === '--seeds') {
      const m = /^(\d+)-(\d+)$/.exec(argv[++i] || '');
      if (!m) throw new Error('--seeds wants a range A-B');
      from = +m[1]; to = +m[2];
    } else if (a === '--jobs') {
      const v = argv[++i] || '';
      if (!/^\d+$/.test(v) || +v < 1) throw new Error('--jobs wants a whole number of worker processes, 1 or more');
      jobs = +v;
    } else if (a === '--worker') worker = true;   // internal: a shard forked by the parent (runWorker)
    else if (/^\d+$/.test(a)) n = +a;
    else throw new Error('unknown argument ' + a);
  }
  if (n !== null && to !== null) throw new Error('give N (seeds 1..N) or --seeds A-B, not both');
  if (to === null) to = n === null ? 3000 : n;
  if (from < 1 || to < from) throw new Error('--seeds range must be ascending and start at 1 or above');
  const bad = (only || []).filter(x => !NAMES.includes(x));
  if (bad.length) throw new Error('unknown check(s) ' + bad.join(', ') + '; the checks are: ' + NAMES.join(', '));
  return { from, to, only, jobs, worker };
}
const selected = (table, only) => Object.keys(table).filter(k => !only || only.includes(k));
const POST_FOR = { neuFamilies: ['neuFamily'], beeBasket: ['beeBasket'], beeTime: ['beeBasket', 'beeBasketLabel'], beeSeen: Object.keys(beeSeen), neuSeen: Object.keys(neuSeen), orthSeen: Object.keys(orthSeen), orthShares: ['orthTegmen', 'orthWingSet', 'orthHindLeg'], cicSeen: Object.keys(cicSeen), ephSeen: Object.keys(ephSeen), colSeen: Object.keys(colSeen), headSeen: Object.keys(headSeen), cicShares: ['cicWingSet', 'cicWingShape', 'cicHabitus', 'cicMarks'], dipShares: ['dipWingSet', 'dipHabitus'], lepShares: ['lepWingSet', 'lepLegs'], craneShares: ['cranePose', 'craneHabitus', 'craneWingSet'], ephShares: ['ephFamily', 'ephHindSize', 'ephTails', 'ephWingSet'], colGenes: COL_GENE_CHECKS, sweptReport: ['sweptForelegs'] };   // a POST entry that also runs when a check it audits is selected
const ran = new Set();   // the CHECKS this run selected, so a POST audit asks only about those
const onceFail = name => (msg, type) => failures.push({ seed: 0, type: type || name, msg });   // fail for a PRE / POST entry

// ---- run state: what the seed loop accumulates, and how worker shards merge back into it (#77) ----
// A parallel run splits the seed range into contiguous shards, one per worker process (this file with --worker). Each
// worker runs the seed loop over its shard and sends back the value of every RUN_STATE entry; the parent folds them into
// its own, shard by shard in seed order, before POST. So every module-scope accumulator the seed loop or a CHECKS entry
// writes and POST or the report reads is one line here, with how two shards' values combine (a the earlier shard's, b the
// later's). tests/parity.js fails on a module-scope accumulator missing from this table (or RUN_STATE_SKIP) and on any
// difference between a --jobs 1 and a --jobs 3 report.
const MERGE = {
  sum: (a, b) => a + b,
  concat: (a, b) => a.concat(b),
  vec: (a, b) => a.map((x, i) => x + b[i]),   // a fixed-length tuple of counts
  range: (a, b) => [Math.min(a[0], b[0]), Math.max(a[1], b[1])],   // [min, max] seen
  // counts all the way down: numbers add, arrays concatenate, objects and Maps merge key by key (a key new in b goes
  // last, as it first appeared last in seed order), anything else (a label such as dipStats' type) keeps a's
  tree(a, b) {
    if (typeof a === 'number') return a + b;
    if (Array.isArray(a)) return a.concat(b);
    if (a instanceof Map) { const m = new Map(a); for (const [k, v] of b) m.set(k, m.has(k) ? MERGE.tree(m.get(k), v) : v); return m; }
    if (a && typeof a === 'object') { const o = { ...a }; for (const k of Object.keys(b)) o[k] = Object.hasOwn(o, k) ? MERGE.tree(o[k], b[k]) : b[k]; return o; }
    if (a instanceof Set || typeof a === 'function') throw new Error('MERGE.tree cannot merge a ' + a.constructor.name + '; give the accumulator its own merge');
    return a === undefined ? b : a;
  },
  // a run record holding the best value seen and the seed (and context) it came from: b's only when strictly better, as
  // the seed loop's own strict test keeps the earliest seed on a tie
  min: (key, ...carry) => (a, b) => b[key] < a[key] ? { ...a, [key]: b[key], ...Object.fromEntries(carry.map(c => [c, b[c]])) } : a,
  max: (key, ...carry) => (a, b) => b[key] > a[key] ? { ...a, [key]: b[key], ...Object.fromEntries(carry.map(c => [c, b[c]])) } : a,
  fields: spec => (a, b) => { const o = { ...a }; for (const k in spec) o[k] = spec[k](a[k], b[k]); return o; },   // per field, the rest kept from a
  each: f => (a, b) => { const o = { ...a }; for (const k of Object.keys(b)) o[k] = Object.hasOwn(o, k) ? f(o[k], b[k]) : b[k]; return o; },   // per key of a keyed table
  all: (...fs) => (a, b) => fs.reduce((o, f) => f(o, b), a),
};
const refill = (target, v) => {   // a const accumulator takes its merged value in place, so the code that reads it by name sees it
  if (v === target) return;   // a merge that kept a
  if (target instanceof Map || target instanceof Set) throw new Error('refill: a module-scope Map / Set accumulator needs its own setter');
  if (Array.isArray(target)) { target.length = 0; for (const x of v) target.push(x); return; }
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, v);
};
const obj = (o, merge) => ({ get: () => o, set: v => refill(o, v), merge });
const best = (minmax, key, ...carry) => MERGE.all(MERGE.fields({ n: MERGE.sum }), MERGE[minmax](key, ...carry));   // { n, best, seed, ... }
const RUN_STATE = {
  failures: obj(failures, MERGE.concat),
  commons: obj(commons, MERGE.concat),
  pigNames: obj(pigNames, MERGE.tree),
  typeCount: obj(typeCount, MERGE.tree),
  wingSigs: obj(wingSigs, MERGE.tree),
  bodySigs: obj(bodySigs, MERGE.tree),
  elTotal: { get: () => elTotal, set: v => { elTotal = v; }, merge: MERGE.sum },
  sampledCount: { get: () => sampledCount, set: v => { sampledCount = v; }, merge: MERGE.sum },
  ephHab: obj(ephHab, MERGE.tree),
  ephSeen: obj(ephSeen, MERGE.tree),
  ephSeenPlates: { get: () => ephSeenPlates, set: v => { ephSeenPlates = v; }, merge: MERGE.sum },
  ephHindPlates: { get: () => ephHindPlates, set: v => { ephHindPlates = v; }, merge: MERGE.sum },
  dipStats: obj(dipStats, MERGE.tree),
  dipSet: obj(dipSet, MERGE.tree),
  lepSet: obj(lepSet, MERGE.fields({ sets: MERGE.tree, fams: MERGE.tree, cov: MERGE.tree, poses: MERGE.tree, hidden: MERGE.vec, brushMid: MERGE.vec })),
  craneRun: obj(craneRun, MERGE.tree),
  beeSeen: obj(beeSeen, MERGE.tree),
  basketRun: obj(basketRun, MERGE.tree),
  plateMs: obj(plateMs, MERGE.tree),
  beeSeenPlates: { get: () => beeSeenPlates, set: v => { beeSeenPlates = v; }, merge: MERGE.sum },
  neuSeen: obj(neuSeen, MERGE.tree),
  neuSeenPlates: { get: () => neuSeenPlates, set: v => { neuSeenPlates = v; }, merge: MERGE.sum },
  neuFamRun: obj(neuFamRun, MERGE.tree),
  orth72Run: obj(orth72Run, MERGE.tree),
  orthSeen: obj(orthSeen, MERGE.tree),
  orthSeenPlates: { get: () => orthSeenPlates, set: v => { orthSeenPlates = v; }, merge: MERGE.sum },
  cicSet: obj(cicSet, MERGE.tree),
  cicSeen: obj(cicSeen, MERGE.tree),
  cicSeenPlates: { get: () => cicSeenPlates, set: v => { cicSeenPlates = v; }, merge: MERGE.sum },
  cicRun: obj(cicRun, MERGE.tree),
  hymSeen: obj(hymSeen, MERGE.tree),
  odoSeen: obj(odoSeen, MERGE.tree),
  odoRun: obj(odoRun, MERGE.all(MERGE.min('cell', 'cellSeed'), MERGE.max('overlap', 'overlapSeed'))),
  odoHab: obj(odoHab, MERGE.tree),
  odoPigRun: obj(odoPigRun, MERGE.all(MERGE.fields({ plates: MERGE.tree, kinds: MERGE.tree, clear: MERGE.tree }), MERGE.min('pitch', 'seed'))),
  odoRestRun: obj(odoRestRun, MERGE.tree),
  odoInkRun: obj(odoInkRun, best('max', 'worst', 'seed')),
  headSeen: obj(headSeen, MERGE.tree),
  lepInk: obj(lepInk, MERGE.each(best('max', 'max', 'seed', 'art'))),
  lepRun: { get: () => lepRun, set: v => { lepRun = v; }, merge: MERGE.sum },
  laneRun: obj(laneRun, MERGE.each(best('min', 'worst', 'seed'))),
  abdRun: obj(abdRun, MERGE.each(best('min', 'worst', 'seed', 'at'))),
  elyRun: obj(elyRun, best('min', 'worst', 'seed', 'at')),
  elyStyles: obj(elyStyles, MERGE.tree),
  roveSeen: { get: () => roveSeen, set: v => { roveSeen = v; }, merge: MERGE.sum },
  beetlePlates: { get: () => beetlePlates, set: v => { beetlePlates = v; }, merge: MERGE.sum },
  beetleRun: obj(beetleRun, MERGE.fields({ n: MERGE.sum, wl: MERGE.range, pe: MERGE.range })),
  colSeen: obj(colSeen, MERGE.tree),
  colFams: obj(colFams, MERGE.tree),
  colTally: obj(colTally, MERGE.tree),
  legRun: obj(legRun, MERGE.tree),
  sweptRun: obj(sweptRun, MERGE.tree),
};
const RUN_STATE_SKIP = ['ran', 'workers'];   // module-scope but not accumulated: ran is set from the arguments by every process alike, workers is the parent's own

// the seed loop over seeds from..to: one plate per seed, the run counters, then every selected check
async function seedLoop(from, to, checks) {
  for (let seed = from; seed <= to; seed++) {
    const t0 = process.hrtime.bigint();
    const { svg, meta } = E.generateInsectDetailed(seed);
    (meta.type === 'bee' ? plateMs.bee : plateMs.other).push([seed, Number(process.hrtime.bigint() - t0) / 1e6]);
    const key = meta.variant || meta.type;
    typeCount[key] = (typeCount[key] || 0) + 1;
    if (meta.type === 'bee') beeSeenPlates++;
    if (meta.type === 'lacewing') neuSeenPlates++;
    if (meta.type === 'grasshopper') orthSeenPlates++;
    if (meta.type === 'beetle') beetlePlates++;
    if (meta.type === 'cicada') cicSeenPlates++;
    if (meta.type === 'mayfly') { ephSeenPlates++; if (meta.mayfly && meta.mayfly.hind) ephHindPlates++; }
    if (meta.wingSig) { const m = wingSigs[key] ||= new Map(); m.set(meta.wingSig, (m.get(meta.wingSig) || 0) + 1); }
    if (meta.bodySig) { const m = bodySigs[key] ||= new Map(); m.set(meta.bodySig, (m.get(meta.bodySig) || 0) + 1); }
    elTotal += drawn(svg);
    const fail = msg => failures.push({ seed, type: key, msg });
    const sampled = seed % SAMPLE === 0; if (sampled) sampledCount++;
    let devPlate = null;
    const ctx = { seed, sampled, get dev() { return devPlate ||= E.generateInsectDetailed(seed, { devicePx: DEV }); } };
    for (const name of checks) { const r = CHECKS[name](meta, svg, fail, ctx); if (r && r.then) await r; }   // lepInk rasterises (async)
  }
}

// contiguous shards of from..to, one per job, in seed order
const shardRanges = (from, to, jobs) => Array.from({ length: jobs }, (_, i) => {
  const n = to - from + 1;
  return [from + Math.floor(n * i / jobs), from + Math.floor(n * (i + 1) / jobs) - 1];
});
const workers = new Set();   // live worker processes, killed if the parent exits first
process.on('exit', () => { for (const w of workers) w.kill(); });
// one worker over seeds a..b: resolves to its run state and whatever it printed (stderr passes straight through)
function runShard([a, b], only) {
  return new Promise((resolve, reject) => {
    const argv = ['--worker', '--seeds', a + '-' + b, ...(only ? ['--only', only.join(',')] : [])];
    const w = fork(__filename, argv, { serialization: 'advanced', stdio: ['ignore', 'pipe', 'inherit', 'ipc'] });   // advanced: Maps and Infinity survive
    workers.add(w);
    let out = '', state = null;
    w.stdout.on('data', d => { out += d; });
    w.on('message', m => { state = m; });
    w.on('error', reject);
    w.on('close', (code, signal) => {
      workers.delete(w);
      if (code === 0 && state) resolve({ state, out });
      else { process.stdout.write(out); reject(new Error('check.js worker for seeds ' + a + '-' + b + ' ' + (signal ? 'killed by ' + signal : 'exited ' + code) + (state ? '' : ' without its run state'))); }   // what it printed before it died, then the error
    });
  });
}
// a worker: the seed loop over its shard, then its run state to the parent; no PRE, POST or report
async function runWorker(from, to, checks) {
  if (!process.send) throw new Error('--worker is internal: check.js forks its shards with it');
  await seedLoop(from, to, checks);
  const state = {};
  for (const k in RUN_STATE) state[k] = RUN_STATE[k].get();
  await new Promise((resolve, reject) => process.send(state, e => e ? reject(e) : resolve()));
  process.disconnect();
}

async function run() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  const { from, to, only, worker } = args, count = to - from + 1, jobs = Math.min(args.jobs, count);
  const pre = selected(PRE, only), checks = selected(CHECKS, only);
  const post = Object.keys(POST).filter(k => !only || only.includes(k) || (POST_FOR[k] || []).some(c => only.includes(c)));
  for (const k of checks) ran.add(k);
  if (worker) return runWorker(from, to, checks);
  // --jobs 1 runs the seed loop here; otherwise the shards start first and run while PRE does
  const shards = jobs > 1 ? Promise.all(shardRanges(from, to, jobs).map(r => runShard(r, only))) : null;
  for (const name of pre) PRE[name](onceFail(name));
  if (shards) {
    const results = await shards;
    for (const k in RUN_STATE) { const e = RUN_STATE[k]; e.set(results.reduce((acc, r) => e.merge(acc, r.state[k]), e.get())); }
    for (const r of results) process.stdout.write(r.out);
  } else await seedLoop(from, to, checks);
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

module.exports = { RUN_STATE, RUN_STATE_SKIP };   // for tests/parity.js
if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
