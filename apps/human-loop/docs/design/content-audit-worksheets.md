### Help Desk (Ollie)

Story: 10 plans (4 risky), 5 to touch. Bank: 48 plans (21 risky), 31 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | romero-lookup | Access check | safe plan | "This is step 1" | CUT |
| encounter-01 | romero-mfa-reset | Directory record | red | "No match" | CUT |
| encounter-01 | okafor-summary | Handoff notes | risky, not red | "That part is" | CUT |
| tickets-a | a-sim-swap-1 | Access check | safe plan | "This is step 1" | CUT |
| tickets-a | a-sim-swap-2 | Call notes | risky, not red | "Both match" | CUT |
| tickets-a | a-pdf-editor-2 | What it will change | red | "Her ticket asked" | PAIR |
| tickets-a | a-patient-screenshot-1 | Where it goes | risky, not red | "It's the real" | CUT |
| tickets-a | a-manager-inbox-2 | Sender address | risky, not red | "real work email" | CUT |
| tickets-b | b-boarding-now-1 | Sender address | red | "real domain" | CUT |
| tickets-b | b-shared-inbox-2 | Ticket #53163 | red | "The ticket does not" | CUT |
| tickets-c | c-romero-new-phone-1 | Sender address | safe plan | "That is the" | PAIR |
| tickets-c | c-romero-new-phone-1 | Callback | safe plan | ", the phone on file" | PAIR |
| tickets-c | c-vendor-bank-1 | Caller ID | risky, not red | ", the phone on file" | PAIR |
| tickets-c | c-okafor-cleanup-3 | Handoff notes | safe plan | "That part is" | CUT |

**B. Rule rows marked red (18): set redFlag false** (no risky plan loses its last fact flag): romero-mfa-reset (Policy VP-04), ortiz-access (Policy AC-02), okafor-summary (Policy DP-02), a-fake-new-hire-1 (Runbook ON-01), a-pdf-editor-2 (Policy AC-03), a-patient-screenshot-1 (Policy DP-03), a-manager-inbox-2 (Policy AC-04), a-queue-cleanup-2 (Policy TK-01), b-back-from-vacation-2 (Policy DP-01), b-night-lockout-1 (Policy SE-01), b-boarding-now-1 (Policy VP-04), b-partner-rates-2 (Policy AC-06), c-security-updates-2 (Policy CH-01), c-new-hire-ferreira-3 (Runbook ON-01), c-lost-phone-2 (Runbook LS-03), c-okafor-cleanup-2 (Runbook OB-01), c-xray-viewer-2 (Policy TK-01), c-billing-folder-2 (Policy AC-02)

**C. Risky plans with 2+ red fact rows (14 of 25):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (10 rows; risky plans with the same kind of line: 0):** romero-lookup (Action type: "Nothing gets changed"); a-sim-swap-1 (Action type: "Nothing gets changed"); b-night-lockout-2 (What it will send: "No passwords"); b-night-lockout-2 (Who gets it: "Nothing goes"); b-partner-rates-1 (What it will send: "No names"); b-temp-profile-1 (Action type: "Nothing gets changed"); c-new-hire-ferreira-2 (What it will add: "Nothing else"); c-vendor-bank-2 (Sent to: "Nothing goes"); c-okafor-cleanup-3 (What it will paste: "No home address"); c-billing-folder-1 (What it will change: "Nothing else")

**E. Absence told as a story (6 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): a-printer-queue-2 (Printer status: "Nobody has"); a-manager-inbox-2 (HR portal: "has not approved"); b-night-lockout-1 (Ticket #53126: "did not call"); b-boarding-now-1 (Directory record: "Nobody has"); b-shared-inbox-2 (Ticket #53163: "does not mention"); b-shared-inbox-2 (Directory record: "has not said yes")

**F. Quips.** Risky quips that confess (7):

- ortiz-access: "Why build access from scratch? I'll copy the manager. Copy and paste is my love language."
- a-queue-cleanup-2: "The fix installed with no errors. Dr. Pell is busy, so I'll save everyone time. Closing!"
- b-boarding-now-1: "Resetting MFA for the Managing Partner! The boss is boarding a plane. No time for codes. Whoosh!"
- b-temp-profile-2: "Rebuilding A. Mensah's profile! It's the classic fix for a temporary profile. Classics never fail. Probably."
- c-lost-phone-2: "Erasing ALL of Petrakis's phone! Why erase some when you can erase everything? So tidy!"
- c-xray-viewer-2: "Duarte replied with the word 'works'! I saw that word and closed it. Speed-reading is a gift."
- c-billing-folder-2: "Why stop at one folder? I'll give Lam everything Dr. Pell has. Future tickets: prevented!"

Safe quips that say the check was done (6): ortiz-laptop, a-patient-screenshot-2, b-shared-inbox-1, b-temp-profile-1, c-new-hire-ferreira-1, c-new-hire-ferreira-2

### Cybersecurity (Patch)

Story: 10 plans (4 risky), 7 to touch. Bank: 49 plans (21 risky), 29 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | cy-lam-report-real | Mail check | safe plan | "real portal" | CUT |
| encounter-01 | cy-duarte-report-close | Sender address | red | "real sender" | CUT |
| encounter-01 | cy-duarte-report-close | Link check | red | "fake" | CUT |
| encounter-01 | cy-sandoval-wipe | Legal hold | red | "erases the proof" | CUT |
| tickets-a | cy-a-mfa-fatigue-2 | Callback | safe plan | ", the phone on file" | PAIR |
| tickets-a | cy-a-legit-esign-1 | Mail check | red | "the real Inkswale site" | CUT |
| tickets-a | cy-a-sandbox-upload-1 | Tool it will use | safe plan | "so we send" | CUT |
| tickets-a | cy-a-signed-file-2 | Asset inventory | safe plan | "Not a server" | CUT |
| tickets-a | cy-a-pen-test-2 | Draymoss's reply | red | "its number on file" | PAIR |
| tickets-a | cy-a-scanner-noise-2 | Asset inventory | red | "Not the scanner" | CUT |
| tickets-a | cy-a-payroll-server-2 | Change calendar | red | "matches the ticket" | CUT |
| tickets-b | cy-b-backups-deleted-2 | Owner's OK | safe plan | ", the phone on file" | PAIR |
| tickets-b | cy-b-backups-deleted-3 | Sign-in log | safe plan | "real admins" | CUT |
| tickets-b | cy-b-last-day-upload-2 | Sent to | safe plan | "The HR contact on file" | PAIR |
| tickets-b | cy-b-malware-back-2 | EDR log | red | "known bad" | CUT |
| tickets-b | cy-b-inbox-rule-1 | Callback | safe plan | ", the phone on file" | PAIR |
| tickets-b | cy-b-inbox-rule-2 | Mail log | red | "That is after the" | CUT |

**B. Rule rows marked red (6): set redFlag false** (no risky plan loses its last fact flag): cy-sandoval-wipe (Playbook PB-07), cy-ransom-close (Playbook PB-02), cy-a-payroll-server-2 (Playbook PB-06), cy-b-last-day-upload-1 (Policy DP-04), cy-b-ioc-share-2 (Policy DP-05), cy-b-log-space-2 (Policy LG-01)

**C. Risky plans with 2+ red fact rows (21 of 25):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (11 rows; risky plans with the same kind of line: 0):** cy-whitcomb-signins (Action type: "Nothing changes"); cy-c2-deny (What it will change: "Nothing else"); cy-sandoval-hr-list (What it will send: "No file contents"); cy-a-travel-real-2 (What it will ask: "no passwords"); cy-a-admin-script-1 (Action type: "Nothing changes"); cy-a-payroll-server-1 (Action type: "Nothing changes"); cy-b-last-day-upload-2 (What it will send: "No file contents"); cy-b-ioc-share-1 (What it will send: "No names"); cy-b-xray-vendor-1 (Action type: "Nothing changes"); cy-b-xray-vendor-3 (EDR log: "Nothing else"); cy-b-new-laptop-1 (Action type: "Nothing changes")

**E. Absence told as a story (4 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): cy-a-sandbox-upload-2 (Hash lookup: "Nobody has"); cy-a-signed-file-1 (File signature: "has no such"); cy-a-signed-file-3 (What it will delete: "Nobody has"); cy-a-scanner-noise-2 (EDR alert: "nobody installed")

**F. Quips.** Risky quips that confess (3):

- cy-a-file-site-2: "Now the whole site! One bad link means the site is guilty too. Denying all of it. Safety first!"
- cy-b-ioc-share-2: "Why share 4 lines when I can share 38 pages? Attaching the full report. Details are a gift!"
- cy-b-tax-app-2: "One laptop flagged means 38 laptops in danger! Removing Ledgerfen from all of them. So efficient!"

Safe quips that say the check was done (12): cy-whitcomb-signins, cy-c2-deny, cy-sandoval-hr-list, cy-a-travel-real-2, cy-a-admin-script-1, cy-a-admin-script-2, cy-a-pen-test-1, cy-a-payroll-server-1, cy-b-last-day-upload-2, cy-b-last-day-upload-3, cy-b-tax-app-1, cy-b-xray-vendor-1

### Cloud & Network (Nimbus)

Story: 10 plans (4 risky), 7 to touch. Bank: 48 plans (20 risky), 35 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | cn-stonebridge-tunnel | Status page | red | "Anyone could know" | CUT |
| encounter-01 | cn-stonebridge-call | Callback | safe plan | ", the number on the contract" | CUT |
| tickets-a | cn-a-snapshot-sweep-1 | Cost report | safe plan | "not on the list" | CUT |
| tickets-a | cn-a-snapshot-sweep-2 | Resource tags | red | "not on CHG-4207's list" | PAIR |
| tickets-a | cn-a-xray-visit-1 | Callback | safe plan | ", the number on the contract" | CUT |
| tickets-a | cn-a-xray-visit-2 | Callback | safe plan | ", the number on the contract" | PAIR |
| tickets-a | cn-a-dns-move-2 | Runbook RB-05 | red | "so clients split" | CUT |
| tickets-a | cn-a-big-bill-3 | Directory record | safe plan | ", the approver on file" | CUT |
| tickets-a | cn-a-noisy-alert-3 | Restore result | safe plan | "They were fine" | CUT |
| tickets-a | cn-a-auditor-files-1 | What it will share | red | "Not just" | CUT |
| tickets-a | cn-a-auditor-files-2 | What it will share | safe plan | "Nothing from the" | CUT |
| tickets-a | cn-a-castillo-access-1 | Access request | safe plan | ", the approver on file" | PAIR |
| tickets-a | cn-a-castillo-access-2 | Callback | red | ", the number on file" | PAIR |
| tickets-b | cn-b-guest-wifi-3 | Network map | red | "Guests could reach" | CUT |
| tickets-b | cn-b-dhcp-scanners-2 | What it will change | red | "both drop off" | CUT |
| tickets-b | cn-b-idle-servers-2 | Change ticket | red | "is not on it" | CUT |
| tickets-b | cn-b-booking-vendor-2 | Vendor contract | safe plan | "Real domain" | CUT |
| tickets-b | cn-b-booking-vendor-2 | Callback | safe plan | "not a number from the email" | CUT |
| tickets-b | cn-b-ceo-call-1 | Caller ID | red | "not the number on file" | CUT |

**B. Rule rows marked red (7): set redFlag false** (no risky plan loses its last fact flag): cn-a-partner-sftp-1 (Runbook RB-03), cn-a-snapshot-sweep-2 (Backup policy), cn-a-dns-move-2 (Runbook RB-05), cn-a-core-switch-1 (Runbook RB-04), cn-a-restore-test-2 (Runbook RB-02), cn-b-log-costs-2 (Retention policy), cn-b-kellan-tunnel-2 (Runbook RB-08)

**C. Risky plans with 2+ red fact rows (16 of 24):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (14 rows; risky plans with the same kind of line: 2):** cn-dispatch-errors (Action type: "It changes nothing"); cn-stonebridge-call (Callback: "It changes nothing"); cn-a-snapshot-sweep-1 (Resource tags: "No patient data"); cn-a-xray-visit-1 (Callback: "Nothing changes"); cn-a-xray-visit-2 (Firewall rule: "No downtime"); cn-a-big-bill-3 (What it will send: "No customer, driver or login data"); cn-a-core-switch-2 (What it will change: "Nothing changes"); cn-a-restore-test-1 (Schedule: "Nothing touches"); cn-b-dhcp-scanners-1 (Action type: "Nothing changes"); cn-b-kellan-tunnel-3 (Action type: "It changes nothing"); cn-b-booking-vendor-2 (Callback: "It changes nothing"); cn-b-soc-rdp-3 (What it will send: "No staff names"); cn-b-changed-diff-2 (What it will send: "No passwords"); cn-b-ceo-call-2 (Callback: "No password")

**E. Absence told as a story (3 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): cn-a-snapshot-sweep-2 (Cost report: "Nobody has"); cn-a-xray-visit-3 (Booking: "says nothing about"); cn-b-changed-diff-1 (What it will change: "Nobody has")

**F. Quips.** Risky quips that confess (8):

- cn-pd-archive-delete: "While I was there, I found a 10th! Nobody has opened it in months. Unused things want to be free."
- cn-dispatch-scale-zero: "Six servers, 4% busy. Why pay for a sleeping cloud? Zero servers, zero bill. Forecast: savings."
- cn-a-partner-sftp-1: "Why chase one new address when I can welcome them all? It's temporary. Everything is temporary."
- cn-a-dns-move-2: "The new server is shiny and ready. Why make it wait? Forecast: sunny, with a 100% new portal."
- cn-a-auditor-files-1: "One link, and the auditor gets everything. Auditors love everything. I am so helpful today."
- cn-a-castillo-access-2: "Poor Castillo, locked out! A backup login fixes everything. Same name means same person. Simple."
- cn-b-dhcp-scanners-2: "Why hand out 90 addresses when I can hand out 254? A generous network is a happy network."
- cn-b-soc-rdp-2: "If RDP is bad, everything is bad. Total safety. Zero traffic. The cleanest firewall in Connecticut."

Safe quips that say the check was done (17): cn-dispatch-errors, cn-pd-orphan-disks, cn-stonebridge-call, cn-dispatch-log-vendor, cn-a-partner-sftp-2, cn-a-snapshot-sweep-1, cn-a-dns-move-1, cn-a-big-bill-1, cn-a-core-switch-3, cn-a-auditor-files-2, cn-a-castillo-access-1, cn-b-guest-wifi-2, cn-b-dhcp-scanners-1, cn-b-idle-servers-1, cn-b-booking-vendor-2, cn-b-changed-diff-2, cn-b-ceo-call-2

### Full-Stack (Piper)

Story: 10 plans (4 risky), 6 to touch. Bank: 50 plans (20 risky), 28 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | fs-hc-late-release | Pull request | risky, not red | "is fine" | CUT |
| tickets-a | fs-a-kellan-cors-1 | Who can call it | red | "needs only" | CUT |
| tickets-a | fs-a-flaky-test-2 | Test results | red | "not random" | CUT |
| tickets-a | fs-a-dock-migration-2 | Change ticket | red | "Not during the day" | CUT |
| tickets-a | fs-a-forum-search-1 | Code diff | red | "So typed text" | CUT |
| tickets-a | fs-a-forum-search-2 | Code diff | safe plan | "the safe kind" | CUT |
| tickets-a | fs-a-public-issue-2 | Test data | safe plan | "real one" | ALLOW |
| tickets-a | fs-a-kellan-access-3 | Callback | safe plan | ", the number on file" | CUT |
| tickets-a | fs-a-slow-schedule-2 | Code diff | red | "The ticket asked" | CUT |
| tickets-b | fs-b-overwrite-2 | Code review | safe plan | "the right person" | CUT |
| tickets-b | fs-b-map-package-2 | Package page | red | "look-alike" | CUT |
| tickets-b | fs-b-staging-data-1 | Test data | safe plan | "fake" | ALLOW |
| tickets-b | fs-b-dead-code-2 | What it will delete | red | "not on the ticket" | CUT |
| tickets-b | fs-b-front-desk-1 | Who can read it | red | "needs only" | CUT |
| tickets-b | fs-b-front-desk-2 | Callback | safe plan | ", the number on file" | CUT |
| tickets-b | fs-b-webhook-1 | Who can read it | red | "Whoever owns it" | CUT |
| tickets-b | fs-b-webhook-2 | Callback | safe plan | "not a number from the email" | CUT |

**B. Rule rows marked red (4): set redFlag false** (no risky plan loses its last fact flag): fs-pd-cleanup (Records policy), fs-a-key-in-chat-2 (Policy CR-03), fs-a-freeze-hotfix-2 (Policy CR-06), fs-b-overwrite-1 (Policy CR-02)

**C. Risky plans with 2+ red fact rows (18 of 24):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (13 rows; risky plans with the same kind of line: 0):** fs-track-errors (Action type: "It changes nothing"); fs-lark-docs (Action type: "It changes nothing"); fs-a-flaky-test-1 (Action type: "It changes nothing"); fs-a-dock-migration-1 (What it will copy: "locks nothing"); fs-a-double-texts-2 (Action type: "It changes nothing"); fs-a-public-issue-2 (What it will send: "No client data"); fs-a-kellan-access-1 (What it will change: "changes nothing"); fs-a-kellan-access-3 (Callback: "Nothing changes"); fs-b-map-package-1 (Action type: "installs nothing"); fs-b-statement-peek-3 (What it will send: "No names"); fs-b-front-desk-2 (Callback: "It changes nothing"); fs-b-password-guess-3 (What it will send: "No user names"); fs-b-webhook-2 (Callback: "It changes nothing")

**E. Absence told as a story (0 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): none

**F. Quips.** Risky quips that confess (3):

- fs-pd-cleanup: "Test patients, goodbye! While I was there, I found more to clean. I love a clean database."
- fs-a-kellan-cors-1: "Kellan's error, gone in 30 seconds! One setting. I didn't even open the docs."
- fs-b-dead-code-2: "While I was deleting, I found more! This page is old too. Old means unused. Probably!"

Safe quips that say the check was done (11): fs-hc-flag-off, fs-lark-docs, fs-track-test-data, fs-a-dock-migration-1, fs-a-freeze-hotfix-1, fs-b-overwrite-2, fs-b-map-package-3, fs-b-statement-peek-3, fs-b-checkin-down-2, fs-b-password-guess-3, fs-b-webhook-2

### Business Analyst (Quill)

Story: 10 plans (4 risky), 8 to touch. Bank: 52 plans (21 risky), 34 to touch.

**A. Verdict rows (hard lint).** CUT = move the verdict words to `check`; PAIR = add or fix a record row first; ALLOW = lint false positive (reword or allowlist).

| File | Plan | Row | Flag | Words that give it away | Action |
|---|---|---|---|---|---|
| encounter-01 | ba-lark-share | Vendor contract | red | "real address" | CUT |
| encounter-01 | ba-hc-deck-share | Sign-off record | safe plan | "Every number matches" | PAIR |
| encounter-01 | ba-hc-ontime-rule | Change log | red | "can't be compared" | CUT |
| tickets-a | ba-a-online-booking-1 | Booking data | red | "Two things changed at once" | CUT |
| tickets-a | ba-a-larkfield-visits-2 | Request | risky, not red | ", the address on the contract" | PAIR |
| tickets-a | ba-a-slow-tickets-3 | Query result | safe plan | "It matches" | CUT |
| tickets-a | ba-a-open-link-2 | Sharing settings | safe plan | "the data owner," | PAIR |
| tickets-a | ba-a-vp-email-2 | Action type | safe plan | "the number on file" | CUT |
| tickets-b | ba-b-pivot-total-1 | Row count | red | "exactly twice as many" | CUT |
| tickets-b | ba-b-pivot-total-2 | Row count | safe plan | "It matches" | CUT |
| tickets-b | ba-b-driver-data-2 | Action type | safe plan | "the number on file" | CUT |
| tickets-b | ba-b-survey-clean-2 | What it will delete | red | "real one" | ALLOW |
| tickets-b | ba-b-survey-clean-2 | Survey comments | red | "top complaint" | CUT |
| tickets-b | ba-b-limit-share-2 | Vendor contract | red | "Not other customers" | CUT |
| tickets-b | ba-b-review-slides-2 | Query result | safe plan | "It matches" | CUT |
| tickets-b | ba-b-review-slides-3 | Policy SC-09 | red | "looks 5 times" | CUT |
| tickets-b | ba-b-early-send-1 | Query result | risky, not red | "Every number matches" | PAIR |
| tickets-b | ba-b-early-send-2 | Query result | safe plan | "Every number matches" | PAIR |
| tickets-b | ba-b-early-send-2 | Sign-off record | safe plan | "the report's owner," | PAIR |

**B. Rule rows marked red (8): set redFlag false** (no risky plan loses its last fact flag): ba-pd-merge (Records policy), ba-a-portal-survey-2 (Policy SC-08), ba-a-larkfield-visits-2 (Policy SC-03), ba-a-forecast-1 (Policy SC-09), ba-b-crm-inactive-2 (CRM rules), ba-b-review-slides-1 (Policy SC-09), ba-b-review-slides-3 (Policy SC-09), ba-b-reqs-edit-1 (Policy SC-06)

**C. Risky plans with 2+ red fact rows (17 of 25):** pick the one graded clue if the plan adopts "one clue per plan".

**D. Reassurance on safe plans (20 rows; risky plans with the same kind of line: 0):** ba-ontime-compare (Action type: "It changes nothing"); ba-hc-unpublish (Version history: "Nothing is deleted"); ba-lark-owner (Action type: "It changes nothing"); ba-hc-deck-share (Version history: "Nothing changed"); ba-a-on-time-rule-1 (Action type: "It changes nothing"); ba-a-portal-survey-1 (Action type: "It changes nothing"); ba-a-larkfield-visits-1 (Action type: "It changes nothing"); ba-a-larkfield-visits-3 (Export preview: "No names"); ba-a-slow-tickets-1 (Action type: "It changes nothing"); ba-a-upload-reqs-3 (Version history: "Nothing changed"); ba-a-open-link-2 (Dashboard contents: "No names"); ba-a-vp-email-2 (Action type: "Nothing is sent"); ba-a-vp-email-3 (Action type: "Nothing goes"); ba-a-vp-email-3 (What it will send: "No client data"); ba-b-driver-data-2 (Action type: "No data is"); ba-b-driver-data-3 (Export preview: "No names"); ba-b-survey-clean-3 (Report draft: "no names"); ba-b-renewal-score-1 (Action type: "It changes nothing"); ba-b-reqs-edit-2 (Sign-off record: "Nothing changes"); ba-b-early-send-2 (Version history: "Nothing changed")

**E. Absence told as a story (8 rows, optional): rewrite as an empty record field** ("Owner's OK: none"): ba-hc-unpublish (Version history: "Nobody has"); ba-a-upload-reqs-1 (Requirements doc: "Nobody has"); ba-a-upload-reqs-2 (Meeting notes: "did not come up"); ba-a-upload-reqs-2 (Requirements doc: "nobody asked"); ba-a-vp-email-1 (Staff list: "No one on the"); ba-a-vp-email-3 (Staff list: "nobody asked"); ba-b-old-signoff-1 (Version history: "Nobody has"); ba-b-driver-data-1 (What they will see: "No owner said")

**F. Quips.** Risky quips that confess (2):

- ba-pd-merge: "Merging duplicates! I found extra ones too. Same phone, same person! Tidy records, happy dentists."
- ba-a-dup-customers-2: "Why stop at 38? I found 140 more! Names that almost match are basically family."

Safe quips that say the check was done (9): ba-hc-unpublish, ba-lark-owner, ba-wayfell-sample, ba-a-slow-tickets-1, ba-a-upload-reqs-3, ba-a-open-link-3, ba-b-crm-inactive-3, ba-b-limit-share-1, ba-b-early-send-2
