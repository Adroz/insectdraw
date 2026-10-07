#!/usr/bin/env node
// Renders the daily plate (spec #32, ticket #36): the device plate for one Brisbane calendar day, written as
//   insect.svg   the device plate (generateInsectDetailed(seed, { devicePx: 440 }))
//   insect.png   the device raster: 440×440, 1-bit palette, through the panel's exact pipeline
//                (resize to the device size on white, flatten, grayscale, threshold 128; ADR 0001, tests/eink.js)
//   insect.json  the sidecar: { date, seed, name, devicePx }
// The seed is hashString(date), the seed the web page's Daily button picks on that day (dailySeed, ADR 0002).
// This is the only thing .github/workflows/daily.yml runs besides checkout, install and the deploy actions;
// it is also how any published day is reproduced locally:
//   node scripts/render-daily.js                      # today's Brisbane day into daily/
//   node scripts/render-daily.js 2026-01-01           # a given day (YYYY-MM-DD, Brisbane calendar day)
//   node scripts/render-daily.js 2026-01-01 --out DIR # into DIR (created if missing)
// Caption fonts: the plate asks for Georgia; where it is missing (GitHub's ubuntu runner) librsvg falls back
// through fontconfig, so the workflow installs fonts-dejavu-core and the caption renders in DejaVu Serif.
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const E = require(path.join(__dirname, '..', 'tests', 'engine')).loadEngine();

const DEVICE_PX = 440;     // TRMNL panel device size
const THRESHOLD = 128;     // fixed (ADR 0001)

// Brisbane calendar day of an instant: UTC+10, no daylight saving (ADR 0002); same arithmetic as dailySeed.
const brisbaneDay = date => new Date(date.getTime() + 10 * 3600e3).toISOString().slice(0, 10);

function parseArgs(argv) {
  let date = null, out = 'daily';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out = argv[++i];
    else if (a === '--date') date = argv[++i];
    else if (/^\d{4}-\d{2}-\d{2}$/.test(a) && date === null) date = a;
    else throw new Error('usage: render-daily.js [YYYY-MM-DD] [--out DIR] (got ' + JSON.stringify(a) + ')');
  }
  if (!out) throw new Error('--out needs a directory');
  if (date === null) date = brisbaneDay(new Date());
  // the day is taken as a Brisbane calendar day: its first instant is YYYY-MM-DDT00:00+10:00, and it must round-trip
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || brisbaneDay(new Date(date + 'T00:00:00+10:00')) !== date) throw new Error('not a calendar day: ' + date);
  return { date, out };
}

const pipeline = svg => sharp(Buffer.from(svg)).resize(DEVICE_PX, DEVICE_PX, { fit: 'contain', background: '#ffffff' })
  .flatten({ background: '#ffffff' }).grayscale().threshold(THRESHOLD);

async function main() {
  const { date, out } = parseArgs(process.argv.slice(2));
  const seed = E.hashString(date);
  if (seed !== E.dailySeed(new Date(date + 'T00:00:00+10:00'))) throw new Error('seed disagrees with dailySeed for ' + date);
  const r = E.generateInsectDetailed(seed, { devicePx: DEVICE_PX });
  // 1-bit palette PNG: two colours after the threshold, so the palette is exactly black and white
  const png = await pipeline(r.svg).png({ palette: true, colours: 2 }).toBuffer();
  const sidecar = { date, seed, name: r.meta.name, devicePx: DEVICE_PX };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'insect.svg'), r.svg);
  fs.writeFileSync(path.join(out, 'insect.png'), png);
  fs.writeFileSync(path.join(out, 'insect.json'), JSON.stringify(sidecar, null, 2) + '\n');
  console.log(date + ' seed ' + seed + ' ' + r.meta.name.binomial + ' (' + (r.meta.variant || r.meta.type) + ') -> ' + path.resolve(out) + '/insect.{svg,png,json}');
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
