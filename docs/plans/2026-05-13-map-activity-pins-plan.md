# Map Activity Pins - Produkt- und Umsetzungsplan

**Datum:** 2026-05-13  
**Status:** Plan gesichert, noch keine Code-Aenderung  
**Scope:** Interaktive QuartierApp-Pins auf der bestehenden OpenStreetMap/Leaflet-Karte fuer alle vier UI-Modi

## Founder-Entscheidung

Die Marker aus dem ausgewaehlten Jugend-Hero sollen nicht nur Deko bleiben. Dasselbe Pin-Design soll auf der echten Quartierskarte erscheinen:

- OpenStreetMap bleibt die Grundkarte.
- QuartierApp legt eigene Activity-Pins als Layer darueber.
- Wir schreiben nichts in OpenStreetMap selbst.
- Jeder Pin bekommt ein Symbol passend zum Ereignis: z.B. Rasenmaehen, Treffen, Lernen, Sport/Spiel, Einkaufshilfe.
- Die Pins muessen exakt in die Designfamilie des Jugend-Hero passen: leuchtender Tropfen-Pin, weisses Symbol, Glow, Nachtkarten-Wirkung.
- Sichtbar ist nur, was die Person sehen darf.

Referenzbild:

```text
public/brand/generation-modes/youth-social-neighborhood-hero-wide.webp
```

## Vorhandene Infrastruktur

Nicht neu bauen, sondern erweitern:

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
app/(app)/dashboard/page.tsx
app/(app)/jugend/page.tsx
```

Aktuell gibt es bereits:

- Haus-/Status-Pins: gruen, gelb, rot, blau, orange.
- Leaflet/OpenStreetMap als echte Karte.
- SVG-Fallback fuer alte Pilotkarte.
- Dashboard-Map-Thumbnail.
- AlertMapLayer mit exakter oder ungefaehrer Location.

## Pin-Designsystem

Production-Pins sollen keine Emojis sein. Sie sollen als eigene SVG/Icon-Komponenten gebaut werden.

Form:

- Tropfen-Pin wie im Hero-Bild.
- Kreis oben, Spitze unten.
- Weisser Rand.
- Weisses Piktogramm innen.
- Glow in Kategorie-Farbe.
- Kleine Label-Chips optional nur bei Hover/Popup, nicht dauerhaft auf voller Karte.

Farben:

| Kategoriegruppe | Farbe | Verwendung |
|---|---|---|
| Community / Hilfe / Garten | Gruen | sichere Hilfe, Garten, Treffen |
| Aktiv / Event / Aufgabe | Amber | Sport, Event, Einkauf, Aktion |
| Info / Begleitung / Digital | Blau | Technik, Begleitung, Info |
| Warnung / kritisch | Rot | Warnungen, Notfallhinweise |
| Spezial / Bonus spaeter | Violett optional | Badges, Challenges, Mentoring |

## Erste 10 Pins zur Stil-Freigabe

Diese zehn wurden im Browser-Mockup gezeigt und sollen als erste Design-Familie gelten:

| Nr. | Pin | Bedeutung | Kategorie | Erste Datenquelle |
|---:|---|---|---|---|
| 1 | Lernen | gemeinsames Lernen, Lern-Treff | community | spaeter events/youth_tasks |
| 2 | Treffen | Jugendtreff, Gruppe, Nachbarschaft | community | events / Gruppen |
| 3 | Sport/Spiel | Fussball, Spiel, Bewegung | active | events/youth_tasks |
| 4 | Rasen maehen | Rasen/Gartenhilfe | help | care_tasks/help_requests/youth_tasks |
| 5 | Einkaufshilfe | Einkauf bringen/holen | help | help_requests/care_tasks |
| 6 | Handy/Technik | Handy, WLAN, Digitalhilfe | digital | care_tasks/youth_tasks |
| 7 | Garten/Pflanzen | Pflanzen, Beet, Garten | help | care_tasks/youth_tasks |
| 8 | Veranstaltung | Quartier-Event | event | events/municipal_config |
| 9 | Begleitung | Begleitung, sicherer Weg | help | care_tasks/help_requests |
| 10 | Warnung | Warnung, Hinweis, Gefahr | warning | alerts/external warnings |

## Sichtbarkeit je Modus

### Jugend (`youth`)

Jugendliche sehen nur altersgerechte, sichere Pins:

- Lernen
- Treffen
- Sport/Spiel
- Jugend-Events
- anonymisierte einfache Hilfeaufgaben
- Garten/Rasen nur, wenn als jugendgeeignet/moderiert markiert

Nicht sichtbar:

- Senior-Namen
- genaue Privatadressen
- Pflege-/Gesundheitsdetails
- Check-in-Status
- Diagnosen, Medikamente, Pflegegrad
- Direktkontakt ohne YouthGuard/Consent/Moderation

### Aktiv (`active`)

Aktive Erwachsene sehen:

- Quartier-Events
- Hilfe suchen/anbieten
- Marktplatz-/Board-nahe Aktivitaeten
- Treffpunkte
- Warnungen

Details bleiben gestuft:

- Vor Annahme: ungefaehr, datensparsam.
- Nach Annahme/Freigabe: mehr Details, wenn berechtigt.

### Komfort (`comfort`)

Komfort nutzt die gleiche Datenbasis wie Aktiv, aber ruhiger:

- groessere Pins
- weniger Kategorien vorausgewaehlt
- Fokus: Hilfe, Sicherheit, Rathaus, Termine, Warnungen
- keine verspielte Badge-/Challenge-Optik

### Einfach (`senior`)

Einfach zeigt keine volle Pin-Flut:

- eigene Hilfe
- wichtige Rueckmeldungen
- Warnungen
- sichere Treffpunkte
- sehr grosse, reduzierte Symbole

## Datenschutz- und Sicherheitsregel

Die wichtigste Regel:

> Die UI darf nie Pins laden, die der Nutzer nicht sehen darf.

Kein clientseitiges "ausblenden" sensibler Daten. Der Feed muss serverseitig gefiltert werden.

Empfohlener Zielzustand:

```text
GET /api/map/activities?mode=youth|active|comfort|senior
```

Der Endpoint liefert nur erlaubte Pins:

```ts
type MapActivityPin = {
  id: string;
  kind: "learn" | "meet" | "sport" | "mow" | "shopping" | "digital" | "garden" | "event" | "escort" | "warning";
  title: string;
  subtitle?: string;
  lat: number;
  lng: number;
  locationPrecision: "exact" | "approx_50m" | "approx_quarter";
  visibility: "public" | "youth_safe" | "adult" | "caregiver" | "own";
  startsAt?: string;
  points?: number;
  href?: string;
};
```

Bei Jugend und sensiblen Hilfen:

- `locationPrecision` bevorzugt `approx_50m` oder `approx_quarter`.
- Keine Namen/Telefonnummern/Adressen im Feed.
- Detailseite prueft Berechtigung erneut.

## Technischer Ansatz

### UI-Layer

Leaflet:

- `LeafletMapInner.tsx` erweitert um `activityPins`.
- Status-Hausmarker bleiben bestehen.
- Activity-Pins werden mit `L.divIcon` oder React-Leaflet `Marker` + custom HTML/SVG gerendert.
- Popup zeigt nur erlaubte Details.

SVG-Fallback:

- `NachbarKarteSvg.tsx` bekommt optional gleiche Pin-Komponente als SVG-Gruppe.
- Alternativ im ersten Schritt nur Leaflet, weil Pilot mit Geo-Koordinaten priorisiert wird.

Dashboard Thumbnail:

- `MapThumbnail.tsx` kann spaeter `ActivityThumbnailPoint` bekommen.
- Erst nach Hauptkarte umsetzen.

### Daten-Layer

Erste Welle moeglich ohne neue Tabelle, wenn vorhandene Daten reichen:

- `alerts`
- `help_requests`
- `care_tasks`
- `events`
- `municipal_config.events` / `crawled_events`
- `youth_tasks`

Wichtig: Vor Implementation pro Tabelle per Code/Types/Migration pruefen, ob Location-Felder existieren. Wenn nicht:

- keine Fake-Genauigkeit anzeigen
- erst ungefaehr auf Quartier-Zentrum oder Treffpunkt setzen
- fuer echte Activity-Locations spaeter file-first Migration planen

Wenn neue Tabelle noetig wird:

```text
map_activities
```

dann gilt rote Zone:

- Migration file-first.
- Keine Prod-Migration ohne ausdrueckliches Founder-Go.

## Umsetzungswellen

### M1 - Pin-Registry und Design-Komponente

- `lib/map-activity-pins.ts`
- `components/map/ActivityPinIcon.tsx`
- erste 10 Pin-Typen aus der Tabelle
- Tests fuer Registry, Farbe, Labels, Modus-Sichtbarkeit

Keine DB-Aenderung.

### M2 - Map Activity Feed als sichere API

- `app/api/map/activities/route.ts`
- user/session lesen
- `ui_mode` und Rolle bestimmen
- Pins nur serverseitig gefiltert zurueckgeben
- zunaechst aus bestehenden Quellen, ohne Migration wenn moeglich

### M3 - Leaflet Integration

- `LeafletMapInner.tsx` nimmt `activityPins`.
- `LeafletKarte.tsx` laedt Feed.
- `MapFilterBar` bekommt Aktivitaetsfilter.
- Klick-Popup mit erlaubten Details.

### M4 - Modus-spezifische Darstellung

- Jugend: frische Pin-Optik, Lernen/Treffen/Sport/Hilfe.
- Aktiv: normale Aktivitaetsfilter.
- Komfort: groessere Pins, weniger Filter.
- Einfach: reduzierte wichtige Pins.

### M5 - Dashboard/Jugend-Start

- `/jugend` zeigt oben Hero/Map mit Activity-Pins.
- Dashboard-Map-Thumbnail bekommt kleine Aktivitaetspunkte.
- Keine Aenderung an eingefrorenem Komfort-/50+-Visual-Polish ohne konkrete Freigabe.

## Akzeptanzkriterien

- OpenStreetMap bleibt Grundkarte.
- QuartierApp-Pins erscheinen als eigener Layer.
- Die Pin-Familie entspricht dem Favoritenbild.
- Die ersten 10 Pin-Typen sind konsistent.
- Alle vier Modi nutzen dieselbe Datenbasis, aber andere Detailtiefe/Darstellung.
- Jugendliche erhalten keine sensiblen Senior-/Care-Daten.
- Nicht erlaubte Pins werden serverseitig gar nicht ausgeliefert.
- Keine Prod-DB-Migration ohne Founder-Go.
