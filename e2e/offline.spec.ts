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
  await expect(page.locator(".offline-status")).toContainText(/offline erfasste(r Eintrag| Einträge) gesendet/, {
    timeout: 20_000,
  });

  const response = await page.request.get("/api/documentation?days=1");
  const payload = (await response.json()) as { entries: Array<{ body: string }> };
  expect(payload.entries.filter((entry) => entry.body === corrected)).toHaveLength(1);
  expect(payload.entries.filter((entry) => entry.body === text)).toHaveLength(0);
});

test("Meine Notizen: archivieren und wiederherstellen, auch ohne Verbindung", async ({ page, context }) => {
  await login(page, ADMIN);
  await page.goto("/c");
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined,
  );
  await page.reload();
  const card = page.locator(".home-notes");
  await expect(card.locator("h2")).toHaveText("Meine Notizen");
  await page.waitForLoadState("networkidle");
  const stamp = Date.now();
  const archivedTitle = `Archiv-Test ${stamp}`;
  const offlineTitle = `Offline-Notiz ${stamp}`;
  const dialog = page.locator(".home-note-panel");

  // Online: Notiz anlegen und ins Archiv verschieben.
  await card.getByRole("button", { name: "Notiz erstellen", exact: true }).click();
  await dialog.getByLabel("Titel").fill(archivedTitle);
  await dialog.getByLabel("Notiz").fill("Wird gleich archiviert");
  await dialog.getByRole("button", { name: "Notiz speichern" }).click();
  await card.getByRole("button", { name: new RegExp(archivedTitle) }).click();
  await dialog.getByRole("button", { name: "Archivieren" }).click();
  await expect(card.getByRole("button", { name: new RegExp(archivedTitle) })).toHaveCount(0);
  await card.getByRole("button", { name: /^Archiv \(\d+\)$/ }).click();
  await expect(card.locator("h2")).toHaveText("Archivierte Notizen");
  await expect(card.getByRole("button", { name: new RegExp(archivedTitle) })).toBeVisible();

  // Offline: archivierte Notiz wiederherstellen und eine neue anlegen.
  await context.setOffline(true);
  await card.getByRole("button", { name: new RegExp(archivedTitle) }).click();
  await dialog.getByRole("button", { name: "Wiederherstellen" }).click();
  await expect(page.locator(".toast")).toContainText("offline vorgemerkt");
  await card.getByRole("button", { name: "Aktuelle" }).click();
  await expect(card.getByRole("button", { name: new RegExp(archivedTitle) })).toContainText("Nicht gesendet");
  await card.getByRole("button", { name: "Notiz erstellen", exact: true }).click();
  await dialog.getByLabel("Titel").fill(offlineTitle);
  await dialog.getByLabel("Notiz").fill("Ohne Verbindung erfasst");
  await dialog.getByRole("button", { name: "Notiz speichern" }).click();
  await expect(card.getByRole("button", { name: new RegExp(offlineTitle) })).toContainText("Nicht gesendet");
  await expect(page.locator(".offline-status")).toContainText("2 Einträge warten");

  // Neu laden ohne Verbindung: beide Änderungen bleiben sichtbar.
  await page.reload();
  await expect(card.getByRole("button", { name: new RegExp(offlineTitle) })).toBeVisible();
  await expect(card.getByRole("button", { name: new RegExp(archivedTitle) })).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator(".offline-status")).toContainText(/offline erfasste(r Eintrag| Einträge) gesendet/, {
    timeout: 20_000,
  });
  const saved = (await (await page.request.get("/api/dashboard/notes")).json()) as {
    notes: Array<{ title: string; archived_at: string | null }>;
  };
  expect(saved.notes.filter((note) => note.title === offlineTitle)).toHaveLength(1);
  expect(saved.notes.find((note) => note.title === archivedTitle)?.archived_at).toBeNull();
});

test("Manifest und Service Worker sind erreichbar (installierbar)", async ({ page }) => {
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(((await manifest.json()) as { start_url: string }).start_url).toBe("/c");
  const worker = await page.request.get("/sw.js", { maxRedirects: 0 });
  expect(worker.status()).toBe(200);
  expect(worker.headers()["cache-control"]).toContain("no-cache");
});
