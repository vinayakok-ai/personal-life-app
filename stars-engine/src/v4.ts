// Stars Engine v4 — two-axis scoring (see REVIEW.md §5).
//   Promise P  (0–100, static per topic): what the natal chart allows.
//   Trigger T  (0–100, per window): whether dasha + transits activate it.
//   Grid cell: P × T → a named outcome class and a specificity level.
// Every term is listed with its contribution so the number can be audited.

import type { Dignity, Graha, Ingested, Planet, PlanetRow, Sign, TransitInput } from "./types.ts";
import { NATURAL_BENEFICS, NATURAL_MALEFICS, SIGN_LORD, SPECIAL_ASPECTS, houseFrom, isGraha, signAt, signIndex } from "./tables.ts";
import { dignityOf, parseDegree } from "./ingest.ts";
import { compoundRelation, aspectsHouse } from "./engine.ts";

export type Topic = "marriage" | "career" | "business" | "wealth" | "children" | "property" | "health" | "foreign" | "education" | "siblings" | "mother" | "father" | "general";
export type Signification = {
  topic: Topic; primary: number[]; secondary: number[]; karakas: Planet[];
  charakaraka?: "AK" | "AmK" | "BK" | "MK" | "PK" | "GK" | "DK"; arudhaOf?: number; varga?: "D9" | "D10" | "D4" | "D7"; vargaHouse?: number;
};
export const SIGNIFICATIONS: Record<Topic, Signification> = {
  marriage: { topic: "marriage", primary: [7], secondary: [2, 11], karakas: ["Venus"], charakaraka: "DK", arudhaOf: 12, varga: "D9", vargaHouse: 7 },
  career: { topic: "career", primary: [10], secondary: [6, 2, 11], karakas: ["Sun", "Saturn", "Mercury"], charakaraka: "AmK", arudhaOf: 10, varga: "D10", vargaHouse: 10 },
  business: { topic: "business", primary: [7, 10], secondary: [11, 2, 3], karakas: ["Mercury", "Venus"], charakaraka: "AmK", arudhaOf: 7, varga: "D10", vargaHouse: 7 },
  wealth: { topic: "wealth", primary: [2, 11], secondary: [5, 9], karakas: ["Jupiter"], arudhaOf: 1 },
  children: { topic: "children", primary: [5], secondary: [9, 11], karakas: ["Jupiter"], charakaraka: "PK", varga: "D7", vargaHouse: 5 },
  property: { topic: "property", primary: [4], secondary: [11, 2], karakas: ["Mars", "Venus"], charakaraka: "MK", varga: "D4", vargaHouse: 4 },
  health: { topic: "health", primary: [1, 6], secondary: [8], karakas: ["Sun", "Moon"], charakaraka: "AK" },
  foreign: { topic: "foreign", primary: [12, 9], secondary: [3, 7], karakas: ["Rahu"] },
  education: { topic: "education", primary: [4, 5], secondary: [9, 2], karakas: ["Mercury", "Jupiter"] },
  siblings: { topic: "siblings", primary: [3], secondary: [11], karakas: ["Mars"], charakaraka: "BK" },
  mother: { topic: "mother", primary: [4], secondary: [], karakas: ["Moon"], charakaraka: "MK" },
  father: { topic: "father", primary: [9], secondary: [10], karakas: ["Sun"], charakaraka: "PK" },
  general: { topic: "general", primary: [1], secondary: [9, 10], karakas: ["Sun", "Moon"], charakaraka: "AK", arudhaOf: 1 },
};
const TOPIC_RE: [Topic, RegExp][] = [
  ["marriage", /\b(marriage|marr(?:y|ied)|wedding|spouse|partner|relationship|wife|husband|divorce)\b/i],
  ["business", /\b(business|startup|start-up|founder|venture|company|trade|partnership|client|customer|sales|funding)\b/i],
  ["career", /\b(career|job|promotion|work|profession|employ|boss|salary|role)\b/i],
  ["children", /\b(child|children|kids?|pregnan\w*|conceiv\w*|son|daughter)\b/i],
  ["property", /\b(property|home|land|flat|apartment|vehicle|car)\b/i],
  ["wealth", /\b(money|wealth|income|finance|gain|debt|loan|savings)\b/i],
  ["health", /\b(health|illness|disease|surgery|medical|sick|mind|mental|mood)\b/i],
  ["foreign", /\b(abroad|foreign|overseas|relocat\w*|migrat\w*|visa|travel)\b/i],
  ["education", /\b(study|studies|education|exam|degree|college|university)\b/i],
  ["siblings", /\b(sibling|brother|sister)\b/i],
  ["mother", /\b(mother|mom|mum)\b/i],
  ["father", /\b(father|dad)\b/i],
];
export const topicOf = (text: string): Topic => TOPIC_RE.find(([, re]) => re.test(text))?.[0] ?? "general";

export type Term = { factor: string; points: number; source: string };
export type PromiseResult = { P: number; raw: number; terms: Term[]; tags: string[] };
export type Tone = "favourable" | "mixed" | "adverse";
export type TriggerResult = { T: number; Tgain: number; Tloss: number; tone: Tone; toneScore: number; toneWhy: string[]; loss: { planet: Planet; level: string; c: number; via: string; points: number }[]; lossTransit: Term[]; dasha: { planet: Planet; level: string; c: number; via: string; points: number }[]; transit: Term[]; tags: string[]; dashaPoints: number; transitPoints: number };
export type Cell = { name: string; level: number; note: string };

// ---- helpers ----
const by = (ing: Ingested, p: Planet) => ing.planets.find((x) => x.planet === p);
const houseSign = (asc: Sign, h: number) => signAt(signIndex(asc) + h - 1);
const lordOf = (asc: Sign, h: number): Graha => SIGN_LORD[houseSign(asc, h)];
const dignityPts = (d: Dignity) => ({ Exalted: 10, Moolatrikona: 8, Own: 8, Friend: 3, Neutral: 0, Enemy: -3, Debilitated: -8, "n/a": 0 })[d];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const KENDRA_TRIKONA = [1, 4, 5, 7, 9, 10], DUSTHANA = [6, 8, 12];

function neechaBhanga(ing: Ingested, p: PlanetRow): boolean {
  if (p.dignity !== "Debilitated" || !isGraha(p.planet)) return false;
  const disp = by(ing, SIGN_LORD[p.sign]);
  const exSign = signAt(signIndex(p.sign) + 6);
  const exLord = by(ing, SIGN_LORD[exSign]);
  return !!((disp && KENDRA_TRIKONA.slice(0, 4).includes(disp.house)) || (exLord && [1, 4, 7, 10].includes(exLord.house)) || (disp && disp.dignity === "Exalted"));
}
export function charakarakas(ing: Ingested): Record<string, Planet> {
  const names = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
  const sorted = ing.planets.filter((p) => isGraha(p.planet)).sort((a, b) => b.degree - a.degree);
  return Object.fromEntries(sorted.map((p, i) => [names[i], p.planet]));
}
export function arudha(ing: Ingested, house: number): number {
  const lp = by(ing, lordOf(ing.ascendant.sign, house));
  if (!lp) return 0;
  const dist = (lp.house - house + 12) % 12;
  let pada = ((house - 1 + 2 * dist) % 12) + 1;
  const rel = ((pada - house + 12) % 12) + 1;
  if (rel === 1 || rel === 7) pada = ((pada - 1 + 9) % 12) + 1;
  return pada;
}
function gandantaOrSandhi(p: PlanetRow): boolean {
  const si = signIndex(p.sign);
  return ([3, 7, 11].includes(si) && p.degree > 26.6667) || ([0, 4, 8].includes(si) && p.degree < 3.3333) || p.degree < 1 || p.degree > 29;
}

// ---- Named yogas (Parashari), scored by topic relevance ----
function topicYogas(ing: Ingested, sig: Signification): [string, number][] {
  const asc = ing.ascendant.sign, out: [string, number][] = [];
  const t = sig.topic;
  const conj = (a: PlanetRow, b: PlanetRow) => a.sign === b.sign;
  const mutual = (a: PlanetRow, b: PlanetRow) => conj(a, b) || (aspectsHouse(a, asc, b.house) && aspectsHouse(b, asc, a.house));
  const L = (h: number) => by(ing, lordOf(asc, h));
  const l1 = L(1), l2 = L(2), l4 = L(4), l5 = L(5), l7 = L(7), l9 = L(9), l10 = L(10), l11 = L(11);
  const moon = by(ing, "Moon"), jup = by(ing, "Jupiter"), sun = by(ing, "Sun"), mer = by(ing, "Mercury"), mars = by(ing, "Mars");
  // Dharma-Karmadhipati: 9L–10L together
  if (l9 && l10 && l9.planet !== l10.planet && mutual(l9, l10)) out.push(["Dharma-Karmadhipati yoga (9L–10L)", t === "career" ? 8 : t === "wealth" ? 4 : t === "father" ? 4 : 2]);
  // Raja yoga: a kendra lord with a trikona lord (excluding the same planet)
  const kendraL = [1, 4, 7, 10].map(L), trikonaL = [5, 9].map(L);
  let raja = false;
  for (const k of kendraL) for (const tr of trikonaL) if (k && tr && k.planet !== tr.planet && mutual(k, tr)) raja = true;
  if (raja) out.push(["Raja yoga (kendra lord with trikona lord)", ["career", "wealth", "general", "father"].includes(t) ? 5 : 2]);
  // Dhana yoga: 2L/11L linked with 5L/9L/1L
  const dhanaA = [l2, l11], dhanaB = [l5, l9, l1];
  let dhana = false;
  for (const a of dhanaA) for (const b of dhanaB) if (a && b && a.planet !== b.planet && mutual(a, b)) dhana = true;
  if (dhana) out.push(["Dhana yoga (2/11 lord with 1/5/9 lord)", t === "wealth" ? 6 : t === "career" ? 3 : 1]);
  // Gajakesari
  if (moon && jup && [1, 4, 7, 10].includes(houseFrom(moon.sign, jup.sign))) out.push(["Gajakesari yoga", ["career", "wealth", "general", "education", "health"].includes(t) ? 4 : 2]);
  // Budhaditya
  if (sun && mer && conj(sun, mer)) out.push(["Budhaditya yoga", ["career", "education"].includes(t) ? 3 : 1]);
  // Chandra-Mangala
  if (moon && mars && conj(moon, mars)) out.push(["Chandra-Mangala yoga", t === "wealth" ? 4 : 1]);
  // Pancha Mahapurusha
  const mp: Record<string, Graha> = { Ruchaka: "Mars", Bhadra: "Mercury", Hamsa: "Jupiter", Malavya: "Venus", Sasa: "Saturn" };
  for (const [n, g] of Object.entries(mp)) { const p = by(ing, g); if (p && [1, 4, 7, 10].includes(p.house) && ["Exalted", "Own", "Moolatrikona"].includes(p.dignity)) out.push([`${n} Mahapurusha yoga`, ["career", "general", "health"].includes(t) ? 6 : 3]); }
  // Kemadruma
  if (moon) { const nb = ing.planets.filter((p) => !["Moon", "Sun", "Rahu", "Ketu"].includes(p.planet) && [2, 12].includes(houseFrom(moon.sign, p.sign))); if (!nb.length) out.push(["Kemadruma yoga", ["wealth", "health", "general"].includes(t) ? -4 : -1]); }
  // Kartari on the primary house: malefics in 12th and 2nd from it
  const h0 = sig.primary[0];
  const prev = ((h0 + 10) % 12) + 1, next = (h0 % 12) + 1;
  const malIn = (h: number) => ing.planets.some((p) => p.house === h && NATURAL_MALEFICS.includes(p.planet));
  const benIn = (h: number) => ing.planets.some((p) => p.house === h && NATURAL_BENEFICS.includes(p.planet));
  if (malIn(prev) && malIn(next)) out.push([`Papa-kartari on H${h0}`, -5]);
  else if (benIn(prev) && benIn(next)) out.push([`Shubha-kartari on H${h0}`, 4]);
  // Marriage-specific: Venus–Jupiter link, Mars in 1/2/4/7/8/12 (Kuja dosha, simplified)
  if (t === "marriage") {
    const ven = by(ing, "Venus");
    if (ven && jup && mutual(ven, jup)) out.push(["Venus–Jupiter link", 4]);
    if (mars && [1, 2, 4, 7, 8, 12].includes(mars.house) && !(mars.dignity === "Own" || mars.dignity === "Exalted")) out.push(["Kuja dosha (simplified)", -3]);
    if (l7 && l1 && l7.planet !== l1.planet && mutual(l7, l1)) out.push(["1L–7L link", 4]);
    if (l4 && ven && ven.house === 4) out.push(["Venus in the 4th", 2]);
  }
  return out;
}

// ---- PROMISE ----
export function promise(ing: Ingested, sig: Signification): PromiseResult {
  const asc = ing.ascendant.sign;
  const terms: Term[] = [];
  const tags: string[] = [];
  const add = (factor: string, points: number, source: string) => { if (points !== 0) terms.push({ factor, points: Math.round(points * 10) / 10, source }); };

  const lordTerms = (h: number, w: number) => {
    const lord = lordOf(asc, h), lp = by(ing, lord);
    if (!lp) return;
    let d = dignityPts(lp.dignity);
    if (neechaBhanga(ing, lp)) { d = 0; tags.push(`${lord} debilitation cancelled`); }
    add(`H${h} lord ${lord} ${lp.dignity}${neechaBhanga(ing, lp) ? " (cancelled)" : ""}`, d * w, "dignity");
    const sb = ing.shadbala?.find((s) => s.planet === lord);
    if (sb?.ratio !== undefined) add(`${lord} Shadbala ratio ${sb.ratio}`, clamp((sb.ratio - 1) * 50, -5, 10) * w, "shadbala");
    if (lp.house === h) add(`${lord} in its own house H${h}`, 8 * w, "placement");
    else if (DUSTHANA.includes(lp.house)) add(`${lord} in dusthana H${lp.house}`, -8 * w, "placement");
    else if (KENDRA_TRIKONA.includes(lp.house)) add(`${lord} in kendra/trikona H${lp.house}`, 6 * w, "placement");
    else if (lp.house === 11) add(`${lord} in H11 (labha)`, 5 * w, "placement");
    else if (lp.house === 2) add(`${lord} in H2`, 3 * w, "placement");
    else if (lp.house === 3) add(`${lord} in H3`, 1 * w, "placement");
    // Relative placement: lord in 6/8/12 *from its own house* weakens it (BPHS), kendra/trikona from it strengthens.
    const relH = ((lp.house - h + 12) % 12) + 1;
    if ([6, 8, 12].includes(relH) && !DUSTHANA.includes(lp.house)) add(`${lord} in ${relH}th from H${h}`, -3 * w, "placement");
    // Conjunctions and aspects on the lord.
    const withLord = ing.planets.filter((p) => p.planet !== lord && p.sign === lp.sign);
    for (const p of withLord) {
      if (NATURAL_BENEFICS.includes(p.planet)) add(`${p.planet} conjunct H${h} lord`, 3 * w, "conjunction");
      else if (["Saturn", "Mars", "Rahu", "Ketu"].includes(p.planet)) add(`${p.planet} conjunct H${h} lord`, -2 * w, "conjunction");
    }
    for (const p of ing.planets) {
      if (p.sign === lp.sign || p.planet === lord) continue;
      if (aspectsHouse(p, asc, lp.house)) {
        if (p.planet === "Jupiter") add(`Jupiter aspects H${h} lord`, 3 * w, "aspects");
        else if (["Saturn", "Mars", "Rahu"].includes(p.planet)) add(`${p.planet} aspects H${h} lord`, -2 * w, "aspects");
      }
    }
    // Dispositor condition and exchange.
    if (isGraha(lord)) {
      const dispP = SIGN_LORD[lp.sign];
      const dp = by(ing, dispP);
      if (dp && dispP !== lord) {
        if (KENDRA_TRIKONA.includes(dp.house)) add(`${lord}'s dispositor ${dispP} in kendra/trikona`, 2 * w, "dispositor");
        else if (DUSTHANA.includes(dp.house)) add(`${lord}'s dispositor ${dispP} in dusthana`, -2 * w, "dispositor");
        if (isGraha(dispP) && SIGN_LORD[dp.sign] === lord) add(`Parivartana: ${lord} ⇄ ${dispP}`, 5 * w, "yoga");
      }
    }
    if (lp.combust) add(`${lord} combust`, -8 * w, "combustion");
    if (lp.retrograde) tags.push(`${lord} retrograde (delay)`);
    if (gandantaOrSandhi(lp)) add(`${lord} in gandanta/sandhi`, -5 * w, "sensitivity");
    if (isGraha(lord)) {
      const disp = SIGN_LORD[lp.sign];
      if (disp !== lord && compoundRelation(ing, lord, disp) === "Bitter enemy") add(`${lord} disposed by bitter enemy ${disp}`, -3 * w, "sambandha");
    }
  };
  const houseTerms = (h: number, w: number) => {
    if (ing.sav) { const v = ing.sav[h - 1]; add(`H${h} SAV ${v}`, (v >= 30 ? 8 : v >= 25 ? 0 : -8) * w, "ashtakavarga"); }
    if (ing.bhavaBala) {
      const rank = [...ing.bhavaBala].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v).findIndex((x) => x.i === h - 1) + 1;
      add(`H${h} Bhava Bala rank ${rank}/12`, (rank <= 4 ? 5 : rank >= 9 ? -5 : 0) * w, "bhavabala");
    }
    let occ = 0, asp = 0;
    for (const p of ing.planets) {
      if (p.house === h) occ += NATURAL_BENEFICS.includes(p.planet) ? 5 : NATURAL_MALEFICS.includes(p.planet) ? -5 : 0;
      else if (aspectsHouse(p, asc, h)) asp += p.planet === "Jupiter" || p.planet === "Venus" ? 3 : NATURAL_MALEFICS.includes(p.planet) ? -3 : 0;
    }
    const occupants = ing.planets.filter((p) => p.house === h).map((p) => p.planet);
    if (occ) add(`H${h} occupants ${occupants.join(", ")}`, clamp(occ, -10, 10) * w, "occupation");
    if (asp) add(`H${h} aspects`, clamp(asp, -6, 6) * w, "aspects");
  };
  for (const h of sig.primary) { lordTerms(h, 1 / sig.primary.length); houseTerms(h, 1 / sig.primary.length); }
  for (const h of sig.secondary) { lordTerms(h, 0.5 / sig.secondary.length); houseTerms(h, 0.5 / sig.secondary.length); }
  for (const k of sig.karakas) {
    const kp = by(ing, k); if (!kp) continue;
    add(`Karaka ${k} ${kp.dignity}`, dignityPts(kp.dignity) * 0.5 / sig.karakas.length, "karaka");
    if (kp.combust) add(`Karaka ${k} combust`, -4 / sig.karakas.length, "karaka");
    const h0 = sig.primary[0], l0 = by(ing, lordOf(asc, h0));
    if (kp.house === h0 || aspectsHouse(kp, asc, h0)) add(`Karaka ${k} ${kp.house === h0 ? "in" : "aspects"} H${h0}`, 3 / sig.karakas.length, "karaka");
    if (l0 && l0.planet !== k && l0.sign === kp.sign) add(`Karaka ${k} conjunct H${h0} lord`, 3 / sig.karakas.length, "karaka");
    if (DUSTHANA.includes(kp.house)) add(`Karaka ${k} in dusthana H${kp.house}`, -3 / sig.karakas.length, "karaka");
  }
  // Lagna lord: the native's capacity, applied to every topic at half weight.
  {
    const ll = lordOf(asc, 1), lp = by(ing, ll);
    if (lp && !sig.primary.includes(1)) {
      let d = dignityPts(lp.dignity); if (neechaBhanga(ing, lp)) d = 0;
      add(`Lagna lord ${ll} ${lp.dignity}`, d * 0.5, "lagna-lord");
      if (KENDRA_TRIKONA.includes(lp.house)) add(`Lagna lord in kendra/trikona H${lp.house}`, 3, "lagna-lord");
      else if (DUSTHANA.includes(lp.house)) add(`Lagna lord in dusthana H${lp.house}`, -4, "lagna-lord");
      if (lp.combust) add(`Lagna lord combust`, -3, "lagna-lord");
    }
  }
  // Named yogas scored per topic.
  for (const [name, pts] of topicYogas(ing, sig)) add(name, pts, "yoga");
  if (sig.varga) {
    const v = ing.vargas[sig.varga];
    if (v) {
      const vLord = SIGN_LORD[v.ascendant], vl = v.planets.find((p) => p.planet === vLord);
      if (vl) add(`${sig.varga} lagna lord ${vLord} ${dignityOf(vLord, vl.sign, 15)}`, dignityPts(dignityOf(vLord, vl.sign, 15)) / 2, "varga");
      if (sig.vargaHouse) {
        const vhLord = SIGN_LORD[houseSign(v.ascendant, sig.vargaHouse)], vh = v.planets.find((p) => p.planet === vhLord);
        if (vh) add(`${sig.varga} H${sig.vargaHouse} lord ${vhLord} ${dignityOf(vhLord, vh.sign, 15)}`, dignityPts(dignityOf(vhLord, vh.sign, 15)) / 2, "varga");
      }
      for (const k of sig.karakas) { const kv = v.planets.find((p) => p.planet === k); if (kv) add(`Karaka ${k} in ${sig.varga}: ${dignityOf(k, kv.sign, 15)}`, dignityPts(dignityOf(k, kv.sign, 15)) / 2 / sig.karakas.length, "varga"); }
      const d1Lord = lordOf(asc, sig.primary[0]), d1v = v.planets.find((p) => p.planet === d1Lord);
      if (d1v && DUSTHANA.includes(houseFrom(v.ascendant, d1v.sign))) add(`H${sig.primary[0]} lord ${d1Lord} in ${sig.varga} dusthana`, -5, "varga");
    } else tags.push(`${sig.varga} not available — varga terms skipped`);
  }
  const raw = terms.reduce((a, t) => a + t.points, 0);
  return { P: Math.round(clamp(50 + raw, 0, 100)), raw: Math.round(raw * 10) / 10, terms, tags };
}

// ---- TRIGGER ----
export function connection(ing: Ingested, p: Planet, sig: Signification): { c: number; via: string } {
  return inherit(ing, p, (q) => connectionBase(ing, q, sig));
}
function connectionBase(ing: Ingested, p: Planet, sig: Signification): { c: number; via: string } {
  const asc = ing.ascendant.sign, pr = by(ing, p);
  if (!pr) return { c: 0, via: "absent" };
  const cands: [number, string][] = [];
  const ck = charakarakas(ing);
  for (const h of sig.primary) {
    const lord = lordOf(asc, h), lp = by(ing, lord);
    if (lord === p) cands.push([1.0, `lord of H${h}`]);
    if (pr.house === h) cands.push([0.9, `occupies H${h}`]);
    if (lp && (lp.starLord === p || SIGN_LORD[lp.sign] === p) && p !== lord) cands.push([0.7, `${lp.starLord === p ? "star lord" : "dispositor"} of H${h} lord ${lord}`]);
    if (aspectsHouse(pr, asc, h)) cands.push([(SPECIAL_ASPECTS[p] ?? []).some((d) => ((pr.house - 1 + d - 1) % 12) + 1 === h) ? 0.4 : 0.25, `aspects H${h}`]);
    if ((p === "Rahu" || p === "Ketu") && lp && SIGN_LORD[pr.sign] === lord) cands.push([0.6, `node disposed by H${h} lord ${lord}`]);
  }
  // Conjunction with / nakshatra of / dispositor of the primary lord (KP-style star linkage and Parashari sambandha)
  for (const h of sig.primary) {
    const lord = lordOf(asc, h), lp = by(ing, lord);
    if (!lp || p === lord) continue;
    if (pr.sign === lp.sign) cands.push([0.8, `conjunct H${h} lord ${lord}`]);
    if (pr.starLord === lord) cands.push([0.6, `in the star of H${h} lord ${lord}`]);
    const occupants = ing.planets.filter((x) => x.house === h);
    if (occupants.some((o) => SIGN_LORD[o.sign] === p) && isGraha(p)) cands.push([0.5, `dispositor of H${h} occupants`]);
    if (aspectsHouse(lp, asc, pr.house)) cands.push([0.4, `aspected by H${h} lord ${lord}`]);
  }
  if (sig.karakas.includes(p)) cands.push([0.8, "karaka"]);
  if (sig.charakaraka && ck[sig.charakaraka] === p) cands.push([0.6, sig.charakaraka]);
  if (sig.arudhaOf) { const a = arudha(ing, sig.arudhaOf); if (lordOf(asc, a) === p) cands.push([0.5, `lord of A${sig.arudhaOf} (H${a})`]); if (pr.house === a) cands.push([0.4, `in A${sig.arudhaOf}`]); }
  for (const h of sig.secondary) {
    if (lordOf(asc, h) === p) cands.push([0.5, `lord of H${h}`]);
    if (pr.house === h) cands.push([0.4, `occupies H${h}`]);
  }
  if (!cands.length) return { c: 0, via: "no link" };
  const [c, via] = cands.reduce((a, b) => (b[0] > a[0] ? b : a));
  return { c, via };
}

/** Parashari: nodes act through their dispositor and conjunct planets; KP: every planet also signifies through its star lord. */
function inherit(ing: Ingested, p: Planet, base: (q: Planet) => { c: number; via: string }): { c: number; via: string } {
  const pr = by(ing, p);
  let best = base(p);
  if (!pr) return best;
  const consider = (q: Planet, f: number, how: string) => { if (q === p) return; const r = base(q); const c = Math.round(r.c * f * 100) / 100; if (c > best.c) best = { c, via: `${how} ${q}: ${r.via}` }; };
  if (p === "Rahu" || p === "Ketu") {
    consider(SIGN_LORD[pr.sign], 0.8, "via dispositor");
    for (const o of ing.planets) if (o.sign === pr.sign && o.planet !== p) consider(o.planet, 0.8, "via conjunct");
  }
  consider(pr.starLord, 0.7, "via star lord");
  return best;
}

/** Loss/affliction link of a dasha planet to the topic (BPHS: 8th/12th from the bhava, marakas from the bhava, malefics on it). */
export function lossConnection(ing: Ingested, p: Planet, sig: Signification): { c: number; via: string } {
  return inherit(ing, p, (q) => lossConnectionBase(ing, q, sig));
}
function lossConnectionBase(ing: Ingested, p: Planet, sig: Signification): { c: number; via: string } {
  const asc = ing.ascendant.sign, pr = by(ing, p);
  if (!pr) return { c: 0, via: "absent" };
  const cands: [number, string][] = [];
  const rel = (h: number, n: number) => ((h - 1 + n - 1) % 12) + 1; // n-th house from house h
  // Marakas (2nd/7th from the bhava) apply only where the bhava signifies a person (BPHS); for wealth/career/etc. only 8th/12th/6th.
  const person = ["siblings", "mother", "father", "children", "marriage", "health", "general"].includes(sig.topic);
  const rules: [number, number, string][] = person
    ? [[8, 1.0, "8th"], [12, 1.0, "12th"], [2, 0.8, "2nd (maraka)"], [7, 0.8, "7th (maraka)"], [6, 0.6, "6th"]]
    : [[8, 1.0, "8th"], [12, 1.0, "12th"], [6, 0.6, "6th"]];
  for (const h of sig.primary.slice(0, 1)) {
    for (const [n, w, label] of rules) {
      const hh = rel(h, n);
      if (isGraha(p) && lordOf(asc, hh) === p) cands.push([w, `lord of ${label} from H${h} (H${hh})`]);
      if (pr.house === hh && (n === 8 || n === 12)) cands.push([0.7, `in ${label} from H${h}`]);
    }
    if (pr.house === h && NATURAL_MALEFICS.includes(p)) cands.push([0.6, `malefic in H${h}`]);
    if ((p === "Rahu" || p === "Ketu") && (pr.house === h || pr.house === rel(h, 8))) cands.push([0.7, `node on H${h}/8th`]);
    if (NATURAL_MALEFICS.includes(p) && pr.house !== h && aspectsHouse(pr, asc, h)) cands.push([0.4, `malefic aspect on H${h}`]);
    const lord = lordOf(asc, h), lp = by(ing, lord);
    if (lp && p !== lord && pr.sign === lp.sign && NATURAL_MALEFICS.includes(p)) cands.push([0.5, `malefic conjunct H${h} lord`]);
  }
  if (isGraha(p) && [6, 8, 12].some((h) => lordOf(asc, h) === p)) cands.push([0.5, "dusthana lord from lagna"]);
  for (const k of sig.karakas) { const kp = by(ing, k); if (kp && p !== k && NATURAL_MALEFICS.includes(p) && (pr.sign === kp.sign || aspectsHouse(pr, asc, kp.house))) cands.push([0.4, `malefic on karaka ${k}`]); }
  if (!cands.length) return { c: 0, via: "no link" };
  const [c, via] = cands.reduce((a, b) => (b[0] > a[0] ? b : a));
  return { c, via };
}

export type ActiveDasha = { MD?: Planet; AD?: Planet; PD?: Planet };
export function trigger(ing: Ingested, sig: Signification, active: ActiveDasha, transits: TransitInput[]): TriggerResult {
  const asc = ing.ascendant.sign;
  const dasha: TriggerResult["dasha"] = [];
  const W = { MD: 20, AD: 25, PD: 10 } as const;
  let dashaPoints = 0;
  for (const lvl of ["MD", "AD", "PD"] as const) {
    const p = active[lvl]; if (!p) continue;
    const { c, via } = connection(ing, p, sig);
    const pts = Math.round(W[lvl] * c * 10) / 10;
    dasha.push({ planet: p, level: lvl, c, via, points: pts }); dashaPoints += pts;
  }
  const loss: TriggerResult["loss"] = [];
  let lossDashaPoints = 0;
  for (const lvl of ["MD", "AD", "PD"] as const) {
    const p = active[lvl]; if (!p) continue;
    const { c, via } = lossConnection(ing, p, sig);
    const pts = Math.round(W[lvl] * c * 10) / 10;
    loss.push({ planet: p, level: lvl, c, via, points: pts }); lossDashaPoints += pts;
  }
  // Transits: mean over samples.
  const tags = new Set<string>();
  const lossSamples: Term[][] = [];
  const moon = by(ing, "Moon");
  const perSample = transits.map((t) => {
    const terms: Term[] = [];
    const primarySigns = sig.primary.map((h) => houseSign(asc, h));
    const lordSigns = sig.primary.map((h) => by(ing, lordOf(asc, h))?.sign).filter(Boolean) as Sign[];
    const moonSigns = moon ? sig.primary.map((h) => signAt(signIndex(moon.sign) + h - 1)) : [];
    const targets = [...new Set([...primarySigns, ...lordSigns, ...moonSigns])];
    const row = (p: Planet, sign: Sign, deg: number): PlanetRow => ({ ...(by(ing, p) as PlanetRow), sign, degree: deg, house: houseFrom(asc, sign) });
    const hits = (p: "Saturn" | "Jupiter") => {
      const tp = t[p]; const r = row(p, tp.sign, parseDegree(tp.degree));
      const occ = targets.includes(tp.sign);
      const asp = targets.some((s) => aspectsHouse(r, asc, houseFrom(asc, s)));
      const bav = ing.bav?.[p]?.[tp.sign]; const weak = bav ? bav.length < 3 : false;
      return { occ, asp, weak, sign: tp.sign, retro: tp.retrograde };
    };
    const j = hits("Jupiter"), s = hits("Saturn");
    if (j.occ) terms.push({ factor: `Jupiter transit ${j.sign} occupies a target sign`, points: j.weak ? 6 : 12, source: "transit" });
    else if (j.asp) terms.push({ factor: `Jupiter transit ${j.sign} aspects a target sign`, points: j.weak ? 4 : 8, source: "transit" });
    if (s.occ) { terms.push({ factor: `Saturn transit ${s.sign} occupies a target sign`, points: s.weak ? 3 : 6, source: "transit" }); tags.add("delay: Saturn on target"); }
    else if (s.asp) { terms.push({ factor: `Saturn transit ${s.sign} aspects a target sign`, points: s.weak ? 2 : 4, source: "transit" }); tags.add("delay: Saturn aspect on target"); }
    if (s.retro) tags.add("Saturn retrograde in window");
    if (t.Rahu && targets.includes(t.Rahu.sign)) terms.push({ factor: `Rahu transit ${t.Rahu.sign} on a target sign`, points: 4, source: "transit" });
    else if (t.Ketu && targets.includes(t.Ketu.sign)) terms.push({ factor: `Ketu transit ${t.Ketu.sign} on a target sign`, points: 4, source: "transit" });
    // Loss transits: Saturn / nodes over the house, its lord, the karaka; Sade Sati.
    const lt: Term[] = [];
    const personTopic = ["siblings", "mother", "father", "children", "marriage", "health", "general"].includes(sig.topic);
    const karakaSigns = personTopic ? (sig.karakas.map((k) => by(ing, k)?.sign).filter(Boolean) as Sign[]) : [];
    const afflictTargets = [...new Set([...primarySigns.slice(0, 1), ...lordSigns.slice(0, 1), ...karakaSigns])];
    if (afflictTargets.includes(t.Saturn.sign)) lt.push({ factor: `Saturn transit ${t.Saturn.sign} on house/lord/karaka`, points: 12, source: "loss-transit" });
    else if (afflictTargets.some((sg) => aspectsHouse(row("Saturn", t.Saturn.sign, parseDegree(t.Saturn.degree)), asc, houseFrom(asc, sg)))) lt.push({ factor: `Saturn transit ${t.Saturn.sign} aspects house/lord/karaka`, points: 8, source: "loss-transit" });
    if (t.Rahu && afflictTargets.includes(t.Rahu.sign)) lt.push({ factor: `Rahu transit ${t.Rahu.sign} on house/lord/karaka`, points: 8, source: "loss-transit" });
    if (t.Ketu && afflictTargets.includes(t.Ketu.sign)) lt.push({ factor: `Ketu transit ${t.Ketu.sign} on house/lord/karaka`, points: 8, source: "loss-transit" });
    if (moon && [12, 1, 2].includes(houseFrom(moon.sign, t.Saturn.sign))) lt.push({ factor: "Sade Sati", points: 4, source: "loss-transit" });
    lossSamples.push(lt);
    if (moon) {
      const fromMoon = houseFrom(moon.sign, t.Saturn.sign);
      if ([12, 1, 2].includes(fromMoon)) tags.add("obstruction: Sade Sati");
      else if ([4, 8].includes(fromMoon)) tags.add("obstruction: Saturn in 4th/8th from Moon");
      if (lordSigns.includes(t.Saturn.sign)) tags.add("obstruction: Saturn over the house lord");
    }
    return terms;
  });
  // Average identical factors across samples.
  const agg = new Map<string, { sum: number; n: number; source: string }>();
  for (const terms of perSample) for (const tm of terms) { const a = agg.get(tm.factor) ?? { sum: 0, n: 0, source: tm.source }; a.sum += tm.points; a.n++; agg.set(tm.factor, a); }
  const transit: Term[] = [...agg.entries()].map(([factor, a]) => ({ factor: `${factor}${a.n < perSample.length ? ` (${a.n}/${perSample.length} samples)` : ""}`, points: Math.round((a.sum / perSample.length) * 10) / 10, source: a.source }));
  const transitPoints = Math.min(35, transit.reduce((x, tm) => x + tm.points, 0));
  const lagg = new Map<string, { sum: number; n: number; source: string }>();
  for (const terms of lossSamples) for (const tm of terms) { const a = lagg.get(tm.factor) ?? { sum: 0, n: 0, source: tm.source }; a.sum += tm.points; a.n++; lagg.set(tm.factor, a); }
  const lossTransit: Term[] = [...lagg.entries()].map(([factor, a]) => ({ factor: `${factor}${a.n < lossSamples.length ? ` (${a.n}/${lossSamples.length} samples)` : ""}`, points: Math.round((a.sum / lossSamples.length) * 10) / 10, source: a.source }));
  const lossTransitPoints = Math.min(35, lossTransit.reduce((x, tm) => x + tm.points, 0));
  const Tgain = Math.round(clamp(((dashaPoints + transitPoints) / 90) * 100, 0, 100));
  const Tloss = Math.round(clamp(((lossDashaPoints + lossTransitPoints) / 90) * 100, 0, 100));
  const T = Tgain; // ranking axis; Tloss informs direction only
  // Direction sign — functional nature of the connected dasha lords (BPHS: trikona lords benefic, 3/6/11 lords malefic,
  // natural malefics in dusthana adverse) plus the obstruction/delay tags and the Jupiter-vs-Saturn transit balance.
  const toneWhy: string[] = [];
  let toneScore = 0;
  for (const d of dasha) {
    if (d.c === 0) continue;
    const p = by(ing, d.planet); if (!p) continue;
    let s = 0;
    if (isGraha(d.planet)) {
      const ruled = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOf(asc, h) === d.planet);
      if (ruled.some((h) => [1, 5, 9].includes(h))) s += 1;
      if (ruled.some((h) => [3, 6, 11].includes(h))) s -= 1;
      if (ruled.some((h) => [8].includes(h))) s -= 0.5;
    } else s -= 0.5;
    if (p.dignity === "Exalted" || p.dignity === "Own" || p.dignity === "Moolatrikona") s += 0.5;
    if (p.dignity === "Debilitated") s -= 0.5;
    if (DUSTHANA.includes(p.house) && NATURAL_MALEFICS.includes(d.planet)) s -= 0.5;
    if (p.combust) s -= 0.5;
    const w = d.level === "AD" ? 1.2 : d.level === "MD" ? 1 : 0.6;
    toneScore += s * w;
    if (s !== 0) toneWhy.push(`${d.level} ${d.planet} ${s > 0 ? "+" : ""}${s}`);
  }
  const tagList = [...tags];
  const obst = tagList.filter((t) => t.startsWith("obstruction")).length, dly = tagList.filter((t) => t.startsWith("delay")).length;
  toneScore -= obst * 0.7 + dly * 0.3;
  if (obst || dly) toneWhy.push(`tags −${(obst * 0.7 + dly * 0.3).toFixed(1)}`);
  const jup = transit.filter((t) => t.factor.startsWith("Jupiter")).reduce((a, t) => a + t.points, 0);
  const sat = transit.filter((t) => t.factor.startsWith("Saturn")).reduce((a, t) => a + t.points, 0);
  if (jup > sat) { toneScore += 0.5; toneWhy.push("Jupiter-led transit +0.5"); } else if (sat > jup) { toneScore -= 0.5; toneWhy.push("Saturn-led transit −0.5"); }
  // Direction: gain vs loss axis first, functional tone as tie-breaker.
  const diff = Tgain - Tloss;
  const tone: Tone = diff >= 12 ? "favourable" : diff <= -12 ? "adverse" : toneScore >= 0.75 ? "favourable" : toneScore <= -0.75 ? "adverse" : "mixed";
  toneWhy.unshift(`gain ${Tgain} vs loss ${Tloss}`);
  return { T, Tgain, Tloss, tone, toneScore: Math.round(toneScore * 100) / 100, toneWhy, loss, lossTransit, dasha, transit, tags: tagList, dashaPoints: Math.round(dashaPoints * 10) / 10, transitPoints: Math.round(transitPoints * 10) / 10 };
}

// ---- GRID ----
export function cell(P: number, T: number): Cell {
  const pi = P >= 60 ? 0 : P >= 35 ? 1 : 2, ti = T >= 60 ? 0 : T >= 35 ? 1 : 2;
  const grid: Cell[][] = [
    [{ name: "Event window", level: 5, note: "promise and trigger both strong; specific timing allowed" }, { name: "Building", level: 3, note: "promised; trigger partial — broad season" }, { name: "Promised, dormant", level: 2, note: "chart allows it; nothing activates it in this window" }],
    [{ name: "Event with friction / delay", level: 3, note: "trigger strong on a middling promise — expect effort, delay or compromise" }, { name: "Possible, weak", level: 2, note: "neither axis decisive" }, { name: "Dormant", level: 1, note: "themes only" }],
    [{ name: "Forced / atypical outcome", level: 2, note: "strong trigger on a weak promise — flag obstruction; outcome may not look like the ideal" }, { name: "Unlikely", level: 1, note: "" }, { name: "Denied in this window", level: 1, note: "" }],
  ];
  return grid[pi][ti];
}
