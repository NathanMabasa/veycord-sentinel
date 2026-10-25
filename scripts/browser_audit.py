"""Meaningful local browser regression audit. Requires Python Playwright + Chromium.
Run with the Vite server active: python3 scripts/browser_audit.py
Does not touch the user's browser profile or saved demo state.
"""
import json
import atexit
import sys
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('VEYCORD_AUDIT_URL', 'http://127.0.0.1:5173')
ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / 'docs/audit/screenshots'
SHOTS.mkdir(parents=True, exist_ok=True)
checks = []
errors = []
completed = False
audit_failure = None

def save_report():
    report = {'checks': checks, 'browserErrors': errors, 'completed': completed, 'failure': audit_failure, 'passed': completed and all(c['passed'] for c in checks) and not errors}
    (ROOT / 'docs/audit/browser-results.json').write_text(json.dumps(report, indent=2))

atexit.register(save_report)
def report_exception(kind, value, traceback):
    global audit_failure
    audit_failure = str(value)
    sys.__excepthook__(kind, value, traceback)
sys.excepthook = report_exception

def check(name, condition, detail=None):
    checks.append({'name': name, 'passed': bool(condition), 'detail': detail})
    if not condition:
        raise AssertionError(f'{name}: {detail}')

def visit(page, path):
    page.goto(BASE + path, wait_until='networkidle')
    page.locator('.startup-screen').wait_for(state='hidden')
    page.locator('h1').first.wait_for()

def navigate(page, name):
    nav = page.locator('.side-nav')
    target = nav.get_by_role('button', name=name, exact=False)
    if not target.is_visible():
        page.get_by_role('button', name='Open navigation', exact=True).click()
    target.click()

def no_overflow(page, name):
    sizes = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
    check(name, sizes['scroll'] <= sizes['width'] + 1, sizes)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(7000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for route in ['/','/product','/docs','/roadmap','/security','/community','/docs/api']:
            visit(page,route)
            no_overflow(page,f'public {route} at {width}px')
        visit(page,'/')
        page.screenshot(path=str(SHOTS / f'home-{width}.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1000})
    visit(page,'/')
    page.locator('.site-footer').get_by_role('link',name='Product',exact=True).click()
    expect(page.locator('h1')).to_be_focused()
    check('page navigation resets scroll and focuses heading',page.evaluate('scrollY')==0)
    visit(page,'/docs/api')
    page.get_by_role('combobox',name='Endpoint',exact=True).select_option('health')
    page.get_by_role('button',name='Run request',exact=True).click()
    page.get_by_role('status').filter(has_text='HTTP 200').wait_for()
    check('API explorer reaches live synthetic API','synthetic-demo' in page.locator('.api-explorer>pre').inner_text())
    page.get_by_role('combobox',name='Endpoint',exact=True).select_option('events')
    page.get_by_label('Event search',exact=True).fill('PowerShell')
    page.get_by_role('button',name='Run request',exact=True).click()
    page.get_by_role('status').filter(has_text='HTTP 200').wait_for()
    check('API explorer queries fixtures','evt-7f21a0' in page.locator('.api-explorer>pre').inner_text())
    page.route('**/api/v1/events?*',lambda route: route.fulfill(status=200,content_type='text/html',body='<html>Static fallback</html>'))
    page.get_by_role('button',name='Run request',exact=True).click()
    page.get_by_role('status').filter(has_text='Request unavailable').wait_for()
    check('API explorer explains static-host fallback','unavailable on this host' in page.locator('.api-explorer>pre').inner_text())
    page.unroute('**/api/v1/events?*')
    visit(page,'/demo')
    page.evaluate("localStorage.clear(); localStorage.setItem('veycord-demo:v1:settings', JSON.stringify({workspace:'',retention:'bad',dense:false})); localStorage.setItem('veycord-demo:v1:alerts', '{}'); localStorage.setItem('veycord-demo:v1:cases', '[null]')")
    page.reload(wait_until='networkidle')
    check('malformed storage recovers',page.get_by_role('heading',name='Good morning, Jordan').is_visible())
    page.get_by_role('button',name='Switch to light theme').click()
    page.reload(wait_until='networkidle')
    check('theme survives reload',page.get_by_role('button',name='Switch to dark theme').is_visible())
    page.screenshot(path=str(SHOTS/'dashboard-light.png'),full_page=True)
    page.get_by_role('textbox',name='Search events and hosts').fill('PowerShell')
    check('search filters fixtures',page.locator('tbody tr').count()==1)
    page.get_by_role('button',name='Save search',exact=True).click()
    navigate(page,'Alerts')
    page.get_by_role('button',name='Create case',exact=True).first.click()
    note=page.get_by_role('textbox',name='Analyst note for CASE-2100')
    note.fill('Verified synthetic parent process; follow up with the demo account owner.')
    page.get_by_role('button',name='Close case',exact=True).click()
    check('case closes',page.get_by_role('button',name='Reopen case',exact=True).is_visible())
    page.reload(wait_until='networkidle')
    navigate(page,'Cases')
    check('case note persists','Verified synthetic parent process' in page.get_by_role('textbox',name='Analyst note for CASE-2100').input_value())
    page.get_by_role('button',name='Reopen case',exact=True).click()
    with page.expect_download() as download:
        page.get_by_role('button',name='Export case JSON',exact=True).click()
    payload=json.loads(Path(download.value.path()).read_text())
    check('case JSON export contains note',payload.get('note','').startswith('Verified synthetic'))
    navigate(page,'Alerts')
    page.get_by_role('button',name='Create case',exact=True).first.click()
    check('duplicate case prevented',page.locator('.case-card').count()==1)
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for name in ['Overview','Explore','Detections','Alerts','Cases','Sources','Reports','Settings']:
            navigate(page,name)
            no_overflow(page,f'dashboard {name} at {width}px')
        if width==360:
            page.get_by_role('button',name='Open navigation',exact=True).click()
            check('mobile dialog makes background inert',page.locator('.console-main').evaluate('(el)=>el.inert'))
            page.keyboard.press('Shift+Tab')
            for _ in range(16): page.keyboard.press('Tab')
            check('mobile keyboard focus stays inside navigation',page.locator('.sidebar').evaluate('(el)=>el.contains(document.activeElement)'))
            page.keyboard.press('Escape')
            expect(page.get_by_role('button',name='Open navigation',exact=True)).to_be_focused()
            check('mobile Escape returns focus',page.get_by_role('button',name='Open navigation',exact=True).evaluate('(el)=>document.activeElement===el'))
    page.set_viewport_size({'width':1440,'height':1000})
    navigate(page,'Overview')
    page.get_by_role('button',name='Switch to dark theme').click()
    page.screenshot(path=str(SHOTS/'dashboard-dark.png'),full_page=True)
    check('no browser runtime errors',not errors,errors)
    context.close()
    disabled=browser.new_context(viewport={'width':360,'height':800})
    blocked=disabled.new_page()
    blocked.on('pageerror',lambda error: errors.append(str(error)))
    blocked.add_init_script("Storage.prototype.getItem = function(){throw new DOMException('blocked','SecurityError')}; Storage.prototype.setItem = function(){throw new DOMException('blocked','QuotaExceededError')}")
    visit(blocked,'/demo')
    check('blocked storage still renders dashboard',blocked.get_by_role('heading',name='Good morning, Jordan').is_visible())
    check('blocked storage warns session-only','session' in blocked.locator('.demo-banner').inner_text().lower())
    disabled.close()
    browser.close()

completed=True
report={'checks':checks,'browserErrors':errors,'passed':all(c['passed'] for c in checks)}
(ROOT/'docs/audit/browser-results.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'passed':report['passed'],'checks':len(checks),'browserErrors':errors}))
