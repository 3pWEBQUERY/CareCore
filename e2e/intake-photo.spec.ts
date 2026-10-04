import { expect, test } from "@playwright/test";
import { ADMIN, login, watchErrors } from "./support";

// 8×8-PNG (rot) als Testbild.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM44OCAFTEMLQkAYplQATyfsGkAAAAASUVORK5CYII=",
  "base64",
);

// Aufnahme mit Bild: Bild wählen, Vorschau, entfernen und wieder wählen, aufnehmen; das Bild steht danach in der Akte.
test("Bewohner aufnehmen: Bild direkt hinzufügen, Vorschau, gespeichert in der Akte", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const lastName = `Bild${Date.now().toString().slice(-5)}`;
  await page.goto("/c/bewohner");
  await page
    .getByRole("button", { name: /aufnehmen$/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Bild hinzufügen", exact: true })).toBeVisible();

  const input = dialog.locator(".intake-photo input[type=file]");
  await input.setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: PNG });
  await expect(dialog.getByRole("img", { name: /^Bild von / })).toBeVisible();
  await dialog.getByRole("button", { name: "Entfernen" }).click();
  await expect(dialog.getByRole("img", { name: /^Bild von / })).toHaveCount(0);
  await input.setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: PNG });
  await expect(dialog.getByRole("button", { name: "Bild ändern", exact: true })).toBeVisible();

  // Falscher Dateityp: Hinweis, Bild bleibt.
  await input.setInputFiles({ name: "notiz.txt", mimeType: "text/plain", buffer: Buffer.from("hallo") });
  await expect(dialog.getByRole("alert")).toContainText("Bitte ein JPEG-, PNG-, WebP- oder HEIC-Bild auswählen.");
  await expect(dialog.getByRole("img", { name: /^Bild von / })).toBeVisible();
  // Beschädigtes Bild: verständliche Meldung statt Browsertext.
  await input.setInputFiles({ name: "kaputt.png", mimeType: "image/png", buffer: Buffer.from("kein Bild") });
  await expect(dialog.getByRole("alert")).toContainText("Das Bild konnte nicht gelesen werden.");

  await dialog.getByLabel("Vorname").fill("Erika");
  await dialog.getByLabel("Nachname").fill(lastName);
  // Geburtsdatum über die eigene Kalenderauswahl: Jahre zurückblättern, Jahr, Monat, Tag.
  await dialog.getByRole("button", { name: "Geburtsdatum", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Geburtsdatum auswählen" });
  // Beginnt rund 85 Jahre vor dem Eintritt; sonst zurück- bzw. vorblättern.
  for (
    let step = 0;
    step < 20 && !(await picker.getByRole("button", { name: "1938", exact: true }).isVisible());
    step++
  )
    await picker
      .getByRole("button", {
        name:
          Number((await picker.locator(".schedule-date-period").innerText()).slice(0, 4)) > 1938
            ? "Vorherige Jahre"
            : "Nächste Jahre",
      })
      .click();
  await picker.getByRole("button", { name: "1938", exact: true }).click();
  await picker.getByRole("button", { name: /^Apr/ }).click();
  await picker.getByRole("button", { name: "12", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Geburtsdatum", exact: true })).toContainText("12.04.1938");
  await dialog.getByLabel("Zimmer").fill("Zimmer 118");
  await dialog.getByRole("button", { name: /aufnehmen$/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".toast")).toContainText(`Erika ${lastName} wurde aufgenommen`);
  await expect(page.locator(".toast")).toContainText("(mit Bild)");

  await page.getByText(lastName).first().click();
  const record = page.getByRole("dialog", { name: new RegExp(lastName) });
  await expect(record.getByRole("img", { name: new RegExp(`Profilbild von .*${lastName}`) })).toBeVisible();
  expect(errors).toEqual([]);
});
