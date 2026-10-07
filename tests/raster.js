// The panel pipeline (ADR 0001) in one place, so the survival gate (tests/eink.js) measures exactly what
// the daily plate script (scripts/render-daily.js) publishes: resize the plate to the device size on
// white, flatten, grayscale, threshold at 128. `grey` stops before the threshold (the gate reads the
// antialiased coverage from it), `bits` is the 1-bit raster, `devicePng` encodes it as the 1-bit palette
// PNG the panel fetches.
'use strict';
const sharp = require('sharp');

const DEVICE_PX = 440;     // TRMNL panel device size
const THRESHOLD = 128;     // fixed; raising it was measured and rejected

const grey = (svg, px) => sharp(Buffer.from(svg))
  .resize(px || DEVICE_PX, px || DEVICE_PX, { fit: 'contain', background: '#ffffff' })
  .flatten({ background: '#ffffff' }).grayscale();
const bits = (svg, px) => grey(svg, px).threshold(THRESHOLD);
// two colours after the threshold, so the palette is exactly black and white
const devicePng = (svg, px) => bits(svg, px).png({ palette: true, colours: 2 }).toBuffer();

module.exports = { DEVICE_PX, THRESHOLD, grey, bits, devicePng };
