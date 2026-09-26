"use client";

import { MobileNavigation } from "@/app/components/mobile-navigation";
import AppHeader from "../components/app-header";
import AppSidebar from "../components/app-sidebar";
import { ResidentRecord } from "./components/resident-record";
import { Icon } from "./components/residents-utils";
import { ResidentIntakeEditor } from "./components/resident-intake-editor";
import { useResidentsPage } from "./components/use-residents-page";
import { ResidentSummary } from "./components/resident-summary";
import { ResidentDirectory } from "./components/resident-directory";
import { ResidentSearchDialog } from "./components/resident-search-dialog";

export default function ResidentsPage() {
  const r = useResidentsPage();
  const {
    setResidents,
    searchOpen,
    setSearchOpen,
    selectedResident,
    setSelectedResident,
    intakeEditorOpen,
    setIntakeEditorOpen,
    toast,
    setToast,
    loadResidents,
    openSearch,
  } = r;
  return (
    <div className="app-shell residents-page">
      <AppSidebar activeModule="residents" activeChild="Übersicht" onToast={setToast} />

      <div className="main-column">
        <AppHeader searchOpen={searchOpen} onSearch={openSearch} onToast={setToast} />

        <main className="workspace residents-workspace">
          <section className="page-heading residents-heading" aria-labelledby="residents-page-title">
            <div className="heading-copy">
              <p className="eyebrow">CareCore Bewohner</p>
              <h1 id="residents-page-title">Bewohner</h1>
              <p>Zentrale Bewohner- und Patientenakte für den gesamten Wohnbereich.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => setIntakeEditorOpen(true)}>
              <Icon name="plus" className="button-icon" />
              Bewohner aufnehmen
            </button>
          </section>

          <ResidentSummary r={r} />

          <ResidentDirectory r={r} />
        </main>
      </div>

      <MobileNavigation activeModule="residents" />

      {searchOpen && (
        <div
          className="overlay"
          role="presentation"
          onClick={(event) => event.currentTarget === event.target && setSearchOpen(false)}
        >
          <ResidentSearchDialog r={r} />
        </div>
      )}

      {selectedResident && (
        <ResidentRecord
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
          onAction={setToast}
          onPhotoChanged={() => {
            void loadResidents();
          }}
          onGenderChanged={(residentId, gender) => {
            setResidents((current) => current.map((item) => (item.id === residentId ? { ...item, gender } : item)));
            setSelectedResident((current) => (current?.id === residentId ? { ...current, gender } : current));
          }}
        />
      )}

      <ResidentIntakeEditor
        open={intakeEditorOpen}
        onClose={() => setIntakeEditorOpen(false)}
        onSuccess={(message) => {
          setToast(message);
          void loadResidents();
        }}
      />

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}
