import { expect, test } from "@playwright/test";
import { navigation, routeFor } from "../app/components/navigation";
import { ADMIN, login, watchErrors, waitForNetworkIdle } from "./support";

test("Anmeldung über das Formular führt auf die Startseite", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await page.getByLabel("Benutzername").fill(ADMIN.username);
  await page.getByLabel("Passwort", { exact: true }).fill(ADMIN.password);
  await page.locator("button.login-submit").click();
  await expect(page).toHaveURL(/\/c(\/|$)/);
  await expect(page.locator("main").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Falsches Passwort wird abgelehnt", async ({ page }) => {
  const response = await page.request.post("/api/auth/login", { data: { username: "Admin", password: "falsch" } });
  expect(response.status()).toBe(401);
});

// Jede Seite der Navigation lädt ohne Skript- oder Serverfehler (Administration sieht alle Seiten).
const pages = navigation
  .flatMap((group) => group.modules)
  .flatMap((module) =>
    module.children.map((child) => ({ label: `${module.label} › ${child}`, url: routeFor(module.id, child) })),
  )
  .filter((entry): entry is { label: string; url: string } => entry.url !== null);

for (const entry of pages)
  test(`Seite lädt: ${entry.label}`, async ({ page }) => {
    await login(page, ADMIN);
    const errors = watchErrors(page);
    await page.goto(entry.url);
    await expect(page.locator("h1").first()).toBeVisible();
    await waitForNetworkIdle(page);
    expect(errors).toEqual([]);
  });

// Startseite: Tagesliste nach Kritisch / Wichtig / Routine gegliedert; Zahl im Filter = gezeigte Punkte.
test("Tagesliste gliedert nach Kritisch, Wichtig und Routine", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c");
  const filters = page.getByRole("group", { name: "Tagesliste filtern" });
  await expect(filters.getByRole("button", { name: /^Alle \d+$/ })).toBeVisible();
  const items = page.locator(".worklist-card .worklist-item");
  let sum = 0;
  for (const [label, tone] of [
    ["Kritisch", "critical"],
    ["Wichtig", "attention"],
    ["Routine", "info"],
  ] as const) {
    const button = filters.getByRole("button", { name: new RegExp(`^${label} \\d+$`) });
    const count = Number((await button.textContent())?.replace(/\D/g, ""));
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(items).toHaveCount(count);
    await expect(page.locator(`.worklist-card .worklist-item:not(.${tone})`)).toHaveCount(0);
    sum += count;
  }
  const all = filters.getByRole("button", { name: /^Alle \d+$/ });
  expect(Number((await all.textContent())?.replace(/\D/g, ""))).toBe(sum);
  await all.click();
  await expect(items).toHaveCount(sum);
  expect(errors).toEqual([]);
});

// Konfiguration: „Patient“ statt „Bewohner“ gilt in Navigation, Kopfzeile und Startseite.
test("Bezeichnung der betreuten Personen umstellen: Patient", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  try {
    await page.goto("/c/leitung/administration/konfiguration");
    const options = page.getByRole("group", { name: "Bezeichnung wählen" });
    await expect(options.getByRole("button", { name: "Bewohner" })).toHaveAttribute("aria-pressed", "true");
    await options.getByRole("button", { name: "Patient" }).click();
    await expect(page.locator(".toast")).toContainText("Bezeichnung „Patient“ gespeichert");
    await expect(options.getByRole("button", { name: "Patient" })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/c");
    await expect(page.locator(".summary-label").first()).toHaveText("Patienten zugeteilt");
    await expect(page.locator(".resident-context-copy small").first()).toHaveText("Patient");
    await page.goto("/c/bewohner");
    await expect(page.getByRole("heading", { level: 1, name: "Patienten" })).toBeVisible();
    await expect(page).toHaveTitle("CareCore · Patienten");
    await expect(page.getByRole("button", { name: "Patienten aufnehmen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Patientenverzeichnis" })).toBeVisible();
    await page.goto("/c/leitung/kennzahlen/bewohner");
    await expect(page.locator(".page-tabs").getByRole("link", { name: "Kennzahlen Patienten" })).toBeVisible();
  } finally {
    expect((await page.request.patch("/api/settings/terminology", { data: { value: "resident" } })).status()).toBe(200);
  }
  expect(errors).toEqual([]);
});

// CareCore Kompass hat einen eigenen Hauptbereich in der Seitenleiste, gleich nach Bewohner & Pflege, mit eigenem Logo.
test("Seitenleiste: CareCore Kompass als eigener Hauptbereich nach Bewohner & Pflege", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c");
  const rail = page.locator(".sidebar-rail-scroll > button");
  const labels = await rail.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
  expect(labels[labels.indexOf("Bewohner & Pflege") + 1]).toBe("CareCore Kompass");
  const button = page.getByRole("button", { name: "CareCore Kompass", exact: true });
  await expect(button.locator(".sidebar-kompass-icon")).toBeVisible();
  await button.click();
  const flyout = page.getByRole("complementary", { name: "CareCore Kompass Untermenü" });
  await expect(flyout.locator(".sidebar-flyout-icon .sidebar-kompass-icon")).toBeVisible();
  await flyout
    .locator(".sidebar-flyout-module:not(.sidebar-flyout-recent)")
    .getByRole("button", { name: "Kompass" })
    .click();
  await expect(page).toHaveURL(/\/c\/kompass$/);
  await expect(button).toHaveClass(/active/);
  expect(errors).toEqual([]);
});
