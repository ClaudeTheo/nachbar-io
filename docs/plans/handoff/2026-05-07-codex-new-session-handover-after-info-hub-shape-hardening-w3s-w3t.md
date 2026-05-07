# Codex -> neue Session: Info-Hub Shape-Hardening W3s-W3t fertig, kein Push

Datum: 2026-05-07 abend

## Sofort zuerst lesen/ausfuehren

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\handoff\2026-05-07-codex-new-session-handover-after-info-hub-shape-hardening-w3s-w3t.md
```

Wichtig: Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine
Prod-Migration, keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung ohne
explizites Founder-GO von Thomas.

Stripe/Billing bleibt bis zur angemeldeten GmbH wartend. Zahlungen lokal
deaktiviert lassen.

Thomas will immer vollstaendige Pfade sehen, weil mehrere Projekte
gleichzeitig offen sind.

## Aktueller Git-Stand

Repository:

```text
C:\Users\thoma\Claud Code\Handy APP\nachbar-io
```

Stand vor dem Schreiben dieser Handover-Datei:

```text
## master...origin/master [ahead 68]
```

Der Handover-Claim ist bereits committed:

```text
1a94d76 docs(handoff): claim shape hardening w3s w3t handover
```

Nach dem Commit dieser Datei und dem INBOX-Abschluss wird der Stand
voraussichtlich `ahead 70` sein. `git status -sb` und
`git log --oneline origin/master..HEAD` bleiben autoritativ.

Bekannte untracked Alt-Dateien nicht anfassen, solange sie nicht explizit Teil
des Auftrags sind:

```text
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\.codex-welle-d-3001.pid
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-04-quartier-info-skalierung-auto-first.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-claude-an-codex-due-diligence-review.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-03-codex-an-claude-due-diligence-review.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-04-claude-an-codex-owasp-audit-5-neue-findings.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-04-claude-an-codex-quittung-phase4-findings.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-04-claude-an-codex-security-zweitmeinung.md
C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-04-codex-new-session-handover-security-ci-health-deploy.md
```

## Erledigt seit letzter Uebergabe

### W3s: OePNV-Departure-Normalisierung

Commits:

```text
ed20310 docs(handoff): claim oepnv departure normalization
525d4e2 fix(info): validate oepnv departure response shapes
```

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-info-hub-oepnv-departure-normalisierung-w3s.md`

Kurzstand:

- `normalizeQuartierInfoResponse` filtert falsch geformte
  OePNV-Departure-Eintraege pro Haltestelle.
- Gueltig sind nur Eintraege mit String-`line`, String-`destination`,
  String-`time`, String-`platform` und Number-`countdown`.
- Optionales String-`hint` bleibt erhalten.
- API/UI rendern keine Abfahrten mit fehlender Linie, fehlendem Ziel, fehlender
  Zeit, kaputtem Gleis oder kaputtem Countdown.

Verifikation:

- TDD RED zeigte vorher, dass kaputte Departure-Objekte durchgereicht wurden.
- Vitest Normalizer + Route: 19/19 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

### W3t: Weather-Forecast-Normalisierung

Commits:

```text
187844a docs(handoff): claim weather forecast normalization
ec1eb6d fix(info): validate weather forecast response shapes
```

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-info-hub-weather-forecast-normalisierung-w3t.md`

Kurzstand:

- `normalizeQuartierInfoResponse` filtert falsch geformte
  `weather.forecast`-Eintraege.
- Gueltig sind nur Forecast-Tage mit String-`day`, Number-`tempMax` und
  String-`icon`.
- Gueltige Weather-Objekte werden auf `temp`, `description`, `icon` und den
  normalisierten `forecast` reduziert.
- API/UI rendern keine Forecast-Zeilen mit fehlendem Tag, kaputter
  Hoechsttemperatur oder kaputtem Icon.

Verifikation:

- TDD RED zeigte vorher, dass kaputte Forecast-Eintraege durchgereicht wurden.
- Vitest Normalizer + Route: 21/21 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

## Bekannte Build-Meldung

`npm run build` meldet lokal mehrfach:

```text
STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert
```

Das ist aktuell erwartetes Verhalten. Wegen der Founder-Regel bleibt
Stripe/Billing bis zur angemeldeten GmbH wartend.

## Aktuelle Inbox-Lage

- W3s und W3t sind `done`.
- Dieser Handover-Eintrag wird nach Commit auf `done` gesetzt.
- Es gibt keinen neuen aktiven `pending`- oder `in-progress`-Eintrag aus dieser
  Session.
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
- Stripe/Billing-Live-Setup bis zur angemeldeten GmbH
- Provider-Live-Schaltungen

## Naechste sinnvolle lokale Schritte

Immer zuerst:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw docs\plans\handoff\INBOX.md
```

Dann lokal mit Pre-Check und TDD weiterarbeiten. Moegliche naechste kleine
Bloecke ohne Push/Prod:

1. `PollenData.pollen` weiter haerten:
   unbekannte oder halbgueltige Polleneintraege filtern oder zumindest
   `today`/`tomorrow` enger auf erlaubte `PollenIntensity`-Werte
   `0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3` pruefen.
2. Info-Hub-UI-Verbraucher nochmal auf weitere tief verschachtelte Annahmen
   pruefen, bevor neue Felder gebaut werden.
3. Bei neuen Info-Hub-Haertungen zuerst immer `modules/info-hub/normalize-response.ts`
   und die bestehenden Tests erweitern, statt neue Normalizer daneben zu bauen.

Empfehlung: Falls weiter am Info-Hub gearbeitet wird, W3u als kleinen lokalen
Block fuer `PollenData.pollen` nehmen, weil `normalizePollen` aktuell nur
Number-Werte prueft, aber nicht die erlaubten Intensitaetsstufen.

## Nicht nochmal aufrollen

- Kein Push/Deploy wurde gemacht.
- Keine Prod-DB, keine Migration, keine Vercel-Env-/Secret-Aenderung.
- Stripe/Billing bewusst nicht aktiviert.
- W3m-W3t Info-Hub Response-Shape-Hardening ist lokal committed.
- SRI bleibt absichtlich deaktiviert.
- CSP-Nonce-Ansatz ist lokal verifiziert.
- CI-E2E `/api/test/login` Closed-Pilot-Bypass ist lokal und CI-nah
  verifiziert.
- W2 Events-Projektion ist lokal, ohne externen Anbieter.
- Bekannte untracked Alt-Handoffs nicht aufraeumen.
