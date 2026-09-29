import { expect, test } from "@playwright/test";
import { ADMIN, FAGE, login, watchErrors } from "./support";

// Persönliche Einstellungen und Einstellungen der Einrichtung: gespeichert in der Datenbank, sofort angewendet.
test.describe.configure({ mode: "serial" });

test("Darstellung: Schriftgrösse und Animationen gelten sofort und bleiben nach dem Neuladen", async ({ page }) => {
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/appearance");
  const detail = page.locator(".settings-detail");
  await page.locator(".settings-list button", { hasText: "Schriftgrösse" }).click();
  await detail.getByRole("combobox", { name: "Schriftgrösse" }).click();
  await page.getByRole("option", { name: "Sehr gross" }).click();
  await expect(page.locator("html")).toHaveClass(/text-xlarge/);
  await page.locator(".settings-list button", { hasText: "Animationen" }).click();
  await detail.getByRole("combobox", { name: "Animationen" }).click();
  await page.getByRole("option", { name: "Reduziert" }).click();
  await expect(page.locator("html")).toHaveClass(/motion-reduced/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/text-xlarge/);
  await expect(page.locator(".settings-list button", { hasText: "Schriftgrösse" })).toContainText("Sehr gross");
  // Nur für die Administration: „Einrichtung“ fehlt in der Navigation.
  await expect(page.locator(".settings-nav button", { hasText: "Einrichtung" })).toHaveCount(0);

  // Zurücksetzen unter Datenschutz stellt alles wieder her.
  await page.goto("/c/einstellungen/privacy");
  await page.locator(".settings-list button", { hasText: "Einstellungen zurücksetzen" }).click();
  await detail.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(page.locator("html")).not.toHaveClass(/text-xlarge/);
  await expect(page.locator("html")).not.toHaveClass(/motion-reduced/);
  expect(errors).toEqual([]);
});

test("Benachrichtigungen: Ruhezeit und Hinweiston werden gespeichert", async ({ page }) => {
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/notifications");
  const detail = page.locator(".settings-detail");
  await page.locator(".settings-list button", { hasText: "Ruhezeit" }).click();
  await detail.locator('input[type="time"]').first().fill("21:30");
  await detail.locator('input[type="time"]').last().fill("06:30");
  await detail.getByRole("button", { name: "Zeiten speichern" }).click();
  await detail.locator(".settings-toggle", { hasText: "Ruhezeit einhalten" }).locator("i").click();
  await expect(page.locator(".settings-list button", { hasText: "Ruhezeit" })).toContainText("21:30–06:30 Uhr");
  await page.locator(".settings-list button", { hasText: "Hinweiston" }).click();
  await detail.locator(".settings-toggle", { hasText: "Ton abspielen" }).locator("i").click();
  await expect(page.locator(".settings-list button", { hasText: "Hinweiston" })).toContainText("Ein");

  const saved = await (await page.request.get("/api/me/settings")).json();
  expect(saved.preferences.quietHours).toEqual({ enabled: true, from: "21:30", to: "06:30", critical: true });
  expect(saved.preferences.sound).toBe(true);
  expect(errors).toEqual([]);
});

test("Datenschutz: eigene Daten als JSON herunterladen", async ({ page }) => {
  await login(page, FAGE);
  await page.goto("/c/einstellungen/privacy");
  await page.locator(".settings-list button", { hasText: "Meine Daten herunterladen" }).click();
  const download = page.waitForEvent("download");
  await page.locator(".settings-detail").getByRole("button", { name: "Herunterladen" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^carecore-meine-daten-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await (await import("node:fs/promises")).readFile((await file.path())!, "utf8"));
  expect(data.profile.username).toBe(FAGE.username);
  expect(JSON.stringify(data)).not.toContain("password_hash");
});

test("Einrichtung: Administration ändert eine Einstellung für alle, protokolliert", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/organization");
  const detail = page.locator(".settings-detail");
  const item = page.locator(".settings-list button", { hasText: "Erinnerung Vitalwerte" });
  await item.click();
  await detail.getByLabel(/Wert \(Tage/).fill("5");
  await detail.getByRole("button", { name: "Wert speichern" }).click();
  await expect(item).toContainText("5 Tage");
  await page.reload();
  await expect(page.locator(".settings-list button", { hasText: "Erinnerung Vitalwerte" })).toContainText("5 Tage");
  expect(errors).toEqual([]);
});
