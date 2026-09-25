# Full-Stack Development ticket bank (app team)

20 tickets · 50 plans · 30 safe (60.0%) · 7 scary-safe · 11 routine-risky · 22 code plans (10 safe, 12 risky).
Piper errs both ways: 10 risky plans do too much (over, including every leak of a key or personal data), 10 trust a label (under: a green build, "official" in a name, lots of likes, a user's claim, its own review, an old OK, "the last good version", a test that checks nothing). 4 risky plans can't be undone.
Pattern: S = safe, R = risky, each plan's lens skill, in announce order. "code" plans are the ones **Policy: Code Review** auto-inspects. "Skill" is the skill of the ticket's first risky plan (or its first plan when it has no risky plan).

| Ticket | # | Company | Title | Skill | Diff | Pattern |
|---|---|---|---|---|---|---|
| fs-a-kellan-cors | #82101 | Bramwell Logistics | Kellan's site can't show tracking | match-request | D1 | R match-request (routine-risky, over, code) → S match-request (code) |
| fs-a-flaky-test | #82138 | Harlow & Cole | A test fails 1 time in 5 | confirm-fix | D2 | S confirm-fix → R confirm-fix (over, code) → S confirm-fix (code) |
| fs-a-key-in-chat | #82175 | Pinecrest Dental | An API key in the team chat | guard-data | D1 | S guard-data (scary-safe) → R guard-data (routine-risky, over, irreversible) → S guard-data |
| fs-a-dock-migration | #82212 | Bramwell Logistics | Add dock numbers to loads | safe-change | D3 | S safe-change → R safe-change (routine-risky, over) → S safe-change (scary-safe) |
| fs-a-forum-search | #82249 | Harlow & Cole | Search clients by last name | confirm-fix | D2 | R confirm-fix (routine-risky, under, code) → S confirm-fix (code) |
| fs-a-double-texts | #82286 | Pinecrest Dental | Patients get reminder texts twice | confirm-fix | D2 | R confirm-fix (routine-risky, under) → S confirm-fix → S match-request (scary-safe, code) |
| fs-a-freeze-hotfix | #82323 | Harlow & Cole | A fix during the code freeze | check-approval | D1 | S check-approval (scary-safe, code) → R check-approval (under, code) |
| fs-a-public-issue | #82360 | Harlow & Cole | A package bug on the upload page | guard-data | D2 | R guard-data (routine-risky, over, irreversible) → S guard-data |
| fs-a-kellan-access | #82397 | Bramwell Logistics | Two requests for tracking access | verify-identity | D2 | S check-approval → R verify-identity (under) → S verify-identity |
| fs-a-slow-schedule | #82434 | Pinecrest Dental | The schedule page is slow | match-request | D3 | S match-request → R match-request (routine-risky, over, code) → S confirm-fix |
| fs-b-overwrite | #82471 | Bramwell Logistics | Two changes to the same page | safe-change | D2 | R safe-change (routine-risky, over, code) → S check-approval |
| fs-b-map-package | #82508 | Bramwell Logistics | Add a map to the tracking page | verify-identity | D2 | S verify-identity → R verify-identity (under, code) → S verify-identity (code) |
| fs-b-bill-pay | #82545 | Pinecrest Dental | Bill pay rounds the wrong way | check-approval | D2 | S check-approval (code) → R check-approval (routine-risky, under, code) |
| fs-b-staging-data | #82582 | Harlow & Cole | Staging needs realistic data | guard-data | D2 | S guard-data → R guard-data (routine-risky, over, irreversible) |
| fs-b-dead-code | #82619 | Bramwell Logistics | Old code nobody uses | match-request | D3 | S safe-change (scary-safe, code) → R match-request (over, code) |
| fs-b-statement-peek | #82656 | Harlow & Cole | A client saw someone else's statement | confirm-fix | D3 | R confirm-fix (under, code) → S confirm-fix (code) → S guard-data |
| fs-b-front-desk | #82693 | Pinecrest Dental | Front desk asks for admin | check-approval | D1 | R check-approval (under) → S check-approval |
| fs-b-checkin-down | #82730 | Bramwell Logistics | Drivers can't check in | safe-change | D2 | R safe-change (under, code) → S safe-change (scary-safe, code) → S confirm-fix |
| fs-b-password-guess | #82767 | Harlow & Cole | Password guessing on the portal | guard-data | D2 | S check-approval (scary-safe) → R guard-data (routine-risky, over, irreversible, code) → S guard-data |
| fs-b-webhook | #82804 | Pinecrest Dental | Larkfield asks for a new address | verify-identity | D3 | R verify-identity (under) → S verify-identity |

Tickets `fs-a-*` (#82101-#82434) and `fs-b-*` (#82471-#82804) come from two writers. Keep the order of the tickets in each file: it feeds BANK_VERSION, so reordering changes every saved daily plan.

Difficulty: D1 ×4, D2 ×11, D3 ×5. Companies: Bramwell Logistics 7, Harlow & Cole 7, Pinecrest Dental 6. Categories: code 22, comms 9, data 7, access 4, lookup 3, credential 3, ticket 2.

## Plans per lens skill (bank)

| Skill | Safe | Risky | Over | Under |
|---|---|---|---|---|
| verify-identity | 4 | 3 | 0 | 3 |
| check-approval | 6 | 3 | 0 | 3 |
| match-request | 3 | 3 | 3 | 0 |
| confirm-fix | 7 | 4 | 1 | 3 |
| guard-data | 6 | 4 | 4 | 0 |
| safe-change | 4 | 3 | 2 | 1 |

## Tell-leak guards

- "Piper's reason" rows: 12 safe, 13 risky (52.0% on risky plans; the limit is 65%). The reason row is always the 2nd row, on safe and risky plans alike, so its position says nothing. Safe reasons brag too, and some risky reasons sound sensible: judge the facts, not the tone.
- Mean evidence rows: safe 3.83, risky 3.90 (the limit is a 0.5 gap).
- "Piper's confidence: NN%" appears only in rows that are not red flags, and never in a plan's last row (writer A: 3 safe, 3 risky; writer B: 3 safe, 3 risky; the test needs 2 of each per writer). A confidence number is never evidence.
- Speed numbers ("Done in 40 seconds!") and line counts sit on safe plans too. Speed is never a red flag by itself.
- Quips: Piper quotes Leo, "checks" and jokes about docs on safe and risky plans alike, so a quip never decides a plan.
- A risky plan's first evidence row is never red; its red rows are together at the end. Safe plans have no red rows.
- No intent uses a card or button word (Block, Escalate, Approve, Inspect, Roll back, Undo). Going back is "Revert"; a flag is "Turn off ... with its flag".
- Risky intents don't give themselves away: no "too", "now", "anyone", "as well", "own" or "all" in them.
- The same verb gets opposite answers: Merge (PR #408 with a human review vs PR #417 with only piper-bot's), Add package (wayfell-maps from Wayfell's account vs wayfel-maps one letter off), Revert (the fixed practice's portal revert is safe; tracking back to 7.3 after a database change is not), Turn off (a feature flag vs a failing test), Delete (dead fax code vs the check-in page 60 drivers use), Close (a user confirmed vs "it works on Piper's test server").

## Fallback daily

`fallbackDaily` in shift.json: `fs-b-checkin-down`, `fs-a-flaky-test`, `fs-b-bill-pay`, `fs-a-kellan-cors`. It is used when the planner can't build a daily from the player's records. Together: 10 plans, 6 safe, both twists, all 3 companies, and a plain safe opener. Keep these 4 tickets' patterns as they are.

## Fixed shifts (not in the bank)

| Shift | Step | S/R | Skill | Category | Twist / direction |
|---|---|---|---|---|---|
| practice | fs-phone-field | S | match-request | code | - |
| practice | fs-self-merge | R | check-approval | code | under |
| practice | fs-hc-revert | S | safe-change | code | scary-safe |
| practice | fs-form-log | R | guard-data | code | routine-risky, over, irreversible |
| encounter-01 | fs-track-errors | S | confirm-fix | lookup | - |
| encounter-01 | fs-hc-flag-off | S | safe-change | code [P] | scary-safe |
| encounter-01 | fs-track-close | R | confirm-fix | ticket | routine-risky, under |
| encounter-01 | fs-pd-key-rotate | S | guard-data | credential | scary-safe |
| encounter-01 | fs-lark-package | R | verify-identity | code [P] | under |
| encounter-01 | fs-lark-docs | S | verify-identity | lookup | - |
| encounter-01 | fs-hc-date-fix | S | check-approval | code [P] | - |
| encounter-01 | fs-pd-cleanup | R | match-request | data | routine-risky, over, irreversible |
| encounter-01 | fs-track-test-data | S | guard-data | data | - |
| encounter-01 | fs-hc-late-release | R | safe-change | code [P] | over |

[P] = auto-inspected by Policy: Code Review (the card unlocks on turn 2 of the story; practice has no policy card, and all 4 practice plans are "code" on purpose). The story is a numerical clone of the cloud story (cn-01-tuesday): same safe/risky slots, risk, progress, policy-covered slots and risky reversibility. Do not reorder it.

## Rules for new tickets

- Ids: `fs-a-*` or `fs-b-*`, 24 characters or fewer. Step id = ticket id + `-1`, `-2`, `-3`. The ticket string is `#NNNNN · <Company>` for every plan of a ticket.
- Categories: lookup (read-only: logs, running one test, reading docs, comparing settings), credential (make, rotate or store keys and passwords), comms (messages, calls, public posts, review requests), ticket (close, reopen or mute a bug), access (app roles, admin accounts, sign-in lockout), data (migrations, indexes, backups, drops, deletes, copying data to staging, where booking updates are sent), code (merges, releases, reverts, feature flags, packages, turning tests on or off, the API allow list, log lines, overwriting a branch, deleting code or pages).
- Every risky plan has `direction`: "over" (does too much, including any leak of a key or personal data) or "under" (trusts a label, a green build, a user's claim, a vendor email or its own review).
- `undoNote` only on plans that change nothing and are not lookups: a phone call ("Nothing to undo. A phone call changes nothing.") or a backup ("Nothing to undo. A backup only makes a copy."). Never on a sent message or post. Lookups get the UI's own "It only reads" line.
- IPv4 only in 192.0.2.x, 198.51.100.x, 203.0.113.x or 10.x (staging is 10.12.0.0/16). Package and app versions have two parts ("version 4.2"). Phones only (NNN) 555-01xx; personal emails use the .example domain. No weekday names. Write "dates like 2026-09-30", "TLS cert" and "tax ID". Pinecrest's 7-year records rule is "Pinecrest's policy", not law.
- No real code hosts, package registries, frameworks, databases, cloud providers, AI products, browsers or test tools (the DEV_BRANDS list in lib/pathways/testing.ts, plus English-word brands like Express, Rails, Render, Cursor or Vault as proper nouns). Generic words are fine: pull request, code review, package, build, test, database, API key, feature flag, staging, JavaScript, SQL. Write "API allow list", never the acronym for it.
- Gloss jargon in plain words at first use in each plan (pull request, merge, build, revert, migration, feature flag, code freeze, staging, API allow list, key vault, rotate, package, look-alike package, SQL injection, flaky test, hotfix, shared branch, index, mask, webhook, on call). Sentences of 15 words or fewer.
- Limits: intent 48, quip 110, evidence label 28, detail 140, each outcome 160, lesson 160, tell 80 (and not the same as the lesson), title 40, 2-4 evidence rows.
- Every `escalated` outcome is Leo getting it right. `rolledBack` exists only when the plan is reversible.
- Number ranges: fixed shifts PR #200-#299 and #500-#549, CHG-4500-4549, 203.0.113.2-.9; writer A PR #300-#399, CHG-4600-4649, case #83000-#83499, 203.0.113.10-.29; writer B PR #400-#499, CHG-4700-4749, case #83500-#83999, 203.0.113.30-.44.
- Once the pathway is registered, lib/game/bank.test.ts and lib/game/content.test.ts check all of this (plus the bank mix above) for every live pathway.
