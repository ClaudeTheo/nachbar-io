# Brief: Claude → Claude (naechste Session) — Welle G fertig

**Datum:** 2026-05-09 abend (Welle G fertig nach Welle E + F)
**Owner:** claude
**Vorherige Session:** Welle E (User-Cleanup) + Welle F (Household-Cleanup + Mig 189) → Welle G (Test-Helper-Pflicht).

## Stand

- master (nachbar-io): `dab4632` (Welle G — gepusht).
- master eine Stufe vorher: `857582b` (Handover-Doku Welle E+F).
- Push gruen, kein Drift, Vercel-Deploy weiterhin nur via `workflow_dispatch`.

## Was Welle G geliefert hat (Commit dab4632)

### G.1 — Zentraler E2E-Auth-User-Helper

`tests/e2e/helpers/test-user-factory.ts` mit zwei Exports:

- `createTestAuthUser({ email, password, testKind? })` — POST auf `/auth/v1/admin/users` mit ENV-injizierbarem Service-Role-Key. Setzt **hart** `is_test_user=true` in `app_metadata` UND `user_metadata`. Bei "already been registered" reuses via `signInWithPassword` und liefert `{reused:true}`. Wirft bei fehlenden ENVs oder unerwarteten HTTP-Errors.
- `upsertTestUserProfile({ userId, displayName, email?, role?, ... extraSettings? })` — POST auf `/rest/v1/users` mit `Prefer: merge-duplicates`. `settings.is_test_user=true` wird **nach** dem Spread von `extraSettings` gesetzt — Override mit `false` schlaegt nicht durch. Defaults: ui_mode=active, role=resident, trust_level=verified, is_admin=false.

Beide Funktionen nehmen `deps?: { fetch, supabaseUrl, serviceKey }` fuer Vitest-Mocks.

### G.2 — Vitest-Mock-Builder

`__tests__/_helpers/test-user-builder.ts` exportiert `buildTestUser(options?)`. Liefert ein TestUser-Objekt mit `settings.is_test_user=true` als Pflicht. IDs/Emails sind unique pro Aufruf (`Date.now().toString(36)-counter`).

### G.3 — TDD-Tests (17 neu)

- `__tests__/tests-e2e-helpers/test-user-factory.test.ts` — 12 Tests fuer createTestAuthUser (Happy-Path, testKind, reuse, ENV-Errors, HTTP-Errors) + upsertTestUserProfile (Happy-Path, Override-Hardening, testKind, Defaults, HTTP-Errors).
- `__tests__/_helpers/test-user-builder.test.ts` — 7 Tests fuer buildTestUser (Defaults, Override-Hardening, unique IDs).

RED → GREEN sauber gelaufen (RED bestaetigt durch "Failed to resolve import").

### G.4 — Bestehende Aufrufer auf den Helper umgestellt

- `tests/e2e/helpers/db-seeder.ts` — `createAuthUser` (privat) ruft jetzt `createTestAuthUser`. `seedAgent`-Profile-Insert nutzt `upsertTestUserProfile` mit `testKind:"e2e_seed"` und `extraSettings:{ onboarding_completed:true }`. PATCH-Fallback bleibt fuer Trigger-/Duplicate-Faelle.
- `tests/e2e/scenarios/s11-memory.spec.ts` — `getOrCreateTestUser` nutzt nur noch den Helper, keine direkten fetch-Calls mehr.
- `scripts/create-test-users.ts` — Auth + Profil via Helper.
- `scripts/seed-demo-quarter.ts` — Auth + Profil via Helper, Zusatzfelder (first_name/last_name/quarter_id) bleiben separat.
- `scripts/ai-test-runner.mjs` — kann TS-Helper nicht importieren; Pflicht-Marker (`app_metadata`/`user_metadata` + `settings.is_test_user`) inline mit Welle-G-Kommentar gesetzt.

## Verifikation Welle G

- `npx tsc --noEmit` → Exit 0 (1 TS-Fix: `PASSWORD: string` nach Narrowing).
- `npx eslint <changed>` → 0 Errors (3 ignore-Warnings fuer `tests/e2e/`-Files normal).
- `npx vitest run __tests__/tests-e2e-helpers/test-user-factory.test.ts __tests__/_helpers/test-user-builder.test.ts __tests__/scripts/ai-test-users-cleanup-dry-run.test.ts __tests__/scripts/ai-test-users-cleanup-execute.test.ts __tests__/scripts/test-households-cleanup-dry-run.test.ts` → 5 Files, **43/43 Tests gruen**.
- Commit `dab4632`, Push erfolgreich.

## Pre-Check-Befund (zur Doku)

| Plan fordert | Existierte bereits |
|---|---|
| Zentraler E2E-Auth-Helper | TEILWEISE — `tests/e2e/helpers/db-seeder.ts:37-96` `createAuthUser()` (privat, OHNE is_test_user) |
| Vitest-Mock-Builder | NUR Typen — `__tests__/_helpers/mock-types.ts` |
| `is_test_user=true` Pflicht | FEHLTE in allen Test-Helpern |
| Spec-/Script-Direktcalls auf Helper | umgangen in 4 Stellen (siehe G.4) |

Kein Duplikat-Risiko, sondern Konsolidierung mit echtem Mehrwert (Pflichtmarker an der Quelle).

## Was naechste Woche fehlt

Reihenfolge: 4 → 5 (Founder) → 6 → 10 → 11 → 12 (aus Welle-F-Brief).

1. ~~Welle F Cleanup-Skript~~ ✓
2. ~~Welle F Mig 189 File~~ ✓
3. ~~Welle G Test-Helper-Pflicht~~ ✓ (heute)
4. **Live-Dry-Run Welle E gegen Prod-DB** — Founder-Hand. Founder zieht UUIDs der Pilot-Onboarding-Test-Konten Codex/Claude, setzt `AI_TEST_CLEANUP_ALLOWLIST_USER_IDS`, fuehrt Dry-Run aus.
5. **Echt-Loeschen** — Founder-Hand. Execute-Pfad mit Bestaetigung `AI-TESTNUTZER LOESCHEN:<count>`.
6. **Mig 189 Apply gegen Prod** — Founder-Hand. Vorher in Branch testen wegen UNIQUE-Konflikt-Detection.
7. **Pilot-Akquise** — Founder-Hand. 5-10 Familien Bad Saeckingen, Carmen Schlachter zuerst.
8. **GmbH-Kette** — Founder-Hand. FYRST-3-Briefe → BestSign → Bank.
9. **Welle 2 Quartier-Info** — OSM POIs.
10. **DELFI** — oeffentlicher Verkehr.
11. **Telefonie-Spike** — LiveKit + Voxtral + Mistral, 1 Tag.

## Was die naechste Session sofort tun sollte

Wenn nicht weiter mit Welle E/F-Founder-Hand: nimm Welle 2 (OSM POIs) oder DELFI vom Wochenplan. Pre-Check zuerst — `Glob: nachbar-io/lib/quartier-info/**`, `Grep: osm|overpass|delfi`.

Wenn ein neuer E2E-Test erstellt wird: **NIE** mehr direkt `auth.admin.createUser` oder `fetch /auth/v1/admin/users` — IMMER `createTestAuthUser` aus `tests/e2e/helpers/test-user-factory.ts`. Profile via `upsertTestUserProfile`. Mock-User in Vitest-Tests via `buildTestUser` aus `__tests__/_helpers/test-user-builder.ts`.

## Was die naechste Session NICHT tun sollte

- Mig 189 apply'en (Rote Zone).
- Welle E Execute-Pfad starten (Rote Zone).
- Vercel-Env aendern.
- Provider-Live (Anthropic/Mistral).
- Push auf master OHNE TDD.

## Dateien-Pointer

- Helper: `tests/e2e/helpers/test-user-factory.ts`, `__tests__/_helpers/test-user-builder.ts`
- Tests: `__tests__/tests-e2e-helpers/test-user-factory.test.ts`, `__tests__/_helpers/test-user-builder.test.ts`
- Konsumenten: `tests/e2e/helpers/db-seeder.ts`, `tests/e2e/scenarios/s11-memory.spec.ts`, `scripts/create-test-users.ts`, `scripts/seed-demo-quarter.ts`, `scripts/ai-test-runner.mjs`
- Cleanup-Welle E+F (kontextuell): `lib/admin/ai-test-users-cleanup-*.ts`, `lib/admin/test-households-cleanup-dry-run.ts`, `supabase/migrations/189_household_street_trim.sql`

## Rote Zone bei naechster Session

- master push autonom (Variante A) ✓ — wenn TDD gruen + tsc/lint + Founder-Auftrag klar.
- Vercel-Env: NEIN.
- Mig-Apply auf Prod: NEIN.
- Provider/Geld: NEIN.
- Echtes DB-Loeschen: NEIN.
