"""Browser checks for the isolated recognition-rail experiment.

Run: python -m http.server 8765 &
     python3 tests/recognition.e2e.py
Requires: pip install playwright && playwright install chromium
"""
import contextlib
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8765/experiments/recognition/'

@contextlib.contextmanager
def server():
    process = subprocess.Popen(['python3','-m','http.server','8765','--bind','127.0.0.1'],
                               cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(35):
            try:
                urllib.request.urlopen(BASE, timeout=1).read(50)
                break
            except Exception:
                time.sleep(.2)
        else:
            raise RuntimeError('Test server did not start')
        yield
    finally:
        process.terminate()
        process.wait(timeout=5)

with server(), sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True,
                                  is_mobile=True, device_scale_factor=1)
    page = context.new_page()
    failures=[]
    page.on('pageerror',lambda err: failures.append(str(err)))
    page.goto(BASE)
    page.locator('#start').click()
    start=page.evaluate('document.scrollingElement.scrollTop')
    assert page.locator('#rail').is_visible()
    grip=page.locator('#grip').bounding_box()
    x=grip['x']+grip['width']-15
    y=grip['y']+grip['height']/2

    # Previewing is non-destructive: scrollTop remains equal to the origin.
    page.mouse.move(x,y); page.mouse.down(); page.mouse.move(x,690,steps=12)
    assert page.locator('#preview').is_visible()
    assert abs(page.evaluate('document.scrollingElement.scrollTop')-start)<2
    # Cancel zone is a live preview and release does not navigate.
    page.mouse.move(85,690,steps=6)
    assert page.locator('#rail').get_attribute('class').find('cancel')>=0
    page.mouse.up()
    assert abs(page.evaluate('document.scrollingElement.scrollTop')-start)<2

    # Regrab and commit a previewed landmark; exact origin is recoverable.
    grip=page.locator('#grip').bounding_box()
    x=grip['x']+grip['width']-15
    y=grip['y']+grip['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x,155,steps=9);page.mouse.up()
    after=page.evaluate('document.scrollingElement.scrollTop')
    assert abs(after-start)>30
    assert page.locator('.return').is_visible()
    page.locator('.return').click()
    assert abs(page.evaluate('document.scrollingElement.scrollTop')-start)<2

    # Baseline hides rail; outline still available at mobile width.
    page.locator('#mode').click()
    assert page.locator('#rail').is_hidden()
    page.locator('#outline-toggle').click()
    assert page.locator('#modal-outline').is_visible()
    page.locator('#close-outline').click()

    # Reduced-motion must not affect functionality.
    page.emulate_media(reduced_motion='reduce')
    page.locator('#mode').click()
    grip=page.locator('#grip')
    grip.focus()
    grip.press('End')
    assert page.locator('#preview').is_visible()
    grip.press('Escape')
    assert page.locator('#preview').is_hidden()
    assert failures == [], failures
    print(json.dumps({'viewport':'390x844','drag':'pass','cancel':'pass',
                      'back':'pass','baseline':'pass','contents':'pass',
                      'reduced_motion':'pass','page_errors':failures}))
    browser.close()
