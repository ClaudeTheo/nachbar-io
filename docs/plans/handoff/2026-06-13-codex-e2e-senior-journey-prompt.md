# Brief an Codex — E2E-Senior-Journey auf die kanonische Shell umstellen

> **Owner:** Codex (`gpt-5.5`, `xhigh` oder interaktive Session). **Driver/Review:** Claude.
> **Erstellt:** 2026-06-13 (Welle S1, Teil E). **Status:** OFFEN.
> **Warum Codex:** test-/terminalnahe Arbeit, die gegen einen laufenden Server iteriert+verifiziert werden muss (RED→GREEN). Claude kann die Specs nur compile-only umschreiben — unverifiziert und damit riskant.
> **Voll-Spezifikation:** [2026-06-13-s1-e2e-senior-journey-umstellung-handover.md](../2026-06-13-s1-e2e-senior-journey-umstellung-handover.md) — zuerst lesen.

## Prompt (1:1 kopierbar in die Codex-Session)

```text
Aufgabe: E2E-Senior-Journey auf die kanonische (senior)-Shell umstellen (Welle S1, Teil E).

Repo: nachbar-io (Branch master, ungepushte Commits f852def..18e6e82). NICHT pushen, NICHT deployen.

Kontext (was sich geaendert hat):
- Der Legacy-Pfad app/senior/* ist stillgelegt und redirectet jetzt in die (senior)-Shell:
  /senior, /senior/home -> /kreis-start | /senior/checkin -> /checkin |
  /senior/help -> /kreis-start | /senior/news -> /hier-bei-mir | /senior/medications -> /medications
- Die alte SeniorHomeActions-UI (Buttons "Hilfe anfragen/Nachrichten/Alles in Ordnung/
  Nachbarn kontaktieren" + "Zum normalen Modus") gibt es nur noch im Dev-Preview, nicht mehr
  auf einer echten Route.
- Post-Login-Ziel fuer ui_mode=senior ist jetzt /kreis-start (in tests/e2e/helpers/agent-factory.ts
  bereits umgestellt — erledigt).

Vollstaendige Spezifikation (Selektoren, Datei-fuer-Datei-Liste, kanonische Journey) liegt hier:
  docs/plans/2026-06-13-s1-e2e-senior-journey-umstellung-handover.md
Lies das zuerst.

Konkret zu tun (gemaess Handoff):
1. tests/e2e/pages/senior.page.ts auf die kanonische kreis-start-Shell umschreiben
   (4 Kacheln data-testid="kreis-start-tile": Mein Kreis /mein-kreis, Hier bei mir /hier-bei-mir,
   Schreiben /schreiben, Notfall 112 /sos; SeniorCheckinPage.goto -> /checkin; SeniorHelpPage
   entfernen oder auf /sos umstellen). Beachte: kreis-start hat KEINEN Check-in und KEINEN
   "Zum normalen Modus"-Button mehr.
2. Specs auf die neue Journey: tests/e2e/scenarios/s5-senior-terminal.spec.ts (groesster Umbau,
   S5.6 entfaellt), s5-senior-care-auth-spot-check.spec.ts, s13-five-user-interaction.spec.ts,
   tests/e2e/multi-agent/phase-a-solo.spec.ts, phase-b-cross-role.spec.ts, phase-c-edge-cases.spec.ts,
   tests/e2e/cross-portal/x04-kiosk-sos-112.spec.ts.
3. tests/e2e/pilot-smoke.spec.ts:114 (pilot-criterion-06-hier-bei-mir-widget): /hier-bei-mir ist
   jetzt eine auth-gated Senior-Route. Entscheide: entweder mit Senior-Auth + Senior-Selektoren
   testen ODER das Kriterium auf /quartier-info (Standard-Welt) umhaengen. Begruende die Wahl kurz.

Verifikation (PFLICHT):
- E2E gegen einen laufenden Server mit Senior-Auth ausfuehren (lokaler Supabase-Stack mit Seed,
  oder npm run dev:cloud + Demo-Suite demo-senior@test.nachbar.local). Die betroffenen Specs muessen
  gruen sein, bevor du fertig meldest.
- Gegencheck: grep -rn "/senior/home\|/senior/checkin\|/senior/help\|/senior/news" tests/ ergibt 0
  Treffer (ausser bewusste Redirect-Ziel-Tests).
- npx tsc --noEmit + npx eslint auf die geaenderten Dateien sauber.

Stop-Bedingungen (melden statt raten):
- Wenn eine Spec eine Architektur-/Produktentscheidung erzwingt, die ueber Pfad-Swap hinausgeht
  (z.B. das pilot-smoke-Kriterium oben), kurz begruenden und Founder/Claude fragen.
- KEIN git push, KEIN Deploy, KEINE Prod-DB-Aktion. Nur lokal committen.
- Wenn nach 3 ernsthaften Versuchen ein E2E-Lauf nicht gruen wird: Stand + Blocker melden.

Am Ende: kurzer Rapport (welche Dateien, welcher E2E-Lauf gruen, Rest-Risiken) + Brief-an-Claude
in docs/plans/handoff/ falls Folgeentscheidungen offen sind.
```

## Nach Codex (Claude/Founder)
- Rapport reviewen, dann ist der Weg frei fuer den Push der S1+S2-Commits (Founder-Go).
- Parallel laeuft bei Claude der S2-Rest (Push-Benachrichtigung, Anruf, Family-Setup) inkl. Pflicht-Mini-Audit.
