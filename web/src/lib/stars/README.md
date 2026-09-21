# Stars Engine v3.5 — deterministic implementation

Code port of the "Vedic Astrological Execution Engine v3.5 (Deterministic & Parser-Locked)" directive.
The directive is written as an LLM system prompt; this module implements every part of it that can be
made deterministic, and leaves only free-prose narrative out (Part B is emitted as tagged fact lines).

**Core law honoured:** the engine has no ephemeris. It never computes a planetary position, retrograde,
transit or divisional chart. Everything comes from tables you type in from an official chart
(Jagannatha Hora, AstroSage, Parashara's Light, a printed kundali, …). It only does *table lookups*
on what you supply (nakshatra, star lord, dignity, combustion-by-orb) and logs each one as `derived`.

## Run

```bash
cd web
npm run stars -- ingest  path/to/chart.json                 # Mode 1  — INGEST DATA
npm run stars -- execute path/to/chart.json path/to/query.json   # Mode 1.5 + Mode 2 — EXECUTE ENGINE
npm test                                                     # engine unit tests
```

Sample inputs (fictional chart): `fixtures/sample-chart.json`, `fixtures/sample-query.json`.

## What you must supply (chart.json)

| Field | Required | Where it comes from on a chart |
|---|---|---|
| `meta.ayanamsa` | yes | Must say Lahiri / Chitra Paksha. Anything else is logged as *discarded*. |
| `ascendant.sign`, `.degree` | yes | Lagna row of the planetary table. Degrees as `12°34'56"`, `12:34:56` or `12.58`. |
| `planets[]` (9 rows) | yes | Sign + degree **within the sign**, `retrograde` flag. `combust` optional (derived by orb if omitted). |
| `bhavaChalit[]` | optional | Cusp sign/degree per house and the planets the Chalit table puts in each bhava. Without it, Step 3 falls back to whole-sign. |
| `sav[12]` | optional | Sarvashtakavarga bindus per house 1..12 (should total 337). Without it the 15-pt SAV floor is 0 and confidence is *Indeterminate*. |
| `bav` | optional | Per planet, per sign, the list of contributors that gave a bindu. Only needed for Step 18 bindu verification. |
| `shadbala[]` | optional | Total points, ratio, dig bala per planet. Without it Step 9 is excluded. |
| `dashas[]` | yes | Vimshottari rows: `level` MD/AD/PD (SD/PrD if you have them), planet, ISO start/end, `parent` chain. |
| `vargas.D9 / D10 / D4 / D7` | per query | Varga ascendant + sign per planet. Missing relevant varga → HALT (or `proceedWithoutVarga`). |
| `panchang` | optional | Tithi, Vara, Nakshatra, Yoga, Karana. |

## What you must supply per query (query.json)

- `text` — your question. A keyword classifier picks the topic → target houses and required varga
  (career→H10/D10, marriage→H7/D9, property→H4/D4, children→H5/D7, wealth→H2+H11, …). Override with `target`.
- `targetDate` — the date/window the question is about (drives the dasha drill-down).
- `transits` — Saturn, Jupiter (sign, degree, R/D) and Rahu/Ketu, as of that window. Timing queries HALT without them.
- `proceedWithoutVarga: true` — the "PROCEED WITHOUT VARGA" bypass.

## Interpretation decisions (where the directive is silent)

These are documented choices, not spec. Each appears in the output tagged `Engine Inference`.

1. **"Connect" (Dasha engine):** a dasha planet connects to the target if, in the Rasi chart, it is the
   *lord* of, *occupies*, or *casts a Parashari aspect* on a target house. Star-lord and dispositor links are not counted.
2. **Double transit:** Saturn/Jupiter *occupy or Parashari-aspect the target house* (whole sign from Lagna).
   The popular variant that also checks the house lord is not scored.
3. **Varga confirmation:** the D1 lord of the target house is looked up in the varga. Exalted / own / moolatrikona → +15;
   debilitated or in 6/8/12 from the varga lagna → 0; *anything in between → 0 and an integrity flag* (see flaw 4).
4. **Multiple target houses:** the best SAV among them is scored; a connection to any of them counts.
5. **Jaimini karakas:** 7-karaka scheme (Rahu excluded). Arudhas use the standard 1st/7th → 10th exception.
6. **Yogas:** a small verified set only (Gajakesari, Budhaditya, Chandra-Mangala, Pancha Mahapurusha,
   Neecha Bhanga, Kemadruma, Dharma-Karmadhipati).
7. **Combustion orbs:** Moon 12°, Mars 17°, Mercury 14°/12°R, Jupiter 11°, Venus 10°/8°R, Saturn 15°.
8. **Mrityu Bhaga:** Jataka Parijata table, matched when the planet is inside that degree. Verify against your text.
9. **Contradiction matrix:** derived from dignity, house placement, SAV band, retro/combust, benefic/malefic
   occupation and aspects on the target, plus dasha-lord condition. Weights are fixed heuristics.

## Flaws found in the v3.5 directive

1. **Zero-ephemeris mandate makes "test with my birth details" impossible on its own.** Birth date/time/place
   are useless to the engine; you must first generate a chart elsewhere and transcribe its tables. Any transcription
   error propagates silently (the engine only catches Rahu/Ketu asymmetry, SAV total ≠ 337, date order, and Chalit-vs-Rasi jumps).
2. **SAV band gap:** `>28 strong`, `25–27 moderate`, `<25 fragile` — a house with exactly **28** bindus is in no band.
   Implemented as moderate (+7) with an integrity flag.
3. **Dasha scoring gap:** `+40 if MD/AD connect, +20 if only PD connects` — MD-only vs AD-only are not distinguished,
   and "connect" is undefined. See decision 1.
4. **Varga scoring gap:** `+15 if dignified, 0 if debilitated / 6-8-12 / bypassed` — a lord in a friend's or neutral
   sign in a good house is unspecified. Implemented as 0 (conservative) with a flag.
5. **Bypass double-counting:** Mode 1.5 says bypass "incurs a 15-point deduction"; Phase 1 Step 4 says "award 0 points".
   Both can't apply (max varga points is 15). Implemented as 0 points, no extra deduction.
6. **Step 17 asks for Sookshma and Prana levels, but the Mode 1 timeline table only ingests MD/AD/PD.** Drill-down
   stops at PD unless you add SD/PrD rows.
7. **Step 18 (Kakshya) needs Bhinnashtakavarga contributors, but Mode 1 only ingests SAV totals.** With SAV alone
   the engine can name the kakshya lord but cannot verify a bindu. Optional `bav` input added.
8. **Step 2 wants Tithi/Vara/Nakshatra/Yoga/Karana, but no Mode 1 table carries them.** Added an optional `panchang` block.
9. **Transit Rahu/Ketu are demanded at the HALT but never used by the matrix** (only Saturn and Jupiter score).
10. **Step 6 Mrityu Bhaga needs a degree table the directive never supplies**; tables differ between texts.
11. **Rank 1–7 Shadbala excludes Rahu/Ketu**, yet the Dasha engine routinely runs Rahu/Ketu periods — their strength is never assessed.
12. **"Confidence: Indeterminate" is never defined.** Implemented as: SAV missing, or a timing query with no dasha row / no transits.
13. **Specificity ceilings interact badly with bypass:** with varga bypassed the maximum is 85, so "High Convergence"
    requires a perfect score on everything else.
14. **"Lahiri (Chitra Paksha) Vimshottari"** conflates an ayanamsa with a dasha system; treated as Lahiri ayanamsa + Vimshottari dasha.
15. **Rasi vs Chalit rule is only partly actionable:** Chalit "dictates the physical house of manifestation" but no scoring
    step consumes it; it is reported (Step 3, Part B) but cannot change points.
