# Pilot-Onboarding-Polish Welle C — Register

Stand: 2026-05-04

## Ziel

Den naechsten Pilot-Readiness-Block lokal weiterziehen, ohne Prod-DB,
Migrationen, Vercel-Env, Secrets oder echte Pilotdaten anzufassen.

Scope dieser Welle:

- Register-Rollen-Step ruhiger und klarer machen.
- KI-Einwilligungs-Step waermer formulieren, ohne AVV-/Provider-Versprechen.
- Bestehende Komponenten und Tests erweitern, keine neue UI-Lib, keine neue
  Architektur.

## Pre-Check

Vor Umsetzung gelesen/geprueft:

- `AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `../.claude/rules/pre-check.md`
- `../.claude/rules/testing.md`
- `docs/plans/2026-05-02-next-larger-steps.md`

Repo-Suche:

- `rg "pilotRole|aiConsentChoice|Rolle|Einwilligung|KI-Hilfe|Angehoer|Senior"`
  in `app/(auth)`, `components/auth`, `lib/ki-help`, `__tests__/app`,
  `__tests__/components`

Ergebnis: passende Infrastruktur existiert bereits in
`app/(auth)/register/components/RegisterStepPilotRole.tsx`,
`app/(auth)/register/components/RegisterStepAiConsent.tsx`,
`components/ki-help/AiAssistanceLevelPicker.tsx` und den bestehenden
Register-Tests. Deshalb kein Neubau, sondern schmaler Adapter/Polish in den
vorhandenen Komponenten.

## TDD

RED zuerst:

- `npx vitest run __tests__/app/register-pilot-role.test.tsx`
  - 2 erwartete Failures: fehlender "Geschlossener Pilot"-Hinweis und fehlende
    Auswahlzusammenfassung.
- `npx vitest run __tests__/app/register-ai-consent.test.tsx`
  - 2 erwartete Failures: fehlende "jetzt nicht entscheiden"-Copy und fehlende
    "Keine KI-Hilfe ist vollstaendige Auswahl"-Copy.

GREEN nach Umsetzung:

- `npx vitest run __tests__/app/register-pilot-role.test.tsx` -> 5 passed
- `npx vitest run __tests__/app/register-ai-consent.test.tsx` -> 17 passed

## Umsetzung

- Rollen-Step:
  - Rose-Hinweis durch ruhigen Closed-Pilot-Hinweis ersetzt.
  - Info-Toggle auf `min-h-[56px]` vergroessert.
  - Nach Rollenwahl erscheint eine knappe Auswahlzusammenfassung vor dem
    Weiter-Button.
- KI-Einwilligungs-Step:
  - Ergaenzt, dass die Entscheidung nicht sofort getroffen werden muss.
  - "Spaeter entscheiden" als guter Pilot-Start formuliert.
  - Datenschutzbox stellt klar: Keine KI-Hilfe ist ebenfalls eine vollstaendige
    Auswahl.

## Sperren

Nicht gemacht:

- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine Secrets gelesen.
- Keine echten personenbezogenen Daten oder KI-Verarbeitung.
