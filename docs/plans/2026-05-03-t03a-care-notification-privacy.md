# T-03a Care-Notification-SMS-Datensparsamkeit

Stand: 2026-05-03 abend
Branch: `master`
Scope: Care/SOS SMS-/Voice-Fallbacks, keine neue Provider-Abstraktion

## Harte Linien

- Keine Prod-DB-Schreibaktion.
- Keine Migration.
- Keine Vercel-Env-Aenderung.
- Keine Provider-Live-Schaltung.
- Keine neuen laufenden Kosten.
- Keine neue Notification-Service-Welt.

## Pre-Check

Durchgefuehrt vor Code-Aenderung:

```powershell
rg -n "sendSms\(|initiateCall\(|notifyFamily|notify-family|message:|display_name|seniorName|SMS|sms|voice|NotificationProviderAdapter|provider adapter|ProviderAdapter" app modules lib __tests__ docs -g '!node_modules'
rg --files app modules lib __tests__ docs | rg "(notify|notification|notifications|sms|voice|channels|sos)"
```

Gefunden:

- Zentrale Care-Notification-Kaskade existiert bereits in
  `modules/care/services/notifications.ts`.
- `lib/care/notifications.ts` ist nur ein Re-Export.
- Direkter SOS-Familien-SMS-Pfad existiert in `lib/sos/notify-family.ts`.
- SMS-/Voice-Kanaele sind bereits in
  `modules/care/services/channels/{sms,voice}.ts`; Twilio-Hard-Gate aus der
  vorigen Welle bleibt dort.
- Weitere SMS-Pfade wie Youth-Guardian-Consent und Invitations existieren,
  sind aber bewusst nicht Teil dieser Care/SOS-Welle.

Entscheidung:

- Kein neues `NotificationProviderAdapter`-Modul in dieser Welle.
- Erst vorhandene Care/SOS-Twilio-Payloads datensparsam machen.

## RED

```powershell
npx vitest run modules/care/services/notifications.test.ts lib/care/notifications.test.ts __tests__/lib/sos/notify-family.test.ts
```

Erwartet rot:

- Care-SMS enthielt `title: body`.
- Care-Voice enthielt `title. body`.
- SOS-Familien-SMS enthielt Senior-Anzeigename und "Notfall-Knopf".
- `notifyFamily` lud `users.display_name` nur fuer den SMS-Text.

## Implementiert

- `modules/care/services/notifications.ts`
  - SMS und Voice nutzen jetzt eine feste generische Twilio-Nachricht.
  - In-App und Push behalten die bestehenden Titel/Freitexte.
- `lib/sos/notify-family.ts`
  - SMS ist generisch und enthaelt keinen Senior-Namen.
  - Der zusaetzliche `users.display_name`-Read wurde entfernt.
- Tests in beiden Import-Pfaden (`modules/...` und `lib/care/...`) schuetzen
  die externe Twilio-Payload.

## Bewusst nicht geaendert

- Youth-Guardian-SMS und Einladungs-SMS; das sind eigene Produkt-/Consent-
  Pfade und brauchen separate Welle.
- Twilio-Provider-Live-Status; weiterhin keine Provider-Aktion.
- Push/In-App-Inhalte, weil sie fuer App-Kontext und Nutzerverstaendnis
  gebraucht werden.

## Verifikation

```powershell
npx vitest run modules/care/services/notifications.test.ts lib/care/notifications.test.ts __tests__/lib/sos/notify-family.test.ts
```

RED: 3 Dateien / 6 erwartete Failures.

```powershell
npx vitest run modules/care/services/notifications.test.ts lib/care/notifications.test.ts __tests__/lib/sos/notify-family.test.ts
```

GREEN: 3 Dateien / 36 Tests passed.

```powershell
npx vitest run modules/care/services/notifications.test.ts lib/care/notifications.test.ts __tests__/lib/sos/notify-family.test.ts modules/care/services/channels/sms.test.ts modules/care/services/channels/voice.test.ts __tests__/lib/invitations.test.ts
npx eslint 'modules/care/services/notifications.ts' 'modules/care/services/notifications.test.ts' 'lib/care/notifications.test.ts' 'lib/sos/notify-family.ts' '__tests__/lib/sos/notify-family.test.ts' --no-warn-ignored
git diff --check
npx tsc --noEmit
npm run build:local
```

Ergebnis:

- Gezielt Vitest: 6 Dateien / 62 Tests passed.
- Gezielt ESLint: gruen.
- `git diff --check`: keine Whitespace-Fehler, nur bekannte CRLF-Warnungen.
- TypeScript: gruen.
- `build:local`: gruen. Bekannte lokale Noise:
  `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.
- `vitest --changed`: 21 Dateien / 187 Tests passed.
- Full Lint: gruen.
