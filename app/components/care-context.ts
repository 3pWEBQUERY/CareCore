"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { termsFor, type Terms } from "@/lib/terminology";
import { VITAL_METRICS } from "@/lib/vitals-shared";
import { countryProfile, type CountryProfile } from "@/lib/country";
import type { WorkContext } from "@/lib/work-context";
import { useLiveEvent } from "./live-events";

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

// One request per page view for the header, sidebar and mobile navigation; client-side
// navigation reuses it for a minute so new residents appear without a reload.
let pending: Promise<WorkContext | null> | null = null;
let loadedAt = 0;

const WORK_CONTEXT_EVENT = "carecore:work-context";

// Neu geladener Arbeitskontext (nach loadWorkContext(true)); gibt die Abmeldung zurück.
export function onWorkContextRefresh(listener: (context: WorkContext) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<WorkContext>).detail);
  window.addEventListener(WORK_CONTEXT_EVENT, handle);
  return () => window.removeEventListener(WORK_CONTEXT_EVENT, handle);
}

export function loadWorkContext(refresh = false) {
  if (!pending || refresh || Date.now() - loadedAt > 60_000) {
    loadedAt = Date.now();
    pending = fetch("/api/work-context", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<WorkContext>) : null))
      .catch(() => null);
    // Nach einer Änderung (z. B. Name der Einrichtung) übernehmen alle Anzeigen den neuen Stand ohne Neuladen.
    if (refresh)
      void pending.then(
        (data) => data && window.dispatchEvent(new CustomEvent<WorkContext>(WORK_CONTEXT_EVENT, { detail: data })),
      );
  }
  return pending;
}

export function useWorkContext() {
  const [context, setContext] = useState<WorkContext | null>(null);
  useEffect(() => {
    let live = true;
    void loadWorkContext().then((data) => live && setContext(data));
    const stop = onWorkContextRefresh(setContext);
    return () => {
      live = false;
      stop();
    };
  }, []);
  return context;
}

// Bezeichnung der betreuten Personen der Einrichtung; bis der Arbeitskontext geladen ist „Bewohner“.
export function useTerms(): Terms {
  const context = useWorkContext();
  return termsFor(context?.terminology);
}

// Vorgaben des Landes der Einrichtung (Pflegestufen, Sozialversicherungsnummer usw.); bis zum Laden die Schweiz.
export function useCountry(): CountryProfile {
  return countryProfile(useWorkContext()?.country);
}

// Vitalparameter, die die Einrichtung erfasst (Leitung › Konfiguration); bis zum Laden alle.
export function useVitalMetrics() {
  const hidden = useWorkContext()?.hiddenVitals;
  return hidden?.length ? VITAL_METRICS.filter((metric) => !hidden.includes(metric.key)) : VITAL_METRICS;
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

// Stepping through the residents of the current resident's care unit (header arrows,
// "Speichern & nächster Bewohner"). Order: as in the header picker.
export function useResidentNavigation() {
  const context = useWorkContext();
  const [residentId, setResidentId] = useCareResident();
  const residents = context?.residents ?? [];
  const current = residents.find((resident) => resident.id === residentId) ?? null;
  const list = current ? residents.filter((resident) => resident.careUnitId === current.careUnitId) : residents;
  const index = current ? list.findIndex((resident) => resident.id === current.id) : -1;
  const step = (offset: number) => {
    if (!list.length) return null;
    const next = list[(Math.max(index, 0) + offset + list.length) % list.length];
    setResidentId(next.id);
    return next;
  };
  return {
    position: index + 1,
    total: list.length,
    unit: current?.group ?? null,
    previous: () => step(-1),
    next: () => step(1),
  };
}

// Sidebar badge counts; sofort bei Änderungen an Aufgaben, Übergaben und Nachrichten (Echtzeit) und jede Minute
// (überfällige Gaben ergeben sich aus der Uhrzeit).
export type NavigationBadges = { tasks: number; handover: number; medRound: number; messages: number };

export function useNavigationBadges() {
  const [badges, setBadges] = useState<NavigationBadges | null>(null);
  const reload = useRef<() => void>(() => undefined);
  useLiveEvent("work", () => reload.current());
  useLiveEvent("messages", () => reload.current());
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/navigation/badges", { cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<NavigationBadges>) : null))
        .then((data) => live && data && setBadges(data))
        .catch(() => undefined);
    reload.current = () => void load();
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, []);
  return badges;
}
