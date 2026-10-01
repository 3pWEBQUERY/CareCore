import { CheckCircle, Pulse, ShieldCheck } from "@phosphor-icons/react";

// Linke Seite der Anmeldung (Marke und Hinweise); auch auf „Passwort setzen“.
export function LoginBrandPanel() {
  return (
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
  );
}
