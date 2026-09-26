"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { WorkContext } from "@/lib/work-context";

// Working context shared by all modules of a browser tab: the resident being
// cared for and the care unit. Picking a resident in the header or in any
// module list carries over to the next module, so staff select a resident once
// and move through documentation, medication, vital signs etc. like in a
// resident chart.

const RESIDENT_KEY = "carecore.residentId";
const UNIT_KEY = "carecore.careUnitId";
const EVENT = "carecore:context";

function read(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (read(key) === value) return;
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable (private mode): the context then lives only in memory.
    memory.set(key, value);
  }
  window.dispatchEvent(new Event(EVENT));
}

const memory = new Map<string, string | null>();

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function useStored(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? memory.get(key) ?? null,
    () => null,
  );
  const set = useCallback((next: string | null) => write(key, next), [key]);
  return [value, set] as const;
}

export const useCareResident = () => useStored(RESIDENT_KEY);
export const useCareUnit = () => useStored(UNIT_KEY);
export const setCareResident = (id: string | null) => write(RESIDENT_KEY, id);
export const setCareUnit = (id: string | null) => write(UNIT_KEY, id);

// One request per page view for the header, sidebar and mobile navigation; client-side
// navigation reuses it for a minute so new residents appear without a reload.
let pending: Promise<WorkContext | null> | null = null;
let loadedAt = 0;

export function loadWorkContext(refresh = false) {
  if (!pending || refresh || Date.now() - loadedAt > 60_000) {
    loadedAt = Date.now();
    pending = fetch("/api/work-context", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<WorkContext>) : null))
      .catch(() => null);
  }
  return pending;
}

export function useWorkContext() {
  const [context, setContext] = useState<WorkContext | null>(null);
  useEffect(() => {
    let live = true;
    void loadWorkContext().then((data) => live && setContext(data));
    return () => {
      live = false;
    };
  }, []);
  return context;
}

// Resident-centred pages show the resident chosen in the header. `missing` means the
// header resident has no data on this page (e.g. not in the page's list).
export function useHeaderResident<T extends { id: string }>(list: T[], loading: boolean) {
  const [contextId] = useCareResident();
  const resident = contextId ? (list.find((item) => item.id === contextId) ?? null) : null;
  return { resident, contextId, missing: !loading && !!contextId && !resident };
}

const PICK_EVENT = "carecore:pick-resident";

// Opens the resident picker of the header.
export const openResidentPicker = () => window.dispatchEvent(new Event(PICK_EVENT));

export function useResidentPickerRequests(open: () => void) {
  useEffect(() => {
    window.addEventListener(PICK_EVENT, open);
    return () => window.removeEventListener(PICK_EVENT, open);
  }, [open]);
}
