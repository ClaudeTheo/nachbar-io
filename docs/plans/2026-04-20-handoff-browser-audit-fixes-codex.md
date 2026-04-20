# Handoff: Browser-Audit Fixes (Codex)

**Stand 2026-04-20**, Branch `feature/hausverwaltung` HEAD `587fe9f`, lokal, kein Push.

## Ziel dieser Session

Drei Fixes aus dem Codex-Browser-Audit (`docs/plans/2026-04-20-browser-audit-ergebnis.md`) abarbeiten. Jeder Fix strikt per TDD. Am Ende ein Abschluss-Handoff schreiben. Kein Push, keine Prod-DB-Writes.

## Pflicht-Einstieg

**Wichtig zu Pfaden:** Die Pflicht-Regeln liegen im Parent-Workspace, nicht unter `nachbar-io/.claude/rules/`. Pfade beziehen sich auf den Parent-Root `C:\Users\thoma\Claud Code\Handy APP\`:

- `.claude/rules/pre-check.md` (Parent, nicht nachbar-io)
- `.claude/rules/testing.md` (Parent, nicht nachbar-io)
- `.claude/rules/db-migrations.md` (Parent, nicht nachbar-io)

Aus `nachbar-io/` cwd entsprechend `../.claude/rules/pre-check.md` lesen.

```
1. Read (Parent) docs/plans/2026-04-20-browser-audit-ergebnis.md  -> liegt unter nachbar-io/docs/plans/
2. Read (Parent) .claude/rules/pre-check.md
3. Read (Parent) .claude/rules/testing.md
4. cd nachbar-io && git status  (erwartet: feature/hausverwaltung @ 587fe9f, minor noise ok)
5. npm run dev  (Port 3000) — im Hintergrund laufen lassen
```

Zur Sicherheit lokal verifizieren bevor du loslegst:

```
ls "C:/Users/thoma/Claud Code/Handy APP/.claude/rules/"
# erwartet: db-migrations.md  pre-check.md  testing.md
```

Wenn die Regeln nicht gefunden werden: STOP, Founder melden. Nicht ohne Regeln weiterarbeiten.

## Pre-Check-Pflicht (nicht verhandelbar)

Vor jedem Fix ZUERST codebase-weit `Grep`/`Glob` auf die relevanten Stichworte. Plan ist nicht autoritativ, der Code ist autoritativ. Wenn bestehende Infrastruktur gefunden wird: STOP, Founder melden, Adapter vs. Neubau fragen. Details: Parent `.claude/rules/pre-check.md`.

Beispiele pro Fix weiter unten.

## Fix 1 — crit — Public-Info-Fehlerpfad haerten

**Problem (aus Audit):** `GET /api/housing/invitations/[token]/info` bei ungueltigem Token liefert 500 mit rohem Supabase-Fehler `Could not find the table 'public.housing_invitations' in the schema cache`. Die Landing-Page `/einladung/[token]` zeigt den internen DB-Fehler an.

**Betroffene Dateien (zu pruefen und ggf. anzupassen):**
- `app/api/housing/invitations/[token]/info/route.ts`
- `app/einladung/[token]/page.tsx`
- ggf. `lib/housing/invitations.ts` (Service-Layer-Helper)

**Pre-Check:**

```
Grep: "housing_invitations" -> welche Stellen lesen?
Grep: "PostgrestError|PGRST" -> gibt es schon einen zentralen Error-Mapper?
Grep: "invitation.*expired|invitation.*invalid" -> bestehende Fehler-UX?
Glob: app/api/housing/**/*.ts
```

**Akzeptanzkriterien:**
1. `/api/housing/invitations/[token]/info` liefert bei ungueltigem Token **404** (nicht 500).
2. Response-Body enthaelt **keine** DB-/Schema-/Table-Namen. Nur generische Meldung, z.B. `{ "error": "invitation_not_found" }` oder `{ "error": "invitation_expired" }`.
3. Page `/einladung/[token]` zeigt deutschsprachige generische Meldung: "Einladung ungueltig oder abgelaufen." — ohne technischen Fehler.
4. Schema-Cache-Fehler (Table missing, RLS-Error) werden serverseitig geloggt, aber NICHT an die Public-UI durchgereicht.

**TDD-Zyklus:**
1. **RED:** Test in `app/api/housing/invitations/__tests__/info.test.ts` (oder bestehendem Test-File — pre-checken): "returns 404 when token not found", "returns 404 when schema-error (mock)", "response body contains no internal details".
2. **GREEN:** Route-Handler: try/catch um Supabase-Call, PostgREST-Error-Code `PGRST116` (no rows) → 404, sonstige DB-Errors → 404 + `console.error(...)` serverseitig.
3. **Verify:** Vitest gruen + manuell `curl http://localhost:3000/api/housing/invitations/invalid-token-123/info` -> 404.
4. **Commit lokal:** `fix(housing): harden public invitation info error path`

## Fix 2 — med — `next=`-Parameter beim Login-Redirect

**Problem (aus Audit):** `/hausverwaltung/einladen` ohne Session leitet auf `/login` statt `/login?next=%2Fhausverwaltung%2Feinladen`. Rueckweg verloren.

**Betroffene Dateien (zu pruefen):**
- `middleware.ts` (Top-Level, zentraler Auth-Redirect)
- ggf. `app/(app)/hausverwaltung/einladen/page.tsx` (falls dort server-side redirect)

**Pre-Check (KRITISCH — nicht neu bauen):**

```
Grep: "next=|redirectTo|searchParams.*next" in middleware.ts + app/login/**
Grep: "encodeURIComponent.*pathname" -> bestehende Logik?
Read middleware.ts komplett -> wie laufen andere geschuetzte Routen?
Grep: "login\\?next" -> wird der Param irgendwo schon gebaut?
```

**Wenn es schon einen zentralen Helper gibt: den reparieren, nicht duplizieren.** Wenn `/hausverwaltung/einladen` in der Middleware-Matcher-Liste fehlt, nur ergaenzen.

**Akzeptanzkriterien:**
1. Ohne Session auf `/hausverwaltung/einladen` landet auf `/login?next=%2Fhausverwaltung%2Feinladen`.
2. Nach Login Redirect zurueck auf `/hausverwaltung/einladen`.
3. Query-Params bleiben erhalten (`/hausverwaltung/einladen?foo=bar` → `next=%2Fhausverwaltung%2Feinladen%3Ffoo%3Dbar`).
4. Das gleiche Verhalten greift auch fuer andere Housing-Routen falls existent (Grep pruefen).

**TDD-Zyklus:**
1. **RED:** Test in `__tests__/middleware.test.ts` oder neuem Test: "redirects unauthenticated request to /login with next param", "preserves query params in next".
2. **GREEN:** Middleware-Redirect bauen, pathname+search encodieren.
3. **Verify:** Vitest gruen + manuell im Browser: Inkognito `/hausverwaltung/einladen` -> URL pruefen.
4. **Commit lokal:** `fix(middleware): preserve next param on auth redirect`

## Fix 3a — Dev-Env — Mig 180 auf lokalen Supabase applyen

**Problem (aus Audit):** Codex konnte validToken-Flow nicht testen, weil `public.housing_invitations` im laufenden lokalen Supabase fehlt. Die Migration `180_housing_invitations.sql` liegt file-first im Repo, aber nicht auf Dev-Stack.

**WICHTIG — Zonen-Check:**
- Lokaler Supabase / Dev-Stack: **gruene Zone**, du darfst applyen.
- Remote Dev-Branch auf Prod-Projekt: **rote Zone** falls Branch an Prod haengt — VORHER pruefen.
- Prod: **rote Zone**, nicht anfassen.

**Pre-Check:**

```
Bash: cat nachbar-io/.env.local | grep -i supabase  (welche URL? localhost vs. *.supabase.co?)
Bash: cat nachbar-io/supabase/config.toml (falls existiert)
Read supabase/migrations/180_housing_invitations.sql
Read supabase/migrations/180_housing_invitations.down.sql
```

**Wenn lokaler Supabase (127.0.0.1 / localhost):**
```
cd nachbar-io
npx supabase migration up           # wenn Supabase-CLI mit lokalem Stack laeuft
# ODER supabase db reset            # falls Reset gewollt
```

**Wenn Dev-Stack auf Cloud zeigt:** STOP. Founder melden welchen Branch es ist, ob Apply erlaubt ist.

**Akzeptanzkriterien:**
1. `public.housing_invitations` existiert im genutzten Backend.
2. Manueller Check: `curl http://localhost:3000/api/housing/invitations/abc123/info` liefert **404 (nicht 500)** — kombiniert mit Fix 1.

**Kein Commit noetig** (keine Code-Aenderung). Nur in Abschluss-Handoff dokumentieren.

## Fix 3b — E2E-Auth-Profile refreshen (optional, nur wenn Zeit uebrig)

**Problem:** Die `.auth`-States in `reference_browser_testing.md` sind abgelaufen. Codex konnte sich nicht als Bewohner einloggen.

**Wenn Zeit uebrig:** Siehe `nachbar-io/memory/reference_browser_testing.md` + `tests/e2e/auth-setup/`. Ein bestehender Seed-Script refreshen.

**Wenn nicht:** In Abschluss-Handoff als Follow-up fuer Claude vermerken, nicht erzwingen.

## Verifikation am Ende

```
cd nachbar-io
npx tsc --noEmit        # 0 Errors erwartet
npm run test -- --run   # 0 failed erwartet, bestehende skips ok
```

Zwischen Fixes nicht nur am Ende — nach jedem GREEN einmal `npx tsc --noEmit` + gezielter `npm run test -- <pattern>`.

## Rote Zone (Founder-Go zwingend)

- `git push` (auch feature-branch) — NICHT tun.
- `apply_migration` auf **Prod** — NICHT tun.
- Mig 180 auf Cloud-Branch, wenn Dev-Stack an Prod haengt — NICHT tun.
- Billing-/Auth-/Secret-Aenderungen — nicht im Scope.
- Neue laufende Kosten — nicht im Scope.

## Was NICHT tun

- Kein Mig 181 (Policy-Fix) — kommt erst direkt vor Part B.
- Kein E2E-/Integration-Test-Ausbau ueber die drei Fixes hinaus.
- Keine Refactorings "by the way" — nur die drei Fixes + noetige Tests.
- Keine Push-Aktion.
- Keine Prosa-Strategie-Kommentare — konkrete Fixes.

## Deliverable — Abschluss-Handoff

**Genau eine Datei**, Pfad:

    docs/plans/2026-04-20-handoff-browser-audit-fixes-done.md

Pflicht-Struktur:

```
# Handoff: Browser-Audit Fixes — DONE

## Stand
- Branch, HEAD, Datum, Testergebnis (vitest + tsc)

## Fix 1 — Public-Info-Fehlerpfad
- Commit-SHA, geaenderte Dateien, Tests hinzu/angepasst
- Pre-Check-Ergebnis (was gefunden, was neu)
- Kurzer Before/After

## Fix 2 — next-Param Redirect
- Commit-SHA, geaenderte Dateien, Tests hinzu/angepasst
- Pre-Check-Ergebnis
- Kurzer Before/After

## Fix 3a — Mig 180 lokal
- Ob applyed, auf welchem Stack, Output
- ODER: Abbruch wegen Prod-Risiko, Begruendung

## Fix 3b — Auth-Profile
- Refreshed oder als Follow-up vermerkt

## Offen fuer Claude
- Was nicht gemacht wurde + warum

## Blocker / Rote Zone beruehrt
- Alles was Founder-Go brauchte
```

## Notfall-/Abbruchbedingung

- Wenn Pre-Check bestehende Infrastruktur findet, die dem Plan widerspricht: **STOP**, Abschluss-Handoff schreiben mit Befund und Optionen (Adapter vs. Neubau), keine weiteren Fixes.
- Wenn Dev-Supabase an Prod haengt: **STOP** bei Fix 3a, Fix 1 + 2 koennen trotzdem durchlaufen (die haengen nicht an lokaler DB).
- Wenn vitest-Suite zu bricht an Stelle die nicht mit den Fixes zu tun hat: nicht stumm fixen, Founder melden.

## Commit-Stil

```
fix(<scope>): <kurzbeschreibung>

- <was geaendert>
- <why>
```

Scopes: `housing`, `middleware`, `api`. Keine Co-Author-Zeile erzwingen.

## Kontext-Referenzen

- Audit-Ergebnis: `nachbar-io/docs/plans/2026-04-20-browser-audit-ergebnis.md`
- Housing-Stand: `~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/topics/housing.md` (letzter Eintrag Part H H6)
- Part-H-Commits (aus Parent cwd): `git -C nachbar-io log --oneline 5de2a58..587fe9f -- app/api/housing app/einladung 'app/(app)/hausverwaltung'`
- Pre-Check-Regel: Parent `.claude/rules/pre-check.md` (nicht in nachbar-io)
- Test-Regel: Parent `.claude/rules/testing.md` (nicht in nachbar-io)
- DB-Migrations-Regel: Parent `.claude/rules/db-migrations.md`
