# Handoff: Local Stack + Cleanup — DONE

## Stand

- **Datum:** 2026-04-20
- **Branch:** `feature/hausverwaltung`
- **HEAD (nachbar-io):** `d96532c` (war `8ec9aeb` — 4 Commits)
- **HEAD (Parent):** `6bd3b5a` (war vorherig — 1 Commit fuer CLAUDE.md)
- **Kein Push.** Alles lokal.
- **Testergebnis:** nicht neu ausgefuehrt — nur Env/Scripts/Doku + 1 Content-Commit (datenschutz). Kein TypeScript-Check-relevanter Code geaendert.

## Aufgabe 1 — Cleanup

### Commits (nachbar-io)

| SHA | Scope | Inhalt |
|---|---|---|
| `4a4d91b` | `docs(legal)` | §5.11 KI-Assistent (Mistral AI AVV, 30-Tage-Retention, HMAC, EU AI Act Art. 50) + §6 Auftragsverarbeiter-Eintrag |
| `612586b` | `chore(gitignore)` | `.codex-*.log`, `.playwright-cli/`, `output/` ergaenzt |
| `e33e119` | `docs(plans)` | 8 Handoff-Dokumente (2026-04-20 + 2026-04-21) committed |

### Backup-SQL

`supabase/migrations/067_doctor_registration_BACKUP_DB.sql` (5369 Byte) nach `C:/Users/thoma/Claud Code/Handy APP/backups/` verschoben. Nicht mehr im Repo.

### Verifikation

`git status --short` nach Aufgabe 1 war komplett leer (abgesehen von Parent-Repo-Altlasten, die nicht im Scope waren).

## Aufgabe 2 — Local Stack (strukturell fertig, Live-Apply blockiert)

### Gewaehlte Variante

**A** (wie Nahkreis): `.env.local` = LOKAL (Default), `.env.cloud.local` = Cloud (Opt-in per `npm run dev:cloud`).

### Neue Files + Scripts (Commit `d96532c`)

| Datei | Aenderung |
|---|---|
| `supabase/config.toml` | 9 Ports auf 544xx geshiftet (Parallelbetrieb mit Nahkreis 543xx) |
| `.env.local` | komplett neu geschrieben: Supabase → `127.0.0.1:54421`, Demo-JWT-Keys, Site-URL `http://localhost:3000`. Rest (Anthropic/OpenAI/Stripe/Resend/KV/etc.) aus alter `.env.local` uebernommen, nur `\n`-Trailers entfernt. **Nicht committed** (gitignored) |
| `.env.cloud.local` | 1:1 Kopie der alten `.env.local` (Cloud-Backup). **Nicht committed** (gitignored via `.env*.local`-Pattern) |
| `.env.local.example` | neuer LOCAL-first Template fuer neue Entwickler |
| `package.json` | +6 Scripts: `dev:cloud`, `supabase:{start,stop,reset,status}`. `dev` blieb `next dev --webpack` (keine Turbopack-Umstellung, war Plan-Beispiel nicht verbindlich) |
| `scripts/dev-cloud.mjs` | neu — laedt `.env.cloud.local` via `dotenv.config({override: true})`, spawnt dann `next dev` mit vererbter process.env. Shell-Env gewinnt gegen `.env.local` (Next.js-Precedence) |
| `README.md` | komplett umgeschrieben (war Boilerplate) — dokumentiert Two-Mode-Workflow, Ports, Known-Blocker |

### Parent-Repo (Commit `6bd3b5a`)

`CLAUDE.md` — Befehle-Block erweitert um `dev:cloud` + `supabase:*`. Hinweis-Block unter dem Befehlsblock ergaenzt.

### Validierungs-Log

**`supabase start` (Versuch 1):**

```
postgres Pulled ✓ (Docker-Images heruntergeladen, ~5 GB)
Starting database...
ERROR: Bind for 0.0.0.0:54322 failed: port is already allocated
```

**Grund:** Nahkreis-Stack (`projekt-nahraum-app`) lief auf Standard-Ports.

**Fix:** `supabase/config.toml` Ports +100 geshiftet (alle 9 Vorkommen: 54320→54420, 54321→54421, ..., 54329→54429).

**`supabase start` (Versuch 2):**

```
db Skipped - Image already present locally ✓
Starting database...
Applying migration 001_initial_schema.sql ... ✓
Applying migration 002_fix_registration_rls.sql ... ✓
...
Applying migration 018_user_profile_fields.sql ... ✓
Applying migration 019_care_shared_functions.sql
ERROR: relation "care_helpers" does not exist (SQLSTATE 42P01)
  At statement: CREATE OR REPLACE FUNCTION is_care_helper_for(p_senior_id uuid)
```

**Grund:** Exakt der in `.claude/rules/db-migrations.md` dokumentierte **Prod-Drift**. `is_care_helper_for` ist eine der 5 Prod-only-Helper-Funktionen; Mig 019 erwartet Tabelle `care_helpers`, die erst in spaeterer Migration angelegt wird. Baseline `20260316125000_baseline_full_snapshot` sortiert per Dateinamen **nach** Mig 019 — Lokal erreicht Baseline nie, weil vorher bei 019 Abbruch.

**Entscheidung:** Notfallregel des Plans (Zeile 293) greift — **STOP, KEIN Fix an Migrations-Files ohne Founder-Go**. Aufgabe 2.2 (Stack live) und 2.6 (Mig 180 apply + 404-Verifikation) formal abgebrochen.

### Env-File-Loading verifiziert

```
$ node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
http://127.0.0.1:54421

$ node -e "require('dotenv').config({path:'.env.cloud.local', override:true}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
https://uylszchlyhbpbmslcnka.supabase.co
```

Beide Env-Files sind lesbar und haben die erwarteten Werte. Wrapper-Logik ist damit strukturell validiert.

### Mig 180 lokal applyed?

**NEIN.** Blockiert durch Mig-019-Drift.

### CLAUDE.md / README-Ergaenzung

- `nachbar-io/README.md`: komplette Rewrites, Two-Mode-Doku, Known-Blocker-Abschnitt.
- Parent `CLAUDE.md`: Befehle-Block erweitert + Warnhinweis.

## Offen fuer Claude (separate Session)

### Prio 1 — Drift-Strategie entscheiden

Optionen (Founder-Entscheidung noetig, nicht trivial):

1. **Baseline-Reorder:** Baseline umbenennen zu `000_baseline_full_snapshot.sql`. Alle Migrationen 001-019+ werden dann auf **bereits Prod-konformem Schema** ausgefuehrt — setzt Idempotenz voraus (`IF NOT EXISTS`), was viele alte Migrationen nicht haben. Hoher Test-Aufwand.
2. **Migrations-Konsolidierung:** Migrationen 001-172 zu einem einzigen `000_prod_snapshot.sql` verdichten (z.B. via `pg_dump --schema-only` aus Prod). Ab 173 normale History. Bricht Historie, aber Lokal-Setup funktioniert sofort.
3. **Nur-Baseline-Setup via config.toml:** `[db.migrations]` Pfad so konfigurieren dass nur Baseline + spaetere Migrationen applyen. Vermutlich nicht per config moeglich, braucht Skript.
4. **Dev-Cloud-Branch:** Supabase Preview-Branch statt lokal. Saubere Isolation, aber laufende Kosten (0,01344 EUR/h) und Founder-Go fuer Billing.

Bis Entscheidung getroffen: `npm run dev:cloud` ist der funktionierende Modus.

### Prio 2 — `.env.local`-Trailer-Newlines

Bei der Kopie-Aktion aufgefallen: viele Values der alten `.env.local` hatten literale `\n`-Trails (von Vercel-CLI-Export). Das ist in `.env.cloud.local` **erhalten geblieben** (1:1-Backup) und fuehrt zu `NEXT_PUBLIC_SUPABASE_URL` mit Newline am Ende im Cloud-Modus. Seit Monaten so live, hat offenbar nichts sichtbar gebrochen. Sauberer Fix waere `.env.cloud.local` einmal manuell saeubern — Founder-Go abwarten.

### Prio 3 — `db:types`-Script haengt an Prod

```json
"db:types": "supabase gen types typescript --project-id uylszchlyhbpbmslcnka > lib/supabase/database.types.ts"
```

Project-ID hardcoded auf Prod. Sobald Mig-019-Drift geloest ist, Variante fuer Lokal einfuehren (`--local` Flag oder separates Script `db:types:local`).

### Prio 4 — Supabase-CLI 2.83 → 2.90 Upgrade

Beim `supabase start` kam Hinweis:

```
A new version of Supabase CLI is available: v2.90.0 (currently installed v2.83.0)
```

V2.90 bringt neue API-Key-Form (`sb_publishable_*` / `sb_secret_*`). Falls das upgedatet wird: `.env.local` und `.env.local.example` auf neue Keys anpassen, Code-Seite pruefen ob Legacy-JWT noch unterstuetzt wird.

## Blocker / Rote Zone beruehrt

- **Founder-Go eingeholt:** 3 Entscheidungen via AskUserQuestion (datenschutz committen, Backup-SQL nach `../backups/`, Variante A fuer Env). Nachfrage wegen Port-Konflikt (Variante: nachbar-io auf 544xx shiften).
- **Rote Zone:** Keine beruehrt. Kein `git push`, kein `apply_migration` gegen Prod, keine neuen Kosten, keine Secret-/Billing-Aenderungen.
- **Ausnahme:** Parent-CLAUDE.md-Commit war im Parent-Repo noetig (war noch unklar im Workflow-Handover-Feld). Commit `6bd3b5a` landet nur lokal, kein Push.

## Referenzen

- Plan (Input): `docs/plans/2026-04-20-handoff-dev-supabase-local-und-cleanup.md`
- Memory (Drift-Kontext): `~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/project_supabase_prod_drift.md`
- Memory (Dev-Env vs. Prod): `~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/project_dev_env_uses_prod_supabase.md`
- Regel: `C:/Users/thoma/Claud Code/Handy APP/.claude/rules/db-migrations.md`
