# Codex → Codex Übergabe: Security-Fixes S-1 bis S-5 erledigt

Stand: 2026-05-03 spätabend  
Repo: `nachbar-io`  
Branch: `master`  
Lokaler HEAD vor dieser Übergabe: `eefcf60 fix(security): block test login outside local envs`  
Remote-Status vor dieser Übergabe: `master...origin/master [ahead 8]`

## Kurzstatus

Thomas wollte nach den Security-Fixes eine frische Session mit neuen Tokens. Diese Datei ist die Übergabe für die nächste Session.

Die Security-Fixes aus `docs/plans/handoff/2026-05-04-codex-an-codex-security-fixes-handover.md` sind lokal bis einschließlich S-5 erledigt:

1. S-1 / P0 Care-Push-Broadcast geschlossen.
2. S-2 / P1 Kiosk-`userId`-Override geschlossen.
3. S-3 / P1 SOS-`body.userId`-Override geschlossen.
4. S-4 Pair-Code Rate-Limit gegen wechselnde `device_id` gehärtet.
5. S-5 E2E-Test-Login in Production/Preview hart blockiert.

Keine Prod-Aktion, kein Deploy, keine Migration, keine Vercel-Env-/Provider-/Kostenaktion, keine Echtdaten-KI.

## Lokale Commits seit Security-Review

Relevante jüngste Commits:

- `eefcf60 fix(security): block test login outside local envs`
- `5f5224f chore(security): claim test login hardening`
- `6f9029c fix(security): rate limit pair codes by ip`
- `54d12b1 chore(security): claim pair code rate limit fix`
- `bc887e1 fix(security): restrict care push and device user binding`
- `911c2e8 chore(security): claim care security fixes`
- `d728fa0 docs(security): hand over care app fixes`
- `8d11ef3 docs(security): review care app risks`

## Was geändert wurde

### S-1 Care-Push-Broadcast

Dateien:

- `modules/care/services/channels/push.ts`
- `modules/care/services/checkin.service.ts`
- `__tests__/lib/care/channels/push.test.ts`
- `app/api/care/checkin/route.test.ts`

Ergebnis:

- Care-Push nutzt `/api/push/notify` statt `/api/push/send`.
- Check-in-Care-Push enthält keine Freitextnotiz mehr und keinen sensitiven Status-Titel wie "Nicht so gut".

Verifiziert:

- RED: Broadcast-/Freitext-Guards schlugen vorher fehl.
- GREEN: betroffene Vitest-Dateien grün.

### S-2 Kiosk-userId-Override

Dateien:

- `app/api/care/emergency-profile/kiosk/route.ts`
- `__tests__/api/emergency-profile-kiosk.test.ts`

Ergebnis:

- Bei serverseitiger Device-Bindung zählt nur die gebundene Bewohner-ID.
- Fremde `userId` im Request liefert `403`.
- ENV-Fallback braucht `KIOSK_DEVICE_USER_ID`, sonst keine freie `userId` aus dem Request.

### S-3 SOS-body.userId-Override

Dateien:

- `app/api/escalation/sos/route.ts`
- `__tests__/api/sos-events.test.ts`
- `__tests__/integration/speed-dial-sos.test.ts`

Ergebnis:

- Bei serverseitiger Device-Bindung zählt nur die gebundene Bewohner-ID.
- Fremde `body.userId` liefert `403`.
- ENV-Fallback braucht `KIOSK_DEVICE_USER_ID`, sonst kein SOS für beliebige Bewohner.

### S-4 Pair-Code Rate-Limit

Dateien:

- `app/api/device/pair/claim-by-code/route.ts`
- `__tests__/api/device/pair-claim-by-code.test.ts`

Ergebnis:

- Rate-Limit-Key ist jetzt IP-basiert statt `IP + device_id`.
- Guard-Test: gleiche IP mit wechselnder `device_id` bekommt beim sechsten Fehlversuch `429`.

Verifiziert:

- RED: vorher `[401, 401, 401, 401, 401, 401]`.
- GREEN: danach `8 passed`.

### S-5 E2E-Test-Login

Dateien:

- `app/api/test/login/route.ts`
- `lib/supabase/middleware.ts`
- `__tests__/api/test-login.test.ts`
- `__tests__/lib/supabase/middleware.test.ts`

Ergebnis:

- `/api/test/login` gibt in `NODE_ENV=production`, `VERCEL_ENV=production/preview` oder `NEXT_PUBLIC_VERCEL_ENV=production/preview` immer `404` zurück.
- `GET /api/test/login?...&next=...` akzeptiert nur relative Pfade; externe URLs fallen auf `/dashboard` zurück.
- Middleware lässt den Closed-Pilot-E2E-Bypass in Vercel Preview/Production nicht mehr durch.

Verifiziert:

- RED: 4 Guards schlugen vorher fehl.
- GREEN: `20 passed`.

## Verifikation in dieser Session

Ausgeführt und grün:

```bash
npx vitest run __tests__/lib/care/channels/push.test.ts app/api/care/checkin/route.test.ts __tests__/api/emergency-profile-kiosk.test.ts __tests__/api/sos-events.test.ts __tests__/integration/speed-dial-sos.test.ts
npx vitest run __tests__/api/device/pair-claim-by-code.test.ts
npx vitest run __tests__/api/test-login.test.ts __tests__/lib/supabase/middleware.test.ts
npm run lint
npx tsc --noEmit
```

Wichtig: `npm run lint` und `npx tsc --noEmit` wurden nach S-4 und nach S-5 frisch ausgeführt und waren grün.

## Git-/Workspace-Status

Vor dieser Übergabe:

- `nachbar-io`: `master...origin/master [ahead 8]`
- Parent-Workspace: `master...origin/master [ahead 3]`
- Bekannte alte untracked Dateien in `nachbar-io`, nicht anfassen:
  - `.codex-welle-d-3001.pid`
  - `docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md`
  - `docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md`
  - `docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md`
  - `docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md`
  - `docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md`

## Harte Sperren bleiben

- Kein Push ohne ausdrückliches Go in der neuen Session.
- Kein Deploy.
- Keine Prod-DB-Schreibaktion.
- Keine Migration anwenden.
- Keine Vercel-Env-/Provider-/Kostenaktion.
- Keine Secrets lesen oder ausgeben.
- Keine Echtdaten-KI.
- M4 Pflegekassen-PDF weiter nicht bauen.
- Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` nicht anfassen.

## Nächster sinnvoller Block

S-6 Dependency-Audit separat und vorsichtig:

1. `npm audit --omit=dev --audit-level=high` nur lesen.
2. Findings klassifizieren: Runtime-Risiko, transitive Abhängigkeit, dev/build-only.
3. Kein `npm audit fix --force`.
4. Keine neuen Dependencies, keine Provider/Kosten/Services.
5. Nur sichere Patch-/Minor-Updates umsetzen, wenn klar und klein.
6. Danach mindestens relevante Tests, `npm run lint`, `npx tsc --noEmit`; bei Dependency-Änderung wahrscheinlich auch `npm run build`.

Wenn das Audit ein Major-Upgrade oder breiten Lockfile-Umbau verlangt: stoppen, Ergebnis zusammenfassen und Thomas entscheiden lassen.

## Prompt für die nächste Session

Thomas kann in der neuen Session sagen:

> Lies AGENTS.md und `nachbar-io/docs/plans/handoff/2026-05-03-codex-new-session-handover-security-s1-s5.md`. Aktueller Stand: `nachbar-io` master ist lokal ahead mit Security-Fixes S-1 bis S-5 bis HEAD `eefcf60` plus dieser Handover-Datei. Bitte mache als nächsten engen Block S-6 Dependency-Audit: erst `npm audit --omit=dev --audit-level=high` nur lesen und Findings klassifizieren, kein `npm audit fix --force`, keine neuen Kosten/Provider/Services, keine Prod-Aktion, kein Deploy, keine Migration anwenden, keine Vercel-Env-Änderung, keine Secrets lesen. Alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid` nicht anfassen. Arbeite vorsichtig und verifiziere lokal.

