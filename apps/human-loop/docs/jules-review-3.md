# Jules Review 3: Findings

## Bugs and Wrong Game Logic

- **File**: `lib/game/engine.ts` (Line 608)
  - **What is wrong**: `blindBlocks(state, encounter)` prevents 3 stars if a risky plan is blocked blindly. However, `gut` in `balance.test.ts` states: "guessing from the wording never earns 3 stars". If `blindBlocks` relies on checking `step.safe`, players could still guess safe plans from their wording without penalty.
  - **How a player hits it**: A player guesses answers purely by reading the wording of the ticket rather than doing the work to inspect the evidence.
  - **Suggested fix**: Ensure the logic prevents a perfect score if the player does not use the inspect action appropriately, even for non-risky plans if they require it.
  - **Severity**: Medium

## Privacy and Safety

- **File**: `app/privacy/page.tsx` (Line 118)
  - **What is wrong**: The notice says "Sign-up and progress data are stored in **Airtable**, a cloud database service...".
  - **How a player hits it**: A player reads the privacy notice but their deployment is using Postgres, meaning the privacy notice is inaccurate for their data.
  - **Suggested fix**: Change "Airtable" to something like "a cloud database service (Airtable or Postgres)" or just "a cloud database service" depending on deployment configuration.
  - **Severity**: Medium

- **File**: `app/api/feedback/route.ts` (Line 30)
  - **What is wrong**: `feedbackLimiter` checks `clientIp(req)`. It limits to 30 requests per 10 minutes per IP.
  - **How a player hits it**: A classroom of 30+ students shares a single Wi-Fi IP address. If they all try to send feedback, some will be rate-limited and fail to submit.
  - **Suggested fix**: Use `playerId` from the cookie (if present) instead of or in addition to the IP address for rate limiting feedback, or increase the limit.
  - **Severity**: High

## Small Phones, Keyboard Use, Accessibility

- **File**: `components/game/GameShell.tsx` (Line 1120, 1133)
  - **What is wrong**: Focus is manually restored to `hubHeadingRef.current` when dialogues close. However, if the player was focused on a specific button inside the hub list, focus jumps back to the heading, forcing them to tab back through the UI.
  - **How a player hits it**: A keyboard user opens a dialogue from a hub card, closes it, and loses their place as focus resets to the top heading.
  - **Suggested fix**: Store the `document.activeElement` before opening the dialogue and restore focus to that exact element when the dialogue closes.
  - **Severity**: Medium

## Content Mistakes

- **File**: `content/help-desk/bank/tickets-c.json` (Line 752)
  - **What is wrong**: The quip says "Why stop at one folder? I'll give Lam everything Dr. Pell has. Future tickets: prevented!"
  - **How a player hits it**: Reading the quip gives away that the plan gives too much access (is unsafe/wrong) before the player has to inspect any evidence.
  - **Suggested fix**: Adjust the quip so it doesn't give away the wrongness of the action so obviously.
  - **Severity**: Low
