# Human Loop demo kit

A 3-page PDF for showing the game to funders, case workers and staff.

- Page 1: a handout with a QR code (safe to print or share).
- Page 2: a 5-minute demo script (for the presenter).
- Page 3: answers to likely questions, and what to do if something goes wrong (for the presenter).

The finished file is served by the game at `/demo-kit/Human-Loop-demo-kit.pdf`
(source: `public/demo-kit/Human-Loop-demo-kit.pdf`). Built 2026-09-30.

## Rebuild it

Needs Python 3 with `segno` and `pymupdf`, and Playwright with Chromium (see `CLAUDE.md`).
Run from this folder:

```bash
python3 build.py      # writes .build/kit.html (QR code, logo and mascot are embedded)
node print.mjs        # prints .build/raw.pdf; fails if any page overflows
python3 finish.py     # shrinks it and writes public/demo-kit/Human-Loop-demo-kit.pdf
```

`logo-q.png` and `ollie-q.png` are small, reduced-colour copies of `public/brand/dci-logo.png` and
`public/game/sprites/ollie-idle.svg`. They keep the PDF near 140 KB, so it is easy to email.

## When you change the game, check the kit

Every claim in the PDF came from the game or the README. If any of these change, edit `build.py`
and rebuild:

- the address (`URL` and `SHOW_URL` at the top of `build.py`; the QR code follows `URL`)
- the landing page wording, the 3 steps, or the pathway and coach names
- the practice flow (4 tickets, "Where do I look?", "Start the real shift", "Start shift")
- the Menu items named in the script (Send feedback, Skip practice, Replay intro)
- the shift length (6 turns), sign-up age (13 or older), or what is stored for signed-up players
- the sign-up or privacy wording

After a rebuild, check the QR code still scans to the address, and look at all 3 pages.
