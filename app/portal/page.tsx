"use client";

import { CareOptionSelect } from "@/app/components/care-form-controls";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { activeLanguage, rememberLanguage } from "@/app/components/translator";
import { LANGUAGES, type Language } from "@/lib/i18n-shared";
import { PORTAL_KINDS, type PortalResidentDetail } from "@/lib/portal-shared";
import { PortalHelp, PortalMessages, PortalOrders, date, dateTime, send, type PortalMe as Me } from "./portal-sections";

// Portal für Angehörige und Ärztinnen/Ärzte: eigene Anmeldung, nur lesend, nur freigegebene Bereiche.
export default function PortalPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const apply = useCallback((result: Awaited<ReturnType<typeof send<Me>>>) => {
    setMe(result.ok ? (result.payload as Me) : null);
    setChecked(true);
  }, []);
  const load = useCallback(async () => apply(await send<Me>("/api/portal/me", "GET")), [apply]);
  useEffect(() => {
    let live = true;
    void send<Me>("/api/portal/me", "GET").then((result) => live && apply(result));
    return () => {
      live = false;
    };
  }, [apply]);

  const logout = async () => {
    await send("/api/portal/auth/logout", "POST");
    setMe(null);
  };

  return (
    <main className="portal-page">
      <div className="portal-shell">
        <header className="portal-top">
          <div>
            <p className="eyebrow">CareCore Portal</p>
            <h1>{me ? me.account.displayName : "Anmeldung"}</h1>
          </div>
          <div className="portal-top-actions">
            <PortalLanguage />
            {me && (
              <button className="secondary-button" type="button" onClick={() => void logout()}>
                Abmelden
              </button>
            )}
          </div>
        </header>
        {!checked ? null : !me ? (
          helpOpen ? (
            <>
              <button className="secondary-button" type="button" onClick={() => setHelpOpen(false)}>
                Zurück zur Anmeldung
              </button>
              <PortalHelp />
            </>
          ) : (
            <>
              <PortalLogin onDone={load} />
              <button className="quiet-button" type="button" onClick={() => setHelpOpen(true)}>
                So funktioniert das Portal (Hilfe)
              </button>
            </>
          )
        ) : me.account.mustChangePassword ? (
          <PortalPasswordChange onDone={load} />
        ) : (
          <PortalWorkspace me={me} />
        )}
      </div>
    </main>
  );
}

function PortalLogin({ onDone }: { onDone: () => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await send("/api/portal/auth/login", "POST", { username, password }).catch(() => null);
    setPending(false);
    if (!result?.ok) return setError(result?.payload?.error ?? "Die Anmeldung ist derzeit nicht möglich.");
    setPassword("");
    await onDone();
  };
  return (
    <section className="portal-card">
      <h2>Portal für Angehörige, Ärztinnen/Ärzte und Apotheken</h2>
      <form className="portal-form" onSubmit={(event) => void submit(event)}>
        <label>
          Benutzername
          <input value={username} autoComplete="username" onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="portal-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={pending || !username || !password}>
          {pending ? "Anmeldung wird geprüft …" : "Anmelden"}
        </button>
      </form>
    </section>
  );
}

function PortalPasswordChange({ onDone }: { onDone: () => Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next !== repeat) return setError("Die neuen Passwörter stimmen nicht überein.");
    const result = await send("/api/portal/auth/password", "POST", { current, next }).catch(() => null);
    if (!result?.ok) return setError(result?.payload?.error ?? "Das Passwort konnte nicht geändert werden.");
    await onDone();
  };
  return (
    <section className="portal-card">
      <h2>Bitte ein eigenes Passwort festlegen</h2>
      <p className="portal-note">
        Mindestens 12 Zeichen mit Buchstaben und Ziffern. Das Einmal-Passwort gilt danach nicht mehr.
      </p>
      <form className="portal-form" onSubmit={(event) => void submit(event)}>
        <label>
          Einmal-Passwort
          <input
            type="password"
            value={current}
            autoComplete="current-password"
            onChange={(event) => setCurrent(event.target.value)}
          />
        </label>
        <label>
          Neues Passwort
          <input
            type="password"
            value={next}
            autoComplete="new-password"
            onChange={(event) => setNext(event.target.value)}
          />
        </label>
        <label>
          Neues Passwort wiederholen
          <input
            type="password"
            value={repeat}
            autoComplete="new-password"
            onChange={(event) => setRepeat(event.target.value)}
          />
        </label>
        {error && (
          <p className="portal-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={!current || !next || !repeat}>
          Passwort speichern
        </button>
      </form>
    </section>
  );
}

type Tab = "residents" | "messages" | "orders" | "help";

// Nach der Anmeldung: Reiter für freigegebene Personen, Nachrichten, Bestellungen (nur Apotheke) und Hilfe.
function PortalWorkspace({ me }: { me: Me }) {
  const pharmacy = me.account.kind === "pharmacy";
  const [tab, setTab] = useState<Tab>(pharmacy ? "orders" : "residents");
  const tabs: Array<[Tab, string]> = [
    ...(pharmacy ? ([["orders", "Bestellungen"]] as Array<[Tab, string]>) : []),
    ["residents", pharmacy ? "Medikationspläne" : "Personen"],
    ["messages", "Nachrichten"],
    ["help", "Hilfe"],
  ];
  return (
    <>
      <nav className="portal-tabs" aria-label="Bereiche des Portals">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === "residents" && <PortalResidents me={me} />}
      {tab === "messages" && <PortalMessages me={me} />}
      {tab === "orders" && pharmacy && <PortalOrders />}
      {tab === "help" && <PortalHelp />}
    </>
  );
}

function PortalResidents({ me }: { me: Me }) {
  const [selectedId, setSelectedId] = useState<string | null>(me.residents[0]?.id ?? null);
  const [detail, setDetail] = useState<PortalResidentDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    void send<PortalResidentDetail>(`/api/portal/residents/${selectedId}`, "GET").then((result) => {
      if (!live) return;
      if (result.ok) {
        setDetail(result.payload);
        setError("");
      } else setError(result.payload?.error ?? "Die Daten konnten nicht geladen werden.");
    });
    return () => {
      live = false;
    };
  }, [selectedId]);

  if (!me.residents.length)
    return (
      <section className="portal-card">
        <h2>Keine Freigabe</h2>
        <p className="portal-note">
          Derzeit sind keine Daten für Sie freigegeben. Bitte wenden Sie sich an die Einrichtung.
        </p>
      </section>
    );

  const shown = detail?.id === selectedId ? detail : null;
  return (
    <>
      <section className="portal-card">
        <p className="portal-note">{PORTAL_KINDS[me.account.kind]} · Nur lesend. Jeder Abruf wird protokolliert.</p>
        <div className="portal-residents" role="group" aria-label="Freigegebene Personen">
          {me.residents.map((resident) => (
            <button
              type="button"
              key={resident.id}
              aria-pressed={resident.id === selectedId}
              onClick={() => setSelectedId(resident.id)}
            >
              <strong>{resident.name}</strong>
              <small>{[resident.careUnit, resident.room].filter(Boolean).join(" · ")}</small>
            </button>
          ))}
        </div>
      </section>
      {error && (
        <p className="portal-error" role="alert">
          {error}
        </p>
      )}
      {shown && <PortalDetail detail={shown} />}
    </>
  );
}

function PortalDetail({ detail }: { detail: PortalResidentDetail }) {
  return (
    <div className="portal-sections">
      <section className="portal-card" aria-label="Grunddaten">
        <h2>{detail.name}</h2>
        <p className="portal-note">
          Geboren {date(detail.birthDate)} · {[detail.careUnit, detail.room].filter(Boolean).join(" · ")}
        </p>
      </section>
      {detail.emergency && (
        <section className="portal-card">
          <h2>Notfalldaten</h2>
          <ul className="portal-list">
            <li>
              Reanimationsstatus: <strong>{detail.emergency.resuscitation}</strong>
              {detail.emergency.resuscitationSource && <small>Grundlage: {detail.emergency.resuscitationSource}</small>}
              {detail.emergency.decidedOn && <small>festgelegt am {date(detail.emergency.decidedOn)}</small>}
            </li>
            <li>Allergien: {detail.emergency.allergies || "keine erfasst"}</li>
          </ul>
        </section>
      )}
      {detail.medication && (
        <section className="portal-card">
          <h2>Medikation</h2>
          <ul className="portal-list">
            {detail.medication.map((entry, index) => (
              <li key={index}>
                <strong>{entry.name}</strong> · {entry.amount}
                <small>
                  {entry.prn ? "Reserve" : entry.times.join(" · ")}
                  {entry.indication ? ` · ${entry.indication}` : ""}
                </small>
              </li>
            ))}
            {!detail.medication.length && <li>Keine laufenden Verordnungen.</li>}
          </ul>
        </section>
      )}
      {detail.vitals && (
        <section className="portal-card">
          <h2>Vitalwerte (30 Tage)</h2>
          <ul className="portal-list">
            {detail.vitals.map((entry, index) => (
              <li key={index}>
                <strong>{entry.metric}</strong> {entry.value} {entry.unit}
                <small>{dateTime(entry.measuredAt)}</small>
              </li>
            ))}
            {!detail.vitals.length && <li>Keine Messungen in den letzten 30 Tagen.</li>}
          </ul>
        </section>
      )}
      {detail.reports && (
        <section className="portal-card">
          <h2>Pflegeberichte (14 Tage)</h2>
          <ul className="portal-list">
            {detail.reports.map((entry, index) => (
              <li key={index}>
                <strong>{entry.title || entry.category}</strong>
                <small>{dateTime(entry.occurredAt)}</small>
                <p>{entry.body}</p>
              </li>
            ))}
            {!detail.reports.length && <li>Keine Berichte in den letzten 14 Tagen.</li>}
          </ul>
        </section>
      )}
      {detail.appointments && (
        <section className="portal-card">
          <h2>Termine</h2>
          <ul className="portal-list">
            {detail.appointments.map((entry, index) => (
              <li key={index}>
                <strong>{entry.title}</strong>
                <small>
                  {dateTime(entry.startsAt)}
                  {entry.location ? ` · ${entry.location}` : ""} · {entry.category}
                </small>
              </li>
            ))}
            {!detail.appointments.length && <li>Keine anstehenden Termine.</li>}
          </ul>
        </section>
      )}
      {detail.activities && (
        <section className="portal-card">
          <h2>Alltag &amp; Aktivitäten</h2>
          <h3>Teilgenommen (30 Tage)</h3>
          <ul className="portal-list">
            {detail.activities.attended.map((entry, index) => (
              <li key={index}>
                <strong>{entry.title}</strong>
                <small>
                  {dateTime(entry.startsAt)} · {entry.category}
                </small>
              </li>
            ))}
            {!detail.activities.attended.length && <li>Keine Teilnahme in den letzten 30 Tagen erfasst.</li>}
          </ul>
          <h3>Kommende Angebote (14 Tage)</h3>
          <ul className="portal-list">
            {detail.activities.upcoming.map((entry, index) => (
              <li key={index}>
                <strong>{entry.title}</strong>
                <small>
                  {dateTime(entry.startsAt)}
                  {entry.location ? ` · ${entry.location}` : ""} · {entry.category}
                </small>
              </li>
            ))}
            {!detail.activities.upcoming.length && <li>Keine Angebote geplant.</li>}
          </ul>
        </section>
      )}
      {detail.wounds && (
        <section className="portal-card">
          <h2>Wunden</h2>
          <ul className="portal-list">
            {detail.wounds.map((entry, index) => (
              <li key={index}>
                <strong>{entry.title}</strong>
                <small>
                  {[entry.location, entry.since && `seit ${date(entry.since)}`].filter(Boolean).join(" · ")}
                </small>
              </li>
            ))}
            {!detail.wounds.length && <li>Keine offenen Wunden.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}

// Sprache des Portals: erscheint nur, wenn neben Deutsch eine Sprache freigegeben ist.
function PortalLanguage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const current = useSyncExternalStore(
    () => () => undefined,
    activeLanguage,
    () => "de",
  );
  useEffect(() => {
    let live = true;
    void send<{ languages: Language[] }>("/api/i18n", "GET").then(
      (result) => live && result.ok && setLanguages(result.payload?.languages ?? []),
    );
    return () => {
      live = false;
    };
  }, []);
  if (languages.length < 2) return null;
  return (
    <label className="portal-language">
      <span className="sr-only">Sprache</span>
      <CareOptionSelect
        label="Sprache"
        value={current}
        options={languages.map((locale) => ({ value: locale, label: LANGUAGES[locale].label }))}
        onChange={(value) => rememberLanguage(value as Language)}
      />
    </label>
  );
}
