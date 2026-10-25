"""Automated AA checks for synthetic dashboard states on an owned local Vite server.
This does not establish WCAG conformance. Axe's incomplete findings need manual review.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('VEYCORD_AUDIT_URL', 'http://127.0.0.1:5173')
if urlparse(BASE).hostname not in ['localhost', '127.0.0.1', '::1']:
    raise SystemExit('This fixture audit only runs against a local application')
AXE = ROOT / 'node_modules/axe-core/axe.min.js'
STATES = ['Overview', 'Explore', 'Detections', 'Alerts', 'Cases', 'Sources', 'Reports', 'Settings']
results = []
completed = False


def navigate(page, name):
    button = page.locator('.side-nav').get_by_role('link', name=('Investigation guide' if name=='Reports' else name), exact=False)
    if not button.is_visible():
        page.get_by_role('button', name='Open navigation', exact=True).click()
    href = button.get_attribute("href")
    button.click()
    expect(page.locator('.side-nav a[aria-current="page"]')).to_have_attribute("href", href)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for theme in ['light', 'dark']:
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            context.add_init_script('(value => localStorage.setItem("veycord-demo:v1:theme", JSON.stringify(value)))('+json.dumps(theme)+')')
            page = context.new_page()
            page.goto(BASE + '/demo', wait_until='networkidle')
            page.locator('.startup-screen').wait_for(state='hidden')
            page.add_script_tag(path=str(AXE))
            for width in [1440, 390, 320]:
                page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
                for state in STATES:
                    navigate(page, state)
                    audit = page.evaluate('''async () => {
                      const value = await axe.run(document, {runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
                      return {violations:value.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:value.incomplete.map(v=>({id:v.id,nodes:v.nodes.length,targets:v.nodes.slice(0,20).map(n=>n.target)}))};
                    }''')
                    results.append({'theme': theme, 'width': width, 'page': state, **audit})
                    if state == 'Overview':
                        page.locator('.console-main').evaluate('(el)=>el.scrollTo({top:0,behavior:"instant"})')
                        page.screenshot(path=str(ROOT / f'docs/audit/screenshots/dashboard-{theme}-{width}.png'))
            context.close()
        browser.close()
    completed = True
finally:
    report = {'tool': 'axe-core 4.14.0', 'completed': completed, 'states': results,
              'passed': completed and not any(item['violations'] for item in results),
              'scope': 'Synthetic demo, WCAG A/AA automated rules, light/dark, 1440/390/320px; incomplete rules and manual accessibility remain review work.'}
    (ROOT / 'docs/audit/dashboard-accessibility.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'completed': completed, 'states': len(results), 'violationGroups': sum(len(x['violations']) for x in results), 'passed': report['passed']}))
if not report['passed']:
    raise SystemExit(1)
