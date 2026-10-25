# Build batch005 — detection revision evidence

Parent gate: SEN-209C. Scope: authored rule metadata, a protected catalog, immutable evaluated revision evidence, and a documented change/rollback procedure. This completes a bounded slice, not the parent detection-engine lifecycle gate.

| Ticket | Scope and acceptance | Evidence / status |
|---|---|---|
| SEN-501 | Give every rule an explicit version, owner, license, origin, experimental status, evaluation mode, required data, false-positive guidance and primary references; expose metadata without executable predicates. | Implemented in `server/detections.ts`; authenticated `/api/private/v1/rules`, no query parameters, no-store and shared read limiter. Unit/API checks cover metadata, absence of predicates, caller copy isolation, authentication, scope rejection and rate limiting. |
| SEN-502 | Preserve evaluated revision on new findings without fabricating historic provenance or rewriting duplicates. | Migration004 nullable constrained column, bounded canonical numeric SemVer validation in store and database, evaluator supplies revision, findings API/UI returns/displays it. Null legacy/manual findings show Version unknown. Real PostgreSQL duplicate and invalid-version tests pass. |
| SEN-503 | Cover rule behavior and recovery; document safe updates/rollback. | Positive/near-miss/every missing required field fixtures, 36 unit/API tests; 2 PostgreSQL tests plus 63 browser checks; 2 recovery tests preserve new revisions and upgrade legacy001 records to null unknown. `docs/DETECTION-RULES.md` describes protected changes and corrective revision rollback. A deployment rollback drill is still pending. |
| SEN-504 | Integrate, review, inspect mobile evidence and retain actual verification. | Local build, tests, runtime smoke and manual 320px finding screenshot inspection pass. Bounded agent review found leading-zero version acceptance; application and database now reject it. Protected PR/CI status is authoritative for remote verification. An initial local npm advisory lookup failed DNS; the retry succeeded with zero known advisories. |

## Evidence and operational changes

- `docs/audit/build-batch005.txt`, `unit-tests-batch005.txt`, `database-tests-batch005.txt`, `recovery-tests-batch005.txt`.
- `docs/audit/private-browser-results.json`: 63 checks, including catalog, five persisted revisions and revision bounds at six viewport widths. Screenshot: `docs/audit/screenshots/private-finding-revision-320.png`.
- `docs/audit/runtime-batch005.json`: local private runtime health/summary/findings/catalog200, anonymous catalog401. Persistent synthetic database upgraded to migration004; local constraint reconciled during pre-publication review to match the final unreleased migration. No records backfilled/deleted. `.env`/`.env.runtime` preserved.
- `docs/audit/advisories-batch005.json` records the successful retry with zero known advisories. Linux CI performs its own lookup.
- No new dependency, imported rule/code, customer data, hosted infrastructure, or changed license; source remains Apache-2.0 with existing third-party notices.

## Remaining parent gate

Historical rule registry and enablement/tuning, correlation/time windows/late events, attributable suppressions/false-positive review, representative precision/recall/performance, and exercised deployment rollback remain open. Identity/MFA/roles, collectors, privacy lifecycle, distributed limits and independent review remain separate gates. Metadata does not turn source-enriched or missing telemetry into detection coverage. No Cisco certification or production assurance is established.
