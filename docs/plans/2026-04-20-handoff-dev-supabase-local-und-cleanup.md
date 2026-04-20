# Handoff: Lokaler Supabase-Stack + Working-Tree-Cleanup

**Stand 2026-04-20**, Branch `feature/hausverwaltung` HEAD `8ec9aeb`, lokal, kein Push.

## Ziel dieser Session

Zwei Aufgaben, in dieser Reihenfolge abarbeiten:

1. **Working-Tree-Cleanup** (klein, schnell, ohne Risiko).
2. **Echter lokaler Supabase-Stack** einrichten, damit Dev-Server nicht mehr gegen Prod-Cloud laeuft.

## Ausgangslage (wichtig vor dem Loslegen)

- **Dev-Env zeigt aktuell auf Prod-Cloud.** `nachbar-io/.env.local` enthaelt `NEXT_PUBLIC_SUPABASE_URL="https://uylszchlyhbpbmslcnka.supabase.co"`. Das ist der Prod-Stack. Jeder `supabase`-Befehl, jeder Dev-Server-Query trifft aktuell Produktion. Details: `~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/project_dev_env_uses_prod_supabase.md`.
- **Nahkreis-Projekt als Vorbild.** Pfad: `C:\Users\thoma\Claud Code\projekt-nahraum-app`. Dort ist `.env.local` der LOKAL-Modus, `.env.cloud.local` ist das Cloud-Backup. Diese Konvention uebernehmen.
- **Supabase-CLI 2.83.0 ist installiert** als devDependency. `supabase/config.toml` + `supabase/seed.sql` existieren schon. Fundament steht.

## Pflicht-Einstieg

```
1. Read (Parent) .claude/rules/pre-check.md
2. Read (Parent) .claude/rules/testing.md
3. Read (Parent) .claude/rules/db-migrations.md
4. Read ~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/project_dev_env_uses_prod_supabase.md
5. cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && git status --short
6. ls -la supabase/  (erwartet: config.toml, seed.sql, migrations/, functions/)
7. cat supabase/.gitignore  (sehen was schon ignoriert wird)
```

**Wichtig zu Pfaden:** Die Pflicht-Regeln liegen im Parent-Workspace, nicht in nachbar-io. Absolut: `C:\Users\thoma\Claud Code\Handy APP\.claude\rules\*.md`.

## Pre-Check-Pflicht (nicht verhandelbar)

Vor jedem neuen Skript/File codebase-weit `Grep`/`Glob`. Mindestens pruefen:

```
Glob: scripts/**/*supabase*  -> bestehende Supabase-Skripte?
Glob: scripts/**/*local*     -> bestehende Local-Setup-Skripte?
Grep: "supabase start|supabase db reset|supabase db push" in **/*.{sh,ps1,mjs,ts,js,md}
Grep: "NEXT_PUBLIC_SUPABASE_URL" in **/*.{ts,tsx,js,env*}
Read scripts/  -> welche Shell/TS-Skripte gibt es schon?
```

Wenn ein ähnliches Skript schon existiert: STOP, melden, adaptieren statt neu bauen.

## Aufgabe 1 — Working-Tree-Cleanup (XS)

Aktueller `git status` am HEAD `8ec9aeb`:

```
 M app/datenschutz/page.tsx                                                    <- unstaged, pruefen
?? .codex-dev.log                                                              <- in .gitignore ergaenzen
?? .codex-fixes-dev.log                                                        <- in .gitignore ergaenzen
?? .playwright-cli/                                                            <- in .gitignore ergaenzen
?? output/                                                                     <- in .gitignore ergaenzen
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql                   <- Backup, darf NICHT ins Repo
?? docs/plans/2026-04-20-browser-audit-ergebnis.md                             <- committen
?? docs/plans/2026-04-20-handoff-browser-audit-fixes-codex.md                  <- committen
?? docs/plans/2026-04-20-handoff-browser-audit-fixes-done.md                   <- committen
?? docs/plans/2026-04-20-handoff-session-end-hausmeister-next.md               <- committen
?? docs/plans/2026-04-20-handoff-welle-c-c8-done.md                            <- committen
?? docs/plans/2026-04-21-hausverwaltung-codex-review-antwort.md                <- committen
?? docs/plans/2026-04-21-hausverwaltung-codex-v2-antwort.md                    <- committen
```

### Schritte

**1.1 `M app/datenschutz/page.tsx` beurteilen**
- `git diff app/datenschutz/page.tsx` anschauen.
- Wenn substantielle Aenderung: Founder kurz fragen ob commit oder revert.
- Wenn trivial (Typo, Kommentar): mit eigenem Commit sauber abschliessen.
- Wenn unklar: Founder fragen, NICHT einfach committen.

**1.2 `.gitignore` erweitern**

Pre-Check: `cat .gitignore` um zu sehen was schon drin ist. Ergaenzen nur was fehlt:

```
# Codex session logs
.codex-*.log

# Playwright CLI cache
.playwright-cli/

# Local build/test output
output/
```

**1.3 Backup-SQL verschieben**

`supabase/migrations/067_doctor_registration_BACKUP_DB.sql` gehoert nicht ins Repo. Optionen:
- Loeschen (wenn nur lokales Backup ohne Wert).
- Nach `C:/Users/thoma/Claud Code/Handy APP/backups/` verschieben.
- Founder fragen.

**1.4 Docs committen**

Die `docs/plans/2026-04-20-*.md` und `2026-04-21-hausverwaltung-codex-*.md` sind Session-Artefakte mit Wert. Einzelner Commit:

```
docs(plans): Welle-C + Browser-Audit + Hausverwaltung handoffs

- Browser-Audit Ergebnis + Fixes-Handoffs (2026-04-20)
- Welle C C8 done handoff
- Session-End Hausmeister-Next handoff
- Hausverwaltung Codex Review v1+v2 Antworten
```

**1.5 Verifikation**

```
git status --short
# erwartet: nur noch gitignored Artefakte, kein untracked .md, kein Backup-SQL
```

**Akzeptanzkriterien Aufgabe 1:**
- `git status` zeigt sauberes Working-Tree (ausser bewusst ungeklaerten `app/datenschutz/page.tsx`).
- `.gitignore` ist erweitert und committet.
- Backup-SQL ist weg.
- Handoff-Docs sind committet.

## Aufgabe 2 — Lokaler Supabase-Stack (M-L)

### Ziel

Nach dieser Session koennen wir ein Feature-Development-Script starten, das:
- Dev-Server gegen lokalen Supabase (Docker-Stack, `127.0.0.1:54321`) laufen laesst,
- jede Migration gefahrlos testbar macht,
- die echte Prod-Cloud nur im expliziten `npm run dev:cloud`-Modus trifft.

### Design (vor Implementierung bestaetigen lassen)

**Naming-Konvention (Vorbild Nahkreis):**

| File | Inhalt | Rolle |
|------|--------|-------|
| `.env.local` | lokaler Stack (`127.0.0.1:54321`, Demo-Keys aus `supabase start`-Output) | **Default**, wenn `npm run dev` |
| `.env.cloud.local` | der JETZIGE `.env.local`-Inhalt (Prod-Cloud) | nur bei `npm run dev:cloud` geladen |
| `.env.local.example` | bleibt, wie heute | Template |

**Alternative wenn der Founder es vorsichtiger will:**

| File | Inhalt | Rolle |
|------|--------|-------|
| `.env.local` | JETZIGE Cloud-Werte (bleibt) | Default, zurueck-kompatibel |
| `.env.localstack` | lokaler Stack | nur bei `npm run dev:local` geladen |

**Empfehlung:** Variante A (wie Nahkreis). Grund: Default-Modus wird damit AUTOMATISCH sicher. Der Founder kann nicht mehr "aus Versehen" gegen Prod arbeiten. Wer Prod treffen will, muss explizit `dev:cloud`.

Founder MUSS diese Entscheidung treffen, bevor Code geschrieben wird. Wenn unklar: Founder fragen.

### Schritte

**2.1 Pre-Check + Design-Entscheidung einholen**

`scripts/` + `package.json` durchsehen (pre-check). Founder-Go fuer Variante A oder B.

**2.2 `supabase start` lokal testen** (erste Validierung)

```
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
npx supabase start
```

Dokumentieren welche Keys/URLs ausgegeben werden (kommt typisch `API URL http://127.0.0.1:54321`, `anon key eyJ...`, `service_role key eyJ...`).

**Wenn `supabase start` Docker-Probleme wirft:** Abbrechen, Founder melden — Rancher/Docker Desktop muss laufen.

**2.3 Neue Env-Files aufsetzen**

- `.env.cloud.local` anlegen mit der JETZIGEN Cloud-Konfiguration (Copy from `.env.local`).
- `.env.local` ersetzen durch Lokal-Werte aus Schritt 2.2.
- `.env.local.example` ueberpruefen: Demo-Keys reinschreiben damit ein neuer Entwickler sofort starten kann.
- `.env.cloud.local` in `.gitignore` aufnehmen (Sicherheit).

**2.4 `package.json`-Scripts erweitern**

Pre-Check: welche `dev`-Scripts existieren schon? (`npm run dev`, `dev:local`, `dev:cloud`?)

Neu oder umbenennen:

```json
"dev": "next dev --turbopack",                              // default: lokaler Supabase via .env.local
"dev:cloud": "cross-env DOTENV_CONFIG_PATH=.env.cloud.local next dev --turbopack",
"supabase:start": "supabase start",
"supabase:stop": "supabase stop",
"supabase:reset": "supabase db reset",
"supabase:status": "supabase status"
```

Wenn `cross-env` nicht installiert ist: `npm i -D cross-env` (gruene Zone, Dev-Dep).

**Alternative** (sauberer, weniger Abhaengigkeit): eigener Wrapper `scripts/dev-cloud.mjs`, der zuerst `.env.cloud.local` in `process.env` laedt und dann `next dev` spawnt.

**2.5 README/CLAUDE.md aktualisieren**

Im `nachbar-io/CLAUDE.md` oder `nachbar-io/README.md` einen Abschnitt "Lokaler Supabase-Stack" ergaenzen. Kurz, 10-15 Zeilen: Start, Stop, Reset, Migration-Apply lokal.

**2.6 Mig 180 lokal applyen (Validierung)**

```
npm run supabase:start
npm run supabase:reset    # oder `supabase migration up`
```

Dann:

```
npm run dev   # lokaler Stack
# http://localhost:3000/api/housing/invitations/abc123/info  -> erwartet 404 (nicht 500)
```

Damit ist der Audit-Fix-3a-Blocker geloest — lokal.

**2.7 TDD fuer neue Skripte**

Wenn ein Wrapper-Skript `scripts/dev-cloud.mjs` entsteht: Integration-Test nicht zwingend, aber mindestens manueller Smoke-Test dokumentieren (Output von `npm run dev` vs. `npm run dev:cloud`).

Wenn ein Helper in `lib/` entsteht (z.B. `lib/supabase/env.ts`): klassisch TDD mit Vitest.

**2.8 Verifikation (End-to-End)**

```
npm run supabase:stop          # lokaler Stack aus
npm run dev                    # MUSS fehlen oder Error werfen (lokaler Stack weg)
npm run supabase:start
npm run dev                    # MUSS laufen, Supabase auf 127.0.0.1:54321
npm run dev:cloud              # MUSS laufen, Supabase auf uylszchlyhbpbmslcnka
```

Screenshots / Log-Auszug im Abschluss-Handoff.

### Akzeptanzkriterien Aufgabe 2

1. `npm run dev` (Default) zeigt in Network-Tab Requests an `127.0.0.1:54321`, nicht an Cloud.
2. `npm run dev:cloud` zeigt Requests an `uylszchlyhbpbmslcnka.supabase.co`.
3. `.env.cloud.local` ist gitignored.
4. Mig 180 ist lokal applyed, `housing_invitations` existiert im lokalen Stack.
5. `npx tsc --noEmit` + `npm run test -- --run` weiterhin 0 failed.
6. CLAUDE.md oder README beschreibt den neuen Flow in kurz.

## Rote Zone (Founder-Go zwingend)

- `git push` (auch feature-branch).
- **`supabase migration up` oder `supabase db push` gegen CLOUD**. Lokal ist gruen.
- `apply_migration` MCP-Tool gegen Prod.
- Aenderung der PROD-Supabase-Keys im `.env.cloud.local`.
- Billing/Secret-Aenderungen.
- Neue laufende Kosten.

## Was NICHT tun

- Kein Mig 181 (Policy-Fix) — kommt erst direkt vor Part B.
- Keine Datei-Aenderungen in `app/` oder `lib/` ausser denen, die direkt fuer den Local-Stack noetig sind.
- Keine Test-Eskalation.
- Kein Push.

## Deliverable — Abschluss-Handoff

**Genau eine Datei**, Pfad:

    docs/plans/2026-04-20-handoff-dev-supabase-local-und-cleanup-done.md

Pflicht-Struktur:

```
# Handoff: Local Stack + Cleanup — DONE

## Stand
- Branch, HEAD, Datum, Testergebnis (vitest + tsc)

## Aufgabe 1 — Cleanup
- Commits, .gitignore-Aenderungen, Backup-SQL-Entsorgung
- Ergebnis `git status`

## Aufgabe 2 — Local Stack
- Gewaehlte Variante (A Default-lokal / B Default-cloud)
- Neue Files + Scripts
- Validierungs-Log: supabase start, dev lokal, dev:cloud
- Mig 180 lokal applyed (Ja/Nein)
- CLAUDE.md / README-Ergaenzung

## Offen fuer Claude
- Was nicht gemacht wurde + warum

## Blocker / Rote Zone beruehrt
- Was Founder-Go brauchte
```

## Notfall-/Abbruchbedingung

- Docker Desktop / Rancher laeuft nicht: Aufgabe 2 abbrechen, Founder melden. Aufgabe 1 bleibt trotzdem moeglich.
- `supabase start` findet Port 54321 besetzt: Port freimachen oder in `config.toml` anderen Port setzen, dokumentieren.
- Mig 160-180 brechen beim lokalen `db reset`: Abbrechen, Log sichern, Founder melden. KEIN Fix an Migrations-Files ohne Founder-Go.

## Commit-Stil

```
chore(dev): <kurz>

- <was geaendert>
- <why>
```

Scopes: `chore(dev)`, `chore(scripts)`, `chore(gitignore)`, `docs`.

## Kontext-Referenzen

- Memory Dev-Env-Befund: `~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/project_dev_env_uses_prod_supabase.md`
- Nahkreis-Vorbild: `C:\Users\thoma\Claud Code\projekt-nahraum-app\` (Felder `.env.local`, `.env.cloud.local`, `.env.test`)
- Audit-Ergebnis: `nachbar-io/docs/plans/2026-04-20-browser-audit-ergebnis.md`
- Pre-Check-Regel: Parent `.claude/rules/pre-check.md`
- Test-Regel: Parent `.claude/rules/testing.md`
- DB-Migrations-Regel: Parent `.claude/rules/db-migrations.md`
