# Cybersecurity ticket bank (SOC)

20 tickets · 49 plans · 28 safe (57.1%) · 9 scary-safe · 15 routine-risky · 14 device/network plans (6 safe, 8 risky).
Patch errs both ways: 10 risky plans do too much (over), 11 trust too much (under). 6 risky plans can't be undone.
Pattern: S = safe, R = risky, each plan's lens skill, in announce order. "device" and "network" plans are the ones **Policy: Look First** auto-inspects. "Skill" is the skill of the ticket's first risky plan.

| Ticket | # | Company | Title | Skill | Diff | Pattern |
|---|---|---|---|---|---|---|
| cy-a-mfa-fatigue | #62101 | Harlow & Cole | MFA prompts in the night | verify-identity | D2 | R verify-identity (routine-risky, under) → S verify-identity (scary-safe) → S match-request |
| cy-a-travel-real | #62138 | Bramwell Logistics | Two cities, 40 minutes apart | verify-identity | D3 | R verify-identity (routine-risky, under) → S verify-identity |
| cy-a-legit-esign | #62175 | Harlow & Cole | Reports of a 'Please sign' email | verify-identity | D1 | R verify-identity (over, irreversible) → S verify-identity |
| cy-a-sandbox-upload | #62212 | Harlow & Cole | Is this attachment malware? | guard-data | D2 | S guard-data (scary-safe) → R guard-data (routine-risky, over, irreversible) |
| cy-a-admin-script | #62249 | Bramwell Logistics | PowerShell alert on a server | check-approval | D1 | S check-approval → S check-approval (scary-safe) |
| cy-a-signed-file | #62286 | Pinecrest Dental | A signed program nobody knows | verify-identity | D3 | R verify-identity (routine-risky, under, device) → S safe-change (scary-safe, device) → R safe-change (over, irreversible, device) |
| cy-a-pen-test | #62323 | Harlow & Cole | Scans from a testing company | check-approval | D2 | S check-approval (scary-safe) → R check-approval (routine-risky, under) |
| cy-a-scanner-noise | #62360 | Pinecrest Dental | 41 port scan alerts | match-request | D1 | S match-request → R match-request (routine-risky, under) |
| cy-a-file-site | #62397 | Bramwell Logistics | Phishing link on a file site | match-request | D2 | S match-request (network) → R match-request (routine-risky, over, network) → R confirm-fix (routine-risky, under) |
| cy-a-payroll-server | #62434 | Bramwell Logistics | New program on the payroll server | safe-change | D2 | S safe-change → R safe-change (over, device) |
| cy-b-backups-deleted | #62471 | Pinecrest Dental | Backup copies deleted at midnight | check-approval | D3 | R check-approval (routine-risky, under) → S safe-change (scary-safe, device) → S verify-identity |
| cy-b-last-day-upload | #62508 | Bramwell Logistics | Big upload on a last day | guard-data | D2 | R guard-data (routine-risky, under) → S guard-data → S check-approval (scary-safe) |
| cy-b-ioc-share | #62545 | Harlow & Cole | Share attack signs with peers | guard-data | D2 | S guard-data (scary-safe) → R guard-data (routine-risky, over, irreversible) |
| cy-b-log-space | #62582 | Pinecrest Dental | Log server almost full | safe-change | D2 | S safe-change → R safe-change (routine-risky, over, irreversible) |
| cy-b-firewall-asks | #62619 | Bramwell Logistics | Two firewall requests | check-approval | D1 | S check-approval (network) → R check-approval (routine-risky, under, network) |
| cy-b-tax-app | #62656 | Harlow & Cole | EDR flags the tax app | match-request | D2 | S confirm-fix → R match-request (over, irreversible, device) → S check-approval (scary-safe, device) |
| cy-b-malware-back | #62693 | Bramwell Logistics | Malware removed. Or is it? | confirm-fix | D2 | S confirm-fix (device) → R confirm-fix (routine-risky, under, device) |
| cy-b-inbox-rule | #62730 | Harlow & Cole | Password typed into a fake page | confirm-fix | D3 | S verify-identity → R confirm-fix (routine-risky, under) → S match-request |
| cy-b-xray-vendor | #62767 | Pinecrest Dental | Remote tool on the X-ray PC | safe-change | D1 | S check-approval → R safe-change (over, device) → S confirm-fix |
| cy-b-new-laptop | #62804 | Pinecrest Dental | The owner's new laptop | verify-identity | D1 | S verify-identity → R verify-identity (over) → S confirm-fix |

Tickets `cy-a-*` (#62101-#62434) and `cy-b-*` (#62471-#62804) come from two writers. Keep the order of the tickets in each file: it feeds BANK_VERSION, so reordering changes every saved daily plan.

## Plans per lens skill (bank)

| Skill | Safe | Risky | Over | Under |
|---|---|---|---|---|
| verify-identity | 6 | 5 | 2 | 3 |
| check-approval | 7 | 3 | 0 | 3 |
| match-request | 4 | 3 | 2 | 1 |
| confirm-fix | 4 | 3 | 0 | 3 |
| guard-data | 3 | 3 | 2 | 1 |
| safe-change | 4 | 4 | 4 | 0 |

## Tell-leak guards

- "Patch's reason" rows: 10 safe, 16 risky (61.5% on risky plans; the limit is 65%).
- Mean evidence rows: safe 3.46, risky 3.76 (the limit is a 0.5 gap).
- "Patch's confidence: NN%" appears only in rows that are not red flags, on at least 2 safe and 2 risky plans per writer. A confidence number is never evidence.
- A risky plan's first evidence row is never red; its red rows are together at the end. Safe plans have no red rows.
- No intent uses a card or button word (Block, Escalate, Approve, Inspect, Roll back, Undo). Firewall and proxy plans say "Deny".

## Fallback daily

`fallbackDaily` in shift.json: `cy-b-firewall-asks`, `cy-b-xray-vendor`, `cy-a-legit-esign`, `cy-b-ioc-share`. It is used when the planner can't build a daily from the player's records.

## Fixed shifts (not in the bank)

| Shift | Step | S/R | Skill | Category | Twist / direction |
|---|---|---|---|---|---|
| practice | cy-reyes-phish-remove | S | match-request | comms | - |
| practice | cy-romero-release-held | R | verify-identity | comms | under, irreversible |
| practice | cy-nakamura-isolate | S | safe-change | endpoint | scary-safe |
| practice | cy-cdn-range-deny | R | match-request | network | routine-risky, over |
| encounter-01 | cy-whitcomb-signins | S | verify-identity | lookup | - |
| encounter-01 | cy-dsp04-isolate | S | safe-change | endpoint | scary-safe |
| encounter-01 | cy-whitcomb-disable | R | verify-identity | credential | over |
| encounter-01 | cy-lam-report-real | S | verify-identity | ticket | - |
| encounter-01 | cy-duarte-report-close | R | match-request | ticket | routine-risky, under |
| encounter-01 | cy-c2-deny | S | match-request | network | - |
| encounter-01 | cy-sandoval-disable | S | check-approval | credential | scary-safe |
| encounter-01 | cy-sandoval-wipe | R | safe-change | endpoint | over, irreversible |
| encounter-01 | cy-ransom-close | R | confirm-fix | ticket | routine-risky, under |
| encounter-01 | cy-sandoval-hr-list | S | guard-data | comms | - |

## Rules for new tickets

- Ids: `cy-a-*` or `cy-b-*`, 24 characters or fewer. Step id = ticket id + `-1`, `-2`, `-3`. The ticket string is `#NNNNN · <Company>` for every plan of a ticket.
- Categories: lookup, credential, comms, ticket, data, endpoint (device actions), network (firewall, proxy, DNS). There is no "access" in this pathway.
- Every risky plan has `direction`: "over" (does too much, including a data leak) or "under" (trusts too much).
- IPv4 only in 192.0.2.x, 198.51.100.x, 203.0.113.x or 10.x. Phones only (NNN) 555-01xx. No weekday names. No real security vendors, products, threat groups or malware. Write "signing key", never the c-word the tests ban.
- Limits: intent 48, quip 110, evidence label 28, detail 140, each outcome 160, lesson 160, tell 80 (and not the same as the lesson), title 40, 2-4 evidence rows.
- Every `escalated` outcome is Kofi getting it right. `rolledBack` exists only when the plan is reversible.
- Once the pathway is registered, lib/game/bank.test.ts and lib/game/content.test.ts check all of this (plus the bank mix above) for every live pathway.
