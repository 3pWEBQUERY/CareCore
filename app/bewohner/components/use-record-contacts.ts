"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ResidentContact, ContactDraft, emptyContact } from "./resident-record-data";
import type { ResidentRecordData } from "./resident-record-data";

export function useRecordContacts({
  resident,
  onAction,
}: {
  resident: ResidentRecordData;
  onAction: (message: string) => void;
}) {
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(Boolean(resident.id));
  const [contactsError, setContactsError] = useState("");
  const [contactEditor, setContactEditor] = useState<{ id: string | null; draft: ContactDraft } | null>(null);
  const [contactSaving, setContactSaving] = useState(false);

  useEffect(() => {
    if (!resident.id) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setContactsLoading(true);
      fetch(`/api/residents/${resident.id}/contacts`, { cache: "no-store" })
        .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
        .then(({ response, data }) => {
          if (!active) return;
          if (response.ok) {
            setContacts(data.contacts ?? []);
            setContactsError("");
          } else setContactsError(data?.error || "Kontaktpersonen konnten nicht geladen werden.");
        })
        .catch(() => active && setContactsError("Kontaktpersonen konnten nicht geladen werden."))
        .finally(() => active && setContactsLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [resident.id]);

  function openContactEditor(contact?: ResidentContact) {
    setContactsError("");
    setContactEditor(
      contact
        ? {
            id: contact.id,
            draft: {
              fullName: contact.full_name,
              relationship: contact.relationship ?? "",
              phone: contact.phone ?? "",
              email: contact.email ?? "",
              isPrimary: contact.is_primary,
              isEmergencyContact: contact.is_emergency_contact,
            },
          }
        : { id: null, draft: { ...emptyContact, isPrimary: contacts.length === 0 } },
    );
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resident.id || !contactEditor) {
      setContactsError("Diese Demoakte hat keine gespeicherte Bewohner-ID.");
      return;
    }
    setContactSaving(true);
    setContactsError("");
    try {
      const response = await fetch(
        `/api/residents/${resident.id}/contacts${contactEditor.id ? `/${contactEditor.id}` : ""}`,
        {
          method: contactEditor.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(contactEditor.draft),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setContactsError(data?.error || "Kontaktperson konnte nicht gespeichert werden.");
        return;
      }
      setContacts((current) => {
        const updated = contactEditor.id
          ? current.map((contact) => (contact.id === contactEditor.id ? data.contact : contact))
          : [...current, data.contact];
        return [...updated].sort(
          (a, b) =>
            Number(b.is_primary) - Number(a.is_primary) ||
            Number(b.is_emergency_contact) - Number(a.is_emergency_contact) ||
            a.full_name.localeCompare(b.full_name, "de-CH"),
        );
      });
      setContactEditor(null);
      onAction(contactEditor.id ? "Kontaktperson aktualisiert" : "Kontaktperson hinzugefügt");
    } catch {
      setContactsError("Kontaktperson konnte nicht gespeichert werden.");
    } finally {
      setContactSaving(false);
    }
  }

  async function deleteContact(contact: ResidentContact) {
    if (!resident.id || !window.confirm(`${contact.full_name} wirklich aus den Kontaktpersonen entfernen?`)) return;
    setContactsError("");
    try {
      const response = await fetch(`/api/residents/${resident.id}/contacts/${contact.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setContactsError(data?.error || "Kontaktperson konnte nicht entfernt werden.");
        return;
      }
      setContacts((current) => current.filter((item) => item.id !== contact.id));
      onAction("Kontaktperson entfernt");
    } catch {
      setContactsError("Kontaktperson konnte nicht entfernt werden.");
    }
  }
  return {
    contacts,
    setContacts,
    contactsLoading,
    setContactsLoading,
    contactsError,
    setContactsError,
    contactEditor,
    setContactEditor,
    contactSaving,
    setContactSaving,
    openContactEditor,
    saveContact,
    deleteContact,
  };
}
