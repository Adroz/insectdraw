# Neuroptera families: habitus for the lacewing plate (#51)

The lacewing plate drew one insect, a green lacewing (Chrysopidae), on every seed. #51 gives `lacewing` six families in
`P.fam`, each with the habitus a Victorian plate of the order would show. The wing venation inside each wing is still
the chrysopid plan of `wingsNeuroptera` (docs/wing-venation-spec.md, Neuroptera); what changes is the body, the antennae,
the wing set, the wing outline's breadth and, for the osmylid, a pattern. Nemopterid ribbon hindwings and other outline
changes are out of scope.

## References

| file | family | what it shows |
|---|---|---|
| `ref/neu-myrmeleon.jpg` | Myrmeleontidae (*Myrmeleon formicarius*), pinned, dorsal | abdomen long and slender, its tip past the hindwing tips; forewings held nearly straight out, hindwings swept back ~45°; antennae short (about the head plus prothorax), thickening gradually to a club |
| `ref/neu-libelloides.jpg` | Ascalaphidae (*Libelloides macaronius*), dorsal | antennae nearly as long as the body, thread-thin, each with an abrupt egg-shaped club; large bulging eyes over a broad head; wings broad, spread wide; abdomen shorter than the forewing, hairy |
| `ref/neu-mantispa.jpg` | Mantispidae (*Mantispa styriaca*), lateral | the prothorax a long narrow neck, as long as the rest of the thorax; raptorial forelegs at its front: the stout femur raised toward the head and armed beneath with a row of spines, the tibia folded back against it; large eyes; short antennae |
| `ref/neu-osmylus.jpg` | Osmylidae (*Osmylus fulvicephalus*) | a large lacewing, wings broad with dark stippled spots and patches over the membrane; filiform antennae under half the body |
| `ref/neu-hemerobius.jpg` | Hemerobiidae (*Hemerobius stigma*), pinned, dorsal | small; wings broad and oval, the forewings set nearly straight out; abdomen short (a third of the forewing); antennae moniliform (beaded), about half the body |
| `ref/neu-nothochrysa.jpg`, `ref/neu-chrysoperla.jpg` | Chrysopidae | the existing plate (#19) |

Background: Aspöck, Aspöck & Hölzel (1980) *Die Neuropteren Europas*; New (1989) *Planipennia, Lacewings*, Handbuch der
Zoologie IV.30; Oswald & Machado (2018) "Biodiversity of the Neuropterida", in *Insect Biodiversity: Science and Society*
II. The family characters used here are the textbook ones: the owlfly's long clubbed antenna and divided eyes, the
antlion's short clubbed antenna and long abdomen, the mantidfly's raptorial forelegs on an elongate prothorax, the brown
lacewing's beaded antenna and broad wings, the osmylid's spotted wings.

## Rules derived (what the engine draws)

- **Family pick** (`proportions`): chrysopid twice as likely as each of hemerobiid, myrmeleontid, ascalaphid, mantispid,
  osmylid. `habitus` scales the rolled sizes per family: the hemerobiid every length ×0.75 (the plate's 1.3 scale cap
  leaves it small), the antlion's abdomen ×1.45 long and ×0.75 wide, the owlfly's head ×1.3 broad, the mantidfly's
  abdomen stout.
- **Abdomen against the wing** (`wingSet.abdWing`, the abdomen's length over the forewing's): chrysopid 0.38–0.68 (0.37–
  0.67 before #51, when the wing was sized off the abdomen tip), hemerobiid 0.28–0.52, antlion 1.3–1.6 (#51's range; the
  reference measures about 1.25 on one set specimen, and males run longer), owlfly 0.5–0.72, mantidfly
  0.45–0.8. The antlion's tip always reaches past every wing point (`neuAbdomen`).
- **Wing set** (`wingSet.sets`, a body gene): spread (the setting-board pose), forward (forewings pushed forward, the
  hindwings showing behind them) and swept (both pairs back along the abdomen), each a range of the forewing's angle and
  the hindwing's further sweep; the antlion and the owlfly hold the forewings nearly straight out, the brown lacewing's
  broad forewings straight out or a little forward.
- **Pronotum** (`prothorax`): 0.1–0.22 of the thorax on every family but the mantidfly, whose prothorax is 0.4–0.56 of it,
  narrow in the middle (a neck 0.34–0.44 of the thorax's half width) and widening at the front where the forelegs insert.
  The wing roots and the mid and hind legs keep their places on the pterothorax behind it, and the thorax grows so the
  pterothorax keeps its length (`prothoraxT`, `pteroK`).
- **Forelegs**: walking legs on the prothorax (#19) on every family but the mantidfly, whose forelegs are raptorial in
  every pose and fallback: the femur 2.8–3.6× as long as wide, raised 36–56° toward the head, armed beneath with 4–7
  teeth, the tibia folded back 138–162° against it (`neuRaptorial`).
- **Antennae** (`ant`, body lengths): chrysopid filiform as before; hemerobiid moniliform 0.38–0.55; antlion clubbed
  (gradual) 0.17–0.26; owlfly clubbed (abrupt) 0.8–1.0; mantidfly moniliform or filiform 0.14–0.22, held straight forward
  between the raised forelegs; osmylid filiform 0.35–0.55.
- **Eyes** (`headFams`): the owlfly's and the mantidfly's at least 0.3 of the head width each (the chrysopid's 0.22–0.28).
- **Wings** (`wingFams`): the hemerobiid's broad (half chord 0.2–0.28 of the span) with a rounded apex; the antlion's and
  the mantidfly's narrow (0.12–0.15); the osmylid's forewing carries 4–9 stippled spots (dots on a grid at the floored
  pitch, `meta.wingStats.spots`). On a broad wing the M fork's vertex is shallower, so the intramedian cell still closes
  (#19's rule) under the deeper chord.
- **Abdomen markings** (`abdFams`): the mantidfly mostly banded (wasp-like), the owlfly hairy, the antlion plain, ringed or
  spotted, the hemerobiid plain or hairy.
