# Handover 2026-05-02 — Pilot-Onboarding-Polish Welle C

Stand: 2026-05-02 abends, nach lokalem Onboarding-Polish auf `master`.

## Harte Linien

- Kein Deploy.
- Kein Prod-DB-Write, keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Keine Feature-Flag-/Preset-Schalter.
- Keine echten Pflege-/Medizin-/Personendaten.
- Browser-Pruefung nur gegen lokalen Development-Server auf Port 3000.

## Geaendert

### Register Identity

- Inline-Styles aus dem preview-kritischen Identity-Formular entfernt.
- Honeypot und Mindesthoehen laufen jetzt ueber stabile Tailwind-Klassen.
- Grund: Der lokale Browser-Screenshot zeigte vorher einen React-Hydration-Hinweis durch Style-Abweichungen.

### Register Pilot Role

- Rollenwahl sagt jetzt explizit: Die Auswahl kann spaeter geaendert werden.
- Rollen-Cards haben jetzt mindestens 80 px Hoehe.
- Primaerbutton hat eine groessere Mindesthoehe.

### Register AI Consent

- Explizite KI-Einwilligung ist jetzt ein 80-px-Touch-Ziel.
- Primaerbutton hat eine groessere Mindesthoehe.
- Zurueck von der KI-Auswahl fuehrt wieder zur Pilot-Rolle, nicht direkt zur Identity-Seite.

## Geaenderte Dateien

- `app/(auth)/register/components/RegisterStepIdentity.tsx`
- `app/(auth)/register/components/RegisterStepPilotRole.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.tsx`
- `__tests__/app/register-identity.test.tsx`
- `__tests__/app/register-pilot-role.test.tsx`
- `__tests__/app/register-ai-consent.test.tsx`

## Verifikation

RED bestaetigt:

- Neuer Pilot-Role-Test sah die Spaeter-aendern-Copy noch nicht.
- Neuer AI-Consent-Test sah kein 80-px-Touch-Ziel.
- Neuer AI-Consent-Zurueck-Test bekam `identity` statt `pilot_role`.
- Neuer Identity-Test sah noch Inline-Styles.

GREEN danach:

```bash
npx vitest run __tests__/app/register-identity.test.tsx __tests__/app/register-pilot-role.test.tsx __tests__/app/register-ai-consent.test.tsx
```

Ergebnis: 3 Dateien / 23 Tests passed.

```bash
npx eslint 'app/(auth)/register/components/RegisterStepIdentity.tsx' 'app/(auth)/register/components/RegisterStepPilotRole.tsx' 'app/(auth)/register/components/RegisterStepAiConsent.tsx' '__tests__/app/register-identity.test.tsx' '__tests__/app/register-pilot-role.test.tsx' '__tests__/app/register-ai-consent.test.tsx' --no-warn-ignored
npx tsc --noEmit
npm run build:local
```

Ergebnis: ESLint gruen, TypeScript gruen, build:local gruen.

Lokale Browser-Preview:

- `http://localhost:3000/register/preview/identity`
- `http://localhost:3000/register/preview/pilot-role`
- `http://localhost:3000/register/preview/ai-consent`

Geprueft mit Playwright auf mobile und desktop Viewports. Ergebnis:

- Alle Routen HTTP 200.
- Keine Console-Warnings oder Console-Errors im finalen Lauf.
- Screenshots lokal unter `tmp/welle-c-register-screenshots/` erzeugt. Das Verzeichnis ist gitignored und wurde nicht versioniert.

## Bekannte lokale Noise

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert` im lokalen Build bleibt unveraendert und ist fuer diese Welle nicht blockierend.
- Ein bereits laufender Dev-Server auf Port 3000 wurde fuer die Preview genutzt. Port 3001 wurde nicht offen gelassen.

## Naechstes

1. Lokalen Commit fuer Welle C erstellen.
2. Mit Founder-Go pushen.
3. GitHub Actions abwarten, besonders E2E Multi-Agent Tests.
4. Danach keine Production-Aktion aus dieser Welle ableiten: Es ist ein Onboarding-Polish, kein Deploy-Zwang.

## Sinnvoller Folgeblock

Welle D: Senior/Care Entry Spot-Check.

- `/senior`, `/senior/home`, `/care`, `/care/consent` lokal browsern.
- Touch-Ziele, sichtbare Notfallprioritaet, Console-Noise und mobile Overflow pruefen.
- Nur kleine, testbare Polish-Fixes mit RED/GREEN, keine Care-Daten oder Prod-Aktionen.
