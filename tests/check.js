#!/usr/bin/env node
// Runs the engine from index.html over many seeds and checks structural invariants.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
if (!m) throw new Error('engine script not found');
const ctx = { module: { exports: {} }, console };
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
const E = ctx.module.exports;

const N = Number(process.argv[2] || 3000);
const failures = [];
const typeCount = {};
const wingSigs = {};   // type -> Map(structural wing signature -> count)
const bodySigs = {};   // type -> Map(structural body signature -> count)
let elTotal = 0;

for (let seed = 1; seed <= N; seed++) {
  const { svg, meta } = E.generateInsectDetailed(seed);
  const key = meta.variant || meta.type;
  typeCount[key] = (typeCount[key] || 0) + 1;
  const fail = msg => failures.push({ seed, type: key, msg });
  if (meta.wingSig) { const m = wingSigs[key] ||= new Map(); m.set(meta.wingSig, (m.get(meta.wingSig) || 0) + 1); }
  if (!meta.bodySig) fail('no bodySig');
  else { const m = bodySigs[key] ||= new Map(); m.set(meta.bodySig, (m.get(meta.bodySig) || 0) + 1); }

  if (/NaN|Infinity|undefined|null/.test(svg)) fail('bad number in svg');
  if (E.generateInsect(seed) !== svg) fail('non-deterministic');
  if (E.generateInsectDetailed(seed, { type: meta.type }).svg !== svg) fail('forcing the rolled type changes the drawing');
  if (seed % 50 === 0) for (const part of E.PARTS) {   // part crops: no bad numbers, something drawn
    const p = E.generatePart(seed, meta.type, part).svg;
    if (/NaN|Infinity|undefined/.test(p)) fail('bad number in part svg: ' + part);
    if ((p.match(/<(path|line|polyline|circle)\b/g) || []).length < 1) fail('empty part: ' + part);
  }
  const els = (svg.match(/<(path|line|polyline|circle)\b/g) || []).length;
  elTotal += els;
  if (els < 60) fail('too few elements: ' + els);
  const f = meta.fitted;
  if (f.minX < 0 || f.maxX > 600 || f.minY < 0 || f.maxY > 600) fail('does not fit: ' + JSON.stringify(f));
  if (meta.scale < 0.55) fail('scale too small: ' + meta.scale.toFixed(3));
  if (meta.legs.length !== 3) fail('expected 3 right legs, got ' + meta.legs.length);
  for (const leg of meta.legs) {
    if (leg.y < meta.thorax.yTop || leg.y > meta.thorax.yBot) fail(leg.pair + ' leg attaches outside thorax y-range');
    if (leg.x > leg.hw + 0.01) fail(leg.pair + ' coxa starts outside thorax outline');
    if (leg.x < leg.hw * 0.5) fail(leg.pair + ' coxa starts too far inside thorax (' + leg.x.toFixed(1) + ' vs hw ' + leg.hw.toFixed(1) + ')');
    if (leg.hw < 8) fail(leg.pair + ' thorax half-width at attachment suspiciously small: ' + leg.hw.toFixed(1));
  }
  // Thorax: the wing blocks root their wings at meta.thorax.wingRoots (t along the thorax); the rolled profile must
  // still have width there, and the scutellum must sit inside the body outline (thorax, or the abdomen / elytra
  // where it hangs over the junction, as a beetle's does).
  {
    const th = meta.thorax, profHw = (prof, y) => {   // profiles are sampled every 2 px and rounded to 0.1, so tolerate the last sample's rounding
      if (!prof.length || y < prof[0][0]) return 0;
      if (y > prof[prof.length - 1][0]) return y - prof[prof.length - 1][0] < 0.11 ? prof[prof.length - 1][1] : 0;
      const k = Math.min(prof.length - 2, Math.floor((y - prof[0][0]) / 2)), a = prof[k], b = prof[k + 1];
      return a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (y - a[0]) / (b[0] - a[0]));
    };
    if (!th.profile || th.profile.length < 3) fail('no thorax profile');
    for (const t of th.wingRoots) {
      if (t < 0 || t > 1) fail('wing root outside the thorax: t=' + t);
      const hw = profHw(th.profile, th.yTop + t * (th.yBot - th.yTop));
      if (hw <= 4) fail('thorax too narrow at a wing root: hw ' + hw.toFixed(1) + ' at t=' + t);
    }
    for (const p of th.scutellum) {
      const hw = p[1] <= th.yBot ? profHw(th.profile, p[1]) : profHw(meta.abdomen.profile, p[1]);
      if (Math.abs(p[0]) > hw + 0.6) { fail('scutellum outside the body outline'); break; }
    }
  }
  // Leg pose invariants (meta.legs[i].pts is the joint polyline of the right-hand leg: attach, coxa, trochanter,
  // femur tip, tibia tip, tarsomeres, claw tip). The engine re-rolls a pose that breaks these; here we assert the result.
  {
    const byPair = {}; for (const leg of meta.legs) byPair[leg.pair] = leg;
    const fr = byPair.front, mi = byPair.mid, hi = byPair.hind;
    if (fr && mi && hi && !(fr.femurTip[1] < mi.femurTip[1] && mi.femurTip[1] < hi.femurTip[1])) fail('femur tips not ordered front < mid < hind along the body');
    const prof = meta.abdomen.profile, hwAt = y => {   // abdomen half-width at y, from the sampled profile
      if (y < prof[0][0] || y > prof[prof.length - 1][0]) return 0;
      const k = Math.min(prof.length - 2, Math.floor((y - prof[0][0]) / 2)), a = prof[k], b = prof[k + 1];
      return a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (y - a[0]) / (b[0] - a[0]));
    };
    const segsCross = (a, b, c, d) => { const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
      const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
    for (const leg of meta.legs) {
      const pts = leg.pts;
      if (pts.some(p => p[0] < 0)) fail(leg.pair + ' leg crosses the mirror line');
      for (let k = 3; k + 1 < pts.length; k++) {   // femur tip onward, sampled every 2 px, never inside the abdomen below the thorax
        const a = pts[k], b = pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
        for (let q = 0; q <= n; q++) { const x = a[0] + (b[0] - a[0]) * q / n, y = a[1] + (b[1] - a[1]) * q / n; if (y > meta.thorax.yBot && x < hwAt(y) - 0.5) { fail(leg.pair + ' leg inside the abdomen outline'); break; } }
      }
      const tip = leg.tip, tx = 300 + tip[0] * meta.scale, ty = meta.fitted.minY + (tip[1] - meta.bbox.minY) * meta.scale;
      if (tx < 0 || tx > 600 || ty < 0 || ty > 600) fail(leg.pair + ' tarsus tip outside the plate');
    }
    for (let a = 0; a < meta.legs.length; a++) for (let b = a + 1; b < meta.legs.length; b++) {
      const A = meta.legs[a].pts, Bp = meta.legs[b].pts; let hit = false;
      for (let k = 2; k + 1 < A.length && !hit; k++) for (let m = 2; m + 1 < Bp.length; m++) if (segsCross(A[k], A[k + 1], Bp[m], Bp[m + 1])) { hit = true; break; }
      if (hit) fail(meta.legs[a].pair + ' and ' + meta.legs[b].pair + ' legs cross');
    }
  }
  // Head (meta.head, docs/research-head-eyes.md): every compound eye stays inside the head's bounding box with at most
  // 10% of its extent overhanging on any side (cicada and odonate eyes bulge past the capsule, never past headW), and
  // every ocellus lies inside the drawn head outline.
  {
    const h = meta.head;
    if (!h || !h.outline || h.outline.length < 8 || !h.eyes.length) fail('no head outline / eyes in meta.head');
    else {
      const x0 = -h.W / 2, x1 = h.W / 2, y0 = h.top, y1 = h.top + h.H;
      for (const e of h.eyes) {
        const a = (e.rot || 0) * Math.PI / 180, ex = Math.hypot(e.rx * Math.cos(a), e.ry * Math.sin(a)), ey = Math.hypot(e.rx * Math.sin(a), e.ry * Math.cos(a));
        const overX = Math.max(x0 - (e.cx - ex), (e.cx + ex) - x1) / (2 * ex), overY = Math.max(y0 - (e.cy - ey), (e.cy + ey) - y1) / (2 * ey);
        if (overX > 0.1 || overY > 0.1) { fail('eye overhangs the head bbox by more than 10%: ' + Math.round(Math.max(overX, overY) * 100) + '%'); break; }
      }
      const inPoly = (p, poly) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; };
      for (const o of h.ocelli) if (![[o[0] - o[2], o[1]], [o[0] + o[2], o[1]], [o[0], o[1] - o[2]], [o[0], o[1] + o[2]]].every(p => inPoly(p, h.outline))) { fail('ocellus outside the head outline'); break; }
    }
  }
  // Antenna invariants (meta.antennae.pts: shaft samples plus the far ends of club, rami, lamellae and arista of the
  // right-hand antenna). The left antenna is the mirror image, so no point may reach the mirror line; the tip must
  // land on the plate. The engine re-rolls the pose and falls back to a forward pose; here we assert the result.
  {
    const an = meta.antennae;
    if (!an || !an.pts || an.pts.length < 2) fail('no antenna geometry');
    else {
      if (an.pts.some(p => p[0] < 0.5)) fail('antenna crosses the mirror line (' + an.kind + ' ' + an.pose + ')');
      const tip = an.tip, tx = 300 + tip[0] * meta.scale, ty = meta.fitted.minY + (tip[1] - meta.bbox.minY) * meta.scale;
      if (tx < 0 || tx > 600 || ty < 0 || ty > 600) fail('antenna tip outside the plate');
      if (!meta.bodySig.includes(an.kind)) fail('antenna kind missing from bodySig');
    }
  }
  // stroke widths >= 0.5 after scale
  const sws = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(x => Number(x[1]) * meta.scale);
  if (sws.some(w => w < 0.49)) fail('stroke width below 0.5 after scale');
  if (/opacity|gradient|filter|url\(/.test(svg)) fail('non-eink construct present');
  // grown venation (every winged type: bee / wasp / fly / cranefly / dragonfly / damselfly / lacewing / mayfly /
  // grasshopper / cicada / moth): every crossvein junction is obtuse within R-D's band, no crossvein is dropped more
  // often than one is placed, and nothing in the wings layer degenerates to a single-point polyline. The angle band is
  // asserted on the rungs placed by the slide rule (minAngle / maxAngle are measured on those); the edges of the
  // multi-row Voronoi regions (Odonata, the grasshopper archedictyon) are the research model itself and are slid toward
  // the band where possible but never dropped, so they are exempt, as are structural obliques with their own band (the
  // odonate triangle side and bridge, the middle piece of the lepidopteran discocellular). A moth plate's only joins
  // are the six discocellular pieces, and a piece the rule cannot place is drawn straight between its nodes so the
  // cell still closes, so the drop-count test does not apply to it.
  if (meta.type !== 'beetle') {
    const s = meta.wingStats;
    if (!s) fail('no wingStats on a grown wing');
    else {
      if (s.joins > 0 && (s.minAngle < 100 || s.maxAngle > 145)) fail('junction angle outside 100-145: ' + s.minAngle.toFixed(1) + '-' + s.maxAngle.toFixed(1));
      if (meta.type !== 'moth' && s.dropped > s.joins) fail('more crossveins dropped than placed: ' + s.dropped + ' > ' + s.joins);
      if ((meta.type === 'dragonfly' || meta.type === 'damselfly') && s.rungs < 40) fail('too few ladder rungs on an odonate: ' + s.rungs);
      if (meta.type === 'mayfly' && s.rungs < 60) fail('too few ladder rungs on a mayfly: ' + s.rungs);
      if (meta.type === 'lacewing' && s.rungs < 40) fail('too few rungs on a lacewing: ' + s.rungs);
      if (meta.type === 'cicada' && s.joins < 4) fail('cicada nodal line incomplete: ' + s.joins + ' joins');
    }
  }
  for (const w of meta.layers.wings) { const pl = w.match(/<polyline points="([^"]*)"/); if (pl && pl[1].trim().split(/\s+/).length < 2) fail('wing polyline with fewer than 2 points'); }
}

// Wing uniqueness: every winged type exposes meta.wingSig, a discrete signature of its outline and
// vein plan (counts, cell plan, apex shape ...). Within a type no signature may dominate, otherwise
// plates start to read as repeats when cycling through random seeds.
// Body uniqueness: every plate exposes meta.bodySig (pose family, leg family, attachment, joint angles, armature,
// segment counts ...), held to the same rule so the insect under the wings varies as much as the wings do.
// The body signature carries far more discrete genes (legs, abdomen, thorax) than a wing's, so it is held to a
// stricter floor: at least 98% of a type's plates must be distinct.
const sigRule = (sigs, what, distinctFloor) => {
  const report = {};
  for (const key in sigs) {
    const m = sigs[key], n = [...m.values()].reduce((a, b) => a + b, 0);
    const top = Math.max(...m.values());
    report[key] = { seeds: n, distinct: m.size, topShare: Math.round(top / n * 1000) / 10 + '%' };
    if (n >= 40) {
      if (top / n > 0.1) failures.push({ seed: 0, type: key, msg: what + ' signature repeats: one layout covers ' + Math.round(top / n * 100) + '% of ' + key + ' plates' });
      if (m.size < n * distinctFloor) failures.push({ seed: 0, type: key, msg: what + ' signature repeats: only ' + m.size + ' distinct layouts in ' + n + ' ' + key + ' plates' });
    }
  }
  return report;
};
const sigReport = sigRule(wingSigs, 'wing', 0.5), bodyReport = sigRule(bodySigs, 'body', 0.98);

console.log('seeds checked:', N);
console.log('type distribution:', typeCount);
console.log('wing signatures:', sigReport);
console.log('body signatures:', bodyReport);
console.log('avg elements:', Math.round(elTotal / N));
console.log('daily seed today:', E.dailySeed());
if (failures.length) {
  console.log('FAILURES:', failures.length);
  const byMsg = {};
  for (const f of failures) (byMsg[f.msg.split(':')[0]] ||= []).push(f.seed + '(' + f.type + ')');
  for (const k in byMsg) console.log(' -', k, ':', byMsg[k].length, 'e.g.', byMsg[k].slice(0, 6).join(' '));
  process.exit(1);
}
console.log('OK');
