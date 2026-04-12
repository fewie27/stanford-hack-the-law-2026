from playwright.async_api import Browser, Error as PlaywrightError

from app.config import settings


async def capture_url_screenshot(browser: Browser, url: str) -> bytes:
    page = await browser.new_page(
        viewport={
            "width": settings.viewport_width,
            "height": settings.viewport_height,
        }
    )
    try:
        await page.goto(
            url,
            wait_until="load",
            timeout=settings.navigation_timeout_ms,
        )
        try:
            await page.wait_for_load_state("networkidle", timeout=settings.screenshot_timeout_ms)
        except PlaywrightError:
            # Sites with long-lived connections may never reach networkidle; proceed with what loaded.
            pass
        return await page.screenshot(type="png", full_page=True, timeout=settings.screenshot_timeout_ms)
    finally:
        await page.close()
