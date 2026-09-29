import { expect, test } from "@playwright/test";

// Öffentlicher Zustand ohne Anmeldung: Datenbank erreichbar, alle Migrationen angewendet, nicht zwischengespeichert.
test("Health: /api/health meldet „ok“ ohne Anmeldung und ohne Geheimnisse", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = (await response.json()) as {
    status: string;
    database: { reachable: boolean };
    migrations: { latest: string | null; pending: string[] | null };
  };
  expect(body.status).toBe("ok");
  expect(body.database.reachable).toBe(true);
  expect(body.migrations.latest).toMatch(/^\d{4}_[\w-]+\.sql$/);
  expect(body.migrations.pending).toEqual([]);
  expect(JSON.stringify(body)).not.toMatch(/postgres(ql)?:\/\/|password/i);
});
