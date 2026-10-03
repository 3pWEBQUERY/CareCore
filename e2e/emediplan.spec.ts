import { expect, test } from "@playwright/test";
import { ADMIN, login, watchErrors } from "./support";

// eMediplan: Code einlesen, Abweichung zur Person sehen, Zeile prüfen und als zwei Verordnungen übernehmen.
test("eMediplan: einlesen, prüfen und Zeile übernehmen", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const name = `Amlodipin E2E ${Date.now()}`;
  const code = `CHMED16A0${JSON.stringify({
    Dt: "2026-10-01T10:00:00+02:00",
    Patient: { FName: "Gertrud", LName: "Planperson", BDt: "1938-04-02" },
    Medicaments: [
      {
        Id: "7680123456789",
        IdType: 2,
        Unit: "STK",
        TkgRsn: "Blutdruck",
        Pos: [{ DtFrom: "2026-10-01", D: [1, 0, 0.5, 0] }],
      },
      { Id: "Spezialschema", IdType: 1, Pos: [{ DtFrom: "2026-10-01", TT: [{ Off: 28800, DoFrom: 1 }] }] },
    ],
  })}`;

  await page.goto("/c/bewohner");
  await page.locator(".resident-list-row").first().click();
  await page.goto("/c/medikation/emediplan");
  await expect(page.getByRole("heading", { name: "eMediplan einlesen", level: 1 })).toBeVisible();
  await page.getByRole("textbox", { name: /Inhalt des QR-Codes/ }).fill(code);
  await page.getByRole("button", { name: "Einlesen" }).click();

  await expect(page.locator(".emediplan-mismatch")).toContainText("Gertrud Planperson");
  await expect(page.getByRole("article", { name: "Zeile 2" })).toContainText("von Hand erfassen");
  await page.getByLabel("Morgen").fill("08:00");
  await page.getByLabel("Abend").fill("18:00");

  const line = page.getByRole("article", { name: "Zeile 1" });
  await expect(line).toContainText("GTIN 7680123456789");
  await expect(line.getByLabel("Dosis (Verordnung 1)")).toHaveValue("1 STK");
  await expect(line.getByLabel("Dosis (Verordnung 2)")).toHaveValue("0.5 STK");
  await line.getByLabel("Präparat", { exact: true }).fill(name);
  await line.getByLabel("Verordnet von").fill("Dr. Meier");
  await line.getByRole("button", { name: "Geprüft – als 2 Verordnungen übernehmen" }).click();
  await expect(line).toContainText("Übernommen");

  await page.goto("/c/medikation");
  await expect(page.getByText(name).first()).toBeVisible();
  expect(errors).toEqual([]);
});
