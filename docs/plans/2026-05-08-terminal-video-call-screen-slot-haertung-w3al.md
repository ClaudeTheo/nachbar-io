# W3al Terminal VideoCallScreen-Slot-Haertung

Datum: 2026-05-08 nachmittag

## Ziel

`components/terminal/screens/VideoCallScreen.tsx` soll direkte kaputte
Runtime-Werte aus `useConsultations` nicht mehr ungeprueft rendern.

Abgesicherte Raender:

- `slots` ist kein Array -> wie keine Termine behandeln.
- Slot-Status ausser `scheduled` / `waiting` / `active` -> ignorieren.
- kaputtes `scheduled_at` -> Slot ignorieren, kein `Invalid Date`.
- leerer/kaputter Titel -> `Videosprechstunde`.
- leerer/kaputter Host -> `Praxis`.
- kaputte `join_url` -> kein iframe mit `[object Object]` oder anderer kaputter
  URL.

## Pre-Check

Code-Suche vor Umsetzung:

```powershell
rg -n "VideoCallScreen|nextSlot|consultation|scheduled_at|host_name|provider_type|TechCheck|ConsultationConsent|normalize.*(Slot|Consultation)|appointment-status|format.*Date|format.*Time" app components lib modules __tests__
rg -n "VideoCallScreen|sprechstunde|nextSlot|consultation" components\terminal\__tests__ __tests__\components __tests__\app __tests__\lib
```

Ergebnis:

- `VideoCallScreen.tsx` hatte noch keine Screen-Grenzen-Normalisierung.
- Consultation-/Appointment-Servicevalidierung existiert serverseitig, aber kein
  lokaler Adapter fuer Terminal-Slot-Runtime-Werte.
- Daher kein Neubau einer Lib/Service-Struktur, sondern kleine lokale
  Normalisierung im bestehenden Screen.

## TDD

RED:

```powershell
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
```

Fehlschlaege wie erwartet:

- `TypeError: slots.find is not a function`
- React-Child-Fehler fuer Objekt-`title`
- iframe mit `src="[object Object]"`

GREEN:

```powershell
npx vitest run components\terminal\__tests__\TerminalVideoCallScreenGuards.test.tsx
```

Ergebnis: 3 Tests gruen.

## Aenderung

- Neuer Test:
  `components/terminal/__tests__/TerminalVideoCallScreenGuards.test.tsx`
- `VideoCallScreen` normalisiert `slots` via lokale `normalizeVideoCallSlots`.
- Der Screen nutzt nur noch normalisierte `VideoCallSlot`-Daten fuer
  Terminanzeige, Consent-Flow und iframe-Start.

## Gates

Kein Push, kein Deploy, keine Prod-DB, keine Vercel-Env-/Secret-/Billing-/Auth-
Aenderung. Stripe/Billing bleibt bis zur GmbH wartend.
