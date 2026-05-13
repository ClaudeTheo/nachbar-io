# Youth UI Map-First Implementation

Datum: 2026-05-13  
Owner: Codex  
Status: lokal umgesetzt, verifiziert, noch nicht gepusht

## Kurzstand

Der Jugendmodus hat nun eine eigene visuelle Oberfläche, ohne die eingefrorene
50+-/Comfort-Oberfläche zu verändern. `/jugend` nutzt das bereits freigegebene
Jugend-Hero-Asset, zeigt den Status kompakt und setzt die Quartierskarte mit
Activity-Pins oben in den Arbeitsfluss. Danach wurden die zwei Founder-
Vorgaben "Tauschen und Verschenken" sowie "geschützte Gruppen" ergänzt.

## Umgesetzt

- Neuer Youth-Startscreen:
  - `modules/youth/components/YouthHomeSurface.tsx`
  - `modules/youth/components/YouthDashboardClient.tsx`
  - `app/(app)/jugend/page.tsx`
- Map-first-Integration:
  - `NachbarKarte` akzeptiert `activityMode`
  - `/jugend` ruft die Karte mit `activityMode="youth"` auf
- Jugend-Unterseiten angeglichen:
  - `app/(app)/jugend/aufgaben/page.tsx`
  - `app/(app)/jugend/badges/page.tsx`
  - `app/(app)/jugend/profil/page.tsx`
  - `TaskBoard`, `TaskCard`, `BadgeCard`, `PointsDisplay`, `AccessLevelBanner`
- Jugend-Navigation:
  - `NavRole` erweitert um `youth`
  - `users.ui_mode = youth` bekommt Tabs: Start, Karte, Tauschen, Gruppen
- Jugend-Tauschbörse:
  - `modules/youth/components/YouthExchangeSurface.tsx`
  - `modules/youth/services/exchange-rules.ts`
  - `app/(app)/jugend/tauschen/page.tsx`
  - bewusst nur Tauschen + Verschenken, kein Verkauf, keine Zahlung, keine
    Adresslogik
- Geschützte Jugend-Gruppen:
  - `modules/youth/components/YouthGroupsSurface.tsx`
  - `app/(app)/jugend/gruppen/page.tsx`
  - Einstieg in vorhandene `chat-groups`-Infrastruktur, mit Einladung/Admin-
    Logik als Produktregel
- Lokale Sichtprobe:
  - `/jugend-ui-preview`
  - `/jugend-tauschen-preview`
  - `/jugend-gruppen-preview`
  - Dev/Test-only via `isLocalUiPreviewEnabled`
  - Closed-Pilot-Whitelist erweitert

## Verifikation

- `npx vitest run __tests__/components/youth-home-surface.test.tsx __tests__/components/youth-dashboard-client.test.tsx __tests__/components/youth-points-display.test.tsx components/nav/__tests__/NavConfig.test.ts __tests__/middleware/closed-pilot.test.ts __tests__/app/youth-ui-preview.test.tsx`
  - 6 Test Files, 34 Tests grün
- `npx vitest run __tests__/components/youth-home-surface.test.tsx __tests__/components/youth-exchange-surface.test.tsx __tests__/components/youth-groups-surface.test.tsx __tests__/lib/youth-exchange-rules.test.ts __tests__/app/youth-exchange-preview.test.tsx __tests__/app/youth-ui-preview.test.tsx __tests__/middleware/closed-pilot.test.ts components/nav/__tests__/NavConfig.test.ts`
  - 8 Test Files, 43 Tests grün
- Gezieltes ESLint auf alle geänderten Youth-/Nav-/Preview-Dateien: grün
- `npx tsc --noEmit`: grün
- `npm run build`: grün
- `git diff --check`: grün, nur CRLF-Warnungen
- Browser-QA:
  - `http://localhost:3005/jugend-ui-preview`
  - In-App-Browser: kein Framework-Overlay, keine Console-Warnungen/-Fehler
  - Map-Zoom-Interaktion geprüft
  - Playwright Chrome: Mobile 390x844 und Desktop 1280x900, kein horizontaler Overflow
  - Screenshots:
    - `C:\Users\thoma\AppData\Local\Temp\nachbar-youth-ui-mobile.png`
    - `C:\Users\thoma\AppData\Local\Temp\nachbar-youth-ui-desktop.png`
    - `C:\Users\thoma\AppData\Local\Temp\nachbar-youth-tauschen-preview-2.png`
    - `C:\Users\thoma\AppData\Local\Temp\nachbar-youth-gruppen-preview-2.png`

## Grenzen

- Keine Prod-DB-Schreibaktion.
- Keine neue Migration.
- Keine Vercel-Env-/Secrets-/Billing-/Provider-Aktion.
- Echte `youth_tasks`-Pins auf Hausankern brauchen weiterhin saubere
  Location-Felder oder eine eigene Datenmodell-Welle.
