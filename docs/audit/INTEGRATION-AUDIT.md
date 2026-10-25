# Integration audit — continuation 2026-10-24

## Outcome

The synthetic investigation demo, local read-only API, API request explorer, responsive public pages, light/dark console and startup loader pass the checks below. This is evidence for the current demo scope; it does not establish production readiness, full accessibility conformance, feature parity with Splunk, or Cisco-equivalent assurance.

## Reviewed and corrected

- Reviewed the smaller agents' source changes rather than accepting their completion messages alone.
- Storage shape validation now rejects empty/oversized workspace names and bad fixture references; storage failures leave a usable session-only demo.
- Case notes, close/reopen, JSON export and duplicate-per-alert prevention are exercised through the browser and survive reload.
- Removed a misleading time selector; the overview explicitly identifies its fixed fixture timestamp span and illustrative chart.
- Reviewed and repaired light-theme foregrounds on panels/tables, state badges and metric metadata. Independently inspected light dashboard and desktop/mobile hero screenshots.
- Mobile console navigation now contains keyboard focus, makes background content inert, closes with Escape, returns focus and restores body scrolling.
- Public route navigation restores the top of the page and focuses its heading, preserving fragment destinations.
- The earlier `/docs/api` timeout was an audit selector issue: the live route and combobox were present, but Playwright's exact text-label locator included wrapping select content. Explicit IDs and role-based assertions resolve it. Actual API success and static-host fallback are now exercised.
- Added the balanced two-line hero, with primary CTA fully visible in desktop 1440×900 and 1280×800 viewports.
- Added a real startup state while dynamically importing the application, a 280ms GSAP handover, reduced-motion handling, module-failure reload and useful no-JavaScript content. No fake progress or artificial minimum delay; internal navigation does not replay it.
- Aligned the brain with implemented local API capabilities versus the proposed hosted/real-data architecture.

## Verification evidence

| Check | Result | Record |
|---|---|---|
| Frontend, server, Vite and API test TypeScript checks + production bundle | Pass | `npm run build` |
| API contract suite | 9 pass | `npm run test:api`, `tests/api.test.ts` |
| Browser integration | 62 pass, no runtime errors | `scripts/browser_audit.py`, `docs/audit/browser-results.json` |
| Startup behavior | 8 pass | `scripts/bootstrap_audit.py`, `docs/audit/bootstrap-results.json` |
| Built production preview smoke | Pass | `docs/audit/preview-results.json` |
| Dependency advisory audit | 0 known vulnerabilities at previous batch check; dependencies unchanged this continuation | `docs/audit/RESEARCH-AND-SELECTION.md` |

The browser matrix visits seven public routes and eight console views at 360, 768 and 1440px. It checks document overflow, filters, stored-state recovery, persistence, export content, duplicate prevention, modal keyboard behavior, API success and unavailable/static API responses. The startup suite deliberately slows and fails application module requests, verifies reload recovery, reduced motion, internal navigation and disabled JavaScript. The production preview separately confirms the built loader stylesheet, API request explorer, safe API 404/405 behavior and a primary CTA bottom at 605px in a 1280×800 viewport.

Screenshots: `docs/audit/screenshots/hero-production-1280x800.png`, `hero-1440x900.png`, `hero-360x800.png`, `dashboard-light.png`, `dashboard-dark.png`, `startup-loading.png`, and `startup-failure.png`.

## Remaining work and release boundaries

- The console's event/detection data remains bundled; the read-only HTTP API is demonstrated separately. Cases/settings are browser-local, not server records or a security boundary.
- No real-data ingestion, identity/role enforcement, tenant isolation, durable server event store, live detection scheduler, retention/deletion service, operational recovery or independent security assessment exists.
- The API runs in Vite development/preview. A Worker-compatible Fetch module is available, but deployment/configuration/bindings are not shipped. Static-only hosting cannot serve it without a separate API.
- `public/_headers` is a static-host header template. Its deployment behavior is not verified; Vite does not apply that file.
- App.tsx is formatted but remains monolithic; stylesheet generations are partially pruned and hero rules consolidated, with broader component/style separation still pending.
- A project license decision, complete dependency notice inventory/SBOM, CI evidence, real security disclosure contact, clean approved logo exports and an actual public repository remain public-release gates.

The one-time reset continuation is complete. Further roadmap work is tracked in `docs/tickets/BUILD-BATCH-001.md` and requires another work batch; no recurring background build is left active.
