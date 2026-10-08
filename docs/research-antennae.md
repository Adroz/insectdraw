# Antennae — types, counts, proportions, pose: research notes and drawing rules

2026-10-02. Written for step 6 of `plan-body-variation.md` (per-seed antenna genes). The earlier
note `research-legs-eyes-antennae.md` has one paragraph on antennae; this one replaces it as the
source of the antenna rules. Reference images are in `ref/` with the `ant-` prefix (licences in
`ref/README.md`). Sources are reference pages and family keys; numbers are quoted where the
source gives them, and the "Rules derived" section at the end is what the code implements.

## Sources read

Morphology and types
1. Wikipedia, *Antenna (biology)*: scape, pedicel (Johnston's organ), flagellum of flagellomeres;
   "geniculate antennae are common in the Coleoptera and Hymenoptera"; scarab lamellae "folded
   tightly for safety or spread openly". https://en.wikipedia.org/wiki/Antenna_(biology)
2. Amateur Entomologists' Society, *Antennae* fact file: type definitions with example groups
   (filiform: dragonflies, grasshoppers, crickets, beetles; setaceous: bristletails, cockroaches,
   mayflies, stoneflies, caddisflies; moniliform / serrate / pectinate / clavate / lamellate /
   geniculate: beetles; pectinate also sawflies; clavate: butterflies and moths; plumose: flies).
   https://www.amentsoc.org/insects/fact-files/antennae.html
3. NCSU General Entomology, *Antennae*: scape "articulates with the head capsule", pedicel,
   flagellum; the ten types incl. clavate "gradually clubbed", capitate "abruptly clubbed",
   aristate "pouch-like with one lateral bristle". https://genent.cals.ncsu.edu/bug-bytes/head/antennae/
4. Chapman, *The Insects: Structure and Function* (4th ed. sample chapter): the scape "pivoted on
   a single marginal point, the antennifer"; the flagellum is annuli without muscles; "Adult
   Odonata, for example, have five or fewer annuli". https://catdir.loc.gov/catdir/samples/cam034/97035219.pdf
5. Wikipedia, *Beetle*: "The antennae usually have 11 or fewer segments, except in some groups like
   the Cerambycidae"; Curculionidae geniculate, Silphidae capitate, Scarabaeidae lamellate,
   Carabidae thread-like; "The antennae arises between the eye and the mandibles". https://en.wikipedia.org/wiki/Beetle
6. Wikipedia, *Longhorn beetle*: "antennae as long as or longer than the beetle's body"; "the
   antennal sockets are located on low tubercles on the face". *Monochamus*: males' antennae
   "twice as long as the body", females 1.5×. *Batocera*: "1–2 times the length of their body",
   up to 3× in males. Moechotypa diphysis (Lamiinae) antenna/body ratio: males 1.14 ± 0.12, females
   0.95 ± 0.07 (ScienceDirect, S0044523126000112).
7. UNL *Generic guide to New World scarab beetles*: Scarabaeidae "10-segmented antennae (rarely
   9-segmented) with 3 to 7-segmented, opposable club"; Dynastinae club "usually small and with 3
   segments"; Phyllophaga 9–10 segments, 3-segmented club. https://unsm-ento.unl.edu/Guide/Scarabaeoidea/
8. delta-intkey *Lucanidae*: antennae "short to about half the insect's head to tail length ...
   conspicuously elbowed, with either 8 or 10 segments and the scape much-elongated", club "openly
   lamellate". https://www.delta-intkey.com/britin/col/www/lucanida.htm
9. Curculionoidea glossary / Wikipedia *Weevil*: geniculate antenna, "the scape is usually much
   longer than the other antennal segments"; 11 articles = scape + 7 funicle + 3-articled club;
   "The first antennal segment often fits into a groove in the side of the rostrum". Granary weevil
   SEM paper: the scape "more than one-third of the length of the antenna". https://www.curculionoidea.org/glossary
10. delta-intkey *Elateridae* and Elater ferrugineus SEM paper: serrate antennae of 11 segments.
    delta-intkey *Staphylinidae*: "(10–)11 segmented with the scape much-elongated; filiform (or
    moniliform), or clubbed". *Tenebrionidae*: "11-segmented antennae that may be filiform,
    moniliform or weakly clubbed". *Coccinellidae*: clubbed, 7–11 segments, "kept beneath the
    prothorax". Chrysomelidae: filiform, 11, "not more than half" the body.
11. Wikipedia *Tettigoniidae* / *Ensifera*: Ensifera "more than 30 segments", antennae "often longer
    than the length of their bodies"; Caelifera "short antennae with less than 30 segments";
    *Pterochroza* "two to three times the length of the body". Acrididae: "about one-half the length
    of the body or less"; American grasshopper adult 24–26 segments. Tetrigidae "usually 11–16".
12. Hymenoptera: honey bee "Females have 12 antennal segments (scape, pedicel, and 10
    flagellomeres) ... males have 13" (American Bee Journal); BugGuide Hymenoptera: "often 13 in
    male, 12 in female, but sometimes as few as 3 or up to 60". RES Handbook vol. 6: antennae
    "articulated in sockets at about the middle of the face"; bee antennae "arise from the space
    between the compound eyes just above the clypeus". delta-intkey *Vespidae*: "elbowed, with the
    scape long", (10–)12 ♀ / (10–)13 ♂. Ichneumonidae: "threadlike, with 16 or more segments",
    "usually at least half the length of the body" (MDC field guide). Chalcidoidea: geniculate,
    club of 1–4 segments, Pteromalidae 13 segments. Tenthredinidae: "7–12 antennal segments, with
    the majority having nine"; Cimbicidae clubbed, 5–7; Diprionidae ♂ pectinate.
13. giand.it *Diptera antennae*: Nematocera "2 + 14 antennomeres", Orthorrhapha "2 + 1-8",
    Cyclorrhapha "2 + 1-4"; arista "usually composed of three segments", bisegmented in Syrphidae,
    inserted dorsally on the basal part of the postpedicel; stylate antennae in Tabanomorpha etc.;
    mosquito males plumose. Muscidae: "arista plumose for the entire length" (NCSU). Tabanidae:
    terminal segment "annulated", 4–8 annuli. Asilidae: scape, pedicel, postpedicel + style.
    Culicidae: 15 segments. Tipulidae: "antennae are short and have 13 segments"; Limoniidae 14 or
    16. Nematocera antennae "usually are longer than the length of the head and thorax combined"
    (Britannica). Antennae sit "on the top of the face (Cyclorrhapha) or the transition zone
    between the face and the frons".
14. Lepidoptera: flagellum "of 20 to 60 units" (encyclopedia.com, *Lepidoptera*); butterflies
    "club shaped at the end", skippers "hooked backward like a crochet hook" and "widely separated
    at the base" (NCSU Hesperiidae); Papilionidae "antennae are relatively short ... club often
    curved" and curving upward (Butterflies of Singapore; Archon 1/3–1/4 of the costa); Nymphalidae
    antennae "0.42–0.55 times the length of the forewing" (delta-intkey); Pieridae "short and
    rather straight"; Lycaenidae banded; Saturniidae ♂ "bi- or quadripectinate", ♀ "filiform to
    quadripectinate" with shorter rami, *Samia* 50 rami a side; Sphingidae "rarely bipectinate,
    usually rather swollen, tapering at the tip which is often hooked"; Noctuidae filiform;
    Geometridae / Arctiinae ♂ bipectinate, ♀ filiform; Zygaenidae and Castniidae are clubbed moths.
15. Odonata: Orthetrum cancellatum antenna "composed of six segments: scapus, pedicellus and four
    segments of the flagellum"; Aeshnidae 6–7, Gomphidae 4; antennae beside the ocelli between the
    eyes (Dragonflies of Manitoba). Lucid key: "short antennae composed of straight segments".
16. Cicadidae: "short, very slender, and consist of 7-9 articles"; "scape, pedicel, and five
    flagellar segments"; "the vertices extend anteriorly to form small antennal shelves overhanging
    the bases of the antennae" (Lander / MDPI Insects 17:115).
17. Ephemeroptera: antennae "short (less than the length of the head and thorax combined and
    hair-like)", "set between or in front of the eyes"; imago flagellum "vestigial, segmentation ...
    often being indistinct or absent" (Kluge, cladoendesis).
18. Chrysopidae: antenna "filiform and about 1/3 as long as the forewing" (*C. pallens*) to "1.5
    times of the body length"; Hemerobiidae moniliform; Myrmeleontidae clubbed.

Set-specimen pose
19. NCSU spreading instructions: "Position antennae forward and parallel, and use pins to hold in
    place". K-State *Tips on spreading*: antennae "parallel to the margins". Home Science Tools:
    "Cross two pins over each other to set the antennae in a 'V' position". OSU Extension: "Position
    antennae with pins". BugsDirect: antennae "forward in a natural, symmetrical curve". National
    Museums Scotland: pointing forward, parallel, "not crossed or bent".

## What the sources establish

### Types and who carries them

| kind | shape | segments | carried by |
|---|---|---|---|
| setaceous | tapering bristle, segments shrinking distally | 4–7 (Odonata 4–7, cicada 7–9, mayfly indistinct) | Odonata, Ephemeroptera, Cicadidae |
| filiform | thread, equal segments | beetles 11; Acrididae 20–26; Ensifera 30+; Chrysopidae ~30–45; ichneumonids 16–40+; sawflies 9; moth females 30–50 | Carabidae, Cerambycidae, Chrysomelidae, Acrididae, Tettigoniidae, Chrysopidae, Ichneumonidae, Tenthredinidae, Noctuidae |
| moniliform | beads | 11 (beetles), 13 (Tipulidae, with hair whorls) | Tenebrionidae, Staphylinidae, Tipulidae, Hemerobiidae |
| serrate | saw-toothed on one side | 11 | Elateridae, Buprestidae, some Noctuidae |
| pectinate / bipectinate | comb one / both sides, rami longest mid-shaft | 30–50 flagellomeres, one ramus pair each | male Saturniidae, Geometridae, Arctiinae, Lasiocampidae; Diprionidae ♂; Ctenophora ♂ |
| plumose | whorls of long hairs | 13–15 | male Culicidae, Chironomidae |
| clavate (gradual club) | thickening over the apical quarter | 30–45 | Nymphalidae, Danainae, Aeropedellus (grasshopper) |
| capitate (abrupt club) | knob | 30–45; beetles 7–11 | Pieridae, Lycaenidae; Coccinellidae, Silphidae, Cimbicidae |
| hooked club (apiculus) | club bent back ~90–120° | 30–40 | Hesperiidae; Sphingidae tip |
| lamellate | 3–7 flat plates on a short stalk | 10 total (rarely 8–9), club 3–7 | Scarabaeidae; Lucanidae (elbowed, club open, 3–4) |
| geniculate | long scape, elbow, flagellum | bee 12 ♀ / 13 ♂; Vespidae 12/13; weevil 11 (7 funicle + 3 club); chalcid ≤13 | Apidae, Vespidae, Formicidae, Curculionidae, Chalcidoidea, Lucanidae |
| aristate | 3 segments, swollen postpedicel + dorsal arista | 3 (+ 2–3 arista segments) | Cyclorrhapha: Muscidae (plumose arista), Syrphidae (bare / pubescent) |
| stylate | 3 segments, elongate postpedicel + style | 3 (+ annuli 4–8 in Tabanidae) | Tabanidae, Asilidae, Therevidae |

### Length

| group | antenna length | source |
|---|---|---|
| Cerambycidae | 1–2× body (♂ up to 3×), ♀ ≈ 0.95–1.5× | 6 |
| Carabidae / Chrysomelidae | ≤ half body; reaches the pronotum base | 10 |
| Scarabaeidae / Coccinellidae / Curculionidae | short: ≈ 0.6–1.2× head width | 7, 9, 10 |
| Lucanidae | ≤ half body | 8 |
| Acrididae | ≈ half body or less | 11 |
| Tettigoniidae | > body, typically 2–3× | 11 |
| Tetrigidae | short, 11–16 segments | 11 |
| Apidae / Vespidae | ≈ 1.2–1.6× head width (12–13 segments) | 12 |
| Ichneumonidae | ≥ half body, often ≈ body | 12 |
| Tenthredinidae | ≈ 1.2–1.8× head width | 12 |
| Chalcidoidea | short, ≈ 0.7–1.0× head width | 12 |
| Cyclorrhapha (house fly) | ≈ 0.25–0.4× head width incl. arista | 13 |
| Nematocera (crane fly) | "short" (Tipula) to longer than head + thorax (mosquito) | 13 |
| Nymphalidae | 0.42–0.55× forewing | 14 |
| Papilionidae | relatively short, 0.3–0.42× forewing | 14 |
| Pieridae / Lycaenidae | short, ≈ 0.4–0.5× forewing | 14 |
| moths | ≈ 1/3–1/2 forewing | 14, 18 |
| Chrysopidae | 1/3 forewing to 1.5× body; mostly ≈ body | 18 |
| Odonata / Cicadidae / Ephemeroptera | tiny bristle, ≈ 0.1–0.25× head width | 15–17 |

### Proportions inside a kind

- Geniculate: scape ≥ 1/3 of the antenna (weevil); bee scape ≈ 0.3–0.4 with a short pedicel and
  10–11 flagellomeres of near-equal length (12/13 total). Weevil: scape, 7 funicle, 3-segment club.
- Lamellate: stalk of 7 beads (scape + pedicel + 5), then 3–7 lamellae; measured on the Curtis
  *Lucanus* plate (`ant-lucanus-curtis.jpg`, detail at lower left) the club is ≈ 0.35 of the
  antenna and the lamellae open like a fan of ~30°.
- Bipectinate: on `ant-moth-biston.jpg` (scale bar 1 mm) the long-rami male has rami ≈ 4× the shaft
  width at mid-shaft, one ramus pair per flagellomere at ≈ 1.5 shaft widths spacing; the short-rami
  male ≈ 1.5× shaft width; the female is filiform. Richard South's fig. 2 (`ant-moths-south.jpg`)
  shows the full-length bipectinate (I): rami longest in the basal half, tapering to nothing at the
  tip, shaft gently bowed; the hooked sphingid (A) bends through ~150° over the last tenth.
- Clubs (`ant-butterfly-tips-bingham.png`): Danaus gradual slender club; Hypolimnas and Pieris
  thick abrupt clubs over the apical quarter; Papilio club bent (upcurved); Tagiades (skipper) club
  then an apiculus turned back through ≈ 100°. Club length ≈ 0.2–0.3 of the antenna.
- Aristate: arista ≈ 1–1.6× the postpedicel, from the dorsal base of the postpedicel; plumose
  along its length (Muscidae) or bare (Syrphidae).
- Stylate: postpedicel elongate (≈ 2× scape + pedicel), style 0.3–0.6 of it; Tabanidae annulated.
- Setaceous: scape + pedicel stout, flagellum 2–5 shrinking annuli; total ≈ 0.1–0.25 head widths.

### Socket position (dorsal view)

- Hymenoptera: middle of the face, between the eyes just above the clypeus → upper-front of the head
  capsule, x ≈ 0.14–0.2 head widths from the midline.
- Diptera: top of the face / frons transition → near the front edge, x ≈ 0.05–0.08.
- Coleoptera: between eye and mandible; Cerambycidae on tubercles on the vertex between the eyes
  with the eye notched around the socket (`ant-longhorn-dorcadion.jpg`: scape:pedicel:flagellomere
  1 ≈ 1 : 0.22 : 0.65, sockets ≈ 0.28 head widths out, eyes wrapped around them); Curculionidae on
  the rostrum, far forward.
- Odonata: on the frons beside the ocelli, between the eyes, x ≈ 0.12–0.16.
- Orthoptera: frons, between / in front of the eyes, x ≈ 0.12–0.16.
- Cicadidae: between eyes and clypeus under antennal shelves, x ≈ 0.2–0.25.
- Ephemeroptera, Neuroptera, Lepidoptera: between or just in front of the eyes, x ≈ 0.08–0.2.
- Hesperiidae: bases "widely separated", x ≈ 0.26.

### Pose in a set specimen

Every setting guide says the same thing: antennae forward, parallel or in a shallow V, symmetrical,
"not crossed or bent" (19). On the plates in `ref/` (Curtis *Lucanus*, the Dorcadion photo, the
Ris / Lochhead wing plates) the antennae leave the head at 25–50° from the midline. Long antennae
(longhorns, katydids, ichneumonids) cannot be set forward inside the drawer, so they are swept
back: forward-out for the first quarter, then a smooth turn to run back beside the body at 10–25°
to the axis (Dorcadion photo). Curvature is always convex outward (the tip never turns in toward
the midline), and the two antennae never cross each other.

## Rules derived

### R-A No crossing (invariant)

Antennae are drawn right-side and mirrored, so an antenna crosses its mirror image iff any point of
it has x < 0. Rule: every point of the shaft, club, rami, lamellae and arista keeps
x ≥ m = max(0.5, 0.6 × shaft width). Roll the pose, test, re-roll angle / curvature up to 24 times,
then fall back to a known-good pose (forward at 40° from the midline, 10° outward curve, droop 0,
length × 0.8). `tests/check.js` asserts x ≥ 0.5 on `meta.antennae.pts`.

### R-B Length by kind and order (as fractions of head width `hw`, body length `bl` =
headH + thoraxLen + abdLen, or forewing `fw` = wingSpan × family len)

| order / family | kind weights | length | segments |
|---|---|---|---|
| beetle ground | filiform 5, moniliform 2 | 1.6–2.4 hw | 11 |
| beetle rove | moniliform 3, filiform 2, clubbed-gradual 1 | 0.9–1.4 hw | 11 |
| beetle scarab | lamellate 1 | 0.6–0.9 hw | 7 stalk + 3–7 lamellae |
| beetle longhorn | filiform 1 (swept back) | 0.8–1.6 bl | 11 |
| beetle weevil | geniculate (club abrupt) 1 | 0.8–1.2 hw | scape + 7 + 3 |
| moth noctuid | filiform 4, serrate 1, bipectinate-short 1 | 0.33–0.5 fw | 30–50 |
| moth geometrid / arctiid | bipectinate 3, filiform 2 | 0.33–0.5 fw | 30–45 |
| moth saturniid | bipectinate-long 5, pectinate 1 | 0.3–0.45 fw | 30–40 |
| moth sphingid | hooked slim club 3, filiform 1 | 0.4–0.55 fw | 40–50 |
| moth plain | filiform 2, bipectinate 2, pectinate 1 | 0.33–0.5 fw | 30–50 |
| butterfly nymphalid / satyrine | clubbed gradual 4, abrupt 1, hooked 1 | 0.42–0.55 fw | 30–45 |
| butterfly pierid | clubbed abrupt 3, gradual 1 | 0.38–0.5 fw | 30–40 |
| butterfly lycaenid | clubbed abrupt 3, hooked 1 (banded) | 0.4–0.5 fw | 30–40 |
| butterfly papilionid | clubbed upcurved 3, gradual 1 | 0.3–0.42 fw | 35–45 |
| fly muscid | aristate (plumose arista) 1 | 0.25–0.4 hw | 3 |
| fly syrphid | aristate (bare 3, pubescent 1) | 0.25–0.38 hw | 3 |
| fly tabanid | stylate annulated 1 | 0.3–0.45 hw | 3 + 4–8 annuli |
| fly asilid | stylate style 1 | 0.3–0.42 hw | 3 + style |
| fly nemato | plumose 2, moniliform-whorled 2 | 0.9–1.5 hw | 13–15 |
| bee apid / vespid | geniculate 1 | 1.2–1.6 hw | 12–13 |
| bee sawfly | filiform 3, clubbed abrupt 1, serrate 1 | 1.2–1.8 hw | 9 (7–12) |
| wasp vespid / apid | geniculate 1 | 1.2–1.6 hw | 12–13 |
| wasp ichneumonid | filiform 1 (long, arc or swept) | 0.5–0.9 bl | 16–40 |
| wasp sawfly | filiform 3, serrate 1, pectinate 1 | 1.2–1.8 hw | 9 |
| wasp chalcid | geniculate (club) 1 | 0.7–1.0 hw | scape + 5–7 + club |
| dragonfly / damselfly | setaceous 1 | 0.12–0.22 hw | 4–7 |
| grasshopper acridid | filiform 5, clubbed gradual 1 | 0.35–0.55 bl | 20–26 |
| grasshopper tettigoniid | filiform 1 (swept back) | 1.0–1.8 bl | 30–45 |
| grasshopper tetrigid | filiform 1 | 0.5–0.8 hw | 11–16 |
| cranefly | moniliform-whorled 4, pectinate 0.6 | 0.6–1.0 hw | 13 (14–16) |
| lacewing | filiform 5, moniliform 1 | 0.6–1.0 bl | 30–45 |
| cicada | setaceous 1 | 0.1–0.18 hw | 7 |
| mayfly | setaceous 1 | 0.15–0.3 hw | 3–5 visible |

### R-C Pose (degrees; −90 is straight forward, 0 is straight out to the side)

| pose | base direction | curvature | used by |
|---|---|---|---|
| forward V | −70 … −45 | 0 … +25 outward, tip droop 0–15 | most kinds ≤ 2.5 hw |
| wide V | −60 … −30 | 0 … +20 | lamellate, aristate, stylate, setaceous, geniculate scape |
| costal (Lepidoptera) | −65 … −40 | −5 … +15 | clubbed, bipectinate, pectinate |
| arc | −80 … −55 | +20 … +60 spread over the length | filiform 2.5 hw … 0.6 bl (lacewing, acridid, ichneumonid) |
| swept back | −65 … −40 | +110 … +150, 70% of it in the first third | filiform ≥ 0.6 bl (longhorn, katydid, long ichneumonid) |

Curvature is signed outward-positive; negative values (toward the midline) are allowed only on
the costal pose and are small, which is what keeps R-A cheap. Geniculate: scape direction
−55 … −25, elbow 60 … 100° toward the midline so the flagellum runs −95 … −60 (forward, at most a
few degrees inward), flagellum curvature 0 … +20. Hooked clubs turn 80 … 120° at the tip, upcurved
clubs 25 … 45°; the hook direction is rolled (outward or inward) and inward hooks are subject to
R-A like everything else.

### R-D Fit and clearance

The antenna alone must not drive the plate scale under 0.6 (same floor as the legs' 0.62 minus a
little): compute the plate scale from the bbox of everything drawn so far (body, legs and, since
#6, the wings) extended by the antenna points, and blame the antenna only where it lowers that
scale below 0.6 (a broad-winged plate sits under 0.6 before the antenna is drawn); if it fails,
shorten by 8% and re-roll the pose. No sampled point of the antenna may lie inside a wing, elytron
or tegmen outline (the antennae are drawn after the wings for this): a hit re-rolls the pose
forward (ang at most −45°, then 5–20° further) and nearly straight (curve 5–30°), since a swept
or arched antenna can only lie across the forewing membrane; the fallback for this reason is
−70° at curve 15°. The legs reach ahead of the thorax in every pose (spread and walking forelegs
as much as the mantid fold, the mayfly's forelegs straight ahead or the odonate basket), so in
every pose (#7) every centre-line of the antenna (shaft, scape, club axis, arista, style, each
ramus and lamella) with an end ahead of the thorax (y < thorax top) must stay ≥ 3 px + both half
widths from every leg segment from the femur on, on the right legs and on the skewed left set. A
hit is sticky like a wing hit: every later attempt is forward and nearly straight and walks a few
degrees further toward straight ahead; from the fifth such attempt a leg hit (or a midline cross
of a plume, which is held off the midline on one side and the leg on the other) also shortens the
antenna by 6%, not under half; the fallback is straight ahead at curve 6°, shortened until it
clears. Antennae run beside the body and over the legs, as they do on a real plate, so the
clearance test applies only to the part of the antenna ahead of the thorax. The legs block keeps
its side of the bargain: a leg joint ahead of the head (and the point where a segment crosses the
head top) stays off the antenna socket by the same clearance plus 2 px for the lean of a straight
shaft (`legsOk` reason `socket`, odonates exempt like the midline rule), or no antenna pose could
clear it. Over 300 seeds per type the fallback fires on 0.7% of moths (bipectinate plumes between
tucked or walking forelegs) and 0.3% of damselflies, and nowhere else.

### R-E Socket

Socket centre = table value ± 0.03 hw in x, ± 0.04 headH in y; radius 1–2.5 px (headW × 0.03–0.045,
clamped). Table (x / headW, y / headH from the head top): dragonfly [0.14, 0.12], damselfly
[0.12, 0.25], fly [0.055, 0.2], bee / wasp [0.16, 0.3] (chalcid [0.14, 0.26]), moth [0.16, 0.3]
(skipper-type hooked clubs [0.24, 0.3]), beetle [0.2, 0.3] (longhorn [0.28, 0.34], weevil
[0.08, 0.1] on the rostrum), grasshopper [0.13, 0.24], cranefly [0.1, 0.22], lacewing [0.18, 0.28],
cicada [0.22, 0.3], mayfly [0.08, 0.2].

### R-F Signature

Push onto `B.sig`: kind, club shape, segment-count bucket (÷4), pectination density bucket, lamella
count, pose name, round(base angle / 10), round(curvature / 15), round(length / hw × 2), socket
x bucket (× 20).

## Deviations from the plan

- The plan's "length 0.4–2.5× head width by kind" is too narrow at both ends: bristle antennae are
  0.1–0.3 hw and longhorn / katydid antennae are measured against the body, not the head.
- The plan's "shaft curvature −40–40°" would let a −40° inward curve cross the midline on any long
  antenna; inward curvature is limited to −5° and the long kinds get the arc / swept poses instead.
- Tip droop is kept (0–15°) but only on the forward poses; it is meaningless on a swept antenna.
