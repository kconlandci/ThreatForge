# Human Loop: working rules

Read this first. It applies to every session, human or AI.

## What this is

A browser card game by DCI Resources (a workforce nonprofit). It teaches adult learners to supervise
AI agents: check an AI coworker's plan before it runs. Many learners are English language learners
on phones, and some are 13+. It is a real practice tool for students and a demo for funders.
The app lives in `apps/human-loop`. It moves to its own repo at launch (`docs/launch-plan.md`).
The README explains the code. This file explains how we work.

## Branch

- Work and push only on `claude/dci-ai-oversight-game-gjm3rg`. If a session starts on another
  branch, ask the owner (Kevin) before pushing anywhere.
- No pull requests unless the owner asks.
- Two sessions may touch this branch. Run `git fetch` and look at `git log` first. Pull before you push.

## How to work with the owner

- Replies are short. Bullets. Lead with the answer. Plain words, no jargon (or explain it in one
  line). The owner is often tired. No walls of text.
- Small jobs: just do them. Anything bigger than about half a day: say the size and ask first.
- Agent teams, the Workflow tool and Ultracode are allowed for real build work. The owner does not
  want usage burned nonstop. So: never use them for small jobs. For a big job, say what you would
  run and roughly how big it is, and wait for a yes. Keep runs bounded. No open-ended loops or
  background polling.
- Tie work to real learners and testers. AI playtester findings are hints, not learner evidence.
- Do not start anything marked "Later" or "On hold" in the Roadmap until the owner says so.
- Emails and messages are drafts only. Never send unless asked. Messages to students are short and
  formal, 2 to 3 sentences.

## Roadmap and change history

- The roadmap is the **Roadmap** table in the Airtable base `appp6a1BiX6qyMUkj` (table
  `tblBzbBOWFnKZjCQ8`). Keep it current: when a job finishes or a decision changes, update its row.
  Say where a fact came from if you did not check it yourself.
- Change history is git. Commit messages say what changed and why.
- Do not change the tables or columns of Players, Shift Results or Feedback. The game finds them
  by ID, and deleting a column breaks saves. Adding your own tables is fine.

## Checks before every push

Run from `apps/human-loop`:

- `npx tsc --noEmit`
- `npx eslint .`
- `npx vitest run` (3 tests skip: the Postgres tests need `HL_TEST_PG_URL`)
- `npx next build`
- `npm run check:bundles` (7 routes ok)
- Layout or flow changes also need `BASE=http://localhost:PORT npm run e2e:first-five`. It takes
  about 25 minutes. Narrow it with `SIZES`, `PATHS` or `RUNS`. Playwright is loaded from
  `PW_MODULE` (default `/tmp/pwrun/node_modules/playwright`; install it there with
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright` if missing). Chromium is at
  `/opt/pw-browsers/chromium`.
- Dev server: use `NEXT_DIST_DIR=.next-alt`. Stop servers by PID, never with `pkill` patterns.

**Help Desk golden** (`lib/game/__golden__/help-desk.json`). Recapture only on purpose:
`GOLDEN_WRITE=1 npx vitest run lib/game/golden.test.ts`. First compare old and new. Traces are
hashed, so save raw traces before and after (a temporary copy of `golden.test.ts` with `sha`
returning its input works) and check that only the intended rows changed. Then log the change in
the "Intended changes" header of `golden.test.ts`.

## Commits

- Small commits. Run the checks first. Never commit secrets.
- No model names in commits or pull requests.

## Hosting and data

- Vercel project `prj_GbdyKippI3tgtDPSKsAVucB7UH0l`, team `team_BiaG3hIWwO8If7Q0bISxVsHA`.
- Staff and students test on one pinned preview deployment (`dpl_HRn1RTuWJFyYZ8yyrkedea8iWoJt`)
  through a 90-day share link that the owner holds. **Never call `web_fetch_vercel_url` or
  `get_access_to_vercel_url` on that deployment.** A deployment allows only one share link, and
  those tools replace it. That already broke the link once.
- New pushes create new preview deployments. Testers stay on the pinned one.
- Production (`human-loop-eight.vercel.app`) still serves the old v1. Moving this version there is
  the owner's call. The project has login protection on everything except custom domains.
- The dev container cannot reach `vercel.app`.
- `AIRTABLE_TOKEN` exists only on Vercel, so `stored:false` locally is expected. The owner pastes
  tokens into Vercel, never into chat. Never write a token or a share link into the repo.

## Writing and content

- Plain, short sentences. Learners may be reading in a second language.
- All names are made up, and the footer says so. Keep the core names (Fenwick IT Solutions,
  Harlow & Cole, Bramwell Logistics, Pinecrest Dental). Do not add names that match real
  businesses. The banned-name test guards this.
- Story evidence states facts, not verdicts. Practice copy has word limits and a verdict-word ban
  (`lib/game/content.test.ts`).
- Music is off by default. The three songs were made with Gemini. The licence wording in
  `lib/client/music.ts` has not been checked against Gemini's terms.
- Leave the old Jules branches alone.
