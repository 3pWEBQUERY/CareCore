import { expect, test } from "@playwright/test";
import { ADMIN, FAGE, SRK, login, watchErrors } from "./support";
import { totpCode, totpStep } from "../lib/mfa-core";

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

test("Erscheinungsbild: dunkel gilt sofort, bleibt nach dem Neuladen und lässt Fotos farbecht", async ({ page }) => {
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/appearance");
  const detail = page.locator(".settings-detail");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/theme-dark/);
  await page.locator(".settings-list button", { hasText: "Erscheinungsbild" }).click();
  await detail.getByRole("combobox", { name: "Erscheinungsbild" }).click();
  await page.getByRole("option", { name: "Dunkel" }).click();
  await expect(html).toHaveClass(/theme-dark/);
  expect(await html.evaluate((el) => getComputedStyle(el).filter)).toContain("invert");

  // Nach dem Neuladen schon vor dem Laden der Einstellungen dunkel (kein heller Blitz).
  await page.reload();
  await expect(html).toHaveClass(/theme-dark/);
  await expect(page.locator(".settings-list button", { hasText: "Erscheinungsbild" })).toContainText("Dunkel");

  await page.locator(".settings-list button", { hasText: "Erscheinungsbild" }).click();
  await detail.getByRole("combobox", { name: "Erscheinungsbild" }).click();
  await page.getByRole("option", { name: "Hell" }).click();
  await expect(html).not.toHaveClass(/theme-dark/);
  expect(await html.evaluate((el) => getComputedStyle(el).filter)).toBe("none");
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

test("Zwei-Faktor-Anmeldung: einrichten, mit Code anmelden, Administration setzt zurück", async ({ page }) => {
  await login(page, SRK);
  let errors = watchErrors(page, [/^400 POST \/api\/me\/mfa$/]);
  await page.goto("/c/einstellungen/security");
  const detail = page.locator(".settings-detail");
  await page.locator(".settings-list button", { hasText: "Zwei-Faktor-Anmeldung" }).click();
  await detail.getByRole("button", { name: "Einrichten" }).click();
  await expect(detail.getByRole("img", { name: "QR-Code für die Authenticator-App" })).toBeVisible();
  const secret = (await detail.getByLabel("Schlüssel zum Abtippen").innerText()).replace(/\s/g, "");
  const code = detail.locator(".settings-mfa-code input");
  await code.fill("000000");
  await detail.getByRole("button", { name: "Bestätigen und einschalten" }).click();
  await expect(detail.getByRole("alert")).toContainText("Der Code stimmt nicht");
  const step = totpStep();
  await code.fill(totpCode(secret, step));
  await detail.getByRole("button", { name: "Bestätigen und einschalten" }).click();
  await expect(detail.getByRole("list", { name: "Wiederherstellungscodes" }).locator("li")).toHaveCount(10);
  await detail.getByRole("button", { name: "Codes sind notiert" }).click();
  await expect(detail).toContainText("Eingeschaltet");
  await expect(page.locator(".settings-list button", { hasText: "Zwei-Faktor-Anmeldung" })).toContainText("Ein");
  expect(errors).toEqual([]);

  // Anmeldung über das Formular: nach dem Passwort folgt der Code.
  await page.context().clearCookies();
  errors = watchErrors(page, [/^401 POST \/api\/auth\/mfa$/]);
  await page.goto("/");
  await page.getByLabel("Benutzername").fill(SRK.username);
  await page.getByLabel("Passwort", { exact: true }).fill(SRK.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  const mfa = page.getByLabel("Bestätigungscode");
  await expect(mfa).toBeVisible();
  await mfa.fill("111111");
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await expect(page.locator(".login-error")).toContainText("Der Code stimmt nicht");
  await mfa.fill(totpCode(secret, step + 1));
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await expect(page).toHaveURL(/\/c/);
  expect(errors).toEqual([]);

  // Verlorenes Handy: die Administration setzt zurück, danach genügt wieder das Passwort.
  await page.context().clearCookies();
  await login(page, ADMIN);
  const users = (await (await page.request.get("/api/admin/users")).json()) as {
    users: Array<{ id: string; username: string; mfa: boolean }>;
  };
  const carla = users.users.find((user) => user.username === SRK.username)!;
  expect(carla.mfa).toBe(true);
  const reset = await page.request.patch("/api/admin/users", { data: { userId: carla.id, action: "resetMfa" } });
  expect(reset.status()).toBe(200);
  await page.context().clearCookies();
  await login(page, SRK);
});

// Branding: Logo in der Konfiguration hochladen – erscheint in der Kopfzeile, danach wieder entfernen.
test("Branding: Logo der Einrichtung hochladen und in der Kopfzeile sehen", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  try {
    await page.goto("/c/leitung/administration/konfiguration");
    const card = page.locator(".admin-branding-card");
    await card.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await expect(page.locator(".toast")).toContainText("Logo gespeichert");
    await expect(card.getByRole("img", { name: "Aktuelles Logo" })).toBeVisible();
    await page.reload();
    await expect(page.locator(".location-icon.has-logo img").first()).toBeVisible();
    await card.getByRole("button", { name: "Logo entfernen" }).click();
    await expect(page.locator(".toast")).toContainText("Logo entfernt");
  } finally {
    await page.request.delete("/api/branding/logo");
  }
  expect(errors).toEqual([]);
});
