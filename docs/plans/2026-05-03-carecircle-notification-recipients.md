# CareCircle Notification Recipients

Stand: 2026-05-03 abend

## Scope

Enger Anschlussblock nach dem Assigned-Seniors-Adapter. Ziel war, alte
Angehoerigen-Benachrichtigungen nicht mehr nur ueber Legacy-`care_helpers` zu
adressieren, sondern aktive `caregiver_links` als CareCircle-Master
mitzunehmen. Kein M4, kein Deploy, keine Prod-Aktion, keine Migration
angewendet, keine Provider-/Env-/Kosten-Aenderung.

## Pre-Check

Durchgefuehrt:

```powershell
rg -n "care_helpers" modules\care\services modules\care\hooks app\api\care __tests__\api __tests__\hooks __tests__\lib -g '!node_modules'
rg -n "relative|relatives|helpers|recipients|recipient|caregiver_links|sendCareNotification|notification" modules\care\services lib\care __tests__ -g '!node_modules'
```

Gefunden:

- `sendCareNotification` existiert als Transport-Service.
- Ein gemeinsamer Empfaenger-Resolver fuer Legacy-`care_helpers` plus
  `caregiver_links` existierte nicht.
- Konkrete Nutzerpfade mit Angehoerigen-Benachrichtigung:
  `checkin.service.ts` bei `not_well` und `medications-log.service.ts` bei
  `skipped`.
- Weitere Cron-/SOS-Pfade bleiben als separater Block moeglich; dieser Block
  haertet bewusst nur zwei direkte Nutzerpfade.

## TDD

RED:

```powershell
npx vitest run modules/care/services/notifications.test.ts -t "kombiniert Legacy-Helfer"
npx vitest run app/api/care/checkin/route.test.ts -t "caregiver_links wenn Status not_well"
npx vitest run __tests__/api/care/medications/medications-log.test.ts -t "caregiver_links wenn Medikament"
```

Ergebnis:

- Resolver-Test rot: `getCareNotificationRecipients is not a function`.
- Check-in-/Medikations-Tests rot: Resolver wurde nicht aufgerufen.

GREEN:

- `getCareNotificationRecipients()` in `modules/care/services/notifications.ts`.
- Legacy-`care_helpers` bleiben vorrangig.
- Aktive `caregiver_links` (`revoked_at is null`) werden per bestehendem
  `mapCaregiverRelationshipToRole()` auf alte Care-Rollen gemappt.
- Dedupe per `userId`, damit parallele Legacy- und CareCircle-Eintraege nicht
  doppelt benachrichtigen.
- Check-in `not_well` und Medikament `skipped` verwenden den Resolver.

## Verifikation

Gruen:

```powershell
npx vitest run modules/care/services/notifications.test.ts app/api/care/checkin/route.test.ts __tests__/api/care/medications/medications-log.test.ts
npm run lint
npx tsc --noEmit
```

Ergebnis:

- Vitest: 3 Dateien / 45 Tests passed.
- ESLint: exit 0.
- TypeScript: exit 0.
