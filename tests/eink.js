#!/usr/bin/env node
// E-ink survival gate (spec #32, ticket #33). Generates device plates for a fixed set of seeds covering
// every order and both lepidoptera variants, rasterises each layer through the panel's exact pipeline
// (resize to the device size on white, flatten, grayscale, threshold 128) and measures survival per
// layer: black pixels after the threshold divided by the antialiased ink coverage of the same render.
// Fails when any layer drops under its floor. Layers are isolated from meta.layers the way the
// assembly in generateInsectDetailed builds the plate, so no engine change is needed.
//   npm test                         # or: node tests/eink.js
//   node tests/eink.js --out DIR     # also writes the 1-bit layer rasters (seed-type-layer.png) to DIR
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const E = require('./engine').loadEngine();

// ---- contract (ADR 0001) ----
const DEVICE_PX = 440;          // TRMNL panel: the plate is shown at 440 device px
const THRESHOLD = 128;          // fixed; raising it was measured and rejected
const SEEDS_PER_TYPE = 3;       // per order, and per lepidoptera variant
// Survival floors per layer. Measured 2026-10-07 on 39 seeds: today's engine bottoms out at abdomen 0.45,
// head 0.62, legs 0.86, antennae 0.51, wings 0.54 (hatching, segment lines, striae, crossveins and antenna
// rami are fine strokes that never cover half a device pixel). The same plates with every stroke floored
// to 1.0 device px post hoc score at least abdomen 0.99, head 0.97, legs 1.01, antennae 0.92, wings 1.00,
// so the floors sit under those with margin; the engine ticket confirms them green with the real floors.
const FLOORS = { abdomen: 0.9, head: 0.9, legs: 0.9, antennae: 0.85, wings: 0.85 };

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
function layerSvg(r, layer) {
  const L = r.meta.layers, s = r.meta.scale;
  const head = r.svg.match(/^[\s\S]*?<g transform="translate\([^"]*\) scale\([^"]*\)"[^>]*>/);
  if (!head) throw new Error('drawing group not found in the plate svg');
  let body = '';
  for (const [key, how] of LAYERS[layer]) {
    const els = (L[key] || []).join('');
    if (how === 'single') body += '<g>' + els + '</g>';
    else if (how === 'mirror') body += '<g>' + els + '</g><g><g transform="scale(-1,1)">' + els + '</g></g>';
    else body += '<g>' + els + '</g><g>' + (L.legPairs || []).map(pr =>
      '<g transform="scale(-1,1) rotate(' + fmt(pr.skew) + ' ' + fmt(pr.pivot[0]) + ' ' + fmt(pr.pivot[1]) + ')">' + pr.els.join('') + '</g>').join('') + '</g>';
  }
  const sw = v => String(Math.round(v / s * 1000) / 1000);   // the engine's token substitution
  return (head[0] + body + '</g></svg>').replace(/SW_H/g, sw(2.2)).replace(/SW_O/g, sw(1.5)).replace(/SW_D/g, sw(0.8)).replace(/SW_F/g, sw(0.5));
}

// ---- the panel pipeline ----
const pipeline = svg => sharp(Buffer.from(svg)).resize(DEVICE_PX, DEVICE_PX, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).grayscale();
async function survival(svg, pngOut) {
  const grey = await pipeline(svg).raw().toBuffer({ resolveWithObject: true });
  let coverage = 0;
  for (let i = 0; i < grey.data.length; i += grey.info.channels) coverage += (255 - grey.data[i]) / 255;
  const bw = pipeline(svg).threshold(THRESHOLD);
  const bits = await bw.clone().raw().toBuffer({ resolveWithObject: true });
  let black = 0;
  for (let i = 0; i < bits.data.length; i += bits.info.channels) if (bits.data[i] === 0) black++;
  if (pngOut) await bw.png().toFile(pngOut);
  return { coverage, black, ratio: coverage > 0 ? black / coverage : null };
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
    const cells = await Promise.all(LAYER_NAMES.map(layer => survival(layerSvg(p.r, layer), outDir && path.join(outDir, p.seed + '-' + p.label + '-' + layer + '.png'))));
    const row = { seed: p.seed, label: p.label };
    LAYER_NAMES.forEach((layer, i) => { row[layer] = cells[i]; });
    rows.push(row);
  }

  // table
  const failures = [], min = {};
  const cell = (row, layer) => {
    const v = row[layer].ratio;
    if (v === null) return '       - ';
    if (!(layer in min) || v < min[layer]) min[layer] = v;
    const bad = v < FLOORS[layer];
    if (bad) failures.push({ seed: row.seed, label: row.label, layer, ratio: v });
    return v.toFixed(2).padStart(8) + (bad ? '!' : ' ');
  };
  const pad = (s, n) => String(s).padEnd(n);
  console.log('e-ink survival gate: ' + plates.length + ' seeds, device ' + DEVICE_PX + ' px, threshold ' + THRESHOLD + ' (black px / antialiased ink per layer)');
  console.log(pad('seed', 6) + pad('type', 12) + LAYER_NAMES.map(l => l.padStart(9)).join(''));
  for (const row of rows) console.log(pad(row.seed, 6) + pad(row.label, 12) + LAYER_NAMES.map(l => cell(row, l)).join(''));
  console.log(pad('', 6) + pad('min', 12) + LAYER_NAMES.map(l => (l in min ? min[l].toFixed(2) : '-').padStart(8) + ' ').join(''));
  console.log(pad('', 6) + pad('floor', 12) + LAYER_NAMES.map(l => FLOORS[l].toFixed(2).padStart(8) + ' ').join(''));
  console.log((Date.now() - t0) / 1000 + ' s');

  if (failures.length) {
    failures.sort((a, b) => a.ratio - b.ratio);
    const worst = failures[0];
    console.error('\nFAIL: ' + failures.length + ' layer(s) under their survival floor; lowest is seed ' + worst.seed + ' ' + worst.label + ' ' + worst.layer +
      ' at ' + worst.ratio.toFixed(3) + ' (floor ' + FLOORS[worst.layer] + ')');
    for (const f of failures) console.error('  seed ' + f.seed + ' ' + f.label + ' ' + f.layer + ' ' + f.ratio.toFixed(3) + ' < ' + FLOORS[f.layer]);
    process.exit(1);
  }
  console.log('OK');
}

main().catch(e => { console.error(e); process.exit(1); });
