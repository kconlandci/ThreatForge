# Business Analyst ticket bank (analytics team)

20 tickets · 52 plans · 31 safe (59.6%) · 7 scary-safe · 11 routine-risky · 26 report plans (13 safe, 13 risky).
Quill errs both ways: 11 risky plans do too much (over: sending, deleting, merging, bulk changes, a new metric rule, extra scope, an edit in place to signed-off requirements, a forecast shown as a fact, a cut chart axis, an open share, any personal data leaving), 10 trust a label, a number or a person (under: a "Success" refresh, a 12-answer survey, a vendor's sales claim, a pivot total, two changes read as one cause, a non-owner's request, a "VP" email, its own sign-off, an old or chat sign-off, a look-alike address). 6 risky plans can't be undone.
Pattern: S = safe, R = risky, each plan's lens skill, in announce order. "report" plans are the ones **Policy: Source Check** auto-inspects. "Skill" is the skill of the ticket's first risky plan (or its first plan when it has no risky plan).

| Ticket | # | Company | Title | Skill | Diff | Pattern |
|---|---|---|---|---|---|---|
| ba-a-online-booking | #92101 | Pinecrest Dental | Did online booking cut no-shows? | confirm-fix | D3 | R confirm-fix (under, irreversible) → S confirm-fix (scary-safe) |
| ba-a-on-time-rule | #92138 | Bramwell Logistics | A new rule for 'on time' | verify-identity | D2 | S verify-identity → R verify-identity (under, report) → S safe-change (report) |
| ba-a-portal-survey | #92175 | Harlow & Cole | A survey with 12 answers | confirm-fix | D1 | S confirm-fix → R confirm-fix (routine-risky, under, report) → S match-request (report) |
| ba-a-larkfield-visits | #92212 | Pinecrest Dental | Larkfield asks for visit data | guard-data | D2 | S verify-identity → R guard-data (routine-risky, over, irreversible) → S guard-data |
| ba-a-slow-tickets | #92249 | Fenwick IT Solutions | Dana's help desk numbers | safe-change | D2 | S confirm-fix → R safe-change (routine-risky, over, irreversible) → S match-request (report) |
| ba-a-upload-reqs | #92286 | Harlow & Cole | Requirements for tax-form uploads | match-request | D3 | S match-request (scary-safe, report) → R match-request (routine-risky, over, report) → S check-approval (report) |
| ba-a-dup-customers | #92323 | Bramwell Logistics | Duplicate customers in the CRM | match-request | D3 | S safe-change (scary-safe) → R match-request (routine-risky, over, irreversible) |
| ba-a-open-link | #92360 | Pinecrest Dental | Dentists want the dashboard | guard-data | D1 | R guard-data (routine-risky, over, report) → S guard-data (report) → S guard-data (scary-safe, report) |
| ba-a-vp-email | #92397 | Fenwick IT Solutions | An email from a 'VP of Sales' | verify-identity | D2 | R verify-identity (under, irreversible) → S verify-identity → S verify-identity |
| ba-a-forecast | #92434 | Harlow & Cole | A forecast on slide 9 | confirm-fix | D2 | R confirm-fix (over, report) → S confirm-fix (report) |
| ba-b-pivot-total | #92471 | Pinecrest Dental | Visits doubled overnight? | confirm-fix | D1 | R confirm-fix (routine-risky, under, report) → S confirm-fix (report) |
| ba-b-old-signoff | #92508 | Harlow & Cole | The reply-time report, version 3 | check-approval | D2 | R check-approval (routine-risky, under, report) → S check-approval |
| ba-b-driver-data | #92545 | Bramwell Logistics | The warehouse wants driver data | verify-identity | D2 | R verify-identity (under) → S verify-identity → S guard-data |
| ba-b-survey-clean | #92582 | Pinecrest Dental | Clean up the patient survey | safe-change | D2 | S safe-change (scary-safe) → R safe-change (routine-risky, over, irreversible) → S match-request (report) |
| ba-b-crm-inactive | #92619 | Fenwick IT Solutions | Old contacts in the CRM | match-request | D2 | S safe-change → R match-request (routine-risky, over) → S match-request |
| ba-b-limit-share | #92656 | Bramwell Logistics | Who can see the on-time dashboard? | guard-data | D1 | S guard-data (scary-safe, report) → R guard-data (over, report) |
| ba-b-review-slides | #92693 | Harlow & Cole | The review slides need numbers | confirm-fix | D2 | R confirm-fix (under, report) → S confirm-fix (report) → R match-request (over, report) |
| ba-b-renewal-score | #92730 | Fenwick IT Solutions | The renewal deck's survey score | check-approval | D3 | S confirm-fix → S confirm-fix (scary-safe) → R check-approval (under, report) |
| ba-b-reqs-edit | #92767 | Pinecrest Dental | Edits to signed-off requirements | safe-change | D2 | R safe-change (over, report) → S check-approval |
| ba-b-early-send | #92804 | Bramwell Logistics | Who signed off the monthly report? | check-approval | D1 | R check-approval (routine-risky, under, report) → S check-approval (report) |

Tickets `ba-a-*` (#92101-#92434) and `ba-b-*` (#92471-#92804) come from two writers. Keep the order of the tickets in each file, and of the plans in each ticket: the ids feed BANK_VERSION, so reordering changes every saved daily plan. Titles are not part of BANK_VERSION.

Difficulty: D1 ×5, D2 ×11, D3 ×4. Companies: Pinecrest Dental 6, Bramwell Logistics 5, Harlow & Cole 5, Fenwick IT Solutions 4 (Fenwick's own work: Dana's help desk numbers, the CRM, the renewal deck). Categories: report 26, data 12, comms 8, lookup 5, access 1. No ticket has two risky plans in a row.

## Plans per lens skill (bank)

| Skill | Safe | Risky | Over | Under |
|---|---|---|---|---|
| verify-identity | 5 | 3 | 0 | 3 |
| check-approval | 4 | 3 | 0 | 3 |
| match-request | 5 | 4 | 4 | 0 |
| confirm-fix | 8 | 5 | 1 | 4 |
| guard-data | 5 | 3 | 3 | 0 |
| safe-change | 4 | 3 | 3 | 0 |

## Tell-leak guards

- "Quill's reason" rows: 14 safe, 18 risky (56.3% on risky plans; the limit is 65%). The reason row is always the 2nd row, on safe and risky plans alike, so its position says nothing. Safe reasons brag too ("I left it at 91%. It looks shy."), and some risky reasons sound sensible ("A sign-off doesn't expire!"): judge the facts, not the tone.
- Mean evidence rows: safe 3.81, risky 3.95 (the limit is a 0.5 gap).
- "Quill's confidence: NN%" appears only in rows that are not red flags, and never in a plan's last row (writer A: 4 safe, 5 risky; writer B: 3 safe, 6 risky; the test needs 2 of each per writer). A confidence number is never evidence.
- Bold fonts, round numbers, gold headlines and chart counts sit on safe plans too. None of them is a red flag by itself.
- A risky plan's first evidence row is never red; its red rows are together at the end. Safe plans have no red rows.
- No intent uses a card or button word (Block, Escalate, Approve, Inspect, Roll back, Undo). Taking a live report down is "Unpublish"; a sign-off is "after A. Mensah's OK".
- Risky intents don't give themselves away: no "too", "now", "anyone", "as well", "own" or "all" in them. No first verb is risky-only in a way that decides the plan: "Change" (the 'on time' draft), "Put" (the "too few to tell" slide) and "Publish", "Share", "Add", "Merge", "Remove", "Delete" all appear on safe plans too.
- The same verb gets opposite answers: Merge (38 pairs D. Ruiz checked, after a backup and the owner's OK, vs 140 "close match" pairs with different tax IDs; the story merges 226 when 14 were asked), Remove (9 answers marked TEST, 23 ex-staff viewers, 3 dropped needs vs 31 real one-star answers), Delete (the story's spare patient export vs 3 real help desk tickets or a signed-off requirement), Share (3 named dentists who sign in vs anyone with the link; Kellan's whole group), Publish (the fixed total, the owner's OK on this version vs a doubled total, an old sign-off, a chat "Looks good!"), Change 'on time' (a side-by-side draft for the owner vs a new rule nobody approved), Tell Dr. Pell ("too few to tell" vs "online booking halves no-shows"), Send to a vendor (40 visits, 3 fields, Secure Share vs the whole export by email).
- Bad news is safe: "Tell E. Brennan the real score is 4.3, not 4.8" and "Tell Dr. Pell the data can't answer it yet" are scary-safe.

## Fallback daily

`fallbackDaily` in shift.json: `ba-a-portal-survey`, `ba-b-limit-share`, `ba-a-open-link`, `ba-b-early-send`. It is used when the planner can't build a daily from the player's records. Together: 10 plans, 6 safe, both twists (scary-safe B6-1 and A8-3; routine-risky A3-2, A8-1 and B10-1), 3 companies, all D1, and a plain safe opener (A3). Keep these 4 tickets' patterns as they are: one more plan would exceed the daily plan limit.

## Fixed shifts (not in the bank)

| Shift | Step | S/R | Skill | Category | Twist / direction |
|---|---|---|---|---|---|
| practice | ba-text-or-call | S | match-request | report | - |
| practice | ba-self-signoff | R | check-approval | report | under |
| practice | ba-fuel-archive | S | safe-change | report | scary-safe |
| practice | ba-noshow-list | R | guard-data | report | routine-risky, over, irreversible |
| encounter-01 | ba-ontime-compare | S | confirm-fix | lookup | - |
| encounter-01 | ba-hc-unpublish | S | safe-change | report [P] | scary-safe |
| encounter-01 | ba-ontime-close | R | confirm-fix | ticket | routine-risky, under |
| encounter-01 | ba-pd-export-delete | S | guard-data | data | scary-safe |
| encounter-01 | ba-lark-share | R | verify-identity | report [P] | under |
| encounter-01 | ba-lark-owner | S | verify-identity | lookup | - |
| encounter-01 | ba-hc-deck-share | S | check-approval | report [P] | - |
| encounter-01 | ba-pd-merge | R | match-request | data | routine-risky, over, irreversible |
| encounter-01 | ba-wayfell-sample | S | guard-data | data | - |
| encounter-01 | ba-hc-ontime-rule | R | safe-change | report [P] | over |

[P] = auto-inspected by Policy: Source Check (the card unlocks on turn 2 of the story; practice has no policy card, and all 4 practice plans are "report" on purpose). The story is a numerical clone of the cloud (cn-01-tuesday) and full-stack (fs-01-thursday) stories: same safe/risky slots, risk, progress, policy-covered slots (#2, #5, #7, #10) and risky reversibility. Do not reorder it.

## Rules for new tickets

- Ids: `ba-a-*` or `ba-b-*`, 24 characters or fewer. Step id = ticket id + `-1`, `-2`, `-3`. The ticket string is `#NNNNN · <Company>` for every plan of a ticket; the company is Harlow & Cole, Bramwell Logistics, Pinecrest Dental or Fenwick IT Solutions (Fenwick's own reports and CRM).
- Categories: lookup (read-only: run or compare a query, count answers, read the owner list or a contract), comms (messages, calls, change requests, asking an owner, bad news to a stakeholder, forwarding to Kofi's security team), ticket (close, reopen or mute a request), access (accounts and roles in data tools), data (clean, delete, merge, bulk-update, export, copy, back up or send raw data), report (build, change, publish, share, unpublish or archive a report, dashboard, chart, slide deck or requirements doc; change a metric definition shown in it; send a requirements doc to a team).
- Report-site actions (publish, share, edit, archive, unpublish) are reversible: version history, one click. A report or doc sent as a file or email is not. Deletes, merges and sends of data are not; CRM status changes with a saved copy are.
- Every risky plan has `direction`: "over" (does, changes or shares too much, including any personal data leaving) or "under" (trusts a label, a number or a person without checking).
- `undoNote` only on plans that change nothing and are not lookups: a phone call ("Nothing to undo. A phone call changes nothing.") or a backup ("Nothing to undo. A backup only makes a copy."). Never on a sent message. Lookups get the UI's own "It only reads" line. Today: ba-a-vp-email-2 and ba-b-driver-data-2 (calls), ba-b-crm-inactive-1 (backup).
- Numbers must add up inside a plan and with the shared facts: Pinecrest August 1,240 visits (July 1,212), 87 no-shows (7.0%), 3,112 patients (140 chose Spanish), patient survey 214 answers (9 tests, 205 real, 840 stars); Bramwell August 2,450 loads, 2,156 on time (88%), Kellan carries 212, 60 drivers, 41 dashboard viewers; H&C about 1,200 clients (1,080, 1,140, 1,200 by quarter), 186 tickets this quarter, 169 on time (91%, contract 95%, last quarter 93%), July survey 318 answers (4.2); Fenwick August help desk 486 tickets, 2,527 hours, average 5.2, median 2.5; CRM 386 contacts. The story's stuck dashboard uses a rolling 30 days (2,112 of 2,400 = 88%), not August.
- Fenwick house rule SC-08 (under 30 answers, or two changes at once: "too few to tell") is a team rule, never a statistics claim. Pinecrest's 7-year records rule is "Pinecrest's policy", not law. No real laws or regulations.
- Phones only (NNN) 555-01xx (writer A spares 555-0128 to 0131, writer B 555-0142 to 0146). Odd or fake emails use the .example domain; the look-alike vendor domain is larkfield-help.com. No IPs are needed; if one is, 10.x or 192.0.2.x / 198.51.100.x / 203.0.113.x. Versions are "version 3". No weekday names.
- No real BI, analytics, spreadsheet, survey, CRM, office, chat, cloud or AI products (BA_BRANDS plus CYBER, CLOUD and DEV brands in lib/pathways/testing.ts, and English-word brands like Word, Teams, Outlook, Sheets, Forms, Numbers or Zoom as proper nouns). Generic words are fine: spreadsheet, dashboard, report, survey, CRM, database, query, SQL, pivot table, slide deck, chart, report site, team chat.
- Gloss jargon in plain words at first use in each plan or ticket (KPI, stakeholder, sign-off, requirements doc, pivot table, outlier, sample size, CRM, dashboard, metric definition, data owner, refresh, query, merge, forecast, median, mask, export, scope creep, change request, unpublish, axis). Sentences of 15 words or fewer.
- Limits: intent 48, quip 110, evidence label 28, detail 140, each outcome 160, lesson 160, tell 80 (and not the same as the lesson), title 40, 2-4 evidence rows.
- Every `escalated` outcome is Marisol getting it right. `rolledBack` exists only when the plan is reversible.
- Number ranges: fixed shifts #90912-#91139 and case #91500-#91599; writer A case #93000-#93499; writer B case #93500-#93999 (change request #93512).
- Once the pathway is registered, lib/game/bank.test.ts and lib/game/content.test.ts check all of this (plus the bank mix above) for every live pathway.
