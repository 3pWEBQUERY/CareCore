// CareCore Service Worker: die App öffnet sich auch ohne Verbindung.
// - Programmdateien (/_next/static, Symbole): aus dem Speicher, sie ändern sich nie.
// - Seiten: aus dem Netz, ohne Verbindung die zuletzt geladene Fassung.
// - Daten (GET /api/…): aus dem Netz, ohne Verbindung die zuletzt geladenen Daten; die Seite erfährt davon
//   per Nachricht („Stand der Daten“). Beim Abmelden und Anmelden werden Seiten und Daten gelöscht.
// Schreibende Anfragen gehen immer ans Netz; offline erfasste Einträge verwaltet die App selbst
// (app/components/offline-queue.ts).
// Push: zeigt den Titel einer Benachrichtigung (lib/push.ts); ein Tipp öffnet die zugehörige Seite.
const VERSION = "v1";
const STATIC = `carecore-static-${VERSION}`;
const PAGES = `carecore-pages-${VERSION}`;
const DATA = `carecore-data-${VERSION}`;

// Nicht zwischengespeichert: Anmeldung, Dateien und Fotos, Exporte, KI.
const NO_CACHE = /^\/api\/(auth|cloud|ai|intelligenz|push)\b|\/photos\/|\/export\b|\/files?\//;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (![STATIC, PAGES, DATA].includes(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const message = event.data ?? {};
  if (message.type === "clear-data")
    event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(DATA)]));
  if (message.type === "warm" && Array.isArray(message.urls)) event.waitUntil(warm(message.urls));
});

// Seiten und ihre Programmdateien vorab laden, damit sie auch ohne vorherigen Besuch offline öffnen.
async function warm(urls) {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(STATIC);
  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok || response.redirected) continue;
      const html = await response.clone().text();
      await pages.put(url, response);
      const files = new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []);
      for (const file of files) if (!(await assets.match(file))) await assets.add(file).catch(() => undefined);
    } catch {
      return;
    }
  }
}

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = {};
  }
  event.waitUntil(
    self.registration.showNotification(message.title || "CareCore", {
      body: "In CareCore öffnen",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: message.tag,
      data: { url: typeof message.url === "string" && message.url.startsWith("/") ? message.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return open.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || /^\/(icons\/|body-surfaces\/|carecore-|favicon)/.test(url.pathname))
    return event.respondWith(cacheFirst(request));
  if (request.mode === "navigate") return event.respondWith(page(request));
  if (url.pathname.startsWith("/api/") && !NO_CACHE.test(url.pathname))
    return event.respondWith(data(request, event.clientId));
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function page(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic" && !response.redirected) await cache.put(request, response.clone());
    return response;
  } catch {
    const url = new URL(request.url);
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ?? (await cache.match(`${url.pathname.replace(/\/$/, "")}`));
    if (cached) return cached;
    return new Response(
      `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CareCore · Offline</title><body style="font-family:system-ui,sans-serif;background:#f3f7fc;color:#102a43;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:22px">Keine Verbindung</h1><p>Diese Seite wurde auf diesem Gerät noch nicht geöffnet und ist offline nicht verfügbar. Sobald die Verbindung zurück ist, lädt sie wieder.</p></main></body></html>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}

async function data(request, clientId) {
  const cache = await caches.open(DATA);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = new Response(await response.clone().blob(), { status: response.status, headers: response.headers });
      copy.headers.set("x-carecore-cached-at", new Date().toISOString());
      await cache.put(request, copy);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    const client = clientId ? await self.clients.get(clientId) : null;
    client?.postMessage({ type: "offline-data", cachedAt: cached?.headers.get("x-carecore-cached-at") ?? null });
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Keine Verbindung. Diese Daten wurden auf diesem Gerät noch nicht geladen." }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }
}
