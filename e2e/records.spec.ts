import { expect, test } from "@playwright/test";
import { ADMIN, FAGE, field, login, watchErrors } from "./support";

test("Bewohnerakte: Änderungsprotokoll nur für die Leitung, Pflege sieht alle Bewohner", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/bewohner");
  const rows = page.locator(".resident-list-row");
  await expect(rows.first()).toBeVisible();
  const total = await rows.count();
  await rows.first().click();
  await page.locator(".resident-record-tabs button", { hasText: "Verlauf" }).click();
  await expect(page.locator(".record-audit-card")).toBeVisible();
  expect(errors).toEqual([]);

  await page.context().clearCookies();
  await login(page, FAGE);
  await page.goto("/c/bewohner");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBe(total);
  await rows.first().click();
  await page.locator(".resident-record-tabs button", { hasText: "Verlauf" }).click();
  await expect(page.locator(".resident-record-tabs")).toBeVisible();
  await expect(page.locator(".record-audit-card")).toHaveCount(0);
});

test("Qualität: Bearbeiten einer Massnahme speichert Titel und Termin", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const created = await page.request.post("/api/quality/actions", {
    data: { title: "E2E Doppelkontrolle", dueOn: "2030-01-15" },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  await page.goto("/c/leitung/qualitaet/massnahmen");
  await page.getByText("E2E Doppelkontrolle").first().click();
  await page
    .getByRole("button", { name: /Bearbeiten/ })
    .first()
    .click();
  await field(page, "Massnahme").fill("E2E Doppelkontrolle Hochrisiko");
  await page.locator(".editor-dialog footer button[type=submit]").click();
  await expect(page.locator(".editor-dialog")).toHaveCount(0);
  const list = (await (await page.request.get("/api/quality/actions")).json()) as {
    actions: Array<{ id: string; title: string }>;
  };
  expect(list.actions.find((action) => action.id === id)?.title).toBe("E2E Doppelkontrolle Hochrisiko");
  expect(errors).toEqual([]);
});
