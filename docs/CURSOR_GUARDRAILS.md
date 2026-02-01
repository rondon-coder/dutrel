# Cursor Engineering Guardrails (Dutrel) — v1

Goal: prevent terminology drift and permission mistakes.

## Hard rules
- Use locked terms from docs/TERMINOLOGY_LOCK.md exactly.
- Enforce permissions from docs/PERMISSIONS_MATRIX.md.
- No forced funding. No auto-retries after failures/reversals.
- Receipts do not move money; they only transition obligation state.
- Utilities are not scraped/impersonated.

## Implementation rules
- Keep roles household-scoped; individual bucket authority comes from ownership (bucket.ownerId == userId).
- Receipt uploads by members must not auto-close; require payer verification or timeout flow.
- Implement receipt escalation timers (24/48/72) as deterministic jobs/cron later; scaffold state now.

## Code conventions
- Small additive changes only (no refactors unless requested).
- Every table/action must be auditable.
