# Build batch008 — error monitoring and public repository protection

Owner request: connect Sentry-like application monitoring and retain public source with strict GitHub settings. Research and prerequisites are in [Application Error Monitoring](../brain/03-Security/Application%20Error%20Monitoring.md).

| Ticket | Work | Status / acceptance |
|---|---|---|
| SEN-801 | Select/connect the Sentry account/project and privacy controls | Awaiting owner project URL/public DSN; no available Sentry connector found. Region, retention and access must be reviewed; never request a pasted auth token. |
| SEN-802 | Opt-in public React error capture with an official, reviewed SDK | Planned. No SDK installed. Default-off behavior, React19/startup capture, strict allowlist sanitation, no replay/breadcrumbs/tracing, bounded reporting and SDK-failure isolation require tests. |
| SEN-803 | Review Worker support, source maps and optional GitHub App | Planned. Sites runtime compatibility is unverified; handled Hono errors need an explicit safe path. GitHub App is optional and has source-write permissions; restrict to the Sentinel repository. CI upload credentials must stay secret. |
| SEN-804 | Verify strict public GitHub settings | Live API snapshot in `docs/audit/github-public-protections-batch007.json`: public Apache-2.0; protected main including admins; strict verify/CodeQL gates; resolved conversations/linear history; no force push/deletion; secret scanning/push protection, private reporting and security updates enabled; workflows default read-only and cannot approve PRs. Squash-only merging now configured. |

The project is currently maintained by one owner: **zero external approving reviews are required**. CI protection is real, but it does not constitute independent human review. Requiring another approver needs another trusted maintainer; do not fabricate one, enable self-approval or bypass checks. Monitoring is not connected, and repository settings are not a security certification.
