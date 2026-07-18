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

## Paket B+C Implementierungsstand 2026-07-16

Der Code- und Live-Pre-Check hat die offenen Policies bestaetigt und zugleich zwei
Abweichungen von der urspruenglichen Triage gefunden:

- Der in Migration 014 definierte `enforce_user_defaults`-Insert-Trigger fehlt live.
  Migration 201 ersetzt ihn daher durch einen service-role-kompatiblen Insert-Guard,
  der privilegierte Nutzerfelder auf sichere Defaults setzt. Family-Setup und
  Registrierung wurden als service-role-Pfade verifiziert.
- Gamification- und Jugend-Services schreiben teilweise weiterhin mit der
  authentifizierten User-Session. Die betreffenden INSERT-Policies werden deshalb
  auf `user_id = auth.uid()` begrenzt, nicht ersatzlos entfernt. Direkte
  Eigenmanipulation von Punktewert/Aktion bleibt als Restbefund bestehen und braucht
  einen separaten Server-Adapter, bevor diese Policies vollstaendig entfallen koennen.

Migration 202 pinnt die 31 live ermittelten Funktions-Signaturen auf
`search_path = public, pg_temp` und entzieht `PUBLIC`, `anon` und `authenticated`
die Ausfuehrung der 10 SECURITY-DEFINER-Triggerfunktionen sowie der beiden
Cleanup-Funktionen. `get_display_names(uuid[])` bleibt fuer authentifizierte Clients
ausfuehrbar.

Der damalige Branch-Replay-Blocker wurde am 2026-07-17 durch die kanonische
Production-History mit 199 Migrationen beseitigt. Der verpflichtende erneute
Supabase-Branch-Test lief am 2026-07-18 vollstaendig gruen:

Ein erster technisch gesunder Versuch wurde vor 201/202 automatisch geloescht, weil
der lokale SQL-Datei-Loader eine nicht verfuegbare Base64-Funktion verwendete. Der
Fehler betraf nur die Test-Orchestrierung; der folgende Wiederholungslauf lieferte die
Evidenz:

- Der nicht persistente Branch startete ohne Production-Daten, replayte alle 199
  kanonischen Migrationen und endete `ACTIVE_HEALTHY` mit 0 Auth- und 0 App-Nutzern.
- Branch-only Test-Fixtures ergaenzten ausschliesslich weiterhin nicht replayte
  Production-Objekte: `business_settings`, `passkey_challenges`, sechs
  sicherheitsrelevante `users`-Spalten und `handle_new_user()`.
- Die unveraenderten Migrationen 201 und 202 wurden danach erfolgreich angewandt.
  Der Branch hatte damit 202 Tracking-Eintraege: 199 History + Fixture + B + C.
- Alle Policy-Smokes waren gruen: `users_insert`, Invitation-UPDATE,
  Gamification-INSERTs und Finance-Policies waren gescoped; elf unsichere
  Service-/Passkey-Policies waren entfernt; der User-Insert-Guard war installiert.
- Der Verhaltens-Smoke setzte privilegierte Eigenwerte auf `resident`, `new`,
  `is_admin=false`, 0 Punkte und entfernte geschuetzte Settings. Ein Insert fuer eine
  fremde User-ID scheiterte erwartungsgemaess mit PostgreSQL `42501` an RLS.
- Paket C: 31/31 Funktions-`search_path`-Pins und 12/12 EXECUTE-Revokes verifiziert;
  `get_display_names(uuid[])` blieb fuer `authenticated` ausfuehrbar.
- Supabase Security Advisor auf dem Testbranch: 0 Findings. Der Testbranch wurde
  unmittelbar danach geloescht; anschliessend existierte wieder nur `main`.

Production blieb unveraendert: read-only verifiziert 199 Migrationen, 0
Advisor-Testmigrationen, 47 als Test markierte Profile und 0 nicht als Test markierte
Profile. Es gab keinen Production-Apply, keinen Deploy und keinen Git-Push. Paket B+C
ist damit branch-verifiziert; ein Production-Apply bleibt ein eigener roter Schritt
mit separatem Founder-Go.

```text
Mini-Audit Produktreife-Block-1 (2026-07-14):
- RLS/Trigger geprueft: 23 always-true-Policies (pg_policies live), users-INSERT-Trigger, view quarter_collection_areas
- Findings: RLS-1 CRITICAL, RLS-2/3/4 HIGH, RLS-5 MED-HIGH, RLS-6/7 MED, FN-1/2 MED, ST-1 LOW-MED, AUTH-1 LOW
- Audit-Trail: n/a (reine Triage) | Rate-Limit: n/a
```
