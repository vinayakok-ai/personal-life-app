// OPERATIONAL MODE 1 — INGESTION & DATA AUDIT GATE ("INGEST DATA").
// No predictions here: validate the supplied tables, derive only table lookups
// (nakshatra, star lord, dignity, combustion from supplied degrees) and log
// everything derived or missing in the Uncertainty Ledger.

import { PLANETS, SIGNS, type ChartInput, type DegreeInput, type Dignity, type Ingested, type LedgerEntry, type Planet, type PlanetRow, type Sign } from "./types.ts";
import { COMBUST_ORB, EXALTATION, MOOLATRIKONA, NAKSHATRAS, NATURAL, SIGN_LORD, houseFrom, isGraha, isPlanet, signIndex } from "./tables.ts";

export function parseDegree(d: DegreeInput): number {
  if (typeof d === "number") return d;
  const m = d.trim().match(/^(\d+(?:\.\d+)?)\s*(?:[°:\-\s]\s*(\d+(?:\.\d+)?))?\s*(?:['′:\-\s]\s*(\d+(?:\.\d+)?))?\s*["″]?$/);
  if (!m) throw new Error(`Unparseable degree "${d}"`);
  return Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0) + (m[3] ? Number(m[3]) / 3600 : 0);
}

export function fmtDegree(deg: number): string {
  let total = Math.round(deg * 3600);
  const d = Math.floor(total / 3600);
  total -= d * 3600;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

export function nakshatraOf(longitude: number): { name: string; pada: number; lord: Planet } {
  const span = 360 / 27;
  const idx = Math.floor((((longitude % 360) + 360) % 360) / span);
  const within = longitude - idx * span;
  const n = NAKSHATRAS[idx];
  return { name: n.name, pada: Math.min(4, Math.floor(within / (span / 4)) + 1), lord: n.lord };
}

/** Dignity by sign (Rasi/whole-sign rule) — degree only matters for moolatrikona spans. */
export function dignityOf(planet: Planet, sign: Sign, degree: number): Dignity {
  const ex = EXALTATION[planet];
  if (ex.sign === sign) return "Exalted";
  if (signIndex(ex.sign) === (signIndex(sign) + 6) % 12) return "Debilitated";
  if (!isGraha(planet)) return "n/a";
  const mt = MOOLATRIKONA[planet];
  if (mt.sign === sign && degree >= mt.from && degree < mt.to) return "Moolatrikona";
  const lord = SIGN_LORD[sign];
  if (lord === planet) return "Own";
  if (NATURAL[planet].friends.includes(lord)) return "Friend";
  if (NATURAL[planet].enemies.includes(lord)) return "Enemy";
  return "Neutral";
}

export function ingest(input: ChartInput): Ingested {
  const ledger: LedgerEntry[] = [];
  const ay = (input.meta?.ayanamsa ?? "").toLowerCase();
  if (!/lahiri|chitra/.test(ay)) {
    ledger.push({ severity: "discarded", note: `Ayanamsa "${input.meta?.ayanamsa ?? "unspecified"}" is not Lahiri (Chitra Paksha); engine default is Lahiri — supply Lahiri tables.` });
  }
  if (!input.ascendant || !SIGNS.includes(input.ascendant.sign)) throw new Error("Ascendant sign missing/invalid");
  const asc = { sign: input.ascendant.sign, degree: parseDegree(input.ascendant.degree) };

  const seen = new Set<Planet>();
  const raw = input.planets.map((p) => {
    if (!isPlanet(p.planet)) throw new Error(`Unknown planet "${p.planet}"`);
    if (!SIGNS.includes(p.sign)) throw new Error(`Unknown sign "${p.sign}" for ${p.planet}`);
    if (seen.has(p.planet)) throw new Error(`Duplicate row for ${p.planet}`);
    seen.add(p.planet);
    const degree = parseDegree(p.degree);
    if (degree < 0 || degree >= 30) throw new Error(`${p.planet} degree ${degree} outside 0–30`);
    return { ...p, degree, longitude: signIndex(p.sign) * 30 + degree };
  });
  for (const p of PLANETS) if (!seen.has(p)) ledger.push({ severity: "missing", note: `${p} row absent from Planetary Positions table.` });

  const sun = raw.find((p) => p.planet === "Sun");
  const rahu = raw.find((p) => p.planet === "Rahu");
  const ketu = raw.find((p) => p.planet === "Ketu");
  if (rahu && ketu) {
    const sep = (((rahu.longitude - ketu.longitude) % 360) + 360) % 360;
    if (Math.abs(sep - 180) > 0.02) ledger.push({ severity: "ambiguous", note: `Rahu and Ketu are not 180° apart (${fmtDegree(Math.abs(sep - 180))} off) — check for a transcription error.` });
  }

  let chalit = input.bhavaChalit && input.bhavaChalit.length ? input.bhavaChalit : null;
  if (chalit && chalit.length === 12 && chalit.every((c) => !c.planets)) {
    // Derive occupancy from bhava-begin cusps: a planet belongs to the last house whose begin <= its longitude.
    const begins = chalit.map((c) => ({ house: c.house, lon: signIndex(c.cuspSign) * 30 + parseDegree(c.cuspDegree) }));
    const occ = new Map<number, Planet[]>();
    for (const p of raw) {
      let best = begins[0];
      for (const b of begins) if (b.lon <= p.longitude && (best.lon > p.longitude || b.lon >= best.lon)) best = b;
      if (!begins.some((b) => b.lon <= p.longitude)) best = begins.reduce((a, b) => (b.lon > a.lon ? b : a));
      occ.set(best.house, [...(occ.get(best.house) ?? []), p.planet]);
    }
    chalit = chalit.map((c) => ({ ...c, planets: occ.get(c.house) ?? [] }));
    ledger.push({ severity: "derived", note: "Chalit occupancy derived from the supplied bhava-begin cusp degrees (the chart gave cusps only)." });
  }
  if (!chalit) ledger.push({ severity: "missing", note: "Bhava Chalit & Cusps table absent — Step 3 will fall back to whole-sign houses for manifestation." });

  const planets: PlanetRow[] = raw.map((p) => {
    const nk = nakshatraOf(p.longitude);
    let combust = p.combust ?? false;
    let combustDerived = false;
    if (p.combust === undefined && sun && p.planet !== "Sun" && COMBUST_ORB[p.planet]) {
      const orb = COMBUST_ORB[p.planet]!;
      const dist = Math.abs(((p.longitude - sun.longitude + 540) % 360) - 180);
      combust = dist <= (p.retrograde ? orb.retro : orb.direct);
      combustDerived = true;
    }
    const chalitHouse = chalit ? chalit.find((c) => c.planets?.includes(p.planet))?.house ?? null : null;
    return {
      planet: p.planet, sign: p.sign, degree: p.degree, longitude: p.longitude,
      nakshatra: nk.name, pada: nk.pada, starLord: nk.lord,
      dignity: dignityOf(p.planet, p.sign, p.degree),
      retrograde: p.retrograde ?? false, combust, combustDerived,
      house: houseFrom(asc.sign, p.sign), chalitHouse,
    };
  });
  if (planets.some((p) => p.combustDerived)) ledger.push({ severity: "derived", note: "Combustion (C) not supplied — derived from supplied Sun distance with standard orbs (Moon 12°, Mars 17°, Mercury 14°/12°R, Jupiter 11°, Venus 10°/8°R, Saturn 15°)." });
  ledger.push({ severity: "derived", note: "Nakshatra, Pada, Star Lord and Dignity are table lookups on the supplied degrees, not computed positions." });
  if (chalit) {
    const placed = new Set(chalit.flatMap((c) => c.planets ?? []));
    const unplaced = planets.filter((p) => !placed.has(p.planet)).map((p) => p.planet);
    if (unplaced.length) ledger.push({ severity: "missing", note: `Chalit table does not place: ${unplaced.join(", ")} — Rasi house used for those.` });
  }

  let sav: number[] | null = null;
  if (!input.sav && input.savBySign?.length === 12) {
    const a = signIndex(asc.sign);
    input = { ...input, sav: Array.from({ length: 12 }, (_, h) => input.savBySign![(a + h) % 12]) };
    ledger.push({ severity: "derived", note: `SAV supplied per sign; re-keyed to houses from ${asc.sign} ascendant.` });
  }
  if (input.sav) {
    if (input.sav.length !== 12) ledger.push({ severity: "ambiguous", note: `SAV table has ${input.sav.length} entries, expected 12 — ignored.` });
    else {
      sav = input.sav;
      const total = sav.reduce((a, b) => a + b, 0);
      if (total !== 337) ledger.push({ severity: "ambiguous", note: `SAV totals ${total}, expected 337 — verify the table.` });
    }
  } else ledger.push({ severity: "missing", note: "Ashtakavarga (SAV) table absent — Step 10 and the 15-pt SAV floor cannot be scored." });

  let shadbala: Ingested["shadbala"] = null;
  if (input.shadbala?.length) {
    const sorted = [...input.shadbala].sort((a, b) => b.points - a.points);
    shadbala = sorted.map((s, i) => ({ ...s, rank: i + 1 }));
    if (shadbala.length !== 7) ledger.push({ severity: "ambiguous", note: `Shadbala table has ${shadbala.length} planets, expected 7.` });
  } else ledger.push({ severity: "missing", note: "Shadbala table absent — Step 9 excluded." });

  if (!input.dashas?.length) ledger.push({ severity: "missing", note: "Vimshottari timeline absent — Steps 17/19 and the 40-pt Dasha engine cannot run." });
  const dashas = [...(input.dashas ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  for (const d of dashas) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.start) || !/^\d{4}-\d{2}-\d{2}$/.test(d.end)) ledger.push({ severity: "ambiguous", note: `Dasha ${d.level} ${d.planet} has a non-ISO date (${d.start}–${d.end}).` });
    if (d.end < d.start) ledger.push({ severity: "ambiguous", note: `Dasha ${d.level} ${d.planet} ends before it starts.` });
  }
  if (!dashas.some((d) => d.level === "SD" || d.level === "PrD")) ledger.push({ severity: "missing", note: "No Sookshma/Prana rows — Step 17 drill-down stops at PD." });

  const vargas = input.vargas ?? {};
  for (const v of ["D9", "D10"] as const) if (!vargas[v]) ledger.push({ severity: "missing", note: `${v} table: Not Available in Text (Missing/Diagram Only).` });
  if (!input.bav) ledger.push({ severity: "missing", note: "Bhinnashtakavarga contributor table absent — Step 18 Kakshya can locate the kakshya lord but cannot verify the bindu." });
  if (!input.panchang) ledger.push({ severity: "missing", note: "Panchang (Tithi/Vara/Nakshatra/Yoga/Karana) absent — Step 2 limited to ayanamsa verification." });
  for (const n of input.ledgerNotes ?? []) ledger.push({ severity: "ambiguous", note: n });

  return {
    ayanamsa: input.meta?.ayanamsa ?? "unspecified", ascendant: asc, planets, chalit, sav, bav: input.bav ?? null,
    shadbala, bhavaBala: input.bhavaBala?.length === 12 ? input.bhavaBala : null, dashas, vargas, panchang: input.panchang ?? null, ledger,
  };
}

// ---- Mode 1 output tables ----

const md = (rows: string[][]) => {
  const [h, ...b] = rows;
  return [`| ${h.join(" | ")} |`, `|${h.map(() => "---").join("|")}|`, ...b.map((r) => `| ${r.join(" | ")} |`)].join("\n");
};

export function renderIngestion(ing: Ingested): string {
  const out: string[] = [];
  out.push("1. PLANETARY POSITIONS TABLE");
  out.push(md([
    ["Planet", "Rasi (D1)", "Degrees (D°M'S\")", "Nakshatra & Pada", "Star Lord", "Dignity", "Status (R/C)"],
    ["Ascendant", ing.ascendant.sign, fmtDegree(ing.ascendant.degree), `${nakshatraOf(signIndex(ing.ascendant.sign) * 30 + ing.ascendant.degree).name}-${nakshatraOf(signIndex(ing.ascendant.sign) * 30 + ing.ascendant.degree).pada}`, nakshatraOf(signIndex(ing.ascendant.sign) * 30 + ing.ascendant.degree).lord, "—", "—"],
    ...ing.planets.map((p) => [p.planet, p.sign, fmtDegree(p.degree), `${p.nakshatra}-${p.pada}`, p.starLord, p.dignity, [p.retrograde ? "R" : "", p.combust ? (p.combustDerived ? "C*" : "C") : ""].filter(Boolean).join("/") || "D"]),
  ]));
  out.push("\n2. BHAVA CHALIT & CUSPS TABLE");
  if (ing.chalit) {
    out.push(md([
      ["House", "Sign on Cusp", "Cusp Degree", "Occupying Planets", "Rasi vs Chalit Shift"],
      ...ing.chalit.map((c) => {
        const shifted = (c.planets ?? []).filter((pl) => ing.planets.find((p) => p.planet === pl)?.house !== c.house).map((pl) => `${pl} (Rasi H${ing.planets.find((p) => p.planet === pl)?.house})`);
        return [String(c.house), c.cuspSign, fmtDegree(parseDegree(c.cuspDegree)), (c.planets ?? []).join(", ") || "—", shifted.join(", ") || "none"];
      }),
    ]));
  } else out.push("Missing/Diagram Only.");
  out.push("\n3. ASHTAKAVARGA (SAV) TABLE");
  out.push(ing.sav ? md([["House", ...ing.sav.map((_, i) => String(i + 1))], ["SAV", ...ing.sav.map(String)]]) : "Not Available in Text.");
  out.push("\n4. SHADBALA RANKING TABLE");
  out.push(ing.shadbala ? md([["Planet", "Shadbala Points", "Ratio", "Rank (1 to 7)", "Dig Bala Score"], ...ing.shadbala.map((s) => [s.planet, String(s.points), s.ratio?.toString() ?? "—", String(s.rank), s.digBala?.toString() ?? "—"])]) : "Not Available in Text.");
  out.push("\n5. VIMSHOTTARI TIMELINE TABLE (Lahiri Only)");
  out.push(ing.dashas.length ? md([["Level (MD / AD / PD)", "Planet", "Start Date", "End Date"], ...ing.dashas.map((d) => [d.level + (d.parent?.length ? ` (${d.parent.join(" > ")})` : ""), d.planet, d.start, d.end])]) : "Not Available in Text.");
  out.push("\n6. AVAILABLE DIVISIONAL CHARTS");
  const vk = Object.keys(ing.vargas) as (keyof typeof ing.vargas)[];
  if (!vk.length) out.push("Not Available in Text.");
  for (const k of vk) {
    const v = ing.vargas[k]!;
    out.push(`${k}: Ascendant ${v.ascendant}; ${v.planets.map((p) => `${p.planet} in ${p.sign}`).join(", ")}`);
  }
  out.push("\n7. PARSER UNCERTAINTY & MISSING DATA LEDGER");
  out.push(ing.ledger.length ? ing.ledger.map((l) => `- [${l.severity}] ${l.note}`).join("\n") : "- none");
  out.push('\nData extraction complete. Verify values against your official document. If verified and ready, provide your query followed by: EXECUTE ENGINE. If transits or specific divisional charts are needed, you may provide them now or the engine will prompt you.');
  return out.join("\n");
}
