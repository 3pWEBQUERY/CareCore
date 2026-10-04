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

test("Überfällige Wundversorgung: direkt aus dem Hinweis dokumentieren, danach ist sie erledigt", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  // Wunde mit täglichem Verbandwechsel, festgestellt vor vier Tagen, noch ohne Verlaufseintrag: überfällig.
  const payload = await (await page.request.get("/api/wounds")).json();
  const resident = payload.residents[payload.residents.length - 1];
  const discoveredOn = new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10);
  const created = await page.request.post("/api/wounds", {
    data: {
      residentId: resident.id,
      woundType: "Skin Tear",
      bodyLocation: "Linker Handrücken",
      discoveredOn,
      careIntervalDays: 1,
      origin: "inhouse",
    },
  });
  expect(created.status(), await created.text()).toBe(201);

  await page.goto("/c/wundmanagement");
  const alert = page.locator(".wound-alert");
  const item = alert.locator("li", { hasText: `${resident.name} · Linker Handrücken` });
  await expect(item).toContainText(/Überfällig seit \d+ Tag/);
  await item.getByRole("button", { name: "Versorgung dokumentieren" }).click();
  const dialog = page.locator(".editor-dialog");
  await field(page, "Durchgeführte Versorgung").fill("Steri-Strips erneuert, Wundrand reizlos");
  await dialog.getByRole("button", { name: "Eintrag speichern" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".wound-alert li", { hasText: "Linker Handrücken" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Wundversorgung: Verbandsmaterial aus dem Katalog dokumentieren", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const productName = `E2E Schaumverband ${Date.now()}`;
  const product = await page.request.post("/api/care-supply-products", {
    data: { itemName: productName, category: "Wundversorgung", unit: "Stück" },
  });
  expect(product.status(), await product.text()).toBe(201);
  const payload = await (await page.request.get("/api/wounds")).json();
  const resident = payload.residents[payload.residents.length - 1];
  const created = await page.request.post("/api/wounds", {
    data: {
      residentId: resident.id,
      woundType: "Skin Tear",
      bodyLocation: "Rechter Unterarm",
      discoveredOn: new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10),
      careIntervalDays: 1,
      origin: "inhouse",
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const woundId = ((await created.json()) as { id: string }).id;

  await page.goto("/c/wundmanagement");
  const item = page.locator(".wound-alert li", { hasText: `${resident.name} · Rechter Unterarm` });
  await item.getByRole("button", { name: "Versorgung dokumentieren" }).click();
  const dialog = page.locator(".editor-dialog");
  await dialog.getByRole("combobox", { name: "Material" }).click();
  await page.getByRole("option", { name: `${productName} (Stück)` }).click();
  await dialog.getByLabel("Menge").fill("2");
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(dialog.locator(".wound-materials li")).toHaveText(new RegExp(`2 Stück ${productName}`));
  await dialog.getByRole("button", { name: "Eintrag speichern" }).click();
  await expect(dialog).toHaveCount(0);

  const entries = (await (await page.request.get(`/api/wounds/${woundId}/entries`)).json()) as {
    entries: Array<{ materials: Array<{ name: string; quantity: number }> }>;
  };
  expect(entries.entries[0].materials).toEqual([expect.objectContaining({ name: productName, quantity: 2 })]);
  expect(errors).toEqual([]);
});

test("Wundübersicht folgt dem Bewohner aus der Kopfzeile – und umgekehrt", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/wundmanagement");
  const header = page.locator(".topbar .resident-context-trigger strong");
  const sidebarName = page.locator(".wound-sidebar .wound-focus-card .card-title");

  // Klick auf eine Wunde wählt auch den Bewohner in der Kopfzeile.
  const row = page.locator(".wound-case-row").first();
  // Nur der Name, ohne die REA-Kennzeichnung daneben.
  const rowName = (
    await row.locator(".wound-case-main strong").evaluate((element) => element.firstChild?.textContent ?? "")
  ).trim();
  await row.click();
  await expect(header).toHaveText(rowName);
  await expect(sidebarName).toHaveText(rowName);

  // Wechsel in der Kopfzeile: rechts steht sofort dieser Bewohner (mit Wunde oder „Keine offene Wunde“).
  for (let step = 0; step < 3; step += 1) {
    const before = (await header.innerText()).trim();
    await page.locator(".topbar").getByRole("button", { name: "Nächster Bewohner" }).click();
    await expect(header).not.toHaveText(before);
    await expect(sidebarName).toHaveText((await header.innerText()).trim());
  }
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
  // Ressourcen als Mehrfachauswahl: zwei aus der Liste, eine eigene Ergänzung.
  await dialog.getByRole("combobox", { name: "Ressourcen" }).click();
  const resources = page.getByRole("listbox", { name: "Ressourcen" });
  await resources.getByRole("option", { name: "Motiviert", exact: true }).click();
  await resources.getByRole("option", { name: "Nutzt Rollator", exact: true }).click();
  await expect(resources.getByRole("option", { name: "Motiviert", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByLabel("Eigene Ressource ergänzen").fill("Gute Kooperation");
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog.getByRole("list", { name: "Ressourcen: ausgewählt" }).locator("li")).toHaveCount(3);
  await field(page, /^Ziel$/).fill("Geht mit Rollator 20 m im Korridor ohne Sturz");
  await dialog.getByRole("button", { name: "Ziel hinzufügen" }).click();
  await expect(dialog).toHaveCount(0);
  const goal = page.locator("article", { hasText: "Geht mit Rollator 20 m im Korridor ohne Sturz" }).first();
  await expect(goal).toBeVisible();
  await expect(goal).toContainText("Motiviert, Nutzt Rollator, Gute Kooperation");

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

  // Erst nach der Bestätigung weiter – sonst bricht der Seitenwechsel das Speichern ab.
  await expect(page.getByText("interRAI-Erfassung für Peter Aebischer abgeschlossen")).toBeVisible();
  await page.goto("/c/rai");
  await expect(page.getByRole("button", { name: /Peter Aebischer.*Zimmer 101/ })).toContainText("Aktuell");
  expect(errors).toEqual([]);
});
