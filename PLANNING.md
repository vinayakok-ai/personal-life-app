# Personal Life App — Planning

> **Status:** v0 draft · last updated 2026-06-07 · living document.
> Companions: [DATA_MODEL.md](DATA_MODEL.md) · [DESIGN.md](DESIGN.md) · mockups in `design-mockups/`.

A single **private** app to run my whole life across **Personal / Professional / Startup**. Built the way I build at my startup: thin prototype → live with it → iterate.

**What this really is:** not a life-management app — a **"become who I want to be" companion**, where a *healthy body is the lever for a healthy mind*. The modules are the foundation for the harder work (smoking, mood, loneliness). Work life is already good and enjoyable; this app is for the personal side.

---

## Guiding philosophy
- **Identity-based change** over goal-chasing (Atomic Habits; Ali Abdaal). **Healthy body → healthy mind.**
- **Friction mapping** — make good habits easy, bad ones hard/invisible; never build UI that *cues* a bad habit.
- **Capture everything, low friction.** Forgiveness over streaks · compassion over metrics · pull, not push · push toward people.

### Smoking trigger model (his diagnosis — the core strategy)
He smokes when **overwhelmed** or when he has **nothing to do**. The app removes the *fuel* rather than tracking the habit:
- **Overwhelmed** → journaling (offload → calmer → more social) + food + workout (a healthy body carries stress better).
- **Nothing to do** → the daily **habit-stack** gives the day shape; the **evening menu** hands him something to do; a walk = movement + something-to-do + cigarette substitute.
- Cigarettes are **never** a tracked target or button — they recede as a *side effect*.
- Deeper targets over time: **low mood** and **loneliness**.

---

## Architecture (decided 2026-06-07)
- **PWA + Postgres on Railway** (account already exists), reachable from **iPhone + desktop**.
- **Interaction model: pull, not push.** **No app notifications** — I come to the app; I'll use my own calendar/alarms if needed. (Sidesteps iOS PWA push limits.)
- The "daily agent" is **Claude Code on my laptop** — I open it daily for work; point it at the Railway DB to parse uploads, **reconcile** notes, surface patterns, propose features.
- **Stack:** Next.js + TypeScript · Postgres + Prisma · Tailwind + custom components · **Google SSO (Auth.js), locked to my account** · PWA (manifest + service worker). LLM "mentor" API comes later.
- **From day one:** Google SSO + HTTPS · DB secrets in a local env file · scheduled Postgres **backups/export** · clean data model + `usage_events` log.

---

## The shape: one five-part app — two spines + three domains
- **Journaling = spine of reflection** · **Daily schedule = spine of action** (habit-stacks + evening menu).
- **Finance · Food · Workout = the three domains.** Finance = "where did my money go", Schedule = "where did my time go".
- **Build the five-part app, ship in slices** (journaling first). Plus a **Settings** screen for the theme toggle.

## The five modules

### 1 · Finances — narrate now, reconcile later
- **In the moment:** amount + **free-text note in my words**; auto date/time. **No fixed tags** (the Fold Money pain).
- **Evening (Claude review):** import CSV/screenshot → reconcile to real transactions, **derive tags from my language**, learn **vendor→category patterns** → **I confirm once → it commits.**
- **Two dimensions:** *which account/card paid* vs *whose expense it is* (Personal/Pro/Startup), + **reimbursable** links (→ nets to zero). The answer to "I have money, I spend it, I don't know where it went."
- **No cigarette button** — tracked silently (`category='cigarettes'`). **AA/Sahamati ruled out** for a personal app.

### 2 · Food — *eat regularly, with variety, from natural food* (not macro counting)
- Groceries ~**2×/week** → **order screenshots + actual counts** → Claude parses into pantry.
- **Meal logging, whole units by default** ("1 cucumber"), **fractions supported** ("½ capsicum"); recipes lean to whole units (no leftovers).
- **Variety within categories** (different fruits) → nudges the next grocery order.
- **Eat-regularly:** the problem is *skipping* — pre-decided breakfast smoothie + one-tap "had it" + in-stock check, shown when I open the app.
- **Homemade/natural only** — no mayonnaise/artificial; natural dressings OK. (Did WildFit before, lost ~20 kg; no weight goal now — just eat enough.)

### 3 · Journaling — the spine of reflection, voice-first
- **iPhone native voice typing** into a free-form box. No forced one-line/mood. A release valve → calmer → more social.
- **Later:** record→transcribe for long rambles, keep audio for tone. Timestamps so patterns surface.

### 4 · Workout / Movement — restart-friendly home bodyweight
- No equipment — bodyweight (burpees, push-ups, sit-ups, squats, plank). Restarting after a long gap.
- **A simple daily routine I check off**, that **starts tiny and ramps**. Design assumption: *treat every day as a low day* — small baseline, increases gradually. No low-day mode, no streak-shame, no how-it-felt tag.
- **Morning session in v1** (habit-stack anchor: *after the bathroom → workout*); **evening session** = optional toggle for later.
- **Steps logged manually** each day.

### 5 · Time-management — habit-stacks + an evening "what to do" menu
*No Daily-Highlight/MIT work-prioritisation — he enjoys his work and it runs itself. This targets the **unstructured** time.*
- **Habit stacks = the shape of the day.** "After [existing habit], I will [new habit]" — anchored to **concrete cues** (e.g. *after the bathroom*, not the vague "wake up"). One habit per anchor, grow slowly. Ships with the starter stack below.
- **Evening menu (anti-smoking core).** After 6–7 hrs of work, boredom → smoking; one screen surfaces something worth doing from real **projects**: *improve this app · competition movie/trailer · other passion projects · (soon) startup sales · call family / a friend.* Job: *boredom → open → pick → go.*
- **Weekly review** (~20 min reflect + plan) · **sleep/wake log** (nudge the 1–2 am drift earlier) · home for the original **notes + to-dos**.

### Settings & theming
- Single design: the **"Journey"** day-as-timeline layout (mockup D). A **Settings** screen toggles two **colour palettes** — **Dawn** (warm) and **Sage** (earthy) — a trivial CSS-variable swap on the same layout (see [DESIGN.md](DESIGN.md)). No structural multi-theme system.

## Starter habit-stack (from his ideal day)
> **Morning is the whole game** — currently wake → cigarette → ~1 hr scrolling → skip breakfast. The fix anchors a clean chain to the bathroom:
- get up → **bathroom** *(anchor)* → **workout** → brush & shower → **smoothie** → start work
- midday: work break → **make lunch** → back to work
- evening: finish work → **open the menu** (project / call someone)
- night: **read 10 min** → note tomorrow → lights out earlier

---

## Roadmap beyond v1
1. **Mentor layer** — LLM API: paste reels/videos, talk to it, patterns reflected back; gentle nudges toward movement / sunlight / connection.
2. Evening workout session · structured workout routines · actual time-tracking · deeper finance (budgets, net worth) · predictive pantry.
3. A real scheduled cloud job to replace the laptop ritual.

## Decisions / open items
- [x] **Scope** → five-part app + Settings; build shell for all, **ship in slices** (journaling first).
- [x] **Finances** → narrate + evening reconcile, one confirm step, no fixed tags, account/owner/reimbursement split. **AA** → skip.
- [x] **Food** → whole-units default + fractions; within-category variety → grocery nudges; ~2×/week screenshots + counts; natural-only.
- [x] **Workout** → home bodyweight, starts-tiny-and-ramps, manual steps, morning v1 (evening later), no how-felt.
- [x] **Time** → habit-stacks + evening project menu; NO daily-highlight/MIT; weekly review; sleep/wake.
- [x] **Journaling** → iPhone voice dictation.
- [x] **Hosting/auth** → Railway + Postgres; **Google SSO**; no notifications (pull, not push).
- [x] **Design** → single **Journey** timeline layout; Settings toggles two palettes — **Dawn** (warm) + **Sage** (earthy); `impeccable` rules; system in [DESIGN.md](DESIGN.md).
- [x] **Success =** in control of money + journaling regularly + eating healthily; reduced smoking is a *side effect*.
- [x] **Theming** → resolved: one layout + two palette token-swaps (Dawn / Sage); no structural multi-theme system.
- [ ] **NEXT** → scaffold the app (Next.js + Prisma + Postgres + Google SSO + PWA + theming + Home in 3 themes + journaling). Likely a fresh focused session.
