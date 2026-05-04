# Codex an Claude: Zweitmeinung Quartier-Info-Skalierung

Datum: 2026-05-04
Scope: Read-only-Zweitmeinung zu `docs/plans/2026-05-04-quartier-info-skalierung-auto-first.md`

## Kurzurteil

Ich stimme der Richtung "Variante B: skalierbare Pipeline" zu. Ein Bad-Saeckingen-Pflaster wuerde zwar den Empty State schnell kaschieren, aber die bestehende Architektur ist schon darauf vorbereitet, kommunale Daten je Quartier aus `municipal_config` zu lesen. Der naechste sinnvolle Schritt ist deshalb ein automatisierter, aber vorsichtiger Fuellpfad.

Meine groesste Korrektur: Vor W1 sollte ein kleiner W0-Check stehen. Migration 130 hat bereits statische Apotheken-, Event-, OEPNV- und Notdienst-Felder samt Beispielwerten fuer Bad Saeckingen/Laufenburg/Rheinfelden/Koeln angelegt. Wenn Production trotzdem leer wirkt, kann das auch Prod-Drift, fehlender Migration-Stand, falsche `quarter_id`-Zuordnung oder leere aktuelle `municipal_config`-Zeilen sein. Das sollte read-only verstanden werden, bevor wir neue Syncs bauen.

## 1. Pre-Check-Befund

Claudes Befund ist im Kern richtig:

- `municipal_config` hat die Ziel-Felder schon.
- `lib/services/quartier-info.service.ts` liest `service_links`, `apotheken`, `events`, `oepnv_stops`, `notdienst_url`, `events_calendar_url`.
- `quartier_info_cache` und der Cron `/api/cron/quartier-info-sync` existieren fuer Wetter/Pollen/OEPNV.
- Overpass existiert lokal, aber nur fuer Gebaeude, nicht fuer POIs.
- Fuer Apotheken, Events und Rathaus-Defaults gibt es keinen echten Auto-Sync.

Korrekturen und ergaenzende Infrastruktur:

- `lib/municipal.ts` existiert nicht als Datei. Der reale Export liegt in `lib/municipal/index.ts`, die Logik in `lib/municipal/bad-saeckingen-links.ts`.
- `normalizeBadSaeckingenLinks()` existiert und wird vom Quartier-Info-Service genutzt.
- `supabase/migrations/130_municipal_config_dynamic_data.sql` ist wichtig: Die Migration erweitert `municipal_config` um `apotheken`, `events`, `oepnv_stops`, `notdienst_url`, `events_calendar_url` und seedet Beispielwerte. Diese Migration ist ein Hinweis, dass der Empty State nicht automatisch "Code fehlt" bedeutet.
- Es gibt mit `modules/waste/services/ics-connector.ts` bereits einen leichten ICS/iCal-Parser inklusive externer URL-Validierung. Der ist fachlich auf Abfalltermine zugeschnitten, aber das Fetch-/Parse-/Validate-Pattern ist wiederverwendbar.
- `modules/info-hub/services/quartier-info-sync.service.ts` selektiert aktuell `quarters.id, lat, lon`, waehrend die aktuelle Typdatei bei `quarters` `center_lat`/`center_lng` zeigt. Das muss vor neuen Geo-Syncs einmal gegen echte DB-Struktur geprueft werden.

Pflicht-Grep `osm|overpass|amenity|pharmacy|apotheke` in `lib/ modules/ app/`:

- `lib/map-geo.ts`: `OVERPASS_URL` und Gebaeude-Overpass fuer `way["building"]`.
- `lib/map-geo.test.ts`: Tests fuer bestehende Gebaeude-Overpass-Query.
- `lib/services/quartier-info.service.ts`: liest `apotheken`.
- `modules/info-hub/types.ts`: `apotheken: Apotheke[]`.
- `modules/info-hub/__tests__/quartier-info-phase2.test.tsx`: Kommentar, dass Apotheken-Konstanten zugunsten `municipal_config.apotheken` entfernt wurden.
- `app/(app)/quartier-info/page.tsx`: Apotheken-UI und Empty State.
- `lib/supabase/database.types.ts`: `municipal_config.apotheken`.
- `lib/constants.ts`: Marketplace/Category-Konstante `pharmacy`.
- `lib/geo/photon-client.ts` und Test: `osm_id`, aber Geocoding, kein POI-Sync.
- Ein einzelner Gesundheits-Tipp enthaelt nur zufaellig "Apotheke".

Pflicht-Grep `rss|ical|events.*sync` in `app/api/cron/ modules/`:

- Relevanter Treffer: `modules/waste/services/ics-connector.ts`.
- Relevanter Verbraucher: `modules/waste/services/sync-engine.ts`.
- Kein Quartier-Events-RSS/iCal-Sync in `app/api/cron/`.
- Viele Treffer sind False Positives, weil `ical` in `medical` und `critical` steckt.

## 2. Datenquellen-Einschaetzung

### OSM Overpass fuer Apotheken

Robust genug als Baseline, aber nicht als alleinige Wahrheit. Fuer sichtbare Quartier-Info ist `amenity=pharmacy` sinnvoll, idealerweise inkl. `healthcare=pharmacy`, Nodes/Ways/Relations, Dedupe per OSM-ID, Name/Adresse/Telefon/Opening-Hours als optionale Felder. Auf dem Land kann OSM sehr gut sein, aber einzelne Telefonnummern/Oeffnungszeiten koennen fehlen oder veraltet sein.

Wichtig: Die oeffentlichen Overpass-Instanzen sind Shared Infrastructure. Die Overpass-Doku sagt selbst, dass public instances zwar moeglichst viel bedienen, sich aber gegen Overuse schuetzen und Apps nicht dauerhaft die public instance als Backend missbrauchen sollten. Fuer uns heisst das: woechentlicher Sync, kleine BBox/Polygon-Queries, Timeout, Backoff, Caching, kein Live-Fetch im User-Request-Pfad.

### RSS/iCal fuer Veranstaltungen

Als "blind Standard-URL-Probe" nur mittel robust. Kommunale Websites sind nicht standardisiert. `/veranstaltungen.rss`, `/events.ics`, `/termine.rss` kann Treffer bringen, wird aber viele Staedte verpassen.

Besserer Tier-1-Ansatz:

- zunaechst eine `events_calendar_url` pro Stadt/Quartier speichern,
- von dort HTML/Sitemap vorsichtig auswerten,
- `link rel="alternate"` fuer RSS/Atom/iCal pruefen,
- JSON-LD `Event` pruefen,
- ICS/RSS nur als validierte Quelle akzeptieren,
- bei Unsicherheit nur Link anzeigen, nicht automatisch Events importieren.

Der vorhandene Waste-ICS-Connector kann als technisches Muster dienen, sollte aber nicht 1:1 fachlich uebernommen werden.

### OpenPLZ, Destatis, GovData, Domain-Pattern

OpenPLZ ist fuer eine operative Onboarding-Pipeline sehr brauchbar: Es bietet REST-Zugriff auf Postleitzahlen, Orte und administrative Gliederung und basiert laut eigener Quellen-Seite fuer Deutschland u.a. auf Destatis GV100/GV-ISys und OSM.

Aber: OpenPLZ ist nicht selbst die amtliche Bundesquelle. Fuer stabile amtliche Identifier sind Destatis GV-ISys / AGS / ARS die bessere Referenz. Destatis selbst beschreibt das Gemeindeverzeichnis als systematische Abbildung der deutschen Verwaltungsstruktur und fuehrt AGS/ARS. GovData ist dagegen eher ein nationaler Metadatenkatalog fuer Open-Data-Datensaetze, nicht die sauberste direkte Municipality-Master-Data-API.

Empfehlung:

- OpenPLZ als Convenience-Layer fuer PLZ, Ort, administrative Suche nutzen.
- AGS/ARS als offizielle Schluessel speichern, wenn verfuegbar.
- Datenquelle und Confidence in Sync-Metadaten ablegen.
- Domain-Pattern nur als Kandidatengenerator verwenden. Offizielle Website besser ueber vorhandene kommunale Daten, OSM/Wikidata-Website-Tags oder manuelle Bestaetigung validieren.

### Notdienst-Apotheken

Fuer Notdienst ist Vorsicht wichtiger als Automatisierung. Aponet zeigt eine offizielle Notdienstsuche auf Basis der Bundesapothekerkammer-Daten, weist aber selbst darauf hin, dass Ergebnisse unverbindlich sein koennen und sich kurzfristig aendern koennen.

Ich wuerde W6 deshalb defer'en, bis API/Terms/Haftung sauber geklaert sind. Kurzfristig reicht ein `notdienst_url` auf die offizielle Suche. Kein eigener Notdienst-Datenimport ohne ausdrueckliche rechtliche/vertragliche Klaerung.

## 3. Wellen-Reihenfolge

Ich wuerde die Reihenfolge leicht anpassen:

1. **W0: Read-only Reality Check + Merge-Regeln**. Warum ist Bad Saeckingen leer, obwohl Mig 130 seedet? Welche `municipal_config`-Zeile haengt am aktiven Quarter? Wie wird Auto-Sync mit manuellen Overrides gemerged? Keine Prod-Schreibaktion.
2. **W1: OSM-POI-Sync fuer Apotheken**. Sichtbarer Nutzen, relativ niedrige DSGVO-Risiken, gut testbar mit Fixtures.
3. **W5 anteilig vorziehen: Sync-Metadaten minimal mit W1**. Schon der erste Auto-Sync braucht `source`, `last_synced_at`, `status`, `error`, `confidence`. Das muss nicht als Dashboard fertig sein, aber das Schema/Modell sollte vor oder mit W1 stehen.
4. **W3: Rathaus-Defaults**. Sinnvoll vor Events, weil Dienstleistungslinks stabiler sind als Veranstaltungskalender.
5. **W2: Events-Crawler**. Nach Rathaus, weil Events am heterogensten sind.
6. **W4: Onboarding-Pipeline**. Erst nach den drei Datenklassen, damit die Pipeline bewiesene Bausteine orchestriert.
7. **W6: Notdienst-Apotheken**. Weiter defer'en, bis API/Terms/Haftung klar sind.

Damit bleibt der sichtbare Effekt von W1 erhalten, aber wir reduzieren das Risiko, automatisch in falsche oder nicht nachvollziehbare Daten zu schreiben.

## 4. Risiken, die ich schaerfer gewichten wuerde

- **OSM-Datenqualitaet auf dem Land:** gute Baseline, aber nicht garantiert vollstaendig. Admin-Override und Source-Badge sind Pflicht.
- **Overpass Fair Use:** public Overpass darf kein dauerhaftes Backend fuer viele Nutzer/Staedte werden. Cron muss sparsam, gecacht und idempotent laufen.
- **Stadt-Domain-Patterns:** deutsche Kommunalwebsites sind zu uneinheitlich fuer harte URL-Annahmen.
- **Auto ueberschreibt Manuell:** Jede Quelle braucht Merge-Regeln. Manuelle Eintraege duerfen nicht durch den naechsten Sync verschwinden.
- **Multi-Quartier pro Stadt:** `municipal_config` pro `quarter_id` dupliziert Stadtinfos. Langfristig waere ein City-Level-Konfiglayer sauberer.
- **DSGVO/AVV:** Overpass/OpenPLZ mit Polygon/PLZ ohne Personendaten ist unkritischer. Notdienst-/Event-APIs muessen trotzdem Terms, Logging und ggf. Drittland/AVV pruefen.
- **Vercel Cron-Limits:** Cron Jobs nutzen normale Function-Limits. Vercel weist auf Duration, fehlende automatische Retries, moegliche Doppel-Ausfuehrung und Lock/Idempotenz hin. Drei neue Cron-Routen sind machbar, sollten aber nicht pro Quartier lange Inline-Jobs werden.
- **Haftung/Vertrauen:** "Apotheke im Quartier" ist Information. "Notdienst jetzt" fuehlt sich nach verlasslicher Gesundheitsinformation an und braucht einen anderen Standard.

## 5. Mig 188

Die vorgeschlagenen drei JSONB-Spalten `auto_sync_status`, `last_synced_at`, `data_source` funktionieren technisch, koennen aber auseinanderlaufen. Ich wuerde fuer MVP eher eine einzige Metadaten-Spalte pro `municipal_config` nehmen:

```json
{
  "apotheken": {
    "status": "ok",
    "last_synced_at": "2026-05-04T10:00:00Z",
    "source": "osm-overpass",
    "confidence": 0.82,
    "manual_overrides": 2,
    "error": null
  },
  "events": {
    "status": "manual",
    "last_synced_at": null,
    "source": "manual",
    "confidence": 1,
    "error": null
  }
}
```

Name z.B. `sync_meta JSONB DEFAULT '{}'`. Das haelt Status, Zeit, Quelle, Confidence und Fehler atomar zusammen.

Wenn spaeter stark gefiltert/ausgewertet werden soll, waere eine normalisierte Tabelle noch sauberer:

`municipal_config_sources(quarter_id, key, status, last_synced_at, source, confidence, details, error)`

Fuer den jetzigen Service-Read-Pfad stoert die Metadaten-Erweiterung nicht, solange `quartier-info.service.ts` weiterhin nur die bestehenden Nutzdaten selektiert. Drei separate JSONB-Spalten wuerden den Read-Pfad ebenfalls nicht stoeren, sind aber pflegeanfaelliger.

Die `quartier_onboarding_log`-Tabelle ist sinnvoll. Ich wuerde direkt einplanen, dass sie spaeter nicht nur Platform-Admin, sondern auch berechtigte `org_admin`/Quartier-Admins read-only sehen koennen, sobald das Admin-Modell dafuer steht.

## 6. Kann W1 jetzt los?

Ja, W1 kann Codex aus meiner Sicht als naechste Implementierungswelle nehmen, aber erst nach W0.

Keine Blocker durch Mig 178. Kein AVV-Blocker fuer Overpass, solange nur PLZ/Polygon/BBox und keine personenbezogenen Daten uebertragen werden. Trotzdem muessen Quellenangabe, ODbL-Hinweis, Rate-Limit/Backoff, Tests mit Fixtures und Manual-Override-Regeln von Anfang an mitgebaut werden.

Nicht mit W1 vermischen:

- kein Notdienst-Datenimport,
- keine Prod-DB-Schreibaktion ohne separaten Founder-Go,
- keine Vercel-Env-Aenderung,
- kein Mig-178-Switch,
- kein automatisches Ueberschreiben manueller Daten.

## Quellen fuer die externe Einordnung

- Overpass API User Manual, Commons/Fair Use: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- OpenPLZ Datenquellen: https://www.openplzapi.org/en/sources/
- OpenPLZ Deutschland-Endpunkte: https://www.openplzapi.org/en/germany/
- Destatis Gemeindeverzeichnis/GV-ISys: https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html
- GovData/FITKO Entwicklungsportal: https://docs.fitko.de/resources/govdata/
- Vercel Cron Usage & Pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel Cron Management/Idempotenz/Duration: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Aponet Notdienstsuche: https://www.aponet.de/notdienstsuche
