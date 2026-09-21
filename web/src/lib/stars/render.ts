// MODULE 4 — MANDATORY OUTPUT ARCHITECTURE (Part A / B / C).
import type { EngineResult } from "./engine.ts";

export function renderExecution(r: EngineResult): string {
  if (r.halted) return r.halts.join("\n\n");
  const m = r.matrix!;
  const A: string[] = ["```", "[BACKEND COMPUTATION TERMINAL]", "", "1. 19-POINT CHECKLIST"];
  for (const s of r.steps) A.push(`[${s.done ? "x" : " "}] Step ${String(s.step).padStart(2)} ${s.title}: ${s.note}`);
  A.push("", "2. CALCULATION INTEGRITY CHECK");
  A.push(...(r.integrity.length ? r.integrity.map((i) => `- ${i}`) : ["- No internal inconsistencies detected between house lords, signs or dates."]));
  A.push("", "3. CONTRADICTION / COUNTER-EVIDENCE MATRIX", "| Factor | Effect (Supports / Opposes / Delays) | Weight (Strong / Moderate / Weak) |", "|---|---|---|");
  for (const c of r.contradictions) A.push(`| ${c.factor} | ${c.effect} | ${c.weight} |`);
  if (!r.contradictions.length) A.push("| (none) | — | — |");
  A.push("", "4. 100-POINT CONVERGENCE CALCULATION");
  A.push(`Dasha Engine (40 max):        ${String(m.dasha.points).padStart(2)}  ${m.dasha.note}`);
  A.push(`Double Transit Gate (30 max): ${String(m.transit.points).padStart(2)}  ${m.transit.note}`);
  A.push(`Ashtakavarga Floor (15 max):  ${String(m.sav.points).padStart(2)}  ${m.sav.note}`);
  A.push(`Varga Confirmation (15 max):  ${String(m.varga.points).padStart(2)}  ${m.varga.note}`);
  A.push(`TOTAL = ${m.dasha.points} + ${m.transit.points} + ${m.sav.points} + ${m.varga.points} = ${m.total}`);
  if (m.timingGate) A.push(`TIMING-GATE: ${m.timingGate}`);
  A.push(`SPECIFICITY: ${m.specificity.level} → ${m.specificity.unlocked}`);
  A.push("", "5. CONFIDENCE CLASSIFICATION", `${m.confidence} Convergence`, "```");

  const B: string[] = ["PART B: THE SYNTHESIS", "", "1. Natal Promise"];
  B.push(...(r.facts.natal.length ? r.facts.natal.map((f) => `- ${f}`) : ["- No natal factors recorded for the target."]));
  B.push("", "2. Dynamic Activation & Timing");
  if (r.facts.timing.length) B.push(...r.facts.timing.map((f) => `- ${f}`));
  else B.push("- Not evaluated: non-timing query [Step 1 - Engine Inference].");
  if (m.timingGate) B.push(`- Classification: ${m.timingGate} [Step 19 - Engine Inference]`);
  B.push(`- Specificity ceiling: ${m.specificity.level}; ${m.specificity.unlocked} [Step 19 - Engine Inference]`);

  const C: string[] = ["PART C: THE EXPANDED EXCLUSION LEDGER", "", "1. Excluded Steps"];
  const ex = r.steps.filter((s) => !s.done);
  C.push(...(ex.length ? ex.map((s) => `- Step ${s.step} (${s.title}): ${s.note}.`) : ["- None; all 19 steps executed on confirmed data."]));
  C.push("", "2. Non-Conclusion Declarations");
  C.push(...(r.nonConclusions.length ? r.nonConclusions.map((n) => `- ${n}`) : ["- None."]));

  return ["PART A: [BACKEND COMPUTATION TERMINAL]", ...A, "", ...B, "", ...C].join("\n");
}
