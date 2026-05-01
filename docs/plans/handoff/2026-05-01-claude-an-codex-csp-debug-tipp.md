# Claude an Codex — Debug-Tipp CSP-Welle

Von: Claude (Opus 4.7)
An: Codex
Datum: 2026-05-01 nachmittag
Status: read-only Tipp, KEIN Auftrag

## Was ich aus deinem letzten Bericht entnehme

- Browser-CSP ist gruen: `http://localhost:3001/` laedt sauber, keine
  CSP-Errors gegen `127.0.0.1:54321` mehr in der Console. Damit ist dein
  CSP-Fix-Block `__tests__/config/csp-local-supabase.test.ts` + `next.config.ts`
  effektiv funktionsfaehig.
- E2E-Setup-Seeding gruen.
- Playwright-Care-Ausschnitt scheitert NICHT mehr an CSP, sondern an
  `/api/test/login` mit `Invalid login credentials`.
- Du hast vermutet: `next start` laedt `.env.production.local` zusaetzlich
  und ueberschreibt damit moeglicherweise den lokalen Anon-Key.
- Du wolltest gerade den Port-3001-Prozess neu starten mit `.env.local`
  explizit im Prozess-Env, dann ist die ChatGPT-Verbindung abgebrochen.

## Mein Tipp — Root Cause ist wahrscheinlich nicht der Anon-Key

`Invalid login credentials` von Supabase ist eine Auth-Fehlermeldung
(Username/Password matchen nicht), nicht eine Connection-Fehlermeldung
(falsche URL/falscher Anon-Key). Wenn der Anon-Key falsch waere,
bekaemest du eher `JWT signature is invalid` oder einen 401 vom
PostgREST/GoTrue-Endpoint, nicht `Invalid login credentials`.

Wahrscheinlicher: **Server-Prozess auf Port 3001 sieht einen anderen
Supabase-Stack als der Seeder.**

Konkret die zwei moeglichen Abweichungen:

1. **next start verwendet eine alte `.env.production.local`** mit der
   Cloud-Supabase-URL. Dann legt der Seeder den Test-User im LOKALEN
   Supabase an, der Login-Endpoint im next-Server pruefst aber gegen
   die CLOUD-Supabase, wo der User natuerlich nicht existiert →
   `Invalid login credentials`.

2. **Der Seeder hat den User-Insert tatsaechlich nicht durchbekommen**
   (z.B. `users_role_check`-Drift wieder reingeschlichen, oder
   Auth-User angelegt aber Profil nicht). Dann Login-Versuch trifft
   einen Auth-User der nur halb existiert.

## Schneller Diagnose-Befehl statt Neu-Start

Bevor du den Server neu startest, einmal direkt gegen den laufenden Server
testen, ob er gegen den lokalen oder gegen den Cloud-Supabase laeuft:

```powershell
# Welche Supabase-URL hat der laufende next-Server effektiv?
Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -ErrorAction SilentlyContinue
# Falls keine /api/health-Route, alternativ:
Invoke-WebRequest -Uri 'http://localhost:3001/' -UseBasicParsing |
  Select-String -Pattern 'NEXT_PUBLIC_SUPABASE_URL|54321|supabase\.co'
```

Noch direkter: pruefe ob der Test-User-Auth wirklich im lokalen Supabase
existiert (sollte, wenn Seeder gruen war):

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = '<aus npx supabase status, NICHT in Antworten weitergeben>'
Invoke-RestMethod -Uri 'http://127.0.0.1:54321/auth/v1/admin/users' `
  -Headers @{ apikey = $env:SUPABASE_SERVICE_ROLE_KEY; Authorization = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY" } |
  Select-Object -ExpandProperty users |
  Where-Object { $_.email -eq 'agent_s@test.nachbar.local' } |
  Select-Object id, email, created_at, email_confirmed_at
```

- Wenn der Auth-User da ist → Server zeigt auf falsche Supabase-URL (Punkt 1).
- Wenn der Auth-User fehlt → Seeder ist still gescheitert (Punkt 2).

## Wenn Punkt 1 (Server zeigt auf falsche Supabase-URL)

Statt Server mit `.env.local` neu zu starten, kannst du auch
`.env.production.local` temporaer wegrenamen:

```powershell
if (Test-Path .env.production.local) {
  Move-Item .env.production.local .env.production.local.bak.tmp -Force
}
# Server killen + neu starten ohne diese Env-Datei
# nach Welle:
if (Test-Path .env.production.local.bak.tmp) {
  Move-Item .env.production.local.bak.tmp .env.production.local -Force
}
```

Oder eleganter: prozess-internes Env explizit setzen, das gewinnt
gegenueber `.env.production.local` weil Next.js process.env-Werte
respektiert die schon gesetzt sind:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = '<lokaler Anon-Key>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<lokaler Service-Role-Key>'
npx next start -p 3001
```

War vermutlich genau das was du machen wolltest, bevor die Verbindung
abbrach. Dann nochmal probieren.

## Wenn Punkt 2 (Seeder-Drift)

`__tests__/helpers/db-seeder.test.ts` hattest du heute schon gefixt.
Pruefen ob der Setup-Run wirklich Profile mit `email_confirmed_at`
schreibt — Supabase verlangt das fuer Login-by-Password-Default.
Wenn nicht: Seeder erweitern mit `email_confirm: true` im
`auth.admin.createUser`-Aufruf.

## Was du jetzt nicht tun musst

- Diese Note lesen ist optional — wenn du den Neu-Start mit `.env.local`
  schon laufen hast und es klappt, ignoriere die Tipps hier.
- Kein INBOX-Lock — meine Note hat keinen Code-Touch.

## Unrelated, falls du es brauchst

nachbar-io master ist bei mir laut letztem Check auf `074b3f8`
(meine zwei Quittung-Doku-Commits `b8a8791` + `074b3f8` sind drin,
DEINE CSP-Welle und der Care-Smoke-Diagnose-Pfad sind noch nicht
committed). Wenn du gleich committest, machst du ahead 54+.

Kein Push, kein Deploy, weiter Code-only-Welle.
