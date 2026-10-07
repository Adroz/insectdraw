#!/usr/bin/env node
// Runs the engine from index.html over many seeds and checks structural invariants.
'use strict';
const E = require('./engine').loadEngine();

const N = Number(process.argv[2] || 3000);
const MESH = new Set(['dragonfly', 'damselfly', 'mayfly', 'grasshopper']);   // orders whose wing sig counts mesh cells
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
    // saltatorial hind femur (docs/research-legs-eyes-antennae.md: "hind femur enormous"): it must read as a jumping leg, so
    // it is at least 1.8x as wide as the mid femur and between 3 and 5 times as long as it is wide
    if (meta.type === 'grasshopper' && hi && mi && hi.femW !== undefined) {
      if (hi.femW < 1.8 * mi.femW) fail('grasshopper hind femur only ' + (hi.femW / mi.femW).toFixed(2) + 'x the mid femur width');
      const r = hi.femLen / hi.femW; if (r < 3 || r > 5) fail('grasshopper hind femur length/width ' + r.toFixed(2) + ' outside 3-5');
    }
    const prof = meta.abdomen.profile, hwAt = y => {   // abdomen half-width at y, from the sampled profile
      if (y < prof[0][0] || y > prof[prof.length - 1][0]) return 0;
      const k = Math.min(prof.length - 2, Math.floor((y - prof[0][0]) / 2)), a = prof[k], b = prof[k + 1];
      return a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (y - a[0]) / (b[0] - a[0]));
    };
    const segsCross = (a, b, c, d) => { const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
      const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
    // one leg set (right side as drawn, or the left side = each pair rotated about its coxa by its skew before mirroring):
    // nothing on the mirror line, nothing inside the abdomen below the thorax, tarsus tips on the plate, no pair crossing
    const checkLegSet = (sets, label) => {
      sets.forEach((pts, i) => {
        const pair = meta.legs[i].pair;
        if (pts.some(p => p[0] < 0)) fail(pair + label + ' leg crosses the mirror line');
        for (let k = 3; k + 1 < pts.length; k++) {   // femur tip onward, sampled every 2 px
          const a = pts[k], b = pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
          for (let q = 0; q <= n; q++) { const x = a[0] + (b[0] - a[0]) * q / n, y = a[1] + (b[1] - a[1]) * q / n; if (y > meta.thorax.yBot && x < hwAt(y) - 0.5) { fail(pair + label + ' leg inside the abdomen'); break; } }
        }
        const tip = pts[pts.length - 1], tx = 300 + tip[0] * meta.scale, ty = meta.fitted.minY + (tip[1] - meta.bbox.minY) * meta.scale;
        if (tx < 0 || tx > 600 || ty < 0 || ty > 600) fail(pair + label + ' tarsus tip outside the plate');
      });
      for (let a = 0; a < sets.length; a++) for (let b = a + 1; b < sets.length; b++) {
        const A = sets[a], Bp = sets[b]; let hit = false;
        for (let k = 2; k + 1 < A.length && !hit; k++) for (let m = 2; m + 1 < Bp.length; m++) if (segsCross(A[k], A[k + 1], Bp[m], Bp[m + 1])) { hit = true; break; }
        if (hit) fail(meta.legs[a].pair + ' and ' + meta.legs[b].pair + label + ' legs cross');
      }
    };
    checkLegSet(meta.legs.map(l => l.pts), '');
    // mirror skew (plan step 7): the left legs are the right legs rotated 0-6 degrees about their own coxa, then mirrored
    if (!meta.legSkew || meta.legSkew.length !== 3) fail('no legSkew on meta');
    else {
      const rotAbout = (p, c, deg) => { const a = deg * Math.PI / 180, dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
      for (const leg of meta.legs) { const a = Math.abs(leg.skew); if (a !== 0 && (a < 2 || a > 6)) fail(leg.pair + ' leg skew ' + leg.skew.toFixed(1) + ' outside 2-6 degrees (or 0)'); }
      checkLegSet(meta.legs.map(leg => leg.pts.map(p => rotAbout(p, leg.pivot, leg.skew))), ' skewed');
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
  // swallowtail: the hindwing veins must not converge into the tail root; the two vein endpoints nearest the tail tip must be
  // at least 6% of the span apart from each other (the engine exposes meta.lepHindEnds and meta.lepTail when a tail is rolled)
  if (meta.type === 'moth' && meta.lepTail && meta.lepHindEnds) {
    const tip = meta.lepTail.tip, W = meta.lepTail.W;
    const near = meta.lepHindEnds.map(p => ({ p, d: Math.hypot(p[0] - tip[0], p[1] - tip[1]) })).sort((a, b) => a.d - b.d).slice(0, 2);
    if (near.length === 2) { const sep = Math.hypot(near[0].p[0] - near[1].p[0], near[0].p[1] - near[1].p[1]); if (sep < W * 0.06) fail('swallowtail: two hindwing veins converge at the tail root (' + (sep / W).toFixed(3) + ' of span apart)'); }
    const atTip = meta.lepHindEnds.filter(p => Math.hypot(p[0] - tip[0], p[1] - tip[1]) < W * 0.02).length;
    if (atTip !== 1) fail('swallowtail: ' + atTip + ' hindwing veins end at the tail tip (want exactly one, ref lep-papilio)');
  }
  // stroke widths >= 0.5 after scale
  const sws = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(x => Number(x[1]) * meta.scale);
  if (sws.some(w => w < 0.49)) fail('stroke width below 0.5 after scale');
  if (/opacity|gradient|filter|url\(/.test(svg)) fail('non-eink construct present');
  // Device plate (spec #32, ADR 0001): generateInsect(seed, { devicePx }) draws the same insect with every stroke weight
  // clamped to >= DEVICE.strokePx device px and every hatch / mesh pitch to >= DEVICE.pitchPx device px, in plate units
  // floor x 600 / devicePx (DEVICE is the engine's exported contract). The option adds no rng draw: pass 2 re-rolls the
  // type / variant and bodySig from the same stream, so their equality is a real assertion. meta.wingSig / wingStats are
  // pass 1's by construction (the engine copies them, so their equality only checks the copy); pass 2's own are on
  // meta.device and are held to the venation rules below. The pitch is read from meta.minPitch, which every pitch site
  // reports after its clamp (plate px, i.e. after the plate scale), so the default plate must report one too or the
  // number is dead. The caption subtitle (11 px) is dropped when it would fall under DEVICE.subtitleMinPx device px
  // (devicePx < 600 x subtitleMinPx / 11, i.e. 546): absent at 440, present with no option and at 800. The binomial stays.
  const DEV = 440, dev = E.generateInsectDetailed(seed, { devicePx: DEV });
  {
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
    const texts = s => (s.match(/<text\b/g) || []).length;
    if (texts(svg) !== 2) fail('default plate caption is not binomial + subtitle');
    if (texts(dev.svg) !== 1) fail('device plate at 440 keeps the subtitle');
    if (!dev.svg.includes(meta.name.binomial.replace(/&/g, '&amp;'))) fail('device plate lost the binomial');
    if (seed % 50 === 0 && texts(E.generateInsect(seed, { devicePx: 800 })) !== 2) fail('device plate at 800 drops the subtitle');
    // the binomial is floored at 24 device px on a device plate (ticket #38, ADR 0001): 32.7 plate px at 440, 18 at 800,
    // 16 (unchanged) with no option. Worked examples, not the engine's formula, so a wrong constant cannot agree with
    // itself. The caption is the first <text> of the plate. The gate (tests/eink.js) measures that it reads after the threshold.
    const capSize = svg => +(svg.match(/<text[^>]*font-size="([\d.]+)"/) || [])[1];
    if (capSize(svg) !== 16) fail('default plate binomial is not 16 px');
    if (capSize(dev.svg) !== 32.7) fail('device plate binomial at 440 is ' + capSize(dev.svg) + ' px, not 32.7');
    if (seed % 50 === 0 && capSize(E.generateInsect(seed, { devicePx: 800 })) !== 18) fail('device plate binomial at 800 is not 18 px');
  }
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

// Daily seed: the day boundary is Brisbane midnight (UTC+10, no DST), i.e. 14:00 UTC.
{
  const dfail = msg => failures.push({ seed: 0, type: 'daily', msg: 'daily seed: ' + msg });
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
}

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
