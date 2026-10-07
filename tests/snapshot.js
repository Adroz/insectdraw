#!/usr/bin/env node
// Byte-identity fixture for engine refactors: hashes every plate the engine can draw for seeds 1..N
// (the web plate, the device plate at 440 for every 10th seed, every part crop for every 50th seed)
// and either writes them to a file or compares against one. A refactor that must not change any
// drawing (ticket #1) proves it with: snapshot before, refactor, compare after.
//   git show main:index.html > /tmp/old.html
//   node tests/snapshot.js write /tmp/before.json 3000 --engine /tmp/old.html    # the engine before the refactor
//   node tests/snapshot.js check /tmp/before.json 3000                           # the working tree's index.html
// `--engine <html>` points at another index.html (default: this repo's); the check fails unless the fixture holds
// exactly the keys this run produces, so a fixture written for a different N never passes by silence.
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const { loadEngine } = require('./engine.js');

const argv = process.argv.slice(2), ei = argv.indexOf('--engine'), enginePath = ei >= 0 ? argv.splice(ei, 2)[1] : undefined;
const [mode, file, nArg] = argv;
if (!['write', 'check'].includes(mode) || !file) { console.error('usage: node tests/snapshot.js write|check <file.json> [N] [--engine index.html]'); process.exit(2); }
const N = Number(nArg || 3000);
const E = loadEngine(enginePath);
const h = s => crypto.createHash('sha1').update(s).digest('hex');

const snap = {};
for (let seed = 1; seed <= N; seed++) {
  const r = E.generateInsectDetailed(seed);
  snap[seed] = h(r.svg) + ' ' + h(JSON.stringify(r.meta));
  if (seed % 10 === 0) snap['d' + seed] = h(E.generateInsect(seed, { devicePx: 440 }));
  if (seed % 50 === 0) for (const part of E.PARTS) snap['p' + seed + part] = h(E.generatePart(seed, r.meta.type, part).svg);
}

if (mode === 'write') { fs.writeFileSync(file, JSON.stringify(snap)); console.log('wrote', Object.keys(snap).length, 'hashes for seeds 1..' + N, 'to', file); process.exit(0); }
const before = JSON.parse(fs.readFileSync(file, 'utf8'));
const missing = Object.keys(snap).filter(k => !(k in before)), extra = Object.keys(before).filter(k => !(k in snap));
if (missing.length || extra.length) { console.log('FIXTURE MISMATCH: the fixture has', Object.keys(before).length, 'keys, this run', Object.keys(snap).length, '(was it written for N=' + N + '?)'); process.exit(1); }
const diff = Object.keys(before).filter(k => before[k] !== snap[k]);
if (diff.length) { console.log('DIFFERENT:', diff.length, 'of', Object.keys(before).length, 'e.g.', diff.slice(0, 10).join(' ')); process.exit(1); }
console.log('identical:', Object.keys(before).length, 'hashes for seeds 1..' + N);
