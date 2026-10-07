#!/usr/bin/env node
// Daily plate check (spec #32, ticket #36). Runs scripts/render-daily.js the way the workflow does, for a
// fixed Brisbane calendar day into a temp dir, and asserts what a consumer of the published files sees:
// the three files, the sidecar fields, the device raster (440×440, 1-bit, black and white only) and the seed
// (the FNV-1a hash of the date, the same seed the web page's Daily button picks on that day).
//   npm run check:daily              # or: node tests/daily.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');
const E = require('./engine').loadEngine();
const { DEVICE_PX } = require('./raster');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'render-daily.js');
const DATE = '2026-01-01';

function render(args) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'insectdraw-daily-'));
  execFileSync(process.execPath, [SCRIPT, ...args, '--out', dir], { stdio: ['ignore', 'pipe', 'pipe'] });
  const read = f => fs.readFileSync(path.join(dir, f));
  return { dir, svg: read('insect.svg').toString('utf8'), png: read('insect.png'), json: JSON.parse(read('insect.json').toString('utf8')) };
}

async function main() {
  const t0 = Date.now();
  const a = render([DATE]);

  // sidecar: the four fields of the consumer contract
  const seed = E.hashString(DATE);
  assert.strictEqual(a.json.date, DATE, 'json.date is the requested Brisbane calendar day');
  assert.strictEqual(a.json.seed, seed, 'json.seed is hashString(date), the seed the Daily button picks');
  assert.strictEqual(a.json.devicePx, DEVICE_PX, 'json.devicePx is the device size');
  assert.strictEqual(typeof a.json.name, 'object', 'json.name is the meta name object');
  for (const k of ['genus', 'species', 'common', 'binomial']) assert.strictEqual(typeof a.json.name[k], 'string', 'json.name.' + k);
  assert.deepStrictEqual(Object.keys(a.json).sort(), ['date', 'devicePx', 'name', 'seed'], 'json carries exactly the four fields');

  // the seed is the one dailySeed picks for any instant of that Brisbane day
  assert.strictEqual(E.dailySeed(new Date(DATE + 'T00:00:00+10:00')), seed, 'first instant of the Brisbane day');
  assert.strictEqual(E.dailySeed(new Date(DATE + 'T23:59:59+10:00')), seed, 'last instant of the Brisbane day');

  // svg: the device plate of that seed, with the binomial caption and no subtitle (device rule at 440)
  assert.strictEqual(a.svg, E.generateInsectDetailed(seed, { devicePx: DEVICE_PX }).svg, 'svg is the device plate of the seed');
  assert.ok(a.svg.includes(a.json.name.binomial), 'svg carries the binomial caption');
  assert.ok(!a.svg.includes(a.json.name.common), 'svg drops the common-name subtitle at 440');

  // png: 440×440, 1-bit palette, only black and white pixels, with ink on it
  assert.strictEqual(a.png.readUInt32BE(0), 0x89504e47, 'png signature');
  assert.strictEqual(a.png[24], 1, 'png IHDR bit depth is 1');
  assert.strictEqual(a.png[25], 3, 'png IHDR colour type is indexed (palette)');
  const img = sharp(a.png);
  const m = await img.metadata();
  assert.strictEqual(m.width, DEVICE_PX, 'png width');
  assert.strictEqual(m.height, DEVICE_PX, 'png height');
  const raw = await img.grayscale().raw().toBuffer({ resolveWithObject: true });
  let black = 0, other = 0;
  for (let i = 0; i < raw.data.length; i += raw.info.channels) {
    const v = raw.data[i];
    if (v === 0) black++; else if (v !== 255) other++;
  }
  assert.strictEqual(other, 0, 'every pixel is pure black or pure white');
  const frac = black / (DEVICE_PX * DEVICE_PX);
  assert.ok(frac > 0.01 && frac < 0.5, 'plate has ink without filling in (black fraction ' + frac.toFixed(3) + ')');

  // deterministic: a second run for the same day writes the same bytes
  const b = render([DATE]);
  assert.strictEqual(b.svg, a.svg, 'svg is deterministic');
  assert.ok(b.png.equals(a.png), 'png is deterministic');
  assert.deepStrictEqual(b.json, a.json, 'json is deterministic');

  // no date: today's Brisbane calendar day (ADR 0002; the engine's brisbaneDay is what dailySeed hashes)
  const today = E.brisbaneDay(new Date());
  const c = render([]);
  assert.strictEqual(c.json.date, today, 'default date is today in Brisbane');
  assert.strictEqual(c.json.seed, E.dailySeed(), 'default seed is dailySeed()');

  // a malformed date is refused, nothing half-written
  assert.throws(() => render(['2026-1-1']), 'malformed date exits non-zero');
  assert.throws(() => render(['2026-13-01']), 'impossible date exits non-zero');

  for (const r of [a, b, c]) fs.rmSync(r.dir, { recursive: true, force: true });
  console.log('daily plate OK: ' + DATE + ' seed ' + seed + ' ' + a.json.name.binomial + ', ' + DEVICE_PX + '×' + DEVICE_PX + ' 1-bit, ' +
    (black / (DEVICE_PX * DEVICE_PX) * 100).toFixed(1) + '% ink, ' + (Date.now() - t0) / 1000 + ' s');
}

main().catch(e => { console.error(e); process.exit(1); });
