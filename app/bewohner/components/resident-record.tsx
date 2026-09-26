"use client";

import { createPortal } from "react-dom";
import Image from "next/image";
import ResidentAppointmentEditor from "@/app/components/resident-appointment-editor";
import { Camera, CaretDown, CaretUp, X } from "@phosphor-icons/react";
import { ResidentRecordProps, recordTabs } from "./resident-record-data";
import { useResidentRecord } from "./use-resident-record";
import { RecordOverviewView } from "./record-overview-view";
import { RecordMasterDataView } from "./record-master-data-view";
import { RecordCareView } from "./record-care-view";
import { RecordBiographyView } from "./record-biography-view";
import { RecordAppointmentsView } from "./record-appointments-view";
import { RecordSuppliesView } from "./record-supplies-view";
import { RecordHistoryView } from "./record-history-view";
import { RecordDocumentsView } from "./record-documents-view";
import { RecordDocumentationView } from "./record-documentation-view";
import { BodyObservationDialog } from "./record-body-dialog";
import { ContactEditorDialog } from "./record-contact-dialog";
import { SupplyEditorDialog } from "./record-supply-dialog";

export function ResidentRecord(props: ResidentRecordProps) {
  const r = useResidentRecord(props);
  const {
    resident,
    onClose,
    onAction,
    closeButtonRef,
    residentPhotoInputRef,
    activeView,
    bodyEditor,
    contactEditor,
    supplyEditor,
    appointmentEditor,
    setAppointmentEditor,
    setAppointmentRevision,
    residentPhoto,
    residentPhotoSaving,
    appointmentEditorResidents,
    uploadResidentPhoto,
    selectTab,
    navigation,
  } = r;
  return (
    <div
      className="resident-record-layer"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <article
        className="resident-record-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-record-title"
      >
        <header className="resident-record-header">
          <div className="record-heading">
            <button
              className={`resident-avatar record-photo-trigger ${resident.status === "critical" ? "critical" : ""}`}
              type="button"
              aria-label={residentPhoto ? "Bewohnerbild ändern" : "Bewohnerbild hochladen"}
              title={residentPhoto ? "Bewohnerbild ändern" : "Bewohnerbild hochladen"}
              disabled={residentPhotoSaving}
              onClick={() => residentPhotoInputRef.current?.click()}
            >
              {residentPhoto ? (
                <Image src={residentPhoto} alt={`Profilbild von ${resident.name}`} width={76} height={76} unoptimized />
              ) : (
                <span>{resident.initials}</span>
              )}
              <span className="record-photo-camera" aria-hidden="true">
                <Camera />
              </span>
            </button>
            <input
              ref={residentPhotoInputRef}
              className="record-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={uploadResidentPhoto}
              tabIndex={-1}
              aria-hidden="true"
            />
            <div>
              <span className="record-kicker">Bewohnerakte</span>
              <h2 id="resident-record-title">{resident.name}</h2>
              <p>
                {resident.room} · {resident.unit} · {resident.careLevel}
              </p>
            </div>
          </div>
          <div className="record-header-actions">
            {navigation && (
              <span className="record-navigation" aria-label="Zwischen Bewohnerakten blättern">
                <button
                  type="button"
                  aria-label="Vorherige Bewohnerakte"
                  title="Vorherige Bewohnerakte (Alt + ↑)"
                  onClick={navigation.onPrevious}
                >
                  <CaretUp aria-hidden="true" />
                </button>
                <small>
                  {navigation.position} von {navigation.total}
                </small>
                <button
                  type="button"
                  aria-label="Nächste Bewohnerakte"
                  title="Nächste Bewohnerakte (Alt + ↓)"
                  onClick={navigation.onNext}
                >
                  <CaretDown aria-hidden="true" />
                </button>
              </span>
            )}
            <span className={`status-badge ${resident.status}`}>{resident.statusLabel}</span>
            <button
              className="record-close-button"
              ref={closeButtonRef}
              type="button"
              aria-label="Bewohnerakte schliessen"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        <nav className="resident-record-tabs" aria-label="Bereiche der Bewohnerakte">
          {recordTabs.map((tab) => {
            const active =
              (tab === "Übersicht" && activeView === "overview") ||
              (tab === "Stammdaten" && activeView === "master-data") ||
              (tab === "Termine" && activeView === "appointments") ||
              (tab === "Dokumentation" && activeView === "documentation") ||
              (tab === "Pflegeakte" && activeView === "care-record") ||
              (tab === "Pflegebedarf" && activeView === "supplies") ||
              (tab === "Verlauf" && activeView === "history") ||
              (tab === "Dokumente" && activeView === "documents") ||
              (tab === "Biografie" && activeView === "biography");
            return (
              <button
                className={active ? "active" : ""}
                type="button"
                key={tab}
                aria-current={active ? "page" : undefined}
                onClick={() => selectTab(tab)}
              >
                {tab}
              </button>
            );
          })}
        </nav>

        {activeView === "overview" ? (
          <RecordOverviewView r={r} />
        ) : activeView === "master-data" ? (
          <RecordMasterDataView r={r} />
        ) : activeView === "care-record" ? (
          <RecordCareView r={r} />
        ) : activeView === "biography" ? (
          <RecordBiographyView r={r} />
        ) : activeView === "appointments" ? (
          <RecordAppointmentsView r={r} />
        ) : activeView === "supplies" ? (
          <RecordSuppliesView r={r} />
        ) : activeView === "history" ? (
          <RecordHistoryView r={r} />
        ) : activeView === "documents" ? (
          <RecordDocumentsView r={r} />
        ) : (
          <RecordDocumentationView r={r} />
        )}
      </article>
      {bodyEditor && typeof document !== "undefined" && createPortal(<BodyObservationDialog r={r} />, document.body)}
      {contactEditor && <ContactEditorDialog r={r} />}
      {appointmentEditor && resident.id && (
        <ResidentAppointmentEditor
          key={appointmentEditor === "new" ? "new-appointment" : appointmentEditor.id}
          appointment={appointmentEditor === "new" ? null : appointmentEditor}
          residentId={resident.id}
          residents={appointmentEditorResidents}
          onClose={() => setAppointmentEditor(null)}
          onSaved={() => {
            setAppointmentEditor(null);
            setAppointmentRevision((current) => current + 1);
            onAction("Terminbestand aktualisiert");
          }}
        />
      )}
      {supplyEditor && <SupplyEditorDialog r={r} />}
    </div>
  );
}
