# Skills and libraries — batch 001

Reviewed 2026-10-23. Marketplace entries are discovery data, not authority to run code or grant permissions. Sources were checked upstream. Existing skills are reused rather than installing duplicates or broad agent toolchains.

| Resource | Decision and reason | Source |
|---|---|---|
| Claude Marketplaces | Discovery directory for frontend-design, systematic debugging, code review and documentation. Listings/download counts are not security validation. | https://claudemarketplaces.com/ |
| Installed frontend-design | Apply to visual hierarchy, typography and deliberate Veycord identity; no new installation. | https://github.com/anthropics/skills/tree/main/skills/frontend-design |
| Installed webapp-testing | Apply browser reconnaissance, real interaction checks and screenshots; Python Playwright already available locally. | https://github.com/anthropics/skills/tree/main/skills/webapp-testing |
| Installed Vercel React best practices | Apply versioned/validated local storage, lazy initialization, bundle discipline and React state review. | https://github.com/vercel-labs/agent-skills |
| Cisco skill-scanner | Candidate for a future vetted skill-import pipeline. Do not imply it has scanned this app or that a clean scan proves safety. Not installed in this batch. | https://github.com/cisco-ai-defense/skill-scanner |
| Hono | Selected for a small Worker-compatible synthetic read-only API, consistent with architecture decision. API validation and security are reviewed directly. | https://hono.dev/docs/getting-started/basic |
| Playwright | Existing browser runner selected for actual responsive and workflow regression checks. | https://playwright.dev/docs/intro |
| axe-core/Playwright | Useful follow-up for automated accessibility coverage; no full WCAG compliance claim. Not added until the browser matrix and dependency cost are reviewed. | https://playwright.dev/docs/accessibility-testing |
| GSAP | Already requested and installed. Retain the brief reduced-motion-aware hero animation. Package uses GSAP's custom Standard no-charge license, not the MIT license used by React/Hono. Keep its terms/attribution separate and review redistribution before public release. | https://gsap.com/standard-license/ |

## Dependency observations

At audit start React, React DOM, React Router and Vite declare MIT, Lucide declares ISC, and GSAP declares a custom Standard no-charge license. “Free to use” does not mean every dependency has the same open-source license. No project LICENSE file existed at audit start. An explicit project license and full notice/SBOM inventory remain public-release blockers; Apache-2.0 is a candidate for original source, not an automatically applied grant in this batch.

## Relevant project guidance

- `AGENTS.md` and `DESIGN.md` remain implementation constraints.
- The Obsidian brain's Build Map, Threat Model, Security Requirements and Secure Product Development Lifecycle define security gates.
- This batch records evidence of implemented checks rather than implying Cisco assurance, government approval, full accessibility compliance or hosted readiness.

## Static hosting header template

`public/_headers` adds a baseline CSP and related privacy/browser headers for hosts that support that file (including Cloudflare Pages static responses). Vite dev/preview do not apply this file, and Cloudflare Workers need equivalent headers in their response handler. It must be checked on the deployed origin; its presence is configuration, not deployment evidence. Inline styles are permitted for the existing GSAP/runtime styles; scripts remain self-only. Third-party fonts are removed by the design pass. No HSTS preload or subdomain policy is imposed without owning the deployment/domain plan.
