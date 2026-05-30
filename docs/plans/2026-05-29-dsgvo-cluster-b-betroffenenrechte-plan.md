# DSGVO Cluster B — Betroffenenrechte repariert (Pre-Pilot-Audit, Paket 1)

**Datum:** 2026-05-29 · **Branch:** `chore/gdpr/data-subject-rights-2026-05-29` · **Status:** gebaut + getestet, wartet auf Founder-Go (Merge + Prod-Apply + Deploy)

Behebt die 6 BLOCKER aus Cluster B des Pre-Pilot-Audits (`2026-05-29-dsgvo-pilot-readiness-audit.md`): Lösch-/Export-/Retention-Logik sprach nicht existierende Tabellen an und ließ die Art.-9-Care-Daten aus → Betroffenenrechte täuschten Erfolg vor.

## Pre-Check (Code + Prod-Schema sind autoritativ)

Gegen das reale Prod-Schema (`uylszchlyhbpbmslcnka`) verifiziert, nicht nur das Audit geglaubt:

| Befund | Verifikation |
|---|---|
| `profiles`, `checkins`, `messages`, `news_summaries`, `hilfe_requests`, `marketplace_listings`, `reports`, `user_passkeys`, `gamification_scores` | **existieren nicht** (information_schema) |
| 16 `care_*` + 3 `user_memory_*` hängen mit `NO ACTION` an `users(id)` | `pg_constraint` → `DELETE users` scheiterte → Senioren unlöschbar (B3/B4) |
| zwei parallele Export-Services, beide live, beide unvollständig | `exportUserData` (GET /api/user/export) + `exportPrivacyData` (POST /api/privacy/export) |
| `care_audit_log` Trigger `no_audit_delete` blockt jedes DELETE | `pg_trigger` |

## Architektur

**Single Source of Truth:** `lib/services/gdpr/user-data-registry.ts` — kanonische Liste aller personenbezogenen Tabellen (Export-Filter, FK-Lösch-Plan, Art.-9-Flag). Export-Service, Migration und DSE-Test leiten daraus ab.

1. **Migration** `supabase/migrations/20260529140000_gdpr_deletion_cascade.sql`
   - ~62 FK-`delete_rule` umgestellt: Subjekt-Daten → `CASCADE`, Aktor-/Log-Referenzen → `SET NULL` (Spalten zuvor nullable gemacht).
   - `prevent_audit_modification` GDPR-fähig (transaktionslokale GUC `app.gdpr_delete`); Schutz für normale Pfade bleibt.
   - SECURITY-DEFINER-RPC `gdpr_delete_user(uuid)` als einziger Lösch-Einstieg (search_path gepinnt, nur `service_role`).
   - Idempotent (DO-Block findet FK-Namen dynamisch).
2. **Lösch-Service** `lib/services/gdpr/account-deletion.service.ts` — ein Kern `deleteUserCompletely` (RPC → `auth.admin.deleteUser` → Protokoll in `data_requests`), genutzt von Web-OTP- **und** Auth-Pfad. `profiles`-Bug raus (B2). Fail-loud.
3. **Export-Service** `lib/services/gdpr/account-export.service.ts` — Registry-basiert, inkl. `care_*`/`user_memory_*`, verschlüsselte Felder entschlüsselt (B5). Beide Export-Routen zeigen darauf; die zwei Alt-Services gelöscht.
4. **Retention** `lib/services/cron-retention-cleanup.service.ts` — reale Tabellen (`care_checkins`/`senior_checkins`/`heartbeats`/`care_sos_alerts`/`direct_messages`), Protokoll in `data_retention_log` (B7).
5. **DSE §11 + Lösch-Seite** an reale Löschliste angeglichen, Art.-9-Daten + Audit-Anonymisierung ehrlich benannt (B6).

**Audit-Log-Politik (Founder-Entscheidung):** `care_audit_log` (Gesundheitsdaten) wird beim Löschen des Subjekts mitgelöscht; Sicherheits-/Admin-Logs (`admin_audit_log`, `security_events`, `org_audit_log`, `audit_log`, `user_memory_audit_log`) behalten den Eintrag, der Personenbezug wird auf NULL gesetzt.

## Security-Mini-Audit DSGVO-Cluster-B (2026-05-29)

```
- RLS/Trigger/FK geprüft: care_* (16 Tab.), user_memory_* (3), group_*, consultation_*,
  emergency_profiles, pflegegrad_assessments, caregiver_links, audit-logs (admin/org/audit/
  security_events) + neue RPC gdpr_delete_user + Trigger prevent_audit_modification
- Findings: 0 CRITICAL/HIGH. Die Welle ist selbst der Fix für B2–B7.
  - gdpr_delete_user: SECURITY DEFINER, search_path gepinnt (public,pg_temp), REVOKE PUBLIC +
    GRANT nur service_role (server-only), Input uuid, GUC nur transaktionslokal → kein
    Client-Bypass-Vektor.
  - care_audit_log-Trigger: GUC-gated statt Blanko-Bypass; RAISE EXCEPTION bleibt Default.
  - Export: Service-Role mit IMMER gesetztem userId-Filter (Registry) → kein RLS-Blindspot-Leak.
- Audit-Trail: ja (Löschung→data_requests, Export→org_audit_log, Retention→data_retention_log)
- Rate-Limit: In-Memory 3/h (OTP-Lösch-Anfrage, wie zuvor; Auth-Pfad session-geschützt)
```

## Scope-Grenze (kein Silent-Cap)

Abgedeckt: Resident/Caregiver/Senior/Memory/Group/Consent-Datenraum (Pilot). **Vertagt** (im geschlossenen Pilot keine solchen Nutzer außer dem nicht-löschbaren Founder): Profi-Vertical-FKs `doctor_*`, `medical_*`, `civic_*`, `practice_*`, `prescriptions`, `prevention`-Staff, `team_*`. Folge-Welle vor erstem Arzt-/Quartier-Admin-Pilot. Der Lösch-Service schlägt fail-loud fehl, falls ein nicht abgedeckter FK blockiert.

## Verifikation

- vitest: **674 Dateien, 4864 grün** (1 skip) · `tsc --noEmit` exit 0 · eslint exit 0
- Neue Tests: account-deletion (13), account-export (8), retention-cleanup (5), migration-consistency (10), datenschutz-§11 (B6)
- **Supabase-Branch-Test nicht möglich** (Prod-Drift stoppt Replay bei Mig 002) → statt dessen Migration-Static-Test (TS-Registry ↔ SQL) + Service-Mock-Tests. Prod-Verifikation der echten Löschung erfolgt beim Apply mit einem synthetischen Test-Nutzer.

## Rote Zone (Founder-Go)

- Merge nach `master` + Prod-Apply der Migration (`gdpr_delete_user` RPC + FK-Umbau) + Deploy.
- Prod-Apply-Pfad bei Prod-Drift: `npx supabase db query --linked -f <file>` + `migration repair --linked --status applied 20260529140000`.

## Weiter offen (Block A)

H2 (nachbar-admin Quarter-Scoping) · B1/W6/W7 (AVV-Register an realen Code: Sentry, OpenAi statt IONOS/Azure) · W4/M8 (Art.-9-Klartext im Audit-Log) · `invite_code`-REVOKE-Folge-Welle · Profi-Vertical-Lösch-FKs.
