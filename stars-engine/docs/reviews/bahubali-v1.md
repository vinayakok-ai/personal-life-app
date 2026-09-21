# Review — "Bahubali v1" fork (received 2026-09-21)

Fork of stars-engine v4.2. Changes are confined to `v4.ts` (388 lines), `v4-run.ts` (P(Success) column) and
`tables.ts` (Vedha and Rasi-drishti tables). The package as shipped does not compile (`LifeEvent` type deleted,
three impossible comparisons in the Vedha block) and lacks `examples/`, so 11 of 15 tests fail until patched.
Reviewed copy of its `v4.ts` is beside this file.

## Measured on the same chart and events (10:35 hospital time, 14 events both versions can score)

| | Bahubali v1 | stars-engine v4.4 |
|---|---|---|
| Mean percentile of event windows | 56 | 51 |
| Events in top quartile | 6/14 | 3/14 |
| Coverage: share of 2005–2026 flagged (T ≥ 62), career | 83 % | 19 % |
| … wealth | 99 % | 82 % |
| … health | 100 % | 60 % |
| … education | 94 % | 58 % |
| … marriage | 41 % | 0 % |
| P(Success) values across the 14 event windows | 40 % on 9 of 14 rows | n/a |

Reading: the fork ranks slightly better but by flagging nearly the whole life. A model that says "career event"
83 % of the time cannot be wrong, and cannot be useful. v4.4 also regressed on coverage after the inheritance
rules (wealth 82 %, foreign 87 %) and needs the same fix.

## What is good in the fork (keep)
- Chalit occupancy counted as a connection (0.9) — the v3.5 rule finally used.
- Parivartana with the house lord = 1.0; Argala 0.3; Rasi-drishti for the chara-karaka; Badhakesha 0.7 on the loss axis.
- Sade Sati split into three phases with distinct weights; retrograde malefics ×1.5 on the loss axis.
- Dusthana-lord loss exempted for the primary lord / yogakaraka / strong dignity.
- Vedha (Gochara obstruction) as a concept.

## What is wrong (fix or revert)
1. **Connection = sum, not max, plus transitive "influence".** Every planet that aspects or shares a house with a
   connected planet inherits half its score; nodes inherit dispositor + all conjuncts in full. With whole-sign
   aspects almost every planet ends up connected → coverage 83–100 %. Revert to max; inherit once (dispositor
   or star lord), never transitively. Cap 1.0, not 1.2.
2. **Point sizes out of scale.** Gajakesari +15, Mahapurusha +15, Kuja dosha −15, Kartari ±10 on a model whose
   other terms are ±3…8. One yoga now decides P. Keep yogas at ≤ 8.
3. **Combustion as a bonus (+3, "illuminated") for non-living topics; dMul 1.2 for combust dasha lords.** No
   classical source; combustion weakens uniformly (cazimi excepted). Revert to −8.
4. **Retrograde exalted → debilitated, retrograde debilitated → exalted.** A contested Phaladeepika reading applied
   as a hard flip. At most a tag; never a sign change of the dignity term.
5. **Neecha Bhanga scored +8 (= exaltation).** Cancellation removes the debility; it does not confer exaltation. Use 0.
6. **Multipliers that zero a planet:** Mrita avastha ×0.2, Vriddha ×0.5, Gandanta ×0.2, Graha-yuddha loser ×0.2.
   Baladi avastha is a minor factor in BPHS; Graha-yuddha winner is not "lower longitude" (it is brightness /
   northern latitude). These make the dasha axis flicker on 1–6° differences. Remove or cap at ×0.7.
7. **Transit targets now include the lagna, karaka signs and the active dasha lords' signs.** Jupiter or Saturn then
   always hit something → the transit term saturates. Keep house, lord and Moon-house only.
8. **"Stationary" detection doubles transit points when the retro flag differs between the three samples.** A
   4-month window is not a station; stations are ±10 days around the date. Compute from speed and orb instead.
9. **Vedha is dead code as written:** the TransitInput carries only Saturn, Jupiter, Rahu, Ketu, so no obstructing
   planet can ever be in the vedha sign except Saturn/Jupiter to each other; the block also compares string
   literals that cannot match (TypeScript flags it). Needs the full transiting set (Sun, Mars, Mercury, Venus)
   to mean anything.
10. **P(Success) = sigmoid(0.15·(Tgain−Tloss)) with ad-hoc ×0.1 / ×0.4 / cap 30.** Not a probability: it is not
    calibrated against any outcome frequency, and it collapses to 40 % on most rows. Either calibrate it on
    the backtest (fraction of windows in this band that carried an event) or call it a "direction index".
11. **PD weight 10 → 20 without changing the /90 scaling** → T can exceed 100 and is clamped; the axes are no
    longer comparable across versions.
12. **Sade Sati loss 15/20/10 points**: with SS lasting 7.5 years, the loss axis is ≥ 60 for a third of adult life.
    Scale to 4/6/3 or make it a tag with a topic filter (mind/health/family).
13. **Family topics deleted** (siblings, mother, father) and replaced by "competition" — three of this native's
    dated events lose their topic. Add, don't replace.
14. **YOGAKARAKAS table defined but never used**, and it mixes functional benefics with true yogakarakas
    (Aries lists Sun/Jupiter/Mars; the strict yogakaraka is none).
15. Shipping hygiene: no examples, broken types, tests red, no changelog of intent. A fork should pass
    `npm test` and `npm run typecheck` before it is shared.

## What both versions need next (the actual precision problem)
- **Specificity budget**: report every T as a percentile of the native's own window distribution for that topic
  (the backtest already computes it). A fixed threshold of 62 means different things in different charts.
- **Hold-out**: choose rules on events before 2016, test on events after; never tune on all 18.
- **Shadbala / Bhava Bala** for the 10:35 chart (AstroSage PDF) — several Promise terms are dormant without them.
- **More events**: 30+ dated events with topics; at 14–18 the percentile metric moves ±10 on one event.
