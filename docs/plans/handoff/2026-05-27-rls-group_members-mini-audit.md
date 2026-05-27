# Mini-Audit: RLS `public.group_members`

Datum: 2026-05-27  
Branch: `codex/rls-group-members-2026-05-27`  
Status: Lokal und in Production angewendet/verifiziert. Branch gepusht,
Draft-PR #15 offen.

## Anlass

Supabase-Prod hatte `public.group_members` mit `relrowsecurity=false`.
`anon` und `authenticated` hatten Tabellenrechte inklusive `SELECT`, `INSERT`,
`UPDATE`, `DELETE` und `TRUNCATE`. `public.spatial_ref_sys` wurde ebenfalls als
RLS-disabled gemeldet, ist aber PostGIS-Systemtabelle und bleibt unveraendert.

## Pre-Check / Code-Wahrheit

- `public.group_members` ist die Interessengruppen-Tabelle aus Migration 133,
  nicht die Chat-Gruppen-Tabelle.
- Chat nutzt `public.chat_group_members`; dort ist RLS aktiv und es existieren
  vier Policies.
- Migration 161 hatte bei der Chat-Namespace-Korrektur falsch applizierte
  Policies/Trigger von der bestehenden `group_members` entfernt und RLS wieder
  deaktiviert.
- Aktive Codepfade nutzen `group_members` ueber den normalen User-Supabase-Client:
  `modules/gruppen/services/gruppen.service.ts`,
  `modules/gruppen/services/gruppen-posts.service.ts`,
  `modules/voice/services/tool-executor.ts`,
  `modules/gamification/services/badges.service.ts`,
  `lib/services/privacy-export.service.ts`.

## Read-only Prod-Befund

- `group_members`: RLS aus, 0 Policies, 0 Rows.
- `groups`: 0 Rows.
- `group_posts`: 0 Rows.
- `group_members` hat keine Trigger.
- `group_members` Spalten: `id`, `group_id`, `user_id`, `role`, `status`,
  `joined_at`.
- Tabellenkommentar war falsch: "User-Mitgliedschaft in Gruppen-Chats..."

## Patch-Inhalt

Datei: `supabase/migrations/20260527183000_enable_rls_group_members.sql`

- Korrigiert den Tabellenkommentar auf Interessengruppen.
- Aktiviert RLS auf `public.group_members`.
- Entzieht `anon` alle Tabellenrechte.
- Entzieht `authenticated` pauschale Rechte und gibt nur `SELECT`, `INSERT`,
  `UPDATE` zurueck.
- Fuegt `SECURITY DEFINER`-Helper fuer Admin-/Founder-Checks hinzu, um
  RLS-Rekursion zu vermeiden.
- Fuegt `SECURITY DEFINER`-Helper fuer Gruppen-/Quartier-Checks hinzu, damit
  `group_members`-Policies nicht an der separat verriegelten Tabelle `groups`
  scheitern.
- Fuegt Trigger hinzu, der direkte Aenderungen an `group_id` und `user_id`
  blockiert.
- Fuegt Trigger hinzu, der `groups.member_count` serverseitig aus aktiven
  Mitgliedschaften nachzieht. Dadurch bleibt der Zaehler korrekt, auch wenn ein
  normaler Nutzer nach dem Verlassen einer geschlossenen Gruppe nicht mehr alle
  aktiven Mitglieder sehen darf.
- Definiert selektive Policies:
  - SELECT: eigene Mitgliedschaft, aktive eigene Gruppenmitgliedschaft,
    Gruppenadmin/-founder, offene/offizielle Gruppen im verifizierten Quartier.
  - INSERT: eigene Founder-Mitgliedschaft direkt nach Gruppenerstellung oder
    eigener Beitritt (`active` nur bei offenen Gruppen, `pending` bei
    geschlossenen/offiziellen Gruppen).
  - UPDATE: eigenes Verlassen/Rejoin sowie Admin-/Founder-Verwaltung ohne
    Founder-Degradierung.
- Keine DELETE-Policy fuer direkte Mitgliedschaftsloeschung.

## Mini-Audit-Ergebnis

- **RLS-Lese-Pass:** `group_members` war die einzige echte App-Tabelle mit RLS
  disabled; `spatial_ref_sys` bleibt ausgeschlossen.
- **Trigger-Inventar:** Vorher keine Trigger auf `group_members`; neue Trigger
  schuetzen Identitaetsfelder und halten `groups.member_count` konsistent.
- **Privilege-Spalten-Sweep:** Keine Admin-Boolean-Spalten; relevante Felder
  sind `role` und `status`.
- **Audit-Trail:** Keine dedizierte Audit-Tabelle fuer Gruppenmitgliedschaften.
  Nicht als Blocker bewertet, weil Tabelle aktuell leer ist und Pilot-Gruppen
  noch nicht genutzt werden. Spaeter bei Gruppen-Reaktivierung erneut pruefen.
- **Rate-Limit:** Gruppenrouten laufen unter `/api/groups/*` und sind als
  Standard-Route klassifiziert. Kein neuer Public-Endpoint in dieser Welle.

## Lokale Verifikation 2026-05-27

- `npx supabase migration up` erfolgreich gegen den lokalen Docker-Stack
  angewendet.
- Nach dem ersten Smoke-Test wurden direkte `groups`-Subqueries in den Policies
  durch SECURITY-DEFINER-Booleans ersetzt; Grund: `groups` hat lokal RLS aktiv
  und keine eigenen Policies, daher darf `group_members` diese Tabelle nicht
  direkt als `authenticated` auswerten.
- Aktualisierte Migration lokal erneut angewendet.
- `group_members`: RLS aktiv, 4 Policies.
- `anon`: keine Tabellenrechte auf `group_members`.
- `authenticated`: nur `SELECT`, `INSERT`, `UPDATE` auf `group_members`.
- Policies nutzen jetzt:
  - `is_interest_group_creator(group_id)`
  - `can_found_interest_group(group_id)`
  - `can_join_interest_group(group_id, ARRAY[...])`
- Trigger aktiv:
  - `trg_group_members_identity_immutable`
  - `trg_group_members_refresh_member_count`
- Tabellenkommentar korrigiert:
  "Mitgliedschaft in Interessengruppen aus Mig 133. Nicht zu verwechseln mit
  chat_group_members."
- Rollback-Smoke-Test gruen: ein verifizierter `authenticated` Nutzer konnte
  lokal einer offenen Gruppe beitreten und seine Mitgliedschaft lesen.
- Static Guards gruen:
  `npm run test -- __tests__/lib/group-members-rls-migration.test.ts __tests__/lib/migration-versions.test.ts`

## Production-Apply 2026-05-27

Founder-Go durch Thomas: "go dafuer".

- Standardpfad `npx supabase migration up --linked` war wegen historischem
  Prod-Drift blockiert: Remote-Migrations existieren ohne lokale Datei.
- Kontrollierter Einzeldatei-Pfad:
  `npx supabase db query --linked -f supabase/migrations/20260527183000_enable_rls_group_members.sql`
- Danach `group_members` in Prod verifiziert:
  - RLS aktiv.
  - 4 Policies.
  - `anon`: keine Tabellenrechte.
  - `authenticated`: nur `SELECT`, `INSERT`, `UPDATE`.
- Migration-History wurde nach erfolgreichem Apply repariert:
  `supabase migration repair --linked --status applied 20260527183000`.

## Risiko vor Production-Apply

Der Patch ist bewusst kompatibel mit den bestehenden User-Client-Codepfaden.
Trotzdem vor Prod-Apply pruefen:

1. Gruppen-Flows smoke-testen: Gruppe erstellen, offener Gruppe beitreten,
   geschlossener Gruppe beitreten (`pending`), verlassen, Mitglied genehmigen.
2. Branch/PR mergen, damit File-first-History in `master` landet.

## Out of Scope

- Keine Aenderung an `spatial_ref_sys`.
- Keine Refaktorierung der Gruppenservices auf `service_role`.
