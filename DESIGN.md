# Personal Life App — Design System

> **Status:** v0 · 2026-06-07. Built to the [`impeccable`](https://github.com/pbakaus/impeccable) skill's rules.

## The design: "Journey" — the day as a timeline
**One layout** (mockup D). The Home/Today screen renders the day as a **vertical path, dawn → night**: habit-stack steps are nodes on a time axis, and the background sky darkens from morning to night as you scroll. Deeper screens (journal editor, finance list, settings) reuse this visual language (type, accent, tinted surfaces) in a calm, simple layout.

- **Type:** **Fraunces** (serif) headings + **Hanken Grotesk** body. (No Inter.)
- Tabular numerals for stats/finance. Generous spacing, ≥44px touch targets, mobile-first.
- **Motion:** gentle ease `cubic-bezier(.2,0,0,1)`, staggered node reveals; honour `prefers-reduced-motion`. No bounce/elastic.

## Two colour palettes — a simple Settings toggle
Same layout; swap CSS custom properties on `<html data-theme>`. Persisted in `user_settings.theme = dawn | sage`. This is a **pure token swap** — no structural/per-screen theming.

### Dawn — warm, optimistic
```
--frame  #cdbfa9
--sky    linear-gradient(180deg,#FBF1DC 0%,#F5E4C6 24%,#E8CCA4 46%,#9ba2bc 70%,#2c3858 100%)
--line   linear-gradient(180deg,#E7A15A,#caa06a 42%,#6f789a 70%,#3b4d7a)
--accent #E0852F   --accent-ring rgba(224,133,47,.28)
--text   #2a2114   --muted #86714f   --dot-border #caa06a
--night-text #f1ecdd   --night-muted #c3c9dc   --night-dot #9aa0bc
```

### Sage — earthy, calm
```
--frame  #bcc4b4
--sky    linear-gradient(180deg,#F1F3E4 0%,#DCE6C9 24%,#B6CBA8 46%,#5f7e6e 70%,#142219 100%)
--line   linear-gradient(180deg,#cdb96a,#a8b56a 42%,#5f7e6e 70%,#27352b)
--accent #B98E36   --accent-ring rgba(185,142,54,.26)
--text   #20271a   --muted #6c7a5a   --dot-border #b3bd86
--night-text #eef0df   --night-muted #b9c6b0   --night-dot #8fa088
```

Shared tokens: `--font-display` (Fraunces), `--font-body` (Hanken Grotesk), `--radius` (30px screen / 16px controls).

## impeccable non-negotiables
- Distinctive type (no Inter/system defaults) · tinted neutrals (no pure `#000`/`#fff`/gray) · no purple→blue gradients · no nested-card mush · no rounded-square icon tiles · no bounce easing.
- Real modular type scale + clear hierarchy.

> Mockups: `design-mockups/d-dawn.html`, `d-sage.html` (chosen); `d-colors.html` shows all five palettes explored. Earlier 3-structural-theme idea (Bold/Bento) was dropped to keep it simple.
