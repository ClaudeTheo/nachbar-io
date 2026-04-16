# Phase B Handoff

Stand: 2026-04-16

## Git-Stand

- `git rev-parse HEAD`: `c6b5bba3f4660161b763231fa73f5ab42ef3a3f9`
- `git log --oneline origin/master..HEAD` beim Handoff:

```text
c6b5bba feat(admin): group external API flags in feature manager
2a97d52 feat(ui): add external warning banner
9965241 feat(cron): batch external warnings sync
976cecb feat(api): add external warning read routes
ccb0530 feat(integrations): add shared HTTP retry helper
7bb07d6 feat(map): add LGL-BW house outlines layer
572c56d feat(integrations): add UBA air quality provider
4ef22d7 feat(integrations): add NINA and DWD warning providers
0af685f chore(types): regenerate external warning database types
5ebfbeb docs(plans): Codex Phase B prompt — Welle 1
84d1f5b docs(plans): Welle 1 integration plan
548514e chore(db): add external API flags and warning cache
441ae77 Handle BW candidate confirmation flow
6231864 Add household position confirmation flow
6cb319d Add BW house coordinate sync via LGL
0a13456 Bundle pilot fixes and cross-portal verification
85a66c0 Fix leaflet map resident lookup
```

- In diesem Pass wurden die Phase-B-Aenderungen als lokale Commits auf `master` geschrieben.
- Es gab bewusst keinen Push.
- Die globalen Repo-Gates sind weiterhin außerhalb von Phase B rot; die Commits sind deshalb lokal zur Review vorbereitet, aber nicht deployed.

## Abgeschlossene Tasks

- Task 4: NINA Client + Types
- Task 5: NINA CAP-Parser
- Task 6: DWD Client + Parser
- Task 7: LGL-BW Hausumringe Layer
- Task 8: `/api/warnings/{nina,dwd,uba}`
- Task 9: Batch-Cron `/api/cron/external-warnings`
- Task 10: Vitest-Audit fuer die neuen Integrationen
- Task 11: UBA Client + Parser + Route-Anbindung
- Task 13: `<ExternalWarningBanner />` + `AttributionFooter`
- Task 14: Admin-UI Gruppierung "Externe APIs"

## Wesentliche Umsetzung

- Neue Integrationen unter `lib/integrations/nina`, `lib/integrations/dwd`, `lib/integrations/uba`
- Neue Read-Routen unter `app/api/warnings/nina/route.ts`, `app/api/warnings/dwd/route.ts`, `app/api/warnings/uba/route.ts`
- Neuer Batch-Cron unter `app/api/cron/external-warnings/route.ts`
- Neuer Karten-Layer unter `components/map/lgl-bw-outlines-layer.tsx`, eingebunden ueber `components/LeafletMapInner.tsx` und `components/LeafletKarte.tsx`
- Neues Warning-UI unter `components/warnings/`
- Dashboard- und Quartier-Info-Warnungsanzeige von Altpfad auf `ExternalWarningBanner` umgestellt
- Feature-Flag-Manager gruppiert externe APIs separat und zeigt `Admin-Override`
- `fast-xml-parser` als Dependency installiert
- `vercel.json` um genau einen Cron-Eintrag fuer `/api/cron/external-warnings` mit `*/10 * * * *` erweitert

## Verifikation

- Gezielte Phase-B-Suiten gruen:

```text
npx vitest run \
  components/warnings/__tests__/external-warning-banner.test.tsx \
  __tests__/components/admin/FeatureFlagManager.test.tsx \
  lib/integrations/nina/__tests__/client.test.ts \
  lib/integrations/nina/__tests__/parser.test.ts \
  lib/integrations/dwd/__tests__/client.test.ts \
  lib/integrations/dwd/__tests__/parser.test.ts \
  lib/integrations/uba/__tests__/client.test.ts \
  lib/integrations/uba/__tests__/parser.test.ts

8 passed, 32 passed
```

- Gezielter TypeScript-Check fuer die angefassten Warning-/Admin-/Cron-/UBA-Dateien:
  Keine Treffer; die neuen Dateien erzeugen in `npx tsc --noEmit` keine eigenen Fehler.

- Voller Testlauf ist weiterhin rot:

```text
npm run test
403 Test Files insgesamt
401 passed
2 failed
3175 passed
3 failed
```

- Volles TypeScript ist weiterhin rot mit bereits bekannten, nicht-Phase-B-bezogenen Fehlern:

```text
__tests__/lib/security/device-fingerprint.test.ts
__tests__/pages/quartier-info-vorlesen.test.tsx
tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts
tests/e2e/cross-portal/x19-postfach-thread.spec.ts
tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts
```

## Gesehene Blocker und Umgang

- `npm run test` scheitert aktuell nicht an Phase-B-Dateien, sondern an bestehenden Tests:
  - `__tests__/api/care/sos/sos-detail.test.ts`
    - Fehlerbild: `SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert`
  - `__tests__/app/hilfe/tasks/page.test.tsx`
    - Fehlerbild: `maybeSingle is not a function` im Mock-Setup der Tasks-Seite
- `npx tsc --noEmit` scheitert weiterhin an bestehenden Typfehlern in Security-/Page-/E2E-Tests, nicht an den neuen Externe-APIs-Dateien.
- `/datenquellen` ist in Task 13 bereits verlinkt, die Seite selbst ist aber bewusst noch offen fuer Task 16 (Claude). Der Link ist damit vorbereitet, aber in diesem Stand noch nicht auf ein bestehendes Ziel aufgeloest.

## Empfohlene Flags fuer manuelles Test-Scharfschalten

- Minimal fuer ersten Smoke in Bad Saeckingen:
  - `NINA_WARNINGS_ENABLED`
- Fuer vollen Welle-1-Feature-Smoketest im selben Quartier:
  - `DWD_WEATHER_WARNINGS_ENABLED`
  - `UBA_AIR_QUALITY_ENABLED`
  - `LGL_BW_BUILDING_OUTLINES_ENABLED`

## Nicht fertig / bewusst nicht angefasst

- Kein `git push`
- Task 12 nicht angefasst
- Task 15 nicht angefasst
- Task 16 nicht angefasst
- Keine Aenderungen in `modules/info-hub/*`
- Keine Aenderungen in `app/api/cron/nina-sync/route.ts`
