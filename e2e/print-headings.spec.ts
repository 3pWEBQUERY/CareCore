import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./support";

// Druckansichten: genau eine Hauptüberschrift für Screenreader, auch wenn der Bogen nicht erstellt werden kann.
test("Druckansichten: Hauptüberschrift auch ohne Daten", async ({ page }) => {
  await login(page, ADMIN);
  const cases: Array<[string, RegExp]> = [
    ["/c/bewohner/ueberleitung?dialog=0", /^Überleitungsbogen$/],
    ["/c/medikation/btm/buch?dialog=0", /^BtM-Buch$/],
    ["/c/mein-dienstplan/team/drucken?monat=2001-01&dialog=0", /^Teamplan .*Januar 2001$/],
  ];
  for (const [url, name] of cases) {
    await page.goto(url);
    await expect(page.locator(".roster-print-message")).toBeVisible();
    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings).toHaveCount(1);
    await expect(headings).toHaveText(name);
  }
});
