"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ModuleIcon } from "@/app/components/module-page-shell";
import type { BoardItem, LeadershipView } from "./leadership-workspace";
import AdminUserManagement from "./admin-user-management";

type Props = {
  view: LeadershipView;
  rows: BoardItem[];
  visibleRows: BoardItem[];
  selected: BoardItem;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  setSelectedId: Dispatch<SetStateAction<string>>;
  completed: string[];
  setCompleted: Dispatch<SetStateAction<string[]>>;
  showToast: (message: string) => void;
  employeeCreatorOpen?: boolean;
  onCloseEmployeeCreator?: () => void;
};

function RowButton({
  row,
  selected,
  setSelectedId,
}: {
  row: BoardItem;
  selected: BoardItem;
  setSelectedId: Props["setSelectedId"];
}) {
  return (
    <button className={selected.id === row.id ? "selected" : ""} type="button" onClick={() => setSelectedId(row.id)}>
      <span className={`governance-icon ${row.tone}`}>
        <ModuleIcon name={row.icon} />
      </span>
      <span>
        <strong>{row.title}</strong>
        <small>{row.detail}</small>
      </span>
      <span>
        <strong>{row.metric}</strong>
        <small>{row.status}</small>
      </span>
      <ModuleIcon name="chevron" className="chevron" />
    </button>
  );
}

function AreaSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const toggleOpen = () =>
    setOpen((current) => {
      if (!current) {
        const rect = rootRef.current?.getBoundingClientRect();
        const menuHeight = options.length * 42 + 16;
        setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight));
      } else setOpenUp(false);
      return !current;
    });

  return (
    <div className="area-custom-select" ref={rootRef}>
      <button
        className="area-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={toggleOpen}
      >
        <span>{value}</span>
        <ModuleIcon name="caretDown" className={open ? "open" : ""} />
      </button>
      {open && (
        <div className={`area-select-menu ${openUp ? "up" : ""}`} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={value === option}
              className={value === option ? "selected" : ""}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
                setOpenUp(false);
              }}
            >
              {option}
              <ModuleIcon name="check" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QualityVariant({
  view,
  rows,
  visibleRows,
  selected,
  setSelectedId,
  completed,
  setCompleted,
  showToast,
}: Props) {
  if (view === "qualityActions") {
    const columns = [
      { label: "Offen", tone: "attention", ids: ["qa1"] },
      { label: "Geplant", tone: "info", ids: ["qa2"] },
      { label: "Erledigt", tone: "stable", ids: ["qa3"] },
    ];
    const owner = selected.owner ?? "Leitung Pflege";
    return (
      <div className="quality-actions-layout">
        <section className="card quality-kanban">
          <div className="card-header">
            <div>
              <p className="eyebrow">Verbesserungsboard</p>
              <h2 className="card-title">Massnahmen steuern</h2>
              <p className="card-subtitle">Prioritäten und Zuständigkeiten im Überblick</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => showToast("Neue Massnahme vorbereitet")}>
              <ModuleIcon name="plus" /> Neue Massnahme
            </button>
          </div>
          <div className="quality-kanban-grid">
            {columns.map((column) => (
              <div className="quality-kanban-column" key={column.label}>
                <div>
                  <strong>{column.label}</strong>
                  <span className={`status-badge ${column.tone}`}>{column.ids.length}</span>
                </div>
                {column.ids.map((id) => {
                  const row = rows.find((item) => item.id === id);
                  if (!row) return null;
                  return (
                    <button
                      className={selected.id === row.id ? "selected" : ""}
                      type="button"
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className={`governance-icon ${row.tone}`}>
                        <ModuleIcon name={row.icon} />
                      </span>
                      <span>
                        <strong>{row.title}</strong>
                        <small>{row.detail}</small>
                        <em>{row.metric}</em>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
        <aside className="card quality-action-detail">
          <div className="card-header">
            <div>
              <p className="eyebrow">Massnahmendetail</p>
              <h2 className="card-title">{selected.title}</h2>
            </div>
            <span className={`status-badge ${completed.includes(selected.id) ? "stable" : selected.tone}`}>
              {completed.includes(selected.id) ? "Erledigt" : selected.status}
            </span>
          </div>
          <div className="quality-action-owner">
            <span className="avatar">
              {owner
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <span>
              <strong>{owner}</strong>
              <small>Verantwortlich</small>
            </span>
          </div>
          <p>{selected.detail}</p>
          <dl>
            <div>
              <dt>Termin</dt>
              <dd>{selected.metric}</dd>
            </div>
            <div>
              <dt>Nachweis</dt>
              <dd>Dokumentation erforderlich</dd>
            </div>
          </dl>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setCompleted((current) =>
                current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [...current, selected.id],
              );
              showToast("Massnahmenstatus aktualisiert");
            }}
          >
            {completed.includes(selected.id) ? "Wieder öffnen" : "Als erledigt markieren"}
          </button>
        </aside>
      </div>
    );
  }
  return (
    <div className="quality-events-layout">
      <section className="card quality-events-timeline">
        <div className="card-header">
          <div>
            <p className="eyebrow">Sicherheitsmonitor</p>
            <h2 className="card-title">Ereignisverlauf</h2>
            <p className="card-subtitle">Chronologische Prüfung aller Meldungen</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => showToast("Ereignisformular geöffnet")}>
            <ModuleIcon name="plus" /> Ereignis melden
          </button>
        </div>
        <div className="quality-timeline-list">
          {visibleRows.map((row) => (
            <article key={row.id}>
              <div className={`quality-timeline-marker ${row.tone}`}>
                <ModuleIcon name={row.icon} />
              </div>
              <div>
                <p className="eyebrow">{row.metric}</p>
                <h3>{row.title}</h3>
                <p>{row.detail}</p>
                <small>{row.owner ?? "Qualitätsmanagement"}</small>
              </div>
              <span className={`status-badge ${row.tone}`}>{row.status}</span>
              <button
                className="quiet-button"
                type="button"
                onClick={() => {
                  setSelectedId(row.id);
                  showToast(`${row.title} geöffnet`);
                }}
              >
                Prüfen
              </button>
            </article>
          ))}
        </div>
      </section>
      <aside className="card quality-risk-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Risikobild</p>
            <h2 className="card-title">Sicherheitslage</h2>
          </div>
          <span className="quality-risk-score">B</span>
        </div>
        <div className="quality-risk-meter">
          <span style={{ width: "72%" }} />
        </div>
        <p>72 % der Meldungen sind abgeschlossen oder in laufender Massnahme.</p>
        <div className="quality-risk-stats">
          <span>
            <strong>2</strong>
            <small>Kritisch</small>
          </span>
          <span>
            <strong>5</strong>
            <small>In Prüfung</small>
          </span>
          <span>
            <strong>7</strong>
            <small>Abgeschlossen</small>
          </span>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => showToast("Qualitätsbericht wird vorbereitet")}
        >
          Bericht öffnen <ModuleIcon name="chevron" />
        </button>
      </aside>
    </div>
  );
}

function InsightsVariant({ view, visibleRows, selected, query, setQuery, setSelectedId, showToast }: Props) {
  if (view === "workforceInsights")
    return (
      <div className="insights-workforce-layout">
        <section className="card workforce-matrix">
          <div className="card-header">
            <div>
              <p className="eyebrow">Dienstbesetzung</p>
              <h2 className="card-title">Kompetenz- und Schichtmatrix</h2>
              <p className="card-subtitle">Kommende Woche · 92 % besetzt</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => showToast("Dienstplan geöffnet")}>
              Dienstplan <ModuleIcon name="chevron" />
            </button>
          </div>
          <div className="workforce-table">
            <div className="workforce-table-head">
              <span>Bereich</span>
              <span>Mo</span>
              <span>Di</span>
              <span>Mi</span>
              <span>Do</span>
              <span>Fr</span>
            </div>
            {["Wohnbereich 1", "Wohnbereich 2", "Wohnbereich 3", "Nachtwache"].map((area, index) => (
              <div className="workforce-table-row" key={area}>
                <strong>{area}</strong>
                {[0, 1, 2, 3, 4].map((day) => (
                  <span className={day === 2 && index === 2 ? "warning" : "ok"} key={day}>
                    {day === 2 && index === 2 ? "1 offen" : index === 3 ? "2/2" : "✓"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
        <aside className="card workforce-availability">
          <div className="card-header">
            <div>
              <p className="eyebrow">Verfügbarkeit</p>
              <h2 className="card-title">Abwesenheiten</h2>
            </div>
            <span className="status-badge attention">4 offen</span>
          </div>
          <div className="workforce-person">
            <span className="avatar">NB</span>
            <span>
              <strong>Nora Baumann</strong>
              <small>18.–20. September</small>
            </span>
            <span className="status-badge critical">Ersatz fehlt</span>
          </div>
          <div className="workforce-person">
            <span className="avatar">LF</span>
            <span>
              <strong>Lea Frei</strong>
              <small>21. September</small>
            </span>
            <span className="status-badge stable">Vertreten</span>
          </div>
          <button className="primary-button" type="button" onClick={() => showToast("Abwesenheitsplanung geöffnet")}>
            Vertretung planen
          </button>
        </aside>
      </div>
    );
  if (view === "leadershipInsights")
    return (
      <div className="insights-executive-layout">
        <section className="card executive-scorecard">
          <div className="card-header">
            <div>
              <p className="eyebrow">Geschäftsführung</p>
              <h2 className="card-title">Haus-Cockpit</h2>
              <p className="card-subtitle">Aktueller Stand gegenüber den Jahreszielen</p>
            </div>
            <SearchField title="Kennzahlen" query={query} setQuery={setQuery} />
          </div>
          <div className="executive-score-grid">
            <div>
              <span>Belegung</span>
              <strong>88 %</strong>
              <small>+3 % zum Vorjahr</small>
            </div>
            <div>
              <span>Pflegequalität</span>
              <strong>91 %</strong>
              <small>im Zielkorridor</small>
            </div>
            <div>
              <span>Teamstabilität</span>
              <strong>94 %</strong>
              <small>keine Eskalation</small>
            </div>
          </div>
          <div className="executive-trend">
            <span style={{ width: "82%" }} />
            <b>Gesamtfortschritt 82 %</b>
          </div>
        </section>
        <aside className="card executive-decisions">
          <div className="card-header">
            <div>
              <p className="eyebrow">Führungskreis</p>
              <h2 className="card-title">Entscheidungen</h2>
            </div>
          </div>
          {visibleRows.map((row) => (
            <RowButton row={row} selected={selected} setSelectedId={setSelectedId} key={row.id} />
          ))}
        </aside>
      </div>
    );
  return (
    <div className="insights-care-layout">
      <section className="card care-indicator-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Pflegequalität</p>
            <h2 className="card-title">Indikatoren</h2>
            <p className="card-subtitle">Wöchentliche Entwicklung</p>
          </div>
          <SearchField title="Pflegekennzahlen" query={query} setQuery={setQuery} />
        </div>
        <div className="care-indicator-list">
          {visibleRows.map((row) => (
            <button
              className={selected.id === row.id ? "selected" : ""}
              type="button"
              key={row.id}
              onClick={() => setSelectedId(row.id)}
            >
              <span className={`governance-icon ${row.tone}`}>
                <ModuleIcon name={row.icon} />
              </span>
              <span>
                <strong>{row.title}</strong>
                <small>{row.detail}</small>
              </span>
              <b>{row.metric}</b>
              <span className={`status-badge ${row.tone}`}>{row.status}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="card care-target-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Zielerreichung</p>
            <h2 className="card-title">Versorgungsqualität</h2>
          </div>
          <ModuleIcon name="chart" className="care-target-icon" />
        </div>
        <div className="care-target-ring">
          <strong>78%</strong>
          <span>Dokumentation</span>
        </div>
        <p>2 Indikatoren liegen unter dem Zielwert. Die nächste Evaluation ist für Freitag geplant.</p>
        <button className="primary-button" type="button" onClick={() => showToast("Pflegebericht wird vorbereitet")}>
          Pflegebericht erstellen
        </button>
      </aside>
    </div>
  );
}

function SearchField({ title, query, setQuery }: { title: string; query: string; setQuery: Props["setQuery"] }) {
  return (
    <label className="resident-search">
      <ModuleIcon name="search" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Suchen…"
        aria-label={`${title} durchsuchen`}
      />
    </label>
  );
}

export function LocationEditor({
  open,
  onClose,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
}) {
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteType, setSiteType] = useState("Seniorenresidenz");
  const [siteCountry, setSiteCountry] = useState("Schweiz");
  const [siteManager, setSiteManager] = useState("Anna Meier");
  const [siteStatus, setSiteStatus] = useState("Aktiv");

  if (!open) return null;

  return (
    <div
      className="area-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="location-editor-title">
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Admin · Organisation</p>
            <h2 id="location-editor-title">Standort erstellen</h2>
            <p>Lege einen neuen Standort an und hinterlege die wichtigsten Organisationsdaten.</p>
          </div>
          <button className="area-editor-close" type="button" onClick={onClose} aria-label="Standorteditor schliessen">
            ×
          </button>
        </header>
        <form
          className="area-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            showToast(`${siteName || "Neuer Standort"} wurde angelegt`);
          }}
        >
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="building" />
            </span>
            <div>
              <strong>Neuer Standort</strong>
              <p>Alle Angaben können später in der Organisation bearbeitet werden.</p>
            </div>
          </div>
          <div className="area-editor-grid">
            <label>
              Standortname
              <input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                placeholder="z. B. Alterszentrum Sonnengarten"
                required
              />
            </label>
            <label>
              Kürzel
              <input
                value={siteCode}
                onChange={(event) => setSiteCode(event.target.value.toUpperCase())}
                placeholder="z. B. AZS"
                maxLength={6}
              />
            </label>
            <label>
              Standorttyp
              <AreaSelect
                label="Standorttyp"
                value={siteType}
                options={["Seniorenresidenz", "Pflegezentrum", "Tagespflege", "Ambulante Dienste"]}
                onChange={setSiteType}
              />
            </label>
            <label>
              Land
              <AreaSelect
                label="Land"
                value={siteCountry}
                options={["Schweiz", "Deutschland", "Österreich"]}
                onChange={setSiteCountry}
              />
            </label>
            <label>
              Adresse
              <input placeholder="z. B. Gartenstrasse 12" />
            </label>
            <label>
              PLZ und Ort
              <input placeholder="z. B. 8001 Zürich" />
            </label>
            <label className="area-editor-wide">
              Verantwortliche Leitung
              <AreaSelect
                label="Verantwortliche Leitung"
                value={siteManager}
                options={["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                onChange={setSiteManager}
              />
            </label>
            <label>
              Status
              <AreaSelect
                label="Status"
                value={siteStatus}
                options={["Aktiv", "In Vorbereitung", "Archiviert"]}
                onChange={setSiteStatus}
              />
            </label>
            <label className="area-editor-wide">
              Hinweis oder Zweck
              <textarea placeholder="z. B. Hauptstandort mit vier Wohnbereichen …" rows={4} />
            </label>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              <ModuleIcon name="check" /> Standort erstellen
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function AdminVariant({
  view,
  rows,
  selected,
  setSelectedId,
  showToast,
  employeeCreatorOpen,
  onCloseEmployeeCreator,
}: Props) {
  const [areaEditorOpen, setAreaEditorOpen] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [areaCapacity, setAreaCapacity] = useState("12");
  const [areaFloor, setAreaFloor] = useState("1. OG");
  const [areaManager, setAreaManager] = useState("Anna Meier");
  const [services, setServices] = useState(["Frühdienst", "Spätdienst"]);
  const toggleService = (service: string) =>
    setServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service],
    );
  if (view === "users")
    return (
      <AdminUserManagement
        showToast={showToast}
        createOpen={Boolean(employeeCreatorOpen)}
        onCloseCreate={onCloseEmployeeCreator ?? (() => undefined)}
      />
    );
  if (view === "configuration")
    return (
      <div className="admin-config-layout">
        <section className="card admin-config-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Systemsteuerung</p>
              <h2 className="card-title">Konfiguration</h2>
              <p className="card-subtitle">Zentrale Einstellungen und Integrationen</p>
            </div>
            <span className="status-badge stable">System aktiv</span>
          </div>
          <div className="admin-setting-list">
            {rows.map((row) => (
              <button
                className={selected.id === row.id ? "selected" : ""}
                type="button"
                key={row.id}
                onClick={() => setSelectedId(row.id)}
              >
                <span className={`governance-icon ${row.tone}`}>
                  <ModuleIcon name={row.icon} />
                </span>
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </span>
                <span className={`status-badge ${row.tone}`}>{row.status}</span>
                <span className="admin-toggle on" />
              </button>
            ))}
          </div>
        </section>
        <aside className="card admin-system-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Systemstatus</p>
              <h2 className="card-title">Integrität</h2>
            </div>
          </div>
          <div className="admin-system-score">
            <strong>99,98 %</strong>
            <span>Verfügbarkeit</span>
          </div>
          <ul>
            <li>
              <ModuleIcon name="check" /> Datenbank synchronisiert
            </li>
            <li>
              <ModuleIcon name="check" /> Backup von heute 03:00 Uhr
            </li>
            <li>
              <ModuleIcon name="check" /> Keine Sicherheitswarnungen
            </li>
          </ul>
          <button className="secondary-button" type="button" onClick={() => showToast("Systemprotokoll geöffnet")}>
            Protokoll ansehen <ModuleIcon name="chevron" />
          </button>
        </aside>
      </div>
    );
  return (
    <>
      <div className="admin-organization-layout">
        <section className="card organization-map">
          <div className="card-header">
            <div>
              <p className="eyebrow">Standortstruktur</p>
              <h2 className="card-title">Alterszentrum Sonnengarten</h2>
              <p className="card-subtitle">4 Wohnbereiche · 52 Plätze</p>
            </div>
            <button className="primary-button" type="button" onClick={() => setAreaEditorOpen(true)}>
              <ModuleIcon name="plus" /> Wohnbereich
            </button>
          </div>
          <div className="organization-tree">
            <div className="organization-root">
              <ModuleIcon name="building" />
              <span>
                <strong>Gesamtes Haus</strong>
                <small>46 Plätze belegt · 62 Mitarbeitende</small>
              </span>
            </div>
            {rows.map((row) => (
              <button
                className={selected.id === row.id ? "selected" : ""}
                type="button"
                key={row.id}
                onClick={() => setSelectedId(row.id)}
              >
                <span className={`governance-icon ${row.tone}`}>
                  <ModuleIcon name={row.icon} />
                </span>
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </span>
                <span className={`status-badge ${row.tone}`}>{row.status}</span>
                <ModuleIcon name="chevron" />
              </button>
            ))}
          </div>
        </section>
        <aside className="card organization-detail">
          <div className="card-header">
            <div>
              <p className="eyebrow">Bereichsprofil</p>
              <h2 className="card-title">{selected.title}</h2>
            </div>
            <span className="status-badge stable">Aktiv</span>
          </div>
          <div className="organization-capacity">
            <strong>10 / 12</strong>
            <span>Plätze belegt</span>
            <div>
              <span style={{ width: "83%" }} />
            </div>
          </div>
          <p>{selected.detail}</p>
          <button className="secondary-button" type="button" onClick={() => showToast("Bereichsdetails geöffnet")}>
            Details bearbeiten <ModuleIcon name="chevron" />
          </button>
        </aside>
      </div>
      {areaEditorOpen && (
        <div
          className="area-editor-overlay"
          role="presentation"
          onMouseDown={(event) => event.currentTarget === event.target && setAreaEditorOpen(false)}
        >
          <section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="area-editor-title">
            <header className="area-editor-header">
              <div>
                <p className="eyebrow">CareCore Admin · Organisation</p>
                <h2 id="area-editor-title">Wohnbereich erstellen</h2>
                <p>Lege einen neuen Bereich an und definiere direkt die wichtigsten Stammdaten.</p>
              </div>
              <button
                className="area-editor-close"
                type="button"
                onClick={() => setAreaEditorOpen(false)}
                aria-label="Bereichseditor schliessen"
              >
                ×
              </button>
            </header>
            <form
              className="area-editor-form"
              onSubmit={(event) => {
                event.preventDefault();
                setAreaEditorOpen(false);
                showToast(`${areaName || "Neuer Wohnbereich"} wurde angelegt`);
              }}
            >
              <div className="area-editor-intro">
                <span className="area-editor-icon">
                  <ModuleIcon name="building" />
                </span>
                <div>
                  <strong>Neuer Wohnbereich</strong>
                  <p>Alle Angaben können später in der Organisation bearbeitet werden.</p>
                </div>
              </div>
              <div className="area-editor-grid">
                <label>
                  Bezeichnung
                  <input
                    value={areaName}
                    onChange={(event) => setAreaName(event.target.value)}
                    placeholder="z. B. Wohnbereich 4"
                    required
                  />
                </label>
                <label>
                  Kürzel
                  <input
                    value={areaCode}
                    onChange={(event) => setAreaCode(event.target.value.toUpperCase())}
                    placeholder="z. B. WB4"
                    maxLength={5}
                  />
                </label>
                <label>
                  Etage
                  <AreaSelect
                    label="Etage"
                    value={areaFloor}
                    options={["EG", "1. OG", "2. OG", "3. OG"]}
                    onChange={setAreaFloor}
                  />
                </label>
                <label>
                  Kapazität
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={areaCapacity}
                    onChange={(event) => setAreaCapacity(event.target.value)}
                    required
                  />
                </label>
                <label className="area-editor-wide">
                  Verantwortliche Leitung
                  <AreaSelect
                    label="Verantwortliche Leitung"
                    value={areaManager}
                    options={["Anna Meier", "Lea Frei", "Nora Baumann", "Sven Keller"]}
                    onChange={setAreaManager}
                  />
                </label>
                <fieldset className="area-editor-wide">
                  <legend>Geplante Dienste</legend>
                  <div className="area-service-options">
                    {["Frühdienst", "Spätdienst", "Nachtwache"].map((service) => (
                      <label key={service}>
                        <input
                          type="checkbox"
                          checked={services.includes(service)}
                          onChange={() => toggleService(service)}
                        />
                        <span>{service}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="area-editor-wide">
                  Hinweis oder Zweck
                  <textarea placeholder="z. B. Schwerpunkt Demenzpflege, Kurzzeitpflege …" rows={4} />
                </label>
              </div>
              <footer className="area-editor-actions">
                <button className="secondary-button" type="button" onClick={() => setAreaEditorOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary-button" type="submit">
                  <ModuleIcon name="check" /> Wohnbereich erstellen
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function LeadershipVariant(props: Props) {
  if (props.view === "qualityEvents" || props.view === "qualityActions") return <QualityVariant {...props} />;
  if (props.view === "careInsights" || props.view === "leadershipInsights" || props.view === "workforceInsights")
    return <InsightsVariant {...props} />;
  return <AdminVariant {...props} />;
}
