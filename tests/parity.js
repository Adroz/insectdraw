#!/usr/bin/env node
// Parity guard for the parallel check.js (#77): the sharded run must print what the serial run prints.
//
//   node tests/parity.js [A-B]      (default 1-150; npm run check:parity)
//
// 1. Static: every module-scope run accumulator in tests/check.js (a top-level `let`, or a lower-case `const` bound to
//    an object, array, Map / Set or number) is named in its RUN_STATE merge table or in RUN_STATE_SKIP. An accumulator
//    the workers fill but the parent never merges is the failure this ticket guards against; this half catches it even
//    when the range below never makes it visible in the report.
// 2. Dynamic: the same seed range, every check, run with --jobs 1 (in-process, serial) and --jobs 3 (three workers),
//    both concurrently; stdout and the exit code must match byte for byte, apart from the "daily seed today" line,
//    which reads the clock. 1-150 puts a sampled (every 50th) seed in each of the three shards.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHECK = path.join(__dirname, 'check.js');
const range = process.argv[2] || '1-150';
if (!/^\d+-\d+$/.test(range)) { console.error('usage: node tests/parity.js [A-B]'); process.exit(2); }
let bad = 0;
const fail = msg => { bad++; console.log('FAIL', msg); };

// ---- 1. static: the merge table covers every module-scope accumulator ----
const { RUN_STATE, RUN_STATE_SKIP } = require('./check');
const covered = new Set([...Object.keys(RUN_STATE), ...RUN_STATE_SKIP]);
const declared = [];
for (const line of fs.readFileSync(CHECK, 'utf8').split('\n')) {
  let m = /^let (.*?);/.exec(line);
  if (m) { for (const d of m[1].split(',')) { const n = /^\s*(\w+)\s*=/.exec(d); if (n) declared.push(n[1]); } continue; }
  m = /^const ([a-z]\w*) = (\{|\[|new (Map|Set)\b|-?\d|Infinity)/.exec(line);
  if (m) declared.push(m[1]);
}
const missing = declared.filter(n => !covered.has(n)), stale = [...covered].filter(n => !declared.includes(n));
if (missing.length) fail('module-scope state not in check.js RUN_STATE (or RUN_STATE_SKIP): ' + missing.join(', '));
if (stale.length) fail('RUN_STATE / RUN_STATE_SKIP name no module-scope declaration: ' + stale.join(', '));
console.log('static: ' + declared.length + ' module-scope declarations, ' + Object.keys(RUN_STATE).length + ' merged, ' + RUN_STATE_SKIP.length + ' skipped');

// ---- 2. dynamic: --jobs 1 and --jobs 3 print the same report ----
const runCheck = jobs => new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [CHECK, '--seeds', range, '--jobs', String(jobs)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.on('error', reject);
  p.on('close', code => resolve({ code, out: out.split('\n').filter(l => !l.startsWith('daily seed today:')).join('\n'), err }));
});
(async () => {
  const t0 = Date.now();
  const [one, three] = await Promise.all([runCheck(1), runCheck(3)]);
  for (const [name, r] of [['--jobs 1', one], ['--jobs 3', three]]) if (r.err) console.log(name + ' stderr:\n' + r.err.trimEnd());
  if (!/^seeds checked:/m.test(one.out)) fail('--jobs 1 printed no report (exit ' + one.code + ')');
  if (one.code !== three.code) fail('exit codes differ: --jobs 1 ' + one.code + ', --jobs 3 ' + three.code);
  if (one.out !== three.out) {
    const a = one.out.split('\n'), b = three.out.split('\n');
    const i = a.findIndex((l, k) => l !== b[k]);
    fail('stdout differs from line ' + (i + 1) + ':\n  --jobs 1: ' + a[i] + '\n  --jobs 3: ' + b[i]);
  }
  console.log('dynamic: seeds ' + range + ', --jobs 1 vs --jobs 3, ' + one.out.split('\n').length + ' lines, ' + Math.round((Date.now() - t0) / 1000) + ' s');
  if (bad) { console.log('PARITY FAILED: ' + bad); process.exit(1); }
  console.log('parity OK');
})().catch(e => { console.error(e); process.exit(1); });
