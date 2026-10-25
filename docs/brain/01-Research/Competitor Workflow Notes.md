# Competitor Workflow Notes

These notes describe patterns worth learning from. Reuse product ideas and user jobs; do not copy proprietary code, text, visual assets, or branding.

## Splunk patterns

- Search is the central navigation model; results can become saved reports and dashboard panels.
- Alerts can run on historical or real-time search conditions and trigger actions.
- Dashboards combine search-driven panels.
- Pivot gives a visual exploration path over defined data models.
- Interactive product tours and learning materials reduce first-use friction.

**Veycord response:** offer a simple search bar and guided filters first; provide a documented query language later. Allow a search to be saved as a view, chart, or alert. Build one investigation flow that connects event, alert, and case rather than isolated screens.

## Elastic patterns

- Detection rules have lifecycle management, enable/disable state, scheduling, tuning, and import/export.
- Cases organize alerts and analyst notes; integrations can connect external incident systems.
- Data integrations and field conventions make prebuilt detections more useful.
- Feature entitlements differ by tier; an open-source product can differentiate by making core security workflow universally available.

**Veycord response:** rule status, schedule, version, test evidence, source, severity, references, and license must be visible. Avoid tying basic collaboration or audit controls to paid tiers.

## OpenSearch patterns

- Choose log type, map fields, create a detector, inspect findings, tune rules, then create correlations across sources.
- A dashboard overview emphasizes findings, alerts, frequent rules, and detector health.
- Sigma is used as a starting point, with field mappings to ECS or OCSF.

**Veycord response:** hide mapping complexity behind a “check my data” preview, but expose mappings for analysts. Distinguish a finding (matched event/rule) from an alert (condition needing triage). Make correlation explain its evidence and time window.

## Candidate core navigation

Overview · Explore · Detections · Alerts · Cases · Sources · Reports · Settings

Use progressive disclosure: novice mode starts from sample lab/tasks; analyst mode adds query/rule controls; administrator paths expose deployment, retention, access, and audit settings.
