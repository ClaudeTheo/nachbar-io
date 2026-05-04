# F-4 Speed-Dial userId Server-Gate

Stand: 2026-05-04

## Ziel

Security-Zweitmeinung F-4 lokal schliessen: `/api/speed-dial` darf fremde
Bewohner-IDs nicht nur an RLS delegieren, sondern muss serverseitig pruefen,
ob der authentifizierte Nutzer entweder die eigene Kurzwahl liest/schreibt
oder als aktiver Caregiver fuer den Bewohner verknuepft ist.

Scope dieser Welle:

- `GET /api/speed-dial?userId=...`
- `POST /api/speed-dial` mit Body-`user_id`
- Keine RLS-Aenderung, keine Migration, keine Prod-DB-Aktion.

## Pre-Check

Vor Umsetzung gelesen/geprueft:

- `AGENTS.md`
- `nachbar-io/AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md`
- `../.claude/rules/pre-check.md`
- `../.claude/rules/testing.md`

Repo-Suche:

- `rg "speed_dial|speed-dial|speed dial|favorite|favorites|caregiver_links|care_helper|userId" app lib modules __tests__ supabase/migrations docs/plans`

Ergebnis:

- Bestehende Route: `app/api/speed-dial/route.ts`
- Bestehende Tests: `__tests__/api/speed-dial.test.ts`,
  `__tests__/integration/speed-dial-sos.test.ts`
- Bestehende RLS: `supabase/migrations/123_speed_dial_favorites.sql`
  erlaubt eigene Favoriten plus aktive `caregiver_links`.
- Deshalb kein Neubau und keine Migration, sondern expliziter Server-Gate in
  der vorhandenen Route.

## TDD

RED zuerst:

- `npx vitest run __tests__/api/speed-dial.test.ts -t "fremdes Profil|fremden Bewohner"`
  - erwartete Failures: Route fragte `caregiver_links` nicht ab; fremdes GET
    lieferte 200; fremdes POST lieferte 201.

GREEN nach Umsetzung:

- `npx vitest run __tests__/api/speed-dial.test.ts -t "fremdes Profil|fremden Bewohner"` -> 3 passed
- `npx vitest run __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts` -> 23 passed

## Umsetzung

- Neuer Helper `canAccessSpeedDialUser(...)` in `app/api/speed-dial/route.ts`
  - eigene `user.id` ist erlaubt.
  - fremde `targetUserId` braucht aktiven `caregiver_links`-Eintrag:
    `caregiver_id = auth user`, `resident_id = target`, `revoked_at IS NULL`.
  - Fehler/fehlender Link fail-closed.
- `GET /api/speed-dial`
  - prueft `userId` vor `speed_dial_favorites`-Abfrage.
  - ohne Link: 403.
- `POST /api/speed-dial`
  - prueft Body-`user_id` vor Count/Insert.
  - ohne Link: 403.

## Verifikation

- `npx vitest run __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts` -> 23 passed
- `npx eslint app/api/speed-dial/route.ts __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts --no-warn-ignored` -> clean
- `npx tsc --noEmit` -> clean
- `npm run build` -> Exit 0; nur bekannte lokale Warnung:
  `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`

## Sperren

Nicht gemacht:

- Kein Prod-DB-Write.
- Keine Migration.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine Secrets gelesen.
- Keine echten personenbezogenen Daten.
- Kein Push.
