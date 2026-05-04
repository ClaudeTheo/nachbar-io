# Local Pre-Push Verification

Stand: 2026-05-04

## Ziel

Den lokalen Stand nach den Welle-C-/Welle-D-Bloecken frisch verifizieren,
ohne Push, Prod-DB, Migrationen, Vercel-Env, Secrets oder echte Pilotdaten.

## Ausgangspunkt

- Branch: `master`
- Vor dieser Verifikationswelle: 13 Commits vor `origin/master`
- `origin/master`: `8341cd9 fix(pilot): allow health check in closed pilot`
- Tracked Worktree vor Start: sauber
- Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` unberuehrt

## Befehle

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
- bekannte lokale Warnung:
  `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert`

## Bewertung

PASS lokal.

Der aktuelle lokale Stand ist aus Sicht der geprueften Pilot-Readiness-Bloecke
push-vorbereitet. Push/Deploy bleiben trotzdem Founder-Go, weil der Branch
lokal deutlich vor `origin/master` liegt und die Session-Regel "kein Push ohne
ausdrueckliches Go" gilt.

## Nicht gemacht

- Kein Push.
- Kein Prod-DB-Write.
- Keine Migration.
- Keine Vercel-Env-Aenderung.
- Keine Secrets gelesen.
- Keine echten personenbezogenen Daten oder KI-Verarbeitung.
