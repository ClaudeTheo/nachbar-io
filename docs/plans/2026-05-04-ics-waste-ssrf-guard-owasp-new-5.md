# ICS-Waste SSRF-Guard — OWASP NEW-5

Datum: 2026-05-04
Owner: Codex
Status: verifiziert und lokal committed

## Anlass

Claude meldete eine SSRF-Luecke im ICS-Waste-Connector:

- `modules/waste/services/ics-connector.ts` fetcht `config.url` direkt.
- Die URL stammt ueber `modules/waste/services/sync-engine.ts` aus `waste_collection_areas.ics_url`.
- Vorhandenes Schutzmuster existierte bereits in `lib/webhooks.ts`.

## Pre-Check

- `isValidWebhookUrl()` existiert und blockt Nicht-HTTPS, localhost, private IPv4, link-local/Metadata und numerische IPv4-Hosts.
- `fetchIcsWasteDates({ url })` und `checkIcsHealth(url)` waren bisher ohne diesen Guard.
- `file_content`-basierte ICS-Imports sind kein Netzwerk-Fetch und bleiben unveraendert erlaubt.

## Umsetzung

- `lib/webhooks.ts` exportiert jetzt `isValidExternalUrl()`.
- `isValidWebhookUrl()` bleibt als kompatibler Alias erhalten.
- `fetchIcsWasteDates()` validiert `config.url` vor dem `fetch`.
- `checkIcsHealth()` validiert ebenfalls vor dem HEAD-Request.

## Tests

Angepasst:

- `lib/__tests__/webhooks.test.ts`
- `__tests__/lib/waste/ics-connector.test.ts`

Abgedeckt:

- externe HTTPS-URLs erlaubt
- HTTP, ungueltige URLs und numerische Hosts blockiert
- localhost/private/link-local/Metadata-URLs blockiert
- ICS-Fetch ruft bei blockierten URLs `fetch` nicht auf
- Health-Check ruft bei blockierten URLs `fetch` nicht auf
- `file_content`-Parsing bleibt gruen

## Verifikation

- `npx vitest run lib/__tests__/webhooks.test.ts __tests__/lib/waste/ics-connector.test.ts` — 25 passed
- `npm run test` — 546 Test Files passed, 4050 passed, 1 skipped
- `npm run lint` — gruen
- `npx tsc --noEmit` — gruen
- `npm run build` — gruen

## Rote Zonen

Keine Prod-DB-Schreibaktion, keine Migration, keine Vercel-Env-Aenderung, keine Secrets gelesen oder ausgegeben.
