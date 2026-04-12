# SOS "Angehörige benachrichtigen" — Design

**Datum:** 2026-04-12
**Task-Code:** J-1

## Problem

Der "Notfall"-Button auf `/kreis-start` öffnet das `SosConfirmationSheet` mit Option "Angehörige benachrichtigen". Diese Option zeigt nur `alert()` — es wird keine echte Benachrichtigung gesendet.

## Lösung

### API: `POST /api/sos/notify-family`

- Authentifizierter User → `getCareProfile` → `emergency_contacts` laden
- Für jeden Kontakt mit gültiger Telefonnummer: SMS senden via `sendSms`
- Kein DB-Alert in `care_sos_alerts` (einfacher Familien-Kanal, kein Care-Modul-Flow)
- Response: `{ notified: number, failed: number }`
- SMS-Text: "[Name des Seniors] hat den Notfall-Knopf gedrückt und braucht Ihre Hilfe. Bitte melden Sie sich umgehend."

### Frontend: `SosConfirmationSheet`

- `handleNotifyCaregivers()` ruft `POST /api/sos/notify-family` auf
- Loading-State während API-Call
- Erfolg: "Benachrichtigung gesendet" Anzeige, dann Sheet schließen
- Fehler: Fehlermeldung im Sheet
- Keine Kontakte: Hinweis "Keine Angehörigen hinterlegt"

## Abgrenzung

- Kein `care_sos_alerts` DB-Eintrag (das ist der Care-Modul-Flow via `SosCategoryPicker`)
- Kein WhatsApp (Notfall braucht gleichzeitige Benachrichtigung aller Kontakte)
- Kein Audit-Log (kein Care-Modul-Kontext)

## Bestehende Infrastruktur

- `sendSms` in `modules/care/services/channels/sms.ts`
- `getCareProfile` in `modules/care/services/profile.service.ts`
- `emergency_contacts` in `CareProfile` (Name, Beziehung, Telefon, Priorität)
- `SosConfirmationSheet` in `components/sos/SosConfirmationSheet.tsx`
