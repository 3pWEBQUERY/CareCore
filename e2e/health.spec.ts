import { expect, test } from "@playwright/test";
import { ADMIN, login, watchErrors } from "./support";

// Öffentlicher Zustand ohne Anmeldung: Datenbank erreichbar, alle Migrationen angewendet, nicht zwischengespeichert.
test("Health: /api/health meldet „ok“ ohne Anmeldung und ohne Geheimnisse", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = (await response.json()) as {
    status: string;
    database: { reachable: boolean };
    migrations: { latest: string | null; pending: string[] | null };
  };
  expect(body.status).toBe("ok");
  expect(body.database.reachable).toBe(true);
  expect(body.migrations.latest).toMatch(/^\d{4}_[\w-]+\.sql$/);
  expect(body.migrations.pending).toEqual([]);
  expect(JSON.stringify(body)).not.toMatch(/postgres(ql)?:\/\/|password/i);
});

// Leitung › Konfiguration: Blutzucker ausschalten – das Feld verschwindet aus der Messung.
test("Vitalparameter ausschalten: Blutzucker erscheint nicht mehr in der Messung", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  try {
    await page.goto("/c/leitung/administration/konfiguration");
    const group = page.getByRole("group", { name: "Vitalparameter wählen" });
    await expect(group.getByRole("button", { name: "Blutzucker" })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "Blutzucker" }).click();
    await expect(page.locator(".toast")).toContainText("Blutzucker wird nicht mehr erfasst");
    await expect(group.getByRole("button", { name: "Blutzucker" })).toHaveAttribute("aria-pressed", "false");

    await page.goto("/c/vitalwerte");
    await page.getByRole("button", { name: "Vitalwerte erfassen" }).first().click();
    const dialog = page.locator(".editor-dialog", { hasText: "Vitalwerte erfassen" });
    await expect(dialog.getByRole("textbox", { name: "Puls" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Blutzucker" })).toHaveCount(0);
  } finally {
    expect((await page.request.patch("/api/settings/vitals", { data: { hidden: [] } })).status()).toBe(200);
  }
  expect(errors).toEqual([]);
});
