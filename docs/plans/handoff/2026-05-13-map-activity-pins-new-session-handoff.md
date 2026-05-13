# New-Session-Handoff - Map Activity Pins

**Datum:** 2026-05-13  
**Von:** Codex  
**An:** naechste Codex/Claude-Session  
**Status:** Plan und Designrichtung gesichert, noch nicht umgesetzt  

## TL;DR

Founder will die leuchtenden Marker aus dem ausgewaehlten Jugend-Hero als echte interaktive Pins auf der OpenStreetMap/Leaflet-Karte. OpenStreetMap bleibt nur die Grundkarte; QuartierApp legt eigene Pins als Layer darueber. Pins muessen exakt dieselbe Designfamilie haben: leuchtender Tropfen, weisses Symbol, Glow, Nachtkarten-Wirkung. Sichtbarkeit muss serverseitig gefiltert werden.

## Relevante Dateien

Plan:

```text
docs/plans/2026-05-13-map-activity-pins-plan.md
```

Jugend-Visual:

```text
docs/plans/2026-05-13-jugend-app-visual-direction-design.md
public/brand/generation-modes/youth-social-neighborhood-hero-wide.webp
public/brand/generation-modes/youth-social-neighborhood-hero-app-header.webp
```

Logo:

```text
docs/plans/handoff/2026-05-13-quartierapp-logo-v2-assets-handover.md
public/brand/quartierapp-logo-v2/
```

Bestehende Map-Infrastruktur:

```text
components/NachbarKarte.tsx
components/LeafletKarte.tsx
components/LeafletMapInner.tsx
components/NachbarKarteSvg.tsx
components/MapFilterBar.tsx
components/map/MapThumbnail.tsx
lib/hooks/useMapStatuses.ts
lib/map-statuses.ts
lib/map-houses.ts
modules/alerts/components/AlertMapLayer.tsx
app/(app)/map/page.tsx
```

## Founder-Entscheidungen

- Favorit ist das soziale Jugendbild:
  - Lernen auf der Bank
  - Sport/Spiel
  - Treffen
  - Rasenmaehen
  - Einkaufshilfe
  - leuchtende Wege und Pins
- Diese Marker sollen auf der echten Map erscheinen.
- Die ersten 10 Pins sollen zuerst als Stil-Freigabe gelten:
  1. Lernen
  2. Treffen
  3. Sport/Spiel
  4. Rasen maehen
  5. Einkaufshilfe
  6. Handy/Technik
  7. Garten/Pflanzen
  8. Veranstaltung
  9. Begleitung
  10. Warnung
- Nicht mit Emojis final umsetzen. Emojis waren nur Browser-Mockup. Produktion: eigene SVG-Piktogramme.

## Sicherheitsregeln

- Jugendliche sehen keine sensiblen Senior-/Care-Daten.
- Keine Diagnosen, Medikamente, Pflegegrad, Check-in-Status oder genauen Privatadressen im Jugend-Feed.
- Nicht erlaubte Pins duerfen nicht an den Client geliefert werden.
- Detailseiten und Popups pruefen Berechtigung erneut.
- Bei sensiblen Hilfen nur ungefaehre Bereiche anzeigen.
- Keine OpenStreetMap-Daten veraendern. Nur eigener Layer ueber OSM.

## Empfohlener erster Implementationsschnitt

1. Pin-Registry und Icon-Komponente:

```text
lib/map-activity-pins.ts
components/map/ActivityPinIcon.tsx
```

2. Sichere API:

```text
app/api/map/activities/route.ts
```

3. Leaflet-Integration:

```text
components/LeafletKarte.tsx
components/LeafletMapInner.tsx
components/MapFilterBar.tsx
```

4. Erst danach Dashboard/Jugend-Start.

## Rote Zone

Wenn neue DB-Felder oder eine neue Tabelle wie `map_activities` noetig werden:

- Migration file-first.
- Kein Prod-Apply ohne ausdrueckliches Founder-Go.
- Kein Vercel-Env-/Secrets-/Billing-/Provider-Live-Change.

## Startprompt fuer neue Session

```text
Bitte in C:\Users\thoma\Claud Code\Handy APP\nachbar-io starten.

Zuerst lesen:
- AGENTS.md
- docs/plans/2026-05-13-map-activity-pins-plan.md
- docs/plans/2026-05-13-jugend-app-visual-direction-design.md
- docs/plans/handoff/2026-05-13-map-activity-pins-new-session-handoff.md

Dann pruefen:
- git status --short --branch
- git log --oneline -12

Wichtig:
- OpenStreetMap bleibt Grundkarte, QuartierApp-Pins sind eigener Layer.
- Pin-Design muss zum Jugend-Hero passen: Tropfen, Glow, weisses SVG-Symbol.
- Erst die ersten 10 Pin-Typen sauber bauen.
- Sichtbarkeit serverseitig filtern, keine sensiblen Daten an den Client.
- Keine Prod-DB-Migration oder neue Tabelle ohne Founder-Go.
```
