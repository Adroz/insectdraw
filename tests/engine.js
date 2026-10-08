// Shared engine loader for the node scripts (tests, scripts/render-daily.js): reads index.html, extracts the
// engine script (<script id="engine">…</script>) and runs it under vm, returning its module.exports. The
// engine itself stays dependency-free; only the node side goes through this file. The contract every
// consumer relies on is written in README.md ("Engine contract") and asserted here by engineContract(),
// which tests/check.js runs first.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ENGINE_RE = /<script id="engine">([\s\S]*?)<\/script>/;
const DEFAULT_HTML = path.join(__dirname, '..', 'index.html');
// what the engine exports; a consumer may rely on exactly these names (README "Engine contract")
const EXPORTS = ['generateInsect', 'generateInsectDetailed', 'generatePart', 'insectName', 'dailySeed', 'brisbaneDay', 'hashString', 'mulberry32', 'TYPES', 'ORDERS', 'PARTS', 'DEVICE', 'SW_PX', 'CAPTION_H'];

function loadEngine(htmlPath) {
  const file = htmlPath || DEFAULT_HTML;
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(ENGINE_RE);
  if (!m) throw new Error('engine script not found in ' + file);
  const ctx = { module: { exports: {} }, console };
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx, { filename: file });
  return ctx.module.exports;
}

// The engine contract, as a list of violations (empty when the file honours it):
//  - exactly one <script id="engine"> block, and it is the one that assigns module.exports (so a consumer that
//    selects "the script block containing module.exports", as the crowpanel-ha Dockerfile does, gets the same
//    block as one that selects the tag);
//  - the engine touches no browser global (document, window, location, history, navigator, fetch, storage):
//    pure generation, the same under node vm as in a page;
//  - it exports exactly EXPORTS, and generateInsect(seed) is deterministic (tests/check.js asserts that per seed).
function engineContract(htmlPath) {
  const file = htmlPath || DEFAULT_HTML;
  const html = fs.readFileSync(file, 'utf8'), problems = [];
  const tagged = [...html.matchAll(new RegExp(ENGINE_RE.source, 'g'))];
  if (tagged.length !== 1) { problems.push('expected exactly one <script id="engine"> block, found ' + tagged.length); return problems; }
  const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const exporting = blocks.filter(b => b.includes('module.exports'));
  if (exporting.length !== 1) problems.push('expected exactly one script block assigning module.exports, found ' + exporting.length);
  else if (exporting[0] !== tagged[0][1]) problems.push('the block containing module.exports is not the <script id="engine"> block');
  // the DOM-global scan runs on the code alone: string literals (single, double, single-line template) are blanked
  // first, then comments, so a `//` inside a URL string is not taken for a comment; a quote inside a comment can only
  // blank the rest of its own line, since none of the patterns crosses a newline
  const code = tagged[0][1].replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/`(?:[^`\\\n]|\\.)*`/g, '``')
    .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const g of ['document', 'window', 'location', 'history', 'navigator', 'fetch', 'localStorage', 'sessionStorage']) {
    const n = (code.match(new RegExp('\\b' + g + '\\b', 'g')) || []).length;
    if (n) problems.push('the engine references the browser global `' + g + '` ' + n + ' time(s)');
  }
  // run it the way every node consumer does; a block that throws here (a DOM global reached at load, a syntax error)
  // is a violation to report, not a stack trace to decode
  let E;
  try { E = loadEngine(file); } catch (e) { problems.push('the engine block throws when run under vm: ' + e.message); return problems; }
  const got = Object.keys(E).sort(), want = EXPORTS.slice().sort();
  if (got.join() !== want.join()) problems.push('exports differ from the contract: got [' + got + '], contract [' + want + ']');
  return problems;
}

module.exports = { loadEngine, engineContract, EXPORTS };
