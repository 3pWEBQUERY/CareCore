import { expect, test } from "@playwright/test";
import { navigation, routeFor } from "../app/components/navigation";
import { ADMIN, login, watchErrors } from "./support";

const pages = navigation
  .flatMap((group) => group.modules)
  .flatMap((module) => module.children.map((child) => routeFor(module.id, child)))
  .filter((url): url is string => url !== null);

test.describe("Handy-Ansicht (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("Keine Seite ist breiter als der Bildschirm", async ({ page }) => {
    test.setTimeout(pages.length * 8_000);
    await login(page, ADMIN);
    const errors = watchErrors(page);
    const tooWide: string[] = [];
    for (const url of pages) {
      await page.goto(url);
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      if (width > 390) tooWide.push(`${url}: ${width}px`);
    }
    expect(tooWide).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("Menü öffnet als Panel, führt zum Modul und schliesst mit Escape", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/c");
    const menuButton = page.locator(".bottom-nav").getByRole("button", { name: "Menü" });
    await menuButton.tap();
    const menu = page.getByRole("dialog", { name: "Hauptmenü" });
    await expect(menu).toBeVisible();
    await expect(menu.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await menuButton.tap();
    await menu
      .getByRole("button", { name: /Wunden/ })
      .first()
      .tap();
    await expect(page).toHaveURL(/\/c\/wundmanagement/);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});

test("Tastatur: Seitenpanel übernimmt den Fokus, hält ihn und gibt ihn beim Schliessen zurück", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/wundmanagement");
  const open = page.getByRole("button", { name: "Neue Wunde erfassen" });
  await open.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator(".editor-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  // Umschalt+Tab vom ersten Element springt ans Ende des Panels, Tab von dort wieder an den Anfang.
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: "Wunde erfassen" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Fenster schliessen" })).toBeFocused();
  // Auswahlliste per Tastatur: öffnen, wählen; Escape schliesst nur die Liste, nicht das Panel.
  const type = dialog.getByRole("combobox", { name: "Wundart" });
  await type.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox", { name: "Wundart" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox", { name: "Wundart" })).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(type).not.toHaveText("Dekubitus");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(errors).toEqual([]);
});
