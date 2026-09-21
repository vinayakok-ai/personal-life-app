// OPERATIONAL MODE 2 — PREDICTIVE ENGINE + MODULE 3 (Convergence Matrix).
// Operates only on Mode 1 tables. Every step records what it confirmed or why it was excluded.

import type { DashaInput, Graha, Ingested, Planet, PlanetRow, QueryInput, Sign } from "./types.ts";
import { SEVEN } from "./types.ts";
import { EXALTATION, KAKSHYA_ORDER, MRITYU_BHAGA, NATURAL, NATURAL_BENEFICS, NATURAL_MALEFICS, SIGN_LORD, SPECIAL_ASPECTS, houseFrom, isGraha, signAt, signIndex } from "./tables.ts";
import { parseDegree, dignityOf } from "./ingest.ts";
import { auditGate, type Target } from "./gate.ts";

export type StepRecord = { step: number; title: string; done: boolean; note: string; source: string };
export type Contradiction = { factor: string; effect: "Supports" | "Opposes" | "Delays"; weight: "Strong" | "Moderate" | "Weak" };
export type Matrix = {
  dasha: { points: number; note: string };
  transit: { points: number; note: string };
  sav: { points: number; note: string };
  varga: { points: number; note: string };
  total: number;
  timingGate: string | null;
  specificity: { level: string; unlocked: string };
  confidence: "High" | "Moderate" | "Low" | "Indeterminate";
};
export type EngineResult = {
  halted: boolean;
  halts: string[];
  target: Target;
  steps: StepRecord[];
  integrity: string[];
  contradictions: Contradiction[];
  matrix: Matrix | null;
  facts: { natal: string[]; timing: string[] };
  nonConclusions: string[];
};

const STEP_TITLES = [
  "Query Isolation", "Ayanamsa & Panchang", "Rasi vs. Chalit Tie-Breaker", "Mandatory Varga Mapping", "Degrees & Star Lord Trajectory",
  "Sensitivity Check", "Planetary Dignity", "Planetary Avasthas", "Shadbala & Dig Bala", "Ashtakavarga Thresholds", "Structural Anomalies",
  "Relationships (Sambandha)", "Aspects & Conjunctions", "Parashari Yogas", "Jaimini Karakas", "Arudha Padas",
  "Micro-Timing Dasha Drill-Down", "Kakshya Transit Analysis", "Final Timing Convergence",
];

// ---- helpers ----
export function aspectsHouse(p: PlanetRow, asc: Sign, house: number): boolean {
  const from = p.house;
  const drishti = [7, ...(SPECIAL_ASPECTS[p.planet] ?? [])];
  return drishti.some((d) => ((from - 1 + d - 1) % 12) + 1 === house);
}
const houseSign = (asc: Sign, house: number) => signAt(signIndex(asc) + house - 1);
const lordOfHouse = (asc: Sign, house: number): Graha => SIGN_LORD[houseSign(asc, house)];
const byName = (ing: Ingested, p: Planet) => ing.planets.find((x) => x.planet === p);

function avastha(p: PlanetRow): string {
  const odd = signIndex(p.sign) % 2 === 0;
  const bands = ["Bala", "Kumara", "Yuva", "Vriddha", "Mrita"];
  const i = Math.min(4, Math.floor(p.degree / 6));
  return odd ? bands[i] : bands[4 - i];
}

function temporalFriend(a: PlanetRow, b: PlanetRow) {
  const h = houseFrom(a.sign, b.sign);
  return [2, 3, 4, 10, 11, 12].includes(h);
}
export function compoundRelation(ing: Ingested, a: Graha, b: Graha): string {
  const pa = byName(ing, a), pb = byName(ing, b);
  if (!pa || !pb) return "unknown";
  const nat = NATURAL[a].friends.includes(b) ? 1 : NATURAL[a].enemies.includes(b) ? -1 : 0;
  const tmp = temporalFriend(pa, pb) ? 1 : -1;
  const s = nat + tmp;
  return s >= 2 ? "Great friend" : s === 1 ? "Friend" : s === 0 ? "Neutral" : s === -1 ? "Enemy" : "Bitter enemy";
}

function arudha(ing: Ingested, house: number): number {
  const lord = lordOfHouse(ing.ascendant.sign, house);
  const lp = byName(ing, lord);
  if (!lp) return 0;
  const dist = ((lp.house - house + 12) % 12); // houses moved from house to lord
  let pada = ((house - 1 + 2 * dist) % 12) + 1;
  const rel = ((pada - house + 12) % 12) + 1;
  if (rel === 1 || rel === 7) pada = ((pada - 1 + 9) % 12) + 1;
  return pada;
}

function yogas(ing: Ingested): string[] {
  const out: string[] = [];
  const asc = ing.ascendant.sign;
  const moon = byName(ing, "Moon"), jup = byName(ing, "Jupiter"), sun = byName(ing, "Sun"), mer = byName(ing, "Mercury"), mars = byName(ing, "Mars");
  if (moon && jup && [1, 4, 7, 10].includes(houseFrom(moon.sign, jup.sign))) out.push("Gajakesari (Jupiter in kendra from Moon)");
  if (sun && mer && sun.sign === mer.sign) out.push("Budhaditya (Sun–Mercury conjunction)");
  if (moon && mars && moon.sign === mars.sign) out.push("Chandra-Mangala (Moon–Mars conjunction)");
  const mp: Record<string, Graha> = { Ruchaka: "Mars", Bhadra: "Mercury", Hamsa: "Jupiter", Malavya: "Venus", Sasa: "Saturn" };
  for (const [name, g] of Object.entries(mp)) {
    const p = byName(ing, g);
    if (p && [1, 4, 7, 10].includes(p.house) && ["Exalted", "Own", "Moolatrikona"].includes(p.dignity)) out.push(`${name} Mahapurusha (${g} in kendra, dignified)`);
  }
  for (const p of ing.planets) {
    if (p.dignity !== "Debilitated" || !isGraha(p.planet)) continue;
    const disp = byName(ing, SIGN_LORD[p.sign]);
    const exLord = byName(ing, SIGN_LORD[EXALTATION[p.planet].sign]);
    if ((disp && [1, 4, 7, 10].includes(disp.house)) || (exLord && [1, 4, 7, 10].includes(exLord.house)) || (disp && disp.dignity === "Exalted")) out.push(`Neecha Bhanga for ${p.planet} (dispositor/exaltation lord in kendra from Lagna)`);
  }
  if (moon) {
    const nb = ing.planets.filter((p) => p.planet !== "Moon" && p.planet !== "Sun" && !["Rahu", "Ketu"].includes(p.planet) && [2, 12].includes(houseFrom(moon.sign, p.sign)));
    if (!nb.length) out.push("Kemadruma (no planets in 2nd/12th from Moon, Sun/nodes excluded)");
  }
  if (asc) {
    const l9 = byName(ing, lordOfHouse(asc, 9)), l10 = byName(ing, lordOfHouse(asc, 10));
    if (l9 && l10 && (l9.sign === l10.sign || houseFrom(l9.sign, l10.sign) === 7)) out.push("Dharma-Karmadhipati (9L–10L conjunction/opposition)");
  }
  return out;
}

function charakarakas(ing: Ingested): Record<string, Planet> {
  const names = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
  const sorted = ing.planets.filter((p) => isGraha(p.planet)).sort((a, b) => b.degree - a.degree);
  return Object.fromEntries(sorted.map((p, i) => [names[i], p.planet]));
}

function activeDashas(dashas: DashaInput[], date: string) {
  const active = dashas.filter((d) => d.start <= date && date <= d.end);
  const pick = (lvl: DashaInput["level"]) => active.filter((d) => d.level === lvl).sort((a, b) => b.start.localeCompare(a.start))[0];
  return { MD: pick("MD"), AD: pick("AD"), PD: pick("PD"), SD: pick("SD"), PrD: pick("PrD") };
}

/** "Connect": planet is lord of, occupies (Rasi), or aspects the target house. */
export function connects(ing: Ingested, planet: Planet, houses: number[]): string | null {
  const p = byName(ing, planet);
  if (!p) return null;
  for (const h of houses) {
    if (isGraha(planet) && lordOfHouse(ing.ascendant.sign, h) === planet) return `lord of H${h}`;
    if (p.house === h) return `occupies H${h}`;
    if (aspectsHouse(p, ing.ascendant.sign, h)) return `aspects H${h}`;
  }
  return null;
}

// ---- main ----
export function execute(ing: Ingested, q: QueryInput): EngineResult {
  const gate = auditGate(ing, q);
  const target = gate.target;
  const steps: StepRecord[] = STEP_TITLES.map((title, i) => ({ step: i + 1, title, done: false, note: "", source: "" }));
  const set = (n: number, note: string, source = "Classical BPHS", done = true) => { steps[n - 1] = { ...steps[n - 1], done, note, source }; };
  const integrity: string[] = [];
  const contradictions: Contradiction[] = [];
  const natal: string[] = [];
  const timing: string[] = [];
  const nonConclusions: string[] = [];

  if (gate.halts.length) {
    return { halted: true, halts: gate.halts, target, steps, integrity, contradictions, matrix: null, facts: { natal, timing }, nonConclusions: ["Execution halted at Mode 1.5; no inference made."] };
  }

  const asc = ing.ascendant.sign;
  const H = target.houses;
  const tag = (n: number, src = "Classical BPHS") => `[Step ${n} - ${src}]`;

  // PHASE 1
  set(1, `Topic "${target.topic}" → houses ${H.map((h) => "H" + h).join(", ")}${target.varga ? `, varga ${target.varga}` : ""}; timing ${target.timing ? "required" : "not required"}${target.inferred ? " (keyword-inferred)" : " (user-specified)"}`, "Engine Inference");
  const pc = ing.panchang;
  set(2, `Ayanamsa ${ing.ayanamsa}${pc ? `; Tithi ${pc.tithi ?? "?"}, Vara ${pc.vara ?? "?"}, Nakshatra ${pc.nakshatra ?? "?"}, Yoga ${pc.yoga ?? "?"}, Karana ${pc.karana ?? "?"}` : "; Panchang not in tables"}`, "Classical BPHS", true);
  const shifts = ing.planets.filter((p) => p.chalitHouse && p.chalitHouse !== p.house);
  set(3, ing.chalit ? `Rasi governs lordship/scoring; Chalit governs manifestation. Shifted: ${shifts.length ? shifts.map((p) => `${p.planet} Rasi H${p.house}→Chalit H${p.chalitHouse}`).join(", ") : "none"}` : "No Chalit table — Rasi used for both", "Classical BPHS", !!ing.chalit);
  const targetLords = H.map((h) => lordOfHouse(asc, h));
  const varga = target.varga ? ing.vargas[target.varga] : undefined;
  let vargaNote = "";
  let vargaState: "dignified" | "afflicted" | "neutral" | "bypassed" | "none" = "none";
  if (target.varga && varga) {
    const lord = targetLords[0];
    const vp = varga.planets.find((p) => p.planet === lord);
    if (!vp) { vargaNote = `${target.varga} present but ${lord} (H${H[0]} lord) not listed`; vargaState = "neutral"; integrity.push(`${target.varga}: H${H[0]} lord ${lord} missing from varga table`); }
    else {
      const d = dignityOf(lord, vp.sign, 15);
      const vh = houseFrom(varga.ascendant, vp.sign);
      vargaState = ["Exalted", "Own", "Moolatrikona"].includes(d) ? "dignified" : d === "Debilitated" || [6, 8, 12].includes(vh) ? "afflicted" : "neutral";
      vargaNote = `${target.varga}: H${H[0]} lord ${lord} in ${vp.sign} (${d}, ${target.varga} H${vh} from ${varga.ascendant}) → ${vargaState}`;
      natal.push(`${vargaNote} ${tag(4)}`);
    }
    set(4, vargaNote);
  } else if (gate.vargaBypassed) { vargaState = "bypassed"; set(4, `${target.varga} bypassed by user — 0 pts in matrix`, "Classical BPHS", false); }
  else set(4, "No varga required by query", "Classical BPHS", false);

  set(5, ing.planets.map((p) => `${p.planet} ${p.degree.toFixed(2)}° ${p.sign} (${p.nakshatra}/${p.starLord})`).join("; "));
  for (const h of H) for (const lord of [lordOfHouse(asc, h)]) {
    const lp = byName(ing, lord);
    if (lp) natal.push(`H${h} lord ${lord} sits in H${lp.house} (${lp.sign}), star lord ${lp.starLord} ${tag(5)}`);
  }

  const sens: string[] = [];
  for (const p of ing.planets) {
    const si = signIndex(p.sign);
    if ([3, 7, 11].includes(si) && p.degree > 26.6667) sens.push(`${p.planet} Gandanta (end of ${p.sign})`);
    if ([0, 4, 8].includes(si) && p.degree < 3.3333) sens.push(`${p.planet} Gandanta (start of ${p.sign})`);
    if (p.degree < 1 || p.degree > 29) sens.push(`${p.planet} Rasi Sandhi (${p.degree.toFixed(2)}°)`);
    const mb = MRITYU_BHAGA[p.planet][si];
    if (Math.floor(p.degree) + 1 === mb) sens.push(`${p.planet} Mrityu Bhaga (${mb}° ${p.sign})`);
  }
  set(6, sens.length ? sens.join("; ") : "No Gandanta / Mrityu Bhaga / Rasi Sandhi hits", "Engine Inference");
  for (const s of sens) if (targetLords.some((l) => s.startsWith(l))) contradictions.push({ factor: s, effect: "Opposes", weight: "Moderate" });

  // PHASE 2
  set(7, ing.planets.map((p) => `${p.planet}:${p.dignity}`).join(", "));
  for (const h of H) {
    const lord = lordOfHouse(asc, h), lp = byName(ing, lord);
    if (!lp) continue;
    natal.push(`H${h} lord ${lord} is ${lp.dignity} ${tag(7)}`);
    if (["Exalted", "Own", "Moolatrikona"].includes(lp.dignity)) contradictions.push({ factor: `H${h} lord ${lord} ${lp.dignity}`, effect: "Supports", weight: "Strong" });
    else if (lp.dignity === "Debilitated") contradictions.push({ factor: `H${h} lord ${lord} debilitated`, effect: "Opposes", weight: "Strong" });
    else if (lp.dignity === "Enemy") contradictions.push({ factor: `H${h} lord ${lord} in enemy sign`, effect: "Opposes", weight: "Weak" });
    if ([6, 8, 12].includes(lp.house)) contradictions.push({ factor: `H${h} lord ${lord} in dusthana H${lp.house}`, effect: "Opposes", weight: "Moderate" });
    if ([1, 4, 7, 10, 5, 9].includes(lp.house) && lp.house !== h) contradictions.push({ factor: `H${h} lord ${lord} in kendra/trikona H${lp.house}`, effect: "Supports", weight: "Moderate" });
    const disp = byName(ing, SIGN_LORD[lp.sign]);
    if (disp && disp.planet !== lord) natal.push(`Dispositor chain: ${lord} → ${disp.planet} (${disp.dignity}, H${disp.house}) ${tag(7)}`);
  }
  set(8, ing.planets.map((p) => `${p.planet}:${avastha(p)}`).join(", "));
  for (const l of targetLords) { const lp = byName(ing, l); if (lp && avastha(lp) === "Mrita") contradictions.push({ factor: `${l} in Mrita avastha`, effect: "Opposes", weight: "Weak" }); }

  if (ing.shadbala) {
    set(9, ing.shadbala.map((s) => `${s.planet} #${s.rank} (${s.points}${s.digBala !== undefined ? `, dig ${s.digBala}` : ""})`).join(", "));
    for (const l of targetLords) {
      const s = ing.shadbala.find((x) => x.planet === l);
      if (!s) continue;
      natal.push(`H${H[targetLords.indexOf(l)]} lord ${l} Shadbala rank ${s.rank}/7 ${tag(9, "Shadbala")}`);
      if (s.rank <= 2) contradictions.push({ factor: `${l} Shadbala rank ${s.rank}`, effect: "Supports", weight: "Moderate" });
      if (s.rank >= 6) contradictions.push({ factor: `${l} Shadbala rank ${s.rank}`, effect: "Opposes", weight: "Moderate" });
      if (s.ratio !== undefined && s.ratio < 1) contradictions.push({ factor: `${l} Shadbala below minimum (ratio ${s.ratio})`, effect: "Opposes", weight: "Weak" });
    }
  } else set(9, "Shadbala table absent", "Shadbala", false);

  const savBand = (v: number) => (v > 28 ? "strong" : v >= 25 ? "moderate" : "fragile");
  if (ing.sav) {
    set(10, H.map((h) => `H${h} SAV ${ing.sav![h - 1]} (${savBand(ing.sav![h - 1])})`).join(", "), "Ashtakavarga");
    for (const h of H) {
      const v = ing.sav[h - 1];
      natal.push(`H${h} carries ${v} SAV bindus (${savBand(v)}) ${tag(10, "Ashtakavarga")}`);
      if (v === 28) integrity.push("SAV = 28 falls in neither spec band (>28 strong, 25–27 moderate); scored as moderate.");
      contradictions.push({ factor: `H${h} SAV ${v}`, effect: v > 28 ? "Supports" : v >= 25 ? "Supports" : "Opposes", weight: v > 28 ? "Strong" : v >= 25 ? "Weak" : "Moderate" });
    }
  } else set(10, "SAV table absent", "Ashtakavarga", false);

  const anomalies = ing.planets.filter((p) => p.retrograde || p.combust).map((p) => `${p.planet}${p.retrograde ? " R" : ""}${p.combust ? " C" : ""}`);
  set(11, anomalies.length ? anomalies.join(", ") : "No retrograde/combust planets");
  for (const l of targetLords) {
    const lp = byName(ing, l);
    if (lp?.retrograde) contradictions.push({ factor: `${l} retrograde`, effect: "Delays", weight: "Moderate" });
    if (lp?.combust) contradictions.push({ factor: `${l} combust`, effect: "Opposes", weight: "Moderate" });
  }

  // PHASE 3
  const rels = targetLords.filter(isGraha).flatMap((l) => SEVEN.filter((g) => g !== l).map((g) => `${l}–${g}: ${compoundRelation(ing, l, g)}`));
  set(12, rels.slice(0, 12).join("; "));
  for (const l of targetLords) {
    const lp = byName(ing, l);
    if (lp && isGraha(l)) {
      const disp = SIGN_LORD[lp.sign];
      if (disp !== l) { const r = compoundRelation(ing, l, disp); if (r.includes("enemy")) contradictions.push({ factor: `${l} disposed by ${r.toLowerCase()} ${disp}`, effect: "Opposes", weight: "Weak" }); }
    }
  }

  const aspectNotes: string[] = [];
  for (const h of H) {
    const occupants = ing.planets.filter((p) => p.house === h);
    const aspecting = ing.planets.filter((p) => p.house !== h && aspectsHouse(p, asc, h));
    aspectNotes.push(`H${h}: occupied by ${occupants.map((p) => p.planet).join(", ") || "none"}; aspected by ${aspecting.map((p) => p.planet).join(", ") || "none"}`);
    for (const p of occupants) {
      natal.push(`${p.planet} occupies H${h} (${p.dignity}${p.chalitHouse && p.chalitHouse !== h ? `; Chalit H${p.chalitHouse}` : ""}) ${tag(13)}`);
      if (NATURAL_MALEFICS.includes(p.planet)) contradictions.push({ factor: `${p.planet} in H${h}`, effect: p.planet === "Saturn" ? "Delays" : "Opposes", weight: "Moderate" });
      if (NATURAL_BENEFICS.includes(p.planet)) contradictions.push({ factor: `${p.planet} in H${h}`, effect: "Supports", weight: "Moderate" });
    }
    for (const p of aspecting) {
      if (p.planet === "Jupiter") contradictions.push({ factor: `Jupiter aspects H${h}`, effect: "Supports", weight: "Moderate" });
      if (p.planet === "Saturn") contradictions.push({ factor: `Saturn aspects H${h}`, effect: "Delays", weight: "Weak" });
      if (p.planet === "Mars") contradictions.push({ factor: `Mars aspects H${h}`, effect: "Opposes", weight: "Weak" });
    }
  }
  set(13, aspectNotes.join(" | "));

  const yg = yogas(ing);
  set(14, yg.length ? yg.join("; ") : "No listed classical yogas detected", "Engine Inference");
  for (const y of yg) natal.push(`${y} ${tag(14, "Engine Inference")}`);

  const ck = charakarakas(ing);
  set(15, Object.entries(ck).map(([k, v]) => `${k}=${v}`).join(", ") + " (7-karaka scheme)", "Jaimini");
  if (target.topic === "career" && ck.AmK) natal.push(`Amatyakaraka is ${ck.AmK} ${tag(15, "Jaimini")}`);
  if (target.topic === "marriage" && ck.DK) natal.push(`Darakaraka is ${ck.DK} ${tag(15, "Jaimini")}`);
  natal.push(`Atmakaraka is ${ck.AK} ${tag(15, "Jaimini")}`);

  const AL = arudha(ing, 1), UL = arudha(ing, 12), A8 = arudha(ing, 8), A10 = arudha(ing, 10);
  set(16, `AL=H${AL} (${houseSign(asc, AL)}), UL=H${UL} (${houseSign(asc, UL)}), A8=H${A8}, A10=H${A10}`, "Jaimini");

  // PHASE 4
  const date = q.targetDate ?? "";
  const act = target.timing ? activeDashas(ing.dashas, date) : null;
  let dashaPts = 0, dashaNote = "not scored (non-timing query)";
  if (act) {
    const chain = (["MD", "AD", "PD", "SD", "PrD"] as const).filter((l) => act[l]).map((l) => `${l} ${act[l]!.planet} (${act[l]!.start}→${act[l]!.end})`);
    set(17, chain.length ? `${date}: ${chain.join(" / ")}${!act.SD ? " — Sookshma/Prana not in table" : ""}` : `No dasha row covers ${date}`, "Vimshottari", chain.length > 0);
    if (!chain.length) integrity.push(`Vimshottari table has no row covering target date ${date}.`);
    if (act.MD && act.AD && act.AD.parent && act.AD.parent[0] !== act.MD.planet) integrity.push(`AD ${act.AD.planet} parent (${act.AD.parent[0]}) ≠ active MD ${act.MD.planet}.`);
    const c = { MD: act.MD && connects(ing, act.MD.planet, H), AD: act.AD && connects(ing, act.AD.planet, H), PD: act.PD && connects(ing, act.PD.planet, H) };
    if (c.MD || c.AD) { dashaPts = 40; dashaNote = `+40: ${c.MD ? `MD ${act.MD!.planet} ${c.MD}` : ""}${c.MD && c.AD ? "; " : ""}${c.AD ? `AD ${act.AD!.planet} ${c.AD}` : ""}`; }
    else if (c.PD) { dashaPts = 20; dashaNote = `+20: only PD ${act.PD!.planet} ${c.PD}`; }
    else dashaNote = `0: MD/AD/PD (${[act.MD, act.AD, act.PD].filter(Boolean).map((d) => d!.planet).join("/")}) do not lord, occupy or aspect ${H.map((h) => "H" + h).join("/")}`;
    timing.push(`Dasha engine: ${dashaNote} ${tag(17, "Vimshottari")}`);
    for (const l of ["MD", "AD"] as const) {
      const d = act[l]; if (!d) continue;
      const p = byName(ing, d.planet);
      if (p && [6, 8, 12].includes(p.house)) contradictions.push({ factor: `${l} lord ${d.planet} in dusthana H${p.house}`, effect: "Opposes", weight: "Moderate" });
      if (p && p.dignity === "Debilitated") contradictions.push({ factor: `${l} lord ${d.planet} debilitated`, effect: "Opposes", weight: "Moderate" });
      if (p && ["Exalted", "Own", "Moolatrikona"].includes(p.dignity)) contradictions.push({ factor: `${l} lord ${d.planet} ${p.dignity}`, effect: "Supports", weight: "Moderate" });
    }
  } else set(17, "Non-timing query — dasha drill-down not required", "Vimshottari", false);

  let transitPts = 0, transitNote = "not scored (non-timing query)";
  if (target.timing && q.transits) {
    const t = q.transits;
    const hits: string[] = [];
    const kak: string[] = [];
    for (const name of ["Saturn", "Jupiter"] as const) {
      const tp = t[name];
      const row: PlanetRow = { ...(byName(ing, name) as PlanetRow), sign: tp.sign, degree: parseDegree(tp.degree), house: houseFrom(asc, tp.sign) };
      const hit = H.find((h) => row.house === h || aspectsHouse(row, asc, h));
      if (hit !== undefined) hits.push(`${name} (${tp.sign} ${parseDegree(tp.degree).toFixed(1)}°${tp.retrograde ? "R" : ""}, transit H${row.house}) ${row.house === hit ? "occupies" : "aspects"} H${hit}`);
      const kIdx = Math.min(7, Math.floor(parseDegree(tp.degree) / 3.75));
      const kLord = KAKSHYA_ORDER[kIdx];
      const contributors = ing.bav?.[name]?.[tp.sign];
      const bindu = contributors ? (contributors.includes(kLord) ? "bindu present" : "no bindu") : "bindu unverifiable (no BAV)";
      const savH = ing.sav ? `SAV ${ing.sav[row.house - 1]}` : "SAV n/a";
      kak.push(`${name} in ${tp.sign} kakshya ${kIdx + 1}/8 (${kLord}) — ${bindu}; transit H${row.house} ${savH}`);
      if (contributors && !contributors.includes(kLord)) contradictions.push({ factor: `${name} transiting bindu-less kakshya`, effect: "Delays", weight: "Weak" });
      if (ing.sav && ing.sav[row.house - 1] < 25) contradictions.push({ factor: `${name} transiting fragile SAV house H${row.house}`, effect: "Opposes", weight: "Weak" });
      if (name === "Saturn" && tp.retrograde) contradictions.push({ factor: "Transit Saturn retrograde", effect: "Delays", weight: "Weak" });
    }
    transitPts = hits.length === 2 ? 30 : hits.length === 1 ? 15 : 0;
    transitNote = hits.length ? `+${transitPts}: ${hits.join("; ")}` : `0: neither Saturn (${t.Saturn.sign}) nor Jupiter (${t.Jupiter.sign}) occupies/aspects ${H.map((h) => "H" + h).join("/")}`;
    if (t.Rahu) kak.push(`Rahu ${t.Rahu.sign} → transit H${houseFrom(asc, t.Rahu.sign)}; Ketu ${t.Ketu?.sign ?? "?"} (nodes noted, not scored by spec)`);
    set(18, kak.join(" | "), "Ashtakavarga", true);
    timing.push(`Double transit gate: ${transitNote} ${tag(18, "Ashtakavarga")}`);
    set(19, `Dasha ${dashaPts} + Transit ${transitPts} = ${dashaPts + transitPts} (${dashaPts + transitPts < 35 ? "below" : "meets"} 35 timing gate)`, "Engine Inference");
  } else { set(18, "Non-timing query — no transit data required", "Ashtakavarga", false); set(19, "Non-timing query — no convergence intersect", "Engine Inference", false); }

  // MODULE 3
  let savPts = 0, savNote = "0: SAV table absent";
  if (ing.sav) {
    const v = Math.max(...H.map((h) => ing.sav![h - 1]));
    savPts = v > 28 ? 15 : v >= 25 ? 7 : 0;
    const bestH = H.find((h) => ing.sav![h - 1] === v)!;
    savNote = `+${savPts}: H${bestH} SAV ${v} (${savBand(v)})`;
  }
  const vargaPts = vargaState === "dignified" ? 15 : 0;
  const vargaNoteM = vargaState === "none" ? "0: no varga required (spec awards points only for a confirmed relevant varga)" : vargaState === "bypassed" ? "0: bypassed" : vargaState === "neutral" ? "0: neutral placement — spec scores only dignified (+15) or afflicted (0); scored 0 conservatively" : `${vargaPts}: ${vargaNote}`;
  if (vargaState === "neutral") integrity.push("Varga lord placement is neither dignified nor afflicted — spec has no band for this; 0 awarded.");
  const total = dashaPts + transitPts + savPts + vargaPts;
  const timingGate = target.timing && dashaPts + transitPts < 35 ? "Background Potential Only — Insufficient Timing Convergence." : null;
  const specificity = total >= 85 ? { level: "High Convergence (85–100)", unlocked: "Levels 4 & 5: specific timing windows, concrete real-world manifestation" }
    : total >= 60 ? { level: "Moderate Convergence (60–84)", unlocked: "Levels 2 & 3: broad event activation, general quarter/season" }
    : { level: "Astrological Veto (<60)", unlocked: "Level 1 only: broad life themes; explicit refusal of specific event predictions" };
  const indeterminate = !ing.sav || (target.timing && (!act?.MD || !q.transits));
  const confidence: Matrix["confidence"] = indeterminate ? "Indeterminate" : total >= 85 ? "High" : total >= 60 ? "Moderate" : "Low";

  if (!target.timing) nonConclusions.push("No timing window is inferred: the query was classified as non-timing, so the Dasha and Transit engines (70 of 100 points) were not run.");
  if (timingGate) nonConclusions.push("No event date is inferred: Dasha + Transit convergence is below the 35-point gate.");
  if (total < 60) nonConclusions.push(`No specific event prediction: total convergence ${total} < 60 (Astrological Veto).`);
  if (!ing.sav) nonConclusions.push("House strength is not asserted: SAV table absent.");
  if (vargaState === "bypassed") nonConclusions.push(`${target.varga} confirmation withheld: varga bypassed.`);
  if (!ing.chalit) nonConclusions.push("Physical house of manifestation is not distinguished from Rasi house: Chalit table absent.");

  // integrity checks on lords
  for (const p of ing.planets) {
    if (p.chalitHouse && Math.abs(p.chalitHouse - p.house) > 1 && Math.abs(p.chalitHouse - p.house) !== 11) integrity.push(`${p.planet}: Chalit house H${p.chalitHouse} is more than one house from Rasi H${p.house} — verify.`);
  }
  const md0 = ing.dashas.filter((d) => d.level === "MD").sort((a, b) => a.start.localeCompare(b.start))[0];
  const moon = byName(ing, "Moon");
  if (md0 && moon) {
    if (md0.planet !== moon.starLord && !ing.dashas.some((d) => d.level === "MD" && d.planet === moon.starLord)) integrity.push(`First MD ${md0.planet} does not match Moon star lord ${moon.starLord} (Vimshottari starts from the Moon's nakshatra lord).`);
  }

  const uniq = <T,>(xs: T[]) => xs.filter((x, i) => xs.findIndex((y) => JSON.stringify(y) === JSON.stringify(x)) === i);
  return {
    halted: false, halts: [], target, steps, integrity: uniq(integrity), contradictions: uniq(contradictions),
    matrix: { dasha: { points: dashaPts, note: dashaNote }, transit: { points: transitPts, note: transitNote }, sav: { points: savPts, note: savNote }, varga: { points: vargaPts, note: vargaNoteM }, total, timingGate, specificity, confidence },
    facts: { natal: uniq(natal), timing }, nonConclusions,
  };
}
