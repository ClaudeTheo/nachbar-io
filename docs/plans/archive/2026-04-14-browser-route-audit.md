# Browser Route Audit — Live Deployment

**Datum:** 2026-04-14
**Ziel:** Breiter Browser-Sweep ueber die App-Routen auf
`https://nachbar-io.vercel.app`
**Session:** eingeloggte Live-Session mit vorhandenem E2E-Testnutzer
**Rohreport:** `output/playwright/browser-route-audit-2026-04-14.json`

---

## Abdeckung

- App-Router-Dateien gescannt: `208` eindeutige Routen
- Davon statische Routen: `176`
- Davon dynamische Muster: `32`
- Im Browser getestet:
  - `176/176` statische Routen
  - `16` konkrete dynamische Unterseiten, die ueber echte Links in der App
    gefunden wurden

---

## Ergebnisbild

- `43` Routen luden im Sweep ohne Redirect oder Browserfehler
- `67` Routen redirecteten, meist auf `/kreis-start`
- `82` Roh-Treffer wurden als `client_error` markiert

Wichtig: Der Rohwert `client_error` ist bewusst konservativ. Der Sweep hat sehr
schnell navigiert und dabei haeufig:

- `POST /api/heartbeat` mit `429` gesehen
- abgebrochene RSC-Requests (`net::ERR_ABORTED`) durch Seitenwechsel gesehen

Diese beiden Muster sind nicht automatisch gleichbedeutend mit einer kaputten
Seite.

---

## Relevante Befunde

### API-Fehler mit sichtbarer Auswirkung

- `/einstellungen/favoriten`
  - `GET /api/speed-dial` liefert `500`
  - UI zeigt: `Favoriten konnten nicht geladen werden.`
- `/kiosk/sprechstunde`
  - `GET /api/doctors/profiles` liefert `500`
- `/hilfe/tasks`
  - Supabase-Request auf `help_requests` liefert `400`
- `/profile/map-position`
  - Supabase-Request auf `users?select=quarter_id...` liefert `400`

### Klare Frontend-/Runtime-Befunde

- `/kiosk/games/quiz`
  - React Runtime-Fehler `Minified React error #418`
- `/kiosk/health`
  - React Runtime-Fehler `Minified React error #418`

### Fehlende Endpunkte / 404

- `/kiosk`
  - `GET /api/weather` liefert `404`
- `/kiosk/board`
  - `GET /api/board` liefert `404`
- `/kiosk/news`
  - `GET /api/quartier-info/news` liefert `404`
- `/hilfe/abo`
  - `GET /api/hilfe/subscription` liefert `404`
- `/my-day`
  - Supabase-Request auf `checkins` liefert `404`
- `/org` und `/org/announcements`
  - interne RSC-Requests auf `/org/escalations`, `/org/audit`,
    `/org/members` liefern `404`

### Karten-/CSP-Befund

- `/hier-bei-mir`
- `/quartier-info`
- Alias `/quartier` → redirectet auf `/quartier-info`

Auf diesen Seiten werden Tile-Bilder von
`https://basemaps.cartocdn.com/...` durch die Content-Security-Policy geblockt.
Die Ursache ist sehr wahrscheinlich, dass die CSP `https://*.basemaps.cartocdn.com`
erlaubt, aber nicht die Root-Domain `https://basemaps.cartocdn.com`.

---

## Bereits verifiziert

- `/map` rendert sauber mit Leaflet
- Marker, Zoom und Filter auf `/map` funktionieren
- Mehrere Hauptseiten (`/dashboard`, `/quartier-info`, `/care`, `/profile`,
  `/map`) wurden bereits separat im Live-Smoke manuell bestaetigt

---

## Follow-up auf `feat/pilot-readiness`

Lokaler Browser-Recheck am `2026-04-14` auf `http://localhost:3002` mit
eingeloggter Test-Session:

- Behoben:
  - `/kiosk/games/quiz`
    - keine Runtime- oder Hydration-Fehler mehr
  - `/kiosk/sprechstunde`
    - `/api/doctors` liefert wieder `200`
  - `/hilfe/tasks`
    - keine fehlerhafte `help_requests`-Abfrage mehr, Seite zeigt leeren Zustand sauber
  - `/hilfe/abo`
    - `/api/hilfe/subscription` liefert fuer Nutzer ohne Helfer-Profil jetzt `200` mit `null`
    - dadurch kein sichtbarer API-Fehler mehr auf der Seite
  - `/my-day`
    - keine `checkins`-404 mehr; Tages-Check-in laeuft lokal im Browser weiter

- Weiterhin sichtbar, aber als Audit-Rauschen eingeordnet:
  - `POST /api/heartbeat` kann bei schnellem Route-Sweep weiterhin `429` liefern

- Noch nicht erneut breit gegen alle Live-Routen verifiziert:
  - role-/kontextabhaengige Care-Unterseiten wie `/care/aerzte`, die in der
    verwendeten Senior-/Kiosk-Session auf `/kreis-start` zuruecklenken

---

## Live-Recheck nach Merge am 2026-04-15

Nach dem Merge von PR `#13` wurde das Production-Deployment zunaechst nicht
automatisch sichtbar aktualisiert. Beim manuellen Produktions-Deploy wurden
zwei TypeScript-Blocker auf `master` gefunden und direkt behoben:

- `app/(app)/hilfe/tasks/page.tsx`
  - `setTasks(...)` erhielt explizit ein `HilfeTask[]`, damit der Vercel-Build
    nicht an `null`-Eintraegen scheitert
- `app/(app)/my-day/page.tsx`
  - `user.id` wurde fuer den Effekt in eine lokale Konstante gezogen, damit
    der Nullability-Check auf Production nicht fehlschlaegt

Anschliessend wurde das Live-Deployment erfolgreich erneut gebaut und gegen die
priorisierten Seiten geprueft.

### Production-Status

- `/login`
  - Passwort-Toggle ist live nicht mehr sichtbar
- `POST /api/heartbeat`
  - doppelte Heartbeats innerhalb des Cooldowns werden live als no-op
    beantwortet (`200` statt `429`)
  - das zuvor sichtbare `429`-Rauschen war im Recheck auf den Kernseiten nicht
    mehr in der Browser-Konsole sichtbar

### Live bestaetigt

- `/kiosk/games/quiz`
  - rendert sauber, keine Runtime- oder Console-Fehler sichtbar
- `/kiosk/sprechstunde`
  - Aerzteliste wird geladen
  - `/api/doctors` liefert im Live-Recheck `200`
- `/hilfe/tasks`
  - zeigt den leeren Zustand sauber
  - keine fehlerhafte `help_requests`-Abfrage sichtbar
- `/hilfe/abo`
  - zeigt fuer Nutzer ohne Helfer-Profil den erwarteten Hinweiszustand
  - `/api/hilfe/subscription` liefert im Live-Recheck `200`
- `/my-day`
  - keine `checkins`-`404` mehr sichtbar
  - Seite laedt mit Heartbeat-, Quartier- und Muell-Daten weiter sauber

### Einordnung zu `/care/aerzte`

- `/care/aerzte` leitet weiterhin auf `/kreis-start` um
- das ist im aktuellen Stand **kein neuer Rollenfehler**, sondern ein bewusst
  konfigurierter Redirect in `proxy.ts`
- die Route liegt dort in `LEGACY_ROUTE_PREFIXES` und ist damit global hinter
  dem Phase-I-Legacy-Gate verborgen

### Nachgezogener Care-Recheck am 2026-04-15

- `/care`
  - Legacy-Ziele wie `Aerzte`, `Medikamente`, `Sprechstunde` und `Vorsorge`
    werden live nicht mehr als klickbare Sackgassen gerendert
  - stattdessen erscheinen sie sichtbar deaktiviert mit dem Hinweis
    `Im Pilot noch deaktiviert`
- `/care/termine`
  - die Seite nutzt live wieder den Care-Endpoint
    `GET /api/care/appointments?upcoming=true`
  - der zuvor sichtbare `500` auf
    `GET /api/appointments?status=upcoming` tritt im Production-Recheck nicht
    mehr auf
  - die Seite zeigt fuer den geprueften Nutzer den leeren Zustand sauber und
    ohne Console-Fehler

---

## Nicht vollstaendig abgedeckt

Die folgenden dynamischen Muster konnten in dieser Session nicht mit echten
Werten befuellt werden, weil keine gueltigen IDs/Tokens aus der App-Navigation
gefunden wurden:

- Token-/Einmal-Links wie `/anamnese/[token]`, `/notfall/[token]`,
  `/terminal/[token]`
- mehrere entity-gebundene Detailrouten wie `/messages/[id]`,
  `/call/[userId]`, `/care/meine-senioren/[seniorId]`

Der Rohreport enthaelt die vollstaendige Liste der ungetesteten Muster.
