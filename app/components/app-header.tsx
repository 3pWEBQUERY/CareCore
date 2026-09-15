"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ModuleIcon, type ModuleIconName } from "./module-page-shell";

const headerNotifications = [
  { icon: "alert" as ModuleIconName, tone: "critical", title: "Sturzrisiko bei Hans Müller", description: "Bitte neurologische Kontrolle dokumentieren.", time: "vor 8 Min." },
  { icon: "tasks" as ModuleIconName, tone: "attention", title: "Aufgabe bald fällig", description: "Medikationsrunde · Wohnbereich 2", time: "vor 24 Min." },
  { icon: "handover" as ModuleIconName, tone: "info", title: "Neue Übergabe verfügbar", description: "Spätdienst hat 3 Hinweise ergänzt.", time: "vor 1 Std." },
  { icon: "wounds" as ModuleIconName, tone: "stable", title: "Wunddokumentation aktualisiert", description: "Frau Schneider · rechter Unterschenkel", time: "Gestern" },
];

const headerWorkAreas = [
  { id: "all", name: "Gesamtes Haus", detail: "Alle Wohnbereiche", residentCount: 48 },
  { id: "wb1", name: "Wohnbereich 1", detail: "EG · 12 Bewohner", residentCount: 12 },
  { id: "wb2", name: "Wohnbereich 2", detail: "1. OG · 12 Bewohner", residentCount: 12 },
  { id: "wb3", name: "Wohnbereich 3", detail: "2. OG · 16 Bewohner", residentCount: 16 },
  { id: "pwg", name: "Pflegewohngruppe", detail: "EG · 8 Bewohner", residentCount: 8 },
];

const headerResidents = [
  { id: "mueller", initials: "HM", name: "Hans Müller", room: "Zimmer 101", group: "Wohnbereich 2", status: "Sturzrisiko", tone: "critical" },
  { id: "schneider", initials: "FS", name: "Frau Schneider", room: "Zimmer 104", group: "Wohnbereich 2", status: "Stabil", tone: "stable" },
  { id: "wagner", initials: "HW", name: "Herr Wagner", room: "Zimmer 105", group: "Wohnbereich 2", status: "Herzinsuffizienz", tone: "attention" },
  { id: "keller", initials: "EK", name: "Erika Keller", room: "Zimmer 203", group: "Wohnbereich 3", status: "Stabil", tone: "stable" },
  { id: "fischer", initials: "PF", name: "Peter Fischer", room: "Zimmer 12", group: "Wohnbereich 1", status: "Beobachtung", tone: "info" },
  { id: "berger", initials: "AB", name: "Anna Berger", room: "Zimmer 7", group: "Pflegewohngruppe", status: "Stabil", tone: "stable" },
] as const;

type HeaderResident = (typeof headerResidents)[number];

function ProfilePopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Anna Meier");
  const [role, setRole] = useState("Pflegefachfrau HF");
  const [email, setEmail] = useState("anna.meier@carecore.ch");
  const [phone, setPhone] = useState("+41 79 555 12 34");
  const [location, setLocation] = useState("Alterszentrum Sonnengarten");
  const [bio, setBio] = useState("Verantwortlich für die Frühschicht auf Wohnbereich 2.");
  if (!open) return null;
  const field = (label: string, value: string, setValue: (value: string) => void) => editing ? <label className="profile-edit-field"><span>{label}</span><input value={value} onChange={(event) => setValue(event.target.value)}/></label> : <div className="profile-read-field"><span>{label}</span><strong>{value}</strong></div>;
  return <div className="profile-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><section className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-popover-title"><header className="profile-panel-header"><div><p className="eyebrow">CareCore · Persönlicher Bereich</p><h2 id="profile-popover-title">Mein Profil</h2><p>Verwalte deine persönlichen Angaben und deinen Arbeitskontext.</p></div><button className="profile-panel-close" type="button" onClick={onClose} aria-label="Profil schliessen"><ModuleIcon name="close"/></button></header><div className="profile-panel-body"><div className="profile-panel-layout"><aside className="profile-summary-card"><span className="profile-large-avatar">AM</span><p className="eyebrow">Pflege & Klinik</p><h3>{name}</h3><p>{role}</p><span className="status-badge stable">Profil aktiv</span><div className="profile-summary-meta"><span><ModuleIcon name="building"/> {location}</span><span><ModuleIcon name="calendar"/> Frühdienst · Wohnbereich 2</span></div></aside><section className="card profile-details-card"><div className="card-header"><div><p className="eyebrow">Ausgewählt</p><h2 className="card-title">Persönliche Angaben</h2><p className="card-subtitle">Diese Angaben werden deinem Team im CareCore-Arbeitsplatz angezeigt.</p></div><div className="profile-detail-actions">{editing && <button className="secondary-button" type="button" onClick={() => setEditing(false)}>Abbrechen</button>}<button className="primary-button" type="button" onClick={() => setEditing((value) => !value)}><ModuleIcon name={editing ? "check" : "note"}/>{editing ? "Speichern" : "Bearbeiten"}</button></div></div><div className="profile-fields-grid">{field("Vollständiger Name", name, setName)}{field("Funktion", role, setRole)}{field("E-Mail", email, setEmail)}{field("Telefon", phone, setPhone)}{field("Standort", location, setLocation)}<div className={editing ? "profile-edit-field profile-edit-field-wide" : "profile-read-field profile-read-field-wide"}>{editing ? <label><span>Kurzprofil</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4}/></label> : <><span>Kurzprofil</span><strong>{bio}</strong></>}</div></div></section></div></div></section></div>;
}

export default function AppHeader({ locationPrimary = "Alterszentrum Sonnengarten", locationSecondary = "Wohnbereich 2 · 1. OG", searchOpen, onSearch, onToast }: { locationPrimary?: string; locationSecondary?: string; searchOpen: boolean; onSearch: () => void; onToast: (message: string) => void }) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(locationSecondary);
  const [residentOpen, setResidentOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<HeaderResident>(headerResidents[0]);
  const [residentQuery, setResidentQuery] = useState("");
  const [residentGroup, setResidentGroup] = useState("Alle");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotificationMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const mobileLocationMenuRef = useRef<HTMLDivElement>(null);
  const residentMenuRef = useRef<HTMLDivElement>(null);
  const mobileResidentMenuRef = useRef<HTMLDivElement>(null);

  const residentGroups = ["Alle", ...Array.from(new Set(headerResidents.map((resident) => resident.group)))];
  const filteredResidents = headerResidents.filter((resident) => {
    const query = residentQuery.trim().toLocaleLowerCase("de");
    const matchesQuery = !query || `${resident.name} ${resident.room} ${resident.group}`.toLocaleLowerCase("de").includes(query);
    const matchesGroup = residentGroup === "Alle" || resident.group === residentGroup;
    return matchesQuery && matchesGroup;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setProfileOpen(false); setNotificationOpen(false); setProfilePopoverOpen(false); setLocationOpen(false); setResidentOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: PointerEvent) => { const target = event.target as Node; if (profileMenuRef.current?.contains(target) || mobileProfileMenuRef.current?.contains(target)) return; setProfileOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen]);

  useEffect(() => {
    if (!notificationOpen) return;
    const onPointerDown = (event: PointerEvent) => { const target = event.target as Node; if (notificationMenuRef.current?.contains(target) || mobileNotificationMenuRef.current?.contains(target)) return; setNotificationOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [notificationOpen]);

  useEffect(() => {
    if (!locationOpen) return;
    const onPointerDown = (event: PointerEvent) => { const target = event.target as Node; if (locationMenuRef.current?.contains(target) || mobileLocationMenuRef.current?.contains(target)) return; setLocationOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [locationOpen]);

  useEffect(() => {
    if (!residentOpen) return;
    const onPointerDown = (event: PointerEvent) => { const target = event.target as Node; if (residentMenuRef.current?.contains(target) || mobileResidentMenuRef.current?.contains(target)) return; setResidentOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [residentOpen]);

  function openSearch() {
    setProfileOpen(false);
    setNotificationOpen(false);
    setLocationOpen(false);
    setResidentOpen(false);
    onSearch();
  }

  function chooseArea(area: (typeof headerWorkAreas)[number]) {
    setSelectedArea(area.id === "wb2" ? "Wohnbereich 2 · 1. OG" : area.name);
    setLocationOpen(false);
    onToast(`${area.name} ausgewählt`);
  }

  function chooseResident(resident: HeaderResident) {
    setSelectedResident(resident);
    setResidentOpen(false);
    setResidentQuery("");
    onToast(`${resident.name} ausgewählt`);
  }

  function renderLocationControl(ref: RefObject<HTMLDivElement | null>, compact = false) {
    return <div className={`location-menu-wrap ${compact ? "mobile-location-menu-wrap" : ""}`} ref={ref}>
      <button className={`location-control ${compact ? "mobile-location-control" : ""} ${locationOpen ? "open" : ""}`} type="button" aria-haspopup="menu" aria-expanded={locationOpen} aria-controls={compact ? "shared-mobile-location-menu" : "shared-location-menu"} aria-label={compact ? "Wohnbereich auswählen" : undefined} onClick={() => { setProfileOpen(false); setNotificationOpen(false); setResidentOpen(false); setLocationOpen((value) => !value); }}>
        <span className="location-icon"><ModuleIcon name="building"/></span>
        {!compact && <span className="location-copy"><small>{locationPrimary}</small><strong>{selectedArea}</strong></span>}
        <ModuleIcon name="chevron" className="chevron"/>
      </button>
      {locationOpen && <div className={`location-dropdown ${compact ? "mobile-location-dropdown" : ""}`} id={compact ? "shared-mobile-location-menu" : "shared-location-menu"} role="menu" aria-label="Wohnbereich auswählen">
        <div className="context-dropdown-header"><div><p className="eyebrow">Arbeitsbereich</p><strong>Wohnbereich wechseln</strong></div><span>{locationPrimary}</span></div>
        <div className="location-options">{headerWorkAreas.map((area) => { const active = (area.id === "wb2" && selectedArea === "Wohnbereich 2 · 1. OG") || selectedArea === area.name; return <button className={`location-option ${active ? "active" : ""}`} type="button" role="menuitem" key={area.id} onClick={() => chooseArea(area)}><span className="location-option-icon"><ModuleIcon name="building"/></span><span className="location-option-copy"><strong>{area.name}</strong><small>{area.detail}</small></span><span className="location-option-count">{area.residentCount}</span>{active && <ModuleIcon name="check" className="location-option-check"/>}</button>; })}</div>
      </div>}
    </div>;
  }

  function renderResidentSelector(ref: RefObject<HTMLDivElement | null>, compact = false) {
    return <div className={`resident-context-wrap ${compact ? "mobile-resident-context-wrap" : ""}`} ref={ref}>
      <button className={`resident-context-trigger ${compact ? "mobile-resident-context-trigger" : ""} ${residentOpen ? "open" : ""}`} type="button" aria-haspopup="dialog" aria-expanded={residentOpen} aria-controls={compact ? "shared-mobile-resident-menu" : "shared-resident-menu"} aria-label={compact ? "Bewohner auswählen" : undefined} onClick={() => { setProfileOpen(false); setNotificationOpen(false); setLocationOpen(false); setResidentOpen((value) => !value); }}>
        <span className="resident-context-avatar">{selectedResident.initials}</span>
        {!compact && <span className="resident-context-copy"><small>Bewohner</small><strong>{selectedResident.name}</strong></span>}
        <ModuleIcon name="chevron" className="chevron"/>
      </button>
      {residentOpen && <div className={`resident-context-dropdown ${compact ? "mobile-resident-context-dropdown" : ""}`} id={compact ? "shared-mobile-resident-menu" : "shared-resident-menu"} role="dialog" aria-label="Bewohner auswählen">
        <div className="context-dropdown-header"><div><p className="eyebrow">Bewohnerakte</p><strong>Bewohner auswählen</strong></div><span>{filteredResidents.length} Treffer</span></div>
        <label className="resident-context-search"><ModuleIcon name="search"/><input type="search" autoFocus value={residentQuery} onChange={(event) => setResidentQuery(event.target.value)} placeholder="Name, Zimmer oder Gruppe suchen …" aria-label="Bewohner suchen"/></label>
        <div className="resident-context-filters" aria-label="Nach Wohngruppe filtern">{residentGroups.map((group) => <button className={residentGroup === group ? "active" : ""} type="button" key={group} onClick={() => setResidentGroup(group)}>{group}</button>)}</div>
        <div className="resident-context-list">{filteredResidents.length > 0 ? filteredResidents.map((resident) => <button className={`resident-context-option ${resident.id === selectedResident.id ? "active" : ""}`} type="button" key={resident.id} onClick={() => chooseResident(resident)}><span className={`resident-context-avatar ${resident.tone}`}>{resident.initials}</span><span className="resident-context-option-copy"><strong>{resident.name}</strong><small>{resident.room} · {resident.group}</small></span><span className={`status-badge ${resident.tone}`}>{resident.status}</span>{resident.id === selectedResident.id && <ModuleIcon name="check" className="resident-option-check"/>}</button>) : <div className="resident-context-empty"><ModuleIcon name="search"/><strong>Keine Bewohner gefunden</strong><span>Prüfe Suchbegriff oder Wohngruppe.</span></div>}</div>
      </div>}
    </div>;
  }

  function renderProfileMenu(ref: RefObject<HTMLDivElement | null>, compact = false) {
    return <div className={`profile-menu-wrap ${compact ? "mobile-profile-menu-wrap" : ""}`} ref={ref}><button className={`profile profile-trigger ${compact ? "mobile-profile-trigger" : ""} ${profileOpen ? "open" : ""}`} type="button" aria-haspopup="menu" aria-expanded={profileOpen} aria-controls={compact ? "shared-mobile-profile-menu" : "shared-profile-menu"} aria-label={compact ? "Profilmenü öffnen" : undefined} onClick={() => { setNotificationOpen(false); setLocationOpen(false); setResidentOpen(false); setProfileOpen((value) => !value); }}><span className="avatar">AM</span>{!compact && <span><small>Pflegefachfrau HF</small><strong>Anna Meier</strong></span>}<ModuleIcon name="caretDown" className="profile-caret"/></button>{profileOpen && <div className="profile-dropdown" id={compact ? "shared-mobile-profile-menu" : "shared-profile-menu"} role="menu" aria-label="Profilmenü"><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); setProfilePopoverOpen(true); }}><span className="profile-menu-icon"><ModuleIcon name="team"/></span><span>Mein Profil</span><ModuleIcon name="chevron" className="profile-menu-chevron"/></button><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); router.push("/betrieb/dienstplanung"); }}><span className="profile-menu-icon"><ModuleIcon name="calendar"/></span><span>Dienstplan</span><ModuleIcon name="chevron" className="profile-menu-chevron"/></button><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); router.push("/personal/team/nachrichten"); }}><span className="profile-menu-icon"><ModuleIcon name="team"/></span><span>Nachrichten</span><ModuleIcon name="chevron" className="profile-menu-chevron"/></button><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); router.push("/einstellungen"); }}><span className="profile-menu-icon"><ModuleIcon name="settings"/></span><span>Einstellungen</span><ModuleIcon name="chevron" className="profile-menu-chevron"/></button><button className="logout" type="button" role="menuitem" onClick={() => { setProfileOpen(false); onToast("Ausloggen ist in dieser Demo vorbereitet"); }}><span className="profile-menu-icon"><ModuleIcon name="logout"/></span><span>Ausloggen</span></button></div>}</div>;
  }

  function renderNotificationMenu(ref: RefObject<HTMLDivElement | null>, compact = false) {
    return <div className={`notification-menu-wrap ${compact ? "mobile-notification-menu-wrap" : ""}`} ref={ref}><button className={`icon-button notification-trigger ${notificationOpen ? "open" : ""}`} type="button" aria-label="Benachrichtigungen öffnen" aria-haspopup="menu" aria-expanded={notificationOpen} aria-controls={compact ? "shared-mobile-notification-menu" : "shared-notification-menu"} onClick={() => { setProfileOpen(false); setLocationOpen(false); setResidentOpen(false); setNotificationOpen((value) => !value); }}><ModuleIcon name="bell"/>{unreadNotifications > 0 && <span className="notification-dot"/>}</button>{notificationOpen && <div className="notification-dropdown" id={compact ? "shared-mobile-notification-menu" : "shared-notification-menu"} role="menu" aria-label="Benachrichtigungen"><div className="notification-dropdown-header"><div><p className="eyebrow">Posteingang</p><strong>Benachrichtigungen</strong></div><div className="notification-header-actions"><span className="notification-count">{unreadNotifications} neu</span><button type="button" onClick={() => { setUnreadNotifications(0); onToast("Alle Benachrichtigungen als gelesen markiert"); }}>Alle gelesen</button></div></div><div className="notification-list">{headerNotifications.map((item, index) => <button className="notification-item" type="button" role="menuitem" key={item.title} onClick={() => { setNotificationOpen(false); onToast(`${item.title} geöffnet`); }}><span className={`notification-item-icon ${item.tone}`}><ModuleIcon name={item.icon}/></span><span className="notification-item-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className="notification-item-meta">{index < unreadNotifications && <span className="notification-unread" aria-label="Ungelesen"/>}<time>{item.time}</time></span></button>)}</div><div className="notification-dropdown-footer"><button type="button" onClick={() => { setNotificationOpen(false); router.push("/benachrichtigungen"); }}>Alle Benachrichtigungen<ModuleIcon name="chevron"/></button></div></div>}</div>;
  }

  return <><header className="topbar"><div className="header-context">{renderLocationControl(locationMenuRef)}{renderResidentSelector(residentMenuRef)}</div><div className="top-actions"><button className="search-trigger" type="button" onClick={openSearch} aria-label="Globale Suche öffnen" aria-haspopup="dialog" aria-expanded={searchOpen}><ModuleIcon name="search"/><span>Suchen…</span><kbd>⌘ K</kbd></button>{renderNotificationMenu(notificationMenuRef)}{renderProfileMenu(profileMenuRef)}</div></header><header className="mobile-top"><Brand/><div className="mobile-actions">{renderLocationControl(mobileLocationMenuRef,true)}{renderResidentSelector(mobileResidentMenuRef,true)}<button className="icon-button" type="button" aria-label="Suche öffnen" onClick={openSearch}><ModuleIcon name="search"/></button>{renderNotificationMenu(mobileNotificationMenuRef,true)}{renderProfileMenu(mobileProfileMenuRef,true)}</div></header><ProfilePopover open={profilePopoverOpen} onClose={() => setProfilePopoverOpen(false)}/></>;
}

function Brand() {
  return <div className="brand" aria-label="CareCore"><span className="brand-mark"><ModuleIcon name="pulse"/></span><span className="brand-copy"><span className="brand-name">CareCore</span><small>Mehr Zeit für Pflege.</small></span></div>;
}
