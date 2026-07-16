# Security-Advisor-Triage 2026-07-14 (Prod, live verifiziert)

Quelle: Supabase Security Advisors (live) + `pg_policies`-Gegencheck + Code-Greps.
Anlass: Produktreife-Programm Block 1. Regel: `.claude/rules/security-mini-audit.md` → bei CRITICAL/HIGH STOP + Founder-Entscheid.

## Kernbefund: Prod-Drift bei RLS-Policies

`docs/security/policy-inventory.md` ist im Live-Vergleich **veraltet**: `users_insert` ist live `WITH CHECK (true)`
(Inventar: `id = auth.uid()`), `neighbor_invitations_update` live `USING (true)` (Inventar: gescoped).
Alle 23 vom Advisor gemeldeten always-true-Policies gelten fuer `{public}` = anon + authenticated,
nicht nur service_role (service_role bypasst RLS ohnehin — die Policies sind also reine Angriffsflaeche).

## Findings

| ID | Severity | Befund | Fix-Idee | Risiko des Fixes |
|----|----------|--------|----------|------------------|
| RLS-1 | **CRITICAL** | `users_insert` WITH CHECK true (public): jeder Authenticated kann users-Zeilen einfuegen. Trigger `enforce_user_defaults` (Mig 014) erzwingt nur `trust_level`+`is_admin` — NICHT `role`, `verified`, `quarter_id` (Spalten kamen spaeter). Selbst-gesetztes `role='admin'` moeglich. | Scoped `WITH CHECK (id = auth.uid())` + Trigger um role/verified erweitern | Family-Setup (`lib/family-setup/*.service.ts` upsertet fremde IDs) — Server- vs. Client-Pfad VOR Fix verifizieren |
| RLS-2 | HIGH | `claude_messages` anon ALL true — toter Drift-Tisch (nur Baseline-Snapshot, kein App-Code) komplett offen fuer anon | Policy ersatzlos droppen → default deny | Keins (Tabelle ungenutzt) |
| RLS-3 | HIGH | `neighbor_invitations_update` USING true: jeder kann fremde Einladungen manipulieren | Scopen auf inviter/invitee | Accept-Flow (`app/(app)/invitations`, `lib/invitations.ts`) verifizieren — evtl. war true ein Hotfix fuer Accept |
| RLS-4 | HIGH | `invoices` INSERT+UPDATE true (Billing-Integritaet) | Droppen (Writes laufen service-seitig) | Client-Write-Grep vor Drop |
| RLS-5 | MED-HIGH | `youth_profiles`, `youth_earned_badges`, `user_badges`, `points_log`, `reputation_points` INSERT true — Jugendschutz-/Gamification-Manipulation | Droppen | Client-Write-Grep vor Drop |
| RLS-6 | MED | `passkey_challenges` INSERT+DELETE true (Login-DoS/Manipulation) | Scopen | `lib/services/passkey.service.ts`-Flow verifizieren |
| RLS-7 | MED | `user_blocks` ALL, `warning_cache`, `cron_job_runs`, `monthly_summaries`, `business_settings/transactions`, `civic_*_service_insert` true | Droppen/Scopen | Gering, je Tabelle pruefen |
| FN-1 | MED | 31 Funktionen mit mutablem `search_path` | `ALTER FUNCTION ... SET search_path = public, pg_temp` | Mechanisch; Branch-Test empfohlen |
| FN-2 | MED | 42 SECURITY-DEFINER-Funktionen von anon ausfuehrbar | Trigger-/Cron-Funktionen: REVOKE anon+authenticated (safe). RLS-Helper: nur anon, nach Branch-Test. `get_display_names` wird client-seitig genutzt (authenticated behalten) | Helper-Revokes koennen anon-Reads 500en lassen statt leer |
| ST-1 | LOW-MED | Buckets `images`, `report-photos`, `tts-cache` oeffentlich listbar (breite SELECT-Policies); kein `.list(`-Aufruf im Code | Die 3 SELECT-Policies droppen (Public-URL-Zugriff bleibt) | Keins gefunden |
| AUTH-1 | LOW | Leaked-Password-Schutz aus, wenige MFA-Optionen | 2 Dashboard-Schalter | Founder-Hand |
| INFO | — | `data_retention_log`, `security_forensics`: RLS ohne Policies = default deny | Beabsichtigt, keine Aktion | — |

Dazu: fertige Migrationen **196/199** (199 = Fix fuer den einzigen Advisor-ERROR `quarter_collection_areas`
SECURITY DEFINER View) liegen im Repo und warten auf Prod-Apply (Founder-Go).

## Empfohlene Pakete

- **Paket A (risikofrei, sofort mit Founder-Go):** RLS-2-Policy droppen, ST-1 (3 Bucket-SELECT-Policies) droppen,
  Mig 196 + 199 applien. Danach Advisor-Recheck: ERROR muss weg sein.
- **Paket B (Scoped-Fixes mit Flow-Verifikation, Branch-Test):** RLS-1, -3 bis -7 als Migration + Tests → Codex-Handoff.
- **Paket C (Funktions-Haertung):** FN-1 komplett + FN-2 Trigger/Cron-Teil als Migration, Branch-Test → Codex-Handoff.
- **Founder-Hand:** AUTH-1 (2 Dashboard-Klicks).

Einordnung Ausnutzbarkeit heute: Closed Pilot, 0 echte Nutzer, Signup invite-gated — Angriffsflaeche primaer
durch eigene Test-Accounts. Fuer Produktreife (echte Nutzer) sind RLS-1 bis -4 harte Blocker.

```text
Mini-Audit Produktreife-Block-1 (2026-07-14):
- RLS/Trigger geprueft: 23 always-true-Policies (pg_policies live), users-INSERT-Trigger, view quarter_collection_areas
- Findings: RLS-1 CRITICAL, RLS-2/3/4 HIGH, RLS-5 MED-HIGH, RLS-6/7 MED, FN-1/2 MED, ST-1 LOW-MED, AUTH-1 LOW
- Audit-Trail: n/a (reine Triage) | Rate-Limit: n/a
```
