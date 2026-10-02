import { expect, test } from "@playwright/test";
import { ADMIN, login, watchErrors } from "./support";

// Land der Einrichtung: die Administration wählt Deutschland; Konfiguration und Aufnahme zeigen Pflegegrade nach
// SGB XI, die Stammdaten fragen nach der deutschen Sozialversicherungsnummer. Danach wieder Schweiz.
test("Land wählen: Pflegegrade in Konfiguration und Aufnahme, zurück zur Schweiz", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/leitung/administration/konfiguration");
  const card = page.getByRole("region", { name: "Land der Einrichtung" });
  await expect(card.getByRole("button", { name: "Schweiz" })).toHaveAttribute("aria-pressed", "true");
  await expect(card).toContainText("KLV Art. 7a Abs. 3");
  await expect(card).toContainText("mehr als 220 Minuten");

  await card.getByRole("button", { name: "Deutschland" }).click();
  await expect(page.locator(".toast")).toContainText("Land gespeichert: Deutschland");
  await expect(card.getByRole("button", { name: "Deutschland" })).toHaveAttribute("aria-pressed", "true");
  await expect(card).toContainText("SGB XI");
  await expect(card.getByRole("listitem").filter({ hasText: "Pflegegrad 3" })).toContainText("47,5 bis unter 70");

  await page.goto("/c/bewohner");
  await page
    .getByRole("button", { name: /aufnehmen$/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Pflegegrad" }).click();
  await expect(page.getByRole("option", { name: "Pflegegrad 5" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Pflegestufe 12" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Feiertage im Dienstplan: bundesweit statt Kanton Zürich.
  await page.goto("/c/dienstplan/einstellungen?bereich=Feiertage");
  await expect(page.getByRole("button", { name: /Bundesweite Feiertage \d{4} übernehmen/ }).first()).toBeVisible();

  expect((await page.request.put("/api/branding/country", { data: { country: "CH" } })).status()).toBe(200);
  await page.goto("/c/leitung/administration/konfiguration");
  await expect(card.getByRole("button", { name: "Schweiz" })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
