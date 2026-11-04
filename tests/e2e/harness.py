"""Shared Playwright harness: serves the app, runs the same scenario at 390x844 and 1440x900,
checks console errors and horizontal scroll, and offers a mocked OpenAI-compatible endpoint."""
import http.server
import json
import os
import socketserver
import threading

from playwright.sync_api import sync_playwright, expect  # noqa: F401  (re-exported for scenarios)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOCS = os.path.join(ROOT, "docs")
VIEWPORTS = {"mobile": (390, 844), "desktop": (1440, 900)}
RESULTS = {"checks": 0, "viewports": 0}


class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):  # keep test output readable
        pass


class MockEndpoint:
    """Stands in for an OpenAI-compatible chat-completions endpoint served on the same origin."""

    def __init__(self, reply):
        self.reply = reply
        self.calls = []
        self.auth = []

    def handle(self, route):
        request = route.request
        body = json.loads(request.post_data or "{}")
        self.calls.append(body)
        self.auth.append(request.headers.get("authorization"))
        text = self.reply(body.get("messages", []))
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"choices": [{"message": {"role": "assistant", "content": text}}]}),
        )


def check(condition, message):
    RESULTS["checks"] += 1
    if not condition:
        raise AssertionError(message)


def configure_live(page, base, model="mock-model"):
    page.click("#open-settings")
    page.fill("#set-base", base + "/mock/v1")
    page.fill("#set-key", "test-key-123")
    page.fill("#set-model", model)
    page.check("#set-live")
    page.click("#set-save")
    check("Live" in page.inner_text("#mode-badge"), "mode badge should read Live after saving")


def use_demo(page):
    page.click("#open-settings")
    page.uncheck("#set-live")
    page.click("#set-save")
    check("Demo" in page.inner_text("#mode-badge"), "mode badge should read Demo after switching off")


def shot(page, label):
    os.makedirs(DOCS, exist_ok=True)
    page.screenshot(path=os.path.join(DOCS, f"screenshot-{label}.png"), full_page=False)


def run(scenario, reply):
    """Run scenario(page, label, mock, base) at each viewport. reply(messages) -> mock answer text."""
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), _Handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for label, (width, height) in VIEWPORTS.items():
                mock = MockEndpoint(reply)
                context = browser.new_context(viewport={"width": width, "height": height})
                page = context.new_page()
                errors = []
                page.on("console", lambda m, errs=errors: errs.append(m.text) if m.type == "error" else None)
                page.on("pageerror", lambda e, errs=errors: errs.append(str(e)))
                page.route(f"{base}/mock/v1/chat/completions", lambda route, _req: mock.handle(route))
                page.goto(f"{base}/index.html")
                page.wait_for_load_state("networkidle")
                scenario(page, label, mock, base)
                overflow = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
                check(overflow <= 0, f"{label}: page scrolls sideways by {overflow}px")
                check(not errors, f"{label}: console errors: {errors}")
                RESULTS["viewports"] += 1
                context.close()
        finally:
            browser.close()
            httpd.shutdown()
    print(f"e2e: {RESULTS['checks']} checks passed across {RESULTS['viewports']} viewports (mobile 390x844, desktop 1440x900)")
