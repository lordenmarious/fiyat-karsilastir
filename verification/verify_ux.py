
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Get absolute path to popup.html
        cwd = os.getcwd()
        popup_path = f'file://{cwd}/popup.html'
        favorites_path = f'file://{cwd}/favorites.html'

        print(f'Navigating to {popup_path}')
        page.goto(popup_path)

        # Verify popup.html focus state
        # Focus on the menu button
        page.focus('#open-favorites')
        page.screenshot(path='verification/popup_focus.png')
        print('Captured popup focus state')

        print(f'Navigating to {favorites_path}')
        page.goto(favorites_path)

        # Verify favorites.html view toggle aria attributes
        list_btn = page.locator('#list-view-btn')
        grid_btn = page.locator('#grid-view-btn')

        # Initial state (List view)
        print(f'List Btn aria-pressed: {list_btn.get_attribute("aria-pressed")}')
        print(f'Grid Btn aria-pressed: {grid_btn.get_attribute("aria-pressed")}')

        # Click Grid View
        grid_btn.click()

        # Verify state change
        print(f'List Btn aria-pressed (after click): {list_btn.get_attribute("aria-pressed")}')
        print(f'Grid Btn aria-pressed (after click): {grid_btn.get_attribute("aria-pressed")}')

        # Check decorative icons aria-hidden
        icon_span = page.locator('#list-view-btn span').first
        print(f'Icon aria-hidden: {icon_span.get_attribute("aria-hidden")}')

        page.screenshot(path='verification/favorites_grid.png')

        browser.close()

if __name__ == '__main__':
    run()
