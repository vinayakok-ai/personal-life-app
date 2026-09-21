// v4 runners: single date, window scan, and backtest against dated life events.
import type { ChartInput, DashaInput, Planet, QueryInput, TransitInput } from "./types.ts";
import { ingest } from "./ingest.ts";
import type { Ingested } from "./types.ts";
import { jdOf, transitsAt } from "./compute.ts";
import { SIGNIFICATIONS, cell, promise, topicOf, trigger, type ActiveDasha, type Cell, type PromiseResult, type Signification, type Topic, type TriggerResult } from "./v4.ts";

export type V4Result = { topic: Topic; sig: Signification; date: string; window: [string, string]; active: ActiveDasha & { rows: DashaInput[] }; promise: PromiseResult; trigger: TriggerResult; cell: Cell };

export function activeAt(dashas: DashaInput[], date: string): ActiveDasha & { rows: DashaInput[] } {
  const rows = dashas.filter((d) => d.start <= date && date <= d.end);
  const pick = (lvl: DashaInput["level"]) => rows.filter((d) => d.level === lvl).sort((a, b) => b.start.localeCompare(a.start))[0];
  return { MD: pick("MD")?.planet as Planet | undefined, AD: pick("AD")?.planet as Planet | undefined, PD: pick("PD")?.planet as Planet | undefined, rows };
}

function sampleDates(from: string, to: string, n = 3): string[] {
  const a = jdOf(from), b = jdOf(to);
  return Array.from({ length: n }, (_, i) => new Date((a + ((b - a) * i) / (n - 1) - 2440587.5) * 86400000).toISOString().slice(0, 10));
}

export function runV4(ing: Ingested, q: QueryInput, window?: [string, string]): V4Result {
  const topic = q.target?.houses ? "general" : topicOf(q.text);
  const sig: Signification = q.target?.houses ? { ...SIGNIFICATIONS.general, primary: q.target.houses, secondary: [] } : SIGNIFICATIONS[topic];
  const date = q.targetDate ?? new Date().toISOString().slice(0, 10);
  const win: [string, string] = window ?? [date, date];
  const active = activeAt(ing.dashas, window ? sampleDates(win[0], win[1], 3)[1] : date);
  const transits: TransitInput[] = window ? sampleDates(win[0], win[1], 3).map(transitsAt) : [q.transits && typeof q.transits === "object" ? q.transits : transitsAt(date)];
  const P = promise(ing, sig), T = trigger(ing, sig, active, transits);
  return { topic, sig, date, window: win, active, promise: P, trigger: T, cell: cell(P.P, T.T) };
}

export function scanV4(chart: ChartInput, q: QueryInput, from: string, to: string): V4Result[] {
  const ing = ingest(chart);
  const pds = ing.dashas.filter((d) => d.level === "PD" && d.end >= from && d.start <= to).sort((a, b) => a.start.localeCompare(b.start));
  return pds.map((pd) => runV4(ing, q, [pd.start < from ? from : pd.start, pd.end > to ? to : pd.end]));
}

export type LifeEvent = { date: string; topic: Topic; label: string };
export type BacktestRow = { event: LifeEvent; T: number; gl: string; tone: string; rank: number; of: number; percentile: number; cell: string; window: string };

/** For each event: T of the PD window containing it, and its rank among all PD windows of that topic in [from,to]. */
export function backtest(chart: ChartInput, events: LifeEvent[], from: string, to: string): { rows: BacktestRow[]; summary: string } {
  const cache = new Map<Topic, V4Result[]>();
  const rows: BacktestRow[] = events.map((ev) => {
    if (!cache.has(ev.topic)) cache.set(ev.topic, scanV4(chart, { text: ev.topic }, from, to));
    const all = cache.get(ev.topic)!;
    const hit = all.find((r) => r.window[0] <= ev.date && ev.date <= r.window[1]) ?? all[0];
    const sorted = [...all].sort((a, b) => b.trigger.T - a.trigger.T);
    const rank = sorted.findIndex((r) => r === hit) + 1;
    return { event: ev, T: hit.trigger.T, gl: `${hit.trigger.Tgain}/${hit.trigger.Tloss}`, tone: hit.trigger.tone, rank, of: all.length, percentile: Math.round((1 - (rank - 1) / all.length) * 100), cell: hit.cell.name, window: `${hit.window[0]}→${hit.window[1]}` };
  });
  const meanPct = rows.length ? Math.round(rows.reduce((a, r) => a + r.percentile, 0) / rows.length) : 0;
  const top25 = rows.filter((r) => r.percentile >= 75).length;
  return { rows, summary: `${rows.length} events; mean percentile of event window ${meanPct} (50 = chance); ${top25}/${rows.length} events fell in the top quartile of their topic's windows.` };
}

// ---- rendering ----
const md = (rows: string[][]) => { const [h, ...b] = rows; return [`| ${h.join(" | ")} |`, `|${h.map(() => "---").join("|")}|`, ...b.map((r) => `| ${r.join(" | ")} |`)].join("\n"); };

export function renderV4(r: V4Result): string {
  const out: string[] = [];
  out.push(`# v4 — ${r.topic} — ${r.window[0] === r.window[1] ? r.date : `${r.window[0]} → ${r.window[1]}`}`);
  out.push(`Signification: primary ${r.sig.primary.map((h) => "H" + h).join(",")}; secondary ${r.sig.secondary.map((h) => "H" + h).join(",") || "—"}; karaka ${r.sig.karakas.join("/")}${r.sig.charakaraka ? `; ${r.sig.charakaraka}` : ""}${r.sig.arudhaOf ? `; A${r.sig.arudhaOf}` : ""}${r.sig.varga ? `; ${r.sig.varga}` : ""}`);
  out.push("", `## Promise P = ${r.promise.P}  (raw ${r.promise.raw >= 0 ? "+" : ""}${r.promise.raw} on a 50 baseline)`);
  out.push(md([["Factor", "Points", "Source"], ...r.promise.terms.sort((a, b) => b.points - a.points).map((t) => [t.factor, (t.points >= 0 ? "+" : "") + t.points, t.source])]));
  if (r.promise.tags.length) out.push("Tags: " + r.promise.tags.join("; "));
  out.push("", `## Trigger T = ${r.trigger.T}  (gain ${r.trigger.Tgain} / loss ${r.trigger.Tloss}; gain = dasha ${r.trigger.dashaPoints}/55 + transit ${r.trigger.transitPoints}/35, scaled to 100)`);
  out.push(`Active: ${(["MD", "AD", "PD"] as const).map((l) => `${l} ${r.active[l] ?? "?"}`).join(" / ")} — tone **${r.trigger.tone}** (${r.trigger.toneScore}: ${r.trigger.toneWhy.join(", ") || "neutral"})`);
  out.push(md([["Level", "Planet", "Connection", "c", "Points"], ...r.trigger.dasha.map((d) => [d.level, d.planet, d.via, String(d.c), String(d.points)])]));
  out.push(r.trigger.transit.length ? md([["Transit factor", "Points"], ...r.trigger.transit.map((t) => [t.factor, String(t.points)])]) : "No Jupiter/Saturn/node transit on the target signs.");
  out.push("", `Loss axis T_loss = ${r.trigger.Tloss}`);
  out.push(md([["Level", "Planet", "Loss link", "c", "Points"], ...r.trigger.loss.map((d) => [d.level, d.planet, d.via, String(d.c), String(d.points)])]));
  if (r.trigger.lossTransit.length) out.push(md([["Loss transit", "Points"], ...r.trigger.lossTransit.map((t) => [t.factor, String(t.points)])]));
  if (r.trigger.tags.length) out.push("Tags: " + r.trigger.tags.join("; "));
  out.push("", `## Grid: **${r.cell.name}** (Level ${r.cell.level}) — ${r.cell.note}`);
  const pos = r.promise.terms.filter((t) => t.points > 0).sort((a, b) => b.points - a.points).slice(0, 3), neg = r.promise.terms.filter((t) => t.points < 0).sort((a, b) => a.points - b.points).slice(0, 3);
  out.push(`Top supports: ${pos.map((t) => `${t.factor} (+${t.points})`).join("; ") || "—"}`);
  out.push(`Top obstacles: ${neg.map((t) => `${t.factor} (${t.points})`).join("; ") || "—"}`);
  return out.join("\n");
}

export function renderScanV4(rows: V4Result[]): string {
  return md([["Window", "MD/AD/PD", "P", "T", "gain/loss", "Tone", "Dasha", "Transit", "Cell", "Tags"], ...rows.map((r) => [
    `${r.window[0]} → ${r.window[1]}`, `${r.active.MD}/${r.active.AD}/${r.active.PD}`, String(r.promise.P), `**${r.trigger.T}**`, `${r.trigger.Tgain}/${r.trigger.Tloss}`, r.trigger.tone, String(r.trigger.dashaPoints), String(r.trigger.transitPoints), r.cell.name, r.trigger.tags.join("; ") || "—",
  ])]);
}

export function renderBacktest(b: ReturnType<typeof backtest>): string {
  return [md([["Event", "Date", "Topic", "Window", "T (gain/loss)", "Tone", "Rank", "Percentile", "Cell"], ...b.rows.map((r) => [r.event.label, r.event.date, r.event.topic, r.window, `${r.T} (${r.gl})`, r.tone, `${r.rank}/${r.of}`, String(r.percentile), r.cell])]), "", b.summary].join("\n");
}

// ---- Blind retrodiction: the engine commits to past windows without seeing any events ----
export type Retro = { topic: Topic; P: number; coveragePct: number; windows: { from: string; to: string; T: number; tone: string; cell: string; dashas: string; tags: string }[] };

/** Merge adjacent PD windows whose T ≥ threshold, per topic; report the merged runs ranked by peak T. */
export function retrodict(chart: ChartInput, from: string, to: string, threshold = 55, topN = 6): Retro[] {
  const topics = (Object.keys(SIGNIFICATIONS) as Topic[]).filter((t) => t !== "general");
  return topics.map((topic) => {
    const rows = scanV4(chart, { text: topic }, from, to);
    const runs: Retro["windows"] = [];
    let cur: (Retro["windows"][number] & { peak: number }) | null = null;
    for (const r of rows) {
      const ok = r.trigger.T >= threshold;
      if (ok && cur) { cur.to = r.window[1]; cur.T = Math.max(cur.T, r.trigger.T); if (r.trigger.T > cur.peak) { cur.peak = r.trigger.T; cur.cell = r.cell.name; cur.tone = r.trigger.tone; cur.dashas = `${r.active.MD}/${r.active.AD}/${r.active.PD}`; } cur.tags = [...new Set([...cur.tags.split("; ").filter(Boolean), ...r.trigger.tags])].join("; "); }
      else if (ok) cur = { from: r.window[0], to: r.window[1], T: r.trigger.T, peak: r.trigger.T, tone: r.trigger.tone, cell: r.cell.name, dashas: `${r.active.MD}/${r.active.AD}/${r.active.PD}`, tags: r.trigger.tags.join("; ") };
      else if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    const days = (a: string, b: string) => jdOf(b) - jdOf(a);
    const total = days(from, to) || 1;
    const covered = rows.filter((r) => r.trigger.T >= threshold).reduce((a, r) => a + days(r.window[0], r.window[1]), 0);
    return { topic, P: rows[0]?.promise.P ?? 0, coveragePct: Math.round((covered / total) * 100), windows: runs.sort((a, b) => b.T - a.T).slice(0, topN).sort((a, b) => a.from.localeCompare(b.from)) };
  });
}

export function renderRetro(rs: Retro[], threshold: number): string {
  const out = [`Blind retrodiction — windows where Trigger T ≥ ${threshold}, merged when contiguous. The engine has seen no life events.`, ""];
  for (const r of rs) {
    out.push(`### ${r.topic}  (Promise P = ${r.P}; ${r.coveragePct}% of the period is above threshold — lower is more specific)`);
    out.push(r.windows.length ? md([["From", "To", "Peak T", "Tone", "Cell at peak", "MD/AD/PD at peak", "Tags"], ...r.windows.map((w) => [w.from, w.to, String(w.T), w.tone, w.cell, w.dashas, w.tags || "—"])]) : "_no window reached the threshold_");
    out.push("");
  }
  return out.join("\n");
}
