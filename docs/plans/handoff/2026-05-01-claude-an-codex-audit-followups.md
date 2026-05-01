# Claude an Codex — Audit-Folgepunkte 2026-05-01

Von: Claude (Opus 4.7)
An: Codex
Datum: 2026-05-01 vormittag
Status: read-only Hinweis, KEIN Auftrag — Codex hat Lead und entscheidet Reihenfolge selbst

## Zweck

Ich (Claude) habe heute vormittag im Founder-Auftrag einen read-only
Compliance-Preflight gegen die Phase-1-Pre-Flight-Checkliste gemacht.
Ergebnis liegt in `docs/plans/2026-05-01-phase-1-founder-hard-gates-audit.md`.

Diese Note hier ist nur ein **Hinweis fuer Dich**, was im Audit als
"Codex sollte technisch weiter pruefen" eingetragen ist. Ich entscheide
weder Reihenfolge noch Prioritaet — Du hast Lead.

## Was ich Dir aus dem Audit weiterreiche

Sortiert nach **meiner** Lese-Prioritaet (nicht bindend fuer Dich):

1. **Welle D — Test-User-Cleanup-Execute-Pfad.** Hard-Gate #8 im Audit.
   Heute ist nur `lib/admin/ai-test-users-cleanup-dry-run.ts` da; Execute
   fehlt. Ohne Execute muss am Tag X Hand-SQL gegen Prod laufen.
   Spec liegt in `~/.claude/projects/.../memory/project_folge_wellen_codex_backlog.md`.

2. **Welle C — Audit-Log-Smoke gegen Cloud-Modus.** 30 Min, beweist
   den Robustness-Fix `672b58a` an Prod (ohne Mig 176 muss Empty-State
   statt Crash kommen). Read-only, keine Toggle-Aktion.

3. **Welle B — 3 it.skip-Tests reaktivieren oder hart loeschen.**
   Reduziert Tech-Debt vor dem naechsten Push.

4. **Vitest-Setup nachbar-pflege.** Eigener Folge-Block, NICHT
   Phase-1-blockierend. Nur falls Du eh in dem Subprojekt bist.

## Zwei Dinge, die im Audit als UNKLAR stehen und Founder-Go brauchen

Diese sind **explizit nicht** als Welle freigegeben — Du sollst sie
nur kennen, falls Founder Dich vor mir ansprechen sollte:

- **Pilot-AGB/Beta-Hinweis als Live-/Onboarding-Text.** `app/agb/page.tsx`
  existiert und enthaelt Pilotbetrieb, kostenlose Nutzung und
  Funktionsgrenzen. Offen ist, ob diese bestehende AGB-Seite plus
  Print-Anschreiben fuer Phase 1 reicht oder ob ein expliziter Beta-Hinweis
  im Registrierungsflow bzw. eine separate `/pilot-agb`-Seite gewuenscht ist.
  Das ist Founder-Entscheidung.
- **Datenschutz/Impressum-Update auf eingetragene GmbH.** Erst nach
  HR-Eintragung sinnvoll. Aktuell nennen beide Seiten Thomas Theobald
  privat als Verantwortlicher; Impressum hat nur einen
  "in Gruendung"-Hinweis-Block.

Bitte beide Punkte NICHT eigenstaendig anpacken — beide brauchen
Founder-Entscheidung vorher (Live-Seite ja/nein, HR-Nummer da/nicht-da).

## Was ich nicht angefasst habe

- Keine Code-Edits.
- Keine Migration.
- Nur eine `done`-INBOX-Zeile fuer den read-only Audit; keine INBOX-Zeile fuer
  eine technische Welle, die Du noch nicht uebernommen hast.
- Keine Vault-Datei in Pfaden, die Du gerade aktiv brauchst.

## Wenn Du eine Welle uebernimmst

INBOX-Zeile mit `Status: in-progress`, `Owner: codex`, normaler Workflow.
Du brauchst **keine** Bestaetigung von mir.

## Wenn Du den Audit selber kommentieren willst

`docs/plans/2026-05-01-phase-1-founder-hard-gates-audit.md` ist ein
reines Doku-File. Wenn Du etwas in der Klassifikation oder bei den
Risiken anders einschaetzt, kannst Du dort gerne eine eigene Sektion
"Codex-Anmerkungen" am Ende anhaengen — keine Sperre meinerseits.
