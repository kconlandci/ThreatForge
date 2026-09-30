# Human Loop promo video: script and HeyGen prompt

An evergreen video (about 60 seconds) for YouTube or as a file. It shows only the core loop, so it
stays true while the game changes. Every claim below comes from the README or the demo kit.

## Keep it evergreen

- Show only the core loop: read the plan, check the evidence, decide.
- No dates, version numbers, counts (do not say "five pathways"), menus or button names.
- Do not say "new", "beta" or "in testing".
- Do not say the web address out loud. Put it on the end card and in the YouTube description, so
  it can be swapped without a re-record.
- Do not name the AI coworkers (Ollie, Patch and so on). Characters can change.
- No results, job outcomes, statistics or testimonials.
- No game music. The bundled songs have an unchecked licence.
- Do not say "nonprofit". The game footer says "DCI Resources LLC". Add it only if the owner wants it.
- Captions on, so it works muted.

## Voiceover (about 110 words, about 60 seconds with pauses)

1. "AI can do real work now. But it can also get things wrong, fast."
2. "Human Loop is a free game that teaches one skill: checking an AI coworker's plan before it runs."
3. "Each round, your AI coworker shows you a plan. You read it. You check the evidence. Then you decide: let it run, block it, or ask your team lead."
4. "Some plans are safe. Some are not. Your job is to tell the difference."
5. "Pick a career path, like help desk or cybersecurity, and play a short shift. It works on your phone. No download. No sign-up."
6. "Human Loop. A free game from DCI Resources. Play it now."

## Picture plan

| Line | On screen |
| ---- | --------- |
| 1, 2 | Presenter on camera, captions. Clip 1 can sit under line 2 ("a free game") |
| 3 | Clips 3 and 4: the plan, its evidence, the decision |
| 4 | Clip 4 (a risky plan blocked) then clip 5 (a safe plan let through) |
| 5 | Clip 2 (the pathway tour) |
| 6 | End card: "Human Loop. A free game from DCI Resources." and the web address as text |

Sizes: 16:9 for YouTube. A 9:16 copy is optional.

## Gameplay clips

Five real clips, recorded from the game at phone size, with no sound and no music. Each comes
as a portrait file (`-phone`, 780x1688) and a 16:9 file (`-16x9`, 1920x1080, the phone centred on
a teal background). An orange ring marks each tap. The ring is added by the recorder, not the game.

| Clip | Shows | About |
| ---- | ----- | ----- |
| 1 the front door | Landing page, Play free, Play now | 7 s |
| 2 pick a career path | Slow tour of all five pathway cards, then Help Desk | 17 s |
| 3 read the plan | The AI coworker's plan on the board, open its evidence | 7 s |
| 4 check the evidence and block | Mark the wrong line, block the plan, "Caught with proof!" | 10 s |
| 5 a safe plan, let it run | Check a safe plan and let it run | 11 s |

The clips are not stored in git (they are large, and go stale when screens change). To make them
again, run `docs/promo-video/record-clips.mjs` against a production build. The top of that file
says how. Re-record when the game's screens or wording change.

What the footage shows: the AI coworkers' names (Ollie, Dana) and the on-screen words appear in
the picture, even though the voiceover never says them. Animation is a little less smooth than on
a real phone (about 15 to 25 frames a second), because the clips are recorded on a server.

## Paste-ready prompt (ChatGPT with HeyGen, or HeyGen directly)

```
Use HeyGen to make a 60-second promo video for a free browser game called "Human Loop".

Audience: adult learners (many read English as a second language) and workforce funders.
Tone: warm, calm, plain English. Short sentences. No hype.
Format: 16:9, 1080p, captions burned in. One friendly, professional presenter with a clear voice.

Voiceover (use word for word):
1. "AI can do real work now. But it can also get things wrong, fast."
2. "Human Loop is a free game that teaches one skill: checking an AI coworker's plan before it runs."
3. "Each round, your AI coworker shows you a plan. You read it. You check the evidence. Then you decide: let it run, block it, or ask your team lead."
4. "Some plans are safe. Some are not. Your job is to tell the difference."
5. "Pick a career path, like help desk or cybersecurity, and play a short shift. It works on your phone. No download. No sign-up."
6. "Human Loop. A free game from DCI Resources. Play it now."

Pictures:
- Lines 1 and 2, and line 6: presenter on camera.
- Lines 3, 4 and 5: a calm plain teal background with large captions. I will replace these
  with real gameplay clips later, so leave them easy to swap.
- End card: "Human Loop. A free game from DCI Resources." and the text "[WEB ADDRESS]". I will fill in the address.

Rules:
- Do NOT invent screenshots, game screens or app interfaces. Show no fake game visuals.
- Do not add statistics, awards, testimonials, dates or promises about jobs.
- Do not say the web address out loud.
- No background music.
- Show me a preview or draft first. Do not do the final render until I approve it, to save credits.
```

## YouTube text (evergreen)

- **Title:** Human Loop: a free game that teaches you to check AI's work
- **Description:** Human Loop is a free card game from DCI Resources. Your AI coworker makes a plan.
  You read it, check the evidence, and decide what happens next. Plays in your browser on a phone
  or laptop. No download. Guest play needs no sign-up.
  Play: [WEB ADDRESS]

## Before publishing

- Watch it once with the sound off.
- Check the web address on the end card and in the description opens the game with no login page.
- If the game's core loop changes (for example, new choices instead of let it run / block / ask your
  team lead), redo lines 3 and 4 and the clips.
