# Untracked-Bestandsaufnahme fuer Founder-Entscheidung

**Stand:** 2026-04-30 12:53 +02:00  
**Scope:** Vollstaendige Ausgabe von `git status --short --untracked-files=all` nach Block I.  
**Regel:** Keine Loesch-Aktion, kein Staging der hier klassifizierten Founder-Hand-Dateien.

## Ergebnis

| Datei | Klassifikation | Begruendung |
|---|---|---|
| `docs/plans/2026-04-21-rotation-continue-prompt.md` | UNTRACKED LASSEN | Founder-private Secret-Rotation-Uebergabe mit operativem Security-Kontext; nicht ohne Redaction ins Repo. |
| `docs/plans/2026-04-21-rotation-status-handover.md` | UNTRACKED LASSEN | Enthält historische Secret-Rotation-Details und Fehlbedienungs-/Provider-Kontext; als private Handover-Notiz behalten. |
| `docs/plans/2026-04-21-session-end-handover.md` | UNTRACKED LASSEN | Historischer Rotationsabschluss mit sensiblen Provider-/Token-Hinweisen; vor Repo-Aufnahme redaktieren oder zusammenfassen. |
| `docs/plans/2026-04-22-cleanup-morgen-handover.md` | UNTRACKED LASSEN | Folgeplan fuer Provider-Key-Revokes mit Security-Kontext; Founder-private Arbeitsnotiz, kein normaler Repo-Plan. |
| `docs/plans/2026-04-22-cleanup-status-handover.md` | UNTRACKED LASSEN | Status zu Dashboard-/PAT-Cleanup; operativ-sensibel und historisch, daher nicht automatisch einchecken. |
| `docs/plans/2026-04-22-rotation-followups.md` | UNTRACKED LASSEN | Rotation-Followup mit Security-Scanning-/Provider-Hinweisen; erst redaktieren, falls es als Runbook ins Repo soll. |
| `docs/plans/2026-04-25-cleanup-abgeschlossen-handover.md` | UNTRACKED LASSEN | Abschlussbericht zum Security-Cleanup; nuetzlich als private Historie, aber mit Provider-/Cleanup-Details nicht repo-ready. |
| `docs/plans/2026-04-25-codex-handover-closed-pilot.md` | UNTRACKED LASSEN | Closed-Pilot-Handover mit Live-/Deployment-Kontext; als Founder-Handover sinnvoll, aber nicht zwingend Repo-Quelle. |
| `docs/plans/2026-04-25-naechste-session-handover.md` | UNTRACKED LASSEN | Alte naechste-Session-Notiz zu bereits weitgehend erledigtem Cleanup; private Historie statt Commit-Kandidat. |
| `docs/plans/2026-04-26-ai-testnutzer-cleanup-dry-run-bericht.md` | UNTRACKED LASSEN | Dry-Run-Bericht ohne Loeschung, aber mit Prod-/Cleanup-Bezug; erst nach Founder-Review als redaktierter Bericht einchecken. |
| `docs/plans/2026-04-27-codex-handover-register-cloud-and-full-name-drift.md` | UNTRACKED LASSEN | Handover dokumentiert bewusste Prod-Aktionen und Drift-Reparatur; Founder-private Compliance-Historie. |
| `docs/plans/2026-04-28-codex-block-1-2-handover.md` | UNTRACKED LASSEN | Claude-zu-Codex-Handover fuer bereits erledigte Bloecke; historisch nuetzlich, aber kein Muss fuer Repo. |
| `docs/plans/2026-04-28-pre-scripted-tour-precheck.md` | UNTRACKED LASSEN | Pre-Check-/Synchronisationsnotiz fuer vergangene Parallel-Arbeit; privat lassen oder spaeter in kompaktes ADR ueberfuehren. |
| `docs/plans/2026-04-30-pilot-feature-gating-plan.md` | EINCHECKEN | Aktueller strategisch-technischer Plan fuer die naechste Welle; gehoert nach Founder-Review als Arbeitsgrundlage ins Repo. |
| `scripts/disable-supabase-legacy-jwts.sh` | LOESCHEN MIT FOUNDER-GO | Einmaliges destruktives Supabase-Management-Skript; laut Cleanup-Historie erledigt und wegen Prod-Wirkung nicht als normales Script behalten. |
| `scripts/rotate-twilio-oneshot.sh` | LOESCHEN MIT FOUNDER-GO | Einmaliges Twilio/Vercel-Rotationsskript mit Prod-/Redeploy-Wirkung; nur behalten, wenn vorher zu einem redaktierten Runbook umgebaut. |

## Sonderbefunde

| Muster / Pfad | Status | Begruendung |
|---|---|---|
| `.codex-*.log` / `.codex-*.err.log` | Nicht mehr in `git status`; existieren noch lokal als ignorierte Dateien | Block I hat die Muster korrekt in `.gitignore` aufgenommen; sie sind lokale Background-Task-Logs und sollen nicht ins Repo. |
| `.playwright-cli/` | Nicht mehr in `git status` | Seit Block I ignorierter lokaler Playwright-CLI-Cache. |
| `output/` | Nicht mehr in `git status` | Seit Block I ignoriertes lokales Output-Verzeichnis. |

## Empfehlung

1. `docs/plans/2026-04-30-pilot-feature-gating-plan.md` nach Founder-Review einchecken oder vorher inhaltlich freigeben.
2. Die alten `docs/plans/2026-04-21-*` bis `2026-04-28-*` als private Handover-Historie ausserhalb des Repo lassen, solange keine redaktierte Zusammenfassung benoetigt wird.
3. Die beiden One-Shot-Skripte nur mit ausdruecklichem Founder-Go loeschen; falls Wissen daraus erhalten bleiben soll, besser redaktierte Runbooks unter `docs/runbooks/` statt ausfuehrbarer Skripte.
