# Human Loop M1 art: files and intent (for the integrator)

All sprites are hand-built flat vector SVGs. They have no raster images, `<text>` elements or external fonts. Lettering is drawn as stroked paths, so it looks the same on every device.
Each file uses `viewBox="0 0 w h"` with the exact w/h from `lib/game/assets.ts`, so it stays crisp when the stage rasterizes at 3x. Every file is under 12 KB (the largest is resetbot-celebrate at about 10 KB).

- **Style:** 2:1 dimetric (64x32 tile). Light comes from the upper left: top faces are lightest, left faces mid, right faces darkest.
- **Palette:** DCI teal family, ink, warm neutrals, light wood, and orange as a sparing accent.
- **Floor shadows:** characters and props carry their own soft floor shadow (ink at 7-15% opacity). Do not add a second shadow in Phaser.

## Characters (drawn facing south-east; flipX for south-west)
| file | size | notes |
|---|---|---|
| `player.svg` | 40x72, origin (.5,.94) | Learner in a teal hoodie with orange drawstring tips and a clip-on badge. Neutral, inclusive depiction. Feet sit on the origin. |
| `dana.svg` | 40x74, origin (.5,.94) | Help desk manager: teal cardigan, orange lanyard + badge, glasses, natural hair in a puff with a teal tie. She holds a steaming white mug. |
| `resetbot.svg` | 52x66, origin (.5,.92) | Hub version of ResetBot 3000 (face turned to screen right; the orange RESET button is on its chest). Same design language as the portraits. |

## ResetBot battle portraits (220x220, origin (.5,.95), identical framing: swap textures in place)
`resetbot-idle.svg`, `resetbot-eager.svg`, `resetbot-busted.svg`, `resetbot-sad.svg`, `resetbot-celebrate.svg`

The head, body, button and feet are pixel-identical across moods. Only the face, arms, antenna and extras change:
- **idle:** friendly pill eyes and a smile, arms relaxed.
- **eager:** sparkle eyes, open grin, right arm raised with motion lines, antenna light "buzzing".
- **busted:** wide ring eyes, "o" mouth, an orange "!" warning badge in the screen corner, a sweat drop, hands up.
- **sad:** droopy-lidded eyes, a tear, a frown, antenna drooped with its light off, arms hanging.
- **celebrate:** happy ^ ^ eyes, big grin, arms up in a V, confetti.

Portraits are transparent with a soft floor shadow at y≈208. They face the viewer (slight 3/4 turn to their right).

## Props (isometric; floor point = middle of the 1x1 footprint)
Because of the origins in `assets.ts`, most props are smaller than their tile (for example, the printer and coffee machine are about half a tile). This is intentional; they sit centred on the tile.

| file | intent / orientation |
|---|---|
| `desk-monitor.svg` | Light-wood desk, drawer pedestal, ticket-queue monitor, keyboard, pen cup, teal mug, sticky note. The **monitor faces +y (screen lower-left)**, so the user sits on the tile toward screen lower-left. |
| `desk-resetbot.svg` | Same desk. The monitor shows a big orange reset arrow and "RESET?", with an orange "!!" sticky note, an orange mug, one worn orange key, a stack of printouts and an "RB" name plate. |
| `chair.svg` | Teal office chair seen from behind: the **backrest is toward screen lower-left**. Place it one tile toward screen lower-left of a desk so it looks tucked in. It has no footprint. |
| `plant.svg` | Leafy plant in a white pot with a teal band. |
| `coffee-machine.svg` | Charcoal espresso machine on a small cabinet. A taped note reads "OUT OF ORDER" (orange text #C2410C on white), and a tiny puddle sits under it. The front faces +y. |
| `whiteboard.svg` | Rolling whiteboard **standing diagonally on its tile, facing the camera**, so the writing is not skewed. It shows "VP-04", a 3-item checklist (2 teal checks, 1 orange "?") and a doodle of ResetBot with a "?" bubble. The feet run toward and away from the viewer. |
| `printer.svg` | Printer on a paper cart. A crumpled accordion **paper jam** sticks out of the front slot, and an orange status light is on. |
| `server-rack.svg` | Charcoal rack with 10 units, teal and orange status LEDs, a teal side stripe and vents. The LEDs are static (Phaser rasterizes once); tint or tween them in the stage for "blinking". |
| `water-cooler.svg` | White cooler with an inverted aqua bottle, a **teal (cold) and orange (hot) tap**, a cup tube on the side and a drip tray. |

## Wall decor (origin = centre; drawn in the plane of a back wall)
| file | wall | notes |
|---|---|---|
| `wall-window-left.svg` | **left** back wall (edges rise to the right, skew -26.57°) | Pale sky, soft teal skyline, cloud, glass shine, mullions and a sill that sticks out into the room. |
| `wall-window-right.svg` | **right** back wall (edges fall to the right, skew +26.57°) | Mirror geometry of the left window. |
| `wall-poster.svg` | **right** back wall | Motivational poster: a mini ResetBot with a magnifying glass, "TRUST, BUT VERIFY", orange pins. **Do not flipX** (the text would mirror). If you need one on the left wall, ask art for a `-left` variant. |
| `wall-clock.svg` | **right** back wall | Teal-rimmed clock reading 4:55 (almost the end of the shift). It has no numerals, so flipX is visually safe for the left wall. |

To place an item on a wall: the base point on the wall is `(topCorner.x ± p*32, topCorner.y + p*16)` for position p tiles along that wall. Put the sprite centre about 60-64 world px above that point (the clock looks best at about 80-90).

## UI markers
| file | notes |
|---|---|
| `marker-exclaim.svg` | Orange speech bubble with an ink "!" and a white halo, so it reads over props. The origin is the **tail tip** (.5, 1). Place it above a character's floor point by: ResetBot ≥ 62, player ≥ 68, Dana ≥ 72 world px (her hair puff is tall). |
| `tap-ring.svg` | Flat 2:1 floor ring in teal: faint fill, inner ring and centre dot. Centre it on the tile's floor point. |

## Brand (public/brand)
| file | notes |
|---|---|
| `dci-logo.png` | Official DCI Resources logo, 1054x510, **transparent background**, trimmed to content with ~2% padding. Not recoloured or redrawn. The baked-in white was removed with a matte that treats each pixel as a blend of white and the logo's own inks (teal #0F6A61 / black), so edges are clean on white and near-white (#F6F8F9) surfaces. Use it on white or near-white only. |
| `dci-logo-720.png` | 720x348 version (premultiplied Lanczos). Use for headers at 2x, e.g. `height: 36-44px` in CSS. |

## App icons + social card (app/, picked up automatically by Next.js file conventions)
| file | notes |
|---|---|
| `app/icon.png` | 512x512 ResetBot face on a teal tile with rounded, transparent corners. Readable at 32 px; at 16 px it is still a robot face with an orange antenna dot. |
| `app/apple-icon.png` | 180x180, same art, full-bleed square, no alpha (iOS applies its own mask). |
| `app/opengraph-image.png` | 1200x630, white background. It has the DCI logo, a "Human Loop" wordmark (Lexend Bold, "Loop" in teal), the tagline "AI agents are your new coworkers. Learn to supervise them.", verb chips (Inspect / Approve / Block / Escalate) and a teal and orange bottom bar. The hero is an iso office built from these exact sprites, with ResetBot under an orange "!" marker. There are no marketing claims. |

`public/favicon.svg` (the old v1 mark) has been deleted.

## Text baked into art (for ESL review)
RESET, 3000, RESET?, !!, RB, OUT OF ORDER, VP-04, TRUST, BUT VERIFY.

## Sources / regeneration
The generator scripts live in this scratch folder (not in the repo):
- `svglib.py`: iso helpers and the stroke font.
- `bot.py`, `props.py`, `people.py`: the sprites.
- `gen.py`: writes all SVGs.
- `sheet.mjs`: contact sheet and mock room.
- `brand.py`: logo matte.
- `icons.py` / `icons.mjs`: app icons.
- `og.mjs`: social card.

Previews:
- `sheet.png`: every sprite at 3x with its origin marked, plus a 1x thumbnail.
- `room.png` / `room-1x.png`: 8x8 mock room at 2x and 1x.
- `icons-check.png`
- `logo-check-*.png`
