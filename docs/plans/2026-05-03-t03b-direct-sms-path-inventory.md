# T-03b Direct-SMS-Pfade Inventar

Stand: 2026-05-03 abend

## Ziel

Direkte SMS-/Voice-Providerpfade repo-lokal sichtbar machen und gegen neue,
ungepruefte Pfade absichern. Kein Produkt-Wording-Umbau in dieser Welle:
Youth-Guardian-Consent und Einladungen haben eigene Produkt-/Consent-Logik.

Keine Prod-Aktion, kein Deploy, keine Migration, keine Vercel-Env-Aenderung,
keine Provider-Live-Schaltung, keine neuen Kosten.

## Pre-Check

Gelaufen:

```powershell
rg -n "twilio|Twilio|TWILIO|messages\.create|client\.messages|sendSms|sendSMS|sms|SMS|voice|Voice" app modules lib __tests__ scripts docs -g '!node_modules' -g '!docs/plans/archive/**'
rg -n "from:\s*process\.env|TWILIO_PHONE|TWILIO_.*NUMBER|TWILIO_AUTH|TWILIO_ACCOUNT|TWILIO" app modules lib scripts -g '!node_modules'
rg -n "sendSms\(|initiateCall\(|messages\.create\(|twilio\.default\(|TWILIO_ENABLED" app modules lib __tests__ -g '!node_modules'
```

Befund:

- Twilio-SDK-Zugriff ist zentral in:
  - `modules/care/services/channels/sms.ts`
  - `modules/care/services/channels/voice.ts`
- Beide zentralen Kanaele pruefen serverseitig `TWILIO_ENABLED` ueber
  `modules/care/services/channels/twilio-gate.ts`.
- `lib/care/channels/sms.ts` und `lib/care/channels/voice.ts` sind nur
  Re-Exports auf die zentralen Kanaele.
- Mehrere `messages.create`-Treffer sind Anthropic/OpenAI-nahe KI-Pfade, keine
  SMS-Twilio-Pfade.

## Inventar der direkten SMS-/Voice-Aufrufer

Alle aktuellen Aufrufer von `sendSms` oder `initiateCall` ausserhalb der
zentralen Twilio-Kanaele:

| Datei | Aufruf | Zweck | Status |
|---|---|---|---|
| `modules/care/services/notifications.ts` | `sendSms`, `initiateCall` | Care-Fallback-Kaskade Push -> SMS -> Voice | T-03a datensparsam gehaertet; laeuft ueber zentralen Twilio-Gate |
| `lib/sos/notify-family.ts` | `sendSms` | SOS-Familienhinweis an hinterlegte Notfallkontakte | T-03a datensparsam gehaertet; laeuft ueber zentralen Twilio-Gate |
| `modules/youth/services/youth-routes.service.ts` | `sendSms` | Guardian-Consent-Link fuer Jugendfreigabe | Nur inventarisiert; eigener Consent-/Produktpfad |
| `lib/invitations.ts` | `sendSms` | Nachbarschafts-Einladungs-SMS | Nur inventarisiert; eigener Einladungs-/Produktpfad |

## Guard

Neues Testfile:

`__tests__/guards/sms-provider-paths.test.ts`

Der Guard prueft:

- Twilio-SDK-Zugriff (`import("twilio")`, `twilio.default`) darf nur in den
  zentralen Kanaelen liegen.
- Jeder direkte `sendSms`-/`initiateCall`-Aufrufer ausserhalb der zentralen
  Kanaele muss in diesem Inventar genannt sein.

Damit wird ein neuer SMS-Pfad nicht still eingefuehrt: Entweder er nutzt den
zentralen Gate und wird bewusst inventarisiert, oder der Guard schlaegt fehl.

## TDD

RED:

```powershell
npx vitest run __tests__/guards/sms-provider-paths.test.ts
```

Erwarteter Failure:

- Inventar-Datei fehlte noch.

GREEN:

- Diese Inventar-Datei angelegt.
- Keine Text-/Providerlogik geaendert.

## Verifikation

Lokal gelaufen:

- `npx vitest run __tests__/guards/sms-provider-paths.test.ts`
  -> 1 Datei / 2 Tests passed.
- `npx vitest run __tests__/guards/sms-provider-paths.test.ts modules/care/services/channels/sms.test.ts modules/care/services/channels/voice.test.ts modules/care/services/notifications.test.ts __tests__/lib/sos/notify-family.test.ts __tests__/lib/invitations.test.ts __tests__/lib/youth-consent.test.ts`
  -> 7 Dateien / 54 Tests passed.
- `npx eslint __tests__/guards/sms-provider-paths.test.ts --no-warn-ignored`
  -> gruen.
- `git diff --check`
  -> keine Whitespace-Fehler; nur bekannte CRLF-Warnung fuer `INBOX.md`.
- `npx tsc --noEmit`
  -> gruen.
- `npx vitest run --changed`
  -> 1 Datei / 2 Tests passed.
- `npm run lint`
  -> gruen.

`npm run build:local` wurde nicht erneut ausgefuehrt, weil diese Welle keine
Runtime-Datei aendert; sie ergaenzt nur Guard-Test, Inventar-Doku und INBOX.
