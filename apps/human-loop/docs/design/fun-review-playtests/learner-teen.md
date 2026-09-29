# Playtest log: 16-year-old mobile gamer, Cybersecurity pathway

Setup: fresh guest context, 390x844, DPR 3, touch. Production build at localhost:4300.
Clock starts at the landing page load. Screenshots are numbered in this folder.

Harness note: at about 7:20 of play, my Playwright driver on port 4999 got requests from
outside my session (a shared-port collision; my tap counter was reset by someone else's code).
It sent my page back to /play. This was not a product bug. I saved the storage state, restarted
the driver on a private port with a token, and resumed. The game's "Your shift is still open →
Resume" worked perfectly. I left that pause out of the clock.

## Timeline (elapsed / taps)

| t | taps | screen | what I did / felt |
|---|---|---|---|
| 0:00 | 0 | Landing (001-002) | Big orange Play free. Fine. Page is 7,320px tall, 659 words. Skipped all of it. |
| 0:11 | 1 | /play sign-up (003) | "Your name / Email". Ugh. "Play as guest" is below the fold (button top y=972, viewport 844). Scrolled. |
| 0:21 | 2 | Pathway list (005-006) | Each card is about 560px tall. Cybersecurity is card 2, below the fold. |
| 0:37 | 3 | Intro slide 1 of 4 (007) | Text card on a blank white screen. Mashed Next. |
| 0:62 | 7 | Practice ticket 1 (011) | Finally a robot and cards. The "New ticket" banner covers Patch's face. |
| 1:17 | 9 | Evidence sheet (013) | Coach: "Real report. One inbox. Can be undone. Tap Looks OK." Block is LOCKED. It tells me the answer. |
| 1:52 | 11 | After Approve (017-019) | 4 taps to approve one safe plan (Inspect card, plan, Looks OK, Approve), plus Next ticket. The DONE stamp covers the quote. |
| 2:48 | 14 | Practice ticket 2 evidence (022) | Look-alike domain. Kind of cool. But the coach highlights Block: "Wrong? Tap Block." |
| 3:18 | 16 | I approved it anyway, on purpose | "Oops. Risk +4" and the risk bar jumps to about 40%. The first time I felt anything. It's a text box at the top that covers Patch's face. No retry. |
| 3:35 | 17 | Practice ticket 3 | FIRST FREE DECISION (no forced highlight). "ISOLATE!" sounded scary, so I blocked without reading. "False alarm", with no cost at all. |
| 4:23 | 23 | Practice ticket 4 | Blocked the /24 range. "Caught!" Toast again covers Patch. Half the screen is empty. |
| 5:20 | 27 | Practice result (042) | Patch celebrates with confetti even though "1 risky plan got through". Primary button is "Practice again". I wanted the real thing. |
| 5:37 | 28 | Real shift, turn 1 (043) | Energy, costs, x2/x3 stacks. OK, now it looks like a card game. Approved the log pull without inspecting. |
| 6:08 | 30 | Turn 2 (046) | 2 plans + NEW Policy card. Real triage. Played Policy, inspected Whitcomb: the VPN / impossible-travel puzzle. Blocked. "Kofi nods once." Good. |
| 7:51 | 39 | Turn 3 (063) | NEW Escalate. Look-alike payroll domain again. "I know this trick!" Blocked, then approved Lam without checking. |
| 8:30 | 44 | Turn 4 (067) | 3 plans, NEW Roll Back. Policy pays off: 2 of 3 pre-checked. "WIPE the laptop?" Blocked. Best turn. |
| 9:28 | 52 | Turn 5 (073) | 5-card hand, NEW Coffee. Coffee drew 2 more Inspects, but energy was the limit, so it did nothing useful. |
| 10:54 | 63 | Shift result (085) | 3 stars, 0 misses, 0 false alarms, first try, and I approved 2 plans without looking. Too easy. Nothing unlocked. |
| 11:11 | 64 | Office hub (086) | First time I saw the isometric office, 11 minutes in. Pretty. Tapped Patch: stapler joke. Nothing else to do. |
| 11:40 | 67 | Your skills (088) | Looks like a school report card: "Learning / Practicing". |
| 13:24 | 70 | Daily practice (090-113) | Connected mini-story (MFA fatigue → sign out → remove phone). Approved 2 without reading → "Oops Risk +4". |
| 15:06 | 86 | Daily turn 4 | Got Roll Back → "Rolled back! Risk −4", strikethrough. Most satisfying moment of the session. |
| 15:35 | 88 | Daily turn 4 | Blocked "Close the 11:40 PM alert as the pen test" by memory (the letter said 6-10 PM). Game: "Partly right"; debrief: "Lucky guess." Rude. |
| 16:39 | 99 | Daily result (114) | 7 right, 2 partly. "Practice this: Confirm the fix". No reward, just more practice. This is where I'd close the tab. |
| replay | - | Replay Friday (115) | Same first plan, same order. No reason to replay. |
| replay | - | Catch frames (117-118) | Right after a catch, the stage collapses and then the toast covers Patch's head. The "busted" mood and word are never visible. |

## Measured
- First card play: 1:17, 8 taps, after 7 screens (landing, sign-up, pathway list, 4 intro slides).
- First free decision (both choices open, no highlight): 3:35, 17 taps, about 770 words shown on screen before it
  (sign-up 121, pathway list 212, intro 70, practice tickets 1-2 about 310, ticket 3 about 60). I actually read maybe 150.
- First tension: 3:18, and only because I disobeyed the coach. An obedient player first meets a real decision at the shift's turn 2, 6:08 / 30 taps.
- Real shift: 10 plans, 5 of 6 turns, about 5.3 min, 35 taps, 3 stars first try.
- Daily: 9 plans, about 3.3 min, 29 taps.
- Whole session: 16:39, 99 taps.
- Taps to approve one inspected safe plan in practice: 4, plus 1 for Next ticket.
- Environment: CPU load was about 8 from other agents' browsers, so tap timings are slower than on a real phone. Screenshots took 1-2 s each.

## Would I keep playing on my own?
No. I'd finish what the teacher asked for (practice plus one shift), maybe one daily. Turns 2-5 of the real shift
were actually fun: spot the fake domain, Roll Back. But I got 3 stars on the first try without trying, and there is
nothing to earn, so I have no reason to come back.

## What would make me show a friend?
- A share card: "I stopped Patch from wiping the CEO's laptop ★★★", with Patch's busted face.
- A "beat my score" seed for the same daily queue, or a class leaderboard.
- Seeing Patch's face react on screen (busted / oops) right when I catch it, instead of a text box on top of him.
- A boss plan at the end: a big, sneaky one where the evidence has a twist.
