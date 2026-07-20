# Claude-Handoff: Welle 3A – privates Profilfundament

**Datum:** 2026-07-20
**Branch:** `codex/private-profile-foundation-w3`
**Basis:** `origin/master` bei `07466940781131dde1fce9e1272ea2d080b71621`
**Status:** lokal implementiert und verifiziert; Draft-PR für Claude-Review; kein Prod-Apply, Merge oder Deploy

## Ergebnis

Welle 3 wurde wegen des codebase-weiten Consumer-Sweeps bewusst in zwei additive Schritte geteilt:

- **Welle 3A (dieser PR):** `user_public_profiles` und private `discovery_profiles`, alle nicht-administrativen Fremdprofil-Consumer auf die minimale Projektion umstellen.
- **Welle 3B (roter Restschritt):** `HouseInfoPanel`/Kartenstatus auf öffentliches Gebäude-Niveau reduzieren und erst danach die breite `users_quarter_select`-Policy entfernen.

Damit bleiben Rollout und Rollback beherrschbar: Dieser PR verengt die bestehende `users`-Policy noch nicht, schafft aber die vollständige Consumer-Voraussetzung dafür.

## Pre-Check und Wiederverwendung

Codebase-weite Suche bestätigte vorhandene Beziehungsmodelle; es wurde keine zweite Kontakt- oder Care-Struktur gebaut:

- angenommene Kontakte: `contact_links` aus Migration 161,
- Care-Beziehungen: `caregiver_links` aus Migration 071,
- Familienbeziehungen: `family_child_links` aus Migration 197,
- Welle-1-Schutz: Migration 203,
- quartiersfähige Feature-Flags aus Welle 2.

Der Sweep fand deutlich mehr Fremdprofil-Leser als nur Karte und `HouseInfoPanel` (84 eingebettete `users`-Joins, 34 direkte Leser und fünf nicht leer-sichere Darstellungen im initialen RED). Deshalb wurde der im Auftrag erlaubte A/B-Split gewählt.

## Diff

### Migration 204 und Rollback

`supabase/migrations/204_private_profile_foundation.sql` führt additiv ein:

- `user_public_profiles` mit `user_id`, Anzeigename, Avatar und Zeitstempeln,
- Backfill aus `public.users` und einen `SECURITY DEFINER`-Sync-Trigger mit fixiertem `search_path`,
- SELECT nur für die eigene Person oder eine angenommene Kontakt-, aktive Familien- oder aktive Care-Beziehung,
- explizite REVOKEs/GRANTs und RLS,
- benannte, `NOT VALID` gesetzte FK-Brücken für bestehende PostgREST-Embedded-Consumer,
- `discovery_profiles` mit opaker UUID, internem `user_id`, serverseitig abgeleitetem Quartier, Opt-in standardmäßig `false`, Intro-Limit 140 und serverseitigem Volljährigkeitssignal,
- ausschließlich Own-only-RLS; keine Fremdsuche, kein Discovery-RPC und kein Karten-/Rastermodell.

`supabase/rollbacks/204_private_profile_foundation.down.sql` entfernt FK-Brücken, Trigger, Tabellen und Funktionen transaktional und idempotent.

`supabase/seeds/00-role-grants.sql` enthält die lokale Grant-Parität. Das war notwendig, weil der globale lokale Seed nach dem Migrationslauf sonst die eingeschränkten Spaltenrechte wieder verbreitert hätte.

### Consumer-Sweep

Alle gefundenen nicht-administrativen Leser fremder Anzeigenamen/Avatare verwenden nun `user_public_profiles` – einschließlich Board, Marktplatz, Fundbüro, Leihbörse, Events, Hilfe, Care, Gruppen, Prävention, Voice, Ärzte und Benachrichtigungsservices. Direkte Leser selektieren `user_id` nur intern als Alias, wenn die vorhandene Consumer-Form ein `id` benötigt.

Leer-Ergebnisse aus RLS werden robust behandelt. Sichtbare Namen fallen neutral auf „Nachbar/in“, „Ein Nachbar“, „Arzt“ oder „Unbekannt“ zurück. Adressen wurden nicht in Client-State aufgenommen.

Bewusst unverändert bleiben:

- eigene Profil-/Onboarding-Leser,
- administrative oder Service-Role-Leser,
- `HouseInfoPanel` und der Karten-Personenstatus bis Welle 3B,
- die schmale Senior-Bearbeitungsroute, deren bestehende Care-Berechtigung in Welle 3B separat aufgelöst wird,
- `users_quarter_select` bis alle 3B-Consumer zuerst reduziert sind.

## TDD-Nachweis

### RED

- Die neuen Migrations- und Consumer-Tests schlugen zunächst wegen fehlender Tabellen/Policies fehl.
- Der statische Consumer-Sweep meldete 84 eingebettete Fremdprofil-Joins, 34 direkte Leser und fünf nicht leer-sichere Profilzugriffe.
- Der erste SQL-Leakage-Lauf deckte auf, dass `supabase/seeds/00-role-grants.sql` die eingeschränkten Discovery-Spaltenrechte nachträglich wieder öffnete.
- Der erste vollständige Vitest-Lauf nach der Consumer-Umstellung fand neun veraltete Tabellen-Mocks; sie wurden ausschließlich auf die neue Projektion umgestellt.

### GREEN

- `npx supabase db reset --local` – zweimal grün; vollständiger Replay bis Migration 204.
- `tests/sql/204_private_profile_foundation.sql` – grün vor und nach Rollback/Reapply.
  - eigener/angenommener Kontakt/aktive Familie/aktive Care-Beziehung sichtbar,
  - quartiersfremde, unverbundene Person: **0 Zeilen**,
  - fremdes Discovery-Profil: **0 Zeilen**,
  - internes `user_id` für Browser nicht selektierbar,
  - manipulierte Quartier-/Volljährigkeitswerte abgewiesen,
  - fehlende verifizierte Mitgliedschaft fail-closed,
  - Opt-in erst nach serverseitiger Volljährigkeitsbestätigung.
- `npx vitest run __tests__/lib/private-profile-foundation-migration.test.ts __tests__/lib/private-profile-consumers.test.ts --reporter=dot` – **10/10 grün**.
- `npx vitest run` – vollständige Suite grün, Exit 0.
- `npx tsc --noEmit` – grün.
- `npm run lint` – grün.
- `npm run build` – grün, 246 statische Seiten erzeugt.
- `git diff --check` – grün (nur erwartete Windows-LF/CRLF-Hinweise).
- `node scripts/generate-policy-inventory.mjs` nach vollständigem Reset – grün; 567 Policies, 38 Trigger, 632 Grant-Zeilen; einzig `spatial_ref_sys` wie zuvor ohne RLS.
- Relevante lokale Playwright-Route-/Render-Smokes für Karte, Marktplatz, Hilfe, Events, Nachrichten, Experten und Fundbüro: **12/12 grün** mit lokalem Supabase und einem Worker.

### Bekannte Playwright-Testschuld

Der ungekürzte Karten-/Marktplatz-Satz ist **12/14**: Zwei bestehende Tests erwarten für unauthentifizierte Aufrufe `/login` oder die Zielroute, der aktuelle Proxy leitet tatsächlich nach `/`. Das Verhalten liegt vor der neuen Datenabfrage und außerhalb dieses Diffs; die Tests wurden nicht beiläufig umgeschrieben. Ein erster Lauf ohne `.env.local` war erwartungsgemäß nicht aussagekräftig (fehlende lokale Supabase-Prozesswerte) und führte zu 500/Timeouts. Es wurde keine ENV-Datei angelegt oder geändert.

## Security-Mini-Audit

### Schutzgüter und Grenzen

- Schutzgüter: Profilidentität, interne User-ID, Quartiersmitgliedschaft, Beziehungsgraph und Volljährigkeitssignal.
- Vertrauensgrenzen: Browser → PostgREST/RLS; `auth.uid()` → verifizierte Haushaltsmitgliedschaft; `service_role`/DB-Trigger → serverseitige Felder.

### Prüfergebnis

- **Kein IDOR über Discovery:** Zufällige UUID plus Own-only-RLS; es existiert keine fremde SELECT-Policy und kein Such-RPC.
- **Keine interne ID-Freigabe:** `authenticated` erhält kein SELECT auf `discovery_profiles.user_id`.
- **Kein manipuliertes Quartier:** Trigger leitet `user_id` und `quarter_id` ausschließlich aus `auth.uid()` und einer verifizierten eigenen Haushaltsmitgliedschaft ab; ohne Mitgliedschaft fail-closed.
- **Volljährigkeit server-only:** Browser dürfen `adult_attested_at` weder INSERTen noch UPDATEen; der Trigger setzt/manipulationsschützt das Feld zusätzlich. `discoverable=true` ist per CHECK ohne Attestation unmöglich.
- **Beziehungsgebundene Projektion:** Fremde öffentliche Profile sind nur bei `accepted`, aktiver und nicht widerrufener Familien- oder aktiver und nicht widerrufener Care-Beziehung sichtbar.
- **Definer-Härtung:** Beide Triggerfunktionen haben fixierten `search_path`; EXECUTE ist für PUBLIC, anon und authenticated entzogen.
- **Explizite Rechte:** anon erhält keine Rechte; authenticated nur die benötigten Tabellen-/Spaltenrechte; service_role bleibt der bewusst vertraute Serverpfad.
- **Additiver Rollout:** FK-Brücken sind `NOT VALID`, erzwingen aber neue Referenzen. Historischer Auth/Public-Drift blockiert damit weder Apply noch Rollback.
- Notfallregeln 112/110, Invite-Grenzen, RLS anderer Tabellen und Adress-Client-State wurden nicht verändert.

### Restrisiken für Claude

- Die breite `users_quarter_select`-Policy existiert absichtlich noch bis Welle 3B. Dieser PR allein schließt daher noch nicht den gesamten Quartiersprofil-Lesepfad.
- Profilnamen in quartieweiten Inhalten sind nun für unverbundene Personen absichtlich neutral. Insbesondere Ärzte-/Expertenansichten verlieren ohne explizite Beziehung Namen; die Expertenliste zeigt deshalb keinen aus `users.trust_level` abgeleiteten Verifizierungsbadge mehr. Bitte als gewünschte Privacy-Folge gegen das Produktkonzept prüfen.
- `service_role` ist weiterhin vollständig privilegiert und muss ausschließlich serverseitig bleiben.
- Die neue Migration wurde nicht auf einem kostenpflichtigen Supabase-Branch und nicht auf Prod angewandt.

## Klare rote Restschritte: Welle 3B

1. Erst nach Merge/Apply von 3A von aktuellem `origin/master` starten.
2. RED-Tests ergänzen: `HouseInfoPanel` rendert ohne fremde Mitglieder/Vacation-Daten; `useMapStatuses` liefert keine Personen- oder Haushaltsdetails.
3. Panel und Karte auf öffentliches Gebäude-/Aktivitätsniveau reduzieren; keine Adressdaten im Client-State.
4. `app/(app)/care/meine-senioren/[seniorId]/edit` über die bestehende, verifizierte Care-Beziehung oder einen bereits vorhandenen sicheren Serverpfad versorgen – keinen breiten `users`-Leser behalten.
5. Den Consumer-Sweep ohne Ausnahmen wiederholen und erst dann `users_quarter_select` entfernen; eigene, administrative und ausdrücklich verifizierte Rollenpfade erhalten.
6. SQL-Leakage, vollständigen lokalen Replay, Rollback/Reapply, Policy-Inventar, Vitest, Typecheck, Lint, Build und relevante Playwright-Flows erneut ausführen.

## Nicht ausgeführt

- kein Supabase-Branch-Test,
- kein Prod-Apply,
- kein Deploy,
- keine ENV-/Secret-Dateiänderung,
- kein Merge.
