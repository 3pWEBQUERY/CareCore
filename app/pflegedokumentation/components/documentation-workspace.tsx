"use client";

import { useEffect, useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon } from "@/app/components/module-page-shell";
import { CareDatePicker, CareSelect, formatCareDate } from "@/app/components/care-form-controls";

export type DocumentationView = "quick" | "history";

type DocumentationRow = { id: string; title: string | null; body: string; category: string; importance: string; occurred_at: string; first_name: string; last_name: string; room: string; author: string };
type QuickEntry = { id: string; time: string; resident: string; room: string; title: string; text: string; category: string; tone: string };
type HistoryEntry = { id: string; date: string; title: string; author: string; detail: string; tag: string };

function DocumentationPopover({ open, onClose, onSave, mode, residentOptions }: { open: boolean; onClose: () => void; onSave: (message: string) => void; mode: "quick" | "history"; residentOptions: string[] }) {
  const [resident, setResident] = useState("");
  const [category, setCategory] = useState(mode === "quick" ? "Pflege" : "Verlauf / Beobachtung");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [important, setImportant] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const effectiveResident = resident || residentOptions[0] || "";
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/documentation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ residentName: effectiveResident.split(" · ")[0], category, content, occurredAt: `${date}T12:00:00`, importance: important ? "important" : "standard" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Dokumentation konnte nicht gespeichert werden.");
      onClose(); onSave("Dokumentation wurde gespeichert"); setContent("");
      window.dispatchEvent(new Event("carecore:documentation-changed"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen."); }
    finally { setSaving(false); }
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="area-editor-overlay documentation-editor-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><section className="area-editor-panel documentation-editor-panel" role="dialog" aria-modal="true" aria-labelledby="documentation-editor-title"><header className="area-editor-header"><div><p className="eyebrow">CareCore Chart · Dokumentation</p><h2 id="documentation-editor-title">{mode === "quick" ? "Schnelldokumentation" : "Verlaufsdokumentation"}</h2><p>{mode === "quick" ? "Halte eine kurze Beobachtung direkt im Arbeitsfluss fest." : "Dokumentiere einen nachvollziehbaren Verlaufseintrag für das interprofessionelle Team."}</p></div><button className="area-editor-close" type="button" onClick={onClose} aria-label="Dokumentation schliessen">×</button></header><form className="area-editor-form" onSubmit={save}><div className="area-editor-intro"><span className="area-editor-icon"><ModuleIcon name="note"/></span><div><strong>Neue Dokumentation</strong><p>Der Eintrag wird automatisch mit Bewohnerakte, Zeitstempel und deiner Rolle verknüpft.</p></div><span className="duty-assignment-status"><i/>Entwurf</span></div><div className="area-editor-grid"><label className="area-editor-wide">Bewohner<CareSelect label="Bewohner" value={effectiveResident} options={residentOptions} onChange={setResident}/></label><label>Dokumentationsart<CareSelect label="Dokumentationsart" value={category} options={mode === "quick" ? ["Pflege", "Beobachtung", "Medikation", "Ernährung", "Vitalwerte"] : ["Verlauf / Beobachtung", "Arztvisite", "Angehörigengespräch", "Teamübergabe"]} onChange={setCategory}/></label><label>Datum<CareDatePicker label="Datum" value={date} onChange={setDate}/></label><label className="area-editor-wide">Eintrag<textarea placeholder={mode === "quick" ? "Was wurde beobachtet oder durchgeführt?" : "Beschreibe Verlauf, Wirkung und nächste Schritte …"} value={content} onChange={(event) => setContent(event.target.value)} rows={6} required/></label><fieldset className="area-editor-wide documentation-flags"><legend>Einordnung</legend><div className="area-service-options"><label className={important ? "selected" : ""}><input type="checkbox" checked={important} onChange={() => setImportant((value) => !value)}/><span>Wichtig für die Übergabe</span></label><label><input type="checkbox" defaultChecked/><span>In Bewohnerakte anzeigen</span></label><label><input type="checkbox"/><span>Für Visite markieren</span></label></div></fieldset></div><div className="duty-assignment-summary"><span><strong>{effectiveResident.split(" · ")[0]}</strong><small>{category} · Anna Meier</small></span><span><strong>{formatCareDate(date)}</strong><small>{important ? "Übergabe markiert" : "Nicht priorisiert"}</small></span></div><footer className="area-editor-actions"><button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="submit" disabled={saving}><ModuleIcon name="check"/> {saving ? "Speichern…" : "Dokumentation speichern"}</button></footer>{error && <p role="alert">{error}</p>}</form></section></div>;
}

function QuickView({ onOpen, quickEntries }: { onOpen: () => void; quickEntries: QuickEntry[] }) {
  return <div className="documentation-quick-layout"><section className="card documentation-capture-card"><div className="documentation-capture-header"><div><p className="eyebrow">Arbeitsfluss</p><h2 className="card-title">Schnelldokumentation</h2><p className="card-subtitle">Kurze Einträge ohne Medienbruch erfassen.</p></div><button className="primary-button" type="button" onClick={onOpen}><ModuleIcon name="plus"/> Eintrag erfassen</button></div><div className="documentation-capture-steps"><div className="documentation-step active"><span>1</span><strong>Bewohner wählen</strong><small>Kontext ist vorausgefüllt</small></div><div className="documentation-step"><span>2</span><strong>Beobachtung festhalten</strong><small>Kurzer, klarer Eintrag</small></div><div className="documentation-step"><span>3</span><strong>Einordnen</strong><small>Übergabe und Visite</small></div></div><div className="documentation-today-header"><div><p className="eyebrow">Heute · Frühdienst</p><h3>Letzte Einträge</h3></div><span className="status-badge stable">{quickEntries.length} gespeichert</span></div><div className="documentation-quick-list">{quickEntries.map((entry) => <button type="button" key={entry.id} onClick={onOpen}><time>{entry.time}</time><span className={`documentation-entry-icon ${entry.tone}`}><ModuleIcon name={entry.category === "Ernährung" ? "nutrition" : entry.category === "Medikation" ? "med" : entry.category === "Beobachtung" ? "pulse" : "note"}/></span><span><strong>{entry.title}</strong><small>{entry.resident} · {entry.room}</small><em>{entry.text}</em></span><span className="documentation-entry-tag">{entry.category}</span><ModuleIcon name="chevron"/></button>)}</div></section><aside className="documentation-quick-aside"><section className="card documentation-template-card"><div className="card-header"><div><p className="eyebrow">Vorlagen</p><h2 className="card-title">Schnellbausteine</h2></div></div>{["Morgenpflege", "Mobilisation", "Trinkmenge", "Schmerzbeobachtung"].map((template) => <button type="button" key={template} onClick={onOpen}><span><ModuleIcon name="plus"/></span><strong>{template}</strong><small>Baustein verwenden</small></button>)}</section><section className="card documentation-completeness-card"><p className="eyebrow">Dokumentationsstatus</p><strong>78%</strong><span>für deinen Frühdienst abgeschlossen</span><div><i style={{ width: "78%" }}/></div><small>5 Einträge bis zur Übergabe offen</small></section></aside></div>;
}

function HistoryView({ onOpen, historyEntries }: { onOpen: () => void; historyEntries: HistoryEntry[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => historyEntries.filter((entry) => `${entry.title} ${entry.author} ${entry.detail}`.toLocaleLowerCase("de-CH").includes(query.trim().toLocaleLowerCase("de-CH"))), [query, historyEntries]);
  return <div className="documentation-history-layout"><section className="card documentation-history-card"><div className="documentation-history-header"><div><p className="eyebrow">Bewohnerakte · Verlauf</p><h2 className="card-title">Verlaufsdokumentation</h2><p className="card-subtitle">Chronologische Einträge mit Autor und nächstem Schritt.</p></div><button className="primary-button" type="button" onClick={onOpen}><ModuleIcon name="plus"/> Verlaufseintrag</button></div><label className="documentation-history-search"><ModuleIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Einträge oder Personen suchen …" aria-label="Verlauf durchsuchen"/></label><div className="documentation-timeline">{visible.map((entry) => <article key={entry.id}><time>{entry.date}</time><span className="documentation-timeline-dot"/><div><span className="documentation-history-tag">{entry.tag}</span><h3>{entry.title}</h3><p>{entry.detail}</p><small><ModuleIcon name="team"/> {entry.author}</small></div><button className="quiet-button" type="button" onClick={onOpen}>Öffnen <ModuleIcon name="chevron"/></button></article>)}{visible.length === 0 && <div className="resident-empty"><ModuleIcon name="search"/><strong>Keine Einträge gefunden</strong><p>Suchbegriff anpassen.</p></div>}</div></section><aside className="documentation-history-aside"><section className="card documentation-period-card"><div className="card-header"><div><p className="eyebrow">Zeitraum</p><h2 className="card-title">September 2026</h2></div><span className="status-badge info">{historyEntries.length} Einträge</span></div><div className="documentation-period-bars"><span><i style={{ height: "62%" }}/><small>08</small></span><span><i style={{ height: "88%" }}/><small>09</small></span><span><i style={{ height: "46%" }}/><small>10</small></span><span><i style={{ height: "72%" }}/><small>11</small></span><span><i style={{ height: "96%" }}/><small>12</small></span><span><i style={{ height: "68%" }}/><small>13</small></span><span className="active"><i style={{ height: "84%" }}/><small>14</small></span></div><p>Die meisten Einträge entstehen während der Morgenpflege und Übergabe.</p></section><section className="card documentation-rule-card"><ModuleIcon name="check"/><strong>Nachvollziehbar dokumentieren</strong><p>Einträge mit Zeit, Autor und Kontext sind für jede Übergabe revisionssicher verfügbar.</p></section></aside></div>;
}

const meta: Record<DocumentationView, { child: string; title: string; description: string; action: string }> = { quick: { child: "Schnelldokumentation", title: "Schnelldokumentation", description: "Beobachtungen, Interventionen und kurze Hinweise direkt im Pflegefluss festhalten.", action: "Eintrag erfassen" }, history: { child: "Verlaufsdokumentation", title: "Verlaufsdokumentation", description: "Chronologische Pflegeverläufe für Bewohner, Team und Visite nachvollziehbar machen.", action: "Verlaufseintrag" } };

export default function DocumentationWorkspace({ view }: { view: DocumentationView }) {
  const current = meta[view];
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [rows, setRows] = useState<DocumentationRow[]>([]);
  const [residentOptions, setResidentOptions] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [docsResponse, residentsResponse] = await Promise.all([fetch("/api/documentation", { cache: "no-store" }), fetch("/api/residents", { cache: "no-store" })]);
        if (!docsResponse.ok || !residentsResponse.ok) return;
        const docs = await docsResponse.json() as { entries: DocumentationRow[] };
        const residents = await residentsResponse.json() as { residents: Array<{ first_name: string; last_name: string; room: string }> };
        if (active) { setRows(docs.entries); setResidentOptions(residents.residents.map((item) => `${item.first_name} ${item.last_name} · ${item.room || "Zimmer offen"}`)); }
      } catch { /* Existing view remains usable if the network is temporarily unavailable. */ }
    };
    void load(); window.addEventListener("carecore:documentation-changed", load);
    return () => { active = false; window.removeEventListener("carecore:documentation-changed", load); };
  }, []);
  const quickEntries: QuickEntry[] = rows.slice(0, 8).map((item) => ({ id: item.id, time: new Date(item.occurred_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }), resident: `${item.first_name} ${item.last_name}`, room: item.room, title: item.title || item.category, text: item.body, category: item.category, tone: item.importance === "critical" ? "critical" : item.importance === "important" ? "attention" : "stable" }));
  const historyEntries: HistoryEntry[] = rows.map((item) => ({ id: item.id, date: new Date(item.occurred_at).toLocaleString("de-CH"), title: item.title || item.category, author: item.author, detail: `${item.first_name} ${item.last_name} · ${item.body}`, tag: item.category }));
  return <ModulePageShell activeModule="chart" activeChild={current.child} pageClass={`documentation-page documentation-${view}`} locationSecondary="Wohnbereich 2 · 1. OG">{(showToast) => <><main className="workspace module-workspace documentation-workspace"><section className="page-heading care-page-heading"><div className="heading-copy"><p className="eyebrow">CareCore Chart</p><h1>{current.title}</h1><p>{current.description}</p></div><button className="primary-button" type="button" onClick={() => setPopoverOpen(true)}><ModuleIcon name="plus" className="button-icon"/>{current.action}</button></section>{view === "quick" ? <QuickView onOpen={() => setPopoverOpen(true)} quickEntries={quickEntries}/> : <HistoryView onOpen={() => setPopoverOpen(true)} historyEntries={historyEntries}/>}</main><DocumentationPopover open={popoverOpen} mode={view} onClose={() => setPopoverOpen(false)} onSave={showToast} residentOptions={residentOptions}/></>}</ModulePageShell>;
}
