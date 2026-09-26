"use client";

import { CalendarDots, Check, ClipboardText, PencilSimple, Plus, Trash, User } from "@phosphor-icons/react";
import type { ResidentRecordState } from "./use-resident-record";

export function RecordMasterDataView({ r }: { r: ResidentRecordState }) {
  const {
    resident,
    contentRef,
    masterDataEditing,
    setMasterDataEditing,
    residentGender,
    genderDraft,
    setGenderDraft,
    masterDataSaving,
    contacts,
    contactsLoading,
    contactsError,
    firstName,
    lastName,
    saveGender,
    openContactEditor,
    deleteContact,
  } = r;
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
                setGenderDraft(residentGender);
                setMasterDataEditing(false);
              }}
            >
              Abbrechen
            </button>
          )}
          <button
            className="primary-button"
            type="button"
            disabled={masterDataSaving}
            onClick={() => {
              if (masterDataEditing) void saveGender();
              else setMasterDataEditing(true);
            }}
          >
            {masterDataEditing ? (
              <>
                <Check aria-hidden="true" /> {masterDataSaving ? "Speichern…" : "Geschlecht speichern"}
              </>
            ) : (
              "Stammdaten bearbeiten"
            )}
          </button>
        </div>
      </div>

      <section className="master-data-status" aria-label="Status der Stammdaten">
        <div>
          <span>
            <Check aria-hidden="true" />
          </span>
          <p>
            <small>Aktenstatus</small>
            <strong>Vollständig</strong>
          </p>
        </div>
        <div>
          <span>
            <User aria-hidden="true" />
          </span>
          <p>
            <small>Bewohnernummer</small>
            <strong>CC-2024-0207</strong>
          </p>
        </div>
        <div>
          <span>
            <CalendarDots aria-hidden="true" />
          </span>
          <p>
            <small>Eintritt</small>
            <strong>12. Februar 2024</strong>
          </p>
        </div>
        <div>
          <span>
            <ClipboardText aria-hidden="true" />
          </span>
          <p>
            <small>Letzte Prüfung</small>
            <strong>Heute, 08:05</strong>
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
                <input defaultValue={firstName} readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Nachname</span>
                <input defaultValue={lastName} readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Geburtsdatum</span>
                <input type="date" defaultValue="1940-06-14" readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Geschlecht</span>
                <select
                  value={genderDraft}
                  onChange={(event) => setGenderDraft(event.target.value)}
                  disabled={!masterDataEditing}
                >
                  <option value="female">Weiblich</option>
                  <option value="male">Männlich</option>
                  <option value="diverse">Divers</option>
                  <option value="unspecified">Keine Angabe</option>
                </select>
              </label>
              <label>
                <span>Zivilstand</span>
                <select defaultValue="Verwitwet" disabled={!masterDataEditing}>
                  <option>Ledig</option>
                  <option>Verheiratet</option>
                  <option>Verwitwet</option>
                  <option>Geschieden</option>
                </select>
              </label>
              <label>
                <span>Bevorzugte Sprache</span>
                <select defaultValue="Deutsch" disabled={!masterDataEditing}>
                  <option>Deutsch</option>
                  <option>Französisch</option>
                  <option>Italienisch</option>
                  <option>Englisch</option>
                </select>
              </label>
              <label>
                <span>AHV-Nummer</span>
                <input defaultValue="756.1234.5678.97" readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Konfession</span>
                <input defaultValue="Reformiert" readOnly={!masterDataEditing} />
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
                <input defaultValue={resident.unit} readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Zimmer</span>
                <input defaultValue={resident.room} readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Pflegebedarf</span>
                <input defaultValue={resident.careLevel} readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Bezugspflege</span>
                <input defaultValue="Anna Meier" readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Eintrittsdatum</span>
                <input type="date" defaultValue="2024-02-12" readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Eintrittsgrund</span>
                <input defaultValue="Langzeitpflege" readOnly={!masterDataEditing} />
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
                <input defaultValue="Dr. med. Martin Weber" readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Hausarztpraxis</span>
                <input defaultValue="Praxis am Stadtpark, Zürich" readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Stammapotheke</span>
                <input defaultValue="Apotheke Sonnengarten" readOnly={!masterDataEditing} />
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
                <input defaultValue="CSS Versicherung" readOnly={!masterDataEditing} />
              </label>
              <label>
                <span>Versichertennummer</span>
                <input defaultValue="80756012345678901234" readOnly={!masterDataEditing} />
              </label>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
