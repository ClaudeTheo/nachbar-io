# Codex -> Claude: QA nach Cron-/Info-Hub-/Security-Fixes

Datum: 2026-05-10
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Pruefmodus: lokal/read-only, kein Push, kein Deploy, kein Prod-DB-Write, keine Vercel-Env-/Secrets-/Billing-Aktion.

## Kontext

Thomas bat Codex, Claudes neuesten Stand zu pruefen, die App auf Fehler zu testen und einen Bericht fuer Claude zu schreiben.

Aktueller Git-Stand bei Pruefbeginn:

```text
## master...origin/master
HEAD = 45bd0df fix(pollen): default region 112 -> 113 (Bad Saeckingen liegt im Schwarzwald, nicht Hohenlohe)
```

`master` war mit `origin/master` synchron. Es lagen weiterhin untracked Alt-/Handoff-Dateien vor. Neu auffaellig waren ausserdem:

```text
scripts/manual-cron-trigger-2026-05-10.ts
scripts/reprocess-amtsblatt-issue-0015.ts
```

Diese Dateien wurden nicht angefasst und nicht klassifiziert.

## Was Claude seit dem Cron-Outage-Fix gemacht hat

Gepruefte neue Commits oberhalb `e395e52`:

1. `ff88106 feat(security): founder bypass for risk-scorer (self-lockout fix)`
   - Neuer Founder-Bypass fuer Risk-Scorer/Trap-Middleware.
   - Liest Founder-User-ID aus Supabase-Auth-Cookie ohne Signaturpruefung.
   - Wichtig: Bypass spart nur Risk-Score-Block, ersetzt keine echte Auth in Routes.

2. `4051e3a fix(news-scraper): boilerplate filter + stricter title length`
   - News-Scraper filtert Navigations-/Boilerplate-Titel strenger.
   - Verhindert, dass Begriffe wie `Navigation`, `Suche`, `Aktuelles`, `Menue` als News eingetragen werden.

3. `88f7c52 fix(info-hub): schema drift in quartier-info-sync (lat/lon -> center_lat/center_lng, active -> status)`
   - Quartier-Info-Sync nutzt jetzt reale `quarters`-Spalten:
     `center_lat`, `center_lng`, `status = active`.
   - Vorheriger Drift haette aktive Quartiere bzw. Koordinaten falsch lesen koennen.

4. `45bd0df fix(pollen): default region 112 -> 113`
   - DWD-Pollen-Default ist jetzt Region `113`.
   - Begruendung im Code: Bad Saeckingen/Hochrhein gehoert zum Schwarzwald/Mittelgebirge, nicht zur Hohenlohe-Region `112`.

## Frische lokale Verifikation

### Gezielte neue/angrenzende Tests

```text
npx vitest run lib/security/founder-bypass.test.ts __tests__/lib/security/security-middleware.test.ts lib/services/news-scraper-filter.test.ts __tests__/lib/closed-pilot.test.ts lib/care/with-cron-heartbeat.test.ts lib/care/cron-heartbeat.test.ts modules/care/services/cron-heartbeat.test.ts

Test Files  7 passed (7)
Tests       110 passed (110)
Exit        0
```

### Info-Hub / Quartier-Info / News-Filter

```text
npx vitest run __tests__/lib/quartier-info.service.test.ts __tests__/api/quartier-info-route.test.ts __tests__/modules/info-hub/normalize-response.test.ts lib/services/news-scraper-filter.test.ts

Test Files  4 passed (4)
Tests       46 passed (46)
Exit        0
```

### TypeScript

```text
npx tsc --noEmit
Exit 0
```

### ESLint

```text
npm run lint
Exit 0
```

## Build-/Browser-Blocker

`npm run build` wurde frisch gestartet, brach aber sehr frueh mit lokalem Runtime-/Speicherfehler ab:

```text
Could not determine Node.js install directory
[low_level_alloc.cc : 554] RAW: Check new_pages != nullptr failed: VirtualAlloc failed
Exit 1
```

Direkt danach zeigte ein einfacher PowerShell-Webrequest zusaetzlich:

```text
System.OutOfMemoryException
```

`localhost:3001` war nicht erreichbar:

```text
Es konnte keine Verbindung hergestellt werden, da der Zielcomputer die Verbindung verweigerte. (localhost:3001)
```

Es liefen sehr viele `node.exe`-Prozesse. Codex hat keine fremden Prozesse beendet. Deshalb wurde kein lokaler Browser-Smoke behauptet.

Einschaetzung: Der Build-Fehler ist aktuell nicht als App-Code-Fehler nachgewiesen, sondern als lokaler Ressourcen-/Runtime-Blocker. Trotzdem bleibt `npm run build` fuer diesen QA-Lauf formal **nicht bestanden**, weil kein erfolgreicher Build-Nachweis vorliegt.

## Befunde

### P1: Lokaler Build nicht verifiziert

Der breite Build konnte wegen `VirtualAlloc failed` nicht abgeschlossen werden. Vor Merge-/Deploy-Vertrauen sollte Claude/naechste Session den Build in einer sauberen Umgebung erneut laufen lassen, idealerweise nach Schliessen alter Node-Prozesse oder in CI.

Empfohlener Nachtest:

```bash
npm run build
```

Wenn lokal weiterhin RAM/Node-Prozessdruck besteht: CI-Run als Build-Nachweis heranziehen und lokalen Zustand bereinigen.

### P2: Browser-/Rendered-Smoke nicht verifiziert

Wegen nicht erreichbarem lokalem Server und Speicherproblemen wurde kein in-app Browser-Smoke fuer Admin-Dashboard, OnboardingManager, AmtsblattReprocess oder Quartier-Info behauptet.

Empfohlener Nachtest:

1. sauberen lokalen Server starten (`npm run dev` oder `npm run start:local`, passend zur Supabase-Zielumgebung),
2. `/` und `/login` im Closed-Pilot pruefen,
3. Admin-Dashboard mit `OnboardingManager`, `OepnvStopsManager`, `AmtsblattReprocess` pruefen,
4. Browser-Konsole auf Fehler pruefen.

### P3: Untracked Scripts klaeren

Neue untracked Scripts:

```text
scripts/manual-cron-trigger-2026-05-10.ts
scripts/reprocess-amtsblatt-issue-0015.ts
```

Nicht anfassen, bis Owner/Absicht klar ist. Da beide nach Live-/Cron-/Reprocess-Aktionen klingen, besonders auf Founder-Go-Gates achten.

## Kurzfazit

Die gezielten Tests fuer Claudes neueste Fixes sind lokal gruen:

- Founder-Bypass / Security-Middleware
- News-Scraper-Boilerplate-Filter
- Closed-Pilot-Cron-Whitelist / Cron-Heartbeat-Wrapper
- Quartier-Info angrenzende Tests

TypeScript und ESLint sind ebenfalls gruen.

Nicht gruen/ungeklaert:

- `npm run build` konnte wegen lokalem `VirtualAlloc failed` nicht verifiziert werden.
- Kein lokaler Browser-Smoke, weil kein erreichbarer lokaler Server und lokale OOM-Symptome.

Naechster sinnvoller Schritt fuer Claude: Build in sauberer Umgebung erneut laufen lassen, dann Browser-Smoke fuer Admin-/Info-Hub-Flows. Erst danach den Stand als vollstaendig QA-geprueft betrachten.
