# Orthoptera habitus in dorsal view: tegmen length, the groundhopper's pronotum, ovipositor, wing set, hind legs

2026-10-26. Written for #72 (step 9 of "Nine plates, nine insects" in `plan-body-variation.md`). The numbers at the end
are what the grasshopper entry in `ORDERS` (`orth`) and `tests/check.js` (`ORTH72`) draw from. Images in `ref/` with
the `orth-hab-` prefix (licences in `ref/README.md`). The pronotal saddle, the hind femur and the venation stay as
`research-thorax.md` (Orthoptera), `research-legs-eyes-antennae.md` and `wing-venation-spec.md` (Orthoptera) have them.

## Sources read

1. Wikipedia, *Tetrigidae* (https://en.wikipedia.org/wiki/Tetrigidae): the pronotum extends over the length of the
   abdomen, sometimes to the tip of the wings, and ends in a point; in other Orthoptera it covers neither the abdomen
   nor the wings; the forewings scale-like, the hindwings developed (paraphrased).
2. Wikipedia, *Tetrix subulata* (https://en.wikipedia.org/wiki/Tetrix_subulata): usually well-developed hindwings,
   flies readily (paraphrased); photographs `orth-hab-tetrix-subulata` (the pronotum past the abdomen's tip) and
   `orth-hab-tetrix-undulata` (a short-pronotum *Tetrix*, ending about at the abdomen's tip).
3. Wikipedia, *Pholidoptera griseoaptera* (https://en.wikipedia.org/wiki/Pholidoptera_griseoaptera): the male's
   rounded brachypterous tegmina about as long as the pronotum, the female's 1-2 mm half-round pads or nearly
   wingless, no macropterous form recorded; the female's ovipositor sickle-shaped and upcurved, 8-10 mm on a 15-20 mm
   body (paraphrased); photograph `orth-hab-pholidoptera`.
4. Wikipedia, *Metrioptera brachyptera* (https://en.wikipedia.org/wiki/Metrioptera_brachyptera): wings usually
   brachypterous, long-winged morphs occur (paraphrased); photograph `orth-hab-metrioptera` (female, tegmina about
   half the abdomen).
5. Photograph `orth-hab-chorthippus-female` (*Chorthippus parallelus* female): the tegmina short and lateral, about
   half the abdomen, the banded tergites showing behind them; the species is the textbook brachypterous acridid
   (females usually brachypterous, the macropterous form rare).
6. Photograph `orth-hab-ephippiger` (*Ephippiger ephippiger*): the saddle-backed bush-cricket, the tegmina reduced
   to stridulatory pads under the raised hind part of the pronotum.
7. Wikipedia, *Tettigoniidae* (https://en.wikipedia.org/wiki/Tettigoniidae): sickle-shaped ovipositors (eggs laid in
   plant matter) or uniform long ones (eggs laid in grass stems) (paraphrased). Wikipedia, *Tettigonia viridissima*:
   the female's ovipositor 23-32 mm on a 32-42 mm body, reaching the end of the tegmina, slightly curved (paraphrased);
   photograph `orth-hab-tettigonia-female`.
8. Photograph `orth-hab-oedipoda-set` (*Oedipoda caerulescens*, a set museum specimen, dorsal, MHNT): the setting-board
   pose of a band-winged grasshopper (Oedipodinae): each tegmen held straight out or a little back of square, the
   hindwing fan opened behind it, about as long as the tegmen, its leading edge under the tegmen's hind margin, its
   anal lobe running back beside the abdomen to about its middle; the hind legs held back along the body.

## Findings

- **Tegmen length classes.** Orthoptera are wing-polymorphic, within families and within species. Macropterous: the
  tegmina reach past the abdomen (as #22 drew every plate). Brachypterous: the tegmina 0.3-0.6 of the abdomen, the
  tergites and their marks showing behind them (*Chorthippus parallelus* females, *Metrioptera brachyptera*; 4, 5).
  Micropterous: short rounded pads beside the pronotum's hind margin, the abdomen bare (*Pholidoptera*, *Ephippiger*;
  3, 6). The hindwing fan, folded under the tegmen, shows only on a macropterous insect.
- **The groundhopper (Tetrigidae).** The pronotum is prolonged back over the whole abdomen to its tip or past it and
  tapers to a point; the tegmina are small lateral scales at its sides (1, 2). Seen from above, the pronotum is the
  insect: a long shield from the head back, the legs beside it.
- **The bush-cricket's ovipositor (Tettigoniidae).** A sabre: long and straight to slightly curved (*Tettigonia*,
  *Conocephalus*: as long as the abdomen or longer), or shorter and strongly upcurved, sickle-like, its broad
  lateral valves showing from above (*Phaneroptera*, *Pholidoptera*) (3, 7). Acridids and groundhoppers carry short
  digging valves.
- **Wing set.** Set specimens of band-winged grasshoppers are pinned in the setting-board pose (8); everything else in
  the references is at rest with the wings folded.
- **Hind legs.** At rest and on set specimens the hind femur is often held back along the body (8; most photographs),
  rather than splayed out as a jumping leg on a plate.

## Rules derived (what the engine draws)

- `orth.tegmen` (per class: `len`, the tegmen length per abdomen length; `wK`, its width; `lobe`, a lateral pad or
  scale; `ends`, `ORTH_ENDS`): macropterous 1.05-1.18 (#22's range), brachypterous 0.28-0.56,
  micropterous 0.12-0.2, scale 0.08-0.13; `tegFams`: acridid macro 3 / brachy 2 / micro 1, tettigoniid 2 / 2 / 2,
  tetrigid scale only. A brachypterous tegmen is also narrower (0.78 of the macropterous width) and its veins end nearer
  the apex, so they run down it (the lanes and crossveins are #22's; only where they meet the margin moves); it keeps the folded tegmina's overlap along the inner margin (Metrioptera males; a
  simplification for the acridid female, whose short tegmina are lateral). A micropterous pad and a scale are rounded
  lateral lobes that never reach the midline; the scale stands out past the edge of the groundhopper's process.
- The folded hindwing fan only under macropterous tegmina (`orthTegmen`).
- `orth.process` (keyed by family, the tetrigid only): the pronotum from the saddle's widest point back past the abdomen's tip by 0.04-0.16
  abdomen lengths, 0.85-1.0 of the saddle's width over the abdomen's base, tapering to a point; the median carina runs on
  along it. Its outline counts as a wing for the legs' and antennae's clearance rules (`orthTetrigid`).
- `orth.ovipositor` (tettigoniid, on a plate whose valves roll present, about half: the females): 0.52-0.98 abdomen
  lengths, straight (an even blade tapering in its last fifth) or upcurved (seen from above, a sickle's broad face,
  widest past the middle); the other families keep the short valves (`orthOvipositor`). The ticket's range was 0.5-1.0;
  *Tettigonia viridissima* reaches past it, which the plate does not draw.
- `orth.sets` / `orth.open`: only a macropterous acridid rolls a set, folded or open (1 : 1). Open: the tegmen held out
  2-26 degrees back of square from a root beside the midline under the pronotum, the hindwing 0.84-1.0 of its length
  opened behind it from the entry's hindwing root (radiating veins and ladder rungs, as the folded fan), its anal lobe
  reaching 0.72-1.08 of a round fan's hind margin, neither across the midline (`orthWingSet`).
  The dark band of the Oedipodinae hindwing is not drawn.
- `orth.hindPoses` / `orth.along`: the hind leg splayed (as #8) or held along the body, the femur 64-74 degrees back
  from straight out, the tibia 84-94 (acridid 2 : 1, tettigoniid 1 : 1, tetrigid 2 : 1), within #8's leg rules; the
  along pose is the leg's own angles in every pose it may fall back to, so the wing repair keeps it (`orthHindLeg`).
