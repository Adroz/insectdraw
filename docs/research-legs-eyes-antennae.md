# Legs, compound eyes, antennae — research notes and drawing rules

Sources consulted (2026-10-01):

- Arthropod leg (segments, tarsomeres, pretarsus, tibial spurs, leg types): https://en.wikipedia.org/wiki/Arthropod_leg
- Insect morphology (leg ground plan, 2–5 tarsomeres): https://en.wikipedia.org/wiki/Insect_morphology
- NCSU General Entomology, legs (pretarsus: ungues, arolium, empodium, pulvilli; cursorial/saltatorial/raptorial/fossorial/natatorial): https://genent.cals.ncsu.edu/bug-bytes/thorax/legs/
- Diptera leg morphology (coxa short/stout, trochanter short, basitarsus longest, 5 tarsomeres, claws + 2 pulvilli + setaceous empodium): https://www.giand.it/diptera/morphology/legs/
- Diptera aristate antenna (scape, pedicel, postpedicel + arista): https://www.giand.it/diptera/morphology/antennae/
- Grasshopper external anatomy, U. Wyoming (hind tibia: double row of spines on posterior edges, two pairs of apical spurs/calcars; antennae filiform; eyes round/elliptical; 3 ocelli): https://www.uwyo.edu/entomology/grasshoppers/field-guide/ghparts.html
- Grasshopper femur herringbone/chevron muscle pattern: https://www.researchgate.net/figure/A-hind-leg-morphology-of-a-grasshopper-21_fig2_258098901 and https://jb004.k12.sd.us/MY%20WEBSITE%20INFO/BIOLOGY%202/ANIMAL%20KINGDOM/GRASSHOPPER%20DISSECTION/Grasshopper%20Dissection.htm
- Honey bee corbicula (flattened concave hind tibia, wide flat basitarsus with pollen comb, pollen press; female antenna 12 segments, male 13): https://en.wikipedia.org/wiki/Pollen_basket , https://americanbeejournal.com/how-to-identify-a-honey-bee/
- Antenna types, Amateur Entomologists' Society: https://www.amentsoc.org/insects/fact-files/antennae.html ; antenna structure (scape/pedicel/flagellum, geniculate, lamellate, aristate): https://en.wikipedia.org/wiki/Antenna_(biology)
- Odonata morphology (dragonfly eyes meet on top of head, up to ~28–30k ommatidia; damselfly eyes well separated; antennae short bristle-like; long spines on femur and tibia): https://en.wikipedia.org/wiki/External_morphology_of_Odonata , https://www.britannica.com/animal/Odonata/Form-and-function
- Fly eyes: holoptic males (eyes touching), dichoptic females; Musca ~4000 ommatidia: https://en.wikipedia.org/wiki/Holoptic_arrangement , https://www.k-state.edu/parasitology/classes/625arth44.html
- Bee eye: large kidney-shaped, 5–6k ommatidia: https://www.bumblebee.org/bodyEyehtm.htm ; Tipulidae: 13-segmented antennae, very long slender legs: https://en.wikipedia.org/wiki/Crane_fly
- Cicada fore femora "armed beneath by two strong spines and frequently a third smaller distal spine": https://groups.csail.mit.edu/mac/projects/psyche/69/69-042.html
- Beetle eyes often notched (emarginate) at the antennal insertion; 11 antennomeres typical: https://www.zoology.ubc.ca/bcbeetles/Text%20files/family%20descriptions.htm
- Engraving tone: stipple/line engraving; shade the far side of cylinders with short parallel lines: https://www.britannica.com/art/stipple-engraving , https://en.wikipedia.org/wiki/Line_engraving

## Drawing rules derived

### Legs (coxa – trochanter – femur – tibia – tarsus – pretarsus)
- Six segments. Coxa short and stout (~0.2 femur length), trochanter a short wedge (~0.25 of coxa, i.e. ~1/8 femur) that sets the first visible bend between coxa and femur; femur the stoutest and longest; tibia ~0.9–1.0 femur length, slenderer (~0.6–0.7 femur width at the base); tarsus ~0.45 femur length.
- Taper: femur widest in the proximal third, narrowing to the "knee"; tibia widens slightly to its apex (spur base). Joints are drawn as overlapping rounded ends (the distal segment's base tucked into the proximal one).
- Tarsus: 3–5 tarsomeres, basitarsus the longest (~0.35 of tarsus), then shrinking; each a small bead. Pretarsus: two curved claws diverging ~25–35° each side, and between them a small pad (arolium; in flies a pair of pulvilli with a bristle empodium between).
- Tibial spurs: 1–2 movable spurs at the tibia apex on the inner side (grasshopper hind tibia: two pairs; bee, wasp, cricket: conspicuous). Spines: fixed, in rows along the posterior/outer edge of the tibia (grasshopper hind tibia double row; dragonfly femur AND tibia with long spines forming a prey basket; cicada fore femur with 2–3 ventral teeth).
- Order specifics: grasshopper hind femur enormous (~2× other femora), with a chevron/herringbone muscle pattern on the outer face; bee hind tibia flattened, widening to a concave corbicula fringed with long hairs, basitarsus broad and flat with comb rows; fly tarsi carry pulvilli; crane fly legs very long and thread-thin with clear joints; beetle legs stout with broad short tarsi. Lacewing (Chrysopidae, #19; refs neu-nothochrysa, neu-chrysoperla): all six legs slender walking legs, the forelegs on the prothorax and held forward and out, never raised beside the head like a mantid's or mantidfly's (the engine rolls walking / spread only, coxa ahead of the pronotal collar).
- Grasshopper hind femur (#23; refs `ref/leg-orth-femur.jpg`, `ref/leg-orth-psm1891.jpg`). Measured on the lateral
  micrograph (outer face, femur 990 px from the trochanter to the genicular lobe): deepest 227 px at 0.19 of the
  length, so **4.4× as long as deep**; depth 0.75 of the maximum at the trochanter, 0.78 at mid-length, 0.5 at 0.7,
  0.3 just before the knee, then the genicular lobe swells slightly (0.4). The PSM 1891 engraving (oblique outer face)
  gives 3.6× (deepest at 0.24, 0.46 at the knee); the photo of a live Caelifera (Commons "Grasshopper 5 leg.jpg",
  seen obliquely, not saved) about 3.8×. A drumstick, not a carrot: the profile swells over the first fifth and
  narrows over the distal two thirds. The chevron (herringbone, pinnate extensor) pattern covers the whole outer
  face from the base to about 0.82, the ribs meeting on a longitudinal line a little below the middle and leaning
  back toward the base at the carinae (chevrons point to the knee); about 14 of them. Engine: `femurGeom` fits one
  cubic per edge to the measured depths (`FEMUR_PROFILE`), the roll is 3.8–4.6× (`g.femFrac`), the herringbone runs
  0.03–0.86 at ~L/18; `hindFemur` in `tests/check.js` holds 3.6–4.8×, deepest at 0.12–0.4, chevrons over 0.1–0.8.
- Engraving: shade the far (outer-lower) side of each femur/tibia with short parallel fine lines (SW.F) running across the segment, denser near the edge, leaving the near side white.

### Compound eyes
- Ommatidia are hexagonally packed; engravers show them as a regular honeycomb or a staggered dot/dash grid over the darker part of the eye, leaving a clean white highlight toward the light (upper-inner quadrant).
- Shape/placement per order: dragonfly — huge, meeting (or nearly) on the dorsal midline; damselfly — dumbbell head, eyes at the ends of a wide head, well separated; fly — large, nearly meeting (holoptic) on top; bee/wasp — tall kidney-shaped eyes on the sides of the head; moth/butterfly — large round; beetle — oval, notched at the front by the antennal socket; grasshopper — prominent oval; cicada — bulging at the head corners; mayfly — large, dorsal; crane fly/lacewing — moderate round.

### Antennae (scape – pedicel – flagellum)
- Base: antennal socket on the face between/just in front of the eyes (dorsal view: on the upper-front of the head capsule), drawn as a tiny ring with the scape rising from it.
- filiform: thread-like, many short equal segments (grasshopper ~20–25 visible; lacewing, wasp 12–13 longer ones). moniliform: beaded (beetles). serrate: saw-toothed one side (click beetles). pectinate/bipectinate: comb teeth on one/both sides, longest mid-length, tapering to the tip (male moths). clubbed/capitate: thin shaft with a gradual club (butterflies); skippers hook the club back (apiculus). geniculate: long scape, short pedicel, elbow, then a 10–11-segment flagellum (bees 12 total ♀ / 13 ♂, wasps ~12–13). lamellate: 8–10 short segments then a fan of 3 flattened plates (scarabs; 11 total). aristate: 3 short segments, enlarged postpedicel with a dorsal bristle arista (house flies). setaceous: short tapering bristle (dragonfly, damselfly, mayfly, cicada: 7 segments, tiny).
