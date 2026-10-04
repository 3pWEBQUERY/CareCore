import { expect, test } from "@playwright/test";
import { ADMIN, login, watchErrors } from "./support";

// Ablage → Neu: Dokument (Word), Tabelle (Excel) und Präsentation (PowerPoint) aus Vorlagen anlegen, bearbeiten
// und automatisch speichern; die gespeicherten Inhalte sind nach erneutem Öffnen da.
test("Ablage: Dokument, Tabelle und Präsentation anlegen, bearbeiten und automatisch speichern", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  await page.goto("/c/carecore-one/ablage");
  await expect(page.getByRole("heading", { name: "Gemeinsame Ablage", level: 1 })).toBeVisible();
  const saved = page.locator(".office-status");

  // Dokument aus der Vorlage „Protokoll“.
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Dokument/ }).click();
  const gallery = page.getByRole("dialog", { name: "Neues Dokument (Word)" });
  await gallery.getByRole("radio", { name: /Protokoll/ }).click();
  await gallery.getByLabel("Name").fill(`Protokoll ${stamp}`);
  await gallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  const editor = page.locator(".office-prose");
  await expect(editor.locator("h1")).toHaveText("Protokoll Teamsitzung");
  await editor.locator("h2", { hasText: "Anwesend" }).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Pflegeteam Ahorn");
  await expect(saved).toContainText("Gespeichert um");
  await page.getByRole("button", { name: "Version speichern" }).click();
  await expect(page.getByText("Version 2 gespeichert")).toBeVisible();
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await expect(page.locator(".files-table")).toContainText(`Protokoll ${stamp}.docx`);
  await page.getByText(`Protokoll ${stamp}.docx`, { exact: true }).dblclick();
  await expect(page.locator(".office-prose")).toContainText("Pflegeteam Ahorn");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();

  // Tabelle: Werte und Formeln, Ergebnis nach dem Speichern.
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Tabelle/ }).click();
  const sheetGallery = page.getByRole("dialog", { name: "Neue Tabelle (Excel)" });
  await sheetGallery.getByLabel("Name").fill(`Werte ${stamp}`);
  await sheetGallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  const grid = page.getByRole("grid", { name: "Blatt Tabelle1" });
  await grid.focus();
  await page.keyboard.type("12");
  await page.keyboard.press("Enter");
  await page.keyboard.type("30");
  await page.keyboard.press("Enter");
  await page.keyboard.type("=SUMME(A1:A2)");
  await page.keyboard.press("Enter");
  await expect(grid.locator("td").filter({ hasText: /^42$/ })).toHaveCount(1);
  await page.keyboard.press("ArrowUp");
  await expect(page.getByLabel("Inhalt der Zelle")).toHaveValue("=SUMME(A1:A2)");
  await expect(saved).toContainText("Gespeichert um");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await page.getByText(`Werte ${stamp}.xlsx`, { exact: true }).dblclick();
  await expect(
    page.getByRole("grid", { name: "Blatt Tabelle1" }).locator("td").filter({ hasText: /^42$/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();

  // Präsentation: Titel ändern, Folie hinzufügen.
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Präsentation/ }).click();
  const deckGallery = page.getByRole("dialog", { name: "Neue Präsentation (PowerPoint)" });
  await deckGallery.getByRole("radio", { name: /Teamsitzung/ }).click();
  await deckGallery.getByLabel("Name").fill(`Sitzung ${stamp}`);
  await deckGallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  await expect(page.locator(".deck-thumb")).toHaveCount(5);
  await page.getByLabel("Titel der Präsentation").fill("Teamsitzung Oktober");
  await page.getByRole("button", { name: "Neue Folie" }).click();
  await page.getByRole("menuitemradio", { name: "Abschnitt" }).click();
  await expect(page.locator(".deck-thumb")).toHaveCount(6);
  await expect(saved).toContainText("Gespeichert um");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await page.getByText(`Sitzung ${stamp}.pptx`, { exact: true }).dblclick();
  await expect(page.locator(".deck-thumb")).toHaveCount(6);
  await expect(page.locator(".deck-thumb").first()).toContainText("Teamsitzung Oktober");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();

  expect(errors).toEqual([]);
});

// Tabelle: eingegebener Text bleibt stehen – auch beim Klick ausserhalb, auf „Fett“ oder beim Schliessen;
// Knöpfe zeigen einen eigenen Tooltip; Umbenennen im Titel.
test("Tabelle: Eingaben gehen nie verloren, Tooltips und Umbenennen", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  await page.goto("/c/carecore-one/ablage");
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Tabelle/ }).click();
  const gallery = page.getByRole("dialog", { name: "Neue Tabelle (Excel)" });
  await gallery.getByLabel("Name").fill(`Eingaben ${stamp}`);
  await gallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  const cell = (row: number, col: number) => page.locator(".sheet-table tbody tr").nth(row).locator("td").nth(col);
  await cell(0, 0).click();
  await page.keyboard.type("Handschuhe Nitril");
  await cell(3, 2).click();
  await expect(cell(0, 0)).toHaveText("Handschuhe Nitril");
  await cell(1, 0).click();
  await page.keyboard.type("Ausserhalb");
  await page.getByLabel("Dateiname").click();
  await expect(cell(1, 0)).toHaveText("Ausserhalb");
  await cell(2, 0).click();
  await page.keyboard.type("Fett");
  await page.getByRole("button", { name: "Fett", exact: true }).click();
  await page.keyboard.press("Enter");
  await expect(cell(2, 0)).toHaveText("Fett");
  await page.getByRole("button", { name: "Kursiv", exact: true }).hover();
  await expect(page.locator(".care-tooltip.visible")).toContainText("Kursiv");
  await expect(page.locator(".care-tooltip.visible kbd")).toHaveText("Ctrl+I");
  const name = page.getByLabel("Dateiname");
  await name.fill(`Eingaben neu ${stamp}`);
  await name.press("Enter");
  await expect(name).toHaveValue(`Eingaben neu ${stamp}.xlsx`);
  await cell(4, 0).click();
  await page.keyboard.type("Beim Schliessen");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await page.getByText(`Eingaben neu ${stamp}.xlsx`, { exact: true }).dblclick();
  await expect(cell(4, 0)).toHaveText("Beim Schliessen");
  await expect(cell(0, 0)).toHaveText("Handschuhe Nitril");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  expect(errors).toEqual([]);
});
