# T-02 SOS-/Notfall-Wording-Haertung

Stand: 2026-05-03 abend
Branch: `master`
Scope: Sichtbares SOS-Wording ohne interne Kategorie-/DB-Umbenennung

## Harte Linien

- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-Aenderung.
- Keine Provider-Live-Schaltung.
- Keine neuen laufenden Kosten.
- Interne IDs wie `medical_emergency` und `medical_emergency_sos` bleiben stabil.

## Pre-Check

Durchgefuehrt vor Code-Aenderung:

```powershell
rg -n "Medizinischer Notfall|Notfall-SOS|medical_emergency|Hausnotruf|dringende Hilfe|Dringende Hilfe|112|110" app modules components lib __tests__ docs -g '!node_modules' -g '!docs/plans/archive/**'
rg -n "FEATURE_LABELS|CARE_SOS_CATEGORIES|Dringende Hilfe benötigt|Medizinischer Notfall" __tests__ modules app lib -g '!node_modules'
```

Gefunden:

- Zentrale SOS-UI-Kategorien existieren bereits in `modules/care/services/constants.ts`.
- Die Senior-SOS-Auswahl nutzt bereits "Dringende Hilfe benötigt".
- Ausreisser waren sichtbare Feature-/Doku-/Caregiver-Labels:
  `modules/care/services/billing.ts`,
  `app/(app)/care/meine-senioren/[seniorId]/page.tsx`,
  `app/(auth)/testanleitung/page.tsx`, `lib/help-content.ts` und mehrere
  nutzernahe Doku-Dateien.
- Kein neues Modul, keine neue Kategorie und keine DB-Rename-Migration noetig.

## RED

```powershell
npx vitest run __tests__/lib/care/billing.test.ts __tests__/content/sos-wording-guard.test.ts
```

Erwartet rot:

- `FEATURE_LABELS.medical_emergency_sos` war noch
  "Medizinischer Notfall-SOS".
- Der Content-Guard fand elf nutzernahe Treffer fuer
  "Medizinischer Notfall", "medizinischer Notfall" oder "Notfall-SOS".

## Implementiert

- `FEATURE_LABELS.medical_emergency_sos` heisst jetzt
  "Dringende Hilfe mit 112-Hinweis".
- Caregiver-Detailseite zeigt fuer `medical_emergency` jetzt
  "Dringende Hilfe benötigt".
- Testanleitungen, API-/Architektur-/Workflow-Doku und Hilfe-FAQ vermeiden die
  alten sichtbaren Begriffe.
- `__tests__/content/sos-wording-guard.test.ts` schuetzt die nutzernahen
  Dateien gegen Rueckfall.

## Noch bewusst nicht geaendert

- DB-Enum/IDs `medical_emergency` und `medical_emergency_sos`.
- Technische Tests oder KI-Sicherheitswissen, in denen "medizinischer Notfall"
  als Lagebeschreibung korrekt ist.
- EmergencyBanner-Logik: 112/110 bleibt priorisiert.

## Verifikation

```powershell
npx vitest run __tests__/lib/care/billing.test.ts __tests__/content/sos-wording-guard.test.ts
```

RED: 2 Dateien / 2 erwartete Failures.

```powershell
npx vitest run __tests__/lib/care/billing.test.ts __tests__/content/sos-wording-guard.test.ts
```

GREEN: 2 Dateien / 20 Tests passed.

```powershell
npx vitest run __tests__/lib/care/billing.test.ts __tests__/content/sos-wording-guard.test.ts modules/care/components/sos/SosCategoryPicker.test.tsx modules/care/components/sos/SosAlertCard.test.tsx __tests__/lib/care/permissions.test.ts
```

Ergebnis: 5 Dateien / 64 Tests passed.

```powershell
npx eslint '__tests__/lib/care/billing.test.ts' '__tests__/content/sos-wording-guard.test.ts' 'modules/care/services/billing.ts' 'modules/care/services/permissions.ts' 'app/(app)/care/meine-senioren/[seniorId]/page.tsx' 'app/(auth)/testanleitung/page.tsx' 'lib/help-content.ts' --no-warn-ignored
git diff --check
npx tsc --noEmit
npm run build:local
npx vitest run --changed
npm run lint
```

Ergebnis:

- ESLint gezielt: gruen.
- `git diff --check`: keine Whitespace-Fehler, nur bekannte CRLF-Warnungen.
- TypeScript: gruen.
- `build:local`: gruen. Bekannte lokale Noise:
  `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.
- `vitest --changed`: 54 Dateien / 498 Tests passed.
- Full Lint: gruen.
