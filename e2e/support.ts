import { expect, type Page, type Request } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../playwright.config";

export const DEMO_PASSWORD = "Dienstplan-Demo-2026";
export const ADMIN = { username: "Admin", password: E2E_ADMIN_PASSWORD };
// Demo-Personal aus database/seed-roster.ts: Fachperson Gesundheit und Pflegehelferin SRK.
export const FAGE = { username: "demo.ahorn.lena", password: DEMO_PASSWORD };
export const SRK = { username: "demo.ahorn.carla", password: DEMO_PASSWORD };

// Anmeldung über die API (setzt das Sitzungs-Cookie im Browserkontext).
export async function login(page: Page, user: { username: string; password: string }) {
  const response = await page.request.post("/api/auth/login", { data: user });
  expect(response.status(), `Anmeldung ${user.username}`).toBe(200);
}

// Sammelt Skriptfehler, Serverfehler (5xx) und abgelehnte API-Anfragen (4xx) einer Seite; am Ende eines Tests
// muss die Liste leer sein. Erwartete Ablehnungen (z. B. „403 POST /api/medication/stock“) stehen in `expected`.
export function watchErrors(page: Page, expected: RegExp[] = []) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`Skriptfehler: ${error.message}`));
  // Von der Content-Security-Policy blockierte Inhalte (Skripte, Bilder, Verbindungen) gelten als Fehler.
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text()))
      errors.push(`CSP: ${message.text()}`);
  });
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    const entry = `${response.status()} ${response.request().method()} ${path}`;
    if (response.status() >= 500 || (response.status() >= 400 && path.startsWith("/api/")))
      if (!expected.some((pattern) => pattern.test(entry))) errors.push(entry);
  });
  return errors;
}

// Feld in einem Dialog über seine Beschriftung.
export const field = (page: Page, label: string | RegExp) =>
  page.locator(".editor-dialog label", { hasText: label }).locator("input, textarea").first();

// Wie waitForLoadState("networkidle"), aber ohne die dauerhaft offene Echtzeit-Verbindung (/api/events): wartet, bis
// 500 ms lang keine andere Anfrage mehr offen ist.
export async function waitForNetworkIdle(page: Page, timeout = 30_000) {
  const open = new Set<Request>();
  const live = (request: Request) => new URL(request.url()).pathname === "/api/events";
  const started = (request: Request) => !live(request) && open.add(request);
  const done = (request: Request) => open.delete(request);
  page.on("request", started);
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  try {
    await page.waitForLoadState("load");
    const deadline = Date.now() + timeout;
    let quietSince = Date.now();
    while (Date.now() < deadline) {
      if (open.size) quietSince = Date.now();
      else if (Date.now() - quietSince >= 500) return;
      await page.waitForTimeout(100);
    }
    throw new Error(`Netzwerk nicht ruhig nach ${timeout} ms: ${[...open].map((r) => r.url()).join(", ")}`);
  } finally {
    page.off("request", started);
    page.off("requestfinished", done);
    page.off("requestfailed", done);
  }
}
