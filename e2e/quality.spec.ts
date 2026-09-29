import { expect, test } from "@playwright/test";
import { ADMIN, field, login, watchErrors } from "./support";

// Ablaufkette Sturz: die Einrichtung legt die Schritte fest, beim Melden entstehen daraus Folgeaufgaben.
test("Qualität: Ablaufkette festlegen, Sturz melden, Folgeaufgaben erscheinen am Ereignis", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  await page.goto("/c/leitung/qualitaet");
  await page.getByRole("button", { name: "Ablaufketten festlegen" }).click();
  const editor = page.locator(".editor-dialog", { hasText: "Ablaufketten festlegen" });
  await expect(editor.getByRole("combobox", { name: "Ereignisart" })).toContainText("Sturz");
  await editor.getByRole("button", { name: "Schritt hinzufügen" }).click();
  await field(page, "Titel").fill(`E2E Vitalzeichen ${stamp}`);
  await editor.getByLabel("Schritt 1: fällig nach Stunden").fill("1");
  await editor.getByRole("combobox", { name: "Schritt 1: Kategorie" }).click();
  await page.getByRole("option", { name: "Vitalwerte" }).click();
  await editor.getByRole("button", { name: "Ablaufkette speichern" }).click();
  await expect(page.locator(".toast")).toContainText("Ablaufkette „Sturz“ gespeichert");
  await expect(page.locator(".quality-workflow-card")).toContainText("Sturz: 1 Schritt");

  try {
    await page.getByRole("button", { name: "Ereignis melden" }).click();
    const report = page.locator(".editor-dialog", { hasText: "Ereignis melden" });
    await expect(report.locator(".quality-workflow-hint")).toContainText("1 Folgeaufgabe");
    await report.getByRole("combobox", { name: "Bewohner" }).click();
    await page.getByRole("listbox", { name: "Bewohner" }).getByRole("option").nth(1).click();
    await field(page, "Kurztitel").fill(`E2E Sturz ${stamp}`);
    await field(page, "Was ist passiert?").fill("Neben dem Bett gefunden, ansprechbar");
    await report.getByRole("button", { name: "Ereignis melden" }).click();
    await expect(page.locator(".toast")).toContainText("1 Folgeaufgabe erstellt");

    await page
      .locator(".quality-timeline-list article", { hasText: `E2E Sturz ${stamp}` })
      .getByRole("button", { name: "Prüfen" })
      .click();
    await expect(page.locator("dd", { hasText: "0 von 1 erledigt" })).toBeVisible();
    const tasks = (await (await page.request.get("/api/tasks?scope=team")).json()) as {
      tasks: Array<{ title: string }>;
    };
    expect(tasks.tasks.some((task) => task.title === `E2E Vitalzeichen ${stamp}`)).toBe(true);
  } finally {
    // Andere Klicktests melden ebenfalls Stürze: Ablaufkette wieder entfernen.
    expect((await page.request.put("/api/quality/workflows", { data: { type: "Sturz", steps: [] } })).status()).toBe(
      200,
    );
  }
  expect(errors).toEqual([]);
});

// Resident 360: alle Bewohner mit Stand aus allen Modulen; Filter nach Stufe, Zeile öffnet die Akte.
test("Kennzahlen Bewohner: Übersicht je Bewohner, Filter und Sprung in die Akte", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/leitung/kennzahlen/bewohner");
  await expect(page.getByRole("heading", { name: "Bewohnerübersicht" })).toBeVisible();
  const rows = page.locator(".resident-insights-row");
  const filters = page.getByRole("group", { name: "Bewohner filtern" });
  const all = filters.getByRole("button", { name: /^Alle \d+$/ });
  await expect(all).toBeVisible();
  const total = Number((await all.textContent())?.replace(/\D/g, ""));
  expect(total).toBeGreaterThan(0);
  await expect(rows).toHaveCount(total);
  const critical = filters.getByRole("button", { name: /^Kritisch \d+$/ });
  const criticalCount = Number((await critical.textContent())?.replace(/\D/g, ""));
  await critical.click();
  await expect(rows).toHaveCount(criticalCount);
  await all.click();
  const name = (await rows.first().locator(".resident-insights-person strong").textContent()) ?? "";
  await rows.first().click();
  await expect(page).toHaveURL(/\/c\/bewohner\?resident=/);
  await expect(page.locator(".resident-record-layer")).toContainText(name);
  expect(errors).toEqual([]);
});
