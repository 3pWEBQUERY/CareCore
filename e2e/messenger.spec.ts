import { expect, test } from "@playwright/test";
import { ADMIN, FAGE, login, watchErrors } from "./support";

// Messenger: @Erwähnung mit Namensvorschlag, Reaktion und Benachrichtigung der erwähnten Person.
test("Messenger: Person erwähnen und auf eine Nachricht reagieren", async ({ page }) => {
  await login(page, FAGE);
  const lena = (
    (await (await page.request.get("/api/conversations")).json()) as {
      actor: { id: string; displayName: string };
    }
  ).actor;
  await page.context().clearCookies();

  await login(page, ADMIN);
  const errors = watchErrors(page);
  const title = `E2E Frühdienst ${Date.now()}`;
  const created = await page.request.post("/api/conversations", {
    data: { action: "conversation", kind: "group", title, memberIds: [lena.id] },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/c/carecore-one/messenger?conversation=${id}`);
  await expect(page.locator(".messages-thread-heading")).toContainText(title);
  const input = page.getByLabel("Nachricht", { exact: true });
  await input.fill(`@${lena.displayName.slice(0, 3)}`);
  await page.getByRole("listbox", { name: "Person erwähnen" }).getByRole("option", { name: lena.displayName }).click();
  await expect(input).toHaveValue(`@${lena.displayName} `);
  await input.pressSequentially("bitte Zimmer 12 übernehmen");
  await page.getByRole("button", { name: "Nachricht senden" }).click();

  const row = page.locator(".message-row", { hasText: "bitte Zimmer 12 übernehmen" });
  await expect(row.locator(".message-mention")).toHaveText(`@${lena.displayName}`);
  await row.getByRole("button", { name: "Reaktion hinzufügen" }).click();
  await row.getByRole("button", { name: "Mit 👍 reagieren" }).click();
  const reaction = row.locator(".message-reactions button", { hasText: "👍" });
  await expect(reaction).toHaveText("👍 1");
  await expect(reaction).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);

  // Die erwähnte Person erhält eine Benachrichtigung mit Link in die Unterhaltung.
  await page.context().clearCookies();
  await login(page, FAGE);
  const { notifications } = (await (await page.request.get("/api/notifications")).json()) as {
    notifications: Array<{ type: string; body: string; link_url: string }>;
  };
  const mention = notifications.find((item) => item.type === "message_mention" && item.body.startsWith(title));
  expect(mention?.link_url).toBe(`/c/carecore-one/messenger?conversation=${id}`);
});
