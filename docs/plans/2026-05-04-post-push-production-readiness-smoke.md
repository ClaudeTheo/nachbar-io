# Post-Push Production-Readiness Read-only Smoke

Stand: 2026-05-04

## Ziel

Nach dem Push des lokalen Pilot-Readiness-Blocks den Stand bis Production
rein lesend absichern:

- keine Prod-DB-Schreibaktion
- keine Migration
- keine Vercel-Env-Aenderung
- keine Secrets gelesen oder ausgegeben
- keine echten Nutzerdaten oder authentifizierten Pilot-Aktionen
- alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` unberuehrt

## Ausgangspunkt

- Lokaler Start-HEAD: `ac7a94d docs(handoff): pilot readiness local state`
- `master` lag 17 Commits vor `origin/master`.
- `git fetch origin` zeigte `origin/master` weiter auf
  `8341cd995af869c3c2035566c486729cc2448798`.
- Push-Go lag in dieser Session ausdruecklich vor.

## Lokale Pre-Push-Verifikation

Vor dem Push liefen:

```powershell
npx vitest run __tests__/app/register-pilot-role.test.tsx __tests__/app/register-ai-consent.test.tsx __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts __tests__/app/senior/touch-targets.test.tsx __tests__/app/senior/local-preview.test.tsx __tests__/components/senior/home-kennenlernen-link.test.tsx __tests__/scripts/ai-test-users-cleanup-dry-run.test.ts __tests__/scripts/ai-test-users-cleanup-execute.test.ts
npx eslint "app/(auth)/register/components/RegisterStepPilotRole.tsx" "app/(auth)/register/components/RegisterStepAiConsent.tsx" lib/ai/rate-limit.ts app/api/companion/chat/route.ts app/api/ai/onboarding/turn/route.ts app/api/speed-dial/route.ts app/senior/layout.tsx "app/(senior)/kreis-start/page.tsx" __tests__/app/senior/touch-targets.test.tsx __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts __tests__/scripts/ai-test-users-cleanup-dry-run.test.ts __tests__/scripts/ai-test-users-cleanup-execute.test.ts --no-warn-ignored
npx tsc --noEmit
npm run build
```

Ergebnis:

- Vitest: 12 Test Files passed, 106 Tests passed
- ESLint: clean
- TypeScript: clean
- Build: Exit 0, Next.js 16.2.4, 230 Seiten generiert
- Bekannte lokale Warnung: `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert`

## Push

```powershell
git push origin master
```

Ergebnis:

- `8341cd9..ac7a94d master -> master`
- Danach: `git status --short --branch` zeigte `master...origin/master`
  ohne ahead/behind.
- Nur bekannte alte untracked Dateien blieben sichtbar.

## Deploy

Read-only `vercel list --format json --status "BUILDING,READY,ERROR,QUEUED,INITIALIZING" --environment production --yes`
zeigte zunaechst, dass Production noch auf `8341cd9` stand.

Da Push allein keinen neuen Production-Deploy ausgeloest hatte, wurde der
verifizierte lokale Stand per Remote-Build deployed:

```powershell
vercel deploy --prod --yes
```

Ergebnis:

- Deployment: `dpl_46g2s4BzvGMZNubEjdL6BdrWZZ9e`
- Production URL: `https://nachbar-4bzt5sis5-thomasth1977s-projects.vercel.app`
- Alias: `https://nachbar-io.vercel.app`
- Ready-State: `READY`
- Build: Next.js 16.2.4, 230 Seiten generiert
- Vercel-Meta: `githubCommitSha` = `4be18c16d576612aea9c149ea1f538a266b36b16`
- Hinweis: Vercel meldete `gitDirty=1`, plausibel wegen der alten untracked
  Handoff-Dateien/PID-Datei. Diese Dateien wurden nicht deployed als Codeaenderung
  angefasst und nicht staged.

## Production-Smoke

Unauthentifizierte GET-Checks gegen `https://nachbar-io.vercel.app`:

| Route | Status | Bewertung |
|---|---:|---|
| `/` | 200 | public landing ok |
| `/login` | 200 | public login ok |
| `/register` | 200 | public register ok |
| `/datenschutz` | 200 | public legal ok |
| `/impressum` | 200 | public legal ok |
| `/api/health` | 200 | health json `{"status":"ok"}` |
| `/api/messages` | 503 | erwarteter Closed-Pilot-Guard |
| `/api/test/login` | 503 | erwarteter Closed-Pilot-/Unavailable-Guard |

Zusatzcheck:

| Route | Status | Bewertung |
|---|---:|---|
| `/register/preview/pilot-role` | 404 | erwartet in Production, weil `RegisterLocalPreviewPage` bei `NODE_ENV=production` `notFound()` aufruft |
| `/register/preview/ai-consent` | 404 | erwartet in Production, gleiche lokale Preview-Sperre |

## CI-/Status-Hinweis

- Lokales `gh run list --branch master --limit 10` war nicht nutzbar, weil
  `gh` nicht authentifiziert ist.
- GitHub-Connector lieferte fuer `ac7a94d` keine combined statuses und keine
  workflow runs.
- Vercel-Deploy-Metadaten und Live-Smoke wurden deshalb als praktische
  Production-Verifikation genutzt.

## Ergebnis

Der Post-Push-/Deploy-Stand ist fuer den unauthentifizierten Closed-Pilot-Smoke
gruen:

- oeffentliche Einstiegs- und Rechtsseiten erreichbar
- `/api/health` erreichbar
- geschuetzte APIs bleiben im Closed-Pilot blockiert
- lokale Register-Preview-Routen sind in Production bewusst nicht erreichbar

Nicht erledigt und weiterhin Founder-/rote Zone:

- keine Prod-Migrationen 176/177/178 angewendet
- kein Prod-DB-Write
- kein AI-Test-User-Cleanup gegen echte Umgebung
- keine Vercel-Env-Pruefung von Secret-Namen oder Aenderung
- keine Provider-/AVV-Live-Schalter
