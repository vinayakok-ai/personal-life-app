#!/usr/bin/env node
// Stars Engine v3.5 CLI.
//   INGEST DATA:   node scripts/stars.ts ingest  <chart.json>
//   EXECUTE ENGINE: node scripts/stars.ts execute <chart.json> <query.json>
import { readFileSync } from "node:fs";
import { execute, ingest, renderExecution, renderIngestion, type ChartInput, type QueryInput } from "../src/lib/stars/index.ts";

const [mode, chartPath, queryPath] = process.argv.slice(2);
if (!mode || !chartPath || (mode === "execute" && !queryPath)) {
  console.error("usage: stars.ts ingest <chart.json> | execute <chart.json> <query.json>");
  process.exit(2);
}
const chart = JSON.parse(readFileSync(chartPath, "utf8")) as ChartInput;
const ing = ingest(chart);
if (mode === "ingest") {
  console.log(renderIngestion(ing));
} else if (mode === "execute") {
  const q = JSON.parse(readFileSync(queryPath, "utf8")) as QueryInput;
  console.log(renderExecution(execute(ing, q)));
} else {
  console.error(`unknown mode ${mode}`);
  process.exit(2);
}
