# Handover — CL-1 Haertung: caregiver_links Consent-Grant-Spalten sticky (task_796f821c)

**Datum:** 2026-06-18 · **Owner:** Claude (Opus) · **Status:** file-first fertig, **NICHT prod-applied** · **Founder-Go-Gate:** `MIGRATION-PROD-GO-CL1`

## Kurzfassung

Vorbestehende RLS-Schwaeche an `caregiver_links` (NICHT durch Welle AA eingefuehrt, daher kein
AA-Blocker — aber Founder-gated Backlog, vor Profi-/Pilot-Start). Bei 0 echten Nutzern nicht akut,
aber `sensitive_data_allowed` gated sensible Care-Daten.

Befund-Klasse: spaltenlose UPDATE-Policy (gleiche Klasse wie `task_9413477f` Gamification-RLS).

| Befund | Severity | Datei:Zeile | Inhalt |
|---|---|---|---|
| AA-RLS-1 | CRITICAL (Vektor) | `supabase/migrations/071_caregiver_links.sql:50-52` | Einzige UPDATE-Policy `caregiver_links_update_resident` ist SPALTENLOS (USING/WITH CHECK nur `auth.uid() = resident_id`) -> Resident darf JEDE Spalte seiner Links setzen. |
| CL-1 | HIGH | `supabase/migrations/197_family_setup_invitations.sql:119-123` | Dadurch frei setzbar: `consent_status` / `profile_edit_allowed` / `sensitive_data_allowed`. Letzteres gated sensible Care-Daten. Kein Trigger, keine Whitelist. |
| AA-RLS-2 | HIGH (Prod-Drift) | `modules/care/services/caregiver/caregiver-misc.service.ts:59-68` | Angehoerigen-UPDATE laeuft mit `.eq('caregiver_id', userId)` ueber den RLS-Client, obwohl in den Migrationen GAR KEINE caregiver-seitige UPDATE-Policy existiert. **Aus dem Code nicht entscheidbar — Live-Verifikation noetig.** |
| CL-2 | LOW | Trigger-Rollencheck-Muster | `request.jwt.claim.role` (Mig 142:35) vs `current_setting('role')` (Mig 198:39,93). Neuer Trigger nutzt das 198-Muster. |

## Was diese Welle macht

Neue file-first-Migration mit BEFORE-UPDATE-Trigger `enforce_caregiver_links_update_restrictions`,
der bei Nicht-`service_role` genau die drei Consent-/Grant-Spalten sticky macht (`NEW := OLD`).
Rollencheck nach juengstem Standard `current_setting('role', true) = 'service_role'` (CL-2 adressiert).

**Bewusst SCHMAL** (Vorgabe des Tasks): `auto_answer_allowed/_start/_end` werden NICHT sticky gemacht,
damit der Angehoerigen-Schreibpfad `updateAutoAnswerSettings` (RLS-Client) nicht bricht.
`revoked_at` / `heartbeat_visible` (Resident-Self-Service) ebenfalls frei.

### Sicherheits-Nachweis (Code autoritativ — warum der Trigger keinen Schreibpfad bricht)

Codebase-weiter Sweep aller `caregiver_links`-Writer am 2026-06-18:
- Die drei Grant-Spalten werden **ausschliesslich per INSERT** gesetzt
  (`lib/family-setup/senior-setup.service.ts:310-312`, Admin-/`service_role`-Client). BEFORE-UPDATE
  beruehrt INSERT nicht.
- **Kein einziger** Nicht-`service_role`-UPDATE-Pfad schreibt diese Spalten:
  - `updateCaregiverLink` (`links.service.ts:48-112`) setzt nur `revoked_at` / `heartbeat_visible`.
  - `updateAutoAnswerSettings` (`caregiver-misc.service.ts:48-75`) setzt nur `auto_answer_*`.
  - `senior-auto-answer.service.ts:106` setzt nur `auto_answer_senior_consented_at` (AA-3, service_role-Route).
  - `reward.service.ts` setzt nur `plus_trial_end` (durch Mig-142-Trigger geschuetzt).
- Es existiert aktuell GAR KEIN UPDATE-Pfad (auch kein service_role) auf `consent_status` —
  der Senior-Confirm-Flow (`pending_senior_confirm -> active`) ist code-seitig noch nicht gebaut.
  Wenn er kommt, MUSS er ueber `service_role` laufen (Trigger-Bypass), sonst greift der Sticky-Schutz.

Drei BEFORE-UPDATE-Trigger auf `caregiver_links` nach Apply (disjunkte Spalten, kein Konflikt):
`enforce_caregiver_links_update_restrictions_trigger` (neu, e<p -> feuert zuerst),
`protect_auto_answer_senior_consent_trigger` (AA), `protect_plus_trial_end_trigger` (142).

## Schritt 1 (Prod-Policy-Read) — Status: BLOCKIERT, Live-Verifikation offen

Der Task verlangt zuerst die echten Prod-Policies/Trigger via Supabase-MCP (`claude_ai_Supabase`)
auszulesen und gegen die Migrationen abzugleichen. **In dieser Session ist das Supabase-MCP NICHT
verbunden** (nicht in der Tool-Liste, nicht im "connecting"-Status). Der Live-Read (read-only) konnte
daher nicht ausgefuehrt werden.

Ersatzweise wurde der Abgleich gegen den **autoritativen Code** gemacht (siehe oben). Das genuegt fuer
die **sichere Konstruktion** des schmalen Triggers (er kann keinen existierenden Schreibpfad brechen).
Es genuegt NICHT, um AA-RLS-2 final zu klaeren.

**Founder-Hand / naechste Session mit verbundenem Supabase-Connector — diese Queries fahren:**
```sql
-- 1. Echte Policies auf caregiver_links (Drift vs. Migrationen 071 + 142 + 197 + AA):
SELECT polname, cmd, qual, with_check, roles
FROM pg_policies WHERE tablename = 'caregiver_links';

-- 2. Trigger-Inventar (erwartet nach Apply: 3 BEFORE-UPDATE-Trigger):
SELECT tgname, tgenabled, pg_get_triggerdef(oid)
FROM pg_trigger WHERE tgrelid = 'caregiver_links'::regclass AND NOT tgisinternal;

-- 3. Spaltenliste (consent_status/profile_edit_allowed/sensitive_data_allowed/auto_answer_* vorhanden?):
\d caregiver_links
```
**AA-RLS-2 Klaerung:** Wenn Query 1 KEINE caregiver-seitige UPDATE-Policy zeigt, dann liefert
`updateAutoAnswerSettings` still 0 betroffene Zeilen (RLS filtert auf `resident_id = auth.uid()`,
der Caregiver ist aber nicht der Resident) -> die Auto-Answer-Einstellung waere faktisch kaputt
(kein Fehler, `{ ok: true }`). Zeigt Query 1 eine undokumentierte caregiver-UPDATE-Policy -> Prod-Drift,
in einer eigenen Migration nachziehen. **Diese Entscheidung braucht den Live-Read — hier nicht moeglich.**

## Mini-Audit-Block (nach `.claude/rules/security-mini-audit.md`)

```text
Mini-Audit CL-1 (2026-06-18):
- RLS/Trigger geprueft: caregiver_links (Policies 071 + 142 + 197 + AA; Writer-Sweep aller .ts/.tsx/.sql)
- Findings: AA-RLS-1 CRITICAL-Vektor (spaltenlose UPDATE-Policy 071:50) + CL-1 HIGH (Grant-Spalten frei) -> mit Sticky-Trigger geschlossen; AA-RLS-2 HIGH (Prod-Drift, Live-Read offen) -> Founder-Hand; CL-2 LOW (Rollencheck) -> 198-Muster uebernommen
- Audit-Trail: n/a (kein neuer Schreibpfad, nur Schutz-Trigger) | Rate-Limit: n/a (kein Token-/Code-Lookup)
```
STOP-Status: CL-1 ist HIGH -> Welle ist NICHT gemerged/applied, wartet auf Founder-Go (regelkonform).

## Geaenderte Dateien

- `supabase/migrations/20260618130000_caregiver_links_grant_update_restrictions.sql` (neu, file-first)
- `__tests__/lib/caregiver-links-grant-update-restrictions-migration.test.ts` (neu, statische Mig-Analyse)

## Verifikation

- TDD: RED (Migration fehlte) -> GREEN nach Migration. Ziel-Tests + `auto-answer-senior-consent-migration` +
  `migration-versions` (Versions-Eindeutigkeit von `20260618130000`, keine `.down.sql` im Mig-Ordner): **15/15 gruen.**
- `eslint` auf der neuen Testdatei: clean (exit 0).
- Migration ist SQL (kein TS) — kein tsc noetig.

## Founder-Gate — Prod-Apply (Rote Zone)

NICHT applied. Apply erst nach `MIGRATION-PROD-GO-CL1`. Empfohlener Weg (Supabase-Connector,
primaerer Migrations-Weg): `apply_migration` mit dem Inhalt obiger Datei. Vorher Schritt-1-Queries
fahren (Drift), danach Trigger-Inventar erneut pruefen (3 erwartet).

Rollback:
```sql
DROP TRIGGER IF EXISTS enforce_caregiver_links_update_restrictions_trigger ON caregiver_links;
DROP FUNCTION IF EXISTS enforce_caregiver_links_update_restrictions();
```

## Offen / naechste Schritte

1. **Founder/Live-Read:** Schritt-1-Queries fahren, AA-RLS-2 entscheiden (Prod-Drift-Policy vs. kaputter Pfad).
2. **Founder-Go:** `MIGRATION-PROD-GO-CL1` -> Migration apply -> Trigger-Inventar gegenpruefen.
3. **Verwandt:** `task_9413477f` (Gamification-RLS) ist dieselbe Befund-Klasse — separat haerten.
