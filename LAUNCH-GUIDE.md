# ThreatForge — Play Store Launch Guide

Your Google Play Developer account is verified and ready. Here's everything you need to go from "Create your first app" to a live listing.

---

## Step 1: Build the AAB

Run these on your machine from the project root:

```bash
# 1. Clean build the web app
npm run build

# 2. Sync web assets into the Android project
npx cap sync android

# 3. Build the release AAB
cd android
./gradlew bundleRelease
```

The AAB will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Note:** This will be an unsigned AAB. Google Play will sign it for you using Play App Signing (which is required for new apps and enabled by default when you upload your first bundle).

If you want to test locally before uploading, build a debug APK instead:
```bash
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 2: Create the App in Play Console

1. Click **"Create app"** on your Play Console home
2. Fill in:
   - **App name:** ThreatForge
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
3. Check the declarations (content policies, US export laws)
4. Click **Create app**

---

## Step 3: Set Up Store Listing

Go to **Grow > Store presence > Main store listing** and fill in:

### Short description (80 chars max)
```
Practice real cybersecurity judgment in interactive workplace simulations.
```

### Full description (4000 chars max)
```
ThreatForge is a cybersecurity decision simulator that builds real-world security judgment through interactive scenarios.

Instead of memorizing textbook answers, you'll face realistic workplace situations — phishing emails, ransomware incidents, cloud misconfigurations, insider threats — and make the same calls a security professional would. Every decision is scored with instant expert feedback explaining what works and why.

WHAT YOU'LL PRACTICE:
• Phishing email triage and header analysis
• Ransomware containment and incident response
• Cloud IAM and container security
• Firewall hardening and network segmentation
• Privilege escalation detection
• Social engineering defense
• MFA fatigue attacks
• DNS threat analysis
• And much more

HOW IT WORKS:
1. Read the scenario — real-world security situations pulled from actual incident patterns
2. Make your call — choose actions and explain your reasoning
3. Get expert feedback — learn why the best answer works and what to watch for

FEATURES:
• 34 interactive labs across 4 learning paths
• 4 scenario types: action-rationale, toggle-config, investigate-decide, triage-remediate
• XP system and streak tracking to build a daily habit
• Structured learning paths: SOC Analyst, Network Defense, Threat Response, Cloud Security
• Career insights showing how each skill maps to real security roles
• No account required — start immediately

BUILT FOR:
• Career changers moving into cybersecurity
• IT professionals adding security skills
• Students preparing for SOC analyst or security engineer roles
• Anyone studying for CompTIA Security+, CySA+, or similar certifications
• Security professionals who want to sharpen decision-making

ThreatForge is for educational purposes only. All scenarios are simulated and designed to build defensive cybersecurity judgment.
```

### Graphics you'll need

| Asset | Size | What to use |
|-------|------|-------------|
| App icon | 512 x 512 px (PNG, 32-bit, no alpha) | Flame icon on dark background matching your app |
| Feature graphic | 1024 x 500 px | "ThreatForge — Cybersecurity Decision Simulator" with brand styling |
| Phone screenshots | Min 2, up to 8. 16:9 or 9:16 ratio | Screenshots of: Home screen, a lab intro, active scenario, results screen |

I can help you generate the icon and feature graphic if you'd like.

---

## Step 4: Content Rating

Go to **Policy > App content > Content rating** and start the questionnaire.

- **Category:** Education (or Utility)
- **Violence:** No
- **Sexual content:** No
- **Language:** No profanity
- **Controlled substances:** No
- **IARC rating:** You'll likely get **Rated for 3+** or **PEGI 3**

---

## Step 5: App Privacy & Data Safety

Go to **Policy > App content > Data safety**:

- **Does your app collect or share user data?** Yes
- **Data collected:**
  - **App activity** (app interactions) — collected for app functionality, not shared
  - **Device or other IDs** (Firebase anonymous UID) — collected for app functionality, not shared
- **Is data encrypted in transit?** Yes (HTTPS)
- **Can users request data deletion?** Yes (Reset Progress in Settings)

---

## Step 6: Upload the AAB

1. Go to **Release > Testing > Internal testing** (start here, not production)
2. Click **Create new release**
3. Upload your `app-release.aab`
4. Set release name: `0.4.0`
5. Add release notes:
```
Initial release of ThreatForge — Cybersecurity Decision Simulator.

• 34 interactive security judgment labs
• 4 learning paths (SOC Analyst, Network Defense, Threat Response, Cloud Security)
• XP and streak tracking
• Free to use
```
6. Click **Review release** → **Start rollout**

---

## Step 7: Test & Promote to Production

1. Add yourself as an internal tester (Settings > Internal testing > Testers)
2. Install via the internal testing link and verify everything works
3. Once happy, go to **Release > Production** and promote the release

---

## Before You Go Live — Checklist

- [ ] AAB builds successfully
- [ ] App icon and feature graphic uploaded
- [ ] At least 2 phone screenshots uploaded
- [ ] Content rating questionnaire completed
- [ ] Data safety section filled out
- [ ] Store listing reviewed and saved
- [ ] Target audience and content set (not "primarily for children")
- [ ] Internal test installed and working on a real device
- [ ] versionCode is 1 and versionName is "1.0" in build.gradle (already set)

---

## Current App Config Reference

| Setting | Value |
|---------|-------|
| Package name | `com.threatforge.app` |
| versionCode | 1 |
| versionName | 1.0 |
| minSdkVersion | 24 (Android 7.0) |
| targetSdkVersion | 36 |
| compileSdkVersion | 36 |
