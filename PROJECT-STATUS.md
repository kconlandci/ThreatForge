# ThreatForge — Project Status

**Last updated:** March 26, 2026
**Version in code:** v0.4.0 (Sprint 4)
**Where you left off:** Just verified Google Play Developer account

---

## What ThreatForge Is

A mobile-first Android app that trains cybersecurity judgment through interactive, scenario-based labs. Users read realistic workplace security situations (phishing attempts, ransomware incidents, cloud misconfigurations, etc.), make decisions, and get scored with expert feedback. Think "Duolingo for cybersecurity decision-making."

**Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Capacitor 8 (Android) + Firebase (anonymous auth)

**Monetization:** Freemium — free beginner labs + a one-time $14.99 "Founders Pack" for premium labs

---

## What's Built and Working

### Core App (fully functional)

- **Lab Engine** (`src/engine/LabEngine.tsx`) — Generic engine that runs any lab through 4 phases: intro → active → feedback → results. Handles scoring (starts at 100, deducts penalties), hints (3 per lab with point penalty), scenario progression, and results display with career insights.

- **4 Renderer Types** (`src/engine/renderers/`) — Each handles a different interaction pattern:
  - `action-rationale` — Pick an action + pick a rationale explaining why
  - `toggle-config` — Toggle security settings to their correct states
  - `investigate-decide` — Review investigation data, then decide
  - `triage-remediate` — Classify a threat + pick remediation

- **34 Lab Manifests** (`src/data/labs/`) — All defined using a Zod-validated schema (v1.1). Each lab has 3-5 scenarios, learning objectives, difficulty tiers, scoring config, career insights, and tool relevance tags. Mix of free and premium.

- **4 Learning Paths** (`src/data/paths.ts`):
  - SOC Analyst Foundations (8 labs)
  - Network & Infrastructure Defense (7 labs)
  - Threat Response & Remediation (15 labs)
  - Identity & Cloud Security (6 labs)

- **Lab Scaffold Generator** (`scripts/scaffold-lab.ts`) — Interactive CLI tool for generating new lab manifest skeletons with TODO placeholders.

### Screens (6 total)

- **HomeScreen** — Shows XP, streaks, "Continue Your Path" card, learning paths with expandable lab lists, collapsible "All Labs" section, premium upgrade prompt
- **LabScreen** — Premium gate + loads correct renderer for the lab + "Up Next" recommendations on completion
- **ProgressScreen** — XP/level display, streak tracking, catalog completion %, completed lab list with best scores
- **SettingsScreen** — App info (v0.4.0), premium link, legal pages, reset progress, send feedback (mailto:threatforge.app@gmail.com), rate app (placeholder)
- **UpgradeScreen** — Founders Pack pitch ($14.99 one-time), value props, premium lab preview list. **CTA button is disabled** with "Premium billing launching soon" message
- **DevScreen** — Dev-only screen (hidden in production)

### Auth & Data

- **Firebase Anonymous Auth** (`src/contexts/AuthContext.tsx`) — Signs in anonymously on first launch. UID persisted via Capacitor Preferences as a backup for WebView instability. Detects UID changes (reinstall) and logs a warning.
- **Progress Hook** (`src/hooks/useProgress.ts`) — localStorage-based. Tracks per-lab completion, best scores, attempts, scenario results, XP, streaks. Has schema migration (v0→v1→v2). Saves on Android `pause` event to survive WebView kills. Handles localStorage quota errors gracefully.
- **Premium Status Hook** (`src/hooks/usePremiumStatus.ts`) — Phase 1: reads from Capacitor Preferences (local cache only). Has a 7-day cache TTL. `setPremiumStatus()` utility ready for Phase 2. **RevenueCat integration not yet built.**
- **Recommendation Engine** (`src/hooks/useRecommendedLab.ts`) — Suggests next lab based on: (1) next in current path, (2) same difficulty, (3) next difficulty up.

### Android

- Capacitor config targeting `com.threatforge.app`
- Android project scaffolded in `/android`
- Dark background (#0a0a0f), HTTPS scheme

### Other

- Onboarding flow (3 screens with consent checkbox)
- Error boundary for labs
- Android back button handling
- Legal pages (privacy policy, terms of service, disclaimer)
- Bottom navigation (Home, Progress, Settings)

---

## What's NOT Built Yet

### Must-have before Play Store launch

1. **Google Play Billing / RevenueCat** — The upgrade screen exists but the purchase button is disabled. `usePremiumStatus` is Phase 1 (local cache only). Phase 2 (RevenueCat as source of truth) is not implemented. The `setPremiumStatus()` function and cache TTL are ready to be wired up.

2. **Restore Purchase flow** — Button exists on UpgradeScreen but just logs to console.

3. **"Rate This App" link** — Greyed out in Settings with "Coming soon — available on Google Play" text. Needs the Play Store deep link.

### Should-have (you were clearly heading here)

4. **Server-side progress sync** — Progress is localStorage-only. The `userId` field in the progress schema exists but is never synced to Firestore. The AuthContext detects UID changes on reinstall but can't recover progress. This is the biggest user-facing gap.

5. **Proper README** — Still the default Vite template boilerplate.

---

## Where You Left Off

Based on the code state and what you told me:

1. The app is feature-complete for a soft launch (all labs, all screens, all renderers working)
2. You just verified your **Google Play Developer account**
3. The natural next step was likely one of:
   - **Setting up RevenueCat** and wiring it into `usePremiumStatus` Phase 2
   - **Building and uploading an AAB** to Google Play Console for internal/closed testing
   - **Setting up a Play Store listing** (screenshots, description, etc.)

The purchase button being disabled with "launching soon" suggests you may have been planning to ship a free version first and enable billing shortly after.

---

## Key File Map

```
src/
├── App.tsx                          # Router + AuthGate
├── config.ts                        # IS_DEV flag
├── config/firebase.ts               # Firebase init (anonymous auth)
├── contexts/AuthContext.tsx          # Auth provider + UID persistence
├── components/
│   ├── BottomNav.tsx                # Tab bar (Home, Progress, Settings)
│   ├── ErrorBoundary.tsx            # Lab crash handler
│   ├── LegalTextViewer.tsx          # Generic legal page renderer
│   └── Onboarding.tsx              # First-launch onboarding
├── data/
│   ├── catalog.ts                   # All 34 lab manifests registered
│   ├── paths.ts                     # 4 learning paths
│   ├── legal.ts                     # Privacy, Terms, Disclaimer text
│   └── labs/                        # 34 individual lab manifest files
├── engine/
│   ├── LabEngine.tsx                # Core gameplay engine
│   └── renderers/                   # 4 renderer components + registry
├── hooks/
│   ├── useAndroidBackButton.ts
│   ├── usePremiumStatus.ts          # Phase 1 (local), Phase 2 stub
│   ├── useProgress.ts              # localStorage persistence + migrations
│   └── useRecommendedLab.ts        # Next-lab recommendation logic
├── screens/
│   ├── HomeScreen.tsx
│   ├── LabScreen.tsx
│   ├── ProgressScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── UpgradeScreen.tsx
│   └── DevScreen.tsx
└── types/manifest.ts                # Zod schema + TypeScript types

scripts/scaffold-lab.ts              # Lab generator CLI
capacitor.config.ts                  # Android app config
```

---

## Firebase Config

- **Project:** threatforge-713ca
- **Auth:** Anonymous only (browserLocalPersistence)
- **No Firestore** usage in code yet

## Accounts / Services

- **Google Play Developer:** Verified (as of where you left off)
- **Firebase:** threatforge-713ca
- **Feedback email:** threatforge.app@gmail.com
