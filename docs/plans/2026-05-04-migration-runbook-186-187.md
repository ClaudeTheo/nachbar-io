# Migration-Runbook 186/187

Stand: 2026-05-04, nach Deploy von `6fb8cdd fix(care): hash emergency pdf tokens`

## Ziel

Dieses Runbook bereitet das kontrollierte Anwenden von zwei Prod-Migrationen
vor, ohne sie in diesem Schritt auszufuehren:

| Migration | Zweck | Status |
|---|---|---|
| `186_carecircle_rls_bridge.sql` | Bestehende Care-RLS-Helferfunktionen erkennen aktive `caregiver_links` zusaetzlich zu Legacy-`care_helpers`. | Datei committed, nicht angewendet |
| `187_emergency_pdf_token_hash.sql` | Notfallmappe-PDF-/QR-Tokens nur noch gehasht speichern und alte Klartextwerte leeren. | Datei committed, Code live vorbereitet, nicht angewendet |

## Harte Grenzen

Nicht ohne separaten, eindeutigen Founder-Go-Satz:

- kein Prod-DB-Write
- kein `apply_migration`
- kein SQL `INSERT`, `UPDATE`, `ALTER`, `CREATE`, `DROP` gegen Prod
- kein `schema_migrations`-Insert
- keine Vercel-Env-Aenderung
- keine Secrets lesen, ziehen, drucken oder kopieren

Dieses Runbook selbst ist nur Doku.

## Warum die Reihenfolge wichtig ist

1. Der Code fuer Migration 187 ist bereits live auf Production:
   `dpl_EuZGjgutc2tGwmd7me6bVr55Tdwm`, Commit `6fb8cdd`.
2. Der live Code versucht zuerst `pdf_token_hash`.
3. Solange die Spalte fehlt, faellt er migrationskompatibel auf Legacy-`pdf_token`
   zurueck.
4. Nach Migration 187 kann der Fallback faktisch ungenutzt bleiben, weil neue
   und bestehende QR-Token ueber Hash laufen.

Migration 186 und 187 sind fachlich unabhaengig. Fuer Tag-X ist diese Reihenfolge
am ruhigsten:

1. Preflight read-only
2. Migration 186 anwenden
3. Migration 186 read-only verifizieren
4. Migration 187 anwenden
5. Migration 187 read-only verifizieren
6. Unauthentifizierter App-Smoke
7. Erst danach weitere Pilot-Schritte

## Exakte Founder-Go-Saetze

Codex darf die Prod-DB nur anfassen, wenn Thomas einen dieser Saetze in der
aktuellen Session schreibt:

| Go-Satz | Erlaubt |
|---|---|
| `MIGRATION-PROD-GO-186` | Nur Migration 186 auf Prod anwenden und read-only verifizieren. |
| `MIGRATION-PROD-GO-187` | Nur Migration 187 auf Prod anwenden und read-only verifizieren. |
| `MIGRATION-PROD-GO-186-187` | Migration 186, dann 187 in genau dieser Reihenfolge anwenden und read-only verifizieren. |

Alles andere, etwa "mach weiter" oder "go dafuer", reicht fuer Prod-DB nicht.

## Preflight vor Apply

### 1. Git- und Deploy-Stand pruefen

Lokal:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/master
```

Pass:

- `HEAD` und `origin/master` zeigen auf denselben Commit.
- Nur bekannte alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid`
  sind sichtbar.

Production-Meta read-only:

```powershell
vercel list --format json --status READY --environment production --yes
```

Pass:

- neuester Production-Deploy zeigt `githubCommitSha = 6fb8cdd...`
- Alias `https://nachbar-io.vercel.app` ist auf den neuesten Deploy gesetzt.

### 2. App-Smoke vor Apply

```powershell
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/health" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/messages" -Method GET -SkipHttpErrorCheck
```

Pass:

| Route | Erwartung |
|---|---|
| `/` | 200 |
| `/api/health` | 200, Body `{"status":"ok"}` |
| `/api/messages` | 503 Closed-Pilot |

### 3. Prod-DB read-only Vorabfragen

Nur read-only:

```sql
select version, name
from supabase_migrations.schema_migrations
where version in ('186', '187')
order by version;
```

Pass vor Apply:

- keine Zeile fuer 186, wenn 186 noch offen ist
- keine Zeile fuer 187, wenn 187 noch offen ist

Read-only fuer 186:

```sql
select
  proname,
  pg_get_functiondef(oid) as definition
from pg_proc
where proname in ('is_care_helper_for', 'care_helper_role')
order by proname;
```

Pass vor Apply:

- Funktionen existieren oder werden durch 186 neu ersetzt.
- Wenn `caregiver_links` in der Definition bereits vorkommt, ist 186 eventuell
  schon manuell gesetzt. Dann stoppen und Drift dokumentieren, nicht blind applyen.

Read-only fuer 187:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'emergency_profiles'
  and column_name in ('pdf_token', 'pdf_token_hash', 'pdf_token_expires_at')
order by column_name;
```

Pass vor Apply:

- `pdf_token` existiert.
- `pdf_token_hash` fehlt oder ist noch leerer Drift-Stand.

Optional count-only, keine Token-Werte ausgeben:

```sql
select
  count(*) filter (where pdf_token is not null) as cleartext_token_rows,
  count(*) filter (where pdf_token_hash is not null) as hashed_token_rows
from public.emergency_profiles;
```

Pass:

- Zahlen sind plausibel dokumentiert.
- Keine Token-Werte werden ausgegeben.

## Apply 186

Nur nach `MIGRATION-PROD-GO-186` oder `MIGRATION-PROD-GO-186-187`.

Datei:

```text
supabase/migrations/186_carecircle_rls_bridge.sql
```

Wirkung:

- ersetzt `public.is_care_helper_for(uuid)`
- ersetzt `public.care_helper_role(uuid)`
- Legacy-`care_helpers` hat Vorrang
- aktive `caregiver_links` werden als Fallback akzeptiert
- `relationship_type = 'volunteer'` wird auf `neighbor` gemappt
- alle anderen aktiven Beziehungen werden auf `relative` gemappt

### 186 Verify read-only

```sql
select
  proname,
  pg_get_functiondef(oid) as definition
from pg_proc
where proname in ('is_care_helper_for', 'care_helper_role')
order by proname;
```

Pass:

- Beide Definitionen enthalten `caregiver_links`.
- Beide Definitionen enthalten `revoked_at is null`.
- `care_helper_role` enthaelt das Mapping `volunteer -> neighbor`.

Wenn Supabase-Migrations-Tracking genutzt wurde:

```sql
select version, name
from supabase_migrations.schema_migrations
where version = '186';
```

Pass:

- Eine Zeile fuer 186 ist vorhanden.

## Apply 187

Nur nach `MIGRATION-PROD-GO-187` oder `MIGRATION-PROD-GO-186-187`.

Datei:

```text
supabase/migrations/187_emergency_pdf_token_hash.sql
```

Wirkung:

- aktiviert `pgcrypto` falls noetig
- fuegt `public.emergency_profiles.pdf_token_hash` hinzu
- hasht bestehende `pdf_token`-Werte per SHA-256
- legt partiellen Unique-Index auf `pdf_token_hash` an
- setzt bestehende Klartext-`pdf_token`-Werte nach Backfill auf `null`
- kommentiert Legacy-Spalte und Hash-Spalte

### 187 Verify read-only

Spalte:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'emergency_profiles'
  and column_name in ('pdf_token', 'pdf_token_hash', 'pdf_token_expires_at')
order by column_name;
```

Pass:

- `pdf_token_hash` existiert als `text`.
- `pdf_token` existiert noch als Legacy-Spalte.

Index:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'emergency_profiles'
  and indexname = 'emergency_profiles_pdf_token_hash_idx';
```

Pass:

- Index existiert.
- Index ist auf `pdf_token_hash`.
- Index ist partiell mit `where pdf_token_hash is not null`.

Keine Klartext-Token mehr:

```sql
select
  count(*) filter (where pdf_token is not null) as cleartext_token_rows,
  count(*) filter (where pdf_token_hash is not null) as hashed_token_rows
from public.emergency_profiles;
```

Pass:

- `cleartext_token_rows = 0`.
- `hashed_token_rows` ist groesser/gleich der Zahl der vorher vorhandenen
  Klartext-Tokens, falls vorher welche existierten.

Migrations-Tracking:

```sql
select version, name
from supabase_migrations.schema_migrations
where version = '187';
```

Pass:

- Eine Zeile fuer 187 ist vorhanden, wenn der Apply-Pfad das Migrationstracking
  schreibt.

## App-Smoke nach Apply

Unauthentifiziert:

```powershell
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/health" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/messages" -Method GET -SkipHttpErrorCheck
```

Pass:

| Route | Erwartung |
|---|---|
| `/` | 200 |
| `/api/health` | 200 |
| `/api/messages` | 503 Closed-Pilot |

Authentifizierter QR-Smoke nur mit synthetischem Testnutzer und separatem Go:

1. Notfallmappe fuer Testnutzer erzeugen.
2. QR/PDF-Token neu generieren.
3. `/notfall/<token>` oeffnen.
4. Prüfen: Notfall-Banner zeigt 112 zuerst, Level-1-Daten rendern.
5. Danach Testdaten wieder sauber dokumentiert behandeln.

Ohne synthetischen Testnutzer-Go reicht die DB-Verifikation oben.

## Rollback / Stopps

### Wenn Apply 186 fehlschlaegt

Stoppen:

- Keine 187 hinterherschieben.
- Fehlermeldung dokumentieren.
- Keine Down-Migration ohne separaten Founder-Go.

186 ist `create or replace function`; ein Rollback braucht eine bekannte
Vorversion der Funktionen. Wenn die Prod-Funktionen vor Apply nicht gesichert
wurden, nicht improvisieren.

### Wenn Apply 187 fehlschlaegt vor dem `update pdf_token = null`

Stoppen:

- Keine weiteren SQL-Schreibaktionen.
- Fehler dokumentieren.
- Read-only pruefen, ob `pdf_token_hash` teilweise befuellt wurde.

### Wenn Apply 187 fehlschlaegt nach dem `update pdf_token = null`

Stoppen und eskalieren:

- Nicht versuchen, Klartext-Tokens wiederherzustellen.
- Bestehende QR-Codes koennen ungueltig werden, wenn Hash-Backfill nicht
  korrekt abgeschlossen wurde.
- Entscheidung: erneuter Hash-Fix, App-Rollback oder neue QR-Codes fuer
  betroffene Test-/Pilotprofile.

### Down-Migration 187

Datei:

```text
supabase/rollbacks/187_emergency_pdf_token_hash.down.sql
```

Nur mit separatem Founder-Go nutzen. Sie entfernt `pdf_token_hash` und den
Index, stellt aber geloeschte Klartext-Tokens nicht wieder her. Deshalb ist sie
kein vollstaendiger Daten-Rollback.

## Nach erfolgreichem Apply

Dokumentieren:

- Zeitpunkt
- Wer gab Go
- welcher Apply-Pfad genutzt wurde
- Ergebnis der read-only SQL-Smokes
- Ergebnis des App-Smokes
- ob 186/187 in `schema_migrations` sichtbar sind

INBOX aktualisieren:

- Migration-Runbook bleibt `done`.
- Neuer Eintrag fuer `Migration 186/187 Prod-Apply` mit Status `done` oder
  `blocked`, je nach Ergebnis.

## Kurzfazit

- Code fuer 187 ist live und migrationskompatibel.
- 186 kann CareCircle-RLS-Drift schliessen.
- 187 kann F-1 endgueltig schliessen.
- Beide Applies bleiben rote Zone bis zum exakten Founder-Go.
