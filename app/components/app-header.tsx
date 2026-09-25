"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ModuleIcon, type ModuleIconName } from "./module-page-shell";
import type { CareUnit, ContextResident, WorkContext } from "@/lib/work-context";

type HeaderNotification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  priority: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};
function notificationStyle(item: HeaderNotification): { icon: ModuleIconName; tone: string } {
  if (["critical", "high"].includes(item.priority)) return { icon: "alert", tone: "critical" };
  if (item.type === "task") return { icon: "tasks", tone: "attention" };
  if (item.type === "medication") return { icon: "med", tone: "attention" };
  return { icon: "bell", tone: "info" };
}

function ProfilePopover({
  context,
  onClose,
  onSave,
}: {
  context: WorkContext | null;
  onClose: () => void;
  onSave: (data: WorkContext) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [jobTitle, setJobTitle] = useState(context?.profile.jobTitle ?? "");
  const [phone, setPhone] = useState(context?.profile.phone ?? "");
  const [primaryCareUnitId, setPrimaryCareUnitId] = useState(context?.profile.primaryCareUnitId ?? "");
  const [saving, setSaving] = useState(false);
  const profile = context?.profile;
  if (!context || !profile) return null;
  async function saveProfile() {
    if (!primaryCareUnitId) return;
    setSaving(true);
    try {
      const response = await fetch("/api/work-context", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobTitle, phone, primaryCareUnitId }),
      });
      if (!response.ok) throw new Error();
      onSave((await response.json()) as WorkContext);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }
  const valueField = (label: string, value: string, setValue: (value: string) => void) =>
    editing ? (
      <label className="profile-edit-field">
        <span>{label}</span>
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
    ) : (
      <div className="profile-read-field">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    );
  return (
    <div
      className="profile-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-popover-title">
        <header className="profile-panel-header">
          <div>
            <p className="eyebrow">CareCore · Persönlicher Bereich</p>
            <h2 id="profile-popover-title">Mein Profil</h2>
            <p>Verwalte deine persönlichen Angaben und deinen festen Arbeitsbereich.</p>
          </div>
          <button className="profile-panel-close" type="button" onClick={onClose} aria-label="Profil schliessen">
            <ModuleIcon name="close" />
          </button>
        </header>
        <div className="profile-panel-body">
          <div className="profile-panel-layout">
            <aside className="profile-summary-card">
              <span className="profile-large-avatar">{initials(profile.displayName)}</span>
              <p className="eyebrow">Fester Arbeitsplatz</p>
              <h3>{profile.displayName}</h3>
              <p>{profile.jobTitle}</p>
              <span className="status-badge stable">Profil aktiv</span>
              <div className="profile-summary-meta">
                <span>
                  <ModuleIcon name="building" /> {profile.organizationName}
                </span>
                <span>
                  <ModuleIcon name="calendar" /> {profile.primaryCareUnitName ?? "Noch nicht festgelegt"}
                </span>
              </div>
            </aside>
            <section className="card profile-details-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Ausgewählt</p>
                  <h2 className="card-title">Persönliche Angaben</h2>
                  <p className="card-subtitle">
                    Der feste Wohnbereich wird in deinem Benutzerprofil und in der Datenbank hinterlegt.
                  </p>
                </div>
                <div className="profile-detail-actions">
                  {editing && (
                    <button className="secondary-button" type="button" onClick={() => setEditing(false)}>
                      Abbrechen
                    </button>
                  )}
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => (editing ? void saveProfile() : setEditing(true))}
                    disabled={saving}
                  >
                    <ModuleIcon name={editing ? "check" : "note"} />
                    {saving ? "Speichern…" : editing ? "Speichern" : "Bearbeiten"}
                  </button>
                </div>
              </div>
              <div className="profile-fields-grid">
                <div className="profile-read-field">
                  <span>Vollständiger Name</span>
                  <strong>{profile.displayName}</strong>
                </div>
                {valueField("Funktion", jobTitle, setJobTitle)}
                <div className="profile-read-field">
                  <span>Organisation</span>
                  <strong>{profile.organizationName}</strong>
                </div>
                {valueField("Telefon", phone, setPhone)}
                <div className="profile-read-field profile-read-field-wide">
                  <span>Fester Wohnbereich</span>
                  {editing ? (
                    <div className="profile-unit-options" role="radiogroup" aria-label="Festen Wohnbereich wählen">
                      {context.careUnits.map((unit) => (
                        <button
                          className={primaryCareUnitId === unit.id ? "active" : ""}
                          type="button"
                          role="radio"
                          aria-checked={primaryCareUnitId === unit.id}
                          key={unit.id}
                          onClick={() => setPrimaryCareUnitId(unit.id)}
                        >
                          <span>
                            <strong>{unit.name}</strong>
                            <small>{unit.detail}</small>
                          </span>
                          {primaryCareUnitId === unit.id && <ModuleIcon name="check" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <strong>{profile.primaryCareUnitName ?? "Noch nicht festgelegt"}</strong>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResidentPickerPopover({
  context,
  selectedAreaId,
  selectedResident,
  onClose,
  onChoose,
}: {
  context: WorkContext;
  selectedAreaId: string | null;
  selectedResident: ContextResident | null;
  onClose: () => void;
  onChoose: (resident: ContextResident) => void;
}) {
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState(selectedAreaId ?? "all");
  const visibleResidents = context.residents.filter(
    (resident) =>
      (unitFilter === "all" || resident.careUnitId === unitFilter) &&
      `${resident.name} ${resident.room} ${resident.group}`
        .toLocaleLowerCase("de-CH")
        .includes(query.trim().toLocaleLowerCase("de-CH")),
  );
  return (
    <div
      className="resident-picker-overlay"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        className="resident-picker-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-picker-title"
      >
        <header className="resident-picker-header">
          <div>
            <p className="eyebrow">Bewohnerakte · Arbeitskontext</p>
            <h2 id="resident-picker-title">Bewohner auswählen</h2>
            <p>Standardmässig ist dein fester Wohnbereich ausgewählt. Du kannst bereichsübergreifend arbeiten.</p>
          </div>
          <button
            className="profile-panel-close"
            type="button"
            onClick={onClose}
            aria-label="Bewohnerauswahl schliessen"
          >
            <ModuleIcon name="close" />
          </button>
        </header>
        <div className="resident-picker-body">
          <div className="resident-picker-toolbar">
            <label className="resident-picker-search">
              <ModuleIcon name="search" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                placeholder="Name, Zimmer oder Wohnbereich suchen …"
                aria-label="Bewohner suchen"
              />
            </label>
            <span>{visibleResidents.length} Bewohner sichtbar</span>
          </div>
          <div className="resident-picker-filters" aria-label="Wohnbereich filtern">
            <button type="button" className={unitFilter === "all" ? "active" : ""} onClick={() => setUnitFilter("all")}>
              Alle Wohnbereiche
            </button>
            {context.careUnits.map((unit) => (
              <button
                type="button"
                className={unitFilter === unit.id ? "active" : ""}
                key={unit.id}
                onClick={() => setUnitFilter(unit.id)}
              >
                {unit.name}
                {unit.primary && <small>Fester Bereich</small>}
              </button>
            ))}
          </div>
          <div className="resident-picker-list">
            {visibleResidents.map((resident) => (
              <button
                className={resident.id === selectedResident?.id ? "active" : ""}
                type="button"
                key={resident.id}
                onClick={() => onChoose(resident)}
              >
                <span className={`resident-context-avatar ${resident.tone}`}>{resident.initials}</span>
                <span>
                  <strong>{resident.name}</strong>
                  <small>
                    {resident.room} · {resident.group}
                  </small>
                </span>
                <span className={`status-badge ${resident.tone}`}>{resident.status}</span>
                {resident.id === selectedResident?.id && <ModuleIcon name="check" />}
                <ModuleIcon name="chevron" />
              </button>
            ))}
            {visibleResidents.length === 0 && (
              <div className="resident-context-empty">
                <ModuleIcon name="search" />
                <strong>Keine Bewohner gefunden</strong>
                <span>Prüfe Suchbegriff oder Wohnbereich.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AppHeader({
  locationPrimary = "Alterszentrum Sonnengarten",
  locationSecondary = "Wohnbereich 2 · 1. OG",
  searchOpen,
  onSearch,
  onToast,
}: {
  locationPrimary?: string;
  locationSecondary?: string;
  searchOpen: boolean;
  onSearch: () => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();
  const [context, setContext] = useState<WorkContext | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [residentOpen, setResidentOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ContextResident | null>(null);
  const [headerNotifications, setHeaderNotifications] = useState<HeaderNotification[]>([]);
  const unreadNotifications = headerNotifications.filter((item) => !item.read_at).length;
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotificationMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const mobileLocationMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    void fetch("/api/work-context")
      .then(async (response) => (response.ok ? (response.json() as Promise<WorkContext>) : null))
      .then((data) => {
        if (!live || !data) return;
        setContext(data);
        const primaryId = data.profile.primaryCareUnitId ?? data.careUnits[0]?.id ?? null;
        setSelectedAreaId(primaryId);
        setSelectedResident(
          (current) =>
            current ??
            data.residents.find((resident) => resident.careUnitId === primaryId) ??
            data.residents[0] ??
            null,
        );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    void fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) =>
        response.ok ? (response.json() as Promise<{ notifications: HeaderNotification[] }>) : null,
      )
      .then((data) => {
        if (live && data) setHeaderNotifications(data.notifications);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  async function markNotificationRead(id?: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    if (!response.ok) {
      onToast("Lesestatus konnte nicht gespeichert werden");
      return false;
    }
    const now = new Date().toISOString();
    setHeaderNotifications((items) =>
      items.map((item) => (!id || item.id === id ? { ...item, read_at: item.read_at || now } : item)),
    );
    return true;
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationOpen(false);
        setProfilePopoverOpen(false);
        setLocationOpen(false);
        setResidentOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!locationOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (locationMenuRef.current?.contains(target) || mobileLocationMenuRef.current?.contains(target)) return;
      setLocationOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [locationOpen]);
  useEffect(() => {
    if (!profileOpen && !notificationOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        profileMenuRef.current?.contains(target) ||
        mobileProfileMenuRef.current?.contains(target) ||
        notificationMenuRef.current?.contains(target) ||
        mobileNotificationMenuRef.current?.contains(target)
      )
        return;
      setProfileOpen(false);
      setNotificationOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen, notificationOpen]);
  const selectedArea = context?.careUnits.find((unit) => unit.id === selectedAreaId) ?? null;
  function closeMenus() {
    setProfileOpen(false);
    setNotificationOpen(false);
    setLocationOpen(false);
  }
  function chooseArea(area: CareUnit) {
    setSelectedAreaId(area.id);
    setLocationOpen(false);
    setSelectedResident(context?.residents.find((resident) => resident.careUnitId === area.id) ?? null);
    onToast(`${area.name} als Arbeitskontext gewählt`);
  }
  function chooseResident(resident: ContextResident) {
    setSelectedResident(resident);
    setResidentOpen(false);
    onToast(`${resident.name} ausgewählt`);
  }
  async function logout() {
    setProfileOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }
  function renderLocationControl(ref: RefObject<HTMLDivElement | null>, compact = false) {
    return (
      <div className={`location-menu-wrap ${compact ? "mobile-location-menu-wrap" : ""}`} ref={ref}>
        <button
          className={`location-control ${compact ? "mobile-location-control" : ""} ${locationOpen ? "open" : ""}`}
          type="button"
          aria-haspopup="menu"
          aria-expanded={locationOpen}
          aria-label={compact ? "Wohnbereich auswählen" : undefined}
          onClick={() => {
            setResidentOpen(false);
            closeMenus();
            setLocationOpen((value) => !value);
          }}
        >
          <span className="location-icon">
            <ModuleIcon name="building" />
          </span>
          {!compact && (
            <span className="location-copy">
              <small>{context?.profile.organizationName ?? locationPrimary}</small>
              <strong>
                {selectedArea ? `${selectedArea.name} · ${selectedArea.detail.split(" · ")[0]}` : locationSecondary}
              </strong>
            </span>
          )}
          <ModuleIcon name="chevron" className="chevron" />
        </button>
        {locationOpen && (
          <div
            className={`location-dropdown ${compact ? "mobile-location-dropdown" : ""}`}
            role="menu"
            aria-label="Wohnbereich auswählen"
          >
            <div className="context-dropdown-header">
              <div>
                <p className="eyebrow">Arbeitsbereich</p>
                <strong>Wohnbereich wechseln</strong>
              </div>
              <span>
                {context?.profile.primaryCareUnitName
                  ? `Fest: ${context.profile.primaryCareUnitName}`
                  : locationPrimary}
              </span>
            </div>
            <div className="location-options">
              {context?.careUnits.map((area) => (
                <button
                  className={`location-option ${area.id === selectedAreaId ? "active" : ""}`}
                  type="button"
                  role="menuitem"
                  key={area.id}
                  onClick={() => chooseArea(area)}
                >
                  <span className="location-option-icon">
                    <ModuleIcon name="building" />
                  </span>
                  <span className="location-option-copy">
                    <strong>{area.name}</strong>
                    <small>
                      {area.detail}
                      {area.primary ? " · Fester Bereich" : ""}
                    </small>
                  </span>
                  <span className="location-option-count">{area.residentCount}</span>
                  {area.id === selectedAreaId && <ModuleIcon name="check" className="location-option-check" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  function renderResidentSelector(compact = false) {
    return (
      <div className={`resident-context-wrap ${compact ? "mobile-resident-context-wrap" : ""}`}>
        <button
          className={`resident-context-trigger ${compact ? "mobile-resident-context-trigger" : ""} ${residentOpen ? "open" : ""}`}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={residentOpen}
          aria-label={compact ? "Bewohner auswählen" : undefined}
          onClick={() => {
            closeMenus();
            setResidentOpen(true);
          }}
        >
          <span className={`resident-context-avatar ${selectedResident?.tone ?? ""}`}>
            {selectedResident?.initials ?? "…"}
          </span>
          {!compact && (
            <span className="resident-context-copy">
              <small>Bewohner</small>
              <strong>{selectedResident?.name ?? "Bewohner auswählen"}</strong>
            </span>
          )}
          <ModuleIcon name="chevron" className="chevron" />
        </button>
      </div>
    );
  }
  function renderProfileMenu(ref: RefObject<HTMLDivElement | null>, compact = false) {
    const profile = context?.profile;
    return (
      <div className={`profile-menu-wrap ${compact ? "mobile-profile-menu-wrap" : ""}`} ref={ref}>
        <button
          className={`profile profile-trigger ${compact ? "mobile-profile-trigger" : ""} ${profileOpen ? "open" : ""}`}
          type="button"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          aria-label={compact ? "Profilmenü öffnen" : undefined}
          onClick={() => {
            setNotificationOpen(false);
            setLocationOpen(false);
            setProfileOpen((value) => !value);
          }}
        >
          <span className="avatar">{initials(profile?.displayName ?? "Anna Meier")}</span>
          {!compact && (
            <span>
              <small>{profile?.jobTitle ?? "Pflegefachfrau HF"}</small>
              <strong>{profile?.displayName ?? "Anna Meier"}</strong>
            </span>
          )}
          <ModuleIcon name="caretDown" className="profile-caret" />
        </button>
        {profileOpen && (
          <div className="profile-dropdown" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setProfileOpen(false);
                setProfilePopoverOpen(true);
              }}
            >
              <span className="profile-menu-icon">
                <ModuleIcon name="team" />
              </span>
              <span>Mein Profil</span>
              <ModuleIcon name="chevron" className="profile-menu-chevron" />
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setProfileOpen(false);
                router.push("/c/betrieb/dienstplanung");
              }}
            >
              <span className="profile-menu-icon">
                <ModuleIcon name="calendar" />
              </span>
              <span>Dienste</span>
              <ModuleIcon name="chevron" className="profile-menu-chevron" />
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setProfileOpen(false);
                router.push("/c/personal/team/nachrichten");
              }}
            >
              <span className="profile-menu-icon">
                <ModuleIcon name="team" />
              </span>
              <span>Nachrichten</span>
              <ModuleIcon name="chevron" className="profile-menu-chevron" />
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setProfileOpen(false);
                router.push("/c/einstellungen");
              }}
            >
              <span className="profile-menu-icon">
                <ModuleIcon name="settings" />
              </span>
              <span>Einstellungen</span>
              <ModuleIcon name="chevron" className="profile-menu-chevron" />
            </button>
            <button className="logout" type="button" role="menuitem" onClick={logout}>
              <span className="profile-menu-icon">
                <ModuleIcon name="logout" />
              </span>
              <span>Ausloggen</span>
            </button>
          </div>
        )}
      </div>
    );
  }
  function renderNotificationMenu(ref: RefObject<HTMLDivElement | null>, compact = false) {
    return (
      <div className={`notification-menu-wrap ${compact ? "mobile-notification-menu-wrap" : ""}`} ref={ref}>
        <button
          className={`icon-button notification-trigger ${notificationOpen ? "open" : ""}`}
          type="button"
          aria-label="Benachrichtigungen öffnen"
          aria-haspopup="menu"
          aria-expanded={notificationOpen}
          onClick={() => {
            setProfileOpen(false);
            setLocationOpen(false);
            setNotificationOpen((value) => !value);
          }}
        >
          <ModuleIcon name="bell" />
          {unreadNotifications > 0 && <span className="notification-dot" />}
        </button>
        {notificationOpen && (
          <div className="notification-dropdown" role="menu">
            <div className="notification-dropdown-header">
              <div>
                <p className="eyebrow">Posteingang</p>
                <strong>Benachrichtigungen</strong>
              </div>
              <div className="notification-header-actions">
                <span className="notification-count">{unreadNotifications} neu</span>
                <button
                  type="button"
                  onClick={() =>
                    void markNotificationRead().then((ok) => {
                      if (ok) onToast("Alle Benachrichtigungen als gelesen markiert");
                    })
                  }
                >
                  Alle gelesen
                </button>
              </div>
            </div>
            <div className="notification-list">
              {headerNotifications.slice(0, 5).map((item) => {
                const style = notificationStyle(item);
                return (
                  <button
                    className="notification-item"
                    type="button"
                    role="menuitem"
                    key={item.id}
                    onClick={() =>
                      void markNotificationRead(item.id).then((ok) => {
                        if (!ok) return;
                        setNotificationOpen(false);
                        if (item.link_url?.startsWith("/c/")) router.push(item.link_url);
                        else onToast(`${item.title} geöffnet`);
                      })
                    }
                  >
                    <span className={`notification-item-icon ${style.tone}`}>
                      <ModuleIcon name={style.icon} />
                    </span>
                    <span className="notification-item-copy">
                      <strong>{item.title}</strong>
                      <small>{item.body}</small>
                    </span>
                    <span className="notification-item-meta">
                      {!item.read_at && <span className="notification-unread" />}
                      <time>{new Date(item.created_at).toLocaleDateString("de-CH")}</time>
                    </span>
                  </button>
                );
              })}
              {headerNotifications.length === 0 && <p>Keine Benachrichtigungen vorhanden.</p>}
            </div>
            <div className="notification-dropdown-footer">
              <button
                type="button"
                onClick={() => {
                  setNotificationOpen(false);
                  router.push("/c/benachrichtigungen");
                }}
              >
                Alle Benachrichtigungen
                <ModuleIcon name="chevron" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      <header className="topbar">
        <div className="header-context">
          {renderLocationControl(locationMenuRef)}
          {renderResidentSelector()}
        </div>
        <div className="top-actions">
          <button
            className="search-trigger"
            type="button"
            onClick={() => {
              closeMenus();
              onSearch();
            }}
            aria-label="Globale Suche öffnen"
            aria-expanded={searchOpen}
          >
            <ModuleIcon name="search" />
            <span>Suchen…</span>
            <kbd>⌘ K</kbd>
          </button>
          {renderNotificationMenu(notificationMenuRef)}
          {renderProfileMenu(profileMenuRef)}
        </div>
      </header>
      <header className="mobile-top">
        <Brand />
        <div className="mobile-actions">
          {renderLocationControl(mobileLocationMenuRef, true)}
          {renderResidentSelector(true)}
          <button className="icon-button" type="button" aria-label="Suche öffnen" onClick={onSearch}>
            <ModuleIcon name="search" />
          </button>
          {renderNotificationMenu(mobileNotificationMenuRef, true)}
          {renderProfileMenu(mobileProfileMenuRef, true)}
        </div>
      </header>
      {residentOpen && context && (
        <ResidentPickerPopover
          context={context}
          selectedAreaId={selectedAreaId}
          selectedResident={selectedResident}
          onClose={() => setResidentOpen(false)}
          onChoose={chooseResident}
        />
      )}{" "}
      {profilePopoverOpen && (
        <ProfilePopover
          context={context}
          onClose={() => setProfilePopoverOpen(false)}
          onSave={(data) => {
            setContext(data);
            setSelectedAreaId(data.profile.primaryCareUnitId);
            onToast("Profil und fester Wohnbereich gespeichert");
          }}
        />
      )}
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function Brand() {
  return (
    <div className="brand" aria-label="CareCore">
      <span className="brand-mark">
        <ModuleIcon name="pulse" />
      </span>
      <span className="brand-copy">
        <span className="brand-name">CareCore</span>
        <small>Mehr Zeit für Pflege.</small>
      </span>
    </div>
  );
}
