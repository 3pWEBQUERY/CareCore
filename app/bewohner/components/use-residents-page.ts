"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ResidentRecordData } from "./resident-record-data";
import { ResidentRow, residentStatusValues, toResident } from "./residents-utils";
import { ResidentStatusFilter } from "./residents-utils";

export function useResidentsPage() {
  const [query, setQuery] = useState("");
  const [residents, setResidents] = useState<ResidentRecordData[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [admissionsThisWeek, setAdmissionsThisWeek] = useState(0);
  const [unit, setUnit] = useState("Alle");
  const [statusFilter, setStatusFilter] = useState<ResidentStatusFilter>("Alle");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentRecordData | null>(null);
  const [intakeEditorOpen, setIntakeEditorOpen] = useState(false);
  const [toast, setToast] = useState("");

  const loadResidents = useCallback(async () => {
    try {
      const response = await fetch("/api/residents", { cache: "no-store" });
      if (!response.ok) throw new Error("Bewohner konnten nicht geladen werden.");
      const data = (await response.json()) as {
        residents: ResidentRow[];
        units: { name: string }[];
        primaryCareUnitName: string | null;
      };
      const records = data.residents.map(toResident);
      setResidents(records);
      const residentId = new URLSearchParams(window.location.search).get("resident");
      if (residentId) setSelectedResident(records.find((resident) => resident.id === residentId) ?? null);
      setUnits(data.units.map((item) => item.name));
      setUnit(
        data.primaryCareUnitName && data.units.some((item) => item.name === data.primaryCareUnitName)
          ? data.primaryCareUnitName
          : "Alle",
      );
      const start = Date.now() - 7 * 86400000;
      setAdmissionsThisWeek(
        data.residents.filter((item) => item.admitted_on && new Date(item.admitted_on).getTime() >= start).length,
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Daten konnten nicht geladen werden.");
    }
  }, [setToast, setSelectedResident, setResidents]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadResidents();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadResidents]);

  const openSearch = useCallback(() => {
    setSelectedResident(null);
    setSearchOpen(true);
  }, [setSelectedResident, setSearchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSelectedResident(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredResidents = useMemo(
    () =>
      residents.filter((resident) => {
        const matchesQuery = `${resident.name} ${resident.room} ${resident.note}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesUnit = unit === "Alle" || resident.unit === unit;
        const matchesStatus =
          statusFilter === "Alle" || resident.lifecycleStatus === residentStatusValues[statusFilter];
        return matchesQuery && matchesUnit && matchesStatus;
      }),
    [query, unit, statusFilter, residents],
  );
  return {
    query,
    setQuery,
    residents,
    setResidents,
    units,
    setUnits,
    admissionsThisWeek,
    setAdmissionsThisWeek,
    unit,
    setUnit,
    statusFilter,
    setStatusFilter,
    filtersOpen,
    setFiltersOpen,
    searchOpen,
    setSearchOpen,
    selectedResident,
    setSelectedResident,
    intakeEditorOpen,
    setIntakeEditorOpen,
    toast,
    setToast,
    loadResidents,
    openSearch,
    filteredResidents,
  };
}

export type ResidentsPageState = ReturnType<typeof useResidentsPage>;
