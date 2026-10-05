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

// Dokument: Inhaltsverzeichnis folgt den Überschriften, Zeilenabstand, hoch-/tiefgestellt und Fussnoten bleiben gespeichert.
test("Dokument: Inhaltsverzeichnis, Zeilenabstand, hoch-/tiefgestellt und Fussnoten", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  await page.goto("/c/carecore-one/ablage");
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Dokument/ }).click();
  const gallery = page.getByRole("dialog", { name: "Neues Dokument (Word)" });
  await gallery.getByLabel("Name").fill(`Bericht ${stamp}`);
  await gallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  const editor = page.locator(".office-prose");
  await editor.click();

  await page.getByRole("button", { name: "Inhaltsverzeichnis" }).click();
  const toc = editor.locator(".office-toc");
  await expect(toc).toContainText("Noch keine Überschriften");
  await page.keyboard.press("ArrowDown");
  await page.getByRole("button", { name: "Formatvorlage" }).click();
  await page.getByRole("menuitemradio", { name: /Überschrift 1/ }).click();
  await page.keyboard.type("Einleitung");
  await expect(toc.getByRole("button", { name: "Einleitung" })).toBeVisible();
  await page.keyboard.press("Enter");

  // H₂O mit tiefgestellter 2, m² mit hochgestellter 2.
  await page.keyboard.type("H");
  await page.getByRole("button", { name: "Tiefgestellt" }).click();
  await page.keyboard.type("2");
  await page.getByRole("button", { name: "Tiefgestellt" }).click();
  await page.keyboard.type("O auf 20 m");
  await page.keyboard.press("Control+.");
  await page.keyboard.type("2");
  await expect(page.getByRole("button", { name: "Hochgestellt" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Control+.");
  await expect(editor.locator("sub")).toHaveText("2");
  await expect(editor.locator("sup")).toHaveText("2");

  await page.getByRole("button", { name: "Zeilenabstand" }).click();
  await page.getByRole("menuitemradio", { name: "1,5" }).click();
  await expect(editor.locator("p[data-line-spacing='1.5']")).toHaveCount(1);

  await page.getByRole("button", { name: "Fussnote" }).click();
  await page.getByLabel("Text der Fussnote").fill("Gemäss Hygienerichtlinie");
  await page.getByRole("button", { name: "Einfügen", exact: true }).click();
  await expect(editor.locator(".office-footnote")).toHaveCount(1);
  const note = page.getByLabel("Fussnote 1", { exact: true });
  await expect(note).toHaveValue("Gemäss Hygienerichtlinie");
  await note.fill("Gemäss Hygienerichtlinie 2026");

  await expect(page.locator(".office-status")).toContainText("Gespeichert um");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await page.getByText(`Bericht ${stamp}.docx`, { exact: true }).dblclick();
  const reopened = page.locator(".office-prose");
  await expect(reopened.locator(".office-toc").getByRole("button", { name: "Einleitung" })).toBeVisible();
  await expect(reopened.locator("sub")).toHaveText("2");
  await expect(reopened.locator("sup")).toHaveText("2");
  await expect(reopened.locator("p[data-line-spacing='1.5']")).toHaveCount(1);
  await expect(page.getByLabel("Fussnote 1", { exact: true })).toHaveValue("Gemäss Hygienerichtlinie 2026");
  await page.getByRole("button", { name: "Fussnote 1 löschen" }).click();
  await expect(reopened.locator(".office-footnote")).toHaveCount(0);
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  expect(errors).toEqual([]);
});

// Präsentation: freie Objekte (Textfeld, Form, Tabelle, Diagramm) einfügen, verschieben und gespeichert wiederfinden.
test("Präsentation: Textfeld, Form, Tabelle und Diagramm auf der Folie", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  await page.goto("/c/carecore-one/ablage");
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Präsentation/ }).click();
  const gallery = page.getByRole("dialog", { name: "Neue Präsentation (PowerPoint)" });
  await gallery.getByLabel("Name").fill(`Objekte ${stamp}`);
  await gallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  const stage = page.locator(".deck-stage");
  await expect(stage).toBeVisible();

  await page.getByRole("button", { name: "Textfeld einfügen" }).click();
  await page.keyboard.type("Freies Textfeld");
  await expect(stage.locator(".deck-item.type-text")).toContainText("Freies Textfeld");

  await page.getByRole("button", { name: "Form einfügen" }).click();
  await page.getByRole("menuitemradio", { name: "Ellipse" }).click();
  const shape = stage.locator(".deck-item.type-shape");
  await shape.dblclick();
  await page.getByLabel("Text der Form").fill("Wichtig");
  await page.keyboard.press("Escape");
  // Verschieben mit der Maus und mit den Pfeiltasten.
  const before = await shape.boundingBox();
  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
  await page.mouse.down();
  await page.mouse.move(before!.x + before!.width / 2 - 200, before!.y + before!.height / 2 + 80, { steps: 5 });
  await page.mouse.up();
  const after = await shape.boundingBox();
  expect(Math.round(before!.x - after!.x)).toBeGreaterThan(150);
  await shape.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("toolbar", { name: "Form" })).toBeVisible();
  await page.getByRole("button", { name: "Füllfarbe" }).click();
  await page.getByRole("button", { name: "Rot", exact: true }).click();

  await page.getByRole("button", { name: "Tabelle einfügen" }).click();
  await page.getByRole("button", { name: "2 Zeilen, 2 Spalten" }).click();
  await page.getByLabel("Zelle 1/1").fill("Wohnbereich");
  await page.getByLabel("Zelle 2/1").fill("Ahorn");
  await page.getByRole("button", { name: "Zeile unterhalb einfügen" }).click();
  await expect(stage.locator(".deck-item.type-table tr")).toHaveCount(3);

  await page.getByRole("button", { name: "Diagramm einfügen" }).click();
  await page.getByRole("menuitemradio", { name: "Kreis" }).click();
  const dialog = page.getByRole("dialog", { name: "Daten des Diagramms" });
  await dialog.getByLabel("Titel").fill("Verteilung");
  await dialog.getByLabel("Beschriftung 1").fill("Ahorn");
  await dialog.getByLabel("Wert 1 in Reihe 1").fill("24");
  await dialog.getByLabel("Beschriftung 2").fill("Linde");
  await dialog.getByLabel("Wert 2 in Reihe 1").fill("abc");
  await dialog.getByRole("button", { name: "Übernehmen" }).click();
  await expect(dialog.getByRole("alert")).toContainText("nur Zahlen");
  await dialog.getByLabel("Wert 2 in Reihe 1").fill("18,5");
  await dialog.getByRole("button", { name: "Übernehmen" }).click();
  await expect(stage.locator(".deck-item.type-chart svg")).toHaveAttribute("aria-label", "Verteilung");

  // Löschen mit Entf und rückgängig machen.
  await stage.locator(".deck-item.type-chart").focus();
  await page.keyboard.press("Delete");
  await expect(stage.locator(".deck-item.type-chart")).toHaveCount(0);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).last().click();
  await expect(stage.locator(".deck-item.type-chart")).toHaveCount(1);

  await expect(page.locator(".office-status")).toContainText("Gespeichert um");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await page.getByText(`Objekte ${stamp}.pptx`, { exact: true }).dblclick();
  const reopened = page.locator(".deck-stage");
  await expect(reopened.locator(".deck-item")).toHaveCount(4);
  await expect(reopened.locator(".deck-item.type-text")).toContainText("Freies Textfeld");
  await expect(reopened.locator(".deck-item.type-shape")).toContainText("Wichtig");
  await expect(reopened.locator(".deck-item.type-shape svg")).toHaveAttribute("fill", /^#[0-9a-f]{6}$/);
  await expect(reopened.getByLabel("Zelle 2/1")).toHaveValue("Ahorn");
  await expect(reopened.locator(".deck-item.type-chart path")).toHaveCount(2);
  await expect(page.locator(".deck-thumb").first().locator(".deck-item")).toHaveCount(4);
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  expect(errors).toEqual([]);
});

// Tabelle: Farbskala, Datenbalken, benannter Bereich, Achsentitel/Datenbeschriftungen, Druckbereich mit Kopf-/Fusszeile.
test("Tabelle: Farbskala, Datenbalken, Namen, Achsentitel und Druckbereich", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  await page.goto("/c/carecore-one/ablage");
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Tabelle/ }).click();
  const gallery = page.getByRole("dialog", { name: "Neue Tabelle (Excel)" });
  await gallery.getByLabel("Name").fill(`Kennzahlen ${stamp}`);
  await gallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  const cell = (row: number, col: number) => page.locator(".sheet-table tbody tr").nth(row).locator("td").nth(col);
  const data = [
    ["Wohnbereich", "Plätze"],
    ["Ahorn", "24"],
    ["Linde", "18"],
    ["Eiche", "30"],
  ];
  for (const [row, values] of data.entries())
    for (const [col, value] of values.entries()) {
      await cell(row, col).click();
      await page.keyboard.type(value);
      await page.keyboard.press("Enter");
    }

  // Benannter Bereich und Formel mit dem Namen (Vorschlag mit Tab übernehmen).
  await page.getByRole("button", { name: "Namen verwalten" }).click();
  const names = page.getByRole("dialog", { name: "Namen verwalten" });
  await names.getByLabel("Name", { exact: true }).fill("B2");
  await names.getByRole("button", { name: "Name hinzufügen" }).click();
  await expect(names.getByRole("alert")).toContainText("Zellbezug");
  await names.getByLabel("Name", { exact: true }).fill("Plätze");
  await names.getByLabel("Bereich").fill("B2:B4");
  await names.getByRole("button", { name: "Name hinzufügen" }).click();
  await expect(names.getByRole("list", { name: "Namen" })).toContainText("Plätze");
  await names.getByRole("button", { name: "Übernehmen" }).click();
  await cell(0, 3).click();
  await page.keyboard.type("=SUMME(Plä");
  await expect(page.getByRole("option", { name: /Plätze/ })).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.type(")");
  await page.keyboard.press("Enter");
  await expect(cell(0, 3)).toHaveText("72");

  // Farbskala und Datenbalken.
  await page.getByRole("button", { name: "Bedingte Formatierung" }).click();
  const rules = page.getByRole("dialog", { name: "Bedingte Formatierung" });
  await rules.getByLabel("Bereich").fill("B2:B4");
  await rules.getByRole("combobox", { name: "Regel" }).click();
  await page.getByRole("option", { name: "Farbskala" }).click();
  await rules.getByRole("button", { name: "Regel hinzufügen" }).click();
  await rules.getByRole("combobox", { name: "Regel" }).click();
  await page.getByRole("option", { name: "Datenbalken" }).click();
  await rules.getByLabel("Bereich").fill("B2:B4");
  await rules.getByRole("button", { name: "Regel hinzufügen" }).click();
  await rules.getByRole("button", { name: "Übernehmen" }).click();
  await expect(cell(2, 1)).toHaveCSS("background-color", "rgb(248, 105, 107)");
  await expect(cell(3, 1)).toHaveCSS("background-color", "rgb(99, 190, 123)");
  await expect(cell(3, 1)).toHaveCSS("background-image", /linear-gradient/);

  // Diagramm mit Achsentiteln und Werten.
  await cell(0, 0).click();
  await cell(3, 1).click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Diagramm einfügen" }).click();
  const chart = page.getByRole("dialog", { name: "Diagramm einfügen" });
  await chart.getByLabel("Titel der waagrechten Achse").fill("Wohnbereich");
  await chart.getByLabel("Titel der senkrechten Achse").fill("Anzahl");
  await chart.getByRole("button", { name: "Werte an den Datenpunkten anzeigen" }).click();
  await chart.getByRole("button", { name: "Einfügen" }).click();
  const svg = page.locator(".sheet-chart-svg").first();
  await expect(svg.locator(".sheet-chart-axis-title")).toHaveText(["Anzahl", "Wohnbereich"]);
  await expect(svg.locator(".sheet-chart-label")).toHaveText(["24", "18", "30"]);

  // Druckbereich, Kopf- und Fusszeile.
  await page.getByRole("button", { name: "Seite einrichten" }).click();
  await page.getByRole("menuitemradio", { name: /Kopf- und Fusszeile/ }).click();
  const setup = page.getByRole("dialog", { name: "Seite einrichten" });
  await setup.getByLabel("Druckbereich").fill("A1:B4");
  await setup.getByLabel("Kopfzeile").fill("Haus Ahorn");
  await setup.getByRole("button", { name: /Seitenzahlen/ }).click();
  await setup.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  const print = page.locator(".sheet-print");
  await expect(print.locator("tr")).toHaveCount(4);
  await expect(print.locator("tr").first().locator("td")).toHaveCount(2);
  const pageStyle = await print.locator("style").textContent();
  expect(pageStyle).toContain('@top-center { content: "Haus Ahorn"; }');
  expect(pageStyle).toContain("counter(pages)");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await page.emulateMedia({ media: "screen" });

  await expect(page.locator(".office-status")).toContainText("Gespeichert um");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await page.getByText(`Kennzahlen ${stamp}.xlsx`, { exact: true }).dblclick();
  await expect(cell(0, 3)).toHaveText("72");
  await expect(cell(3, 1)).toHaveCSS("background-color", "rgb(99, 190, 123)");
  await expect(page.locator(".sheet-chart-svg .sheet-chart-axis-title")).toHaveCount(2);
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

// Tabelle wie Excel: vertikale Ausrichtung, neue Funktionen, Rahmen, Filter, Auswahlliste – nach dem Speichern noch da.
test("Tabelle: vertikale Ausrichtung, Funktionen, Rahmen, Filter und Auswahlliste", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const stamp = Date.now();
  await page.goto("/c/carecore-one/ablage");
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Tabelle/ }).click();
  const gallery = page.getByRole("dialog", { name: "Neue Tabelle (Excel)" });
  await gallery.getByLabel("Name").fill(`Excel ${stamp}`);
  await gallery.getByRole("button", { name: "Erstellen und öffnen" }).click();
  const cell = (row: number, col: number) => page.locator(".sheet-table tbody tr").nth(row).locator("td").nth(col);
  const rows = [
    ["Name", "Bereich", "Stunden"],
    ["Anna", "Pflege", "8"],
    ["Ben", "Küche", "6"],
    ["Cem", "Pflege", "4"],
  ];
  for (const [r, line] of rows.entries()) {
    await cell(r, 0).click();
    for (const [c, value] of line.entries()) {
      await page.keyboard.type(value);
      await page.keyboard.press(c < line.length - 1 ? "Tab" : "Enter");
    }
  }
  await cell(5, 0).click();
  await page.keyboard.type('=XVERWEIS("Ben";A2:A4;C2:C4)');
  await page.keyboard.press("Enter");
  await page.keyboard.type('=SUMMEWENNS(C2:C4;B2:B4;"Pflege")');
  await page.keyboard.press("Enter");
  await page.keyboard.type('=TEXT(DATUM(2026;10;4);"TT.MM.JJJJ")');
  await page.keyboard.press("Enter");
  await expect(cell(5, 0)).toHaveText("6");
  await expect(cell(6, 0)).toHaveText("12");
  await expect(cell(7, 0)).toHaveText("04.10.2026");
  // Überlaufende Formel füllt die Zellen darunter; die Formelleiste zeigt dort die Formel des Ursprungs.
  await cell(10, 5).click();
  await page.keyboard.type("=SEQUENZ(3;1;10;10)");
  await page.keyboard.press("Enter");
  await expect(cell(10, 5)).toHaveText("10");
  await expect(cell(11, 5)).toHaveText("20");
  await expect(cell(12, 5)).toHaveText("30");
  await expect(page.getByLabel("Inhalt der Zelle")).toHaveValue("=SEQUENZ(3;1;10;10)");
  await expect(page.locator(".sheet-spill")).toBeVisible();
  // Überlaufbezug und LAMBDA.
  await cell(14, 5).click();
  await page.keyboard.type("=SUMME(F11#)");
  await page.keyboard.press("Enter");
  await page.keyboard.type("=LET(doppelt;LAMBDA(x;x*2);doppelt(21))");
  await page.keyboard.press("Enter");
  await expect(cell(14, 5)).toHaveText("60");
  await expect(cell(15, 5)).toHaveText("42");
  // Formelhilfe: englischer Name findet NACHZEILE, mit Beispiel.
  await cell(17, 5).click();
  await page.keyboard.type("=BYR");
  await expect(page.locator(".sheet-suggest")).toContainText("NACHZEILE");
  await expect(page.locator(".sheet-suggest")).toContainText("auch BYROW");
  await page.keyboard.press("Tab");
  await expect(page.locator(".sheet-suggest-example")).toContainText("LAMBDA(zeile;SUMME(zeile))");
  await page.keyboard.press("Escape");

  // Vertikal: oben, Mitte, unten.
  await cell(0, 0).click();
  await page.getByRole("button", { name: "Oben ausrichten", exact: true }).click();
  await expect(cell(0, 0)).toHaveCSS("vertical-align", "top");
  await page.getByRole("button", { name: "Vertikal zentrieren", exact: true }).click();
  await expect(cell(0, 0)).toHaveCSS("vertical-align", "middle");

  // Rahmen unten, Filter und Auswahlliste.
  await page.getByRole("button", { name: "Rahmen", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Rahmenlinie unten" }).click();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("button", { name: "Filter B" }).click();
  await page.locator(".sheet-filter-menu").getByRole("checkbox", { name: "Küche" }).click();
  await page.locator(".sheet-filter-menu").getByRole("button", { name: "OK" }).click();
  await expect(page.locator(".sheet-table")).not.toContainText("Ben");
  await cell(9, 1).click();
  await page.getByRole("button", { name: "Auswahlliste", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Auswahlliste" });
  await dialog.getByLabel("Erlaubte Werte").fill("Ja\nNein");
  await dialog.getByRole("button", { name: "Übernehmen" }).click();
  await page.getByRole("button", { name: "Auswahlliste öffnen" }).click();
  await page.getByRole("menuitemradio", { name: "Nein" }).click();
  await expect(page.locator(".office-status")).toContainText("Gespeichert um");

  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  await page.getByText(`Excel ${stamp}.xlsx`, { exact: true }).dblclick();
  await expect(page.locator(".sheet-table tbody tr").first().locator("td").first()).toHaveCSS(
    "vertical-align",
    "middle",
  );
  await expect(page.locator(".sheet-table")).not.toContainText("Ben");
  await expect(page.locator(".sheet-table")).toContainText("Nein");
  await page.getByRole("button", { name: "Zurück zur Ablage" }).click();
  expect(errors).toEqual([]);
});
