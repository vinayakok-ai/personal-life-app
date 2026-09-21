// Computation layer — DELIBERATE DILUTION of the v3.5 "Zero-Ephemeris & Zero-Calculation" law,
// enabled per user instruction. Everything here is deterministic arithmetic or Swiss Ephemeris
// (Moshier analytical ephemeris, Lahiri ayanamsa, mean node). Every value it produces is logged
// as "computed" in the ledger so it can be told apart from transcribed chart data.
//
// This module is only used by the CLI / scan tooling; the engine itself stays table-driven.

import sweph from "sweph";
import { SIGNS, type ChartInput, type DashaInput, type DashaLevel, type Planet, type QueryInput, type Sign, type TransitInput, type VargaInput } from "./types.ts";
import { parseDegree } from "./ingest.ts";
import { signIndex } from "./tables.ts";

const C = sweph.constants;
const FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SIDEREAL | C.SEFLG_SPEED;
sweph.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);

const BODY: Record<Planet, number> = { Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6, Rahu: 10, Ketu: 10 };

export type Position = { planet: Planet; longitude: number; sign: Sign; degree: number; retrograde: boolean };

/** Julian day (UT) for an ISO date/time given in a fixed UTC offset (hours). */
export function jdOf(dateISO: string, timeHHMM = "12:00", utcOffsetHours = 5.5): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const utcMinutes = hh * 60 + mm - utcOffsetHours * 60;
  const r = sweph.utc_to_jd(y, m, d, 0, 0, 0, C.SE_GREG_CAL);
  return r.data[1] + utcMinutes / 1440;
}

export function ayanamsa(jd: number): number {
  return sweph.get_ayanamsa_ex_ut(jd, C.SEFLG_MOSEPH).data;
}

export function positionsAt(jd: number, planets: Planet[]): Position[] {
  return planets.map((p) => {
    const r = sweph.calc_ut(jd, BODY[p], FLAGS);
    let lon = r.data[0];
    if (p === "Ketu") lon = (lon + 180) % 360;
    const s = Math.floor(lon / 30);
    return { planet: p, longitude: lon, sign: SIGNS[s], degree: lon - s * 30, retrograde: p === "Rahu" || p === "Ketu" ? true : r.data[3] < 0 };
  });
}

export function transitsAt(dateISO: string): TransitInput {
  const jd = jdOf(dateISO);
  const [sa, ju, ra, ke] = positionsAt(jd, ["Saturn", "Jupiter", "Rahu", "Ketu"]);
  return {
    asOf: dateISO,
    Saturn: { sign: sa.sign, degree: sa.degree, retrograde: sa.retrograde },
    Jupiter: { sign: ju.sign, degree: ju.degree, retrograde: ju.retrograde },
    Rahu: { sign: ra.sign, degree: ra.degree },
    Ketu: { sign: ke.sign, degree: ke.degree },
  };
}

// ---- Vargas (Parashara) ----
const lonOf = (sign: Sign, deg: number) => signIndex(sign) * 30 + deg;
export function vargaSign(lon: number, n: 9 | 10 | 4 | 7): Sign {
  const s = Math.floor(lon / 30), d = lon - s * 30, odd = s % 2 === 0;
  const part = Math.floor(d / (30 / n));
  let idx: number;
  if (n === 9) idx = s * 9 + part;
  else if (n === 10) idx = s + part + (odd ? 0 : 8);
  else if (n === 7) idx = s + part + (odd ? 0 : 6);
  else idx = s + 3 * part;
  return SIGNS[idx % 12];
}
export function computeVarga(chart: ChartInput, n: 9 | 10 | 4 | 7): VargaInput {
  return {
    ascendant: vargaSign(lonOf(chart.ascendant.sign, parseDegree(chart.ascendant.degree)), n),
    planets: chart.planets.map((p) => ({ planet: p.planet, sign: vargaSign(lonOf(p.sign, parseDegree(p.degree)), n) })),
  };
}

// ---- Vimshottari ----
const ORDER: { planet: Planet; years: number }[] = [
  { planet: "Ketu", years: 7 }, { planet: "Venus", years: 20 }, { planet: "Sun", years: 6 }, { planet: "Moon", years: 10 }, { planet: "Mars", years: 7 },
  { planet: "Rahu", years: 18 }, { planet: "Jupiter", years: 16 }, { planet: "Saturn", years: 19 }, { planet: "Mercury", years: 17 },
];
const YEAR = 365.25;
const LEVELS: DashaLevel[] = ["MD", "AD", "PD", "SD", "PrD"];

function isoFromJd(jd: number, utcOffsetHours = 5.5): string {
  const r = sweph.revjul(jd + utcOffsetHours / 24, C.SE_GREG_CAL);
  return `${String(r.year).padStart(4, "0")}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
}

/** Full Vimshottari tree from the Moon's sidereal longitude, to `depth`, as ISO dates in local (IST) calendar days. */
export function vimshottari(moonLongitude: number, birthJd: number, depth: DashaLevel = "PD", from?: string, to?: string): DashaInput[] {
  const nak = Math.floor(moonLongitude / (360 / 27));
  const startIdx = nak % 9;
  const frac = (moonLongitude - nak * (360 / 27)) / (360 / 27);
  const mdStart = birthJd - frac * ORDER[startIdx].years * YEAR;
  const out: DashaInput[] = [];
  const maxLevel = LEVELS.indexOf(depth);
  const recurse = (level: number, start: number, span: number, firstIdx: number, parent: Planet[]) => {
    let t = start;
    for (let k = 0; k < 9; k++) {
      const o = ORDER[(firstIdx + k) % 9];
      const len = (span * o.years) / 120;
      const s = isoFromJd(t), e = isoFromJd(t + len);
      if (e >= "1998-01-01" && (!from || e >= from) && (!to || s <= to)) {
        out.push({ level: LEVELS[level], planet: o.planet, start: s, end: e, parent: parent.length ? [...parent] : undefined });
        if (level < maxLevel) recurse(level + 1, t, len, (firstIdx + k) % 9, [...parent, o.planet]);
      }
      t += len;
    }
  };
  recurse(0, mdStart, 120 * YEAR, startIdx, []);
  return out;
}

// ---- Preparation of engine inputs ----
export type ComputeOptions = { vargas?: ("D9" | "D10" | "D4" | "D7")[]; dashaDepth?: DashaLevel; birthDate: string; birthTime: string };

export type PrepReport = { notes: string[]; dashaCheck?: { rows: number; maxDriftDays: number } };

export function prepareChart(chart: ChartInput, opts: ComputeOptions): { chart: ChartInput; report: PrepReport } {
  const notes: string[] = [];
  const out: ChartInput = { ...chart, vargas: { ...(chart.vargas ?? {}) }, dashas: [...chart.dashas] };
  for (const v of opts.vargas ?? []) {
    if (out.vargas![v]) continue;
    out.vargas![v] = computeVarga(chart, Number(v.slice(1)) as 9 | 10 | 4 | 7);
    notes.push(`${v} computed arithmetically from the supplied D1 degrees (Parashara ${v} rule) — engine zero-calculation law diluted by user.`);
  }
  let report: PrepReport = { notes };
  if (opts.dashaDepth) {
    const moon = chart.planets.find((p) => p.planet === "Moon");
    if (!moon) throw new Error("Moon row required to compute Vimshottari");
    const birthJd = jdOf(opts.birthDate, opts.birthTime);
    const tree = vimshottari(lonOf(moon.sign, parseDegree(moon.degree)), birthJd, opts.dashaDepth);
    // Verify against the supplied MD/AD rows.
    let maxDrift = 0, rows = 0;
    for (const r of chart.dashas) {
      const c = tree.find((t) => t.level === r.level && t.planet === r.planet && (t.parent?.join() ?? "") === (r.parent?.join() ?? "") && Math.abs(jdOf(t.end) - jdOf(r.end)) < 400);
      if (!c) continue;
      rows++;
      maxDrift = Math.max(maxDrift, Math.abs(jdOf(c.end) - jdOf(r.end)));
    }
    const supplied = new Set(chart.dashas.map((r) => `${r.level}|${r.planet}|${r.parent?.join() ?? ""}`));
    for (const t of tree) if (!supplied.has(`${t.level}|${t.planet}|${t.parent?.join() ?? ""}`) && t.end >= opts.birthDate) out.dashas.push(t);
    notes.push(`Vimshottari computed to ${opts.dashaDepth} from Moon ${moon.sign} ${moon.degree} (365.25-day years); ${rows} supplied MD/AD rows re-derived with max drift ${maxDrift.toFixed(1)} days. Supplied rows kept as authoritative; computed rows added for missing levels.`);
    report = { notes, dashaCheck: { rows, maxDriftDays: maxDrift } };
  }
  out.ledgerNotes = [...(chart.ledgerNotes ?? []), ...notes.map((n) => `[computed] ${n}`)];
  return { chart: out, report };
}

export function prepareQuery(q: QueryInput & { transits?: TransitInput | "compute" }): QueryInput {
  if (q.transits !== "compute") return q as QueryInput;
  if (!q.targetDate) throw new Error("targetDate required to compute transits");
  const t = transitsAt(q.targetDate);
  return { ...q, transits: t, text: q.text + ` [transits computed by Swiss Ephemeris (Moshier, Lahiri, mean node) for ${q.targetDate} 12:00 IST]` };
}

/** Compare computed natal positions against the supplied table — accuracy report in arcseconds. */
export function validateNatal(chart: ChartInput, birthDate: string, birthTime: string): { planet: Planet; supplied: number; computed: number; diffArcsec: number }[] {
  const jd = jdOf(birthDate, birthTime);
  const pos = positionsAt(jd, chart.planets.map((p) => p.planet));
  return chart.planets.map((p) => {
    const c = pos.find((x) => x.planet === p.planet)!;
    const s = lonOf(p.sign, parseDegree(p.degree));
    return { planet: p.planet, supplied: s, computed: c.longitude, diffArcsec: Math.round((((c.longitude - s + 540) % 360) - 180) * 3600) };
  });
}
