"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AppHeader from "../components/app-header";
import AppSidebar from "../components/app-sidebar";
import { CareDatePicker, CareSelect, formatCareDate } from "../components/care-form-controls";
import { ResidentRecord, type ResidentRecordData } from "./components/resident-record";
import {
  ArrowsLeftRight,
  Bell,
  Buildings,
  CalendarDots,
  CaretDown,
  CaretRight,
  ChartBar,
  ChatsCircle,
  Check,
  ClipboardText,
  Files,
  FirstAidKit,
  ForkKnife,
  Funnel,
  GearSix,
  GraduationCap,
  Heartbeat,
  House,
  ListChecks,
  MagnifyingGlass,
  NotePencil,
  Pill,
  Plus,
  Pulse,
  ShieldCheck,
  SidebarSimple,
  Sparkle,
  Stethoscope,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";

type IconName =
  | "home"
  | "residents"
  | "tasks"
  | "handover"
  | "calendar"
  | "team"
  | "learn"
  | "docs"
  | "chart"
  | "quality"
  | "settings"
  | "search"
  | "bell"
  | "building"
  | "chevron"
  | "caretDown"
  | "alert"
  | "check"
  | "plus"
  | "pulse"
  | "close"
  | "note"
  | "vitals"
  | "plan"
  | "med"
  | "wounds"
  | "nutrition"
  | "assess"
  | "shift"
  | "ai"
  | "sidebar"
  | "filter";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const icons = {
    home: House,
    residents: UsersThree,
    tasks: ListChecks,
    handover: ArrowsLeftRight,
    calendar: CalendarDots,
    team: ChatsCircle,
    learn: GraduationCap,
    docs: Files,
    chart: ChartBar,
    quality: ShieldCheck,
    settings: GearSix,
    search: MagnifyingGlass,
    bell: Bell,
    building: Buildings,
    chevron: CaretRight,
    caretDown: CaretDown,
    alert: Warning,
    check: Check,
    plus: Plus,
    pulse: Pulse,
    close: X,
    note: NotePencil,
    vitals: Heartbeat,
    plan: ClipboardText,
    med: Pill,
    wounds: FirstAidKit,
    nutrition: ForkKnife,
    assess: Stethoscope,
    shift: Heartbeat,
    ai: Sparkle,
    sidebar: SidebarSimple,
    filter: Funnel,
  };
  const Component = icons[name];
  return <Component className={className} aria-hidden="true" weight="regular" />;
}

type NavModule = { id: string; label: string; icon: IconName; children: string[]; badge?: number; href?: string };
type NavGroup = { id: string; label: string; modules: NavModule[] };

const navigation: NavGroup[] = [
  {
    id: "clinical",
    label: "Pflege & Klinik",
    modules: [
      {
        id: "residents",
        label: "Bewohner",
        icon: "residents",
        href: "/bewohner",
        children: ["Übersicht", "Verlauf", "Pflegeakte"],
      },
      {
        id: "plan",
        label: "Pflegeplanung",
        icon: "plan",
        children: ["Pflegeplanung", "Ziele & Massnahmen", "Auswertung"],
      },
      {
        id: "chart",
        label: "Pflegedokumentation",
        icon: "note",
        children: ["Schnelldokumentation", "Verlaufsdokumentation"],
      },
      { id: "vitals", label: "Vitalwerte", icon: "vitals", children: ["Übersicht", "Entwicklung", "Grenzwerte"] },
      {
        id: "med",
        label: "Medikation",
        icon: "med",
        children: ["Medikamentenplan", "Medikamentenrunde", "Bestände", "Reserven"],
      },
      { id: "wounds", label: "Wundmanagement", icon: "wounds", children: ["Wundübersicht", "Dokumentation"] },
      { id: "nutrition", label: "Ernährung", icon: "nutrition", children: ["Ernährungsplan", "Trinkprotokoll"] },
      { id: "assess", label: "Einschätzungen", icon: "assess", children: ["Einschätzungen", "Fälligkeiten"] },
    ],
  },
  {
    id: "operations",
    label: "Betrieb",
    modules: [
      {
        id: "shift",
        label: "Schicht",
        icon: "shift",
        href: "/betrieb/schicht",
        children: ["Mein Dienst", "Schichtverlauf"],
      },
      { id: "tasks", label: "Aufgaben", icon: "tasks", children: ["Meine Aufgaben", "Teamaufgaben"], badge: 3 },
      { id: "handover", label: "Übergabe", icon: "handover", children: ["Meine Übergabe", "Seit letztem Dienst"] },
      { id: "schedule", label: "Dienstplanung", icon: "calendar", children: ["Mein Dienstplan", "Teamplanung"] },
    ],
  },
  {
    id: "workforce",
    label: "Personal",
    modules: [
      { id: "team", label: "Team", icon: "team", children: ["Neuigkeiten & Kanäle", "Nachrichten"] },
      { id: "learn", label: "Schulungen", icon: "learn", children: ["Meine Schulungen", "Pflichtnachweise"] },
      { id: "docs", label: "Dokumente", icon: "docs", children: ["Dokumente", "Standards & Weisungen"] },
    ],
  },
  {
    id: "management",
    label: "Leitung",
    modules: [
      { id: "quality", label: "Qualität", icon: "quality", children: ["Ereignisse", "Massnahmen"] },
      { id: "insights", label: "Kennzahlen & Analysen", icon: "chart", children: ["Pflege", "Leitung", "Personal"] },
      {
        id: "admin",
        label: "Administration",
        icon: "settings",
        children: ["Organisation", "Mitarbeiter", "Konfiguration"],
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligenz",
    modules: [{ id: "ai", label: "CareCore KI", icon: "ai", children: ["Assistenz", "KI-Entwürfe"] }],
  },
  {
    id: "rai",
    label: "CareCore RAI",
    modules: [
      {
        id: "rai",
        label: "RAI Arbeitsplatz",
        icon: "assess",
        children: ["Übersicht", "interRAI-Erfassung", "Fälligkeiten", "Berichte"],
      },
    ],
  },
];

function routeFor(moduleId: string, child: string) {
  const routes: Record<string, Record<string, string>> = {
    residents: { Übersicht: "/bewohner", Verlauf: "/bewohner/verlauf", Pflegeakte: "/bewohner/pflegeakte" },
    plan: {
      Pflegeplanung: "/pflegeplanung",
      "Ziele & Massnahmen": "/pflegeplanung/ziele-massnahmen",
      Auswertung: "/pflegeplanung/auswertung",
    },
    chart: { Schnelldokumentation: "/pflegedokumentation", Verlaufsdokumentation: "/pflegedokumentation/verlauf" },
    vitals: { Übersicht: "/vitalwerte", Entwicklung: "/vitalwerte/entwicklung", Grenzwerte: "/vitalwerte/grenzwerte" },
    med: {
      Medikamentenplan: "/medikation",
      Medikamentenrunde: "/medikation/runde",
      Bestände: "/medikation/bestaende",
      Reserven: "/medikation/reserven",
    },
    shift: { "Mein Dienst": "/betrieb/schicht", Schichtverlauf: "/betrieb/schicht/verlauf" },
    tasks: { "Meine Aufgaben": "/betrieb/aufgaben", Teamaufgaben: "/betrieb/aufgaben/team" },
    handover: { "Meine Übergabe": "/betrieb/uebergabe", "Seit letztem Dienst": "/betrieb/uebergabe/letzter-dienst" },
    schedule: { "Mein Dienstplan": "/betrieb/dienstplanung", Teamplanung: "/betrieb/dienstplanung/team" },
    assess: { Einschätzungen: "/einschaetzungen", Fälligkeiten: "/einschaetzungen/faelligkeiten" },
    wounds: { Wundübersicht: "/wundmanagement", Dokumentation: "/wundmanagement/dokumentation" },
    nutrition: { Ernährungsplan: "/ernaehrung", Trinkprotokoll: "/ernaehrung/trinkprotokoll" },
    team: { "Neuigkeiten & Kanäle": "/personal/team", Nachrichten: "/personal/team/nachrichten" },
    learn: { "Meine Schulungen": "/personal/schulungen", Pflichtnachweise: "/personal/schulungen/pflichtnachweise" },
    docs: { Dokumente: "/personal/dokumente", "Standards & Weisungen": "/personal/dokumente/standards" },
    quality: { Ereignisse: "/leitung/qualitaet", Massnahmen: "/leitung/qualitaet/massnahmen" },
    insights: {
      Pflege: "/leitung/kennzahlen",
      Leitung: "/leitung/kennzahlen/leitung",
      Personal: "/leitung/kennzahlen/personal",
    },
    admin: {
      Organisation: "/leitung/administration",
      Mitarbeiter: "/leitung/administration/mitarbeiter",
      Konfiguration: "/leitung/administration/konfiguration",
    },
    ai: { Assistenz: "/intelligenz", "KI-Entwürfe": "/intelligenz/entwuerfe" },
    rai: {
      Übersicht: "/rai",
      "interRAI-Erfassung": "/rai/erfassung",
      Fälligkeiten: "/rai/faelligkeiten",
      Berichte: "/rai/berichte",
    },
  };
  return routes[moduleId]?.[child] ?? null;
}

type ResidentRow = {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  room: string;
  care_unit: string;
  care_level: string;
  note: string;
  last_update: string;
  severity: string;
  admitted_on: string | null;
  status: string;
  has_photo: boolean;
  photo_updated_at: string | null;
};
const residentStatusFilters = [
  "Alle",
  "Aktiv",
  "Eintritt geplant",
  "Verlegt",
  "Ausgetreten",
  "Verstorben",
  "Archiviert",
] as const;
type ResidentStatusFilter = (typeof residentStatusFilters)[number];
const residentStatusValues: Record<Exclude<ResidentStatusFilter, "Alle">, string> = {
  Aktiv: "active",
  "Eintritt geplant": "planned",
  Verlegt: "transferred",
  Ausgetreten: "discharged",
  Verstorben: "deceased",
  Archiviert: "archived",
};
function toResident(row: ResidentRow): ResidentRecordData {
  const status = (
    ["critical", "attention", "info", "stable"].includes(row.severity) ? row.severity : "stable"
  ) as ResidentRecordData["status"];
  return {
    id: row.id,
    photoUrl: row.has_photo
      ? `/api/residents/${row.id}/photo?format=raw&v=${encodeURIComponent(row.photo_updated_at ?? "")}`
      : undefined,
    initials: `${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`,
    name: `${row.first_name} ${row.last_name}`,
    gender: row.gender,
    room: row.room || "Zimmer offen",
    unit: row.care_unit || "Nicht zugewiesen",
    careLevel: row.care_level || "Noch offen",
    note: row.note,
    lastUpdate: new Date(row.last_update).toLocaleDateString("de-CH"),
    status,
    lifecycleStatus: row.status,
    statusLabel: { critical: "Kritisch", attention: "Beobachten", info: "Aktualisiert", stable: "Stabil" }[status],
  };
}

function ResidentAvatar({ resident }: { resident: ResidentRecordData }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <span className={`resident-avatar ${resident.status === "critical" ? "critical" : ""}`}>
      {resident.photoUrl && !photoFailed ? (
        <Image
          className="resident-avatar-image"
          src={resident.photoUrl}
          alt=""
          fill
          sizes="40px"
          unoptimized
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        resident.initials
      )}
    </span>
  );
}

function ResidentIntakeEditor({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("1942-05-18");
  const [gender, setGender] = useState("Weiblich");
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [unit, setUnit] = useState("Wohnbereich 2");
  const [room, setRoom] = useState("Zimmer 216");
  const [careLevel, setCareLevel] = useState("Pflegestufe 3");
  const [owner, setOwner] = useState("Anna Meier");
  const [status, setStatus] = useState("Aktiv");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submitIntake(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          birthDate,
          gender,
          admissionDate,
          unit,
          room,
          careLevel,
          owner,
          status,
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Aufnahme fehlgeschlagen.");
      onClose();
      onSuccess(`${firstName} ${lastName} wurde aufgenommen und ${unit} zugewiesen`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aufnahme fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }
  if (!open) return null;
  const fullName = `${firstName} ${lastName}`.trim();
  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        className="area-editor-panel resident-intake-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-intake-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Bewohner · Aufnahme</p>
            <h2 id="resident-intake-title">Bewohner aufnehmen</h2>
            <p>Erstelle die Bewohnerakte und weise die Person direkt einem Zimmer und einer Bezugspflege zu.</p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Aufnahmeeditor schliessen">
            ×
          </button>
        </header>
        <form className="area-editor-form" onSubmit={submitIntake}>
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <Icon name="residents" />
            </span>
            <div>
              <strong>Neue Bewohnerakte</strong>
              <p>Pflichtangaben können später in den Stammdaten ergänzt und bearbeitet werden.</p>
            </div>
            <span className="duty-assignment-status">
              <i />
              Aufnahme vorbereiten
            </span>
          </div>
          <div className="area-editor-grid">
            <label>
              Vorname
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="z. B. Elisabeth"
                required
              />
            </label>
            <label>
              Nachname
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="z. B. Weber"
                required
              />
            </label>
            <label>
              Geburtsdatum
              <CareDatePicker label="Geburtsdatum" value={birthDate} onChange={setBirthDate} />
            </label>
            <label>
              Geschlecht
              <CareSelect
                label="Geschlecht"
                value={gender}
                options={["Weiblich", "Männlich", "Divers", "Keine Angabe"]}
                onChange={setGender}
              />
            </label>
            <label>
              Eintrittsdatum
              <CareDatePicker label="Eintrittsdatum" value={admissionDate} onChange={setAdmissionDate} />
            </label>
            <label>
              Pflegestufe
              <CareSelect
                label="Pflegestufe"
                value={careLevel}
                options={["Pflegestufe 1", "Pflegestufe 2", "Pflegestufe 3", "Pflegestufe 4", "Pflegestufe 5"]}
                onChange={setCareLevel}
              />
            </label>
            <label>
              Wohnbereich
              <CareSelect
                label="Wohnbereich"
                value={unit}
                options={["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Pflegewohngruppe"]}
                onChange={setUnit}
              />
            </label>
            <label>
              Zimmer
              <input
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                placeholder="z. B. Zimmer 216"
                required
              />
            </label>
            <label>
              Bezugspflege
              <CareSelect
                label="Bezugspflege"
                value={owner}
                options={["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                onChange={setOwner}
              />
            </label>
            <label>
              Status
              <CareSelect
                label="Status"
                value={status}
                options={["Aktiv", "Eintritt geplant", "Vorläufig"]}
                onChange={setStatus}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis zur Aufnahme
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="z. B. Angehörige, Diagnosen oder wichtige Hinweise …"
                rows={5}
              />
            </label>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{fullName || "Neue Bewohnerakte"}</strong>
              <small>
                {room} · {unit} · {careLevel}
              </small>
            </span>
            <span>
              <strong>Eintritt {formatCareDate(admissionDate)}</strong>
              <small>
                Bezugspflege: {owner} · {status}
              </small>
            </span>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              <Icon name="check" /> {saving ? "Speichern…" : "Bewohner aufnehmen"}
            </button>
          </footer>
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="CareCore">
      <span className="brand-mark">
        <Icon name="pulse" />
      </span>
      <span className="brand-copy">
        <span className="brand-name">CareCore</span>
        <small>Mehr Zeit für Pflege.</small>
      </span>
    </div>
  );
}

export default function ResidentsPage() {
  const router = useRouter();
  void navigation;
  void Brand;
  void selectSubmenu;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileGroupId, setMobileGroupId] = useState<string | null>("clinical");
  const mobileGroup = navigation.find((group) => group.id === mobileGroupId);
  const mobileModules = mobileGroup
    ? [
        ...mobileGroup.modules.filter((module) => module.id === "residents"),
        ...mobileGroup.modules.filter((module) => module.id !== "residents"),
      ].slice(0, 3)
    : [];

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

  function chooseMobileGroup(groupId: string) {
    const group = navigation.find((item) => item.id === groupId);
    const firstModule = group?.modules[0];
    const firstChild = firstModule?.children[0];
    setMobileGroupId(groupId);
    setMobileMenuOpen(false);
    const href = firstModule && firstChild ? routeFor(firstModule.id, firstChild) : null;
    if (href) router.push(href);
  }

  function chooseMobileChild(moduleId: string, child: string) {
    const href = routeFor(moduleId, child);
    if (href) {
      setMobileMenuOpen(false);
      router.push(href);
    }
  }

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

  function selectSubmenu(moduleId: string, child: string) {
    const route = routeFor(moduleId, child);
    if (route) {
      router.push(route);
      return;
    }
    setToast(`${child} geöffnet`);
  }

  return (
    <div className="app-shell residents-page">
      <AppSidebar activeModule="residents" activeChild="Übersicht" onToast={setToast} />

      <div className="main-column">
        <AppHeader searchOpen={searchOpen} onSearch={openSearch} onToast={setToast} />

        <main className="workspace residents-workspace">
          <section className="page-heading residents-heading" aria-labelledby="residents-page-title">
            <div className="heading-copy">
              <p className="eyebrow">CareCore Bewohner</p>
              <h1 id="residents-page-title">Bewohner</h1>
              <p>Zentrale Bewohner- und Patientenakte für den gesamten Wohnbereich.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => setIntakeEditorOpen(true)}>
              <Icon name="plus" className="button-icon" />
              Bewohner aufnehmen
            </button>
          </section>

          <section className="resident-summary" aria-label="Bewohnerübersicht">
            <div>
              <span className="summary-icon">
                <Icon name="residents" />
              </span>
              <span>
                <strong>{residents.length}</strong>
                <small>Bewohner gesamt</small>
              </span>
            </div>
            <div>
              <span className="summary-icon attention">
                <Icon name="alert" />
              </span>
              <span>
                <strong>
                  {residents.filter((item) => item.status === "critical" || item.status === "attention").length}
                </strong>
                <small>mit aktuellen Hinweisen</small>
              </span>
            </div>
            <div>
              <span className="summary-icon info">
                <Icon name="note" />
              </span>
              <span>
                <strong>{admissionsThisWeek}</strong>
                <small>Aufnahmen diese Woche</small>
              </span>
            </div>
            <div>
              <span className="summary-icon">
                <Icon name="check" />
              </span>
              <span>
                <strong>
                  {residents.length
                    ? Math.round(
                        (residents.filter((item) => item.careLevel !== "Noch offen").length / residents.length) * 100,
                      )
                    : 0}
                  %
                </strong>
                <small>Pflegeplanung vorhanden</small>
              </span>
            </div>
          </section>

          <section className="card resident-directory" aria-labelledby="directory-title">
            <div className="directory-toolbar">
              <div>
                <h2 className="card-title" id="directory-title">
                  Bewohnerverzeichnis
                </h2>
                <p className="card-subtitle">{filteredResidents.length} Einträge aus der Datenbank</p>
              </div>
              <label className="resident-search">
                <Icon name="search" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name oder Zimmer suchen"
                  aria-label="Bewohner suchen"
                />
              </label>
              <button
                className={`secondary-button directory-filter ${filtersOpen ? "active" : ""}`}
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="resident-filter-panel"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Icon name="filter" />
                {filtersOpen ? "Filter schliessen" : "Filter"}
                <Icon name="caretDown" className="directory-filter-caret" />
              </button>
            </div>
            <div
              id="resident-filter-panel"
              className={`resident-filter-panel ${filtersOpen ? "open" : ""}`}
              aria-hidden={!filtersOpen}
            >
              <div className="resident-filter-panel-inner" inert={!filtersOpen}>
                <div className="resident-filter-group">
                  <span>Wohnbereich</span>
                  <div className="unit-filter" aria-label="Wohnbereich filtern">
                    {["Alle", ...units].map((label) => (
                      <button
                        className={unit === label ? "active" : ""}
                        type="button"
                        aria-pressed={unit === label}
                        key={label}
                        onClick={() => setUnit(label)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="resident-filter-group">
                  <span>Bewohnerstatus</span>
                  <div className="resident-status-filter" aria-label="Bewohnerstatus filtern">
                    {residentStatusFilters.map((label) => (
                      <button
                        className={statusFilter === label ? "active" : ""}
                        type="button"
                        aria-pressed={statusFilter === label}
                        key={label}
                        onClick={() => setStatusFilter(label)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {(unit !== "Alle" || statusFilter !== "Alle" || query) && (
                  <button
                    className="resident-filter-reset"
                    type="button"
                    onClick={() => {
                      setUnit("Alle");
                      setStatusFilter("Alle");
                      setQuery("");
                    }}
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            </div>

            <div className="resident-table" role="table" aria-label="Bewohnerliste">
              <div className="resident-table-head" role="row">
                <span role="columnheader">Bewohner</span>
                <span role="columnheader">Wohnbereich</span>
                <span role="columnheader">Pflegebedarf</span>
                <span role="columnheader">Letzte Aktualisierung</span>
                <span role="columnheader">Status</span>
                <span aria-hidden="true" />
              </div>
              {filteredResidents.map((resident) => (
                <button
                  className="resident-list-row"
                  type="button"
                  role="row"
                  key={resident.name}
                  onClick={() => setSelectedResident(resident)}
                >
                  <span className="resident-person" role="cell">
                    <ResidentAvatar resident={resident} />
                    <span>
                      <strong>{resident.name}</strong>
                      <small>{resident.room}</small>
                    </span>
                  </span>
                  <span role="cell">{resident.unit}</span>
                  <span role="cell">
                    <strong>{resident.careLevel}</strong>
                    <small>{resident.note}</small>
                  </span>
                  <span role="cell">{resident.lastUpdate}</span>
                  <span role="cell">
                    <span className={`status-badge ${resident.status}`}>{resident.statusLabel}</span>
                  </span>
                  <span role="cell">
                    <Icon name="chevron" />
                  </span>
                </button>
              ))}
              {filteredResidents.length === 0 && (
                <div className="resident-empty">
                  <Icon name="search" />
                  <strong>Keine Bewohner gefunden</strong>
                  <p>Prüfe den Suchbegriff oder ändere den Wohnbereich.</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-nav-menu" role="dialog" aria-label="Hauptmenü">
          <div className="mobile-nav-menu-head">
            <div>
              {mobileGroup && (
                <button className="mobile-nav-back" type="button" onClick={() => setMobileGroupId(null)}>
                  <Icon name="chevron" /> Alle Hauptbereiche
                </button>
              )}
              <p className="eyebrow">CareCore Navigation</p>
              <strong>{mobileGroup?.label ?? "Hauptbereiche"}</strong>
            </div>
            <button type="button" aria-label="Hauptmenü schliessen" onClick={() => setMobileMenuOpen(false)}>
              <Icon name="close" />
            </button>
          </div>
          {mobileGroup ? (
            <div className="mobile-nav-subgroups">
              {mobileGroup.modules.map((module) => (
                <section key={module.id}>
                  <h3>
                    <Icon name={module.icon as IconName} />
                    {module.label}
                  </h3>
                  <div>
                    {module.children.map((child) => (
                      <button type="button" key={child} onClick={() => chooseMobileChild(module.id, child)}>
                        {child}
                        <Icon name="chevron" />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mobile-nav-groups">
              {navigation.map((group) => (
                <button type="button" key={group.id} onClick={() => chooseMobileGroup(group.id)}>
                  <span className="mobile-nav-group-icon">
                    <Icon name={(group.modules[0]?.icon ?? "pulse") as IconName} />
                  </span>
                  <span>
                    <strong>{group.label}</strong>
                    <small>{group.modules.length} Bereiche</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <nav className="bottom-nav" aria-label="Mobile Navigation">
        <button type="button" onClick={() => router.push("/c")}>
          <Icon name="home" />
          <span>Startseite</span>
        </button>
        {mobileModules.slice(0, 4).map((module) => {
          const href = routeFor(module.id, module.children[0]);
          return (
            <button
              className={module.id === "residents" ? "active" : ""}
              type="button"
              key={module.id}
              onClick={() => href && router.push(href)}
            >
              <Icon name={module.icon as IconName} />
              <span>{module.label}</span>
            </button>
          );
        })}
        <button
          className={mobileMenuOpen ? "active" : ""}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((value) => !value)}
        >
          <Icon name="sidebar" />
          <span>Mehr</span>
        </button>
      </nav>

      {searchOpen && (
        <div
          className="overlay"
          role="presentation"
          onClick={(event) => event.currentTarget === event.target && setSearchOpen(false)}
        >
          <section
            id="resident-global-search"
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Globale Suche"
          >
            <div className="search-input-wrap">
              <Icon name="search" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Bewohner, Dokumente oder Funktionen suchen…"
                aria-label="Suchbegriff"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Suche schliessen">
                ESC
              </button>
            </div>
            <div className="search-results">
              <span className="search-group-label">Bewohner</span>
              {filteredResidents.map((resident) => (
                <button
                  className="search-result"
                  type="button"
                  key={resident.name}
                  onClick={() => {
                    setSearchOpen(false);
                    setSelectedResident(resident);
                  }}
                >
                  <span className="result-icon">
                    <Icon name="residents" />
                  </span>
                  <span>
                    <strong>{resident.name}</strong>
                    <small>
                      {resident.room} · {resident.unit}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {selectedResident && (
        <ResidentRecord
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
          onAction={setToast}
          onPhotoChanged={() => {
            void loadResidents();
          }}
          onGenderChanged={(residentId, gender) => {
            setResidents((current) => current.map((item) => (item.id === residentId ? { ...item, gender } : item)));
            setSelectedResident((current) => (current?.id === residentId ? { ...current, gender } : current));
          }}
        />
      )}

      <ResidentIntakeEditor
        open={intakeEditorOpen}
        onClose={() => setIntakeEditorOpen(false)}
        onSuccess={(message) => {
          setToast(message);
          void loadResidents();
        }}
      />

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}
