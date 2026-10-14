#!/usr/bin/env node
// Page tests: serves the repo over HTTP, loads each page in headless Chromium and asserts on the
// rendered DOM. Covers what the engine gates cannot: the main page's single pane and chrome, the
// #a|b redirect to compare.html, the compare page's two panes and hash, parts.html's grid, and that
// index.html still renders from file:// (it is self-contained; compare.html and parts.html fetch
// the engine from it, so they need HTTP). Set CHROMIUM to point at a Chrome/Chromium binary.
//   node tests/pages.js
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const { promisify } = require('util');

const root = path.join(__dirname, '..');
const candidates = [process.env.CHROMIUM, '/opt/homebrew/bin/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const bin = candidates.find(c => c && fs.existsSync(c));
if (!bin) { console.error('no Chromium found; set CHROMIUM'); process.exit(2); }

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// Rendered DOM of a URL after scripts (and any redirect) have run. Chromium's --dump-dom prints the
// document once the load event has fired and the virtual time budget is spent.
// Async, because the server answering Chromium runs in this same process. In CI (GitHub's Ubuntu 24.04 runners)
// Chrome's sandbox cannot start (unprivileged user namespaces are off), so it runs with --no-sandbox there; the
// pages are local files, nothing untrusted is loaded.
const flags = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=8000', ...(process.env.CI ? ['--no-sandbox'] : [])];
const dom = async url => (await promisify(execFile)(bin, [...flags, '--dump-dom', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })).stdout
  .replace(/<script[\s\S]*?<\/script>/g, '');   // the pages' own scripts contain the pane markup as strings; count only the DOM

const failures = [];
const check = (name, cond, detail) => { if (!cond) failures.push(name + (detail ? ': ' + detail : '')); };
const count = (s, re) => (s.match(re) || []).length;
const title = s => (s.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
const panes = s => count(s, /<div class="pane"/g);
const stageSvgs = s => count(s, /<div class="stage"><svg/g);

server.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  try {
    // main page: chrome, one pane, today's plate, no Compare button
    let d = await dom(base + 'index.html');
    check('main: header', /<h1[^>]*>insectdraw<\/h1>/.test(d));
    check('main: nav links', /href="compare\.html"/.test(d) && /href="parts\.html"/.test(d) && /href="https:\/\/github\.com\/Adroz\/insectdraw"/.test(d));
    check('main: one pane', panes(d) === 1, panes(d) + ' panes');
    check('main: plate rendered', stageSvgs(d) === 1);
    check('main: no Compare button', !/id="compare"/.test(d));
    check('main: title carries the seed', /insectdraw #\d+$/.test(title(d)), title(d));

    // main page with one seed: that seed, still one pane
    d = await dom(base + 'index.html#12');
    check('main #12: title', /insectdraw #12$/.test(title(d)), title(d));
    check('main #12: one pane', panes(d) === 1);

    // main page with two seeds: redirects to compare.html#12|18 (old shared links keep working)
    d = await dom(base + 'index.html#12|18');
    check('main #12|18: redirected to compare', panes(d) === 2 && /href="index\.html"/.test(d), panes(d) + ' panes');
    check('main #12|18: two panes rendered', stageSvgs(d) === 2, stageSvgs(d) + ' stages');
    check('main #12|18: title carries both seeds', /#12\|18$/.test(title(d)), title(d));

    // compare page: two panes always, hash honoured, nav back
    d = await dom(base + 'compare.html#12|18');
    check('compare: two panes', panes(d) === 2, panes(d) + ' panes');
    check('compare: both rendered', stageSvgs(d) === 2);
    check('compare: title', /#12\|18$/.test(title(d)), title(d));
    check('compare: nav links', /href="index\.html"/.test(d) && /href="parts\.html"/.test(d));
    check('compare: no Compare toggle', !/id="compare"/.test(d));
    d = await dom(base + 'compare.html');
    check('compare (no hash): two panes rendered', stageSvgs(d) === 2, stageSvgs(d) + ' stages');
    check('compare (no hash): title has two seeds', /#\d+\|\d+$/.test(title(d)), title(d));

    // parts page unchanged: a grid of cells
    d = await dom(base + 'parts.html');
    check('parts: grid rendered', count(d, /<div class="cell/g) >= 4, count(d, /<div class="cell/g) + ' cells');

    // self-contained: the main page renders from file:// (no fetch)
    d = await dom('file://' + path.join(root, 'index.html'));
    check('main from file://: plate rendered', stageSvgs(d) === 1);

    // contact sheet (tests/sheet.js, #58): a 3 x 3 sheet is exactly 3 x 3 cells of 600 px and the last row is whole.
    // Headless Chrome's viewport is shorter than --window-size (it reserves room for window chrome), which used to cut
    // the last row's captions off. Checked on the crane fly (longest legs) and the beetle.
    const sharp = require('sharp');
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sheet-'));
    try {
      for (const type of ['cranefly', 'beetle']) {
        const png = path.join(tmp, type + '.png');
        await promisify(execFile)(process.execPath, [path.join(__dirname, 'sheet.js'), png, '3', '1,2,3,4,5,6,7,8,9', '--type', type]);
        const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
        check('sheet ' + type + ': 1800 x 1800', info.width === 1800 && info.height === 1800, info.width + ' x ' + info.height);
        const px = (x, y) => data[y * info.width * info.channels + x * info.channels];
        // last row's bottom cell border (#ccc) on the image's last pixel row, under every column
        const border = [300, 900, 1500].every(x => Math.abs(px(x, info.height - 1) - 0xcc) < 24);
        check('sheet ' + type + ': last row bottom border drawn', border);
        // every last-row cell has caption ink in the plate's caption band (the bottom 45 plate px)
        for (let c = 0; c < 3; c++) {
          let ink = 0;
          for (let y = 1800 - 45; y < 1799; y++) for (let x = c * 600 + 100; x < c * 600 + 500; x++) if (y < info.height && px(x, y) < 128) ink++;
          check('sheet ' + type + ': last-row cell ' + (c + 1) + ' caption drawn', ink > 50, ink + ' dark px');
        }
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  } finally {
    server.close();
  }
  if (failures.length) { console.log('FAILURES:', failures.length); for (const f of failures) console.log(' -', f); process.exit(1); }
  console.log('pages OK');
});
