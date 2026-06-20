# 2026-06-19 - Caregiver Auto-Answer Fix

## Durable Befund

Live/Drift-Check AA-RLS-2 zeigte: Auf `caregiver_links` gibt es keine
Caregiver-UPDATE-Policy. Die vorhandene UPDATE-Policy aus Mig 071:50 ist
`caregiver_links_update_resident` und richtet sich an den Bewohner/Senior.

Damit war der alte PATCH-Pfad fuer `/api/caregiver/auto-answer` riskant:
`updateAutoAnswerSettings` schrieb per normalem RLS-Client auf
`caregiver_links`. Ohne Caregiver-UPDATE-Policy konnte der Pfad policy-seitig
0 Rows updaten.

## Fix

Der Auto-Answer-Write laeuft jetzt bewusst NICHT ueber RLS, sondern ueber den
Admin-Client (`service_role`) NACH explizitem Ownership-Check:

- Auth-Client prueft: `id = linkId`, `caregiver_id = user.id`,
  `revoked_at IS NULL`.
- Admin-Client schreibt danach ausschliesslich:
  - `auto_answer_allowed`
  - `auto_answer_start`
  - `auto_answer_end`
- Defense-in-depth: Der Admin-UPDATE enthaelt dieselben Praedikate
  `id`, `caregiver_id`, `revoked_at IS NULL` gegen TOCTOU und falsche
  Aufruferannahmen.

Keine Consent-/Grant-Spalten werden geschrieben:

- `consent_status`
- `profile_edit_allowed`
- `sensitive_data_allowed`
- `auto_answer_senior_consented_at`

## CL-1-Kommentar

Der Kommentar in `supabase/migrations/20260618130000_caregiver_links_grant_update_restrictions.sql`
nennt `auto_answer_allowed/_start/_end` noch einen
"Angehoerigen-RLS-Schreibpfad". Das ist nach AA-RLS-2 als stale zu lesen:
Der Produktpfad laeuft jetzt ueber Route/Service-Authorization + Admin-Client,
nicht ueber eine Caregiver-UPDATE-Policy.

## Verifikation

- `npx vitest run modules/care/services/caregiver/caregiver-misc.service.test.ts app/api/caregiver/auto-answer/route.test.ts --exclude "**/.claude/**"`
- `npx tsc --noEmit`
- `npx eslint app/api/caregiver/auto-answer/route.ts modules/care/services/caregiver/caregiver-misc.service.ts app/api/caregiver/auto-answer/route.test.ts modules/care/services/caregiver/caregiver-misc.service.test.ts`

Alle Checks gruen in der Codex-Session vor Draft-PR.

## Offen

Audit fuer Caregiver-Auto-Answer-Setting-Aenderungen wurde im Folge-Branch
`codex/care-audit-event-type-reconcile` adressiert:
`auto_answer_settings_changed` + CHECK-Reconcile-Migration
`20260619120000_care_audit_log_event_type_reconcile.sql`.

Kein Prod-Apply ohne Founder-Go.
