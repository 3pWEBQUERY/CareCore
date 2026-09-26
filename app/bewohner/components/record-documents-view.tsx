"use client";

import { CalendarDots, Check, FileText, MagnifyingGlass, Warning } from "@phosphor-icons/react";
import type { ResidentRecordState } from "./use-resident-record";

export function RecordDocumentsView({ r }: { r: ResidentRecordState }) {
  const {
    resident,
    onAction,
    contentRef,
    documentSearch,
    setDocumentSearch,
    documentCategory,
    setDocumentCategory,
    visibleDocuments,
  } = r;
  return (
    <main className="resident-record-content record-documents-view" ref={contentRef} key="documents">
      <div className="record-subpage-heading">
        <div>
          <span className="record-section-label">Bewohnerakte</span>
          <h3>Dokumente</h3>
          <p>Zentrale Ablage für Berichte, Pläne, Formulare und administrative Unterlagen von {resident.name}.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => onAction("Dokumentenupload vorbereitet")}>
          <FileText aria-hidden="true" /> Dokument hochladen
        </button>
      </div>

      <section className="record-view-stats" aria-label="Dokumentenübersicht">
        <div>
          <span>
            <FileText aria-hidden="true" />
          </span>
          <p>
            <small>Dokumente gesamt</small>
            <strong>12 Dateien</strong>
          </p>
        </div>
        <div>
          <span>
            <Check aria-hidden="true" />
          </span>
          <p>
            <small>Aktuell und geprüft</small>
            <strong>10 Dateien</strong>
          </p>
        </div>
        <div>
          <span>
            <CalendarDots aria-hidden="true" />
          </span>
          <p>
            <small>Neu diese Woche</small>
            <strong>2 Dateien</strong>
          </p>
        </div>
        <div>
          <span className="attention">
            <Warning aria-hidden="true" />
          </span>
          <p>
            <small>Offene Freigaben</small>
            <strong>1 Unterschrift</strong>
          </p>
        </div>
      </section>

      <section className="record-card document-library" aria-labelledby="document-library-title">
        <div className="record-card-heading">
          <div>
            <span className="record-section-label">Ablage</span>
            <h3 id="document-library-title">Dokumentenbibliothek</h3>
          </div>
          <span>{visibleDocuments.length} angezeigt</span>
        </div>
        <div className="document-toolbar">
          <label className="document-search">
            <MagnifyingGlass aria-hidden="true" />
            <input
              type="search"
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder="Dokumente durchsuchen …"
              aria-label="Dokumente durchsuchen"
            />
          </label>
          <div className="document-category-filter" aria-label="Dokumentkategorie filtern">
            {["Alle", "Arztberichte", "Pflege", "Medikation", "Administration"].map((category) => (
              <button
                className={documentCategory === category ? "active" : ""}
                type="button"
                key={category}
                aria-pressed={documentCategory === category}
                onClick={() => setDocumentCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="document-table-head" aria-hidden="true">
          <span>Dokument</span>
          <span>Geändert</span>
          <span>Status</span>
          <span>Aktionen</span>
        </div>
        <div className="resident-document-list">
          {visibleDocuments.map((document) => (
            <article className="resident-document-row" key={document.id}>
              <span className="resident-document-icon">
                <FileText aria-hidden="true" />
              </span>
              <div className="resident-document-name">
                <strong>{document.title}</strong>
                <small>
                  {document.category} · {document.fileType} · {document.size}
                </small>
              </div>
              <div className="resident-document-meta">
                <strong>{document.updated}</strong>
                <small>{document.owner}</small>
              </div>
              <span
                className={`document-status ${document.status === "Neu" ? "new" : document.status === "Unterschrift offen" ? "attention" : "stable"}`}
              >
                {document.status}
              </span>
              <div className="resident-document-actions">
                <button type="button" onClick={() => onAction(`${document.title} geöffnet`)}>
                  Ansehen
                </button>
                <button type="button" onClick={() => onAction(`${document.title} heruntergeladen`)}>
                  Download
                </button>
              </div>
            </article>
          ))}
          {visibleDocuments.length === 0 && (
            <div className="document-empty">
              <MagnifyingGlass aria-hidden="true" />
              <strong>Keine Dokumente gefunden</strong>
              <p>Suche oder Kategorie anpassen.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
