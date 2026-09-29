# Learner play log: adult ESL help desk job seeker (Help Desk pathway)

Persona: 38, English is my second language, I want an IT help desk job, I rarely play games, I use an Android phone.
Setup: fresh guest context, 390x844, DSF 3, isMobile, hasTouch, production build at :4300.
Driver: driver.js (persistent Playwright). Screenshots are numbered 01-55 in this folder.
The clock is my session clock. It includes my own reading and thinking time, which is about the same as a slow reader's.

| t (s) | Screen / shot | What I did | What I thought and felt (think aloud) |
|---|---|---|---|
| 2 | 01 landing | read hero | "AI agents are your new coworkers." Clear. Big orange Play free. OK. |
| 15 | 02 /play form | saw sign-up form | A form? I don't want to give my email yet. Guest button is below the fold, so I scrolled to find it. |
| 31 | 04 pathway list | Play as guest | "Start over"? I haven't started. Help Desk is first. Good. |
| 42 | 05 intro 1/4 | Next | "The coffee machine is still asking for a language"? I don't get the joke. The top half of the screen is empty. |
| 58-84 | 06-08 intro 2-4 | Next x3 | Nice drawings. Dana is friendly. "Tier 1": I know it from job ads. |
| 94 | 09 practice 1 | read board | A card game! Inspect card glows. Block and Approve are locked. |
| 109-136 | 10-12 | Inspect, tap plan, Looks OK | Tap the card, then the plan (2 taps). Evidence: ~90 words. "PAPER JAM IN TRAY 3. It only has 2 trays": funny, I get it. But Block is locked, so there is no choice. I just do what Dana says. |
| 145 | 13 | Approve | I already said "Looks OK". Why do I need Approve too? The "Done" toast covers Ollie. The DONE stamp covers the words. Nothing moves. |
| 159 | 14 practice 2 | read | "Nothing says welcome like 400 phone numbers": ha, this sounds bad. |
| 173 | 15 | tapped locked Block | Nothing happened. No message. |
| 178-196 | 16-17 | Inspect, Block | gmail.com, but the company is @harlowcolewp.com. Dana told me to tap Block, so easy. "Caught!" OK. "Someone was fishing"? Fishing, like fish? (phishing pun, lost on me). The bottom half of the screen is empty white. |
| 210-242 | 18-21 | Inspect remote wipe | "Erase everything": scary! "Can we undo it? No." Dana's rule says be careful when you can't undo. "Runbook": a new word. |
| 257 | 22 | Block (my honest guess) | **First real decision, and I got it wrong.** "False alarm." The text says what happened, not WHY it was fine (the runbook). The toast disappears by itself after about 12 s. |
| 303-330 | 24-27 | Inspect, Block file share | 1,240 files, drivers' home addresses, anyone with the link. Clearly wrong. Easy. "Dappleway": strange name. |
| 330-346 | 27-29 | wipe comes back, Approve | A second chance! I like this. "The thief gets a very clean, very empty laptop." Ha. |
| 354 | 30-31 practice result | read | "You finished. Good work got blocked 1 time." Is that bad? I got 3 of 4 right, but it doesn't say that. "What gave it away" is an idiom, but the list is clear and useful. |
| 385-438 | 32-34 office hub | walked to Dana | Pretty office. Dana gives 6 screens of rules I already learned in practice. Nothing to do here. A normal learner would skip it and tap the big orange button. |
| 451 | 35 shift turn 1 | Inspect, Looks OK, Approve | Energy 3, Inspect x4. The one plan is "look up in directory" (read-only). Boring: I had no reason to spend energy. |
| 486 | 38 turn 2 | read | 2 plans, a NEW Policy card, energy. **First time I have to think about how to spend energy.** "MFA", "Callback", "auto-inspected": hard words. |
| 502-510 | 39-40 | Policy then Play | "Guardrails scale. You don't." I don't understand. The card is a bit confusing: tap, then "Play". |
| 520-544 | 41-43 | Inspect VPN, open MFA, Block | **Best moment: jromero.cfo@gmail.com. The same trick as practice! I found it myself!** "The real Romero is eating breakfast." I felt smart. "wire call", "ASAP", "CFO": ESL-hard. |
| 557 | 44 | Approve | "Ollie does a small victory spin", but I only read it. The toast covers Ollie. |
| 570 | 45 turn 3 | read | New Escalate card (costs 2). 2 plans. |
| 582-595 | 46-47 | Inspect both | Laptop for new hire: fine. Close VPN ticket: dark "terminal" boxes with $ and "Exit code 0". Scary for me. "Script ran with no errors" is the easiest sentence to read, so I trusted it. |
| 610-635 | 48-50 | Looks OK, Approve | **"Oops. Risk +2": Ruiz types STILL in all caps.** Funny, but it doesn't point to the clue I missed ("9:11 and 9:19 after the fix"). "Can still roll back": I don't have Roll Back yet. I had 1 energy left and didn't use it. |
| 651 | 51 turn 4 (peek) | read | 3 plans, 4 card types, a Done row, a Roll Back decision. Card text is now hidden (icons only). This is where I start to feel "too much". |
| 655-700 | 52-55 | Inspect x2, Block (burst shots) | Checked the catch reaction: the toast covers Ollie in every frame, so any mood change or effect is hidden. |

## Measured
- Taps to the first card play (Inspect, practice 1): 8 (plus 1 scroll). Screens before it: 8 (landing, /play form, pathway list, intro x4, board). About 105 s on the session clock. About 330 words read.
- Taps to the first real (unguided) decision, the practice 3 wipe: 19. About 256 s. About 825 words read (the quip is shown twice per ticket, about 35 duplicate words each).
- First humor: t=159 s (400 phone numbers). First surprise: t=257 s (False alarm on the wipe). First resource tension (energy vs plans): t=486 s (real shift turn 2; about 385 s without the office detour). First "Oops"/risk: t=635 s.
- Two confirmations for one decision: "Looks OK" then "Approve" (practice 1 and every single-plan turn).
- The outcome toast covers the stage (Ollie's face) in shots 13, 17, 22, 43, 44, 50, 52-54.
- Block and other outcome toasts auto-dismiss (readingMs: 1500 + 80 ms/char, max 15 s); shot 23 shows it gone.

## Where I would quit
I would not quit during practice (it's short and I want the job). Boredom peaks: practice ticket 1 (on rails, double confirm), Dana's 6-screen repeat in the office, and real-shift turn 1 (a free read-only plan). Highest quit risk: turn 4, with 3 plans, 4 cards, Roll Back, the Done row, terminal logs and icon-only cards. After the first shift, nothing I saw tells me why to come back tomorrow.
