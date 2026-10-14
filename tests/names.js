#!/usr/bin/env node
// Names audit (#29): the Latin epithets and the common-name repeat guard.
//
//   node tests/names.js [N | --seeds A-B]
//
// Prints every epithet stem x gender the engine can produce, checks them against FORMS below, then scans seeds 1..N
// (default 3000) for a common name that repeats a stem and lists each one. Exits 1 on any mismatch or repeat. The same
// two checks run inside tests/check.js as `epithets` (PRE) and `nameStems` (per seed), which import FORMS and
// repeatedStem from here, so the gate and this script cannot disagree.
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

module.exports = { FORMS, epithetProblems, repeatedStem };

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
  const hits = [];
  for (let seed = from; seed <= to; seed++) {
    const { meta } = E.generateInsectDetailed(seed);
    const r = repeatedStem(meta.name.common);
    if (r) hits.push(seed + ' ' + meta.type + ': "' + meta.name.common + '" (' + r.join(' / ') + ')');
  }
  for (const h of hits) console.log('REPEAT:', h);
  bad += hits.length;
  console.log('epithet stems:', (E.EPITHETS || []).length, '| seeds scanned:', to - from + 1, '| repeated-stem names:', hits.length);
  console.log(bad ? 'FAIL' : 'OK');
  process.exit(bad ? 1 : 0);
}
