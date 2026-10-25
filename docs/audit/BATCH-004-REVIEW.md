# Batch004 primary integration review

2026-10-25. The primary engineer reviewed bounded UI, pattern-research, CI and recovery-security work. All browser/data checks use synthetic fixtures and disposable PostgreSQL databases. No real telemetry, paid deployment or assessment was provisioned.

## Dashboard changes and rationale

The demo starts light for a new session and retains dark preference. It uses neutral synthetic-data labels, readable ordinary copy, one scoped event search, explicit native event inspection controls, coherent unresolved-alert counts and fixture-derived source totals. Decorative green live-looking pips and unrelated metric sparklines were removed. Event tables have captions, scoped headers and a named keyboard-scroll region. The real database connection status is neutral as well.

Shadcn/ui and Watermelon UI informed composition and accessible state patterns. No registry installer or template was imported; the existing React/native CSS and Lucide stack fits the eight-row demo. Console-owned rules were consolidated into a scoped stylesheet and obsolete global console/theme passes removed. This is maintainability work, not a claim that all CSS/module debt is eliminated.

The new library is development-only axe-core 4.14.0 (MPL-2.0, no new transitive/runtime dependency). It checks eight pages in light/dark at 1440/390/320px. Its license/provenance and removal boundary are recorded in DASHBOARD-PATTERN-REVIEW.md and the regenerated notices/SBOM.

## Integration defects found and corrected

The first consolidated style pass left an off-screen mobile sidebar visible to accessibility/keyboard APIs and inherited browser button backgrounds in dark mode. Explicit hidden/visible mobile states and neutral button backgrounds corrected those failures. Accessible labels now match visible search/theme/brand text. Generic decorative containers no longer carry unsupported naming attributes. A darker light-theme subtle color corrected text contrast.

Screenshot review found the 320px search label wrapping beyond its control; mobile now uses a named 44px icon action. The synthetic notice is compact and neutral. An independent bounded review found the initial focus color had insufficient light-surface contrast; theme-specific rings now measure 6.3:1 against light surfaces and 9.08:1 against dark surfaces. Table header contrast measures 4.89:1 light and 5.68:1 dark. Exact measurements and target size are retained in manual-accessibility-batch004.json.

Saved event search input/write limits now agree with the persisted schema: 200 characters and 100 saved searches. Keyboard Space opens the native evidence action; Ctrl/Command+Enter saves a search. Mobile navigation retains containment, Escape and focus return.

## Security engineering and actual scans

Cisco's published SDL is a process reference. Sentinel holds no Cisco certification, transferable Cisco industrial certificate, government approval or independent assessment. The brain's Cisco SDL Alignment and Assessment Path and docs/security/ASSURANCE-MATRIX.md distinguish existing controls, evidence and open gates.

The first CodeQL security-extended scan reported six high findings. Two production findings were real path races: backup encryption checked then reopened a source; decryption checked then reopened its envelope for multiple reads. Both now use a single no-follow descriptor, validate its metadata, and stream bounded data through it. Symlink rejection and failed-authentication plaintext cleanup are checked. Fixture assertions were restructured to inspect the directory entry after refused writes and compare it with the retained descriptor; they do not make an access decision from a prior path check. This retains no-overwrite coverage without treating repeated test opens as a runtime security boundary. No CodeQL rule or test directory was globally excluded and no alerts were dismissed.

The release gate parses actual SARIF driver/extension rule metadata, fails on high/critical findings and fails closed on missing/invalid analysis. Four synthetic gate tests pass; the actual first scan's six findings were also rejected by the parser. CodeQL run 40166425711 passed at 6821b0d; the repository API then reported zero open CodeQL alerts. This scoped result does not establish vulnerability absence.

Main is protected with PRs, strict verify and CodeQL job checks, administrator enforcement, resolved conversations and no force pushes/deletions. This solo project requires zero external approving reviews; it does not claim independent human review. GitHub private vulnerability reporting, secret scanning/push protection and Dependabot security updates are enabled. Actual settings/checks are retained in github-security-baseline.json.

## Checks actually run locally on this slice

| Layer | Evidence | Result |
|---|---|---|
| Production/runtime build | build-batch004.txt | Pass |
| Unit/API/detection/runtime configuration | unit-tests-batch004.txt | 33 pass |
| Actual PostgreSQL and private browser | database-tests-batch004.txt; private-browser-results.json | 2 pass, no skips; 55 browser checks pass |
| Backup/recovery/legacy upgrade | recovery-tests-batch004.txt | 2 pass, no skips |
| Public/demo browser | browser-results.json | 67 pass, no runtime exceptions |
| Startup/failure/stalled animation | bootstrap-results.json | 9 pass |
| Automated accessibility A/AA | dashboard-accessibility.json | 48 states, zero reported violations |
| Focus/target/header manual supplement | manual-accessibility-batch004.json | Recorded numeric checks pass |
| SARIF release gate | sarif-gate-tests.txt | 4 pass |
| Known npm advisories | dependency-audit-batch004.json | Zero at this snapshot |

Four accessibility scan groups remain incomplete because of clipped mobile table headers. Their computed contrasts were reviewed above. Automated results and the sampled visual/keyboard review do not establish complete WCAG conformance or coverage for every assistive technology. The baseline screenshots were reviewed in light/dark desktop and 320/390px mobile; the mobile evidence region is intentionally scrollable.

The final dashboard PR must pass both required GitHub checks before merge. Publication evidence and the resulting PR/run links belong in the release checklist and batch tickets. Existing corporate/hosted gates remain in NEXT-RELEASE-GATES.md: maintained identity/MFA/roles, collection, complete privacy lifecycle, distributed controls, external audit, offsite scheduled recovery, workload benchmark, deployment and independent review.
