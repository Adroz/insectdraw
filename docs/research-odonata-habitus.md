# Odonata habitus: families, abdomen profiles, wing set and leg pose (#48)

Grounding for step 1 of "Nine plates, nine insects" (`plan-body-variation.md`): what makes one dragonfly or damselfly
family read differently from another in dorsal view, at the size of one plate on a contact sheet. The thorax and head
notes are in `research-thorax.md` (Odonata) and `research-head-eyes.md` (odonate eyes, gomphid separation); the
venation is untouched here (`wing-venation-spec.md`, #17, #18).

## References (docs/ref, Wikimedia Commons, CC BY-SA 4.0)

| file | subject | source |
|---|---|---|
| odo-hab-libellula.jpg | *Libellula depressa* (Libellulidae) male, dorsal: short, flattened abdomen about as wide as the thorax, widest at S3-S5, tapering to S10; wings flat and square to the body | [Broad-bodied chaser (Libellula depressa) male dorsal side.jpg](https://commons.wikimedia.org/wiki/File:Broad-bodied_chaser_(Libellula_depressa)_male_dorsal_side.jpg) |
| odo-hab-gomphus.jpg | *Gomphus vulgatissimus* (Gomphidae) male, dorsal: eyes well apart, slender S3-S6, the club at S7-S9; hindwings a little behind square | [Common clubtail (Gomphus vulgatissimus) male Estonia 2.jpg](https://commons.wikimedia.org/wiki/File:Common_clubtail_(Gomphus_vulgatissimus)_male_Estonia_2.jpg) |
| odo-hab-cordulia.jpg | *Cordulia aenea* (Corduliidae) male: swollen S1-S2, waisted at S3, a slight club behind | [Downy emerald (Cordulia aenea) male.jpg](https://commons.wikimedia.org/wiki/File:Downy_emerald_(Cordulia_aenea)_male.jpg) |
| odo-hab-lestes.jpg | *Lestes sponsa* (Lestidae) male: wings held half open at rest, swept back from the body | [Emerald damselfly (Lestes sponsa) male 3.jpg](https://commons.wikimedia.org/wiki/File:Emerald_damselfly_(Lestes_sponsa)_male_3.jpg) |
| odo-hab-platycnemis.jpg | *Platycnemis pennipes* (Platycnemididae) male: mid and hind tibiae dilated into flat white leaves | [White-legged damselfly (Platycnemis pennipes) male.jpg](https://commons.wikimedia.org/wiki/File:White-legged_damselfly_(Platycnemis_pennipes)_male.jpg) |
| odo-hab-calopteryx.jpg | *Calopteryx virgo* (Calopterygidae), pinned: broad wings narrowing gradually to the base with no stalk, a long slender abdomen | [Calopteryx virgo meridionalis MHNT.jpg](https://commons.wikimedia.org/wiki/File:Calopteryx_virgo_meridionalis_MHNT.jpg) |

Also: Dijkstra & Lewington, *Field Guide to the Dragonflies of Britain and Europe* (2006), family keys (abdomen shape,
eye contact, wing posture at rest); Wikipedia *Aeshnidae*, *Libellulidae*, *Gomphidae*, *Corduliidae*, *Lestidae*,
*Platycnemididae*, *Calopterygidae*.

## What tells the families apart from above

- **Aeshnidae** (hawkers, emperors): the longest abdomen of the order, slender and near-parallel, often slightly waisted
  at S3; large eyes meeting along a long seam on the top of the head.
- **Libellulidae** (chasers, skimmers, darters): a short abdomen, in *Libellula* broad and flattened, widest at S3-S5
  (about twice the width of an aeshnid's), tapering from there to a point; eyes meeting at a short seam.
- **Gomphidae** (clubtails): the eyes widely separated (the only anisopteran family with that, `research-head-eyes.md`);
  a slender mid abdomen with S7-S9 swollen into a club.
- **Corduliidae** (emeralds): S1-S2 swollen, a waist at S3, then a near-rod or a slight club.
- **Coenagrionidae** (bluets, damsels): the thin rod; wings closed or a little open; two antenodals (#17).
- **Lestidae** (spreadwings): wings held half open at rest, swept back from the body; a long, thin abdomen; two antenodals.
- **Calopterygidae** (demoiselles): broad wings without a stalk, an antenodal ladder (#17), a long abdomen.
- **Platycnemididae** (featherlegs): mid and hind tibiae flattened into broad leaves; two antenodals; a shorter abdomen.

Dorsal patterns are the family's too but vary within it, so the engine rolls them per seed: paired spots on each
tergite (*Libellula*, *Cordulegaster*), a dark ring at the base of every segment (most coenagrionids, *Platycnemis*),
a dark tip over S7-S10 or a pale one under a dark ring (*Ischnura*, *Lestes*), alternating dark tergites.

## Rules derived (what the engine draws)

- `P.fam` in the entry's `proportions`: dragonfly aeshnid / libellulid / gomphid / corduliid, damselfly coenagrionid /
  lestid / calopterygid / platycnemidid, equally likely. The family sets the abdomen's length and width factors
  (aeshnid 1.08-1.2 long and 0.8-0.95 wide, libellulid 0.68-0.8 long and 1.8-2.5 wide, gomphid 1.35-1.55 wide over a
  narrower profile, corduliid 1.1-1.3; damselfly coenagrionid 0.88-1.05 long, lestid 1.04-1.16, calopterygid 1.08-1.2,
  platycnemidid 0.82-0.95).
- Abdomen width profile (`B.abd.profile`, `ABD_PROFILES`): rod (the order's anchors), broad (widest at t 0.24, tapering
  from S3), club (slender S3-S6; the clubbed tip makes S7-S9), waisted (narrowest at t 0.19 behind swollen S1-S2). The
  families' tables (`abdFams`) pick from them: aeshnid rod or waisted, libellulid broad, gomphid club, corduliid waisted.
- Dorsal patterns (`marks`): plain, banded, spotted (paired spots), rings (the banded hatch over the basal 40-60% of
  every segment), tip-dark (S7-S10: 2-4 segments), striped; all inside the abdomen's deferred mark element, so the 3 px
  pitch floor (#15) holds.
- Wing set (`B.wingSet`, the entry's `wingSet`): forewing sweep -10..+15 degrees at the root, the hindwing a further
  0..12 (the lestid's forewing 20..35, hindwing a further 0..8); the wing block adds a few degrees of the old per-wing
  jitter and still separates the pair at the roots (#18). The venation is unchanged.
- Leg pose: the prey basket, or (one plate in three) tucked: the legs folded forward close against the thorax and the
  back of the head, as on a specimen at rest.
- Platycnemidid: the mid and hind tibiae 2.1-2.6 times as wide (`tibFlat`), drawn as flat leaves.
- Gomphid eyes apart (`apart: 1`), aeshnid eyes larger (meeting along a longer seam).
