import { expect, test } from "@playwright/test";
import { FAGE, login, watchErrors } from "./support";

// Arbeitsplatz: alle Bausteine (auch Schnellzugriff, Notizen, Heute wichtig und Neuigkeiten) lassen sich verschieben,
// in der Breite ändern, zwischen Kopf- und Hauptbereich wechseln und ausblenden; das Layout bleibt nach dem Neuladen.
test("Arbeitsplatz: alle Bausteine verschieben, Breite und Bereich wählen, ausblenden, gespeichert", async ({
  page,
}) => {
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c");
  const top = page.locator(".home-desk-grid.dashboard-area");
  const main = page.locator(".dashboard-custom-grid.dashboard-area");
  const ids = (area: typeof top) =>
    area
      .locator(":scope > .dashboard-widget")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-widget")));

  // Standard: die drei Karten im Kopfbereich, Neuigkeiten zuerst im Hauptbereich.
  await expect.poll(() => ids(top)).toEqual(["shortcuts", "notes", "today"]);
  expect((await ids(main))[0]).toBe("news");

  await page.getByRole("button", { name: "Arbeitsplatz bearbeiten" }).click();
  // Notizen nach hinten, dann in den Hauptbereich und auf halbe Breite.
  await page.getByRole("button", { name: "Meine Notizen nach hinten" }).click();
  await expect.poll(() => ids(top)).toEqual(["shortcuts", "today", "notes"]);
  await page.getByRole("button", { name: "Meine Notizen in Hauptbereich" }).click();
  await expect.poll(() => ids(top)).toEqual(["shortcuts", "today"]);
  expect(await ids(main)).toContain("notes");
  await page.getByLabel("Breite von Meine Notizen").selectOption("half");
  await expect(main.locator('[data-widget="notes"]')).toHaveClass(/span-6/);
  // Neuigkeiten in den Kopfbereich, Schnellzugriff ausblenden.
  await page.getByRole("button", { name: /Neuigkeiten in Kopfbereich/ }).click();
  await page.getByRole("button", { name: "Schnellzugriff ausblenden" }).click();
  await expect.poll(() => ids(top)).toEqual(["today", "news"]);
  await page.getByRole("button", { name: "Fertig" }).click();

  // Nach dem Neuladen (Layout aus der Datenbank) bleibt alles so.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(() => ids(top)).toEqual(["today", "news"]);
  await expect(main.locator('[data-widget="notes"]')).toHaveClass(/span-6/);
  await expect(page.locator(".home-shortcuts")).toHaveCount(0);

  // Standard wiederherstellen.
  await page.getByRole("button", { name: "Arbeitsplatz bearbeiten" }).click();
  await page.getByRole("button", { name: "Standard wiederherstellen" }).click();
  await expect.poll(() => ids(top)).toEqual(["shortcuts", "notes", "today"]);
  expect(errors).toEqual([]);
});
