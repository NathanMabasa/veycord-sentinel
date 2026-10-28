# Application Error Monitoring

Researched 2026-10-28. Owner requested Sentry integration and strict public GitHub settings. **Status: planned; no SDK, DSN, project connection or reporting is active.** A Sentry plugin search returned no available connector. Project/account access has not been supplied. Do not fabricate a DSN or claim that reports arrive in Sentry.

## Purpose and boundaries

Monitor failures of Sentinel itself: startup, React rendering and API availability. Security events, raw logs, searches, evidence, case notes, identities and credentials must not become error-monitoring context. Sentry is an optional operational dependency, not Sentinel's SIEM storage or detection engine. The application must remain functional when reporting is disabled, blocked, rate-limited or unavailable.

Begin with an opt-in **public-demo frontend** integration using the maintained `@sentry/react` SDK, after its actual version, license, transitive dependencies, runtime support and advisory status are reviewed. React19 error hooks cover caught, uncaught and recoverable render failures; the existing startup boundary also needs an explicit reporting path. Avoid a custom Sentry protocol client. SDK selection is a proposal until the project and privacy configuration are known.

## Data controls required before activation

The current official documentation describes `dataCollection` controls introduced in SDK10.57 and changing defaults in SDK11. Do not rely on an old `sendDefaultPii: false` example or copy the full quickstart. The quickstart enables tracing, replay and feedback that this application does not need initially.

- Disable replay, tracing, session tracking, feedback, application logs/metrics and automatic console/network/navigation breadcrumbs for the first slice.
- Explicitly configure supported data-collection categories. Reject user info, cookies, HTTP headers/bodies, URL queries, search filters, source context and arbitrary event attributes.
- Use `beforeSend` as an **allowlist reconstruction**, not only a blacklist. Keep reviewed error categories, release/environment and bounded own-code frame locations; remove raw exception messages if they can contain application input. Drop arbitrary contexts, tags, extras, request/user data and breadcrumbs. These controls require version-specific SDK evidence and synthetic secret-canary tests.
- Browser transport still discloses connection metadata such as its source IP to the destination. Disabling `userInfo` does not establish that no personal data is processed. Review Sentry project region, retention, IP handling, access, deletion and public notice before enabling reports. A same-origin forwarding endpoint is a separate design requiring strict destination/body/rate bounds; never create an unrestricted reporting proxy.
- The public Worker's CSP currently allows only same-origin connections. Add only the reviewed project's exact ingestion origin if direct browser reporting is selected. Do not use a wildcard, loosen script policy or modify private database access to make reporting work.
- Private deployments remain off by default, with no automatic propagation of public-demo monitoring settings. Do not instrument the operator workspace until its own telemetry threat model and controls are reviewed.

## Cloudflare/server evaluation

The public adapter is a self-contained ESM Worker on Sites, not the Cloudflare Vite-plugin setup in Sentry's quickstart. The current `@sentry/cloudflare` guidance requires AsyncLocalStorage/nodejs_compat support and a compatible date. Confirm what Sites actually provides before wrapping the Worker or adding that package. Its Hono app also converts exceptions into safe responses, so a wrapper alone may not observe handled errors. Server monitoring needs an explicit safe capture path and its own synthetic exception test. Preserve current secret-free errors and logs.

## GitHub connection

Error ingestion can be configured without installing Sentry's GitHub App. The optional GitHub integration adds commit/source linking and issue/PR workflows. Current official permissions include write access to contents, checks, statuses, issues and pull requests; it is not a read-only integration. Installation requires Sentry owner/manager/admin and GitHub owner permissions. If selected, install from Sentry and grant **only NathanMabasa/veycord-sentinel**, then review automation features and resulting access. Do not grant all repositories or weaken branch protections.

Source-map upload credentials belong in a scoped CI secret, never `VITE_*`, the browser bundle, `.openai/hosting.json` or committed files. Source maps should be uploaded privately and excluded from public assets. No wizard or unpinned installation command has been run.

## Required owner input

Provide the existing **Sentry project URL** (or its public DSN) and confirm its region/retention choice. Never paste an auth token into chat. If there is no project, an owner must create/select the account and project. GitHub App/source-map authorization, if desired, is a separate step after reviewing its permissions.

## Sources

- [Sentry React setup](https://docs.sentry.io/platforms/javascript/guides/react/): SPA SDK and React19 hooks.
- [React SDK options](https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/): current dataCollection, defaultIntegrations, beforeSend and breadcrumbs controls.
- [Collected data](https://docs.sentry.io/platforms/javascript/guides/react/data-management/data-collected/) and [sensitive data](https://docs.sentry.io/platforms/javascript/guides/react/data-management/sensitive-data/): collection categories and client-side scrubbing.
- [Cloudflare setup](https://docs.sentry.io/platforms/javascript/guides/cloudflare/): runtime requirements and framework-specific paths.
- [GitHub integration and permissions](https://docs.sentry.io/integrations/source-code-mgmt/github/): installation, repository selection and permission scope.

The web reader could not parse Sentry's Markdown responses, so these official pages were retrieved directly as Markdown; the moved GitHub documentation URL was resolved before recording it. Recheck the selected SDK's shipped types/source when implementing. See `docs/tickets/BUILD-BATCH-008.md`.
