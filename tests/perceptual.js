#!/usr/bin/env node
// Perceptual uniqueness report (#30): do the plates of one type look like different insects at a glance?
// `bodySig` / `wingSig` count discrete genes, so two plates can differ in every gene and still read as one insect
// redrawn (GLOSSARY "Distinct insects"). This measures what the eye gets from a contact sheet instead. Every plate of a type is rendered as a
// 100 px greyscale thumbnail through the panel pipeline (tests/raster.js `grey`, the caption band cropped off so the
// name never counts), blurred (gaussian, sigma 3 px) so a line that moved by a pixel or two is not a different
// insect, and every pair is compared by its ink difference: sum |inkA - inkB| / sum (inkA + inkB), in %, where
// ink = 255 - grey (0 = the same drawing, 100 = no ink in common). Dividing by the ink keeps a dense plate (a moth
// with its pattern bands) and a sparse one (a crane fly of thin legs) on one scale. The criterion is the smallest
// such difference between any two plates of the type: the two closest plates are the ones that read as one insect.
//
//   node tests/perceptual.js                       # 60 plates per type, every type (about a minute)
//   node tests/perceptual.js 60 --type cicada      # one type (butterfly, or moth:moth, for a moth variant)
//   node tests/perceptual.js 60 --from 61          # seeds 61..120 instead of 1..60 (a second sample)
//   node tests/perceptual.js 60 --pairs 3          # list the three closest pairs per type, to render with tests/sheet.js
//   node tests/perceptual.js 60 --view body        # the plate without its wings (diagnostic: is it the body that repeats?)
//   node tests/perceptual.js 60 --json out.json    # also write the per-type numbers and closest seeds
//
// Seeds: plate k of type T is generateInsectDetailed(k, { type: T }) for k = from..from+N-1 (the forced type keeps
// every other roll of seed k), so a run is deterministic and a before/after pair of runs compares the same seeds. A
// moth variant takes the forced-moth plates from `from` on whose roll lands on that variant, until N are found; if
// fewer than N turn up in 20 * N seeds the script exits 2 rather than report a smaller sample (a smaller sample has
// fewer pairs, so a higher minimum: it would read "above floor" only for being measured on fewer plates).
//
// Columns: min (the criterion) and its pair; p5 and median of all pairs; sheet9, the median over 300 fixed 9-plate
// subsets of each subset's closest pair (what one contact sheet of `random:9` shows).
//
// The floor (FLOOR, FLOOR_BY_TYPE below), its calibration numbers and how a ticket uses the report live in one place,
// docs/plan-body-variation.md "Perceptual criterion"; this script holds only the values. It is a REPORT, not a gate: a
// type under its floor prints "below floor" and the script still exits 0. The minimum falls as N grows (more pairs,
// one of them closer) and moves by about +-1 between seed blocks, so compare runs only at the same N and seeds.
'use strict';
const fs = require('fs');
const { grey } = require('./raster');
const E = require('./engine').loadEngine();

const THUMB = 100;           // thumbnail size in px: one plate of a contact sheet seen whole
const BLUR = 3;              // gaussian sigma in thumbnail px
const FLOOR = 10.0;          // min pairwise ink difference (%), see docs/plan-body-variation.md "Perceptual criterion"
// Thin-line plates (crane fly legs, fly wing margin) score high for the same insect redrawn, so they are held to the
// wasp's level (docs/plan-body-variation.md "Floor"). A test-side table on purpose while the floor is a report and due
// for re-tuning; it moves into ORDERS when tests/check.js gates on it.
const FLOOR_BY_TYPE = { cranefly: 12.5, fly: 12.5 };
const floorOf = group => FLOOR_BY_TYPE[group.split(':')[0]] || FLOOR;
const DEFAULT_N = 60;

const argv = process.argv.slice(2), flag = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv.splice(i, 2)[1] : null; };
const only = flag('type'), jsonOut = flag('json'), view = flag('view') || 'plate';
const pairsArg = Number(flag('pairs') || 1), from = Number(flag('from') || 1);
const N = Number(argv[0] || DEFAULT_N);
const usage = 'usage: node tests/perceptual.js [N>=9] [--type t] [--from seed] [--pairs k] [--view plate|body] [--json out.json]';
if (!(N >= 9) || !(from >= 1) || !['plate', 'body'].includes(view)) { console.error(usage); process.exit(2); }

// every type, with the moth's two variants after it (the audit judged them apart: moth 2/9, butterfly 1/9); a moth
// variant is spelled `moth:<variant>`, and `butterfly` alone is accepted for `moth:butterfly`
const MOTH_VARIANTS = ['moth', 'butterfly'];
const all = E.TYPES.flatMap(t => (t === 'moth' ? ['moth'].concat(MOTH_VARIANTS.map(v => 'moth:' + v)) : [t]));
const groups = only ? [only === 'butterfly' ? 'moth:butterfly' : only] : all;
for (const group of groups) if (!all.includes(group)) { console.error('unknown type ' + group + '; one of ' + all.join(', ') + ', butterfly'); process.exit(2); }

// The plate without the caption band: the viewBox stops above it. The body view redraws the plate's own layers
// at the plate's own transform, minus the wings, elytra and tegulae (the stacking order of assemblePlate in index.html).
// Every layer the engine returns must be named in one of the two lists below, so a new or renamed layer stops the
// script instead of going silently missing from the body view.
const BODY_LAYERS = ['legs', 'abdomen', 'thoraxHead', 'antennae'];   // assemblePlate's order, wing layers removed
const NOT_BODY = ['covers', 'wings', 'tegulae', 'legPairs'];          // dropped on purpose; legPairs is the legs' mirror data
const PLATE_H = 600 - E.CAPTION_H;
const HEAD = 'viewBox="0 0 600 600" width="600" height="600"', CROP = 'viewBox="0 0 600 ' + PLATE_H + '" width="600" height="' + PLATE_H + '"';
function plateSvg(plate) {
  if (!plate.svg.includes(HEAD)) throw new Error('plate header changed; update tests/perceptual.js');
  if (view === 'plate') return plate.svg.replace(HEAD, CROP);
  const L = plate.meta.layers, stray = Object.keys(L).filter(k => !BODY_LAYERS.includes(k) && !NOT_BODY.includes(k));
  if (stray.length) throw new Error('layer ' + stray.join(', ') + ' not in BODY_LAYERS or NOT_BODY; update tests/perceptual.js');
  const fit = plate.svg.match(/<g transform="translate\(([^)]*)\) scale\(([^)]*)\)"/), scale = Number(fit[2]);
  const mirrored = (k, pairs) => '<g>' + L[k].join('') + '</g><g>' + (pairs
    ? pairs.map(p => '<g transform="scale(-1,1) rotate(' + p.skew + ' ' + p.pivot[0] + ' ' + p.pivot[1] + ')">' + p.els.join('') + '</g>').join('')
    : '<g transform="scale(-1,1)">' + L[k].join('') + '</g>') + '</g>';
  const w = plate.meta.weights, sw = v => String(Math.round(v / scale * 1000) / 1000);
  return ('<svg xmlns="http://www.w3.org/2000/svg" ' + CROP + '><rect width="600" height="600" fill="#fff"/>' +
    '<g transform="translate(' + fit[1] + ') scale(' + fit[2] + ')" stroke="#000" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
    BODY_LAYERS.map(k => (k === 'legs' ? mirrored('legs', L.legPairs) : k === 'antennae' ? mirrored('antennae') : '<g>' + L[k].join('') + '</g>')).join('') +
    '</g></svg>').replace(/SW_H/g, sw(w.H)).replace(/SW_O/g, sw(w.O)).replace(/SW_D/g, sw(w.D)).replace(/SW_F/g, sw(w.F));
}

// ink thumbnail: 0 = white, 255 = black, after the blur
async function inkThumb(svg) {
  const px = await grey(svg, THUMB).blur(BLUR).raw().toBuffer();
  const ink = new Float64Array(px.length); for (let i = 0; i < px.length; i++) ink[i] = 255 - px[i];
  return ink;
}
const inkDiff = (a, b) => { let d = 0, n = 0; for (let i = 0; i < a.length; i++) { d += Math.abs(a[i] - b[i]); n += a[i] + b[i]; } return n ? 100 * d / n : 0; };

function seedsFor(group) {
  const [type, want] = group.split(':'), out = [];
  for (let seed = from; out.length < N && seed < from + N * 20; seed++) {
    const plate = E.generateInsectDetailed(seed, { type });
    if (want && plate.meta.variant !== want) continue;
    out.push({ seed, svg: plateSvg(plate) });
  }
  if (out.length < N) { console.error(group + ': only ' + out.length + ' of ' + N + ' plates in seeds ' + from + '..' + (from + N * 20 - 1) + '; not reporting a smaller sample'); process.exit(2); }
  return out;
}

const quant = (xs, q) => { const v = xs.slice().sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.floor(q * (v.length - 1)))]; };

(async () => {
  const rows = [], f = v => v.toFixed(2);
  console.log('perceptual: ' + view + ', ' + N + ' plates per type from seed ' + from + ', ' + THUMB + ' px thumbnails, blur ' + BLUR +
    ', ink difference (%), floor ' + FLOOR.toFixed(1) +
    ' (' + Object.entries(FLOOR_BY_TYPE).map(([t, v]) => t + ' ' + v.toFixed(1)).join(', ') + ')');
  console.log('type'.padEnd(16) + 'min'.padStart(7) + 'p5'.padStart(7) + 'median'.padStart(8) + 'sheet9'.padStart(8) + '   closest pair');
  for (const group of groups) {
    const plates = seedsFor(group), th = [];
    for (const p of plates) th.push(await inkThumb(p.svg));
    const count = th.length, dist = Array.from({ length: count }, () => new Float64Array(count)), allDiffs = [], pairs = [];
    for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
      const v = inkDiff(th[i], th[j]); dist[i][j] = dist[j][i] = v; allDiffs.push(v); pairs.push([v, plates[i].seed, plates[j].seed]);
    }
    pairs.sort((a, b) => a[0] - b[0]);
    // sheet9 subsets from a fixed LCG, so the column is deterministic
    let lcgState = 12345; const lcg = () => (lcgState = (lcgState * 1103515245 + 12345) >>> 0) / 4294967296; const s9 = [];
    for (let k = 0; k < 300; k++) {
      const pick = []; while (pick.length < 9) { const x = Math.floor(lcg() * count); if (!pick.includes(x)) pick.push(x); }
      let mn = Infinity; for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) mn = Math.min(mn, dist[pick[a]][pick[b]]);
      s9.push(mn);
    }
    const row = { type: group, n: count, floor: floorOf(group), min: pairs[0][0], p5: quant(allDiffs, 0.05), median: quant(allDiffs, 0.5), sheet9: quant(s9, 0.5),
      closest: pairs.slice(0, Math.max(1, pairsArg)).map(([v, a, b]) => ({ diff: +v.toFixed(2), seeds: [a, b] })) };
    rows.push(row);
    console.log(group.padEnd(16) + f(row.min).padStart(7) + f(row.p5).padStart(7) + f(row.median).padStart(8) + f(row.sheet9).padStart(8) +
      '   ' + row.closest[0].seeds.join(',') + (row.min < row.floor ? '   below floor ' + row.floor.toFixed(1) : ''));
    for (const c of row.closest.slice(1)) console.log(''.padEnd(46) + c.seeds.join(',') + '  ' + f(c.diff));
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ view, n: N, from, thumb: THUMB, blur: BLUR, floor: FLOOR, floorByType: FLOOR_BY_TYPE, rows }, null, 1));
  const below = rows.filter(row => row.min < row.floor).map(row => row.type);
  console.log('perceptual: ' + (below.length ? below.length + ' of ' + rows.length + ' below their floor: ' + below.join(', ')
    : 'every type above its floor') + ' (report only, not a gate)');
})().catch(e => { console.error(e); process.exit(1); });
