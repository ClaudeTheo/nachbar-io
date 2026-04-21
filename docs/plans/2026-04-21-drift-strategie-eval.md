# Drift-Strategie-Eval — Lokal-Stack-Mig-019-Blocker

**Datum:** 2026-04-21
**Status:** Entscheidungs-Vorlage fuer Founder + Codex-Review
**Scope:** Vier Optionen aus Handoff `2026-04-20-handoff-dev-supabase-local-und-cleanup-done.md` (Prio-1-Block).

Die Entscheidung ist **nicht dringend** — `npm run dev:cloud` ist der funktionierende Dev-Modus. Aber: ohne Lokal-Stack keine gefahrlose Migrations-Experiment-Plattform, keine Branch-fremden Tests in Isolation. Deshalb vor Pilot-Rollout klaeren.

---

## Problem-Rekapitulation

- Prod-Supabase hat **Drift** gegenueber `schema_migrations`: Funktionen, Spalten, Constraints wurden historisch manuell per SQL-Editor angelegt, ohne Migrations-File.
- Dokumentiert in `memory/project_supabase_prod_drift.md` + `.claude/rules/db-migrations.md`.
- Konkrete Auspraegung: Mig `019_care_shared_functions.sql` referenziert Tabelle `care_helpers`, die erst in einer spaeteren Migration existiert. In Prod war das nie ein Problem, weil `care_helpers` **vor Mig 019** manuell angelegt wurde. Lokal fehlt dieser manuelle Vorlauf — Apply bricht.
- Baseline-Snapshot (`20260316125000_baseline_full_snapshot.sql`) existiert, sortiert aber nach Dateinamen **nach** Mig 019. Lokal erreicht die Baseline nie.
- 195 Migrationen total. Unbekannte weitere Drifts hoechstwahrscheinlich zwischen 020 und 172.

## Bewertungs-Matrix

| Option | Aufwand | Risiko | Laufende Kosten | History-Integritaet | Founder-Go noetig |
|---|---|---|---|---|---|
| 1. Baseline-Reorder | Hoch | Mittel-Hoch | 0 | Erhalten | Nein (lokal-only) |
| 2. Migrations-Konsolidierung | Mittel | Niedrig | 0 | Zerstoert | Ja (History-Rewrite) |
| 3. Nur-Baseline-Setup (Custom Tooling) | Hoch | Mittel | 0 | Erhalten | Nein |
| 4. Supabase Preview Branch | Niedrig | Sehr niedrig | ~0,01 EUR/h (~7 EUR/Monat bei 24/7) | Erhalten | Ja (Billing) |

## Option 1 — Baseline-Reorder

**Idee:** Baseline-Snapshot als `000_baseline_full_snapshot.sql` vor alle anderen Migrationen sortieren. Alle 001-172 werden dann auf einem bereits komplett-vorbereiteten Schema angewendet.

**Problem:** Viele der alten Migrationen sind **nicht idempotent** — `CREATE TABLE ...` ohne `IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN ...` ohne Existenz-Check, `CREATE FUNCTION` ohne `OR REPLACE`. Auf einem Schema, das schon die Baseline enthaelt, werfen diese Statements Errors.

**Aufwand-Schaetzung:**
- 195 Migrations zu lesen und Idempotenz-Muster zu pruefen: ca. 4-6 Stunden Reviewer-Zeit
- Nicht-idempotente Migrations entweder a) auf idempotent umbauen (invasiv, Verhalten-Aequivalent aber nicht Identitaet) oder b) konditional ueberspringen (kompliziert, braucht State-Variable)
- Testlauf-Iteration: pro Fix 2-3 Minuten Stack-Restart, bei 50 nicht-idempotenten Migrations potenziell 2-3 Stunden Test-Loop

**Vorteil:** Migrations-Historie bleibt exakt wie in Prod. Keine destruktive Aktion. Rueckrollbar.

**Risiko:** Subtle Verhaltens-Unterschiede zwischen idempotent-umformuliert und original. Wenn ein Historical Migration einen Bug oder eine Datenkorrektur enthielt, die durch die Umformulierung verloren geht, kriegen wir's nie mit.

**Empfehlung:** **Nicht primaere Option**. Hoher Wert wenn Prod-Historie religioes erhalten werden soll, aber der Auditwert der 001-172-Historie ist begrenzt — Daten in Prod sind eh manuell drift-korrigiert worden.

## Option 2 — Migrations-Konsolidierung (pg_dump)

**Idee:** `pg_dump --schema-only` auf Prod → neue Datei `000_prod_snapshot_YYYYMMDD.sql`. Alte Migrationen 001-172 werden als ein Snapshot verschmolzen. Ab 173 normale History.

**Cleanup:**
- Alte Files 001-172 archivieren (nach `supabase/migrations/_legacy/` oder komplett loeschen).
- `schema_migrations`-Tabelle in Prod nicht anfassen — die dokumentiert weiterhin die historische Anwendung.
- Neu einbezogene Dev-Setups starten mit frischem `000_prod_snapshot_...`.

**Aufwand-Schaetzung:**
- pg_dump laufen lassen: 5 Min
- Review des Dumps auf Clean-up (Owner-Grants, Tablespaces, Timezone-Settings): 30 Min
- File-Umbau + Test auf Lokal: 1 Std
- Dokumentation (warum 001-172 nicht mehr applybar sind): 30 Min
- Total ca. 2 Std

**Vorteil:** Lokal-Setup funktioniert sofort und exakt wie Prod (inklusive Drift). Neue Migrations ab 173 bleiben sauber.

**Nachteil:** `git blame` auf DB-Objekte verliert Verankerung in alten Migrations. Fuer Audit-Trail-Zwecke (IEC 62304) muesste dokumentiert werden, dass der Snapshot X die Historie 001-172 zum Zeitpunkt Y konsolidiert.

**Founder-Go Pflicht:** History-Rewrite von `supabase/migrations/` ist eine strukturelle Aenderung, die alle Entwickler-Umgebungen synchronisieren muss.

**Empfehlung:** **Beste Langzeit-Loesung**, wenn Founder bereit ist die Audit-Implikation zu tragen.

## Option 3 — Nur-Baseline-Setup via config.toml / Custom Tooling

**Idee:** Supabase-CLI-Config so biegen, dass lokal nur Baseline + neue Migrations ab einer Cutoff-Nummer applyen.

**Realitaet:** Supabase CLI unterstuetzt das **nicht nativ**. Wuerde Custom Shell-Skript / Node-Skript benoetigen, das vor `supabase db reset` die Migrations-Liste manipuliert.

**Empfehlung:** **Nicht verfolgen**. Custom Tooling + CLI-Update-Risiko = Wartungs-Falle. Ist praktisch eine schlechtere Variante von Option 2.

## Option 4 — Supabase Preview Branch

**Idee:** Statt lokalem Docker-Stack einen Supabase Preview-Branch erzeugen, der direkt vom Prod-Schema abzweigt.

**Technisch:** `mcp__supabase__create_branch` oder via Supabase Dashboard. Branch ist saubere Kopie von Prod inkl. aller Drifts.

**Kosten:** Laut offizieller Preis-Tabelle 0,01344 USD/h ≈ 0,0128 EUR/h. Das sind:
- 24/7: ~9,20 USD/Monat ≈ 8,80 EUR/Monat
- Nur Arbeitstage (8 Std, 20 Tage/Monat): ~2,15 USD/Monat ≈ 2,05 EUR/Monat
- On-Demand-Betrieb (nur wenn Stack aktiv, sonst geloescht): deutlich weniger

**Vorteil:** 
- Nicht-destruktiv (Prod bleibt unangetastet)
- Funktioniert **sofort** ohne Migrations-Arbeit
- Getestete Drift-Strategie (wie `nachbar-io` seit Monaten im Cloud-Modus laeuft)
- Zeit-Fenster-Modell moeglich: hochfahren, testen, wegwerfen

**Nachteil:**
- Nicht vollstaendig offline/lokal — internet-abhaengig
- Laufende Kosten, auch wenn klein
- Founder-Go Pflicht (Billing)

**Empfehlung:** **Beste kurzfristige Loesung**. Genau fuer "Ich muss jetzt B4-Walkthrough gegen eine nicht-Prod-Umgebung machen" geeignet.

---

## Empfehlung (priorisiert)

### Stufe 1 — Jetzt (vor Push am 27.04.)

**Option 4 aktivieren**, wenn B4/B6 gegen eine nicht-Prod-Umgebung notwendig sind. Kostet unter 1 EUR fuer die paar Testtage. Kein langfristiges Commitment.

- Founder-Go fuer Preview-Branch-Kosten.
- Claude kann den Branch via `mcp__supabase__create_branch` anlegen und das Merge-Verhalten testen (Rote Zone: `merge_branch`, nur mit Go).

### Stufe 2 — Nach 27.04. (Pilot-Betrieb stabilisiert)

**Option 2 als Strukturloesung**. Saubere Konsolidierung der Migrations-Historie. Fuer die naechsten 12 Monate die richtige Basis.

- Founder-Go fuer History-Rewrite.
- pg_dump + Review + Test + Docu = 1 Sprint-Tag.
- Danach Lokal-Stack fuer alle zukuenftigen Entwickler sofort bootbar.

### Nicht verfolgen

- **Option 1** (Baseline-Reorder) nur, wenn wir Audit-Anforderungen haben, die die Historie religioes brauchen. Wenig wahrscheinlich.
- **Option 3** (Custom Tooling) — Wartungsfalle, keine echten Vorteile gegenueber Option 2.

---

## Kontext-Einflussgroessen

- **Regulatorik (IEC 62304 Kiosk-Anteil):** `Cargo.lock` committen ist im Backlog (CLAUDE.local.md), aber DB-Migrations-Historie ist nicht explizit Teil der IEC-Anforderungen. Sollte vor Option 2 mit der IEC-Dokumentation abgeglichen werden.
- **Multi-Developer-Zukunft:** Bei 1 Entwickler (Founder) ist Option 4 robust genug. Bei 3+ Entwicklern ab 2026-Q3 gewinnt Option 2 an Bedeutung.
- **Pilot-Volumen:** Bei <50 Nutzern sind Dev-Operationen auf Prod eh limitiert riskant. Preview-Branch oder pg_dump-Konsolidierung beides akzeptabel.

## Was Claude autonom pruefen kann (ohne Founder-Go)

- Idempotenz-Status der Migrations 001-172 durchzaehlen (Option 1 Risiko-Quantifizierung): `grep -cE "^CREATE (TABLE|FUNCTION|INDEX|VIEW|TYPE)[^I]" supabase/migrations/0??*.sql` — zeigt non-IF-NOT-EXISTS-Statements.
- Dump-Groesse abschaetzen ohne Dump: `mcp__supabase__list_tables` zaehlt Tabellen, von da skaliert.
- Mig 019 Einzel-Fix als Dry-Run: manuell `care_helpers`-Stub-Tabelle vor 019 einziehen → testen ob dann 020-172 durchlaufen. Wenn ja, ist der Scope der Drift klein (nur `care_helpers`). Wenn nein, zeigt das das Drift-Volumen auf.

**Vorschlag Claude-Next:** Falls Founder erstmal kein Preview-Branch-Go gibt — der Scope-Check (letzter Bullet) ist 15-20 Minuten Arbeit und liefert dem Founder Entscheidungsbasis fuer Option 1 vs 2.

---

## Offene Fragen an Founder / Codex

1. **Preview-Branch-Go (Stufe 1)?** Laufende Kosten ~2-9 EUR/Monat je nach Nutzung.
2. **History-Rewrite-Go (Stufe 2, spaeter)?** Fuer Option 2 pg_dump-Konsolidierung.
3. **Codex-Vote**: Option 2 vs Option 1 langfristig — welche Prioritaet hat Historie-Erhalt?
4. **Regulatorik-Check**: Braucht IEC 62304 eine DB-Migrations-Historie fuer Audit-Trail, oder reicht Snapshot + Commit-Log?
