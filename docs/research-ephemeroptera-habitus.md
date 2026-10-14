# Mayfly habitus in dorsal view: families, hindwing, tails, male forelegs

2026-10-15. Written for #50 (step 3 of "Nine plates, nine insects" in `plan-body-variation.md`). The rules at the end
are what the mayfly entry in `ORDERS` (`proportions`, `famScale`, `abdFams`, `headFams`, `legSexes`, `tails`,
`hindwing`, `foreFams`, `wingSets`) and `tests/check.js` (`EPH_HAB`) draw from. Images in `ref/` with the `eph-hab-`
prefix (licences in `ref/README.md`); the venation inside the wing stays as `wing-venation-spec.md` (Ephemeroptera, #59)
has it.

## Sources read

1. Wikipedia, *Mayfly* (imago: one or two pairs of wings, the hindwing much smaller and reduced or absent in some
   families; two or three long cerci, the median caudal filament present or lost; the male's forelegs much longer than
   the other legs, held forward in flight and used to grasp the female; the male's large, in some families divided,
   eyes): https://en.wikipedia.org/wiki/Mayfly
2. Wikipedia, *Ephemeridae*, *Baetidae*, *Heptageniidae*, *Caenidae* (family diagnoses, paraphrased): Ephemeridae large
   burrowing mayflies with three tails and patterned (often dark-spotted) wings and abdomen; Baetidae small, two tails,
   hindwing minute or absent, males with turbinate (upper, stalked) eyes; Heptageniidae dorsoventrally flattened
   ("flat-headed mayflies"), the head broad, two tails; Caenidae small, three tails, no hindwing, the forewings broad.
3. Elliott, J. M. & Humpesch, U. H. (2010), *Mayfly larvae (Ephemeroptera) of Britain and Ireland*, FBA Scientific
   Publication 66, and Harker, J. (1989), *Mayflies*, Naturalists' Handbooks 13: the adult keys separate the British
   families by tail count, hindwing presence and size, and wing venation; *Ephemera* tergites with dark longitudinal
   marks or triangles on the posterior segments (paraphrased).
4. Photographs and a plate: `eph-hab-ephemera-vulgata.jpg` (Dutch "driehoekeendagsvlieg", the triangle mayfly: dark
   triangles on the tergites, three tails), `eph-hab-ephemera-danica.jpg`, `eph-hab-ecdyonurus.jpg` (Heptageniidae:
   broad head, banded and dark-marked tergites, two long tails), `eph-hab-baetis-male.jpg` (Baetidae male: turbinate eyes,
   two tails, no hindwing visible), `eph-hab-caenis-stephens.jpg` (Stephens 1835: *Caenis*, broad forewings, no hindwing,
   short stout abdomen, three tails several abdomen lengths long), `eph-hab-caenis-imago.jpg`.

## Findings

- **Families.** The four commonest families of a European plate differ in silhouette before venation: Ephemeridae
  large and long-bodied, three tails, dark dorsal triangles or bars on the hind tergites; Baetidae small and slender, two
  tails, the hindwing a minute strap or absent; Heptageniidae with a broad flattened head and body and two long tails;
  Caenidae small, short and stout, the forewings broad and rounded, no hindwing, three tails (1-4).
- **Hindwing.** Large (about a third of the forewing, #59's oval with the costal process), small (a narrow strap a
  tenth to a sixth of the forewing with one to three veins, Baetidae), or absent (Caenidae, many Baetidae) (1, 2).
- **Tails.** Two cerci and, in some families, a median filament of about the same length; from about the abdomen's
  length to two and a half times it (longer in males and in Ephemeridae and Heptageniidae; the Stephens *Caenis* plate
  draws them even longer). Set specimens show them held close together, spread, or splayed wide; the cerci are thick at
  the base and taper to fine tips (1, 4).
- **Male forelegs.** About twice the mid leg and held forward along the antennae (in life and on many plates; the
  female's are little longer than the other legs) (1; `eph-hab-ephemera-vulgata`, `eph-hab-ecdyonurus`).
- **Eyes.** Male Baetidae have turbinate eyes (an upper stalked part above the lateral eye); the other families' males
  have large eyes but not turbinate (1, 2; `eph-hab-baetis-male`).
- **Abdomen.** Rod-like in most; broader and flattened in Heptageniidae, short and broad in Caenidae (2).
- **Wing set.** Plates show the forewings pushed forward with the hind margin square to the body (the setting-board
  pose), held straight out (a spent spinner on the water), or swept partly back.

## Rules derived (what the engine draws)

| gene | values | where |
|---|---|---|
| family (`P.fam`) | ephemerid / baetid / heptageniid / caenid, 1:1:1:1 | `proportions` |
| sex (`P.sex`) | male / female, 1:1 | `proportions` |
| family scales (no rng) | ephemerid abdomen length 1.12, thorax 1.05-1.08; baetid 0.8-0.82 all over and the abdomen 0.6 wide (drawn smaller: the plate is at the scale cap); heptageniid head 1.8 wide, abdomen 1.7 wide; caenid abdomen 0.66 long and 1.35 wide | `famScale` |
| abdomen profile | ephemerid rod 2 : broad 1; baetid rod; heptageniid broad 2 : rod 1; caenid broad | `abdFams.profiles` |
| tergite pattern | ephemerid dorsal triangles 4 : banded 1 : striped 1 (triangles from segment 1-4 back, base 0.4-0.6 of the half width, 0.65-0.9 of the segment high, hatched at the plate pitch); other families plain / banded / spotted / striped / tip-dark by family | `abdFams.marks`, `B.abd.tri`, `drawAbdomen` |
| hindwing class | ephemerid and heptageniid large (0.22-0.36 of the forewing); baetid small (0.1-0.16, 1-3 veins fanning from one point) 2 : absent 1; caenid absent | `hindwing`, `wingsEphemeroptera` |
| forewing | caenid width 0.47-0.52 of its length and 1.5x as long over the abdomen; ephemerid 0.95x; the per-plate length 0.8-1.15 abdomen lengths | `foreFams`, `wingsEphemeroptera` |
| wing set (`B.wing.set`) | forward (-24 to -14 degrees), square (-10 to -1), back (3 to 12), 1:1:1; the hindwing keeps its angle to the forewing | `wingSets` |
| tails | ephemerid 3, 0.9-2.0 abdomen lengths; baetid 2, 0.8-1.6; heptageniid 2, 1.0-2.5; caenid 3, 1.0-2.0; splay close (5-12 degrees) / spread (15-24) / wide (27-38), a bow -24 to +12; tapering; shortened (never under 0.8) so the plate keeps scale 0.7 | `tails`, `drawTails` |
| male forelegs | femur 2.1-2.6x the mid leg's, the raised pose (held forward); female 0.95-1.15x, spread / walking / tucked | `legSexes` |
| turbinate eyes | male baetids, odds 0.85 | `headFams.baetid` |
| family noun | ephemerid Drake / Spinner; baetid Olive / Watery / Dun; heptageniid Upright / Brown / Quill; caenid Broadwing / Curse | `names.common.famNouns` |

Not drawn: wing pigment (the dark-spotted *Ephemera* wing; the venation is held to #59's rules) and the resting pose with
the wings closed upright over the back (in dorsal view the wings would be seen edge-on).
