# Hosted and Self-Hosted Onboarding

Owner clarification, 2026-10-28: use Sentry's product model as a reference so people can use the web application, connect their data, or download the source and operate it themselves. This supersedes the earlier interpretation that an error-monitoring account was needed. Keep Veycord's own brand, copy and implementation.

## Shipped capability versus target

Today: a public synthetic web demo and a separate single-operator Node/PostgreSQL installation with an authenticated HTTP ingestion API. A private operator can send normalized JSON to their own API and inspect stored events. There is no public tenant signup, user-scoped token issuance, managed collector or vendor OAuth connection. Hosted real telemetry remains behind SEN-208/209/212.

## Experience

1. Header and hero expose an obvious start point and source/self-host option.
2. `/get-started` compares the no-install synthetic web demo with source download/self-hosting. Source ZIP is source code, not a binary installer. Explain Node22/PostgreSQL16 and link the complete private setup.
3. `/connections` lists the actual self-hosted HTTP API first; future parsers/collectors have explicit planned status and requirements. Do not show fake OAuth buttons or connected states.
4. `/connections/http` provides a validated private origin, safe terminal commands and a downloadable synthetic check event. Credentials are entered only on the operator's machine. No public-page request probes private networks and no private key is requested, persisted or added to URLs.
5. Verification happens in the private terminal: authenticated health200, ingest response, then the stored event in `/workspace`. The public guide cannot claim connection success it did not observe.

## Design plan

Preserve Inter/system typography and Veycord palette: navy #0B1220, white #FFFFFF, paper #F7F8FA, slate #364154 and orange #FF6A00. Body/input text16px, section headings24–30px, controls at least44px. Keep line lengths readable and support320px with normal text wrapping. Two setup paths share a restrained comparison layout; the connections catalog uses rows rather than a grid of interchangeable cards. Real setup steps may be numbered. The command panel is a functional monospace surface with copy/download controls, readable errors and a status region. No live pips, invented counts, decorative graphs, automatic setup animations or extra UI library.

Review against the brief: the distinction comes from explicit data ownership and a real, bounded ingestion contract. An account form that cannot create an isolated workspace would misrepresent the current product. Offer concrete self-hosting steps now and track actual hosted workspace provisioning separately.

## Sources and adaptation

[Sentry self-hosting](https://develop.sentry.dev/self-hosted/) separates a maintained source/deployment path from its hosted service. [Sentry projects](https://docs.sentry.io/product/projects/) organizes setup and access around a specific application/team. Adapt the sequence of choose deployment → configure connection → verify data arrival; do not copy UI assets, code, licensing or claim equivalent features. These official pages were retrieved as Markdown after the web reader could not parse that content type.

See `docs/tickets/BUILD-BATCH-009.md`, [[First Run and Learning Path]], [[../02-Architecture/Web Hosting Strategy]] and [[../09-Engineering/Build Map and Traceability]].
