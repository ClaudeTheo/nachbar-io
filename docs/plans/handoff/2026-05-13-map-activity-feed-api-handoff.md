# Handoff - Map Activity Feed API

**Datum:** 2026-05-13  
**Von:** Codex  
**Status:** Lokal umgesetzt und verifiziert, noch nicht gepusht/deployed

## Kurzstand

M2 fuer Activity-Pins ist als sichere Read-only-API vorbereitet:

```text
GET /api/map/activities
```

Die Route ist authentifiziert und liefert eine Liste als Array zurueck. Sie ist bewusst noch nicht in die echte Karte verdrahtet und schreibt keine Daten.

## Relevante Dateien

```text
app/api/map/activities/route.ts
lib/map-activity-feed.ts
__tests__/api/map-activities.test.ts
__tests__/lib/map-activity-feed.test.ts
docs/plans/handoff/INBOX.md
```

## Sicherheitslogik

Die API nutzt `resolveMapActivityMode()`:

- Jugend-Profile bleiben immer im `youth`-Feed, auch wenn `?mode=active` angefragt wird.
- Erwachsene koennen nicht per Query in `?mode=youth` wechseln; ihr Profilmodus bleibt massgeblich.
- Ungueltige Modi fallen auf den Profilmodus, sonst auf `active`, zurueck.

Die Feed-Filterung nutzt Sichtbarkeiten:

```text
public
youth_safe
adult
caregiver
own
```

Nicht-exakte Standorte werden vor Ausgabe auf 3 Nachkommastellen gerundet und mit `approximate: true` markiert. Exakte Standorte werden Jugendlichen nicht exakt ausgeliefert.

## Erste Datenquelle

Der erste echte Read-only-Loader nutzt nur vorhandene Daten:

```text
alerts
```

Aktive Alerts mit Standort (`open`, `help_coming`) werden zu `warning`-Pins. Sie werden als `public` und `approx_50m` behandelt, damit keine exakten Privatpositionen herausfallen.

Noch nicht angebunden:

- `events` haben aktuell nur Freitext-Location, keine belastbaren Koordinaten.
- `help_requests` haben keine direkte Standortspalte.
- `youth_tasks` haben keine Standortspalte.

Fuer diese Quellen braucht es spaeter entweder bestehende verifizierte `map_house_id`/Treffpunkt-Zuordnung oder eine neue file-first Migration. Das waere rote Zone fuer Prod-Apply.

## Verifikation

Zuletzt gruen:

```text
npx vitest run __tests__/lib/map-activity-feed.test.ts __tests__/api/map-activities.test.ts __tests__/lib/map-activity-pins.test.ts __tests__/components/LeafletMapInner.activity-pins.test.tsx
# 4 files, 18 tests passed

npx eslint lib/map-activity-feed.ts app/api/map/activities/route.ts __tests__/lib/map-activity-feed.test.ts __tests__/api/map-activities.test.ts

npx tsc --noEmit
```

Lokaler HTTP-Smoke gegen `http://localhost:3005/api/map/activities` ohne Login erreicht im Closed-Pilot-Modus zuerst die Middleware und gibt `503 closed_pilot` zurueck. Das ist konservativ; die direkte Routensuite prueft zusaetzlich 401 ohne Auth.

## Naechster sicherer Schritt

M3 kann danach die echte Leaflet-Karte den Feed laden lassen:

- `components/LeafletKarte.tsx` oder ein kleiner Hook ruft `/api/map/activities?mode=...`.
- API-Array wird als `activityPins` an `LeafletMapInner` gegeben.
- Bei Fehler/leerem Feed bleibt die Karte ohne Activity-Pins.

Keine Prod-DB-Schreibaktion, kein Migration-Apply, kein Push, kein Deploy, keine Vercel-Env/Secrets/Billing/Provider-Live-Aktion in diesem Schritt.
