"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Eye, EyeSlash, LockKey, Pulse, ShieldCheck, User } from "@phosphor-icons/react";
import { clearOfflineData } from "./components/offline-queue";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // Zwei-Faktor-Anmeldung: nach richtigem Passwort folgt der Code aus der Authenticator-App.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  // Nach der automatischen Abmeldung (Einstellungen › Sicherheit) den Grund nennen.
  const idleSignOut = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("abgemeldet") === "inaktiv",
    () => false,
  );
  const message =
    error ||
    (idleSignOut ? "Du wurdest nach längerer Inaktivität automatisch abgemeldet. Bitte melde dich erneut an." : "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(challenge ? "/api/auth/mfa" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challenge ? { challenge, code } : { username, password }),
      });
      const result = (await response.json()) as {
        error?: string;
        startPath?: string;
        mfaRequired?: boolean;
        challenge?: string;
        restart?: boolean;
      };
      if (!response.ok) {
        setError(result.error ?? "Anmeldung fehlgeschlagen.");
        if (result.restart) {
          setChallenge(null);
          setCode("");
        }
        return;
      }
      if (result.mfaRequired && result.challenge) {
        setChallenge(result.challenge);
        setCode("");
        return;
      }
      // Seiten und Daten einer früheren Anmeldung auf diesem Gerät verwerfen.
      clearOfflineData();
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const startPath = result.startPath?.startsWith("/c") ? result.startPath : "/c";
      router.replace(requestedPath?.startsWith("/c") ? requestedPath : startPath);
      router.refresh();
    } catch {
      setError("Die Verbindung zum CareCore-Arbeitsplatz konnte nicht hergestellt werden.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="CareCore Produktinformation">
        <div className="login-brand">
          <span>
            <Pulse weight="regular" />
          </span>
          <div>
            <strong>CareCore</strong>
            <small>Mehr Zeit für Pflege.</small>
          </div>
        </div>
        <div className="login-brand-copy">
          <p className="eyebrow">Sicherer Pflegearbeitsplatz</p>
          <h1>Alles Wichtige für deinen Dienst. An einem Ort.</h1>
          <p>
            Bewohnerinformationen, Aufgaben, Dokumentation und Übergaben – strukturiert, sicher und für dein Team
            verfügbar.
          </p>
        </div>
        <div className="login-trust-list">
          <span>
            <ShieldCheck />
            <span>
              <strong>Datenschutz im Mittelpunkt</strong>
              <small>Geschützte Sitzungen und rollenbasierter Zugriff.</small>
            </span>
          </span>
          <span>
            <CheckCircle />
            <span>
              <strong>Für den Pflegealltag gebaut</strong>
              <small>Klare Abläufe ohne unnötige Umwege.</small>
            </span>
          </span>
        </div>
        <footer>CareCore · Pflegedokumentation für Alters- und Pflegeheime</footer>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <span>
              <Pulse />
            </span>
            <strong>CareCore</strong>
          </div>
          <div className="login-heading">
            <p className="eyebrow">Willkommen zurück</p>
            <h2>Bei CareCore anmelden</h2>
            <p>Melde dich mit deinem persönlichen Benutzerkonto an.</p>
          </div>
          <form className="login-form" method="post" onSubmit={submit}>
            {challenge ? (
              <>
                <label htmlFor="mfa-code">Bestätigungscode</label>
                <div className="login-input">
                  <ShieldCheck />
                  <input
                    id="mfa-code"
                    name="code"
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={12}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="6-stelliger Code"
                    required
                  />
                </div>
                <p className="login-mfa-hint">
                  Code aus deiner Authenticator-App eingeben – oder einen Wiederherstellungscode.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setChallenge(null);
                      setCode("");
                      setError("");
                    }}
                  >
                    Zurück
                  </button>
                </p>
              </>
            ) : (
              <>
                <label htmlFor="username">Benutzername</label>
                <div className="login-input">
                  <User />
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Benutzername eingeben"
                    required
                  />
                </div>
                <div className="login-password-label">
                  <label htmlFor="password">Passwort</label>
                  <span>Geschützter Zugang</span>
                </div>
                <div className="login-input">
                  <LockKey />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Passwort eingeben"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeSlash /> : <Eye />}
                  </button>
                </div>
              </>
            )}
            {message && (
              <div className="login-error" role="alert">
                {message}
              </div>
            )}
            <button className="login-submit" type="submit" disabled={pending}>
              {pending ? (
                <>
                  <span className="login-spinner" />
                  Anmeldung wird geprüft …
                </>
              ) : (
                <>
                  Sicher anmelden <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>
          <div className="login-support">
            <ShieldCheck />
            <span>
              <strong>Probleme bei der Anmeldung?</strong>
              <small>Wende dich an deine CareCore-Administration.</small>
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
