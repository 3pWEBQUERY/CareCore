"use client";

import { ModuleIcon } from "@/app/components/module-icon";
import AdminUserManagement from "./admin-user-management";
import { Props } from "./leadership-variant-parts";
import { OrganizationView } from "./organization-view";

export function AdminVariant({
  view,
  rows,
  selected,
  setSelectedId,
  showToast,
  employeeCreatorOpen,
  onCloseEmployeeCreator,
  organization,
  siteCreatorOpen,
  onCloseSiteCreator,
}: Props) {
  if (view === "users")
    return (
      <AdminUserManagement
        showToast={showToast}
        createOpen={Boolean(employeeCreatorOpen)}
        onCloseCreate={onCloseEmployeeCreator ?? (() => undefined)}
      />
    );
  if (view === "configuration")
    return (
      <div className="admin-config-layout">
        <section className="card admin-config-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Systemsteuerung</p>
              <h2 className="card-title">Konfiguration</h2>
              <p className="card-subtitle">Zentrale Einstellungen und Integrationen</p>
            </div>
            <span className="status-badge stable">System aktiv</span>
          </div>
          <div className="admin-setting-list">
            {rows.map((row) => (
              <button
                className={selected.id === row.id ? "selected" : ""}
                type="button"
                key={row.id}
                onClick={() => setSelectedId(row.id)}
              >
                <span className={`governance-icon ${row.tone}`}>
                  <ModuleIcon name={row.icon} />
                </span>
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </span>
                <span className={`status-badge ${row.tone}`}>{row.status}</span>
                <span className="admin-toggle on" />
              </button>
            ))}
          </div>
        </section>
        <aside className="card admin-system-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Systemstatus</p>
              <h2 className="card-title">Integrität</h2>
            </div>
          </div>
          <div className="admin-system-score">
            <strong>99,98 %</strong>
            <span>Verfügbarkeit</span>
          </div>
          <ul>
            <li>
              <ModuleIcon name="check" /> Datenbank synchronisiert
            </li>
            <li>
              <ModuleIcon name="check" /> Backup von heute 03:00 Uhr
            </li>
            <li>
              <ModuleIcon name="check" /> Keine Sicherheitswarnungen
            </li>
          </ul>
          <button className="secondary-button" type="button" onClick={() => showToast("Systemprotokoll geöffnet")}>
            Protokoll ansehen <ModuleIcon name="chevron" />
          </button>
        </aside>
      </div>
    );
  return (
    <OrganizationView
      organization={organization ?? { loading: true, reload: () => undefined }}
      showToast={showToast}
      siteCreatorOpen={Boolean(siteCreatorOpen)}
      onCloseSiteCreator={onCloseSiteCreator ?? (() => undefined)}
    />
  );
}
