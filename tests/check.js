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
let elTotal = 0;

for (let seed = 1; seed <= N; seed++) {
  const { svg, meta } = E.generateInsectDetailed(seed);
  const key = meta.variant || meta.type;
  typeCount[key] = (typeCount[key] || 0) + 1;
  const fail = msg => failures.push({ seed, type: key, msg });
  if (meta.wingSig) { const m = wingSigs[key] ||= new Map(); m.set(meta.wingSig, (m.get(meta.wingSig) || 0) + 1); }

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
  // stroke widths >= 0.5 after scale
  const sws = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(x => Number(x[1]) * meta.scale);
  if (sws.some(w => w < 0.49)) fail('stroke width below 0.5 after scale');
  if (/opacity|gradient|filter|url\(/.test(svg)) fail('non-eink construct present');
  // grown venation (bee / wasp / dragonfly / damselfly): every crossvein junction is obtuse within R-D's band, no
  // crossvein is dropped more often than one is placed, and nothing in the wings layer degenerates to a single-point
  // polyline. For Odonata the angle band is asserted on the ladder rungs only (minAngle / maxAngle are measured on
  // rungs placed by the slide rule); the edges of the multi-row Voronoi regions are the research model itself and
  // are slid toward the band where possible but never dropped, so they are exempt.
  if (meta.type === 'bee' || meta.type === 'wasp' || meta.type === 'dragonfly' || meta.type === 'damselfly') {
    const s = meta.wingStats;
    if (!s) fail('no wingStats on a grown wing');
    else {
      if (s.joins > 0 && (s.minAngle < 100 || s.maxAngle > 145)) fail('junction angle outside 100-145: ' + s.minAngle.toFixed(1) + '-' + s.maxAngle.toFixed(1));
      if (s.dropped > s.joins) fail('more crossveins dropped than placed: ' + s.dropped + ' > ' + s.joins);
      if ((meta.type === 'dragonfly' || meta.type === 'damselfly') && s.rungs < 40) fail('too few ladder rungs on an odonate: ' + s.rungs);
    }
  }
  for (const w of meta.layers.wings) { const pl = w.match(/<polyline points="([^"]*)"/); if (pl && pl[1].trim().split(/\s+/).length < 2) fail('wing polyline with fewer than 2 points'); }
}

// Wing uniqueness: every winged type exposes meta.wingSig, a discrete signature of its outline and
// vein plan (counts, cell plan, apex shape ...). Within a type no signature may dominate, otherwise
// plates start to read as repeats when cycling through random seeds.
const sigReport = {};
for (const key in wingSigs) {
  const m = wingSigs[key], n = [...m.values()].reduce((a, b) => a + b, 0);
  const top = Math.max(...m.values());
  sigReport[key] = { seeds: n, distinct: m.size, topShare: Math.round(top / n * 1000) / 10 + '%' };
  if (n >= 40) {
    if (top / n > 0.1) failures.push({ seed: 0, type: key, msg: 'wing signature repeats: one layout covers ' + Math.round(top / n * 100) + '% of ' + key + ' plates' });
    if (m.size < n * 0.5) failures.push({ seed: 0, type: key, msg: 'wing signature repeats: only ' + m.size + ' distinct layouts in ' + n + ' ' + key + ' plates' });
  }
}

console.log('seeds checked:', N);
console.log('type distribution:', typeCount);
console.log('wing signatures:', sigReport);
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
