"""Real Chromium touch-emulation checks; uses installed Python Playwright."""
import time
from pathlib import Path
from shutil import which
import re
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]

def init(page, rtl=False):
    """The sandbox denies navigation; load the *actual* modules as blob ES modules."""
    html = (BASE / 'demo/index.html').read_text()
    if rtl: html = html.replace('<html lang="en">', '<html lang="en" dir="rtl">')
    for css in ('core.css','modules.css'):
        html = html.replace(f'<link rel="stylesheet" href="../src/{css}" />', f'<style>{(BASE / "src" / css).read_text()}</style>')
    script = re.search(r'<script type="module">(.*?)</script>',html,re.S).group(1)
    html = re.sub(r'<script type="module">.*?</script>','',html,flags=re.S)
    page.set_content(html,wait_until='domcontentloaded')
    urls = {}
    sources = {
      'math':'src/math.mjs', 'core':'src/core.mjs',
      'reel':'src/modules/reel.mjs','contents':'src/modules/contents.mjs',
      'back':'src/modules/back-chip.mjs','landmarks':'src/modules/landmarks.mjs','index':'src/index.mjs',
    }
    for name in ['math','core','reel','contents','back','landmarks','index']:
        src = (BASE / sources[name]).read_text()
        src = src.replace("'./math.mjs'", repr(urls['math'])) if name in ['core','index'] else src
        src = src.replace("'../math.mjs'", repr(urls['math'])) if name in ['reel','back','landmarks'] else src
        if name=='index':
            src = src.replace("'./core.mjs'",repr(urls['core']))
            for relative,key in [('reel','reel'),('contents','contents'),('back-chip','back'),('landmarks','landmarks')]:
                src = src.replace(f"'./modules/{relative}.mjs'",repr(urls[key]))
        urls[name] = page.evaluate('(src) => URL.createObjectURL(new Blob([src], { type: "text/javascript" }))', src)
    script = script.replace("import { createScrollbar, createIntentScrollbar } from '../src/index.mjs';", "const { createScrollbar, createIntentScrollbar } = await import(url);")
    page.evaluate('async (url) => {' + script + '}', urls['index'])
    page.evaluate('window.intentScrollbar.ready')

def touch(cdp, action, x=None, y=None):
    points = [] if action == 'touchEnd' else [{'x': round(x), 'y': round(y)}]
    cdp.send('Input.dispatchTouchEvent', {'type': action, 'touchPoints': points})

def at(page):
    return page.evaluate('window.intentScrollbar.getState().scrollTop')

def grip_point(page):
    g = page.locator('.is-grip').bounding_box()
    assert g, 'grip missing'
    return (g['x'] + g['width'] - 16, g['y'] + g['height']/2)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=which('chromium') or which('google-chrome'), headless=True, args=['--no-sandbox','--allow-file-access-from-files'])
    context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True,has_touch=True)
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    init(page)
    page.wait_for_timeout(200)
    state = page.evaluate('({h: window.intentScrollbar.getState().headings.length, marks: window.intentScrollbar.getState().landmarks.length, max:window.intentScrollbar.getState().geometry.maxScroll, width:innerWidth})')
    print('Initial:',state)
    assert state['width']==390 and state['h']>=70 and state['marks']>=30 and state['max']>1000
    assert page.locator('.is-contents-button').count()==0 and page.locator('.is-reel').count()==1
    assert not page.locator('.is-reel').evaluate('(el)=>el.classList.contains("is-reel-visible")')
    cdp=context.new_cdp_session(page)
    x,y=grip_point(page)
    start=at(page)
    touch(cdp,'touchStart',x,y)
    page.wait_for_timeout(40)
    assert page.locator('.is-reel-visible').count()==1
    touch(cdp,'touchMove',x,y+300)
    page.wait_for_timeout(100)
    during=at(page)
    assert during>start+2000,(during,start)
    assert page.locator('.is-reel').bounding_box()['width']<=236
    page.screenshot(path='/mnt/data/intent-scrollbar/mobile-drag.png')
    touch(cdp,'touchEnd')
    page.wait_for_timeout(100)
    after=at(page)
    assert page.locator('.is-reel-visible').count()==0
    assert page.locator('.is-back-visible').count()==1,'back chip should show after far drag'
    print('Drag:',start,during,after)
    # Cancelling must preview the original offset and not create another back chip.
    x,y=grip_point(page)
    cancel_start=at(page)
    touch(cdp,'touchStart',x,y)
    touch(cdp,'touchMove',x,y-55)
    touch(cdp,'touchMove',x-205,y-90)
    page.wait_for_timeout(100)
    assert page.locator('.is-reel-cancelled').count()==1
    assert page.locator('.is-reel-cancel').inner_text()=='Release to cancel'
    assert abs(at(page)-cancel_start)<2,(at(page),cancel_start)
    touch(cdp,'touchEnd')
    page.wait_for_timeout(90)
    assert abs(at(page)-cancel_start)<2
    # Back chip returns exactly to pre-drag scroll position.
    page.locator('.is-back-chip').click()
    page.wait_for_timeout(120)
    assert abs(at(page)-start)<2,(at(page),start)
    print('Cancel + back: PASS')
    # Contents list and jump.
    page.locator('#toggle-contents').click()
    page.evaluate('window.intentScrollbar.ready')
    page.locator('.is-contents-button').click()
    assert page.locator('.is-contents-sheet').evaluate('(el)=>el.open')
    page.locator('.is-contents-item').nth(25).click()
    page.wait_for_timeout(80)
    assert at(page)>2000
    assert page.locator('.is-contents-sheet').evaluate('(el)=>!el.open')
    print('Contents: PASS')
    # Snapping respects the sticky toolbar height.
    page.evaluate('''() => {
      const state = window.intentScrollbar.getState();
      window.intentScrollbar.jump(state.headings[30].top - state.stickyOffset - 28);
    }''')
    page.wait_for_timeout(70)
    x,y=grip_point(page)
    touch(cdp,'touchStart',x,y)
    touch(cdp,'touchEnd')
    page.wait_for_timeout(70)
    expected=page.evaluate('''() => {const s=window.intentScrollbar.getState();return s.headings[30].top - s.stickyOffset}''')
    assert abs(at(page)-expected)<2,(at(page),expected)
    print('Sticky-aware snapping: PASS')
    # Height changes recompute cached geometry outside the scroll handler.
    old_max=page.evaluate('window.intentScrollbar.getState().geometry.maxScroll')
    page.evaluate('''() => {
      const el = document.createElement('div'); el.id = 'async-extra'; el.style.height='2400px';
      document.querySelector('#document').append(el);
    }''')
    page.wait_for_timeout(140)
    new_max=page.evaluate('window.intentScrollbar.getState().geometry.maxScroll')
    assert new_max > old_max + 2200,(old_max,new_max)
    page.evaluate('document.querySelector("#async-extra").remove()')
    page.wait_for_timeout(100)
    print('Dynamic document re-measurement: PASS')
    # Keyboard navigation exposes the current heading to assistive tech.
    page.locator('.is-grip').focus()
    prev=at(page)
    page.locator('.is-grip').press('PageDown')
    page.wait_for_timeout(60)
    assert at(page)>prev
    assert page.locator('.is-grip').get_attribute('aria-valuetext')
    print('Keyboard navigation: PASS')
    # Core-only mode: all optional modules absent; drag still works.
    page.locator('#mode').click()
    assert page.locator('.is-reel').count()==0
    assert page.locator('.is-back-chip').count()==0
    assert page.locator('.is-marks').count()==0
    x,y=grip_point(page)
    before=at(page)
    touch(cdp,'touchStart',x,y)
    touch(cdp,'touchMove',x,y-75)
    touch(cdp,'touchEnd')
    page.wait_for_timeout(80)
    assert abs(at(page)-before)>100
    print('Core only: PASS')
    assert not errors,errors
    context.close()

    context=browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2,is_mobile=True,has_touch=True,reduced_motion='reduce')
    page=context.new_page()
    init(page)
    assert page.locator('.is-reel').evaluate('(el)=>getComputedStyle(el).transitionDuration')=='0s'
    assert page.evaluate('window.matchMedia("(prefers-reduced-motion: reduce)").matches')
    print('Reduced motion: PASS')
    context.close()
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,color_scheme='dark')
    page=context.new_page()
    # RTL is applied before the instance is mounted.
    # init() injects the ESM module from the local source directory.
    init(page)
    assert page.evaluate('getComputedStyle(document.body).backgroundColor') != 'rgb(245, 246, 250)'
    print('Dark-mode CSS: PASS')
    context.close()
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page=context.new_page()
    init(page,rtl=True)
    state=page.evaluate('window.intentScrollbar.getState()')
    assert state['rtl'] and state['geometry']['trackLeft']<40
    x,y=grip_point(page)
    cdp=context.new_cdp_session(page)
    touch(cdp,'touchStart',x,y)
    page.wait_for_timeout(40)
    assert page.locator('.is-reel-visible').count()==1
    reel=page.locator('.is-reel').bounding_box()
    assert reel['x']>state['geometry']['trackLeft']
    touch(cdp,'touchEnd')
    print('RTL: PASS')
    context.close()
    browser.close()
