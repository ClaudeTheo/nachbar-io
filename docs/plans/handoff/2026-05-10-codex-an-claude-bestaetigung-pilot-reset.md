# Codex → Claude: Bestaetigung Pilot-Reset (Read-only)

Datum: 2026-05-10
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Modus: Read-only gegen Prod-DB, keine Prod-Schreibaktion, kein Push, kein Deploy, keine Env-Aenderung.

## Ergebnis

**Pilot-Reset bestaetigt.**

Alle angeforderten Read-only-Pruefungen gegen Prod-DB stimmen mit den erwarteten Werten ueberein. Lokale Verifikation ist gruen. Code-Review der drei Reset-Commits ergab keine Blocker fuer die Bestaetigung des durchgefuehrten Resets.

Hinweis zum Git-Top: `origin/master` steht aktuell auf `b7463a9 docs(handoff): claude-an-codex Bestaetigungsauftrag fuer Pilot-Reset`; der erwartete Reset-Doku-Commit `a2e8745` liegt direkt darunter. Das ist ein Handoff-Kontextunterschied, keine Reset-Abweichung.

## Prod-DB Read-only: Erwartet vs. Tatsaechlich

### User / Founder / Synthetik

| Check | Erwartet | Tatsaechlich | Status |
|---|---:|---:|---|
| `public.users` | 1 | 1 | OK |
| `auth.users` | 1 | 1 | OK |
| Founder Email | `thomasth@gmx.de` | `thomasth@gmx.de` | OK |
| Founder ID | `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd` | `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd` | OK |
| Synthetik-Selektor Matches | 0 | 0 | OK |

### UGC-Tabellen

| Tabelle | Erwartet | Tatsaechlich | Status |
|---|---:|---:|---|
| `alerts` | 0 | 0 | OK |
| `bug_reports` | 0 | 0 | OK |
| `care_audit_log` | 0 | 0 | OK |
| `civic_audit_log` | 0 | 0 | OK |
| `heartbeats` | 0 | 0 | OK |
| `household_members` | 0 | 0 | OK |
| `invite_codes` | 0 | 0 | OK |
| `notifications` | 0 | 0 | OK |
| `organizations` | 0 | 0 | OK |
| `points_log` | 0 | 0 | OK |
| `security_events` | 0 | 0 | OK |

### Konfig-Tabellen

| Tabelle | Erwartet | Tatsaechlich | Status |
|---|---:|---:|---|
| `quarters` | 5 | 5 | OK |
| `municipal_config` | 5 | 5 | OK |
| `households` | 56 | 56 | OK |
| `feature_flags` | 50 | 50 | OK |

### `care_audit_log` Trigger

| Trigger | Erwartet `tgenabled` | Tatsaechlich `tgenabled` | Status |
|---|---|---|---|
| `no_audit_delete` | `O` | `O` | OK |
| `no_audit_update` | `O` | `O` | OK |

## Lokale Verifikation

```text
npx vitest run __tests__/admin/pilot-reset-users-cleanup.test.ts
Test Files  1 passed (1)
Tests       11 passed (11)
```

```text
npx tsc --noEmit
Exit 0
```

```text
npm run lint
eslint clean
```

```text
git fetch origin
git log origin/master --oneline -5
b7463a9 docs(handoff): claude-an-codex Bestaetigungsauftrag fuer Pilot-Reset
a2e8745 docs(cleanup): UGC-Reset-Nachtrag fuer Pilot-Vorbereitung
70fa5e2 docs(cleanup): Pilot-Reset Prod-User-DELETE — 1183->1, Founder erhalten
a8ee62e feat(admin): pilot-reset users cleanup helper (Founder-Allowlist)
b6830c1 docs(handoff): claude-to-claude handover after Wave H+I+J
```

## Code-Review der drei Commits

### `a8ee62e feat(admin): pilot-reset users cleanup helper (Founder-Allowlist)`

Geprueft:

- `PILOT_RESET_FOUNDER_ALLOWLIST = ["thomasth@gmx.de"]` ist lowercase.
- Kandidatenbildung vergleicht `user.email?.toLowerCase()` gegen die Allowlist.
- Confirmation-Token ist exakt `PILOT-RESET-LOESCHEN:<count>`.
- Ablauf im Helper: Referenztabellen → `public.users` → `auth.users` via `authAdmin.deleteUser`.
- Tests decken lowercase, mixed-case `ThomasTh@gmx.de`, uppercase `THOMASTH@GMX.DE`, `additionalAllowlistEmails`, leere IDs, Confirmation-Mismatch, `requireFounderPresent`, Referenzdelete-Fehler und Null-Kandidaten ab.

Review-Kommentar:

- Kein Blocker fuer den bestaetigten Reset.
- Residual Risk fuer Wiederverwendung: Der TS-Helper enumeriert Kandidaten aus `public.users`. Falls kuenftig auth-only User ohne public-Profil existieren, wuerde dieser Helper sie nicht selbst als Kandidaten listen. Der tatsaechliche durchgefuehrte MCP-SQL-Reset hat `auth.users` separat auf 1 verifiziert, daher ist das fuer den hier bestaetigten Reset kein Befund.

### `70fa5e2 docs(cleanup): Pilot-Reset Prod-User-DELETE — 1183->1, Founder erhalten`

Geprueft:

- Doku enthaelt Founder-Go, Vor-/Nach-Stand und den Audit-Trail.
- Beschreibt temporaeres Disable/Enable der `care_audit_log`-Trigger.
- Beschreibt `prevention_*`-TRUNCATE, NO-ACTION-FK-Loop, `registered_by`-NULLing, SET-NULL/NOT-NULL-Konflikt-Tabellen, `public.users`-DELETE und `auth.users`-DELETE.
- Nachverifikation in der Doku passt zu den heute read-only verifizierten Werten.

Review-Kommentar:

- Kein Blocker. Doku ist als Audit-Trail konsistent mit den Read-only-Counts.

### `a2e8745 docs(cleanup): UGC-Reset-Nachtrag fuer Pilot-Vorbereitung`

Geprueft:

- Doku ergaenzt UGC-TRUNCATE-Nachtrag und benennt ausgeschlossene Konfig-/Systemtabellen.
- Read-only-Checks bestaetigen die angeforderten UGC-Tabellen leer.
- Read-only-Checks bestaetigen die angeforderten Konfig-Tabellen erhalten.
- `care_audit_log`-Trigger sind wieder aktiv (`O`/`O`).

Review-Kommentar:

- Kein Blocker. UGC-Reset-Zielzustand ist read-only bestaetigt.

## Ausgefuehrte Prod-Abfragen

Nur `SELECT`-Abfragen per `npx supabase db query --linked --output json`:

- User-/Founder-Counts
- Synthetik-Selektor-Count
- UGC-Tabellen-Counts
- Konfig-Tabellen-Counts
- `pg_trigger`-Status fuer `care_audit_log`

Es wurden keine `DELETE`, `UPDATE`, `INSERT`, `TRUNCATE`, Migrationen, Env-Aenderungen, Pushes oder Deploys ausgefuehrt.

