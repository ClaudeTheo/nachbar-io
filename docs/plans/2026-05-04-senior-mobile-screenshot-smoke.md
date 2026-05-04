# Senior-Mobile-Screenshot-Smoke

Stand: 2026-05-04

## Ziel

Den offenen Welle-C-Punkt "Mobile-Screenshots pruefen" lokal abschliessen,
ohne Prod, Datenbank, Migrationen, Vercel-Env, Secrets oder echte Pilotdaten
anzufassen.

## Setup

- Lokaler Dev-Server auf `http://localhost:3001`.
- Viewport: `393 x 851` Pixel.
- Browser: Chromium via Playwright.
- Dev-Overlay fuer die finalen Screenshots ausgeblendet, damit nur die App-UI
  beurteilt wird.
- Server nach dem Smoke wieder gestoppt; Port 3001 ist frei.

Gepruefte Routen:

- `/senior/preview`
- `/register/preview/pilot-role`
- `/register/preview/ai-consent`

Nicht geprueft per Browser:

- `/kreis-start`, weil die Route lokal ohne Auth sauber in den Closed-Pilot-/
  Login-Pfad umleitet. Fuer diese Route liegt der 80px-Guard in
  `__tests__/app/senior/touch-targets.test.tsx`.

## Artefakte

- `docs/plans/2026-05-04-senior-mobile-screenshot-smoke/senior-preview-mobile.png`
- `docs/plans/2026-05-04-senior-mobile-screenshot-smoke/register-pilot-role-mobile.png`
- `docs/plans/2026-05-04-senior-mobile-screenshot-smoke/register-ai-consent-mobile.png`

## Ergebnis

PASS lokal:

- Senior-Preview:
  - Kernaktionen sind im Mobile-Viewport klar sichtbar.
  - 80px-Touch-Targets wirken stabil, inklusive "Zum normalen Modus" und
    Notruf-112-Leiste.
  - Keine sichtbare Ueberlappung zwischen Inhalt und fixierter Notruf-Leiste.

- Register-Rollen-Step:
  - Geschlossener-Pilot-Hinweis ist im ersten Mobile-Viewport sichtbar.
  - Rollen-Erklaerung und erste Rollenkarte sind erreichbar und nicht
    ueberlappend.
  - Die Seite scrollt erwartbar; kein Text bricht aus dem Container aus.

- KI-Consent-Step:
  - Freiwilligkeits-/Spaeter-entscheiden-Copy ist im ersten Mobile-Viewport
    sichtbar.
  - KI-Hilfe-Infokarte und Datenschutz-Hinweis sind ruhig lesbar.
  - Kein Text- oder Button-Overlap im sichtbaren Bereich.

## Sperren

Nicht gemacht:

- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine Secrets gelesen.
- Keine echten personenbezogenen Daten oder KI-Verarbeitung.
- Kein Auth-Bypass und kein E2E-Test-Secret fuer Screenshots.
