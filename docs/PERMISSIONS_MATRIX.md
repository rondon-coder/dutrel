# Dutrel — Authority & Permissions Matrix (Phase 2B) — FINAL

Roles:
- Member
- Payer
- Secondary Payer (same permissions as Payer)

Key rule:
- Roles are household authority.
- Individual bucket ownership grants implicit coordinator authority for that bucket only (no separate role name).

## Household-level actions

| Action | Member | Payer | Secondary |
|---|---:|---:|---:|
| View household dashboard | ✅ | ✅ | ✅ |
| View succession order | ✅ | ✅ | ✅ |
| Reorder succession (one-time) | ❌ | ✅ | ✅ |
| Promote/swap Secondary Payer | ❌ | ✅ | ✅ |
| Initiate member removal | ❌ | ✅ | ✅ |
| Confirm member removal (vote) | ✅ | ✅ | ✅ |
| Lock household settings | ❌ | ✅ | ✅ |

Notes:
- Only Coordinators can initiate removal.
- Voting/majority confirmation is household-visible.

## Bucket-level actions (Group + Individual safeguards)

| Action | Member | Payer | Secondary |
|---|---:|---:|---:|
| Create bucket | ✅ (Individual only) / ❌ (Group) | ✅ | ✅ |
| Edit bucket name | ✅ (Individual only) / ❌ (Group) | ✅ | ✅ |
| Set cadence (monthly/quarterly) | ❌ | ✅ | ✅ |
| Set variability (FIXED/VARIABLE) | ❌ | ✅ | ✅ |
| Set/update buffer target | ❌ | ✅ | ✅ |
| Pause bucket notifications | ❌ | ✅ | ✅ |
| Acknowledge known funding gap | ❌ | ✅ | ✅ |
| Set autopay_enabled_at | ❌ | ✅ | ✅ |
| Override funding mode for a cycle (scaffold) | ❌ | ✅ | ✅ |
| Archive bucket | ❌ | ✅ | ✅ |

Notes:
- Members can create/edit Individual buckets for themselves.
- Only Coordinators manage Group buckets.

## Obligation-level actions

| Action | Member | Payer | Secondary |
|---|---:|---:|---:|
| View obligations | ✅ | ✅ | ✅ |
| Create obligation (open bill cycle) | ❌ | ✅ | ✅ |
| Edit obligation amount (pre T-3) | ❌ | ✅ | ✅ |
| Mark “Externally Paid” (post warm-up) | ❌ | ✅ | ✅ |
| Close obligation via receipt verification | ❌ | ✅ | ✅ |
| Reopen obligation | ❌ | ✅ | ✅ |
| Dispute receipt/obligation | ❌ | ✅ | ✅ |

## Funding Events (money-in actions)

| Action | Member | Payer | Secondary |
|---|---:|---:|---:|
| Manually add funds | ✅ | ✅ | ✅ |
| Attempt scheduled debit (Phase 2+) | ✅ (own only) | ✅ (own only) | ✅ (own only) |
| Cancel own scheduled debit | ✅ | ✅ | ✅ |
| Force debit from another member | ❌ | ❌ | ❌ |

## Receipts

| Action | Member | Payer | Secondary |
|---|---:|---:|---:|
| Upload receipt | ✅ | ✅ | ✅ |
| Auto-close immediately | ❌ | ✅ | ✅ |
| Verify receipt | ❌ | ✅ | ✅ |
| Dispute receipt | ❌ | ✅ | ✅ |
| Reopen after close | ❌ | ✅ | ✅ |

### Receipt escalation + auto-close
- +24h: gentle reminder
- +48h: “will auto-close” warning
- +72h: Auto-Closed (Timeout)
- Reopen requires Coordinator + reason + audit log

### Utility reversals / failures
- Enter Recovery Mode
- Pause bucket
- No automatic retries (mirrors utilities)
- Manual resolution required
- Buffer use during reversals requires Coordinator approval
