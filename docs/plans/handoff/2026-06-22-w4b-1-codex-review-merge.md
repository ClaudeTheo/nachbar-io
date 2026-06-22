# Handoff Claude → Codex — W4b-1 Review + Merge (COMPLIANCE)

**Datum:** 2026-06-22
**Projekt:** nachbar-io (COMPLIANCE)
**Branch:** `fix/w4b-1-onboarding-step-jugend-landing` (Commit `1f00c18`, off `origin/master = 955be11`)
**Aufgabe:** Finale Review (gpt-5.5 / xhigh) → bei 0 CRITICAL/0 HIGH `gh pr merge --squash --delete-branch`.
**Founder-Go:** ERFORDERLICH vor Merge (COMPLIANCE-Projekt, outward-facing Landing). Guard NICHT umgehen.
**Deploy:** NICHT Teil dieses Auftrags (workflow_dispatch; separater Founder-Hand-Schritt).

## Was die Welle macht (Fable5 A1:5, Teil 1 von 2)

Founder-Entscheidung: Pilot-Rolle-Schritt raus aus dem Onboarding, Selbstauskunft (resident/caregiver/helper)
wandert in einer **Folge-Welle W4b-2** ins Profil (neuer service_role-Endpoint, Mini-Audit-pflichtig — NICHT hier).

1. **Pilot-Rolle-Schritt entfernt** aus dem Registrierungs-Flow → 5 Schritte werden 4
   (entry/invite/address → identity → ui_mode → ai_consent → magic_link_sent).
   - Neue Nutzer behalten `pilot_role = 'resident'` serverseitig (`normalizePilotRole(undefined)`), **kein Server-/DB-Change**.
   - `RegisterStepPilotRole.tsx` **bleibt erhalten** (nicht mehr im Flow/Barrel), wird in W4b-2 als Profil-Selbstauskunft wiederverwendet. Der isolierte Komponenten-Test `register-pilot-role.test.tsx` bleibt grün.
2. **Jugend-Hinweis nur < 18** im Identity-Schritt — neuer Client-Helper `ageFromDateOfBirth` (UTC, tagesgenau, spiegelt Server-`calculateAge`/`isYouth=age<18`). Davor wurde der Hinweis **immer** gerendert.
3. **Landing-CTA** (`app/page.tsx`): neuer Primär-Button „Mit Einladungscode starten" → `/register`, „Anmelden" → `/login` als Sekundär-Link; Closed-Pilot-Text auf Invite-only umformuliert (Founder-Go für Wording liegt vor).

## Geänderte Dateien (15, +108/−102)

**Source (Flow):** `app/(auth)/register/page.tsx`, `components/RegisterStepIdentity.tsx`,
`components/RegisterStepUiMode.tsx`, `components/types.ts` (Step-Union ohne `pilot_role`; `PilotRole`-Typ + `pilotRole?`-Feld BLEIBEN),
`components/index.ts` (Re-Export raus + Kommentar), `lib/ki-help/register-tour-content.ts` (REGISTER_TOUR_HINTS ohne `pilot_role`),
`preview/RegisterPreviewForm.tsx`, `preview/[step]/page.tsx`.
**Landing:** `app/page.tsx`.
**Tests:** `__tests__/app/register-identity.test.tsx` (+2 Jugend-Tests, buildState relatives Minderjährigen-DOB),
`__tests__/app/closed-pilot-page.test.tsx` (+1 Invite-CTA-Test), `__tests__/app/register-page-dev-preview.test.tsx`
(„von 5"→„von 4", 1 pilot_role-Preview-Test entfernt, 1 auf identity umgebogen),
`__tests__/lib/ki-help/register-tour-content.test.ts` (steps-Array + „explains pilot role"-Test raus).
**E2E (laufen in CI):** `tests/e2e/pages/register.page.ts` (Locator `continueToUiModeButton` = Identity-Submit „Weiter zur Oberfläche";
`continueToPilotRoleButton`/`testRoleButton` entfernt; `stepIndicator`/`assertOnStep` „von 4"; `fillIdentity` ohne Pilot-Schritt),
`tests/e2e/scenarios/s1-onboarding.spec.ts` (Header „4-Schritt"; S1.5 nutzt `continueToUiModeButton`).

## Gate (lokal, grün)

- **Vitest gesharded:** 1/3 = 1681, 2/3 = 1697, 3/3 = 1798 → **5176 passed / 1 skipped, 0 failed**.
- **`npx tsc --noEmit`:** exit 0.
- **eslint (geänderte Dateien):** 0 Fehler. (Voller `npm run lint` zeigt Fehler NUR im gitignorten, untracked Stale-Worktree `.claude/worktrees/elated-mestorf-e47719` → CI sieht ihn nicht.)

## Pre-Check (Multi-Agent gegen 955be11)

Bestehende Profil-/Settings-Infra (`profile/edit`, `updateUserSettings`, `setUiMode`-Präzedenz) + pilot_role-Datenpfad
(WRITE bei Reg, READ im Admin, KEIN Update-Pfad) + Mig-198-Sticky-Trigger kartiert. **`calculateAgeGroup` aus `@/modules/youth`
wurde bewusst VERWORFEN** (gibt `null` für <14 UND 18+ zurück → unbrauchbar für die <18-Schwelle) → lokaler tagesgenauer Helper.

## Mini-Audit (2026-06-22): 0 Findings, kein STOP

- Keine neue/geänderte Migration, RLS-Policy, Admin-Route, Token-/Code-Lookup, **kein neuer settings-Schlüssel-Schreibpfad**.
- `pilot_role`-Default unverändert (`undefined → resident`); `users.role` bleibt hart `resident`; `pilot_role` nur Label/Segmentierung.
- **Verhaltens-Notiz:** Der entfernte `test_user`-Selbst-Flag-Pfad bedeutet, dass Self-Reg-User sich nicht mehr selbst als
  `test_user` (`is_test_user`/`must_delete_before_pilot`) markieren können → **entfernt** eine kleine Surface, fügt keine hinzu.
  (Test-User-Flagging hatte ohnehin andere Hauptmechanismen; PROD-DB = nur synthetische Daten.)
- Landing-CTA = outward-facing Navigations-Link, kein Auth-/Daten-Schreibpfad.

## Bitte besonders prüfen

1. **E2E-DOM-Trace** (lokal nicht lauffähig): `continueToUiModeButton` (`/Weiter zur Oberfl/`) matcht auf dem Identity-Schritt eindeutig die Submit-Schaltfläche? `fillIdentity`-Sequenz korrekt für 4 Schritte? S1.5 bleibt auf Schritt 2 (native `required`)?
2. **Wording Landing** (produktiv): „Ohne Einladung nehmen wir hier keine echten personenbezogenen Daten an" — kohärent mit Invite-CTA, kein irreführender Sog für Nicht-Eingeladene?
3. **Adversariale Multi-Lens-Review** (Claude, 5 Lenses + Critic) ergab `mergeRecommendation: ready`, `blockers: []`. Bitte gegenprüfen.

## Merge (nach Review + Founder-Go)

```bash
gh pr merge <PR#> --squash --delete-branch
```

Danach: W4b-2 (Profil-Selbstauskunft + service_role-Endpoint + Mini-Audit) als eigene Welle.
