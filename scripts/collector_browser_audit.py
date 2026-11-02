"""Render real disposable PostgreSQL collector audit data; artifacts stay ignored."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
(root / ".data").mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.goto(os.environ["VEYCORD_AUDIT_URL"] + "/workspace", wait_until="networkidle")
    page.get_by_label("Service key", exact=True).fill(os.environ["SENTINEL_AUDIT_TOKEN"])
    page.get_by_role("button", name="Connect", exact=True).click()
    audit = page.get_by_role("region", name="Recent audit activity", exact=True)
    expect(audit.get_by_text("Collector credential issued", exact=True)).to_be_visible()
    expect(audit.get_by_text("Collector credential revoked", exact=True)).to_be_visible()
    expect(audit.get_by_text("Collector", exact=True).first).to_be_visible()
    for width in [1440, 320]:
        page.set_viewport_size({"width": width, "height": 1000})
        audit.scroll_into_view_if_needed()
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"{width}px overflow"
        audit.screenshot(path=str(root / f".data/collector-audit-{width}.png"))
    browser.close()
print(json.dumps({"passed": True, "checks": ["issued action", "revoked action", "collector actor", "1440px fit", "320px fit"]}))
