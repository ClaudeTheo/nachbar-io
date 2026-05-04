# Admin-Audit-Logs — OWASP NEW-4

Datum: 2026-05-04
Owner: Codex
Status: verifiziert und lokal committed

## Anlass

Claude meldete fehlende Audit-Logs fuer privilegierte Admin-Aktionen:

- `POST /api/admin/create-user`
- `POST /api/admin/verify-address`
- `POST /api/admin/broadcast`
- `DELETE /api/admin/quarters/[id]`
- `POST /api/admin/feature-flags/preset`

## Schema-Entscheidung

Der Review-Vorschlag nannte `org_audit_log`. Code- und Schema-Pre-Check zeigen aber:

- `org_audit_log.org_id` ist `NOT NULL`.
- Die gemeldeten Routen sind plattformweite Admin-/Super-Admin-Aktionen ohne natuerlichen Organisationsbezug.
- `admin_audit_log` existiert bereits mit `admin_id`, `action`, `target_type`, `target_id`, `details`, `ip_address`.

Entscheidung: Fuer diese plattformweiten Aktionen wird `admin_audit_log` genutzt. Das vermeidet Dummy-Organisationen und passt zum bestehenden Schema.

## Umsetzung

- `createUserByAdmin(...)` protokolliert `admin_create_user` nach erfolgreicher Auth-User-Anlage, auch wenn die Household-Zuordnung danach nur als Warnung zurueckkommt.
- `processVerification(...)` protokolliert `admin_verify_address` nach Approve/Reject.
- `sendBroadcast(...)` protokolliert `admin_broadcast` mit Audience, Street, Urgency, Empfaengerzahl und Push-Zahl.
- `archiveQuarter(...)` protokolliert `admin_quarter_archived`.
- `POST /api/admin/feature-flags/preset` protokolliert `admin_feature_flags_preset` mit Phase, Reason und betroffenen Keys.

## Tests

Neu/angepasst:

- `__tests__/modules/admin/admin-audit-log.test.ts`
- `__tests__/api/admin/feature-flags-preset.test.ts`

Verifikation:

- `npx vitest run __tests__/modules/admin/admin-audit-log.test.ts __tests__/api/admin/feature-flags-preset.test.ts` — 8 passed
- `npx vitest run __tests__/modules/admin/admin-audit-log.test.ts __tests__/api/admin/feature-flags-preset.test.ts __tests__/api/admin/health.test.ts __tests__/components/admin/FeatureFlagAuditLog.test.tsx __tests__/components/admin/FeatureFlagManager.test.tsx` — 26 passed
- `npm run test` — 546 Test Files passed, 4043 passed, 1 skipped
- `npm run lint` — gruen
- `npx tsc --noEmit` — gruen
- `npm run build` — gruen

## Rote Zonen

Keine Prod-DB-Schreibaktion, keine Migration, keine Vercel-Env-Aenderung, keine Secrets gelesen oder ausgegeben.
