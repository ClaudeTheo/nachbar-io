# Codex Handover — Provider-Compliance-Welle

Stand: 2026-05-03 abend
Branch: `master`
Scope: T-15a Twilio Hard Gate + T-16 TTS-Cache Privacy Gate

## Harte Linien

- Keine Prod-DB-Schreibaktion.
- Keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Keine Provider-Live-Schaltung.
- Keine neuen laufenden Kosten.

## Pre-Check

Durchgefuehrt vor Code-Aenderung:

```powershell
rg -n "TWILIO_ENABLED|sendSms|initiateCall|tts-cache|cache|gpt-4o-mini-tts|textToSpeech|tts" app modules lib __tests__ supabase docs -g '!node_modules'
rg -n "sendSms\(|initiateCall\(|channels/sms|channels/voice" __tests__ app modules lib -g '!node_modules'
rg -n "TWILIO_ENABLED|feature_flags|enabled" supabase\migrations lib app docs\plans\2026-04-30-phase-1-pre-flight.md docs\plans\2026-05-01-phase-1-founder-hard-gates-audit.md
```

Gefunden:

- Echte Twilio-Logik sitzt in `modules/care/services/channels/sms.ts` und `voice.ts`.
- `lib/care/channels/*` sind nur Bruecken-Exports.
- `TWILIO_ENABLED` existiert als Feature-Flag, wurde aber im zentralen Kanal nicht erzwungen.
- TTS public cache sitzt in `modules/voice/services/tts.service.ts`; Route war bisher ohne Cache-Policy.

## RED

```powershell
npx vitest run modules/care/services/channels/sms.test.ts modules/care/services/channels/voice.test.ts __tests__/api/voice/tts.test.ts
```

Erwartet rot:

- SMS wurde trotz `TWILIO_ENABLED=false` gesendet.
- Voice Call wurde trotz `TWILIO_ENABLED=false` gestartet.
- TTS meldete ohne Opt-in `X-TTS-Cache=miss` statt `disabled`.

## Implementiert

- `modules/care/services/channels/twilio-gate.ts`
  - Liest `feature_flags.TWILIO_ENABLED` per Admin-Supabase.
  - Fail-closed: Fehler, fehlende Flag-Zeile oder `enabled=false` sperrt Twilio.
- `modules/care/services/channels/sms.ts`
  - Prueft nach Credential-Check zusaetzlich `isTwilioEnabled()`.
  - Kein Twilio-Import/Call bei deaktiviertem Flag.
- `modules/care/services/channels/voice.ts`
  - Gleicher Hard Gate fuer Voice Calls.
- `modules/voice/services/tts.service.ts`
  - Public Cache nur noch bei `cache: "public"`.
  - Ohne Opt-in: kein HEAD/GET gegen `tts-cache`, kein Upload, Header `X-TTS-Cache=disabled`.
- `app/api/voice/tts/route.ts`
  - Reicht nur `cache: "public"` als explizites Opt-in weiter.

## Verifikation

```powershell
npx vitest run modules/care/services/channels/sms.test.ts modules/care/services/channels/voice.test.ts __tests__/api/voice/tts.test.ts
```

Ergebnis: 3 Dateien / 19 Tests passed.

```powershell
npx vitest run modules/care/services/channels/sms.test.ts modules/care/services/channels/voice.test.ts __tests__/api/voice/tts.test.ts __tests__/lib/invitations.test.ts __tests__/lib/sos/notify-family.test.ts
```

Ergebnis: 5 Dateien / 46 Tests passed.

```powershell
npx vitest run modules/care/services/notifications.test.ts lib/care/notifications.test.ts __tests__/lib/feature-flags-presets.test.ts __tests__/api/admin/feature-flags-preset.test.ts
```

Ergebnis: 4 Dateien / 35 Tests passed.

```powershell
npx eslint 'modules/care/services/channels/sms.ts' 'modules/care/services/channels/voice.ts' 'modules/care/services/channels/twilio-gate.ts' 'modules/care/services/channels/sms.test.ts' 'modules/care/services/channels/voice.test.ts' 'modules/voice/services/tts.service.ts' 'app/api/voice/tts/route.ts' '__tests__/api/voice/tts.test.ts' --no-warn-ignored
npx tsc --noEmit
```

Ergebnis: beide gruen.

```powershell
npm run build:local
```

Ergebnis: gruen. Bekannte lokale Noise: `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`.

## Betriebsnotiz

Twilio ist jetzt auch dann hart gesperrt, wenn Credentials in der Umgebung liegen, solange `feature_flags.TWILIO_ENABLED` nicht serverseitig `true` ist. Falls die Flag-Zeile fehlt oder nicht lesbar ist, gilt fail-closed.

TTS public cache ist jetzt Opt-in. Bestehende Aufrufer ohne `cache: "public"` bekommen weiterhin Audio, aber ohne Public-Storage-Cache.
