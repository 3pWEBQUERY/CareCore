import { expect, test } from "@playwright/test";
import { ADMIN, FAGE, SRK, field, login, watchErrors } from "./support";

// Läuft der Reihe nach auf den Demodaten: Metoprolol (Stationsbestand Wohnbereich 2) wird als BtM geführt.
test.describe.configure({ mode: "serial" });

test("BtM: Kennzeichnen, Eingang nur mit gültiger Zweitunterschrift, Kontrolle und BtM-Buch", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page, [/^403 POST \/api\/medication\/stock$/]);
  await page.goto("/c/medikation/btm");
  const medication = page.locator(".btm-medications li", { hasText: "Metoprolol" });
  await medication.getByRole("button", { name: "Als BtM führen" }).click();
  await expect(medication.getByRole("button", { name: "Kennzeichnung aufheben" })).toBeVisible();
  const stock = page.locator(".btm-list article", { hasText: "Metoprolol" });
  await expect(stock).toBeVisible();
  const before = Number((await stock.locator("strong", { hasText: "Tabletten" }).first().innerText()).match(/\d+/)![0]);

  // Eingang: falsches Passwort und eine Pflegehelferin SRK werden abgelehnt, eine FaGe bestätigt.
  await page.getByRole("button", { name: "BtM-Eingang" }).click();
  await field(page, "Menge").fill("10");
  await field(page, "Bemerkung").fill("Lieferung Apotheke");
  await field(page, "Benutzername").fill(FAGE.username);
  await field(page, "Passwort").fill("falsch");
  await page.getByRole("button", { name: "Eingang buchen" }).click();
  await expect(page.locator(".editor-dialog [role=alert]")).toContainText("Zweitunterschrift ist ungültig");
  await field(page, "Benutzername").fill(SRK.username);
  await field(page, "Passwort").fill(SRK.password);
  await page.getByRole("button", { name: "Eingang buchen" }).click();
  await expect(page.locator(".editor-dialog [role=alert]")).toContainText("nicht für Medikation berechtigt");
  await field(page, "Benutzername").fill(FAGE.username);
  await field(page, "Passwort").fill(FAGE.password);
  await page.getByRole("button", { name: "Eingang buchen" }).click();
  await expect(page.locator(".editor-dialog")).toHaveCount(0);
  await expect(stock.locator("strong", { hasText: "Tabletten" }).first()).toContainText(`${before + 10} Tabletten`);

  // Bestandskontrolle ohne Differenz.
  await stock.getByRole("button", { name: "Kontrolle" }).click();
  await field(page, "Gezählter Bestand").fill(String(before + 10));
  await expect(page.locator(".btm-difference")).toContainText("Bestand stimmt");
  await field(page, "Benutzername").fill(FAGE.username);
  await field(page, "Passwort").fill(FAGE.password);
  await page.getByRole("button", { name: "Kontrolle speichern" }).click();
  await expect(page.locator(".editor-dialog")).toHaveCount(0);
  await expect(stock).toContainText("ohne Differenz");

  // BtM-Buch: Kontrolle und Eingang mit Person und Zweitunterschrift.
  await stock.getByRole("button", { name: "BtM-Buch" }).click();
  const book = page.locator(".btm-book");
  await expect(book.locator("tbody tr").nth(0)).toContainText("Bestandskontrolle");
  await expect(book.locator("tbody tr").nth(1)).toContainText("Eingang");
  await expect(book.locator("tbody tr").nth(1)).toContainText("Lena");
  expect(errors).toEqual([]);
});

test("BtM-Kennzeichen erscheint in der Medikamentenrunde", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/medikation/runde");
  await page.locator(".med-round-card button", { hasText: /runde/ }).first().click();
  await page.getByRole("option", { name: /Morgenrunde/ }).click();
  await expect(page.locator(".med-round-card", { hasText: "Metoprolol" }).locator(".btm-badge").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Medikationsrecht: Pflegehelferin SRK nur Ansicht, Fachperson Gesundheit dokumentiert", async ({ page }) => {
  await login(page, SRK);
  await page.goto("/c/medikation/runde");
  await expect(page.locator(".med-round-readonly")).toContainText("Nur Ansicht");
  const denied = await page.request.patch("/api/medication/btm/medications/00000000-0000-4000-8000-000000000000", {
    data: { controlled: true },
  });
  expect(denied.status(), "ohne Medikationsrecht").toBe(403);
  await page.context().clearCookies();
  await login(page, FAGE);
  await page.goto("/c/medikation/runde");
  await expect(page.locator(".med-round-card")).toBeVisible();
  await expect(page.locator(".med-round-readonly")).toHaveCount(0);
});
