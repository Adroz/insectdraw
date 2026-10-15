# Crane fly habitus in dorsal view: families, leg pose, wing set, wing pattern

2026-10-15. Written for #55 (step 8 of "Nine plates, nine insects" in `plan-body-variation.md`). The numbers at the end
are what the crane fly entry in `ORDERS` (`proportions` family pick, `famScale`, `wingPlans`, `abdFams`, `habitus`,
`legs` pose families and ratios, `ant` family rows, `wingSets`, `wingSetFams`, `wingPatterns`, the `famNouns`) and
`tests/check.js` (`CRANE`: `cranePose`, `craneHabitus`, `craneWingSet`, `craneShares`) draw from. Images in `ref/` with
the `crane-hab-` prefix (licences in `ref/README.md`); the venation stays as `wing-venation-spec.md` (Diptera) and #9
drew it, every family on the tipulid plan (`dip-limonia` is a limoniid).

## Sources read

1. Wikipedia, *Crane fly*: Tipuloidea are four living families, Tipulidae, Limoniidae, Pediciidae, Cylindrotomidae;
   slender body, long stilt-like deciduous legs, wings with species-specific patterns.
   https://en.wikipedia.org/wiki/Crane_fly
2. Wikipedia, *Limoniidae*: "Limoniid crane flies can usually be distinguished by the way the wings are held at rest.
   Limoniids usually hold/fold the wings along the back of the body, whereas other crane flies usually hold them out at
   right angles"; "usually smaller than other crane flies"; antennae 14- or 16-segmented, usually verticillate; the
   wings "monochromatic or punctate". https://en.wikipedia.org/wiki/Limoniidae
3. Wikipedia, *Pediciidae* (hairy-eyed crane flies): medium to large (to 35 mm, *Pedicia*), resembling Tipulidae, wings,
   legs and abdomen long and slender; "the wings of *Pedicia* have contrasting brown longitudinal stripes".
   https://en.wikipedia.org/wiki/Pediciidae
4. Wikipedia, *Ctenophora (fly)*: large, shiny black crane flies with large yellow, orange or red markings that mimic
   wasps; males with comb-like antennae, each segment with two pairs of outgrowths.
   https://en.wikipedia.org/wiki/Ctenophora_(fly)
5. Photographs: `crane-hab-pedicia.jpg` and `crane-hab-pedicia-wing.jpg` (*Pedicia rivosa*: the brown stripe along the
   costa, a band down the cord, a stripe along Cu from the base to the cord, the three closing a triangle),
   `crane-hab-ctenophora.jpg` (*Ctenophora pectinicornis*: a stout abdomen about as broad as the thorax, banded black and
   yellow, tapering to the ovipositor; legs long but shorter against the body than a *Tipula*'s),
   `crane-hab-limonia.jpg` (*Limonia nubeculosa* at rest: the wings folded flat along the back, covering the abdomen).

## Findings

- **Families.** Tipulidae: the large crane fly as drawn before, wings held out from the body at rest. Limoniidae:
  smaller, legs shorter against the body, the wings folded along the back at rest, plain or spotted (punctate).
  Ctenophorinae (a tipulid subfamily, treated as its own habitus here as the ticket asks): stout and wasp-like, the
  abdomen broad and banded, the male's antennae combs. Pediciidae: large, tipulid-like, the wings striped brown.
- **Leg pose.** A crane fly's legs are most of its silhouette, and a plate of one can hold them several ways: spread
  as a set specimen (fore legs forward and out, mid and hind back and out, knees bent); trailing (mid and hind pairs
  swept back, the hind past the abdomen's tip, as a resting crane fly hangs them); forward (the fore pair reaching
  straight ahead, well past the short antennae, as a crane fly feels ahead with them); pinned (the set-specimen X of
  nearly straight legs: fore legs forward and out, mid legs held straight out to the sides, hind legs back and out).
  The ticket's "mid legs out and the others back" cannot hold the fore legs back without crossing the mid legs, so the
  fore pair is set forward and out, as on a pinned specimen.
- **Leg length per pair.** Either the fore or the hind pair is the longest; both occur across the families.
- **Wing set.** Spread (out from the body; the tipulid's, Pediciidae's) or folded flat along the back scissor-wise (the
  limoniid's resting pose; some tipulids and *Ctenophora* rest so too). A tipulid's long abdomen runs on past folded
  wings; a limoniid's wings reach the abdomen's tip or beyond.
- **Wing pattern.** *Pedicia*'s brown triangle (costal stripe, cord band, Cu stripe); a limoniid's clouded spots
  (*Limonia nubeculosa*). The plate draws both as stipple only (e-ink: dots at the floored pitch, no fill).

## Rules derived (what the engine draws)

- `P.fam` from tipulid ×2, limoniid, ctenophorine, pediciid. `famScale`: limoniid head 0.8, thorax 0.75, abdomen width
  0.8 and length 0.72, leg scale 0.78; ctenophorine head 1.1-1.15, thorax 1.05-1.15, abdomen length 0.8 and its width
  0.98-1.15 of the thorax's (`habitus.abdK`, rolled in the proportions), leg scale 0.8; pediciid about 1.05-1.1 throughout. Every family is drawn on the tipulid venation (`wingPlans`).
- Ctenophorine: abdomen banded, pointed or rounded tip (`abdFams`); antennae bipectinate or pectinate, long rami,
  1.8-2.6 head widths. Limoniid: antennae moniliform, whorled, 0.5-0.8 head widths, 14-16 segments.
- Leg pose `B.pose` from spread / trailing / forward / pinned, equal weights (the limoniid without trailing: its short
  hind legs cannot reach past its abdomen's tip); the three new poses take the entry's
  `poseAng` per pair (fore, mid, hind; femur and tibia absolute, 0 straight out, negative toward the head):
  trailing fore F -58…-28, tib -108…-78; mid F 14…38, tib 68…92; hind F 44…64, tib 84…96. forward fore F -84…-66,
  tib -100…-84; mid F -16…8, tib 16…55; hind F 24…48, tib 66…96. pinned fore F -60…-34, tib -74…-44; mid F -12…10,
  tib -12…20; hind F 34…60, tib 46…76. The #8 wing rule may still turn a pair (no rng).
- `B.legRatio` front / hind, equal weights (a trailing pose always hind: its hind legs must run past the abdomen's
  tip, and a short hind pair under a long abdomen could not): front, fore femur ×1.12-1.28 and hind ×0.86-0.98; hind, fore ×0.8-0.95 and
  hind ×1.08-1.25 (as before #55).
- Wing set `B.wing.set` (the fly's #54 mechanism): spread theta 36-68, folded 94-106 (turned in to at most 118 until the
  abdomen's side shows); folded reach 0.85-1.0 root-to-abdomen-tip lengths times the family's `foldReach` (tipulid 0.72,
  limoniid 1.12, ctenophorine 0.8, pediciid 0.9). Weights spread : folded tipulid 4:1, limoniid 1:4, ctenophorine 2:1,
  pediciid 3:1.
- Wing pattern (`wingPatterns`, stipple at `floorPitch(2.4)`, dots r 0.4): pediciid always, three capsules in span
  fractions (u along the span, s across the chord): costal stripe (0.12, 0.1)-(0.9, 0.1) r 0.035, cord band
  (0.66, 0.12)-(0.55, 0.72) r 0.03 on 80 %, Cu stripe (0.16, 0.6)-(0.55, 0.66) r 0.028 on 60 %, each end moved up to
  0.05-0.06 and the radius ±25 % per plate. Limoniid on half its plates: 3-5 spots along the costa (s 0.12-0.2) and one
  on the cord, r 0.045-0.065.
- Not drawn: the pediciid's hairy eyes (a head detail too small for the plate), the female *Ctenophora*'s serrate
  antenna (every ctenophorine is drawn male), Cylindrotomidae.
