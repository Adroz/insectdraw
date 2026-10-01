# insectdraw

Procedurally generated insect plates in the style of Victorian natural-history
specimen illustrations. Same spirit as [fishdraw](https://github.com/LingDong-/fishdraw),
but for insects.

- Single self-contained `index.html` — no dependencies, no build step.
- Seeded PRNG (mulberry32): the same seed always draws the same insect.
- Dorsal view, bilaterally symmetric: the right half is generated and mirrored.
- Line art only: black strokes on white, no fills (other than white masking),
  no gradients/opacity/filters, minimum stroke 0.5px — suitable for e-ink.
- Six body plans: beetle, moth (with a butterfly variant), fly, bee/wasp,
  dragonfly, grasshopper.

## Use

Open `index.html` in a browser. Enter a seed and **Generate**, hit **Random**,
or **Daily** (seed = FNV-1a hash of today's `YYYY-MM-DD`, so the plate is
the same all day and changes tomorrow). The seed is also mirrored into the
URL hash, so `index.html#1234` is a shareable link.

For a daily e-ink display, `generateInsect(dailySeed())` returns the SVG
string; the `<svg>` has a `600×600` viewBox and scales cleanly.

## Dev

```
node tests/check.js 3000    # runs the engine over N seeds: NaN/fit/leg-attachment/determinism checks
python3 -m http.server 8765 # then open tests/sheet.html?seeds=1,2,3,4,5,6&cols=3 for a contact sheet
```
