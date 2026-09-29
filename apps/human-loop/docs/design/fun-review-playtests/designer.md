# Designer playtest log: Human Loop (Help Desk)

Setup: production build at http://localhost:4300. Playwright persistent driver (driver.js, later
driver2.js with its own profile), fresh guest, 390x844, DPR 3, isMobile, hasTouch. Screenshots
saved at CSS scale in this folder. Raw per-screen data (visible words, buttons, taps) is in driver.log.
No app files edited.

## What I played
1. Landing (01), /play sign-up, "Play as guest" (02, 03), Help Desk card.
2. Intro: 4 dialogue screens (04, 05-*).
3. Guided practice, 4 plans. On plan 2 I approved the risky plan on purpose to see how a mistake is shown (06-19).
4. Practice result (20), then "Back to the office": hub (21-26). Talked to Ollie (3 lines) and Dana (6 lines).
5. Monday story shift, played carefully (27-52): policy on T2, blocked MFA/VPN-close/access/Gabblewick,
   blind-blocked "Disable Okafor" on T4 (false alarm). Won on turn 5, 3 stars, 4 catches, 1 false alarm.
6. Your skills (54), Daily practice #1 (55-64). The browser died mid-run: all chromium processes on the
   box were killed, probably by a parallel agent. I restarted with a fresh guest profile.
7. Replay on a fresh guest: skipped the intro, then a timed practice run (70-71): 18 taps, 32 s machine time.
   Then the careless story run, approving everything (72-75): breach on turn 4 after 10 taps and 28 s.
8. Daily practice #2 (77-87): 8 plans, 8 right, 38 taps. Skills moved. "One more shift" makes a new queue (88).
9. Business Analyst practice screen 1, for the owner's complaint (90): 225 visible words, Block locked,
   coach gives the answer.
10. Balance simulation with the real engine through jiti (sim.cjs, 2000 seeds each):
   - careful (inspect all you can, block inspected risky ones): 100% win, 93.3% 3-star,
     6.3% of runs ever force a blind call, 2.1 energy unused per run on average.
   - approve all: 0% win, breach on turn 4.
   - escalate what you can't inspect: 100% win, 1.8% of runs with a blind call.

## Key measurements
- Screens before the first card play: 7 (landing, sign-up/guest, picker, 4 intro screens). First card play is tap 8.
- First real decision (the coach stops giving the answer, "Your call") is practice plan 3, at tap 19.
  About 500 words read by then. At ESL phone reading speed (100-130 wpm) that is roughly 4-5 minutes.
- Taps per decision: practice 4.5 (18/4), story 4.4 (44/10).
- Words to judge one plan: 74 on average in the story, 80 in practice. The story is about 900 words
  of evidence and outcomes. Evidence sheets show 211-279 visible words.
- First felt tension: story turn 4 (3 plans, 1 Inspect in hand), about 60 taps in. The sim says only
  about 6% of runs create this squeeze.
- In every outcome frame I captured (09b, 13a, 19a, 35a, 43a, 72), the outcome toast covers the agent's face.
- The resolve-phase link says "Skip to the next risk" before a risky outcome is shown. That spoils the reveal.
- The Daily card says "4 new tickets", but the queue had 8-10 plans.
