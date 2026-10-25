import { demoEvents } from './demo'
import type { EventInput } from '../../server/data-model'

// Explicit opt-in synthetic seed. Event timestamps are relative to the current seed action.
export function createPrivateSamples(): EventInput[] {
  const enrichments: Record<string, EventInput['attributes']> = {
    'evt-7f21a0':{processName:'powershell.exe',commandLine:'powershell.exe -enc <synthetic-payload>'},
    'evt-7f219c':{category:'authentication',failureCount:7},
    'evt-7f217a':{category:'dns',action:'blocked',rareDestination:true},
    'evt-7f2133':{category:'service',action:'created',outsideChangeWindow:true},
    'evt-7f204f':{category:'scheduled_task',action:'created',approvedChange:false},
  }
  return demoEvents.map((event,index)=>({eventId:event.id,timestamp:new Date(Date.now()-index*60000).toISOString(),event:event.event,source:event.source,host:event.host,user:event.user,srcIp:event.srcIp,severity:event.severity.toLowerCase() as EventInput['severity'],outcome:event.outcome,attributes:enrichments[event.id]??{},raw:event.raw}))
}
