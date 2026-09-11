# CareCore Sidebar – Design QA

## Prüfgrundlage

- Source of visual truth (Aufbau): `/Users/alexander/Downloads/ChatGPT Image 7. Sept. 2026, 23_17_02.png`
- Source of visual truth (Farbsemantik): `/Users/alexander/Downloads/CareCore – Product Requirements Document (PRD).md`, Kapitel 50–52
- Source of visual truth (Körperkarte): `/Users/alexander/Desktop/Bildschirmfoto 2026-09-09 um 21.26.37.png`
- Implementierung, ausgeklappt: `/Users/alexander/CareCore/qa-sidebar-blue-final.png`
- Implementierung, eingeklappt: `/Users/alexander/CareCore/qa-sidebar-blue-collapsed-final.png`
- Implementierung mit finalem 6-Pixel-Radius: `/Users/alexander/CareCore/qa-radius-6px-final.png`
- Vergrößerter Such-Popover: `/Users/alexander/CareCore/qa-search-popover-large-final.png`
- Vollständig deutsche Webnavigation: `/Users/alexander/CareCore/qa-navigation-german-final.png`
- Bewohnerverzeichnis, Desktop: `/Users/alexander/CareCore/qa-residents-page-final.png`
- Bewohnerverzeichnis, Mobil: `/Users/alexander/CareCore/qa-residents-page-mobile.png`
- Vollflächige Bewohnerakte, Desktop: `/Users/alexander/CareCore/qa-resident-record-fullscreen.png`
- Vollflächige Bewohnerakte, Mobil: `/Users/alexander/CareCore/qa-resident-record-fullscreen-mobile.png`
- Dokumentationsansicht in der Bewohnerakte, Desktop: `/Users/alexander/CareCore/qa-resident-documentation-view.png`
- Dokumentationsansicht in der Bewohnerakte, Mobil: `/Users/alexander/CareCore/qa-resident-documentation-mobile.png`
- Dokumentationskennzeichnungen, Desktop: `/Users/alexander/CareCore/qa-documentation-flags.png`
- Dokumentationskennzeichnungen, Mobil: `/Users/alexander/CareCore/qa-documentation-flags-mobile.png`
- Stammdatenansicht, Desktop: `/Users/alexander/CareCore/qa-resident-master-data.png`
- Stammdatenansicht, Mobil: `/Users/alexander/CareCore/qa-resident-master-data-mobile.png`
- Pflegeaktenansicht, Desktop: `/Users/alexander/CareCore/qa-resident-care-record.png`
- Pflegeaktenansicht, Mobil: `/Users/alexander/CareCore/qa-resident-care-record-mobile.png`
- Körperübersicht, Desktop: `/Users/alexander/CareCore/qa-resident-body-map-desktop.jpg`
- Körperübersicht, Mobil mit geöffnetem Befund: `/Users/alexander/CareCore/qa-resident-body-map-mobile.jpg`
- Körperübersicht im Referenzformat: `/Users/alexander/CareCore/qa-resident-body-map-reference-viewport.jpg`
- Direkter Körperkartenvergleich: `/Users/alexander/CareCore/qa-resident-body-map-comparison.jpg`
- Verlaufsansicht, Desktop: `/Users/alexander/CareCore/qa-resident-history-desktop.jpg`
- Verlaufsansicht, Mobil: `/Users/alexander/CareCore/qa-resident-history-mobile.jpg`
- Dokumentenansicht, Desktop: `/Users/alexander/CareCore/qa-resident-documents-desktop.jpg`
- Dokumentenansicht, Mobil mit aktiver Suche: `/Users/alexander/CareCore/qa-resident-documents-mobile.jpg`
- Wundübersicht, Desktop: `/Users/alexander/CareCore/qa-wound-overview-desktop.jpg`
- Wundübersicht, Mobil: `/Users/alexander/CareCore/qa-wound-overview-mobile.jpg`
- Bereichsweiter Bewohnerverlauf, Desktop: `/Users/alexander/CareCore/qa-resident-overall-history-desktop.jpg`
- Bereichsweiter Bewohnerverlauf, Mobil: `/Users/alexander/CareCore/qa-resident-overall-history-mobile.jpg`
- Wunddokumentation, Desktop: `/Users/alexander/CareCore/qa-wound-documentation-desktop.jpg`
- Wunddokumentation, Mobil: `/Users/alexander/CareCore/qa-wound-documentation-mobile.jpg`
- Hausweiter Bewohnerverlauf und Archiv, Desktop: `/Users/alexander/CareCore/qa-house-resident-history-desktop.jpg`
- Hausweiter Bewohnerverlauf und Archiv, Mobil: `/Users/alexander/CareCore/qa-house-resident-history-mobile.jpg`
- Direkter Vergleich: `/Users/alexander/CareCore/qa-sidebar-blue-comparison-final.png`
- Viewport: 1536 × 1024 CSS-Pixel, Device Pixel Ratio 1
- Source und Implementierung: jeweils 1536 × 1024 Pixel; Vergleich ohne Dichteskalierung
- Zustand: Desktop, Operations geöffnet, Shift aktiv; zusätzlich eingeklappte Navigation
- Körperkartenvergleich: Quelle und Implementierung jeweils 658 × 1356 Pixel bei DPR 1; Bewohnerakte „Hans Müller“, Übersicht, Befund „Rötung“ geöffnet

## Full-view comparison evidence

Der direkte Vergleich bestätigt, dass Aufbau, Breite, dunkle Seitenleiste, Markenbereich, aktive Navigationsfläche, Menügruppen und unterer Servicebereich der Referenz folgen. Die neue CareCore-Fassung verwendet bewusst ein deutlich blaues Navy-Spektrum statt des neutralen Anthrazits der Referenz.

## Focused region comparison evidence

Die Sidebar wurde zusätzlich separat in beiden Zuständen geprüft. Der aktive Menüpunkt verwendet ein klares Informationsblau, der aktive Unterpunkt Hellblau und die eingeklappte Navigation bewahrt alle Module als erkennbare Icon-Buttons. Primäre, sekundäre und leise Aktionen nutzen abgestufte Blauzustände. Für die neue Körperübersicht wurden Quelle und Implementierung bei identischen 658 × 1356 Pixeln in einer gemeinsamen Vergleichsdatei geprüft: Ganzkörperfigur, farbige Marker und klare Stellenlokalisierung entsprechen dem Referenzprinzip; das aufklappbare CareCore-Detail ergänzt die fachlich benötigten Informationen und Verlinkungen.

## Required fidelity surfaces

- Fonts und Typografie: Hierarchie, Gewichte, Zeilenhöhen und Beschriftungen bleiben gegenüber der geprüften vorherigen Fassung unverändert und ohne Überlauf.
- Spacing und Layout: Sidebar-Breite, Abstände, Kartenraster und responsive Zustände bleiben stabil. Alle nicht-avatarbezogenen Rundungsdefinitionen verwenden einheitlich `6px`; Profil- und Bewohneravatare bleiben mit `50%` kreisrund.
- Farben und Tokens: `#2563eb` als Primary, `#1d4ed8` als Primary Dark, `#eaf1ff` als Primary Soft und `#0b1f3a` als Navigation. Grün bleibt ausschliesslich Success, Gelb Attention und Rot Critical entsprechend der PRD.
- Bild- und Iconqualität: Phosphor-Vektoricons bleiben scharf und konsistent. Die neue, wasserzeichenfreie Körperillustration ist eine eigenständige 1024 × 1536 Pixel große RGBA-Grafik mit transparentem Hintergrund und bleibt auf Desktop und Mobil klar lesbar.
- Copy und Inhalt: PRD-Module, Untermenüs und Dashboard-Inhalte wurden unverändert erhalten. Körperstellen werden fachlich aus Bewohnerperspektive als rechte Schulter, linker Unterarm und rechtes Knie bezeichnet.

## Findings

Keine verbleibenden P0-, P1- oder P2-Abweichungen. Die PRD nennt keine festen Hexwerte; die gewählte Blaupalette ist daher eine begründete Design-System-Auslegung der geforderten Informations- und Interaktionsfarbe. Die Körperübersicht übernimmt bewusst das Lokalisierungsprinzip der Referenz, nicht deren englische Beschriftungen oder wasserzeichenbehaftete Anatomiegrafik.

## Vergleichsverlauf

1. Vorherige Fassung: CareCore Primary und mehrere Interaktionszustände waren türkis; die Sidebar wirkte dunkelgrünlich. Das widersprach dem expliziten Wunsch nach Blau.
2. Korrektur: Globale Primary-Tokens, Sidebar-Verlauf, aktive Navigation, Untermenüs, Fokus, Avatare, Filter, Suchzustände, Toast und Button-Schatten wurden auf Blau umgestellt. Semantische Statusfarben wurden bewusst nicht vereinheitlicht.
3. Post-Fix-Evidenz: Ausgeklappte und eingeklappte Desktop-Screenshots bestätigen die konsistente Palette; Browser-Konsole ohne Fehler.
4. Radius-Normalisierung: Karten, Buttons, Dialoge, Badges, Statusmarken und Navigation wurden auf exakt `6px` vereinheitlicht. Profil- und Bewohneravatare wurden anschließend gezielt auf `50%` gesetzt. Der berechnete Browserstil enthält ausschließlich `6px` und die Avatar-Ausnahme `50%`.
5. Such-Popover: Die Desktopfläche wurde auf 860 × 620 Pixel vergrößert. Auf Mobilgeräten passt sie sich bis auf 466 × 620 Pixel an, ohne den Viewport zu verlassen.
6. Lokalisierung: Sämtliche Navigationsbereiche, Module und Untermenüs wurden in deutsche Fachbegriffe übertragen. Der sichtbare Navigationsbaum enthält keine vorherigen englischen Menübezeichnungen mehr.
7. Bewohnerseite: Der Menüpunkt „Bewohner“ verlinkt jetzt direkt auf `/bewohner`. Die neue responsive Übersicht enthält Kennzahlen, Verzeichnissuche, Wohnbereichsfilter, Statuskennzeichnung und eine Detail-Schublade mit Schnellaktionen.
8. Bewohnerakte: Der bisherige schmale Drawer wurde auf der Bewohnerseite durch eine eigenständige, vollflächige Dialog-Komponente ersetzt. Sie fährt von rechts ein, belegt `100vw × 100dvh` und hat einen Außenradius von exakt `0px`. Desktop- und Mobilansicht sowie Schließen per Button und Escape wurden geprüft.
9. Dokumentation: Tab, Schnellaktion und bestehende Dokumentationspunkte wechseln den Inhalt innerhalb derselben Bewohnerakte. Das responsive Formular unterstützt Neuaufnahme und Bearbeitung; ein automatischer Scroll-Reset hält den Ansichtsanfang sichtbar. Die Öffnungsanimation nutzt nur noch eine kurze GPU-beschleunigte Distanz von 42 Pixeln über 180 Millisekunden.
10. Kennzeichnung: Dokumentationseinträge können unabhängig als „Wichtig“, „Wichtig für Visite“, „Beobachtungsphase“ und „Übergaberelevant“ markiert werden. Bestehende Einträge erhalten kontextabhängige Vorbelegungen; Attention bleibt gelb und funktionale Auswahlzustände bleiben blau.
11. Stammdaten: Direkt nach „Übersicht“ steht ein eigener Stammdaten-Tab bereit. Die responsive Ansicht bündelt persönliche Angaben, Aufenthalt, medizinische Kontakte, Notfallkontakt und Versicherung und unterstützt einen klaren Bearbeitungs- und Speicherzustand innerhalb derselben Bewohnerakte.
12. Pflegeakte: Der Tab „Pflegeakte“ zeigt ein vollständiges Pflegeprofil mit sechs interaktiv auswählbaren Pflegebereichen, dynamischen Zielen und Maßnahmen, aktuellen Prioritäten, Assessments und beteiligten Fachpersonen. Der Wechsel bleibt innerhalb desselben vollflächigen Dialogs.
13. Direktzugriff: Die Schnellaktionen stehen nun als eigene, horizontale Leiste unmittelbar unter Bezugspflege, Vitalwerten, Medikation und Termin. Acht Aktionen decken Dokumentation, Vitalwerte, Medikation, Aufgaben, Pflegeplanung, Wunden, Trinkmenge und Einschätzungen ab; das Raster reagiert mit acht, vier oder zwei Spalten auf die verfügbare Breite.
14. Körperübersicht: Unter dem Direktzugriff wurde die Übersicht neu geordnet. Eine responsive Ganzkörperkarte zeigt Rötung, Wunde und Fraktur als interaktive Marker; jeder Marker öffnet exakt einen zugehörigen Detailbereich mit Beschreibung, Zeitpunkt, verantwortlicher Person und Verlinkungen. Ein anfänglicher Exportfehler der Bildoptimierung wurde durch den statisch kompatiblen Bildmodus behoben. Die klinische Seitenangabe wurde anschließend auf die Bewohnerperspektive korrigiert und im erneuten Browservergleich bestätigt.
15. Verlauf und Dokumente: Beide bisher nur beschrifteten Tabs besitzen jetzt eigenständige, responsive Ansichten innerhalb derselben Bewohnerakte. Der Verlauf bietet Kennzahlen, fünf funktionale Fachfilter, Tagesgruppen, Detailaktionen und Fokusinformationen. Die Dokumentenablage bietet Kennzahlen, Volltextsuche mit deutscher Wortstamm-Toleranz, fünf Kategorien, Statusangaben, Leerzustand sowie Ansehen- und Downloadaktionen.
16. Wundübersicht: Der Untermenüpunkt „Wundübersicht“ öffnet jetzt die eigenständige statische Route `/wundmanagement`. Die responsive Seite bündelt Wundkennzahlen, kritische Hinweise, Suche, vier Statusfilter, Heilungsfortschritt, dynamische Fallauswahl und anstehende Versorgungen. Auf Mobil bleibt „Neue Wunde erfassen“ erreichbar und die Kennzahlen werden platzsparend als 2×2-Raster dargestellt.
17. Bereichsverlauf und Wunddokumentation: „Bewohner → Verlauf“ öffnet jetzt `/bewohner/verlauf` mit chronologischen Einträgen, Fachfiltern, Suche, Detailauswahl und offenen Beobachtungen. „Wundmanagement → Dokumentation“ öffnet `/wundmanagement/dokumentation` mit Statusfiltern, Volltextsuche, dynamischer Befund- und Massnahmenansicht sowie Tagesaufgaben. Beide Seiten sind als eigenständige statische Next.js-Routen umgesetzt und zeigen den aktiven Untermenüpunkt korrekt an.
18. Hausweiter Bewohnerverlauf: Die Verlaufsroute wurde zu „Bewohnerverlauf & Archiv“ erweitert. Die Demo zeigt 16 Bewohnerakten aus vier Wohnbereichen mit den Stati Aktiv, Verlegt, Ausgetreten und Verstorben. Volltextsuche, Wohnbereichsauswahl und Statusfilter sind kombinierbar; historische Akten erhalten angepasste Archivaktionen und einen Datenschutzhinweis.

## Primäre Interaktionen

- Sidebar ein- und ausgeklappt
- PRD-Module im eingeklappten Zustand geprüft
- Primärer CTA, sekundärer Button und Navigation visuell geprüft
- Such-Popover geöffnet, gefiltert und geschlossen; Desktop- und Mobilgröße geprüft
- Alle fünf deutschen Navigationsbereiche geöffnet und alle 19 Modulbezeichnungen geprüft
- Navigation von der Startseite zur Bewohnerseite, Suche, Wohnbereichsfilter und Bewohnerdetail geprüft
- Bewohnerseite bei 1536 × 1024 und 506 × 890 CSS-Pixel geprüft
- Vollflächige Bewohnerakte und Schnellaktionen bei 1536 × 1024 und 506 × 890 CSS-Pixel geprüft
- Interner Wechsel zur Dokumentationsansicht, Bearbeitung, Speichern und Rückkehr zur Übersicht geprüft; dabei bleibt exakt ein Dialog geöffnet
- Mehrfachauswahl, Vorbelegung und Speichern der vier Dokumentationskennzeichnungen auf Desktop und Mobil geprüft
- Tab-Reihenfolge, vollständige Stammdatenbereiche, Bearbeitungsmodus und Speichern auf Desktop und Mobil geprüft
- Pflegeakten-Tab, sechs Pflegebereiche, dynamischer Detailwechsel und Aktionen auf Desktop und Mobil geprüft
- Horizontaler Direktzugriff mit acht Aktionen auf Desktop und Mobil geprüft; Dokumentation und Pflegeplanung wechseln innerhalb derselben Bewohnerakte
- Körpermarker, drei Befund-Dropdowns und Verlinkungen zu Dokumentation, Pflegeakte und Wundmanagement auf Desktop und Mobil geprüft
- Direkter Körperkartenvergleich bei 658 × 1356 Pixeln geprüft; keine P0-, P1- oder P2-Abweichungen
- Verlaufsfilter, chronologische Tagesgruppen und interne Verlinkung zur Dokumentation auf Desktop und Mobil geprüft
- Dokumentensuche, Kategorien, Leerzustand, Ansehen und Download auf Desktop und Mobil geprüft
- Navigation zur Wundübersicht, Statusfilter, Suche, Fallauswahl, Wundakte und Verlaufserfassung auf Desktop und Mobil geprüft
- Sidebar-Navigation von der Wundübersicht zur Wunddokumentation und von der Bewohnerübersicht zum bereichsweiten Verlauf geprüft
- Wunddokumentationsfilter „Entwurf“, dynamische Fallauswahl und Detailansicht auf Desktop geprüft
- Bereichsweiter Bewohnerverlauf und Wunddokumentation bei 1440 × 1000 sowie 390 × 844 CSS-Pixel geprüft
- Kombinierte Filterung nach „Verstorben“ und „Wohnbereich 3“, Archivdetail für Johanna Suter sowie Volltextsuche nach „Spitex“ geprüft
- Hausweiter Bewohnerverlauf bei Desktopbreite und 390 × 844 CSS-Pixel geprüft; Browserkonsole ohne Fehler
- Browser-Konsole auf Fehler geprüft
- Lint und Produktions-Build erfolgreich

## Follow-up polish

Kein blockierender Nachlauf. Optional kann später ein zweites, etwas entsättigteres Blau als Enterprise-Branding-Variante angeboten werden.

## Ergebnis

passed
