import type { DetectionMatch, EventInput, SeverityLevel } from './data-model.js'

export type RuleMetadata = {
  version: string; owner: string; license: string; status: 'experimental'; origin: 'authored'
  evaluation: 'single-event'; references: string[]
}
type StarterRule = RuleMetadata & {
  id: string; name: string; severity: SeverityLevel; techniqueId: string
  requiredFields: string[]; rationale: string; falsePositives: string[]
  matches: (event: EventInput) => boolean
}
const text = (event: EventInput, key: string) => typeof event.attributes?.[key] === 'string' ? String(event.attributes[key]).toLowerCase() : ''
const is = (event: EventInput, key: string, value: string) => text(event, key) === value

/** Authored, deterministic examples. No imported code, rule expressions or payload execution. */
const ruleDefinitions = [
  { version:'1.0.0', id:'VC-001',name:'Encoded PowerShell invocation',severity:'high',techniqueId:'T1059.001',requiredFields:['processName','commandLine'],rationale:'An encoded-command switch obscures a PowerShell command. Verify the parent process and approved administration.',falsePositives:['Approved automation','Software installation'],matches:e=>['powershell.exe','powershell','pwsh.exe','pwsh'].includes(text(e,'processName')) && /(?:^|\s)-(?:enc|encodedcommand)(?:\s|:)/i.test(text(e,'commandLine')) },
  { version:'1.0.0', id:'VC-002',name:'Repeated authentication failures',severity:'medium',techniqueId:'T1110',requiredFields:['category','failureCount'],rationale:'A source-reported authentication failure count reached five. This rule consumes a pre-aggregated count; it does not correlate separate events.',falsePositives:['Stale service credentials','User password mistakes'],matches:e=>is(e,'category','authentication') && typeof e.attributes?.failureCount==='number' && Number.isInteger(e.attributes.failureCount) && e.attributes.failureCount>=5 },
  { version:'1.0.0', id:'VC-003',name:'Rare DNS destination blocked',severity:'high',techniqueId:'T1071.004',requiredFields:['category','action','rareDestination'],rationale:'A source marked a DNS destination as rare and reported a block. Rarity and a technique mapping do not establish command-and-control activity.',falsePositives:['New legitimate domains','First-seen software updates'],matches:e=>is(e,'category','dns') && is(e,'action','blocked') && e.attributes?.rareDestination===true },
  { version:'1.0.0', id:'VC-004',name:'Service created outside change window',severity:'medium',techniqueId:'T1543.003',requiredFields:['category','action','outsideChangeWindow'],rationale:'A service creation event is explicitly outside a known change window. Check publisher, parent process and the change record.',falsePositives:['Emergency maintenance','Incorrect change-window enrichment'],matches:e=>is(e,'category','service') && is(e,'action','created') && e.attributes?.outsideChangeWindow===true },
  { version:'1.0.0', id:'VC-005',name:'Unapproved scheduled task creation',severity:'medium',techniqueId:'T1053.005',requiredFields:['category','action','approvedChange'],rationale:'A task creation event is explicitly marked as an unapproved change. Missing approval metadata alone does not trigger this rule.',falsePositives:['New legitimate automation','Incomplete change management'],matches:e=>is(e,'category','scheduled_task') && is(e,'action','created') && e.attributes?.approvedChange===false },
  { version:'1.0.0', id:'VC-006',name:'Audit log cleared',severity:'high',techniqueId:'T1070.001',requiredFields:['category','action'],rationale:'A source reported audit log clearing. Review the actor, authorization, maintenance reason and surrounding activity.',falsePositives:['Authorized maintenance','Lab resets'],matches:e=>is(e,'category','audit') && is(e,'action','cleared') },
] satisfies Omit<StarterRule, Exclude<keyof RuleMetadata, 'version'>>[]

export const starterRules: readonly StarterRule[] = ruleDefinitions.map(rule => ({
  ...rule,
  owner: 'Veycord Sentinel maintainers',
  license: 'Apache-2.0',
  status: 'experimental',
  origin: 'authored',
  evaluation: 'single-event',
  references: [`https://attack.mitre.org/techniques/${rule.techniqueId.replace('.', '/')}/`],
}))

/** Explicit serialization keeps executable predicates out of the API contract. */
export function listRuleCatalog() {
  return starterRules.map(({ matches: _predicate, ...metadata }) => ({
    ...metadata,
    requiredFields: [...metadata.requiredFields],
    falsePositives: [...metadata.falsePositives],
    references: [...metadata.references],
  }))
}

export function evaluateEvent(event: EventInput): DetectionMatch[] {
  return starterRules.filter(rule=>rule.matches(event)).map(rule=>({
    ruleId:rule.id,ruleVersion:rule.version,name:rule.name,severity:rule.severity,techniqueId:rule.techniqueId,reason:rule.rationale,
    evidence:rule.requiredFields.map(key=>`${key}: ${String(event.attributes?.[key] ?? '').slice(0,1024)}`),
  }))
}
