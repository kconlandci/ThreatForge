# Jules Review: Findings

## 1. Missing viewport zooming lock and `viewportFit` in main layout

**Severity:** Low / Medium
**File and line:** `apps/human-loop/app/layout.tsx`, line 28
**How to reproduce:**
Load a non-play page (such as the landing page or the privacy policy) on an iPhone with a notch in landscape mode. Or view it in iOS Safari. The `viewportFit: "cover"` property is missing from the global viewport export, so these pages will not properly extend into the safe area under the notch, leaving white bars on the sides. While individual play pages (like `help-desk/page.tsx`) explicitly set this, the global layout lacks it.
**Suggested fix:**
Add `viewportFit: "cover"` to the global viewport export in `apps/human-loop/app/layout.tsx`.

## 2. Silently failing sign-out while offline

**Severity:** High
**File and line:** `apps/human-loop/lib/client/save.ts`, line 427
**How to reproduce:**
1. Log in to an account so that you have a signed-up profile and an `hl_pid` HTTP-only cookie.
2. Disconnect from the internet (go offline).
3. Attempt to sign out of the game. The client catches the offline fetch error from `/api/logout`, fails to clear the HTTP-only cookie, but proceeds to execute `clearLocal()`, wiping the local save and removing the UI profile. The user believes they are fully signed out.
4. Reconnect to the internet and refresh the page. `syncFromCloud` will trigger, authenticate with the remaining `hl_pid` cookie, and fully restore the user's save and profile. On a shared computer, a subsequent user would unwittingly be logged into the first user's account.
**Suggested fix:**
If the API call to `/api/logout` fails (e.g. offline), the client should not destructively clear local state and pretend it succeeded. Instead, the function should throw or return an error, alerting the user that sign-out failed because they are offline, ensuring they don't walk away from a shared device with an active session cookie.

## 3. Blind escalations are not accurately tracked as blind blocks

**Severity:** Medium
**File and line:** `apps/human-loop/lib/game/engine.ts`, line 290
**How to reproduce:**
1. In a battle, the agent proposes a risky intent.
2. Play the "Escalate" card (which bypasses inspection and prevents execution, functionally counting as a catch) before inspecting the step.
3. The `blindBlocks` function maps over the steps, but it checks specifically for `state.steps[x.id]?.status === "blocked"`. Because escalating a step changes its status to `"escalated"`, the game does not register this as a blind block, allowing the player to keep the "careful oversight" third star without actually inspecting the evidence.
**Suggested fix:**
Update the condition in `blindBlocks` to check for both `blocked` and `escalated` statuses:
`state.steps[x.id]?.status === "blocked" || state.steps[x.id]?.status === "escalated"`.