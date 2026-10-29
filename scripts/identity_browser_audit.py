"""Synthetic-only account workflow. Credentials arrive through a mode0600 fixture file."""
import base64, hashlib, hmac, json, os, struct, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect, TimeoutError as PlaywrightTimeoutError

origin = os.environ['VEYCORD_AUDIT_URL']
if urlparse(origin).hostname not in ['127.0.0.1', 'localhost', '::1']:
    raise SystemExit('Identity audit requires an owned loopback fixture')
fixture = json.loads(Path(os.environ['SENTINEL_IDENTITY_FIXTURE']).read_text())
checks, errors = [], []
output = Path(os.environ.get('SENTINEL_IDENTITY_EVIDENCE', '.data/identity-regression'))
output.mkdir(parents=True, exist_ok=True)
def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    assert passed, name
def otp(secret):
    key=base64.b32decode(secret+'='*((8-len(secret)%8)%8))
    digest=hmac.new(key,struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest()
    offset=digest[-1]&15
    return str((struct.unpack('>I',digest[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    pending_requests=set(); responses=[]
    page.on('request',lambda request:pending_requests.add(request.url))
    page.on('requestfinished',lambda request:pending_requests.discard(request.url))
    page.on('requestfailed',lambda request:pending_requests.discard(request.url))
    page.on('response',lambda response:responses.append({'path':urlparse(response.url).path,'status':response.status}))
    try:
        page.goto(origin+'/workspace',wait_until='networkidle')
        expect(page.get_by_role('heading',name='Welcome back',exact=True)).to_be_visible()
        check('workspace routes to the real account screen',page.url.endswith('/workspace'))
        page.get_by_label('Email address',exact=True).fill(fixture['email'])
        page.get_by_label('Password',exact=True).fill(fixture['password'])
        page.get_by_role('button',name='Continue',exact=True).click()
        expect(page.get_by_role('heading',name='Set up your authenticator',exact=True)).to_be_visible()
        check('password alone cannot read stored events',context.request.get(origin+'/api/workspace/v1/events').status==403)
        page.get_by_label('Current password',exact=True).fill(fixture['password'])
        page.get_by_role('button',name='Set up authenticator',exact=True).click()
        expect(page.get_by_label('Authenticator setup key',exact=True)).to_be_visible()
        secret=page.get_by_label('Authenticator setup key',exact=True).input_value()
        check('setup returns recovery codes',len(page.locator('.account-recovery code').all_text_contents())>0)
        check('setup requires saved-code acknowledgement',page.get_by_role('button',name='Verify authenticator',exact=True).is_disabled())
        page.get_by_label('I have saved these recovery codes privately').check()
        page.get_by_label('Current authentication code',exact=True).fill(otp(secret))
        page.get_by_role('button',name='Verify authenticator',exact=True).click()
        expect(page.get_by_role('heading',name='Events',exact=True)).to_be_visible()
        expect(page.get_by_role('button',name='Create case',exact=True).first).to_be_visible()
        check('viewer write control disabled',page.get_by_role('button',name='Create case',exact=True).first.is_disabled())
        check('verified session reads synthetic PostgreSQL events',context.request.get(origin+'/api/workspace/v1/events').status==200)
        check('no operator key field in account workspace',page.get_by_label('Service key',exact=True).count()==0)
        for width in [1440,768,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            check(f'workspace fits {width}px',page.evaluate('document.documentElement.scrollWidth')<=width+1)
            page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
            page.screenshot(path=str(output/f'workspace-{width}.png'),full_page=False)
        # An event list viewport, independently of the tall page's overall fit.
        cards=page.locator('.private-workspace__mobile-events')
        expect(cards).to_be_visible()
        cards.evaluate('(e)=>window.scrollTo({top:e.getBoundingClientRect().top+window.scrollY-100,behavior:"instant"})')
        page.screenshot(path=str(output/'events-320.png'),full_page=False)
        check('mobile event text stays readable',cards.locator('h3').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)>=14'))
        cards.get_by_role('button',name='Details',exact=False).first.click()
        expect(page.get_by_role('dialog')).to_be_visible()
        check('mobile record detail opens',True)
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).not_to_be_visible()
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('heading',name='Events',exact=True)).to_be_visible()
        check('cookie session restores after reload',True)
        # Bounded synthetic burst against the actual backend, not a mocked 429.
        limited=None
        for attempt in range(125):
            response=context.request.get(origin+'/api/workspace/v1/rules')
            if response.status==429:
                limited=response
                break
            assert response.status==200, 'quota probe must return an allowed read or429'
        check('actual account quota returns429',limited is not None)
        check('quota response includes bounded Retry-After',1<=int(limited.headers['retry-after'])<=60)
        try:
            page.reload(wait_until='networkidle',timeout=7000)
        except PlaywrightTimeoutError:
            page.screenshot(path=str(output/'quota-reload-diagnostic.png'),full_page=False)
            (output/'quota-reload-diagnostic.json').write_text(json.dumps({'url':page.url,'headings':page.locator('h1,h2').all_text_contents(),'messages':page.locator('.private-workspace__status').all_text_contents(),'pendingPaths':[urlparse(url).path for url in pending_requests],'responses':responses[-25:]},indent=2))
            raise
        expect(page.locator('.private-workspace__message.is-error')).to_contain_text('Request limit reached.')
        check('workspace explains the wait after429',True)
        page.locator('.private-workspace__message.is-error').scroll_into_view_if_needed()
        page.screenshot(path=str(output/'rate-limited-320.png'),full_page=False)
        page.get_by_role('button',name='Sign out',exact=True).click()
        expect(page.get_by_role('heading',name='Welcome back',exact=True)).to_be_visible()
        check('logout revokes workspace access',context.request.get(origin+'/api/workspace/v1/events').status==401)
        page.screenshot(path=str(output/'login-320.png'),full_page=False)
        check('no browser errors',not errors)
    finally:
        context.close();browser.close()
        (output/'report.json').write_text(json.dumps({'checks':checks,'browserErrors':errors},indent=2)+'\n')
print(json.dumps({'passed':True,'checks':len(checks),'browserErrors':errors}))
