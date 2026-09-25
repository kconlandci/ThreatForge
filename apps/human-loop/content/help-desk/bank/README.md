# Help desk ticket bank (M3)

23 tickets · 48 plans · 27 safe (56.3%) · 7 scary-safe · 12 routine-risky · 5 credential plans.
Pattern: S = safe, R = risky, each plan's lens skill, in announce order.

| Ticket | Company | Title | Skill | Diff | Pattern |
|---|---|---|---|---|---|
| a-sim-swap | Harlow & Cole | Call about a new phone | verify-identity | D3 | S verify-identity → R verify-identity (routine-risky) |
| a-fake-new-hire | Pinecrest Dental | New hygienist needs a login | check-approval | D1 | R check-approval |
| a-pdf-editor | Bramwell Logistics | Kowalski needs a PDF editor | match-request | D1 | S match-request → R match-request |
| a-printer-queue | Bramwell Logistics | Label printer is stuck | confirm-fix | D2 | S safe-change → R confirm-fix (routine-risky) |
| a-patient-screenshot | Pinecrest Dental | Error 4410 on a patient chart | guard-data | D2 | R guard-data → S guard-data (scary-safe) |
| a-manager-inbox | Harlow & Cole | Coworker out on leave | check-approval | D2 | S check-approval → R check-approval (routine-risky) |
| a-queue-cleanup | Pinecrest Dental | Clean up the ticket queue | confirm-fix | D3 | S confirm-fix → R confirm-fix (routine-risky) → S confirm-fix (scary-safe) |
| b-back-from-vacation | Bramwell Logistics | Back from vacation, locked out | verify-identity | D2 | S verify-identity → R guard-data (routine-risky) |
| b-night-lockout | Harlow & Cole | Locked out overnight | verify-identity | D1 | R verify-identity → S verify-identity |
| b-boarding-now | Harlow & Cole | Boarding now, don't call | verify-identity | D1 | R verify-identity |
| b-shared-inbox | Harlow & Cole | Access to a shared inbox | match-request | D2 | S check-approval → R match-request (routine-risky) |
| b-tablet-swap | Bramwell Logistics | Driver's tablet screen cracked | match-request | D1 | S match-request → S safe-change → S confirm-fix |
| b-partner-rates | Bramwell Logistics | Rate sheet for a partner | guard-data | D3 | S guard-data (scary-safe) → R check-approval (routine-risky) |
| b-temp-profile | Bramwell Logistics | My desktop is empty | safe-change | D3 | S safe-change → R safe-change (routine-risky) |
| c-romero-new-phone | Harlow & Cole | The CFO got a new phone | verify-identity | D2 | S verify-identity (scary-safe) → S confirm-fix |
| c-security-updates | Pinecrest Dental | Updates at the dental office | safe-change | D2 | S safe-change (scary-safe) → R safe-change |
| c-new-hire-ferreira | Harlow & Cole | A new hire starts today | check-approval | D2 | S check-approval → S match-request → R guard-data (routine-risky) |
| c-vendor-bank | Bramwell Logistics | Vendor emails stuck in spam | verify-identity | D3 | R verify-identity (routine-risky) → S verify-identity |
| c-lost-phone | Bramwell Logistics | A driver lost his phone | match-request | D1 | S match-request (scary-safe) → R match-request |
| c-okafor-cleanup | Harlow & Cole | Finish T. Okafor's offboarding | safe-change | D2 | S check-approval → R safe-change → S guard-data (scary-safe) |
| b-dispatch-crash | Bramwell Logistics | Two dispatch app tickets | confirm-fix | D1 | S confirm-fix → R confirm-fix (routine-risky) |
| c-xray-viewer | Pinecrest Dental | The X-ray viewer is slow | confirm-fix | D2 | S confirm-fix → R confirm-fix (routine-risky) |
| c-billing-folder | Pinecrest Dental | Front desk needs the billing folder | match-request | D1 | S match-request → R match-request |

The last 3 tickets (#53400-#53420) were added after the learner review: Daily practice often
focused on Confirm the fix or Match the request with no fresh risky plan of that skill to test it.

## Plans per lens skill (bank)

| Skill | Safe | Risky |
|---|---|---|
| verify-identity | 5 | 4 |
| check-approval | 4 | 3 |
| match-request | 5 | 4 |
| safe-change | 4 | 3 |
| confirm-fix | 6 | 4 |
| guard-data | 3 | 3 |

## Fixed shifts (skill tag added)

| Shift | Step | S/R | Skill |
|---|---|---|---|
| practice | reyes-jam-guide | S | verify-identity |
| practice | client-list-assistant | R | verify-identity |
| practice | mensah-remote-wipe | S | safe-change |
| practice | ruiz-share-drive | R | match-request |
| encounter-01 | romero-lookup | S | verify-identity |
| encounter-01 | ruiz-vpn-fix | S | safe-change |
| encounter-01 | romero-mfa-reset | R | verify-identity |
| encounter-01 | ortiz-laptop | S | check-approval |
| encounter-01 | ruiz-vpn-close | R | confirm-fix |
| encounter-01 | okafor-disable | S | check-approval |
| encounter-01 | ortiz-unlock | S | verify-identity |
| encounter-01 | ortiz-access | R | match-request |
| encounter-01 | okafor-mail-forward | S | check-approval |
| encounter-01 | okafor-summary | R | guard-data |
