"use client";

import { useState } from "react";
import ModulePageShell, { ModuleIcon } from "@/app/components/module-page-shell";

type MedicationView = "plan" | "round" | "stocks" | "reserves";
type Tone = "stable" | "attention" | "critical" | "info";
type Resident = {
  id: string;
  initials: string;
  name: string;
  room: string;
  unit: string;
  allergies: string;
  medications: number;
};
type Medication = {
  id: string;
  residentId: string;
  name: string;
  strength: string;
  form: string;
  schedule: string;
  dose: string;
  route: string;
  physician: string;
  indication: string;
  validUntil: string;
  tone: Tone;
};
type StockItem = {
  id: string;
  name: string;
  strength: string;
  form: string;
  location: string;
  stock: number;
  minimum: number;
  unit: string;
  expiry: string;
  tone: Tone;
};
type ReserveItem = {
  id: string;
  residentId: string;
  name: string;
  strength: string;
  indication: string;
  singleDose: string;
  maxDose: string;
  interval: string;
  physician: string;
  validUntil: string;
  stock: number;
};

const residents: Resident[] = [
  {
    id: "hm",
    initials: "HM",
    name: "Hans Müller",
    room: "Zimmer 207",
    unit: "Wohnbereich 2",
    allergies: "Penicillin",
    medications: 6,
  },
  {
    id: "mk",
    initials: "MK",
    name: "Maria Keller",
    room: "Zimmer 204",
    unit: "Wohnbereich 2",
    allergies: "Keine bekannt",
    medications: 5,
  },
  {
    id: "em",
    initials: "EM",
    name: "Erika Meier",
    room: "Zimmer 211",
    unit: "Wohnbereich 2",
    allergies: "Sulfonamide",
    medications: 7,
  },
  {
    id: "rb",
    initials: "RB",
    name: "Ruth Baumann",
    room: "Zimmer 214",
    unit: "Wohnbereich 2",
    allergies: "Keine bekannt",
    medications: 4,
  },
  {
    id: "pa",
    initials: "PA",
    name: "Peter Aebischer",
    room: "Zimmer 115",
    unit: "Wohnbereich 1",
    allergies: "Ibuprofen",
    medications: 5,
  },
  {
    id: "wb",
    initials: "WB",
    name: "Walter Brunner",
    room: "Zimmer 306",
    unit: "Wohnbereich 3",
    allergies: "Keine bekannt",
    medications: 8,
  },
];

const medications: Medication[] = [
  {
    id: "m1",
    residentId: "hm",
    name: "Metoprolol",
    strength: "50 mg",
    form: "Tablette",
    schedule: "Morgens",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Martin Weber",
    indication: "Arterielle Hypertonie",
    validUntil: "31.12.2026",
    tone: "stable",
  },
  {
    id: "m2",
    residentId: "hm",
    name: "Apixaban",
    strength: "5 mg",
    form: "Filmtablette",
    schedule: "08:00 · 20:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Martin Weber",
    indication: "Vorhofflimmern",
    validUntil: "31.12.2026",
    tone: "attention",
  },
  {
    id: "m3",
    residentId: "hm",
    name: "Pantoprazol",
    strength: "40 mg",
    form: "Tablette",
    schedule: "07:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Martin Weber",
    indication: "Magenschutz",
    validUntil: "30.11.2026",
    tone: "stable",
  },
  {
    id: "m4",
    residentId: "hm",
    name: "Vitamin D3",
    strength: "1000 IE",
    form: "Tropfen",
    schedule: "Montag, 08:00",
    dose: "20 Tropfen",
    route: "oral",
    physician: "Dr. Martin Weber",
    indication: "Substitution",
    validUntil: "31.03.2027",
    tone: "info",
  },
  {
    id: "m5",
    residentId: "mk",
    name: "Metformin",
    strength: "500 mg",
    form: "Tablette",
    schedule: "08:00 · 18:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Sarah Frei",
    indication: "Diabetes mellitus Typ 2",
    validUntil: "31.12.2026",
    tone: "attention",
  },
  {
    id: "m6",
    residentId: "mk",
    name: "Ramipril",
    strength: "5 mg",
    form: "Tablette",
    schedule: "08:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Sarah Frei",
    indication: "Arterielle Hypertonie",
    validUntil: "31.12.2026",
    tone: "stable",
  },
  {
    id: "m7",
    residentId: "em",
    name: "Metoprolol",
    strength: "50 mg",
    form: "Tablette",
    schedule: "08:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Martin Weber",
    indication: "Dosisanpassung seit 11.09.",
    validUntil: "31.12.2026",
    tone: "attention",
  },
  {
    id: "m8",
    residentId: "rb",
    name: "Levothyroxin",
    strength: "75 µg",
    form: "Tablette",
    schedule: "07:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Sarah Frei",
    indication: "Hypothyreose",
    validUntil: "31.12.2026",
    tone: "stable",
  },
  {
    id: "m9",
    residentId: "pa",
    name: "Furosemid",
    strength: "40 mg",
    form: "Tablette",
    schedule: "08:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Martin Weber",
    indication: "Herzinsuffizienz",
    validUntil: "31.10.2026",
    tone: "attention",
  },
  {
    id: "m10",
    residentId: "wb",
    name: "Amlodipin",
    strength: "5 mg",
    form: "Tablette",
    schedule: "08:00",
    dose: "1 Tablette",
    route: "oral",
    physician: "Dr. Sarah Frei",
    indication: "Arterielle Hypertonie",
    validUntil: "31.12.2026",
    tone: "critical",
  },
];

const stockItems: StockItem[] = [
  {
    id: "s1",
    name: "Metoprolol",
    strength: "50 mg",
    form: "Tabletten",
    location: "Medikamentenraum · Fach A2",
    stock: 84,
    minimum: 40,
    unit: "Stk.",
    expiry: "03/2027",
    tone: "stable",
  },
  {
    id: "s2",
    name: "Apixaban",
    strength: "5 mg",
    form: "Filmtabletten",
    location: "Medikamentenraum · Fach B1",
    stock: 18,
    minimum: 24,
    unit: "Stk.",
    expiry: "01/2027",
    tone: "critical",
  },
  {
    id: "s3",
    name: "Metformin",
    strength: "500 mg",
    form: "Tabletten",
    location: "Medikamentenraum · Fach A4",
    stock: 52,
    minimum: 30,
    unit: "Stk.",
    expiry: "06/2027",
    tone: "stable",
  },
  {
    id: "s4",
    name: "Furosemid",
    strength: "40 mg",
    form: "Tabletten",
    location: "Medikamentenraum · Fach A5",
    stock: 27,
    minimum: 20,
    unit: "Stk.",
    expiry: "10/2026",
    tone: "attention",
  },
  {
    id: "s5",
    name: "Paracetamol",
    strength: "500 mg",
    form: "Tabletten",
    location: "Reserve · Fach R1",
    stock: 36,
    minimum: 30,
    unit: "Stk.",
    expiry: "11/2026",
    tone: "attention",
  },
  {
    id: "s6",
    name: "Morphin",
    strength: "10 mg/ml",
    form: "Ampullen",
    location: "Betäubungsmittelschrank",
    stock: 12,
    minimum: 8,
    unit: "Amp.",
    expiry: "08/2027",
    tone: "stable",
  },
  {
    id: "s7",
    name: "Insulin NovoRapid",
    strength: "100 E/ml",
    form: "Pens",
    location: "Kühlschrank · Box 2",
    stock: 3,
    minimum: 4,
    unit: "Pens",
    expiry: "12/2026",
    tone: "critical",
  },
];

const initialReserves: ReserveItem[] = [
  {
    id: "r1",
    residentId: "hm",
    name: "Paracetamol",
    strength: "500 mg",
    indication: "Schmerzen ab NRS 3",
    singleDose: "1–2 Tabletten",
    maxDose: "max. 4 g / 24 h",
    interval: "mind. 6 Stunden",
    physician: "Dr. Martin Weber",
    validUntil: "31.12.2026",
    stock: 18,
  },
  {
    id: "r2",
    residentId: "hm",
    name: "Macrogol",
    strength: "13,7 g",
    indication: "Obstipation ab 2 Tagen",
    singleDose: "1 Beutel",
    maxDose: "max. 2 Beutel / 24 h",
    interval: "mind. 8 Stunden",
    physician: "Dr. Martin Weber",
    validUntil: "31.12.2026",
    stock: 12,
  },
  {
    id: "r3",
    residentId: "mk",
    name: "Novalgin",
    strength: "500 mg",
    indication: "Schmerzen ab NRS 4",
    singleDose: "1 Tablette",
    maxDose: "max. 4 Tabletten / 24 h",
    interval: "mind. 6 Stunden",
    physician: "Dr. Sarah Frei",
    validUntil: "30.11.2026",
    stock: 9,
  },
  {
    id: "r4",
    residentId: "em",
    name: "Salbutamol",
    strength: "100 µg",
    indication: "Akute Atemnot",
    singleDose: "2 Hübe",
    maxDose: "max. 8 Hübe / 24 h",
    interval: "mind. 4 Stunden",
    physician: "Dr. Martin Weber",
    validUntil: "31.12.2026",
    stock: 1,
  },
  {
    id: "r5",
    residentId: "rb",
    name: "Baldrian",
    strength: "450 mg",
    indication: "Unruhe und Einschlafstörung",
    singleDose: "1 Tablette",
    maxDose: "max. 2 Tabletten / 24 h",
    interval: "mind. 8 Stunden",
    physician: "Dr. Sarah Frei",
    validUntil: "31.01.2027",
    stock: 14,
  },
  {
    id: "r6",
    residentId: "pa",
    name: "Paracetamol",
    strength: "500 mg",
    indication: "Schmerzen ab NRS 3",
    singleDose: "1 Tablette",
    maxDose: "max. 3 g / 24 h",
    interval: "mind. 6 Stunden",
    physician: "Dr. Martin Weber",
    validUntil: "31.10.2026",
    stock: 7,
  },
];

const viewMeta: Record<
  MedicationView,
  { child: string; eyebrow: string; title: string; description: string; action: string }
> = {
  plan: {
    child: "Medikamentenplan",
    eyebrow: "CareCore Med",
    title: "Medikamentenplan",
    description: "Ärztliche Verordnungen, Dosierungen und Einnahmezeiten sicher im Blick.",
    action: "Verordnung erfassen",
  },
  round: {
    child: "Medikamentenrunde",
    eyebrow: "CareCore Med",
    title: "Medikamentenrunde",
    description: "Geplante Gaben vorbereiten, prüfen und direkt dokumentieren.",
    action: "Runde starten",
  },
  stocks: {
    child: "Bestände",
    eyebrow: "CareCore Med",
    title: "Medikamentenbestände",
    description: "Bestände, Mindestmengen und Verfalldaten zentral überwachen.",
    action: "Wareneingang",
  },
  reserves: {
    child: "Reserven",
    eyebrow: "CareCore Med",
    title: "Reserven",
    description: "Ärztlich verordnete Bedarfsmedikation je Bewohner ein- und austragen.",
    action: "Reserve hinzufügen",
  },
};

function ResidentList({
  selectedId,
  onSelect,
  query,
  setQuery,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  const filtered = residents.filter((resident) =>
    `${resident.name} ${resident.room} ${resident.unit}`
      .toLocaleLowerCase("de-CH")
      .includes(query.trim().toLocaleLowerCase("de-CH")),
  );
  return (
    <section className="card med-resident-browser">
      <div className="med-resident-toolbar">
        <div>
          <h2 className="card-title">Bewohner</h2>
          <p className="card-subtitle">
            {filtered.length} von {residents.length} Demo-Akten
          </p>
        </div>
        <label className="resident-search">
          <ModuleIcon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bewohner oder Zimmer"
            aria-label="Bewohner durchsuchen"
          />
        </label>
      </div>
      <div className="med-resident-list">
        {filtered.map((resident) => (
          <button
            className={resident.id === selectedId ? "selected" : ""}
            type="button"
            key={resident.id}
            onClick={() => onSelect(resident.id)}
          >
            <span className="resident-avatar">{resident.initials}</span>
            <span>
              <strong>{resident.name}</strong>
              <small>
                {resident.room} · {resident.unit}
              </small>
              <em>{resident.medications} Dauermedikationen</em>
            </span>
            <ModuleIcon name="chevron" />
          </button>
        ))}
      </div>
    </section>
  );
}

function PlanView({ showToast }: { showToast: (message: string) => void }) {
  const [residentId, setResidentId] = useState("hm");
  const [query, setQuery] = useState("");
  const resident = residents.find((item) => item.id === residentId) ?? residents[0];
  const entries = medications.filter((item) => item.residentId === resident.id);
  return (
    <div className="medication-two-column">
      <ResidentList selectedId={resident.id} onSelect={setResidentId} query={query} setQuery={setQuery} />
      <section className="med-main-column">
        <section className="card med-profile-head">
          <div className="care-profile-identity">
            <span className="resident-avatar">{resident.initials}</span>
            <div>
              <p className="eyebrow">Aktueller Plan</p>
              <h2>{resident.name}</h2>
              <span>
                {resident.room} · {resident.unit}
              </span>
            </div>
          </div>
          <div className="med-profile-flags">
            <span className={resident.allergies === "Keine bekannt" ? "status-badge stable" : "status-badge critical"}>
              Allergien: {resident.allergies}
            </span>
            <button
              className="secondary-button"
              type="button"
              onClick={() => showToast(`Medikationsabgleich für ${resident.name} vorbereitet`)}
            >
              Abgleich
            </button>
          </div>
        </section>
        <section className="card med-plan-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">{entries.length} aktive Verordnungen</p>
              <h2 className="card-title">Regelmedikation</h2>
            </div>
            <span className="status-badge stable">Stand 12.09.2026</span>
          </div>
          <div className="med-plan-head">
            <span>Präparat</span>
            <span>Einnahme</span>
            <span>Indikation</span>
            <span>Verordnung</span>
            <span>Status</span>
          </div>
          <div className="med-plan-list">
            {entries.map((entry) => (
              <button type="button" key={entry.id} onClick={() => showToast(`${entry.name} zur Bearbeitung geöffnet`)}>
                <span className="med-pill-icon">
                  <ModuleIcon name="med" />
                </span>
                <span>
                  <strong>
                    {entry.name} {entry.strength}
                  </strong>
                  <small>
                    {entry.form} · {entry.route}
                  </small>
                </span>
                <span>
                  <strong>{entry.schedule}</strong>
                  <small>{entry.dose}</small>
                </span>
                <span>
                  <strong>{entry.indication}</strong>
                  <small>Ärztlich bestätigt</small>
                </span>
                <span>
                  <strong>{entry.physician}</strong>
                  <small>gültig bis {entry.validUntil}</small>
                </span>
                <span className={`status-badge ${entry.tone}`}>
                  {entry.tone === "attention" ? "Beobachten" : entry.tone === "critical" ? "Prüfen" : "Aktiv"}
                </span>
                <ModuleIcon name="chevron" />
              </button>
            ))}
            {entries.length === 0 && (
              <div className="resident-empty">
                <ModuleIcon name="med" />
                <strong>Keine Demo-Verordnungen</strong>
                <p>Für diesen Bewohner kann eine neue Verordnung erfasst werden.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function RoundView({ showToast }: { showToast: (message: string) => void }) {
  const [round, setRound] = useState("Morgenrunde · 08:00");
  const [states, setStates] = useState<Record<string, string>>({
    hm: "offen",
    mk: "offen",
    em: "gegeben",
    rb: "gegeben",
    pa: "offen",
    wb: "prüfen",
  });
  const completed = Object.values(states).filter((state) => state === "gegeben").length;
  const setState = (id: string, state: string, name: string) => {
    setStates((current) => ({ ...current, [id]: state }));
    showToast(
      `${name}: ${state === "gegeben" ? "Gabe dokumentiert" : state === "verweigert" ? "Verweigerung dokumentiert" : "zur Prüfung markiert"}`,
    );
  };
  return (
    <>
      <section className="wound-summary" aria-label="Status der Medikamentenrunde">
        <div>
          <span className="summary-icon">
            <ModuleIcon name="residents" />
          </span>
          <span>
            <strong>{residents.length}</strong>
            <small>Bewohner geplant</small>
          </span>
        </div>
        <div>
          <span className="summary-icon">
            <ModuleIcon name="check" />
          </span>
          <span>
            <strong>{completed}</strong>
            <small>Gaben abgeschlossen</small>
          </span>
        </div>
        <div>
          <span className="summary-icon attention">
            <ModuleIcon name="alert" />
          </span>
          <span>
            <strong>{residents.length - completed}</strong>
            <small>noch offen</small>
          </span>
        </div>
        <div>
          <span className="summary-icon info">
            <ModuleIcon name="med" />
          </span>
          <span>
            <strong>24</strong>
            <small>Einzelmedikationen</small>
          </span>
        </div>
      </section>
      <section className="critical-alert">
        <span className="critical-symbol">
          <ModuleIcon name="alert" />
        </span>
        <div>
          <strong>Dosisänderung beachten · Erika Meier</strong>
          <p>Metoprolol ab heute 50 mg. Bitte Wirkung und Verträglichkeit dokumentieren.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => showToast("Ärztliche Verordnung geöffnet")}>
          Verordnung ansehen <ModuleIcon name="chevron" className="button-icon" />
        </button>
      </section>
      <section className="card med-round-card">
        <div className="med-round-toolbar">
          <div>
            <h2 className="card-title">Laufende Runde</h2>
            <p className="card-subtitle">
              {completed} von {residents.length} Bewohnern abgeschlossen
            </p>
          </div>
          <label>
            <span>Runde</span>
            <select value={round} onChange={(event) => setRound(event.target.value)}>
              <option>Morgenrunde · 08:00</option>
              <option>Mittagsrunde · 12:00</option>
              <option>Abendrunde · 18:00</option>
              <option>Nachtrunde · 22:00</option>
            </select>
          </label>
          <div className="med-round-progress">
            <span>
              <i style={{ width: `${(completed / residents.length) * 100}%` }} />
            </span>
            <strong>{Math.round((completed / residents.length) * 100)}%</strong>
          </div>
        </div>
        <div className="med-round-list">
          {residents.map((resident) => {
            const residentMeds = medications.filter((item) => item.residentId === resident.id);
            const current = states[resident.id];
            return (
              <article className={`med-round-row ${current}`} key={resident.id}>
                <span className="resident-avatar">{resident.initials}</span>
                <div className="med-round-person">
                  <strong>{resident.name}</strong>
                  <small>
                    {resident.room} · {resident.unit}
                  </small>
                </div>
                <div className="med-round-meds">
                  {residentMeds.slice(0, 3).map((item) => (
                    <span key={item.id}>
                      <ModuleIcon name="med" />
                      <strong>
                        {item.name} {item.strength}
                      </strong>
                      <small>{item.dose}</small>
                    </span>
                  ))}
                  {residentMeds.length === 0 && (
                    <span>
                      <ModuleIcon name="med" />
                      <strong>Medikation laut Plan</strong>
                      <small>Demo-Sammelposition</small>
                    </span>
                  )}
                </div>
                <span
                  className={`status-badge ${current === "gegeben" ? "stable" : current === "prüfen" ? "attention" : current === "verweigert" ? "critical" : "info"}`}
                >
                  {current}
                </span>
                <div className="med-round-actions">
                  <button type="button" onClick={() => setState(resident.id, "gegeben", resident.name)}>
                    Gegeben
                  </button>
                  <button type="button" onClick={() => setState(resident.id, "verweigert", resident.name)}>
                    Verweigert
                  </button>
                  <button
                    type="button"
                    aria-label={`${resident.name} zur Prüfung markieren`}
                    onClick={() => setState(resident.id, "prüfen", resident.name)}
                  >
                    <ModuleIcon name="alert" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function StocksView({ showToast }: { showToast: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [ordered, setOrdered] = useState<string[]>([]);
  const filtered = stockItems.filter(
    (item) =>
      (filter === "Alle" ||
        (filter === "Kritisch"
          ? item.tone === "critical"
          : filter === "Bald ablaufend"
            ? item.tone === "attention"
            : item.tone === "stable")) &&
      `${item.name} ${item.strength} ${item.location}`
        .toLocaleLowerCase("de-CH")
        .includes(query.trim().toLocaleLowerCase("de-CH")),
  );
  return (
    <>
      <section className="wound-summary" aria-label="Bestandsübersicht">
        <div>
          <span className="summary-icon">
            <ModuleIcon name="med" />
          </span>
          <span>
            <strong>142</strong>
            <small>Artikel im Bestand</small>
          </span>
        </div>
        <div>
          <span className="summary-icon attention">
            <ModuleIcon name="alert" />
          </span>
          <span>
            <strong>6</strong>
            <small>unter Mindestbestand</small>
          </span>
        </div>
        <div>
          <span className="summary-icon info">
            <ModuleIcon name="calendar" />
          </span>
          <span>
            <strong>4</strong>
            <small>Verfall in 90 Tagen</small>
          </span>
        </div>
        <div>
          <span className="summary-icon">
            <ModuleIcon name="check" />
          </span>
          <span>
            <strong>98%</strong>
            <small>Bestand abgeglichen</small>
          </span>
        </div>
      </section>
      <section className="card med-stock-card">
        <div className="med-stock-toolbar">
          <div>
            <h2 className="card-title">Lagerbestand</h2>
            <p className="card-subtitle">Medikamentenraum und Bewohnerreserven</p>
          </div>
          <label className="resident-search">
            <ModuleIcon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Präparat oder Lagerort"
              aria-label="Bestände durchsuchen"
            />
          </label>
          <div className="care-record-filters">
            {["Alle", "Kritisch", "Bald ablaufend", "Ausreichend"].map((item) => (
              <button
                className={filter === item ? "active" : ""}
                type="button"
                key={item}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="med-stock-head">
          <span>Präparat</span>
          <span>Lagerort</span>
          <span>Bestand</span>
          <span>Verfall</span>
          <span>Aktion</span>
        </div>
        <div className="med-stock-list">
          {filtered.map((item) => {
            const low = item.stock < item.minimum;
            return (
              <article key={item.id}>
                <span className="med-pill-icon">
                  <ModuleIcon name="med" />
                </span>
                <span>
                  <strong>
                    {item.name} {item.strength}
                  </strong>
                  <small>{item.form}</small>
                </span>
                <span>
                  <strong>{item.location}</strong>
                  <small>Letzter Abgleich heute, 06:30</small>
                </span>
                <span className="med-stock-level">
                  <strong>
                    {item.stock} {item.unit}
                  </strong>
                  <span>
                    <i style={{ width: `${Math.min((item.stock / (item.minimum * 2)) * 100, 100)}%` }} />
                  </span>
                  <small>
                    Mindestbestand {item.minimum} {item.unit}
                  </small>
                </span>
                <span>
                  <strong>{item.expiry}</strong>
                  <small className={item.tone === "attention" ? "attention-text" : ""}>
                    {item.tone === "attention" ? "Bald prüfen" : "Im Zeitraum"}
                  </small>
                </span>
                <button
                  className={ordered.includes(item.id) ? "ordered" : ""}
                  type="button"
                  onClick={() => {
                    setOrdered((current) => (current.includes(item.id) ? current : [...current, item.id]));
                    showToast(`${item.name}: Bestellung vorgemerkt`);
                  }}
                >
                  {ordered.includes(item.id) ? "Bestellt" : low ? "Nachbestellen" : "Bestand buchen"}
                </button>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <div className="resident-empty">
              <ModuleIcon name="search" />
              <strong>Keine Bestände gefunden</strong>
              <p>Suche oder Filter anpassen.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ReservesView({ showToast }: { showToast: (message: string) => void }) {
  const [residentId, setResidentId] = useState("hm");
  const [query, setQuery] = useState("");
  const [reserves, setReserves] = useState(initialReserves);
  const [log, setLog] = useState([
    "Heute, 08:12 · Hans Müller · Paracetamol −1 · Anna Meier",
    "Gestern, 17:40 · Maria Keller · Novalgin −1 · Nora Baumann",
    "Gestern, 10:05 · Hans Müller · Macrogol +10 · Lea Frei",
  ]);
  const resident = residents.find((item) => item.id === residentId) ?? residents[0];
  const residentReserves = reserves.filter((item) => item.residentId === resident.id);
  const book = (item: ReserveItem, delta: number) => {
    if (delta < 0 && item.stock <= 0) {
      showToast(`${item.name}: kein Bestand für Austrag vorhanden`);
      return;
    }
    setReserves((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, stock: Math.max(0, entry.stock + delta) } : entry)),
    );
    const action = delta > 0 ? `+${delta} Eingang` : `${delta} Austrag`;
    setLog((current) => [`Jetzt · ${resident.name} · ${item.name} ${action} · Anna Meier`, ...current].slice(0, 5));
    showToast(`${item.name}: ${delta > 0 ? "Eingang" : "Austrag"} gebucht`);
  };
  return (
    <>
      <section className="wound-summary" aria-label="Reservenübersicht">
        <div>
          <span className="summary-icon">
            <ModuleIcon name="residents" />
          </span>
          <span>
            <strong>31</strong>
            <small>Bewohner mit Reserve</small>
          </span>
        </div>
        <div>
          <span className="summary-icon">
            <ModuleIcon name="med" />
          </span>
          <span>
            <strong>64</strong>
            <small>aktive Verordnungen</small>
          </span>
        </div>
        <div>
          <span className="summary-icon attention">
            <ModuleIcon name="alert" />
          </span>
          <span>
            <strong>3</strong>
            <small>Bestände kritisch</small>
          </span>
        </div>
        <div>
          <span className="summary-icon info">
            <ModuleIcon name="calendar" />
          </span>
          <span>
            <strong>2</strong>
            <small>Verordnungen laufen ab</small>
          </span>
        </div>
      </section>
      <section className="critical-alert med-reserve-alert">
        <span className="critical-symbol">
          <ModuleIcon name="alert" />
        </span>
        <div>
          <strong>Sicherheitsprüfung bei jedem Austrag</strong>
          <p>
            Ein Austrag ist nur für eine gültige ärztliche Verordnung möglich. Maximaldosis und Mindestintervall bleiben
            sichtbar.
          </p>
        </div>
      </section>
      <div className="medication-two-column">
        <ResidentList selectedId={resident.id} onSelect={setResidentId} query={query} setQuery={setQuery} />
        <section className="med-main-column">
          <section className="card med-profile-head">
            <div className="care-profile-identity">
              <span className="resident-avatar">{resident.initials}</span>
              <div>
                <p className="eyebrow">Bedarfsmedikation</p>
                <h2>{resident.name}</h2>
                <span>
                  {resident.room} · {resident.unit}
                </span>
              </div>
            </div>
            <span className={resident.allergies === "Keine bekannt" ? "status-badge stable" : "status-badge critical"}>
              Allergien: {resident.allergies}
            </span>
          </section>
          <section className="card med-reserve-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Ärztlich verordnet</p>
                <h2 className="card-title">Verfügbare Reserven</h2>
                <p className="card-subtitle">Ein- und Austräge werden im Bestandsjournal protokolliert.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => showToast(`Neue Reserveverordnung für ${resident.name} vorbereitet`)}
              >
                <ModuleIcon name="plus" />
                Verordnung
              </button>
            </div>
            <div className="med-reserve-list">
              {residentReserves.map((item) => (
                <article key={item.id}>
                  <div className="med-reserve-title">
                    <span className="med-pill-icon">
                      <ModuleIcon name="med" />
                    </span>
                    <span>
                      <strong>
                        {item.name} {item.strength}
                      </strong>
                      <small>{item.indication}</small>
                    </span>
                    <span
                      className={`status-badge ${item.stock <= 3 ? "critical" : item.stock <= 8 ? "attention" : "stable"}`}
                    >
                      {item.stock} verfügbar
                    </span>
                  </div>
                  <div className="med-reserve-rules">
                    <span>
                      <small>Einzeldosis</small>
                      <strong>{item.singleDose}</strong>
                    </span>
                    <span>
                      <small>Maximaldosis</small>
                      <strong>{item.maxDose}</strong>
                    </span>
                    <span>
                      <small>Mindestintervall</small>
                      <strong>{item.interval}</strong>
                    </span>
                    <span>
                      <small>Verordnung</small>
                      <strong>{item.physician}</strong>
                      <em>bis {item.validUntil}</em>
                    </span>
                  </div>
                  <div className="med-reserve-actions">
                    <button type="button" onClick={() => book(item, 1)}>
                      <ModuleIcon name="plus" />
                      Eingang eintragen
                    </button>
                    <button type="button" onClick={() => book(item, -1)}>
                      <span aria-hidden="true">−</span>Austrag dokumentieren
                    </button>
                  </div>
                </article>
              ))}
              {residentReserves.length === 0 && (
                <div className="resident-empty">
                  <ModuleIcon name="med" />
                  <strong>Keine Reserve verordnet</strong>
                  <p>Eine Reserve kann nur mit gültiger ärztlicher Verordnung angelegt werden.</p>
                </div>
              )}
            </div>
          </section>
          <section className="card med-reserve-log">
            <div className="card-header">
              <div>
                <p className="eyebrow">Nachvollziehbarkeit</p>
                <h2 className="card-title">Bestandsjournal</h2>
              </div>
            </div>
            <div>
              {log.map((entry, index) => (
                <p key={`${entry}-${index}`}>
                  <ModuleIcon name="check" />
                  <span>{entry}</span>
                </p>
              ))}
            </div>
          </section>
        </section>
      </div>
    </>
  );
}

export default function MedicationWorkspace({ view }: { view: MedicationView }) {
  const meta = viewMeta[view];
  return (
    <ModulePageShell
      activeModule="med"
      activeChild={meta.child}
      pageClass={`medication-page medication-${view}`}
      locationSecondary="Gesamtes Haus · alle Wohnbereiche"
    >
      {(showToast) => (
        <main className="workspace module-workspace">
          <section className="page-heading care-page-heading" aria-labelledby="medication-title">
            <div className="heading-copy">
              <p className="eyebrow">{meta.eyebrow}</p>
              <h1 id="medication-title">{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
            <button className="primary-button" type="button" onClick={() => showToast(`${meta.action} vorbereitet`)}>
              <ModuleIcon name="plus" className="button-icon" />
              {meta.action}
            </button>
          </section>
          {view === "plan" && <PlanView showToast={showToast} />}{" "}
          {view === "round" && <RoundView showToast={showToast} />}{" "}
          {view === "stocks" && <StocksView showToast={showToast} />}{" "}
          {view === "reserves" && <ReservesView showToast={showToast} />}
        </main>
      )}
    </ModulePageShell>
  );
}
