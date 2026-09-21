# Stars Engine v3.5 — deep-dive review and v4 proposal

Written after implementing v3.5 deterministically and running it on a real chart (Scorpio lagna,
Rahu MD / Sun AD, marriage query, Sept 2026). File references are to this module.

## 0. Why the results disappoint — the root causes

1. **The matrix adds a static "promise" to a dynamic "trigger" and reads the sum as timing.**
   SAV (15) and Varga (15) never change across windows. For the marriage question both were 0, so the
   ceiling was 70 for every window until 2032, and 55 was the best any window could score. The engine then
   said "Astrological Veto" — for every date. A sum cannot distinguish *"the chart does not promise this"* from
   *"the promise is there but not yet triggered"*, which is the one distinction a querent needs.
2. **Binary, degenerate connection rules.** The 40 Dasha points came from "AD Sun aspects H7". The Sun is in
   the 1st house; *every* planet in the 1st aspects the 7th, so any planet in lagna gives full marks to marriage,
   career (10th? no) — the rule is topologically accidental. Saturn's aspect on the 7th scored +15 "supports" although
   classically it is the delaying influence.
3. **Most of the 19 steps compute things nothing consumes.** Avasthas, Sambandha, Karakas, Arudhas,
   Shadbala, dignity, retro/combust, Chalit — all printed, none scored. The Part A terminal looks rigorous and is decorative.
4. **The zero-ephemeris law protects the wrong thing.** Ephemeris software is the most reliable link in the
   chain; human/LLM transcription of tables is the least reliable. The law also makes the engine blind to
   Sookshma/Prana, BAV kakshyas and vargas whenever a PDF prints them as diagrams (AstroSage does).
5. **No calibration.** Thresholds 85/60/35 and 28/25 are asserted, not measured. Nothing in the spec asks the
   engine to test itself against the querent's own past events, though dashas and transits are fully computable for the past.

## 1. Mode 1 — Ingestion

| # | Flaw | Effect on your run | Fix |
|---|---|---|---|
| 1.1 | Only SAV totals ingested, but Step 18 needs Bhinnashtakavarga (per-planet, per-contributor) | Kakshya bindu "unverifiable" | Ingest/compute Prastarashtakavarga; SAV alone cannot drive a transit rule |
| 1.2 | Timeline table stops at PD, Step 17 wants Sookshma/Prana | Drill-down stopped at PD | Compute the tree from the Moon (verified against printed MD/AD to ±2 days here) |
| 1.3 | Vargas "diagram only → missing" | D9/D10 HALT, then 0 pts on bypass | Compute vargas from degrees (pure arithmetic, verified against diagrams) |
| 1.4 | Panchang required by Step 2, no table for it | Had to add one | Add a Panchang table to Mode 1 |
| 1.5 | Mixed-ayanamsa PDFs go undetected unless the parser looks per section | AstroSage's Pratyantar was KP | Require an ayanamsa tag per table and reject mismatches individually |
| 1.6 | Shadbala rank 1–7 excludes nodes; Bhava Bala (printed in the same table) unused | Rahu MD has no strength score | Ingest Bhava Bala; add node strength via dispositor/star-lord rule |
| 1.7 | No consistency checks specified | We added Rahu/Ketu 180°, SAV=337, first-MD-vs-Moon-star | Make an integrity checklist mandatory: node axis, SAV total 337, BAV row totals, dasha balance vs Moon, ascendant vs cusp table, Rasi vs Chalit shift ≤ 1 house |
| 1.8 | Mrityu Bhaga table never supplied; texts disagree | Engine table flagged "verify" | Either supply the table in the spec or drop MB from Step 6 |

## 2. Mode 1.5 — Gates

- **Bypass penalty is stated twice, inconsistently** ("15-point deduction" vs "award 0"). Choose one. With a
  15-point component the two are the same thing; a *deduction* on top of 0 would be double counting.
- **Transit HALT demands Rahu/Ketu that nothing scores.** Either score the nodal axis (it matters for the 1/7
  axis in marriage) or stop asking.
- **No HALT when SAV is missing**, although the matrix has a 15-point SAV term. Gate should be symmetric with the matrix.
- **"Timing required" is decided by keywords.** Practically every "will X happen" is a timing question. Default to
  timing = true and let the user opt out.

## 3. Mode 2 — the 19 steps

| Step | Flaw | Fix |
|---|---|---|
| 1 Query isolation | Collapses a topic to one house. Marriage classically = H7 + H2 + H11, Venus (karaka), UL, DK, D9 lagna/7th lord | Define a **signification set** per topic: primary houses, secondary houses, karaka, arudha, varga lagna + varga house. Weight them. |
| 3 Rasi vs Chalit | Chalit "dictates manifestation" but no scoring step consumes it | Either use Chalit house for occupancy scoring (with Rasi for lordship) or delete the step |
| 4 Varga | Scores only "D1 house lord placed in varga"; ignores varga lagna lord, varga 7th, karaka in varga, varga dignity when not in 6/8/12 | Score varga as a mini-chart: varga lagna lord strength, varga primary house lord strength, karaka's varga dignity |
| 5 Star lords | Collected, never used. The one KP idea that helps timing (dasha lord in the star of the house lord) is missing | Add star-lord linkage to the "connect" rule |
| 6 Sensitivity | Gandanta/Sandhi/MB noted, no effect | Convert to a Promise-axis penalty (e.g. −10 if primary lord in gandanta/sandhi) |
| 7 Dignity | Not scored | Promise axis: exalted +10, MT/own +8, friend +3, neutral 0, enemy −3, debilitated −8 (cancelled → 0) |
| 8 Avasthas | Not scored, and Baladi avastha is a weak indicator | Drop, or fold Mrita only as −3 |
| 9 Shadbala | The best strength measure in the input, unused | Promise axis: lord's Shadbala ratio scaled (ratio ≥1.2 → +10; <1.0 → −5) |
| 10 SAV | Band gap at exactly 28; scored as house strength, which is a *natal* fact | Bands: ≥30 strong, 25–29 moderate, ≤24 fragile. Move to Promise axis. For transits use the **transiting planet's BAV bindus** in the sign (≥4 favourable), which is the actual Ashtakavarga transit rule |
| 11 Retro/Combust | Not scored | Promise: combust lord −8 (−4 if within 3° of exact cazimi), retrograde lord "delay" tag not a penalty |
| 12 Sambandha | Computed, unused | Use compound relationship for dispositor quality (lord in bitter enemy's sign −3) |
| 13 Aspects | Whole-sign, no strength; Saturn/Mars aspects scored as neutral notes | Use degree-based Parashari drishti strength (or the Drik Bala already in the Shadbala table). Benefic aspect on primary house +, malefic − |
| 14 Yogas | "Identify verified classical combinations" is unbounded | Enumerate topic-relevant yogas only (marriage: Kalatra-related, Venus-Jupiter links, Papa-kartari on 7th, Manglik logic with cancellations) |
| 15–16 Jaimini | AK/AmK/DK, AL/UL computed, unused; the PDF's Chara Dasha is ignored | DK and UL join the signification set; Chara Dasha becomes an optional confirmation term in the Trigger axis |
| 17 Dasha | "Connect" undefined; no MD-only vs AD-only distinction; PD weight arbitrary | See §5 connection rule |
| 18 Kakshya | Needs BAV; also transits from the Moon (Chandra lagna), Sade Sati, and nodal transits are absent | See §5 transit rule |
| 19 Convergence | Simple sum | Two-axis grid |

## 4. Module 3 — the matrix

- Dasha 40 / Transit 30 / SAV 15 / Varga 15 mixes axes (see §0.1).
- Connection is binary and rewards the wrong thing (aspect = lordship).
- Saturn's aspect and Jupiter's aspect are interchangeable (+15 each).
- Specificity bands (85/60) are unreachable for any question whose static terms are 0: the engine vetoes by construction.
- "Indeterminate" confidence undefined.
- Timing-gate 35 is one point above "MD/AD connects + nothing else" (40) — it gates nothing in practice.

## 5. Proposed v4 scoring (drop-in rules)

**Promise axis P (0–100, static per topic).** For the signification set S = {primary house H, secondary houses, karaka K, varga V}:
- Lord of H: dignity (−8..+10) + Shadbala ratio (−5..+10) + placement (kendra/trikona +6, dusthana −8, in H itself +8) + combust/gandanta penalties.
- H itself: SAV (fragile −8, moderate 0, strong +8) + Bhava Bala rank (top 4 +5, bottom 4 −5) + occupants/aspects by Drik Bala sign (benefic +, malefic −, capped ±10).
- Karaka K: dignity + combustion (marriage: Venus; career: Sun/Saturn/Mercury; children: Jupiter).
- Varga V: V-lagna lord dignity + V-house lord dignity + K's dignity in V (each −5..+5).
- Secondary houses: half weight of H.
- Normalise to 0–100. Report the three biggest positives and negatives (this replaces the contradiction matrix, which currently has no aggregation rule).

**Trigger axis T (0–100, per window).**
- Dasha (max 55): score each of MD, AD, PD for connection strength c ∈ [0,1]:
  lord of H 1.0 · occupant of H 0.9 · karaka 0.8 · star-lord of H's lord or dispositor of H's lord 0.7 · lord of secondary house 0.5 · aspecting H 0.4 (0.2 if the aspect is only the 7th from lagna) · UL/DK link 0.5. Take the max per level. T_dasha = 20·c_MD + 25·c_AD + 10·c_PD. Full marks require all three, which is the classical demand.
- Transit (max 35): Jupiter on H / its lord / H from Moon: +12 (occupation) or +8 (aspect); Saturn on H / lord: +6 occupation, +4 aspect, with a "delay" tag; nodal axis over H/lord: +4; BAV bindus of the transiting planet in that sign <3: halve the term; Sade Sati or Saturn over the lord: attach "obstruction" tag rather than points. Sample at window entry, mid, exit and at any sign change inside the window; take the mean.
- Optional (max 10): Chara dasha / Jaimini confirmation (rasi aspecting H or containing DK/UL).

**Grid.**
| | T ≥ 60 | 35 ≤ T < 60 | T < 35 |
|---|---|---|---|
| **P ≥ 60** | Event window (Level 4–5) | Building (Level 3) | Promised, dormant (Level 2) |
| **35 ≤ P < 60** | Event with friction / delay (Level 3) | Possible, weak (Level 2) | Dormant (Level 1) |
| **P < 35** | Forced / atypical outcome, flag obstruction (Level 2) | Unlikely (Level 1) | Denied (Level 1) |

Applied to your chart: P for marriage is low-to-mid (Venus in lagna but combust, H7 at 18 bindus, D9 12th).
T peaks in Jul–Sep 2029, Sep–Dec 2030, Jun–Aug 2031 (Saturn in Taurus on the 7th with Jupiter in Scorpio on the lagna). v3.5 called all of that "veto"; v4 would call it "event with friction" in those windows and "dormant" elsewhere, which is at least a usable answer.

**Calibration (mandatory before trusting any number).** Take 8–12 dated past events from the querent (job changes,
relocations, relationships, illnesses). Run the scan over 2012–2026. Report: mean T in event windows vs non-event windows;
rank of the actual window among all windows; false-positive rate at each T threshold. Tune the connection
weights on that. Publish the hit rate in Part A. Without this step, the 85/60/35 numbers are folklore.

**Output.** Keep Part A/B/C and the inline `[Step N - Source]` tags (the best idea in v3.5). Add: the scan table;
per-factor contributions to P and T; the grid cell; the top-3 supporting and top-3 opposing factors; the
calibration hit rate. Remove the 19-item checklist rows that no longer feed a number.

## 6. Non-negotiables to keep from v3.5

- Explicit refusal levels and a Non-Conclusion ledger.
- Every claim tagged with its step and source.
- Uncertainty ledger for anything derived or missing.
- Rasi for lordship/dignity, one declared ayanamsa, Lahiri default.
