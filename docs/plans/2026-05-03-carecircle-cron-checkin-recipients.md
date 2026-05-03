# CareCircle Cron-Checkin Recipients

Stand: 2026-05-03 abend

## Scope

Enger Anschlussblock nach T-14c. Ziel war nur die Check-in-Cron-Eskalation:
verpasste Check-ins sollen Angehoerige nicht mehr nur ueber Legacy-`care_helpers`
finden, sondern aktive `caregiver_links` ueber den bestehenden
`getCareNotificationRecipients()`-Resolver mitnehmen.

Keine Prod-Aktion, kein Deploy, keine Migration angewendet, keine
Provider-/Env-/Kosten-Aenderung. M4 bleibt blockiert.

## Pre-Check

Durchgefuehrt:

```powershell
rg -n "cron-checkin|processMissedCheckins|missed|care_helpers|getCareNotificationRecipients|sendCareNotification" __tests__ app modules\care\services -g '!node_modules'
```

Gefunden:

- `modules/care/services/cron-checkin.service.ts` nutzte im Eskalationspfad
  weiterhin direkt `care_helpers`.
- `getCareNotificationRecipients()` existiert seit T-14c und kapselt
  Legacy-`care_helpers` plus aktive `caregiver_links` dedupliziert.
- Dieser Block laesst `cron-medications`, `cron-escalation` und SOS-Pfade
  bewusst fuer eigene Folgeblocks liegen.

## TDD

RED:

```powershell
npx vitest run modules/care/services/cron-checkin.test.ts -t "CareCircle-Empfaenger"
```

Ergebnis: Test scheiterte, weil die alte `care_helpers`-Query lief und
`getCareNotificationRecipients()` nicht aufgerufen wurde.

GREEN:

- `cron-checkin.service.ts` importiert `getCareNotificationRecipients`.
- Die Check-in-Eskalation ruft den Resolver mit Rollen
  `relative` + `care_service`.
- Die Benachrichtigung nutzt `recipient.userId` und behaelt Channels,
  Fallback und Inhalt unveraendert.

## Verifikation

Gruen:

```powershell
npx vitest run modules/care/services/cron-checkin.test.ts __tests__/api/care/cron/care-crons.test.ts modules/care/services/notifications.test.ts
npx tsc --noEmit
```

Ergebnis:

- Vitest: 3 Dateien / 38 Tests passed.
- TypeScript: exit 0.
