# 2026-06-19 - Care Audit Event Type Reconcile

## Befund

Claude-Review 2026-06-19: Der DB-CHECK auf
`public.care_audit_log.event_type` war nicht synchron mit
`CareAuditEventType` in `modules/care/services/types.ts`.

Read-only Drift-Check via Supabase-MCP (Prod, 2026-06-19):

- Constraint: `care_audit_log_event_type_check`
- Definition: 21 alte Werte aus `028_care_audit_log.sql`
- `SELECT DISTINCT event_type FROM public.care_audit_log`: nur
  `checkin_not_well`, `checkin_ok`, `sos_accepted`, `sos_resolved`,
  `sos_triggered`
- Ergebnis: keine Alt-Rows ausserhalb der neuen Union

Da `writeAuditLog` Insert-Fehler bewusst non-blocking loggt, konnten Audit
Events wie `auto_answer_consent_changed` bisher auf intaktem CHECK still
scheitern.

## Umsetzung

- `CareAuditEventType` um `auto_answer_settings_changed` erweitert.
- `AUDIT_EVENT_LABELS` um ein Label fuer den neuen Event erweitert.
- `updateAutoAnswerSettings` schreibt nach erfolgreichem Admin-UPDATE einen
  Audit-Eintrag:
  - `seniorId = link.resident_id`
  - `actorId = caregiver userId`
  - `eventType = auto_answer_settings_changed`
  - `referenceType = caregiver_link`
  - `metadata.changedFields = Object.keys(updatePayload)`
- Ownership-SELECT liest dafuer jetzt `id, resident_id`.
- Migration file-first angelegt:
  `supabase/migrations/20260619120000_care_audit_log_event_type_reconcile.sql`

Die Migration droppt den alten CHECK und legt ihn mit der vollstaendigen
39-Werte-Union neu an. Gegenueber 028 kommen 17 bereits vorhandene TS-Werte
plus `auto_answer_settings_changed` hinzu.

## Mini-Audit

Mini-Audit (2026-06-19):
- RLS/Trigger geprueft: `care_audit_log` (028 append-only;
  `no_audit_update`/`no_audit_delete`; 076 insert actor hardening)
- Findings: 0
- Audit-Trail: n/a (Whitelist-Erweiterung fuer bestehendes Audit-Log) |
  Rate-Limit: n/a

Die Welle erweitert nur eine Event-Whitelist und fuegt einen Audit-Insert in
einen bereits authentifizierten, service_role-autorisierten Pfad ein. Kein neuer
Privilege-/RLS-Surface.

## Offen

- Kein Prod-Apply in dieser PR.
- Prod-Apply braucht Founder-Go:
  `MIGRATION-PROD-GO-AUDIT-CHECK`.
- Bis Prod-Apply scheitert der neue
  `auto_answer_settings_changed`-Audit-Insert in Prod ggf. am alten CHECK und
  wird non-blocking geloggt. In der Aufbauphase mit 0 echten Nutzern ist das
  akzeptiert.

## Verifikation

Durchgefuehrt in der Codex-Session:

- `npx vitest run modules/care/services/caregiver/caregiver-misc.service.test.ts app/api/caregiver/auto-answer/route.test.ts --exclude "**/.claude/**"`
- `npx tsc --noEmit`
- `npx eslint app/api/caregiver/auto-answer/route.ts modules/care/services/caregiver/caregiver-misc.service.ts app/api/caregiver/auto-answer/route.test.ts modules/care/services/caregiver/caregiver-misc.service.test.ts modules/care/services/types.ts modules/care/services/constants.ts`
- TS-Union-vs-Migration-Abgleich: 39 Werte vs. 39 Werte, 0 fehlend, 0 extra

Alle Checks gruen.
