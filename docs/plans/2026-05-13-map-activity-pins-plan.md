# Map Activity Pins - Produkt- und Umsetzungsplan

**Datum:** 2026-05-13  
**Status:** Lokal umgesetzt: Pin-Familie, Leaflet-Layer, lokale Preview, sichere Feed-API und echte Leaflet-Kartenanbindung; weitere Quellen bleiben bis belastbare Koordinaten vorhanden sind gesperrt
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

## Aktueller lokaler Implementierungsstand

Lokale Commits bis Stand 2026-05-13:

```text
08bafe5 feat(map): add activity pin icon family
11f954f feat(map): render activity pins on leaflet
e9dcf2a feat(map): preview activity pins on house anchors
3515e13 feat(map): add secure activity feed api
Arbeitsstand 2026-05-13: Feed-Anbindung an Leaflet lokal umgesetzt und in dieser Welle verifiziert.
```

Umgesetzt:

- `lib/map-activity-pins.ts`: Registry fuer die ersten 10 Pin-Typen und sichere SVG-Markup-Erzeugung.
- `components/map/ActivityPinIcon.tsx`: wiederverwendbare React-SVG-Komponente.
- `components/LeafletMapInner.tsx`: optionaler `activityPins`-Layer als Leaflet `divIcon` Marker.
- `components/LeafletKarte.tsx` und `components/NachbarKarte.tsx`: `activityPins` werden durchgereicht.
- `app/map-activity-pins-preview/*`: lokale Sichtprobe mit echter Leaflet/OpenStreetMap-Karte.
- `lib/map-activity-preview.ts`: zehn statische, anonymisierte Haus-Anker fuer die lokale Preview.
- `app/api/map/activities/route.ts`: authentifizierte Read-only Feed-API.
- `lib/map-activity-feed.ts`: serverseitige Modus-/Sichtbarkeitsfilter und erster Alerts-Loader.
- `lib/hooks/useMapActivityPins.ts`: defensiver Client-Hook fuer `/api/map/activities`.
- `LeafletKarte.tsx`: laedt den Feed und reicht erlaubte Pins an Leaflet weiter.
- `MapFilterBar.tsx`: eigener Aktivitaetsfilter zum Ein-/Ausblenden der Activity-Pins.

Noch nicht umgesetzt:

- `events`, `help_requests` und `youth_tasks` liefern noch keine belastbaren Activity-Koordinaten, weil in den vorhandenen Tabellen keine passenden Standortspalten fuer diese Use-Cases existieren.
- Dashboard-Thumbnail und Jugend-Start sind noch nicht an den Activity-Feed angeschlossen.
- Keine Prod-DB-Migration, kein Prod-Write, kein Push/Deploy in dieser Welle.

## Pin-Designsystem

Production-Pins sollen keine Emojis sein. Sie sollen als eigene SVG/Icon-Komponenten gebaut werden.

Wichtig: Nutzer waehlen nicht selbst Farbe oder Symbol. Die App leitet Pin-Typ, Farbe, Glow und Sichtbarkeit automatisch aus der Fachlogik ab:

- Kategorie bestimmt das Symbol, z.B. Rasenmaehen, Einkauf, Lernen, Sport, Treffen, Warnung.
- Dringlichkeit bestimmt die Grundfarbe.
- Ortstyp bestimmt die Koordinate: Haus/Haushaltsbereich, Treffpunkt, Quartiersbereich oder bewusst externer Treffpunkt.
- Berechtigung bestimmt, ob der Pin ueberhaupt ausgeliefert wird und ob er exakt oder ungefaehr erscheint.

Form:

- Tropfen-Pin wie im Hero-Bild.
- Kreis oben, Spitze unten.
- Weisser Rand.
- Weisses Piktogramm innen.
- Glow in Kategorie-Farbe.
- Auf der echten Karte kompakt: Leaflet-Marker `28x37`, damit Haeuser und Strassen nicht verdeckt werden.
- Kleine Label-Chips optional nur bei Hover/Popup, nicht dauerhaft auf voller Karte.

Farben und Zustandslogik:

| Zustand | Farbe | Verwendung |
|---|---|---|
| Normal | Gruen | normale Hilfe, normales Ereignis, Treff, Lernen, Sport, Rasenmaehen ohne Eile |
| Dringend | Gelb / Amber | zeitnah wichtig, z.B. Hilfe wird bald gebraucht oder Termin laeuft bald |
| Unfall / Notfall | Rot | ausschliesslich Unfall, akuter Notfall, echte Gefahr |
| Sonderstatus | Blau | Urlaub/Abwesenheit, Info/Begleitung/Digitalstatus, wenn kein Notfall |
| Spezial / Bonus spaeter | Violett optional | Badges, Challenges, Mentoring |

Rot ist streng reserviert. Eine dringende Einkaufshilfe oder ein eiliger Rasenmaeh-Wunsch wird gelb, nicht rot.

Beispiele:

- Rasenmaehen normal: Symbol Rasenmaeher, Farbe gruen, Haus-/Haushaltsbereich.
- Rasenmaehen dringend: Symbol Rasenmaeher, Farbe gelb, Haus-/Haushaltsbereich.
- Unfall: Symbol Warnung/Notfall, Farbe rot, Notfallregeln und 112/110-Banner zuerst.
- Urlaub/Abwesenheit: Sonderstatus blau, wie bestehende Hausstatus-Logik.
- Outdoor-Treff: Symbol Treffen/Sport/Lernen, Farbe gruen oder gelb nach Dringlichkeit, Treffpunkt-Koordinate.

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
  type: "learning" | "meeting" | "sport" | "mowing" | "shopping" | "tech" | "gardening" | "event" | "companion" | "warning";
  title: string;
  description?: string;
  lat: number;
  lng: number;
  approximate?: boolean;
  locationPrecision: "exact" | "approx_50m" | "approx_quarter";
  urgency: "normal" | "urgent" | "emergency" | "status";
  colorState: "green" | "yellow" | "red" | "blue";
  locationScope: "home" | "meeting_point" | "quarter_area" | "external_place";
  visibility: "public" | "youth_safe" | "adult" | "caregiver" | "own";
  source: "alerts" | "events" | "help_requests" | "youth_tasks";
  startsAt?: string;
  href?: string;
};
```

Bei Jugend und sensiblen Hilfen:

- `locationPrecision` bevorzugt `approx_50m` oder `approx_quarter`.
- Jugend-Profile bleiben immer im Jugendfeed, auch wenn ein anderer Modus angefragt wird.
- Erwachsene koennen nicht per Query in den Jugendfeed wechseln.
- Nicht-exakte Koordinaten werden vor Auslieferung gerundet.
- Keine Namen/Telefonnummern/Adressen im Feed.
- Detailseite prueft Berechtigung erneut.

Standortregeln:

- `home`: Ereignis gehoert zu einem Haushalt/Haus, z.B. Rasenmaehen, Einkaufshilfe, Paket, Urlaub. Standard ist Haus/Haushaltsbereich aus `households`/`map_houses`, nicht Freitext.
- `meeting_point`: bewusst gewaehlter Treffpunkt, z.B. Lernen, Sport, Jugendtreff, Quartierabend.
- `quarter_area`: bewusst ungefaehr, wenn genaue Koordinate nicht freigegeben oder fachlich nicht sinnvoll ist.
- `external_place`: erlaubter Treffpunkt ausserhalb des Pilotquartiers, z.B. Sportplatz, Rhein, Holzbruecke, Muensterplatz. Nur fuer Events/Treffpunkte, nicht fuer private Haushaltsdaten.

## Technischer Ansatz

### UI-Layer

Leaflet:

- `LeafletMapInner.tsx` ist erweitert um `activityPins`.
- Status-Hausmarker bleiben bestehen.
- Activity-Pins werden mit `L.divIcon` und React-Leaflet `Marker` + custom SVG gerendert.
- Popup zeigt nur erlaubte Details.
- Preview kann externe LGL-BW-Gebaeudeumrisse abschalten, damit lokale Tests nicht von externen Layern abhaengen.

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

Aktueller Datenstand:

- `alerts` haben `location_lat`/`location_lng` und sind als erster Read-only-Loader angebunden.
- `events` haben aktuell `location` als Freitext, aber keine belastbaren Koordinaten.
- `help_requests` haben aktuell keine direkte Standortspalte.
- `youth_tasks` haben aktuell keine Standortspalte.
- Fuer Hausbezug ist der vorhandene Weg `households`/`map_houses` mit `position_verified`, `map_house_id` und LGL-BW-WFS massgeblich.

Ziel-Regellogik fuer spaetere Quellen:

- `help_requests.category = garden` und normale Dringlichkeit -> `type=mowing` oder `gardening`, `colorState=green`, `locationScope=home`.
- Gleiche Hilfe mit dringender Dringlichkeit -> `colorState=yellow`.
- Unfall/echter Notfall -> `type=warning`, `colorState=red`, separate Notfallregeln.
- Urlaub/Abwesenheit -> `colorState=blue`, kein Activity-Hilfe-Pin, sondern Status/Info-Pin.
- Event mit Treffpunkt -> `locationScope=meeting_point` oder `external_place`, wenn bewusst ausserhalb des Quartiers.

Wenn neue Tabelle noetig wird:

```text
map_activities
```

dann gilt rote Zone:

- Migration file-first.
- Keine Prod-Migration ohne ausdrueckliches Founder-Go.

## Umsetzungswellen

### M1 - Pin-Registry und Design-Komponente - done

- `lib/map-activity-pins.ts`
- `components/map/ActivityPinIcon.tsx`
- erste 10 Pin-Typen aus der Tabelle
- Tests fuer Registry, Farbe, Labels, Modus-Sichtbarkeit

Keine DB-Aenderung.

### M1b - Leaflet-Layer - done

- `LeafletMapInner.tsx` nimmt `activityPins`.
- `LeafletKarte.tsx` und `NachbarKarte.tsx` reichen `activityPins` weiter.
- Marker sind `28x37` mit proportionalem Glow.
- Popup zeigt Titel, Label, Beschreibung und optional "Ungefaehrer Bereich".

Keine DB-Aenderung.

### M1c - Lokale Sichtprobe - done

- `/map-activity-pins-preview` zeigt 10 Pins auf echter Leaflet/OpenStreetMap-Karte.
- Nur lokal/Test sichtbar; Production blockiert die Route.
- Pins liegen auf anonymisierten Haus-Ankern, ohne Strassennamen, Hausnummern oder Nutzer.

Keine DB-Aenderung, keine echten Eventdaten.

### M2 - Map Activity Feed als sichere API - done

- `app/api/map/activities/route.ts`
- user/session lesen
- `ui_mode` und Rolle bestimmen
- Pins nur serverseitig gefiltert zurueckgeben
- erster Loader: aktive `alerts` mit Standort als `warning`-Pins
- Jugend-Gate und Erwachsenen-Gate getestet
- nicht-exakte Koordinaten werden gerundet

Keine DB-Aenderung.

### M3 - Feed in echte Leaflet-Karte einbinden - done

- `LeafletKarte.tsx` oder ein kleiner Hook laedt `/api/map/activities?mode=...`.
- Geladene Pins werden als `activityPins` an `LeafletMapInner` gegeben.
- Bei leerem Feed oder Fehler bleibt die Karte ohne Activity-Pins nutzbar.
- `MapFilterBar` bekommt Aktivitaetsfilter.
- Klick-Popup mit erlaubten Details.

Keine DB-Aenderung noetig, solange nur die bestehende API gelesen wird.

### M4 - Weitere Quellen nur mit belastbarer Location

- `events`: erst anbinden, wenn Koordinaten/Treffpunkte sauber vorliegen; externe Treffpunkte sind erlaubt, wenn bewusst als Event-/Treffpunkt gesetzt.
- `help_requests`: erst anbinden, wenn `map_house_id`, Treffpunkt oder bewusst ungefaehrer Bereich verfuegbar ist; Farbe entsteht aus Dringlichkeit, nicht aus Nutzerauswahl.
- `youth_tasks`: nur jugendgeeignet/moderiert und nur mit sicherer Standortpraezision.
- Status-Pins wie Urlaub/Abwesenheit bleiben blau und duerfen nicht mit Notfallrot vermischt werden.
- Keine Fake-Genauigkeit.

Wenn neue Standortfelder oder `map_activities` noetig werden, gilt rote Zone.

### M5 - Modus-spezifische Darstellung

- Jugend: frische Pin-Optik, Lernen/Treffen/Sport/Hilfe.
- Aktiv: normale Aktivitaetsfilter.
- Komfort: ruhiger, weniger Kategorien vorausgewaehlt.
- Einfach: reduzierte wichtige Pins.

### M6 - Dashboard/Jugend-Start

- `/jugend` zeigt oben Hero/Map mit Activity-Pins.
- Dashboard-Map-Thumbnail bekommt kleine Aktivitaetspunkte.
- Keine Aenderung an eingefrorenem Komfort-/50+-Visual-Polish ohne konkrete Freigabe.

## Akzeptanzkriterien

- OpenStreetMap bleibt Grundkarte.
- QuartierApp-Pins erscheinen als eigener Layer in Leaflet.
- Die Pin-Familie entspricht dem Favoritenbild, aber auf der Karte kompakt.
- Die ersten 10 Pin-Typen sind konsistent und getestet.
- Nutzer waehlen Farbe/Symbol nicht manuell; Pin-Typ und Farbe entstehen automatisch aus Kategorie, Dringlichkeit, Ortstyp und Berechtigung.
- Gruen = normal, Gelb = dringend, Rot = nur Unfall/Notfall, Blau = Sonderstatus wie Urlaub/Abwesenheit.
- Alle vier Modi nutzen dieselbe Datenbasis, aber andere Detailtiefe/Darstellung.
- Jugendliche erhalten keine sensiblen Senior-/Care-Daten aus dem Activity-Feed.
- Nicht erlaubte Pins werden serverseitig gar nicht ausgeliefert.
- Keine Prod-DB-Migration ohne Founder-Go.

## Naechster sicherer Schritt

M4/M5 vorbereiten, aber ohne rote Zone:

1. Keine weitere Datenquelle anbinden, solange keine belastbaren Koordinaten vorhanden sind.
2. Fuer `events`, `help_requests`, `youth_tasks` zuerst Datenmodell/Location-Felder file-first planen.
3. Modus-spezifische Darstellung lokal vorbereiten: Jugend frisch, Aktiv normal, Komfort ruhig, Einfach reduziert.
4. Dashboard-/Jugend-Start erst anbinden, wenn die Hauptkarte stabil geprueft ist.

Kein Push/Deploy und keine Prod-DB-Aktion ohne Founder-Go.
