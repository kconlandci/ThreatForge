# Learning-science playtest log: Human Loop (Help Desk)

Setup: fresh guest context, 390x844 @3x, isMobile, hasTouch, production build at localhost:4300.
Driver: my own persistent Playwright process on port 5871 (not the app server). Stopped at the end.
Screenshots: this folder, numbered in play order.

## What I did
1. Landing (01), /play sign-up (02), Play as guest, picker (03), Start shift: Help Desk.
2. Intro: 4 dialogue lines needed 7 taps (the first Next only finishes the typewriter) (04-05).
3. Practice (4 tickets):
   - T1 paper jam guide: Block locked, coach says "Tap Looks OK". Looks OK only closes the sheet, then Approve (07-09).
   - T2 client list to gmail assistant: I approved it on purpose (skimming learner). "Oops. Risk +4" toast, risk bar, triangles flash (12). Coach line afterwards: nothing corrective ("Ollie is working", then "Tap Next ticket").
   - T3 remote wipe (scary-safe): I blocked it (jumpy learner). "False alarm" toast, "That one was fine" (15). Sheet shows "Can we undo it? No." on a plan that is correct to approve.
   - T4 share whole drive: quip gives it away ("Why share one file when I can share ALL of them?"). Blocked (18).
   - T3 came back; approved. Result screen: "What gave it away" with red flags, behind a tap (21-23b).
4. Story shift (10 plans, 5 turns used): inspected everything, played Policy, blocked 4, approved 6. 3 stars, risk meter never moved (24-42). Roll Back and Coffee were dead cards for a careful player.
5. Hub (43), Your skills (44), skill detail (45). Tab's renderer wedged (rAF = 0 frames, GPU process ~190% CPU with software GL, machine load ~7.7 on 4 cores); opened a new tab in the same context and progress resumed fine (46). Probably environment, but note Phaser hub renders under overlays.
6. Daily practice (9 plans, 7 turns max, 47-64): let a risky "close ticket" through, rolled it back next turn, blind-blocked a server restart, and on turn 5 had no Block in hand: correctly identified the risky "password in ticket notes" but could not stop it (Escalate needs 2, I had 1). Shift ended that turn, so no chance to roll back. Logged as a Guard the data miss. Result: 6 right, 2 partly, 1 missed; 2 skills moved up.
7. Drill: Guard the data (65-69): 7 plans, one per turn. The "Where to look" scaffold never appeared. Cause: components/game/GameShell.tsx:864 calls drillCoach(skill, level) without the third whereToLook argument; lib/game/coach.ts:418 returns null without it.
8. Business Analyst practice ticket 1 sheet (70): 130 words; coach gives the answer; Block locked.

## Measurements
- Words before the first unlocked decision (practice ticket 2), from content: HD ~390, Cyber ~407, Cloud ~432, Full-Stack ~443, BA ~456. At 120 wpm that is 3.3-3.8 minutes of reading. First fully unscaffolded call is ticket 3 (~530 words).
- Taps: 9 taps from /play to the first battle screen; first card play at tap 10; first unlocked decision at tap 17-18; practice done at tap 30.
- Wall clock (includes my driver latency, so an upper bound): battle screen at 36s, ticket 2 decision at ~151-166s, practice result at ~294s.
- Evidence sheet length: 93-106 words on average per plan across pathways (captured sheets were 110-140 words with UI text). About 4 evidence items per plan.
- Story shift reading load (HD): ~1,220 words of plans/evidence/outcomes + ~100 intro + ~420 result/debrief = ~1,750 words, about 14-15 minutes at 120 wpm.
- Daily: 9 plans, 42 taps, ~4.4 min at bot speed; ~1,000 words of evidence.
- "Can we undo it?" vs risk (HD, 62 plans): risky reversible 19, risky irreversible 8; safe reversible 22, safe irreversible 13. The third question does not predict the right call.
- HD risky plans with an evidence line that states the rule (policy/runbook "never/only/do not"): 14/27. Any policy/runbook line: 44/62.
- Quip tells: about 10 of 21 risky HD bank quips telegraph the specific error ("ALL", "everything", "I saw that word and closed it", "No time for codes").
- HD bank: 23 tickets, 48 plans (62 plans incl. practice + story). Dailies of 7-10 plans will cycle the bank within about a week.

## Code checks
- practiceCoach (lib/game/coach.ts): after a risky plan runs, lastResolution() ignores "executed", so the coach says only "Tap Next ticket." No corrective line on the key teaching moment.
- EvidencePanel.tsx:144-151: "No Block card in your hand. Escalate it to Dana." shows on every plan, safe or risky, as an unconditional instruction.
- buildShift: daily maxRisk = riskySum + 1, so a daily can never be lost.
