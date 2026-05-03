# Sentry Instrumentation Client Migration - 2026-05-03

## Ziel

Die im lokalen S7-Smoke dokumentierte Sentry-Deprecation-Warnung fuer
`sentry.client.config.ts` wurde in einem kleinen Pilot-Hygiene-Block entfernt.

## Umsetzung

- Pre-Check:
  - `rg -n "sentry\.client\.config|instrumentation-client|Sentry" .`
  - `rg --files | rg "(^|/)sentry\.|instrumentation-client|sentry"`
- Ergebnis: bestehende Sentry-Infrastruktur war vorhanden:
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
  - `sentry.client.config.ts`
  - `instrumentation.ts`
- Deshalb kein Neubau, sondern schmale Konventionsmigration:
  - neuer Root-File `instrumentation-client.ts`
  - alter Root-File `sentry.client.config.ts` entfernt
  - bestehende Client-Sentry-Konfiguration inklusive DSGVO-Redaction uebernommen
  - `onRouterTransitionStart` fuer Sentry-App-Router-Navigation exportiert

## Verifikation

RED vor Umsetzung:

```powershell
npx vitest run __tests__/config/sentry-file-conventions.test.ts
```

Ergebnis: 1 Test failed, weil `instrumentation-client.ts` noch fehlte.

GREEN nach Umsetzung:

```powershell
npx vitest run __tests__/config/sentry-file-conventions.test.ts
npx eslint instrumentation-client.ts __tests__/config/sentry-file-conventions.test.ts --no-warn-ignored
npx tsc --noEmit
git diff --check
npm run build
```

Ergebnis:

- Vitest: 1 passed
- ESLint: exit 0
- TypeScript: exit 0
- `git diff --check`: exit 0, nur LF/CRLF-Hinweis fuer `INBOX.md`
- `npm run build`: exit 0; keine Sentry-Deprecation-Warnung mehr sichtbar

## Grenzen

- Keine Prod-DB-Schreibaktion.
- Keine Vercel-Env-Aenderung.
- Keine neuen Abhaengigkeiten oder laufenden Kosten.
- Keine echten personenbezogenen Daten verarbeitet.
