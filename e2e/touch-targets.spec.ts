import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./support";

// Handy: Namenslinks sind mindestens 24 × 24 px gross (WCAG 2.2, 2.5.8 Zielgrösse Minimum).
test("Tippflächen: Namenslinks in Visite und Teilnahme je Person mindestens 24 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, ADMIN);
  for (const [url, selector] of [
    ["/c/pflegedokumentation/visite", ".visit-resident h3 a"],
    ["/c/alltag/teilnahme", ".participation-report .services-report-table td > a"],
  ] as const) {
    await page.goto(url);
    const links = page.locator(selector);
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    for (let index = 0; index < count; index += 1) {
      const box = (await links.nth(index).boundingBox())!;
      expect(box.height, `${url}: ${await links.nth(index).textContent()}`).toBeGreaterThanOrEqual(24);
      expect(box.width).toBeGreaterThanOrEqual(24);
    }
  }
});
