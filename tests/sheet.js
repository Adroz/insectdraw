#!/usr/bin/env node
// Renders a contact sheet of seeds to PNG with headless Chromium (no server needed).
//   node tests/sheet.js out.png 3 20,69,70,71,80,82        # 3 columns
//   node tests/sheet.js out.png 3 wasp                      # first 6 seeds of a type (or variant)
//   node tests/sheet.js out.png 3 wasp:12                   # first 12 seeds of a type
//   node tests/sheet.js out.png 4 wasp:12 --part wings      # just that part of each insect (wings|legs|antennae|head|abdomen|body)
//   node tests/sheet.js out.png 4 random:12 --type wasp     # 12 random seeds, every one forced to be a wasp
// Set CHROMIUM to point at a Chrome/Chromium binary if it is not on the default path.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2), flag = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv.splice(i, 2)[1] : null; };
const part = flag('part'), forceType = flag('type');
const [outPng, colsArg, seedsArg] = argv;
if (!outPng || !seedsArg) { console.error('usage: node tests/sheet.js out.png <cols> <seeds,comma | type[:count]>'); process.exit(2); }
const cols = Number(colsArg || 3);

const E = require('./engine').loadEngine();

let seeds;
if (/^\d+(,\d+)*$/.test(seedsArg)) {
  seeds = seedsArg.split(',').map(Number);
} else if (seedsArg.startsWith('random')) {
  const count = Number(seedsArg.split(':')[1] || 12);
  seeds = []; for (let k = 0; k < count; k++) seeds.push(Math.floor(Math.random() * 4294967296));
} else {
  const [want, countArg] = seedsArg.split(':');
  const count = Number(countArg || 6);
  seeds = [];
  for (let s = 1; seeds.length < count && s < 100000; s++) {
    const r = E.generateInsectDetailed(s);
    if ((r.meta.variant || r.meta.type) === want) seeds.push(s);
  }
}

const rows = Math.ceil(seeds.length / cols);
let page = '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff}#g{display:grid;grid-template-columns:repeat(' + cols + ',1fr)}' +
  '#g div{border:1px solid #ccc;position:relative}#g svg{width:100%;height:auto;display:block}#g span{font:14px monospace;position:absolute;left:4px;top:4px}</style><div id="g">';
for (const s of seeds) {
  const r = part ? E.generatePart(s, forceType || undefined, part, 600) : E.generateInsectDetailed(s, forceType ? { type: forceType } : undefined);
  page += '<div>' + r.svg + '<span>' + s + ' ' + (r.meta.variant || r.meta.type) + (r.meta.wingSig ? ' ' + r.meta.wingSig : '') + '</span></div>';
}
page += '</div>';
const htmlPath = outPng.replace(/\.png$/i, '') + '.html';
fs.writeFileSync(htmlPath, page);

const candidates = [process.env.CHROMIUM, '/opt/homebrew/bin/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const bin = candidates.find(p => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch (e) { return false; } });
if (!bin) { console.log('no Chromium found; open ' + htmlPath + ' in a browser instead'); process.exit(0); }
const cell = 600;
execFileSync(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=' + (cols * cell) + ',' + (rows * cell + rows * 2 + 2), '--screenshot=' + outPng, 'file://' + path.resolve(htmlPath)], { stdio: 'ignore' });
console.log(outPng + '  seeds: ' + seeds.join(','));
