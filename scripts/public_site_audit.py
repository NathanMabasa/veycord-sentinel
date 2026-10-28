"""Check the database-free public Worker preview in an isolated browser context."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:4173'
checks, errors = [], []

def check(name, value, detail=None):
    checks.append({'name': name, 'passed': bool(value), 'detail': detail})
    assert value, f'{name}: {detail}'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        for width in [320, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            for route in ['/', '/product', '/docs', '/docs/api', '/security', '/roadmap', '/community', '/demo', '/workspace']:
                response = page.goto(BASE + route, wait_until='networkidle')
                page.locator('.startup-screen').wait_for(state='hidden')
                expect(page.locator('h1').first).to_be_visible()
                dimensions = page.evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1 || e.scrollWidth>e.clientWidth+1).slice(0,8).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',right:e.getBoundingClientRect().right,client:e.clientWidth,scroll:e.scrollWidth,text:e.textContent?.slice(0,70)}))})")
                check(f'{route} renders at {width}px without horizontal overflow', response.status == 200 and dimensions['scroll'] <= width + 1, {'status':response.status, **dimensions})
            check(f'public workspace has no credential form at {width}px', page.get_by_role('textbox').count() == 0)
            expect(page.get_by_role('heading', name='Your workspace. Your infrastructure.')).to_be_visible()
            if width in [320, 1440]:
                page.screenshot(path=str(ROOT / f'docs/audit/screenshots/public-self-hosting-{width}.png'), full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.goto(BASE, wait_until='networkidle')
        check('header GitHub action points to the public source', page.locator('.site-header a').filter(has_text='View on GitHub').get_attribute('href') == 'https://github.com/NathanMabasa/veycord-sentinel')
        page.goto(BASE + '/docs/api', wait_until='networkidle')
        page.get_by_role('combobox', name='Endpoint', exact=True).select_option('events')
        page.get_by_label('Event search', exact=True).fill('PowerShell')
        page.get_by_role('button', name='Run request', exact=True).click()
        expect(page.get_by_role('status').filter(has_text='HTTP 200')).to_be_visible()
        check('public API explorer filters actual fixture responses', 'evt-7f21a0' in page.locator('.api-explorer>pre').inner_text())
        page.goto(BASE + '/demo?view=events', wait_until='networkidle')
        expect(page.locator('.side-nav a[aria-current="page"]')).to_have_attribute('href', '/demo?view=events')
        expect(page.get_by_role('heading', name='Explore events', exact=True)).to_be_visible()
        check('direct demo link selects Events', True)
        page.get_by_role('textbox', name='Search sample events', exact=True).fill('PowerShell')
        expect(page.get_by_role('button', name='Inspect event PowerShell launched with encoded command (evt-7f21a0)', exact=True)).to_be_visible()
        check('demo event search works in the public build', True)
        check('private API is not enabled', context.request.get(BASE + '/api/private/v1/health').status == 404)
        page.set_viewport_size({'width': 320, 'height': 900})
        page.goto(BASE, wait_until='networkidle')
        scope_link = page.locator('.principles-section > .text-button')
        scope_link.evaluate("element => element.style.fontSize = '20px'")
        dimensions = scope_link.evaluate("element => ({right:element.getBoundingClientRect().right,width:innerWidth,scroll:document.documentElement.scrollWidth,whiteSpace:getComputedStyle(element).whiteSpace,iconWidth:element.querySelector('svg').getBoundingClientRect().width})")
        check('homepage scope link wraps with enlarged text at 320px without clipping its icon', dimensions['right'] <= 320 and dimensions['scroll'] <= 321 and dimensions['whiteSpace'] == 'normal' and dimensions['iconWidth'] >= 16, dimensions)
        page.locator('.principles-section').screenshot(path=str(ROOT / 'docs/audit/screenshots/public-home-link-320.png'))
        scope_link.evaluate("element => element.style.removeProperty('font-size')")
        page.goto(BASE + '/workspace', wait_until='networkidle')
        guide_link = page.locator('.self-hosting-guide a.button-primary')
        guide_link.evaluate("element => element.style.fontSize = '20px'")
        dimensions = guide_link.evaluate("element => {const range=document.createRange();range.selectNodeContents(element);return {right:element.getBoundingClientRect().right,textRight:range.getBoundingClientRect().right,scroll:document.documentElement.scrollWidth,whiteSpace:getComputedStyle(element).whiteSpace}}")
        check('self-hosting action wraps enlarged text within a 320px viewport', dimensions['right'] <= 320 and dimensions['textRight'] <= 320 and dimensions['scroll'] <= 321 and dimensions['whiteSpace'] == 'normal', dimensions)
        page.locator('.self-hosting-guide').screenshot(path=str(ROOT / 'docs/audit/screenshots/public-self-hosting-action-320.png'))
        check('no uncaught browser errors', not errors)
    finally:
        (ROOT / 'docs/audit/public-site-browser.json').write_text(json.dumps({'checks': checks, 'browserErrors': errors}, indent=2))
        browser.close()
print(f'Public Worker browser checks passed: {len(checks)}')
