# Senior-Touch-Targets Welle C

Stand: 2026-05-04

## Ziel

Den verbliebenen Pilot-Onboarding-Polish-Block fuer Senior-Mode-Touch-Targets
lokal absichern, ohne Prod-DB, Migrationen, Vercel-Env, Secrets oder echte
Pilotdaten anzufassen.

Scope dieser Welle:

- Bestehende Senior-Navigation gegen die 80px-Regel pruefen.
- Kleine sekundaere Senior-Start-Aktionen senior-tauglicher machen.
- Kein neues Design-System, keine neue UI-Lib, keine neue Route.

## Pre-Check

Vor Umsetzung gelesen/geprueft:

- `AGENTS.md`
- `nachbar-io/AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `docs/plans/2026-05-04-pilot-onboarding-polish-wave-c.md`
- `../.claude/rules/pre-check.md`
- `../.claude/rules/testing.md`

Repo-Suche:

- `rg --files app components modules __tests__ | rg "senior|Senior|register|touch|a11y|access"`
- `rg -n 'Senior Mode|senior|Senior|Touch|touch|min-h|h-\[|button|role="button"|aria-label' app components modules __tests__ -g '*.tsx' -g '*.ts'`

Ergebnis: passende Infrastruktur existiert bereits in `components/SeniorButton.tsx`,
`components/senior/SeniorHomeActions.tsx`, `app/senior/layout.tsx`,
`app/(senior)/kreis-start/page.tsx` und einzelnen Senior-Tests. Deshalb kein
Neubau, sondern ein schmaler Guard-Test plus gezielte Anpassung bestehender
Links.

## TDD

RED zuerst:

- `npx vitest run __tests__/app/senior/touch-targets.test.tsx`
  - erwartete Failures:
    - Header-Zurueckaktion hatte `56px` statt `80px`.
    - Sekundaeraktions-Container fuer `Termine` / `Mein Profil` fehlte und die
      Links waren kleine Textlinks.

GREEN nach Umsetzung:

- `npx vitest run __tests__/app/senior/touch-targets.test.tsx` -> 2 passed
- `npx vitest run __tests__/app/senior/touch-targets.test.tsx __tests__/app/senior/local-preview.test.tsx __tests__/components/senior/home-kennenlernen-link.test.tsx __tests__/app/senior/pair.test.tsx` -> 15 passed

Hinweis: Die erweiterte Senior-Testgruppe schreibt bekannte jsdom-Hinweise zu
`HTMLMediaElement.play()`, aber alle Tests laufen gruen.

## Umsetzung

- `app/senior/layout.tsx`
  - Header-Container auf 88px angehoben.
  - Zurueck-/Start-Link auf 80x80px Touch-Ziel angehoben.
  - Fixierte Notruf-112-Leiste auf 80px angehoben.
  - Bottom-Platzhalter auf 110px angehoben, damit die groessere Leiste keinen
    Inhalt verdeckt.

- `app/(senior)/kreis-start/page.tsx`
  - `Termine` und `Mein Profil` von kleinen Textlinks zu zwei ruhigen 80px
    Aktionsflaechen gemacht.
  - Test-ID fuer den Sekundaeraktionsbereich ergaenzt, damit die 80px-Regel
    regressionsfest bleibt.

## Sperren

Nicht gemacht:

- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine Secrets gelesen.
- Keine echten personenbezogenen Daten oder KI-Verarbeitung.
