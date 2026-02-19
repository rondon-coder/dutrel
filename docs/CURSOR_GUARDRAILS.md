# Cursor Engineering Guardrails (Dutrel) — v2

Goal: prevent terminology drift, permission mistakes, and custody creep.

------------------------------------------------------------
CORE PRODUCT IDENTITY
------------------------------------------------------------

Dutrel is a shared obligation coordination and verification system.
It is NOT a bank, wallet, utility replacement, or money custodian.

Phase 1–3 are strictly NON-CUSTODIAL.

------------------------------------------------------------
NON-CUSTODIAL GUARANTEE (Phase 1–3)
------------------------------------------------------------

- Dutrel does NOT hold user funds.
- Dutrel does NOT initiate transfers.
- Dutrel does NOT retry failed debits.
- Dutrel does NOT guarantee payments.
- All payments occur externally unless Partner Phase is activated.
- Receipts never move money.
- Utilities are never scraped or impersonated.

------------------------------------------------------------
HARD RULES
------------------------------------------------------------

- Use locked terms from docs/TERMINOLOGY_LOCK.md exactly.
- Enforce permissions from docs/PERMISSIONS_MATRIX.md.
- No forced funding.
- No auto-retries after failures/reversals.
- Recovery Mode mirrors real utility behavior.
- Every coordinator action must be auditable.

------------------------------------------------------------
PLAID (READ-ONLY) RULES
------------------------------------------------------------

- Plaid is observation-only in Phase 2.
- Use Auth + Balance + Transactions (read-only).
- Do NOT store raw account/routing numbers.
- Store access tokens securely (encrypted).
- Allow user disconnect at any time.
- No spending analytics beyond bill detection.
- No budgeting advice generation.

------------------------------------------------------------
IMPLEMENTATION RULES
------------------------------------------------------------

- Household roles control Group buckets.
- Individual bucket authority derives from ownership.
- Receipt uploads by members must not auto-close.
- Escalation timers (24/48/72) must be deterministic.
- No refactors unless explicitly requested.
- All state transitions must be logged in ActionLog.

------------------------------------------------------------
PROHIBITED CONCEPTS
------------------------------------------------------------

These do NOT exist in Dutrel:

- Forced debit
- Auto-retry debit
- Guaranteed payment
- Utility verification scraping
- System judgment
- Lifestyle spending analysis
