# Notfall-GPS auf der Quartierskarte — Design

**Datum:** 2026-03-20
**Status:** Genehmigt

## Übersicht
Beim Erstellen eines Notfall-Alerts wird der GPS-Standort des Nutzers erfasst und als pulsierender Kreis (~50m) auf der Leaflet-Karte angezeigt. Genauer Standort nur für bestätigte Helfer. Haushalt als Fallback wenn GPS nicht verfügbar.

## GPS-Erfassung (Alert-Flow)

- `navigator.geolocation.getCurrentPosition()` wird beim Öffnen von `/alerts/new` angefragt
- Nur bei Notfall-Kategorien: `fire`, `health_concern`, `crime`, `fall`, `water_damage`, `power_outage`
- Bei Nicht-Notfall-Kategorien (shopping, tech_help, etc.): kein GPS
- Hinweis im UI: *"Ihr Standort wird für Helfer freigegeben"* mit Opt-out
- Fallback: `households.lat/lng` wenn GPS verweigert oder nicht verfügbar
- GPS-Daten werden mit dem Alert an `POST /api/alerts` gesendet

## Datenbank

- Zwei neue Spalten in `alerts`: `location_lat DECIMAL`, `location_lng DECIMAL`
- Bestehende Spalte `household_id` bleibt als Fallback
- Bei `status = 'resolved'`: Cron/Trigger setzt `location_lat/lng` auf `NULL` (Auto-Löschung, DSGVO)

## Karten-Darstellung (LeafletMapInner)

- Offene Alerts werden als pulsierende `Circle` (50m Radius) gerendert
- Farben nach Kategorie:
  - **Rot:** fire, health_concern, crime (EMERGENCY_CATEGORIES)
  - **Amber:** water_damage, power_outage, fall (HIGH_URGENCY)
- CSS-Animation: `pulse` (opacity 0.3-0.7, scale 0.95-1.05)
- Popup beim Antippen: Kategorie-Icon, Titel, Zeitstempel, "Ich kann helfen"-Button
- **Kein** genauer Standort im Popup — nur Kategorie + grober Bereich

## Stufenweise Sichtbarkeit (Eskalation)

- **Stufe 1** (0-15 Min): Nur Bewohner in derselben Straße sehen den Kreis
- **Stufe 2** (15-30 Min): Gesamtes Quartier sieht den Kreis
- **Stufe 3** (30+ Min): Quartier + benachbarte Quartiere (Zukunft)
- Mapping über `current_radius`-Feld (existiert bereits in `alerts`)
- Wichtig für Skalierung: In Hochhaussiedlungen mit 500+ Haushalten verhindert die stufenweise Sichtbarkeit Massenalarmierung

## Genauer Standort für Helfer

- Erst nach "Ich kann helfen" → `POST /api/alerts/{id}/help`
- API gibt `location_lat/lng` nur an bestätigte Helfer zurück
- RLS-Policy: `location_lat/lng` nur lesbar wenn `alert_responses.responder_user_id = auth.uid()`
- Helfer sieht dann den exakten Punkt statt des 50m-Kreises

## DSGVO-Konformität

- GPS nur bei 6 Notfall-Kategorien (Rechtsgrundlage: Art. 6 Abs. 1d lebenswichtiges Interesse / Art. 6 Abs. 1f berechtigtes Interesse)
- Karte zeigt nur 50m-Kreis, nicht den exakten Punkt (Datensparsamkeit)
- Genauer Standort nur für bestätigte Helfer (Zweckbindung)
- Auto-Löschung bei Auflösung des Alerts (Speicherbegrenzung)
- Opt-out möglich — Nutzer kann GPS verweigern, dann wird Haushalt-Adresse verwendet

## Betroffene Dateien

### Bestehend (zu ändern)
- `app/(app)/alerts/new/page.tsx` — GPS-Erfassung + Opt-out UI
- `app/api/alerts/route.ts` — location_lat/lng speichern
- `app/api/alerts/[id]/help/route.ts` — Standort an Helfer zurückgeben
- `components/LeafletMapInner.tsx` — Pulsierende Alert-Kreise rendern
- `lib/hooks/useMapStatuses.ts` — Alert-Daten laden

### Neu
- `supabase/migrations/XXX_alert_location.sql` — Spalten + RLS
- `lib/hooks/useAlertLocations.ts` — Hook für Alert-Standorte auf der Karte
- `components/AlertCircle.tsx` — Pulsierender Kreis-Komponente

## Entscheidungen

| Frage | Entscheidung |
|-------|-------------|
| GPS wann? | Beim Alert-Erstellen, nur Notfall-Kategorien |
| GPS oder Haushalt? | GPS primär, Haushalt als Fallback |
| Karten-Darstellung? | Pulsierender 50m-Kreis, farbcodiert nach Kategorie |
| Wer sieht was? | Alle sehen groben Kreis (stufenweise), Helfer sehen exakten Punkt |
| Sichtbarkeit? | Stufenweise Eskalation (Straße → Quartier → Region) |
| Mehrere Alerts? | Jeder eigener Kreis mit Kategorie-Farbe |
| DSGVO? | Art. 6 Abs. 1d/1f, Datensparsamkeit, Auto-Löschung, Opt-out |
