# Brief: Claude → Claude (naechste Session)

**Datum:** 2026-05-09 abend (Welle F fertig)
**Owner:** claude
**Vorherige Session:** Welle E (User-Cleanup) + Welle F (Household-Cleanup + Mig 189) gepusht.

## Stand

- master (nachbar-io): `094830a` (Welle F)
- master eine Stufe vorher: `698b1ce` (Welle E, gleicher Tag)
- master vorher: `1e3eb08` (Live-Linkfix, Pass 14c)
- Push-Kette gruen, kein Drift. Vercel-Deploy-Trigger nicht relevant (workflow_dispatch only).

## Was Welle F geliefert hat (Commit 094830a)

### F.1 — Test-Households-Cleanup-Skript (read-only)

`lib/admin/test-households-cleanup-dry-run.ts` + `scripts/test-households-cleanup-dry-run.ts` + `__tests__/scripts/test-households-cleanup-dry-run.test.ts`

Vier Buckets:
1. **`syntheticTestHouseholds`** — `street_name='E2E-Testweg'` (klar synthetisch).
2. **`demoQuarterHouseholds`** — `invite_code` matcht `^[A-Z]+-TEST-` (Konvention aus Mig 125 Rheinfelden/Koeln).
3. **`whitespaceDriftHouseholds`** — `street_name !== TRIM(street_name)`. Nicht loeschen, sondern UPDATE TRIM.
4. **`streetVariants`** — Strassennamen, die kanonisch (lowercase, kein Whitespace, ß→ss, str.→strasse) gleich sind aber unterschiedlich geschrieben sind. Zaehlt Households pro Gruppe, listet Varianten.

Allowlist via ENV `TEST_HOUSEHOLDS_CLEANUP_ALLOWLIST_QUARTER_IDS` (Komma-getrennt).

8 TDD-Tests gruen, kein Execute-Pfad (Founder-Hand falls je gewuenscht).

### F.2 — Mig 189 Strassen-Trim (File-only)

`supabase/migrations/189_household_street_trim.sql` + Rollback.

Aufbau:
1. **Detect-vor-Backfill DO-Block**: `SELECT ... GROUP BY quarter_id, TRIM(street_name), house_number HAVING COUNT(*) > 1` → bei Konflikten RAISE EXCEPTION mit Sample. Founder muss zuerst manuell entscheiden, welche Variante bleibt.
2. **Backfill**: `UPDATE households SET street_name = TRIM(street_name) WHERE street_name <> TRIM(street_name)`.
3. **Trigger BEFORE INSERT/UPDATE OF street_name**: trimmt automatisch neue Eintraege.
4. **CHECK-Constraint** `street_name = TRIM(street_name)` blockt kuenftige Whitespace-Eintraege hart.

Rollback entfernt nur Trigger + Constraint (Backfill bleibt).

**Apply ist Rote Zone — Founder-Hand.**

## Verifikation Welle F

- 8 neue Tests + 18 alte (Welle D + E) = 26 cleanup-Tests gruen.
- `npx tsc --noEmit` Exit 0.
- `npx eslint <neue Files>` Exit 0.
- Commit `094830a`, Push gruen.

## Kontext: Was war Welle E (gleicher Tag, Commit 698b1ce)

- `lib/admin/ai-test-users-cleanup-dry-run.ts` erweitert um synthetische User-Patterns + Allowlist + neue Report-Felder + `--strict`/`--before` Flags.
- 13 Tests neu, 2 alte; alle 23 cleanup-Tests gruen.
- **Auto-Memory** `project_db_test_users_cleanup_gap.md` als "geloest" markiert.
- Echtes Loeschen bleibt Founder-Hand (Execute-Pfad mit `AI-TESTNUTZER LOESCHEN:<count>` Bestaetigung).

## Was naechste Woche fehlt (laut Wochenplan)

Reihenfolge: 4 → 5 (Founder) → 6 → 10 → 11 → 12

1. ~~Welle F Cleanup-Skript~~ ✓ (heute fertig)
2. ~~Welle F Mig 189 File~~ ✓ (heute fertig)
3. **Welle G: Test-Helper-Pflicht** — pending. `__tests__/_helpers/*` und Pilot-Onboarding-E2E-Setup zwingen `is_test_user=true`. Pre-Check-Schwerpunkt: alle bestehenden Test-Helper finden + sehen, wo `auth.signUp()` ohne `is_test_user`-Marker passiert.
4. **Live-Dry-Run Welle E gegen Prod-DB** — Founder-Hand. Founder zieht UUIDs der Pilot-Onboarding-Test-Konten Codex/Claude (siehe Memory `project_session_handover.md` Reality-Check), setzt `AI_TEST_CLEANUP_ALLOWLIST_USER_IDS`, fuehrt Dry-Run aus.
5. **Echt-Loeschen** — Founder-Hand. Execute-Pfad mit Bestaetigung.
6. **Mig 189 Apply gegen Prod** — Founder-Hand. Vorher in Branch testen wegen UNIQUE-Konflikt-Detection.
7. ~~Memory-Praezisierung~~ ✓ (heute fertig).
8. **Pilot-Akquise** — Founder-Hand. 5-10 Familien Bad Saeckingen, Carmen Schlachter zuerst.
9. **GmbH-Kette** — Founder-Hand. FYRST-3-Briefe → BestSign → Bank.
10. **Welle 2 Quartier-Info** — OSM POIs (laut CLAUDE.md naechster Code-Schritt).
11. **DELFI** — oeffentlicher Verkehr.
12. **Telefonie-Spike** — LiveKit + Voxtral + Mistral, 1 Tag.

## Was die naechste Session sofort tun sollte

1. Pre-Check fuer Welle G (Test-Helper-Pflicht):
   - `Glob: __tests__/_helpers/**/*.{ts,tsx}`
   - `Glob: tests/e2e/helpers/**/*.{ts,tsx}`
   - `Grep: auth.signUp\|createTestUser\|createUser` in `__tests__/` und `tests/`
   - Pruefen, welche Helper bereits `is_test_user=true` setzen.
2. Falls es viele Helper gibt: ueberlegen, ob ein **zentraler** Helper-Wrapper `__tests__/_helpers/test-user.ts` Sinn macht, der zwingend `is_test_user=true` setzt + Test-fail wenn vergessen.
3. Bei Pre-Check-Treffer von bestehender Infrastruktur: STOP + Founder-Notiz nach `.claude/rules/pre-check.md`.

## Was die naechste Session NICHT tun sollte

- Mig 189 apply'en (Rote Zone, Founder-Hand).
- Welle E Execute-Pfad starten (Rote Zone).
- Vercel-Env aendern.
- Provider-Live (Anthropic/Mistral).
- Push auf master OHNE TDD.

## Dateien-Pointer (zur schnellen Re-Orientierung)

- Cleanup-Welle E: `lib/admin/ai-test-users-cleanup-dry-run.ts`, `lib/admin/ai-test-users-cleanup-execute.ts`
- Cleanup-Welle F: `lib/admin/test-households-cleanup-dry-run.ts`
- Mig 189: `supabase/migrations/189_household_street_trim.sql`
- INBOX: `docs/plans/handoff/INBOX.md` (Welle E + F oben angefuegt)
- Auto-Memory: `~/.claude/projects/.../memory/project_db_test_users_cleanup_gap.md`, `project_prod_db_test_data_only.md` (beide aktualisiert)
- Wochenplan-Original: in der Founder-Konversation 2026-05-09 abend, nicht als File abgelegt (kein Bedarf).

## Rote Zone bei naechster Session

- master push autonom (Variante A) ✓ — wenn TDD gruen + tsc/lint + Founder-Auftrag klar.
- Vercel-Env: NEIN.
- Mig-Apply auf Prod: NEIN.
- Provider/Geld: NEIN.
- Echtes DB-Loeschen: NEIN.
