import { expect, test } from "@playwright/test";
import { ADMIN, FAGE, SRK, login, watchErrors } from "./support";
import { totpCode, totpStep } from "../lib/mfa-core";

// Persönliche Einstellungen und Einstellungen der Einrichtung: gespeichert in der Datenbank, sofort angewendet.
test.describe.configure({ mode: "serial" });

test("Darstellung: Schriftgrösse und Animationen gelten sofort und bleiben nach dem Neuladen", async ({ page }) => {
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/appearance");
  const detail = page.locator(".settings-detail");
  await page.locator(".settings-list button", { hasText: "Schriftgrösse" }).click();
  await detail.getByRole("combobox", { name: "Schriftgrösse" }).click();
  await page.getByRole("option", { name: "Sehr gross" }).click();
  await expect(page.locator("html")).toHaveClass(/text-xlarge/);
  await page.locator(".settings-list button", { hasText: "Animationen" }).click();
  await detail.getByRole("combobox", { name: "Animationen" }).click();
  await page.getByRole("option", { name: "Reduziert" }).click();
  await expect(page.locator("html")).toHaveClass(/motion-reduced/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/text-xlarge/);
  await expect(page.locator(".settings-list button", { hasText: "Schriftgrösse" })).toContainText("Sehr gross");
  // Nur für die Administration: „Einrichtung“ fehlt in der Navigation.
  await expect(page.locator(".settings-nav button", { hasText: "Einrichtung" })).toHaveCount(0);

  // Zurücksetzen unter Datenschutz stellt alles wieder her.
  await page.goto("/c/einstellungen/privacy");
  await page.locator(".settings-list button", { hasText: "Einstellungen zurücksetzen" }).click();
  await detail.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(page.locator("html")).not.toHaveClass(/text-xlarge/);
  await expect(page.locator("html")).not.toHaveClass(/motion-reduced/);
  expect(errors).toEqual([]);
});

test("Erscheinungsbild: dunkel gilt sofort, bleibt nach dem Neuladen und lässt Fotos farbecht", async ({ page }) => {
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/appearance");
  const detail = page.locator(".settings-detail");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/theme-dark/);
  await page.locator(".settings-list button", { hasText: "Erscheinungsbild" }).click();
  await detail.getByRole("combobox", { name: "Erscheinungsbild" }).click();
  await page.getByRole("option", { name: "Dunkel" }).click();
  await expect(html).toHaveClass(/theme-dark/);
  expect(await html.evaluate((el) => getComputedStyle(el).filter)).toContain("invert");

  // Nach dem Neuladen schon vor dem Laden der Einstellungen dunkel (kein heller Blitz).
  await page.reload();
  await expect(html).toHaveClass(/theme-dark/);
  await expect(page.locator(".settings-list button", { hasText: "Erscheinungsbild" })).toContainText("Dunkel");

  await page.locator(".settings-list button", { hasText: "Erscheinungsbild" }).click();
  await detail.getByRole("combobox", { name: "Erscheinungsbild" }).click();
  await page.getByRole("option", { name: "Hell" }).click();
  await expect(html).not.toHaveClass(/theme-dark/);
  expect(await html.evaluate((el) => getComputedStyle(el).filter)).toBe("none");
  expect(errors).toEqual([]);
});

test("Benachrichtigungen: Ruhezeit und Hinweiston werden gespeichert", async ({ page }) => {
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/notifications");
  const detail = page.locator(".settings-detail");
  await page.locator(".settings-list button", { hasText: "Ruhezeit" }).click();
  await detail.locator('input[type="time"]').first().fill("21:30");
  await detail.locator('input[type="time"]').last().fill("06:30");
  await detail.getByRole("button", { name: "Zeiten speichern" }).click();
  await detail.locator(".settings-toggle", { hasText: "Ruhezeit einhalten" }).locator("i").click();
  await expect(page.locator(".settings-list button", { hasText: "Ruhezeit" })).toContainText("21:30–06:30 Uhr");
  await page.locator(".settings-list button", { hasText: "Hinweiston" }).click();
  await detail.locator(".settings-toggle", { hasText: "Ton abspielen" }).locator("i").click();
  await expect(page.locator(".settings-list button", { hasText: "Hinweiston" })).toContainText("Ein");

  const saved = await (await page.request.get("/api/me/settings")).json();
  expect(saved.preferences.quietHours).toEqual({ enabled: true, from: "21:30", to: "06:30", critical: true });
  expect(saved.preferences.sound).toBe(true);
  expect(errors).toEqual([]);
});

test("Datenschutz: eigene Daten als JSON herunterladen", async ({ page }) => {
  await login(page, FAGE);
  await page.goto("/c/einstellungen/privacy");
  await page.locator(".settings-list button", { hasText: "Meine Daten herunterladen" }).click();
  const download = page.waitForEvent("download");
  await page.locator(".settings-detail").getByRole("button", { name: "Herunterladen" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^carecore-meine-daten-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await (await import("node:fs/promises")).readFile((await file.path())!, "utf8"));
  expect(data.profile.username).toBe(FAGE.username);
  expect(JSON.stringify(data)).not.toContain("password_hash");
});

test("Einrichtung: Administration ändert eine Einstellung für alle, protokolliert", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/organization");
  const detail = page.locator(".settings-detail");
  const item = page.locator(".settings-list button", { hasText: "Erinnerung Vitalwerte" });
  await item.click();
  await detail.getByLabel(/Wert \(Tage/).fill("5");
  await detail.getByRole("button", { name: "Wert speichern" }).click();
  await expect(item).toContainText("5 Tage");
  await page.reload();
  await expect(page.locator(".settings-list button", { hasText: "Erinnerung Vitalwerte" })).toContainText("5 Tage");
  expect(errors).toEqual([]);
});

test("Zwei-Faktor-Anmeldung: einrichten, mit Code anmelden, Administration setzt zurück", async ({ page }) => {
  await login(page, SRK);
  let errors = watchErrors(page, [/^400 POST \/api\/me\/mfa$/]);
  await page.goto("/c/einstellungen/security");
  const detail = page.locator(".settings-detail");
  await page.locator(".settings-list button", { hasText: "Zwei-Faktor-Anmeldung" }).click();
  await detail.getByRole("button", { name: "Einrichten" }).click();
  await expect(detail.getByRole("img", { name: "QR-Code für die Authenticator-App" })).toBeVisible();
  const secret = (await detail.getByLabel("Schlüssel zum Abtippen").innerText()).replace(/\s/g, "");
  const code = detail.locator(".settings-mfa-code input");
  await code.fill("000000");
  await detail.getByRole("button", { name: "Bestätigen und einschalten" }).click();
  await expect(detail.getByRole("alert")).toContainText("Der Code stimmt nicht");
  const step = totpStep();
  await code.fill(totpCode(secret, step));
  await detail.getByRole("button", { name: "Bestätigen und einschalten" }).click();
  await expect(detail.getByRole("list", { name: "Wiederherstellungscodes" }).locator("li")).toHaveCount(10);
  await detail.getByRole("button", { name: "Codes sind notiert" }).click();
  await expect(detail).toContainText("Eingeschaltet");
  await expect(page.locator(".settings-list button", { hasText: "Zwei-Faktor-Anmeldung" })).toContainText("Ein");
  expect(errors).toEqual([]);

  // Anmeldung über das Formular: nach dem Passwort folgt der Code.
  await page.context().clearCookies();
  errors = watchErrors(page, [/^401 POST \/api\/auth\/mfa$/]);
  await page.goto("/");
  await page.getByLabel("Benutzername").fill(SRK.username);
  await page.getByLabel("Passwort", { exact: true }).fill(SRK.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  const mfa = page.getByLabel("Bestätigungscode");
  await expect(mfa).toBeVisible();
  await mfa.fill("111111");
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await expect(page.locator(".login-error")).toContainText("Der Code stimmt nicht");
  await mfa.fill(totpCode(secret, step + 1));
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await expect(page).toHaveURL(/\/c/);
  expect(errors).toEqual([]);

  // Verlorenes Handy: die Administration setzt zurück, danach genügt wieder das Passwort.
  await page.context().clearCookies();
  await login(page, ADMIN);
  const users = (await (await page.request.get("/api/admin/users")).json()) as {
    users: Array<{ id: string; username: string; mfa: boolean }>;
  };
  const carla = users.users.find((user) => user.username === SRK.username)!;
  expect(carla.mfa).toBe(true);
  const reset = await page.request.patch("/api/admin/users", { data: { userId: carla.id, action: "resetMfa" } });
  expect(reset.status()).toBe(200);
  await page.context().clearCookies();
  await login(page, SRK);
});

// Branding: Logo in der Konfiguration hochladen – erscheint in der Kopfzeile, danach wieder entfernen.
test("Branding: Logo der Einrichtung hochladen und in der Kopfzeile sehen", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  try {
    await page.goto("/c/leitung/administration/konfiguration");
    const card = page.locator(".admin-branding-card");
    await card.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await expect(page.locator(".toast")).toContainText("Logo gespeichert");
    await expect(card.getByRole("img", { name: "Aktuelles Logo" })).toBeVisible();
    await page.reload();
    await expect(page.locator(".location-icon.has-logo img").first()).toBeVisible();
    await card.getByRole("button", { name: "Logo entfernen" }).click();
    await expect(page.locator(".toast")).toContainText("Logo entfernt");
  } finally {
    await page.request.delete("/api/branding/logo");
  }
  expect(errors).toEqual([]);
});

// Datenschutz: ohne Frist schlägt CareCore nichts vor; mit Frist zeigt die Karte den Stand.
test("Löschfristen: Karte folgt der Aufbewahrungsfrist der Einrichtung", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  try {
    await page.goto("/c/leitung/administration/konfiguration");
    const card = page.locator(".admin-retention-card");
    await expect(card).toContainText("Aufbewahrungsfrist ist noch nicht festgelegt");
    expect(
      (
        await page.request.patch("/api/settings/residentRetentionYears", { data: { enabled: true, value: 10 } })
      ).status(),
    ).toBe(200);
    await page.reload();
    await expect(card).toContainText("10 Jahre nach dem Austritt");
    await expect(card).toContainText("Keine Akte mit abgelaufener Frist.");
  } finally {
    await page.request.patch("/api/settings/residentRetentionYears", { data: { enabled: false } });
  }
  expect(errors).toEqual([]);
});

// Schnittstelle: Administration erstellt einen Schlüssel, das angebundene System liest damit FHIR; nach dem Widerruf nicht mehr.
test("FHIR-Schlüssel: erstellen, damit lesen, widerrufen", async ({ page, playwright }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  const name = `Praxis ${Date.now()}`;
  await page.goto("/c/leitung/administration/konfiguration");
  const card = page.locator(".admin-api-card");
  await card.getByRole("button", { name: "Schlüssel erstellen" }).click();
  const create = page.getByRole("dialog", { name: "Schlüssel erstellen" });
  await create.getByLabel("Name", { exact: true }).fill(name);
  await create.getByLabel("Personen (Name, Geburtsdatum, Geschlecht, Status)").check();
  await create.getByRole("button", { name: "Erstellen" }).click();
  const shown = page.getByRole("dialog", { name: `Schlüssel „${name}“` });
  const key = await shown.getByLabel("Schlüssel", { exact: true }).inputValue();
  expect(key).toMatch(/^cck_/);
  await shown.getByRole("button", { name: "Fertig" }).click();
  await expect(card).toContainText(name);

  // Ohne Anmeldung, nur mit Schlüssel – wie ein fremdes System.
  const api = await playwright.request.newContext({ baseURL: new URL(page.url()).origin });
  try {
    expect((await api.get("/api/fhir/r4/metadata")).status()).toBe(200);
    expect((await api.get("/api/fhir/r4/Patient")).status()).toBe(401);
    const patients = await api.get("/api/fhir/r4/Patient?active=true&_count=5", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(patients.status()).toBe(200);
    expect(patients.headers()["content-type"]).toContain("application/fhir+json");
    const bundle = (await patients.json()) as { resourceType: string; total: number; entry: unknown[] };
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.total).toBeGreaterThan(0);
    expect((await api.get("/api/fhir/r4/Observation", { headers: { Authorization: `Bearer ${key}` } })).status()).toBe(
      403,
    );

    await card.locator(".admin-retention-row", { hasText: name }).getByRole("button", { name: "Widerrufen" }).click();
    await page
      .getByRole("dialog", { name: `„${name}“ widerrufen` })
      .getByRole("button", { name: "Widerrufen" })
      .click();
    await expect(page.locator(".toast")).toContainText("widerrufen");
    expect((await api.get("/api/fhir/r4/Patient", { headers: { Authorization: `Bearer ${key}` } })).status()).toBe(401);
  } finally {
    await api.dispose();
  }
  expect(errors).toEqual([]);
});

// Webhooks: nur https-Adressen; Geheimnis erscheint einmal, danach Entfernen.
test("Webhooks: anlegen mit Geheimnis, interne oder http-Adressen abgelehnt, entfernen", async ({ page }) => {
  await login(page, ADMIN);
  // Die abgelehnte interne Adresse antwortet absichtlich mit 400.
  const errors = watchErrors(page, [/^400 POST \/api\/admin\/webhooks$/]);
  const name = `Spital ${Date.now()}`;
  await page.goto("/c/leitung/administration/konfiguration");
  const card = page.locator(".admin-webhooks-card");
  try {
    await card.getByRole("button", { name: "Webhook anlegen" }).click();
    const create = page.getByRole("dialog", { name: "Webhook anlegen" });
    await create.getByLabel("Name", { exact: true }).fill(name);
    await create.getByLabel("Adresse (https)").fill("https://127.0.0.1/hook");
    await create.getByLabel("Personendaten geändert (Name, Geburtsdatum, Geschlecht, Status …)").check();
    await create.getByRole("button", { name: "Anlegen" }).click();
    await expect(create.getByRole("alert")).toContainText("internen Netz");
    await create.getByLabel("Adresse (https)").fill("https://example.org/carecore");
    await create.getByRole("button", { name: "Anlegen" }).click();
    const shown = page.getByRole("dialog", { name: `Geheimnis für „${name}“` });
    expect(await shown.getByLabel("Geheimnis").inputValue()).toMatch(/^whsec_/);
    await shown.getByRole("button", { name: "Fertig" }).click();
    const row = card.locator(".admin-retention-row", { hasText: name });
    await expect(row).toContainText("https://example.org/carecore");
    await expect(row).toContainText("noch keine Meldung");

    await row.getByRole("button", { name: "Entfernen" }).click();
    await page
      .getByRole("dialog", { name: `„${name}“ entfernen` })
      .getByRole("button", { name: "Entfernen" })
      .click();
    await expect(page.locator(".toast")).toContainText("entfernt");
    await expect(card).not.toContainText(name);
  } finally {
    const list = (await (await page.request.get("/api/admin/webhooks")).json()) as {
      webhooks: Array<{ id: string; name: string }>;
    };
    for (const hook of list.webhooks.filter((item) => item.name === name))
      await page.request.delete("/api/admin/webhooks", { data: { webhookId: hook.id } });
  }
  expect(errors).toEqual([]);
});

// Passkeys: mit dem virtuellen Authenticator von Chromium (Bestätigung am Gerät simuliert) einrichten und anmelden.
test("Passkeys: einrichten, ohne Passwort anmelden, entfernen", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await login(page, FAGE);
  const errors = watchErrors(page);
  await page.goto("/c/einstellungen/security");
  const detail = page.locator(".settings-detail");
  await page.locator(".settings-list button", { hasText: "Passkeys" }).click();
  await detail.getByLabel("Name für dieses Gerät").fill("Stationstablet");
  await detail.getByRole("button", { name: "Passkey hinzufügen" }).click();
  await expect(page.locator(".toast")).toContainText("Passkey gespeichert");
  await expect(detail).toContainText("Stationstablet");
  await expect(page.locator(".settings-list button", { hasText: "Passkeys" })).toContainText("1 gespeichert");

  // Abmelden, dann nur mit dem Passkey wieder anmelden – ohne Benutzername und Passwort.
  await page.context().clearCookies();
  await page.goto("/");
  // Der virtuelle Authenticator beantwortet den Vorschlag im Feld „Benutzername“ (Autofill) sofort; sonst der Knopf.
  await page.waitForURL(/\/c(\/|$)/, { timeout: 5000 }).catch(async () => {
    await page.getByRole("button", { name: "Mit Passkey anmelden" }).click();
    await page.waitForURL(/\/c(\/|$)/);
  });
  await page.goto("/c/einstellungen/security");
  await page.locator(".settings-list button", { hasText: "Passkeys" }).click();
  await expect(detail).toContainText("zuletzt verwendet");
  await detail.getByRole("button", { name: "Entfernen" }).click();
  await expect(page.locator(".toast")).toContainText("entfernt");
  await expect(page.locator(".settings-list button", { hasText: "Passkeys" })).toContainText("Keine");
  expect(errors).toEqual([]);
});

// SSO über OpenID Connect gegen den lokalen Test-Anbieter (tests/support/mock-oidc.mjs).
test("SSO: einrichten, Verbindung prüfen, über den Identity-Provider anmelden", async ({ page }) => {
  const idp = `http://localhost:${Number(process.env.E2E_OIDC_PORT ?? 3299)}`;
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/leitung/administration/konfiguration");
  const card = page.locator(".admin-sso-card");
  try {
    await card.getByRole("button", { name: /SSO (einrichten|bearbeiten)/ }).click();
    const dialog = page.locator("#sso-editor-title").locator("xpath=ancestor::section[1]");
    await dialog.getByLabel("Adresse des Identity-Providers (Issuer)").fill(idp);
    await dialog.getByLabel("Client-ID").fill("carecore-test");
    await dialog.getByLabel("Client-Secret").fill("carecore-test-secret");
    await dialog.getByLabel("Bezeichnung auf der Anmeldeseite").fill("Test-IdP");
    await dialog.getByLabel("Anmeldung über SSO anbieten").check();
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(page.locator(".toast")).toContainText("SSO gespeichert und eingeschaltet");
    await expect(card).toContainText("Eingeschaltet");
    await card.getByRole("button", { name: "Verbindung prüfen" }).click();
    await expect(page.locator(".toast")).toContainText("Verbindung in Ordnung");

    // Der Identity-Provider meldet Lena Bucher an; CareCore kennt sie über den Benutzernamen.
    expect((await page.request.get(`${idp}/__user?username=${FAGE.username}`)).ok()).toBe(true);
    // Erst die Seite verlassen, damit keine Hintergrundabfrage ohne Sitzung (401) mehr läuft.
    await page.goto("about:blank");
    await page.context().clearCookies();
    await page.goto("/");
    await page.getByRole("link", { name: "Mit Test-IdP anmelden" }).click();
    await page.waitForURL(/\/c(\/|$)/);
    const me = (await (await page.request.get("/api/work-context")).json()) as { profile: { displayName: string } };
    expect(me.profile.displayName).toBe("Lena Bucher");

    // Unbekanntes Konto: zurück zur Anmeldung mit Hinweis.
    await page.request.get(`${idp}/__user?username=unbekannt`);
    // Erst die Seite verlassen, damit keine Hintergrundabfrage ohne Sitzung (401) mehr läuft.
    await page.goto("about:blank");
    await page.context().clearCookies();
    await page.goto("/");
    await page.getByRole("link", { name: "Mit Test-IdP anmelden" }).click();
    await expect(page.locator(".login-error")).toContainText("keinen aktiven Zugang");
  } finally {
    await page.goto("about:blank");
    await page.context().clearCookies();
    await login(page, ADMIN);
    await page.request.put("/api/admin/sso", {
      data: {
        enabled: false,
        issuer: idp,
        clientId: "carecore-test",
        usernameClaim: "preferred_username",
        buttonLabel: "Test-IdP",
      },
    });
  }
  expect(errors).toEqual([]);
});

test("Rollen: Systemrolle kopieren – neue eigene Rolle mit denselben Berechtigungen", async ({ page }) => {
  await login(page, ADMIN);
  const errors = watchErrors(page);
  await page.goto("/c/leitung/administration/mitarbeiter");
  const roles = page.locator(".admin-roles-card");
  await roles.locator(".admin-role-row", { hasText: "Pflege" }).first().click();
  const panel = page.locator(".user-editor-panel");
  const granted = await panel.locator(".user-editor-role button.active small").allTextContents();
  await panel.getByRole("button", { name: "Rolle kopieren" }).click();
  await expect(panel.getByRole("heading", { name: "Kopie als eigene Rolle" })).toBeVisible();
  const key = `pflege-e2e-${Date.now().toString(36)}`;
  await panel.getByLabel("Name").fill("Pflege Nachtdienst");
  await panel.getByLabel("Rollen-Schlüssel").fill(key);
  await panel.getByRole("button", { name: "Rolle speichern" }).click();
  await expect(page.getByText("Rolle kopiert")).toBeVisible();
  const copy = roles.locator(".admin-role-row", { hasText: "Pflege Nachtdienst" });
  await expect(copy).toContainText("Eigene Rolle");
  await copy.click();
  expect(await panel.locator(".user-editor-role button.active small").allTextContents()).toEqual(granted);
  // Aufräumen: die Kopie ist niemandem zugeordnet und lässt sich löschen.
  await panel.getByRole("button", { name: "Rolle löschen" }).click();
  await expect(copy).toHaveCount(0);
  expect(errors).toEqual([]);
});
