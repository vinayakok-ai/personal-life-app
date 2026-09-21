import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execute, ingest, renderExecution, renderIngestion, parseDegree, nakshatraOf, dignityOf, fmtDegree, connects, type ChartInput, type QueryInput } from "./index.ts";

const chart = () => JSON.parse(readFileSync(new URL("./fixtures/sample-chart.json", import.meta.url), "utf8")) as ChartInput;
const query = () => JSON.parse(readFileSync(new URL("./fixtures/sample-query.json", import.meta.url), "utf8")) as QueryInput;

test("degree parsing and formatting", () => {
  assert.equal(parseDegree('12°34\'56"'), 12 + 34 / 60 + 56 / 3600);
  assert.equal(parseDegree("12:30"), 12.5);
  assert.equal(parseDegree(7.25), 7.25);
  assert.equal(fmtDegree(parseDegree("1°20'00\"")), "1°20'00\"");
  assert.equal(fmtDegree(29.99999), "30°00'00\"");
  assert.throws(() => parseDegree("abc"));
});

test("nakshatra and star lord lookup", () => {
  assert.deepEqual(nakshatraOf(0), { name: "Ashwini", pada: 1, lord: "Ketu" });
  assert.deepEqual(nakshatraOf(30 + 17.67), { name: "Rohini", pada: 3, lord: "Moon" });
  assert.deepEqual(nakshatraOf(359.9), { name: "Revati", pada: 4, lord: "Mercury" });
});

test("dignity table", () => {
  assert.equal(dignityOf("Sun", "Aries", 10), "Exalted");
  assert.equal(dignityOf("Sun", "Libra", 10), "Debilitated");
  assert.equal(dignityOf("Sun", "Leo", 10), "Moolatrikona");
  assert.equal(dignityOf("Sun", "Leo", 25), "Own");
  assert.equal(dignityOf("Saturn", "Gemini", 5), "Friend");
  assert.equal(dignityOf("Saturn", "Leo", 5), "Enemy");
  assert.equal(dignityOf("Rahu", "Taurus", 5), "Exalted");
});

test("Mode 1 ingests the sample chart and logs derived/missing data", () => {
  const ing = ingest(chart());
  assert.equal(ing.planets.length, 9);
  const merc = ing.planets.find((p) => p.planet === "Mercury")!;
  assert.equal(merc.combust, true);
  assert.equal(merc.combustDerived, true);
  assert.equal(merc.house, 9);
  assert.equal(ing.shadbala![0].planet, "Jupiter");
  assert.equal(ing.shadbala![0].rank, 1);
  assert.ok(ing.ledger.some((l) => l.severity === "missing" && /Bhinnashtakavarga/.test(l.note)));
  assert.ok(!ing.ledger.some((l) => /Rahu and Ketu/.test(l.note)), "nodes are 180° apart");
  const text = renderIngestion(ing);
  assert.match(text, /1\. PLANETARY POSITIONS TABLE/);
  assert.match(text, /Data extraction complete\./);
});

test("Mode 1 flags non-Lahiri ayanamsa, bad SAV totals and node mismatch", () => {
  const c = chart();
  c.meta.ayanamsa = "KP";
  c.sav = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
  c.planets.find((p) => p.planet === "Ketu")!.degree = "5°00'00\"";
  const ing = ingest(c);
  assert.ok(ing.ledger.some((l) => l.severity === "discarded" && /Lahiri/.test(l.note)));
  assert.ok(ing.ledger.some((l) => /SAV totals 360/.test(l.note)));
  assert.ok(ing.ledger.some((l) => /Rahu and Ketu/.test(l.note)));
});

test("Mode 1.5 halts a timing query without transits", () => {
  const r = execute(ingest(chart()), { text: "When will I get a promotion?" });
  assert.equal(r.halted, true);
  assert.match(r.halts[0], /\[HALT: TRANSIT DATA REQUIRED FOR TIMING\]/);
  assert.equal(r.matrix, null);
  assert.match(renderExecution(r), /Transit Saturn/);
});

test("Mode 1.5 halts when the relevant varga is missing, and bypass scores 0", () => {
  const c = chart();
  delete c.vargas!.D9;
  const base: QueryInput = { text: "Tell me about my marriage prospects" };
  const halted = execute(ingest(c), base);
  assert.equal(halted.halted, true);
  assert.match(halted.halts[0], /DIVISIONAL CHART DATA MISSING/);
  assert.match(halted.halts[0], /D9/);
  const bypass = execute(ingest(c), { ...base, proceedWithoutVarga: true });
  assert.equal(bypass.halted, false);
  assert.equal(bypass.matrix!.varga.points, 0);
  assert.equal(bypass.steps[3].done, false);
  assert.ok(bypass.nonConclusions.some((n) => /D9 confirmation withheld/.test(n)));
});

test("Mode 2 scores the sample career query per the convergence matrix", () => {
  const r = execute(ingest(chart()), query());
  assert.equal(r.halted, false);
  assert.deepEqual(r.target.houses, [10]);
  assert.equal(r.target.varga, "D10");
  const m = r.matrix!;
  // MD Jupiter (H12, no aspect on H10) / AD Mercury (H9, no) / PD Venus (lord of H10) → +20
  assert.equal(m.dasha.points, 20);
  // Transit Saturn in Pisces (H8) throws 3rd aspect on H10; Jupiter in Cancer (H12) does not → +15
  assert.equal(m.transit.points, 15);
  assert.equal(m.sav.points, 15);
  assert.equal(m.varga.points, 15);
  assert.equal(m.total, 65);
  assert.equal(m.timingGate, null);
  assert.equal(m.confidence, "Moderate");
  assert.match(m.specificity.level, /Moderate/);
  assert.equal(r.steps.filter((s) => s.done).length, 19);
  assert.equal(r.integrity.length, 0);
  const out = renderExecution(r);
  assert.match(out, /\[BACKEND COMPUTATION TERMINAL\]/);
  assert.match(out, /TOTAL = 20 \+ 15 \+ 15 \+ 15 = 65/);
  assert.match(out, /\[Step 10 - Ashtakavarga\]/);
  assert.match(out, /PART C: THE EXPANDED EXCLUSION LEDGER/);
});

test("timing gate fires when dasha + transit < 35", () => {
  const q = query();
  q.targetDate = "2026-11-01"; // PD Sun (H9) — no link to H10
  q.transits!.Saturn = { sign: "Aries", degree: 5 }; // H9: aspects H11, H3, H6 — not H10
  const r = execute(ingest(chart()), q);
  assert.equal(r.matrix!.dasha.points, 0);
  assert.equal(r.matrix!.transit.points, 0);
  assert.match(r.matrix!.timingGate!, /Background Potential Only/);
  assert.equal(r.matrix!.total, 30);
  assert.match(r.matrix!.specificity.level, /Veto/);
});

test("MD/AD connection awards 40 and Jupiter+Saturn both on target awards 30", () => {
  const q = query();
  q.targetDate = "2023-01-01"; // MD Jupiter / AD Saturn; Saturn natal Libra H3 → 10th aspect lands on H12, 7th on H9, 3rd on H5; so use H5 target
  q.target = { houses: [5], varga: null, timing: true };
  q.transits = { Saturn: { sign: "Aquarius", degree: 10 }, Jupiter: { sign: "Aries", degree: 10 } }; // Saturn H7 → 3rd aspect H9? no: H7+2=H9; 7th=H1; 10th=H4. Jupiter H9 → 5th=H1, 7th=H3, 9th=H5.
  const r = execute(ingest(chart()), q);
  assert.equal(connects(ingest(chart()), "Saturn", [5]), "aspects H5");
  assert.equal(r.matrix!.dasha.points, 40); // AD Saturn (H3) 3rd aspect → H5
  assert.equal(r.matrix!.transit.points, 15); // only Jupiter
  q.transits.Saturn = { sign: "Sagittarius", degree: 10 }; // occupies H5
  const r2 = execute(ingest(chart()), q);
  assert.equal(r2.matrix!.transit.points, 30);
});

test("non-timing query skips phase 4 and declares it", () => {
  const r = execute(ingest(chart()), { text: "What does my chart say about wealth?", target: { houses: [2, 11], varga: null, timing: false } });
  assert.equal(r.halted, false);
  assert.equal(r.matrix!.dasha.points, 0);
  assert.ok(r.steps.slice(16).every((s) => !s.done));
  assert.ok(r.nonConclusions.some((n) => /non-timing/.test(n)));
});

test("SAV of exactly 28 is flagged as a spec gap", () => {
  const c = chart();
  c.sav![9] = 28; c.sav![8] = 35;
  const r = execute(ingest(c), query());
  assert.equal(r.matrix!.sav.points, 7);
  assert.ok(r.integrity.some((i) => /SAV = 28/.test(i)));
});

test("query classifier catches inflected topic words", () => {
  const r = execute(ingest(chart()), { text: "When will I get married?" });
  assert.equal(r.target.topic, "marriage");
  assert.deepEqual(r.target.houses, [7]);
  assert.equal(r.target.varga, "D9");
});
