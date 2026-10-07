#!/usr/bin/env node
// E-ink survival gate (spec #32, ticket #33). Generates device plates for a fixed set of seeds covering
// every order and both lepidoptera variants, rasterises each layer through the panel's exact pipeline
// (resize to the device size on white, flatten, grayscale, threshold 128) and measures survival per
// layer: black pixels after the threshold divided by the antialiased ink coverage of the same raster.
// Fails when any layer drops under its floor, on the whole layer or on its fine and detail strokes alone.
// Also checks the caption is legible on the device raster (ticket #38): the thresholded caption band must
// not fragment the binomial into more pieces than it has letters, must leave no specks, and must be tall
// enough to read at arm's length; measured against the plate's own name, so the rule cannot pass by construction.
// Layers are isolated from meta.layers the way the assembly in generateInsectDetailed builds the plate, so
// no engine change is needed. The pipeline is tests/raster.js, the one the daily plate is published with.
//   npm test                         # or: node tests/eink.js
//   node tests/eink.js --out DIR     # also writes the 1-bit layer rasters (seed-type-layer.png) to DIR
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('./engine').loadEngine();
const raster = require('./raster');

// ---- contract (ADR 0001) ----
const { DEVICE_PX, THRESHOLD } = raster;   // TRMNL panel: shown at 440 device px, thresholded at 128
const SEEDS_PER_TYPE = 3;       // per order, and per lepidoptera variant
// Survival floors per layer, two measures each: 'all' is the whole layer, 'fine' only its fine and detail
// strokes (SW_F / SW_D: hatching, segment lines, striae, crossveins, antenna rami), which the outline and
// heavy ink would otherwise hide (a wasp wing scores 0.93 overall with every crossvein gone). Measured
// 2026-10-07 on these 39 seeds: today's engine bottoms out at
//   all   abdomen 0.45  head 0.62  legs 0.86  antennae 0.51  wings 0.54
//   fine  abdomen 0.00  head 0.25  legs 0.08  antennae 0.24  wings 0.00
// and the same plates with every stroke floored post hoc to 1.0 device px score at least
//   all   abdomen 0.99  head 0.97  legs 1.01  antennae 0.92  wings 1.00
//   fine  abdomen 0.95  head 0.91  legs 0.84  antennae 0.79  wings 0.95
// so each floor sits about 0.07 under that expectation; the engine ticket confirms them green with the
// real floors.
const FLOORS = { abdomen: 0.9, head: 0.9, legs: 0.9, antennae: 0.85, wings: 0.85 };
const FINE_FLOORS = { abdomen: 0.88, head: 0.84, legs: 0.77, antennae: 0.72, wings: 0.88 };
// Caption legibility (ticket #38), measured on the 1-bit caption band (the plate's bottom 45 px) against
// the binomial's own letter count: 'pieces' is 8-connected blobs per expected piece (one per letter plus
// one per i/j dot), 'specks' are blobs of one or two pixels, 'inkH' the ink height in device px. Measured
// 2026-10-07 on eight seeds at 440: the 16 px default caption scores pieces 1.6–2.0, specks 4–17, inkH 11
// (letters split in half, hairlines gone); 28 px scores ≤ 1.35 / ≤ 2 / 20 and 32 px ≤ 1.2 / 0 / 23 over the
// 41 plates here (a name with no descender is 5 px shorter, so inkH is the cap-to-ascender height, 18 at
// 32.7 px). The floors sit between those rows, with room for the runner's fallback font (DejaVu Serif, not
// Georgia). The band must also stay inside the plate with a margin at both sides.
const CAPTION = { piecesMax: 1.4, specksMax: 2, inkHMin: 16, sideMargin: 4, bandTop: Math.round(555 * DEVICE_PX / 600) };

// Gate layer -> engine layer keys and how the assembly places each one: 'single' (drawn once, it is
// symmetric), 'mirror' (right half plus a scale(-1,1) copy) or 'pairs' (legs: the copy of each pair is
// rotated by its skew about the coxa, L.legPairs). Mirror the plate's order in generateInsectDetailed.
const LAYERS = {
  abdomen: [['abdomen', 'single']],
  head: [['thoraxHead', 'single']],
  legs: [['legs', 'pairs']],
  antennae: [['antennae', 'mirror']],
  wings: [['covers', 'mirror'], ['wings', 'mirror'], ['tegulae', 'mirror']],
};
const LAYER_NAMES = Object.keys(LAYERS);

// ---- seeds: SEEDS_PER_TYPE per order, and per lepidoptera variant, by forcing the type ----
function pickSeeds() {
  const plates = [];
  for (const type of E.TYPES) {
    const want = type === 'moth' ? ['moth', 'butterfly'] : [null];
    for (const variant of want) {
      let n = 0;
      for (let seed = 1; n < SEEDS_PER_TYPE && seed < 10000; seed++) {
        const r = E.generateInsectDetailed(seed, { type, devicePx: DEVICE_PX });
        if (variant && r.meta.variant !== variant) continue;
        plates.push({ seed, type, label: r.meta.variant || r.meta.type, r });
        n++;
      }
    }
  }
  return plates;
}

// ---- one layer as its own plate: same transform and plate scale as the full plate ----
const fmt = n => Math.round(n * 10) / 10;
// `fine` keeps only the fragments drawn in the fine or detail weight (SW_F / SW_D; a fragment carrying
// mixed tokens stays, as does one with no stroke token, i.e. a white mask), so the fine-stroke survival
// is not hidden under the outline and heavy ink that dominate a layer's coverage.
const FINE = f => /SW_[FD]/.test(f) || !/SW_[HO]/.test(f);
function layerSvg(r, layer, fine) {
  const L = r.meta.layers, s = r.meta.scale, keep = fine ? FINE : () => true;
  const head = r.svg.match(/^[\s\S]*?<g transform="translate\([^"]*\) scale\([^"]*\)"[^>]*>/);
  if (!head) throw new Error('drawing group not found in the plate svg');
  let body = '';
  for (const [key, how] of LAYERS[layer]) {
    const els = (L[key] || []).filter(keep).join('');
    if (how === 'single') body += '<g>' + els + '</g>';
    else if (how === 'mirror') body += '<g>' + els + '</g><g><g transform="scale(-1,1)">' + els + '</g></g>';
    else body += '<g>' + els + '</g><g>' + (L.legPairs || []).map(pr =>
      '<g transform="scale(-1,1) rotate(' + fmt(pr.skew) + ' ' + fmt(pr.pivot[0]) + ' ' + fmt(pr.pivot[1]) + ')">' + pr.els.filter(keep).join('') + '</g>').join('') + '</g>';
  }
  const W = r.meta.weights;                                   // the plate's weights after its stroke floor
  const sw = v => String(Math.round(v / s * 1000) / 1000);   // the engine's token substitution
  return (head[0] + body + '</g></svg>').replace(/SW_H/g, sw(W.H)).replace(/SW_O/g, sw(W.O)).replace(/SW_D/g, sw(W.D)).replace(/SW_F/g, sw(W.F));
}

// ---- the panel pipeline (tests/raster.js): antialiased coverage before the threshold, black pixels after it ----
async function survival(svg, pngOut) {
  const grey = await raster.grey(svg, DEVICE_PX).raw().toBuffer({ resolveWithObject: true });
  let coverage = 0;
  for (let i = 0; i < grey.data.length; i += grey.info.channels) coverage += (255 - grey.data[i]) / 255;
  const bw = raster.bits(svg, DEVICE_PX);
  const bits = await bw.clone().raw().toBuffer({ resolveWithObject: true });
  let black = 0;
  for (let i = 0; i < bits.data.length; i += bits.info.channels) if (bits.data[i] === 0) black++;
  if (pngOut) await bw.png().toFile(pngOut);
  return { coverage, black, ratio: coverage > 0 ? black / coverage : null };
}

// ---- caption legibility: fragmentation of the thresholded band against the binomial's letter count ----
function blobs(data, w, h, isInk) {   // sizes of 8-connected ink components
  const seen = new Uint8Array(w * h), sizes = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !isInk(data[i])) continue;
    let n = 0; const stack = [i]; seen[i] = 1;
    while (stack.length) {
      const p = stack.pop(); n++;
      const x = p % w, y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!seen[q] && isInk(data[q])) { seen[q] = 1; stack.push(q); }
      }
    }
    sizes.push(n);
  }
  return sizes;
}
const expectedPieces = binomial => binomial.replace(/\s/g, '').length + (binomial.match(/[ij]/g) || []).length;
async function caption(r) {
  const top = CAPTION.bandTop;
  const { data, info } = await raster.bits(r.svg).extract({ left: 0, top, width: DEVICE_PX, height: DEVICE_PX - top }).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const ink = new Uint8Array(w * h);
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let i = 0; i < w * h; i++) if (data[i * ch] < 128) { ink[i] = 1; const x = i % w, y = (i - x) / w; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const sizes = blobs(ink, w, h, v => v === 1);
  return {
    pieces: sizes.length / expectedPieces(r.meta.name.binomial),
    specks: sizes.filter(n => n <= 2).length,
    inkH: maxY < 0 ? 0 : maxY - minY + 1,
    left: minX, right: w - 1 - maxX, top: minY, bottom: h - 1 - maxY,
  };
}

async function main() {
  const t0 = Date.now();
  const outDir = (() => { const i = process.argv.indexOf('--out'); return i >= 0 ? process.argv[i + 1] : null; })();
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  const plates = pickSeeds();
  const covered = new Set(plates.map(p => p.label));
  for (const t of E.TYPES) if (t !== 'moth' && !covered.has(t)) throw new Error('no seeds for ' + t);
  for (const v of ['moth', 'butterfly']) if (!covered.has(v)) throw new Error('no seeds for ' + v);
  if (plates.length < 30) throw new Error('only ' + plates.length + ' seeds; need at least 30');

  const rows = [];
  for (const p of plates) {
    const png = (layer, fine) => outDir && path.join(outDir, p.seed + '-' + p.label + '-' + layer + (fine ? '-fine' : '') + '.png');
    const cells = await Promise.all(LAYER_NAMES.flatMap(layer => [survival(layerSvg(p.r, layer, false), png(layer, false)), survival(layerSvg(p.r, layer, true), png(layer, true))]));
    const row = { seed: p.seed, label: p.label };
    LAYER_NAMES.forEach((layer, i) => { row[layer] = { all: cells[2 * i], fine: cells[2 * i + 1] }; });
    rows.push(row);
  }

  // table: one cell per layer, 'all/fine', '!' marking a value under its floor
  const failures = [], min = { all: {}, fine: {} }, floors = { all: FLOORS, fine: FINE_FLOORS };
  const one = (row, layer, kind) => {
    const v = row[layer][kind].ratio;
    if (v === null) return '   -';
    if (!(layer in min[kind]) || v < min[kind][layer]) min[kind][layer] = v;
    const bad = v < floors[kind][layer];
    if (bad) failures.push({ seed: row.seed, label: row.label, layer, kind, ratio: v, floor: floors[kind][layer] });
    return v.toFixed(2) + (bad ? '!' : '');
  };
  const pad = (s, n) => String(s).padEnd(n), W = 13;
  const cell = (row, layer) => (one(row, layer, 'all') + '/' + one(row, layer, 'fine')).padStart(W);
  console.log('e-ink survival gate: ' + plates.length + ' seeds, device ' + DEVICE_PX + ' px, threshold ' + THRESHOLD +
    ' (black px / antialiased ink per layer: all strokes / fine+detail strokes only)');
  console.log(pad('seed', 6) + pad('type', 12) + LAYER_NAMES.map(l => l.padStart(W)).join(''));
  for (const row of rows) console.log(pad(row.seed, 6) + pad(row.label, 12) + LAYER_NAMES.map(l => cell(row, l)).join(''));
  const f2 = v => v === undefined ? '-' : v.toFixed(2);
  console.log(pad('', 6) + pad('min', 12) + LAYER_NAMES.map(l => (f2(min.all[l]) + '/' + f2(min.fine[l])).padStart(W)).join(''));
  console.log(pad('', 6) + pad('floor', 12) + LAYER_NAMES.map(l => (FLOORS[l].toFixed(2) + '/' + FINE_FLOORS[l].toFixed(2)).padStart(W)).join(''));
  // caption legibility on the same plates, plus the longest and shortest binomials in the first 3000 seeds
  const named = {};
  for (let seed = 1; seed <= 3000; seed++) named[seed] = E.insectName(seed).binomial.length;
  const bySize = Object.keys(named).sort((a, b) => named[b] - named[a]);
  const extremes = [+bySize[0], +bySize[bySize.length - 1]].map(seed => ({ seed, r: E.generateInsectDetailed(seed, { devicePx: DEVICE_PX }) }));
  const capRows = [];
  for (const p of [...plates, ...extremes]) {
    const c = await caption(p.r);
    const bad = [];
    if (c.pieces > CAPTION.piecesMax) bad.push('pieces ' + c.pieces.toFixed(2) + ' > ' + CAPTION.piecesMax);
    if (c.specks > CAPTION.specksMax) bad.push('specks ' + c.specks + ' > ' + CAPTION.specksMax);
    if (c.inkH < CAPTION.inkHMin) bad.push('inkH ' + c.inkH + ' < ' + CAPTION.inkHMin);
    if (c.left < CAPTION.sideMargin || c.right < CAPTION.sideMargin) bad.push('margin ' + Math.min(c.left, c.right) + ' < ' + CAPTION.sideMargin);
    if (c.top < 1 || c.bottom < 1) bad.push('caption touches the band edge');
    capRows.push({ seed: p.seed, name: p.r.meta.name.binomial, c, bad });
    if (bad.length) failures.push({ seed: p.seed, label: 'caption', layer: p.r.meta.name.binomial, kind: bad.join(', '), ratio: c.pieces, floor: CAPTION.piecesMax });
  }
  console.log('\ncaption legibility (' + capRows.length + ' plates): pieces per letter <= ' + CAPTION.piecesMax + ', specks <= ' + CAPTION.specksMax + ', ink height >= ' + CAPTION.inkHMin + ' px');
  const worstBy = k => capRows.reduce((m, r) => r.c[k] > m.c[k] ? r : m);
  const wp = worstBy('pieces'), ws = worstBy('specks'), wh = capRows.reduce((m, r) => r.c.inkH < m.c.inkH ? r : m);
  console.log('  worst: pieces ' + wp.c.pieces.toFixed(2) + ' (' + wp.name + '), specks ' + ws.c.specks + ' (' + ws.name + '), ink height ' + wh.c.inkH + ' px (' + wh.name + '); ' + capRows.filter(r => r.bad.length).length + ' plate(s) failing');
  console.log((Date.now() - t0) / 1000 + ' s');

  if (failures.length) {
    failures.sort((a, b) => a.ratio - b.ratio);
    const worst = failures[0];
    console.error('\nFAIL: ' + failures.length + ' measure(s) under their floor; lowest is seed ' + worst.seed + ' ' + worst.label + ' ' +
      worst.layer + ' (' + worst.kind + ') at ' + worst.ratio.toFixed(3) + ' (floor ' + worst.floor + ')');
    for (const f of failures) console.error('  seed ' + f.seed + ' ' + f.label + ' ' + f.layer + ' ' + f.kind + ' ' + f.ratio.toFixed(3) + ' < ' + f.floor);
    process.exit(1);
  }
  console.log('OK');
}

main().catch(e => { console.error(e); process.exit(1); });
