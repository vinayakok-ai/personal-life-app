# Impact Lab Carpool 🚗

Tiny web app for Claude Impact Lab contestants to share rides to Polaris
School of Technology, Whitefield (Sat & Sun, 9:00 AM sharp).

- **Join in ~30 seconds** (`/`) — a step-by-step wizard: name & number, tap
  your area, tap your days & vehicle. No login: your phone number is your ID
  (re-enter it to edit or drop out).
- **Organizer console** (`/admin`, passcode via `ADMIN_CODE`) — new joiners
  land in a waiting pool; an organizer ticks riders and hits **Group
  selected** (a ticked vehicle owner becomes the crew's driver), then
  **⚡ Auto-group the rest** places everyone remaining first-come-first-served
  within their travel corridor (South-East / Central-East / North-East /
  West / near-venue), topping up open seats first.
- **Leave-by time per group** — 9:00 AM minus a hardcoded weekend travel
  estimate for the group's farthest area, minus a 25-min buffer.
- **Ride board** (`/board`) — your own crew shown as a boarding-pass ticket,
  everyone else in corridor sections; Sat/Sun tabs, search, tap-to-WhatsApp
  on every member. Auto-refreshes every 30 s.

Stack: Next.js 16 + Prisma + Postgres + Tailwind, styled after the Claude
Impact Lab brand (ivory / coral / serif). Groups are stored; labels, seat
counts and leave-by times are derived on every read.

## Deploy on Railway (~10 minutes)

1. **New project** → *Deploy from GitHub repo* → pick this repo and branch.
2. In the service **Settings → Root Directory**, set `carpool`.
   (Build and start commands are picked up from `package.json` automatically:
   build `npm run build`, start `npm run start`.)
3. In the project, **+ New → Database → PostgreSQL**.
4. On the app service, **Variables → New Variable → Add Reference** →
   `DATABASE_URL` from the Postgres service.
5. Set `ADMIN_CODE=<passcode>` for the organizer console at `/admin`
   (defaults to `polaris` if unset — change it). Optional:
   `EVENT_CODE=<something>` to require a shared code (post it in the
   WhatsApp group) before anyone can join. Leave unset for open joins.
6. **Settings → Networking → Generate Domain** → share that URL in the
   WhatsApp group.

The start command runs `prisma db push`, so the database schema is created
automatically on first boot — no manual migration step.

### Notes

- Phone numbers are visible on the board (that's how groups coordinate on
  WhatsApp) — the join form says so. Share the URL only in the event group.
- To wipe all data: delete the Postgres service (or `TRUNCATE "Rider";`).
- Local dev: `npm install`, set `DATABASE_URL` to any Postgres, `npm run dev`.
