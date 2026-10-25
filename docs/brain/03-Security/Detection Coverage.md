# Detection Coverage

SEN-206, implementation snapshot 2026-10-24. `server/detections.ts` contains six authored deterministic rules evaluated synchronously for each accepted private event. They require normalized attributes; the pipeline does not infer these enrichments from arbitrary raw text. No imported Sigma repository or proprietary Splunk rules are redistributed.

| Rule | Required attributes | ATT&CK mapping | Known limitation / false positive |
|---|---|---|---|
| VC-001 encoded PowerShell | processName, commandLine | T1059.001 | Only named PowerShell binaries and enc/encodedcommand switches; approved automation can match; bypasses exist |
| VC-002 repeated auth failures | category=authentication, integer failureCount≥5 | T1110 | Count must already be aggregated upstream; no multi-event/window correlation; stale credentials |
| VC-003 rare DNS block | category=dns, action=blocked, rareDestination=true | T1071.004 | Rarity comes from source enrichment; novelty alone does not establish C2 |
| VC-004 service creation | category=service, action=created, outsideChangeWindow=true | T1543.003 | Needs reliable change-window enrichment; emergency maintenance |
| VC-005 scheduled task | category=scheduled_task, action=created, approvedChange=false | T1053.005 | Missing approval alone does not trigger; legitimate new automation |
| VC-006 audit clear | category=audit, action=cleared | T1070.001 | Depends on audit collection surviving the action; authorized maintenance |

Technique mappings describe behavior context, not full ATT&CK coverage. Primary references: [PowerShell](https://attack.mitre.org/techniques/T1059/001/), [brute force](https://attack.mitre.org/techniques/T1110/), [DNS](https://attack.mitre.org/techniques/T1071/004/), [Windows service](https://attack.mitre.org/techniques/T1543/003/), [scheduled task](https://attack.mitre.org/techniques/T1053/005/), [clear Windows logs](https://attack.mitre.org/techniques/T1070/001/). Mapping does not validate source OS applicability automatically.

Findings preserve rule ID, reason and field evidence; duplicate event IDs within workspace/source do not re-run or duplicate findings. Rule evaluation failures must not become arbitrary execution. Stored findings are immutable in this slice; case status is independently editable. No scheduler, retroactive rules, signatures, network probe, anomaly model, threat-feed ingestion or automated containment exists.

Eight labeled browser sample events yield five findings. The optional CLI seed has separate authored synthetic test findings; it is not a detector benchmark. Unit positive/negative fixtures test behavior, not real-world recall or precision. Before release, each additional rule needs owner/version/license, telemetry contract, attack and benign fixtures, false-positive tuning, evidence, resource bound and rollback. Benchmark with licensed synthetic data, then consented sanitized representative data only after privacy review. Compare expected vs observed coverage and collect missing-source/lag signals; absence of alerts is not evidence of safety.

Next SEN-209 work: collector contracts (Sysmon/auth/DNS/firewall/cloud audit), robust field mapping, time-window correlation with late events and deduplication, health/lag alerts, rule versioning and suppression, Sigma compatibility/provenance review, measurable coverage. Keep collection and response least privileged.
