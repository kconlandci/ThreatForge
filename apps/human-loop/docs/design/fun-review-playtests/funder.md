# Funder demo review: log of what I did

Role: program officer at a workforce foundation, watching a 3-minute demo on a laptop (1440x900), then on a phone (390x844, DSF 3, touch).
Server: the existing production build at http://localhost:4300 (not started or stopped by me). Fresh guest context for every run. No files in the app were edited.

## Runs
- `js/landing.js`, `landing2.js`: desktop landing (d01*, d02*). Image list: all sprites load.
- `js/run.js` + `s_hd*.json`: desktop Help Desk: sign-up -> picker -> intro -> practice, step by step (hd-01..hd-19). Mistake path: approve the risky client-list plan (hd-m14a, hd-m14).
- `js/player.js` + `hdshift2.js`: auto-played the Help Desk story shift (skip practice) on desktop (hs-*) and phone (ms-*). Worst-case run (br-*). Approve-everything run -> breach (aa-*).
- `js/meta.js`: after a shift -> office hub -> Your skills (mt-*).
- `js/demo.js`: real-time "presenter pace" runs (reading 250 wpm on the text that matters + 1 s per tap), with milestones. demoA = default path with practice, demoB/demoB2 = Skip practice.
- `s_m1.json`: phone landing -> sign-up -> practice (m-01..m-14). `s_mis.json`: phone frame sequence after approving a risky plan (mis-a0..a6, mis-strip.png).
- `s_ba.json`: phone Business Analyst first practice screen + evidence sheet (ba-01, ba-02).
- `s_meas.json`: layout measurements.

## Measurements
Presenter pace, desktop, default path (demoA):
- 0:54 first plan on screen (7 taps, ~150 words: hero, sign-up, picker, 4 intro slides)
- 1:04 first evidence sheet (108 words)
- 2:19 first "Caught!" (15 taps, ~430 words)
- 3:10 first decision the coach does NOT dictate (18 taps, ~620 words)
- 4:04 practice result (25 taps, ~775 words)
- In 3:00 the audience never sees energy, 2+ plans, new cards, stars or skills.
Skip-practice path (demoB2): 0:54 hub, 1:01 first plan, 1:39 first undictated decision (10 taps, ~300 words), 1:50 first 2-plan turn + "New card!", 3:13 first "Caught!".
Bot speed (no reading): practice 45 s / 28 taps on desktop, 69 s / 27 taps on phone; story shift ~70-100 s / ~37-40 taps.
- Evidence sheets: 105-129 words each (all 10 shift sheets).
- Phone sheet height 741 of 844 px: the stage and agent are hidden while you decide. BA sheet scrolls (536 vs 454 px), "Can we undo it?" is below the fold.
- Desktop battle column 560 of 1440 px: 61% of the laptop screen is empty during play.
- Outcome toast covers 90 of the 277 px stage (the top third, where the agent's face is).
- Mistake feedback: a ~0.3 s "Yikes!" flash, then the agent is back to sparkle eyes. At 7/10 risk the office scene looks the same as at 0.
- Phone sign-up: "Play as guest" top at y=972, below the 844 px fold.
- README says practice is "about 90 seconds"; measured 3:10 at presenter pace.
- No console errors or page errors in any run.

## Harness notes (not game bugs)
- Playwright needed force clicks on the pulsing Approve button (it never reports "stable").
- demo.js got stuck at turn 5 of the skip path (my loop, not the game: Approve was visible and enabled); milestones before that are valid.
- The worst-case bot run got stuck selecting Inspect at 0 energy (bot logic).
