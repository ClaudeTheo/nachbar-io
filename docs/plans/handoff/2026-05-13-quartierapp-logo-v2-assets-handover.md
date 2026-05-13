# QuartierApp Logo v2 Assets — Handover fuer Claude und Codex

**Datum:** 2026-05-13  
**Status:** lokal committed, noch nicht gepusht  
**Kontext:** Founder wollte das runde QuartierApp-Logo exakt nach seiner Vorlage sichern. Keine freie Vektorinterpretation mehr.

## Founder-Entscheidung

- Die Logo-Richtung ist das runde QuartierApp-Symbol aus der vom Founder markierten Vorlage:
  - Haus/Quartier in der Mitte
  - Standort-Pin unten
  - Personen-/Community-Bogen links/rechts/oben
  - Hochrhein-Welle unten
  - Farben: Gruen, Gelb/Orange, Blau, Anthrazit bzw. Weiss auf Dunkel
- Wichtig: Das Logo soll nicht ungefaehr nachgebaut werden, sondern wie die Vorlage wirken.
- Deshalb ist der PNG-Master autoritativ. Die SVG-Dateien sind bewusst Raster-Wrapper mit eingebettetem PNG, keine freie Pfad-Vektorzeichnung.

## Asset-Pfade

Basisordner:

```text
public/brand/quartierapp-logo-v2/
```

Wichtige Dateien:

```text
quartierapp-logo-v2-symbol.png
quartierapp-logo-v2-symbol.webp
quartierapp-logo-v2-symbol.svg
quartierapp-logo-v2-symbol-square.png
quartierapp-logo-v2-symbol-square.webp
quartierapp-logo-v2-symbol-on-dark.png
quartierapp-logo-v2-symbol-on-dark.webp
quartierapp-logo-v2-symbol-on-dark.svg
quartierapp-logo-v2-app-icon-1024.png
quartierapp-logo-v2-app-icon-512.png
quartierapp-logo-v2-app-icon-256.png
quartierapp-logo-v2-app-icon-180.png
quartierapp-logo-v2-app-icon-64.png
quartierapp-logo-v2-app-icon-32.png
quartierapp-logo-v2-app-icon.svg
quartierapp-logo-concepts-transparent-sheet.png
```

## Verwendung

- Fuer helle Flaechen:
  - `quartierapp-logo-v2-symbol.png`
  - oder `quartierapp-logo-v2-symbol.svg`
- Fuer schwarze/anthrazitfarbene Flaechen:
  - `quartierapp-logo-v2-symbol-on-dark.png`
  - oder `quartierapp-logo-v2-symbol-on-dark.svg`
  - In dieser Variante sind Haus und Person weiss, damit sie sichtbar bleiben.
- Fuer App-/PWA-Icons:
  - `quartierapp-logo-v2-app-icon-1024.png`
  - kleinere Icon-Dateien je nach Zielgroesse.

## Technische Notizen

- `quartierapp-logo-v2-symbol.svg` bettet den PNG-Master 1:1 als Base64 ein.
- `quartierapp-logo-v2-symbol-on-dark.svg` bettet die Dark-Background-Variante 1:1 als Base64 ein.
- `quartierapp-logo-v2-symbol-mono.svg` ist nur eine Kompatibilitaetsdatei und ebenfalls kein echtes Mono-Vektorlogo.
- Ein echtes Pfad-Vektorlogo darf spaeter nur separat und nach visueller Founder-Freigabe erstellt werden.
- Nicht neu generieren, nicht frei nachzeichnen, nicht stilistisch veraendern, solange keine neue Founder-Anweisung kommt.

## Aktuelle lokale Commits

```text
439f450 feat(brand): add generation mode assets and logo v2 svg
2e9262b fix(brand): round logo v2 svg mark
f0434d8 fix(brand): embed exact logo v2 reference
9e12519 feat(brand): add logo v2 dark variant
```

## Offener Punkt

- Noch nicht gepusht. Stand vor diesem Handoff: `master` lokal `ahead 4` gegen `origin/master`.
- Dieses Handoff soll mit dem naechsten lokalen Commit dazukommen.
