import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateEvent,starterRules,listRuleCatalog } from '../server/detections.js'
import type { EventInput } from '../server/data-model.js'
const event=(attributes:EventInput['attributes']):EventInput=>({eventId:'fixture-1',timestamp:'2026-10-24T00:00:00Z',event:'Synthetic event',source:'test',host:'test-host',severity:'low',attributes})
const positives:EventInput['attributes'][]=[{processName:'PowerShell.exe',commandLine:'powershell.exe -ENC example'},{category:'authentication',failureCount:5},{category:'dns',action:'blocked',rareDestination:true},{category:'service',action:'created',outsideChangeWindow:true},{category:'scheduled_task',action:'created',approvedChange:false},{category:'audit',action:'cleared'}]
const negatives:EventInput['attributes'][]=[{processName:'bash',commandLine:'echo -enc example'},{category:'authentication',failureCount:4},{category:'dns',action:'allowed',rareDestination:true},{category:'service',action:'created'},{category:'scheduled_task',action:'created'},{category:'audit',action:'read'}]
starterRules.forEach((rule,index)=>test(`${rule.id} has positive and negative coverage with evidence`,()=>{const hits=evaluateEvent(event(positives[index]));const hit=hits.find(item=>item.ruleId===rule.id);assert.ok(hit);assert.ok(hit.evidence.length);assert.equal(evaluateEvent(event(negatives[index])).some(item=>item.ruleId===rule.id),false)}))
test('missing fields and arbitrary payload strings are not evaluated',()=>{assert.deepEqual(evaluateEvent(event({})),[]);assert.deepEqual(evaluateEvent({...event({payload:'globalThis.compromised=true; process.exit(1)'}),raw:'<script>alert(1)</script>'}),[]);assert.equal((globalThis as Record<string,unknown>).compromised,undefined)})
test('threshold must be an integer count and approval must be explicit',()=>{assert.deepEqual(evaluateEvent(event({category:'authentication',failureCount:5.1})),[]);assert.deepEqual(evaluateEvent(event({category:'scheduled_task',action:'created',approvedChange:'false'})),[])})

test('catalog has complete authored experimental metadata without executable predicates', () => {
  const catalog = listRuleCatalog()
  assert.equal(catalog.length, 6)
  assert.equal(new Set(catalog.map(rule => rule.id)).size, catalog.length)
  for (const rule of catalog) {
    assert.match(rule.version, /^\d+\.\d+\.\d+$/)
    assert.equal(rule.license, 'Apache-2.0')
    assert.equal(rule.origin, 'authored')
    assert.equal(rule.status, 'experimental')
    assert.equal(rule.evaluation, 'single-event')
    assert.ok(rule.owner && rule.rationale && rule.falsePositives.length && rule.requiredFields.length)
    assert.ok(rule.references.every(ref => ref.startsWith('https://attack.mitre.org/techniques/')))
    assert.equal('matches' in rule, false)
    assert.equal(JSON.stringify(rule).includes('=>'), false)
  }
  catalog[0].requiredFields.push('mutated-caller-copy')
  assert.equal(listRuleCatalog()[0].requiredFields.includes('mutated-caller-copy'), false)
})
test('every authored match carries the evaluated revision and every required field has a missing-field negative', () => {
  assert.equal(positives.length, starterRules.length)
  for (const [index, rule] of starterRules.entries()) {
    const input = positives[index]!
    assert.equal(evaluateEvent(event(input)).find(hit => hit.ruleId === rule.id)?.ruleVersion, rule.version)
    for (const field of rule.requiredFields) {
      const missing = { ...input }
      delete missing[field]
      assert.equal(evaluateEvent(event(missing)).some(hit => hit.ruleId === rule.id), false, `${rule.id}: missing ${field}`)
    }
  }
})
