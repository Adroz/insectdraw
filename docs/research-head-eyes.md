# Head outline, compound eyes, ocelli and mouthparts in dorsal view — research notes and drawing rules

2026-10-02. Written for step 5 of `plan-body-variation.md` (head shape, eye ranges and styles,
ocelli, mouthparts). The plates draw every insect from above, so the question throughout is
"what does this read as from the dorsal side": a hypognathous head shows its vertex, a
prognathous one its frons and jaws, an opisthognathous one almost nothing of its mouthparts.
Rules at the end are what `rollBodyGenes` (`B.head`) implements. The 2026-10-01 notes in
`research-legs-eyes-antennae.md` (eye shape per order) still hold and are extended here.

## Sources read

1. Wikipedia, *Insect head* (vertex / frons / gena / clypeus / labrum; ocelli "two or three";
   head orientation). https://en.wikipedia.org/wiki/Insect_head
2. Giancarlo Dessì, *Notes on Entomology: Diptera, head*: head "subglobose", holoptic vs
   dichoptic, frons "virtually absent" in holoptic males, ocellar triangle on the vertex, eyes
   "may occupy most of head surface from the dorsal view", > 4000 ommatidia in *Musca*.
   https://www.giand.it/diptera/morph/?id=2&lang=en
3. Wikipedia, *Holoptic arrangement* and *Fly* (Anatomy): males holoptic, females dichoptic,
   robber flies and small acalyptrates dichoptic in both sexes; three ocelli on top.
   https://en.wikipedia.org/wiki/Holoptic_arrangement , https://en.wikipedia.org/wiki/Fly
4. Wikipedia, *Asilidae*: "dichoptic in both sexes", three ocelli "in a characteristic
   depression formed by the elevation of the compound eyes", mystax, stout straight proboscis.
   https://en.wikipedia.org/wiki/Asilidae
5. Wikipedia, *Crane fly*: "Ocelli are absent"; short rostrum with a beak-like nasus; 13
   antennal segments. https://en.wikipedia.org/wiki/Crane_fly
6. Wikipedia, *External morphology of Odonata*, *Dragonfly*, *Damselfly*: dragonfly eyes
   "touching (or nearly touching) each other across the face", "except in the Petaluridae and
   Gomphidae"; damselfly eyes "more widely separated and relatively smaller"; three ocelli on
   the frons / top of the head; up to 28 000 ommatidia; mouthparts under the head, labrum
   flap-like. https://en.wikipedia.org/wiki/External_morphology_of_Odonata ,
   https://en.wikipedia.org/wiki/Dragonfly , https://en.wikipedia.org/wiki/Damselfly
7. Tillyard 1917, *The biology of dragonflies*, text-fig. (head of a libellulid in dorsal,
   frontal and lateral view, `ref/head-odo-tillyard1917.jpg`): measured below.
8. Wikipedia, *Simple eye in invertebrates* (dorsal ocelli): a triplet is typical; median
   ocellus absent in some (two ocelli in Heteroptera); "larger and more strongly expressed in
   flying insects (particularly bees, wasps, dragonflies and locusts)".
   https://en.wikipedia.org/wiki/Simple_eye_in_invertebrates
9. Wikipedia, *Beetle* (Head): "a few have ocelli ... more common in larvae than adults";
   single median ocellus in Dermestidae, some Omaliinae (rove beetles) and Derodontidae; eyes
   notched or divided (longhorns, weevils, whirligigs); mandibles "large pincers on the front
   of some beetles", sexually dimorphic. https://en.wikipedia.org/wiki/Beetle
10. Curculionoidea glossary / Anderson 2002 (Curculionidae): rostrum from "distinctly longer
    than wide" to several times the head length, antennae geniculate, inserted between
    mid-length and apex of the rostrum. https://www.curculionoidea.org/glossary
11. Wikipedia, *Moth* and *Butterfly*: "Most adult moths also possess ocelli, above their
    compound eyes"; the butterfly adult-morphology section has no ocelli (Papilionoidea lack
    them); proboscis "coiled up under the head", labial palps project forward.
    https://en.wikipedia.org/wiki/Moth , https://en.wikipedia.org/wiki/Butterfly
12. Wikipedia, *Lepidoptera*: chaetosemata (bristle clusters) on the head; proboscis of 1–5
    segments kept coiled by small muscles. https://en.wikipedia.org/wiki/Lepidoptera
13. Wikipedia, *Cicada* and Fox, *Tibicen* lab notes (Lander University): "prominent compound
    eyes set wide apart on the sides of the head" on "thick eyestalks"; three ocelli in a
    triangle between the eyes; postclypeus "a large, nose-like structure ... makes up most of the
    front of the head"; beak "inconspicuous in strict dorsal perspective".
    https://en.wikipedia.org/wiki/Cicada , https://lanwebs.lander.edu/faculty/rsfox/invertebrates/tibicen.html
14. Villet et al. 2019, *Stagira* revision, Fig. 25 "variation in the shape of the head in
    dorsal view" (`ref/head-cic-stagira.jpg`): rounded vs pointed-triangular postclypeus.
15. U. Wyoming grasshopper field guide: fastigium in front of the vertex with lateral foveolae;
    eyes "somewhat round but may be elliptical in grasshoppers with strongly slanted faces";
    three ocelli, "one above the base of each antenna and one centrally located in the frontal
    costa". https://www.uwyo.edu/entomology/grasshoppers/field-guide/ghparts.html
16. Wikipedia, *Grasshopper*: "head is held vertically ... with the mouth at the bottom",
    "two sensory palps in front of the jaws". https://en.wikipedia.org/wiki/Grasshopper
17. Wikipedia, *Sawfly*: "three ocelli between the dorsal portions of the compound eyes", head
    hypognathous. https://en.wikipedia.org/wiki/Sawfly ; bumblebee.org (eye page): three
    ocelli "arranged in a triangular pattern on the top of the head", 3000–4000+ ommatidia.
    https://www.bumblebee.org/bodyEyehtm.htm
18. Wikipedia, *Mayfly*: large compound eyes, males with dorsal "turban" eyes, three ocelli,
    vestigial mouthparts. https://en.wikipedia.org/wiki/Mayfly
19. Wikipedia, *Neuroptera* / *Chrysopidae*: adults "may or may not" have ocelli (Chrysopidae
    lack them), large lateral eyes, chewing mandibles. https://en.wikipedia.org/wiki/Neuroptera
20. Wikipedia, *Ommatidium*: facets "from 5 to 50 micrometres", hexagonal packing, up to ~30 000
    per eye in large Anisoptera and some Sphingidae; housefly facet ≈ 25 µm, tortricid moth
    ≈ 15 µm (Frontiers / PMC papers in the same search). https://en.wikipedia.org/wiki/Ommatidium
21. Wikipedia, *Stipple engraving*: tone from dots of varying size and density, used beside
    line engraving, highlights left unworked. https://en.wikipedia.org/wiki/Stipple_engraving
22. Photographs measured: `ref/head-odo-damselfly.jpg` (Zygoptera, dorsal), the companion
    dragonfly dorsal photo (Commons "Dragonfly head dorsal (9482343388)", not stored),
    `ref/head-dip-musca.jpg` (*Musca*, frontal, facet lattice), `ref/head-col-carabus.jpg`
    (*Carabus* from above), `ref/head-col-weevil.jpg` (*Curculio* rostrum, above and side),
    Commons "Bombus terrestris head in detail" and "Grasshopper head macro" (not stored).

## What the sources and references establish

### Head orientation decides what the plate shows

- **Hypognathous** (face vertical, mouth below): Orthoptera, Hymenoptera, Lepidoptera,
  Diptera, Neuroptera. From above you see the **vertex** between the eyes, the ocelli on it,
  the antennal sockets at the front, and only the *tips* of anything that hangs below
  (mandible points, palps, the edge of the clypeus). The outline is round to transverse.
- **Prognathous** (jaws forward): Coleoptera (ground beetles, rove beetles, longhorns). From
  above you see the frons and clypeus, the **labrum**, and the **mandibles** in full. The head
  is longer than wide and narrower than the pronotum (Carabus: head ≈ 0.6 pronotum width,
  length with mandibles ≈ 1.3 × its width). Weevils stretch the frons into a **rostrum**.
- **Opisthognathous** (beak swept back under the body): Hemiptera (cicada). From above you see
  the vertex with the ocelli, the eyes on their stalks, and the **postclypeus** bulging the
  front margin; the rostrum is hidden (13).
- Odonata sit between: a globular head whose eyes have grown over the vertex (dragonfly) or
  sit at the ends of a bar (damselfly); the frons is a bump in front of the eyes with the
  labrum below it; mandibles are not visible from above (6, 7).

### Per-order head geometry measured on the references

Widths are fractions of head width W (dorsal, including the eyes); "depth" is the dorsal
front-to-back extent (our `headH`).

| order | depth / W | outline from above | eyes | notes |
|---|---|---|---|---|
| dragonfly (Tillyard fig. A, photo) | 0.55–0.65 | transverse, two lobes = the eyes, a frons bump 0.3–0.4 W wide in front, occipital triangle behind | each eye 0.45–0.5 W wide, nearly the full depth; meet on the midline over a seam 0.25–0.35 of the depth | gomphid/petalurid variant: eyes separated by 0.1–0.2 W |
| damselfly (photo) | 0.35–0.45 | dumbbell / bar: eyes are the ends | each eye 0.2–0.25 W wide, 0.8–0.9 of the depth; gap between the eyes 0.45–0.55 W (over two eye widths) | ocelli triangle in the middle of the bar; antennal bases at ±0.15 W on the front edge |
| fly, holoptic (2, 3) | 0.7–0.85 | subglobose, slightly transverse | each eye 0.4–0.48 W wide, 0.8–0.95 depth; inner margins meet or leave a frons 0–0.06 W | ocellar triangle squeezed at the back of the seam |
| fly, dichoptic (2, 4, photo) | 0.7–0.85 | same outline, broader vertex | each eye 0.3–0.4 W; frons 0.2–0.35 W | asilid: vertex dished between raised eyes, mystax on the face |
| bee / wasp (17, Bombus photo) | 0.75–0.9 | round to slightly transverse, flat or gently convex vertex | tall kidney eyes at the sides, 0.2–0.3 W wide, 0.7–0.9 of depth, inner margin notched toward the antennal socket (reniform) | three large ocelli in a flat triangle on the vertex; mandible tips show below the clypeus |
| sawfly (17) | 0.8–0.95 | broad round | large, 0.25–0.3 W, oval | three ocelli between the eyes' dorsal portions |
| moth (11, 12) | 0.85–1.0 | round, hidden under scales | large round / oval, 0.3–0.4 W, 0.5–0.6 depth | 2 small ocelli behind the eyes (often hidden by scales); palps forward; proboscis coil below |
| butterfly (11) | 0.85–1.0 | round, small vs the eyes | 0.35–0.45 W | no ocelli; palps forward; coil |
| beetle, ground (Carabus photo) | 1.2–1.5 | elongate, narrower than the pronotum, frontal furrows | small round bulges at the rear corners, 0.12–0.2 W, barely 0.25 depth | mandibles 0.4–0.6 W long, sickle, tips crossing; labrum between; palps beside |
| beetle, scarab / longhorn | 0.9–1.2 | short, broad, vertex flat; longhorn eye notched around the antennal base | 0.15–0.25 W | mandibles short, 0.1–0.2 W |
| beetle, weevil (10, Curculio photo) | 1.0–1.3 + rostrum | capsule round with a rostrum 0.5–3 × capsule width long, 0.15–0.25 W wide | round, flat, 0.25–0.3 W at the capsule sides | tiny mandibles at the rostrum tip; antennae geniculate from mid-rostrum |
| grasshopper (15, 16, photo) | 0.9–1.1 | triangular / trapezoid: wide at the rear (eyes), narrowing to the fastigium in front | oval, 0.25–0.3 W, upright, at the rear corners; elliptical when the face slopes | lateral ocelli beside the antennal bases; the median one is on the face, hidden from above |
| cicada (13, 14) | 0.35–0.5 | transverse bar; eyes bulge past the rear line at the corners; postclypeus bulges the front margin 0.3–0.4 W wide, rounded or pointed | 0.2–0.25 W each, round, on stalks | three ocelli in a tight triangle at the centre; beak hidden |
| crane fly (5) | 0.9–1.1 | round with a short snout (rostrum + nasus) forward | moderate round, 0.25–0.3 W | no ocelli |
| lacewing (19) | 0.85–1.0 | round, eyes as hemispheres bulging the sides | 0.25–0.3 W | no ocelli (Chrysopidae) |
| mayfly (18) | 0.6–0.8 | transverse | large dorsal eyes 0.3–0.4 W; male turbinate eyes meet on the midline as a second pair of lobes | three ocelli; mouthparts vestigial |

### Ocelli

- Three in a triangle on the vertex is the ground plan (1, 8): one median, two posterolateral.
  Big and conspicuous in bees, wasps, dragonflies, locusts, cicadas, mayflies (8, 13, 18).
- Diptera: three on the ocellar triangle (2, 3), but absent in Tipulidae (5).
- Odonata: three; in dragonflies the median sits on the frons bump in front of the eye seam and
  the laterals at the inner front corner of each eye (Tillyard fig. E); in damselflies all
  three sit on the vertex bar between the eyes (photo).
- Orthoptera: three, but only the two lateral ones (above the antennal bases) face up; the
  median is on the frontal costa (15), i.e. invisible from above.
- Lepidoptera: moths two (above / behind the eyes, under the scales), butterflies none (11).
- Coleoptera: none, except a single median ocellus in Dermestidae and some rove beetles (9).
- Neuroptera: none in Chrysopidae (19). Hemiptera cicada: three (13).
- Radius: an ocellus is 3–8 % of head width; the engine's 1.1–1.3 px on a 40 px head is 3 %,
  so the range should reach 0.8–1.8 px.

### Compound-eye size and the lattice

- Facets are 5–50 µm, mostly 15–40 µm (20); a 5 mm fly head with 25 µm facets has ~200
  facets across the eye, a 10 mm dragonfly head ~400. No plate draws them to scale: the
  honeycomb is a **convention** that says "compound eye", drawn at whatever pitch the medium
  resolves. At plate scale an eye is 6–25 px across, so 1.8–3 px pitch gives 3–12 facets
  across: it reads as a lattice without filling in.
- E-ink floor: the plate scale per order (measured over 2400 seeds, 5th percentile): bee 0.85,
  beetle 1.30, butterfly 1.28, cicada 0.67, crane fly 0.87, damselfly 1.02, dragonfly 0.99,
  fly 0.78, grasshopper 1.18, lacewing 0.81, mayfly 0.92, moth 1.30, wasp 0.75. The body-space
  pitch floor is therefore `1.8 / p5(type)`: cicada 2.7, wasp 2.4, fly 2.3, lacewing 2.2, bee
  and crane fly 2.1, mayfly 2.0, the rest 1.8. The engine's current `max(1.9, …)` lets a
  cicada eye fall to 1.3 px on the plate.
- Facet size varies across a real eye (acute zones) but at our pitch that is invisible; keep
  one pitch per eye.

### Mouthparts visible from above

- Mandibles: full length in prognathous beetles (ground beetles long and sickle-shaped, often
  crossing; stag-beetle style enlargement is sexually dimorphic (9)); short blunt in scarabs,
  longhorns; tiny at the end of a weevil rostrum. Tips only (0.1–0.2 W) peeking below the
  clypeus in bees and wasps; hidden in grasshoppers (hypognathous (16)), Odonata (6), flies,
  moths.
- Labrum / clypeus: the transverse line(s) across the front of a prognathous head (Carabus:
  clypeus + labrum, two lines, labrum notched); the frons–clypeus–labrum bands under a
  dragonfly's frons bump (Tillyard fig. D: three stacked plates); the clypeus bow of a bee.
- Palps: maxillary palps stick out beside beetle mandibles (Carabus photo, four-segmented);
  labial palps project forward in Lepidoptera as two short clubs (11); "two sensory palps in
  front of the jaws" in grasshoppers (16), visible as two dots past the fastigium.
- Lepidopteran proboscis: coiled under the head between the palps (11, 12); a plate shows it
  as a spiral of 1.5–2.5 turns below the front margin when the illustrator wants the diagnostic.
- Cicada: postclypeus bulge with transverse striations (muscle ridges, 13); beak hidden.
- Fly: proboscis under the head, hidden; the face shows the antennae and, in Asilidae, the
  mystax. Crane fly: snout (short rostrum, nasus) protruding forward 0.1–0.3 W.
- Mayfly: nothing (vestigial). Lacewing: small mandibles, usually hidden.

### Engraving conventions for eyes (7, 21, and the Ris / Snodgrass plates in `ref/`)

- Line-engraved anatomical figures (Tillyard, Snodgrass) draw the eye as an **outline only**
  or with a few stipple dots; the honeycomb appears in the popular natural-history plates
  (Curtis, Wood, Blanchard) as a regular hexagonal or staggered dot lattice over the eye.
- Tone: stipple (dots denser toward the shaded edge) or the lattice; a clean **unworked
  highlight** crescent toward the light. Plates are lit from the upper left, so the highlight
  sits upper-left on both eyes; our mirror step makes both eyes symmetric, so the gene is
  "upper-outer" vs "upper-inner", with upper-outer the default (the left eye of a plate lit
  from the upper left).
- Hairs: a bumblebee's eye carries hairs between the facets and the head a fringe; a fly's
  face has bristles (frontal, orbital, mystax). Short ticks around the eye rim or over the
  face read as pile without a fill.

## Rules derived (what `B.head` rolls)

Fractions of `P.headW` (W) and `P.headH` (H) unless marked px. `headTop`, `headCy`, `P.headW`
and `P.headH` keep their meaning: bounding width, bounding depth and centre of the head capsule
(rostrum and mandibles stick out beyond `headTop`); the drawn outline is exposed as
`meta.headOutline` (polyline, body coords, right half mirrored by the caller).

| order | shape (W/H roll, outline) | eyes: cx, rx/W, ry/H, tilt, dent | ocelli | mouthparts | style |
|---|---|---|---|---|---|
| dragonfly | 1.55–1.95, `transverse` (two eye lobes, frons bump 0.3–0.4 W, occipital notch) | cx 0.24–0.27, rx 0.24–0.27, ry 0.38–0.46, tilt 0, no dent; gomphid variant cx 0.3, rx 0.2 (eyes apart) | 3: median on the frons bump, laterals at the seam front | labrum bands 1–2 under the frons; no mandibles | lattice (pitch floor 1.8) or stipple; highlight upper-outer |
| damselfly | 2.3–2.9, `transverse` bar | cx 0.37–0.41, rx 0.1–0.13, ry 0.38–0.46 | 3 triangle at the centre of the bar | none | lattice / stipple |
| fly | 1.2–1.45, `round` (globose); holoptic 55 % (asilid 0 %, nemato 30 %) | holoptic: cx 0.24–0.26, rx 0.23–0.26, ry 0.4–0.48; dichoptic: cx 0.3–0.34, rx 0.16–0.21, ry 0.38–0.46 | 3 ocellar triangle at the back of the vertex (asilid: in a dish) | none visible; asilid mystax ticks | lattice (floor 2.3) / stipple / plain |
| bee / wasp | 1.1–1.35, `round`, vertex flat 50 % | cx 0.32–0.36, rx 0.12–0.16, ry 0.36–0.44, tilt ±8°, dent toward the socket 0.15–0.3 | 3 large, flat triangle on the vertex | clypeus bow; mandible tips 0.1–0.2 W at 60 %; sawfly: bigger round eyes, broad head | lattice / stipple |
| moth / butterfly | 0.95–1.2, `round` | cx 0.3–0.35, rx 0.14–0.18, ry 0.24–0.3 | moth 0–2 small behind the eyes, butterfly 0 | palps 2 forward clubs 80 %; proboscis spiral 35 % (butterfly 50 %), 1.5–2.5 turns | lattice / stipple; hair ticks on the vertex (moth) |
| beetle, ground / rove | 0.7–0.9, `elongate` (narrower than the pronotum, frontal furrows) | cx 0.38–0.42, rx 0.09–0.13, ry 0.16–0.24, flat at the rear corners | 0 (rove: 0–1 median 20 %) | mandibles 0.4–0.6 W, curvature strong, crossing 50 %, serration 30 %; labrum line; palps 2 | plain-with-highlight or stipple |
| beetle, scarab / longhorn | 0.85–1.1, `round`, vertex flat | cx 0.36–0.4, rx 0.1–0.14, ry 0.2–0.28, dent toward the antennal base (longhorn) 0.3–0.45 | 0 | mandibles 0.1–0.2 W, blunt; clypeus line | stipple / plain |
| beetle, weevil | 0.8–1.0 capsule, `elongate` + rostrum 0.6–1.8 W long, 0.15–0.25 W wide | cx 0.36–0.4, rx 0.1–0.13, ry 0.18–0.26 | 0 | tiny mandibles at the rostrum tip | plain / stipple |
| grasshopper | 0.8–1.0, `triangular` (rear width W, fastigium 0.3–0.5 W wide at the front) | cx 0.3–0.34, rx 0.1–0.13, ry 0.26–0.34, tilt −15–0° (leaning with the face) | 2 lateral beside the antennal bases (the median is on the face) | palps 2 dots past the fastigium 50 %; fastigium furrow; no mandibles from above | lattice / stipple |
| cicada | 1.9–2.4, `transverse` with eye stalks past the rear line and a postclypeus bulge 0.3–0.4 W (rounded 60 % / pointed 40 %) | cx 0.4–0.44, rx 0.08–0.11, ry 0.3–0.42 | 3 tight triangle at the centre | postclypeus with 3–6 transverse striations; beak hidden | lattice (floor 2.7) / stipple |
| crane fly | 1.0–1.2, `round` + snout 0.1–0.3 W | cx 0.32–0.36, rx 0.13–0.16, ry 0.3–0.36 | 0 | snout; no mandibles | stipple / plain |
| lacewing | 1.05–1.25, `round` with eye hemispheres bulging the sides | cx 0.35–0.4, rx 0.13–0.17, ry 0.3–0.36 | 0 | tiny mandible tips 30 % | lattice / stipple |
| mayfly | 1.1–1.4, `transverse` | cx 0.26–0.3, rx 0.18–0.22, ry 0.38–0.44; turbinate male 50 %: second pair of lobes on top meeting at the midline | 3 | none | lattice / stipple |

Common rules:

- **Eye containment**: every eye ellipse stays inside the head bbox with ≤ 10 % of its radius
  overhanging; ocelli inside the outline. Asserted in `tests/check.js` on `meta.head`.
- **Eye style** `lattice` / `stipple` / `plain`: lattice pitch gene 1.8–3.0 px clamped up to
  `1.8 / p5scale(type)`; stipple dots at the same pitch on a staggered grid, denser (two rows
  closer) toward the lower-inner edge, none in the highlight; plain = outline + a highlight
  crescent line. Highlight centre `[-0.42, -0.42]` ± 0.1 of the radii, radius 0.3–0.42.
- **Vertex**: `flat` 0/1 clips the rear arc of a round head to a straight line (bees, scarabs);
  `genal swelling` 0–0.15 widens the outline below the eyes (round and triangular heads).
- **Markings**: frontal stripe 0/1 (a median line down the frons), hatched vertex 0/1 (3–5 fine
  bows between the ocelli and the rear margin), hair ticks 0/1 around the rim (moth, bee,
  asilid mystax), density 2.5–4 px.
- **Signature**: outline enum, holoptic, eye style, ocelli count, mandible class (none / tips /
  long / crossed), palps, proboscis coil, rostrum class, markings bits, quantised eye rx and
  W/H ratio.
