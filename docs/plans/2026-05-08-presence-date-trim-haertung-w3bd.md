# Presence-Date-Trim-Haertung W3bd

Datum: 2026-05-08 abend

## Ziel

Minimaler Date-Trim-Fix in einem bestehenden Presence-Helfer. Fokus hier:
`isUserOnline` darf einen validen `lastSeen`-ISO-String mit Rand-Leerzeichen
nicht als offline behandeln, solange der Zeitstempel innerhalb des Timeouts
liegt.

## Pre-Check

Geprueft:

```powershell
rg -n "isUserOnline\(|PRESENCE_TIMEOUT_MS|lastSeen" lib\video-calls __tests__ -g "*.ts" -g "*.tsx"
Get-Content -Path lib\video-calls\presence.ts -TotalCount 220
Get-Content -Path lib\video-calls\__tests__\presence.test.ts -TotalCount 140
```

Ergebnis:

- `isUserOnline` ist der bestehende Presence-Date-Helfer.
- Es existiert bereits ein fokussierter Unit-Test fuer Online/Offline-Timeouts.
- Der Helfer parste `lastSeen` noch ohne `trim()`.
- Kein neuer Service, keine neue Route und kein neuer Normalizer noetig.

## RED

Ergaenzt in `lib/video-calls/__tests__/presence.test.ts`:

- Ein frischer `lastSeen`-ISO-String mit Rand-Leerzeichen muss weiterhin
  `true` liefern.

RED-Verifikation:

```powershell
npx vitest run lib\video-calls\__tests__\presence.test.ts
```

Erwartet fehlgeschlagen:

- `isUserOnline(recent, now)` gab `false` statt `true` zurueck.

## GREEN

Minimaler Fix:

- `isUserOnline` trimmt `lastSeen` direkt vor `new Date(...)`.
- Null-/Falsy-Werte fallen weiter auf `false` zurueck.

GREEN-Verifikation:

```powershell
npx vitest run lib\video-calls\__tests__\presence.test.ts
```

Ergebnis:

- gezielter Vitest: 7 Tests gruen.

## Weitere Verifikation

```powershell
npx vitest run lib\video-calls\__tests__\presence.test.ts components\terminal\video\__tests__\KioskActiveCall.test.tsx components\terminal\video\__tests__\KioskAudioOnlyScreen.test.tsx components\terminal\video\__tests__\KioskIncomingCall.test.tsx
npx eslint lib\video-calls\presence.ts lib\video-calls\__tests__\presence.test.ts
git diff --check
npx tsc --noEmit
npm run build
```

Ergebnis:

- angrenzender Video-/Presence-Vitest: 27 Tests gruen.
- gezieltes ESLint gruen.
- `git diff --check` gruen; nur erwartete CRLF-Hinweise.
- `npx tsc --noEmit` gruen.
- `npm run build` gruen.

Build-Hinweis:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` ist das
  erwartete lokale Verhalten.

## Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung.

Stripe/Billing bleibt bis zur GmbH wartend.
