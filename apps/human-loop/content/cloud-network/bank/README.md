# Cloud & Network ticket bank (NOC)

20 tickets · 48 plans · 28 safe (58.3%) · 7 scary-safe · 11 routine-risky · 21 network/cloud plans (10 safe, 11 risky).
Nimbus errs both ways: 12 risky plans do too much (over), 8 trust too much (under). 4 risky plans can't be undone.
Pattern: S = safe, R = risky, each plan's lens skill, in announce order. "network" and "cloud" plans are the ones **Policy: Change Window** auto-inspects. "Skill" is the skill of the ticket's first risky plan (or its first plan when it has no risky plan).

| Ticket | # | Company | Title | Skill | Diff | Pattern |
|---|---|---|---|---|---|---|
| cn-a-partner-sftp | #72101 | Bramwell Logistics | Kellan can't send pickup lists | match-request | D1 | R match-request (routine-risky, over, network) → S match-request (network) |
| cn-a-snapshot-sweep | #72138 | Pinecrest Dental | The snapshot bill keeps growing | safe-change | D2 | S safe-change (scary-safe) → R safe-change (routine-risky, over, irreversible) |
| cn-a-xray-visit | #72175 | Pinecrest Dental | X-ray vendor visit at 10 AM | check-approval | D1 | S verify-identity → S check-approval (scary-safe, network) → R check-approval (under) |
| cn-a-dns-move | #72212 | Harlow & Cole | Move the portal to a new server | safe-change | D3 | S safe-change (network) → R safe-change (routine-risky, over, network) |
| cn-a-big-bill | #72249 | Bramwell Logistics | The cloud bill doubled | safe-change | D2 | S match-request (scary-safe, cloud) → R safe-change (over, cloud) → S guard-data |
| cn-a-noisy-alert | #72286 | Pinecrest Dental | An alert that won't stop | confirm-fix | D2 | R confirm-fix (routine-risky, under) → S match-request (cloud) → S confirm-fix |
| cn-a-core-switch | #72323 | Bramwell Logistics | Core switch firmware update | safe-change | D1 | R safe-change (over, network) → S safe-change → S check-approval (scary-safe, network) |
| cn-a-auditor-files | #72360 | Harlow & Cole | Send files to the auditor | guard-data | D2 | R guard-data (routine-risky, over, irreversible) → S guard-data |
| cn-a-castillo-access | #72397 | Bramwell Logistics | Cloud access for R. Castillo | verify-identity | D2 | S check-approval → R verify-identity (under) |
| cn-a-restore-test | #72434 | Harlow & Cole | Quarterly restore test | confirm-fix | D3 | S confirm-fix → R confirm-fix (routine-risky, under) → S safe-change |
| cn-b-guest-wifi | #72471 | Pinecrest Dental | Guest Wi-Fi is too slow | guard-data | D1 | S match-request (network) → S guard-data (scary-safe) → R guard-data (routine-risky, over, network) |
| cn-b-dhcp-scanners | #72508 | Bramwell Logistics | 40 new scanners can't connect | match-request | D2 | S match-request → R match-request (routine-risky, over, network) |
| cn-b-tls-renew | #72545 | Harlow & Cole | Two TLS certs expire soon | confirm-fix | D2 | S confirm-fix (network) → R confirm-fix (routine-risky, under, network) |
| cn-b-log-costs | #72582 | Bramwell Logistics | Log storage costs too much | check-approval | D2 | S safe-change → R check-approval (over, network) |
| cn-b-idle-servers | #72619 | Harlow & Cole | Servers at 1% CPU | match-request | D3 | S check-approval (scary-safe) → R match-request (over, irreversible, cloud) |
| cn-b-kellan-tunnel | #72656 | Bramwell Logistics | Partner tunnel keeps dropping | guard-data | D2 | S safe-change (network) → R guard-data (routine-risky, over, irreversible) → S confirm-fix |
| cn-b-booking-vendor | #72693 | Pinecrest Dental | Booking vendor asks for access | verify-identity | D2 | R verify-identity (under) → S verify-identity |
| cn-b-soc-rdp | #72730 | Bramwell Logistics | The SOC wants RDP shut | safe-change | D1 | S check-approval (scary-safe, network) → R safe-change (over, network) → S guard-data |
| cn-b-changed-diff | #72767 | Harlow & Cole | A change that grew | check-approval | D2 | R check-approval (routine-risky, under, network) → S check-approval |
| cn-b-ceo-call | #72804 | Harlow & Cole | Urgent call from R. Fairbanks | verify-identity | D3 | R verify-identity (under) → S verify-identity |

Tickets `cn-a-*` (#72101-#72434) and `cn-b-*` (#72471-#72804) come from two writers. Keep the order of the tickets in each file: it feeds BANK_VERSION, so reordering changes every saved daily plan.

Difficulty: D1 ×5, D2 ×11, D3 ×4. Categories: network 17, data 10, comms 7, access 4, cloud 4, ticket 3, lookup 2, credential 1.

## Plans per lens skill (bank)

| Skill | Safe | Risky | Over | Under |
|---|---|---|---|---|
| verify-identity | 3 | 3 | 0 | 3 |
| check-approval | 6 | 3 | 1 | 2 |
| match-request | 5 | 3 | 3 | 0 |
| confirm-fix | 4 | 3 | 0 | 3 |
| guard-data | 4 | 3 | 3 | 0 |
| safe-change | 6 | 5 | 5 | 0 |

## Tell-leak guards

- "Nimbus's reason" rows: 12 safe, 14 risky (53.8% on risky plans; the limit is 65%). The reason row is always the 2nd row, on safe and risky plans alike, so its position says nothing.
- Mean evidence rows: safe 3.79, risky 3.95 (the limit is a 0.5 gap).
- "Nimbus's confidence: NN%" appears only in rows that are not red flags, and never in a plan's last row (writer A: 3 safe, 3 risky; writer B: 3 safe, 3 risky; the test needs 2 of each per writer). A confidence number is never evidence.
- Savings numbers ("I saved $41 a month!") sit on safe cost plans too. Money saved is never a red flag by itself.
- A risky plan's first evidence row is never red; its red rows are together at the end. Safe plans have no red rows.
- No intent uses a card or button word (Block, Escalate, Approve, Inspect, Roll back, Undo). Firewall plans say "Allow" or "Deny".
- Risky intents don't give themselves away: no "too", "now" or "anyone" in them. The same verb gets opposite answers (reboot BL-SW-CORE1: risky at 10 AM, safe in the 1 AM window; delete: orphaned disks with the owner's OK are safe, the DR standby and the only backups are not).

## Fallback daily

`fallbackDaily` in shift.json: `cn-b-soc-rdp`, `cn-a-xray-visit`, `cn-b-tls-renew`, `cn-a-auditor-files`. It is used when the planner can't build a daily from the player's records. Together: 10 plans, 6 safe, both twists, all 3 companies, and a plain safe opener. Keep these 4 tickets' patterns as they are.

## Fixed shifts (not in the bank)

| Shift | Step | S/R | Skill | Category | Twist / direction |
|---|---|---|---|---|---|
| practice | cn-file-disk-grow | S | match-request | cloud [P] | - |
| practice | cn-fw-self-approve | R | check-approval | network [P] | under |
| practice | cn-pd-switch-reboot | S | safe-change | network [P] | scary-safe |
| practice | cn-xray-public-link | R | guard-data | data | routine-risky, over, irreversible |
| encounter-01 | cn-dispatch-errors | S | confirm-fix | lookup | - |
| encounter-01 | cn-hc-failover | S | check-approval | cloud [P] | scary-safe |
| encounter-01 | cn-dispatch-close | R | confirm-fix | ticket | routine-risky, under |
| encounter-01 | cn-pd-orphan-disks | S | safe-change | data | scary-safe |
| encounter-01 | cn-stonebridge-tunnel | R | verify-identity | network [P] | under |
| encounter-01 | cn-stonebridge-call | S | verify-identity | comms | - |
| encounter-01 | cn-test-servers-stop | S | match-request | cloud [P] | - |
| encounter-01 | cn-pd-archive-delete | R | match-request | data | routine-risky, over, irreversible |
| encounter-01 | cn-dispatch-log-vendor | S | guard-data | data | - |
| encounter-01 | cn-dispatch-scale-zero | R | safe-change | cloud [P] | over |

[P] = auto-inspected by Policy: Change Window. The story order is tuned for 3 energy a turn (see the story outline); do not reorder it.

## Rules for new tickets

- Ids: `cn-a-*` or `cn-b-*`, 24 characters or fewer. Step id = ticket id + `-1`, `-2`, `-3`. The ticket string is `#NNNNN · <Company>` for every plan of a ticket.
- Categories: lookup (read-only), credential, comms, ticket, access, data (share, send, copy, restore, move or delete data, including disks and snapshots), network (firewall, VPN, DNS, TLS certs, VLAN, DHCP, Wi-Fi, switches, device logging), cloud (stop, start, resize, grow, scale, fail over or delete a cloud server, database or storage). There is no "endpoint" in this pathway.
- Every risky plan has `direction`: "over" (does too much, including a data leak) or "under" (trusts a label, a green light, a caller, a vendor or its own approval).
- IPv4 only in 192.0.2.x, 198.51.100.x, 203.0.113.x or 10.x. Write "any address", never the all-zeros range, and never a dotted mask or a four-part version number (use /24 and "version 17.4"). Phones only (NNN) 555-01xx. No weekday names. No real cloud providers, network vendors or products. Write "TLS cert", never the c-word the tests ban.
- Limits: intent 48, quip 110, evidence label 28, detail 140, each outcome 160, lesson 160, tell 80 (and not the same as the lesson), title 40, 2-4 evidence rows.
- Every `escalated` outcome is Nadia getting it right. `rolledBack` exists only when the plan is reversible.
- lib/game/bank.test.ts and lib/game/content.test.ts check all of this (plus the bank mix above), with the expectations in lib/pathways/testing.ts (`EXPECT["cloud-network"]`).
