# Brief an Codex — E2E-Senior-Journey umstellen + Push (Welle S1/S2)

> **Owner:** Codex (`gpt-5.5`, `xhigh` oder interaktive Session). **Driver/Review:** Claude.
> **Erstellt:** 2026-06-13. **Aktualisiert:** 2026-06-13 (Founder-Go fuer Push erteilt).
> **Warum Codex:** test-/terminalnahe Arbeit, die gegen einen laufenden Server iteriert+verifiziert werden muss (RED→GREEN) — plus der Push. Claude kann die E2E nur compile-only umschreiben (unverifiziert).
> **Voll-Spezifikation E2E:** [2026-06-13-s1-e2e-senior-journey-umstellung-handover.md](../2026-06-13-s1-e2e-senior-journey-umstellung-handover.md) — zuerst lesen.

## Reihenfolge (wichtig)
1. **E2E umstellen** (Teil A) und **gruen** bekommen.
2. **Pre-Push-Gate** pruefen (Teil B): tsc + eslint + `npm run test` (Vitest) + die betroffenen E2E gruen.
3. **Erst dann pushen** (Teil C) — sonst werden die E2E im CI rot. **NICHT deployen.**

## Prompt (1:1 kopierbar in die Codex-Session)

```text
Aufgabe: E2E-Senior-Journey auf die kanonische (senior)-Shell umstellen und danach
die 10 Commits der Wellen S1/S2 nach origin/master pushen.

Repo: nachbar-io. Lokaler master ist 10 Commits voraus (f852def..f7f130f, Wellen S1+S2).
Founder-Go fuer den Push ist erteilt. DEPLOY ist NICHT beauftragt (kein gh workflow run
deploy, kein vercel deploy) — Vercel-Env/Deploy bleibt separater Founder-Go.

=== Teil A: E2E umstellen ===
Kontext (was sich geaendert hat):
- Der Legacy-Pfad app/senior/* ist stillgelegt und redirectet in die (senior)-Shell:
  /senior, /senior/home -> /kreis-start | /senior/checkin -> /checkin |
  /senior/help -> /kreis-start | /senior/news -> /hier-bei-mir | /senior/medications -> /medications
- Die alte SeniorHomeActions-UI (Buttons "Hilfe anfragen/Nachrichten/Alles in Ordnung/
  Nachbarn kontaktieren" + "Zum normalen Modus") gibt es nur noch im Dev-Preview.
- Post-Login-Ziel fuer ui_mode=senior ist /kreis-start (agent-factory.ts bereits umgestellt).

Voll-Spezifikation (Selektoren, Datei-fuer-Datei-Liste, kanonische Journey):
  docs/plans/2026-06-13-s1-e2e-senior-journey-umstellung-handover.md  — zuerst lesen.

Konkret:
1. tests/e2e/pages/senior.page.ts auf die kanonische kreis-start-Shell umschreiben
   (4 Kacheln data-testid="kreis-start-tile": Mein Kreis /mein-kreis, Hier bei mir /hier-bei-mir,
   Schreiben /schreiben, Notfall 112 /sos; SeniorCheckinPage.goto -> /checkin; SeniorHelpPage
   entfernen oder auf /sos umstellen). kreis-start hat KEINEN Check-in und KEINEN
   "Zum normalen Modus"-Button mehr.
2. Specs: tests/e2e/scenarios/s5-senior-terminal.spec.ts (groesster Umbau, S5.6 entfaellt),
   s5-senior-care-auth-spot-check.spec.ts, s13-five-user-interaction.spec.ts,
   tests/e2e/multi-agent/phase-a-solo.spec.ts, phase-b-cross-role.spec.ts, phase-c-edge-cases.spec.ts,
   tests/e2e/cross-portal/x04-kiosk-sos-112.spec.ts.
3. tests/e2e/pilot-smoke.spec.ts:114 (pilot-criterion-06-hier-bei-mir-widget): /hier-bei-mir ist
   jetzt eine auth-gated Senior-Route. Entscheide: mit Senior-Auth + Senior-Selektoren testen ODER
   das Kriterium auf /quartier-info (Standard-Welt) umhaengen. Begruende die Wahl kurz.

=== Teil B: Pre-Push-Gate (PFLICHT, alles gruen vor Push) ===
- npx tsc --noEmit  → 0 Fehler (das stale .next/types/validator.ts ggf. loeschen, regeneriert sich).
- npx eslint auf die geaenderten Dateien → 0 Fehler.
- npm run test (Vitest) → gruen. Das ist das Deploy-Gate.
- Die in Teil A betroffenen E2E gegen einen laufenden Server mit Senior-Auth ausfuehren
  (lokaler Supabase-Stack mit Seed, oder npm run dev:cloud + Demo demo-senior@test.nachbar.local)
  → gruen.
- Gegencheck: grep -rn "/senior/home\|/senior/checkin\|/senior/help\|/senior/news" tests/ → 0 Treffer
  (ausser bewusste Redirect-Ziel-Tests).
Wenn etwas davon nicht gruen wird: NICHT pushen, Stand + Blocker melden.

=== Teil C: Push (nur wenn Teil B komplett gruen) ===
- Deine E2E-Aenderungen lokal committen (aussagekraeftige Message).
- git push origin master   (pusht die 10 S1/S2-Commits + deinen E2E-Commit).
- Danach die CI beobachten: gh run list -L 3 (CodeQL + e2e-tests.yml). Push triggert KEINEN
  Vercel-Deploy (workflow_dispatch only) — das ist beabsichtigt.
- KEIN Deploy, KEINE Prod-DB-Aktion, KEINE Vercel-Env-Aenderung.

=== Stop-Bedingungen (melden statt raten) ===
- Architektur-/Produktentscheidung noetig (z.B. pilot-smoke-Kriterium) → kurz begruenden + fragen.
- E2E nach 3 ernsthaften Versuchen nicht gruen → Stand melden, NICHT pushen.
- Push schlaegt fehl (z.B. non-fast-forward) → NICHT mit --force; melden.

Am Ende: kurzer Rapport (E2E-Dateien, welcher Lauf gruen, Push-Ergebnis + CI-Status, Rest-Risiken)
+ Brief-an-Claude in docs/plans/handoff/ falls Folgeentscheidungen offen sind.
```

## Stand der zu pushenden Commits (Kontext fuer Codex)
10 Commits, alle tsc/eslint/Vitest-gruen, kein offener Mini-Audit-CRITICAL/HIGH:
- S1 (A–E): Legacy-Senior stillgelegt, SOS-Status ohne Auto-Sprung, SOS-Entwarnung,
  "Hier bei mir" in der Shell, E2E-Login-Fix.
- Refactor: hier-bei-mir Container/View.
- S2-6: Tipp-Fallback Schreiben. S2-4: Mein-Kreis-Reverse-View. S2-1: Push-Benachrichtigung
  (datensparsam, Mini-Audit 0 CRITICAL/HIGH in der Commit-Message f7f130f).

## Nach Codex (Claude/Founder)
- Rapport reviewen. Offen bleibt der S2-Rest (Schritte 2,3,5,7 — 5/7 mit eigenem Mini-Audit), den Claude treibt.
