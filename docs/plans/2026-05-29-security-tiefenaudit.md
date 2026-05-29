# Security-Tiefenaudit nachbar-io — 2026-05-29

**Methodik:** Multi-Agent-Audit, 8 Dimensionen parallel (RLS, Broken Access Control/IDOR, Auth/Token, Admin-Surface, Secrets, Injection/XSS, Crypto/PII, Rate-Limit). Jedes Finding von einem zweiten Agent **adversarial gegengeprüft** (read-only). 40 Agents, ~3 Mio Tokens.
**Scope:** `nachbar-io` (+ `nachbar-admin`, `nachbar-arzt` wo berührt). Baut auf Security-Phasen 1–5 + Pass-63-Fixes auf.
**Ergebnis:** 32 gemeldet → **27 verifiziert** (3 HIGH, 9 MEDIUM, 15 LOW), 5 als False Positive verworfen.

> **Einordnung Severity:** Alle 3 HIGH wurden von den Verifizierern bewusst von CRITICAL auf HIGH **runtergestuft, weil aktuell 0 echte Nutzer** existieren (nur synthetische Testdaten). **Bei Pilot-Start mit echten Senioren-Adressen werden die drei HIGH zu CRITICAL** — sie sind die Pre-Pilot-Pflicht-Fixes.

---

## Gemeinsamer Wurzelgrund der HIGH-Findings

Migration 052 (`quarter_rls_policies`) hat bei der Multi-Quartier-Welle die Content-Tabellen quarter-isoliert, aber **`users`, `households`, `map_houses` ausgelassen**. Dadurch sind Stammdaten (inkl. Adressen + invite_codes) global statt quartier-gescopt lesbar. Das erklärt H1 + mehrere MEDIUM/LOW. **Ein zusammenhängender RLS-Fix (Mig "053") räumt H1, M1, L1 gemeinsam ab.**

---

## HIGH (3) — Pflicht vor Pilot-Start

### H1 — `households` voll lesbar für jeden eingeloggten Nutzer (RLS)
**`supabase/migrations/040_fix_rls_security.sql:18-20`**
SELECT-Policy `households_read_authenticated USING (auth.uid() IS NOT NULL)` → jeder authentifizierte Nutzer (auch unverifiziert, auch fremdes Quartier) liest **alle** Haushalte aller Quartiere. Der Browser nutzt den Anon-Key (`lib/supabase/client.ts`), RLS ist also die einzige Grenze. Client fragt `households` direkt ab (`lib/hooks/useMapStatuses.ts:359`) — ein manipulierter Query holt `street_name, house_number, lat, lng, invite_code`. Die in Mig 040 versprochene Schutz-View existiert nicht (in keiner Migration).
**Impact:** Massendaten-Abfluss aller Haushaltsadressen + GPS + invite_code-Verifikationssecrets über alle Quartiere. Bei echten Senioren: Stalking-/Einbruchsrisiko + Quartiers-Beitritt mit fremden invite_codes.
**Fix:** SELECT quarter-scopen (`USING (quarter_id = get_user_quarter_id() OR is_super_admin() OR is_quarter_admin_for(quarter_id))`, analog Mig 052) **+** `REVOKE SELECT (invite_code) ON households FROM authenticated, anon` oder invite_code in service-role-only-Tabelle auslagern. Karten-Reads über schlanke quarter-gefilterte View ohne invite_code.

### H2 — `nachbar-admin`: Quarter-Scoping wird nie erzwungen
**`nachbar-admin/lib/admin-auth.ts:36-100`** (+ `medical/patients/route.ts:10`, `compliance/dsar/route.ts:10/66/121`, `finance/transactions/route.ts:9`)
`requireAdmin()`/`canAccessQuarter()` existieren, werden in den Datenrouten aber **nicht angewandt** — ein `quarter_admin` sieht/ändert plattformweit alle Quartiere: Finanztransaktionen, **Medical-Patienten**, **DSAR-Anträge** (Datenauskünfte).
**Impact:** Quartiers-Admin eines Pilot-Quartiers kann Gesundheits- und Finanzdaten **fremder** Quartiere lesen/bearbeiten. Privilege-Boundary-Bruch über Mandantengrenze.
**Fix:** In jeder quartierbezogenen nachbar-admin-Route `canAccessQuarter(auth, quarterId)` bzw. `.in('quarter_id', auth.allowedQuarterIds)` erzwingen. Reine Plattformdaten davon ausnehmen.

### H3 — Nachbar-Adressen gelangen über `/api/alerts` in den Client
**`nachbar-io/app/api/alerts/route.ts:25`**
Die offene Alert-Liste liefert Adresse + Koordinaten an alle aus → Verstoß gegen die `household_id`-only-Regel (DSGVO).
**Impact:** Adressdaten im Client-State auch ohne Helfer-Annahme; verschärft H1.
**Fix:** Datenminimierung am Endpoint — Adresse/GPS erst bei Helfer-Annahme ausliefern (analog `care_sos`), sonst nur `household_id` + grobes Quartier. Hängt mit H1-RLS-Fix zusammen.

---

## MEDIUM (9) — vor Pilot-Ausweitung

| # | Dimension | Finding | Ort |
|---|---|---|---|
| M1 | rls | `users` nicht quarter-isoliert — Profildaten cross-quarter lesbar (gleicher Wurzelgrund wie H1) | `001_initial_schema.sql:315` |
| M2 | authz | `listKioskPhotos`: Caregiver-Check ignoriert angefragtes `household_id` (nur durch RLS abgefangen) | `modules/care/services/caregiver/kiosk-photos.service.ts:24-43` |
| M3 | authn | Kiosk-PIN-Login: 4-stellige PIN, unauth., **kein Rate-Limit**, User-Enumeration | `app/api/kiosk/login/route.ts:120-142` |
| M4 | authn | Anamnese-Medical-Token im **Klartext** gespeichert, schwache Validierung, kein Per-Token-Limit | `nachbar-arzt/app/api/anamnese/send/route.ts:54-66` |
| M5 | authn | Rate-Limit für Token-/Code-Lookups ist **In-Memory statt Redis** (Edge-inkonsistent → wirkungslos auf Vercel) | `lib/rate-limit.ts:122-198` |
| M6 | admin | Vergabe/Entzug `quarter_admin`-Rolle **ohne `admin_audit_log`-Eintrag** | `modules/admin/services/quarter-admins.service.ts:43-147` |
| M7 | injection | User-`website_url` ohne Schema-Validierung in `<a href>` (`javascript:`/`data:`-URI möglich) | `app/(app)/handwerker/neu/page.tsx:115` |
| M8 | crypto-pii | **Art.-9-Gesundheitsdaten** (Medikamentenname, SOS-Notizen) im **Klartext im Audit-Log** | `modules/care/services/cron-medications.service.ts:240` u.a. |
| M9 | ratelimit | Kiosk-PIN-Login ohne edge-konsistentes Limit + ohne Brute-Force-Trap | `app/api/kiosk/login/route.ts:121-141` |

> M3/M9 (Kiosk-PIN) betreffen den geparkten Kiosk-Pfad — vor dessen Reaktivierung Pflicht. M5 ist strukturell wichtig: In-Memory-Rate-Limits sind auf Vercel-Edge faktisch wirkungslos (pro-Instanz).

---

## LOW (15) — Härtung / Defense-in-Depth

| # | Dim | Finding | Ort |
|---|---|---|---|
| L1 | rls | `map_houses` nicht quarter-isoliert (Wurzelgrund wie H1/M1) | `007_map_houses.sql:22-23` |
| L2 | rls | `caregiver_links` resident-UPDATE ohne Spalten-Schutz auf Sensitiv-Flags | `071_caregiver_links.sql:50-52` |
| L3 | rls | ADM-3-Schutz hängt nur am Trigger — `users_update_own` erlaubt UPDATE aller Spalten (Defense-in-Depth) | `001_initial_schema.sql:316` |
| L4 | authn | Caregiver-Invite-Code mit `Math.random()` statt CSPRNG | `modules/care/services/caregiver/invite.service.ts:15-22` |
| L5 | authn | `SECURITY_E2E_BYPASS` ohne code-seitigen Prod-Guard (nur env-diszipliniert) | `lib/security/security-middleware.ts:63-68` |
| L6 | authn | `device_tokens`: Klartext-Token-Fallback noch aktiv, keine Expiry/Revocation | `lib/device/auth.ts:78-93` |
| L7 | admin | nachbar-admin-Middleware **fällt offen**, wenn `ADMIN_ACCESS_PIN` nicht gesetzt | `nachbar-admin/middleware.ts:57-66` |
| L8 | secrets | Prod-Anon-JWT + Live-Testnutzer-Passwort hartcodiert in Test-Skript | `tests/interaction/run-interaction-tests.sh:10,29` |
| L9 | secrets | Statisches Langzeit-TURN-Credential clientseitig (`NEXT_PUBLIC_TURN_CREDENTIAL`) | `lib/webrtc/peer-connection.ts:14-23` |
| L10 | secrets | Gitleaks-Scan nur lokaler pre-commit-Hook, **nicht in CI** | `.githooks/pre-commit:4-10` |
| L11 | secrets | Service-Role-Client inline in ~12 Routen statt zentralem `getAdminSupabase()` | `app/api/admin/quarters/route.ts:26-28` u.a. |
| L12 | injection | PostgREST-Filter-Injection in Handwerker-Suche (`.or()` mit roher Eingabe) | `lib/craftsmen/hooks.ts:43` |
| L13 | crypto-pii | Decrypt-Fehler still als Klartext-Passthrough/Platzhalter geschluckt | `modules/care/services/field-encryption.ts:32-36` |
| L14 | ratelimit | Brute-Force-Trap hängt am wirkungslosen In-Memory-429, nur Passkey-Routen | `proxy.ts:96-106` |
| L15 | ratelimit | `check-invite` ohne Enumeration-Limit, akzeptiert Alt-Code mit kleinem Schlüsselraum | `app/api/register/check-invite/route.ts:16-27` |

---

## False Positives (5, von Verifizierern verworfen)
Je 1 in authz, authn (2), injection, crypto-pii — als bereits gemitigt (RLS/Trigger/Middleware) oder nicht erreichbar eingestuft. Details im Roh-Ergebnis.

---

## Empfehlung (priorisiert)

**Block A — vor Pilot-Start mit echten Nutzern (Pflicht, sonst Adress-/Gesundheitsdaten-Abfluss):**
1. **H1 + M1 + L1** als eine RLS-Migration: `households`/`users`/`map_houses` quarter-scopen + `invite_code` column-REVOKE. (Das ist der größte Hebel — räumt 3 Findings auf einmal.)
2. **H3** Datenminimierung `/api/alerts`.
3. **H2** Quarter-Scoping in `nachbar-admin`-Datenrouten erzwingen.
4. **M8** Art.-9-Daten aus Audit-Log-Klartext entfernen (DSGVO Art. 9).

**Block B — vor Feature-Ausweitung / Kiosk-Reaktivierung:**
M5 (Redis-Rate-Limit), M3/M9 (Kiosk-PIN), M4 (Anamnese-Token-Hash), M6 (Admin-Audit-Trail), M2/M7.

**Block C — Härtung, laufend:** L1–L15. Schnellgewinne: L10 (Gitleaks in CI), L7 (admin fail-closed), L5 (E2E-Bypass-Guard), L4 (CSPRNG).

**Jede Migration: File-first + Mini-Audit + RED-Test vor Prod-Apply. Prod-Apply = Founder-Go (rote Zone).**
