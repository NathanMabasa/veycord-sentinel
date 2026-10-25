# Build batch006 — console navigation

User request: improve the sidebar/navigation, use strong product design references and build working elements with a clear structure. Parent engineering gate: SEN-211. This batch improves the public synthetic demo, not private identity or collection.

| Ticket | Implementation | Verification |
|---|---|---|
| SEN-601 | Group destinations into Workspace, Investigations and Manage; rename the learning destination Investigation guide; remove fictional profile/decorative setup card; provide stable documentation/GitHub footer and honest workspace chooser. | Native eight-link inventory; mode destination reaches private connection screen; actual unresolved-alert/open-case counts, including close/reopen; screenshot/code review. |
| SEN-602 | Validated URL page/event state, native links, current-page state, direct links, refresh, Back/Forward, document titles and destination focus. | Two pure model tests plus browser history/reload/evidence/unknown-input checks. Unknown parameters never select arbitrary components; event ID must identify a bundled fixture. |
| SEN-603 | Native modal search for pages, bounded sample events and actions; Cmd/CtrlK, arrows/Enter/Escape, explicit empty state and return focus; theme/collapse/resource actions. | Actual event evidence and reload, selected-page navigation, real theme action and empty-state keyboard checks. Search is local and input is capped at 200 characters, at most 16 results; no private data or external search service. |
| SEN-604 | Optional saved 268px/80px desktop rail, readable focus hints, full-label phone drawer, stable footer/scrolling body, short-screen support and Cmd/CtrlB outside text editors. | 320/390/768/1440px, light/dark, collapse reload, focus hint, text editing shortcut exclusion, modal trap, picker Escape layering and viewport fit. |
| SEN-605 | Extract navigation model/sidebar/search/presentation into focused modules and integrate verification. | Build, 38 unit/API/model tests,67 public/workflow browser checks,38 navigation checks,48 dashboard plus 32 navigation axe states,2 actual PG plus 63 private browser checks,9 startup checks pass locally. No new runtime dependency. The navigation audit also passes against the built standalone application on port8787. Required PR CI is authoritative for the final remote revision. |

## Evidence and review

- `docs/audit/NAVIGATION-DESIGN-PLAN.md`: plan, selected primary shadcn/Atlassian/Refero references, rejected alternatives and token/layout roles. Patterns were adapted; no copied template or third-party registry installer.
- `docs/audit/build-batch006.txt`, `unit-tests-batch006.txt`, `database-tests-batch006.txt`, `browser-results.json`, `bootstrap-results.json`, `dashboard-accessibility.json`, `navigation-results.json` and `advisories-batch006.json`.
- Screenshot/code review covers expanded/collapsed desktop, workspace chooser, mobile drawer, search and both themes. A bounded independent agent found no actionable defect; that review did not rerun tests and is not an external security/accessibility assessment.
- Initial verification found visible-label/name mismatches, an unnamed phone search control and asynchronous navigation focus stealing an editor's focus. Fixed with native/accurate names, an explicit icon-mode search name, layout-phase destination focus and closing the native search modal before destination actions. Tests were rerun on the fixes.
- The regression helper now waits for the actual native link's current-page attribute after the drawer closes; accessibility role queries omit the hidden drawer. This follows the rendered route, without changing application behaviour to satisfy selectors.
- The 80 automated states report zero violations. Four navigation color-contrast incomplete groups are controls occluded by the open mobile chooser; unoccluded colors are checked in `navigation-contrast.json` and screenshots reviewed. Four existing dashboard incomplete groups concern clipped mobile table headers. Full assistive-technology/conformance review remains open.
- Fresh npm audit reports zero known advisories. App feature bundle changed from 156.05KB to 169.36KB (gzip 44.19→48.05KB) with working navigation/search; no bundle-reduction claim. Source contains no new runtime library or imported visual asset.

## Boundaries

The chooser routes between modes; it does not authenticate, issue credentials, transfer records or select authorized tenants. Demo searches/evidence URLs use redistributable synthetic fixtures only. Filter text remains session state. Actual reporting, remaining large feature-view extraction, private-workspace accessibility/identity and a full assistive-technology matrix remain open in NEXT-RELEASE-GATES.md. No hosted telemetry or Cisco/government/production assurance is added.
