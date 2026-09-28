import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./support";

// Offline-Betrieb mit Service Worker: die Seite öffnet sich ohne Verbindung, ein Eintrag wird auf dem Gerät
// vorgemerkt und nach der Rückkehr der Verbindung genau einmal gespeichert.
test("Offline: Dokumentation wird vorgemerkt und nach der Rückkehr der Verbindung gesendet", async ({
  page,
  context,
}) => {
  await login(page, ADMIN);
  await page.goto("/c/pflegedokumentation");
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined,
  );
  // Mit aktivem Service Worker neu laden: Seite und Daten liegen danach im Gerätespeicher.
  await page.reload();
  await expect(page.locator("h1").first()).toBeVisible();
  const form = page.locator("form", { has: page.locator("textarea") }).first();
  await expect(form.locator("button.primary-button")).toBeEnabled();
  await page.waitForLoadState("networkidle");

  const text = `Offline-Eintrag ${Date.now()}`;
  await context.setOffline(true);
  await form.locator("textarea").fill(text);
  await form.locator("button.primary-button").click();
  await expect(page.locator(".toast")).toContainText("Offline gespeichert");
  await expect(page.locator(".offline-status")).toContainText("1 Eintrag wartet");

  // Vor dem Senden korrigieren.
  const corrected = `${text} (korrigiert)`;
  await page.locator(".offline-status").getByRole("button", { name: "Anzeigen" }).click();
  await page.locator(".offline-status").getByRole("button", { name: "Bearbeiten" }).click();
  await page.locator(".offline-status-edit textarea").fill(corrected);
  await page.locator(".offline-status-edit").getByRole("button", { name: "Speichern" }).click();
  await expect(page.locator(".offline-status-edit")).toHaveCount(0);

  // Neu laden ohne Verbindung: die Seite kommt aus dem Gerätespeicher.
  await page.reload();
  await expect(page.locator("h1").first()).toContainText("Schnelldokumentation");
  await expect(page.locator(".offline-status")).toContainText("Offline");

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator(".offline-status")).toContainText("gesendet", { timeout: 20_000 });

  const response = await page.request.get("/api/documentation?days=1");
  const payload = (await response.json()) as { entries: Array<{ body: string }> };
  expect(payload.entries.filter((entry) => entry.body === corrected)).toHaveLength(1);
  expect(payload.entries.filter((entry) => entry.body === text)).toHaveLength(0);
});

test("Manifest und Service Worker sind erreichbar (installierbar)", async ({ page }) => {
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(((await manifest.json()) as { start_url: string }).start_url).toBe("/c");
  const worker = await page.request.get("/sw.js", { maxRedirects: 0 });
  expect(worker.status()).toBe(200);
  expect(worker.headers()["cache-control"]).toContain("no-cache");
});
