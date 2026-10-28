# Commercial Sprint Plan

Planning baseline: 2026-10-28. Owner requested sprint/ticket decomposition of the Huntress-inspired changes. **This is a proposed delivery plan, not a commercial release approval or a delivery-date commitment.**

## Planning assumptions

- Use a two-week planning/review cadence. Team capacity is unknown; a sprint goal may need multiple iterations. No calendar dates or total completion estimate are promised.
- One primary engineering stream; review, user feedback and documentation can overlap. Provider provisioning and independent assessment are external dependencies, not assumed available.
- Build on the current React/Hono/private PostgreSQL foundation. High-volume search, hosted runtime and identity provider choices remain subject to their existing decisions/gates.
- All development and demonstrations use synthetic data. A customer-data pilot requires the relevant security/privacy/operations approval; sprint completion alone does not grant it.
- Existing SEN-1001–1010 remain feature epics. SEN-208A/B/C/D,209A/B/C,210,211,212 remain release gates. Child tickets in `docs/tickets/SPRINT-BACKLOG.md` deliver parts of those scopes; no parent is closed automatically.
- Platform accounts, service purchases, real-data access, external notifications and production response actions require explicit configuration/authorization. This plan does not create them.

## Sprint sequence

| Sprint | Goal | Tickets | Demonstration / exit |
|---|---|---|---|
| 0 — Scope and baseline | Define a supported first product and reconcile evidence | SEN-1009-A/B/C | Named audience/topology, supported first source, measurable acceptance budget and current evidence ledger |
| 1 — Identity and permissions | Give each operator an identity and enforce workspace access | SEN-208A-1/2, SEN-208B-1/2 | Two synthetic workspaces; login/MFA/revocation plus cross-role/workspace denial evidence |
| 2 — Collection and health | Deliver one maintained source into durable events | SEN-1001-A/B/C/D | Synthetic log file → collector/adapter → authenticated ingestion → searchable event, with outage/lag/error visibility |
| 3 — Investigations | Turn events/findings into a durable case narrative | SEN-1002-A/B/C | Assign a case, inspect chronological evidence, reopen it and export a bounded redacted report |
| 4 — Detection operations | Correlate events and support reviewed tuning | SEN-1003-A/B/C | Failed-then-successful synthetic sign-ins produce an explained alert; late/replayed events and suppression/rollback behave as specified |
| 5 — Notifications and filtering | Deliver actionable alerts and preview data-policy effects | SEN-1004-A/B, SEN-1007-A/B | Approved test receiver gets signed, retry-safe alerts; filter/redaction preview shows counts and detection impact without silently dropping evidence |
| 6 — Data lifecycle and operations | Prove privacy, bounded capacity and recoverability | SEN-208C-1/2, SEN-1008-A/B/C | Synthetic subject lifecycle, retention/holds, overload behavior, measured benchmark and scheduled offsite recovery drill |
| 7 — Identity monitoring and inventory | Add one read-only Entra integration and evidence-backed inventory | SEN-1005-A/B/C, SEN-1006-A | Synthetic/replayed identity data drives a case; missing scopes/stale data show degraded/Unknown, no remediation writes |
| 8 — Release assurance and pilot decision | Assemble a supportable release and assess readiness | SEN-210-1, SEN-212-1, SEN-1009-D/E | Reproducible signed release, independent findings addressed, then an explicit go/no-go for a bounded authorized pilot/offering |

Dependencies flow in this order, but work can be reduced without weakening gates. For example, Sprint7 identity monitoring can be deferred for a narrower Linux-auth-only release if the owner explicitly accepts that scope; identity isolation in Sprint1 cannot be deferred for a multi-user offering. Reassess dependent tickets and acceptance evidence when scope changes.

## First supported scope to validate in Sprint0

Proposed: private single-node Node/PostgreSQL deployment, small IT team, one synthetic Linux authentication source through a maintained collector adapter, explained detections, investigations and reports. This source is a recommendation, not a completed selection. The public site remains a synthetic demo until an independently reviewed hosted service is approved.

The first meaningful milestone is Sprint3: connect a source, observe delivery health, inspect evidence and produce an investigation report. It remains a synthetic development milestone. Sprint8 is a release/pilot decision, not an automatic launch.

## Scope deferred beyond the initial release

- Native EDR/antivirus or a new privileged endpoint agent; initially evaluate importing established endpoint alerts.
- Broad Windows/firewall/Google/cloud connector coverage beyond individually reviewed adapters.
- General Sigma compatibility; later support must explicitly identify tested operators/source mappings and third-party rights.
- SEN-1006-B/C: configuration posture/drift and impact previews after source/read-permission validation.
- SEN-1010-A/B/C: approved response provider contract, step-up approval/audit, then sandbox failure/recovery trials. Separately gated after initial commercial acceptance; no arbitrary shell or automatic account/device shutdown.
- 24/7 staffed response, high availability, multi-region and billing/subscription automation unless explicitly funded/scoped. Authentication and essential security controls stay part of the open-source foundation.

## Delivery and review rules

1. Before each sprint, select only tickets whose prerequisites and owner inputs are ready. Refine large tickets into independently reviewable slices rather than silently expanding a sprint.
2. Every ticket has one accountable owner before entering In progress. Engineering implements; a reviewer checks evidence. Product owner confirms scope; security/privacy reviewer handles the applicable release gate. An author-only review is not independent review.
3. Status vocabulary: Backlog → Ready → In progress → In review → Done. Blocked records its dependency and next action. Deferred is explicit future scope. Tickets below start in Backlog; no work is implied shipped by this document.
4. Done requires the user flow and failure states, versioned API/schema where relevant, applicable security controls, migration/rollback, documentation and appropriate verification evidence. Report what ran and what did not.
5. Use protected PRs and final-head required checks for implementation. Record commit/PR/check IDs in the ticket; publish web changes through the existing sanitized Sites workflow. A GitHub merge is not automatic publication.
6. Review keyboard use, light/dark themes and320/768/1440px behavior for changed UI. Do not treat a zero-overflow result as visual approval or claim complete accessibility conformance from automated scans.
7. No tenant supplied only by a browser/event may authorize an API, job, export or object operation. No code from logs/rules executes. Apply resource bounds and secret-free telemetry throughout.

## Commercial gate checklist

Before a customer-data pilot or supported hosted offering: close applicable SEN-208/209/210/212 evidence for the exact topology; validate isolation and privacy lifecycle; agree capacity/cost/recovery limits; approve data location/subprocessors/terms; assign incident/support ownership; resolve independent assessment findings. Qualified legal/procurement review remains necessary for relevant South African/government commitments. A checklist, certificate-shaped page or competitor reference is not approval.

## Links

- Tickets: `docs/tickets/SPRINT-BACKLOG.md`
- Feature epics: `docs/tickets/BUILD-BATCH-010.md`
- Release gates: `docs/tickets/NEXT-RELEASE-GATES.md`
- Research: [[../01-Research/Huntress and Commercial Product Roadmap]]
- Architecture/build dependencies: [[../09-Engineering/Build Map and Traceability]]
- Broader phases: [[Phased Roadmap]] — this commercial plan places identity/MFA before multi-user use, even where the older broad phases list later SSO/MFA options.
