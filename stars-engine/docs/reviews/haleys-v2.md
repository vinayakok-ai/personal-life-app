# Audit — Haleys V2.0 (Sarvesh), received 2026-09-23

Scope: logic, mathematics, effectiveness. Measured on identical data with stars-engine v4.5.

## Measured
| Test | Haleys V2.0 | stars-engine v4.5 |
|---|---|---|
| Sarvesh 03:24, his 20 events + 5 nulls, ranking span 2014–26 (Haleys) / lifetime (v4.5) | train 67 / 6 of 12; validation 48 / 1 of 4; holdout 77 / 3 of 4; nulls in top quartile 2 of 5 | mean 54; 7 of 20 real events top quartile; 0 of 5 nulls |
| Vinayak 10:35, 17 compat events, lifetime | mean 52; 3 of 17 top quartile | mean 60; 7 of 17 |
| Coverage, share of period flagged (T ≥ 62) | Vinayak: career 25 %, wealth 69 %, others 4–13 % | Vinayak: career 18 %, wealth 5 %; **Sarvesh: career 71 %** (v4.5 flaw) |
| Sarvesh 03:18 vs 03:24 on Haleys | 03:24 fits better on every split | — |
| `npm run typecheck` / `npm test` | 8 type errors / 23 pass | 0 / 16 pass |

Reading: each engine scores best on its author's chart and drops to chance on the other's. That is model
selection overfitting even without weight tuning. Neither engine has demonstrated out-of-chart skill. The
Haleys negative control (2 of 5 nulls in the top quartile vs 10 of 20 real) is the most honest number in
either project and it says the signal is thin.

## Logic and mathematics — what is wrong
1. **Nadi trine rescue** (`connection`): any planet in a trine from the karaka gets c ≥ 0.6. A quarter of the
   zodiac is trine to any sign, so a quarter of all dasha lords are auto-linked at 0.6. Largest single source
   of base rate. Remove or make it a ≤0.2 confirmation on top of a real link.
2. **Cliff multipliers survive**: Gandanta ×0.2, Graha-yuddha loser ×0.2 (winner by lower longitude, not the
   rule), Debilitated ×0.5, combust ×1.2 for "non-living" topics (a bonus for combustion, still), Neecha
   Bhanga → acts exalted ×1.2 (SOURCES §4.1 states it as policy; BPHS does not say cancellation = exaltation).
3. **Dependency groups are typed, not applied.** `dependencyGroup` is set on terms; Promise still sums every
   term then squashes with 50(1−e^(−raw/25)). Squashing does not remove double counting; it hides it.
4. **Registry is a stub**: every entry has `sourceText: "Unknown"`, `description: "TBD"`, most
   `epistemicStatus: CLASSICAL_FACT` including the +15 yoga bonus and transit synergy. The directive's own
   rule (no heuristic labelled classical) is violated by the registry itself.
5. **weights.json holds 5 numbers**; the other ~60 constants (12/8/4/15/18/25, sigma 25/7, 0.8/0.2 influence,
   Sade Sati 15/20/10, Upachaya +15, Jaimini "resonance" 15) remain inline. Weight-version traceability is nominal.
6. **Invented mechanisms with physics names**: "Jaimini Resonance Vector", "Varga Eigenstate Validation",
   "Gaussian dasha-sandhi friction (peak 18, σ 25 d)", "kakshyaWave". None cites a text; all carry large
   points. Rename to what they are (heuristics) and put them through ablation before they stay.
7. **Ranking span**: the backtest ranks event windows within 2014–2026 (133 windows), not the lifetime.
   Percentiles change with the span you choose; v4.5 uses birth→+70 y so charts compare.
8. **Sample sizes**: validation and holdout are 4 events each; a single event moves the mean by ~20 points.
   No confidence intervals reported. Top-3 recall is 0 everywhere — the engine never puts an event in its top 3.
9. **Bugs**: backtest prints `I = undefined` (renderer reads `eventIScore`, trigger emits `I`); 8 TypeScript
   errors (`PlanetRow` not imported in compute.ts, impossible comparisons in the Vedha block, wrong types in
   sensitivity.ts); 14 one-off codemod scripts (`update_*.ts`, `rewrite_*.ts`, `patch_v4.ts`) checked into src/.
10. **Trigger model selection by env var** (`STARS_TRIGGER_MODEL`) is not recorded in the output, so a result
    cannot be traced to the model that produced it.

## What is good — keep and merge
- P / A / F / I / V as separate outputs; direction no longer masquerades as intensity.
- Train / validation / holdout split and synthetic null controls in the backtest (first in either project).
- Doctrine profile type, rule-ID plumbing, `explain` and `ablation` CLI modes, sensitivity harness (±minutes).
- Boundary-aware splitting of PD windows at slow-transit ingress (started in `scanV4`).
- Capped influence bonus (≤0.25) and c ≤ 1.0 — the V1 sum explosion is contained.
- Vipareeta Raja Yoga nullifying the dusthana penalty; Shadashtaka/Dwidvadasa between MD and AD lords.
- Topic catalogue (divorce, inheritance, surgery, litigation, competition…) — coverage per topic is mostly 10 %.

## How to reach real predictability (both engines)
1. **Data, not rules.** 20 events per chart cannot distinguish a good rule from a lucky one. Target 10–20 charts
   with hospital-grade times and 15–25 dated events each, valence-labelled. Collect blind: engine commits
   first (retrodict), subject grades hit/partial/miss.
2. **One benchmark harness both engines run**: fixed lifetime percentile; random-window null controls by
   construction (expected 25 % in top quartile); metrics = enrichment lift with Wilson CI, per topic,
   leave-one-chart-out; valence accuracy as its own metric; month-level top-k hit rate.
3. **Remove before adding**: every heuristic must show positive held-out lift in ablation or be deleted.
   Start with the Nadi rescue, the ×0.2 cliffs, the combust bonus, the +15 blocks.
4. **Implement dependency-group aggregation** (max within group, sum across groups) and measure it.
5. **Boundary-aware atomic intervals** (dasha + ingress + station + orb) with month-level scoring.
6. **Report birth-time stability** per conclusion and exclude unstable charts from calibration.
7. **Merge**: one codebase — Haleys' registry/doctrine/sensitivity/ablation + v4.5's single-primary
   signification, dasha-gated transits and lifetime percentiles — with the benchmark as the gate for every change.
