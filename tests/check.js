#!/usr/bin/env node
// Runs the engine from index.html over many seeds and checks structural invariants.
//
//   node tests/check.js [N | --seeds A-B] [--only name,name]
//
// N (default 3000) checks seeds 1..N; --seeds A-B checks that range instead (the two are exclusive). --only runs just
// the named checks (a name from PRE, CHECKS or POST below; an unknown or empty list exits 2 and lists them, so a
// selection can never pass by running nothing). The invariants are a table of named check functions: CHECKS run per
// seed as (meta, svg, fail, ctx), where fail(msg) records a failure for that seed, ctx.seed is the seed, ctx.sampled
// is true on every SAMPLE-th seed (the gate of the slow extras: part crops, the 800 px device plate) and ctx.dev is
// the device plate at DEV px, drawn once on first use (so a check that never reads it costs nothing). PRE and POST
// run once as (fail), before and after the seed loop, where fail(msg, type) records a seed-0 finding under the
// check's name (or the type given). Adding an invariant is adding one entry; the order of the tables is the order
// the failures are recorded and reported in.
'use strict';
const { loadEngine, engineContract } = require('./engine');
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
const ptSegDist = (p, u, v) => { const wx = v[0] - u[0], wy = v[1] - u[1], l2 = wx * wx + wy * wy, t = l2 ? Math.max(0, Math.min(1, ((p[0] - u[0]) * wx + (p[1] - u[1]) * wy) / l2)) : 0; return Math.hypot(p[0] - u[0] - wx * t, p[1] - u[1] - wy * t); };
const segDist = (a, b, c, d) => segsCross(a, b, c, d) ? 0 : Math.min(ptSegDist(a, c, d), ptSegDist(b, c, d), ptSegDist(c, a, b), ptSegDist(d, a, b));   // shortest distance between segments ab and cd
// a point in body coordinates to plate coordinates, after the plate scale and fit
const toPlate = (meta, p) => [300 + p[0] * meta.scale, meta.fitted.minY + (p[1] - meta.bbox.minY) * meta.scale];
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
    checkLegSet(meta, meta.legs.map(leg => leg.pts.map(p => rotAbout(p, leg.pivot, leg.skew))), ' skewed', fail);
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
  // width + 1 of a leg segment (femur onward) that reaches ahead of the thorax, on the right legs and on the skewed
  // left set. Beside the body (both ends of the antenna segment below the thorax top) the antenna lies over the legs,
  // as on a plate. The engine holds 3 px + both half widths and re-rolls the pose; here we assert the result.
  antLegs(meta, svg, fail) {
    const an = meta.antennae, yTop = meta.thorax.yTop;
    if (!an || !an.lines || !an.lines.length) return fail('no antenna centre-lines on meta');
    const sets = [['', leg => leg.pts], [' skewed', leg => leg.pts.map(p => rotAbout(p, leg.pivot, leg.skew))]];
    for (const [label, get] of sets) for (const leg of meta.legs) {
      if (!leg.segHw || leg.segHw.length !== leg.pts.length - 1) return fail('no per-segment half widths on meta.legs');
      const pts = get(leg);
      for (let k = 2; k + 1 < pts.length; k++) {
        if (Math.min(pts[k][1], pts[k + 1][1]) >= yTop + 4) continue;
        for (const ln of an.lines) for (let i = 0; i + 1 < ln.pl.length; i++) {
          const a = ln.pl[i], b = ln.pl[i + 1];
          if (a[1] > yTop && b[1] > yTop) continue;
          const d = segDist(a, b, pts[k], pts[k + 1]);
          if (d < leg.segHw[k] + 1) return fail('antenna within ' + d.toFixed(1) + ' of the' + label + ' ' + leg.pair + ' leg ahead of the thorax (' + an.kind + ' ' + an.pose + ', legs ' + meta.legRoll.pose + ')');
        }
      }
    }
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
  wings(meta, svg, fail, { dev }) {
    const checkWingStats = (s, what) => {
      if (!s) return fail(what + 'no wingStats on a grown wing');
      // lacewing: the strip under R1 (R1-Rs) carries only a few rungs in the references (neu-nothochrysa); the costal
      // ladder is the dense one. The engine reports the R1-Rs rung count as wingStats.r1rs.
      if (meta.type === 'lacewing' && s.r1rs > 6) fail(what + 'lacewing R1-Rs strip has ' + s.r1rs + ' rungs (max 6)');
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
const onceFail = name => (msg, type) => failures.push({ seed: 0, type: type || name, msg });   // fail for a PRE / POST entry

function run() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  const { from, to, only } = args, count = to - from + 1;
  const pre = selected(PRE, only), checks = selected(CHECKS, only), post = selected(POST, only);
  let sampledCount = 0;
  for (const name of pre) PRE[name](onceFail(name));
  for (let seed = from; seed <= to; seed++) {
    const { svg, meta } = E.generateInsectDetailed(seed);
    const key = meta.variant || meta.type;
    typeCount[key] = (typeCount[key] || 0) + 1;
    if (meta.wingSig) { const m = wingSigs[key] ||= new Map(); m.set(meta.wingSig, (m.get(meta.wingSig) || 0) + 1); }
    if (meta.bodySig) { const m = bodySigs[key] ||= new Map(); m.set(meta.bodySig, (m.get(meta.bodySig) || 0) + 1); }
    elTotal += drawn(svg);
    const fail = msg => failures.push({ seed, type: key, msg });
    const sampled = seed % SAMPLE === 0; if (sampled) sampledCount++;
    let devPlate = null;
    const ctx = { seed, sampled, get dev() { return devPlate ||= E.generateInsectDetailed(seed, { devicePx: DEV }); } };
    for (const name of checks) CHECKS[name](meta, svg, fail, ctx);
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

run();
