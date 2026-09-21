// OPERATIONAL MODE 1.5 — HALT-AND-PROMPT AUDIT GATE ("EXECUTE ENGINE").
import type { Ingested, QueryInput } from "./types.ts";

export type Varga = "D9" | "D10" | "D4" | "D7";
export type Target = { houses: number[]; varga: Varga | null; timing: boolean; topic: string; inferred: boolean };

const TOPICS: { topic: string; re: RegExp; houses: number[]; varga: Varga | null }[] = [
  { topic: "career", re: /\b(career|job|promotion|work|profession|business|startup|employ|boss|salary|role)\b/i, houses: [10], varga: "D10" },
  { topic: "marriage", re: /\b(marriage|marry|wedding|spouse|partner|relationship|wife|husband|divorce)\b/i, houses: [7], varga: "D9" },
  { topic: "property", re: /\b(property|house purchase|home|land|flat|apartment|vehicle|car)\b/i, houses: [4], varga: "D4" },
  { topic: "children", re: /\b(child|children|kid|pregnan|conceiv|son|daughter)\b/i, houses: [5], varga: "D7" },
  { topic: "wealth", re: /\b(money|wealth|income|finance|gain|debt|loan|savings)\b/i, houses: [2, 11], varga: null },
  { topic: "health", re: /\b(health|illness|disease|surgery|medical|sick)\b/i, houses: [6, 1], varga: null },
  { topic: "foreign", re: /\b(abroad|foreign|overseas|relocat|migrat|visa|travel)\b/i, houses: [12, 9], varga: null },
  { topic: "education", re: /\b(study|studies|education|exam|degree|college|university)\b/i, houses: [5, 4, 9], varga: null },
];
const TIMING = /\b(when|timing|time|date|year|month|window|soon|will i|by 20\d\d|in 20\d\d|before|after|next)\b/i;

/** Step 1 — Query Isolation: strip sentiment, keep the objective target. Keyword-based (Engine Inference). */
export function isolateQuery(q: QueryInput): Target {
  const hit = TOPICS.find((t) => t.re.test(q.text));
  const inferredTiming = TIMING.test(q.text) || !!q.targetDate;
  return {
    houses: q.target?.houses ?? hit?.houses ?? [1],
    varga: q.target?.varga !== undefined ? q.target.varga : hit?.varga ?? null,
    timing: q.target?.timing ?? inferredTiming,
    topic: hit?.topic ?? "general",
    inferred: !q.target,
  };
}

export type GateResult = { halts: string[]; target: Target; vargaBypassed: boolean };

export function auditGate(ing: Ingested, q: QueryInput): GateResult {
  const target = isolateQuery(q);
  const halts: string[] = [];
  if (target.timing) {
    const t = q.transits;
    if (!t?.Saturn || !t?.Jupiter || !q.targetDate) {
      halts.push([
        "[HALT: TRANSIT DATA REQUIRED FOR TIMING]",
        "Timing analysis requires verified real-time coordinates. Input current transit positions:",
        "- Transit Saturn: Sign & Degree [R/D]",
        "- Transit Jupiter: Sign & Degree [R/D]",
        "- Transit Rahu / Ketu: Sign & Degree",
        "- Target Date / Window:",
      ].join("\n"));
    }
  }
  let vargaBypassed = false;
  if (target.varga && !ing.vargas[target.varga]) {
    if (q.proceedWithoutVarga) vargaBypassed = true;
    else halts.push([
      "[HALT: DIVISIONAL CHART DATA MISSING]",
      `Query requires ${target.varga} verification. Input house positions or key planetary placements for ${target.varga}, or reply 'PROCEED WITHOUT VARGA' (incurs an automatic 15-point deduction in the Convergence Matrix).`,
    ].join("\n"));
  }
  return { halts, target, vargaBypassed };
}
