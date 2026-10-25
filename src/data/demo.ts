export type Severity = 'High' | 'Medium' | 'Low'
export type DemoEvent = {
  id: string
  time: string
  timestamp: string
  event: string
  source: string
  host: string
  user: string
  srcIp: string
  severity: Severity
  outcome: string
  detail: string
  raw: string
}

// Deterministic synthetic records. Reserved example IP ranges are used throughout.
export const demoEvents: DemoEvent[] = [
  { id: 'evt-7f21a0', time: '09:42:18', timestamp: '2026-10-23T09:42:18+02:00', event: 'PowerShell launched with encoded command', source: 'Windows Security', host: 'FIN-WS-042', user: 'j.mokoena', srcIp: '192.0.2.42', severity: 'High', outcome: 'Success', detail: 'A PowerShell process started with an encoded command-line argument. Review the parent process and user activity to determine whether this was expected administration.', raw: '{"event_id":4688,"host":"FIN-WS-042","user":"j.mokoena","process":"powershell.exe","command_line":"powershell.exe -enc <synthetic-payload>","source_ip":"192.0.2.42"}' },
  { id: 'evt-7f219c', time: '09:39:06', timestamp: '2026-10-23T09:39:06+02:00', event: 'Seven failed sign-ins followed by success', source: 'Linux auth', host: 'HR-LAPTOP-17', user: 'svc-backup', srcIp: '198.51.100.24', severity: 'Medium', outcome: 'Success', detail: 'Multiple failed SSH authentication attempts were followed by a successful login for the same account. Confirm whether this service account should authenticate interactively.', raw: '{"facility":"authpriv","program":"sshd","host":"HR-LAPTOP-17","user":"svc-backup","source_ip":"198.51.100.24","failures":7,"result":"accepted"}' },
  { id: 'evt-7f217a', time: '09:34:51', timestamp: '2026-10-23T09:34:51+02:00', event: 'Connection to rarely observed domain', source: 'DNS resolver', host: 'SRV-DB-01', user: 'system', srcIp: '203.0.113.18', severity: 'High', outcome: 'Blocked', detail: 'The host resolved a domain that is uncommon in this sample environment. The DNS policy blocked the follow-on connection. Inspect the process and surrounding DNS requests.', raw: '{"query":"updates-example.invalid","record_type":"A","host":"SRV-DB-01","client_ip":"203.0.113.18","policy_action":"blocked"}' },
  { id: 'evt-7f2133', time: '09:28:12', timestamp: '2026-10-23T09:28:12+02:00', event: 'New service installed', source: 'Windows Security', host: 'ENG-WS-008', user: 'local-admin', srcIp: '192.0.2.88', severity: 'Medium', outcome: 'Success', detail: 'A service installation event was recorded outside the normal maintenance window in this synthetic scenario. Verify the change request and binary publisher.', raw: '{"event_id":7045,"host":"ENG-WS-008","service":"TelemetryHelper","account":"local-admin","source_ip":"192.0.2.88"}' },
  { id: 'evt-7f20e1', time: '09:16:44', timestamp: '2026-10-23T09:16:44+02:00', event: 'Unusual outbound transfer volume', source: 'Web gateway', host: 'PRD-API-03', user: 'service-api', srcIp: '198.51.100.53', severity: 'Low', outcome: 'Allowed', detail: 'Outbound transfer volume exceeded this fixture’s usual baseline. The record alone is not evidence of data loss; check the destination and deployment context.', raw: '{"method":"POST","path":"/sync","bytes_out":18432000,"host":"PRD-API-03","user":"service-api","destination_ip":"198.51.100.53"}' },
  { id: 'evt-7f20b4', time: '08:54:02', timestamp: '2026-10-23T08:54:02+02:00', event: 'MFA challenge denied', source: 'Identity audit', host: 'IDP-GW-01', user: 'a.ndlovu', srcIp: '203.0.113.77', severity: 'Medium', outcome: 'Denied', detail: 'An MFA challenge was denied from a new network location. Check with the account owner through a trusted channel.', raw: '{"action":"mfa.challenge","result":"denied","user":"a.ndlovu","source_ip":"203.0.113.77","device":"browser-fixture"}' },
  { id: 'evt-7f2089', time: '08:47:36', timestamp: '2026-10-23T08:47:36+02:00', event: 'Firewall rule changed', source: 'Firewall audit', host: 'EDGE-FW-01', user: 'netops-demo', srcIp: '192.0.2.10', severity: 'Low', outcome: 'Success', detail: 'A firewall configuration change was recorded by the demo network operations account. Compare with the approved change window.', raw: '{"action":"policy.update","rule":"egress-allow-17","actor":"netops-demo","source_ip":"192.0.2.10","change_ref":"DEMO-104"}' },
  { id: 'evt-7f204f', time: '08:21:09', timestamp: '2026-10-23T08:21:09+02:00', event: 'Unexpected scheduled task created', source: 'Windows Security', host: 'FIN-WS-042', user: 'j.mokoena', srcIp: '192.0.2.42', severity: 'Medium', outcome: 'Success', detail: 'A scheduled task was created shortly after the PowerShell event in this fixture. Correlate the command, creator, and change ticket before deciding next steps.', raw: '{"event_id":4698,"task":"OfficeCacheRefresh","host":"FIN-WS-042","user":"j.mokoena","source_ip":"192.0.2.42"}' },
]

export const detections = [
  { id: 'DET-001', name: 'Encoded PowerShell command', category: 'Execution', severity: 'High' as const, description: 'Flags a PowerShell process that uses an encoded command argument.', rationale: 'Encoded commands can hide intent from casual review, but administrators and software installers may use them legitimately.', next: 'Inspect the parent process, command context, user activity, and any approved change record.', eventId: 'evt-7f21a0' },
  { id: 'DET-002', name: 'Repeated authentication failures', category: 'Credential access', severity: 'Medium' as const, description: 'Finds repeated failed sign-ins followed by a successful authentication.', rationale: 'This pattern can indicate password guessing, but mistyped credentials and stale service configurations are common causes.', next: 'Confirm the account owner, source network, login method, and whether interactive access is expected.', eventId: 'evt-7f219c' },
  { id: 'DET-003', name: 'Rare DNS destination blocked', category: 'Command and control', severity: 'High' as const, description: 'Highlights a rarely observed DNS name when a policy blocks the connection.', rationale: 'Rare destinations deserve review, but novelty alone does not establish malicious activity.', next: 'Review the requesting process and adjacent DNS activity. The sample policy reports that the connection was blocked.', eventId: 'evt-7f217a' },
  { id: 'DET-004', name: 'Service installation outside change window', category: 'Persistence', severity: 'Medium' as const, description: 'Finds a new Windows service installed outside the fixture maintenance window.', rationale: 'Services can provide persistence, and software updates also install legitimate services.', next: 'Check the service binary, publisher, installer parent process, and approved change request.', eventId: 'evt-7f2133' },
]

export const initialAlerts = [
  { id: 'ALT-1042', detectionId: 'DET-001', eventId: 'evt-7f21a0', severity: 'High' as const, status: 'New' as const, time: '09:42:18', title: 'Encoded PowerShell command', host: 'FIN-WS-042' },
  { id: 'ALT-1039', detectionId: 'DET-002', eventId: 'evt-7f219c', severity: 'Medium' as const, status: 'Investigating' as const, time: '09:39:06', title: 'Repeated authentication failures', host: 'HR-LAPTOP-17' },
  { id: 'ALT-1034', detectionId: 'DET-003', eventId: 'evt-7f217a', severity: 'High' as const, status: 'New' as const, time: '09:34:51', title: 'Rare DNS destination blocked', host: 'SRV-DB-01' },
  { id: 'ALT-1028', detectionId: 'DET-004', eventId: 'evt-7f2133', severity: 'Medium' as const, status: 'Resolved' as const, time: '09:28:12', title: 'Service installation outside change window', host: 'ENG-WS-008' },
]

export const activity = [9, 12, 8, 16, 13, 21, 17, 25, 18, 20, 16, 27, 19, 22, 18, 29, 24, 27, 20, 31, 25, 28, 23, 26]
