// Offline erfasste Einträge (Dokumentation, Vitalwerte, Trinkmenge, Mahlzeit, persönliche Notizen …) warten auf diesem Gerät, bis die
// Verbindung zurück ist, und werden dann in der erfassten Reihenfolge gesendet. Jeder Eintrag trägt eine Kennung
// (x-carecore-request-id); der Server speichert dieselbe Anfrage nie doppelt. Gesendet wird nur mit der Sitzung
// der Person, die den Eintrag erfasst hat.

export const REQUEST_ID_HEADER = "x-carecore-request-id";
export const QUEUE_EVENT = "carecore-offline-queue";

export type WriteMethod = "POST" | "PATCH" | "DELETE";

export type QueuedWrite = {
  id: string;
  userId: string;
  url: string;
  // Ohne Angabe POST; PATCH und DELETE z. B. für persönliche Notizen.
  method?: WriteMethod;
  body: unknown;
  label: string;
  createdAt: string;
  // Textfeld, das vor dem Senden noch korrigiert werden kann (z. B. der Dokumentationstext).
  editable?: { field: string; label: string };
  // Vom Server abgelehnt (z. B. Eingabe ungültig): bleibt sichtbar, bis die Person ihn verwirft.
  error?: string;
};

const DB = "carecore-offline";
const STORE = "outbox";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

const changed = () => window.dispatchEvent(new Event(QUEUE_EVENT));

export async function queuedWrites(userId: string | null) {
  const all = await withStore<QueuedWrite[]>("readonly", (store) => store.getAll());
  return all.filter((item) => item.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function discardWrite(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
  changed();
}

async function saveWrite(item: QueuedWrite) {
  await withStore("readwrite", (store) => store.put(item));
  changed();
}

// Vorgemerkten Eintrag korrigieren: neuer Text im bearbeitbaren Feld; ein abgelehnter Eintrag wird damit erneut
// gesendet (die Kennung bleibt, der Server hat ihn ja nicht gespeichert).
export async function editWrite(item: QueuedWrite, value: string) {
  if (!item.editable || !item.body || typeof item.body !== "object") return;
  await saveWrite({
    ...item,
    body: { ...(item.body as Record<string, unknown>), [item.editable.field]: value },
    error: undefined,
  });
}

// Angemeldete Person (von OfflineSync gesetzt), damit Einträge nur mit ihrer Sitzung gesendet werden.
let currentUserId: string | null = null;
export const setOfflineUser = (userId: string | null) => {
  currentUserId = userId;
};
export const offlineUser = () => currentUserId;

async function post(url: string, body: unknown, requestId: string, method: WriteMethod = "POST") {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: { "content-type": "application/json", [REQUEST_ID_HEADER]: requestId },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

// Sendet den Eintrag; ohne Verbindung wird er auf dem Gerät vorgemerkt ({ queued: true }).
// `body` enthält den erfassten Zeitpunkt, damit der Eintrag später mit der richtigen Zeit gespeichert wird.
export async function sendOrQueue<T>(
  url: string,
  body: unknown,
  label: string,
  editable?: { field: string; label: string },
  method: WriteMethod = "POST",
): Promise<{ queued: false; data: T } | { queued: true }> {
  const requestId = crypto.randomUUID();
  try {
    const { response, payload } = await post(url, body, requestId, method);
    if (!response.ok) throw new Error(payload?.error || "Die Anfrage ist fehlgeschlagen.");
    return { queued: false, data: payload as T };
  } catch (error) {
    // Nur Verbindungsfehler werden vorgemerkt; Ablehnungen des Servers zeigt das Formular direkt.
    if (!(error instanceof TypeError)) throw error;
    if (!currentUserId) throw new Error("Keine Verbindung. Der Eintrag konnte nicht gespeichert werden.");
    await saveWrite({
      id: requestId,
      userId: currentUserId,
      url,
      method,
      body,
      label,
      createdAt: new Date().toISOString(),
      editable,
    });
    return { queued: true };
  }
}

// Sendet die vorgemerkten Einträge der angemeldeten Person der Reihe nach.
// Ergebnis: gesendet, abgelehnt, und ob die Anmeldung abgelaufen ist.
// Nur ein Sendevorgang gleichzeitig: sonst schicken zwei Auslöser (z. B. „online“ und Intervall) denselben Eintrag
// doppelt, und der zweite scheitert an der bereits vergebenen Quittung.
let flushing: Promise<{ sent: number; rejected: number; signedOut: boolean }> | null = null;

export function flushQueue() {
  flushing ??= sendQueued().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function sendQueued() {
  const result = { sent: 0, rejected: 0, signedOut: false };
  if (!currentUserId) return result;
  for (const item of await queuedWrites(currentUserId)) {
    if (item.error) continue;
    let outcome: Awaited<ReturnType<typeof post>>;
    try {
      outcome = await post(item.url, item.body, item.id, item.method ?? "POST");
    } catch {
      break;
    }
    if (outcome.response.ok) {
      await discardWrite(item.id);
      result.sent += 1;
    } else if (outcome.response.status === 401) {
      result.signedOut = true;
      break;
    } else if (outcome.response.status >= 500) {
      break;
    } else {
      await saveWrite({ ...item, error: outcome.payload?.error || "Der Eintrag wurde abgelehnt." });
      result.rejected += 1;
    }
  }
  return result;
}

// Service Worker: Seiten und Daten des Geräts löschen (Abmelden, Personenwechsel).
export function clearOfflineData() {
  navigator.serviceWorker?.controller?.postMessage({ type: "clear-data" });
}
