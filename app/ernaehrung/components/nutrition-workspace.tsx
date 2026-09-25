"use client";

import { useEffect, useState } from "react";
import ModulePageShell, { ModuleIcon } from "@/app/components/module-page-shell";
import { CareDatePicker, CareSelect, formatCareDate } from "@/app/components/care-form-controls";

export type NutritionView = "plan" | "fluids";

const nutritionResidents = [
  {
    id: "mk",
    initials: "MK",
    name: "Maria Keller",
    room: "Zimmer 204",
    plan: "Diabetikerkost · weich",
    target: "1.500 ml",
    consumed: "850 ml",
    progress: 57,
    tone: "attention",
  },
  {
    id: "hm",
    initials: "HM",
    name: "Hans Müller",
    room: "Zimmer 207",
    plan: "Normalkost · kleine Portionen",
    target: "1.800 ml",
    consumed: "1.220 ml",
    progress: 68,
    tone: "stable",
  },
  {
    id: "em",
    initials: "EM",
    name: "Erika Meier",
    room: "Zimmer 211",
    plan: "Leichte Vollkost",
    target: "1.600 ml",
    consumed: "1.430 ml",
    progress: 89,
    tone: "stable",
  },
  {
    id: "rb",
    initials: "RB",
    name: "Ruth Baumann",
    room: "Zimmer 214",
    plan: "Pürierte Kost",
    target: "1.400 ml",
    consumed: "620 ml",
    progress: 44,
    tone: "critical",
  },
];

function NutritionPopover({
  open,
  onClose,
  onSave,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (message: string) => void;
  mode: NutritionView;
}) {
  const [resident, setResident] = useState(nutritionResidents[0].name + " · " + nutritionResidents[0].room);
  const [meal, setMeal] = useState("Mittagessen");
  const [date, setDate] = useState("2026-09-15");
  const [amount, setAmount] = useState("250");
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const title = mode === "plan" ? "Ernährungsplan anlegen" : "Trinkmenge erfassen";
  return (
    <div
      className="area-editor-overlay nutrition-editor-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        className="area-editor-panel nutrition-editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-editor-title"
      >
        <header className="area-editor-header">
          <div>
            <p className="eyebrow">CareCore Nutrition · Ernährung</p>
            <h2 id="nutrition-editor-title">{title}</h2>
            <p>
              {mode === "plan"
                ? "Lege Kostform, Ziele und Besonderheiten für einen Bewohner fest."
                : "Dokumentiere die Trinkmenge mit Zeitpunkt und Kontext."}
            </p>
          </div>
          <button
            className="area-editor-close"
            type="button"
            onClick={onClose}
            aria-label="Ernährungseditor schliessen"
          >
            ×
          </button>
        </header>
        <form
          className="area-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            onSave(`${title} wurde gespeichert`);
          }}
        >
          <div className="area-editor-intro">
            <span className="area-editor-icon">
              <ModuleIcon name="nutrition" />
            </span>
            <div>
              <strong>{mode === "plan" ? "Persönlicher Ernährungsplan" : "Neue Trinkprotokoll-Messung"}</strong>
              <p>Die Angaben werden in der Bewohnerakte und im Tagesprotokoll berücksichtigt.</p>
            </div>
            <span className="duty-assignment-status">
              <i />
              Entwurf
            </span>
          </div>
          <div className="area-editor-grid">
            <label className="area-editor-wide">
              Bewohner
              <CareSelect
                label="Bewohner"
                value={resident}
                options={nutritionResidents.map((person) => `${person.name} · ${person.room}`)}
                onChange={setResident}
              />
            </label>
            {mode === "plan" ? (
              <>
                <label>
                  Kostform
                  <CareSelect
                    label="Kostform"
                    value={meal}
                    options={["Normalkost", "Leichte Vollkost", "Diabetikerkost", "Pürierte Kost", "Passierte Kost"]}
                    onChange={setMeal}
                  />
                </label>
                <label>
                  Gültig ab
                  <CareDatePicker label="Gültig ab" value={date} onChange={setDate} />
                </label>
                <label>
                  Trinkziel
                  <CareSelect
                    label="Trinkziel"
                    value={amount + " ml"}
                    options={["1.200 ml", "1.400 ml", "1.500 ml", "1.600 ml", "1.800 ml"]}
                    onChange={(value) => setAmount(value.replace(" ml", ""))}
                  />
                </label>
                <label>
                  Essensrhythmus
                  <CareSelect
                    label="Essensrhythmus"
                    value="3 Hauptmahlzeiten"
                    options={["3 Hauptmahlzeiten", "5 kleine Mahlzeiten", "Individuell"]}
                    onChange={() => undefined}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Datum
                  <CareDatePicker label="Datum" value={date} onChange={setDate} />
                </label>
                <label>
                  Tageszeit
                  <CareSelect
                    label="Tageszeit"
                    value={meal}
                    options={["Frühstück", "Zwischenmahlzeit", "Mittagessen", "Nachmittag", "Abendessen", "Nacht"]}
                    onChange={setMeal}
                  />
                </label>
                <label>
                  Getränkemenge
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="z. B. 250"
                    required
                  />
                </label>
              </>
            )}
            <label className="area-editor-wide">
              Hinweis oder Beobachtung
              <textarea
                placeholder={
                  mode === "plan"
                    ? "z. B. Allergien, Vorlieben, Hilfestellung …"
                    : "z. B. gut getrunken, Unterstützung benötigt …"
                }
                rows={5}
              />
            </label>
            <fieldset className="area-editor-wide">
              <legend>Dokumentationsoptionen</legend>
              <div className="area-service-options">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>In Übergabe anzeigen</span>
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Pflegeziel aktualisieren</span>
                </label>
                <label>
                  <input type="checkbox" />
                  <span>Angehörige informieren</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div className="duty-assignment-summary">
            <span>
              <strong>{resident.split(" · ")[0]}</strong>
              <small>{mode === "plan" ? meal : `${amount} ml · ${meal}`}</small>
            </span>
            <span>
              <strong>{formatCareDate(date)}</strong>
              <small>CareCore Nutrition · Entwurf</small>
            </span>
          </div>
          <footer className="area-editor-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit">
              <ModuleIcon name="check" /> {title}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function NutritionPlanView({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="nutrition-plan-layout">
      <section className="nutrition-board">
        <div className="nutrition-board-heading">
          <div>
            <p className="eyebrow">Individuelle Versorgung</p>
            <h2>Ernährungspläne</h2>
            <p>Aktuelle Kostformen, Ziele und Hilfestellungen je Bewohner.</p>
          </div>
          <button className="primary-button" type="button" onClick={onOpen}>
            <ModuleIcon name="plus" /> Plan anlegen
          </button>
        </div>
        <div className="nutrition-plan-grid">
          {nutritionResidents.map((resident) => (
            <article className="card nutrition-plan-card" key={resident.id}>
              <div className="nutrition-plan-card-head">
                <span className="resident-avatar">{resident.initials}</span>
                <span>
                  <strong>{resident.name}</strong>
                  <small>{resident.room}</small>
                </span>
                <span className={`status-badge ${resident.tone}`}>{resident.progress}%</span>
              </div>
              <div className="nutrition-plan-type">
                <span className="nutrition-plan-icon">
                  <ModuleIcon name="nutrition" />
                </span>
                <span>
                  <strong>{resident.plan}</strong>
                  <small>
                    Trinkziel {resident.target} · heute {resident.consumed}
                  </small>
                </span>
              </div>
              <div className="nutrition-progress">
                <span>
                  <i style={{ width: `${resident.progress}%` }} />
                </span>
                <small>Trinkfortschritt</small>
              </div>
              <footer>
                <button className="quiet-button" type="button" onClick={onOpen}>
                  Plan bearbeiten
                </button>
                <button className="quiet-button" type="button" onClick={onOpen}>
                  Trinkmenge <ModuleIcon name="chevron" />
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>
      <aside className="nutrition-side">
        <section className="card nutrition-alert-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Aufmerksamkeit</p>
              <h2 className="card-title">Trinkmenge heute</h2>
            </div>
            <span className="status-badge critical">2 offen</span>
          </div>
          <div className="nutrition-alert-list">
            <button type="button" onClick={onOpen}>
              <span>RB</span>
              <strong>Ruth Baumann</strong>
              <small>44% · 620 von 1.400 ml</small>
              <ModuleIcon name="chevron" />
            </button>
            <button type="button" onClick={onOpen}>
              <span>MK</span>
              <strong>Maria Keller</strong>
              <small>57% · Kontrolle um 16:00</small>
              <ModuleIcon name="chevron" />
            </button>
          </div>
        </section>
        <section className="card nutrition-menu-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Kücheninfo</p>
              <h2 className="card-title">Heutiger Menüplan</h2>
            </div>
          </div>
          <div>
            <span>
              <time>12:00</time>
              <strong>Gemüse-Risotto</strong>
              <small>Diabetikerkost verfügbar</small>
            </span>
            <span>
              <time>18:00</time>
              <strong>Abendbrot</strong>
              <small>Weiche Kost · Teeauswahl</small>
            </span>
          </div>
        </section>
      </aside>
    </div>
  );
}

function FluidsView({ onOpen }: { onOpen: () => void }) {
  const [selected, setSelected] = useState("mk");
  const selectedResident = nutritionResidents.find((resident) => resident.id === selected) ?? nutritionResidents[0];
  return (
    <div className="nutrition-fluids-layout">
      <section className="card fluids-table-card">
        <div className="fluids-table-heading">
          <div>
            <p className="eyebrow">Tagesprotokoll</p>
            <h2 className="card-title">Trinkprotokoll</h2>
            <p className="card-subtitle">Flüssigkeitsaufnahme im aktuellen Dienst · 15. September 2026</p>
          </div>
          <button className="primary-button" type="button" onClick={onOpen}>
            <ModuleIcon name="plus" /> Trinkmenge erfassen
          </button>
        </div>
        <div className="fluids-table">
          <div className="fluids-table-head">
            <span>Bewohner</span>
            <span>Trinkziel</span>
            <span>Fortschritt</span>
            <span>Letzte Gabe</span>
            <span />
          </div>
          {nutritionResidents.map((resident) => (
            <button
              className={selected === resident.id ? "selected" : ""}
              type="button"
              key={resident.id}
              onClick={() => setSelected(resident.id)}
            >
              <span className="fluids-resident">
                <span className="resident-avatar">{resident.initials}</span>
                <span>
                  <strong>{resident.name}</strong>
                  <small>{resident.room}</small>
                </span>
              </span>
              <span>
                <strong>{resident.consumed}</strong>
                <small>von {resident.target}</small>
              </span>
              <span className="fluids-progress">
                <i>
                  <em style={{ width: `${resident.progress}%` }} />
                </i>
                <b>{resident.progress}%</b>
              </span>
              <span>
                <strong>{resident.id === "mk" ? "13:20" : resident.id === "rb" ? "11:45" : "12:30"}</strong>
                <small>{resident.id === "rb" ? "unter Ziel" : "dokumentiert"}</small>
              </span>
              <ModuleIcon name="chevron" />
            </button>
          ))}
        </div>
      </section>
      <aside className="fluids-detail">
        <section className="card fluids-detail-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Ausgewählter Tagesverlauf</p>
              <h2 className="card-title">{selectedResident.name}</h2>
              <p className="card-subtitle">
                {selectedResident.room} · Ziel {selectedResident.target}
              </p>
            </div>
            <span className={`status-badge ${selectedResident.tone}`}>{selectedResident.progress}%</span>
          </div>
          <div className="fluid-ring">
            <div>
              <strong>{selectedResident.consumed.split(" ")[0]}</strong>
              <small>ml aufgenommen</small>
            </div>
          </div>
          <div className="fluid-detail-list">
            <div>
              <time>08:00</time>
              <span>
                <strong>Frühstück</strong>
                <small>250 ml Tee</small>
              </span>
            </div>
            <div>
              <time>10:15</time>
              <span>
                <strong>Zwischenmahlzeit</strong>
                <small>200 ml Wasser</small>
              </span>
            </div>
            <div>
              <time>13:20</time>
              <span>
                <strong>Mittagessen</strong>
                <small>400 ml Getränk</small>
              </span>
            </div>
          </div>
          <button className="secondary-button" type="button" onClick={onOpen}>
            Eintrag hinzufügen <ModuleIcon name="plus" />
          </button>
        </section>
        <section className="card fluid-guidance-card">
          <ModuleIcon name="nutrition" />
          <div>
            <strong>Pflegehinweis</strong>
            <p>
              {selectedResident.id === "rb"
                ? "Bis zur Abendrunde fehlen noch 780 ml. Getränke aktiv anbieten."
                : "Trinkmenge im Zielbereich. Weiter regelmässig anbieten."}
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}

const meta: Record<NutritionView, { child: string; title: string; description: string; action: string }> = {
  plan: {
    child: "Ernährungsplan",
    title: "Ernährungsplan",
    description: "Kostformen, Trinkziele und individuelle Vorlieben sicher koordinieren.",
    action: "Plan anlegen",
  },
  fluids: {
    child: "Trinkprotokoll",
    title: "Trinkprotokoll",
    description: "Flüssigkeitsaufnahme lückenlos erfassen und frühzeitig reagieren.",
    action: "Trinkmenge erfassen",
  },
};

export default function NutritionWorkspace({ view }: { view: NutritionView }) {
  const current = meta[view];
  const [popoverOpen, setPopoverOpen] = useState(false);
  return (
    <ModulePageShell
      activeModule="nutrition"
      activeChild={current.child}
      pageClass={`nutrition-page nutrition-${view}`}
      locationSecondary="Wohnbereich 2 · 1. OG"
    >
      {(showToast) => (
        <>
          <main className="workspace module-workspace nutrition-workspace">
            <section className="page-heading care-page-heading">
              <div className="heading-copy">
                <p className="eyebrow">CareCore Nutrition</p>
                <h1>{current.title}</h1>
                <p>{current.description}</p>
              </div>
              <button className="primary-button" type="button" onClick={() => setPopoverOpen(true)}>
                <ModuleIcon name="plus" className="button-icon" />
                {current.action}
              </button>
            </section>
            {view === "plan" ? (
              <NutritionPlanView onOpen={() => setPopoverOpen(true)} />
            ) : (
              <FluidsView onOpen={() => setPopoverOpen(true)} />
            )}
          </main>
          <NutritionPopover open={popoverOpen} mode={view} onClose={() => setPopoverOpen(false)} onSave={showToast} />
        </>
      )}
    </ModulePageShell>
  );
}
