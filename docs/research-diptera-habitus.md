# Fly habitus in dorsal view: wing set, abdomen families, macrochaetae, legs

2026-10-14. Written for #54 (step 7 of "Nine plates, nine insects" in `plan-body-variation.md`). The numbers at the end
are what the fly entry in `ORDERS` (`habitus`, `abdFams`, `wingSets`, `wingSetFams`, `wingPlans`, `chaetae`,
`chaetaeKinds`, the `legs` / `ant` / `headFams` family rows) and `tests/check.js` (`DIP_SET`, `DIP_HAB`, `DIP_CHAETAE`,
`DIP_LEGS`) draw from. Images in `ref/` with the `dip-hab-` prefix (licences in `ref/README.md`); the venation stays
as `wing-venation-spec.md` (Diptera) and #9 / #10 have it.

## Sources read

1. McAlpine, J. F. et al. (eds.) (1981, 1987), *Manual of Nearctic Diptera*, vols. 1-2, Agriculture Canada Monographs
   27-28: the family keys and habitus figures of Tachinidae, Bombyliidae, Conopidae, Tabanidae, Asilidae and
   Syrphidae (paraphrased: tachinid abdomen with strong marginal and discal macrochaetae; bombyliid body densely
   pilose; conopid abdomen petiolate, the base narrow and the apex clubbed and often curled under; tabanid abdomen
   broad and flattened; asilid abdomen long and tapering; syrphid abdomen with yellow cross bands or spots).
2. Wikipedia, *Tachinidae*, *Bombyliidae*, *Conopidae*, *Horse-fly*, *Robber fly*, *Hoverfly* (resting postures: a
   tabanid and a house fly rest with the wings swept back in a delta over the abdomen; robber flies, conopids and many
   small flies fold them back over the abdomen, overlapping; hoverflies and bee flies often hold them out).
3. Photographs: `dip-hab-tachina.jpg` (*Tachina fera*, dorsal: wings half open in a delta, round abdomen with rows of
   stout bristles standing out past its sides), `dip-hab-bombylius.jpg` (*Bombylius major*: round, densely hairy body,
   the pile standing out all round, long slender legs, long straight proboscis), `dip-hab-physocephala.jpg`
   (*Physocephala rufipes*: the petiolate, clubbed abdomen, long porrect antennae, broad head),
   `dip-hab-tabanus.jpg` (*Tabanus bovinus* at rest: wings swept back in a delta over a broad abdomen),
   `dip-hab-episyrphus.jpg` (*Episyrphus balteatus*, dorsal specimen: flat banded abdomen); and the existing
   `dip-asilid-photo.jpg` (Asilidae: long tapering abdomen, long bristly legs).

## Findings

- **Wing set.** Set specimens spread the wings (as #9 drew every plate), but a fly at rest holds them one of two ways:
  swept back in a delta, half open over the abdomen (Tabanidae, Muscidae, Tachinidae; `dip-hab-tachina`,
  `dip-hab-tabanus`), or folded flat over the abdomen scissor-wise, one wing over the other along the midline
  (Asilidae, Conopidae, most Nematocera and acalyptrates). Folded, the wings are narrow at the base, so the sides of
  the abdomen show beside them, and in the long-bodied families (asilids, conopids) the abdomen runs on past the tips.
  The halteres lie under a folded wing.
- **Abdomen.** Muscidae: an oval about twice as long as wide (as drawn). Syrphidae: a flat oval with cross bands or
  paired spots. Tabanidae: broad and flat, wider than the thorax, widest near the base. Asilidae: long (about three
  times as long as wide and more), tapering from the base to a point. Tachinidae: short and round, with stout
  macrochaetae along the hind margins of the tergites, the lateral ones standing out past the outline. Bombyliidae:
  short and round, covered in long pile that blurs the outline. Conopidae: petiolate, a narrow stalk swelling to a
  club behind mid-length.
- **Legs.** Asilidae: long, stout and spiny, the forelegs raptorial (spined femora), often held forward. Tachinidae:
  stout and bristly. Bombyliidae: long and slender. Conopidae: a little long.
- **Head and antennae.** Conopidae: the head broader than the thorax ("thick-headed flies") and long porrect antennae
  with an elongate first flagellomere. Bombyliidae: a short stylate antenna, a hairy face and a long proboscis.
  Tachinidae: a bare arista, the eyes usually separate.

## Rules derived (what the engine draws)

- `P.fam` adds tachinid, bombyliid and conopid to muscid, nematoceran, syrphid, tabanid and asilid (eight families,
  equal weights). The new families' wings are drawn on the plan of their nearest family (`wingPlans`: tachinid on the
  muscid plan, bombyliid on the tabanid plan, conopid on the syrphid plan, cell r4+5 closed) with no vena spuria; the
  venation is unchanged.
- Wing set `B.wing.set` from the family's weights (`wingSetFams`): spread (theta 24-56 degrees below the horizontal),
  half (58-72), folded (94-106, the hind margin over the midline; the left wing is the mirror image, drawn over the
  right, so the pair overlaps scissor-wise). A folded wing whose outline would cover the abdomen's side along its
  whole length turns further in, 1.5 degrees a step, to at most 118 (no rng). A folded wing's span is 1.0-1.12
  root-to-abdomen-tip lengths times the family's `foldReach` (asilid 0.7, conopid 0.7, nematoceran 0.78). The
  halteres go under a half or folded wing. A shallow spread is capped at 2.4 root-to-tip lengths (`DIP_SPAN_MAX`).
- Abdomen per family (`habitus`: width and length scales and anchors; `abdFams`: tips, marks, peak, width factor):
  syrphid banded / spotted oval (length per width 1.1-2.3); tabanid broad (at least 1.15x the thorax), widest in its
  basal half; asilid long (at least 2.6x as long as wide) and tapering (`tailFit`: the pointed tail takes the profile's
  own width); tachinid and bombyliid round (at most 1.45x as long as wide); conopid petiolate (the base at most half
  the widest width, the widest behind t 0.45); nematoceran slender.
- Macrochaetae (`chaetae`, `chaetaeKinds`): bristles, 2-3 a side at the hind margin of each of the last 2-4 tergites,
  9-14 body units, 28-45 degrees out from straight back (tachinid always, muscid 45 %, asilid 35 %); fur, fine pile all
  round the abdomen at a 2.2-3 pitch, 2.8-4.5 long, 55-75 degrees out (bombyliid always, syrphid 25 %). Every mark
  starts on the rim and stands outside the outline, so it is not a mark inside a segment (#15) and not in the pitch
  element; its spacing goes through `floorPitch`.
- Legs: asilid `lenK` 1.62-1.85 with both femur and tibia spined, the raised pose favoured; tachinid stout and always
  spined; bombyliid long and slender; conopid a little long.
- Not drawn: the bee fly's proboscis (the fly's mouthparts stay hidden under the head, `plan-body-variation.md` step 5),
  the conopid's curled-under abdomen tip, discal (dorsal) macrochaetae.
