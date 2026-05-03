# Codex → Codex Übergabe: Security-Fixes Care/App

Stand: 2026-05-04
Repo: `nachbar-io`
Branch: `master`
Aktueller lokaler HEAD vor dieser Übergabe: `8d11ef3 docs(security): review care app risks`
Remote-Stand: `origin/master` ist noch bei `0e3da0b`; lokaler Branch ist durch den Security-Review-Commit ahead.

## Kontext

Thomas möchte die eigentlichen Fixes in einer neuen Session machen. Diese Übergabe ist nur Vorbereitung. Keine Code-Fixes wurden in diesem Block umgesetzt.

Es gibt einen Security-Review-Bericht:

- `docs/plans/2026-05-04-security-review-care-app.md`

Der Bericht wurde lokal committed:

- `8d11ef3 docs(security): review care app risks`

Wichtig: Dieser Commit wurde **nicht gepusht**, weil kein neues Push-Go vorlag. In der nächsten Session zuerst `git status --short --branch` und `git log --oneline -5` prüfen.

## Harte Sperren

- Keine Prod-Aktion.
- Kein Deploy.
- Keine Migration anwenden.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine lokalen Secret-Werte lesen oder ausgeben.
- Keine Echtdaten-KI.
- M4 Pflegekassen-PDF bleibt blockiert, bis M4.0 Pflegestützpunkt + M4.1 Bundle-Definition Founder-Hand erledigt sind.
- Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` nicht anfassen.

Bekannte untracked Dateien, die nicht zu diesem Fix-Block gehören:

- `.codex-welle-d-3001.pid`
- `docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md`
- `docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md`

## Findings, die in der nächsten Session zu fixen sind

### S-1 / P0: Care-Push sendet über Broadcast

Fundorte:

- `modules/care/services/channels/push.ts`
- `app/api/push/send/route.ts`
- `lib/services/push-notifications.service.ts`
- `modules/care/services/checkin.service.ts`

Problem:

`sendPush()` ruft `/api/push/send` auf. Dieser Endpunkt nutzt `broadcastPush()` und ignoriert `userId`. Care-Push kann dadurch sensible Care-Nachrichten an alle Push-Abonnenten schicken.

Empfohlener enger Fix:

1. Zuerst Guard-Test schreiben, der beweist, dass `sendPush()` nicht `/api/push/send` nutzt.
2. `modules/care/services/channels/push.ts` auf `/api/push/notify` umstellen oder direkt einen gezielten Push-Service nutzen.
3. Care-Push-Body datensparsam machen: keine Check-in-Notiz, keine Gesundheitsdetails, nur generischer Hinweis.
4. Regressionstest ergänzen: kein Broadcast bei Care-Push.

Wichtig:

`/api/push/send` kann als Broadcast-Endpunkt bestehen bleiben, aber Care darf ihn nicht nutzen.

### S-2 / P1: Kiosk-Notfalldaten akzeptieren fremde `userId`

Fundort:

- `app/api/care/emergency-profile/kiosk/route.ts`

Problem:

Nach Device-Token-Prüfung wird `url.searchParams.get("userId") || deviceUserId` verwendet. Bei Service-Role-Routen darf Request-`userId` nicht die serverseitige Device-Bindung übersteuern.

Empfohlener enger Fix:

1. Guard-Test: Gerät ist `resident-1` zugeordnet, Request fragt `resident-2` ab → `403`.
2. Wenn `deviceUserId` vorhanden ist, ausschließlich `deviceUserId` verwenden.
3. Wenn Request-`userId` weiterhin aus Kompatibilitätsgründen erlaubt bleibt, nur wenn `userId === deviceUserId`.
4. ENV-Fallback für sensible Notfalldaten nicht frei auf beliebige `userId` erlauben. Entweder blockieren oder an `KIOSK_DEVICE_USER_ID` binden.

### S-3 / P1: SOS-Device akzeptiert `body.userId`

Fundort:

- `app/api/escalation/sos/route.ts`

Problem:

Nach Device-Token-Prüfung wird `bodyUserId || deviceUserId` verwendet. Dadurch kann ein gültiges Device-Token SOS-Events und Caregiver-Lookups für fremde Bewohner auslösen.

Empfohlener enger Fix:

1. Guard-Test: Gerät ist `resident-1`, Body enthält `resident-2` → `403`.
2. Bei vorhandenem `deviceUserId` ausschließlich diese ID verwenden.
3. ENV-Fallback ohne gebundene User-ID darf kein fremdes SOS für beliebige Bewohner auslösen.
4. Tests aus `__tests__/api/sos-events.test.ts` und `__tests__/integration/speed-dial-sos.test.ts` anpassen.

### S-4: Pair-Code Rate-Limit härten

Fundort:

- `app/api/device/pair/claim-by-code/route.ts`

Problem:

Rate-Limit-Key ist `ip + device_id`. Da `device_id` frei wählbar ist, kann ein Angreifer sie pro Versuch ändern.

Empfohlener späterer Fix nach S-1 bis S-3:

1. Guard-Test: gleiche IP, wechselnde `device_id`, sechster Fehlversuch trotzdem `429`.
2. Redis-Key mindestens auf IP begrenzen; optional zusätzlich Code-Fail-Key.
3. Code-Verbrauch atomar machen (`GETDEL` oder äquivalente Redis-Transaktion), bevor ein Refresh-Token ausgegeben wird.

### S-5: E2E-Test-Login hart blocken

Fundort:

- `app/api/test/login/route.ts`

Problem:

Route ist sicher, solange `E2E_TEST_SECRET` nicht in Production/Preview gesetzt ist. Besser: Code-seitig hart blockieren.

Empfohlener späterer Fix:

1. In Production/Preview immer `404`, unabhängig von Env.
2. GET-Passwort-Login nur lokal erlauben oder entfernen.
3. `next` nur relative Pfade erlauben.

### S-6: Dependency-Audit

`npm audit --omit=dev --audit-level=high` meldete:

- `next`: High, Server-Components-DoS Advisory.
- `@xmldom/xmldom`: High, XML-DoS/XML-Injection.
- weitere Moderate Findings.

Empfehlung:

Separater Dependency-Block, nicht mit Care-Fixes vermischen. Kein `npm audit fix --force` ohne Plan.

## Empfohlene Reihenfolge für nächste Session

1. Pre-Check:
   - `rg -n "/api/push/send|/api/push/notify|broadcastPush|notifyUser|sendPush|sendCareNotification" modules app lib __tests__`
   - `rg -n "KIOSK_DEVICE_TOKEN|deviceUserId|bodyUserId|userId =|emergency-profile/kiosk|escalation/sos" app __tests__ modules lib`
2. S-1 als erstes fixen, weil es P0-Datenabfluss ist.
3. Danach S-2 und S-3 zusammen oder nacheinander, aber mit eigenen Guard-Tests.
4. Erst danach Pair-Code, Test-Login und Dependencies.

## Test-Hinweise

Mindestens für S-1 bis S-3:

- passende Vitest-Dateien direkt laufen lassen.
- Danach `npm run lint`.
- Danach `npx tsc --noEmit`.

Wenn Dependencies oder Next-Versionen geändert werden:

- `npm run test`
- `npm run build`
- möglichst keine Prod-/Cloud-/Vercel-Aktion.

## Abschlussstatus dieser Übergabe

Diese Übergabe ist reine Doku. Kein Code-Fix, keine Tests außer vorherigem Security-Review/Audit, kein Push.
