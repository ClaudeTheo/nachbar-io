# Pilot-Feature-Gating C1-C6 — Codex Handover

**Stand:** 2026-04-30 15:28 +02:00  
**Repo:** `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`  
**Branch:** `master`  
**Status:** lokal vor `origin/master` um 26 Commits, kein Push, kein Deploy

## Kurzfazit

Die Pilot-Feature-Gating-Welle C1-C6 ist lokal umgesetzt und committed.
Alle verlangten Verifikationen waren zum Abschluss gruen:

- `npx vitest run` -> 3880 passed / 1 skipped / 0 failed
- `npx eslint --max-warnings 200` -> exit 0
- `npx tsc --noEmit` -> exit 0

Es wurden keine Prod-DB-Schreibaktionen, keine Migration-Applys, kein
`schema_migrations`-Insert, kein Push und kein Deploy ausgefuehrt.

## Commits dieser Welle

| Block | Commit | Inhalt |
|---|---|---|
| C1 | `e687488` | `PILOT_MODE`-Bypass aus Feature-Flag-Logik entfernt |
| C2 | `5e88b85` | Audit-Log-Migration 176 + Reason-Feld in Admin-UI |
| C3 | `3843297` | Billing/Stripe/Check-in-Gates + Migration 177 |
| C4 | `d378562` | Phase-Preset-API + Admin-Dialog-Buttons |
| C5 | `9034914` | Migration 178 apply-later fuer Phase-1-Defaults |
| C6 | `2057328` | INBOX-Sweep / Handoff-Board geschlossen |

## Technische Aenderungen

### C1: PILOT_MODE-Bypass entfernt

Geaendert:

- `lib/feature-flags-server.ts`
- `lib/feature-flags.ts`
- `lib/feature-flags-middleware-cache.ts`

`NEXT_PUBLIC_PILOT_MODE` wirkt nicht mehr als Feature-Flag-Bypass. Disabled
Flags bleiben disabled, auch serverseitig und im Middleware-Cache.
UI-/Pilot-Indikator-Nutzungen wurden nicht entfernt.

### C2: Audit-Log

Neue Migration-Dateien:

- `supabase/migrations/176_feature_flags_audit_log.sql`
- `supabase/migrations/176_feature_flags_audit_log.down.sql`

Enthaelt:

- `feature_flags.last_change_reason`
- `public.feature_flags_audit_log`
- RLS-Policy fuer Admin-Read
- Trigger-Funktion `public.log_feature_flag_change()`
- Trigger `feature_flags_audit_log_trigger`

Admin-UI:

- `FeatureFlagManager.tsx` hat ein optionales Feld `Grund (optional)`.
- Toggle-Updates schreiben `last_change_reason`.

Wichtig: Migration 176 wurde nur als Datei committed, nicht angewendet.

### C3: Neue Schutzflags und Route-Gates

Neue Migration-Dateien:

- `supabase/migrations/177_pilot_phase_flags.sql`
- `supabase/migrations/177_pilot_phase_flags.down.sql`

Neue Flags:

- `BILLING_ENABLED=false`
- `TWILIO_ENABLED=false`
- `CHECKIN_MESSAGES_ENABLED=false`

Gegatete reale Routen im aktuellen Checkout:

- `app/api/billing/checkout/route.ts`
- `app/api/billing/webhook/route.ts`
- `app/api/hilfe/checkout/route.ts`
- `app/api/prevention/booking/checkout/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/api/care/checkin/route.ts` nur `POST`

Hinweis: `app/api/checkout/**`, `app/api/stripe/**` und `app/api/twilio/**`
existierten im aktuellen Checkout nicht. Darum wurden reale Stripe-/Checkout-
Flächen aus dem Code gegatet statt nicht existierende Plan-Pfade anzulegen.
Webhook-Spezialfall: bei `BILLING_ENABLED=false` antworten Webhooks mit 200
und leerem Body, ohne Event-Verarbeitung, plus Log
`billing_disabled_webhook_received`.

### C4: Phase-Preset-API und Admin-Buttons

Neue Dateien:

- `lib/feature-flags-presets.ts`
- `lib/feature-flags-cache.ts`
- `app/api/admin/feature-flags/preset/route.ts`
- `__tests__/api/admin/feature-flags-preset.test.ts`

Admin-UI:

- Buttons oben in `FeatureFlagManager.tsx`
- `Phase 0 (Closed Pilot)`
- `Phase 1 (echte Tester)`
- `Phase 2 (nach HR + AVV)` disabled
- Dialog mit Tipp-Bestaetigung `PHASE_0`/`PHASE_1`

API:

- `POST /api/admin/feature-flags/preset`
- Body: `{ phase, confirm }`
- Admin-Check analog bestehender Admin-Routen via `users.is_admin`
- Confirm-Mismatch -> 400
- Nicht-Admin -> 403
- Upsert auf `feature_flags` mit `last_change_reason="phase-preset:<phase>"`
- Cache-Invalidate einmal nach erfolgreichem Upsert

Technischer Hinweis fuer Review: Die API nutzt ein bulk `upsert` auf
`feature_flags`. Das ist ein einzelner PostgREST-Request und loest den
Audit-Trigger pro Zeile aus. Explizite SQL-Transaktionsfunktion wurde nicht
gebaut, weil keine bestehende RPC-Infrastruktur dafuer vorhanden war und
Neubau klein gehalten wurde.

### C5: Apply-later Migration

Neue Migration-Dateien:

- `supabase/migrations/178_pilot_phase_1_defaults.sql`
- `supabase/migrations/178_pilot_phase_1_defaults.down.sql`

Header enthaelt:

`DO NOT APPLY TO PROD UNTIL FOUNDER-GO FOR PHASE-1 SWITCH`

Setzt nur die laut Spec Phase-1-OFF-Flags auf `false`, idempotent via
`enabled is distinct from false`.

Nicht enthalten:

- `BILLING_ENABLED`
- `TWILIO_ENABLED`
- `CHECKIN_MESSAGES_ENABLED`

Diese bleiben durch Migration 177 bereits default-off.

Wichtig: Migration 178 wurde nicht angewendet, auch nicht lokal.

## Tests / Verifikation

Abschlussverifikation nach C6:

```bash
npx vitest run
npx eslint --max-warnings 200
npx tsc --noEmit
```

Ergebnis:

- Vitest: 499 Testfiles passed, 3880 passed, 1 skipped
- ESLint: exit 0
- TypeScript: exit 0

Bekannte normale Vitest-Ausgabe:

- Mehrfach `Not implemented: HTMLMediaElement's play() method`
- Exit bleibt 0.

## Working Tree

Nach Abschluss:

- Keine tracked changes.
- Untracked unveraendert nicht angefasst:
  - `docs/plans/2026-04-21-rotation-continue-prompt.md`
  - `docs/plans/2026-04-21-rotation-status-handover.md`
  - `docs/plans/2026-04-21-session-end-handover.md`
  - `docs/plans/2026-04-22-cleanup-morgen-handover.md`
  - `docs/plans/2026-04-22-cleanup-status-handover.md`
  - `docs/plans/2026-04-22-rotation-followups.md`
  - `docs/plans/2026-04-25-cleanup-abgeschlossen-handover.md`
  - `docs/plans/2026-04-25-codex-handover-closed-pilot.md`
  - `docs/plans/2026-04-25-naechste-session-handover.md`
  - `docs/plans/2026-04-26-ai-testnutzer-cleanup-dry-run-bericht.md`
  - `docs/plans/2026-04-27-codex-handover-register-cloud-and-full-name-drift.md`
  - `docs/plans/2026-04-28-codex-block-1-2-handover.md`
  - `docs/plans/2026-04-28-pre-scripted-tour-precheck.md`
  - `docs/plans/2026-04-30-codex-c-welle-review-checkliste.md`

## Rote-Zone-Hinweise fuer naechste Session

Weiterhin nicht ohne Founder-Go:

- `git push origin master`
- Prod-DB-Migrationen oder `schema_migrations`-Insert
- Vercel-Deploy / Env-Aenderungen
- Secrets, Billing, Provider-Live-Aktionen

## Empfohlene naechste Session

1. Code-Review der Commits `e687488..2057328`.
2. Besonders pruefen:
   - Preset-API bulk `upsert` statt expliziter DB-Transaktionsfunktion.
   - Ob `CARE_MODULE`, `HANDWERKER`, `INVITATIONS`, `BUSINESSES`,
     `REFERRAL_REWARDS`, `QUARTER_PROGRESS` in `PHASE_1_OFF_FLAGS`
     fachlich richtig sind oder in Phase 1 anders gewuenscht.
   - Ob `app/api/webhooks/stripe` wirklich unter `BILLING_ENABLED` bleiben
     soll, da der Plan urspruenglich nur `app/api/stripe/**` nannte, dieser
     Pfad aber nicht existiert.
3. Kein Push, bis Founder HR/AVV-Gate explizit freigibt.
