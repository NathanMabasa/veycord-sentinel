"""Synthetic-only private workspace audit, invoked by the isolated PostgreSQL test.
Requires a built dist, Python Playwright/Chromium. Secrets arrive via private env only.
"""
import json, os
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ['VEYCORD_AUDIT_URL']
TOKEN=os.environ['SENTINEL_AUDIT_TOKEN']
checks=[]
completed=False
def check(name, condition):
    checks.append({'name':name,'passed':bool(condition)})
    assert condition, name
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1000})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        check('private API denies anonymous access',page.request.get(BASE+'/api/private/v1/summary').status==401)
        page.goto(BASE+'/workspace',wait_until='networkidle')
        expect(page.get_by_label('Service key',exact=True)).to_be_visible()
        check('empty disconnected screen renders',page.get_by_text('Connect before viewing stored data',exact=True).is_visible())
        page.get_by_label('Service key',exact=True).fill(TOKEN)
        page.get_by_role('button',name='Connect',exact=True).click()
        expect(page.get_by_role('button',name='Disconnect',exact=True)).to_be_visible()
        summary=page.get_by_role('region',name='Stored data summary')
        expect(summary.locator('strong').first).to_have_text('0')
        check('real database initially empty',True)
        activity=page.get_by_role('region',name='Event activity',exact=True)
        expect(activity.get_by_text('No stored events in this 24-hour window.',exact=True)).to_be_visible()
        check('empty database analytics has no fabricated activity',True)
        page.get_by_role('button',name='Add synthetic sample events').click()
        expect(summary.locator('strong').nth(0)).to_have_text('8')
        expect(summary.locator('strong').nth(1)).to_have_text('5')
        check('UI ingestion persists 8 events and evaluates 5 findings',True)
        activity.get_by_text('Hourly counts (UTC)',exact=True).click()
        hourly=activity.get_by_role('list',name='Hourly event counts, timestamps in UTC',exact=True)
        expect(hourly.locator('li')).to_have_count(24)
        check('actual hourly analytics sums to 8 accepted records',sum(int(x.split()[0].replace(',','')) for x in hourly.locator('li span').all_text_contents())==8)
        activity.get_by_text('Hourly counts (UTC)',exact=True).click()
        operations=page.get_by_role('region',name='Operations',exact=True)
        expect(operations.get_by_text('8 / 100,000',exact=True)).to_be_visible()
        expect(page.get_by_role('region',name='Recent audit activity',exact=True).get_by_text('Events ingested',exact=True)).to_be_visible()
        check('capacity and mutation audit reflect real ingestion',True)
        page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(ROOT/'docs/audit/screenshots/private-workspace-overview-1440.png'))
        page.get_by_role('button',name='Details',exact=True).first.click()
        expect(page.get_by_role('dialog').filter(has=page.get_by_role('heading',name='Normalized attributes'))).to_be_visible()
        page.get_by_role('button',name='Close event details').click()
        check('event evidence dialog opens and closes',True)
        page.get_by_role('button',name='Create case',exact=True).first.click()
        dialog=page.get_by_role('dialog',name='Create a case',exact=True)
        dialog.get_by_label('Case title',exact=True).fill('Synthetic browser investigation')
        dialog.get_by_role('button',name='Create case',exact=True).click()
        expect(page.get_by_role('heading',name='Synthetic browser investigation',exact=True)).to_be_visible()
        check('case creation accepts empty optional note',True)
        page.get_by_label('Investigation notes',exact=True).fill('Synthetic evidence reviewed.')
        with page.expect_response(lambda r:'/api/private/v1/cases/' in r.url and r.request.method=='PATCH') as saved:
            page.get_by_role('button',name='Save notes',exact=True).click()
        check('case note update accepted',saved.value.status==200)
        page.get_by_role('button',name='Close case',exact=True).click()
        expect(summary.locator('strong').nth(2)).to_have_text('0')
        check('case notes save and case closes in database',True)
        audit_region=page.get_by_role('region',name='Recent audit activity',exact=True)
        expect(audit_region.get_by_text('Case updated',exact=True).first).to_be_visible()
        check('audit does not expose private case note text','Synthetic evidence reviewed.' not in audit_region.inner_text())
        check('credential is absent from persistent browser storage',page.evaluate('(token)=>!JSON.stringify([localStorage,sessionStorage]).includes(token)',TOKEN))
        page.get_by_label('Search event, host, or source',exact=True).fill('encoded')
        page.get_by_role('button',name='Apply filters',exact=True).click()
        expect(page.locator('.private-workspace__table tbody tr')).to_have_count(1)
        check('stored event filter returns matching evidence',True)
        page.get_by_label('Search event, host, or source',exact=True).fill('')
        page.get_by_role('button',name='Apply filters',exact=True).click()
        expect(page.locator('.private-workspace__table tbody tr')).to_have_count(8)
        for hours in [1,24,168,720]:
            page.get_by_label('Time range',exact=True).select_option(str(hours))
            with page.expect_response(lambda r:'/api/private/v1/events?' in r.url and r.request.method=='GET') as ranged:
                page.get_by_role('button',name='Apply filters',exact=True).click()
            params=parse_qs(urlparse(ranged.value.url).query)
            elapsed=(datetime.fromisoformat(params['to'][0].replace('Z','+00:00'))-datetime.fromisoformat(params['from'][0].replace('Z','+00:00'))).total_seconds()
            check(f'event time range {hours}h is sent as bounded API timestamps',ranged.value.status==200 and elapsed==hours*3600)
        page.get_by_label('Time range',exact=True).select_option('24')
        page.get_by_role('button',name='Apply filters',exact=True).click()
        expect(page.locator('.private-workspace__table tbody tr')).to_have_count(8)
        bulk=[{'eventId':f'pagination-{i}','timestamp':'2026-10-24T00:00:00.000Z','event':f'Synthetic pagination event {i}','source':'synthetic-pagination','host':'fixture.example.test','severity':'low'} for i in range(55)]
        # Match the application clock rather than relying on a fixed test date.
        now=page.evaluate('new Date().toISOString()')
        for event in bulk:event['timestamp']=now
        bulk[0]['event']='Synthetic pagination review ' + 'LongUnbrokenEvidence'*18
        bulk[0]['host']='host-' + 'x'*200 + '.example.test'
        response=page.request.post(BASE+'/api/private/v1/events',headers={'Authorization':'Bearer '+TOKEN},data={'events':bulk})
        check('bounded synthetic pagination batch accepted',response.status==202)
        page.get_by_role('button',name='Refresh data',exact=True).click()
        expect(page.locator('.private-workspace__table tbody tr')).to_have_count(50)
        page.get_by_role('button',name='Load next 50 events',exact=True).click()
        expect(page.locator('.private-workspace__table tbody tr')).to_have_count(63)
        check('cursor pagination loads all 63 rows without changing range',True)
        page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(ROOT/'docs/audit/screenshots/private-workspace-desktop.png'),full_page=True)
        page.get_by_role('button',name='Disconnect',exact=True).click()
        expect(page.get_by_label('Service key',exact=True)).to_have_value('')
        check('disconnect clears key and private views',page.get_by_text('Connect before viewing stored data',exact=True).is_visible())
        page.get_by_label('Service key',exact=True).fill(TOKEN)
        page.get_by_role('button',name='Connect',exact=True).click()
        expect(page.get_by_label('Investigation notes',exact=True)).to_have_value('Synthetic evidence reviewed.')
        expect(page.get_by_role('button',name='Reopen case',exact=True)).to_be_visible()
        check('database case survives reconnect',True)
        page.get_by_label('Search event, host, or source',exact=True).fill('encoded')
        page.get_by_role('button',name='Apply filters',exact=True).click()
        expect(page.locator('.private-workspace__table tbody tr')).to_have_count(1)
        for width in [1440,1024,768,390,360,320]:
            page.set_viewport_size({'width':width,'height':900 if width>680 else 844})
            check(f'{width}px has no document overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.body.scrollWidth<=innerWidth'))
            page.evaluate("""() => {
                const section=document.getElementById('private-events-title');
                const header=document.querySelector('.site-header');
                window.scrollTo({top:scrollY+section.getBoundingClientRect().top-header.getBoundingClientRect().height-20,behavior:'instant'});
            }""")
            check(f'{width}px sticky header stays at viewport top',page.locator('.site-header').evaluate('(e)=>Math.abs(e.getBoundingClientRect().top)<=1'))
            check(f'{width}px event heading stays below header',page.evaluate("document.getElementById('private-events-title').getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom"))
            if width<=680:
                cards=page.get_by_role('list',name='Stored events',exact=True)
                expect(cards).to_be_visible()
                expect(page.get_by_role('region',name='Stored event table',exact=True)).not_to_be_visible()
                card=cards.locator('li').first
                expect(card.get_by_role('heading')).to_have_text('PowerShell launched with encoded command')
                check(f'{width}px all event metadata remains visible',all(card.get_by_text(label,exact=True).is_visible() for label in ['Source','Host','Severity']))
                check(f'{width}px event content has readable sizes and non-overlapping blocks',card.evaluate("""(card)=>{
                    const blocks=['h3','time','dl','button'].map(s=>card.querySelector(s));
                    const bounds=card.getBoundingClientRect();
                    return blocks.every((e,i)=>{
                        const r=e.getBoundingClientRect();
                        return r.left>=bounds.left && r.right<=bounds.right+1 && e.scrollWidth<=e.clientWidth+1 && (i===0 || blocks[i-1].getBoundingClientRect().bottom<=r.top+1);
                    }) && parseFloat(getComputedStyle(blocks[0]).fontSize)>=16 && blocks[3].getBoundingClientRect().height>=44;
                }"""))
                card.screenshot(path=str(ROOT/f'docs/audit/screenshots/private-event-card-{width}.png'))
                card.get_by_role('button',name='Details',exact=False).click()
                expect(page.get_by_role('dialog').filter(has=page.get_by_role('heading',name='Normalized attributes'))).to_be_visible()
                page.get_by_role('button',name='Close event details').click()
                check(f'{width}px mobile evidence action opens the stored event',True)
                if width==390:
                    # Capture at scroll zero: full-page screenshots taken mid-scroll can put sticky chrome in the middle of the image.
                    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
                    page.screenshot(path=str(ROOT/'docs/audit/screenshots/private-workspace-mobile.png'),full_page=True)
                    page.get_by_role('list',name='Stored events',exact=True).scroll_into_view_if_needed()
            else:
                table=page.get_by_role('region',name='Stored event table',exact=True)
                expect(table).to_be_visible()
                check(f'{width}px table keeps readable cells and all columns',table.evaluate("""(box)=>{
                    const row=box.querySelector('tbody tr');
                    const cells=[...row.cells];
                    return cells.length===6 && cells.every((cell,i)=>parseFloat(getComputedStyle(cell).fontSize)>=(cell.classList.contains('is-mono')?12:14) && (i===0 || cells[i-1].getBoundingClientRect().right<=cell.getBoundingClientRect().left+1));
                }"""))
                if width==768:
                    table.scroll_into_view_if_needed()
                    table.evaluate('(e)=>{e.scrollLeft=0}')
                    table.focus()
                    table.press('ArrowRight')
                    page.wait_for_function("() => document.querySelector('.private-workspace__table-wrap').scrollLeft>0")
                    check('tablet table supports keyboard horizontal scrolling',True)
            # This is the actual scrolled viewport, not a full-page sticky-header composite.
            page.screenshot(path=str(ROOT/f'docs/audit/screenshots/private-workspace-scroll-{width}.png'))
        page.get_by_label('Search event, host, or source',exact=True).fill('LongUnbrokenEvidence')
        page.get_by_role('button',name='Apply filters',exact=True).click()
        long_card=page.get_by_role('list',name='Stored events',exact=True).locator('li').first
        expect(long_card.get_by_role('heading')).to_contain_text('LongUnbrokenEvidence')
        check('320px unbroken event and host values wrap inside their card',long_card.evaluate("(e)=>[...e.querySelectorAll('h3,dd')].every(n=>n.scrollWidth<=n.clientWidth+1)"))
        long_card.screenshot(path=str(ROOT/'docs/audit/screenshots/private-event-long-value-320.png'))
        page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(ROOT/'docs/audit/screenshots/private-workspace-top-320.png'))
        check('no browser runtime exceptions',not errors)
        completed=True
        browser.close()
finally:
    (ROOT/'docs/audit/private-browser-results.json').write_text(json.dumps({'checks':checks,'completed':completed,'passed':completed and all(x['passed'] for x in checks)},indent=2))
