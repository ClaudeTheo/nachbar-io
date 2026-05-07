# Codex -> neue Session: Info-Hub/TTS-Hardening W3i-W3l fertig, kein Push

Datum: 2026-05-07 abend

## Sofort zuerst lesen/ausfuehren

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content docs\plans\handoff\INBOX.md -TotalCount 120
Get-Content docs\plans\handoff\2026-05-07-codex-new-session-handover-after-info-hub-tts-hardening.md -Raw
```

Wichtig: Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine
Prod-Migration, keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung ohne
explizites Founder-GO von Thomas.

## Aktueller Git-Stand

Repository: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

Stand direkt vor dem Handover-Content:

```text
## master...origin/master [ahead 41]
```

Danach wurde der Handover-Claim committed:

```text
b7781dd docs(handoff): claim info hub tts handover
```

Nach dem Commit dieser Datei und dem INBOX-Abschluss wird der Stand
voraussichtlich `ahead 43` sein. `git status -sb` und
`git log --oneline origin/master..HEAD` bleiben autoritativ.

Bekannte untracked Alt-Dateien nicht anfassen, solange sie nicht explizit Teil
des Auftrags sind:

```text
.codex-welle-d-3001.pid
docs/plans/2026-05-04-quartier-info-skalierung-auto-first.md
docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md
docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md
docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md
docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md
docs/plans/handoff/2026-05-04-claude-an-codex-owasp-audit-5-neue-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-quittung-phase4-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md
docs/plans/handoff/2026-05-04-codex-new-session-handover-security-ci-health-deploy.md
```

## Erledigt seit der letzten Uebergabe

### W3i: Quartier-Info API-Route Response-Vertrag

Relevante Commits:

```text
bdcde52 docs(handoff): claim quartier info route response contract
e420b93 fix(info): normalize quartier info route response
6bab87d docs(handoff): close quartier info route response contract
```

Kurzstand:

- `GET /api/quartier-info` normalisiert Service-Antworten jetzt auf
  Route-Ebene mit dem bestehenden `normalizeQuartierInfoResponse`.
- Kaputte Nicht-Array-Werte fuer `nina`, `waste_next`, `rathaus`, `oepnv`,
  `apotheken`, `events` werden als Arrays ausgeliefert.
- `oepnv.departures` wird pro Stop ebenfalls zu Array normalisiert.
- Falsch typisierte `notdienst_url` und `events_calendar_url` werden leere
  Strings.

Verifikation:

- RED-Test zeigte vorher kaputte Objektwerte im JSON.
- Vitest Route + Normalizer: 6/6 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

Details:

- `docs/plans/2026-05-07-quartier-info-route-response-contract-w3i.md`

### W3j: Daily-Brief Listen-Guards

Relevante Commits:

```text
6698e3b docs(handoff): claim daily brief list guards
6bdde83 fix(voice): guard daily brief list inputs
7c68a72 docs(handoff): close daily brief list guards
```

Kurzstand:

- `buildDailyBrief` behandelt Nicht-Array-Partial-Daten fuer `nina`,
  `waste_next` und `events` wie fehlende Quellen.
- Dadurch kein Crash mehr bei direktem Aufruf mit ungeprueften Partial-Daten.
- Kaputte Werte werden nicht in den TTS-Text uebernommen.

Verifikation:

- RED-Test crashte vorher mit
  `Cannot read properties of undefined (reading 'severity')`.
- Vitest Daily-Brief: 20/20 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

Details:

- `docs/plans/2026-05-07-daily-brief-defensive-list-guards-w3j.md`

### W3k: Daily-Brief Weather/Pollen-Guards

Relevante Commits:

```text
be816cd docs(handoff): claim daily brief weather pollen guards
87a4354 fix(voice): guard daily brief weather pollen inputs
3347588 docs(handoff): close daily brief weather pollen guards
```

Kurzstand:

- `buildDailyBrief` validiert direkte Weather-/Pollen-Inputs defensiv.
- Falsch geformte Weather-Daten erzeugen keinen Satz wie
  `Heute ist es kaputt bei undefined Grad.` mehr.
- Falsch geformte Pollen-Daten werden nicht als `kaum Pollenflug` fehlgedeutet.

Verifikation:

- RED-Test zeigte vorher `undefined Grad` und falschen Pollen-Satz.
- Vitest Daily-Brief: 21/21 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

Details:

- `docs/plans/2026-05-07-daily-brief-weather-pollen-guards-w3k.md`

### W3l: Info-Hub Weather/Pollen-Normalisierung

Relevante Commits:

```text
7086687 docs(handoff): claim info hub weather pollen normalization
90af6b8 fix(info): validate weather pollen response shapes
6fd4092 docs(handoff): close info hub weather pollen normalization
```

Kurzstand:

- `normalizeQuartierInfoResponse` setzt falsch geformte `weather`- und
  `pollen`-Werte zentral auf `null`.
- Gueltige Weather-/Pollen-Payloads bleiben unveraendert erhalten.
- Die Normalisierung greift damit vor Route/UI/TTS statt erst im
  Direktaufrufer.

Verifikation:

- RED-Test zeigte vorher: `weather: { description: "kaputt" }` wurde
  unveraendert durchgereicht.
- Vitest Normalizer + Route + Page: 16/16 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

Details:

- `docs/plans/2026-05-07-info-hub-weather-pollen-normalisierung-w3l.md`

## Gesamt-Verifikation im letzten lokalen Block

Gruen in den jeweiligen Wellen:

```powershell
npx vitest run __tests__/api/quartier-info-route.test.ts __tests__/modules/info-hub/normalize-response.test.ts
npx vitest run __tests__/lib/voice/daily-brief.service.test.ts
npx vitest run __tests__/modules/info-hub/normalize-response.test.ts __tests__/api/quartier-info-route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx
npx eslint ...gezielte beruehrte Dateien...
git diff --check
npx tsc --noEmit
npm run build
```

Bekannte Build-Warnung:

```text
STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert
```

Ein ESLint-Aufruf scheiterte einmal nur wegen ungequoteter PowerShell-Klammern
im Pfad `app/(app)/quartier-info/page.tsx`. Der korrekt gequotete Aufruf war
gruen.

## Aktuelle Inbox-Lage

- W3i, W3j, W3k, W3l sind `done`.
- Dieser Handover-Eintrag wird nach dem Commit auf `done` gesetzt.
- Kein aktiver `pending`- oder `in-progress`-Eintrag aus dieser Session soll
  uebrig bleiben.
- Ein alter `blocked`-Eintrag bleibt bewusst stehen:
  `M2 Geduldsmodus Pre-Check STOP`.
- M2 nicht weiter bearbeiten, bis Thomas/Founder die Adapter-Entscheidung
  `voice_preferences` vs. `users.settings` und den UI-Ort klaert.

## Offene Gates

Weiterhin offen und nur mit explizitem Founder-GO:

- `git push origin master`
- Deploy / Vercel Production
- Prod-DB-Schreibaktionen oder Prod-Migrationen
- Vercel-Env-/Secret-/Billing-/Auth-Aenderungen
- Provider-Live-Schaltungen

## Naechste sinnvolle Schritte

### Wenn Thomas `GO PUSH` sagt

```powershell
git push origin master
```

Danach GitHub Actions fuer den neuen HEAD pruefen:

- CodeQL Security Analysis
- E2E Multi-Agent Tests

Wenn CI gruen ist und Thomas explizit Deploy/Prod-GO gibt:

- Deployment-Pfad nach Kostenregel waehlen.
- Keine Vercel-/Prod-/Secret-Aktion ohne erneutes GO.
- Nach Deploy gezielte Prod-Smokes machen.

### Wenn lokal weitergearbeitet wird

1. Immer zuerst:

```powershell
git status -sb
git log --oneline origin/master..HEAD
```

2. Dann `docs/plans/handoff/INBOX.md` lesen.
3. Bei neuen Codeaufgaben Pre-Check codebase-weit vor Neubau.
4. Bei multi-file work erst INBOX-Row `in-progress` committen.
5. TDD fuer Verhalten: Test RED sehen, dann minimal GREEN.

Moegliche naechste lokale, kleine Bloecke ohne Push/Prod:

- `normalizeOepnvStops` strenger validieren, damit kaputte Stop-Objekte nicht
  als halbgueltige UI-Daten weiterlaufen.
- `NinaAlert` pruefen, ob es API-Daten selbst normalisieren sollte oder ob der
  Route-Level-Vertrag ab W3i ausreicht.
- Eine kurze Handoff-/Memory-Aktualisierung nach dem finalen Status, falls
  weitere lokale Wellen folgen.

## Nicht nochmal aufrollen

- SRI ist absichtlich deaktiviert.
- CSP-Nonce-Ansatz ist lokal verifiziert.
- CI-E2E `/api/test/login` Closed-Pilot-Bypass ist lokal und CI-nah
  verifiziert.
- W2 Events-Projektion ist lokal, ohne externen Anbieter.
- W3-W3l Rathaus/Service-Link-Defaults, JSONB-Array-Guards,
  Client-/Route-Normalisierung und Daily-Brief/Info-Hub-Hardening sind lokal.
- Bekannte untracked Alt-Handoffs nicht aufraeumen.
- Kein Push, kein Deploy, keine Prod-DB, keine Migration, keine Secrets, keine
  Billing-/Auth-Aenderung wurden gemacht.
