CareCore ist eine Next.js-Anwendung mit geschütztem Pflegearbeitsplatz unter `/c` und einer Neon-Postgres-basierten Anmeldung.

## Lokale Einrichtung

1. `.env.example` als `.env.local` kopieren.
2. `DATABASE_URL` mit der gepoolten Neon-Verbindungsadresse und `CARECORE_ADMIN_PASSWORD` (mindestens 12 Zeichen) befüllen.
3. `npm install`, dann `npm run db:migrate` und anschließend `npm run dev` ausführen.

Beim ersten Anmeldeversuch wird der Administrator `Admin` mit dem Passwort aus `CARECORE_ADMIN_PASSWORD` angelegt.

## Datenbank-Migrationen

Das Schema wird ausschließlich über nummerierte SQL-Dateien in `database/migrations` verwaltet; die Anwendung legt zur Laufzeit keine Tabellen an. Das Schema deckt Organisationen, Wohnbereiche, Bewohner, Pflegeplanung, Dokumentation, Assessments, Vitalwerte, Medikation, Wunden, Ernährung, Dienste, Aufgaben, Übergaben, Kommunikation, Dokumente, Schulungen, Qualität, RAI, KI-Entwürfe, Benachrichtigungen und Auditierung ab.

```bash
npm run db:migrate            # ausstehende Migrationen anwenden
npm run db:migrate -- --dry-run   # nur anzeigen, was ausstehend ist
```

Angewendete Migrationen werden mit Prüfsumme in `carecore_schema_migrations` festgehalten. Eine bereits angewendete Datei darf nicht mehr verändert werden – Schemaänderungen kommen immer als neue Datei hinzu, z. B. `0002_medication_orders.sql`. Jede Migration läuft in einer Transaktion.

Auf Vercel führt das Skript `vercel-build` die Migrationen vor `next build` aus, allerdings nur für Production-Deployments: Preview-Deployments nutzen dieselbe Datenbank und dürfen das Schema nicht verändern.

Danach können leere Fach-Tabellen mit wiederholbar ausführbaren Beispieldaten befüllt werden:

```bash
npm run db:seed
```

Der Seed überspringt Tabellen, die bereits Daten enthalten. Vorhandene Bewohner-, Mitarbeiter- und Organisationsdaten werden nicht überschrieben. In der aktuellen Demo lesen und schreiben Bewohneraufnahme, Aufgaben, Pflegedokumentation und Benachrichtigungen über Neon. Die Startseite zeigt Bewohner, Aufgaben und dokumentierte Änderungen aus Neon. Andere Fachansichten enthalten teilweise noch lokale Demonstrationsdaten und sind noch keine vollständig persistierten Arbeitsabläufe.

Für Vercel müssen `DATABASE_URL` und `CARECORE_ADMIN_PASSWORD` in den Umgebungsvariablen des Projekts für Production, Preview und Development gesetzt sein. Die Anwendung benötigt den normalen Next.js-Serverbetrieb; ein statischer Export ist wegen Login, Sessions und Datenbankzugriff nicht möglich.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
