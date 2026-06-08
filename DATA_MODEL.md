# Personal Life App — Data Model

> **Status:** v0 draft · 2026-06-07 · Postgres-flavored, framework-agnostic. Types are indicative.
> Single-user. Timestamps `timestamptz` (store UTC, display **IST**). Currency **INR**. "later" = not in v1.

---

## Cross-cutting

### `user_settings` — single-user prefs
`id` · `theme` (dawn|sage) · `evening_workout_enabled` bool · `updated_at`

### `usage_events` — powers the daily Claude review + the "is it working?" signal
`id` · `occurred_at` · `event_type` (opened_app, added_expense_note, imported_statement, logged_meal, logged_order, journaled, ran_review, …) · `metadata` jsonb
→ lets the daily review read only a **"since last review" delta** (keeps reviews cheap as data grows).

### `daily_reviews` — Claude's daily catch-up output + success snapshot
`id` · `review_date` · `period_start` · `period_end` · `summary` text (patterns, suggestions) · `outcomes` jsonb (success signals computed that day) · `confirmed` bool · `confirmed_at` · `created_at`

---

## Finances

### `accounts`
`id` · `name` ("HDFC Credit Card", "Main Bank", "Cash") · `type` (credit_card|bank|wallet|cash) · `currency` (default 'INR') · `is_active`

### `expense_notes` — in-the-moment human capture (provisional, low friction)
`id` · `captured_at` · `amount` numeric · `raw_note` text (his words: "ciggies", "booked Rahul's flight") · `account_id` (nullable guess) · `source` (manual|voice) · `status` (pending|matched|promoted|discarded) · `transaction_id` (nullable, set on match) · `created_at`
→ the **only** thing touched in the moment: amount + a few words. No tags.

### `transactions` — the authoritative ledger (truth from statements; cash promoted from notes)
`id` · `occurred_at` · `amount` numeric (signed: −out / +in) · `account_id` · `provenance` (statement_csv|statement_screenshot|cash_note|manual) · `description_raw` text · `note_id` (nullable → expense_notes)
- **Enriched at reconciliation (emergent, NOT a fixed enum):** `category` text · `life_area` (personal|professional|startup) — *whose expense it is, separate from which account paid.*
- **Reimbursement:** `is_reimbursable` bool · `owed_by` text · `reimbursement_status` (none|pending|settled) · `settled_by_transaction_id` (nullable → the inflow that paid it back).
- **Reconciliation control:** `match_confidence` numeric · `needs_confirmation` bool · `confirmed` bool.
- Smoking is just `category='cigarettes'` — **no special flag/button** (side-effect, never a target).

### `vendor_patterns` — learned rules so the app auto-categorizes without me
`id` · `match_pattern` text (vendor / UPI handle / substring) · `category` · `default_life_area` (nullable) · `confidence` · `times_seen` · `created_by` (user|claude)

**Reconciliation flow:** import statement → create `transactions` → auto-match to `pending` notes by amount+time, auto-apply `vendor_patterns` → unmatched **cash** notes promote to a cash transaction → statement lines with no note get `needs_confirmation` → **Claude presents the batch, I confirm once, it commits** (logged in `daily_reviews`).

---

## Food

### `pantry_items` — current stock (approximate, with manual recount)
`id` · `name` (canonical: "cucumber") · `category` (vegetable|fruit|protein|dairy|grain|other) · `subtype` (nullable: "leafy_green", "berry", "citrus" — for within-category variety) · `quantity` numeric · `unit` (piece|gram|ml|bunch|pack) · `low_threshold` (nullable, reorder nudge) · `last_counted_at` · `updated_at`

### `grocery_orders` — ~twice a week
`id` · `ordered_at` · `platform` (zepto|swiggy_instamart|blinkit|other) · `source` (screenshot|manual) · `raw_text` · `total_amount` · `transaction_id` (nullable → ties grocery spend to Finances) · `created_at`
### `grocery_order_items`
`id` · `order_id` · `raw_name` ("Fresho Cucumber 500g") · `pantry_item_name` (mapped) · `quantity` · `unit` · `price`

### `recipes` — small, WildFit-aligned, **natural only**
`id` · `name` · `type` (smoothie|salad|egg|meat|other) · `instructions` text · `notes`
### `recipe_ingredients`
`id` · `recipe_id` · `pantry_item_name` · `quantity` · `unit` · `prefer_whole` bool (sized to avoid half-cut leftovers)

### `meals` — what I actually ate (depletes pantry)
`id` · `eaten_at` · `meal_type` (breakfast|lunch|dinner|snack) · `recipe_id` (nullable) · `free_text` (nullable: "smoothie + 2 eggs") · `source` · `created_at`
### `meal_ingredients` — depletion + variety; **supports fractions**
`id` · `meal_id` · `pantry_item_name` · `quantity` numeric (e.g. 0.5) · `unit`
→ variety = a query over recent `meal_ingredients` (distinct categories + subtypes) → feeds grocery suggestions.

---

## Journaling

### `journal_entries`
`id` · `created_at` · `body_text` · `source` (voice|text) · `mood` (nullable, optional) · `tags` text[] (nullable, emergent) · `time_of_day` (derived)
- **later:** `audio_url`, `sentiment`, `themes` (mentor-derived).

---

## Workout / Movement — consistency, not PRs

### `workouts` — a movement session log
`id` · `performed_at` · `type` (gym|bodyweight|run|walk|yoga|sport|other) · `description` text · `duration_min` · `intensity` (nullable: easy|moderate|hard) · `source` (manual|voice) · `notes` · `created_at`
→ "did I move today?" matters more than performance. Walks double as anti-idle + a cigarette alternative; movement feeds appetite (Food) and mood (Journaling).
### `exercises` — bodyweight library
`id` · `name` (burpee, push-up, sit-up, squat, plank…) · `measure` (reps|seconds) · `category` (push|pull|legs|core|cardio|mobility) · `notes`
### `workout_days` — the daily routine instance (checkable)
`id` · `date` · `session` (morning|evening) · `status` (planned|done|partial|skipped|rest) · `notes` · `created_at`
### `workout_day_items` — exercises in that day's routine
`id` · `workout_day_id` · `exercise_id` · `target_sets` · `target_reps` (or `target_seconds`) · `done` bool · `actual_reps` (nullable)
→ **starts tiny and ramps:** treat every day as a low day — small baseline that increases gradually as it's consistently completed; no separate low-day mode, no streak-shame. Morning session in v1; evening session is an optional toggle (`user_settings.evening_workout_enabled`).
### `steps_log` — daily steps (entered manually)
`id` · `date` · `steps` · `created_at`

---

## Time-management — habit-stacking core (spine of *action*; "where did my time go")

### `projects` — passion projects & life areas the evening menu draws from
`id` · `name` (this app, competition movie/trailer, startup sales, …) · `kind` (passion|startup|personal|connection) · `color` (nullable) · `is_active` · `created_at`
### `tasks` — next-actions + the pressure-free might-do backlog
`id` · `project_id` (nullable → projects) · `title` · `details` (nullable) · `life_area` (personal|professional|startup) · `task_type` (obligation|might_do) · `status` (todo|doing|done|dropped) · `due_at` (nullable) · `planned_date` (nullable) · `created_at` · `completed_at`
→ **NO daily-highlight/MIT** (work isn't prioritised in the app — he enjoys it). Active `projects` + `task_type='might_do'` feed the **evening menu**; "call family/a friend" is a `connection`-kind project. Also the home for the original notes/to-dos.

### `habits` — the stacked routine actions (anchored to cues, not the clock)
`id` · `action_text` ("5 push-ups", "60-sec journal") · `anchor` (first_action|after_breakfast|after_lunch|after_dinner|work_start|work_end|before_bed|after_habit|custom) · `anchor_detail` ("after I drink my water") · `anchor_habit_id` (nullable — stack onto another habit) · `order_in_stack` · `is_active` · `created_at`
→ formula "After [anchor], I will [action]". **Start with ONE per anchor**; grow slowly.
### `habit_logs`
`id` · `habit_id` · `date` · `done` bool · `done_at`

### `sleep_logs`
`id` · `date` · `woke_at` · `slept_at` (crosses midnight) · `duration_min` (derived) · `notes`

### `weekly_reviews` — the light weekly ritual
`id` · `week_start` · `reflection` text (went well / drained me) · `focus` text (this week's one big rock) · `created_at`

### `time_blocks` — *(optional / later)* clock-based day plan
`id` · `date` · `start_at` · `end_at` · `title` · `category` (work|food|workout|personal|rest|other) · `task_id` (nullable)
→ Ali's level 2–3 time-blocking; habit stacks are the v1 core, so this is deferred.

---

## How "working" is measured (his definition) — all derivable from the above
- **In control of money** → % of `transactions` reconciled + categorized; reimbursements settled; a clean "where did it go" view.
- **Journaling regularly** → `journal_entries` per week.
- **Eating / health** → `meals` per day (≥ target — the problem is *skipping*); variety score.
- **Smoking** → silent trend of `category='cigarettes'` spend — observed as a *side effect*, never surfaced as a target or cue.
- *Secondary signals:* workout **consistency** (`workouts` "did-I-move" days), and **fewer idle gaps** (`time_blocks` / `tasks` engagement).

---

## Design principles encoded here
- **Useful without Claude** — `vendor_patterns` + simple auto-rules categorize most things; the daily review only handles the messy remainder.
- **No fixed tags** — categories/tags are emergent text, learned from his words.
- **Approximate where it must be** — pantry stock self-corrects via `last_counted_at` recounts; never blocks on exactness.
- **Smoking is never a first-class object** — just a category, so the app doesn't cue the habit.
