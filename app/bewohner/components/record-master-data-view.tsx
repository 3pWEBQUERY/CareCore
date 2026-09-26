"use client";

import { useState } from "react";
import { CalendarDots, Check, ClipboardText, PencilSimple, Plus, Trash, User } from "@phosphor-icons/react";
import { formatDate, formatDateTime, requestJson } from "@/app/components/workspace-ui";
import { LANGUAGES, MARITAL_STATUSES, type MasterData, type RecordSummary } from "@/lib/resident-record-shared";
import type { ResidentRecordState } from "./use-resident-record";

const GENDERS: Record<string, string> = {
  female: "Weiblich",
  male: "Männlich",
  diverse: "Divers",
  unspecified: "Keine Angabe",
};

export function RecordMasterDataView({ r }: { r: ResidentRecordState }) {
  const {
    resident,
    contentRef,
    masterDataEditing,
    setMasterDataEditing,
    contacts,
    contactsLoading,
    contactsError,
    openContactEditor,
    deleteContact,
    live,
    onAction,
    onGenderChanged,
    setResidentGender,
  } = r;
  const summary = live.summary.data;
  const [draft, setDraft] = useState<MasterData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const values: Partial<MasterData> = (masterDataEditing ? draft : summary?.master) ?? {};
  const editable = masterDataEditing && Boolean(draft);
  const set = <K extends keyof MasterData>(key: K, value: MasterData[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const field = (key: keyof MasterData) => ({
    value: (values[key] as string | null | undefined) ?? "",
    readOnly: !editable,
    onChange: (event: { target: { value: string } }) => set(key, event.target.value as never),
  });
  const canWrite = summary?.canWrite ?? false;

  async function save() {
    if (!draft || !resident.id) return;
    setSaving(true);
    setError("");
    try {
      const next = await requestJson<RecordSummary>(`/api/residents/${resident.id}/record`, {
        method: "PATCH",
        body: draft,
      });
      live.summary.reload();
      live.care.reload();
      setResidentGender(next.master.gender);
      onGenderChanged?.(resident.id, next.master.gender);
      setMasterDataEditing(false);
      onAction("Stammdaten gespeichert");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Stammdaten konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="resident-record-content record-master-data-view" ref={contentRef} key="master-data">
      <div className="master-data-page-heading">
        <div>
          <span className="record-section-label">Bewohnerakte</span>
          <h3>Stammdaten</h3>
          <p>Persönliche, organisatorische und administrative Angaben zu {resident.name}.</p>
        </div>
        <div className="master-data-heading-actions">
          {masterDataEditing && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setDraft(null);
                setError("");
                setMasterDataEditing(false);
              }}
            >
              Abbrechen
            </button>
          )}
          {canWrite && (
            <button
              className="primary-button"
              type="button"
              disabled={saving || !summary}
              onClick={() => {
                if (masterDataEditing) void save();
                else if (summary) {
                  setDraft(summary.master);
                  setMasterDataEditing(true);
                }
              }}
            >
              {masterDataEditing ? (
                <>
                  <Check aria-hidden="true" /> {saving ? "Speichern…" : "Stammdaten speichern"}
                </>
              ) : (
                "Stammdaten bearbeiten"
              )}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="appointment-editor-error" role="alert">
          {error}
        </p>
      )}

      <section className="master-data-status" aria-label="Status der Stammdaten">
        <div>
          <span>
            <Check aria-hidden="true" />
          </span>
          <p>
            <small>Aktenstatus</small>
            <strong title={summary?.missing.join(", ")}>
              {!summary ? "–" : summary.missing.length ? `Es fehlen: ${summary.missing.join(", ")}` : "Vollständig"}
            </strong>
          </p>
        </div>
        <div>
          <span>
            <User aria-hidden="true" />
          </span>
          <p>
            <small>Bewohnernummer</small>
            <strong>{summary?.master.externalNumber ?? "Nicht vergeben"}</strong>
          </p>
        </div>
        <div>
          <span>
            <CalendarDots aria-hidden="true" />
          </span>
          <p>
            <small>Eintritt</small>
            <strong>{summary?.master.admittedOn ? formatDate(summary.master.admittedOn) : "Nicht erfasst"}</strong>
          </p>
        </div>
        <div>
          <span>
            <ClipboardText aria-hidden="true" />
          </span>
          <p>
            <small>Letzte Prüfung</small>
            <strong>
              {summary?.checkedAt
                ? `${formatDateTime(summary.checkedAt)}${summary.checkedBy ? ` · ${summary.checkedBy}` : ""}`
                : "Noch nicht geprüft"}
            </strong>
          </p>
        </div>
      </section>

      <div className="master-data-layout">
        <div className="master-data-primary">
          <section className="record-card master-data-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Person</span>
                <h3>Persönliche Angaben</h3>
              </div>
            </div>
            <div className="master-data-form-grid">
              <label>
                <span>Vorname</span>
                <input required {...field("firstName")} />
              </label>
              <label>
                <span>Nachname</span>
                <input required {...field("lastName")} />
              </label>
              <label>
                <span>Geburtsdatum</span>
                <input type="date" {...field("dateOfBirth")} />
              </label>
              <label>
                <span>Geschlecht</span>
                <select
                  value={values.gender ?? "unspecified"}
                  onChange={(event) => set("gender", event.target.value)}
                  disabled={!editable}
                >
                  {Object.entries(GENDERS).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Zivilstand</span>
                <select
                  value={values.maritalStatus ?? ""}
                  onChange={(event) => set("maritalStatus", event.target.value || null)}
                  disabled={!editable}
                >
                  <option value="">Nicht erfasst</option>
                  {MARITAL_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Bevorzugte Sprache</span>
                <select
                  value={values.language ?? "de-CH"}
                  onChange={(event) => set("language", event.target.value)}
                  disabled={!editable}
                >
                  {Object.entries(LANGUAGES).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>AHV-Nummer</span>
                <input placeholder="756.XXXX.XXXX.XX" {...field("socialSecurityNumber")} />
              </label>
              <label>
                <span>Konfession</span>
                <input {...field("religion")} />
              </label>
            </div>
          </section>

          <section className="record-card master-data-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Aufenthalt</span>
                <h3>Organisation und Wohnen</h3>
              </div>
            </div>
            <div className="master-data-form-grid">
              <label>
                <span>Wohnbereich</span>
                <input value={resident.unit} readOnly title="Wird über Verlegung im Bewohnerverlauf geändert" />
              </label>
              <label>
                <span>Zimmer</span>
                <input value={resident.room} readOnly title="Wird über Verlegung im Bewohnerverlauf geändert" />
              </label>
              <label>
                <span>Pflegebedarf</span>
                <input
                  value={summary?.careLevel ?? resident.careLevel}
                  readOnly
                  title="Wird in der Pflegeplanung gepflegt"
                />
              </label>
              <label>
                <span>Bezugspflege</span>
                <select
                  value={values.primaryNurseId ?? ""}
                  onChange={(event) => set("primaryNurseId", event.target.value || null)}
                  disabled={!editable}
                >
                  <option value="">Nicht festgelegt</option>
                  {(summary?.staff ?? []).map((person) => (
                    <option value={person.id} key={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Eintrittsdatum</span>
                <input type="date" {...field("admittedOn")} />
              </label>
              <label>
                <span>Eintrittsgrund</span>
                <input placeholder="z. B. Langzeitpflege" {...field("admissionReason")} />
              </label>
            </div>
          </section>
        </div>

        <aside className="master-data-secondary">
          <section className="record-card master-data-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Medizin</span>
                <h3>Medizinische Kontakte</h3>
              </div>
            </div>
            <div className="master-data-form-grid single-column">
              <label>
                <span>Hausarzt</span>
                <input {...field("gpName")} />
              </label>
              <label>
                <span>Hausarztpraxis</span>
                <input {...field("gpPractice")} />
              </label>
              <label>
                <span>Stammapotheke</span>
                <input {...field("pharmacy")} />
              </label>
            </div>
          </section>

          <section className="record-card master-data-card">
            <div className="record-card-heading contact-card-heading">
              <div>
                <span className="record-section-label">Notfall</span>
                <h3>Kontaktpersonen</h3>
              </div>
              <button type="button" onClick={() => openContactEditor()}>
                <Plus aria-hidden="true" /> Kontakt hinzufügen
              </button>
            </div>
            <div className="resident-contacts-list">
              {contactsLoading ? (
                <p className="resident-contacts-loading">Kontaktpersonen werden geladen…</p>
              ) : (
                contacts.map((contact) => (
                  <article key={contact.id} className="resident-contact-card">
                    <div className="resident-contact-card-head">
                      <span className="resident-contact-avatar">
                        {contact.full_name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((name) => name[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{contact.full_name}</strong>
                        <small>{contact.relationship || "Beziehung nicht angegeben"}</small>
                      </div>
                      <div className="resident-contact-badges">
                        {contact.is_primary && <span>Hauptkontakt</span>}
                        {contact.is_emergency_contact && <span className="emergency">Notfall</span>}
                      </div>
                    </div>
                    <div className="resident-contact-details">
                      <a href={contact.phone ? `tel:${contact.phone}` : undefined}>
                        {contact.phone || "Keine Telefonnummer"}
                      </a>
                      <a href={contact.email ? `mailto:${contact.email}` : undefined}>
                        {contact.email || "Keine E-Mail-Adresse"}
                      </a>
                    </div>
                    <div className="resident-contact-actions">
                      <button
                        type="button"
                        onClick={() => openContactEditor(contact)}
                        aria-label={`${contact.full_name} bearbeiten`}
                      >
                        <PencilSimple aria-hidden="true" />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void deleteContact(contact)}
                        aria-label={`${contact.full_name} entfernen`}
                      >
                        <Trash aria-hidden="true" />
                        <span>Entfernen</span>
                      </button>
                    </div>
                  </article>
                ))
              )}
              {!contactsLoading && !contacts.length && (
                <div className="resident-contacts-empty">
                  <User aria-hidden="true" />
                  <strong>Noch keine Kontaktperson</strong>
                  <p>Hinterlege Angehörige, Vertrauenspersonen oder weitere Notfallkontakte.</p>
                  <button className="secondary-button" type="button" onClick={() => openContactEditor()}>
                    <Plus /> Erste Kontaktperson hinzufügen
                  </button>
                </div>
              )}
            </div>
            {contactsError && (
              <p className="resident-contacts-error" role="alert">
                {contactsError}
              </p>
            )}
          </section>

          <section className="record-card master-data-card">
            <div className="record-card-heading">
              <div>
                <span className="record-section-label">Administration</span>
                <h3>Versicherung</h3>
              </div>
            </div>
            <div className="master-data-form-grid single-column">
              <label>
                <span>Krankenversicherung</span>
                <input {...field("insurer")} />
              </label>
              <label>
                <span>Versichertennummer</span>
                <input {...field("insuranceNumber")} />
              </label>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
