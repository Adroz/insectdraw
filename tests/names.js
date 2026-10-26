#!/usr/bin/env node
// Names audit (#29): the Latin epithets and the common-name repeat guard.
//
//   node tests/names.js [N | --seeds A-B]
//
// Prints every epithet stem x gender the engine can produce, checks them against FORMS below, then scans seeds 1..N
// (default 3000) for a common name that repeats a stem, one that disagrees with the plate's marking or antenna genes
// (#28), one that claims a wing pattern its plate does not draw (#82), and lists every common name more than one plate
// shares. Exits 1 on any mismatch, repeat or disagreement, when under PIG_WORD_MIN of the pigmented odonates carry a
// pigment word (#82), or when DUP_MAX or more of the plates share an earlier plate's name. The same
// checks run inside tests/check.js as `epithets` (PRE), `nameStems`, `nameGenes` and `nameWings` (per seed, nameGenes and
// nameWings also in POST for the duplicates and the pigment share), which import their rules from here, so the gate and
// this script cannot disagree.
'use strict';

// Every epithet stem the engine declines, each written out once per genus gender [masculine, feminine, neuter], from
// the Latin, not from the engine: class A -us / -a / -um, class B (third declension) -is / -is / -e, the comparatives
// minor / major (neuter minus / majus), the participles and -pes compounds invariable. A '-' stem is a tail built onto a
// lowercase genus prefix ("chryso" + "pter" -> chrysopterus). saltator is a noun (a leaper), so it is not declined as
// a class B adjective (that gave the non-word saltatoris / saltatore); the adjective saltatorius is (#29).
const FORMS = {
  fuscat: ['fuscatus', 'fuscata', 'fuscatum'], aurat: ['auratus', 'aurata', 'auratum'], maculat: ['maculatus', 'maculata', 'maculatum'],
  punctat: ['punctatus', 'punctata', 'punctatum'], striat: ['striatus', 'striata', 'striatum'], marginat: ['marginatus', 'marginata', 'marginatum'],
  fasciat: ['fasciatus', 'fasciata', 'fasciatum'], lineat: ['lineatus', 'lineata', 'lineatum'], obscur: ['obscurus', 'obscura', 'obscurum'],
  flav: ['flavus', 'flava', 'flavum'], ruf: ['rufus', 'rufa', 'rufum'], cinere: ['cinereus', 'cinerea', 'cinereum'],
  livid: ['lividus', 'livida', 'lividum'], pallid: ['pallidus', 'pallida', 'pallidum'], splendid: ['splendidus', 'splendida', 'splendidum'],
  venust: ['venustus', 'venusta', 'venustum'], hirt: ['hirtus', 'hirta', 'hirtum'], villos: ['villosus', 'villosa', 'villosum'],
  pict: ['pictus', 'picta', 'pictum'], ornat: ['ornatus', 'ornata', 'ornatum'], lucid: ['lucidus', 'lucida', 'lucidum'],
  nitid: ['nitidus', 'nitida', 'nitidum'], minut: ['minutus', 'minuta', 'minutum'], pygmae: ['pygmaeus', 'pygmaea', 'pygmaeum'],
  umbros: ['umbrosus', 'umbrosa', 'umbrosum'], nemoros: ['nemorosus', 'nemorosa', 'nemorosum'], montan: ['montanus', 'montana', 'montanum'],
  bimaculat: ['bimaculatus', 'bimaculata', 'bimaculatum'], quadrimaculat: ['quadrimaculatus', 'quadrimaculata', 'quadrimaculatum'],
  sexpunctat: ['sexpunctatus', 'sexpunctata', 'sexpunctatum'], decempunctat: ['decempunctatus', 'decempunctata', 'decempunctatum'],
  cruciat: ['cruciatus', 'cruciata', 'cruciatum'], reticulat: ['reticulatus', 'reticulata', 'reticulatum'],
  undulat: ['undulatus', 'undulata', 'undulatum'], variegat: ['variegatus', 'variegata', 'variegatum'],
  rubicund: ['rubicundus', 'rubicunda', 'rubicundum'], lute: ['luteus', 'lutea', 'luteum'], ferrugine: ['ferrugineus', 'ferruginea', 'ferrugineum'],
  chalybe: ['chalybeus', 'chalybea', 'chalybeum'], aene: ['aeneus', 'aenea', 'aeneum'], cupre: ['cupreus', 'cuprea', 'cupreum'],
  argente: ['argenteus', 'argentea', 'argenteum'], aure: ['aureus', 'aurea', 'aureum'], fenestrat: ['fenestratus', 'fenestrata', 'fenestratum'],
  lacte: ['lacteus', 'lactea', 'lacteum'], nebulos: ['nebulosus', 'nebulosa', 'nebulosum'], fuliginos: ['fuliginosus', 'fuliginosa', 'fuliginosum'],
  hyalin: ['hyalinus', 'hyalina', 'hyalinum'], vitre: ['vitreus', 'vitrea', 'vitreum'], limbat: ['limbatus', 'limbata', 'limbatum'],
  nigrocinct: ['nigrocinctus', 'nigrocincta', 'nigrocinctum'], pulchell: ['pulchellus', 'pulchella', 'pulchellum'],
  bicolor: ['bicolor', 'bicolor', 'bicolor'], concolor: ['concolor', 'concolor', 'concolor'], tricolor: ['tricolor', 'tricolor', 'tricolor'],
  vulgar: ['vulgaris', 'vulgaris', 'vulgare'], boreal: ['borealis', 'borealis', 'boreale'], austral: ['australis', 'australis', 'australe'],
  oriental: ['orientalis', 'orientalis', 'orientale'], occidental: ['occidentalis', 'occidentalis', 'occidentale'],
  sylvestr: ['sylvestris', 'sylvestris', 'sylvestre'], pratens: ['pratensis', 'pratensis', 'pratense'], arvens: ['arvensis', 'arvensis', 'arvense'],
  palustr: ['palustris', 'palustris', 'palustre'], fluviatil: ['fluviatilis', 'fluviatilis', 'fluviatile'], lacustr: ['lacustris', 'lacustris', 'lacustre'],
  campestr: ['campestris', 'campestris', 'campestre'], nigricorn: ['nigricornis', 'nigricornis', 'nigricorne'],
  flavicorn: ['flavicornis', 'flavicornis', 'flavicorne'], tenu: ['tenuis', 'tenuis', 'tenue'], gracil: ['gracilis', 'gracilis', 'gracile'],
  agil: ['agilis', 'agilis', 'agile'], virid: ['viridis', 'viridis', 'viride'], lugubr: ['lugubris', 'lugubris', 'lugubre'],
  nobil: ['nobilis', 'nobilis', 'nobile'], mirabil: ['mirabilis', 'mirabilis', 'mirabile'], moll: ['mollis', 'mollis', 'molle'],
  brev: ['brevis', 'brevis', 'breve'], grand: ['grandis', 'grandis', 'grande'], saltatori: ['saltatorius', 'saltatoria', 'saltatorium'],
  flavipes: ['flavipes', 'flavipes', 'flavipes'], rufipes: ['rufipes', 'rufipes', 'rufipes'], longipes: ['longipes', 'longipes', 'longipes'],
  nigripes: ['nigripes', 'nigripes', 'nigripes'], albipes: ['albipes', 'albipes', 'albipes'], elegans: ['elegans', 'elegans', 'elegans'],
  nitens: ['nitens', 'nitens', 'nitens'], splendens: ['splendens', 'splendens', 'splendens'], virens: ['virens', 'virens', 'virens'],
  lucens: ['lucens', 'lucens', 'lucens'], rutilans: ['rutilans', 'rutilans', 'rutilans'], fulgens: ['fulgens', 'fulgens', 'fulgens'],
  repens: ['repens', 'repens', 'repens'], nigricans: ['nigricans', 'nigricans', 'nigricans'], albicans: ['albicans', 'albicans', 'albicans'],
  flavescens: ['flavescens', 'flavescens', 'flavescens'], rufescens: ['rufescens', 'rufescens', 'rufescens'],
  minor: ['minor', 'minor', 'minus'], major: ['major', 'major', 'majus'],
  '-pter': ['pterus', 'ptera', 'pterum'], '-som': ['somus', 'soma', 'somum'], '-cephal': ['cephalus', 'cephala', 'cephalum'],
  '-dactyl': ['dactylus', 'dactyla', 'dactylum'], '-not': ['notus', 'nota', 'notum'], '-pus': ['pus', 'pus', 'pus'],
  '-gnath': ['gnathus', 'gnatha', 'gnathum'], '-cer': ['cerus', 'cera', 'cerum'],
};
const GENDERS = ['m', 'f', 'n'];
const NOUN_DECLINED = /(?:oris|ore)$/;   // a third-declension agent noun (saltator) wrongly declined as a class B adjective

// The epithet table against FORMS, as a list of problems (empty when they agree): every stem the engine declines is
// in FORMS and gives exactly its three forms, every FORMS stem is still in the engine, and no form ends -oris / -ore.
function epithetProblems(EPITHETS) {
  const out = [];
  if (!Array.isArray(EPITHETS)) return ['the engine exports no EPITHETS table'];
  const seen = new Set();
  for (const e of EPITHETS) {
    if (seen.has(e.stem)) out.push('stem ' + e.stem + ' listed twice');
    seen.add(e.stem);
    const want = FORMS[e.stem], got = GENDERS.map(g => e[g]);
    if (!want) out.push('stem ' + e.stem + ' (' + got.join(' / ') + ') is not in tests/names.js FORMS');
    else if (got.join() !== want.join()) out.push('stem ' + e.stem + ' declines ' + got.join(' / ') + ', want ' + want.join(' / '));
    for (const f of got) if (NOUN_DECLINED.test(f)) out.push('stem ' + e.stem + ' gives ' + f + ' (a noun declined as an adjective)');
  }
  for (const s of Object.keys(FORMS)) if (!seen.has(s)) out.push('FORMS stem ' + s + ' is no longer in the engine');
  return out;
}

// The words of a common name part, lowercased: "Four-spotted" -> ['four', 'spotted'], "Crane Fly" -> ['crane', 'fly'].
const words = s => s.toLowerCase().split(/[ -]+/).filter(Boolean);
// Two words repeat when they are equal ignoring case, or one starts with the other and the shorter has 4 or more
// letters ("Dark Darkling", "Blue-tailed Bluet", "Banded Band-winged", "Twin-spot Spotted").
const repeats = (a, b) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
// The first pair of repeated words in a whole common name, or null. Every word is compared with every other, so it is
// stricter than the engine's guard (which compares across adjective / noun / base): a name table whose own entry
// repeats a word fails here too.
function repeatedStem(common) {
  const w = words(common);
  for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) if (repeats(w[i], w[j])) return [w[i], w[j]];
  return null;
}

// ---- #28: the name agrees with the plate ----
// Words that claim an abdominal marking (meta.bodyGenes.abd.mark): a common name may carry one only when the plate
// draws that marking, so a plain abdomen is never "Banded" and a banded one never "Spotted". Written from English
// usage, not copied from the engine: the engine's gene words must be a subset of these (tests/check.js nameGenes).
const MARK_CLAIMS = {
  banded: ['Banded', 'Girdled', 'Belted'],
  rings: ['Ringed', 'Golden-ringed', 'Annulated', 'Ring-bodied'],
  spotted: ['Spotted', 'Four-spotted', 'Six-spotted', 'Twin-spot', 'Dotted'],
  striped: ['Striped', 'Lined', 'Streaked'],
  tipdark: ['Black-tailed', 'Dark-tipped', 'Black-tipped'],
  hairy: ['Hairy', 'Downy', 'Velvet', 'Woolly', 'Shaggy'],
  triangles: ['Chevroned', 'Arrow-marked', 'Dagger-marked', 'Triangle-marked'],
};
// Words that claim an antenna kind (meta.antenna): the same rule (a "Feathered" moth has feathered antennae).
const ANT_CLAIMS = {
  moniliform: ['Bead-horned'], lamellate: ['Fan-horned'], serrate: ['Saw-horned'], pectinate: ['Comb-horned'],
  bipectinate: ['Feathered'], plumose: ['Plumed'], clubbed: ['Club-horned'],
};
// The family nouns the ticket names: the drawn family's noun table must hold these (an ichneumonid is an Ichneumon,
// a papilionid a Swallowtail), keyed by the names table (type, or the variant for the moth's butterfly table).
const FAM_NOUN_SPEC = {
  wasp: { ichneumonid: ['Ichneumon'] },
  bee: { apid: ['Bumble', 'Mining'] },
  butterfly: { papilionid: ['Swallowtail'], satyrine: ['Brown', 'Ringlet'] },
  damselfly: { coenagrionid: ['Bluet', 'Damsel'], calopterygid: ['Demoiselle', 'Jewelwing'] },
  lacewing: { chrysopid: ['Green'], hemerobiid: ['Brown'], myrmeleontid: ['Pit'] },   // #51
  fly: { tachinid: ['Tachinid'], bombyliid: ['Bee'], conopid: ['Thick-headed'] },   // #54
  cranefly: { limoniid: ['Short-palped'], pediciid: ['Hairy-eyed'], ctenophorine: ['Wasp'] },   // #55
};
// a phrase (one or more words) appears in the common name as whole words
const hasPhrase = (common, w) => (' ' + common + ' ').includes(' ' + w + ' ');
// What a common name gets wrong about its plate's genes, as a list (empty when it agrees): a marking or antenna word
// the plate does not draw; and, when the plate has a gene word to give (a marking other than plain, or an antenna kind
// its family draws on under half its plates: antDistinct), a name that carries none of them.
// wingOwn (#82): the plate's pigment words (pigmentWords), which serve as its gene word as well as a marking's would.
function geneProblems(common, mark, antenna, antDistinct, wingOwn = []) {
  const out = [];
  for (const m in MARK_CLAIMS) if (m !== mark) for (const w of MARK_CLAIMS[m]) if (hasPhrase(common, w)) out.push('"' + w + '" on a ' + mark + ' abdomen');
  for (const k in ANT_CLAIMS) if (k !== antenna) for (const w of ANT_CLAIMS[k]) if (hasPhrase(common, w)) out.push('"' + w + '" on ' + antenna + ' antennae');
  const own = [...(MARK_CLAIMS[mark] || []), ...(antDistinct ? ANT_CLAIMS[antenna] || [] : [])];
  if (own.length && ![...own, ...wingOwn].some(w => hasPhrase(common, w))) out.push('no gene word (' + [...own, ...wingOwn].join(' / ') + ') for a ' + mark + ' abdomen' + (antDistinct && ANT_CLAIMS[antenna] ? ' with ' + antenna + ' antennae' : ''));
  return out;
}
// Whether a plate's antenna kind is a gene word to give: its family's antenna table (the order's ORDERS entry `ant`, base
// plus the family's override) draws that kind on under half its plates; a kind the family always draws says nothing.
function antRare(ORDERS, type, fam, kind) {
  const T = ORDERS[type].ant, k = Object.assign({}, T.base, T[fam] || {}).kinds;
  return (k[kind] || 0) < 0.5 * Object.values(k).reduce((a, w) => a + w, 0);
}
// ---- #82: the name agrees with the drawn wing ----
// Words that claim a wing pattern a 1-bit plate can show or contradict, keyed by the wing pattern that draws it: the
// odonate wing pigment kinds (meta.odoPig.patches[].name, ODO_PIG_KINDS) and, below them, patterns no plate's meta records
// (no wing draws them yet). A common name may carry one only when the plate draws that pattern, so a clear-winged chaser
// is never "Band-winged". Colour words (WING_COLOUR) are no claim: the viewer imagines the colour on a 1-bit plate, so they
// stay free on any plate (Nik, #82). Written from English usage (the Band-winged Dragonlet, the Four-spotted Chaser, the
// Ebony Jewelwing, the rubyspots' red wing bases), not copied from the engine. The engine's pattern words (GENE_WING_ADJ,
// unexported) must be a subset of these: tests/check.js nameWings sees only the names it draws, so a pattern word added
// to the engine alone shows as a lower pigment share (PIG_WORD_MIN), not as a failure.
const WING_CLAIMS = {
  basal: ['Dark-based', 'Black-based', 'Rubyspot'],
  nodal: ['Spot-winged', 'Four-spot'],
  band: ['Band-winged', 'Bar-winged'],
  tips: ['Dusky-tipped', 'Tip-spotted'],
  full: ['Dark-winged', 'Black-winged', 'Ebony', 'Smoky-winged'],
  spotted: ['Spotted-winged'], stripe: ['Stripe-winged'], picture: ['Picture-winged'], costa: ['Dark-edged'], apex: ['Orange-tip'],
};
// Colour words for the wing: no claim, free on any plate. WING_WASH, the ones that name a wash (the amber costal field):
// the engine picks one for a wash, and a free one on a wash plate names it too; Red-veined and Blue-winged do not.
const WING_WASH = ['Amber-winged', 'Saffron-winged', 'Golden-winged', 'Yellow-winged'];
const WING_COLOUR = [...WING_WASH, 'Red-veined', 'Blue-winged'];
// Pattern words an order's names carry for a pattern its wing never draws, left free (Nik, #82: "either draw it or leave
// the word free and note it"): the grasshopper's hindwing band (#72 deferred it) and tegmen stripe, the antlion's spotted
// wing, the bee-fly's dark costal half, the picture-winged fly's pattern (no fly family is drawn patterned) and the
// orange-tip's apical patch. Keyed by the names table (type, or the variant); free there only, checked anywhere else.
const WING_UNDRAWN = {
  grasshopper: ['Band-winged', 'Stripe-winged'],
  lacewing: ['Spotted-winged'],
  fly: ['Picture-winged', 'Dark-edged'],
  butterfly: ['Orange-tip'],
};
// The wing pattern kinds a plate draws, from its meta: the odonate pigment patches; none elsewhere
const wingKinds = meta => (meta.odoPig ? meta.odoPig.patches.map(p => p.name) : []);
// What a common name gets wrong about its plate's drawn wing, as a list (empty when it agrees): a wing pattern word whose
// pattern the plate does not draw, unless its names table (table: the variant, else the type) leaves the word free.
function wingProblems(common, table, kinds) {
  const out = [], free = WING_UNDRAWN[table] || [];
  for (const k in WING_CLAIMS) if (!kinds.includes(k)) for (const w of WING_CLAIMS[k]) {
    if (!free.includes(w) && hasPhrase(common, w)) out.push('"' + w + '" on a wing with ' + (kinds.length ? kinds.join(' + ') + ' pigment' : 'no pigment'));
  }
  return out;
}
// The words that name a plate's drawn pigment: the claim words of every kind it draws, and the wash's colour words
const pigmentWords = kinds => [...kinds.flatMap(k => WING_CLAIMS[k] || []), ...(kinds.includes('wash') ? WING_WASH : [])];
// Whether a common name names its plate's drawn pigment (the PIG_WORD_MIN tally of names.js and check.js nameWings)
const namesPigment = (common, kinds) => pigmentWords(kinds).some(w => hasPhrase(common, w));
// #82 (b): at least PIG_WORD_MIN of the pigmented odonate plates carry a pigment word. A pigment word is a gene word
// (geneProblems' wing words): it may take the adjective a marking word would, so the share is of every pigmented plate.
const PIG_WORD_MIN = 0.4;

// The share of plates whose common name an earlier plate already had: (plates - distinct names) / plates
function duplicateShare(commons) { return commons.length ? (commons.length - new Set(commons).size) / commons.length : 0; }
const DUP_MAX = 0.1;   // the ticket's ceiling over seeds 1-3000 (21% at main 37a7371, 32% at backlog 14ee739)

// The names table a plate's common name comes from, as WING_UNDRAWN keys it: the variant's, else the type's
const tableKey = (ORDERS, type, variant) => (variant && ORDERS[type].variantNames && ORDERS[type].variantNames[variant] ? variant : type);

module.exports = { FORMS, epithetProblems, repeatedStem, MARK_CLAIMS, ANT_CLAIMS, FAM_NOUN_SPEC, hasPhrase, geneProblems, antRare, duplicateShare, DUP_MAX,
  WING_CLAIMS, WING_WASH, WING_COLOUR, WING_UNDRAWN, wingKinds, wingProblems, pigmentWords, namesPigment, PIG_WORD_MIN, tableKey };

if (require.main === module) {
  const { loadEngine } = require('./engine');
  const E = loadEngine();
  const argv = process.argv.slice(2);
  let from = 1, to = 3000;
  if (argv[0] === '--seeds') { const m = /^(\d+)-(\d+)$/.exec(argv[1] || ''); if (!m) { console.error('--seeds wants A-B'); process.exit(2); } from = +m[1]; to = +m[2]; }
  else if (/^\d+$/.test(argv[0] || '')) to = +argv[0];
  else if (argv.length) { console.error('usage: node tests/names.js [N | --seeds A-B]'); process.exit(2); }
  let bad = 0;
  for (const e of E.EPITHETS || []) console.log(e.stem.padEnd(16), GENDERS.map(g => e[g]).join(' / '));
  const ep = epithetProblems(E.EPITHETS);
  for (const p of ep) console.log('EPITHET:', p);
  bad += ep.length;
  const hits = [], genes = [], wings = [], commons = [], seen = new Map(), pig = { n: 0, named: 0 };
  for (let seed = from; seed <= to; seed++) {
    const { meta } = E.generateInsectDetailed(seed);
    const r = repeatedStem(meta.name.common);
    if (r) hits.push(seed + ' ' + meta.type + ': "' + meta.name.common + '" (' + r.join(' / ') + ')');
    // #28: the name agrees with the marking and antenna genes (tests/check.js nameGenes holds the same rule)
    const kinds = wingKinds(meta), pw = pigmentWords(kinds);
    for (const p of geneProblems(meta.name.common, meta.bodyGenes.abd.mark, meta.antenna, antRare(E.ORDERS, meta.type, meta.bodyGenes.fam, meta.antenna), pw)) genes.push(seed + ' ' + meta.type + ': ' + p + ' ("' + meta.name.common + '")');
    // #82: the name agrees with the drawn wing; a pigmented odonate names its pigment on a share of plates
    for (const p of wingProblems(meta.name.common, tableKey(E.ORDERS, meta.type, meta.variant), kinds)) wings.push(seed + ' ' + meta.type + ': ' + p + ' ("' + meta.name.common + '")');
    if (kinds.length) { pig.n++; if (namesPigment(meta.name.common, kinds)) pig.named++; }
    commons.push(meta.name.common);
    (seen.get(meta.name.common) || seen.set(meta.name.common, []).get(meta.name.common)).push(seed);
  }
  for (const h of hits) console.log('REPEAT:', h);
  for (const g of genes) console.log('GENES:', g);
  for (const w of wings) console.log('WINGS:', w);
  const pigShare = pig.n ? pig.named / pig.n : 1;
  if (pigShare < PIG_WORD_MIN) console.log('PIGMENT: ' + pig.named + ' of ' + pig.n + ' pigmented odonates carry a pigment word (min ' + PIG_WORD_MIN * 100 + '%)');
  const share = duplicateShare(commons);
  for (const [name, seeds] of seen) if (seeds.length > 1) console.log('DUPLICATE:', '"' + name + '"', seeds.join(' '));
  bad += hits.length + genes.length + wings.length + (pigShare < PIG_WORD_MIN ? 1 : 0) + (share >= DUP_MAX ? 1 : 0);
  console.log('epithet stems:', (E.EPITHETS || []).length, '| seeds scanned:', to - from + 1, '| repeated-stem names:', hits.length,
    '| gene disagreements:', genes.length, '| wing disagreements:', wings.length, '| pigment words:', pig.named + '/' + pig.n, '| duplicate names:', commons.length - seen.size, '(' + (share * 100).toFixed(1) + '%, max ' + DUP_MAX * 100 + '%)');
  console.log(bad ? 'FAIL' : 'OK');
  process.exit(bad ? 1 : 0);
}
