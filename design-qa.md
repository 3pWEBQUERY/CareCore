# CareCore Sidebar – Design QA

## Prüfgrundlage

- Source of visual truth: `/Users/alexander/Downloads/ChatGPT Image 7. Sept. 2026, 23_17_02.png`
- Implementierung, ausgeklappt: `/Users/alexander/CareCore/qa-sidebar-expanded-final.png`
- Implementierung, eingeklappt: `/Users/alexander/CareCore/qa-sidebar-collapsed-final.png`
- Direkter Vergleich: `/Users/alexander/CareCore/qa-sidebar-comparison-final.png`
- Viewport: 1536 × 1024 CSS-Pixel, Device Pixel Ratio 1
- Geprüfter Zustand: Desktop, Operations geöffnet, Shift aktiv; zusätzlich Clinical → Residents mit Untermenü sowie eingeklappte Icon-Navigation

## Vollansicht

Die Desktop-Ansicht übernimmt die wesentlichen visuellen Merkmale der Referenz: eine dunkelblaue, klar vom hellen Arbeitsbereich getrennte Sidebar, eine kompakte Markenfläche, dezente Trennlinien, helle Icons und Typografie, einen hervorgehobenen aktiven Menüpunkt sowie Einstellungen und Hilfe am unteren Rand.

## Fokusbereich Sidebar

- Die Navigation ist entsprechend der PRD in Clinical, Operations, Workforce, Management und Intelligence gegliedert.
- Sämtliche CareCore-Module sind vorhanden und besitzen kontextbezogene Untermenüs.
- Gruppen und Module lassen sich unabhängig öffnen und schliessen.
- Die Sidebar lässt sich auf eine 78 Pixel breite Icon-Navigation reduzieren und wieder ausklappen.
- Der aktive Bereich Shift und der aktive Unterpunkt Mein Dienst bleiben eindeutig erkennbar.
- Die Navigation ist mit semantischen Buttons, sichtbaren Fokuszuständen und passenden `aria-label`-Attributen bedienbar.

## Interaktionen und Technik

- Aus- und Einklappen erfolgreich getestet.
- Clinical → Residents geöffnet; Übersicht, Timeline und Pflegeakte im Accessibility-Baum bestätigt.
- Alle PRD-Bereiche sind in der eingeklappten Navigation als beschriftete Icon-Buttons erreichbar.
- Browser-Konsole: keine Fehler.
- Produktions-Build: erfolgreich.

## Iterationsverlauf

1. Die erste eingeklappte Fassung hatte eine zu enge Position des Umschalters am Logo. Der Schalter wurde unter die Markenfläche versetzt und der Navigationsabstand angepasst.
2. Die Sichtbarkeit des Umschalters war zunächst zu stark an Hover gebunden. Er ist jetzt dauerhaft erkennbar und erhält bei Hover beziehungsweise Tastaturfokus eine stärkere Hervorhebung.
3. Der finale Vergleich bestätigt eine konsistente visuelle Hierarchie ohne verbleibende P0-, P1- oder P2-Abweichungen.

## Bewusste Abweichungen

Die Referenz zeigt eine flache Navigation. Für CareCore wurde sie bewusst um die in der PRD geforderte Produktstruktur und Untermenüs erweitert. Logo, Produktname und aktive Inhalte bleiben CareCore-spezifisch; die visuelle Sprache der Referenz wurde übernommen, nicht deren fremde Marke.

## Ergebnis

passed
