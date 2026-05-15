# Claude an Codex: Security Pass 63 — Drei Fixes geschrieben, Push + Test + Mig-Apply offen

Datum: 2026-05-15
Autor: Claude (Sonnet 4.6)
Scope: 1 CRITICAL + 3 HIGH Findings aus heutigem Security-Audit. Code lokal vorbereitet, Tests teilweise drin, Push/Apply offen.

---

## TL;DR

Heute Security-Review der Pass-56-bis-63-Welle gemacht. Drei verkettete Findings rund um Privilege Escalation:

1. **ADM-3 (CRITICAL)** + **YOUTH-1 (HIGH)** — `users_update_own` und `youth_profiles_update_own` RLS-Policies erlauben jedem User UPDATE auf alle Spalten. Reproduzierbar: jeder Pilot-User kann sich via Browser-Console zu `super_admin` machen oder Youth-Restriktionen entfernen.
2. **ADM-2 (HIGH)** — `nachbar-admin/lib/admin-auth.ts` behandelt Legacy `is_admin=true` ohne `role`-Spalte als `super_admin`. Bei 1183 historischen Usern in Prod-DB unbekanntes Risiko.
3. **FS-1 (HIGH)** + **FS-2 (HIGH)** — Family-Setup-Claim ohne dediziertes Rate-Limit, ohne Audit-Trail.

Code-Stand: 5 Files neu/geaendert, 1 Mig-File + Rollback, 1 Unit-Test. Lokal, **nicht gepusht**, **Mig nicht appliziert**.

---

## Geaenderte Dateien

| Datei | Aenderung | Loc |
|---|---|---|
| `nachbar-io/supabase/migrations/198_users_and_youth_update_restrictions.sql` | NEU — BEFORE-UPDATE-Trigger auf `users` + `youth_profiles` | +120 |
| `nachbar-io/supabase/rollbacks/198_users_and_youth_update_restrictions.down.sql` | NEU — Drop-Trigger + Drop-Functions | +9 |
| `nachbar-admin/lib/admin-auth.ts` | FOUNDER_USER_IDS hardcoded, Legacy `is_admin=true` → `quarter_admin` statt `super_admin`, Founder bleibt super_admin via ID-Set | +14/-3 |
| `nachbar-io/lib/rate-limit.ts` | Neue Kategorie `family-setup` (10/min IP-basiert) vor default 60/min | +11 |
| `nachbar-io/lib/family-setup/audit.service.ts` | NEU — `recordFamilySetupAudit` + `extractAuditContextFromRequest` (Best-Effort-Insert, ip_hash + user_agent_hash) | +118 |
| `nachbar-io/app/api/family-setup/[token]/route.ts` | Preview-Select um `id` erweitert, Audit-Insert nach Claim und auf Fehlerpfad | +24/-2 |
| `nachbar-io/__tests__/lib/family-setup/audit-service.test.ts` | NEU — 7 Tests fuer Audit-Helper (success, null-Context, DB-Fehler, Throw, IP-Hash-Determinismus, Header-Parsing) | +131 |

**Pre-Check durchgefuehrt:** Mig 197 ist letzte LIVE; Mig 196 file-only; Mig 198 ist die naechste freie Nummer. `lib/rate-limit.ts` hatte vorher kein family-setup-Limit (default 60/min IP greift, ist aber zu locker). `lib/family-setup/audit.service.ts` existierte nicht; Audit-Tabelle ist seit Mig 197 da.

---

## Was du als naechstes machen sollst

### Schritt 1 — Mig 198 lokal verifizieren

Lokaler Supabase-Stack hochfahren und Mig 198 anwenden:

```bash
cd nachbar-io
npm run supabase:start
npx supabase db reset
# Bestaetigen dass Mig 198 ohne Fehler durchlaeuft
npx supabase db query --linked --file supabase/migrations/198_users_and_youth_update_restrictions.sql
```

Dann manuell testen:

```sql
-- Setup: einen Test-User auf dem lokalen Stack haben (z.B. via Register-Flow)
-- Als anon role (= User selbst, nicht service_role):
SET ROLE anon;
SET request.jwt.claim.sub = '<test-user-uuid>';

-- Diese Updates muessen alle FAIL (kein Wert-Change durch Trigger):
UPDATE users SET is_admin = true WHERE id = '<test-user-uuid>';
SELECT is_admin FROM users WHERE id = '<test-user-uuid>'; -- erwartet: false

UPDATE users SET role = 'super_admin' WHERE id = '<test-user-uuid>';
SELECT role FROM users WHERE id = '<test-user-uuid>'; -- erwartet: NULL oder alter Wert

UPDATE users SET settings = jsonb_set(settings, '{youth_restrictions}', '[]'::jsonb)
WHERE id = '<youth-user-uuid>';
SELECT settings->'youth_restrictions' FROM users WHERE id = '<youth-user-uuid>';
-- erwartet: original-Array, nicht []

-- Als service_role muss alles funktionieren:
SET ROLE service_role;
UPDATE users SET is_admin = true WHERE id = '<test-user-uuid>';
SELECT is_admin FROM users WHERE id = '<test-user-uuid>'; -- erwartet: true
```

### Schritt 2 — Code-Tests laufen lassen

```bash
cd nachbar-io
npx vitest run __tests__/lib/family-setup/audit-service.test.ts
npx tsc --noEmit
npx eslint lib/family-setup/audit.service.ts lib/rate-limit.ts app/api/family-setup/[token]/route.ts
npm run build
```

Erwartet: 7/7 grun, tsc 0 Fehler, eslint 0 Fehler, build ok.

```bash
cd nachbar-admin
# Falls eigenes Test-Setup: requireAdmin-Tests anpassen oder schreiben
npx tsc --noEmit
npm run build
```

### Schritt 3 — Datenmigration vor Apply pruefen (NICHT auf Prod schreiben ohne Founder-Go)

```sql
-- Lesen (read-only) — wie viele User haben is_admin=true OHNE role-Spalte?
SELECT id, email_hash, is_admin, role, created_at
FROM users
WHERE is_admin = true AND (role IS NULL OR role NOT IN ('super_admin', 'quarter_admin'))
ORDER BY created_at;
```

Falls 0 Treffer → admin-auth.ts-Aenderung ist nebenwirkungsfrei.
Falls > 0 Treffer und ein Treffer ist KEINE bekannte Founder-ID → Founder fragen: sollen die als super_admin oder quarter_admin behandelt werden? Eventuell pre-Apply ein UPDATE auf `role='super_admin'` fuer historische User. Aktuell schuetzt FOUNDER_USER_IDS in admin-auth.ts nur Thomas — andere Legacy-Admins muessen explizit role bekommen.

### Schritt 4 — Push + Founder-Go fuer Prod-Apply

```bash
git add nachbar-io/supabase/migrations/198_users_and_youth_update_restrictions.sql
git add nachbar-io/supabase/rollbacks/198_users_and_youth_update_restrictions.down.sql
git add nachbar-admin/lib/admin-auth.ts
git add nachbar-io/lib/rate-limit.ts
git add nachbar-io/lib/family-setup/audit.service.ts
git add nachbar-io/app/api/family-setup/[token]/route.ts
git add nachbar-io/__tests__/lib/family-setup/audit-service.test.ts
git add nachbar-io/docs/plans/handoff/2026-05-15-claude-an-codex-security-pass63-findings.md

git commit -m "fix(security): pass 63 audit findings — privilege escalation + family-setup hardening"
git push origin master
```

Dann **Founder-Go-Satz fragen**: `MIGRATION-PROD-GO-198`.

Nach Go:

```bash
# Mig 198 auf Prod anwenden via Supabase MCP
# 1. apply_migration mit dem Inhalt aus 198_users_and_youth_update_restrictions.sql
# 2. migration repair --status applied 198
# 3. Verifikation: SELECT proname FROM pg_proc WHERE proname IN ('enforce_user_update_restrictions', 'enforce_youth_profiles_update_restrictions');
#    erwartet: 2 Zeilen
# 4. SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_users_update_restrictions', 'trg_youth_profiles_update_restrictions');
#    erwartet: 2 Zeilen
```

### Schritt 5 — Live-Smoke

Nach Deploy:

```bash
# Audit-Insert-Pfad: claim eines Test-Tokens triggert ein invitation_claimed-Audit-Event
# Auf Prod-DB (read-only):
SELECT event_type, COUNT(*)
FROM family_setup_audit
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

Rate-Limit-Smoke (10/min IP):

```bash
# 11 Requests in 60s auf einen invalid Token — 11. muss 429 sein
for i in $(seq 1 11); do
  curl -sS -o /dev/null -w "%{http_code}\n" \
    "https://nachbar-io.vercel.app/api/family-setup/invalid-token-$i"
done
# erwartet: 410 410 410 410 410 410 410 410 410 410 429
```

---

## Bewusst NICHT gemacht

- **Test fuer Mig 198 als Vitest** — Trigger-Logik laesst sich nur gegen echte Postgres-Instanz testen. SQL-Test-Snippet in Schritt 1 manuell auf lokalem Stack.
- **Test fuer admin-auth.ts** — nachbar-admin hat Test-Setup, das ich nicht durchschaut habe. Kannst du ergaenzen mit Mock-Supabase wenn moeglich.
- **claimChildSetupInvitation und claimSeniorSetupInvitation Service-Funktionen direkt erweitert** — Audit-Inserts laufen jetzt in der Route, das deckt den Hot-Path. Wenn andere Caller (Cron, Backfill) auch loggen sollen, Audit-Aufruf in den Service-Funktionen ergaenzen.
- **Friend-Approve expires_at-Check (FS-4)** — separater Backlog-Punkt aus dem Audit, nicht Top-3.
- **Token-URL-Hardening (FS-5)** — separater Backlog-Punkt.
- **Passwort-Policy beim Family-Setup-Claim (FS-3)** — separater Backlog-Punkt.

---

## Pilot-Bereitschaft

| Vor Pass 63 | Nach Audit (heute morgen) | Nach diesen Fixes (lokal) | Nach Prod-Apply |
|---|---|---|---|
| ~96% | ~85% | ~92% lokal | ~96% LIVE |

**Hebel um auf 96+ LIVE zu kommen:**
1. Mig 198 Prod-Apply (entschaerft CRITICAL + HIGH)
2. admin-auth.ts auf Prod (entschaerft Legacy-is_admin-Pfad)
3. Family-Setup Rate-Limit + Audit auf Prod (DSGVO Art. 32 erfuellt)

**Bewusst offen fuer Pilot 0:**
- FS-3 Passwort-Policy (vor Familie #1 angehen)
- FS-4 Friend-Approve expires_at-Check (vor Familie #5)
- FS-5 Token-URL-Hardening (vor MRR > 500)
- Externer Pentest (vor MRR > 2k)

---

## Founder-Hand offen

- `MIGRATION-PROD-GO-198` Go-Satz
- Datenmigration falls historische Admins ohne `role` existieren (Schritt 3)
- Push-Go falls Codex nicht autonom pushen darf in der Welle
- Vercel-Re-Deploy nach Push (nachbar-io ist workflow_dispatch only)

---

## Rote Gates wie immer

- Prod-DB-Schreiben nur mit `MIGRATION-PROD-GO-198`
- Push nach Variante-A erlaubt
- Vercel-Env-/Secrets-/Provider-/Billing-Aenderungen nicht erforderlich fuer diese Welle
- Bei unerwarteten Konflikten in Mig 198 (z.B. wegen Prod-Drift): Rollback-File `supabase/rollbacks/198_*.down.sql` nutzen

Bei Fragen: Brief liegt unter `docs/plans/handoff/2026-05-15-claude-an-codex-security-pass63-findings.md`.
