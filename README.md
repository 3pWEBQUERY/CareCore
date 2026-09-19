CareCore ist eine Next.js-Anwendung mit geschütztem Pflegearbeitsplatz unter `/c` und einer Neon-Postgres-basierten Anmeldung.

## Lokale Einrichtung

1. `.env.example` als `.env.local` kopieren.
2. `DATABASE_URL` mit der gepoolten Neon-Verbindungsadresse befüllen.
3. `npm install` und anschließend `npm run dev` ausführen.

Beim ersten Anmeldeversuch werden die Tabellen `carecore_users` und `carecore_sessions` angelegt und der initiale Administrator sicher mit einem Scrypt-Passworthash eingetragen. Alternativ kann `database/schema.sql` einmalig im Neon SQL Editor ausgeführt werden.

## Gesamtes Datenbankschema migrieren

Das vollständige CareCore-Schema liegt in `database/schema.sql`. Es deckt Organisationen, Wohnbereiche, Bewohner, Pflegeplanung, Dokumentation, Assessments, Vitalwerte, Medikation, Wunden, Ernährung, Dienste, Aufgaben, Übergaben, Kommunikation, Dokumente, Schulungen, Qualität, RAI, KI-Entwürfe, Benachrichtigungen und Auditierung ab.

Mit einer gültigen Neon-Verbindungsadresse wird es idempotent eingespielt:

```bash
node --env-file=.env.local database/apply-schema.mjs
```

Für Vercel muss `DATABASE_URL` in den Umgebungsvariablen des Projekts für Production, Preview und Development gesetzt werden. Die Anwendung benötigt den normalen Next.js-Serverbetrieb; ein statischer Export ist wegen Login, Sessions und Datenbankzugriff nicht möglich.

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
