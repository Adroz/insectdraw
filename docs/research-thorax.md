# Thorax in dorsal view — research notes and drawing rules

2026-10-02. Written for step 4 of `plan-body-variation.md` (thorax profile, sutures, scutellum,
surface, tegulae). Sources are morphology references and glossaries; the per-order numbers at the
end are what `rollBodyGenes` → `B.thorax` draws from. Images in `ref/` with the `thorax-` prefix
(licences in `ref/README.md`).

## Sources read

1. Wikipedia, *Thorax (insect anatomy)*, *Scutellum (insect anatomy)*, *Mesosoma*, *Prothorax*,
   *Tegula (insect anatomy)*: https://en.wikipedia.org/wiki/Thorax_(insect_anatomy) ,
   https://en.wikipedia.org/wiki/Scutellum_(insect_anatomy) , https://en.wikipedia.org/wiki/Mesosoma ,
   https://en.wikipedia.org/wiki/Prothorax , https://en.wikipedia.org/wiki/Tegula_(insect_anatomy)
2. Wikipedia, *Morphology of Diptera* (thorax section; figure `Thorax-diptera-dorsal.svg`):
   https://en.wikipedia.org/wiki/Morphology_of_Diptera
3. Dessì, *Notes on Entomology: Flies — thorax* (transverse suture complete / interrupted, V-shaped
   in lower Diptera; postpronotal lobes = humeral calli; notopleuron; scutellum "subrounded or
   subtriangular"; acrostichal / dorsocentral bristle rows): https://www.giand.it/diptera/morphology/thorax/
4. NCSU General Entomology, *Thorax* (notum = scutum + scutellum; pleural suture):
   https://genent.cals.ncsu.edu/bug-bytes/thorax/
5. AntWiki, *Morphological terms: mesosoma* (notauli "arise anterolaterally near the anterior
   margin of the mesoscutum and converge toward the midline posteriorly"; parapsidal lines "a pair
   of narrow incised lines that extend anteriorly from the scutoscutellar suture"; axillae "small,
   roughly triangular, between mesoscutum and scutellum"; metanotum "broadly fused to the
   propodeum"), via search excerpt (site blocks fetch): https://www.antwiki.org/wiki/Morphological_Terms/Worker_Mesosoma
6. Bee glossary (mesoscutum "the largest sclerite dorsally on the mesosoma"; pronotum "collar-like,
   anteriormost"; parapsidal line "incised line at the side of the scutum"; axilla; propodeum):
   https://beeglossary.org/ ; BWARS glossary excerpt: parapsidal lines "half way between base of
   wing and mid-line", notauli "from the anterior border to about one-third of the mesoscutal
   length"; a species description with scutellum "0.6× as wide as mesoscutum".
7. Wikipedia, *External morphology of adult Chalcidoidea* (pronotum does not reach the tegula;
   notauli separate the mid lobe from the lateral lobes; axillae bounded by the scutoscutellar
   sutures): https://en.wikipedia.org/wiki/External_morphology_of_adult_Chalcidoidea
8. Wikipedia, *External morphology of Odonata* (prothorax small, synthorax carries both wing pairs
   and the mid and hind legs; humeral stripe follows the humeral suture "from the base of the front
   wing towards the base of the middle leg"; paler antehumeral stripe above it):
   https://en.wikipedia.org/wiki/External_morphology_of_Odonata ; Krischik (UMN) *Insect
   Morphology* notes: the odonate pterothorax "is tilted caudally by 45°"; Tillyard 1917 fig. 7
   (`thorax-odo-tillyard1917.jpg`): dorsal view A shows the collar-like prothorax P, the mid-dorsal
   carina `dr`, the paired mesepisterna `eps2` forming the apparent top of the thorax, the humeral
   suture `hb` running obliquely from the forewing base forward and outward.
9. University of Wyoming, *Grasshopper external anatomy* (pronotum "a prominent, saddle-shaped
   structure with lateral lobes that hide nearly all of the propleura"; median carina "barely
   visible to a conspicuously high crest"; "in many species only one sulcus cuts the median carina
   while in others two or three"; the rearmost is the principal sulcus dividing prozona and
   metazona; posterior margin "acute angle to obtuse angle, convex, truncate or emarginate";
   lateral carinae straight or incurved): https://www.uwyo.edu/entomology/grasshoppers/field-guide/ghparts.html ;
   Catantopidae phylogeny (PMC3264404): prozona : metazona length 1.0–1.2, 1.5–2.0 or > 2.3.
10. Carabid pronotum: Harpalus revision (MDPI Diversity 15:971): pronotum "transverse and narrower
    than the elytra, sometimes almost equal", shape "discoidal, rectangular-trapezoid or cordate,
    most often widest before the middle"; a Carabidae key: "pronotum strongly transverse and
    almost as broad as the elytra" vs "distinctly narrower"; a species description "pronotum 1.13×
    wider than long and 1.83× wider than head, elytra 1.51× wider than the pronotum". The Curtis /
    Janson plate (`thorax-col-engraving.jpg`) agrees: carabid pronota 1.3–1.9× the head, 0.55–0.85
    of the elytra, scutellum a tiny triangle at the elytral junction.
11. Cicadidae descriptions (PMC3677403, PMC9848499, PMC10851155): pronotal collar "almost half the
    length of the pronotum"; mesonotum with the X-shaped **cruciform elevation** at its rear
    (homologous to the scutellum), median and paramedian fasciae "along the parapsidal sutures".
12. 1911 Britannica, *Lepidoptera* (Wikisource): prothorax "very small", in many families with
    "a pair of small erectile plates — the patagia"; mesothorax "extensive; its scutum forming most
    of the dorsal thoracic area"; tegulae "beset with long hair-like scales are often
    conspicuous"; metathorax smaller. Noctuid descriptions: the thorax "often bears dorsal crests
    of scales"; patagia "about three times as wide as high".
13. Syrphidae descriptions (Wikipedia *Helophilus*, *Scaeva*, *Sphecomyia*; PMC6477872): scutum
    "black with a pair of broadly separated vittae", vittae "narrow behind the suture and are
    sometimes interrupted there"; "four bare vittae, two before the transverse suture and two
    after"; pollinose stripes on the scutum.
14. Engraving: Wikipedia *Hatching* ("hatching lines should always follow, i.e. wrap around, the
    form"; tone by "quantity, thickness and closeness"; contour hatching uses "curved lines to
    describe light and form of contours"); Wikipedia *Line engraving* on Marcantonio: figures
    "modeled boldly in curved lines, crossing each other in the darker shades, but left single in
    the passages from dark to light and breaking away in fine dots as they approach the light
    itself, which is of pure white paper".

## What the sources establish

### Ground plan

- Three nota: pronotum, mesonotum, metanotum. A wing-bearing notum splits into a large anterior
  **scutum** and a smaller posterior **scutellum** (4, 1). The scutellum of an insect is almost
  always the mesoscutellum; the metanotum is reduced in most orders (1).
- The relative size of the three nota is the single most order-specific thing about a dorsal
  view (2, 3, 8–12), and the sutures and sclerites visible on the dorsum differ by order more than
  the outline does. This is where per-order "species" variation should come from.

### Per order

**Coleoptera.** The dorsal thorax *is* the pronotum; meso- and metanotum are under the elytra
and only the small triangular scutellum shows between the elytral bases (1, 10). Pronotum
1.3–1.9× the head, 0.55–0.9 of the elytral width (0.6–0.85 in the plate), 1.1–1.5× wider than
long; widest before the middle (cordate, hind angles narrowed), at the middle (transverse, nearly
as wide as the elytra: scarabs) or with parallel sides (quadrate, rove and longhorn beetles).
Surface: punctate or smooth disc, a lateral bead (margin line), often a fine median line and a
pair of basal foveae near the hind margin (10).

**Diptera.** Prothorax and metathorax "considerably reduced"; the mesonotum "occupies most of the
region" (2, 3). Dorsal landmarks (fig. `thorax-diptera-dorsal.png`): postpronotal lobes =
humeral calli as two small ovals at the anterolateral corners; the **transverse suture** at
0.30–0.40 of the scutum, crossing completely in Calyptratae but "only the most lateral traits"
remaining in most Brachycera (interrupted in the middle), V-shaped in lower Diptera (crane
flies); notopleuron at the side between callus and wing root; the scutellum a tongue / semicircle
about 0.45 of the scutum's width and 0.3 of its length, protruding behind the scutum (3, 2).
Bristles sit in rows (acrostichal near the midline, dorsocentral beside them). Hoverflies and
tabanids carry 2–4 longitudinal vittae, narrowing or interrupted at the suture (13). Halteres on
the metathorax (already drawn by the wing block).

**Hymenoptera.** The mesosoma = pronotum (a collar wrapping the front of the scutum, not reaching
the tegula), mesoscutum (the largest dorsal sclerite), scutoscutellar suture, scutellum (broad,
shallow-convex, roughly 0.5–0.65 the scutum's width, rounded; in chalcids a disc with a hatched
frenum), axillae at its anterior corners, a narrow metanotum, then the propodeum which is the
first abdominal segment and narrows to the petiole (1, 5, 6, 7; fig. `thorax-hym-snodgrass.jpg`).
Lines on the scutum: **notauli** from the anterior margin converging backwards (V / Y shape, often
only the anterior third), **parapsidal lines** short, straight, about halfway between the wing
base and the midline, running forward from the scutoscutellar suture; sometimes a median line.
Tegulae are oval plates over the forewing base at the scutum's anterolateral corners, about
0.12–0.18 of the thorax width across.

**Odonata.** A small collar-like prothorax (about 0.12–0.2 of the thorax length) and a huge
**synthorax** tilted back 45°, so in dorsal view the top is formed by the two mesepisterna split
by the **mid-dorsal carina**, bounded laterally by the oblique **humeral sutures** that run from
each forewing base forward and outward toward the mid-leg bases (8). The wing bases sit along the
sides in the rear half; antehumeral stripes (pale) lie between carina and humeral suture. No
scutellum is visible. The thorax is narrower than the eyed head (0.7–0.9 of the head width in
Tillyard's figure) and about 1.5–1.8× as long as wide.

**Orthoptera.** The saddle-shaped pronotum covers the dorsum and most of the pleura and extends
back over the mesonotum; the tegmina hide the rest (9; fig. `thorax-orth-grasshopper.jpg`). On the
disc: a median carina from barely visible to a crest, lateral carinae parallel / incurved /
outcurved (cutting the disc from the lateral lobes), 1–3 transverse sulci of which the rearmost
(principal) sulcus is at prozona : metazona of 1.0–2.3, i.e. at 0.5–0.7 of the pronotum length;
posterior margin acute, obtuse, rounded or truncate (9, 9b).

**Hemiptera (cicada).** Pronotum with a pronotal collar about half its length; mesonotum large,
with paramedian (parapsidal) sutures and the X-shaped cruciform elevation at the rear in place of
a scutellum (11). In Heteroptera the scutellum is a large triangle, 0.4–0.6 of the pronotum's
width at its base (fig. `thorax-hem-heteroptera.png`); cicadas carry the cruciform elevation
instead.

**Lepidoptera.** Prothorax tiny with the paired patagia (collar lobes, ~3× as wide as high);
mesoscutum most of the dorsum; conspicuous hairy tegulae (large, 0.3–0.4 of the thorax length,
elongate); metathorax small; everything under scales and hair, often with a dorsal crest of
scales on the midline (12). Sutures are not visible through the pile.

**Neuroptera, Ephemeroptera, Tipulidae.** Ground plan with a small pronotum (0.1–0.2 of the
length), big mesonotum with a lunulate scutellum and a visible metanotum; crane flies carry the
V-shaped transverse suture of lower Diptera (3). Mayfly mesothorax is the dominant segment
(the forewing segment), the metathorax very small.

### Engraving

Tone on a convex body comes from hatching that wraps the form (14): short curved lines parallel
to the lateral outline, closest at the edge, opening out and breaking into single lines and dots
toward the dorsal highlight, which stays white paper. In insect plates the dorsal thorax is
usually left light with a band of contour hatching along each side and under the collar, and the
convex scutellum gets its own small shadow under its rear edge. This matches the project's
existing femur / tibia convention (far side shaded with short fine lines).

## Rules derived

Numbers are in the engine's terms: `t` runs 0→1 from the thorax top to its bottom
(`thorax.yAt(t)`), widths are fractions of the thorax half-width at that `t` (`thorax.hwAt`),
"head" is `P.headW`. Default (order) values are the current literals; ranges are what the seed
rolls.

### Profile (`P.thoraxAnchors`)

| order | front (pronotum) width / head | peak position `t` | hump 0–0.15 | waist at `t`=1 | length × default |
|---|---|---|---|---|---|
| beetle | 1.0–1.5 (the whole visible thorax is the pronotum); shape enum cordate (peak 0.3–0.4, end 0.7–0.8) / transverse (peak 0.45–0.55, end 0.82–0.9) / quadrate (peak 0.5, sides ≥ 0.9) / rounded (scarab, peak 0.55, end 0.75) | by shape | 0 | 0 | 0.85–1.15 |
| fly | 0.8–1.0 | 0.3–0.45 | 0.04–0.15 (humped mesonotum) | 0 | 0.9–1.15 |
| bee / wasp | 0.85–1.15 | 0.3–0.45 | 0.02–0.12 | 0.04–0.12 (propodeum to petiole) | 0.9–1.2 |
| dragonfly / damselfly | 0.6–0.8 (narrower than the head) | 0.4–0.55 | 0–0.05 | 0 | 0.95–1.2 |
| grasshopper | 1.0–1.3 | 0.3–0.45 | 0 | 0 (posterior margin enum angulate / rounded / truncate) | 0.9–1.2 |
| moth / butterfly | 0.9–1.3 (patagia widen the front) | 0.3–0.4 | 0.02–0.1 | 0 | 0.85–1.1 |
| cicada | 0.8–1.0 (head as wide as the thorax) | 0.3–0.4 | 0 | 0 | 0.9–1.15 |
| cranefly / lacewing / mayfly | 0.8–1.1 | 0.35–0.5 | 0.03–0.12 | 0 | 0.9–1.2 |

### Sutures

| order | lines (positions in `t`) | bow (fraction of hw; + = toward the tail) | weight |
|---|---|---|---|
| beetle | none across the disc; front margin arc (as now), median line 0/1 (odds 0.6), lateral bead 0/1 (0.7), basal foveae 0/1 (0.4) | — | F |
| fly | postpronotal edge at 0.08–0.14; transverse suture at 0.30–0.42, complete (0.4) or interrupted with a central gap of 0.25–0.5 hw (0.6), bow −0.05–+0.1; scutoscutellar line at 0.72–0.82 (bow −0.1–−0.25: the scutellum bulges forward into the scutum) | see left | D (suture), F (edges) |
| bee / wasp | pronotal collar 0.12–0.22 (bow +0.25–+0.45); scutoscutellar 0.6–0.72 (bow −0.1–−0.25); metanotal 0.82–0.9 (bow +0.05–+0.15); notauli 0/1 (0.5): from (±0.3 hw, collar) converging to (±0.08 hw, 0.45–0.65); parapsidal lines 0/1 (0.6): ±0.4–0.5 hw from scutoscutellar line forward 0.15–0.25 of the length; median line 0/1 (0.3) | | D / F |
| dragonfly / damselfly | prothorax collar 0.12–0.2 (bow +0.15–+0.3); mid-dorsal carina 0.2→0.9 (always); humeral sutures: from (±0.2–0.35 hw, 0.22–0.32) to (±0.8–0.95 hw, 0.5–0.62), a second parallel line 0/1 (0.5), antehumeral hatched stripe 0/1 (0.35) | straight | D, F |
| grasshopper | median carina (always, weight D or O for a crest); sulci: 2–3, the principal at 0.5–0.7 (prozona : metazona 1–2.3), others at 0.2–0.35 (and 0.38–0.48); lateral carinae 0/1 (0.6) at ±0.55–0.7 hw, straight or incurved | 0.08–0.2 | D (principal), F |
| moth / butterfly | patagia: two lobes at 0.03–0.18 covering ±0.1–0.55 hw; otherwise 0–1 bowed lines hidden by pile; dorsal crest 0/1 (0.35) | 0.1–0.25 | F |
| cicada | pronotal collar 0.25–0.35 (bow +0.1–+0.2); mesonotal paramedian sutures 0/1 (0.6) at ±0.3 hw, 0.4→0.72; cruciform elevation at 0.72–0.95 | | D |
| cranefly | V-shaped suture: from (±hw, 0.3–0.4) to (0, +0.12–0.2 lower) | — | D |
| lacewing / mayfly | pronotal 0.1–0.2 (bow +0.1–+0.2), scutoscutellar 0.6–0.75 (bow −0.1–−0.2), metanotal 0.82–0.9 0/1 | | D |

Weight D for the segment boundaries, F for lines on a sclerite (median line, parapsidal, carinae).
A line never reaches the outline: stop 0.5 px inside as the existing `bowLine` does.

### Scutellum

| order | shape | width / thorax width at its base | length / thorax length | hatched |
|---|---|---|---|---|
| beetle | triangle (apex down) over the elytral junction | 0.12–0.2 | apex 6–12 px below `yBot` | 0 |
| fly | lunule (tongue / semicircle), protruding 0–5 px past `yBot` | 0.3–0.5 | 0.18–0.3 | 0/1 (0.3: under its rear edge) |
| bee / wasp | lunule (0.6) or bilobed (0.4, a shallow median notch) between the scutoscutellar and metanotal lines; axillae triangles at its corners 0/1 (0.5) | 0.45–0.65 | 0.15–0.25 | 0/1 (0.3) |
| cicada | cruciform elevation (X of four arcs) | 0.3–0.45 | 0.15–0.25 | 0 |
| lacewing / mayfly / cranefly | lunule | 0.3–0.45 | 0.12–0.22 | 0/1 (0.2) |
| grasshopper, moth, odonata | none visible | — | — | — |

### Surface families

- **pile ticks** (moth / butterfly always, bee 0.6, hairy-marked abdomen orders inherit): edge
  ticks spacing 2.6–4 px, length 3–6 px, inward and slightly backward; interior scattered ticks
  at 0.3 of the edge density 0/1.
- **punctation** (beetle 0.6, cicada 0.2): dots r 0.6–0.8 on a jittered grid of spacing 4–6 px
  over the disc, leaving a 0.15 hw margin and the median line clear; "coarse" variant spacing
  3.2–4 near the sides only.
- **bands / vittae** (fly 0.55: syrphid and tabanid biased): 2 or 4 longitudinal hatched strips
  at ±0.15–0.22 hw (and ±0.42–0.52 hw), from 0.1 to the scutoscutellar line, each 0.08–0.14 hw
  wide, hatch spacing 3–3.6 px, interrupted at the transverse suture 0/1.
- **humeral calli** (fly always, cranefly 0.5): ovals rx 2.5–4.5, ry 0.7 rx at (±0.78 hw,
  0.08–0.14); **bristle rows** (fly 0.5): 3–5 dots per dorsocentral row at ±0.3 hw.
- **contour hatching** (every order, odds 0.6; always off where pile is on): along each side, short
  curved lines parallel to the outline, band width 0.12–0.25 hw, spacing 3–4 px (≥ 1.8 px at plate
  scale 0.55), weight F, from 0.1 to 0.9 of the length; dorsal highlight left white.

### Tegulae

Present on moth / butterfly, bee, wasp, lacewing, cicada (as now). Drawn centred on the forewing
root the wing block uses (`thorax.yAt(0.35)` moth and lacewing, `0.4` bee / wasp / cicada; root
x = 0.5 hw for moths, 0.72 hw otherwise), size rx 3–7 (moth 5–7, bee / wasp 3.5–5.5, lacewing
and cicada 3–5), ry / rx 0.5–0.8, tilt 20–40° following the wing's leading edge; moth tegulae
get 3–5 hair ticks on their outer edge.
