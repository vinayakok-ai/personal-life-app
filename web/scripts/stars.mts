#!/usr/bin/env node
// Stars Engine v3.5 CLI.
//   INGEST DATA:    node scripts/stars.mts ingest  <chart.json>
//   EXECUTE ENGINE: node scripts/stars.mts execute <chart.json> <query.json>
//   TIMING SCAN:    node scripts/stars.mts scan    <chart.json> <query.json> <from> <to>
//   v4 (two-axis):  node scripts/stars.mts v4      <chart.json> <query.json>
//                   node scripts/stars.mts v4scan  <chart.json> <query.json> <from> <to>
//                   node scripts/stars.mts backtest <chart.json> <events.json> <from> <to>
// chart.json may carry a top-level "compute" block ({ vargas, dashaDepth, birthDate, birthTime })
// and query.json may set "transits": "compute" — both dilute the zero-calculation law (see compute.ts).
import { readFileSync } from "node:fs";
import { execute, ingest, renderExecution, renderIngestion, type ChartInput } from "../src/lib/stars/index.ts";
import { prepareChart, prepareQuery, validateNatal, type ComputeOptions } from "../src/lib/stars/compute.ts";
import { renderScan, scan } from "../src/lib/stars/scan.ts";
import { backtest, renderBacktest, renderScanV4, renderV4, runV4, scanV4, type LifeEvent } from "../src/lib/stars/v4-run.ts";

const [mode, chartPath, queryPath, from, to] = process.argv.slice(2);
if (!mode || !chartPath || (mode !== "ingest" && !queryPath) || (["scan", "v4scan", "backtest"].includes(mode) && (!from || !to))) {
  console.error("usage: stars.mts ingest <chart> | execute <chart> <query> | scan <chart> <query> <from> <to> | v4 <chart> <query> | v4scan <chart> <query> <from> <to> | backtest <chart> <events> <from> <to>");
  process.exit(2);
}
const raw = JSON.parse(readFileSync(chartPath, "utf8")) as ChartInput & { compute?: ComputeOptions };
let chart: ChartInput = raw;
if (raw.compute) {
  const { chart: c, report } = prepareChart(raw, raw.compute);
  chart = c;
  if (mode === "ingest") {
    console.error("[compute] " + report.notes.join("\n[compute] "));
    const v = validateNatal(raw, raw.compute.birthDate, raw.compute.birthTime);
    console.error("[compute] natal check vs Swiss Ephemeris (arcsec): " + v.map((r) => `${r.planet} ${r.diffArcsec > 0 ? "+" : ""}${r.diffArcsec}"`).join(", "));
  }
}
if (mode === "ingest") console.log(renderIngestion(ingest(chart)));
else if (mode === "backtest") {
  console.log(renderBacktest(backtest(chart, JSON.parse(readFileSync(queryPath, "utf8")) as LifeEvent[], from, to)));
} else {
  const q = prepareQuery(JSON.parse(readFileSync(queryPath, "utf8")));
  if (mode === "execute") console.log(renderExecution(execute(ingest(chart), q)));
  else if (mode === "scan") console.log(renderScan(scan(chart, q, from, to)));
  else if (mode === "v4") console.log(renderV4(runV4(ingest(chart), q)));
  else if (mode === "v4scan") console.log(renderScanV4(scanV4(chart, q, from, to)));
  else { console.error(`unknown mode ${mode}`); process.exit(2); }
}
