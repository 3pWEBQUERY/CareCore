import { expect, test } from "@playwright/test";
import { ADMIN, login, pickDate, watchErrors } from "./support";

// Abrechnung, Grundlagen: Taxen der Einrichtung, Pflegetarif, Stufe und Abwesenheit je Person mit Monatsvorschau.
test("Abrechnung: Taxen erfassen, Stufe und Abwesenheit je Person, Vorschau des Monats", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  const firstOfMonth = `${new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" }).slice(0, 7)}-01`;
  await page.goto("/c/bewohner/abrechnung");
  await expect(page.getByRole("heading", { name: "Abrechnung", level: 1 })).toBeVisible();

  // Taxen der Einrichtung: Regel zum Austrittstag, eine Taxe mit Regel bei Spitalaufenthalt, ein Pflegetarif.
  await page.getByRole("button", { name: "Taxen der Einrichtung" }).click();
  const discharge = page.getByRole("group", { name: "Austrittstag" });
  await discharge.getByRole("button", { name: "Austrittstag nicht verrechnen" }).click();
  await expect(discharge.getByRole("button", { name: "Austrittstag nicht verrechnen" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Neue Taxe" }).click();
  let dialog = page.getByRole("dialog", { name: "Neue Taxe" });
  await dialog.getByLabel("Bezeichnung").fill(`Pension ${stamp}`);
  await dialog.getByRole("combobox", { name: "Art" }).click();
  await page.getByRole("option", { name: "Pension" }).click();
  await dialog.getByRole("combobox", { name: "Bezahlt von" }).click();
  await page.getByRole("option", { name: "Person selbst" }).click();
  await dialog.getByLabel("Preis je Tag (CHF)").fill("120");
  await pickDate(dialog, "Gültig ab", firstOfMonth);
  await dialog.getByRole("group", { name: "Bei Spitalaufenthalt" }).getByRole("button", { name: "Reduzieren" }).click();
  await dialog.getByLabel("Tage voll verrechnet").first().fill("3");
  await dialog.getByLabel("Danach verrechnet (%)").first().fill("50");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog).toHaveCount(0);
  const rates = page.getByRole("list", { name: "Taxen" });
  const row = rates.getByRole("listitem").filter({ hasText: `Pension ${stamp}` });
  await expect(row).toContainText("CHF 120.00");
  await expect(row).toContainText("Spital: 3 Tage voll, danach 50 %");

  await page.getByRole("button", { name: "Pflegestufe 3 · Krankenversicherung" }).click();
  dialog = page.getByRole("dialog", { name: /Pflegetarif erfassen|Taxe bearbeiten/ });
  await dialog.getByLabel("Preis je Tag (CHF)").fill("28.80");
  await pickDate(dialog, "Gültig ab", firstOfMonth);
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pflegestufe 3 · Krankenversicherung" })).toContainText("CHF 28.80");

  // Je Bewohner: Person aus der Kopfzeile, Stufe und Abwesenheit erfassen.
  await page.getByRole("button", { name: "Je Bewohner" }).click();
  await page
    .locator(".topbar")
    .getByRole("button", { name: /^[A-ZÄÖÜ]{1,2} Bewohner / })
    .click();
  const picker = page.getByRole("dialog", { name: "Bewohner auswählen" });
  await picker.getByRole("button", { name: "Alle Wohnbereiche" }).click();
  await picker.getByLabel("Bewohner suchen").fill("Hans Müller");
  await picker
    .getByRole("button", { name: /Hans Müller/ })
    .first()
    .click();
  await expect(picker).toHaveCount(0);
  const preview = page.locator(".billing-preview");
  await expect(preview).toContainText(`Pension ${stamp}`);

  await page.getByRole("button", { name: "Neue Stufe" }).click();
  dialog = page.getByRole("dialog", { name: "Pflegestufe erfassen" });
  await dialog.getByRole("combobox", { name: "Pflegestufe" }).click();
  await page.getByRole("option", { name: /^Pflegestufe 3 ·/ }).click();
  await pickDate(dialog, "Gültig ab", firstOfMonth);
  await dialog.getByLabel("Grundlage (optional)").fill("Einstufung");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Verlauf Pflegestufe" })).toContainText("Pflegestufe 3");
  await expect(preview).toContainText("Pflegestufe 3 · Krankenversicherung");
  await expect(preview).toContainText("Total Monat");

  await page.getByRole("button", { name: "Erfassen", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Abwesenheit erfassen" });
  await dialog.getByRole("button", { name: "Spital" }).click();
  await pickDate(dialog, "Erster ganzer Tag", firstOfMonth);
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog).toHaveCount(0);
  const absences = page.getByRole("list", { name: "Abwesenheiten" });
  await expect(absences).toContainText("Spital");
  await expect(absences.getByRole("button", { name: "Rückkehr eintragen" })).toBeVisible();
  await expect(preview).toContainText("Spitaltage zu 50 %");

  // Stornieren mit Grund.
  await absences.getByRole("button", { name: "Stornieren" }).click();
  dialog = page.getByRole("dialog", { name: "Eintrag stornieren" });
  await dialog.getByLabel("Grund der Stornierung").fill("Testeintrag");
  await dialog.getByRole("button", { name: "Stornieren" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Abwesenheiten" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
