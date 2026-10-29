"""Local synthetic navigation regression and automated accessibility evidence."""
import json, os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('VEYCORD_AUDIT_URL', 'http://127.0.0.1:5173')
if urlparse(BASE).hostname not in ['localhost', '127.0.0.1', '::1']:
    raise SystemExit('Navigation audit requires an owned local fixture server')
checks, states, errors = [], [], []
completed = False

def check(name, value):
    checks.append({'name': name, 'passed': bool(value)})
    assert value, name

def visit(page, path='/demo'):
    page.goto(BASE + path, wait_until='networkidle')
    page.locator('.startup-screen').wait_for(state='hidden')
    page.locator('h1').first.wait_for()

def go(page, name):
    link = page.locator('.side-nav').get_by_role('link', name=name, exact=False)
    if not link.is_visible():
        page.get_by_role('button', name='Open navigation', exact=True).click()
    href = link.get_attribute('href')
    link.click()
    expect(page.locator('.side-nav a[aria-current="page"]')).to_have_attribute('href', href)

def audit(page, theme, width, name):
    if not page.evaluate('typeof axe !== "undefined"'):
        # Debugger evaluation works with the built server's script-src self policy.
        # Do not add inline allowances or disable CSP on the application.
        page.evaluate("() => {\n" + (ROOT/'node_modules/axe-core/axe.min.js').read_text() + "\n}")
    value = page.evaluate("""async () => {
      const r = await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
      return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),
      incomplete:r.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))};
    }""")
    states.append({'theme':theme,'width':width,'state':name,**value})

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        visit(page)
        page.screenshot(path=str(ROOT/'docs/audit/screenshots/navigation-expanded-light.png'))
        check('three workflow groups expose eight native page links', page.locator('.nav-group h2').all_text_contents()==['Workspace','Investigations','Manage'] and page.locator('.side-nav a').count()==8)
        check('fictional user profile removed and guide named by its content', page.get_by_text('Jordan Demo',exact=True).count()==0 and page.get_by_role('link',name='Investigation guide',exact=True).is_visible())
        go(page,'Alerts')
        expect(page.get_by_role('heading',name='Alert queue',exact=True)).to_be_focused()
        go(page,'Cases')
        page.go_back()
        expect(page.get_by_role('heading',name='Alert queue',exact=True)).to_be_visible()
        page.go_forward()
        expect(page.get_by_role('heading',name='Investigation cases',exact=True)).to_be_visible()
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('heading',name='Investigation cases',exact=True)).to_be_visible()
        check('page links support focus, Back, Forward and reload', 'view=cases' in page.url)
        go(page,'Alerts')
        page.get_by_role('button',name='Create case',exact=True).first.click()
        expect(page.get_by_role('heading',name='Investigation cases',exact=True)).to_be_visible()
        check('case count derives from open cases', page.locator('.side-nav a[href="/demo?view=cases"] .nav-count').text_content().strip()=='1 open case')
        note = page.get_by_role('textbox',name='Analyst note for CASE-2100',exact=True)
        note.focus()
        page.keyboard.press('Control+b')
        check('sidebar shortcut does not intercept text editing', not page.locator('.console-shell').evaluate('(e)=>e.classList.contains("is-sidebar-collapsed")'))
        page.get_by_role('button',name='Close case',exact=True).click()
        check('closing a case clears the open-case badge',page.locator('.side-nav a[href="/demo?view=cases"] .nav-count').count()==0)
        page.get_by_role('button',name='Reopen case',exact=True).click()
        check('reopening a case restores its badge',page.locator('.side-nav a[href="/demo?view=cases"] .nav-count').text_content().strip()=='1 open case')

        page.get_by_role('heading',name='Investigation cases',exact=True).focus()
        page.keyboard.press('Control+b')
        expect(page.get_by_role('button',name='Expand sidebar',exact=True)).to_be_visible()
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('button',name='Expand sidebar',exact=True)).to_be_visible()
        check('collapse shortcut persists the desktop preference', page.locator('.sidebar').evaluate('(e)=>e.getBoundingClientRect().width')==80)
        alert_link = page.locator('.side-nav').get_by_role('link',name='Alerts',exact=False)
        alert_link.focus()
        expect(page.get_by_role('tooltip')).to_contain_text('Alerts')
        check('collapsed links retain labels and focus hints', 'Alerts' in alert_link.get_attribute('aria-label'))
        page.keyboard.press('Control+k')
        search = page.get_by_role('dialog',name='Search workspace',exact=True)
        query = search.get_by_role('combobox',name='Find a page, event or action',exact=True)
        expect(query).to_be_focused()
        query.fill('PowerShell')
        expect(search.get_by_role('option')).to_have_count(1)
        page.keyboard.press('Enter')
        expect(page.get_by_role('heading',name='PowerShell launched with encoded command',exact=True)).to_be_focused()
        event_url = page.url
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('heading',name='PowerShell launched with encoded command',exact=True)).to_be_visible()
        check('command search opens reloadable event evidence', 'event=evt-7f21a0' in event_url)
        page.get_by_role('button',name='Search workspace',exact=False).click()
        query.fill('zzzz-no-matching-fixture')
        expect(search.get_by_text('No matching pages or events',exact=True)).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.get_by_role('button',name='Search workspace',exact=False)).to_be_focused()
        check('empty search and Escape focus return work', not search.is_visible())
        page.keyboard.press('Control+k')
        query.fill('')
        page.keyboard.press('ArrowDown')
        selected = query.get_attribute('aria-activedescendant')
        check('arrow keys update the selected result', selected=='command-page-Explore')
        page.keyboard.press('Enter')
        expect(page.get_by_role('heading',name='Explore events',exact=True)).to_be_visible()
        check('Enter navigates to the selected page', 'view=events' in page.url)
        page.keyboard.press('Control+k')
        query.fill('dark theme')
        page.keyboard.press('Enter')
        expect(page.locator('.theme-dark')).to_be_visible()
        check('command actions change the actual theme', page.get_by_role('button',name='Switch to light theme').is_visible())
        page.get_by_role('button',name='Expand sidebar',exact=True).click()
        page.locator('.workspace-switch').click()
        picker = page.get_by_role('region',name='Choose workspace',exact=True)
        expect(picker.get_by_role('link',name='Private workspace',exact=False)).to_have_attribute('href','/workspace')
        page.keyboard.press('Escape')
        expect(page.locator('.workspace-switch')).to_be_focused()
        check('workspace picker exposes private mode and restores focus', not picker.is_visible())
        page.locator('.workspace-switch').click()
        picker.get_by_role('link',name='Private workspace',exact=False).click()
        expect(page.get_by_role('heading',name='Investigation workspace',exact=True)).to_be_visible()
        expect(page.get_by_label('Service key',exact=True)).to_be_visible()
        check('private workspace destination works without copying demo data', page.url.endswith('/workspace') and page.get_by_label('Service key',exact=True).is_visible())
        visit(page,'/demo?view=unknown&event=not-a-fixture')
        expect(page.get_by_role('heading',name='Security overview',exact=True)).to_be_visible()
        check('unknown page and event input fail to a usable overview', page.locator('.side-nav a[aria-current="page"]').get_attribute('href')=='/demo')
        page.set_viewport_size({'width':1440,'height':600})
        go(page,'Settings')
        check('short desktop keeps footer reachable and body scrollable', page.get_by_role('link',name='Documentation',exact=True).is_visible() and page.locator('.side-nav').evaluate('(e)=>e.scrollHeight>e.clientHeight'))
        context.close()

        for theme in ['light','dark']:
            context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            context.add_init_script('localStorage.setItem("veycord-demo:v1:theme", '+json.dumps(json.dumps(theme))+')')
            page = context.new_page()
            page.on('pageerror',lambda error: errors.append(str(error)))
            visit(page)
            for width in [1440,768,390,320]:
                page.set_viewport_size({'width':width,'height':1000 if width>760 else 844})
                if width>760:
                    if page.get_by_role('button',name='Collapse sidebar',exact=True).is_visible():
                        page.get_by_role('button',name='Collapse sidebar',exact=True).click()
                else:
                    page.get_by_role('button',name='Open navigation',exact=True).click()
                    check(theme+' '+str(width)+'px drawer blocks background',page.locator('.console-main').evaluate('(e)=>e.inert'))
                audit(page,theme,width,'collapsed-rail' if width>760 else 'mobile-drawer')
                page.screenshot(path=str(ROOT/('docs/audit/screenshots/navigation-'+theme+'-'+str(width)+'.png')))
                page.locator('.workspace-switch').click()
                audit(page,theme,width,'workspace-picker')
                if width==1440 and theme=='light':
                    page.screenshot(path=str(ROOT/'docs/audit/screenshots/navigation-picker-light.png'))
                page.keyboard.press('Escape')
                if width<=760:
                    check(theme+' '+str(width)+'px first Escape closes picker only',page.get_by_role('dialog',name='Workspace navigation',exact=True).is_visible())
                    page.keyboard.press('Shift+Tab')
                    for _ in range(18): page.keyboard.press('Tab')
                    check(theme+' '+str(width)+'px drawer traps focus',page.locator('.sidebar').evaluate('(e)=>e.contains(document.activeElement)'))
                    page.keyboard.press('Escape')
                    expect(page.get_by_role('button',name='Open navigation',exact=True)).to_be_focused()
                page.get_by_role('button',name='Search workspace',exact=False).click()
                audit(page,theme,width,'workspace-search')
                if (width==1440 and theme=='light') or (width==320 and theme=='dark'):
                    page.screenshot(path=str(ROOT/('docs/audit/screenshots/navigation-search-'+theme+'-'+str(width)+'.png')))
                search = page.get_by_role('dialog',name='Search workspace',exact=True)
                search.get_by_role('combobox').fill('no-matching-fixture')
                audit(page,theme,width,'empty-search')
                check(theme+' '+str(width)+'px modal fits the viewport',search.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth+1}'))
                page.keyboard.press('Escape')
            context.close()
        browser.close()
    completed = True
finally:
    report = {'completed':completed,'checks':checks,'accessibilityStates':states,'browserErrors':errors,
              'passed':completed and all(c['passed'] for c in checks) and not errors and not any(s['violations'] for s in states),
              'scope':'Synthetic local navigation; automated WCAG A/AA subset. Incomplete/manual and assistive technology review remain.'}
    (ROOT/'docs/audit/navigation-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'completed':completed,'checks':len(checks),'accessibilityStates':len(states),'violationGroups':sum(len(s['violations']) for s in states),'browserErrors':errors,'passed':report['passed']}))
if not report['passed']:
    raise SystemExit(1)
