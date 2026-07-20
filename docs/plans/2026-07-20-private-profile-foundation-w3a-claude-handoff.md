# Claude-Handoff: Welle 3A – privates Profilfundament, Review-Fixes

**Datum:** 2026-07-20

**Branch:** `codex/private-profile-foundation-w3`

**Basis:** `origin/master` bei `07466940781131dde1fce9e1272ea2d080b71621`

**Review-Ausgang:** Claude-Gate auf `e50e555`: 5 P1 + 2 P2

**Status:** alle sieben Funde lokal test-first behoben; Draft-PR #113 für erneutes Claude-Review; kein Supabase-Branch-Test, Prod-Apply, Merge oder Deploy

## Ergebnis

Migration 204 bleibt additiv und wurde in place korrigiert; es gibt keine Migration 205.

- `user_public_profiles.user_id` hängt jetzt an `auth.users(id) ON DELETE CASCADE`. Damit überlebt die Projektion den ersten Schritt von `gdpr_delete_user()` (`DELETE public.users`) und endet erst mit dem anschließenden Auth-Lifecycle.
- Die vier Owner-Policies von `discovery_profiles` haben `DROP POLICY IF EXISTS`-Guards und lassen sich erneut anwenden.
- Der lokale Seed erzeugt für seine 18 synthetischen `public.users` zuerst passende `auth.users`-Anker, ohne Login-Daten anzulegen.
- Expertenliste und -detail, Ärzteverzeichnis sowie Vouching verwenden für ihre öffentliche Discovery-/Vertrauensfunktion wieder den bestehenden quartierslesbaren `users`-Pfad mit eng begrenzten Spalten.
- Experten werden für unverbundene Quartiersmitglieder wieder angezeigt; `trust_level` und Verifizierungsbadge sind echt statt hart auf `new` gesetzt.
- Marktplatz, Leihbörse, Fundbüro, Umfragen und Paketannahme rendern bei RLS-leerer privater Projektion neutral `Nachbar`.
- Das S7-Inventar prüft nun zusätzlich `/experts` und `/care/aerzte`; `/marketplace` war bereits enthalten.

## Pflicht-Pre-Check

### Namenspfad

Codebase-weit existiert `public.get_display_names(uuid[])` aus Migration 167. Der Helper ist für Vouching nicht geeignet: Er liefert Namen ausschließlich bei akzeptiertem `contact_links`-Kontakt oder gemeinsamer Chat-Gruppe. Noch unverbundene, zu bestätigende Nachbarn würden damit weiterhin namenlos bleiben. Vouching verwendet deshalb keinen neuen RPC, sondern den bereits per `users_quarter_select` quartiersbeschränkten Join.

### GDPR-Topologie

`20260529140000_gdpr_deletion_cascade.sql` löscht in `gdpr_delete_user()` zuerst nur `public.users`; der Service löscht `auth.users` danach separat. `board_comments`, `shared_meals` und `tip_reviews` sind Auth-verankerte Consumer. Mit der bisherigen Profil-FK zu `public.users` wurde die Profilzeile zu früh kaskadiert und die neuen Bridge-FKs blockierten die Löschung. Die Verankerung an `auth.users` teilt nun den korrekten Consumer-Lifecycle, ohne 35 einzelne Bridge-FKs umzubauen.

## Diff der Review-Fixes

### Migration und Rollback

- `supabase/migrations/204_private_profile_foundation.sql`
  - Profil-FK: `auth.users(id) ON DELETE CASCADE`
  - vier idempotente Discovery-Policy-Guards
  - RLS, GRANTs, `adult_attested_at`, Trigger und private Beziehungsprojektion ansonsten unverändert
- `supabase/rollbacks/204_private_profile_foundation.down.sql`
  - bestehender atomarer Drop entfernt den Auth-Lifecycle-FK zusammen mit der Projektion
- `supabase/seed.sql`
  - lokale synthetische Auth-Anker vor den 18 Public-User-Zeilen
- `tests/sql/204_private_profile_foundation.sql`
  - echte GDPR-Fixture mit `board_comments`, `shared_meals` und `tip_reviews`
  - prüft erfolgreichen Public-Delete, Fortbestand der Projektion bis zum Auth-Delete und anschließende vollständige Kaskade

### Öffentliche Discovery-/Vertrauensflächen

Diese Flächen sind bewusst keine private soziale Beziehung und bleiben bis Welle 5 auf dem bestehenden quartierslesbaren `users`-Pfad:

- `app/(app)/experts/page.tsx`: `id, display_name, avatar_url, trust_level, created_at`
- `app/(app)/experts/[userId]/page.tsx`: `id, display_name, trust_level, created_at`; kein `select("*")`
- `app/api/doctors/route.ts`: `id, display_name, avatar_url`
- `lib/services/vouching.service.ts`: `id, display_name, trust_level`

Der Consumer-Guard führt diese Dateien in einem eigenen kommentierten Allowlist-Block. Private soziale Flächen bleiben auf `user_public_profiles`.

## RED → GREEN

### RED

- Gezielter Vitest-Lauf: **7 Fehlschläge / 26 Tests**
  - Profil-FK noch an `public.users`
  - vier Discovery-Policies nicht idempotent
  - Expertenbadge hart `new`
  - Arzt- und Vouching-Namen bei unverbundenen Personen leer
  - öffentliche Leser nicht eng genug bzw. falsche Quelle
  - fünf fehlende Autoren-Fallbacks
- SQL-GDPR-Test: exakter Abbruch in `gdpr_delete_user()` an `board_comments_user_public_profile_fkey`.
- Erster vollständiger Replay nach dem FK-Fix: Seed-RED, weil lokale synthetische Public-User noch keine Auth-Anker hatten.

### GREEN

- Gezielte Review-Suite: **26/26** grün.
- Migration-/Seed-Regression: **9/9** grün.
- `tests/sql/204_private_profile_foundation.sql`: grün nach beiden vollständigen Resets sowie nach direktem Reapply und Rollback → Reapply.
- `npx supabase db reset --local`: **zweimal vollständig grün** bis Migration 204 inklusive Seed.
- Migration 204 direkt auf bereits angewandtem Stand: grün.
- Rollback 204 → Reapply 204: grün.
- DB-Introspektion: `user_public_profiles_user_id_fkey` zeigt `auth.users` + Delete-Regel `CASCADE`.
- `npx vitest run`: **5.355 bestanden, 1 bestehender Skip**.
- `npx tsc --noEmit`: grün.
- `npm run lint`: grün.
- `npm run build`: grün; 246 Seiten generiert.
- `git diff --check`: grün.
- `node scripts/generate-policy-inventory.mjs`: 567 Policies, 38 Trigger, 632 Grant-Zeilen, nur `spatial_ref_sys` ohne RLS; erzeugte Datei ist byte-identisch zur eingecheckten Fassung.

### Playwright

- Auth-Setup: **10 Setup-/Auth-Tests bestanden**, die drei neuen Seitentests starteten nicht, weil im isolierten Worktree kein `.auth/nachbar_a.json` erzeugt werden konnte: lokale Supabase-URL und Anon-Key fehlen in `.env.local`.
- S7-Redirect-Smoke: ebenfalls lokal nicht aussagekräftig; ohne dieselben Prozesswerte erzeugen Supabase-Client-Routen 500er und der Lauf überschreitet beim Kompilieren der erweiterten Routen die 60-Sekunden-Grenze.
- Es wurde keine ENV-/Secret-Datei angelegt, kopiert oder geändert. CI muss den erweiterten S7-Scope (`/marketplace`, `/experts`, `/care/aerzte`) mit seiner lokalen Supabase-Konfiguration bestätigen.

## Security-Mini-Audit

### Ergebnis: 0 CRITICAL / 0 HIGH

- **FK-Reanchoring:** ändert nur den Lösch-Lifecycle. Es fügt weder SELECT/INSERT/UPDATE/DELETE-Rechte noch eine Policy oder einen RPC hinzu. Die bestehende RLS von `user_public_profiles` bleibt byte-identisch.
- **GDPR-Reihenfolge:** `gdpr_delete_user()` kann `public.users` löschen, während die Profilprojektion bis zum nachgelagerten Auth-Delete bestehen bleibt. Der Auth-Delete kaskadiert Projektion und Auth-Consumer im selben Statement.
- **Öffentliche Namensleser:** exponieren ausschließlich die oben genannten Minimalspalten und laufen durch die bestehende Policy `users_quarter_select`; kein Service-Role-Bypass und kein neuer Definer-Pfad.
- **Vouching:** `get_display_names` wird bewusst nicht zweckentfremdet. Quartier-Isolation bleibt der vorhandene `users!inner`-/Household-Pfad; der Name-Fallback greift nur bei tatsächlich leerem Ergebnis.
- **Discovery:** `adult_attested_at`, Own-only-RLS, opake ID, serverseitige Quartiersableitung und Browser-Spaltenrechte sind unverändert. Die neuen `DROP POLICY IF EXISTS`-Zeilen ändern keine Semantik.
- **Overfetch:** Experten-Detail liest nicht mehr `users.*`; Ärzte, Experten und Vouching lesen kein `settings`, `phone`, `is_admin`, E-Mail- oder Adressfeld.
- **Unverändert:** Notfallregel 112/110, Invite-Grenzen, RLS anderer Tabellen und Verbot von Adressdaten im Client-State.

## Welle-3B-/Welle-5-Abhängigkeit

`users_quarter_select` darf nicht in Welle 3B entfernt werden, bevor Welle 5 Experten, Ärzte, Vouching und gegebenenfalls Business-Reviews auf ein eigenes öffentliches Namensmodell umgestellt hat. Die privaten sozialen Consumer und `HouseInfoPanel`/Karte sind davon getrennt zu behandeln.

## Offene rote Gates

1. **Supabase-Branch-Test nur nach separatem Kosten-Go:** Nutzer mit `board_comments`, `shared_meals` und `tip_reviews`; `gdpr_delete_user()` muss erfolgreich sein. Lokal ist dieselbe Fixture grün, ersetzt aber nicht das externe Branch-Gate.
2. GitHub-CI muss nach dem Push vollständig grün sein, einschließlich erweitertem S7.
3. Claude-Review auf dem neuen Head.
4. Kein Merge, Prod-Apply oder Deploy in diesem Auftrag.
5. Prod-Apply von Migration 204 bleibt ein separater Founder-Go-Schritt nach Merge und Branch-Test.

## Nicht ausgeführt

- kein kostenpflichtiger Supabase-Branch-Test,
- kein Prod-Apply,
- kein Deploy,
- keine ENV-/Secret-Änderung,
- kein Merge,
- keine Migration 205.
