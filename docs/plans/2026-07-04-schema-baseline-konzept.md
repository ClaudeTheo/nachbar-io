# Konzept: Schema-Baseline für Supabase-Prod (R1, Architektur-Review 2026-07-04)

**Status:** KONZEPT — Ausführung ist rote Zone (Prod-DB), braucht expliziten Founder-Go pro Schritt.
**Problem:** Die Migrationshistorie (198 Dateien) ist nicht die Wahrheit über Prod: manuell gesetzte Funktionen/Spalten/Constraints (dokumentierter Drift), 9 nachreparierte Migrationen (2026-04-30), Mig 176–178/196/199 als Datei vorhanden aber nicht appliziert, `db:types` generiert aus Prod statt aus der Historie. Jede künftige Migration, jeder Restore-Fall und jedes Audit erbt diese Unsicherheit.

## Zielbild

1. **Eine Baseline-Migration, die Prod exakt beschreibt** — ab dann gilt: `Baseline + neue Migrationen = Prod`, lokal wie remote.
2. **Ein CI-Wächter, der Drift sofort meldet** statt ihn Monate später zu entdecken.
3. Historie bleibt als Archiv erhalten (Nachvollziehbarkeit/Audit), wird aber nicht mehr replayed.

## Vorgehen (5 Schritte, je mit Verify)

| # | Schritt | Werkzeug | Zone |
|---|---|---|---|
| 1 | **Prod-Schema-Dump** (nur Schema, keine Daten): Tabellen, Funktionen, Trigger, Policies, Grants, Extensions | `supabase db dump --linked -f baseline.sql` (read-only) | gelb (nur Lesen) |
| 2 | **Diff Baseline vs. lokaler Replay**: lokalen Stack aus 198 Migrationen bauen, gegen Prod-Dump diffen → der Drift wird damit erstmals VOLLSTÄNDIG sichtbar und dokumentiert | `supabase db diff` / migra | grün |
| 3 | **Baseline einfrieren**: `supabase/migrations/` → `supabase/migrations-archive/` (git mv, Historie bleibt); Baseline als `<timestamp>_baseline.sql` einzige Startmigration; `schema_migrations`-Tabelle auf Prod entsprechend umstellen (EIN Insert, KEINE Schemaänderung) | Datei-Ops + 1 Prod-Insert | **rot (Founder-Go)** |
| 4 | **Lokalen Stack + Seed neu verifizieren**: `db reset` gegen Baseline, E2E S1–S7 grün | CI | grün |
| 5 | **Drift-Wächter**: wöchentlicher Job dumpt Prod-Schema (read-only) und diffed gegen `Baseline + Migrationen`; Abweichung → Issue/Alarm | GitHub Action (Secret: read-only DB-URL) | gelb |

## Risiken + Antworten

- **„Verlieren wir die Historie?"** Nein — Archiv-Ordner bleibt in git; Audits können jede historische Migration weiter einsehen.
- **„Bricht der lokale Stack?"** Schritt 4 ist das Gate; erst wenn E2E grün, wird umgestellt. Rollback = Archiv zurückschieben.
- **„Was ist mit Mig 176–178/196/199 (Files, nicht appliziert)?"** VOR der Baseline entscheiden: applizieren (Founder-Go, je einzeln) oder verwerfen — sonst wandern sie fälschlich ins Archiv als „scheinbar appliziert".
- **„PITR?"** Der offene PITR-Restore-Test gehört als Schritt 0 dazu: erst beweisen, dass Restore überhaupt funktioniert, dann Baseline ziehen.

## Aufwand

Schritte 1–2: ~1 Welle (Claude, gefahrlos, liefert den Drift-Report als eigenständigen Wert).
Schritte 3–5: ~1 Welle + Founder-Go + Codex-Review.

## Empfehlung

Schritte 0–2 zeitnah (reiner Erkenntnisgewinn, null Prod-Risiko). Schritt 3 erst NACH Entscheidung über die 5 hängenden Migrationen.
