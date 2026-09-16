"use client";

import { useMemo, useState } from "react";
import ModulePageShell, { ModuleIcon, type ModuleIconName } from "@/app/components/module-page-shell";

type NotificationTone = "critical" | "attention" | "info" | "stable";
type NotificationFilter = "Alle" | "Ungelesen" | "Kritisch";
type NotificationEntry = { id: number; icon: ModuleIconName; tone: NotificationTone; category: string; title: string; description: string; time: string; read: boolean };

const initialNotifications: NotificationEntry[] = [
  { id: 1, icon: "alert", tone: "critical", category: "Kritischer Hinweis", title: "Sturzrisiko bei Hans Müller", description: "Bitte neurologische Kontrolle dokumentieren und den Verlauf ergänzen.", time: "Heute · 08:12", read: false },
  { id: 2, icon: "tasks", tone: "attention", category: "Aufgabe", title: "Medikationsrunde bald fällig", description: "Die Runde für Wohnbereich 2 beginnt in 30 Minuten.", time: "Heute · 07:46", read: false },
  { id: 3, icon: "handover", tone: "info", category: "Übergabe", title: "Neue Übergabe verfügbar", description: "Der Spätdienst hat drei Hinweise für dein Team ergänzt.", time: "Heute · 06:58", read: false },
  { id: 4, icon: "vitals", tone: "critical", category: "Vitalwert", title: "Blutdruck ausserhalb Grenzwert", description: "Walter Brunner · 168/96 mmHg · erneute Kontrolle empfohlen.", time: "Gestern · 21:34", read: false },
  { id: 5, icon: "wounds", tone: "stable", category: "Dokumentation", title: "Wunddokumentation aktualisiert", description: "Frau Schneider · rechter Unterschenkel · Verlauf gespeichert.", time: "Gestern · 17:20", read: true },
  { id: 6, icon: "team", tone: "info", category: "Team & Nachrichten", title: "Neue Nachricht von Lukas Meier", description: "Bitte den aktualisierten Dienstübergabe-Standard prüfen.", time: "Gestern · 15:05", read: true },
  { id: 7, icon: "docs", tone: "stable", category: "Systemhinweis", title: "Standard aktualisiert", description: "Der Standard zur Sturzprophylaxe ist ab sofort verfügbar.", time: "12.09.2026 · 09:00", read: true },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<NotificationFilter>("Alle");
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications = useMemo(() => notifications.filter((notification) => {
    if (filter === "Ungelesen") return !notification.read;
    if (filter === "Kritisch") return notification.tone === "critical";
    return true;
  }), [filter, notifications]);

  return <ModulePageShell pageClass="notifications-page" locationSecondary="Persönlicher Bereich">
    {(showToast) => <main className="workspace notifications-workspace"><section className="page-heading notifications-page-heading"><div className="heading-copy"><p className="eyebrow">CareCore Inbox</p><h1>Benachrichtigungen</h1><p>Alle relevanten Hinweise für deinen Arbeitsbereich an einem Ort.</p></div><button className="secondary-button" type="button" disabled={unreadCount === 0} onClick={() => { setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))); showToast("Alle Benachrichtigungen als gelesen markiert"); }}><ModuleIcon name="check"/>Alle gelesen</button></section><section className="summary-strip notifications-summary"><div className="summary-item"><span className="summary-icon"><ModuleIcon name="bell"/></span><span><strong className="summary-value">{notifications.length}</strong><small className="summary-label">Hinweise gesamt</small></span></div><div className="summary-item"><span className="summary-icon attention"><ModuleIcon name="alert"/></span><span><strong className="summary-value">{unreadCount}</strong><small className="summary-label">Ungelesen</small></span></div><div className="summary-item"><span className="summary-icon critical"><ModuleIcon name="quality"/></span><span><strong className="summary-value">{notifications.filter((notification) => notification.tone === "critical").length}</strong><small className="summary-label">Kritische Hinweise</small></span></div><div className="summary-item"><span className="summary-icon info"><ModuleIcon name="calendar"/></span><span><strong className="summary-value">4</strong><small className="summary-label">Heute eingegangen</small></span></div></section><section className="card notifications-inbox"><div className="card-header notifications-inbox-header"><div><p className="eyebrow">Posteingang</p><h2 className="card-title">Deine Hinweise</h2><p className="card-subtitle">{visibleNotifications.length} von {notifications.length} Benachrichtigungen</p></div><div className="notifications-filter-bar" role="group" aria-label="Benachrichtigungen filtern">{(["Alle", "Ungelesen", "Kritisch"] as NotificationFilter[]).map((option) => <button className={filter === option ? "active" : ""} type="button" key={option} onClick={() => setFilter(option)}>{option}{option === "Ungelesen" && <span>{unreadCount}</span>}</button>)}</div></div><div className="notifications-page-list">{visibleNotifications.map((notification) => <button className={`notifications-page-row ${notification.read ? "read" : "unread"}`} type="button" key={notification.id} onClick={() => { setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item)); showToast(`${notification.title} geöffnet`); }}><span className={`notifications-page-icon ${notification.tone}`}><ModuleIcon name={notification.icon}/></span><span className="notifications-page-copy"><span className="notifications-page-category">{notification.category}</span><strong>{notification.title}</strong><small>{notification.description}</small></span><span className="notifications-page-meta">{!notification.read && <span className="notification-unread" aria-label="Ungelesen"/>}<time>{notification.time}</time><ModuleIcon name="chevron"/></span></button>)}{visibleNotifications.length === 0 && <div className="notifications-empty"><ModuleIcon name="check"/><strong>Keine passenden Benachrichtigungen</strong><p>In diesem Filter sind aktuell keine Hinweise vorhanden.</p></div>}</div></section></main>}
  </ModulePageShell>;
}
