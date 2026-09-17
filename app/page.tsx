"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Eye, EyeSlash, LockKey, Pulse, ShieldCheck, User } from "@phosphor-icons/react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      router.replace(requestedPath?.startsWith("/c") ? requestedPath : "/c");
      router.refresh();
    } catch {
      setError("Die Verbindung zum CareCore-Arbeitsplatz konnte nicht hergestellt werden.");
    } finally {
      setPending(false);
    }
  }

  return <main className="login-page">
    <section className="login-brand-panel" aria-label="CareCore Produktinformation">
      <div className="login-brand"><span><Pulse weight="regular"/></span><div><strong>CareCore</strong><small>Mehr Zeit für Pflege.</small></div></div>
      <div className="login-brand-copy"><p className="eyebrow">Sicherer Pflegearbeitsplatz</p><h1>Alles Wichtige für deinen Dienst. An einem Ort.</h1><p>Bewohnerinformationen, Aufgaben, Dokumentation und Übergaben – strukturiert, sicher und für dein Team verfügbar.</p></div>
      <div className="login-trust-list"><span><ShieldCheck/><span><strong>Datenschutz im Mittelpunkt</strong><small>Geschützte Sitzungen und rollenbasierter Zugriff.</small></span></span><span><CheckCircle/><span><strong>Für den Pflegealltag gebaut</strong><small>Klare Abläufe ohne unnötige Umwege.</small></span></span></div>
      <footer>CareCore · Alterszentrum Sonnengarten</footer>
    </section>

    <section className="login-form-panel">
      <div className="login-form-wrap">
        <div className="login-mobile-brand"><span><Pulse/></span><strong>CareCore</strong></div>
        <div className="login-heading"><p className="eyebrow">Willkommen zurück</p><h2>Bei CareCore anmelden</h2><p>Melde dich mit deinem persönlichen Benutzerkonto an.</p></div>
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="username">Benutzername</label>
          <div className="login-input"><User/><input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Benutzername eingeben" required autoFocus/></div>
          <div className="login-password-label"><label htmlFor="password">Passwort</label><span>Geschützter Zugang</span></div>
          <div className="login-input"><LockKey/><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Passwort eingeben" required/><button type="button" aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeSlash/> : <Eye/>}</button></div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={pending}>{pending ? <><span className="login-spinner"/>Anmeldung wird geprüft …</> : <>Sicher anmelden <span aria-hidden="true">→</span></>}</button>
        </form>
        <div className="login-support"><ShieldCheck/><span><strong>Probleme bei der Anmeldung?</strong><small>Wende dich an deine CareCore-Administration.</small></span></div>
      </div>
    </section>
  </main>;
}
