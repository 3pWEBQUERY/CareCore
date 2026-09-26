"use client";

import { Check, X } from "@phosphor-icons/react";
import type { ResidentRecordState } from "./use-resident-record";

export function ContactEditorDialog({ r }: { r: ResidentRecordState }) {
  const { resident, contactEditor, setContactEditor, contactSaving, saveContact } = r;
  if (!contactEditor) return null;
  return (
    <div
      className="contact-editor-layer"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && setContactEditor(null)}
    >
      <section className="contact-editor-panel" role="dialog" aria-modal="true" aria-labelledby="contact-editor-title">
        <header>
          <div>
            <span className="record-section-label">Notfall · Kontaktpersonen</span>
            <h3 id="contact-editor-title">
              {contactEditor.id ? "Kontaktperson bearbeiten" : "Kontaktperson hinzufügen"}
            </h3>
            <p>Kontaktdaten und Erreichbarkeit für {resident.name} sicher hinterlegen.</p>
          </div>
          <button type="button" onClick={() => setContactEditor(null)} aria-label="Kontaktpersoneneditor schließen">
            <X />
          </button>
        </header>
        <form onSubmit={saveContact}>
          <div className="contact-editor-form-grid">
            <label className="wide">
              <span>Name</span>
              <input
                value={contactEditor.draft.fullName}
                onChange={(event) =>
                  setContactEditor((current) =>
                    current ? { ...current, draft: { ...current.draft, fullName: event.target.value } } : current,
                  )
                }
                placeholder="Vor- und Nachname"
                autoFocus
                required
              />
            </label>
            <label>
              <span>Beziehung</span>
              <input
                value={contactEditor.draft.relationship}
                onChange={(event) =>
                  setContactEditor((current) =>
                    current ? { ...current, draft: { ...current.draft, relationship: event.target.value } } : current,
                  )
                }
                placeholder="z. B. Tochter, Nachbar"
              />
            </label>
            <label>
              <span>Telefon</span>
              <input
                type="tel"
                value={contactEditor.draft.phone}
                onChange={(event) =>
                  setContactEditor((current) =>
                    current ? { ...current, draft: { ...current.draft, phone: event.target.value } } : current,
                  )
                }
                placeholder="+41 79 555 12 34"
              />
            </label>
            <label className="wide">
              <span>E-Mail</span>
              <input
                type="email"
                value={contactEditor.draft.email}
                onChange={(event) =>
                  setContactEditor((current) =>
                    current ? { ...current, draft: { ...current.draft, email: event.target.value } } : current,
                  )
                }
                placeholder="name@beispiel.ch"
              />
            </label>
          </div>
          <fieldset className="contact-editor-options">
            <legend>Kennzeichnung</legend>
            <label className={contactEditor.draft.isPrimary ? "active" : ""}>
              <input
                type="checkbox"
                checked={contactEditor.draft.isPrimary}
                onChange={(event) =>
                  setContactEditor((current) =>
                    current ? { ...current, draft: { ...current.draft, isPrimary: event.target.checked } } : current,
                  )
                }
              />
              <span>
                <strong>Hauptkontakt</strong>
                <small>Diese Person wird in der Bewohnerakte vorrangig angezeigt.</small>
              </span>
              <i>
                <Check />
              </i>
            </label>
            <label className={contactEditor.draft.isEmergencyContact ? "active emergency" : ""}>
              <input
                type="checkbox"
                checked={contactEditor.draft.isEmergencyContact}
                onChange={(event) =>
                  setContactEditor((current) =>
                    current
                      ? { ...current, draft: { ...current.draft, isEmergencyContact: event.target.checked } }
                      : current,
                  )
                }
              />
              <span>
                <strong>Notfallkontakt</strong>
                <small>Bei dringenden Ereignissen direkt berücksichtigen.</small>
              </span>
              <i>
                <Check />
              </i>
            </label>
          </fieldset>
          <footer>
            <button className="secondary-button" type="button" onClick={() => setContactEditor(null)}>
              Abbrechen
            </button>
            <button className="primary-button" type="submit" disabled={contactSaving}>
              <Check />{" "}
              {contactSaving ? "Speichern…" : contactEditor.id ? "Änderungen speichern" : "Kontaktperson hinzufügen"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
