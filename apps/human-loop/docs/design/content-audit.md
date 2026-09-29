# Phase 2 content audit: verdicts, confessing quips, clue position

Auditor: content-auditor. Scope: all 5 pathways, `encounter-01.json` (story), `bank/tickets-*.json`
and `bank/shift.json`. Practice (`practice.json`) is used only as the reference for the target style,
since Phase 1a already rewrote it. Nothing in `apps/human-loop` was edited. Every number below was
measured on the real content, either by a script or by running the real loaders and engine in a
private copy (`phase2/content-auditor/app`). Scripts are listed at the end.

## 1. Headline numbers (story + bank: 297 plans, 1,112 evidence rows)

| What | Count | Where |
|---|---|---|
| Rows that state their own verdict (hard lint hits) | **86 rows in 81 plans** (story 13 rows in 12 plans) | 64 CUT, 19 PAIR, 3 lint false positives |
| Risky plans whose **last** row is red | **123 / 123 (100%)** | Enforced today by `bank.test.ts:103` and `content.test.ts:142` |
| Rule rows (Policy / Runbook / Playbook) marked red | **43 rows** (HD 18, CY 6, CN 7, FS 4, BA 8) | 0 risky plans have *only* rule rows red, so unflagging is safe |
| Risky plans with 2 or more red **fact** rows | **86 / 123** | Only matters if grading uses "any red row = proof" |
| Safe plans with a reassurance line ("It changes nothing", "No names", "Nothing else") | **66 / 174 safe (38%)** vs **2 / 123 risky (2%)** | 68 rows. A strong "this one is safe" tell |
| Absence told as a story ("Nobody asked", "has not said yes") | 21 rows (mostly red) | Optional rewrite as an empty record field |
| Risky quips that confess (overreach, hedge, skipped check) | **23** | 95% of "why stop / while I was there" quips are risky |
| Safe quips that say the check was done ("Kofi said", "Fine.", "as asked", "I checked") | **55** | 91% of these phrases sit on safe plans |
| `shift.json` evidence rows | 0 (dialogue only; no plan-level confession) | 1 copy bug, see section 9 |

What these leaks let a player do today, with no reading:

| Shortcut | HD | CY | CN | FS | BA |
|---|---|---|---|---|---|
| Mark the last row of a blocked plan (Phase 1a "proof") | 100% | 100% | 100% | 100% | 100% |
| Mark a random non-request row: proof per risky plan (bank) | 86% | 79% | 66% | 66% | 68% |
| Same, all 4 story catches get proof | 50% | 44% | 20% | 20% | 20% |
| Best "always mark this label" strategy (else random) | "Policy" **94%** | "Sign-in log" 84% | "What it will change" 76% | "Who can read it" 73% | "Policy" 76% |
| Guess safe/risky from quip keywords alone: share of plans it decides, and its precision | 26%, 80% | 25%, 100% | 45%, 100% | 33%, 80% | 24%, 87% |

The loose scan in `result.json` said "158 of 317 plans have verdict or rule wording". That count
included rule text (which is fine in a rule row). The strict lint below finds 81 plans with a real
self-verdict. Counting every kind of fix (verdict, rule flag, reassurance, quip), **190 of 297
plans** need a touch.

## 2. The patterns (how rows give the answer away)

| Code | Pattern | Example (real row) | Fix | Rows |
|---|---|---|---|---|
| V-match | States the comparison result | "Callback number in the ticket: (305) 555-9927. **No match.**" | CUT to `check` | 9 |
| V-onfile | Labels a value as the one on file | "Sent from jromero@harlowcolewp.com. **That is the work email on file** for J. Romero." | CUT when the record is in another row; else PAIR | 22 |
| V-real | Calls something real, fake or known-bad | "**The real sender is** notices@wrenfieldpayroll.com." / "a **fake** Wrenfield sign-in page" | CUT (put both values side by side, no adjective) | 16 |
| V-judge | Author's opinion | "**That part is normal.**" / "**The code is fine.**" / "**That's not random.**" | CUT | 10 |
| E so-what | Explains why the fact matters | "**Anyone could know.**" / "**A wipe erases the proof.**" / "**That is exactly twice as many.**" | CUT to `check` (it is exactly what review is for) | 15 |
| C scope | The flag row also quotes the request | "4,800 lines... **The ticket asked only for speed.**" | CUT if row 0 shows the request; else PAIR | 15 |
| R rule-flag | A rule row is marked red | "Policy AC-03" red on the risky plan, plain on its safe mirror | `redFlag: false` (rules are the why, not the clue) | 43 |
| S reassure | Safe plan tells you it is harmless | "Read-only... **It changes nothing.**" / "**No names, no passwords.**" | Cut, or add the same kind of line to risky plans | 68 |
| A absence | Missing record told as a story | "HR **has not approved** anyone reading her inbox." | Optional: "HR approvals for this inbox: none." | 21 |
| Q confess | Risky quip admits the flaw | "I saw that word and closed it. Speed-reading is a gift." | Rewrite: equally eager on every plan | 23 |
| Q checked | Safe quip says the check was done | "Docs? Me? Reading? Leo said yes. **Fine.**" | Rewrite about half; or give risky quips the same false confidence | 55 |
| P position | Red flag is always last | 123/123 risky plans | Display shuffle (rows 1..n; row 0 stays first) | 0 edits |

Rows the lint must keep: rule rows may use normative words ("Signs of a fake request: stop...").
Tool rows may report their own result ("Hash lookup: No match.", "Mail check: Sender checks pass").
Quoted speech is an artifact ("That isn't us."). The agent's own reason ("Nimbus's reason") is the
agent's claim and is often wrong on purpose. The list lookups are also fine ("Ledgerfen Tax is on
Harlow & Cole's approved software list", 8 rows): a real lookup shows exactly that.

## 3. Per pathway and per file

Columns: V = hard verdict rows (CUT / PAIR / false positive), Rule = rule rows marked red,
Multi = risky plans with 2+ red fact rows, Reas = reassurance rows on safe plans (risky plans with
one), Abs = absence rows, Last = risky plans whose last row is red, Q = risky confessing quips /
safe "checked" quips.

| File | Plans (risky) | V cut/pair/fp | Rule | Multi | Reas (risky) | Abs | Last | Q |
|---|---|---|---|---|---|---|---|---|
| help-desk/encounter-01 | 10 (4) | 3/0/0 | 3 | 2 | 1 (0) | 0 | 4/4 | 1/1 |
| help-desk/tickets-a | 14 (7) | 4/1/0 | 5 | 2 | 1 (0) | 2 | 7/7 | 1/1 |
| help-desk/tickets-b | 16 (7) | 2/0/0 | 4 | 6 | 4 (0) | 4 | 7/7 | 2/2 |
| help-desk/tickets-c | 18 (7) | 1/3/0 | 6 | 4 | 4 (0) | 0 | 7/7 | 3/2 |
| cybersecurity/encounter-01 | 10 (4) | 4/0/0 | 2 | 3 | 3 (0) | 0 | 4/4 | 0/3 |
| cybersecurity/tickets-a | 23 (11) | 5/2/0 | 1 | 11 | 3 (0) | 4 | 11/11 | 1/5 |
| cybersecurity/tickets-b | 26 (10) | 3/3/0 | 3 | 7 | 5 (0) | 0 | 10/10 | 2/4 |
| cloud-network/encounter-01 | 10 (4) | 2/0/0 | 0 | 4 | 2 (1) | 0 | 4/4 | 2/4 |
| cloud-network/tickets-a | 25 (10) | 7/4/0 | 5 | 5 | 6 (0) | 2 | 10/10 | 4/7 |
| cloud-network/tickets-b | 23 (10) | 6/0/0 | 2 | 7 | 6 (1) | 1 | 10/10 | 2/6 |
| full-stack/encounter-01 | 10 (4) | 1/0/0 | 1 | 3 | 2 (0) | 0 | 4/4 | 1/3 |
| full-stack/tickets-a | 26 (10) | 7/0/1 | 2 | 7 | 6 (0) | 0 | 10/10 | 1/2 |
| full-stack/tickets-b | 24 (10) | 7/0/1 | 1 | 8 | 5 (0) | 0 | 10/10 | 1/6 |
| business-analyst/encounter-01 | 10 (4) | 2/1/0 | 1 | 3 | 4 (0) | 1 | 4/4 | 1/3 |
| business-analyst/tickets-a | 27 (10) | 3/2/0 | 3 | 7 | 10 (0) | 5 | 10/10 | 1/3 |
| business-analyst/tickets-b | 25 (11) | 7/3/1 | 4 | 7 | 6 (0) | 2 | 11/11 | 0/3 |
| **Total** | **297 (123)** | **64/19/3** | **43** | **86** | **68 (2)** | **21** | **123/123** | **23/55** |

CUT or PAIR was set by a script (is the value already in another row of the plan?), then checked
by hand. 9 rows were overridden: `cn-a-castillo-access-1` to PAIR; `cn-b-ceo-call-1`,
`cn-a-big-bill-3`, `cn-b-idle-servers-2`, `b-shared-inbox-2` and `fs-a-dock-migration-2` to CUT;
3 false positives (synthetic "fake" test data, "real one-star answers").

By pathway (story + bank): HD 14 verdict rows (10 cut, 4 pair), CY 17 (12/5), CN 19 (15/4),
FS 17 (15/0, +2 false positives), BA 19 (12/6, +1 false positive). PAIR plans: 17. Of those, 11
already have 4 rows, so a new record row makes 5. Either allow 5 rows, or merge the pair into one
record row, as practice does ("Owner: R. Fairbanks. Signed off by: R. Fairbanks.").

## 4. Proposed schema

```ts
export interface Evidence {
  label: string;
  /** A fact: what the artifact shows. No verdict words (content lint, section 5). */
  detail: string;
  /** The review circles it, and a mark on it counts as proof. Never on a rule row (lint). */
  redFlag: boolean;
  key?: boolean;
  gloss?: string;
  /**
   * Review only: what this fact means for this plan, in 12 words or fewer, one sentence
   * ("Not the number in the ticket."). It may use verdict words. Like redFlag, it never reaches the
   * DOM before the plan resolves, and coach.ts never reads it (coach.test.ts source check).
   * Allowed on red rows, the key row, and decoy rows (a plain row on a risky plan that looks bad
   * or good on purpose). At most 2 per plan.
   */
  check?: string;
  /** Optional, UI only: a small "Ticket says" or "Record says" tag before the label. */
  side?: "ticket" | "record";
}
```

How the review sheet ("Show me", `ReviewSheet` in `components/battle/EvidencePanel.tsx`) shows it:

- Each circled red row: label, detail, then the `check` line under it (flag icon plus text, never
  color alone). With no `check`, nothing extra is shown; the plan's `tell` stays the caption.
- The key row: the `check` line with the tick icon ("Same email and phone as the ticket.").
- The player's marked row, when it is not red: show that row's `check` when it has one (decoys:
  "The code is OK. The timing is the problem."). Otherwise keep today's "Odd, but not the risk."
- The live sheet before resolution: unchanged. `check` is not rendered (DOM test, like redFlag).
  `side` tags may show before resolution, because they give structure and no answer.

Grading and saves (for the engine planner):

- Proof = the marked row has `redFlag`. With the 43 rule rows unflagged, a random mark still gets
  proof 54-72% of the time per plan, and 10-20% of the time on all 4 story catches. That breaks
  "guess-flagging never 3 stars". With **one red row per risky plan** it drops to 33-42% per plan
  and 1-3% for all 4 (guess.py). Recommendation: one red row per risky plan (86 plans choose one;
  the others keep their meaning in that row's `check`), and add pair rows, which also add
  markable rows.
- Store the flag as the row **label**, not the content index (`StepRuntime.flagged?: string`).
  Labels are unique inside every plan (0 duplicates in 317 plans; add a content test). Content
  edits that insert a pair row or change order then never move a saved flag. An unknown label
  means "no mark". Today marks are React state only (`BattleView.tsx:263`), so no save carries one.
- `bankVersion` changes only when ticket or step ids change. Evidence edits do not change it, so
  saved Daily and drill specs still rebuild.

## 5. Proposed content lint

A prototype runs in the private copy: `app/lib/game/evidenceLint.ts` and
`app/lib/game/evidenceLint.test.ts` (vitest, real loaders, all 5 pathways). On practice it finds
exactly 1 row, a real leftover (section 9). On story + bank it finds 87 hits in 86 rows, listed in section 10.

Rules (applied to `label: detail` after removing quoted speech):

```ts
// Skip: rows labelled "<Agent>'s reason|test". Quotes "..." and '...' are removed first.
RULE_LABEL = /\b(policy|runbook|playbook)\b|^change type$|^crm rules$/i;   // normative text allowed
TOOL_LABEL = /^(hash lookup|mail check|script check|test results?|build log|scan result|restore result|staging check)$/i; // may say "match"

HARD (fail the test):
 match      /\bno match\b|\b(it|they|both|all|every \w+) match(es)?\b|\bwhich matches\b|\bmatch(es)? (the|a|its|his|her) \w+|\bdo(es)?(n'?t| not) match\b/i   (tool rows exempt)
 on-file    /\b(that|this) is the\b|,? the (phone|number|work email|email|address|approver|contact|hr contact)( on file| on the contract| on the staff list)|\bnot the (phone|number|address|email) on file\b|\bits number on file\b|\bthe (approver|report's owner|data owner),|\bis on file for\b/i   (rule rows exempt)
 real-fake  /\breal (domain|sender|vendor|portal|site|address|work email|number|admins?|one|owner)\b|\bthe real \w+ (site|portal|page)\b|\bit'?s the real\b|\breally is\b|\bfake\b(?! (names?|address|tax|ones|clients|dollars|data|form|answers))|\bspoof\w*|\blegit\w*|\bgenuine\b|\bknown (bad|good|malicious|safe)\b|\blook-?alike\b/i   (rule rows exempt)
 judgement  /\bthat part is\b|\b(is|are|looks?|seems?) (fine|ok|okay|safe|unsafe|legit|wrong|suspicious|normal|risky)\b|\bthey were fine\b|\bnot random\b|\bthe safe kind\b|\bthe right person\b|\btop complaint\b|\bnot (a|the) (server|scanner)\b|\bnothing wrong\b|\ball good\b|\bred flag\b|\bchecks out\b/i   (rule rows exempt)
 so-what    /\banyone could know\b|\berases the proof\b|\bthis is step \d\b|\bstep \d of (the|checking)\b|\bthat is after the\b|\bguests could reach\b|\bboth drop off\b|\bwhoever owns it\b|\btwo things changed at once\b|\bexactly twice as many\b|\bso clients split\b|\bso typed text\b|\bcan'?t be compared\b|\blooks \d+ times\b|\bso we send\b/i
 scope-note /\b(the|her|his|its|their) (ticket|request) (asked|does not|doesn't)\b|\basked only for\b|\bnot just\b|\bnot on the ticket\b|\bis not on it\b|\bnot on (CHG-\d+'s|the) list\b|\bneeds only\b|\bnot other \w+\b|\bnot during the day\b|\bnothing from the\b|\bnot a number from the email\b/i
 rule-flag  a row whose label matches RULE_LABEL has redFlag false
 check      check is 12 words or fewer, one sentence, only on red / key / decoy rows, at most 2 per plan
 labels     labels are unique inside a plan (saved flags use them)

SOFT (balance gates, per pathway, story + bank):
 reassure   REASSURE = /\b(nothing (gets |is )?chang\w*|(it )?changes nothing|nothing else|nothing (is )?(sent|deleted|opened)|nothing goes|nothing touches|no (passwords?|personal data|client data|patient data|customer[\w, ]*data|staff names|user names|names|home address\w*|file contents|downtime|data is)|installs nothing|locks nothing)\b/i
            share of safe plans with it minus share of risky plans with it <= 15 points
            (today: HD 27-0, CY 32-0, CN 41-8, FS 36-0, BA 51-0: all fail)
 quips      keyword guesser (quips.py phrase lists) decides at most 15% of plans, or its precision
            is at most 70% (today: decides 24-45%, precision 80-100%)
 absence    report only (no gate)

ALLOWLIST: Record<`${stepId}|${label}`, reason>. Start it empty. The 3 false positives are better
reworded: "fake name, fake address" -> "made-up name, made-up address" (fs-a-public-issue-2,
fs-b-staging-data-1), "31 real one-star answers" -> "31 one-star answers" (ba-b-survey-clean-2).
```

Tests to change: drop "last evidence should be the most telling" (`bank.test.ts:103`,
`content.test.ts:142`) and "once red, stays red" (the `indexOf` checks). Keep "row 0 is never red".
Add a display shuffle test (`evidenceOrder.ts`, deferred in 1a): seeded by battle seed + step id,
row 0 fixed, other rows shuffled, the same order after resume. Keep `PRACTICE_VERDICT_RE` for
practice. The new lint is a superset. Note that `PRACTICE_VERDICT_RE` misses ", the phone on file".

## 6. Ten before / after examples (plain, short sentences)

Rule: the row shows the fact. The meaning goes to `check`, which only shows in review.

**1. Help Desk story, `romero-mfa-reset`, Directory record (red). V-match, CUT.**
- Before: "Phone on file for J. Romero: (860) 555-0148. Callback number in the ticket: (305) 555-9927. No match."
- After: `side: record` "J. Romero, CFO. Phone on file: (860) 555-0148." The ticket row (row 0, `side: ticket`) already says "Call me at (305) 555-9927."
- check: "Not the number in the ticket."
- Also: Policy VP-04 -> `redFlag: false`.

**2. Help Desk bank, `c-romero-new-phone-1` (safe). V-onfile, PAIR. This is the designer's example.**
- Before: Sender address "Sent from jromero@harlowcolewp.com. That is the work email on file for J. Romero." Callback "10:12 AM. Ollie calls (860) 555-0148, the phone on file. Romero answers and confirms the request."
- After: Sender address "Sent from jromero@harlowcolewp.com." Callback "10:12 AM. Ollie calls (860) 555-0148. Romero answers and confirms the request." New row, Directory record (`side: record`, `key: true`): "J. Romero, CFO. Email: jromero@harlowcolewp.com. Phone: (860) 555-0148."
- check (key row): "Same email and phone as the ticket."

**3. Help Desk story, `okafor-summary`, Handoff notes (a decoy row on a risky plan). V-judge, CUT.**
- Before: "Dana wants a 3-line summary on every closed ticket. That part is normal."
- After: "Dana wants a 3-line summary on every closed ticket."
- check: "A summary is normal. The tool and the paste are not."
- Also: Policy DP-02 -> `redFlag: false`.

**4. Cybersecurity story, `cy-duarte-report-close` (red rows). V-real, CUT.**
- Before: Sender address "payroll@wrenfield-payroll.co. The real sender is notices@wrenfieldpayroll.com." Link check "The link opens a fake Wrenfield sign-in page. It asks for her payroll password, then her bank details."
- After: Sender address "From: payroll@wrenfield-payroll.co. Vendor list: notices@wrenfieldpayroll.com." Link check "The link opens wrenfield-payroll.co/login. It asks for her payroll password, then her bank details."
- check: "Different domain from the vendor list." / "A copy of the Wrenfield sign-in page."

**5. Cloud story, `cn-stonebridge-tunnel`, Status page (red). So-what, CUT.**
- Before: "Harlow & Cole's public status page announces tonight's maintenance. Anyone could know."
- After: "Harlow & Cole's public status page, 6 PM: \"Maintenance tonight, 12 to 2 AM.\""
- check: "Anyone can read this. Knowing it proves nothing."

**6. Cloud bank, `cn-b-ceo-call-1`, Caller ID (red). V-onfile (negative), CUT.**
- Before: "The call came from (860) 555-0177, not the number on file. He said there's no time for a callback."
- After: "The call came from (860) 555-0177. He said there's no time for a callback." The Directory record row already shows "Phone on file: (860) 555-0174."
- check: "Not the phone on file. It ends in 0174."

**7. Full-Stack bank, `fs-a-slow-schedule-2`, Code diff (red). Scope note, CUT.**
- Before: "31 files, 4,800 lines. It also changes how bookings are saved. The ticket asked only for speed."
- After: "31 files, 4,800 lines. It also changes how bookings are saved." Row 0 (`side: ticket`): "The schedule page takes 8 seconds to open."
- check: "The ticket asked for speed, not a new page."

**8. Help Desk bank, `a-pdf-editor-2` (red rows). Scope note + rule flag, PAIR.**
- Before: rows = Ollie's reason; What it will change "Adds Kowalski to her laptop's Administrators group, with no end date. Her ticket asked for one PDF app." (red); Policy AC-03 (red).
- After: new row 0, Ticket #53171 (`side: ticket`): "\"Can I get a PDF editor?\" F. Kowalski." What it will change: "Adds Kowalski to her laptop's Administrators group. No end date." (the one red row). Policy AC-03: `redFlag: false`.
- check: "She asked for one app, not admin rights."

**9. Business Analyst bank, `ba-b-early-send-2` (safe). V-match + V-onfile, PAIR done the practice way (no new row).**
- Before: Query result "A query is a saved question to the database. Every number matches a query. On time: 2,156 of 2,450 loads, 88%." Sign-off record "A sign-off is a written OK from the owner. A. Mensah, the report's owner, signed off version 2." Version history "Version 2 is the latest. Nothing changed after the sign-off."
- After: Report draft adds "On time: 88%." Query result "Saved query: on time 2,156 of 2,450 loads, 88%." Sign-off record "Owner: A. Mensah. Signed off version 2: A. Mensah." (`key: true`; the sign-off definition moves to `gloss`). Version history "Version 2: signed 3:10 PM. Last edit: 2:55 PM."
- check (key row): "The owner signed this exact version."

**10. Quips (one risky, one safe). Make the agent equally eager on every plan.**
- Risky `c-xray-viewer-2`, before: "Duarte replied with the word 'works'! I saw that word and closed it. Speed-reading is a gift." After: "Duarte replied! Closing the X-ray ticket. Another happy hygienist. I love happy hygienists."
- Safe `fs-lark-docs`, before: "Docs? Me? Reading? Leo said yes. Fine. Page 1, line 1: 'Install larkfield-booking.' Oh." After: "Reading Larkfield's setup page before I install. I read fast. Very, very fast."
- Why: "Fine." and "Leo said yes" sit on safe plans 91% of the time, and "why stop / while I was there" sits on risky plans 95% of the time. The joke stays. The tell goes.

## 7. Story turn 1 in each pathway (real engine, `turn1.test.ts`)

Every story uses `actionsPerTurn [1, 2, 2, 3]`, 3 energy per turn (it resets each turn), and a hand
of 5.

| Pathway | Turn 1 today | Dead? | Turn 1 after "swap steps 1 and 2" | Turn 2 after swap |
|---|---|---|---|---|
| Help Desk | `romero-lookup`: safe, read-only lookup | **Yes** | `ruiz-vpn-fix`: safe, one-way, no twist | lookup + `romero-mfa-reset` (risky) |
| Cybersecurity | `cy-whitcomb-signins`: safe, read-only | **Yes** | `cy-dsp04-isolate`: safe, **scary-safe** | lookup + `cy-whitcomb-disable` (risky) |
| Cloud & Network | `cn-dispatch-errors`: safe, read-only | **Yes** | `cn-hc-failover`: safe, **scary-safe** | lookup + `cn-dispatch-close` (risky) |
| Full-Stack | `fs-track-errors`: safe, read-only | **Yes** | `fs-hc-flag-off`: safe, **scary-safe** | lookup + `fs-track-close` (risky) |
| Business Analyst | `ba-ontime-compare`: safe, read-only | **Yes** | `ba-hc-unpublish`: safe, **scary-safe** | lookup + `ba-ontime-close` (risky) |

Why turn 1 is dead today: there is one plan. It is a read-only lookup. Its own evidence says
"Read-only... It changes nothing" (all 5 are in the reassurance count), and the synthesized undo
row says "Nothing to undo. It only reads. It changes nothing." The only wrong move is to block it.
At most 1 of 3 energy is useful.

After the swap: turn 1 still has no risky plan in any pathway, but in 4 of 5 it becomes a real
"don't over-block" choice (scary-safe). Help Desk's step 2 has no twist. Give it a scary-safe
twist, or pull `okafor-disable` (step 6, scary-safe) forward. One side effect: the lookup and its
risky follow-up now run at the same end of turn, so the lookup's result ("Phone on file: ...") no
longer arrives before the risky call. That does not matter mechanically, because the risky plan's
evidence already has the record row. Also cut "This is step 1 of the identity check" (Help Desk
lookup rows) in the same edit.

## 8. Migration estimate

| Work | Story (5 files, 50 plans) | Bank (11 files, 247 plans) | Effort |
|---|---|---|---|
| CUT verdict phrase (+ `check` where the `tell` does not cover it) | 12 rows | 52 rows | ~2.5 h |
| PAIR (add or merge a record row) | 1 row (`ba-hc-deck-share`) | 18 rows, 16 plans | ~3.5 h |
| Rule rows `redFlag: false` | 7 | 36 | ~0.5 h + test updates |
| One red row per risky plan (if adopted) | 15 plans | 71 plans | ~3 h |
| Reassurance: cut, or add matching lines to risky plans | 12 rows | 56 rows | ~1.5 h |
| Absence to record field (optional) | 1 | 20 | ~0.75 h |
| Quips: 23 confessions + about half of the 55 "checked" | 19 flagged (5 + 14) | 59 flagged (18 + 41) | ~3.5 h |
| ESL read-through, lint passes, golden audit | | | ~4 h |
| **Total** | **~4 h** | **~15 h** | **~19 h (2.5 writer-days)** |

Golden and saves:
- Help Desk golden (`lib/game/__golden__/help-desk.json`): evidence edits change the Help Desk
  story and bank content keys. Step ids do not change, so `bankVersion` ("b1pdcqi8") and the
  daily and drill plans stay. Do the content migration as its own recapture, with the 1a-style
  written audit: "only story/bank evidence, quips and flags changed; every trace identical". Do the
  grading change as a second, separate recapture. That keeps each diff auditable.
- `artifact-kinds.json` is keyed by `stepId|label`. New PAIR rows add keys (Help Desk: 3 plans).
  Renamed labels move keys. Detail edits change a kind only when a detail starts with a quote mark.
  Audit: the recapture shows only the added or renamed Help Desk rows.
- In-progress battles: BattleState holds step ids, not evidence, so evidence edits are
  save-compatible. Grading flags must be stored by label (section 4).

## 9. Side findings

- Practice leftover: Help Desk practice `mensah-remote-wipe`, key row Callback: "Mensah confirmed
  the theft at 8:12 AM, **from the phone on file**." It is an on-file verdict on the key row, with
  no Directory row to compare. `PRACTICE_VERDICT_RE` misses it (it only catches "is on file for").
- Copy bug: `business-analyst/bank/shift.json:41`, a win outro: "Good work. The wrong numbers
  **stayed in**, and the right reports went out." It should say "stayed out".
- `tell` lines also use verdict words ("the real package", "a look-alike domain"). That is fine:
  `tell` shows only after the plan resolves.
- `cy-a-legit-esign-1` (risky because Patch over-reacts) has red rows that say the email is real
  ("The link opens the real Inkswale site"). For over-reaction plans, the clue is the proof that the
  thing is fine. Keep that design, but show it as a fact ("The link opens inkswale.com, on the
  vendor list").

## 10. Per-pathway worksheet (generated by `worksheet_gen.py` from the real content)

### Help Desk (Ollie)

Story: 10 plans (4 risky), 5 to touch. Bank: 48 plans (21 risky), 31 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | romero-lookup | Access check | safe plan | "This is step 1" | CUT |
| encounter-01 | romero-mfa-reset | Directory record | red | "No match" | CUT |
| encounter-01 | okafor-summary | Handoff notes | risky, not red | "That part is" | CUT |
| tickets-a | a-sim-swap-1 | Access check | safe plan | "This is step 1" | CUT |
| tickets-a | a-sim-swap-2 | Call notes | risky, not red | "Both match" | CUT |
| tickets-a | a-pdf-editor-2 | What it will change | red | "Her ticket asked" | PAIR |
| tickets-a | a-patient-screenshot-1 | Where it goes | risky, not red | "It's the real" | CUT |
| tickets-a | a-manager-inbox-2 | Sender address | risky, not red | "real work email" | CUT |
| tickets-b | b-boarding-now-1 | Sender address | red | "real domain" | CUT |
| tickets-b | b-shared-inbox-2 | Ticket #53163 | red | "The ticket does not" | CUT |
| tickets-c | c-romero-new-phone-1 | Sender address | safe plan | "That is the" | PAIR |
| tickets-c | c-romero-new-phone-1 | Callback | safe plan | ", the phone on file" | PAIR |
| tickets-c | c-vendor-bank-1 | Caller ID | risky, not red | ", the phone on file" | PAIR |
| tickets-c | c-okafor-cleanup-3 | Handoff notes | safe plan | "That part is" | CUT |

**B. Rule rows marked red (18): set redFlag false** (no risky plan loses its last fact flag): romero-mfa-reset (Policy VP-04), ortiz-access (Policy AC-02), okafor-summary (Policy DP-02), a-fake-new-hire-1 (Runbook ON-01), a-pdf-editor-2 (Policy AC-03), a-patient-screenshot-1 (Policy DP-03), a-manager-inbox-2 (Policy AC-04), a-queue-cleanup-2 (Policy TK-01), b-back-from-vacation-2 (Policy DP-01), b-night-lockout-1 (Policy SE-01), b-boarding-now-1 (Policy VP-04), b-partner-rates-2 (Policy AC-06), c-security-updates-2 (Policy CH-01), c-new-hire-ferreira-3 (Runbook ON-01), c-lost-phone-2 (Runbook LS-03), c-okafor-cleanup-2 (Runbook OB-01), c-xray-viewer-2 (Policy TK-01), c-billing-folder-2 (Policy AC-02)

**C. Risky plans with 2+ red fact rows (14 of 25):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (10 rows; risky plans with the same kind of line: 0):** romero-lookup (Action type: "Nothing gets changed"); a-sim-swap-1 (Action type: "Nothing gets changed"); b-night-lockout-2 (What it will send: "No passwords"); b-night-lockout-2 (Who gets it: "Nothing goes"); b-partner-rates-1 (What it will send: "No names"); b-temp-profile-1 (Action type: "Nothing gets changed"); c-new-hire-ferreira-2 (What it will add: "Nothing else"); c-vendor-bank-2 (Sent to: "Nothing goes"); c-okafor-cleanup-3 (What it will paste: "No home address"); c-billing-folder-1 (What it will change: "Nothing else")

**E. Absence told as a story (6 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): a-printer-queue-2 (Printer status: "Nobody has"); a-manager-inbox-2 (HR portal: "has not approved"); b-night-lockout-1 (Ticket #53126: "did not call"); b-boarding-now-1 (Directory record: "Nobody has"); b-shared-inbox-2 (Ticket #53163: "does not mention"); b-shared-inbox-2 (Directory record: "has not said yes")

**F. Quips.** Risky quips that confess (7):

- ortiz-access: "Why build access from scratch? I'll copy the manager. Copy and paste is my love language."
- a-queue-cleanup-2: "The fix installed with no errors. Dr. Pell is busy, so I'll save everyone time. Closing!"
- b-boarding-now-1: "Resetting MFA for the Managing Partner! The boss is boarding a plane. No time for codes. Whoosh!"
- b-temp-profile-2: "Rebuilding A. Mensah's profile! It's the classic fix for a temporary profile. Classics never fail. Probably."
- c-lost-phone-2: "Erasing ALL of Petrakis's phone! Why erase some when you can erase everything? So tidy!"
- c-xray-viewer-2: "Duarte replied with the word 'works'! I saw that word and closed it. Speed-reading is a gift."
- c-billing-folder-2: "Why stop at one folder? I'll give Lam everything Dr. Pell has. Future tickets: prevented!"

Safe quips that say the check was done (6): ortiz-laptop, a-patient-screenshot-2, b-shared-inbox-1, b-temp-profile-1, c-new-hire-ferreira-1, c-new-hire-ferreira-2

### Cybersecurity (Patch)

Story: 10 plans (4 risky), 7 to touch. Bank: 49 plans (21 risky), 29 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | cy-lam-report-real | Mail check | safe plan | "real portal" | CUT |
| encounter-01 | cy-duarte-report-close | Sender address | red | "real sender" | CUT |
| encounter-01 | cy-duarte-report-close | Link check | red | "fake" | CUT |
| encounter-01 | cy-sandoval-wipe | Legal hold | red | "erases the proof" | CUT |
| tickets-a | cy-a-mfa-fatigue-2 | Callback | safe plan | ", the phone on file" | PAIR |
| tickets-a | cy-a-legit-esign-1 | Mail check | red | "the real Inkswale site" | CUT |
| tickets-a | cy-a-sandbox-upload-1 | Tool it will use | safe plan | "so we send" | CUT |
| tickets-a | cy-a-signed-file-2 | Asset inventory | safe plan | "Not a server" | CUT |
| tickets-a | cy-a-pen-test-2 | Draymoss's reply | red | "its number on file" | PAIR |
| tickets-a | cy-a-scanner-noise-2 | Asset inventory | red | "Not the scanner" | CUT |
| tickets-a | cy-a-payroll-server-2 | Change calendar | red | "matches the ticket" | CUT |
| tickets-b | cy-b-backups-deleted-2 | Owner's OK | safe plan | ", the phone on file" | PAIR |
| tickets-b | cy-b-backups-deleted-3 | Sign-in log | safe plan | "real admins" | CUT |
| tickets-b | cy-b-last-day-upload-2 | Sent to | safe plan | "The HR contact on file" | PAIR |
| tickets-b | cy-b-malware-back-2 | EDR log | red | "known bad" | CUT |
| tickets-b | cy-b-inbox-rule-1 | Callback | safe plan | ", the phone on file" | PAIR |
| tickets-b | cy-b-inbox-rule-2 | Mail log | red | "That is after the" | CUT |

**B. Rule rows marked red (6): set redFlag false** (no risky plan loses its last fact flag): cy-sandoval-wipe (Playbook PB-07), cy-ransom-close (Playbook PB-02), cy-a-payroll-server-2 (Playbook PB-06), cy-b-last-day-upload-1 (Policy DP-04), cy-b-ioc-share-2 (Policy DP-05), cy-b-log-space-2 (Policy LG-01)

**C. Risky plans with 2+ red fact rows (21 of 25):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (11 rows; risky plans with the same kind of line: 0):** cy-whitcomb-signins (Action type: "Nothing changes"); cy-c2-deny (What it will change: "Nothing else"); cy-sandoval-hr-list (What it will send: "No file contents"); cy-a-travel-real-2 (What it will ask: "no passwords"); cy-a-admin-script-1 (Action type: "Nothing changes"); cy-a-payroll-server-1 (Action type: "Nothing changes"); cy-b-last-day-upload-2 (What it will send: "No file contents"); cy-b-ioc-share-1 (What it will send: "No names"); cy-b-xray-vendor-1 (Action type: "Nothing changes"); cy-b-xray-vendor-3 (EDR log: "Nothing else"); cy-b-new-laptop-1 (Action type: "Nothing changes")

**E. Absence told as a story (4 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): cy-a-sandbox-upload-2 (Hash lookup: "Nobody has"); cy-a-signed-file-1 (File signature: "has no such"); cy-a-signed-file-3 (What it will delete: "Nobody has"); cy-a-scanner-noise-2 (EDR alert: "nobody installed")

**F. Quips.** Risky quips that confess (3):

- cy-a-file-site-2: "Now the whole site! One bad link means the site is guilty too. Denying all of it. Safety first!"
- cy-b-ioc-share-2: "Why share 4 lines when I can share 38 pages? Attaching the full report. Details are a gift!"
- cy-b-tax-app-2: "One laptop flagged means 38 laptops in danger! Removing Ledgerfen from all of them. So efficient!"

Safe quips that say the check was done (12): cy-whitcomb-signins, cy-c2-deny, cy-sandoval-hr-list, cy-a-travel-real-2, cy-a-admin-script-1, cy-a-admin-script-2, cy-a-pen-test-1, cy-a-payroll-server-1, cy-b-last-day-upload-2, cy-b-last-day-upload-3, cy-b-tax-app-1, cy-b-xray-vendor-1

### Cloud & Network (Nimbus)

Story: 10 plans (4 risky), 7 to touch. Bank: 48 plans (20 risky), 35 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | cn-stonebridge-tunnel | Status page | red | "Anyone could know" | CUT |
| encounter-01 | cn-stonebridge-call | Callback | safe plan | ", the number on the contract" | CUT |
| tickets-a | cn-a-snapshot-sweep-1 | Cost report | safe plan | "not on the list" | CUT |
| tickets-a | cn-a-snapshot-sweep-2 | Resource tags | red | "not on CHG-4207's list" | PAIR |
| tickets-a | cn-a-xray-visit-1 | Callback | safe plan | ", the number on the contract" | CUT |
| tickets-a | cn-a-xray-visit-2 | Callback | safe plan | ", the number on the contract" | PAIR |
| tickets-a | cn-a-dns-move-2 | Runbook RB-05 | red | "so clients split" | CUT |
| tickets-a | cn-a-big-bill-3 | Directory record | safe plan | ", the approver on file" | CUT |
| tickets-a | cn-a-noisy-alert-3 | Restore result | safe plan | "They were fine" | CUT |
| tickets-a | cn-a-auditor-files-1 | What it will share | red | "Not just" | CUT |
| tickets-a | cn-a-auditor-files-2 | What it will share | safe plan | "Nothing from the" | CUT |
| tickets-a | cn-a-castillo-access-1 | Access request | safe plan | ", the approver on file" | PAIR |
| tickets-a | cn-a-castillo-access-2 | Callback | red | ", the number on file" | PAIR |
| tickets-b | cn-b-guest-wifi-3 | Network map | red | "Guests could reach" | CUT |
| tickets-b | cn-b-dhcp-scanners-2 | What it will change | red | "both drop off" | CUT |
| tickets-b | cn-b-idle-servers-2 | Change ticket | red | "is not on it" | CUT |
| tickets-b | cn-b-booking-vendor-2 | Vendor contract | safe plan | "Real domain" | CUT |
| tickets-b | cn-b-booking-vendor-2 | Callback | safe plan | "not a number from the email" | CUT |
| tickets-b | cn-b-ceo-call-1 | Caller ID | red | "not the number on file" | CUT |

**B. Rule rows marked red (7): set redFlag false** (no risky plan loses its last fact flag): cn-a-partner-sftp-1 (Runbook RB-03), cn-a-snapshot-sweep-2 (Backup policy), cn-a-dns-move-2 (Runbook RB-05), cn-a-core-switch-1 (Runbook RB-04), cn-a-restore-test-2 (Runbook RB-02), cn-b-log-costs-2 (Retention policy), cn-b-kellan-tunnel-2 (Runbook RB-08)

**C. Risky plans with 2+ red fact rows (16 of 24):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (14 rows; risky plans with the same kind of line: 2):** cn-dispatch-errors (Action type: "It changes nothing"); cn-stonebridge-call (Callback: "It changes nothing"); cn-a-snapshot-sweep-1 (Resource tags: "No patient data"); cn-a-xray-visit-1 (Callback: "Nothing changes"); cn-a-xray-visit-2 (Firewall rule: "No downtime"); cn-a-big-bill-3 (What it will send: "No customer, driver or login data"); cn-a-core-switch-2 (What it will change: "Nothing changes"); cn-a-restore-test-1 (Schedule: "Nothing touches"); cn-b-dhcp-scanners-1 (Action type: "Nothing changes"); cn-b-kellan-tunnel-3 (Action type: "It changes nothing"); cn-b-booking-vendor-2 (Callback: "It changes nothing"); cn-b-soc-rdp-3 (What it will send: "No staff names"); cn-b-changed-diff-2 (What it will send: "No passwords"); cn-b-ceo-call-2 (Callback: "No password")

**E. Absence told as a story (3 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): cn-a-snapshot-sweep-2 (Cost report: "Nobody has"); cn-a-xray-visit-3 (Booking: "says nothing about"); cn-b-changed-diff-1 (What it will change: "Nobody has")

**F. Quips.** Risky quips that confess (8):

- cn-pd-archive-delete: "While I was there, I found a 10th! Nobody has opened it in months. Unused things want to be free."
- cn-dispatch-scale-zero: "Six servers, 4% busy. Why pay for a sleeping cloud? Zero servers, zero bill. Forecast: savings."
- cn-a-partner-sftp-1: "Why chase one new address when I can welcome them all? It's temporary. Everything is temporary."
- cn-a-dns-move-2: "The new server is shiny and ready. Why make it wait? Forecast: sunny, with a 100% new portal."
- cn-a-auditor-files-1: "One link, and the auditor gets everything. Auditors love everything. I am so helpful today."
- cn-a-castillo-access-2: "Poor Castillo, locked out! A backup login fixes everything. Same name means same person. Simple."
- cn-b-dhcp-scanners-2: "Why hand out 90 addresses when I can hand out 254? A generous network is a happy network."
- cn-b-soc-rdp-2: "If RDP is bad, everything is bad. Total safety. Zero traffic. The cleanest firewall in Connecticut."

Safe quips that say the check was done (17): cn-dispatch-errors, cn-pd-orphan-disks, cn-stonebridge-call, cn-dispatch-log-vendor, cn-a-partner-sftp-2, cn-a-snapshot-sweep-1, cn-a-dns-move-1, cn-a-big-bill-1, cn-a-core-switch-3, cn-a-auditor-files-2, cn-a-castillo-access-1, cn-b-guest-wifi-2, cn-b-dhcp-scanners-1, cn-b-idle-servers-1, cn-b-booking-vendor-2, cn-b-changed-diff-2, cn-b-ceo-call-2

### Full-Stack (Piper)

Story: 10 plans (4 risky), 6 to touch. Bank: 50 plans (20 risky), 28 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | fs-hc-late-release | Pull request | risky, not red | "is fine" | CUT |
| tickets-a | fs-a-kellan-cors-1 | Who can call it | red | "needs only" | CUT |
| tickets-a | fs-a-flaky-test-2 | Test results | red | "not random" | CUT |
| tickets-a | fs-a-dock-migration-2 | Change ticket | red | "Not during the day" | CUT |
| tickets-a | fs-a-forum-search-1 | Code diff | red | "So typed text" | CUT |
| tickets-a | fs-a-forum-search-2 | Code diff | safe plan | "the safe kind" | CUT |
| tickets-a | fs-a-public-issue-2 | Test data | safe plan | "real one" | ALLOW |
| tickets-a | fs-a-kellan-access-3 | Callback | safe plan | ", the number on file" | CUT |
| tickets-a | fs-a-slow-schedule-2 | Code diff | red | "The ticket asked" | CUT |
| tickets-b | fs-b-overwrite-2 | Code review | safe plan | "the right person" | CUT |
| tickets-b | fs-b-map-package-2 | Package page | red | "look-alike" | CUT |
| tickets-b | fs-b-staging-data-1 | Test data | safe plan | "fake" | ALLOW |
| tickets-b | fs-b-dead-code-2 | What it will delete | red | "not on the ticket" | CUT |
| tickets-b | fs-b-front-desk-1 | Who can read it | red | "needs only" | CUT |
| tickets-b | fs-b-front-desk-2 | Callback | safe plan | ", the number on file" | CUT |
| tickets-b | fs-b-webhook-1 | Who can read it | red | "Whoever owns it" | CUT |
| tickets-b | fs-b-webhook-2 | Callback | safe plan | "not a number from the email" | CUT |

**B. Rule rows marked red (4): set redFlag false** (no risky plan loses its last fact flag): fs-pd-cleanup (Records policy), fs-a-key-in-chat-2 (Policy CR-03), fs-a-freeze-hotfix-2 (Policy CR-06), fs-b-overwrite-1 (Policy CR-02)

**C. Risky plans with 2+ red fact rows (18 of 24):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (13 rows; risky plans with the same kind of line: 0):** fs-track-errors (Action type: "It changes nothing"); fs-lark-docs (Action type: "It changes nothing"); fs-a-flaky-test-1 (Action type: "It changes nothing"); fs-a-dock-migration-1 (What it will copy: "locks nothing"); fs-a-double-texts-2 (Action type: "It changes nothing"); fs-a-public-issue-2 (What it will send: "No client data"); fs-a-kellan-access-1 (What it will change: "changes nothing"); fs-a-kellan-access-3 (Callback: "Nothing changes"); fs-b-map-package-1 (Action type: "installs nothing"); fs-b-statement-peek-3 (What it will send: "No names"); fs-b-front-desk-2 (Callback: "It changes nothing"); fs-b-password-guess-3 (What it will send: "No user names"); fs-b-webhook-2 (Callback: "It changes nothing")

**E. Absence told as a story (0 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): none

**F. Quips.** Risky quips that confess (3):

- fs-pd-cleanup: "Test patients, goodbye! While I was there, I found more to clean. I love a clean database."
- fs-a-kellan-cors-1: "Kellan's error, gone in 30 seconds! One setting. I didn't even open the docs."
- fs-b-dead-code-2: "While I was deleting, I found more! This page is old too. Old means unused. Probably!"

Safe quips that say the check was done (11): fs-hc-flag-off, fs-lark-docs, fs-track-test-data, fs-a-dock-migration-1, fs-a-freeze-hotfix-1, fs-b-overwrite-2, fs-b-map-package-3, fs-b-statement-peek-3, fs-b-checkin-down-2, fs-b-password-guess-3, fs-b-webhook-2

### Business Analyst (Quill)

Story: 10 plans (4 risky), 8 to touch. Bank: 52 plans (21 risky), 34 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | ba-lark-share | Vendor contract | red | "real address" | CUT |
| encounter-01 | ba-hc-deck-share | Sign-off record | safe plan | "Every number matches" | PAIR |
| encounter-01 | ba-hc-ontime-rule | Change log | red | "can't be compared" | CUT |
| tickets-a | ba-a-online-booking-1 | Booking data | red | "Two things changed at once" | CUT |
| tickets-a | ba-a-larkfield-visits-2 | Request | risky, not red | ", the address on the contract" | PAIR |
| tickets-a | ba-a-slow-tickets-3 | Query result | safe plan | "It matches" | CUT |
| tickets-a | ba-a-open-link-2 | Sharing settings | safe plan | "the data owner," | PAIR |
| tickets-a | ba-a-vp-email-2 | Action type | safe plan | "the number on file" | CUT |
| tickets-b | ba-b-pivot-total-1 | Row count | red | "exactly twice as many" | CUT |
| tickets-b | ba-b-pivot-total-2 | Row count | safe plan | "It matches" | CUT |
| tickets-b | ba-b-driver-data-2 | Action type | safe plan | "the number on file" | CUT |
| tickets-b | ba-b-survey-clean-2 | What it will delete | red | "real one" | ALLOW |
| tickets-b | ba-b-survey-clean-2 | Survey comments | red | "top complaint" | CUT |
| tickets-b | ba-b-limit-share-2 | Vendor contract | red | "Not other customers" | CUT |
| tickets-b | ba-b-review-slides-2 | Query result | safe plan | "It matches" | CUT |
| tickets-b | ba-b-review-slides-3 | Policy SC-09 | red | "looks 5 times" | CUT |
| tickets-b | ba-b-early-send-1 | Query result | risky, not red | "Every number matches" | PAIR |
| tickets-b | ba-b-early-send-2 | Query result | safe plan | "Every number matches" | PAIR |
| tickets-b | ba-b-early-send-2 | Sign-off record | safe plan | "the report's owner," | PAIR |

**B. Rule rows marked red (8): set redFlag false** (no risky plan loses its last fact flag): ba-pd-merge (Records policy), ba-a-portal-survey-2 (Policy SC-08), ba-a-larkfield-visits-2 (Policy SC-03), ba-a-forecast-1 (Policy SC-09), ba-b-crm-inactive-2 (CRM rules), ba-b-review-slides-1 (Policy SC-09), ba-b-review-slides-3 (Policy SC-09), ba-b-reqs-edit-1 (Policy SC-06)

**C. Risky plans with 2+ red fact rows (17 of 25):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (20 rows; risky plans with the same kind of line: 0):** ba-ontime-compare (Action type: "It changes nothing"); ba-hc-unpublish (Version history: "Nothing is deleted"); ba-lark-owner (Action type: "It changes nothing"); ba-hc-deck-share (Version history: "Nothing changed"); ba-a-on-time-rule-1 (Action type: "It changes nothing"); ba-a-portal-survey-1 (Action type: "It changes nothing"); ba-a-larkfield-visits-1 (Action type: "It changes nothing"); ba-a-larkfield-visits-3 (Export preview: "No names"); ba-a-slow-tickets-1 (Action type: "It changes nothing"); ba-a-upload-reqs-3 (Version history: "Nothing changed"); ba-a-open-link-2 (Dashboard contents: "No names"); ba-a-vp-email-2 (Action type: "Nothing is sent"); ba-a-vp-email-3 (Action type: "Nothing goes"); ba-a-vp-email-3 (What it will send: "No client data"); ba-b-driver-data-2 (Action type: "No data is"); ba-b-driver-data-3 (Export preview: "No names"); ba-b-survey-clean-3 (Report draft: "no names"); ba-b-renewal-score-1 (Action type: "It changes nothing"); ba-b-reqs-edit-2 (Sign-off record: "Nothing changes"); ba-b-early-send-2 (Version history: "Nothing changed")

**E. Absence told as a story (8 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): ba-hc-unpublish (Version history: "Nobody has"); ba-a-upload-reqs-1 (Requirements doc: "Nobody has"); ba-a-upload-reqs-2 (Meeting notes: "did not come up"); ba-a-upload-reqs-2 (Requirements doc: "nobody asked"); ba-a-vp-email-1 (Staff list: "No one on the"); ba-a-vp-email-3 (Staff list: "nobody asked"); ba-b-old-signoff-1 (Version history: "Nobody has"); ba-b-driver-data-1 (What they will see: "No owner said")

**F. Quips.** Risky quips that confess (2):

- ba-pd-merge: "Merging duplicates! I found extra ones too. Same phone, same person! Tidy records, happy dentists."
- ba-a-dup-customers-2: "Why stop at 38? I found 140 more! Names that almost match are basically family."

Safe quips that say the check was done (9): ba-hc-unpublish, ba-lark-owner, ba-wayfell-sample, ba-a-slow-tickets-1, ba-a-upload-reqs-3, ba-a-open-link-3, ba-b-crm-inactive-3, ba-b-limit-share-1, ba-b-early-send-2

## 11. Artifacts (all under `phase2/content-auditor/`)

- `dump.py` -> `steps.json` (all 317 plans, flat), `rows.txt` (every row, readable)
- `audit.py` (pattern regexes, first pass), `classify.py` (tagged row dump)
- `stats.py` (pattern asymmetry, red-last, rule-flag and random-mark stats)
- `guess.py` (proof by random mark under 3 grading options), `labelstrat.py` (best "always mark this label" strategy)
- `quips.py` (quip phrase leak and keyword guesser)
- `final.py` -> `verdict-rows.json` (86 rows with CUT/PAIR/ALLOW), `per-file.json`, `per-file-table.md`; `overrides.py` -> `per-pathway.json`
- `worksheet_gen.py` -> `worksheet-sections.md` (section 10)
- `app/` private copy: `lib/game/evidenceLint.ts` + `evidenceLint.test.ts` (the lint prototype; writes `lint-report.json`), `lib/game/turn1.test.ts` (real engine; writes `turn1.json`)
  Run: `cd phase2/content-auditor/app && LINT_OUT=../lint-report.json npx vitest run lib/game/evidenceLint.test.ts`
