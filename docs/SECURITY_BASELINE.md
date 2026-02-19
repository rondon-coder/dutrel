# Dutrel — Security Baseline (v2)

------------------------------------------------------------
DATA
------------------------------------------------------------

- TLS everywhere
- Minimal PII storage
- Receipts stored in Blob; DB holds URL + metadata
- User deletion supported

------------------------------------------------------------
PLAID
------------------------------------------------------------

- Read-only products only (Auth, Balance, Transactions)
- No raw routing/account storage
- Access tokens encrypted
- Disconnect anytime
- No spending analytics

------------------------------------------------------------
AUTH
------------------------------------------------------------

- Strong password or magic link
- Rate limiting
- Short-lived access tokens
- Refresh rotation

------------------------------------------------------------
AUDIT
------------------------------------------------------------

Log all coordinator actions:
- Role changes
- Reopen/dispute
- Autopay edits
- External-paid marks
- Buffer overrides

------------------------------------------------------------
OPERATIONS
------------------------------------------------------------

- Neon backups
- Error monitoring (Sentry optional)
- Minimal read-only admin tools
