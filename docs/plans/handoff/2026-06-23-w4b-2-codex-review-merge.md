# Handoff Claude → Codex — W4b-2 Review + Merge (COMPLIANCE)

**Datum:** 2026-06-23
**Projekt:** nachbar-io (COMPLIANCE)
**Branch:** `fix/w4b-2-profile-pilot-role` (Commit `c51b9cd`) — **gestapelt auf** `fix/w4b-1-onboarding-step-jugend-landing` (PR #65).
**Reihenfolge:** **#65 (W4b-1) zuerst mergen**, dann diesen PR (sonst enthält der Diff auch W4b-1).
**Aufgabe:** Finale Review (gpt-5.5 / xhigh) → bei 0 CRITICAL/0 HIGH `gh pr merge --squash --delete-branch`.
**Founder-Go:** ERFORDERLICH vor Merge (COMPLIANCE, neuer service_role-Schreibpfad). Guard NICHT umgehen.
**Deploy:** NICHT Teil dieses Auftrags.

## Was die Welle macht (Fable5 A1:5, Teil 2 von 2)

Founder-Pivot: Selbstauskunft (resident/caregiver/helper) bleibt, wandert ins Profil. W4b-1 entfernte den
Registrierungs-Schritt; W4b-2 macht `pilot_role` im Profil selbst änderbar.

**Kern-Sicherheitslage:** Mig 198 (`enforce_user_update_restrictions`) listet `pilot_role` in `protected_keys`
→ Client-Schreibversuche werden still auf den Alt-Wert zurückgesetzt (Bypass nur `service_role`). Deshalb
**kein Client-`updateUserSettings`-Pfad und KEINE Migration**, sondern ein eigener service_role-Endpoint.

## Geänderte Dateien (8, +564)

- **`app/api/profile/pilot-role/route.ts`** (neu) — `POST`: Cookie-Auth → 401 ohne User; Body `{ pilotRole }`
  validiert via `isSelfSelectablePilotRole` (nur resident/caregiver/helper; test_user/Unsinn → 400);
  `getAdminSupabase()` → `setPilotRoleServer(admin, user.id, pilotRole)`. **userId aus Session, NICHT aus Body** (IDOR).
- **`lib/services/profile.service.ts`** (+69) — `SELF_SELECTABLE_PILOT_ROLES`, `isSelfSelectablePilotRole`,
  `setPilotRoleServer`: lädt settings, schreibt `{ ...settings, pilot_role }` (Merge erhält andere Keys) via
  service_role (bypassed Mig-198-Trigger), Audit in `audit_log` (non-blocking). Wirft `ServiceError` bei Update-Fehler.
- **`app/(app)/profile/components/PilotRoleSelector.tsx`** (neu) — reine UI, 3 Rollen, 80px-Targets, aria-pressed, KEIN test_user.
- **`app/(app)/profile/components/PilotRoleSection.tsx`** (neu) — Client-Section, POST an die Route, Toast, disabled-Logik.
- **`app/(app)/profile/edit/page.tsx`** (+16) — `readSelfPilotRole(user.settings)` + `<PilotRoleSection>` eingebunden.
- **Tests (neu):** `__tests__/services/profile-pilot-role.test.ts` (5), `__tests__/api/profile-pilot-role.test.ts` (11, inkl. IDOR + __proto__/Array/Objekt/null-Edge-Cases), `__tests__/app/profile/pilot-role.test.tsx` (5).

## Gate (lokal grün)

- **Vitest:** volle Suite **5191 passed / 1 skipped** (gesharded 1–3/3, vor den Edge-Tests) + **21 W4b-2-Tests**
  (Service 5 / Route 11 / Komponenten 5). Edge-Tests danach im Route-File verifiziert (11 grün).
- **`npx tsc --noEmit`:** exit 0. **eslint (geänderte Dateien):** 0 Fehler.

## Mini-Audit (2026-06-23): 0 CRITICAL/HIGH, kein STOP

- **RLS/Trigger:** `users` (Mig-198 schützt `pilot_role` gegen Client; service_role-Pfad bypassed bewusst, schreibt nur den validierten Key), `audit_log` (RLS-enabled, service_role-Insert, append-only).
- **Privilege-Sweep:** Endpoint akzeptiert nur `{ pilotRole }`, fixer Key, validiert; is_admin/role/trust_level/is_test_user unberührt; `users.role` bleibt `resident`; `pilot_role` nur Label.
- **Audit:** `audit_log` (`action='pilot_role_self_updated'`, from/to). **Rate-Limit:** middleware-Default `/api/` (kein Token-Lookup).
- **Audit-Tabellen-Wahl:** `care_audit_log` (CHECK-constrained event_type) + `admin_audit_log` (admin_id) passen ohne Migration nicht → generische `audit_log` (Freitext `action`) genutzt.

## Review (Claude, adversarial)

Multi-Lens (mig198-bypass / IDOR-security / frontend-UX): **alle `clean`, 0 CRITICAL/HIGH.** (Der 4. Lens + Critic
hingen an einem Tool-Verbindungsabbruch — deren Scope [Audit-Schema-Fit, Integration, Orphans] wurde manuell +
über den Frontend-Lens abgedeckt.) Verifiziert: service_role bypassed `current_setting('role')`-Check korrekt
(Mig 198 Z.39-43), Merge erhält protected_keys, IDOR-sicher. Defensive Edge-Case-Tests ergänzt.

## Bitte besonders prüfen

1. **service_role-Bypass** real gegen Prod-Verhalten (lokal nur statisch verifiziert): persistiert `settings.pilot_role`?
2. **Merge-Semantik:** kein versehentliches Überschreiben anderer settings-Keys bei Load-Merge-Write (Race bei Single-User vernachlässigbar).
3. **`audit_log`** ist die richtige Tabelle (bisher ohne andere Writer, aber im Schema + GDPR-Cascade aktiv)?

## Merge (nach Review + Founder-Go, NACH #65)

```bash
gh pr merge <PR#> --squash --delete-branch
```
