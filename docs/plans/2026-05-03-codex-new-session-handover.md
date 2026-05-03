# Codex New-Session Handover — aktueller Stand nach KI-DSGVO-Review

> **Status 2026-05-03 mittag: veraltet.**
>
> Diese Datei ist nur noch historischer Kontext fuer die KI-DSGVO-/Push-
> Autonomie-Welle bis `b7a9b62`. Fuer neue Sessions nicht mehr als
> Startpunkt verwenden.
>
> Aktuellerer Startpunkt:
> `docs/plans/2026-05-03-codex-handover-after-e2e-preflight-guards.md`
> mit `HEAD = origin/master = c85f1d3` beim letzten Check. Beim Session-Start
> trotzdem immer `git status`, `git rev-parse HEAD` und den GitHub-Actions-
> Stand des aktuellen `HEAD` pruefen.

Stand: 2026-05-03 abends, nach Push von `b7a9b62`.

## Kurzstart fuer neue Session

Arbeite in:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
```

Zu Beginn lesen:

- `AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-push-deploy-vollautonomie.md`
- `docs/plans/handoff/2026-05-03-codex-an-claude-ki-dsgvo-plan-review.md`
- diese Datei

Echte Git-Lage beim Schreiben:

- Branch: `master`
- HEAD: `b7a9b62 docs: refine ai gdpr bedrock review`
- `origin/master`: synchron mit `HEAD`
- Lokaler Status: nur untracked `.codex-welle-d-3001.pid`
- `.codex-welle-d-3001.pid` nicht loeschen ohne Founder-Go.
- Kein Deploy nach `b7a9b62`, weil reine Doku-/Handoff-Welle.

## Aktuelle Regeln

Founder-Regel seit 2026-05-03 abends:

- Push und Vercel-Deploy sind fuer Codex autonom erlaubt, nach sauberer eigener Verifikation.
- Kein Founder-Go pro Welle mehr noetig.

Rote Zone bleibt Founder-Go-pflichtig:

- Prod-DB-Schreibaktionen, Prod-Migrationen, `apply_migration`, `execute_sql INSERT/UPDATE/DELETE`.
- Vercel-Env-Aenderungen, Secrets, neue/geloeschte/geaenderte Variablen.
- Provider-Live-Schaltungen ohne AVV/DPA, neue laufende Kosten.
- Verarbeitung echter personenbezogener Daten durch KI ohne AVV/DPA.
- Loeschen lokaler Altlasten/Logs/Founder-Hand-Dateien.

Auto-Stop-Trigger:

1. Prod `users` mit `is_test_user IS NOT TRUE` > 0.
2. Code setzt Migrationen voraus, die nicht auf Prod sind.
3. Deploy wuerde neue Provider-Calls ohne AVV/DPA live machen.
4. `NEXT_PUBLIC_PILOT_MODE` waere `false`.

Wenn ein Trigger greift: nicht pushen/deployen, Risiko kurz benennen und sicheren Pfad vorschlagen.

## Was zuletzt passiert ist

### Push-/Deploy-Autonomie

Commit `b0ed880 docs(handoff): record push deploy autonomy rules` ist auf `origin/master`.

Er enthaelt:

- aktualisierte Repo-Regeln in `AGENTS.md`
- Founder-/Claude-Brief zur Push-/Deploy-Vollautonomie
- INBOX-Audit
- neue Session-Handover-Basis

CI fuer `b0ed880` war gruen.

### Welle D Senior/Care Preview

Bereits auf `origin/master`:

- `b920a83 fix(senior-care): polish entry touch targets`
- `6fe0ab4 docs(handoff): record wave d senior care check`
- `6a71342 fix(senior-care): add local entry previews`
- `b13c4bc docs(handoff): add wave d local preview handover`

Wichtig:

- `/senior` leitet auf `/senior/home`.
- Emergency-Banner 112/110 bleibt priorisiert.
- Senior/Care Touch-Ziele wurden auf 80 px geprueft.
- Preview-Routen existieren lokal/non-production:
  - `/senior/preview`
  - `/care/preview`
  - `/care/consent/preview`
- Preview-Pfade sind production-guarded und machen keine Auth-/Care-DB-/Care-Seeding-Arbeit.

Verifikation laut vorherigem Handover:

- Vitest: 10 Dateien / 46 Tests passed.
- ESLint passed.
- `npx tsc --noEmit` passed.
- `npm run build:local` passed.
- Browser-Smoke lokal auf 390 px fuer alle drei Preview-Routen passed.

### KI-DSGVO-Plan-Review

Zuletzt erledigt und gepusht:

- `87827cd docs: review ai gdpr plan`
- `b7a9b62 docs: refine ai gdpr bedrock review`

Dateien:

- `docs/plans/handoff/2026-05-03-claude-an-codex-ki-dsgvo-plan-review.md`
- `docs/plans/handoff/2026-05-03-codex-an-claude-ki-dsgvo-plan-review.md`
- `docs/plans/handoff/INBOX.md`

Kernaussage:

- Claudes 3-Stufen-Plan ist die bessere Fuehrungsstruktur.
- Codex' 5-Phasen-Plan soll darunter als Checkliste laufen.
- Bis Tag X: keine Echtdaten in normale KI.
- Vor App-KI mit Nutzerdaten: serverseitiges KI-Gateway, Datenklassifizierung, Consent, PII-Gate, Audit-Metadaten und DSFA-Addendum.
- Wichtigste Korrektur: Laut aktueller offizieller AWS-Doku sind Claude Opus 4.5/4.6/4.7 auf Bedrock Frankfurt nicht belastbar als `In-Region = Yes`/Deutschland-only zu kommunizieren, sondern EU-Geo/Global. Fuer Albiez/Pilotfamilien also nicht "Daten in Deutschland" behaupten, wenn Opus 4.x via Bedrock EU-Geo genutzt wird.

Verifikation:

- `git diff --check`: keine echten Fehler, nur CRLF-Warnungen.
- Push auf `origin/master`: erfolgreich.
- GitHub Actions `E2E Multi-Agent Tests` fuer `b7a9b62`: `success`.
- Danach GitHub unauthenticated API rate-limit erreicht; Ergebnis war aber vorher bereits gruen.

## Lokale Reste

- `.codex-welle-d-3001.pid` ist untracked und bleibt liegen.
- Nicht loeschen ohne explizites Founder-Go.
- Kein weiterer untracked Handoff-Brief bekannt beim Schreiben dieser Datei.

## Naechster sinnvoller Block

Empfohlen: kleiner Produkt-/Verifikationsblock, nicht neue Strategie.

1. Authentifizierter lokaler Spot-Check fuer:
   - `/senior`
   - `/senior/home`
   - `/care`
   - `/care/consent`
2. Nur synthetische Test-Auth verwenden.
3. Kein Care-Daten-Seeding mit echten oder produktionsnahen Personendaten.
4. Vor neuem Code: Pre-Check per `rg`/Glob.
5. Bei Verhaltensaenderung: TDD strict, RED vor GREEN.
6. INBOX-Zeile pro Welle setzen.
7. Nach lokaler Verifikation committen und autonom pushen.
8. Deploy nur bewusst entscheiden. Fuer reine Doku oder lokale Preview-Pfade ist kein Deploy noetig.

## Kurzer Prompt fuer neue Session

Nicht mehr verwenden. Fuer neue Sessions stattdessen
`docs/plans/2026-05-03-codex-handover-after-e2e-preflight-guards.md` lesen
und danach `git status` plus GitHub-Actions-Stand fuer den aktuellen `HEAD`
pruefen.
