from playwright.sync_api import sync_playwright
import os
import time

def test_delete_button_focus_visibility():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        file_path = os.path.abspath("favorites.html")
        page.goto(f"file://{file_path}")

        mock_html = """
        <div class="favorite-card" data-id="1" tabindex="0">
            <button class="delete-btn" data-id="1" title="Listeden Kaldır" aria-label="Test Ürün favorilerden kaldır">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
            <div class="card-icon">📦</div>
            <div class="card-content">
                <div class="card-title">Test Ürün</div>
            </div>
        </div>
        """

        page.evaluate(f"""
            document.getElementById('favorites-container').innerHTML = `{mock_html}`;
            document.getElementById('empty-state').style.display = 'none';
            document.getElementById('favorites-container').style.display = 'flex';
        """)

        delete_btn = page.locator(".delete-btn")

        # Click on body to reset focus
        page.locator("body").click()

        # Tab into the button.
        # First tab might go to address bar or something, or the first focusable element.
        # We have buttons in header.
        # Let's force focus via keyboard?
        # Alternatively, we can force the state via CSS for testing or just trust focus().

        # NOTE: focus() usually triggers :focus, but :focus-visible depends on heuristics.
        # Chrome usually treats script focus as NOT :focus-visible.
        # But keyboard navigation triggers it.

        # Let's try to tab until we hit it.
        # But we don't know how many tabs.

        # Alternative: just use :focus in the CSS as well?
        # "Always add a `:focus-visible` rule" was the learning.
        # But strictly speaking, if I use mouse to click, I might not want the ring.
        # But for the DELETE button, it is hidden. So if I click it (blindly?), it should appear?
        # Well, I can't click it if it is invisible and 0 opacity usually prevents clicks?
        # Actually opacity 0 elements ARE clickable.
        # So if I click it, it should probably appear.

        # To make it easier to test and safer, maybe I should include `:focus` as well?
        # But `:focus-visible` is the modern standard for "keyboard focus".

        # Let's try to simulate key press.
        delete_btn.focus()
        page.keyboard.press("Tab") # Tab away?
        page.keyboard.press("Shift+Tab") # Tab back?

        # Wait for transition
        time.sleep(0.5)

        focused_opacity = delete_btn.evaluate("el => getComputedStyle(el).opacity")
        print(f"Focused Opacity: {focused_opacity}")

        page.screenshot(path="verification/delete_btn_focus.png")

        browser.close()

if __name__ == "__main__":
    test_delete_button_focus_visibility()
