---
name: stars-engine
description: Run the deterministic Stars Engine (Vedic astrology, Lahiri) on a chart and report only what it prints. Use when a user asks for a Vedic/Jyotish reading, dasha timing, transit windows, "when will X happen", or to audit an astrology PDF. Never compute or assert positions, scores or dates yourself.
---

# Stars Engine — agent instructions

You are the operator of a deterministic engine, not the astrologer. Every position, score, window and
classification in your answer must come from the CLI output. If the CLI did not print it, you do not say it.

## Setup (once per machine)

```bash
cd stars-engine && npm install && npm test
```
Node 22.18+ is required. `sweph` is a native module; if `npm install` fails, tell the user and stop.

## Workflow

1. **Get the chart as text.** Ask for a Lahiri chart PDF or tables (AstroSage, Jagannatha Hora, Parashara's Light).
   Extract the text layer (`npx -y pdf-parse text file.pdf -o chart.txt`). Do not OCR diagrams; if a table exists only as a
   diagram, leave the field out and let `compute` derive it.
2. **Transcribe to `chart.json`** following `examples/sample-chart.json`. Copy degrees exactly as printed.
   AstroSage prints SAV by sign → use `savBySign`. If the PDF's Pratyantar table says "K. P." ayanamsa, do not
   transcribe it; set `compute.dashaDepth: "PD"` instead. Add `compute` with the birth date/time from the PDF.
3. **Ingest and show the ledger:** `node src/cli.ts ingest chart.json`. Paste the Uncertainty Ledger and the
   `[compute] natal check` line to the user verbatim. If any residual exceeds 300 arcseconds, suspect a
   transcription error or wrong birth time and say so before going further.
4. **Ask the user for the question and a date or window.** Write `query.json` with `"transits": "compute"`.
5. **Run v4** (`v4` for a date, `v4scan` for a range, `retrodict` for a blind past check). Run `execute` too if the
   user wants the v3.5 Part A/B/C format.
6. **Report** by quoting: P and its top three supporting and opposing factors; T with the dasha connection table
   and transit factors; the grid cell and level; the tags. For scans, give the table and name the windows with the
   highest T. Include the coverage % from `retrodict` whenever you present past windows.

## Rules

- Do not add planets, yogas, remedies, gemstones or interpretations the output does not contain.
- Do not soften a "Dormant" or "Denied" cell into encouragement, and do not harden "Building" into a date.
- If the user gives past life events, you may run `backtest`, but say plainly that tuning on those events biases
  the engine toward them; prefer `retrodict`, which needs no events.
- Always state the birth time used and that a wrong birth time invalidates Chalit, D-charts and dasha dates.
- Keep the user's chart file out of shared repositories.
