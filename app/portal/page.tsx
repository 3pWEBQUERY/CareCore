"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PORTAL_KINDS, type PortalKind, type PortalResident, type PortalResidentDetail } from "@/lib/portal-shared";

type Me = {
  account: { displayName: string; kind: PortalKind; mustChangePassword: boolean };
  residents: PortalResident[];
};

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat("de-CH", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`)) : "–";

async function send<T>(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, payload: payload as (T & { error?: string }) | null };
}

// Portal für Angehörige und Ärztinnen/Ärzte: eigene Anmeldung, nur lesend, nur freigegebene Bereiche.
export default function PortalPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
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
          {me && (
            <button className="secondary-button" type="button" onClick={() => void logout()}>
              Abmelden
            </button>
          )}
        </header>
        {!checked ? null : !me ? (
          <PortalLogin onDone={load} />
        ) : me.account.mustChangePassword ? (
          <PortalPasswordChange onDone={load} />
        ) : (
          <PortalResidents me={me} />
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
      <h2>Portal für Angehörige und Ärztinnen/Ärzte</h2>
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
