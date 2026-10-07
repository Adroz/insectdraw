# insectdraw

Procedural Victorian-style insect plates: one deterministic line-art drawing per seed, drawn
for the web page and for a daily 1-bit e-ink panel.

## Language

**Plate**:
The complete 600×600 drawing for one seed: insect, caption band, nothing else.
_Avoid_: image, picture, render

**Seed**:
The integer that fully determines a plate. Same seed, same plate, forever.

**Daily plate**:
The plate whose seed is derived from today's date, where "today" is the Brisbane calendar day.
_Avoid_: daily image, daily insect, today's insect

**Day boundary**:
Midnight in Brisbane (UTC+10, no daylight saving). The moment the daily plate changes everywhere.

**Plate scale**:
The factor that fits one insect's body into the plate; stroke widths and hatch pitch are
specified before it and divided by it so they are constant on the finished plate.

**Stroke weight**:
One of four named line weights (heavy, outline, detail, fine) every line on a plate is drawn in.
_Avoid_: stroke width, line thickness (those are numbers; a weight is a role)

**Hatch pitch**:
The gap between neighbouring hatching lines or mesh veins on the finished plate.
_Avoid_: hatch spacing, density

**Device size**:
The width in device pixels at which a plate is rasterised for a particular display (440 for the
TRMNL panel).
_Avoid_: resolution, w

**Device plate**:
A plate generated for a device size: same seed, same insect, but every stroke and hatch pitch
guaranteed to survive 1-bit rasterisation at that size.

**Device raster**:
The 1-bit PNG a device actually shows: a device plate rasterised at its device size and
thresholded.
_Avoid_: the PNG, e-ink image

**Survival**:
How much of a layer's ink is still present in the device raster compared with the ink the
plate specifies. The e-ink gate fails when it drops.

**Layer**:
One of the plate's drawing sections (abdomen, head, legs, antennae, wings), measured separately
by the gate because they die at different sizes.
_Avoid_: part (a part is a cropped standalone drawing of a layer)
