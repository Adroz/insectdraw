# Lepidoptera wing patterns and engraved rendering — research notes

Working notes behind the moth/butterfly wing hatching in `index.html`. Positions
below are given as `u`, the fraction of the distance from the wing base to the
outer margin measured radially from a point just inside the base (so `u = 1`
is the margin everywhere, and "bands" are curves of roughly constant `u`).

## Sources

- Nijhout's **nymphalid groundplan** (after Schwanwitsch 1924 / Süffert 1927):
  the pattern is a proximo-distal series of symmetry systems — basal (BSS),
  central (CSS, with the discal spot on the discocellular), border (BoSS:
  border ocelli + parafocal elements), then submarginal/marginal bands — and
  "each pattern element develops independently within the regions between
  wing veins referred to as wing cells".
  Otaki 2020, *Front. Ecol. Evol.* — https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2020.00146/full
- The same organisation drawn as a fractal/self-similar set of rings
  (discal spot inside CSS inside BoSS/BSS): Otaki 2021, *Insects* 12(1):39 —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7825419/
- Veins compartmentalise the pattern: bands are "interrupted or dislocated at
  veins"; eyespots sit "midway between veins" at a fixed fraction of the cell
  length; a distal dislocation of everything posterior to **M3** (the M3–Cu1
  cell) is common. Koch & Nijhout 2002, *Eur. J. Entomol.* —
  https://www.eje.cz/pdfs/eje/2002/01/12.pdf ; Nijhout 1991 summary slide —
  https://www.mims.meiji.ac.jp/seminars/another/2023/file/2-3.Nijhout_abstract.pdf
- The groundplan also fits moths (arctiid *Utetheisa*): Gawne & Nijhout 2019,
  *Biol. J. Linn. Soc.* — https://academic.oup.com/biolinnean/article/126/4/912/5320679
- Noctuid forewing vocabulary — claviform (club) stigma behind the orbicular
  (round) stigma, then the reniform (kidney) stigma "on the distal edge of the
  forewing's cell"; cross-lines antemedial / postmedial / subterminal; hindwing
  plainer. https://en.wikipedia.org/wiki/Noctuidae ,
  https://en.wikipedia.org/wiki/Glossary_of_entomology_terms (basal line,
  orbicular/reniform/claviform, apex/termen/tornus/cilia),
  https://www.sciencebase.com/science-blog/mothing-glossary.html (apical
  streak, kidney mark, tornus).
- Engraved tone: "the quantity, thickness and spacing of the lines will affect
  the brightness"; lines "should always follow (wrap around) the form";
  darkest tones use crossed layers. https://en.wikipedia.org/wiki/Hatching
  Line engravers left highlights as "pure white paper", used single lines for
  mid-tones, crossed curved lines for darks and dots/flicks where the tone
  fades into the light. https://en.wikipedia.org/wiki/Line_engraving
- 19th-c. plate reproduction translated "continuous tones into systems of
  parallel lines, cross-hatching, and stippling"; stipple was favoured for
  soft gradation in zoological plates.
  https://www.kroneckerwallis.com/19th-century-scientific-illustration-how-darwins-species-were-documented/
- Humphreys & Westwood, *British Butterflies and their Transformations* (1841)
  and *British Moths* (1843–45) — the reference "look" (lithographs, but the
  line conventions are the same as the Curtis/Stephens engravings):
  https://exhibits.library.cornell.edu/caught-between-the-pages-treasures-from-the-franclemont-collection/feature/humphreys-british-butterflies-1841

## Drawing rules derived

**Pattern elements (butterfly, nymphalid groundplan)** — from base outward:

| element | `u` | notes |
|---|---|---|
| basal shading (BSS) | 0 – 0.25…0.35 | dark/mid; edge wavy, dislocated per cell |
| central band (CSS) | centre 0.42–0.52, width 0.10–0.16 | the "median band"; often two parallel edges with the discal spot between them |
| discal spot | 0.50–0.56, in the M1–M3 cells | sits on the discocellular at the end of the closed cell; bar or crescent |
| border ocelli (BoSS) | 0.68–0.78, one per cell, centred between veins | concentric: dark outer ring, pale ring, dark pupil with a white spot; satyrines have a few large ones, nymphalids a row of small ones |
| parafocal / submarginal lunules | 0.82–0.88 | a row of chevrons/lunules, one per cell, bowing outward mid-cell |
| marginal band + terminal line | 0.92 – 1 | dark; the terminal line is the crisp edge at the margin |

**Noctuid moth forewing** — ground mid-tone (cryptic), basal dash (dark streak
in the cell behind the costa, `u` 0.05–0.25), antemedial line (double, wavy,
`u` ≈ 0.30), claviform stigma (small club at `u` 0.30–0.42 under the cell),
orbicular (round, `u` ≈ 0.45 in the discal cell), reniform (kidney, `u` ≈
0.60 at the cell end), median shade between them, postmedial line (double,
dentate, `u` ≈ 0.72), subterminal pale line with a dark shade on its inner
side (`u` ≈ 0.86), terminal line of dark dashes between vein ends, chequered
fringe. Hindwing: pale ground, faint discal lunule and postmedial band, slightly
darker margin. Geometrids run their wavy lines straight across both wings;
tiger moths carry bold crisp-edged blotches; emperors/hawkmoths carry one big
discal eyespot (`u` ≈ 0.5, radius ≈ 0.1 of span) or oblique streaks
(a band whose `u` falls from the apex cell to the inner-margin cell).

**Dislocation** — every band/line gets a per-cell offset of up to ±0.04 in `u`
(larger, ≈ +0.06, in the cells posterior to M3), and may bow outward mid-cell
(lunule) so bands read as stepped/scalloped rather than smooth arcs. Lines are
drawn cell by cell and break at each vein.

**Tone → hatching** — four levels: 0 white (bare paper), 1 light (fan lines at
double spacing, 0.5 px), 2 mid (full fan, 0.5 px), 3 dark (full fan at 0.8 px +
a crossing set parallel to the outer margin), 4 black (both sets at 0.8 px).
Fan lines radiate from a focus well behind the wing base so they run with the
veins / scale rows (the "flow"); the cross set runs parallel to the termen.
Spacing ≈ 2.3 px nominal (never below ≈ 1.8) so e-ink does not fill in; the
darkest tone is never a solid fill. Band and blotch edges are additionally
stroked with a thin line so the tonal step is crisp; the lightest areas stay
white. Veins are drawn over the hatching; ocelli/stigmata outlines over the
veins; the scale fringe (short dense ticks, chequered on noctuids) last.
