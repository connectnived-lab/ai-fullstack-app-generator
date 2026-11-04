"""End-to-end smoke test: plan an app from the sample brief in demo mode, inspect files, then the live spec path."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import harness  # noqa: E402
from harness import check, configure_live, expect, shot, use_demo  # noqa: E402

LIVE_SPEC = (
    '{"name":"Garden Log","description":"Track plants.","entities":['
    '{"name":"plant","fields":[{"name":"species","type":"text"},{"name":"watered","type":"boolean"}]}]}'
)


def reply(messages):
    return LIVE_SPEC


def scenario(page, label, mock, base):
    check("Demo" in page.inner_text("#mode-badge"), f"{label}: starts in demo mode")
    page.click("#sample-btn")
    page.click("#run-btn")
    expect(page.locator("#plan")).to_contain_text("Bakery Orders: 3 entities.")
    expect(page.locator("#routes")).to_contain_text("/api/order/:id")
    expect(page.locator("#mode-note")).to_contain_text("planned offline")
    expect(page.locator("#file-preview")).to_contain_text("createApp")
    page.click(".file-btn[data-path='src/runtime.js']")
    expect(page.locator("#file-name")).to_have_text("src/runtime.js")
    expect(page.locator("#file-preview")).to_contain_text("export function routeRequest")
    expect(page.locator("#download-btn")).to_be_visible()
    page.evaluate("window.scrollTo(0, 0)")
    if label == "desktop":
        shot(page, "desktop")
    if label == "mobile":
        shot(page, "mobile")
    check(mock.calls == [], f"{label}: demo mode must not call the endpoint")

    configure_live(page, base)
    page.fill("#brief-input", "Track my plants and whether I watered them.")
    page.click("#run-btn")
    expect(page.locator("#plan")).to_contain_text("Garden Log: 1 entity.")
    expect(page.locator("#mode-note")).to_contain_text("live model")
    check(len(mock.calls) == 1, f"{label}: exactly one model call, got {len(mock.calls)}")
    check(mock.auth[-1] == "Bearer test-key-123", f"{label}: bearer key sent to the endpoint")
    use_demo(page)


if __name__ == "__main__":
    harness.run(scenario, reply)
