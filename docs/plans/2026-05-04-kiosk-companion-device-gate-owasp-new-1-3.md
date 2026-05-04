# Kiosk-Companion Device Gate — OWASP NEW-1/2/3

Datum: 2026-05-04
Owner: Codex
Status: verifiziert und lokal committed

## Anlass

Claude meldete drei gekoppelte Befunde fuer `app/api/kiosk/companion/route.ts`:

- NEW-1: public Route konnte `user_id` aus dem Body mit Service-Role fuer Memory laden.
- NEW-2: KI-Limit war in-memory und ueber Body-`user_id` umgehbar.
- NEW-3: clientseitige `history` konnte gefaelschte Assistant-Turns in den Provider-Kontext bringen.

## Pre-Check

Die Route ist nicht offensichtlich tot:

- `app/(kiosk)/kiosk/page.tsx` verlinkt `/kiosk/companion`.
- `app/(kiosk)/kiosk/companion/page.tsx` ruft `/api/kiosk/companion` auf.
- `loadMemoryContext(..., "kiosk_plus")` fuehrt ueber `modules/memory/services/memory-loader.ts` auf den Plus-Memory-Scope.
- Device-Auth-Pattern existiert bereits in `app/api/escalation/sos/route.ts` und `app/api/care/emergency-profile/kiosk/route.ts`.

Entscheidung: Route nicht loeschen, sondern wie SOS/Kiosk-Emergency an Device-Token plus Bewohnerbindung binden.

## Umsetzung

- `POST /api/kiosk/companion` verlangt jetzt `x-device-token` und `deviceId`.
- Verifikation laeuft zuerst gegen `kiosk_devices`, danach als Pilot-/Legacy-Fallback gegen `KIOSK_DEVICE_TOKEN`.
- `boundUserId` kommt nur aus `device.user_id` oder `KIOSK_DEVICE_USER_ID`.
- Ein mitgesendetes `user_id`/`userId` darf nur noch mit `boundUserId` uebereinstimmen; sonst 403.
- Redis-basierter `consumeAiDailyUserLimit({ userId: boundUserId })` laeuft vor Memory-Load und Provider-Call; Redis-Ausfall ist fail-closed.
- Clientseitige Chat-History wird serverseitig nicht mehr in den Provider-Kontext uebernommen.
- Die Kiosk-Seite sendet keine `history` mehr und reicht vorhandene lokale Device-Daten an die Route durch.

## Tests

Neu: `__tests__/api/kiosk-companion-security.test.ts`

Abgedeckt:

- 401 ohne `x-device-token`
- 400 ohne `deviceId`
- 403 bei Spoofing gegen ENV-Bindung
- 403 bei Spoofing gegen DB-Bindung
- Memory-Load und Rate-Limit nutzen nur `boundUserId`
- Provider-History ist leer trotz gefaelschtem Assistant-Turn im Body
- Rate-Limit blockt fail-closed vor Memory/Provider

Gesamtverifikation:

- `npx vitest run __tests__/api/kiosk-companion-security.test.ts __tests__/api/sos-events.test.ts __tests__/api/emergency-profile-kiosk.test.ts` — 23 passed
- `npm run test` — 545 Test Files passed, 4039 passed, 1 skipped
- `npm run lint` — gruen
- `npx tsc --noEmit` — gruen
- `npm run build` — gruen

Dabei wurde eine bestehende Test-Hygiene-Luecke mitbehoben: Rollback 187 liegt jetzt wie die anderen Rollbacks unter `supabase/rollbacks`, und der Companion-Streaming-Test mockt den seit F-2 vorhandenen KI-Rate-Limiter.

## Rote Zonen

Keine Prod-DB-Schreibaktion, keine Migration, keine Vercel-Env-Aenderung, keine Secrets gelesen oder ausgegeben.
