# Handoff: Browser-Audit Fixes — DONE

## Stand
- Branch: `feature/hausverwaltung`
- HEAD: `8ec9aeb`
- Datum: `2026-04-20 20:14 +02:00`
- Testergebnis: `npx tsc --noEmit` gruen, `npm run test -- --run` gruen (`467 passed`, `3721 passed`, `3 skipped`)

## Fix 1 — Public-Info-Fehlerpfad
- Commit-SHA: `108da59`
- Geaenderte Dateien: `app/api/housing/invitations/[token]/info/route.ts`, `app/einladung/[token]/page.tsx`, `__tests__/api/housing/invitations.test.ts`, `__tests__/app/einladung/landing.test.tsx`
- Tests hinzu/angepasst:
  - API: 404 bei unbekanntem Token, 404 bei `PGRST116`, 404 ohne interne Details bei Schema-Fehler
  - Landing: generische Public-Fehlermeldung auch bei technischem API-Error
- Pre-Check-Ergebnis:
  - Gefunden: bestehende Housing-Reads in `app/api/housing/invitations/[token]/info/route.ts` und `lib/housing/invitations.ts`
  - Gefunden: kein zentraler PostgREST-Error-Mapper fuer Housing
  - Gefunden: bestehende Tests in `__tests__/api/housing/invitations.test.ts` und `__tests__/app/einladung/landing.test.tsx`
  - Neu gebaut: kein neuer Helper, nur bestehende Route/Page/Test-Sammelstellen erweitert
- Kurzer Before/After:
  - Before: Schema-/Table-Fehler liefen als `500` bis in die Public-UI durch
  - After: API antwortet generisch mit `404 {"error":"invitation_not_found"}`, serverseitig wird geloggt, die Landing zeigt nur `Einladung ungueltig oder abgelaufen.`

## Fix 2 — next-Param Redirect
- Commit-SHA: `8ec9aeb`
- Geaenderte Dateien: `lib/supabase/middleware.ts`, `app/(auth)/login/page.tsx`, `app/auth/callback/route.ts`, `lib/auth/post-login-redirect.ts`, `__tests__/lib/supabase/middleware.test.ts`, `__tests__/app/login-page.test.tsx`, `__tests__/lib/auth/post-login-redirect.test.ts`
- Tests hinzu/angepasst:
  - Middleware: `next` an Redirect angehaengt, Query-Parameter bleiben erhalten
  - Login-Page: `next` wird in OTP-/Magic-Link-Flow weitergereicht
  - Redirect-Helper: interner Pfad bleibt erhalten, externer Pfad faellt sicher auf Fallback zurueck
- Pre-Check-Ergebnis:
  - Gefunden: Top-Level geht ueber `proxy.ts`, eigentlicher Auth-Redirect sitzt in `lib/supabase/middleware.ts`
  - Gefunden: bestehende Redirect-Infrastruktur in `lib/auth/post-login-redirect.ts` und `app/auth/callback/route.ts`
  - Gefunden: bestehende Tests in `__tests__/lib/supabase/middleware.test.ts` und `__tests__/app/login-page.test.tsx`
  - Neu gebaut: kein neuer Redirect-Stack; bestehende Middleware/Login/Callback-Kette repariert
- Kurzer Before/After:
  - Before: `/hausverwaltung/einladen?foo=bar` redirectete auf `/login` oder liess Query-Noise stehen, der Rueckweg ging verloren
  - After: Redirect geht auf `/login?next=%2Fhausverwaltung%2Feinladen%3Ffoo%3Dbar`, und der Login-Flow traegt dieses Ziel sauber bis in Callback/OTP weiter

## Fix 3a — Mig 180 lokal
- Nicht applyed.
- Grund: roter Zonen-Stop nach Pre-Check. `nachbar-io/.env.local` zeigt auf `NEXT_PUBLIC_SUPABASE_URL="https://uylszchlyhbpbmslcnka.supabase.co"`, also auf einen Cloud-Stack, nicht auf `localhost`/`127.0.0.1`.
- Zusaetzlicher Befund: `supabase/config.toml` existiert zwar fuer lokalen Supabase-CLI-Stack, aber das aktuell von App und Dev-Server genutzte Backend ist laut `.env.local` die Cloud-Instanz.
- Output: kein `supabase migration up` ausgefuehrt, kein DB-Write, kein Founder-Go eingeholt.

## Fix 3b — Auth-Profile
- Nicht refreshed.
- Als Follow-up vermerkt: Die vorhandenen `.auth`-States sind abgelaufen, und die repo-eigenen E2E-Credentials lieferten im Browser-Audit `Invalid login credentials`.

## Offen fuer Claude
- Valid-token Browser-E2E fuer den Housing-/Einladungs-Flow bleibt offen, bis Founder-Go fuer den genutzten Cloud-Stack vorliegt oder die App auf einen explizit lokalen Supabase-Stack zeigt.
- Auth-Profile / E2E-Testnutzer sollten separat refreshed werden, damit der Rueckweg nach Login auch real im Browser komplett bis `/hausverwaltung/einladen` durchgetestet werden kann.

## Blocker / Rote Zone beruehrt
- Fix 3a bewusst gestoppt: Migration 180 wurde nicht auf den per `.env.local` konfigurierten Cloud-Supabase-Stack angewendet.
- Kein Push.
- Keine Prod-DB- oder Cloud-DB-Aenderung.
