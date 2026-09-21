# Stars Engine

A deterministic Vedic astrology execution engine that AI agents can run instead of "reasoning" about a chart.
Two engines live here:

- **v3.5** — a faithful port of the "Vedic Astrological Execution Engine v3.5 (Deterministic & Parser-Locked)"
  directive (`docs/SPEC-v3.5.txt`): Mode 1 ingestion with an uncertainty ledger, Mode 1.5 halt gates, the
  19-step analysis, the 100-point Convergence Matrix and the Part A/B/C output. Kept as the reference behaviour.
- **v4** — a two-axis rewrite after auditing v3.5 on a real chart (`docs/REVIEW.md`): a static **Promise**
  score (what the chart allows), a per-window **Trigger** score (dasha + transits), a 3×3 grid classification,
  a window scan, and **blind retrodiction** so the engine commits to past windows before anyone tells it what happened.

Nothing here uses a language model. Same input, same output, every time. Every point in a score is printed
with the factor that produced it.

## Install

```bash
git clone <this repo> && cd stars-engine
npm install            # only dependency: sweph (Swiss Ephemeris binding)
npm test               # 15 tests
npm run demo           # v4 run on the fictional sample chart
```

Requires Node 22.18+ (TypeScript runs natively, no build step).

## Commands

```bash
node src/cli.ts ingest    chart.json                        # v3.5 Mode 1: tables + uncertainty ledger
node src/cli.ts execute   chart.json query.json             # v3.5 Mode 1.5 + 2: halts, 19 steps, matrix, Part A/B/C
node src/cli.ts scan      chart.json query.json FROM TO     # v3.5 matrix per Pratyantar window
node src/cli.ts v4        chart.json query.json             # v4 Promise / Trigger / grid for one date
node src/cli.ts v4scan    chart.json query.json FROM TO     # v4 per Pratyantar window
node src/cli.ts retrodict chart.json FROM TO [62|p85]      # v4 blind: windows the engine would have flagged, per topic, with coverage % (default p85 = top 15 % of lifetime)
node src/cli.ts backtest  chart.json events.json FROM TO    # v4: rank dated events among all windows (optional; see "bias")
```

## Inputs

`chart.json` — see `examples/sample-chart.json`. Transcribe from any Lahiri chart (AstroSage, Jagannatha Hora, …):

| Field | Required | Notes |
|---|---|---|
| `meta.ayanamsa` | yes | must be Lahiri / Chitra Paksha |
| `ascendant`, `planets[9]` | yes | sign + degree within sign (`12°34'56"`, `12:34:56` or `12.58`), `retrograde` |
| `dashas[]` | yes | Vimshottari MD/AD rows with ISO dates and `parent` chain |
| `sav[12]` or `savBySign[12]` | recommended | Sarvashtakavarga by house, or by sign (AstroSage prints by sign) |
| `bhavaChalit[]` | optional | cusps; occupancy derived if omitted |
| `shadbala[]`, `bhavaBala[12]` | optional | strength tables |
| `vargas.D9/D10/D4/D7` | optional | or let `compute` derive them |
| `compute` | optional | `{ "vargas": ["D9","D10"], "dashaDepth": "PD", "birthDate": "YYYY-MM-DD", "birthTime": "HH:MM" }` |

`query.json` — `{ "text": "When will I get married?", "targetDate": "2026-09-21", "transits": "compute" }`.
Topics are detected from the text (marriage, career, wealth, children, property, health, foreign, education);
override with `"target": { "houses": [7] }`.

### The `compute` block (rule dilution, explicit)

v3.5 forbids computing anything. With `compute` set, the engine derives from the *supplied* chart: D-charts
by Parashara arithmetic, the Vimshottari tree from the Moon (verified against the supplied MD/AD rows, drift
reported), and transits from Swiss Ephemeris (Moshier, Lahiri, mean node). `ingest` prints a residual report
of the ephemeris against the supplied natal positions so you can see how far the source software and the
ephemeris disagree (typically < 90 arcseconds). Everything computed is tagged `[computed]` in the ledger.

## Reading v4 output

- **Promise P** (0–100, 50 = neutral): house lord dignity, Shadbala ratio, placement, combustion, house SAV and
  Bhava Bala, occupants/aspects, karaka condition, varga mini-chart. Static per topic.
- **Trigger T** (0–100): MD 20 / AD 25 / PD 10 × connection strength (lord 1.0 · occupant 0.9 · karaka 0.8 ·
  star-lord/dispositor link 0.7 · secondary lord 0.5 · aspect 0.25–0.4) + Jupiter/Saturn/node transits over the
  house, its lord's sign and the house from the Moon, sampled at window entry/mid/exit. Saturn adds
  `delay` / `obstruction` tags, not just points.
- **Grid**: Event window · Building · Promised-dormant · Event with friction · Possible-weak · Dormant ·
  Forced/atypical · Unlikely · Denied.
- **Percentile**: every T is also reported as a percentile of the native's own lifetime window distribution for
  that topic (`pct` column; `retrodict … p85` flags the top 15 %). A fixed threshold means different things in
  different charts; the percentile does not.
- **Coverage %** (retrodict): share of the period above threshold. High coverage = the engine is describing the
  chart's standing emphasis, not predicting. Aim for 10–15 %.
- **Dasha gate**: transit points are scaled by 0.5 + 0.5·(strongest dasha link), so Gochara alone cannot flag a window.
- Signification sets use one primary house per topic; supporting houses are secondary at half weight.

## On bias

The weights in `src/v4.ts` were set from classical rules before any chart was scored and are the same for everyone.
`retrodict` lets a person check the engine against their own past **without telling it anything**: the engine
commits first. `backtest` exists for people who want to tune weights on their events; if you use it, keep the
tuned weights separate and re-check coverage.

## For AI agents

`SKILL.md` (and `.claude/skills/stars-engine/SKILL.md` for Claude Code) tells an agent how to transcribe a chart,
run the commands, and report results without inventing astrology of its own. The contract: the agent never
computes or asserts a position, score or date that the CLI did not print.

## Layout

```
src/        engine (types, tables, ingest, gate, engine, render, compute, scan, v4, v4-run, cli, tests)
examples/   fictional sample chart + query, events template
docs/       SPEC-v3.5.txt (original directive), REVIEW.md (audit + v4 design)
SKILL.md    agent instructions
```
