// Timing scan — an EXTENSION of v3.5: runs the Convergence Matrix once per Pratyantar window
// across a date range, with transits computed at each window's midpoint. Lets a "when?" question
// be answered by comparing windows instead of scoring a single date.
import type { ChartInput, DashaInput, QueryInput } from "./types.ts";
import { ingest } from "./ingest.ts";
import { execute } from "./engine.ts";
import { transitsAt, jdOf } from "./compute.ts";

export type ScanRow = {
  start: string; end: string; MD: string; AD: string; PD: string;
  saturn: string; jupiter: string;
  dasha: number; transit: number; sav: number; varga: number; total: number; gate: boolean; level: string;
};

function midpoint(a: string, b: string): string {
  const jd = (jdOf(a) + jdOf(b)) / 2;
  const d = new Date((jd - 2440587.5) * 86400000);
  return d.toISOString().slice(0, 10);
}

export function scan(chart: ChartInput, q: QueryInput, from: string, to: string): ScanRow[] {
  const ing = ingest(chart);
  const pds = ing.dashas.filter((d: DashaInput) => d.level === "PD" && d.end >= from && d.start <= to).sort((a, b) => a.start.localeCompare(b.start));
  return pds.map((pd) => {
    const mid = midpoint(pd.start < from ? from : pd.start, pd.end > to ? to : pd.end);
    const t = transitsAt(mid);
    const r = execute(ing, { ...q, targetDate: mid, transits: t, target: { ...(q.target ?? {}), timing: true } });
    const m = r.matrix;
    const fmt = (x: { sign: string; degree: number | string; retrograde?: boolean }) => `${x.sign.slice(0, 3)} ${Number(x.degree).toFixed(1)}°${x.retrograde ? "R" : ""}`;
    return {
      start: pd.start, end: pd.end, MD: pd.parent?.[0] ?? "", AD: pd.parent?.[1] ?? "", PD: pd.planet,
      saturn: fmt(t.Saturn), jupiter: fmt(t.Jupiter),
      dasha: m?.dasha.points ?? 0, transit: m?.transit.points ?? 0, sav: m?.sav.points ?? 0, varga: m?.varga.points ?? 0,
      total: m?.total ?? 0, gate: !m?.timingGate, level: r.halted ? "HALT" : (m?.specificity.level.split(" (")[0] ?? ""),
    };
  });
}

export function renderScan(rows: ScanRow[]): string {
  const h = ["Window", "MD/AD/PD", "Saturn", "Jupiter", "Dasha", "Transit", "SAV", "Varga", "Total", "Gate", "Level"];
  const lines = [`| ${h.join(" | ")} |`, `|${h.map(() => "---").join("|")}|`];
  for (const r of rows) lines.push(`| ${r.start} → ${r.end} | ${r.MD}/${r.AD}/${r.PD} | ${r.saturn} | ${r.jupiter} | ${r.dasha} | ${r.transit} | ${r.sav} | ${r.varga} | **${r.total}** | ${r.gate ? "pass" : "fail"} | ${r.level} |`);
  return lines.join("\n");
}
