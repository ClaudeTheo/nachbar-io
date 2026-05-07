# Codex -> neue Session: Info-Hub Shape-Hardening W3p-W3r fertig, kein Push

Datum: 2026-05-07 abend

## Sofort zuerst lesen/ausfuehren

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content -Raw AGENTS.md
Get-Content -Raw docs\plans\handoff\INBOX.md
Get-Content -Raw docs\plans\handoff\2026-05-07-codex-new-session-handover-after-info-hub-shape-hardening-w3p-w3r.md
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
## master...origin/master [ahead 63]
```

Der Handover-Claim ist bereits committed:

```text
ef9df5a docs(handoff): claim shape hardening handover
```

Nach dem Commit dieser Datei und dem INBOX-Abschluss wird der Stand
voraussichtlich `ahead 64` sein. `git status -sb` und
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

### W3p: Rathaus-Link-Normalisierung

Commits:

```text
e833258 docs(handoff): claim rathaus link normalization
2b4cf76 fix(info): validate rathaus link response shapes
```

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-info-hub-rathaus-link-normalisierung-w3p.md`

Kurzstand:

- `normalizeQuartierInfoResponse` filtert falsch geformte Rathaus-Link-Eintraege.
- Gueltig sind nur Eintraege mit String-`label`, String-`description`,
  String-`url` und String-`icon`.
- API/UI rendern keine Rathaus-Links mit fehlendem `href`, kaputtem Icon oder
  fehlenden Textfeldern.

Verifikation:

- TDD RED zeigte vorher, dass kaputte Rathaus-Link-Objekte durchgereicht wurden.
- Vitest Normalizer + Route: 13/13 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

### W3q: Apotheken-Normalisierung

Commits:

```text
1814c6e docs(handoff): claim pharmacy normalization
f15d205 fix(info): validate pharmacy response shapes
```

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-info-hub-apotheken-normalisierung-w3q.md`

Kurzstand:

- `normalizeQuartierInfoResponse` filtert falsch geformte Apotheken-Eintraege.
- Gueltig sind nur Eintraege mit String-`name`, String-`address`,
  String-`phone` und String-`openingHours`.
- API/UI rendern keine Apothekenkarten mit fehlendem Namen, kaputter
  Telefonnummer oder unbrauchbaren Oeffnungszeiten.

Verifikation:

- TDD RED zeigte vorher, dass kaputte Apotheken-Objekte durchgereicht wurden.
- Vitest Normalizer + Route: 15/15 gruen.
- Gezieltes ESLint, `git diff --check`, `npx tsc --noEmit`, `npm run build`
  gruen.

### W3r: Event-Normalisierung

Commits:

```text
69207c2 docs(handoff): claim event normalization
901545b fix(info): validate event response shapes
```

Geaendert:

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\modules\info-hub\normalize-response.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\modules\info-hub\normalize-response.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\__tests__\api\quartier-info-route.test.ts`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\2026-05-07-info-hub-event-normalisierung-w3r.md`

Kurzstand:

- `normalizeQuartierInfoResponse` filtert falsch geformte Event-Eintraege.
- Gueltig sind nur Eintraege mit String-`title`, String-`description`,
  String-`schedule`, String-`location` und String-`icon`.
- API/UI rendern keine Veranstaltungskarten mit fehlendem Titel, fehlendem Ort
  oder kaputtem Icon.

Verifikation:

- TDD RED zeigte vorher, dass kaputte Event-Objekte durchgereicht wurden.
- Vitest Normalizer + Route: 17/17 gruen.
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

- W3p, W3q, W3r sind `done`.
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

1. `OepnvDeparture`-Eintraege pro Stop strenger validieren:
   `line`, `destination`, `time`, `platform` als Strings und `countdown` als
   Zahl; kaputte Departures herausfiltern, statt nur `departures` auf Array zu
   normalisieren.
2. `weather.forecast`-Eintraege strenger validieren, falls UI/TTS konkrete
   Forecast-Felder nutzt.
3. `PollenData.pollen` gegen unbekannte oder halbgueltige Eintraege weiter
   haerten, falls konkrete UI/TTS-Verbraucher daraus neue Annahmen ableiten.

Empfehlung: Falls weiter am Info-Hub gearbeitet wird, W3s als kleinen lokalen
Block fuer `OepnvDeparture` nehmen, weil `departures` aktuell nur auf Array
normalisiert, aber nicht pro Eintrag validiert wird.

## Nicht nochmal aufrollen

- Kein Push/Deploy wurde gemacht.
- Keine Prod-DB, keine Migration, keine Vercel-Env-/Secret-Aenderung.
- Stripe/Billing bewusst nicht aktiviert.
- W3m-W3r Info-Hub Response-Shape-Hardening ist lokal committed.
- SRI bleibt absichtlich deaktiviert.
- CSP-Nonce-Ansatz ist lokal verifiziert.
- CI-E2E `/api/test/login` Closed-Pilot-Bypass ist lokal und CI-nah
  verifiziert.
- W2 Events-Projektion ist lokal, ohne externen Anbieter.
- Bekannte untracked Alt-Handoffs nicht aufraeumen.
