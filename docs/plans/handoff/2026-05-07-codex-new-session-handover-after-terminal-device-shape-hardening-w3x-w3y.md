# Codex New-Session-Handover nach Terminal-Device-Shape-Hardening W3x-W3y

Datum: 2026-05-07 abend

## Fuer die naechste Session zuerst ausfuehren/lesen

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\2026-05-07-terminal-reminder-array-guards-w3x.md
Get-Content -Raw docs\plans\2026-05-07-terminal-device-list-normalisierung-w3y.md
Get-Content -Raw docs\plans\2026-05-07-terminal-weather-forecast-guards-w3w.md
Get-Content -Raw docs\plans\2026-05-07-daily-brief-pollen-intensity-guard-w3v.md
Get-Content -Raw docs\plans\2026-05-07-info-hub-pollen-intensity-normalisierung-w3u.md
```

## Rote Gates

Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration,
keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung ohne explizites Founder-GO
von Thomas.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend. Zahlungen lokal
deaktiviert lassen.

Thomas will immer vollstaendige Pfade sehen, weil mehrere Projekte
gleichzeitig offen sind.

## Aktueller lokaler Stand

- Branch: `master`
- Nach diesem Handover-Commit ist `master` lokal voraussichtlich `ahead 82`
  gegen `origin/master`.
- Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing gemacht.
- Bekannte untracked Altdateien wurden nicht angefasst:
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\.codex-welle-d-3001.pid`
  - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-04-quartier-info-skalierung-auto-first.md`
  - mehrere alte `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-*` / `2026-05-04-*` Founder-/Claude-Handdateien

## Letzte neue Commits

Neue Commits dieser Session:

- `5b1fabe fix(terminal): normalize device list shapes`
- `c9d1147 docs(handoff): claim terminal device list guards`
- `9cf094e fix(terminal): guard reminder arrays`
- `12b0e0d docs(handoff): claim terminal reminder guards`
- `124fc69 docs(handoff): claim terminal shape hardening handover`
- Handover-Abschlusscommit folgt direkt nach dieser Datei.

Vorherige relevante Commits:

- `aed56e9 fix(terminal): guard weather forecast arrays`
- `2142d1e docs(handoff): claim terminal forecast guards`
- `a50e175 fix(voice): guard daily brief pollen intensities`
- `e01fea9 docs(handoff): claim daily brief pollen guard`
- `e09e679 fix(info): validate pollen intensity response shapes`
- `f836808 docs(handoff): claim pollen intensity normalization`

## Erledigt in W3x

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\ErinnerungenScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-reminder-array-guards-w3x.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `ErinnerungenScreen` behandelt kaputte `stickies`-/`appointments`-Werte aus
  `/api/device/reminders` wie leere Listen.
- RED war `TypeError: appointments.reduce is not a function`.
- GREEN: `Array.isArray(data.stickies)` und
  `Array.isArray(data.appointments)` direkt am Fetch-Adapter.

## Erledigt in W3y

Dateien:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\FamilienFotosScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\screens\VideochatScreen.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\ScreensaverOverlay.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\lib\terminal\useTerminalData.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\components\terminal\__tests__\TerminalDeviceListGuards.test.tsx`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-terminal-device-list-normalisierung-w3y.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

Verhalten:

- `useTerminalData` normalisiert `/api/device/status` zentral.
- Kaputte `weather.forecast`, `alerts`, `news` werden `[]`.
- Kaputte Zahlen-/Textfelder bekommen sichere Fallbacks.
- `FamilienFotosScreen`, `VideochatScreen`, `ScreensaverOverlay` guard-en
  separate Device-Endpunkt-Listen mit `Array.isArray`.
- REDs:
  - Hook reichte Objekt-`forecast`, Objekt-`alerts`, String-`news` weiter.
  - Familienfotos ging bei Objekt-`photos` in kaputten Foto-Modus.
  - Videochat crashte mit `contacts.map is not a function`.
  - Screensaver rendert array-like Nicht-Array-`photos` als Foto/Caption.

## Verifikation gruen

Zuletzt gruen gelaufen:

```powershell
npx vitest run components\terminal\__tests__\TerminalWeatherForecastGuards.test.tsx components\terminal\__tests__\TerminalReminderArrayGuards.test.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
npx eslint lib\terminal\useTerminalData.ts components\terminal\screens\FamilienFotosScreen.tsx components\terminal\screens\VideochatScreen.tsx components\terminal\ScreensaverOverlay.tsx __tests__\lib\terminal\useTerminalData.test.tsx components\terminal\__tests__\TerminalDeviceListGuards.test.tsx
git diff --check
npx tsc --noEmit
npm run build
```

Build war gruen. Die Ausgabe `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen
deaktiviert` ist erwartetes lokales Verhalten.

## Naechster sinnvoller Block

Thomas hat "weiter in groesseren Schritten" freigegeben. Trotzdem weiter
lokal, mit Pre-Check und TDD.

Empfohlen:

1. Weitere Terminal-Device-Status-Item-Shapes haerten:
   - `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\lib\terminal\useTerminalData.ts`
   - Kandidaten: einzelne `alerts`-, `news`-, `weather.forecast`-Items statt
     nur Array-vs-Nicht-Array.
   - Ziel: keine `undefined`-Titel, kaputte Icons, kaputte Dates oder kaputte
     Zaehlwerte in Terminal-UI.
2. Danach `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\app\terminal\[token]\page.tsx`
   pruefen, ob alle Count-/Length-/Subtitle-Annahmen durch zentrale
   Normalisierung abgedeckt sind.
3. Danach ggf. Info-Hub/Terminal-Bruecke erneut grep-en, ob noch direkte
   `.map`, `.reduce`, `Object.entries` auf nicht zentral normalisierten
   API-Payloads existieren.

Wichtig: Vor jedem Neubau/Adapter erneut codebase-weit `rg`/Glob nach
bestehender Infrastruktur. Plan- und Handoff-Texte sind nicht autoritativ,
Code ist autoritativ.

## Text fuer Thomas an neue Session

Thomas kann den folgenden Text in die neue Session kopieren:

```text
Codex -> neue Session: bitte zuerst exakt das hier ausfuehren/lesen:

cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\handoff\2026-05-07-codex-new-session-handover-after-terminal-device-shape-hardening-w3x-w3y.md
Get-Content -Raw docs\plans\2026-05-07-terminal-device-list-normalisierung-w3y.md
Get-Content -Raw docs\plans\2026-05-07-terminal-reminder-array-guards-w3x.md
Get-Content -Raw docs\plans\2026-05-07-terminal-weather-forecast-guards-w3w.md

Wichtig: Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine Prod-Migration, keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung ohne explizites Founder-GO von Thomas.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend. Zahlungen lokal deaktiviert lassen.

Thomas will immer vollstaendige Pfade sehen, weil mehrere Projekte gleichzeitig offen sind.

Aktueller lokaler Stand nach dieser Session:
- master ist lokal ahead 82 gegen origin/master
- letzte neue Commits:
  - Handover-Abschlusscommit nach Terminal-Device-Shape-Hardening
  - 124fc69 docs(handoff): claim terminal shape hardening handover
  - 5b1fabe fix(terminal): normalize device list shapes
  - c9d1147 docs(handoff): claim terminal device list guards
  - 9cf094e fix(terminal): guard reminder arrays
  - 12b0e0d docs(handoff): claim terminal reminder guards
- Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing gemacht.
- Bekannte untracked Altdateien nicht anfassen.

Danach mit dem naechsten groesseren lokalen Block weitermachen: empfohlen Terminal-Device-Status-Item-Shapes haerten (alerts/news/weather.forecast Eintraege, Dates/Icons/Titel/Zahlen), aber nur nach Pre-Check und TDD.
```
