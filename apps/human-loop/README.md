# Human Loop

A free browser game by DCI Resources that teaches AI agentic oversight: supervising AI agents at work.
Players pick a DCI career pathway, then run a shift with an overeager AI coworker. They inspect
evidence, approve safe work, and block, escalate or roll back the risky stuff. Help Desk
(with "Ollie", short for Off-and-On-Again) and Cybersecurity (with "Patch", an over-eager AI
security analyst in Fenwick's SOC) are playable now; the other pathways say "Coming soon".

Stack: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Phaser 4,
Airtable or Neon Postgres (optional, for cloud save), Vitest.

## Quick start

```bash
cd apps/human-loop
npm install
npm run dev            # http://localhost:3000
```

No environment variables are needed to play. Without a database, the game saves progress in the
browser (localStorage) and everything works. See [Cloud save](#cloud-save) to turn on server-side
saves and sign-up storage ([Airtable](#cloud-save-with-airtable-recommended-for-dci) is the
recommended setup for DCI).

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server with hot reload            |
| `npm run build`     | Production build                      |
| `npm start`         | Serve the production build            |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm run lint`      | ESLint                                |
| `npm test`          | Vitest (engine, content, server code) |
| `npm run check:bundles` | After a build: each `/play/<pathway>` route ships only its own content |

Tip: to run more than one dev server at once, give the second one its own build folder and port:
`NEXT_DIST_DIR=.next-alt npx next dev -p 3001`. Use exactly `.next-alt`: `tsconfig.json` already
lists `.next-alt/types/**/*.ts`, so Next leaves it alone. Any other folder name makes Next add its
own line to `tsconfig.json` (and re-sort the list); undo that with `git checkout -- tsconfig.json`.

## Environment variables

All optional. Copy `.env.example` to `.env.local` for local development.

| Name                         | Purpose                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `AIRTABLE_TOKEN`             | Airtable personal access token. Turns on cloud save in Airtable (see [Cloud save with Airtable](#cloud-save-with-airtable-recommended-for-dci)). Ignored when `DATABASE_URL`/`POSTGRES_URL` is set. |
| `AIRTABLE_BASE_ID`           | Optional. The Airtable base to use. Default `appp6a1BiX6qyMUkj` (DCI's "Human Loop — Players" base). |
| `DATABASE_URL`               | Postgres connection string (Neon). Turns on cloud save. Set for you on Vercel when you add Neon from the Marketplace.                           |
| `POSTGRES_URL`               | Used only if `DATABASE_URL` is not set. The Neon integration sets both.                                                                         |
| `LEAD_RATE_LIMIT_PER_10_MIN` | Sign-ups allowed per IP address per 10 minutes. Default `30`, so a room of people on one Wi-Fi network can all sign up (see [Abuse limits](#abuse-limits)). |
| `NEXT_PUBLIC_PRIVACY_EMAIL`  | DCI's privacy contact email, linked from `/privacy` ("contact us"). **Set it before a public launch** (read at build time, so redeploy). |
| `CRON_SECRET`                | Protects the daily retention job (`/api/cron/purge`, scheduled in `vercel.json`). Any long random string.                                     |
| `HL_TEST_PG_URL`             | Tests only. A disposable local Postgres for the database integration test (it drops and recreates the tables).                                  |

## Cloud save

### How it turns on

The API picks a storage backend on each request, in one place (`lib/server/storage.ts`):

1. **`DATABASE_URL` (or `POSTGRES_URL`) set: Neon Postgres.** The first request creates the tables
   (`CREATE TABLE IF NOT EXISTS`, once per server instance). There is no migration step to run.
2. **Else `AIRTABLE_TOKEN` set: Airtable** (recommended for DCI). Uses the existing
   "Human Loop — Players" base; the game never changes its tables or columns.
3. **Neither: "no-op mode".** Sign-up still works and still gives the browser a player id. The API
   answers `stored: false` / `cloud: false`, and the game tells the player their progress is saved
   on this device.

With either backend, sign-ups are stored and signed-up players' progress is backed up as they
play. If storage is slow or down, the API still answers instead of failing, so the game never
breaks because of it. Each Postgres call times out after 6 seconds, each Airtable request after 8
seconds.

**Pacing (why Airtable needs care).** Airtable allows 5 requests per second per base. One request
too many and it rejects *every* request to the base for about 30 seconds. So:

- The browser pushes a signed-up player's progress at most once a minute per tab, plus right away
  when a battle ends and when the tab is hidden or closed (`lib/client/save.ts`). A routine push
  costs 1 Airtable request; a battle end costs 2-4.
- Each server instance sends Airtable at most 4 requests per second. Extra requests wait in line
  for up to 4 seconds, then give up. After a 429 ("too many requests") the instance stops
  calling Airtable for 30 seconds. It retries a 429 once, and only when Airtable sends a
  `Retry-After` of 2 seconds or less.
- Whatever could not be stored for now is not lost. A sign-up gets `503` + `Retry-After`, and the
  browser keeps it and sends it again. A save gets `{stored: false, retry: true}`, and the browser
  pushes the newest save again 45-75 seconds later (or when the tab closes). A cloud check gets
  `{retry: true}`, and the browser keeps backing up and checks again later.
- Result rows are written so a retried push never duplicates them.

Pacing is per server instance, not global. On Vercel, a classroom's requests usually share one or
a few instances, and the retries above absorb the rest: a sign-up or result may arrive a minute or
two late, but it arrives.

### Cloud save with Airtable (recommended for DCI)

The Airtable base **"Human Loop — Players"** (`appp6a1BiX6qyMUkj`) already exists with two tables:

- **Players**: one row per sign-up. Name, Email, Marketing opt-in, Signed up, Last played, Shifts
  played, Shifts won, Best stars, Player ID (the random `hl_pid` cookie value), Save data (the
  game's save as JSON; leave it alone), Save updated, and the linked Shift Results.
- **Shift Results**: one row per finished shift, linked to the player. Summary (e.g.
  *"Jamie R. · Help Desk · Won ★★★"*: first name and last initial only), Pathway, Encounter,
  Outcome (Won / Breach / Out of time), Stars, Catches, False alarms, Misses, Played at.

The game finds tables and columns by their Airtable IDs, not their names, so **renaming a table,
a column or a view is safe. Deleting a column (or changing its type) is not**: the game's writes
would then fail and progress would only be saved on players' devices. Adding your own columns,
views, filters and interfaces is fine.

**Which Airtable plan?** Airtable caps API calls per workspace per month
([details](https://support.airtable.com/docs/managing-api-call-limits-in-airtable)): **Free 1,000**
calls/month, which is not enough (one class uses that up in well under an hour); **Team 100,000**
calls/month, after which calls slow to 2 per second until the month resets; **Business and
Enterprise: no monthly cap**. Expect roughly **2,000-3,000 calls per classroom-hour** (30 players
actively playing), so a Team workspace covers about 30-50 classroom-hours a month. For regular
classroom use, put the base in a Business workspace. When the cap is hit, the server logs
`HTTP 429 PUBLIC_API_BILLING_LIMIT_EXCEEDED (monthly API call limit reached…)`, stops calling
Airtable for 10 minutes at a time, and the game keeps progress on players' devices (sign-ups are
kept in the browser and sent again).

**Owner setup (one time).** Needs someone who can edit the base and the Vercel project
**human-loop**.

1. Go to <https://airtable.com/create/tokens> and choose **Create token**. Name it
   `human-loop (Vercel)`.
2. **Scopes:** add `data.records:read` and `data.records:write` (nothing else).
3. **Access:** add **only** the **"Human Loop — Players"** base. Create the token and copy it
   (Airtable shows it once).
4. In Vercel, open **human-loop → Settings → Environment Variables**. Add `AIRTABLE_TOKEN` with the
   token as the value, for **Production** and **Preview**. (Optional: `AIRTABLE_BASE_ID` if you
   ever move to a different base. The default is `appp6a1BiX6qyMUkj`.) Do not set `DATABASE_URL`
   or `POSTGRES_URL`: when either is set, Postgres is used instead.
5. **Redeploy.** New environment variables only reach new deployments: go to **Deployments**, open
   the latest production deployment, and choose **Redeploy**.
6. **Before a public launch** also set `NEXT_PUBLIC_PRIVACY_EMAIL` (the privacy notice's contact for
   deletion and email opt-out requests) and `CRON_SECRET` (turns on the daily retention job), then
   redeploy.

To check it worked: open `/play` on the live site and sign up. The confirmation should say
*"We'll back up your progress as you play."* and a new row appears in **Players**. Play a shift and
a row appears in **Shift Results** within a few seconds.

**Handy for DCI staff:**

- People who asked to hear about DCI programs: filter **Players** on *Marketing opt-in* is checked.
  Only contact these.
- Someone asked us to delete their data: delete their **Players** row(s) (search by email; the
  same email can appear more than once because emails are not verified) **and** their linked
  **Shift Results** rows. Deleting a player row does not delete the linked results by itself.
  ("Delete my data" in the game, and the retention job, delete both. The daily retention job
  also deletes any Shift Results row that has had no player for more than a day.)
- Shift Results rows are capped: at most 5 new rows per save and 40 per player per day (history
  comes from the browser, so this stops one visitor from flooding the base). Honest play stays
  far below both.
- If the token is ever leaked, delete it at <https://airtable.com/create/tokens>, create a new one
  and update `AIRTABLE_TOKEN` in Vercel (then redeploy).

If you use Neon Postgres instead of Airtable, update the "Where it's stored" section of the privacy
notice (`app/privacy/page.tsx`), which says data is stored in Airtable.

### Cloud save with Neon Postgres (alternative)

#### Owner setup (one time)

This is the only manual step for Postgres. It needs someone with access to the Vercel project **human-loop**.

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

#### Data model (Postgres)

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

- **Personal data lives in one place:** the `players` table (Airtable: the Players table's Name and
  Email columns). The save blob never contains the name or email; the API rebuilds the profile
  from the player row when it sends a save back. Shift Results rows show only a first name and
  last initial.
- **No accounts, no linking by email.** Emails are not verified, so each sign-up creates a new
  player. The browser is linked to its data only by the random `hl_pid` cookie (httpOnly,
  `SameSite=Lax`, `Secure` in production, 1 year).
- **Nothing personal in logs.** Database errors are logged by error code only (never names,
  emails, SQL values, the connection string or the Airtable token). Airtable errors are logged as
  HTTP status plus Airtable's error type.
- **No formula injection.** The Airtable player lookup puts the cookie's player id into a formula
  only after checking it is a UUID.
- **Deletion.** "Delete my data" on `/play` calls `DELETE /api/progress`, which deletes the
  player row (the save goes with it; in Airtable, their Shift Results rows are deleted too) and
  clears the cookie. If the database can't be reached,
  nothing is deleted (on the server or the device) and the player sees an error with "Try again".
- **Shared devices.** "Not you? Sign out" on `/play` calls `POST /api/logout`, which only clears the
  cookie; the device's save is cleared too. The sign-up stays in the database.
- **Restore.** If the browser's storage is wiped but the `hl_pid` cookie survives (e.g. Safari's
  7-day limit on script storage), `/play` restores the profile and save from `GET /api/progress`.
- **Retention.** Players with no sign-up or save activity for 24 months (Airtable: *Last played*
  older than 24 months) are deleted automatically, with their Shift Results (and, in Airtable, any
  Shift Results row left without a player for more than a day):
  daily by the Vercel cron (`/api/cron/purge`, needs `CRON_SECRET`), and at most once a day per
  server instance after a sign-up, matching the privacy notice.
- **IP addresses** are used only in memory for rate limiting and are never stored.

### Handy SQL (Postgres only: Neon console → SQL Editor)

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
| `POST /api/lead`       | `{name, email, marketingOptIn, ageConfirmed: true}`   | `200 {stored, playerId}` and sets the `hl_pid` cookie. `400 {error}` bad input, `413` over 4 KB, `429 {error}` rate limited. `503 {error}` + `Retry-After` (Airtable only): storage is temporarily unavailable, no cookie; the browser sends the sign-up again. |
| `GET /api/progress`    | none                                                  | `{cloud, save, profile}` (`profile` also when there is no save row yet). `cloud` is true only if the database answered and this player exists. No cookie or no database: `{cloud: false, save: null}`. Temporarily unavailable (Airtable): `{cloud: false, save: null, retry: true}` + `Retry-After`. |
| `PUT /api/progress`    | `{save}` (a v2 `SaveData`)                            | `{stored}`. `401` without a cookie, `400` bad shape, `413` over 256 KB, `429` too many saves (see [Abuse limits](#abuse-limits)). Stores only for an existing player. Temporarily unavailable (Airtable): `{stored: false, retry: true}` + `Retry-After`. |
| `DELETE /api/progress` | none                                                  | `{ok: true}` and clears the cookie. `503 {ok: false, error}` if the database could not be reached (the cookie is kept so a retry works).   |
| `POST /api/logout`     | none                                                  | `{ok: true}` and clears the cookie. Server data is not touched.                                                                            |
| `GET /api/cron/purge`  | none (`Authorization: Bearer $CRON_SECRET`)           | `{ok: true, purged}`. `401` without the secret (or when `CRON_SECRET` is not set).                                                         |

Validation: `name` 1-80 characters after trimming, `email` a valid address of at most 254
characters, `marketingOptIn` a boolean, `ageConfirmed` exactly `true`. Unknown pathway ids in a
save are dropped.

The browser side of this contract is `lib/client/save.ts`. Server code lives in `lib/server/`
(`storage.ts` picks the backend; `airtable.ts`, `db.ts`, `validate.ts`, `player-cookie.ts`,
`rate-limit.ts`) and `app/api/`.

### Abuse limits

In-memory, per server instance (best effort, not a hard global limit): 30 sign-ups per IP per
10 minutes (`LEAD_RATE_LIMIT_PER_10_MIN`; sign-ups that fail because storage is down do not
count) and 60 saves per player per minute. With Airtable, also 12 saves per player per minute and
240 saves per IP per minute, plus the Shift Results row caps above. A rate-limited
sign-up does not break the game: the player keeps playing and progress stays on their device, and
the sign-up is kept and sent again later (after `Retry-After`, on the next visit to `/play`, or when
the browser comes back online). Only valid sign-ups count toward the limit.

## Tests

```bash
npx vitest run                 # everything
npx vitest run lib/server      # API + database code
```

The server tests cover validation, cookies, rate limits, every route in no-op mode, the
database module through the real Neon driver with a fake HTTP transport, and the Airtable backend
and routes against an in-memory fake of the Airtable API (`lib/server/airtable.fake.ts`: request
URLs, table and field IDs, formulas, batching, 429 retries, save trimming, Shift Results rows,
deletion and retention). `lib/client/save.test.ts` checks the browser's push pacing.

`lib/server/db.pg.test.ts` goes further and runs the whole flow (sign up, save, load, delete,
retention) against a **real Postgres**. It is skipped unless `HL_TEST_PG_URL` is set, and it
needs the `psql` command-line tool:

```bash
# A throwaway database; the test drops and recreates the players/saves tables.
createdb hl_test
HL_TEST_PG_URL=postgresql://USER:PASSWORD@localhost:5432/hl_test npx vitest run lib/server
```

## How a first visit plays

1. **Practice** (`content/help-desk/practice.json`, about 90 seconds): four tickets, one at a time,
   with only Inspect and Block. Dana's hint line above the main button says what to tap
   (`lib/game/coach.ts`, a pure function of the battle state; it never reads which plans are
   safe). It can't end in a breach, and it never counts toward attempts, wins, best or history.
   Presenters can tap **Skip practice** (on the intro and in the office).
2. **The real shift** (`content/help-desk/encounter-01.json`): starts with Inspect and Block, then
   adds one new card per turn (the encounter's `unlocks` list: Policy on turn 2, Escalate on 3,
   Roll Back on 4, Coffee on 5). On the first shift, the hint line adds one tip per new card, at
   the start of that turn, only while the card can be played; "Out of energy" and "No Inspect
   left" always win over a tip.

The main button is always **Approve** ("Approve 2 plans"): Ollie does every plan you didn't
stop. While Ollie works, the same button reads **Next** and shows one outcome per tap; the small
**Skip** link above it skips only the plain "Done." outcomes and stops at the next risky one. A saved battle made before the content changed fails `canResume` and starts fresh.

## Skills and generated shifts (M3 systems)

Skill mastery (engine) and the screens that show it.

**Screens.** After the first Monday attempt, Ollie's desk (the hub's bottom card and the desk
dialogue) offers one button, *Start today's practice* (then *One more shift*, or *Resume practice*
/ *Resume drill*), with a note such as "4 tickets · about 6 min · Focus: Check who's asking", plus
*Replay Monday* and *Your skills* links; the TODAY banner and Ollie's and Dana's lines switch to
returning-player text (`returningLines` in `hub.json`). A daily or drill opens with one intro screen
(`components/hub/ShiftIntro.tsx`: what it is, the focus, Dana's and Ollie's 2 lines, *Start*).
"Practice this" never replaces a paused battle: it shows the Resume / Start over prompt, and Your
skills shows *Resume shift* instead while one is saved. **Your skills** (`components/skills/SkillsScreen.tsx`, also
from the menu, Dana's whiteboard and `/play/help-desk?view=skills` on `/play`) shows Dana's 3
questions, a *Next up* card with one reason and *Practice this · N tickets* (a drill), the skills met
so far with pips and a level word (never percentages), *Review due* tags (only the 2 due skills that
need it most) and 7 day dots; a row opens `SkillDetail` (meaning, where to look, the next pip, last 6
calls as check / half / cross, the latest miss's tell; a partly right call only when no miss is recent).
Drills show "Drill: <skill>" above the meters and the "Where to look" line at the top of the
evidence sheet until Solid. Plan toasts carry a skill chip (not in practice) with a result shape only
once the outcome is final (`skillsView.liveGrade`: "Back in line", "Can still roll back", "Not checked").
*Skills moved* on a daily result lists drops first (with a reason), then the focus, then a new Solid.
Daily and drill results use `components/battle/ShiftResult.tsx`; every result screen lists one line
per plan, mistakes first, with its tell (`components/skills/PlanList.tsx`), and each line opens the
full debrief row. Every help desk step (fixed and bank) has a `tell`.

- **Skills** (`lib/game/skills.ts`): six lens skills, one tagged on every help desk step
  (`AgentStep.skill`), plus "Approve what checks out" (`approve-checked`), computed from how safe
  plans were handled.
- **One grading function** (`lib/game/mastery.ts` `gradePlan`): each plan's final outcome becomes
  right / partly / missed plus skill "calls" (the full table is at the top of the file). The
  debrief (`useBattle.debriefRows`), the practice result and the skill records all use it, so
  they never disagree. The first 2 practice steps (`guidedSteps`) never count.
- **Levels** New / Learning / Practicing / Solid / Sharp, at most one level per shift, never back
  below Learning, and never down after a shift with no miss; Solid needs calls on 2+ days and Sharp
  a right review 3+ days later. Review
  intervals 1 / 2 / 4 / 7 days; nothing decays silently.
- **Battle end** (`GameShell`): `applyBattle` runs once per battle for every mode, keyed
  `${encounterId}:${seed}`, and a step scored in the last 2 days does not count again.
- **Daily practice and drills** (`lib/game/shiftGen.ts`): `planDaily` / `planDrill` pick whole
  tickets from the bank (`content/help-desk/bank/`) by skill need, seeded by player id and count,
  and return a `ShiftSpec`; `buildShift` rebuilds the same encounter from it. A daily never puts 2
  risky plans on one turn (3 energy can't inspect both and block both), and when the lead focus is a
  lens skill it includes a fresh risky plan of it. Ollie's lines rotate with the shift count. The spec is kept in
  `progress.shift`, so `PathwayBundle.encounterFor` (`lib/pathways/create.ts`) and `canResume` resume it like any
  battle. A spec from an older bank (`BANK_VERSION`) is dropped and the shift starts fresh.
  Dailies can't breach; stars, attempts, wins and best stay Monday-only.
- **Save** (still version 2): new optional `PathwayProgress` fields (`skills`, `shift`,
  `dailyCount`, `drillCount`, `recentTickets`, `scored`, `applied`, `days`) and history fields
  (`mode`, `right`, `partly`, `missed`, `focus`), rebuilt field by field in `lib/client/save.ts`.
  Older saves load with empty skills.
- **Airtable**: daily and drill rows keep their id in Encounter (`hd-daily-7`) and read
  *"Jamie R. · Help Desk · Daily practice · 7/9 right"*. Optional columns (Mode, Right, Partly,
  Missed, Focus skill; Players: Skill levels) are written only once their field ids are filled in
  `OPTIONAL_RESULT_FIELDS` / `OPTIONAL_PLAYER_FIELDS` in `lib/server/airtable.ts`.

## Pathways (multi-pathway architecture)

Each playable pathway is a **bundle** (`PathwayBundle`, `lib/pathways/types.ts`) built by
`createPathway()` (`lib/pathways/create.ts`) from its JSON in `content/<pathway>/` plus a typed hub
map. The game shell gets the bundle as a prop (`<GameShell pathway={HELP_DESK} />`) and shares it
with every component through React context (`usePathway()`, `lib/pathways/context.tsx`). Shared code
(`lib/game/**`, `components/**`) never imports a pathway's content; ESLint enforces it
(`no-restricted-imports` in `eslint.config.mjs`), and `npm run check:bundles` checks the built
routes. Pure libraries get pathway facts from fields hydrated onto the `Encounter` (`coach`,
`headlines`), authored fields (`coachScript` in practice.json), `CARDS` (`autoInspect`) and explicit
options (`BuildOptions`, the id prefix). When a field is missing, the Help Desk default applies
(`lib/game/helpDeskDefaults.ts`, the only shared file allowed to name Dana or Ollie).

| Piece | Where |
| --- | --- |
| Registry (name, agent, status, id prefix, story id/title, page title) | `lib/types.ts` `PATHWAYS` |
| Coach, clients, step categories, policy card, UI copy, card wording, headlines | `content/<pathway>/pathway.json` |
| Skill copy (what it means, where to look, example, question hints) | `content/<pathway>/skills.json` |
| Practice, story, hub, bank, shift shells | `content/<pathway>/*.json`, `bank/*.json` |
| Room layout, cast, blink lights, room colours | `lib/pathways/<pathway>/hubMap.ts` |
| The bundle | `lib/pathways/<pathway>/index.ts` |
| Client entry (the only importer of the bundle) | `components/game/entries/<Pathway>Game.tsx` |
| Route (static, one per pathway) | `app/play/<pathway>/page.tsx` (+ `loading.tsx`, and `error.tsx` when the pathway's agent is not Ollie: the root `app/error.tsx` shows Ollie) |

Shared across pathways: the 7 skills (ids, names, icons), the 3 question titles, the cards'
mechanics, the engine, mastery and the daily/drill generator. Saves are per pathway
(`SaveData.pathways[id]`). The saved power name stays `powers.callbackPolicy` for every policy
card (a policy card is any card with `autoInspect`; an encounter has at most one).

### Adding a pathway

1. Content in `content/<pathway>/`: `pathway.json`, `skills.json`, `practice.json`,
   `encounter-01.json`, `hub.json`, `bank/shift.json`, `bank/tickets-*.json` (same shapes as the
   Help Desk; speakers are `coach`, `agent`, `narrator`; every id starts with the pathway's prefix).
2. Art in `public/game/sprites/` and entries in `lib/game/assets.ts` `SPRITES` with `kind` and
   `tone` (the agent needs `<agent>` and 5 portraits `<agent>-idle|eager|busted|sad|celebrate`).
3. `lib/pathways/<pathway>/hubMap.ts` (one `role: "agent"` and one `role: "coach"` character, one
   `kind: "antenna"` blink light on the agent, optional `theme`) and `lib/pathways/<pathway>/index.ts`
   (`createPathway({...})`).
4. `components/game/entries/<Pathway>Game.tsx`, `app/play/<pathway>/page.tsx` (metadata from the
   registry), `loading.tsx` and `error.tsx` (a copy of `app/error.tsx` with the pathway's agent).
5. Fill the registry entry in `lib/types.ts`, flip `status` to `"live"`, add the bundle to
   `TEST_PATHWAYS` and its expectations to `EXPECT` (`lib/pathways/testing.ts`). The per-pathway
   suites (content, bank, hub map, generated shifts, balance) then run on it.
6. Add its route and marker to `scripts/check-bundles.mjs`, then run every gate plus
   `npm run build && npm run check:bundles`.

The Help Desk golden (`lib/game/golden.test.ts`, `lib/game/__golden__/`) holds everything a Help
Desk player sees or a save depends on (plans, seeds, generated shifts, coach lines, toasts, debrief
text, headlines, card and UI copy). It must stay identical; re-capture it only for an intended Help
Desk change (`GOLDEN_WRITE=1 npx vitest run lib/game/golden.test.ts`).

## Project layout

```
app/            routes (home, /play, /privacy) and app/api/* (lead, progress)
components/     site UI, battle UI, hub UI, Phaser stage
content/        authored game content (JSON)
lib/game/       game rules engine, cards, mastery, generator, types (shared by every pathway)
lib/pathways/   pathway bundles (createPathway, context, one folder per pathway), test registry
lib/client/     browser save (localStorage first, optional cloud sync)
lib/server/     server-only code for the API routes
public/         brand and game art
```
