# Cicada habitus in dorsal view: wing set, family, abdomen, mesonotum

2026-10-14. Written for #49 (step 2 of "Nine plates, nine insects" in `plan-body-variation.md`). The numbers at the end
are what the cicada entry in `ORDERS` (`habitus`, `abdShapes`, `abdFams`, `wingSets`, `wingShapes`, `thorax.marks`)
and `tests/check.js` (`CIC_SET`, `CIC_SHAPE`, `CIC_HAB`, `CIC_MARKS`) draw from. Images in `ref/` with the `hab-cic-`
prefix (licences in `ref/README.md`); the venation stays as `wing-venation-spec.md` (Cicadidae) has it.

## Sources read

1. Moulds, M. S. (2005), *An appraisal of the higher classification of cicadas (Hemiptera: Cicadoidea) with special
   reference to the Australian fauna*, Records of the Australian Museum 57: 375-446. Subfamilies Cicadinae (tymbal
   covers present, covering the tymbals wholly or partly) and Cicadettinae (tymbal covers absent, the tymbals exposed;
   mostly small, slender species); the pronotal collar expanded laterally in Platypleurini (paraphrased, not quoted).
   https://doi.org/10.3853/j.0067-1975.57.2005.1447
2. Marshall, D. C. et al. (2018), *A molecular phylogeny of the cicadas (Hemiptera: Cicadidae) with a review of tribe
   and subfamily classification*, Zootaxa 4424: 1-64 (diagnoses of Cicadinae, Cicadettinae and Platypleurini; the
   platypleurine collar's lateral margins expanded past the head, paraphrased).
3. Wikipedia, *Cicada* (morphology: the forewings held roof-like over the body at rest; the eyes set wide apart;
   Cicadettinae small): https://en.wikipedia.org/wiki/Cicada
4. Species descriptions with the mesonotal pattern (New Zealand Cicadettinae, Landcare Research / Fleming 1984; and
   the plate `hab-cic-notopsalta-dorsal`): a pair of obconical dark spots on the front of the mesonotum and an M- or
   W-shaped mark behind them (paraphrased from the descriptions and read off the photograph); PMC3677403 (cited in `research-thorax.md`, 11): median and paramedian fasciae along the parapsidal sutures.
5. Photographs: `hab-cic-orni-dorsal.jpg` (Cicadinae at rest, roofed), `hab-cic-tibicen-dorsal.jpg` (Cicadinae at rest),
   `hab-cic-platypleura-capensis.jpg` (Platypleurini, flared collar), `hab-cic-notopsalta-dorsal.jpg` and
   `hab-cic-cicadettana-dorsal.jpg` (Cicadettinae, spread specimens).

## Findings

- **Wing set.** Museum plates show a set specimen with the tegmina spread (as #26 draws it), but most photographs and
  many plates show the insect at rest: the tegmina folded back over the abdomen like a roof, their claval (inner)
  margins meeting along the midline behind the cruciform elevation, the costal margins bowed out past the body, the
  apices past the abdomen tip, the hindwings hidden under them (1, 3; `hab-cic-orni-dorsal`, `hab-cic-platypleura`).
  Seen from above the roofed tegmen is foreshortened: its projected width is about a quarter of its length. A
  half-open set (the wings partly raised, the forewing 50-65 degrees back) is common in field photographs.
- **Forewing shape.** Cicadettinae and many small Cicadinae have narrow tegmina, about 3x as long as wide, the apex
  pointed; Platypleurini and the broad Cicadini (Cicada, Tibicen) 2-2.6x, the apex rounded (`hab-cic-notopsalta`,
  `hab-cic-platypleura`).
- **Families.** Cicadinae: broad, robust body, the abdomen at least about as wide as the thorax, the tymbal covers
  showing as rounded plates at the sides of the abdomen base (1, 2). Cicadettinae: slender and small, the head
  narrower than the pronotum, no tymbal covers (1). Platypleurini (in Cicadinae): stout, the pronotal collar flared
  into lateral flanges wider than the head (1, 2; `hab-cic-platypleura-capensis`).
- **Abdomen.** Barrel-shaped (parallel-sided, blunt) in many Cicadinae, conical (widest at the base, tapering) in
  Cicadettinae and some Platypleurini, spindle-shaped (narrower base, widest at mid-length) in others.
- **Mesonotum.** The common pattern elements are a pair of obconical (inverted-cone) dark spots behind the pronotal
  collar and an M-shaped mark across the middle of the mesonotum, ahead of the cruciform elevation; either, both or
  neither (4; `hab-cic-notopsalta`).

## Rules derived (what the engine draws)

| gene | values | where |
|---|---|---|
| family (`P.fam`) | cicadine / cicadettine / platypleurine, 1:1:1 | `proportions` |
| family scales | cicadine head 0.95-1.05, thorax 1.0-1.1, abdomen length 0.92-1.05, abdomen width (`abdFams.wK`) 1.15-1.35; cicadettine head 0.72-0.8, thorax 0.84-0.92, abdomen length 1.05-1.2, width 0.72-0.86, whole body 0.68-0.8 (small: the plate scale is capped, so it stands smaller); platypleurine head 0.84-0.92, thorax 1.02-1.1, abdomen length 0.78-0.9, width 1.25-1.45 | `habitus`, `abdFams` |
| tymbal covers | cicadine only: a rounded plate 0.32-0.42 of the abdomen's half width at the abdomen base, standing past its outline | `habitus.tymbals`, `drawAbdomen` |
| pronotal flange | platypleurine only: the collar flared to 1.3-1.5 x the head's half width, with a fine rim | `habitus.flange`, `rollBodyGenes`, `drawThorax` |
| abdomen taper | barrel / cone / spindle, family weights | `abdShapes` |
| wing set (`B.wing.set`) | spread (sweep 30-45, #26), half (52-64), roofed (the tegmen laid over the abdomen, 1.3-1.5 root-to-abdomen-tip lengths: inner margin 1.0-1.3 off the midline, parting toward the apex at 0.7-0.95 of the length, costa 3-6 past the abdomen's side, the hindwing not drawn), 1:1:1 | `wingSets`, `wingsCicada` |
| forewing shape (`B.wing.shape`) | narrow (half depth 0.13-0.15 of the length, sharp apex; roofed width 1.3-1.6 x the body's widest) / broad (0.19-0.23, round apex; 1.65-1.95) | `wingShapes` |
| mesonotum markings | none / obconic / M / both, 1:1:1:1, hatched at 2.2-2.6 | `thorax.marks`, `drawThorax` |

Checks (`tests/check.js`): `cicSweep` (the sweep band per set), `cicWingSet` (roofed: tegmen over the whole abdomen,
inner margin within 1.5 of the midline, hindwing hidden), `cicWingShape` (spread / half forewing depth per length:
narrow at most 0.33, broad at least 0.35), `cicHabitus` (the family proportions above, read off the drawn outlines),
`cicMarks` (marks inside the mesonotum) and `cicShares` (each set, shape, family and marking on at least 15% of a
run's cicadas).

Not done: the tymbal covers are hidden under a roofed or half-open tegmen, as on the insect; tegminal infuscations
(the dark spots on the crossveins of `hab-cic-orni`) would be a wing-pattern change and are out of scope here.
