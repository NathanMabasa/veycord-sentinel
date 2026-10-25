# First Run and Learning Path

## Landing page paths

- **Try the demo:** synthetic dataset, preloaded dashboard, guided investigation, reset button; no account if feasible. The public demo must not accept real logs.
- **Run it yourself:** copy-paste local install steps, hardware needs, and a clear statement that real logs stay on the user's infrastructure.
- **Learn SIEM:** short lessons for events, fields, searches, detections, triage, cases, and ATT&CK mapping.
- **Contribute:** repo, issues, detection content guide, security policy.

## In-product onboarding

1. Explain where data is stored and whether anything leaves the machine.
2. Offer “Explore sample environment” before source setup.
3. Walk through one alert: signal → evidence → context → decision → case note.
4. Let the user connect a source only after explaining permissions and data fields.
5. Show parser health, event volume, and last event received.
6. Provide a checklist to remove sample data and set retention before live use.

## Beginner-friendly behavior

- Explain acronyms inline; use plain labels alongside technical names.
- Query builder and filters first; expert query box always available for learning.
- Every detection includes “why this fired,” “what to check,” and “common false positives.”
- Avoid presenting a score as proof of compromise.
- Include keyboard navigation, visible focus, accessible contrast, and readable density.

## Local prototype walkthrough (2026-10-23)

The current browser-only demo implements this practice path:

1. Search or filter synthetic events by text, source, or severity.
2. Open an event and inspect normalized fields and the raw synthetic record.
3. Read the linked detection rationale and suggested checks.
4. Resolve/reopen an alert or create a case from its evidence; edit its analyst note, close/reopen the case, or export case JSON. Creating a second case from the same alert is prevented in the local demo.
5. Adjust local display preferences and reset the sample state. If browser storage is unavailable, the demo remains usable for the session and labels state as session-only.

Mutable console state is stored in browser localStorage under a versioned `veycord-demo:v1:` prefix when storage is available. Persisted JSON is shape-checked and bounded before use; failed reads use defaults and failed writes do not block the in-session workflow. This is demo persistence only, not identity, authorization, retention enforcement, or secure storage. Do not use real telemetry in this prototype. The separate local Hono API is read-only and serves synthetic fixtures; it does not read or write this browser state.
