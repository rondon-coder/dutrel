# Dutrel — Security Baseline (Phase 0/1)

This is a practical baseline aimed at shipping safely as a solo builder.

## Data
- Encrypt in transit (TLS everywhere).
- Store only necessary PII.
- Receipts: store in blob storage; DB holds URL + metadata; support deletion/retention policy.

## Auth
- Strong password policy or magic link.
- Rate limit login + sensitive actions.
- Session strategy that supports web + mobile safely (short-lived access, refresh rotation).

## Audit
- Log all coordinator actions:
  - role changes, reopen/dispute, autopay_enabled_at edits, obligation amount edits, pauses, external-paid marks

## Operational
- Backups (Neon)
- Error monitoring (Sentry optional)
- Minimal admin tooling (read-only audit views)
