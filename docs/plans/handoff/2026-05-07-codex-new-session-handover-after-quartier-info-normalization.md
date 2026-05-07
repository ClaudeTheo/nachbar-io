# Codex -> neue Session: Quartier-Info-Normalisierung W3f-W3h fertig, kein Push

Datum: 2026-05-07

## Sofort zuerst lesen/ausfuehren

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status -sb
git log --oneline origin/master..HEAD
Get-Content docs\plans\handoff\INBOX.md -TotalCount 110
Get-Content docs\plans\handoff\2026-05-07-codex-new-session-handover-after-quartier-info-normalization.md -Raw
```

Wichtig: Kein Push, kein Deploy, keine Prod-DB-Schreibaktion, keine
Prod-Migration, keine Vercel-Env-/Secret-/Billing-/Auth-Aenderung ohne
explizites Founder-GO von Thomas.

## Aktueller Git-Stand

Repository: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

Stand beim Schreiben nach dem Handover-Claim:

```text
## master...origin/master [ahead 28]
574f3e1 docs(handoff): claim normalization handover
44f1f61 fix(info): normalize quartier info client responses
cf4ab28 docs(handoff): claim quartier info client normalization w3h
a6bf7c6 fix(info): guard municipal config list arrays
71bac50 docs(handoff): claim municipal config array guards w3g
467a7c2 fix(info): guard municipal wiki entries arrays
b01cb99 docs(handoff): claim wiki entries array guard w3f
5da277c docs(handoff): save rathaus info hub state
8fe2158 docs(handoff): claim rathaus info hub handover
2434b69 fix(info): guard municipal service links arrays
7691c1e docs(handoff): claim service links array guard w3e
9b40610 fix(info): reuse rathaus defaults in city services
d82b2f5 docs(handoff): claim city services rathaus defaults w3d
5d6b513 fix(info): use rathaus url service link defaults
01b695f docs(handoff): claim rathaus url defaults w3c
551ee7f docs(handoff): save info hub local waves state
72e6457 docs(handoff): claim info hub local waves handover
bcf47d1 feat(municipal): add default service link generator
ffbfb85 docs(handoff): claim rathaus defaults generator w3b
6c6680f feat(info): project quartier events into info hub
0a19217 docs(handoff): claim quartier events sync w2
3576ec5 fix(info): provide bad saeckingen rathaus defaults
2008600 docs(handoff): claim rathaus defaults w3
c860048 docs(handoff): save ci e2e fix session state
3fb9c6d fix(ci): allow local e2e test login through closed pilot
3552dce docs(handoff): save local csp nonce state
c2b5408 fix(security): nonce csp script policy
42d1a7e docs(handoff): claim csp script hardening
```

Nach dem Commit dieser Datei wird der Stand voraussichtlich `ahead 29` sein.
`git status -sb` und `git log --oneline origin/master..HEAD` bleiben
autoritativ.

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

### W3f: wiki_entries JSONB Array-Guard

Relevanter Commit:

```text
467a7c2 fix(info): guard municipal wiki entries arrays
```

Kurzstand:

- `/city-services` behandelt Nicht-Array-`municipal_config.wiki_entries` wie
  eine leere Liste.
- Dadurch kein `.map is not a function` mehr auf kaputten oder driftenden
  JSONB-Werten.

Verifikation:

- RED-Test reproduzierte vorher `entries.map is not a function`.
- Vitest City-Services: 59/59 gruen.
- Gezieltes ESLint, `npx tsc --noEmit`, `git diff --check`, `npm run build`
  gruen.

### W3g: municipal_config Listen-Array-Guards im Service

Relevanter Commit:

```text
a6bf7c6 fix(info): guard municipal config list arrays
```

Kurzstand:

- Neuer generischer Helper `toMunicipalConfigArray<T>`.
- `toServiceLinkArray` nutzt diesen Helper weiter.
- `getQuartierInfo` normalisiert `apotheken`, `events` und `oepnv_stops`.
- Nicht-Array-Werte werden im API-Vertrag als leere Arrays behandelt.

Verifikation:

- RED-Test zeigte vorher: `expected { name: 'Kaputter Apotheken-Wert' } to deeply equal []`.
- Vitest Quartier-Info-Service + Municipal-Helper: 11/11 gruen.
- Gezieltes ESLint, `npx tsc --noEmit`, `git diff --check`, `npm run build`
  gruen.

### W3h: Quartier-Info Client-Response-Normalisierung

Relevanter Commit:

```text
44f1f61 fix(info): normalize quartier info client responses
```

Kurzstand:

- Neuer reiner Client-/Info-Hub-Helper
  `modules/info-hub/normalize-response.ts`.
- `/quartier-info` normalisiert API-Antworten direkt nach erfolgreichem Fetch.
- `InfoBar` nutzt denselben Normalizer.
- Folgende Listen werden vor UI und TTS auf Arrays normalisiert:
  `nina`, `waste_next`, `rathaus`, `oepnv`, `apotheken`, `events`.
- `oepnv.departures` wird pro Haltestelle ebenfalls auf Array normalisiert.
- `notdienst_url` und `events_calendar_url` werden bei falschem Typ zu leeren
  Strings.

Verifikation:

- RED-Test crashte vorher mit
  `Cannot read properties of undefined (reading 'severity')` in
  `buildDailyBrief`.
- Vitest Page + Normalizer: 11/11 gruen.
- Gezieltes ESLint, `npx tsc --noEmit`, `git diff --check`, `npm run build`
  gruen.

Bekannte lokale Build-Warnung:

```text
STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert
```

## Aktuelle Inbox-Lage

- Kein `pending`- oder `in-progress`-Eintrag ausser dieser Handover-Arbeit.
- Ein alter `blocked`-Eintrag bleibt bewusst stehen:
  `M2 Geduldsmodus Pre-Check STOP`.
- M2 nicht weiter bearbeiten, bis Thomas/Founder die Adapter-Entscheidung
  `voice_preferences` vs. `users.settings` und den UI-Ort klaert.

## Pilot-Prozent-Einordnung

Aktuelle ehrliche Einschaetzung:

- Code fuer technischen Pilot-Test: ca. 92 Prozent.
- Gesamtpilot mit echten Menschen: ca. 45 Prozent.

Warum:

- Lokal sind CSP, CI-E2E-Bypass-Haertung, Info-Hub/Rathaus-Defaults und jetzt
  Server-/Client-Normalisierung fuer driftende Quartier-Info-Daten verifiziert.
- Noch nicht erledigt: Push nach GitHub, CI auf dem neuen HEAD, Deploy und
  Prod-Smokes. Diese bleiben wegen Founder-Gate bewusst offen.
- Ausserhalb des Codes bleiben Akquise, Vertraege, GmbH/Konto/AVV, Betrieb und
  echte Pilotablaeufe der groessere Anteil.

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
4. Bei multi-file work erst Inbox-Row `in-progress` committen.
5. TDD fuer Verhalten: Test RED sehen, dann minimal GREEN.

Moeglicher naechster lokaler Block ohne Prod/Push:

- Info-Hub/Quartier-Info API-Route auf Antwortform testen, sodass
  `GET /api/quartier-info` auch auf Route-Ebene garantiert Arrays liefert.
- Alternativ: `buildDailyBrief` selbst gegen Nicht-Array-Partial-Daten
  abhaerten, falls kuenftig andere Aufrufer ungepruefte Daten uebergeben.

## Nicht nochmal aufrollen

- SRI ist absichtlich deaktiviert.
- CSP-Nonce-Ansatz ist lokal verifiziert.
- CI-E2E `/api/test/login` Closed-Pilot-Bypass ist lokal und CI-nah
  verifiziert.
- W2 Events-Projektion ist lokal, ohne externen Anbieter.
- W3-W3h Rathaus/Service-Link-Defaults, JSONB-Array-Guards und
  Client-Normalisierung sind lokal.
- Bekannte untracked Alt-Handoffs nicht aufraeumen.
- Kein Push, kein Deploy, keine Prod-DB, keine Migration, keine Secrets, keine
  Billing-/Auth-Aenderung wurden gemacht.
