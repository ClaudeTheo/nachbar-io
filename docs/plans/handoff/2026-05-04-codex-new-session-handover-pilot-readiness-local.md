# Codex New-Session Handover: Pilot Readiness lokal

Stand: 2026-05-04

## Session-Start

Neue Session zuerst lesen:

- `AGENTS.md`
- `nachbar-io/AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- dieses Handover

Rote Zonen bleiben aktiv:

- Kein `git push` ohne ausdrueckliches Founder-Go.
- Kein Prod-DB-Write.
- Keine Migration lokal oder remote anwenden.
- Keine Vercel-Env-Aenderung.
- Keine Secrets lesen, ausgeben oder kopieren.
- Keine echten personenbezogenen Daten und keine echte KI-Verarbeitung.
- Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` nicht anfassen.

## Git-Stand

Vor diesem Handover-Block:

- Branch: `master`
- `origin/master`: `8341cd9 fix(pilot): allow health check in closed pilot`
- Lokaler Arbeitsstand vor Handover-Claim: `dc58697 docs(pilot): record local verification`
- Handover-Claim: `7732cc2 chore(inbox): claim pilot readiness handover`
- Danach folgt der Commit, der diese Datei und den INBOX-Abschluss enthaelt.

Vor dem finalen Handover-Commit war `master` lokal 16 Commits vor `origin/master`.
Nach dem finalen Handover-Commit ist `master` entsprechend weiter vor `origin/master`.
Mit `git status --short --branch` frisch pruefen.

Bekannte untracked Altdateien, nicht beruehren:

- `.codex-welle-d-3001.pid`
- `docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md`
- `docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md`
- `docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md`
- `docs/plans/handoff/2026-05-04-codex-new-session-handover-security-ci-health-deploy.md`

## Erledigte lokale Pilot-Readiness-Bloecke

### Welle C: Pilot-Onboarding-Polish

Commits:

- `ea6d86a chore(inbox): claim pilot onboarding polish`
- `9cfa8b0 fix(pilot): polish register onboarding choices`
- `8e3122f chore(inbox): close pilot onboarding polish`

Inhalt:

- Register-Rollen-Step ruhiger und klarer formuliert.
- KI-Consent-Step waermer und freiwilliger formuliert.
- Tests fuer Rollen-Step und KI-Consent angepasst/erweitert.

Doku:

- `docs/plans/2026-05-04-pilot-onboarding-polish-wave-c.md`

### F-2: KI-Routen Per-User-Rate-Limit

Commits:

- `798d588 chore(inbox): claim ai route rate limit`
- `571331f fix(ai): rate limit user ai routes`

Inhalt:

- Gemeinsamer Rate-Limit-Helper in `lib/ai/rate-limit.ts`.
- `app/api/companion/chat/route.ts` begrenzt KI-Provider-Calls pro User/Tag.
- `app/api/ai/onboarding/turn/route.ts` begrenzt Onboarding-KI pro User/Tag.
- Bestaetigte Companion-Write-Tools verbrauchen kein KI-Limit.

Doku:

- `docs/plans/2026-05-04-ai-route-rate-limit-f2.md`

### F-4: Speed-Dial userId Server-Gate

Commits:

- `f17dd38 chore(inbox): claim speed dial user gate`
- `abd6f2f fix(security): gate speed dial target user`

Inhalt:

- `app/api/speed-dial/route.ts` erlaubt fremde `userId` nur bei aktivem `caregiver_links`.
- Eigene Favoriten bleiben unveraendert.
- SOS-/Speed-Dial-Tests decken den Guard ab.

Doku:

- `docs/plans/2026-05-04-speed-dial-userid-gate-f4.md`

### Welle C: Senior Touch Targets

Commits:

- `b9aa2db chore(inbox): claim senior touch targets`
- `fdda338 fix(senior): guard touch targets`

Inhalt:

- Senior-Navigation und sekundaere Senior-Start-Aktionen auf 80 px Touch-Target-Regel gehaertet.
- Test-Guard fuer relevante Senior-Flows.

Doku:

- `docs/plans/2026-05-04-senior-touch-targets-wave-c.md`

### Welle C: Senior Mobile Screenshot Smoke

Commits:

- `aca62d6 chore(inbox): claim senior mobile smoke`
- `7f6a8b3 docs(pilot): add senior mobile smoke`

Inhalt:

- Lokale mobile Screenshots fuer Senior-Preview, Register-Rollen-Step und KI-Consent-Step erstellt/geprueft.
- `/kreis-start` wurde ohne Auth nicht per Bypass geoeffnet; dafuer bleibt Unit-Guard vorhanden.

Doku:

- `docs/plans/2026-05-04-senior-mobile-screenshot-smoke.md`
- `docs/plans/2026-05-04-senior-mobile-screenshot-smoke/*`

### Welle D: Founder-Gates Entscheidungspaket

Commits:

- `cb08fc6 chore(inbox): claim founder gates`
- `54bdb84 docs(pilot): prepare founder gates`

Inhalt:

- Founder-Hand-Gates als konkrete Checklisten vorbereitet.
- Keine Prod-/DB-/Migration-/Vercel-Env-/Secrets-Aktion ausgefuehrt.

Doku:

- `docs/plans/2026-05-04-founder-gates-wave-d.md`

### Lokale Pre-Push-Verifikation

Commits:

- `5fe06f9 chore(inbox): claim local verification`
- `dc58697 docs(pilot): record local verification`

Inhalt:

- Lokaler Stand nach den Readiness-Wellen voll verifiziert.
- Ergebnis: lokal push-vorbereitet, aber Push bleibt Founder-Go.

Doku:

- `docs/plans/2026-05-04-local-pre-push-verification.md`

## Verifikation

Zuletzt frisch gelaufen:

### Vitest

```powershell
npx vitest run __tests__/app/register-pilot-role.test.tsx __tests__/app/register-ai-consent.test.tsx __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts __tests__/app/senior/touch-targets.test.tsx __tests__/app/senior/local-preview.test.tsx __tests__/components/senior/home-kennenlernen-link.test.tsx __tests__/scripts/ai-test-users-cleanup-dry-run.test.ts __tests__/scripts/ai-test-users-cleanup-execute.test.ts
```

Ergebnis:

- 12 Test Files passed
- 106 Tests passed

### ESLint

```powershell
npx eslint "app/(auth)/register/components/RegisterStepPilotRole.tsx" "app/(auth)/register/components/RegisterStepAiConsent.tsx" lib/ai/rate-limit.ts app/api/companion/chat/route.ts app/api/ai/onboarding/turn/route.ts app/api/speed-dial/route.ts app/senior/layout.tsx "app/(senior)/kreis-start/page.tsx" __tests__/app/senior/touch-targets.test.tsx __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts __tests__/scripts/ai-test-users-cleanup-dry-run.test.ts __tests__/scripts/ai-test-users-cleanup-execute.test.ts --no-warn-ignored
```

Ergebnis:

- clean

### TypeScript

```powershell
npx tsc --noEmit
```

Ergebnis:

- clean

### Build

```powershell
npm run build
```

Ergebnis:

- Exit 0
- Next.js 16.2.4 build erfolgreich
- 230 statische Seiten generiert
- Bekannte lokale Warnung: `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert`

## Naechste sinnvolle Schritte

Wenn Thomas ausdruecklich Push-Go gibt:

1. Frisch `git status --short --branch` pruefen.
2. Alte untracked Altdateien ignorieren, nicht stage'n.
3. Pre-Push-Stack aus `docs/plans/2026-05-04-local-pre-push-verification.md` wiederholen.
4. Wenn weiter gruen: `git push origin master`.
5. Danach CI und Vercel-Deploy beobachten.

Wenn es kein Push-Go gibt:

1. Lokal weiter an Pilot-Readiness arbeiten.
2. Gute naechste lokale Bloecke:
   - Legal-/Footer-/Consent-Text-Drift pruefen, sobald Thomas konkrete Firmen-/Rechtsdaten liefert.
   - Read-only Founder-Gate-Checklisten verfeinern.
   - Security-Folgepunkte nur lokal und ohne Prod-/Secret-Zugriff weiter bearbeiten.
3. Keine Migrationen 176/177/178 anwenden.
4. AI-Test-User-Cleanup nur weiter vorbereiten; Execute bleibt Founder-/Prod-Hand.

Founder-Hand-Gates aus `docs/plans/2026-05-04-founder-gates-wave-d.md`:

- Vercel-Env-Sicherheitscheck und ggf. Fix.
- Migrationen 176/177/178 planen/anwenden.
- AI-Test-User-Cleanup Execute in echter Umgebung.
- AVV/DPA-/Provider-Status klaeren.
- HR-/Firmen-/Impressum-/Datenschutzdaten finalisieren.
- Pilot-Familienliste und Invite-Prozess final festlegen.

## Abschluss dieser Handover-Welle

Diese Handover-Welle ist reine Doku/INBOX-Arbeit:

- Kein Push.
- Kein Prod-DB-Write.
- Keine Migration.
- Keine Vercel-Env-Aenderung.
- Keine Secrets gelesen.
- Keine echten Daten verarbeitet.
- Alte untracked Dateien unberuehrt.
