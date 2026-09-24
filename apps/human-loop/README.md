# Human Loop

A free browser game by DCI Resources that teaches AI agentic oversight: supervising AI agents at work.
Players pick a DCI career pathway, then run a shift with an overeager AI coworker. They inspect
evidence, let safe work proceed, and block, escalate or roll back the risky stuff. Help Desk
(with "ResetBot 3000") is playable now; the other pathways say "Coming soon".

Stack: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Phaser 4,
Neon Postgres (optional, for cloud save), Vitest.

## Quick start

```bash
cd apps/human-loop
npm install
npm run dev            # http://localhost:3000
```

No environment variables are needed to play. Without a database, the game saves progress in the
browser (localStorage) and everything works. See [Cloud save](#cloud-save) to turn on server-side
saves and sign-up storage.

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server with hot reload            |
| `npm run build`     | Production build                      |
| `npm start`         | Serve the production build            |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm run lint`      | ESLint                                |
| `npm test`          | Vitest (engine, content, server code) |

Tip: to run more than one dev server at once, give the second one its own build folder and port:
`NEXT_DIST_DIR=.next-alt npx next dev -p 3001`. Use exactly `.next-alt`: `tsconfig.json` already
lists `.next-alt/types/**/*.ts`, so Next leaves it alone. Any other folder name makes Next add its
own line to `tsconfig.json` (and re-sort the list); undo that with `git checkout -- tsconfig.json`.

## Environment variables

All optional. Copy `.env.example` to `.env.local` for local development.

| Name                         | Purpose                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Postgres connection string (Neon). Turns on cloud save. Set for you on Vercel when you add Neon from the Marketplace.                           |
| `POSTGRES_URL`               | Used only if `DATABASE_URL` is not set. The Neon integration sets both.                                                                         |
| `LEAD_RATE_LIMIT_PER_10_MIN` | Sign-ups allowed per IP address per 10 minutes. Default `30`, so a room of people on one Wi-Fi network can all sign up (see [Abuse limits](#abuse-limits)). |
| `NEXT_PUBLIC_PRIVACY_EMAIL`  | DCI's privacy contact email, linked from `/privacy` ("contact us"). **Set it before a public launch** (read at build time, so redeploy). |
| `CRON_SECRET`                | Protects the daily retention job (`/api/cron/purge`, scheduled in `vercel.json`). Any long random string.                                     |
| `HL_TEST_PG_URL`             | Tests only. A disposable local Postgres for the database integration test (it drops and recreates the tables).                                  |

## Cloud save

### How it turns on

The API checks for `DATABASE_URL` (or `POSTGRES_URL`) on each request.

- **Not set: "no-op mode".** Sign-up still works and still gives the browser a player id. The API
  answers `stored: false` / `cloud: false`, and the game tells the player their progress is saved
  on this device.
- **Set:** the first request creates the tables (`CREATE TABLE IF NOT EXISTS`, once per server
  instance). Sign-ups are stored, and signed-up players' progress is backed up as they play. There
  is no migration step to run.

If the database is slow or down, the API still answers (with `stored: false`) instead of failing,
so the game never breaks because of the database. Each database call times out after 6 seconds.

### Owner setup (one time)

This is the only manual step. It needs someone with access to the Vercel project **human-loop**.

1. In the Vercel dashboard, open the **human-loop** project and go to the **Storage** tab.
2. Choose **Create Database** (or **Browse Marketplace**) and pick **Neon** (Serverless Postgres).
3. Pick a **US region**, ideally the one closest to the project's functions (by default
   Washington, D.C. / `iad1`, which is AWS `us-east-1`). The privacy notice says data is stored
   in the United States, so keep it there.
4. Connect it to the **human-loop** project for **Production** and **Preview** (and **Development**
   if you want `vercel env pull` to work locally). Leave the environment variable prefix
   **empty**, so the variables are named `DATABASE_URL` and `POSTGRES_URL`.
5. **Redeploy.** New environment variables only reach new deployments: go to **Deployments**, open
   the latest production deployment, and choose **Redeploy**.

6. **Before a public launch** also set `NEXT_PUBLIC_PRIVACY_EMAIL` (the privacy notice's contact for
   deletion and email opt-out requests; without it the notice has no email address) and `CRON_SECRET`
   (turns on the daily retention job), then redeploy.

To check it worked: open `/play` on the live site and sign up. The confirmation should say
*"We'll back up your progress as you play."* (In no-op mode it says *"Saved on this device."*)
The new row shows up in the Neon console under **Tables → players**.

### Data model

```sql
players (
  id               uuid primary key,          -- random, server-issued; also the hl_pid cookie
  name             text not null,
  email            text not null,
  marketing_opt_in boolean not null default false,
  consent_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
)

saves (
  player_id  uuid primary key references players(id) on delete cascade,
  data       jsonb not null,                  -- game progress only, "profile" is always null
  updated_at timestamptz not null default now()
)
```

### Privacy by design

- **Personal data lives in one place:** the `players` table. The save blob never contains the name
  or email; the API rebuilds the profile from `players` when it sends a save back.
- **No accounts, no linking by email.** Emails are not verified, so each sign-up creates a new
  player. The browser is linked to its data only by the random `hl_pid` cookie (httpOnly,
  `SameSite=Lax`, `Secure` in production, 1 year).
- **Nothing personal in logs.** Database errors are logged by error code only (never names,
  emails, SQL values or the connection string).
- **Deletion.** "Delete my data" on `/play` calls `DELETE /api/progress`, which deletes the
  player row (the save goes with it) and clears the cookie. If the database can't be reached,
  nothing is deleted (on the server or the device) and the player sees an error with "Try again".
- **Shared devices.** "Not you? Sign out" on `/play` calls `POST /api/logout`, which only clears the
  cookie; the device's save is cleared too. The sign-up stays in the database.
- **Restore.** If the browser's storage is wiped but the `hl_pid` cookie survives (e.g. Safari's
  7-day limit on script storage), `/play` restores the profile and save from `GET /api/progress`.
- **Retention.** Players with no sign-up or save activity for 24 months are deleted automatically:
  daily by the Vercel cron (`/api/cron/purge`, needs `CRON_SECRET`), and at most once a day per
  server instance after a sign-up, matching the privacy notice.
- **IP addresses** are used only in memory for rate limiting and are never stored.

### Handy SQL (Neon console → SQL Editor)

```sql
-- People who asked to hear about DCI programs (only contact these):
SELECT name, email, consent_at FROM players WHERE marketing_opt_in ORDER BY consent_at DESC;

-- Someone asked us to delete their data (their save is deleted too):
DELETE FROM players WHERE lower(email) = lower('person@example.com');
```

Because emails are not verified and each sign-up is a new row, the same email can appear more than
once. The `DELETE` above removes all of them.

## API

All routes are dynamic (never cached) and answer with `Cache-Control: no-store`. Bodies must be
JSON (`Content-Type: application/json`); anything else gets `415`.

| Method & path          | Body                                                  | Response                                                                                                                                  |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/lead`       | `{name, email, marketingOptIn, ageConfirmed: true}`   | `200 {stored, playerId}` and sets the `hl_pid` cookie. `400 {error}` bad input, `413` over 4 KB, `429 {error}` rate limited.               |
| `GET /api/progress`    | none                                                  | `{cloud, save, profile}` (`profile` also when there is no save row yet). `cloud` is true only if the database answered and this player exists. No cookie or no database: `{cloud: false, save: null}`. |
| `PUT /api/progress`    | `{save}` (a v2 `SaveData`)                            | `{stored}`. `401` without a cookie, `400` bad shape, `413` over 256 KB, `429` more than 60 saves a minute. Stores only for an existing player. |
| `DELETE /api/progress` | none                                                  | `{ok: true}` and clears the cookie. `503 {ok: false, error}` if the database could not be reached (the cookie is kept so a retry works).   |
| `POST /api/logout`     | none                                                  | `{ok: true}` and clears the cookie. Server data is not touched.                                                                            |
| `GET /api/cron/purge`  | none (`Authorization: Bearer $CRON_SECRET`)           | `{ok: true, purged}`. `401` without the secret (or when `CRON_SECRET` is not set).                                                         |

Validation: `name` 1-80 characters after trimming, `email` a valid address of at most 254
characters, `marketingOptIn` a boolean, `ageConfirmed` exactly `true`. Unknown pathway ids in a
save are dropped.

The browser side of this contract is `lib/client/save.ts`. Server code lives in `lib/server/`
(`db.ts`, `validate.ts`, `player-cookie.ts`, `rate-limit.ts`) and `app/api/`.

### Abuse limits

In-memory, per server instance (best effort, not a hard global limit): 30 sign-ups per IP per
10 minutes (`LEAD_RATE_LIMIT_PER_10_MIN`) and 60 saves per player per minute. A rate-limited
sign-up does not break the game: the player keeps playing and progress stays on their device, and
the sign-up is kept and sent again later (after `Retry-After`, on the next visit to `/play`, or when
the browser comes back online). Only valid sign-ups count toward the limit.

## Tests

```bash
npx vitest run                 # everything
npx vitest run lib/server      # API + database code
```

The server tests cover validation, cookies, rate limits, every route in no-op mode, and the
database module through the real Neon driver with a fake HTTP transport.

`lib/server/db.pg.test.ts` goes further and runs the whole flow (sign up, save, load, delete,
retention) against a **real Postgres**. It is skipped unless `HL_TEST_PG_URL` is set, and it
needs the `psql` command-line tool:

```bash
# A throwaway database; the test drops and recreates the players/saves tables.
createdb hl_test
HL_TEST_PG_URL=postgresql://USER:PASSWORD@localhost:5432/hl_test npx vitest run lib/server
```

## Project layout

```
app/            routes (home, /play, /privacy) and app/api/* (lead, progress)
components/     site UI, battle UI, hub UI, Phaser stage
content/        authored game content (JSON)
lib/game/       game rules engine, cards, content loaders, types
lib/client/     browser save (localStorage first, optional cloud sync)
lib/server/     server-only code for the API routes
public/         brand and game art
```
