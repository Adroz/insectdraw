# Moth and butterfly habitus in dorsal view: wing set, abdomen by family, legs

2026-10-15. Written for #52 (step 5 of "Nine plates, nine insects" in `plan-body-variation.md`). The rules at the end
are what the moth entry in `ORDERS` (`wingSet` = `LEP_WING_SETS`, `abdFams`, `famScale`, the `legs` rows with
`LEP_POSE_ANG`, `LEP_POSE_LEN`, `LEP_POSE_ANG_NYM`, `LEP_BRUSH`) and `tests/check.js` (`LEP_SET`, `LEP_ABD`, `LEP_LEGS`)
draw from. Images in `ref/` with the `lep-hab-` prefix (licences in `ref/README.md`). The wing outlines, venation and
patterns stay as `research-lepidoptera-wings.md` has them (#13 the pattern bands, #27 the antenna club and proboscis).

## Sources read

1. Photographs of set specimens, Muséum de Toulouse (MHNT), Didier Descouens: `lep-hab-sphinx.jpg` (*Sphinx ligustri*,
   Sphingidae, male, dorsal), `lep-hab-saturnia.jpg` (*Saturnia pavonia*, Saturniidae, male, dorsal),
   `lep-hab-biston.jpg` (*Biston betularia*, Geometridae, male, dorsal).
2. `lep-hab-laothoe.jpg` (*Laothoe populi*, Sphingidae, at rest, hanging under a grass stem, seen from below): the
   forewings swept back in a delta, the hindwing standing out ahead of the forewing's hind margin.
3. `lep-hab-brushfoot.jpg` (*Idea leuconoe*, Nymphalidae: Danainae, standing): four walking legs, the reduced forelegs
   folded against the thorax under the head.
4. Wikipedia, *Nymphalidae* ("brush-footed butterflies or four-footed butterflies ... they stand on only four legs while
   the other two are curled up; in some species these forelegs have a brush-like set of hairs"; "the forelegs are kept
   pressed against the underside of the thorax"); *Sphingidae* ("narrow wings and streamlined abdomens are adaptations
   for rapid flight"); the Hampson-derived genus descriptions *Ctenoplusia fracta* (Noctuidae: Plusiinae, "abdomen with
   three large dorsal tufts on basal segments"), *Erygia*, *Catephia* and *Elusa* ("abdomen with dorsal tufts").
5. The existing notes: `research-lepidoptera-wings.md` (the set specimen's wing outlines), `research-thorax.md`
   (Lepidoptera: patagia, tegulae, the hairy thorax).

## Findings

- **Wing set.** A set specimen has the forewing's hind margin square to the body (`lep-hab-sphinx`; every plate #13
  drew), but the setting is not fixed: old plates and many collections pin the forewings well forward, the hind margin
  sloping forward and the hindwing showing whole behind it (`lep-hab-biston`, `lep-hab-saturnia` sit between square and
  forward); a moth at rest sweeps them back into a delta over its body, the hindwing tucked under the forewing
  (`lep-hab-laothoe`; noctuids and hawk-moths rest this way). The hindwing's overlap follows the set: under a delta it
  is mostly covered, under a forward set mostly bare.
- **Abdomen.** Sphingidae: long, fusiform, widest near its base and tapering to a point, with a lateral pattern down
  each side (the pink-and-black flank patches on `lep-hab-sphinx`); the longest abdomen of the moths against the
  forewing. Saturniidae: short, stout and densely hairy, ending blunt (`lep-hab-saturnia`). Geometridae: the slenderest
  moth abdomen against the thorax (the stout *Biston* is the exception among them; the plate keeps the family's rule).
  Arctiinae (tiger moths, footmen, ermines): the abdomen often marked with a dorsal row of dark spots or with bands.
  Noctuidae: a medium abdomen; in Plusiinae and several other genera tufts of raised scales (dorsal crests) on the
  basal segments. Papilionidae: a long slender abdomen. Lycaenidae: small butterflies with a short abdomen.
- **Legs.** On a set plate the legs are posed the way the setter left them: forelegs forward in a V (every plate drew
  this), spread out to the sides, striding, or folded away under the wings so that none show. Nymphalidae (with the
  satyrines) have the forelegs reduced, hairy and held against the thorax: the butterfly stands on four legs.

## Rules derived (what the engine draws)

- Wing set `B.wingSet` (`LEP_WING_SETS`, rolled with the body, read by `wingsLepidoptera`): `fw` is the forewing's hind
  margin, the line from its basal inner-margin point to the tornus, in degrees below the horizontal; the wing block
  turns the forewing until that line lies at the rolled angle, whatever its outline. square -8 to 12 (the #13 pose),
  delta 26 to 46, forward -20 to -10; `hw`, the hindwing's further sweep: square -6 to 18, delta -26 to -12 (tucked
  forward under the forewing, its root set back 0.16 of the span along the body so its costa stays under the forewing's
  at the root), forward 14 to 26. Then, without rng, the forewing turns forward until it is `LEP_MID_CLEAR` (6) off the
  midline (two inner margins there close into a seam, or cross in an X, that fills in at 1 bit) and the hindwing until
  it no longer crosses its pair (`LEP_HIND_CLEAR`). Over a run the hindwing's share under the forewing is highest under a
  delta and lowest under a forward set (medians about 0.7, 0.45, 0.25). Weights by family: sphingid and noctuid rest
  mostly in a delta, the butterflies mostly square.
- Abdomen by family (`abdFams`, `famScale`): sphingid abdomen 1.4x long with an acute tip, 6-8 segments and a lateral
  spot row (`lateral`, at 0.6-0.7 of the half width); saturniid 0.72x long and 1.12x broad, hairy, rounded tip;
  geometrid 0.72x broad and 1.08x long; arctiid a dorsal spot row on the midline (`dorsal`) or bands; noctuid 0.95x long
  with dorsal crests on 2-3 basal segments on 75 % of plates (`A.crest`, a white-masked tuft on the midline drawn in the
  abdomen's pitch element); papilionid 1.1x long, 0.85x broad; lycaenid 0.62x long; satyrine 0.88x long; nymphalid
  1.1x broad. The wings scale with saturniid and geometrid (broad wings on a light body), and the span's jitter is
  0.18 (was 0.1), so a sheet shows the body-to-wing proportions varying as species do.
- Legs: pose families raised (the old V), spread (forelegs out to the sides), walking, hidden (out under the wings,
  drawn foreshortened at 0.68 of their length; under a delta, which leaves the room ahead of the wings open, a hidden
  roll stands as raised). Nymphalid and satyrine: the foreleg a brush (0.35-0.5 of the mid femur, the tarsus a stub,
  hair along femur and tibia, held up against the thorax), the mid pair reaching forward past the forewing's costa and
  the hind pair back beside the abdomen (`LEP_POSE_ANG_NYM`); a butterfly's broad hindwing usually covers the hind pair,
  as on set specimens.

- 1-bit fixes the reshuffled seeds needed (#52): a spot ring under `LEP_RING_VEIN` (5 body units) is not drawn across
  a vein, and such a small spot keeps its pupil as tone without a pupil ring (ring in ring, or ring and vein, fill in);
  the stipple dot is .5 long (was .3) so it keeps its ink through the device threshold.

## Not done here

The measure (`tests/perceptual.js`) is mostly wing ink. What still repeats is two plates of one family in one set with
near angles (two nymphalids set square, 23 and 124); the levers left are the wing outline and the pattern tone, #13.
