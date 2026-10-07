---
status: accepted
---

# Device-resolution floors live in the engine, the rasteriser thresholds at 128

A plate is specified at 600 px with fine strokes of 0.5 px and hatch pitch of 1.8 px. The e-ink
panel rasterises it at 440 px and thresholds at 128, where a 0.5 px stroke is 0.37 px and can
never cover half a pixel: measured on six orders (2026-10-07), 85–90 % of strokes are sub-pixel
and crossveins, segment lines and striae vanish. We decided the engine takes a device size
(`devicePx`) and clamps stroke weights to ≥ 1.0 device px and hatch/mesh pitch to ≥ 2.5 device
px at draw time, leaving genes, rolls and signatures untouched; the rasteriser keeps threshold
128 and does no fattening or dithering. Raising the threshold instead (160–200) was measured
and rejected: it recovers fine veins only as phase-dependent dashes while adding ~1 px per
side to every heavy line and filling hatching and the odonata mesh. Supersampling and renderer
density settings were measured to change nothing, since the loss is coverage, not sampling.

## Consequences

- The default output (no `devicePx`) is unchanged byte-for-byte; the web plate keeps its floors.
- A device plate of a seed is a coarser drawing of the same insect, never a different one.
- The caption subtitle is dropped when it would fall under 10 device px; text is filled, not
  stroked, so a stroke floor cannot save it.
- The plate scale is known only after the insect is drawn, so a device plate is drawn twice:
  pass 1 is the default plate and gives the scale, pass 2 redraws with the floors. A clamped site
  that draws rng jitter per element (stipple dots, mesh sites) ends with `rngSync()`, which
  restores pass 1's stream position there, so every roll outside the site is identical and the
  signatures are the default plate's. Generating a device plate costs two drawings.
- Odonata (decided 2026-10-07 on device-size contact sheets of dragonfly and damselfly seeds 1–6
  with 3× zooms beside the Ris 1921 plates): the pitch floor alone is enough. The mesh survives as
  open cells with single-pixel walls and does not blot, so the mesh regime does not fall back to
  the ladder at any device size.
- Two refinements the sheets forced: a fan hatch's pitch is held at the outline point nearest
  the focus (the mean pitch let the lepidopteran base fill solid), and a second hatch family laid
  across a first (the cross-hatch in the darks) takes twice the floor, or the two fill solid.
