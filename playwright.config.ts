import { defineConfig, devices } from "@playwright/test";

// Klicktests gegen die gebaute App (`next build` vorher). Die Datenbankanfragen des Neon-Treibers beantwortet
// eine echte Postgres (TEST_DATABASE_URL, siehe tests/support/neon-pg.mjs), vorbereitet mit `npm run test:e2e:setup`.
const port = Number(process.env.E2E_PORT ?? 3200);
// Nur für die Testdatenbank; in CI und lokal ohne Geheimnis.
export const E2E_ADMIN_PASSWORD = "E2E-Admin-Passwort-2026";
// Schlüssel für die Zwei-Faktor-Anmeldung, nur für die Klicktests (32 Bytes, Base64).
export const E2E_MFA_KEY = Buffer.alloc(32, 42).toString("base64");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "de-CH",
    timezoneId: "Europe/Zurich",
    viewport: { width: 1440, height: 950 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 950 } } }],
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_OPTIONS: "--import ./tests/support/neon-pg.mjs",
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      CARECORE_ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      CARECORE_MFA_KEY: E2E_MFA_KEY,
    },
  },
});
