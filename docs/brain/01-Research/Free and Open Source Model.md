# Free and Open Source Model

## Recommendation

Publish the core on GitHub under **Apache License 2.0**, with dependencies and bundled content reviewed individually. Host downloads/releases openly. No telemetry or account requirement. Provide local Docker Compose for development/demo and a documented production deployment path after its security posture is ready.

Apache-2.0 is a permissive, familiar license that allows use, modification, redistribution, and commercial adoption with notice/patent terms. It supports broad government and business evaluation. This is a product recommendation, not legal advice; obtain a legal review before final release and check all third-party assets/data.

## GitHub project

GitHub should be the source of truth for code and community collaboration: source, issues, discussions, security policy, release artifacts, SBOM, signed tags, changelog, contribution guide, roadmap, and reproducible demo configuration. Use GitHub Actions for lint/build/dependency checks and publish attestations for releases when feasible.

The tool should be usable without GitHub: offer container images and downloadable releases, plus a guided web page. GitHub is not the user interface for routine SIEM work.

## Landing page

Yes. A clear public landing page is a separate acquisition and learning surface. It should explain the product in plain language, show a short demo using synthetic events, provide “try the demo,” “run locally,” and “learn SIEM basics” paths, and link to docs/repo. Avoid collecting visitor data beyond minimal privacy-respecting analytics, or omit analytics entirely.

## Free use and sustainability

- Self-hosted core remains fully usable with no event-count lockout or time expiry.
- No mandatory hosted service, telemetry, API key, or cloud account.
- Community costs can be supported by donations, grants, sponsorship, training, or optional professional support later; do not design essential security controls as an artificial paywall.
- Cloud hosting, if ever offered, is optional and must not change the self-hosted project's capabilities or privacy promises.

## Licensing checklist

- Choose a license per code, documentation, detection rule, fixture, and artwork.
- Maintain third-party notices and a software bill of materials.
- Verify Sigma rule licenses and attribution before bundling/redistributing.
- Do not scrape or copy Splunk/Elastic proprietary rule sets, UI text, docs, screenshots, or brand assets.
- Keep Veycord name/logo distinct; competitor compatibility should be described factually.
- Set a contributor policy (DCO is a reasonable low-friction default) and clarify inbound contributions.
