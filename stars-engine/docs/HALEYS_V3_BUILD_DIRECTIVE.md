# Haleys V3 — Build Directive (paste into your coding agent verbatim)

**Target repository:** Haleys V2.0 (`src/src/*.ts`, `src/config/weights.json`, `src/rules/registry.json`).
**Goal:** turn a rule-rich but unvalidated engine into a measured one. Efficacy is defined by the benchmark in
Phase 0, not by inspection. Every phase ends with a command that must pass before the next phase starts.
**Rules for the agent:** do not invent astrological rules; do not rename classical concepts with physics
words; do not tune any weight on the same events that report the result; label every number that is not
from a text as `HEURISTIC_SCORE`; keep `npm run typecheck` and `npm test` green at every commit; one commit
per numbered item below, message = the item's heading.

---

## Phase 0 — Benchmark harness (build this first; nothing else is measurable without it)

### 0.1 Dataset format — `bench/datasets/<name>/`
```
chart.json            # ChartInput incl. compute{birthDate,birthTime}; hospital-grade time required (meta.birth.timeSource: "hospital"|"memory")
events.json           # [{ id, date:"YYYY-MM-DD", dateCertainty:"day"|"month"|"quarter", topic, valence:"favourable"|"adverse"|"mixed", magnitude:1|2|3, label, split:"train"|"validation"|"holdout" }]
README.md             # provenance; who graded; blind or not
```
Ship two datasets now: `sarvesh` (his 20 events, 03:24) and `vinayak` (21 events, 10:35 Bijapur city 16°50'N 75°43'E).
Reject any chart with `timeSource:"memory"` from calibration; allow it in reporting with a flag.

### 0.2 Reference distribution and percentiles — `src/bench/percentile.ts`
- For each chart × topic, compute the trigger score for **every Pratyantar window from birth to birth+70y**
  (transits sampled at window entry/mid/exit). Cache by chart hash + topic + engine version.
- `pct(T)` = share of lifetime windows with score < T. All reporting uses `pct`, never raw T.
- Delete the 2014–2026 ranking span in `backtest`; ranking is always lifetime.

### 0.3 Metrics — `src/bench/metrics.ts` (all with Wilson 95% intervals)
- **Lift@25** = P(event window in top quartile) / 0.25. Chance = 1.0.
- **Mean percentile** of event windows (chance = 50).
- **Top-k monthly hit rate**: does an event fall inside the engine's top-k months per topic per decade (k = 6)?
- **Null control**: 200 random dates per topic, same pipeline → their top-quartile rate must be 25 % ± 3; if not, the percentile code is wrong.
- **Valence accuracy**: engine V vs labelled valence, only for events with valence ≠ mixed.
- **Coverage**: share of lifetime with `pct ≥ 85` must be 15 % by construction; report share with raw T ≥ 62 as a secondary sanity number.
- **Birth-time stability**: rerun at ±5 min; report % of event percentiles that move > 20 points.
- Report per topic and pooled; per split; and **leave-one-chart-out** when ≥ 3 charts exist.

### 0.4 CLI — `stars bench <dataset-dir|all> [--model NAME] [--ablate FAMILY,…]`
Output: `bench/results/<timestamp>-<engineVersion>-<model>.json` + a markdown table. The JSON must contain
`engineVersion`, `weightsHash`, `triggerModel`, `doctrineProfile`, `ablations`, and the full per-event rows.
`--ablate` accepts: `dasha`, `transit`, `varga`, `sav`, `yoga`, `nadi`, `synergy`, `inheritance`, `loss`.

**Acceptance:** `stars bench all` runs both datasets, null control passes, output JSON validates against `bench/schema.json`.

---

## Phase 1 — Correctness and hygiene (small, mandatory)

1.1 Fix the 8 TypeScript errors (`PlanetRow` import in compute.ts; impossible literal comparisons in the Vedha
    block; `sensitivity.ts` sign typing; `scratch-trace.ts` transits type). `npm run typecheck` exits 0.
1.2 Backtest renderer reads `eventIScore`; trigger emits `I`. Unify on `I`. No `undefined` in any table.
1.3 Move `update_*.ts`, `rewrite_*.ts`, `patch_v4.ts`, `enhance_v4.ts`, `add_*.ts`, `extract_rules.ts`,
    `build_glossary.ts`, `shift_vinayak.ts`, `split_events.ts`, `scratch-trace.ts` out of `src/src/` into
    `tools/codemods/` (or delete). `src/` contains only runtime code and tests.
1.4 Record `STARS_TRIGGER_MODEL` (and doctrine profile, weights hash) in every output header and in the backtest JSON.
1.5 `ingest.ts` must not statically import `compute.ts` (sweph). Lazy-load; add the isolation test.
1.6 Strip version strings from file headers; export `ENGINE_VERSION` from one place; print it everywhere.

---

## Phase 2 — Knowledge base: registry becomes real

2.1 `rules/registry.json` — every entry must have real `sourceText` (BPHS chapter/verse, Phaladeepika chapter,
    Jaimini sutra, or "K.N. Rao, double transit, practitioner rule") and a non-TBD description. Entries that
    cannot be sourced get `epistemicStatus: "HEURISTIC_SCORE"`. Add a test: no `"Unknown"`, no `"TBD"`.
2.2 Every `terms.push` in `v4.ts` carries `ruleId`; a test walks a full run on both datasets and asserts zero
    orphan ruleIds and zero unregistered ruleIds.
2.3 Classical facts vs model numbers: the registry entry holds the **fact**; `config/weights.json` holds the
    **number**. `v4.ts` may not contain a numeric literal in a `points:` or multiplier position — move all
    ~60 inline constants (12/8/4/15/18/25, σ 25/7, 0.8/0.2, Sade Sati 15/20/10, Upachaya 15, "resonance" 15,
    influence 0.8/0.5, caps 0.25/0.75) into `weights.json` under named keys. Add a lint test that greps
    `v4.ts` for `points: <number>` and fails.
2.4 Rename to plain terms: "Jaimini Resonance Vector" → `jaimini_ak_karaka_activation`; "Varga Eigenstate
    Validation" → `varga_dignity_multiplier`; "kakshyaWave" → `kakshya_bindu_factor`; "Gaussian sandhi friction"
    → `dasha_sandhi_friction`. Descriptions say what the rule does and where it comes from.
2.5 Node doctrine: wire `doctrine.dignityScheme` and `aspectScheme` through `dignityOf` and `aspectsHouse`
    (nodes 5/7/9 on/off). Snapshot test: same chart, two profiles → diff only in doctrine-gated terms.

---

## Phase 3 — Logic fixes (each is one commit; each is benchmarked before/after with `stars bench all`)

3.1 **Connection = max, one inheritance level.** In `connection()`: `c = max(cands)`. Inheritance: for nodes,
    `max(own, 0.8·dispositor, 0.8·strongest conjunct)`; for every planet, `max(own, 0.6·starLord)`. Delete the
    "influence" loop over aspecting/cohabiting planets. Delete the Nadi trine rescue (`if c<0.6 → 0.6`); if you
    want it, re-add it as a ≤ 0.2 additive confirmation only when `c ≥ 0.5` already, and benchmark it.
3.2 **Remove cliff multipliers.** Gandanta/Sandhi ×0.2 → ×0.8 with a `sensitive` tag; Graha-yuddha loser ×0.2
    → delete the yuddha function (winner-by-lower-longitude is not the rule; brightness/latitude is) or implement
    it properly from sweph latitudes; Debilitated ×0.5 → ×0.7; combust: never a bonus — ×0.7 for all topics,
    ×1.0 if cazimi (< 0°17'); Neecha Bhanga → multiplier 1.0 (cancellation ≠ exaltation); Vargottama ×1.15.
3.3 **Single primary house per topic.** `SIGNIFICATIONS[*].primary` has exactly one house; move the rest to
    `secondary` (weight 0.5). Keep the topic catalogue; add `romance` (5) distinct from `marriage` (7),
    `business` (7) distinct from `career` (10). Coverage per topic at raw T ≥ 62 must fall to ≤ 25 % on both datasets.
3.4 **Dasha-gated transits.** `transitPoints *= 0.5 + 0.5·max(c_MD, c_AD, c_PD)`. Transit targets = house sign,
    lord's sign, house-from-Moon sign only (remove lagna, karaka signs, active dasha lords' signs from targets).
3.5 **Trigger aggregation**: keep the four models behind `--model`; default = `JOINT_BASE_SYNERGY` until Phase 5
    picks a winner on held-out charts. A = max(dasha, transit) + 0.8·min(...) if both > 10. F likewise on the loss side.
3.6 **Loss axis**: marakas (2/7 from the bhava) only for person-signifying topics; 8/12/6 from the bhava for
    all; Badhakesha 0.7; retrograde malefic ×1.25; Sade Sati phases 4/6/3 points (not 15/20/10) — the 7.5-year
    span must not put F ≥ 60 for a third of adult life; check on both datasets.
3.7 **Valence V**: `balance = A − 1.2·F + 10·tone`; keep. Remove the "F > 60 ⇒ adverse" override unless the
    F scale is re-normalised after 3.6; re-benchmark valence accuracy.
3.8 **Dependency groups applied**: each Promise term has `dependencyGroup ∈ {house:H, planet:P, yoga:Y,
    varga:V}`; aggregate = Σ over groups of (max term in group + 0.3·Σ remaining terms in group). Then the
    exponential squash. Benchmark with and without (`--ablate dependency`).

---

## Phase 4 — Timing model

4.1 **Atomic intervals**: boundaries = MD/AD/PD/SD starts, Jupiter/Saturn/Rahu sign ingress, Saturn/Jupiter
    stations (speed sign change from sweph, ±0 days), aspect-orb entry/exit for Jupiter/Saturn on the target
    (orb 3° for occupation edge, 5° for aspect). Score each atomic interval; merge adjacent intervals whose
    active term set is identical. Output the merged intervals with their term sets.
4.2 **Sookshma level**: compute the tree to SD; use SD boundaries only in atomic intervals, not for ranking windows.
4.3 **Month-level top-k**: the benchmark's top-k hit rate uses the atomic intervals aggregated to months.
4.4 **Retro/station**: replace the "retro flag changed between samples ⇒ ×2" rule with an exact station date
    from sweph speed; apply a ×1.3 within ±10 days of a station on the target sign, else ×1.0.

---

## Phase 5 — Model selection and calibration (only after Phases 0–4)

5.1 Run `stars bench all --model {BASELINE_V1_1, ADDITIVE_NORMALIZED, CLASSICAL_SYNERGY, JOINT_BASE_SYNERGY}`;
    pick by pooled held-out Lift@25 with CI; ties → simpler model.
5.2 Ablations: `dasha`, `transit`, `varga`, `sav`, `yoga`, `nadi`, `synergy`, `inheritance`, `loss`,
    `dependency`. A family stays only if its removal lowers held-out Lift@25 or valence accuracy. Publish the table.
5.3 Weight fitting: only on `train` splits, only ≤ 6 weights at a time, coordinate search on `weights.json`,
    report validation and holdout separately; never touch holdout during fitting. Store `weights.<version>.json`.
5.4 Calibration of V and of an "activation probability": isotonic regression from `pct` to observed event
    frequency, fitted on train, reported on holdout with reliability diagram. Until this exists, no output may say
    "probability" or "%": the field stays `activationScore`.
5.5 Minimum data before any claim: ≥ 8 charts, ≥ 120 events, ≥ 3 charts in the held-out set. Below that, every
    report carries the banner `UNDERPOWERED: N charts / M events — indicative only`.

---

## Phase 6 — Must-have product features

6.1 `stars retrodict` defaults to `p85` (lifetime percentile), prints coverage, and writes a sealed file
    (`sha256` of the output + timestamp) so a blind test cannot be edited after grading.
6.2 `stars explain <chart> <ruleId>` returns the evidence tree as JSON with `MISSING` leaves, not prose.
6.3 `stars sensitivity <chart> <question>` reports each conclusion as `stable | sensitive | unstable` under
    ±1/±5/±15 minutes and flags any conclusion that depends on a lagna within 3° of a sign boundary.
6.4 Every human-readable output has three sections in this order: **Natal promise**, **Timing windows
    (with percentiles and tags)**, **What the engine refuses to say** (non-conclusions), and ends with the
    engine version, weights hash, doctrine profile, and birth-time source.
6.5 The agent contract (`SKILL.md`): the operating AI may quote only what the CLI printed; may not add
    planets, yogas, remedies, or dates; must state the birth-time source and the UNDERPOWERED banner if present.

---

## Phase 7 — Data programme (the real lever on predictability)

7.1 Recruit 8–15 subjects with hospital-recorded birth times. Each supplies 15–25 dated events with
    valence and magnitude, graded **after** the engine's sealed retrodiction (6.1) is delivered to them.
7.2 Event taxonomy: career, business, wealth, marriage, romance, children, property, health, education,
    competition, foreign, siblings, mother, father. One topic per event; magnitude 3 = life-changing.
7.3 Store datasets in `bench/datasets/`; never mix subjects' data into weights without the split rules in 5.3.
7.4 Publish the benchmark table with every engine version; a change that lowers held-out Lift@25 is reverted.

---

## Acceptance checklist (the agent reports each line with the command output)
- [ ] `npm run typecheck` = 0 errors; `npm test` all green; no codemod scripts under `src/`.
- [ ] `stars bench all` produces JSON; null control within 25 ± 3; coverage at p85 = 15 %.
- [ ] Registry: zero `Unknown`/`TBD`; zero orphan ruleIds; `v4.ts` has no numeric `points:` literals.
- [ ] Coverage at raw T ≥ 62 ≤ 25 % for every topic on both datasets after Phase 3.
- [ ] Held-out Lift@25 and valence accuracy reported for every model and every ablation.
- [ ] Every output prints engine version, weights hash, doctrine profile, trigger model, birth-time source.
- [ ] No output contains the words "probability" or "%" for uncalibrated scores.
