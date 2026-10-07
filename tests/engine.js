// Shared engine loader for the test scripts: reads index.html, extracts the engine script
// (<script id="engine">…</script>) and runs it under vm, returning its module.exports
// (generateInsect, generateInsectDetailed, generatePart, insectName, dailySeed, TYPES, PARTS ...).
// The engine itself stays dependency-free; only the tests go through node.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadEngine(htmlPath) {
  const file = htmlPath || path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('engine script not found in ' + file);
  const ctx = { module: { exports: {} }, console };
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx, { filename: file });
  return ctx.module.exports;
}

module.exports = { loadEngine };
