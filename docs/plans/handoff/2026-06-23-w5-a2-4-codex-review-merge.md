# Handoff Claude → Codex — W5/A2:4 Review + Merge (COMPLIANCE)

**Datum:** 2026-06-23
**Projekt:** nachbar-io (COMPLIANCE)
**Branch:** `fix/w5-senior-consent-confirm` (Commit `1e895e6`), off `origin/master = 955be11` — **unabhängig** von W4b (#65/#66), disjunkte Dateien.
**Aufgabe:** Finale Review (gpt-5.5 / xhigh) → bei 0 CRITICAL/0 HIGH `gh pr merge --squash --delete-branch`.
**Founder-Go:** ERFORDERLICH vor Merge (COMPLIANCE, neuer service_role-Schreibpfad auf einen sicherheitsrelevanten Consent-Status). Guard NICHT umgehen.
**Deploy:** NICHT Teil dieses Auftrags.

## Was die Welle macht (Fable5 A2:4 — W5 Teil 1 von 2)

Nach dem Family-Setup-Claim steht der `caregiver_link` auf `consent_status='pending_senior_confirm'`
(`lib/family-setup/senior-setup.service.ts:persistCaregiverLink`). Der Senior hatte keinen Bestätigungsschritt.
W5/A2:4 fügt ihn hinzu: Senior bestätigt → `consent_status='active'`.

**Sicherheitslage:** Der **CL-1-Trigger** (`Mig 20260618130000`, `enforce_caregiver_links_update_restrictions`)
macht `consent_status`/`profile_edit_allowed`/`sensitive_data_allowed` für Nicht-`service_role`-UPDATE sticky
(`current_setting('role')`). → Client kann es nicht ändern → **service_role-Route, KEINE Migration** (AA-3/W4b-2-Muster).

## Geänderte Dateien (10, +570/−4)

- **`lib/family-setup/senior-consent.service.ts`** (neu) — `confirmSeniorConsent(admin, seniorUserId, caregiverLinkId)`:
  Link laden; Ownership `resident_id===seniorUserId` → 403 (IDOR); `consent_status==='pending_senior_confirm'` → sonst 409;
  `update({ consent_status: 'active' })` via service_role (NUR diese Spalte); Audit `audit_log` (non-blocking).
  `listPendingSeniorConsents(admin, seniorUserId)` — datensparsamer Lese-Pfad (Anzeigename + Beziehung).
- **`app/api/family-setup/senior/consent/route.ts`** (neu) — `POST`: Cookie-Auth → 401; Body `{ caregiverLinkId }` UUID-validiert → 400;
  `getAdminSupabase()` → Service. **seniorUserId aus Session, nicht Body** (IDOR).
- **`modules/care/components/senior/SeniorConsentPrompt.tsx`** (neu) — Client, ≥80px-Button, Siezen; POST + Toast + `router.refresh`;
  rendert nichts wenn keine offene Einwilligung.
- **`app/(senior)/kreis-start/page.tsx`** (mod) — server-lädt `user` + `listPendingSeniorConsents` (admin, scoped `resident_id=user.id`),
  rendert `<SeniorConsentPrompt>` über dem Kachel-Grid (additiv, 4-Kachel-Layout intakt).
- **Tests:** `__tests__/services/senior-consent.service.test.ts` (6, inkl. 404/403/409/Merge/Audit), `__tests__/api/family-setup-senior-consent.test.ts` (4, inkl. IDOR), `__tests__/app/senior/senior-consent-prompt.test.tsx` (4). **3 bestehende KreisStartPage-Tests** (`kreis-start`, `local-preview`, `touch-targets`) um `auth.getUser` + `useRouter` + `listPendingSeniorConsents`-Mocks ergänzt (TDD-Konsequenz des Server-Loads).

## Gate (lokal grün)

- **Vitest:** **5189 passed / 1 skipped** (gesharded 1–3/3), inkl. 20 neue/angepasste W5-Tests.
- **`npx tsc --noEmit`:** exit 0. **eslint (geänderte Dateien):** 0 Fehler.

## Mini-Audit (2026-06-23): 0 CRITICAL/HIGH, kein STOP

- **RLS/Trigger:** `caregiver_links` (CL-1-Trigger schützt consent_status gegen Client; service_role-Pfad schreibt NUR `consent_status='active'` auf einen **pending** Link des **eigenen** Seniors), `audit_log` (RLS-enabled, service_role-Insert).
- **Privilege-Sweep:** `profile_edit_allowed`/`sensitive_data_allowed` unberührt; IDOR via Session-userId + Ownership-Check; Pending-Check (idempotent); Body-`residentId` ignoriert (Test deckt's ab). `users.role` unverändert.
- **Audit:** `audit_log` (`action='senior_consent_confirmed'`, from/to). **Rate-Limit:** `/api`-Default (kein Token-/Code-Lookup hier — der ist im Claim).
- **Audit-Tabellen-Wahl:** generische `audit_log` (Freitext `action`) statt `care_audit_log` (CHECK-event_type → Migration nötig).

## Bitte besonders prüfen

1. **service_role-Bypass** real (lokal nur statisch): persistiert `consent_status='active'` gegen den CL-1-Trigger?
2. **Lese-Pfad** `listPendingSeniorConsents` via admin-Client scoped auf `resident_id=user.id` — kein Leak fremder Links?
3. **A2:5** (Senior-Variante Claim-Formular ≥80px) ist NICHT in diesem PR — Folge-Welle.

## Merge (nach Review + Founder-Go)

```bash
gh pr merge <PR#> --squash --delete-branch
```
