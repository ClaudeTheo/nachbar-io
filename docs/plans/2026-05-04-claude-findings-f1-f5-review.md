# Claude-Findings F-1 bis F-5 Review

Stand: 2026-05-04

## Anlass

Claude meldete vier offene Punkte:

| Finding | Claude-Status |
|---|---|
| F-1 PDF-Token Klartext | offen |
| F-2 KI-Routen ohne Rate-Limit | offen |
| F-4 Speed-Dial `userId`-Query | offen |
| F-5 Mig 186 Prod-Apply | offen, rote Zone |

Diese Datei dokumentiert den Abgleich gegen den aktuellen `master`.

## Ergebnis

| Finding | Aktueller Befund | Aktion |
|---|---|---|
| F-1 PDF-Token Klartext | Bestaetigt: `app/api/care/emergency-profile/token/route.ts` schrieb `pdf_token` im Klartext; `app/notfall/[token]/page.tsx` suchte per Klartext. | Lokal migrationskompatibel gehaertet. |
| F-2 KI-Routen ohne Rate-Limit | Stale: `consumeAiDailyUserLimit` ist in `app/api/companion/chat/route.ts` und `app/api/ai/onboarding/turn/route.ts` eingebunden. | Mit bestehenden Tests erneut verifiziert. |
| F-4 Speed-Dial `userId`-Query | Stale/verkürzt: `userId = searchParams.get("userId") || user.id` existiert noch, aber danach greift `canAccessSpeedDialUser()` gegen aktive `caregiver_links`; fremde Nutzer ohne Link bekommen 403. | Mit bestehenden Tests erneut verifiziert. |
| F-5 Mig 186 Prod-Apply | Bestaetigt offen, aber rote Zone. | Nicht angewendet. Bleibt Founder-Go-pflichtig. |

## F-1 Umsetzung

Neu:

- `lib/care/pdf-token.ts`
  - `hashEmergencyPdfToken(token)` berechnet SHA-256.
  - `isMissingPdfTokenHashColumn(error)` erkennt Schema-Drift vor Migration 187.
- `app/api/care/emergency-profile/token/route.ts`
  - schreibt zuerst `pdf_token_hash` und setzt `pdf_token` auf `null`.
  - faellt nur dann auf Legacy-`pdf_token` zurueck, wenn die neue Spalte noch fehlt.
- `app/notfall/[token]/page.tsx`
  - sucht zuerst per `pdf_token_hash`.
  - faellt nur bei fehlender Spalte auf Legacy-`pdf_token` zurueck.
- `app/api/care/emergency-profile/route.ts`
  - gibt gespeicherte Legacy-`pdf_token` nicht mehr als `pdfToken` an den Client zurueck.
- `supabase/migrations/187_emergency_pdf_token_hash.sql`
  - legt `pdf_token_hash` an.
  - hasht bestehende `pdf_token`-Werte.
  - legt einen partiellen Unique-Index auf `pdf_token_hash`.
  - setzt bestehende Klartext-`pdf_token` nach erfolgreichem Backfill auf `null`.

Wichtig:

- Migration 187 wurde nur als Datei angelegt.
- Keine Migration wurde lokal oder remote angewendet.
- Bis Migration 187 angewendet ist, bleibt der Legacy-Fallback aktiv, damit ein Deploy nicht an fehlender Spalte bricht.
- Der Befund F-1 ist code-seitig vorbereitet; vollstaendig geschlossen ist er erst nach separatem Founder-Go fuer Migration 187.

## Verifikation

RED:

```powershell
npx vitest run __tests__/api/care/emergency-profile-token.test.ts __tests__/app/notfall-token-hash.test.tsx
npx vitest run __tests__/api/care/emergency-profile.test.ts
```

Die Tests schlugen vor der Implementierung erwartbar fehl:

- Token-Route speicherte Klartext in `pdf_token`.
- Public-Page suchte per `pdf_token`.
- GET-Route gab Legacy-`pdf_token` als `pdfToken` zurueck.

GREEN / Regression:

```powershell
npx vitest run __tests__/api/care/emergency-profile-token.test.ts __tests__/app/notfall-token-hash.test.tsx __tests__/api/care/emergency-profile.test.ts __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts
npx eslint app/api/care/emergency-profile/token/route.ts app/api/care/emergency-profile/route.ts "app/notfall/[token]/page.tsx" lib/care/pdf-token.ts __tests__/api/care/emergency-profile-token.test.ts __tests__/app/notfall-token-hash.test.tsx __tests__/api/care/emergency-profile.test.ts --no-warn-ignored
npx tsc --noEmit
```

Ergebnis:

- Vitest: 8 Test Files passed, 75 Tests passed
- ESLint: clean
- TypeScript: clean

## Rote Zonen

Nicht getan:

- kein Prod-DB-Write
- keine Migration angewendet
- kein `schema_migrations`-Insert
- keine Vercel-Env-Aenderung
- keine Secrets gelesen oder ausgegeben
- alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` nicht beruehrt

## Naechste Founder-Gates

- Migration 186 bleibt separat Founder-Go-pflichtig.
- Migration 187 ist neu als Datei vorbereitet und muss vor echter Schliessung von F-1 bewusst geplant/getestet/angewendet werden.
- Nach Migration 187 sollte ein read-only Smoke pruefen:
  - `emergency_profiles.pdf_token_hash` existiert.
  - alte `pdf_token`-Werte sind `null`.
  - neuer QR-Code generiert weiter einen funktionierenden `/notfall/<token>`-Link.
