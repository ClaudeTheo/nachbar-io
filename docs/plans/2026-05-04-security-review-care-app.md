# Security Review: Nachbar.io Care/App

Stand: 2026-05-04
Scope: fokussierter Code-Review von `nachbar-io` mit Schwerpunkt Care/CareCircle, Kiosk/Senior-App, Push, Auth, Secrets, RLS-nahe App-Logik und Dependency-Audit.

Keine Prod-Aktion, kein Deploy, keine Migration, keine Vercel-Env-/Provider-/Kostenaktion, kein Lesen oder Ausgeben lokaler Secret-Werte.

## Executive Summary

Die Basis ist besser als bei vielen frühen App-Projekten: CSP und Security-Header sind vorhanden, `.env*` ist ignoriert, Supabase-RLS ist für zentrale Tabellen sichtbar dokumentiert, sensible Care-Felder werden serverseitig verschlüsselt, und viele API-Routen prüfen `auth.getUser()` oder interne Secrets.

Es gibt aber drei priorisierte Sicherheitsrisiken, die vor einem echten Pilotbetrieb geschlossen werden sollten:

1. **Critical:** Care-Push nutzt den Broadcast-Endpunkt und kann sensible Care-Nachrichten an alle Push-Abonnenten senden.
2. **High:** Kiosk-/SOS-Endpunkte akzeptieren eine vom Request gelieferte `userId` nach Device-Token-Prüfung und umgehen dabei RLS per Service-Role.
3. **High/Medium:** Der 6-stellige Pairing-Code hat ein Rate-Limit, das über frei wählbare `device_id` abgeschwächt werden kann.

Zusätzlich gibt es einen test-only Login-Endpunkt, der hart auf Nicht-Prod begrenzt werden sollte, und `npm audit` meldet zwei High-Advisories.

## Geprüfte Sicherheitsgrundlagen

### Positiv sichtbar

- `next.config.ts:59-115` setzt globale Security-Header inklusive CSP, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy und HSTS.
- `next.config.ts:118-132` lädt Sentry-Source-Maps hoch und löscht sie danach.
- `git ls-files '.env*'` zeigt nur `.env.example` und `.env.local.example`; lokale `.env*.local` und `.env.vercel-token` sind ignoriert.
- Die Suche nach offensichtlichen Browser-Sinks fand keine Treffer für `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval`, `new Function` oder `postMessage`.
- `modules/care/services/crypto.ts:26-40` nutzt AES-256-GCM mit zufälligem IV.
- `modules/care/services/checkin.service.ts:94-105` verschlüsselt Check-in-Notizen vor dem Speichern.
- `supabase/migrations/076_security_rls_hardening.sql:10-12` beschränkt Notification-Inserts auf eigene User-IDs.
- `supabase/migrations/172_device_refresh_tokens.sql:35-60` aktiviert RLS für Device-Refresh-Tokens.
- `supabase/migrations/186_carecircle_rls_bridge.sql:16-100` erweitert Care-RLS-Helferfunktionen auf aktive `caregiver_links`.

## Findings

### S-1: Critical — Care-Push kann als Broadcast an alle Abonnenten rausgehen

**Rule ID:** NEXT-AUTHZ-001 / CARE-PRIVACY-001
**Severity:** Critical
**Location:** `modules/care/services/channels/push.ts:36-48`, `app/api/push/send/route.ts:34-41`, `lib/services/push-notifications.service.ts:179-206`, `modules/care/services/checkin.service.ts:207-215`

**Evidence:**

```ts
// modules/care/services/channels/push.ts
const response = await fetch(`${baseUrl}/api/push/send`, {
  body: JSON.stringify({
    userId: payload.userId,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
  }),
});
```

```ts
// app/api/push/send/route.ts
const result = await broadcastPush(supabase, {
  title: body.title,
  body: body.body,
  url: body.url,
  tag: body.tag,
  urgent: body.urgent,
  excludeUserId: body.excludeUserId,
});
```

```ts
// lib/services/push-notifications.service.ts
const query = supabase
  .from("push_subscriptions")
  .select("id, user_id, endpoint, p256dh, auth")
  .limit(5000);
```

Care-Check-in kann zusätzlich die sensible Notiz in die Push-/In-App-Message übernehmen:

```ts
body: `Ihr Angehöriger hat gemeldet, dass er sich nicht wohl fühlt.${note ? ` Hinweis: ${note}` : ""}`,
channels: ["push", "in_app"],
```

**Impact:** Eine eigentlich zielgerichtete Care-Benachrichtigung kann über `/api/push/send` als Broadcast an alle Push-Subscriptions gehen. Wenn `body` Care-Details enthält, entsteht ein Datenschutzvorfall: Gesundheits-/Befindlichkeitsinformationen oder Hinweise könnten an unbeteiligte Nutzer gesendet werden.

**Fix:** `modules/care/services/channels/push.ts` muss `/api/push/notify` nutzen oder `notifyUser()` direkt serverseitig verwenden. Zusätzlich Guard-Test: Care-Push mit `userId=relative-1` darf nur `notifyUser`/`/api/push/notify` ansprechen und niemals `broadcastPush`/`/api/push/send`.

**Mitigation:** Push-Bodies für Care generell redigieren: auf Lockscreen/Push nur generische Texte, Details ausschließlich nach App-Login/In-App-Ansicht. In-App-Notification-Body für Care prüfen, ob Verschlüsselung oder Minimaltext nötig ist.

**False Positive Notes:** Wenn `/api/push/send` absichtlich Broadcast ist, ist der Fehler im Care-Kanal eindeutig: Der Kanal nennt `userId`, der Zielendpunkt ignoriert ihn.

### S-2: High — Kiosk-/SOS-Device-Token kann auf fremde `userId` gelenkt werden

**Rule ID:** NEXT-AUTHZ-002 / CARE-RLS-BYPASS-001
**Severity:** High
**Location:** `app/api/care/emergency-profile/kiosk/route.ts:16-47`, `app/api/care/emergency-profile/kiosk/route.ts:86-101`, `app/api/escalation/sos/route.ts:14-45`, `app/api/escalation/sos/route.ts:107-172`

**Evidence:**

```ts
// app/api/care/emergency-profile/kiosk/route.ts
const { valid, userId: deviceUserId } = await verifyDevice(...);
const userId = url.searchParams.get("userId") || deviceUserId;
...
.from("emergency_profiles")
.select("*")
.eq("user_id", userId)
```

```ts
// app/api/escalation/sos/route.ts
const { valid, userId: deviceUserId } = await verifyDevice(...);
const userId = bodyUserId || deviceUserId;
...
.from("caregiver_links")
.select("caregiver_id")
.eq("resident_id", userId || "")
```

Zusätzlich erlaubt der ENV-Fallback ein gültiges Token ohne Nutzerbindung:

```ts
const envToken = process.env.KIOSK_DEVICE_TOKEN;
if (envToken && deviceToken === envToken) {
  return { valid: true };
}
```

**Impact:** Wer ein gültiges Kiosk-Token besitzt, kann per Query/Body eine andere `userId` wählen. Da die Endpunkte Service-Role nutzen, greift Supabase-RLS hier nicht als Schutz. Beim Notfallprofil können Level-1-Notfalldaten fremder Bewohner offengelegt werden; beim SOS-Pfad können Ereignisse und Caregiver-Benachrichtigungen für fremde Bewohner ausgelöst werden.

**Fix:** Nach erfolgreichem Device-Lookup darf ausschließlich die serverseitig gemappte `deviceUserId` verwendet werden. Eine Request-`userId` darf höchstens akzeptiert werden, wenn sie exakt mit `deviceUserId` übereinstimmt. Der ENV-Fallback sollte für produktionsnahe Kiosk-/Notfalldaten entweder deaktiviert oder an eine eigene `KIOSK_DEVICE_USER_ID` gebunden werden.

**Mitigation:** Guard-Tests ergänzen:

- gemapptes Gerät `resident-1` + Request `userId=resident-2` -> `403`.
- ENV-Fallback ohne gebundene User-ID -> kein Notfallprofil und kein SOS für beliebige `userId`.
- SOS ignoriert `body.userId`, wenn Device-Mapping vorhanden ist.

**False Positive Notes:** Die vorhandenen Tests nutzen `userId` im Request als Happy Path. Das wirkt wie ein bewusstes Pilot-Shortcut-Design, ist aber für Service-Role-Endpunkte zu breit.

### S-3: High/Medium — Pair-Code Rate-Limit kann über frei wählbare `device_id` abgeschwächt werden

**Rule ID:** NEXT-RATELIMIT-001 / DEVICE-PAIRING-001
**Severity:** High für produktive Senior-App-Pairings, sonst Medium
**Location:** `app/api/device/pair/claim-by-code/route.ts:27-31`, `app/api/device/pair/claim-by-code/route.ts:80-99`, `lib/device-pairing/pair-code.ts:7-17`

**Evidence:**

```ts
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

function rateLimitKey(ip: string, device_id: string): string {
  return `pair-code-rl:${ip}:${device_id}`;
}
```

```ts
const device_id = typeof body.device_id === "string" ? body.device_id : null;
const rlKey = rateLimitKey(ip, device_id);
const attempts = await redis.incr(rlKey);
```

Der Code ist sechs Stellen und 10 Minuten gültig:

```ts
export const PAIR_CODE_REDIS_TTL_SECONDS = 600;
return n.toString().padStart(6, "0");
```

**Impact:** Ein Angreifer kann `device_id` pro Versuch ändern und dadurch das Redis-Limit `5/IP+device_id/Stunde` umgehen. Das globale Proxy-Limit reduziert die Geschwindigkeit, ist aber in-memory und nicht so stark wie ein zentraler Redis-Lock pro IP/Code. Bei Treffer erhält der Angreifer ein langfristiges Refresh-Token für das Senior-Gerät.

**Fix:** Rate-Limit-Key nicht von frei wählbarer `device_id` abhängig machen. Mindestens `pair-code-rl:${ip}` plus separates `pair-code-fail:${code}` verwenden. Zusätzlich nach erfolgreichem Redis-Lookup atomar konsumieren (`GETDEL` oder Lua/Transaktion), bevor ein Refresh-Token ausgegeben wird.

**Mitigation:** Pair-Codes kürzer gültig machen oder auf 8 alphanumerische Zeichen erhöhen, Fehlversuche auditieren, und bei mehreren Fehlversuchen pro IP/UA/Code-Familie sperren.

**False Positive Notes:** `/api/device/*` hat laut `lib/rate-limit.ts:66-72` zusätzlich 30/min, aber der spezifische 5/h-Schutz ist nicht wirksam, wenn `device_id` variiert.

### S-4: Medium — E2E-Test-Login sollte in Produktion hart blockiert sein

**Rule ID:** NEXT-AUTH-TEST-001
**Severity:** Medium, High falls `E2E_TEST_SECRET` versehentlich in Production/Preview gesetzt ist
**Location:** `app/api/test/login/route.ts:10-18`, `app/api/test/login/route.ts:21-42`, `lib/supabase/middleware.ts:35-43`

**Evidence:**

```ts
const testSecret = process.env.E2E_TEST_SECRET;
if (!testSecret) return NextResponse.json({ error: "Not available" }, { status: 404 });
if (secret !== testSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

```ts
// GET /api/test/login?email=...&password=...&secret=...&next=/dashboard
const email = searchParams.get("email") || "";
const password = searchParams.get("password") || "";
const secret = searchParams.get("secret") || "";
const next = searchParams.get("next") || "/dashboard";
const redirectUrl = new URL(next, baseUrl);
```

**Impact:** Wenn `E2E_TEST_SECRET` versehentlich in Production/Preview gesetzt wird, existiert ein Login-Hilfsendpunkt, der Credentials und Secret in Query-Parametern akzeptiert. Diese können in Browser-History, Proxy-Logs oder Monitoring auftauchen. `next` kann zudem absolute URLs akzeptieren, was nach erfolgreichem Login als Open-Redirect missbraucht werden kann.

**Fix:** Route hart blockieren, wenn `NODE_ENV === "production"` oder `NEXT_PUBLIC_VERCEL_ENV` `production`/`preview` ist. GET-Login mit Passwort entfernen oder nur lokal erlauben. `next` auf relative Pfade begrenzen (`next.startsWith("/") && !next.startsWith("//")`).

**Mitigation:** Bestehendes Hard-Gate beibehalten: `E2E_TEST_SECRET` und `SECURITY_E2E_BYPASS` dürfen nie in Production/Preview gesetzt sein. Das sollte aber zusätzlich im Code erzwungen werden.

**False Positive Notes:** Projekt-Dokus nennen bereits, dass diese Env-Werte aus Production entfernt wurden. Der Code bleibt trotzdem besser secure-by-default.

### S-5: High — Dependency-Audit meldet bekannte High-Advisories

**Rule ID:** NEXT-SUPPLY-001
**Severity:** High
**Location:** `package.json:77`, `package-lock.json:14279`, `package.json:71`

**Evidence:** `npm audit --omit=dev --audit-level=high` meldet:

- `next` in Range `9.3.4-canary.0 - 16.3.0-canary.5`: High, Denial of Service mit Server Components.
- `@xmldom/xmldom <=0.8.12`: High, XML-DoS/XML-Injection, transitive Dependency.
- Weitere Moderate Findings: `axios`, `dompurify`, `fast-xml-parser`, `follow-redirects`, `hono`, `postcss`, `uuid`, `@anthropic-ai/sdk`.

**Impact:** Bekannte Supply-Chain-Schwachstellen können Denial-of-Service oder Parser-/XSS-/SSRF-Klassen ermöglichen, abhängig davon, ob die betroffenen Pfade erreichbar sind.

**Fix:** Separater Dependency-Fix-Block mit Lockfile-Update und Tests. Zuerst nicht-breaking `npm audit fix` prüfen; Next.js gezielt auf eine gepatchte Version heben, sobald verfügbar/kompatibel. Breaking Updates (`@anthropic-ai/sdk@0.92.0`, `exceljs@3.4.0`) nur geplant und getestet.

**Mitigation:** Bis dahin Angriffsflächen für XML/PDF/HTML-Parsing nicht öffentlich mit großen Payloads betreiben, Payload-Limits prüfen, und Dependency-Audit als CI-Gate mindestens für Critical/High etablieren.

**False Positive Notes:** `npm audit --audit-level=critical` lief ohne Critical-Exit; es geht hier um High/Moderate.

## Empfohlener Fix-Plan

### Block 1: Care-Push-Datenabfluss schließen

1. Guard-Test schreiben: `sendCareNotification(... channels: ["push"])` ruft den gezielten Push-Pfad auf.
2. `modules/care/services/channels/push.ts` von `/api/push/send` auf `/api/push/notify` umstellen oder direkt `notifyUser()` nutzen.
3. Push-Body für Care redigieren; Details nur in App nach Auth.
4. Tests: Notification-Tests plus ein spezifischer Regressionstest, dass `broadcastPush` nicht erreicht wird.

### Block 2: Kiosk/SOS-Userbindung härten

1. Guard-Tests für fremde `userId` schreiben.
2. `verifyDevice()` als gemeinsame Helper-Logik extrahieren oder beide Routen minimal gleich härten.
3. Request-`userId` entfernen oder nur als Match gegen `deviceUserId` akzeptieren.
4. ENV-Fallback an feste User-ID binden oder für sensible Endpunkte deaktivieren.

### Block 3: Pair-Code Rate-Limit härten

1. Tests für wechselnde `device_id` bei gleicher IP schreiben.
2. Redis-Limit auf IP und optional Code legen, nicht auf frei wählbare Device-ID.
3. Redis-Code atomar konsumieren.

### Block 4: E2E-Test-Login und Dependencies

1. Test-Login in Production/Preview hart blockieren.
2. `next`/`@xmldom/xmldom`/Parser-Dependencies geplant aktualisieren.
3. `npm run test`, `npm run lint`, `npx tsc --noEmit` nach Fix-Blöcken.

## Verifikation in diesem Review

- `rg` auf DOM-XSS-/Code-Execution-Sinks: keine Treffer.
- `git ls-files '.env*'`: nur Beispiel-Dateien getrackt.
- `git check-ignore` bestätigt lokale `.env*.local` und `.env.vercel-token` als ignoriert.
- `npm audit --omit=dev --audit-level=high`: 15 Findings, davon 2 High.
- `npm audit --audit-level=critical`: keine Critical-Exit-Bedingung.

## Nicht durchgeführt

- Keine Prod-/Preview-Env-Prüfung in Vercel.
- Keine Supabase-Prod-Abfragen.
- Keine Migration angewendet.
- Kein Deploy.
- Keine Secret-Werte gelesen oder ausgegeben.
- Keine automatische Dependency-Aktualisierung.
