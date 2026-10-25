"""Exercise real startup readiness, failure, navigation and reduced-motion states."""
import asyncio
import json
import os
import re
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get('VEYCORD_AUDIT_URL', 'http://127.0.0.1:5173')
ROOT = Path(__file__).resolve().parents[1]
checks = []
completed = False
def check(name, value):
    checks.append({'name': name, 'passed': bool(value)})
    assert value, name

async def main():
    global completed
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width':1280,'height':800},reduced_motion='no-preference')
        page = await context.new_page()
        page.set_default_timeout(8000)
        async def slow_module(route):
            await asyncio.sleep(.8)
            await route.continue_()
        await page.route(re.compile(r'/src/App\.tsx(?:\?.*)?$'),slow_module)
        await page.goto(BASE,wait_until='domcontentloaded')
        loading=page.get_by_role('status',name='Loading Veycord Sentinel',exact=True)
        await loading.wait_for(state='visible')
        check('startup visible during real module loading',await loading.is_visible())
        await page.screenshot(path=str(ROOT/'docs/audit/screenshots/startup-loading.png'))
        await page.locator('.startup-screen').wait_for(state='hidden')
        await page.get_by_role('heading',name='Security data. Clear decisions.').wait_for()
        check('startup releases application interaction',await page.locator('.application-root').evaluate('(el)=>!el.inert && !el.hasAttribute("aria-hidden")'))
        await page.get_by_role('navigation',name='Main navigation',exact=True).get_by_role('link',name='Docs',exact=True).click()
        check('normal navigation does not replay loader',await page.locator('.startup-screen').count()==0)
        await context.close()

        failed = await browser.new_context(viewport={'width':390,'height':844})
        errorpage=await failed.new_page()
        errorpage.set_default_timeout(8000)
        await errorpage.route(re.compile(r'/src/App\.tsx(?:\?.*)?$'),lambda route: route.abort('failed'))
        await errorpage.goto(BASE,wait_until='domcontentloaded')
        await errorpage.get_by_role('alert',name='Application unavailable',exact=True).wait_for()
        check('module failure presents actionable reload',await errorpage.get_by_role('button',name='Reload application').is_visible())
        await errorpage.screenshot(path=str(ROOT/'docs/audit/screenshots/startup-failure.png'))
        await errorpage.unroute(re.compile(r'/src/App\.tsx(?:\?.*)?$'))
        await errorpage.get_by_role('button',name='Reload application').click()
        await errorpage.locator('.startup-screen').wait_for(state='hidden')
        check('reload recovers after module failure',await errorpage.locator('.hero-editorial h1').is_visible())
        await failed.close()

        reduced=await browser.new_context(reduced_motion='reduce',viewport={'width':360,'height':800})
        reducedpage=await reduced.new_page()
        await reducedpage.goto(BASE,wait_until='networkidle')
        await reducedpage.locator('.startup-screen').wait_for(state='hidden')
        check('reduced motion reaches visible content',await reducedpage.locator('.hero-editorial h1').is_visible())
        await reduced.close()

        stalled=await browser.new_context(viewport={'width':390,'height':844})
        stalledpage=await stalled.new_page()
        await stalledpage.add_init_script('window.requestAnimationFrame = () => 1; window.cancelAnimationFrame = () => {}')
        await stalledpage.goto(BASE+'/workspace',wait_until='networkidle')
        await stalledpage.locator('.startup-screen').wait_for(state='hidden')
        check('stalled animation frames cannot block a loaded workspace',await stalledpage.get_by_role('heading',name='Investigation workspace',exact=True).is_visible() and await stalledpage.locator('.application-root').evaluate('(el)=>!el.inert'))
        await stalled.close()

        nojs=await browser.new_context(java_script_enabled=False)
        nojspage=await nojs.new_page()
        await nojspage.goto(BASE,wait_until='load')
        check('no JavaScript has useful guidance',await nojspage.locator('noscript main').is_visible() and 'Enable JavaScript' in await nojspage.locator('noscript main').inner_text())
        check('no JavaScript is not stuck on a loader',not await nojspage.locator('.startup-screen').is_visible())
        await nojs.close()
        await browser.close()
    completed = True

try:
    asyncio.run(main())
finally:
    result={'passed':completed and all(c['passed'] for c in checks),'completed':completed,'checks':checks}
    (ROOT/'docs/audit/bootstrap-results.json').write_text(json.dumps(result,indent=2))
    print(json.dumps({'passed':result['passed'],'checks':len(checks)}))
