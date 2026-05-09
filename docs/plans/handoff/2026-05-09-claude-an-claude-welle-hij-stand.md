# Brief: Claude → Claude (naechste Session) — Welle H+I+J fertig

**Datum:** 2026-05-09 nacht (nach Welle G)
**Owner:** claude
**Vorherige Session:** Welle G (Test-Helper-Pflicht) → 3 weitere Wellen H+I+J in einem Block.

## Stand

- master (nachbar-io): `5fb2fb5` (Welle J).
- Master-Reihenfolge:
  - `dab4632` Welle G — Test-Helper-Pflicht (is_test_user=true zentral)
  - `cc009aa` Welle G Handover-Brief
  - `8eb2afa` Welle H — EFA-BW Stop-Finder + Discover-Endpoint
  - `08bc61f` Welle I — OEPNV Stops Apply-Endpoint
  - `5fb2fb5` Welle J — Feed-URL-Prober
- Push-Kette gruen, master==origin.

## Was Welle H geliefert hat (Commit 8eb2afa)

### H.1 — EFA-BW Stop-Finder Pure Module

`lib/oepnv/efa-bw-stop-finder.ts` mit zwei Exports:

- `parseStopFinderResponse(json)` — robust gegen leere/fehlerhafte Responses; akzeptiert beide EFA-Varianten (`points: Array` und `points.point: Array|Object`); parsed `lng,lat`-Coords (EFA-Reihenfolge!), klassifiziert `stop|platform|address|unknown`, optionales `distanceMeters`.
- `findEfaBwStopsNearCoordinate({lat,lng,limit?,timeoutMs?}, deps?)` — fetch-Wrapper. URL-Bau mit `XSLT_STOPFINDER_REQUEST?outputFormat=JSON&type_sf=any&name_sf=<lat>:<lng>:WGS84[DD.dddddd]&coordOutputFormat=...`. Default-Limit 5, Timeout 5000ms. Bei HTTP-Error oder Netzfehler: leeres Array (loggt aber).

### H.2 — Discovery-Service

`modules/info-hub/services/oepnv-stops-discovery.service.ts` mit `discoverOepnvStopsForQuarter(supabase, quarterId, options?)`:

- Liest `quarters.center_lat/center_lng`.
- Wirft, wenn Quartier nicht existiert.
- Liefert `errors`-Array, wenn Center fehlt (kein Fetch-Aufruf).
- Bei Netzfehler: leeres `stops`-Array + Error-Eintrag.

### H.3 — Admin-API-Route

`app/api/admin/quarters/[id]/oepnv-stops/discover/route.ts`:

- GET, super_admin-only.
- `?limit=10` Query-Param, geclamped auf [1, 25].
- Liefert JSON `{quarterId, quarterName, centerLat, centerLng, stops, fetchedAt, errors}`.

### Tests Welle H

23 Tests in 3 Files:
- `__tests__/lib/oepnv/efa-bw-stop-finder.test.ts` (8 parser + 6 fetch wrapper)
- `__tests__/modules/info-hub/oepnv-stops-discovery.test.ts` (5 Service)
- `__tests__/api/admin/quarters/oepnv-stops-discover.test.ts` (5 Route)

## Was Welle I geliefert hat (Commit 08bc61f)

### I.1 — Apply-Service

`modules/info-hub/services/oepnv-stops-apply.service.ts` mit `applyOepnvStopsForQuarter(supabase, quarterId, stops)`:

- Validiert: `stops` Array, jedes Element `{id: string, name: string}` (beide non-empty), max 25.
- Trim, Dedupe nach `id`.
- Schreibt `oepnv_stops` + `updated_at` in `municipal_config` per `update().eq('quarter_id', quarterId)`.
- Wirft bei Validierungs- oder DB-Fehlern.

### I.2 — Admin-API-Route

`app/api/admin/quarters/[id]/oepnv-stops/route.ts`:

- POST, super_admin-only.
- Body `{stops: [{id, name}, ...]}`.
- 400 bei fehlendem stops-Array.
- 200 mit `{savedCount}` bei Erfolg.

### Tests Welle I

13 Tests in 2 Files:
- `__tests__/modules/info-hub/oepnv-stops-apply.test.ts` (8 Service)
- `__tests__/api/admin/quarters/oepnv-stops-apply.test.ts` (5 Route)

## Was Welle J geliefert hat (Commit 5fb2fb5)

### J.1 — Feed-URL-Prober

`lib/events/feed-url-prober.ts` mit `probeFeedUrls(domain, deps?, options?)`:

- Probt Default-Pfade: RSS = `/veranstaltungen.rss`, `/termine.rss`, `/events.rss`, `/feed/veranstaltungen` · iCal = `/events.ics`, `/veranstaltungen.ics`, `/termine.ics`.
- GET pro Pfad mit Content-Type-Check (xml/rss/atom fuer RSS, calendar/ics fuer iCal).
- Erste Treffer-URL gewinnt.
- Domain-Normalisierung: ergaenzt `https://` und entfernt trailing slash.
- Fetch-Fehler werden in `errors`-Array aufgenommen, nicht geworfen.
- Custom Pfade via `options.rssPaths` / `options.icalPaths`.

### Tests Welle J

10 Tests in 1 File: `__tests__/lib/events/feed-url-prober.test.ts`.

## Verifikation

- `npx tsc --noEmit` → Exit 0.
- `npx eslint <changed>` → 0 Errors.
- `npx vitest run` auf alle 6 neuen Test-Files → **46 Tests gruen**.
- 4 Commits, 4 Pushes erfolgreich.

## Pre-Check-Befunde (zur Doku)

| Welle | Plan fordert | Existierte bereits |
|---|---|---|
| H | EFA-BW Stop-Finder | NUR Departure-Client (`oepnv-client.ts`) — Stop-Finder fehlte komplett |
| I | Apply-Endpoint fuer oepnv_stops | NICHT existiert — Welle H schreibt explizit nichts in DB |
| J | RSS/iCal-Feed-URL-Prober | NICHT existiert — nur in Plan-Texten erwaehnt |

W3-Rathaus-Defaults UND W6-Notdienst-Apotheken waren bereits implementiert (Pre-Check entdeckte: `lib/municipal/default-service-links.ts` + Mig 130 mit aponet.de-URLs fuer alle Quartiere). Mein erster "weitermachen"-Reflex auf einen Notdienst-Helper waere Duplikat geworden — Pre-Check hat gerettet.

## Was naechste Woche fehlt

Reihenfolge wie Welle-G-Brief, plus Folgen aus H+I+J:

1. ~~Welle G Test-Helper-Pflicht~~ ✓
2. ~~Welle H EFA-BW Stop-Finder~~ ✓
3. ~~Welle I OEPNV Stops Apply~~ ✓
4. ~~Welle J Feed-URL-Prober~~ ✓
5. **Live-Dry-Run Welle E gegen Prod-DB** — Founder-Hand. Allowlist setzen, dry-run ausfuehren.
6. **Echt-Loeschen** — Founder-Hand. Execute-Pfad mit Bestaetigung `AI-TESTNUTZER LOESCHEN:<count>`.
7. **Mig 189 Apply gegen Prod** — Founder-Hand.
8. **Pilot-Akquise** — Founder-Hand.
9. **GmbH-Kette** — Founder-Hand.
10. **W2 RSS/iCal-Feed-Crawler-Service** (nutzt Welle J) — externer Feed periodisch lesen, in `events`-Tabelle schreiben oder direkt in `municipal_config.events`. Mittel, ~4-6h.
11. **Admin-UI fuer OEPNV-Discover/Apply** — `/admin/quartiere/[id]/oepnv-stops`-Page mit Vorschau aus Welle H + Speichern via Welle I. Klein, ~2-3h, aber UI → Browser-Verifikation noetig.
12. **W4 Onboarding-Pipeline** — verbindet `buildMunicipalServiceLinks` (existiert), Welle H/I, Welle J in einem `/api/admin/quartiere/onboard`-Endpoint. Gross, ~6-8h.
13. **Telefonie-Spike** — LiveKit + Voxtral + Mistral, 1 Tag.

## Was die naechste Session sofort tun sollte

- Wenn Founder Welle 11 (Admin-UI) priorisiert: `app/(app)/admin/quartiere/[id]/oepnv-stops/page.tsx` bauen, ruft Discover-GET auf, zeigt Liste mit Checkboxen, sendet Auswahl an Apply-POST. Pre-Check: gibt es schon eine Admin-Quartier-Detail-Page?
- Wenn Welle 10 (Feed-Crawler-Service): `modules/info-hub/services/external-events-crawler.service.ts` bauen, der den von Welle J entdeckten RSS/iCal-Feed parsed. RSS-Parser-Lib evaluieren (z.B. `fast-xml-parser`).
- Wenn Welle 12 (Onboarding): Spec klaeren mit Founder, dann `/api/admin/quartiere/onboard`-Endpoint mit Schritten 1-9 aus Plan.

## Was die naechste Session NICHT tun sollte

- Mig 189 apply'en (Rote Zone).
- Welle E Execute-Pfad starten (Rote Zone).
- Vercel-Env aendern.
- Provider-Live (Anthropic/Mistral).
- Push auf master OHNE TDD.
- Notdienst-Apotheken-API-Sync starten — Codex hat W6 wegen Rechtsklaerung defer'd.

## Dateien-Pointer

- Welle H: `lib/oepnv/efa-bw-stop-finder.ts`, `modules/info-hub/services/oepnv-stops-discovery.service.ts`, `app/api/admin/quarters/[id]/oepnv-stops/discover/route.ts`
- Welle I: `modules/info-hub/services/oepnv-stops-apply.service.ts`, `app/api/admin/quarters/[id]/oepnv-stops/route.ts`
- Welle J: `lib/events/feed-url-prober.ts`
- Welle G (vorher): `tests/e2e/helpers/test-user-factory.ts`, `__tests__/_helpers/test-user-builder.ts`

## Rote Zone bei naechster Session

- master push autonom (Variante A) ✓
- Vercel-Env: NEIN.
- Mig-Apply auf Prod: NEIN.
- Provider/Geld: NEIN.
- Echtes DB-Loeschen: NEIN.

## Founder-Regel-Update (Session 2026-05-09 nacht)

Founder hat klargestellt: **Bis mindestens 60% Token-Verbrauch durcharbeiten**, in groesseren Schritten. Frueheres Stoppen bei 28% war zu vorsichtig. Memory-Eintrag: `feedback_token_threshold_60_prozent.md`.
