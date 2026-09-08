# CareCore Sidebar – Design QA

## Prüfgrundlage

- Source of visual truth (Aufbau): `/Users/alexander/Downloads/ChatGPT Image 7. Sept. 2026, 23_17_02.png`
- Source of visual truth (Farbsemantik): `/Users/alexander/Downloads/CareCore – Product Requirements Document (PRD).md`, Kapitel 50–52
- Implementierung, ausgeklappt: `/Users/alexander/CareCore/qa-sidebar-blue-final.png`
- Implementierung, eingeklappt: `/Users/alexander/CareCore/qa-sidebar-blue-collapsed-final.png`
- Implementierung mit finalem 6-Pixel-Radius: `/Users/alexander/CareCore/qa-radius-6px-final.png`
- Vergrößerter Such-Popover: `/Users/alexander/CareCore/qa-search-popover-large-final.png`
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

## Primäre Interaktionen

- Sidebar ein- und ausgeklappt
- PRD-Module im eingeklappten Zustand geprüft
- Primärer CTA, sekundärer Button und Navigation visuell geprüft
- Such-Popover geöffnet, gefiltert und geschlossen; Desktop- und Mobilgröße geprüft
- Browser-Konsole auf Fehler geprüft
- Lint und Produktions-Build erfolgreich

## Follow-up polish

Kein blockierender Nachlauf. Optional kann später ein zweites, etwas entsättigteres Blau als Enterprise-Branding-Variante angeboten werden.

## Ergebnis

passed
