"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CareDatePicker, CareSelect } from "@/app/components/care-form-controls";
import {
  ArrowRight,
  ArrowsLeftRight,
  CalendarDots,
  CaretDown,
  Check,
  ClipboardText,
  FileText,
  Heartbeat,
  ListChecks,
  MagnifyingGlass,
  NotePencil,
  PencilSimple,
  Pill,
  Plus,
  Pulse,
  Stethoscope,
  Trash,
  User,
  Warning,
  X,
} from "@phosphor-icons/react";

export type ResidentRecordData = {
  id?: string;
  initials: string;
  name: string;
  room: string;
  unit: string;
  careLevel: string;
  note: string;
  lastUpdate: string;
  status: "critical" | "attention" | "info" | "stable";
  statusLabel: string;
};

type ResidentRecordProps = {
  resident: ResidentRecordData;
  onClose: () => void;
  onAction: (message: string) => void;
};

type RecordView = "overview" | "master-data" | "documentation" | "care-record" | "supplies" | "history" | "documents" | "biography";
type DocumentationFlag = "important" | "visit" | "observation" | "handover";
type HistoryFilter = "Alle" | "Pflege" | "Vitalwerte" | "Medikation" | "Termine";

type DocumentationEntry = {
  id: string;
  time: string;
  title: string;
  text: string;
  author: string;
  category: string;
};

type CareDomain = {
  id: string;
  label: string;
  status: "critical" | "attention" | "info" | "stable";
  statusLabel: string;
  summary: string;
  goal: string;
  measures: string[];
};

type BodyObservation = {
  id: string;
  type: "redness" | "wound" | "fracture";
  label: string;
  location: string;
  status: string;
  summary: string;
  recorded: string;
  author: string;
  x: string;
  y: string;
};

type HistoryEntry = {
  id: string;
  date: string;
  time: string;
  category: Exclude<HistoryFilter, "Alle">;
  title: string;
  description: string;
  author: string;
  tone: "critical" | "attention" | "info" | "stable";
  documentationId?: string;
};

type ResidentDocument = {
  id: string;
  title: string;
  category: "Arztberichte" | "Pflege" | "Medikation" | "Administration";
  fileType: string;
  size: string;
  updated: string;
  owner: string;
  status: "Aktuell" | "Neu" | "Unterschrift offen";
};

const recordTabs = ["Übersicht", "Stammdaten", "Biografie", "Dokumentation", "Pflegeakte", "Pflegebedarf", "Verlauf", "Dokumente"];

type ResidentBiography = {
  lifeStory: string;
  importantPeople: string;
  dailyRoutines: string;
  preferences: string;
  strengths: string;
  sensitiveTopics: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type ResidentContact = {
  id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  is_emergency_contact: boolean;
  updated_at: string;
};

type ContactDraft = { fullName: string; relationship: string; phone: string; email: string; isPrimary: boolean; isEmergencyContact: boolean };

const emptyBiography: ResidentBiography = { lifeStory: "", importantPeople: "", dailyRoutines: "", preferences: "", strengths: "", sensitiveTopics: "", updatedAt: null, updatedBy: null };
const emptyContact: ContactDraft = { fullName: "", relationship: "", phone: "", email: "", isPrimary: false, isEmergencyContact: true };
type ResidentSupply = { id: string; item_name: string; category: string; unit: string; current_quantity: number; target_quantity: number; status: "active" | "blocked" | "archived"; notes: string | null; updated_at: string };
type SupplyDraft = { itemName: string; category: string; unit: string; currentQuantity: number; targetQuantity: number; status: "active" | "blocked" | "archived"; notes: string };
const emptySupply: SupplyDraft = { itemName: "", category: "Pflege & Hygiene", unit: "Stück", currentQuantity: 0, targetQuantity: 0, status: "active", notes: "" };

const careDomains: CareDomain[] = [
  { id: "mobility", label: "Mobilität & Bewegung", status: "attention", statusLabel: "Beobachten", summary: "Mobilisation mit Rollator und Begleitung. Erhöhtes Sturzrisiko bei Lagewechseln und in der Nacht.", goal: "Sichere Mobilität im Wohnbereich erhalten und weitere Sturzereignisse vermeiden.", measures: ["Transfers mit verbaler Anleitung begleiten", "Rollator vor jedem Aufstehen bereitstellen", "Sturzprophylaxe und neurologische Kontrollen fortführen"] },
  { id: "nutrition", label: "Ernährung & Flüssigkeit", status: "stable", statusLabel: "Stabil", summary: "Normalkost, selbstständige Nahrungsaufnahme. Trinkmenge im vereinbarten Zielbereich.", goal: "Tägliche Flüssigkeitszufuhr von mindestens 1,5 Litern sicherstellen.", measures: ["Getränke sichtbar und erreichbar bereitstellen", "Trinkmenge pro Schicht dokumentieren", "Gewicht wöchentlich kontrollieren"] },
  { id: "cognition", label: "Kognition & Orientierung", status: "info", statusLabel: "Unterstützung", summary: "Zeitlich teilweise desorientiert, örtliche und persönliche Orientierung erhalten.", goal: "Orientierung und Selbstbestimmung im Tagesablauf bestmöglich unterstützen.", measures: ["Tagesstruktur sichtbar kommunizieren", "Kurze und eindeutige Informationen geben", "Biografiebezogene Aktivierung anbieten"] },
  { id: "skin", label: "Haut & Wunden", status: "stable", statusLabel: "Stabil", summary: "Haut intakt, aktuell keine offenen Wunden. Trockene Haut an beiden Unterschenkeln.", goal: "Intakte Haut erhalten und Hauttrockenheit reduzieren.", measures: ["Hautbeobachtung während der Körperpflege", "Unterschenkel morgens und abends eincremen", "Druckstellen unmittelbar dokumentieren"] },
  { id: "elimination", label: "Ausscheidung", status: "stable", statusLabel: "Stabil", summary: "Kontinente Ausscheidung mit selbstständiger Toilettennutzung am Tag.", goal: "Selbstständige Toilettennutzung und regelmäßige Ausscheidung erhalten.", measures: ["Toilettengänge nach Bedarf begleiten", "Ausscheidungsverhalten beobachten", "Veränderungen im Verlauf dokumentieren"] },
  { id: "sleep", label: "Ruhe & Schlaf", status: "attention", statusLabel: "Beobachten", summary: "Unterbrochener Nachtschlaf mit zwei bis drei Wachphasen und nächtlichem Bewegungsdrang.", goal: "Erholsame Ruhephasen fördern und nächtliche Sturzgefährdung reduzieren.", measures: ["Abendritual und Ruhezeiten einhalten", "Nachtlicht und Rufanlage kontrollieren", "Schlafverhalten im Nachtbericht festhalten"] },
];

const bodyObservations: BodyObservation[] = [
  { id: "right-shoulder", type: "redness", label: "Rötung", location: "Rechte Schulter", status: "Beobachten", summary: "Umschriebene Rötung ohne offene Hautstelle. Druckentlastung fortführen und bei der Abendpflege erneut kontrollieren.", recorded: "Heute, 08:10", author: "Anna Meier", x: "37%", y: "24%" },
  { id: "left-forearm", type: "wound", label: "Wunde", location: "Linker Unterarm", status: "Versorgung aktiv", summary: "Oberflächliche Hautläsion, 2,1 × 0,8 cm. Wundauflage trocken und reizlos; nächster Verbandwechsel morgen früh.", recorded: "Heute, 07:55", author: "Lea Frei", x: "70%", y: "43%" },
  { id: "right-knee", type: "fracture", label: "Fraktur", location: "Rechtes Knie", status: "Heilungsverlauf", summary: "Kontrollierter Heilungsverlauf nach proximaler Tibiafraktur. Teilbelastung gemäss ärztlicher Verordnung, Schmerzangabe aktuell 2 von 10.", recorded: "Gestern, 16:20", author: "Dr. Martin Weber", x: "43%", y: "69%" },
];

const historyEntries: HistoryEntry[] = [
  { id: "h1", date: "Heute · 10. September 2026", time: "08:10", category: "Pflege", title: "Hautbeobachtung ergänzt", description: "Rötung an der rechten Schulter dokumentiert und Druckentlastung für die laufende Schicht geplant.", author: "Anna Meier · Pflegefachfrau HF", tone: "attention", documentationId: "observation" },
  { id: "h2", date: "Heute · 10. September 2026", time: "07:55", category: "Pflege", title: "Wundversorgung durchgeführt", description: "Hautläsion am linken Unterarm gereinigt und mit trockener Wundauflage versorgt.", author: "Lea Frei · Fachfrau Gesundheit", tone: "critical" },
  { id: "h3", date: "Heute · 10. September 2026", time: "07:42", category: "Vitalwerte", title: "Vitalwerte erfasst", description: "Blutdruck 132/78 mmHg · Puls 72/min · Temperatur 36,7 °C.", author: "Anna Meier · Pflegefachfrau HF", tone: "stable", documentationId: "vitals" },
  { id: "h4", date: "Heute · 10. September 2026", time: "07:30", category: "Medikation", title: "Morgenmedikation verabreicht", description: "Vier von sechs geplanten Medikationen gemäss aktuellem Medikamentenplan abgegeben.", author: "Lea Frei · Fachfrau Gesundheit", tone: "info", documentationId: "medication" },
  { id: "h5", date: "Gestern · 9. September 2026", time: "16:20", category: "Termine", title: "Orthopädische Verlaufskontrolle", description: "Heilungsverlauf der proximalen Tibiafraktur regelrecht; Teilbelastung bleibt bestehen.", author: "Dr. med. Martin Weber", tone: "info" },
  { id: "h6", date: "Gestern · 9. September 2026", time: "14:05", category: "Pflege", title: "Mobilisation begleitet", description: "Transfer mit Rollator sicher durchgeführt, keine Schwindelangabe bei Lagewechsel.", author: "Anna Meier · Pflegefachfrau HF", tone: "stable" },
];

const residentDocuments: ResidentDocument[] = [
  { id: "d1", title: "Ärztlicher Verlaufsbericht September", category: "Arztberichte", fileType: "PDF", size: "1,8 MB", updated: "Heute, 08:35", owner: "Dr. Martin Weber", status: "Neu" },
  { id: "d2", title: "Pflegeplanung und Maßnahmen", category: "Pflege", fileType: "PDF", size: "840 KB", updated: "Gestern, 17:10", owner: "Anna Meier", status: "Aktuell" },
  { id: "d3", title: "Aktueller Medikamentenplan", category: "Medikation", fileType: "PDF", size: "420 KB", updated: "9. September 2026", owner: "Dr. Martin Weber", status: "Aktuell" },
  { id: "d4", title: "Einwilligung zur Datenfreigabe", category: "Administration", fileType: "PDF", size: "265 KB", updated: "8. September 2026", owner: "Administration", status: "Unterschrift offen" },
  { id: "d5", title: "Wunddokumentation linker Unterarm", category: "Pflege", fileType: "PDF", size: "3,2 MB", updated: "7. September 2026", owner: "Lea Frei", status: "Aktuell" },
  { id: "d6", title: "Austrittsbericht Akutspital", category: "Arztberichte", fileType: "PDF", size: "2,4 MB", updated: "14. August 2026", owner: "Stadtspital Zürich", status: "Aktuell" },
];

function getDocumentationEntries(resident: ResidentRecordData): DocumentationEntry[] {
  return [
    { id: "observation", time: "08:00", title: "Pflegebeobachtung aktualisiert", text: resident.note, author: "Anna Meier · Pflegefachfrau HF", category: "Pflegebeobachtung" },
    { id: "vitals", time: "07:42", title: "Vitalwerte erfasst", text: "Blutdruck 132/78 mmHg · Puls 72/min · Temperatur 36,7 °C", author: "Anna Meier · Pflegefachfrau HF", category: "Vitalwerte" },
    { id: "medication", time: "07:30", title: "Medikation verabreicht", text: "Morgenmedikation gemäss aktuellem Medikamentenplan.", author: "Lea Frei · Fachfrau Gesundheit", category: "Medikation" },
    { id: "handover", time: "06:55", title: "Dienstübergabe übernommen", text: "Nachtverlauf geprüft, offene Beobachtungen in den Dienstplan übernommen.", author: "Systemeintrag", category: "Übergabe" },
  ];
}

export function ResidentRecord({ resident, onClose, onAction }: ResidentRecordProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const entries = getDocumentationEntries(resident);
  const [activeView, setActiveView] = useState<RecordView>("overview");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [documentationText, setDocumentationText] = useState("");
  const [documentationDate, setDocumentationDate] = useState("2026-09-09");
  const [documentationCategory, setDocumentationCategory] = useState("Pflegebeobachtung");
  const [documentationFlags, setDocumentationFlags] = useState<DocumentationFlag[]>([]);
  const [masterDataEditing, setMasterDataEditing] = useState(false);
  const [activeCareDomainId, setActiveCareDomainId] = useState("mobility");
  const [activeBodyObservationId, setActiveBodyObservationId] = useState<string | null>("right-shoulder");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("Alle");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Alle");
  const [biography, setBiography] = useState<ResidentBiography>(emptyBiography);
  const [biographyEditing, setBiographyEditing] = useState(false);
  const [biographyLoading, setBiographyLoading] = useState(Boolean(resident.id));
  const [biographySaving, setBiographySaving] = useState(false);
  const [biographyError, setBiographyError] = useState("");
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(Boolean(resident.id));
  const [contactsError, setContactsError] = useState("");
  const [contactEditor, setContactEditor] = useState<{ id: string | null; draft: ContactDraft } | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [supplies, setSupplies] = useState<ResidentSupply[]>([]);
  const [suppliesLoading, setSuppliesLoading] = useState(Boolean(resident.id));
  const [suppliesError, setSuppliesError] = useState("");
  const [supplyEditor, setSupplyEditor] = useState<{ id: string | null; draft: SupplyDraft } | null>(null);
  const [supplySaving, setSupplySaving] = useState(false);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;
  const activeCareDomain = careDomains.find((domain) => domain.id === activeCareDomainId) ?? careDomains[0];
  const visibleHistoryEntries = historyEntries.filter((entry) => historyFilter === "Alle" || entry.category === historyFilter);
  const visibleDocuments = residentDocuments.filter((document) => {
    const query = documentSearch.trim().toLocaleLowerCase("de-CH");
    const queryStem = query.endsWith("e") ? query.slice(0, -1) : query;
    const searchableText = `${document.title} ${document.category} ${document.owner}`.toLocaleLowerCase("de-CH");
    return (documentCategory === "Alle" || document.category === documentCategory) && (!query || searchableText.includes(query) || searchableText.includes(queryStem));
  });
  const [firstName, ...lastNameParts] = resident.name.split(" ");
  const lastName = lastNameParts.join(" ");
  const gender = ["Hans", "Peter"].includes(firstName) ? "Männlich" : "Weiblich";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeView, selectedEntryId]);

  useEffect(() => {
    if (!resident.id) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setBiographyLoading(true);
      fetch(`/api/residents/${resident.id}/biography`, { cache: "no-store" })
        .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
        .then(({ response, data }) => {
          if (!active) return;
          if (response.ok && data?.biography) { setBiography(data.biography); setBiographyError(""); }
          else setBiographyError(data?.error || "Biografie konnte nicht geladen werden.");
        })
        .catch(() => active && setBiographyError("Biografie konnte nicht geladen werden."))
        .finally(() => active && setBiographyLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [resident.id]);

  useEffect(() => {
    if (!resident.id) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setSuppliesLoading(true);
      fetch(`/api/residents/${resident.id}/supplies`, { cache: "no-store" }).then(async (response) => ({ response, data: await response.json().catch(() => null) })).then(({ response, data }) => {
        if (!active) return;
        if (response.ok) { setSupplies(data.supplies ?? []); setSuppliesError(""); } else setSuppliesError(data?.error || "Pflegebedarf konnte nicht geladen werden.");
      }).catch(() => active && setSuppliesError("Pflegebedarf konnte nicht geladen werden.")).finally(() => active && setSuppliesLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [resident.id]);

  useEffect(() => {
    if (!resident.id) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setContactsLoading(true);
      fetch(`/api/residents/${resident.id}/contacts`, { cache: "no-store" })
        .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
        .then(({ response, data }) => {
          if (!active) return;
          if (response.ok) { setContacts(data.contacts ?? []); setContactsError(""); }
          else setContactsError(data?.error || "Kontaktpersonen konnten nicht geladen werden.");
        })
        .catch(() => active && setContactsError("Kontaktpersonen konnten nicht geladen werden."))
        .finally(() => active && setContactsLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [resident.id]);

  function openDocumentation(entry?: DocumentationEntry) {
    setSelectedEntryId(entry?.id ?? null);
    setDocumentationText(entry?.text ?? "");
    setDocumentationDate("2026-09-09");
    setDocumentationCategory(entry?.category ?? "Pflegebeobachtung");
    setDocumentationFlags(entry?.id === "observation" ? ["important", "observation"] : entry?.id === "vitals" ? ["visit"] : entry?.id === "handover" ? ["handover"] : []);
    setActiveView("documentation");
  }

  function toggleDocumentationFlag(flag: DocumentationFlag) {
    setDocumentationFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  }

  function selectTab(tab: string) {
    if (tab === "Übersicht") setActiveView("overview");
    else if (tab === "Stammdaten") setActiveView("master-data");
    else if (tab === "Dokumentation") openDocumentation();
    else if (tab === "Pflegeakte") setActiveView("care-record");
    else if (tab === "Pflegebedarf") setActiveView("supplies");
    else if (tab === "Verlauf") setActiveView("history");
    else if (tab === "Dokumente") setActiveView("documents");
    else if (tab === "Biografie") setActiveView("biography");
  }

  function openSupplyEditor(supply?: ResidentSupply) {
    setSuppliesError("");
    setSupplyEditor(supply ? { id: supply.id, draft: { itemName: supply.item_name, category: supply.category, unit: supply.unit, currentQuantity: supply.current_quantity, targetQuantity: supply.target_quantity, status: supply.status, notes: supply.notes ?? "" } } : { id: null, draft: { ...emptySupply } });
  }
  async function saveSupply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!resident.id || !supplyEditor) { setSuppliesError("Diese Demoakte hat keine gespeicherte Bewohner-ID."); return; }
    setSupplySaving(true); setSuppliesError("");
    try { const response = await fetch(`/api/residents/${resident.id}/supplies${supplyEditor.id ? `/${supplyEditor.id}` : ""}`, { method: supplyEditor.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(supplyEditor.draft) }); const data = await response.json().catch(() => null); if (!response.ok) { setSuppliesError(data?.error || "Pflegebedarf konnte nicht gespeichert werden."); return; } setSupplies((current) => supplyEditor.id ? current.map((item) => item.id === supplyEditor.id ? data.supply : item) : [...current, data.supply]); setSupplyEditor(null); onAction(supplyEditor.id ? "Pflegebedarf aktualisiert" : "Pflegebedarf hinzugefügt"); } catch { setSuppliesError("Pflegebedarf konnte nicht gespeichert werden."); } finally { setSupplySaving(false); }
  }
  async function deleteSupply(supply: ResidentSupply) {
    if (!resident.id || !window.confirm(`${supply.item_name} wirklich entfernen?`)) return;
    const response = await fetch(`/api/residents/${resident.id}/supplies/${supply.id}`, { method: "DELETE" });
    if (response.ok) { setSupplies((current) => current.filter((item) => item.id !== supply.id)); onAction("Pflegebedarf entfernt"); } else setSuppliesError("Pflegebedarf konnte nicht entfernt werden.");
  }

  async function saveBiography() {
    if (!resident.id) { setBiographyError("Diese Demoakte hat keine gespeicherte Bewohner-ID."); return; }
    setBiographySaving(true); setBiographyError("");
    try {
      const response = await fetch(`/api/residents/${resident.id}/biography`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(biography) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setBiographyError(data?.error || "Biografie konnte nicht gespeichert werden."); return; }
      setBiography(data.biography); setBiographyEditing(false); onAction("Biografie gespeichert");
    } catch { setBiographyError("Biografie konnte nicht gespeichert werden."); }
    finally { setBiographySaving(false); }
  }

  function openContactEditor(contact?: ResidentContact) {
    setContactsError("");
    setContactEditor(contact ? { id: contact.id, draft: { fullName: contact.full_name, relationship: contact.relationship ?? "", phone: contact.phone ?? "", email: contact.email ?? "", isPrimary: contact.is_primary, isEmergencyContact: contact.is_emergency_contact } } : { id: null, draft: { ...emptyContact, isPrimary: contacts.length === 0 } });
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resident.id || !contactEditor) { setContactsError("Diese Demoakte hat keine gespeicherte Bewohner-ID."); return; }
    setContactSaving(true); setContactsError("");
    try {
      const response = await fetch(`/api/residents/${resident.id}/contacts${contactEditor.id ? `/${contactEditor.id}` : ""}`, { method: contactEditor.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(contactEditor.draft) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setContactsError(data?.error || "Kontaktperson konnte nicht gespeichert werden."); return; }
      setContacts((current) => {
        const updated = contactEditor.id ? current.map((contact) => contact.id === contactEditor.id ? data.contact : contact) : [...current, data.contact];
        return [...updated].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(b.is_emergency_contact) - Number(a.is_emergency_contact) || a.full_name.localeCompare(b.full_name, "de-CH"));
      });
      setContactEditor(null); onAction(contactEditor.id ? "Kontaktperson aktualisiert" : "Kontaktperson hinzugefügt");
    } catch { setContactsError("Kontaktperson konnte nicht gespeichert werden."); }
    finally { setContactSaving(false); }
  }

  async function deleteContact(contact: ResidentContact) {
    if (!resident.id || !window.confirm(`${contact.full_name} wirklich aus den Kontaktpersonen entfernen?`)) return;
    setContactsError("");
    try {
      const response = await fetch(`/api/residents/${resident.id}/contacts/${contact.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setContactsError(data?.error || "Kontaktperson konnte nicht entfernt werden."); return; }
      setContacts((current) => current.filter((item) => item.id !== contact.id)); onAction("Kontaktperson entfernt");
    } catch { setContactsError("Kontaktperson konnte nicht entfernt werden."); }
  }

  function saveDocumentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAction(selectedEntry ? "Dokumentation aktualisiert" : "Dokumentation gespeichert");
  }

  return (
    <div className="resident-record-layer">
      <article className="resident-record-panel" role="dialog" aria-modal="true" aria-labelledby="resident-record-title">
        <header className="resident-record-header">
          <div className="record-heading">
            <span className={`resident-avatar ${resident.status === "critical" ? "critical" : ""}`}>{resident.initials}</span>
            <div>
              <span className="record-kicker">Bewohnerakte</span>
              <h2 id="resident-record-title">{resident.name}</h2>
              <p>{resident.room} · {resident.unit} · {resident.careLevel}</p>
            </div>
          </div>
          <div className="record-header-actions">
            <span className={`status-badge ${resident.status}`}>{resident.statusLabel}</span>
            <button className="record-close-button" ref={closeButtonRef} type="button" aria-label="Bewohnerakte schliessen" onClick={onClose}><X aria-hidden="true"/></button>
          </div>
        </header>

        <nav className="resident-record-tabs" aria-label="Bereiche der Bewohnerakte">
          {recordTabs.map((tab) => {
            const active = (tab === "Übersicht" && activeView === "overview") || (tab === "Stammdaten" && activeView === "master-data") || (tab === "Dokumentation" && activeView === "documentation") || (tab === "Pflegeakte" && activeView === "care-record") || (tab === "Pflegebedarf" && activeView === "supplies") || (tab === "Verlauf" && activeView === "history") || (tab === "Dokumente" && activeView === "documents") || (tab === "Biografie" && activeView === "biography");
            return <button className={active ? "active" : ""} type="button" key={tab} aria-current={active ? "page" : undefined} onClick={() => selectTab(tab)}>{tab}</button>;
          })}
        </nav>

        {activeView === "overview" ? (
          <main className="resident-record-content" ref={contentRef} key="overview">
            <section className="record-metrics" aria-label="Aktenübersicht">
              <div><span className="record-metric-icon"><User aria-hidden="true"/></span><span><small>Bezugspflege</small><strong>Anna Meier</strong></span></div>
              <div><span className="record-metric-icon"><Heartbeat aria-hidden="true"/></span><span><small>Letzte Vitalwerte</small><strong>Heute, 07:42</strong></span></div>
              <div><span className="record-metric-icon"><Pill aria-hidden="true"/></span><span><small>Medikationen heute</small><strong>4 von 6 erfolgt</strong></span></div>
              <div><span className="record-metric-icon"><CalendarDots aria-hidden="true"/></span><span><small>Nächster Termin</small><strong>Arztvisite, 09:30</strong></span></div>
            </section>

            <section className="record-card record-quick-access" aria-labelledby="quick-access-title">
              <div className="record-card-heading"><div><span className="record-section-label">Direktzugriff</span><h3 id="quick-access-title">Schnellaktionen</h3></div><span>8 Aktionen</span></div>
              <div className="record-horizontal-actions">
                <button type="button" onClick={() => openDocumentation()}><NotePencil aria-hidden="true"/><span><strong>Dokumentieren</strong><small>Pflegeeintrag</small></span></button>
                <button type="button" onClick={() => onAction("Vitalwerterfassung vorbereitet")}><Heartbeat aria-hidden="true"/><span><strong>Vitalwert</strong><small>Messung erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Medikationsgabe vorbereitet")}><Pill aria-hidden="true"/><span><strong>Medikation</strong><small>Gabe erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Aufgabe vorbereitet")}><ListChecks aria-hidden="true"/><span><strong>Aufgabe</strong><small>Intervention planen</small></span></button>
                <button type="button" onClick={() => setActiveView("care-record")}><ClipboardText aria-hidden="true"/><span><strong>Pflegeplanung</strong><small>Ziele öffnen</small></span></button>
                <button type="button" onClick={() => onAction("Wunddokumentation vorbereitet")}><Pulse aria-hidden="true"/><span><strong>Wunde</strong><small>Status erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Trinkmenge vorbereitet")}><User aria-hidden="true"/><span><strong>Trinkmenge</strong><small>Flüssigkeit erfassen</small></span></button>
                <button type="button" onClick={() => onAction("Neue Einschätzung vorbereitet")}><Stethoscope aria-hidden="true"/><span><strong>Einschätzung</strong><small>Assessment starten</small></span></button>
              </div>
            </section>

            <div className="resident-overview-layout">
              <section className="record-card body-map-card" aria-labelledby="body-map-title">
                <div className="record-card-heading"><div><span className="record-section-label">Körperstatus</span><h3 id="body-map-title">Körperübersicht</h3></div><span>{bodyObservations.length} Einträge</span></div>
                <div className="body-map-content">
                  <div className="body-map-visual">
                    <div className="body-map-legend" aria-label="Legende"><span className="redness">Rötung</span><span className="wound">Wunde</span><span className="fracture">Fraktur</span></div>
                    <div className="body-map-stage">
                      <Image src="/resident-body-map.png" alt="Vorderansicht des Körpers von Hans Müller" width={1024} height={1536} priority unoptimized/>
                      {bodyObservations.map((observation) => (
                        <button
                          className={`body-marker ${observation.type} ${activeBodyObservationId === observation.id ? "active" : ""}`}
                          style={{ left: observation.x, top: observation.y }}
                          type="button"
                          key={observation.id}
                          aria-label={`${observation.label} – ${observation.location}`}
                          aria-expanded={activeBodyObservationId === observation.id}
                          aria-controls={`body-observation-${observation.id}`}
                          onClick={() => setActiveBodyObservationId((current) => current === observation.id ? null : observation.id)}
                        ><span aria-hidden="true"/><small>{observation.label}</small></button>
                      ))}
                    </div>
                  </div>

                  <div className="body-observation-list" aria-label="Erfasste Körperstellen">
                    {bodyObservations.map((observation) => {
                      const expanded = activeBodyObservationId === observation.id;
                      return (
                        <section className={`body-observation ${expanded ? "expanded" : ""}`} key={observation.id}>
                          <button className="body-observation-toggle" type="button" aria-expanded={expanded} aria-controls={`body-observation-${observation.id}`} onClick={() => setActiveBodyObservationId((current) => current === observation.id ? null : observation.id)}>
                            <span className={`body-observation-icon ${observation.type}`}><Pulse aria-hidden="true"/></span>
                            <span><strong>{observation.label}</strong><small>{observation.location} · {observation.status}</small></span>
                            <CaretDown aria-hidden="true"/>
                          </button>
                          {expanded && (
                            <div className="body-observation-detail" id={`body-observation-${observation.id}`}>
                              <p>{observation.summary}</p>
                              <dl><div><dt>Erfasst</dt><dd>{observation.recorded}</dd></div><div><dt>Verantwortlich</dt><dd>{observation.author}</dd></div></dl>
                              <div className="body-observation-links">
                                <button type="button" onClick={() => openDocumentation(entries[0])}>Dokumentation <ArrowRight aria-hidden="true"/></button>
                                <button type="button" onClick={() => observation.type === "wound" ? onAction("Wundmanagement geöffnet") : setActiveView("care-record")}>{observation.type === "wound" ? "Wundmanagement" : "Pflegeakte"} <ArrowRight aria-hidden="true"/></button>
                              </div>
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </div>
              </section>

              <aside className="resident-overview-side">
                <section className="record-card record-alert-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Pflegehinweis</span><h3>Aktuell wichtig</h3></div><span>{resident.lastUpdate}</span></div>
                  <div className={`record-clinical-alert ${resident.status}`}><Pulse aria-hidden="true"/><div><strong>{resident.note}</strong><p>Bitte im laufenden Dienst beachten und Veränderungen zeitnah dokumentieren.</p></div></div>
                </section>

                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Bewohner</span><h3>Stammdaten</h3></div><button type="button" onClick={() => setActiveView("master-data")}>Alle Stammdaten</button></div>
                  <dl className="record-details">
                    <div><dt>Zimmer</dt><dd>{resident.room}</dd></div>
                    <div><dt>Wohnbereich</dt><dd>{resident.unit}</dd></div>
                    <div><dt>Pflegebedarf</dt><dd>{resident.careLevel}</dd></div>
                    <div><dt>Hausarzt</dt><dd>Dr. med. Martin Weber</dd></div>
                    <div><dt>Eintritt</dt><dd>12. Februar 2024</dd></div>
                    <div><dt>Aktenstatus</dt><dd>Vollständig</dd></div>
                  </dl>
                </section>

                <button className="record-document-button" type="button" onClick={() => setActiveView("documents")}><FileText aria-hidden="true"/><span><strong>Dokumente und Berichte</strong><small>12 hinterlegte Dokumente</small></span></button>
              </aside>

              <section className="record-card record-overview-history">
                <div className="record-card-heading"><div><span className="record-section-label">Dokumentation</span><h3>Letzte Einträge</h3></div><button type="button" onClick={() => openDocumentation()}>Neue Dokumentation</button></div>
                <div className="record-history">
                  {entries.map((entry) => <button className="record-history-entry" type="button" key={entry.id} onClick={() => openDocumentation(entry)} aria-label={`${entry.title} öffnen`}><time>{entry.time}</time><i/><span><strong>{entry.title}</strong><p>{entry.text}</p><small>{entry.author}</small></span></button>)}
                </div>
              </section>
            </div>
          </main>
        ) : activeView === "master-data" ? (
          <main className="resident-record-content record-master-data-view" ref={contentRef} key="master-data">
            <div className="master-data-page-heading">
              <div><span className="record-section-label">Bewohnerakte</span><h3>Stammdaten</h3><p>Persönliche, organisatorische und administrative Angaben zu {resident.name}.</p></div>
              <div className="master-data-heading-actions">{masterDataEditing && <button className="secondary-button" type="button" onClick={() => setMasterDataEditing(false)}>Abbrechen</button>}<button className="primary-button" type="button" onClick={() => { if (masterDataEditing) onAction("Stammdaten gespeichert"); setMasterDataEditing((current) => !current); }}>{masterDataEditing ? <><Check aria-hidden="true"/> Änderungen speichern</> : "Stammdaten bearbeiten"}</button></div>
            </div>

            <section className="master-data-status" aria-label="Status der Stammdaten">
              <div><span><Check aria-hidden="true"/></span><p><small>Aktenstatus</small><strong>Vollständig</strong></p></div>
              <div><span><User aria-hidden="true"/></span><p><small>Bewohnernummer</small><strong>CC-2024-0207</strong></p></div>
              <div><span><CalendarDots aria-hidden="true"/></span><p><small>Eintritt</small><strong>12. Februar 2024</strong></p></div>
              <div><span><ClipboardText aria-hidden="true"/></span><p><small>Letzte Prüfung</small><strong>Heute, 08:05</strong></p></div>
            </section>

            <div className="master-data-layout">
              <div className="master-data-primary">
                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Person</span><h3>Persönliche Angaben</h3></div></div>
                  <div className="master-data-form-grid">
                    <label><span>Vorname</span><input defaultValue={firstName} readOnly={!masterDataEditing}/></label>
                    <label><span>Nachname</span><input defaultValue={lastName} readOnly={!masterDataEditing}/></label>
                    <label><span>Geburtsdatum</span><input type="date" defaultValue="1940-06-14" readOnly={!masterDataEditing}/></label>
                    <label><span>Geschlecht</span><select defaultValue={gender} disabled={!masterDataEditing}><option>Weiblich</option><option>Männlich</option><option>Divers</option></select></label>
                    <label><span>Zivilstand</span><select defaultValue="Verwitwet" disabled={!masterDataEditing}><option>Ledig</option><option>Verheiratet</option><option>Verwitwet</option><option>Geschieden</option></select></label>
                    <label><span>Bevorzugte Sprache</span><select defaultValue="Deutsch" disabled={!masterDataEditing}><option>Deutsch</option><option>Französisch</option><option>Italienisch</option><option>Englisch</option></select></label>
                    <label><span>AHV-Nummer</span><input defaultValue="756.1234.5678.97" readOnly={!masterDataEditing}/></label>
                    <label><span>Konfession</span><input defaultValue="Reformiert" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>

                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Aufenthalt</span><h3>Organisation und Wohnen</h3></div></div>
                  <div className="master-data-form-grid">
                    <label><span>Wohnbereich</span><input defaultValue={resident.unit} readOnly={!masterDataEditing}/></label>
                    <label><span>Zimmer</span><input defaultValue={resident.room} readOnly={!masterDataEditing}/></label>
                    <label><span>Pflegebedarf</span><input defaultValue={resident.careLevel} readOnly={!masterDataEditing}/></label>
                    <label><span>Bezugspflege</span><input defaultValue="Anna Meier" readOnly={!masterDataEditing}/></label>
                    <label><span>Eintrittsdatum</span><input type="date" defaultValue="2024-02-12" readOnly={!masterDataEditing}/></label>
                    <label><span>Eintrittsgrund</span><input defaultValue="Langzeitpflege" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>
              </div>

              <aside className="master-data-secondary">
                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Medizin</span><h3>Medizinische Kontakte</h3></div></div>
                  <div className="master-data-form-grid single-column">
                    <label><span>Hausarzt</span><input defaultValue="Dr. med. Martin Weber" readOnly={!masterDataEditing}/></label>
                    <label><span>Hausarztpraxis</span><input defaultValue="Praxis am Stadtpark, Zürich" readOnly={!masterDataEditing}/></label>
                    <label><span>Stammapotheke</span><input defaultValue="Apotheke Sonnengarten" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>

                <section className="record-card master-data-card">
                  <div className="record-card-heading contact-card-heading"><div><span className="record-section-label">Notfall</span><h3>Kontaktpersonen</h3></div><button type="button" onClick={() => openContactEditor()}><Plus aria-hidden="true"/> Kontakt hinzufügen</button></div>
                  <div className="resident-contacts-list">
                    {contactsLoading ? <p className="resident-contacts-loading">Kontaktpersonen werden geladen…</p> : contacts.map((contact) => <article key={contact.id} className="resident-contact-card">
                      <div className="resident-contact-card-head"><span className="resident-contact-avatar">{contact.full_name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase()}</span><div><strong>{contact.full_name}</strong><small>{contact.relationship || "Beziehung nicht angegeben"}</small></div><div className="resident-contact-badges">{contact.is_primary && <span>Hauptkontakt</span>}{contact.is_emergency_contact && <span className="emergency">Notfall</span>}</div></div>
                      <div className="resident-contact-details"><a href={contact.phone ? `tel:${contact.phone}` : undefined}>{contact.phone || "Keine Telefonnummer"}</a><a href={contact.email ? `mailto:${contact.email}` : undefined}>{contact.email || "Keine E-Mail-Adresse"}</a></div>
                      <div className="resident-contact-actions"><button type="button" onClick={() => openContactEditor(contact)} aria-label={`${contact.full_name} bearbeiten`}><PencilSimple aria-hidden="true"/><span>Bearbeiten</span></button><button type="button" className="danger" onClick={() => void deleteContact(contact)} aria-label={`${contact.full_name} entfernen`}><Trash aria-hidden="true"/><span>Entfernen</span></button></div>
                    </article>)}
                    {!contactsLoading && !contacts.length && <div className="resident-contacts-empty"><User aria-hidden="true"/><strong>Noch keine Kontaktperson</strong><p>Hinterlege Angehörige, Vertrauenspersonen oder weitere Notfallkontakte.</p><button className="secondary-button" type="button" onClick={() => openContactEditor()}><Plus/> Erste Kontaktperson hinzufügen</button></div>}
                  </div>
                  {contactsError && <p className="resident-contacts-error" role="alert">{contactsError}</p>}
                </section>

                <section className="record-card master-data-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Administration</span><h3>Versicherung</h3></div></div>
                  <div className="master-data-form-grid single-column">
                    <label><span>Krankenversicherung</span><input defaultValue="CSS Versicherung" readOnly={!masterDataEditing}/></label>
                    <label><span>Versichertennummer</span><input defaultValue="80756012345678901234" readOnly={!masterDataEditing}/></label>
                  </div>
                </section>
              </aside>
            </div>
          </main>
        ) : activeView === "care-record" ? (
          <main className="resident-record-content record-care-view" ref={contentRef} key="care-record">
            <div className="care-record-page-heading">
              <div><span className="record-section-label">Pflegeakte</span><h3>Pflegeprofil</h3><p>Pflegerelevante Ressourcen, Risiken, Ziele und Maßnahmen für {resident.name}.</p></div>
              <div className="care-record-heading-actions"><button className="secondary-button" type="button" onClick={() => onAction("Neue Einschätzung vorbereitet")}>Neue Einschätzung</button><button className="primary-button" type="button" onClick={() => onAction("Pflegeplanung geöffnet")}><ClipboardText aria-hidden="true"/> Pflegeplanung öffnen</button></div>
            </div>

            <section className="care-record-status" aria-label="Status der Pflegeakte">
              <div><span><Check aria-hidden="true"/></span><p><small>Pflegeplanung</small><strong>Aktuell und bestätigt</strong></p></div>
              <div><span><Warning aria-hidden="true"/></span><p><small>Offene Risiken</small><strong>2 in Beobachtung</strong></p></div>
              <div><span><ClipboardText aria-hidden="true"/></span><p><small>Aktive Maßnahmen</small><strong>14 geplant</strong></p></div>
              <div><span><CalendarDots aria-hidden="true"/></span><p><small>Nächste Evaluation</small><strong>16. September 2026</strong></p></div>
            </section>

            <div className="care-record-layout">
              <div className="care-record-primary">
                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Pflegeprofil</span><h3>Pflegebereiche</h3></div><span>6 Bereiche</span></div>
                  <div className="care-domain-list">
                    {careDomains.map((domain) => <button className={activeCareDomain.id === domain.id ? "active" : ""} type="button" key={domain.id} aria-pressed={activeCareDomain.id === domain.id} onClick={() => setActiveCareDomainId(domain.id)}><span className="care-domain-icon">{domain.id === "mobility" || domain.id === "sleep" ? <Pulse aria-hidden="true"/> : domain.id === "nutrition" ? <Heartbeat aria-hidden="true"/> : domain.id === "cognition" ? <User aria-hidden="true"/> : <ClipboardText aria-hidden="true"/>}</span><span><strong>{domain.label}</strong><small>{domain.summary}</small></span><span className={`status-badge ${domain.status}`}>{domain.statusLabel}</span></button>)}
                  </div>
                </section>

                <section className="record-card care-domain-detail" aria-live="polite">
                  <div className="record-card-heading"><div><span className="record-section-label">Ausgewählter Pflegebereich</span><h3>{activeCareDomain.label}</h3></div><button type="button" onClick={() => onAction(`${activeCareDomain.label} wird bearbeitet`)}>Bearbeiten</button></div>
                  <div className="care-domain-summary"><span className={`status-badge ${activeCareDomain.status}`}>{activeCareDomain.statusLabel}</span><p>{activeCareDomain.summary}</p></div>
                  <div className="care-goal-grid">
                    <section><span className="care-detail-icon"><Check aria-hidden="true"/></span><div><small>Pflegeziel</small><strong>{activeCareDomain.goal}</strong><p>Evaluation am 16. September 2026</p></div></section>
                    <section><span className="care-detail-icon"><ListChecks aria-hidden="true"/></span><div><small>Geplante Maßnahmen</small><ul>{activeCareDomain.measures.map((measure) => <li key={measure}>{measure}</li>)}</ul></div></section>
                  </div>
                </section>
              </div>

              <aside className="care-record-secondary">
                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Prioritäten</span><h3>Aktuell beachten</h3></div></div>
                  <div className="care-priority-list"><div className="critical"><Warning aria-hidden="true"/><span><strong>Sturzrisiko erhöht</strong><small>Nach Sturzereignis neurologische Kontrollen bis 14:00 Uhr.</small></span></div><div className="attention"><Pulse aria-hidden="true"/><span><strong>Schlaf beobachten</strong><small>Nächtliche Wachphasen und Bewegungsdrang dokumentieren.</small></span></div></div>
                </section>

                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Assessments</span><h3>Aktuelle Einschätzungen</h3></div><button type="button" onClick={() => onAction("Alle Assessments geöffnet")}>Alle anzeigen</button></div>
                  <div className="care-assessment-list"><div><span>Sturzrisiko</span><strong className="critical">Hoch</strong><small>Heute</small></div><div><span>Dekubitusrisiko</span><strong className="stable">Niedrig</strong><small>Gestern</small></div><div><span>Schmerz</span><strong className="attention">NRS 3</strong><small>07:45 Uhr</small></div><div><span>Mangelernährung</span><strong className="stable">Kein Risiko</strong><small>02.09.2026</small></div></div>
                </section>

                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Pflegenetzwerk</span><h3>Beteiligte Fachpersonen</h3></div></div>
                  <div className="care-team-list"><div><span className="avatar">AM</span><p><strong>Anna Meier</strong><small>Bezugspflege · Pflegefachfrau HF</small></p></div><div><span className="avatar">MW</span><p><strong>Dr. Martin Weber</strong><small>Hausarzt</small></p></div><div><span className="avatar">LF</span><p><strong>Lea Frei</strong><small>Fachfrau Gesundheit</small></p></div></div>
                </section>
              </aside>
            </div>
          </main>
        ) : activeView === "biography" ? (
          <main className="resident-record-content biography-view" ref={contentRef} key="biography">
            <div className="record-subpage-heading biography-heading">
              <div><span className="record-section-label">Bewohnerakte</span><h3>Biografie</h3><p>Was {resident.name} geprägt hat, stärkt und im Alltag wichtig ist – für eine persönliche, respektvolle Pflege.</p></div>
              <div className="biography-heading-actions">
                {biographyEditing && <button className="secondary-button" type="button" onClick={() => { setBiographyEditing(false); setBiographyError(""); }}>Abbrechen</button>}
                <button className="primary-button" type="button" disabled={biographyLoading || biographySaving} onClick={() => biographyEditing ? void saveBiography() : setBiographyEditing(true)}>{biographyEditing ? <><Check aria-hidden="true"/> {biographySaving ? "Speichern…" : "Biografie speichern"}</> : <><NotePencil aria-hidden="true"/> Biografie bearbeiten</>}</button>
              </div>
            </div>

            <section className="biography-intro" aria-label="Hinweis zur Biografie">
              <span><User aria-hidden="true"/></span><div><strong>Personzentriert begleiten</strong><p>Biografische Angaben werden nur für die Betreuung und Pflege verwendet. Ergänze nur Informationen, die für den Alltag des Bewohners hilfreich sind.</p></div>
              <small>{biography.updatedAt ? `Zuletzt gepflegt ${new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(biography.updatedAt))}${biography.updatedBy ? ` · ${biography.updatedBy}` : ""}` : "Noch nicht dokumentiert"}</small>
            </section>

            {biographyError && <div className="biography-error" role="alert">{biographyError}</div>}
            {biographyLoading ? <div className="biography-loading">Biografie wird geladen…</div> : <div className={`biography-layout ${biographyEditing ? "is-editing" : ""}`}>
              <section className="record-card biography-story-card">
                <div className="record-card-heading"><div><span className="record-section-label">Lebensweg</span><h3>Meine Geschichte</h3></div><span>{biography.lifeStory ? "Hinterlegt" : "Noch offen"}</span></div>
                {biographyEditing ? <label className="biography-field"><span>Lebensgeschichte</span><textarea value={biography.lifeStory} onChange={(event) => setBiography((current) => ({ ...current, lifeStory: event.target.value }))} placeholder="Wichtige Lebensstationen, Herkunft, Beruf, Familie und prägende Erlebnisse …" rows={10}/></label> : <div className="biography-reading"><p>{biography.lifeStory || "Noch keine Lebensgeschichte hinterlegt. Ergänze sie gemeinsam mit dem Bewohner oder seinen Angehörigen."}</p></div>}
              </section>

              <aside className="biography-side">
                <section className="record-card biography-facts-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Persönliches Umfeld</span><h3>Wichtige Menschen</h3></div></div>
                  {biographyEditing ? <label className="biography-field"><span>Familie, Freunde und Bezugspersonen</span><textarea value={biography.importantPeople} onChange={(event) => setBiography((current) => ({ ...current, importantPeople: event.target.value }))} placeholder="z. B. Angehörige, enge Freundschaften, wichtige Beziehungen …" rows={6}/></label> : <div className="biography-reading compact"><p>{biography.importantPeople || "Noch keine Bezugspersonen beschrieben."}</p></div>}
                </section>
                <section className="record-card biography-facts-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Ressourcen</span><h3>Stärken &amp; Interessen</h3></div></div>
                  {biographyEditing ? <label className="biography-field"><span>Interessen, Fähigkeiten und Ressourcen</span><textarea value={biography.strengths} onChange={(event) => setBiography((current) => ({ ...current, strengths: event.target.value }))} placeholder="z. B. Musik, Garten, Handwerk, Gespräche oder liebgewonnene Fähigkeiten …" rows={6}/></label> : <div className="biography-reading compact"><p>{biography.strengths || "Noch keine Ressourcen beschrieben."}</p></div>}
                </section>
              </aside>

              <section className="record-card biography-daily-card">
                <div className="record-card-heading"><div><span className="record-section-label">Alltag</span><h3>Gewohnheiten und Vorlieben</h3></div></div>
                <div className="biography-daily-grid">
                  <div>{biographyEditing ? <label className="biography-field"><span>Gewohnheiten &amp; Rituale</span><textarea value={biography.dailyRoutines} onChange={(event) => setBiography((current) => ({ ...current, dailyRoutines: event.target.value }))} placeholder="Tagesstruktur, Morgen- oder Abendrituale, Gewohnheiten …" rows={6}/></label> : <><span>Gewohnheiten &amp; Rituale</span><p>{biography.dailyRoutines || "Noch keine Gewohnheiten dokumentiert."}</p></>}</div>
                  <div>{biographyEditing ? <label className="biography-field"><span>Vorlieben &amp; Abneigungen</span><textarea value={biography.preferences} onChange={(event) => setBiography((current) => ({ ...current, preferences: event.target.value }))} placeholder="Essen, Musik, Ansprache, Beschäftigungen und persönliche Vorlieben …" rows={6}/></label> : <><span>Vorlieben &amp; Abneigungen</span><p>{biography.preferences || "Noch keine Vorlieben dokumentiert."}</p></>}</div>
                  <div className="biography-sensitive">{biographyEditing ? <label className="biography-field"><span>Sensible Themen</span><textarea value={biography.sensitiveTopics} onChange={(event) => setBiography((current) => ({ ...current, sensitiveTopics: event.target.value }))} placeholder="Themen, Situationen oder Auslöser, die besonders achtsam behandelt werden sollen …" rows={6}/></label> : <><span>Sensible Themen</span><p>{biography.sensitiveTopics || "Keine sensiblen Themen hinterlegt."}</p></>}</div>
                </div>
              </section>
            </div>}
          </main>
        ) : activeView === "supplies" ? (
          <main className="resident-record-content supplies-view" ref={contentRef} key="supplies">
            <div className="record-subpage-heading"><div><span className="record-section-label">Bewohnerakte</span><h3>Pflegebedarf</h3><p>Persönliche Hilfs- und Verbrauchsmaterialien für {resident.name} sicher verwalten.</p></div><button className="primary-button" type="button" onClick={() => openSupplyEditor()}><Plus/> Bedarf hinzufügen</button></div>
            <section className="supplies-summary"><div><span><ClipboardText/></span><p><small>Aktiv</small><strong>{supplies.filter((item) => item.status === "active").length} Positionen</strong></p></div><div><span><Warning/></span><p><small>Nachbestellen</small><strong>{supplies.filter((item) => item.status === "active" && item.current_quantity < item.target_quantity).length} Positionen</strong></p></div><div><span><Check/></span><p><small>Gesperrt</small><strong>{supplies.filter((item) => item.status === "blocked").length} Positionen</strong></p></div></section>
            {suppliesError && <p className="supplies-error" role="alert">{suppliesError}</p>}
            <section className="record-card supplies-card"><div className="record-card-heading"><div><span className="record-section-label">Individueller Bedarf</span><h3>Materialien und Hilfsmittel</h3></div><span>{supplies.length} Einträge</span></div><div className="supplies-table-head"><span>Artikel</span><span>Bestand</span><span>Status</span><span>Aktionen</span></div><div className="supplies-list">{suppliesLoading ? <p>Pflegebedarf wird geladen…</p> : supplies.map((supply) => <article key={supply.id} className={`supply-row ${supply.status}`}><span className="supply-icon"><ClipboardText/></span><div><strong>{supply.item_name}</strong><small>{supply.category} · {supply.notes || "Kein zusätzlicher Hinweis"}</small></div><span className="supply-quantity"><strong>{supply.current_quantity} <small>/ {supply.target_quantity} {supply.unit}</small></strong><i style={{ width: `${Math.min(100, supply.target_quantity ? supply.current_quantity / supply.target_quantity * 100 : 100)}%` }}/></span><span className={`supply-status ${supply.status}`}>{supply.status === "active" ? "Aktiv" : supply.status === "blocked" ? "Gesperrt" : "Archiviert"}</span><span className="supply-actions"><button type="button" onClick={() => openSupplyEditor(supply)} aria-label={`${supply.item_name} bearbeiten`}><PencilSimple/></button><button type="button" className="danger" onClick={() => void deleteSupply(supply)} aria-label={`${supply.item_name} entfernen`}><Trash/></button></span></article>)}{!suppliesLoading && !supplies.length && <div className="supplies-empty"><ClipboardText/><strong>Noch kein Pflegebedarf hinterlegt</strong><p>Lege persönliche Artikel wie Einlagen, Windeln, Zahnpasta oder Hilfsmittel an.</p><button className="secondary-button" onClick={() => openSupplyEditor()}><Plus/> Pflegebedarf hinzufügen</button></div>}</div></section>
          </main>
        ) : activeView === "history" ? (
          <main className="resident-record-content record-history-view" ref={contentRef} key="history">
            <div className="record-subpage-heading">
              <div><span className="record-section-label">Bewohnerakte</span><h3>Verlauf</h3><p>Chronologische Übersicht aller pflege- und behandlungsrelevanten Ereignisse von {resident.name}.</p></div>
              <button className="primary-button" type="button" onClick={() => openDocumentation()}><NotePencil aria-hidden="true"/> Neuer Eintrag</button>
            </div>

            <section className="record-view-stats" aria-label="Verlaufsübersicht">
              <div><span><ClipboardText aria-hidden="true"/></span><p><small>Diese Woche</small><strong>28 Ereignisse</strong></p></div>
              <div><span><Heartbeat aria-hidden="true"/></span><p><small>Heute dokumentiert</small><strong>4 Einträge</strong></p></div>
              <div><span className="attention"><Warning aria-hidden="true"/></span><p><small>In Beobachtung</small><strong>2 Entwicklungen</strong></p></div>
              <div><span><ArrowsLeftRight aria-hidden="true"/></span><p><small>Letzte Übergabe</small><strong>Heute, 06:55</strong></p></div>
            </section>

            <div className="history-layout">
              <section className="record-card history-card" aria-labelledby="history-timeline-title">
                <div className="record-card-heading"><div><span className="record-section-label">Chronologie</span><h3 id="history-timeline-title">Aktivitäten und Ereignisse</h3></div><span>{visibleHistoryEntries.length} Einträge</span></div>
                <div className="history-filters" aria-label="Verlauf filtern">
                  {(["Alle", "Pflege", "Vitalwerte", "Medikation", "Termine"] as HistoryFilter[]).map((filter) => <button className={historyFilter === filter ? "active" : ""} type="button" key={filter} aria-pressed={historyFilter === filter} onClick={() => setHistoryFilter(filter)}>{filter}</button>)}
                </div>
                <div className="resident-history-timeline">
                  {[...new Set(visibleHistoryEntries.map((entry) => entry.date))].map((date) => (
                    <section className="resident-history-day" key={date} aria-label={date}>
                      <h4>{date}</h4>
                      {visibleHistoryEntries.filter((entry) => entry.date === date).map((entry) => (
                        <article className="resident-history-entry" key={entry.id}>
                          <time>{entry.time}</time>
                          <span className={`resident-history-marker ${entry.tone}`}>{entry.category === "Medikation" ? <Pill aria-hidden="true"/> : entry.category === "Vitalwerte" ? <Heartbeat aria-hidden="true"/> : entry.category === "Termine" ? <CalendarDots aria-hidden="true"/> : <Pulse aria-hidden="true"/>}</span>
                          <div><span className="history-entry-category">{entry.category}</span><h5>{entry.title}</h5><p>{entry.description}</p><small>{entry.author}</small></div>
                          <button type="button" onClick={() => { const documentationEntry = entries.find((item) => item.id === entry.documentationId); if (documentationEntry) openDocumentation(documentationEntry); else onAction(`${entry.title} geöffnet`); }}>Öffnen</button>
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              </section>

              <aside className="history-sidebar">
                <section className="record-card">
                  <div className="record-card-heading"><div><span className="record-section-label">Im Fokus</span><h3>Aktuelle Entwicklungen</h3></div></div>
                  <div className="history-focus-list"><article className="critical"><Warning aria-hidden="true"/><div><strong>Wundheilung beobachten</strong><p>Verbandwechsel am linken Unterarm morgen um 08:00 Uhr.</p><button type="button" onClick={() => onAction("Wundmanagement geöffnet")}>Wundmanagement öffnen</button></div></article><article className="attention"><Pulse aria-hidden="true"/><div><strong>Rötung kontrollieren</strong><p>Erneute Hautkontrolle während der Abendpflege vorgesehen.</p><button type="button" onClick={() => setActiveView("overview")}>Körperübersicht öffnen</button></div></article></div>
                </section>
                <section className="record-card history-next-event">
                  <div className="record-card-heading"><div><span className="record-section-label">Nächster Termin</span><h3>Arztvisite</h3></div></div>
                  <div><CalendarDots aria-hidden="true"/><p><strong>Heute, 09:30 Uhr</strong><small>Visitenzimmer · Dr. Martin Weber</small></p></div>
                </section>
              </aside>
            </div>
          </main>
        ) : activeView === "documents" ? (
          <main className="resident-record-content record-documents-view" ref={contentRef} key="documents">
            <div className="record-subpage-heading">
              <div><span className="record-section-label">Bewohnerakte</span><h3>Dokumente</h3><p>Zentrale Ablage für Berichte, Pläne, Formulare und administrative Unterlagen von {resident.name}.</p></div>
              <button className="primary-button" type="button" onClick={() => onAction("Dokumentenupload vorbereitet")}><FileText aria-hidden="true"/> Dokument hochladen</button>
            </div>

            <section className="record-view-stats" aria-label="Dokumentenübersicht">
              <div><span><FileText aria-hidden="true"/></span><p><small>Dokumente gesamt</small><strong>12 Dateien</strong></p></div>
              <div><span><Check aria-hidden="true"/></span><p><small>Aktuell und geprüft</small><strong>10 Dateien</strong></p></div>
              <div><span><CalendarDots aria-hidden="true"/></span><p><small>Neu diese Woche</small><strong>2 Dateien</strong></p></div>
              <div><span className="attention"><Warning aria-hidden="true"/></span><p><small>Offene Freigaben</small><strong>1 Unterschrift</strong></p></div>
            </section>

            <section className="record-card document-library" aria-labelledby="document-library-title">
              <div className="record-card-heading"><div><span className="record-section-label">Ablage</span><h3 id="document-library-title">Dokumentenbibliothek</h3></div><span>{visibleDocuments.length} angezeigt</span></div>
              <div className="document-toolbar">
                <label className="document-search"><MagnifyingGlass aria-hidden="true"/><input type="search" value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Dokumente durchsuchen …" aria-label="Dokumente durchsuchen"/></label>
                <div className="document-category-filter" aria-label="Dokumentkategorie filtern">
                  {["Alle", "Arztberichte", "Pflege", "Medikation", "Administration"].map((category) => <button className={documentCategory === category ? "active" : ""} type="button" key={category} aria-pressed={documentCategory === category} onClick={() => setDocumentCategory(category)}>{category}</button>)}
                </div>
              </div>
              <div className="document-table-head" aria-hidden="true"><span>Dokument</span><span>Geändert</span><span>Status</span><span>Aktionen</span></div>
              <div className="resident-document-list">
                {visibleDocuments.map((document) => (
                  <article className="resident-document-row" key={document.id}>
                    <span className="resident-document-icon"><FileText aria-hidden="true"/></span>
                    <div className="resident-document-name"><strong>{document.title}</strong><small>{document.category} · {document.fileType} · {document.size}</small></div>
                    <div className="resident-document-meta"><strong>{document.updated}</strong><small>{document.owner}</small></div>
                    <span className={`document-status ${document.status === "Neu" ? "new" : document.status === "Unterschrift offen" ? "attention" : "stable"}`}>{document.status}</span>
                    <div className="resident-document-actions"><button type="button" onClick={() => onAction(`${document.title} geöffnet`)}>Ansehen</button><button type="button" onClick={() => onAction(`${document.title} heruntergeladen`)}>Download</button></div>
                  </article>
                ))}
                {visibleDocuments.length === 0 && <div className="document-empty"><MagnifyingGlass aria-hidden="true"/><strong>Keine Dokumente gefunden</strong><p>Suche oder Kategorie anpassen.</p></div>}
              </div>
            </section>
          </main>
        ) : (
          <main className="resident-record-content record-documentation-view" ref={contentRef} key="documentation">
            <div className="documentation-page-heading">
              <div><span className="record-section-label">Dokumentation</span><h3>{selectedEntry ? selectedEntry.title : "Neuer Pflegeeintrag"}</h3><p>Die Erfassung bleibt vollständig innerhalb der geöffneten Bewohnerakte.</p></div>
              <button type="button" onClick={() => setActiveView("overview")}><span aria-hidden="true">←</span> Zur Übersicht</button>
            </div>

            <div className="documentation-layout">
              <form className="record-card documentation-editor" onSubmit={saveDocumentation}>
                <div className="documentation-form-grid">
                  <label><span>Datum</span><CareDatePicker label="Datum" value={documentationDate} onChange={setDocumentationDate}/></label>
                  <label><span>Uhrzeit</span><input type="time" defaultValue={selectedEntry?.time ?? "08:15"}/></label>
                  <label><span>Kategorie</span><CareSelect label="Kategorie" value={documentationCategory} options={["Pflegebeobachtung", "Vitalwerte", "Medikation", "Mobilität", "Ernährung", "Übergabe"]} onChange={setDocumentationCategory}/></label>
                  <label><span>Dokumentiert von</span><input type="text" value="Anna Meier · Pflegefachfrau HF" readOnly/></label>
                </div>

                <label className="documentation-text-field"><span>Pflegeeintrag</span><textarea value={documentationText} onChange={(event) => setDocumentationText(event.target.value)} placeholder="Beobachtung, Massnahme und Wirkung dokumentieren …"/></label>

                <fieldset className="documentation-flags"><legend>Kennzeichnung &amp; Weitergabe</legend><p>Markierungen machen den Eintrag in Übergabe, Visite und Schichtübersicht sichtbar.</p><div>
                  <button className={documentationFlags.includes("important") ? "active important" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("important")} onClick={() => toggleDocumentationFlag("important")}><Warning aria-hidden="true"/><span><strong>Wichtig</strong><small>Mit erhöhter Priorität anzeigen</small></span><i aria-hidden="true"><Check/></i></button>
                  <button className={documentationFlags.includes("visit") ? "active visit" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("visit")} onClick={() => toggleDocumentationFlag("visit")}><Stethoscope aria-hidden="true"/><span><strong>Wichtig für Visite</strong><small>Für die nächste Visite vormerken</small></span><i aria-hidden="true"><Check/></i></button>
                  <button className={documentationFlags.includes("observation") ? "active observation" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("observation")} onClick={() => toggleDocumentationFlag("observation")}><Pulse aria-hidden="true"/><span><strong>Beobachtungsphase</strong><small>Verlauf engmaschig weiterführen</small></span><i aria-hidden="true"><Check/></i></button>
                  <button className={documentationFlags.includes("handover") ? "active handover" : ""} type="button" role="checkbox" aria-checked={documentationFlags.includes("handover")} onClick={() => toggleDocumentationFlag("handover")}><ArrowsLeftRight aria-hidden="true"/><span><strong>Übergaberelevant</strong><small>In die nächste Übergabe aufnehmen</small></span><i aria-hidden="true"><Check/></i></button>
                </div></fieldset>

                <fieldset className="documentation-tags"><legend>Bezug zur Pflegeplanung</legend><div><button className="active" type="button">Mobilität</button><button type="button">Schmerz</button><button type="button">Medikation</button><button type="button">Ernährung</button><button type="button">Psychosozial</button></div></fieldset>

                <div className="documentation-quality-note"><Check aria-hidden="true"/><span><strong>Dokumentationsqualität</strong><small>Eintrag ist eindeutig dem Bewohner, Zeitpunkt und Fachbereich zugeordnet.</small></span></div>

                <footer className="documentation-form-actions"><button className="secondary-button" type="button" onClick={() => setActiveView("overview")}>Abbrechen</button><button className="primary-button" type="submit"><Check aria-hidden="true"/> {selectedEntry ? "Änderungen speichern" : "Dokumentation speichern"}</button></footer>
              </form>

              <aside className="documentation-sidebar">
                <section className="record-card documentation-context">
                  <div className="record-card-heading"><div><span className="record-section-label">Kontext</span><h3>{resident.name}</h3></div></div>
                  <dl className="record-details"><div><dt>Zimmer</dt><dd>{resident.room}</dd></div><div><dt>Wohnbereich</dt><dd>{resident.unit}</dd></div><div><dt>Pflegebedarf</dt><dd>{resident.careLevel}</dd></div><div><dt>Status</dt><dd>{resident.statusLabel}</dd></div></dl>
                </section>

                <section className="record-card documentation-recent">
                  <div className="record-card-heading"><div><span className="record-section-label">Heute</span><h3>Dokumentationspunkte</h3></div></div>
                  <div>{entries.map((entry) => <button className={selectedEntryId === entry.id ? "active" : ""} type="button" key={entry.id} onClick={() => openDocumentation(entry)}><time>{entry.time}</time><span><strong>{entry.title}</strong><small>{entry.category}</small></span></button>)}</div>
                </section>
              </aside>
            </div>
          </main>
        )}
      </article>
      {contactEditor && <div className="contact-editor-layer" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setContactEditor(null)}>
        <section className="contact-editor-panel" role="dialog" aria-modal="true" aria-labelledby="contact-editor-title">
          <header><div><span className="record-section-label">Notfall · Kontaktpersonen</span><h3 id="contact-editor-title">{contactEditor.id ? "Kontaktperson bearbeiten" : "Kontaktperson hinzufügen"}</h3><p>Kontaktdaten und Erreichbarkeit für {resident.name} sicher hinterlegen.</p></div><button type="button" onClick={() => setContactEditor(null)} aria-label="Kontaktpersoneneditor schließen"><X/></button></header>
          <form onSubmit={saveContact}>
            <div className="contact-editor-form-grid">
              <label className="wide"><span>Name</span><input value={contactEditor.draft.fullName} onChange={(event) => setContactEditor((current) => current ? { ...current, draft: { ...current.draft, fullName: event.target.value } } : current)} placeholder="Vor- und Nachname" autoFocus required/></label>
              <label><span>Beziehung</span><input value={contactEditor.draft.relationship} onChange={(event) => setContactEditor((current) => current ? { ...current, draft: { ...current.draft, relationship: event.target.value } } : current)} placeholder="z. B. Tochter, Nachbar"/></label>
              <label><span>Telefon</span><input type="tel" value={contactEditor.draft.phone} onChange={(event) => setContactEditor((current) => current ? { ...current, draft: { ...current.draft, phone: event.target.value } } : current)} placeholder="+41 79 555 12 34"/></label>
              <label className="wide"><span>E-Mail</span><input type="email" value={contactEditor.draft.email} onChange={(event) => setContactEditor((current) => current ? { ...current, draft: { ...current.draft, email: event.target.value } } : current)} placeholder="name@beispiel.ch"/></label>
            </div>
            <fieldset className="contact-editor-options"><legend>Kennzeichnung</legend><label className={contactEditor.draft.isPrimary ? "active" : ""}><input type="checkbox" checked={contactEditor.draft.isPrimary} onChange={(event) => setContactEditor((current) => current ? { ...current, draft: { ...current.draft, isPrimary: event.target.checked } } : current)}/><span><strong>Hauptkontakt</strong><small>Diese Person wird in der Bewohnerakte vorrangig angezeigt.</small></span><i><Check/></i></label><label className={contactEditor.draft.isEmergencyContact ? "active emergency" : ""}><input type="checkbox" checked={contactEditor.draft.isEmergencyContact} onChange={(event) => setContactEditor((current) => current ? { ...current, draft: { ...current.draft, isEmergencyContact: event.target.checked } } : current)}/><span><strong>Notfallkontakt</strong><small>Bei dringenden Ereignissen direkt berücksichtigen.</small></span><i><Check/></i></label></fieldset>
            <footer><button className="secondary-button" type="button" onClick={() => setContactEditor(null)}>Abbrechen</button><button className="primary-button" type="submit" disabled={contactSaving}><Check/> {contactSaving ? "Speichern…" : contactEditor.id ? "Änderungen speichern" : "Kontaktperson hinzufügen"}</button></footer>
          </form>
        </section>
      </div>}
      {supplyEditor && <div className="area-editor-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setSupplyEditor(null)}>
        <section className="area-editor-panel" role="dialog" aria-modal="true" aria-labelledby="supply-editor-title">
          <header className="area-editor-header">
            <div>
              <p className="eyebrow">CareCore Bewohner · Pflegebedarf</p>
              <h2 id="supply-editor-title">{supplyEditor.id ? "Bedarf bearbeiten" : "Pflegebedarf hinzufügen"}</h2>
              <p>Lege Material, Sollbestand und Status für {resident.name} fest.</p>
            </div>
            <button className="area-editor-close" type="button" onClick={() => setSupplyEditor(null)} aria-label="Pflegebedarf schließen">×</button>
          </header>

          <form className="area-editor-form" onSubmit={saveSupply}>
            <div className="area-editor-intro">
              <span className="area-editor-icon"><ClipboardText aria-hidden="true"/></span>
              <div>
                <strong>Individueller Pflegebedarf</strong>
                <p>Artikel und Bestände bleiben direkt in der Bewohnerakte nachvollziehbar.</p>
              </div>
              <span className="duty-assignment-status"><i/>{supplyEditor.draft.status === "blocked" ? "Gesperrt" : supplyEditor.draft.status === "archived" ? "Archiviert" : "Aktiv"}</span>
            </div>

            <div className="area-editor-grid">
              <label className="area-editor-wide"><span>Artikel</span><input value={supplyEditor.draft.itemName} onChange={(event) => setSupplyEditor((current) => current ? { ...current, draft: { ...current.draft, itemName: event.target.value } } : current)} placeholder="z. B. Einlagen, Zahnpasta oder Rollator" autoFocus required/></label>
              <label><span>Kategorie</span><CareSelect label="Bedarfskategorie" value={supplyEditor.draft.category} options={["Pflege & Hygiene", "Inkontinenz", "Mobilität", "Ernährung", "Mundpflege", "Sonstiges"]} onChange={(value) => setSupplyEditor((current) => current ? { ...current, draft: { ...current.draft, category: value } } : current)}/></label>
              <label><span>Einheit</span><CareSelect label="Einheit" value={supplyEditor.draft.unit} options={["Stück", "Packung", "Flasche", "Tube", "Paar"]} onChange={(value) => setSupplyEditor((current) => current ? { ...current, draft: { ...current.draft, unit: value } } : current)}/></label>
              <label><span>Aktueller Bestand</span><input type="number" min="0" value={supplyEditor.draft.currentQuantity} onChange={(event) => setSupplyEditor((current) => current ? { ...current, draft: { ...current.draft, currentQuantity: Number(event.target.value) || 0 } } : current)}/></label>
              <label><span>Sollbestand</span><input type="number" min="0" value={supplyEditor.draft.targetQuantity} onChange={(event) => setSupplyEditor((current) => current ? { ...current, draft: { ...current.draft, targetQuantity: Number(event.target.value) || 0 } } : current)}/></label>
              <label className="area-editor-wide"><span>Status</span><CareSelect label="Status" value={supplyEditor.draft.status === "active" ? "Aktiv" : supplyEditor.draft.status === "blocked" ? "Gesperrt" : "Archiviert"} options={["Aktiv", "Gesperrt", "Archiviert"]} onChange={(value) => setSupplyEditor((current) => current ? { ...current, draft: { ...current.draft, status: value === "Gesperrt" ? "blocked" : value === "Archiviert" ? "archived" : "active" } } : current)}/></label>
              <label className="area-editor-wide"><span>Hinweis</span><textarea value={supplyEditor.draft.notes} onChange={(event) => setSupplyEditor((current) => current ? { ...current, draft: { ...current.draft, notes: event.target.value } } : current)} placeholder="z. B. bevorzugte Marke, Größe oder Anwendungshinweis …" rows={4}/></label>
            </div>

            <div className="duty-assignment-summary">
              <span><strong>{supplyEditor.draft.itemName || "Neuer Pflegebedarf"}</strong><small>{supplyEditor.draft.category} · {supplyEditor.draft.unit}</small></span>
              <span><strong>{supplyEditor.draft.currentQuantity} von {supplyEditor.draft.targetQuantity} {supplyEditor.draft.unit}</strong><small>Aktueller Bestand</small></span>
            </div>

            <footer className="area-editor-actions"><button className="secondary-button" type="button" onClick={() => setSupplyEditor(null)}>Abbrechen</button><button className="primary-button" disabled={supplySaving}><Check/> {supplySaving ? "Speichern…" : "Pflegebedarf speichern"}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
