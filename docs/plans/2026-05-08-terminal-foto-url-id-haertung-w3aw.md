# Terminal Foto-URL-Haertung W3aw

Datum: 2026-05-08 abend

## Ziel

Weitere Terminal-Fetch-Screens auf echte, testbare String-Randfaelle pruefen.
Kein mechanisches Haerten ohne RED-Test.

## Pre-Check

Geprueft:

```powershell
rg -n "normalize|asString|trim\(|scheduled_at|join_url|photo|caption|reminder|appointment|url|id" components\terminal app\terminal lib\terminal __tests__\lib\terminal components\terminal\__tests__ components\terminal\video\__tests__
rg --files components\terminal app\terminal lib\terminal __tests__\lib\terminal components\terminal\__tests__ components\terminal\video\__tests__
Get-Content -Raw components\terminal\AppointmentPopup.tsx
Get-Content -Raw components\terminal\screens\ErinnerungenScreen.tsx
Get-Content -Raw components\terminal\screens\FamilienFotosScreen.tsx
Get-Content -Raw components\terminal\ScreensaverOverlay.tsx
Get-Content -Raw components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
```

Ergebnis:

- Bestehende lokale Normalizer sind vorhanden.
- Kein Neubau noetig.
- Echter RED-Kandidat: Foto-URLs mit Rand-Leerzeichen werden validiert, aber
  in `FamilienFotosScreen` und `ScreensaverOverlay` ungetrimmt als `img src`
  gerendert.

## RED

Ergaenzt in `components/terminal/__tests__/TerminalDeviceListGuards.test.tsx`:

- Familienfotos trimmen Foto-URL vor `img src`.
- Screensaver trimmt Foto-URL vor `img src`.

RED-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
```

Erwartet fehlgeschlagen:

- `src="  /familie.jpg  "` statt `src="/familie.jpg"` in Familienfotos.
- `src="  /familie.jpg  "` statt `src="/familie.jpg"` im Screensaver.

## GREEN

Minimaler Fix:

- `FamilienFotosScreen.normalizePhotos` uebernimmt `photo.url.trim()`.
- `ScreensaverOverlay.normalizeScreensaverPhotos` uebernimmt
  `photo.url.trim()`.

GREEN-Verifikation:

```powershell
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx vitest run components\terminal\__tests__\TerminalDeviceListGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx
npx eslint components\terminal\screens\FamilienFotosScreen.tsx components\terminal\ScreensaverOverlay.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- gezielter Vitest: 11 Tests gruen.
- angrenzender Terminal-Vitest: 16 Tests gruen.
- gezieltes ESLint gruen.
- `git diff --check` gruen.
- `npx tsc --noEmit` gruen.
- `npm run build` gruen.

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist das
  erwartete lokale Verhalten.

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
