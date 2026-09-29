import { expect, test } from "@playwright/test";
import { ADMIN, field, login, watchErrors } from "./support";

// Wunden, Pflegeplanung und RAI auf den Demodaten, der Reihe nach.
test.describe.configure({ mode: "serial" });

test("Wunde anlegen mit Erstbeurteilung und Verlauf dokumentieren", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/wundmanagement");
  await page.getByRole("button", { name: "Neue Wunde erfassen" }).click();
  const dialog = page.locator(".editor-dialog");
  await dialog.getByRole("combobox", { name: "Bewohner" }).click();
  const residentOption = page.getByRole("listbox", { name: "Bewohner" }).getByRole("option").first();
  const residentName = (await residentOption.innerText()).split(" · ")[0].trim();
  await residentOption.click();
  await dialog.getByRole("combobox", { name: "Wundart" }).click();
  await page.getByRole("option", { name: "Ulcus cruris" }).click();
  await field(page, "Lokalisation").fill("Unterschenkel rechts, medial");
  await dialog.getByLabel("Länge in cm").fill("3,2");
  await dialog.getByLabel("Breite in cm").fill("2");
  await field(page, "Durchgeführte Versorgung").fill("Reinigung NaCl 0,9 %, Schaumverband");
  await dialog.getByRole("button", { name: "Wunde erfassen" }).click();
  await expect(dialog).toHaveCount(0);

  const row = page
    .locator("button, article, tr", { hasText: residentName })
    .filter({ hasText: "Unterschenkel rechts" })
    .first();
  await row.click();
  await expect(page.getByText("3,2 × 2 cm").first()).toBeVisible();
  await page.getByRole("button", { name: "Verlauf dokumentieren" }).click();
  await dialog.getByLabel("Länge in cm").fill("2,8");
  await dialog.getByLabel("Breite in cm").fill("1,6");
  await field(page, "Bemerkung").fill("Wundrand rosig, weniger Exsudat");
  await dialog.getByRole("button", { name: "Eintrag speichern" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Wundrand rosig, weniger Exsudat")).toBeVisible();
  await expect(page.getByText("2 Einträge")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Pflegeplan anlegen, Ziel formulieren und evaluieren", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/pflegeplanung");
  await page.getByRole("button", { name: "Pflegeplan anlegen" }).first().click();
  const dialog = page.locator(".editor-dialog");
  await field(page, "Pflegefokus").fill("Mobilität erhalten und Stürze vermeiden");
  await dialog.getByRole("button", { name: "Pflegeplan anlegen" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Pflegeziel hinzufügen" }).first().click();
  await field(page, "Pflegeproblem").fill("Gangunsicherheit nach Sturz");
  await field(page, "Ressourcen").fill("Motiviert, nutzt Rollator");
  await field(page, /^Ziel$/).fill("Geht mit Rollator 20 m im Korridor ohne Sturz");
  await dialog.getByRole("button", { name: "Ziel hinzufügen" }).click();
  await expect(dialog).toHaveCount(0);
  const goal = page.locator("article", { hasText: "Geht mit Rollator 20 m im Korridor ohne Sturz" }).first();
  await expect(goal).toBeVisible();

  await goal.getByRole("button", { name: "Evaluieren" }).click();
  await field(page, "Begründung").fill("Geht 15 m mit Begleitung, Sicherheit nimmt zu");
  await dialog.getByRole("button", { name: "Evaluation speichern" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Geht 15 m mit Begleitung, Sicherheit nimmt zu").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("RAI-Erfassung: alle Bereiche einschätzen (auch per Tastatur) und abschliessen", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/rai");
  await page.getByRole("button", { name: /Peter Aebischer/ }).click();
  await expect(page.getByRole("heading", { name: "interRAI · Peter Aebischer" })).toBeVisible();
  const domains = page.getByRole("combobox", { name: /Einschätzung$/ });
  await expect(domains).toHaveCount(4);

  // Erster Bereich nur mit der Tastatur: öffnen, zwei Optionen weiter, Enter wählt.
  await domains.nth(0).focus();
  await page.keyboard.press("ArrowDown");
  await expect(domains.nth(0)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(domains.nth(0)).toHaveText("1 – Beobachten");
  await expect(domains.nth(0)).toBeFocused();
  for (const index of [1, 2, 3]) {
    await domains.nth(index).click();
    await page.getByRole("option", { name: "2 – Geringe Unterstützung" }).click();
  }
  await page.getByLabel("Fachliche Notiz").fill("Selbständig mit Rollator, braucht Hilfe beim Duschen.");
  await expect(page.getByText("Entwurf · 100%")).toBeVisible();
  await page.getByRole("button", { name: /Erfassung abschliessen/ }).click();

  await expect(page.getByText("Noch nicht gespeichert")).toHaveCount(0);
  await page.goto("/c/rai");
  await expect(page.getByRole("button", { name: /Peter Aebischer.*Zimmer 101/ })).toContainText("Aktuell");
  expect(errors).toEqual([]);
});
