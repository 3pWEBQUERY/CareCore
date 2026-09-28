import { expect, test } from "@playwright/test";
import { navigation, routeFor } from "../app/components/navigation";
import { ADMIN, login, watchErrors } from "./support";

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
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
