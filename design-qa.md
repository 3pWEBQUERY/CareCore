# CareCore Sidebar – Design QA

## Prüfgrundlage

- Source of visual truth (Aufbau): `/Users/alexander/Downloads/ChatGPT Image 7. Sept. 2026, 23_17_02.png`
- Source of visual truth (Farbsemantik): `/Users/alexander/Downloads/CareCore – Product Requirements Document (PRD).md`, Kapitel 50–52
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
- Direkter Vergleich: `/Users/alexander/CareCore/qa-sidebar-blue-comparison-final.png`
- Viewport: 1536 × 1024 CSS-Pixel, Device Pixel Ratio 1
- Source und Implementierung: jeweils 1536 × 1024 Pixel; Vergleich ohne Dichteskalierung
- Zustand: Desktop, Operations geöffnet, Shift aktiv; zusätzlich eingeklappte Navigation

## Full-view comparison evidence

Der direkte Vergleich bestätigt, dass Aufbau, Breite, dunkle Seitenleiste, Markenbereich, aktive Navigationsfläche, Menügruppen und unterer Servicebereich der Referenz folgen. Die neue CareCore-Fassung verwendet bewusst ein deutlich blaues Navy-Spektrum statt des neutralen Anthrazits der Referenz.

## Focused region comparison evidence

Die Sidebar wurde zusätzlich separat in beiden Zuständen geprüft. Der aktive Menüpunkt verwendet ein klares Informationsblau, der aktive Unterpunkt Hellblau und die eingeklappte Navigation bewahrt alle Module als erkennbare Icon-Buttons. Primäre, sekundäre und leise Aktionen nutzen abgestufte Blauzustände.

## Required fidelity surfaces

- Fonts und Typografie: Hierarchie, Gewichte, Zeilenhöhen und Beschriftungen bleiben gegenüber der geprüften vorherigen Fassung unverändert und ohne Überlauf.
- Spacing und Layout: Sidebar-Breite, Abstände, Kartenraster und responsive Zustände bleiben stabil. Alle nicht-avatarbezogenen Rundungsdefinitionen verwenden einheitlich `6px`; Profil- und Bewohneravatare bleiben mit `50%` kreisrund.
- Farben und Tokens: `#2563eb` als Primary, `#1d4ed8` als Primary Dark, `#eaf1ff` als Primary Soft und `#0b1f3a` als Navigation. Grün bleibt ausschliesslich Success, Gelb Attention und Rot Critical entsprechend der PRD.
- Bild- und Iconqualität: Phosphor-Vektoricons bleiben scharf und konsistent; keine sichtbaren Rasterartefakte.
- Copy und Inhalt: PRD-Module, Untermenüs und Dashboard-Inhalte wurden unverändert erhalten.

## Findings

Keine verbleibenden P0-, P1- oder P2-Abweichungen. Die PRD nennt keine festen Hexwerte; die gewählte Blaupalette ist daher eine begründete Design-System-Auslegung der geforderten Informations- und Interaktionsfarbe.

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
- Browser-Konsole auf Fehler geprüft
- Lint und Produktions-Build erfolgreich

## Follow-up polish

Kein blockierender Nachlauf. Optional kann später ein zweites, etwas entsättigteres Blau als Enterprise-Branding-Variante angeboten werden.

## Ergebnis

passed
