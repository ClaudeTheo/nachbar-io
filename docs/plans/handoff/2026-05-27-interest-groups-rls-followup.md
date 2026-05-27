# Follow-up: RLS Interest-Groups Tabellen

Datum: 2026-05-27  
Branch: `codex/rls-group-members-2026-05-27`  
Status: Lokal und in Production angewendet/verifiziert. Branch gepusht,
Draft-PR #15 offen.

## Anlass

Beim Rollback-Smoke-Test fuer `public.group_members` fiel auf, dass
`public.groups` lokal RLS aktiv hatte, aber 0 Policies. Dadurch blockierten
direkte `groups`-Subqueries normale `authenticated` Nutzer. Nach der
`group_members`-Korrektur blieb als Folgefund: Die urspruengliche Gruppen-Welle
war in Migration 133 nur als Kommentar "vollstaendig in Supabase deployed"
dokumentiert, aber lokal nicht vollstaendig replay-faehig.

## Lokaler Befund vor Patch

- `groups`: RLS aktiv, 0 Policies.
- `group_notification_settings`: RLS aktiv, 0 Policies.
- `group_posts`: RLS aktiv, 1 SELECT-Policy, keine INSERT-/DELETE-Policy.
- `group_post_comments`: RLS aktiv, 1 SELECT-Policy, keine INSERT-/DELETE-Policy.
- `anon` und `authenticated` hatten breite Tabellenrechte inklusive
  `DELETE`/`TRUNCATE` auf den Gruppen-Tabellen.
- Gruppen-API-Routen nutzen den normalen User-Supabase-Client, nicht
  `service_role`.

## Read-only Prod-Vergleich

Prod wurde am 2026-05-27 nur lesend abgefragt:

- `groups`: RLS aktiv, 4 Policies, 0 Rows.
- `group_members`: RLS aus, 0 Policies, 0 Rows.
- `group_posts`: RLS aktiv, 3 Policies, 0 Rows.
- `group_post_comments`: RLS aktiv, 3 Policies, 0 Rows.
- `group_notification_settings`: RLS aktiv, 1 Policy, 0 Rows.
- `anon` und `authenticated` hatten auf allen Gruppen-Tabellen breite Grants
  inklusive `DELETE`, `TRUNCATE`, `TRIGGER`, `REFERENCES`.
- Prod-Policy-Namen weichen vom lokalen Replay-Stand ab:
  - `groups_select`, `groups_insert`, `groups_update`, `groups_delete`
  - `gp_select`, `gp_insert`, `gp_delete`
  - `gpc_select`, `gpc_insert`, `gpc_delete`
  - `gns_all`

Daraufhin wurde die Migration lokal korrigiert, damit auch diese historischen
Prod-Policy-Namen explizit entfernt werden. Sonst wuerden breite Alt-Policies
neben den neuen restriktiven Policies stehen bleiben.

## Patch-Inhalt

Datei: `supabase/migrations/20260527191000_restore_interest_groups_rls.sql`

- Entzieht `anon` alle Rechte auf:
  - `groups`
  - `group_posts`
  - `group_post_comments`
  - `group_notification_settings`
- Gibt `authenticated` nur die benoetigten Rechte zurueck.
- Entfernt alte lokale und historisch in Prod vorhandene Policy-Namen, bevor
  neue restriktive Policies erzeugt werden.
- Ergaenzt SECURITY-DEFINER-Helper:
  - `is_verified_in_quarter(quarter_id)`
  - `can_read_interest_group_post(post_id)`
  - `can_comment_interest_group_post(post_id)`
- Fuegt Trigger `trg_groups_identity_immutable` hinzu, der direkte Aenderungen
  an `groups.quarter_id` und `groups.creator_id` blockiert.
- `groups`-Policies:
  - SELECT im verifizierten Quartier.
  - INSERT nur fuer eigenen `creator_id`, verifiziertes Quartier und
    `member_count = 1`.
  - UPDATE nur Creator/Admin, mit spaltenbeschraenktem UPDATE-Grant.
  - DELETE nur Creator/Founder.
- `group_posts`-Policies:
  - SELECT fuer sichtbare Gruppen.
  - INSERT nur aktive Mitglieder.
  - DELETE nur Autor.
- `group_post_comments`-Policies:
  - SELECT fuer sichtbare Posts.
  - INSERT nur aktive Mitglieder der Post-Gruppe.
  - DELETE nur Autor.
- `group_notification_settings`-Policies:
  - Nur eigene Settings lesen/aendern/loeschen.
  - INSERT nur fuer eigene Settings in sichtbaren/eigenen Gruppen.

## Lokale Verifikation

- Migration lokal gegen Docker-Supabase angewendet.
- Nach dem Prod-read-only Vergleich nochmals lokal aktualisiert angewendet;
  Static Guard stellt sicher, dass historische Prod-Policy-Namen gedroppt
  werden.
- Policy-Counts danach:
  - `groups`: 4
  - `group_members`: 4
  - `group_posts`: 3
  - `group_post_comments`: 3
  - `group_notification_settings`: 4
- Rollback-Smoke-Test gruen:
  - Gruppe als `authenticated` erstellen.
  - Founder-Mitgliedschaft eintragen.
  - Gruppe als Founder aktualisieren.
  - Zweiter verifizierter Nutzer tritt offener Gruppe bei.
  - `member_count` wird serverseitig auf 2 aktualisiert.
  - Post erstellen.
  - Kommentar erstellen.
  - Notification-Setting setzen.
  - Gruppe als Founder loeschen.
  - Rollback hinterlaesst keine Testdaten.
- Static Guards gruen:
  `npm run test -- __tests__/lib/interest-groups-rls-migration.test.ts __tests__/lib/group-members-rls-migration.test.ts __tests__/lib/migration-versions.test.ts`
- ESLint fuer neue Testdateien gruen.
- Diff-Secret-Check: kein Secret/Token-Fund.

## Production-Apply 2026-05-27

Founder-Go durch Thomas: "go dafuer".

- Standardpfad `npx supabase migration up --linked` war wegen historischem
  Prod-Drift blockiert: Remote-Migrations existieren ohne lokale Datei.
- Kontrollierter Einzeldatei-Pfad:
  `npx supabase db query --linked -f supabase/migrations/20260527191000_restore_interest_groups_rls.sql`
- Migration-History wurde nach erfolgreichem Apply repariert:
  `supabase migration repair --linked --status applied 20260527191000`.
- Production-Verifikation danach:
  - `groups`: RLS aktiv, 4 Policies.
  - `group_members`: RLS aktiv, 4 Policies.
  - `group_posts`: RLS aktiv, 3 Policies.
  - `group_post_comments`: RLS aktiv, 3 Policies.
  - `group_notification_settings`: RLS aktiv, 4 Policies.
  - `anon`: keine Tabellenrechte auf den Gruppen-Tabellen.
  - Historische breite Prod-Policy-Namen sind entfernt.
  - Row-Counts bleiben 0.
  - Migration-History zeigt beide Versionen als local/remote applied:
    `20260527183000`, `20260527191000`.

## Offene Punkte vor Production-Apply

1. Draft-PR #15 reviewen und mergen, damit die bereits applizierten
   Migration-Dateien in `master` landen.
2. Nach Merge/Deploy nur read-only Smoke; kein weiterer DB-Write noetig.

## Out of Scope

- Keine Refaktorierung der Gruppenservices.
- Keine UI-Aenderung.
