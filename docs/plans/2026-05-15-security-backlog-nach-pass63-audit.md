# Security-Backlog nach Pass-63-Audit

Datum: 2026-05-15
Autor: Claude (Sonnet 4.6)
Quelle: Security-Audit Pass 63 + Live-Apply von Mig 198 / nachbar-admin / Family-Setup-Welle

## Zweck

Diese Datei haelt alle Security-Findings, die im Audit identifiziert, aber nicht in der gleichen Welle gefixt wurden. Pro Item: Severity, Wurzel-Datei, Empfehlung, Pilot-Trigger (wann spaetestens fixen).

---

## Welle Pass-66 LIVE — bereits geschlossen

| ID | Severity | Was | Status |
|---|---|---|---|
| ADM-3 | CRITICAL | `users_update_own` Policy ohne Spalten-Schutz | ✅ Mig 198 LIVE Prod |
| YOUTH-1 | HIGH | `youth_profiles_update_own` ohne Spalten-Schutz | ✅ Mig 198 LIVE Prod |
| ADM-2 | HIGH | Legacy is_admin=true → super_admin | ✅ `nachbar-admin/lib/admin-auth.ts` Fix LIVE |
| FS-2 | HIGH | Family-Setup-Claim ohne Audit-Trail | ✅ `lib/family-setup/audit.service.ts` LIVE |
| FS-1 | HIGH (teilweise) | Family-Setup-Claim ohne dedizierten Rate-Limit | ⚠️ Config LIVE, aber In-Memory → siehe RL-1 unten |

---

## Offen — vor Pilot-Familie #1

### FS-3 — Passwort-Policy beim Family-Setup-Claim

**Severity:** MEDIUM
**Datei:** `lib/family-setup/child-setup.service.ts:148-225`, `lib/family-setup/senior-setup.service.ts:156-226`
**Was:** `claimChildSetupInvitation` und `claimSeniorSetupInvitation` pruefen nur `!input.password` (truthy). `authAdmin.createUser` wird mit dem rohen User-Input aufgerufen. Supabase Auth hat Default-Mindest 6 Zeichen — zu wenig fuer Kinderkonten in einem MDR-readiness-Produkt.
**Empfehlung:** `validatePassword(input.password)` mit min 10 Zeichen + Komplexitaetspruefung vor `authAdmin.createUser`. Pruefen ob `lib/auth/password-policy.ts` o.ae. schon existiert (Pre-Check).
**Aufwand:** ~30 min Code + Test.
**Trigger:** Vor erstem echten Kinder- oder Senior-Konto.

---

## Offen — vor Familie #5

### FS-4 — Friend-Approve prueft `expires_at` nicht

**Severity:** MEDIUM
**Datei:** `lib/family-setup/youth-friend-invites.service.ts:127-141`
**Was:** Beim Approve wird die Request via `.eq("id", input.requestId).single()` geladen und nur Status `pending_parent_approval` und `guardian_user_id` geprueft. `expires_at` wird NICHT geprueft. Vor 30 Tagen verschickte Anfrage mit abgelaufener `expires_at` kann der Elternteil heute noch freigeben.
**Empfehlung:** `if (new Date(request.expires_at) <= now) throw 409 expired`. Plus separate kuerzere TTL fuer Pending-State (z.B. 7 Tage).
**Aufwand:** ~30 min Code + Test.
**Trigger:** Wenn mehr als 1 Familie aktive Friend-Invite-Requests hat.

### RL-1 — Family-Setup-Counter auf Redis migrieren

**Severity:** HIGH (Defense-in-Depth)
**Datei:** `lib/rate-limit.ts`, `proxy.ts`
**Was:** `RateLimiter` ist In-Memory (Map). Vercel Edge ist stateless + multi-region. Live-Smoke 2026-05-15 zeigte: 12 Curl-Requests, alle 410, kein 429 — verschiedene Edge-Instanzen sahen jeweils Request #1. Default 60/min und neuer `family-setup 10/min` greifen nur per Edge-Instance.
**Echter Schutz heute:** Security-Trap-System (`lib/security/traps/`, Upstash Redis) mit `auth_bruteforce`-Trap erkennt Brute-Force ueber 4D-Risk-Scorer und sperrt mit 4h-Lockout.
**Empfehlung:** Family-Setup-Claim-Counter als eigenen Trap-Typ in `lib/security/traps/` einfuehren (`family_setup_brute_force`?) ODER Family-Setup im Risk-Scorer als gewichtiger Vektor zaehlen. Redis-Key `fs_claim_count:ip:{hash}` mit 24h Decay.
**Aufwand:** ~1-2h Code + Test + Doku.
**Trigger:** Vor MRR > 500 oder vor erster oeffentlicher Pilot-Erwaehnung.

---

## Offen — vor MRR > 500

### FS-5 — Token-URL-Hardening

**Severity:** MEDIUM
**Datei:** `app/(auth)/setup/[token]/page.tsx:8`, `modules/family-setup/components/SetupClaimForm.tsx:34,57`
**Was:** Klartext-Token in URL `/setup/<token>` landet in Vercel-Edge-Logs, Browser-History, Referrer-Header (bei Klick auf externe Links), Browser-Sync, Service-Worker-Caches. Token ist Single-Use + 24h TTL — Risiko begrenzt, aber Insider-Log-Zugriff koennte ungeloeste Tokens uebernehmen.
**Empfehlung:**
1. `Referrer-Policy: no-referrer` auf der `/setup/[token]`-Seite via Next-Metadata.
2. Token-Stripping in Logging-Middleware fuer Pfade `^/setup/`.
3. Optional Phase-2: GET-Preview ueber Header `X-Setup-Token` statt URL, POST mit Token im Body — Server-Side-Page-Render dann komplexer.
**Aufwand:** ~1h (Schritte 1+2), ~3h fuer 3.
**Trigger:** Vor MRR > 500 oder Public-Launch.

### FS-7 — U13-Doppel-Bestaetigung im Family-Setup

**Severity:** LOW (compliance polish)
**Datei:** `lib/family-setup/child-setup.service.ts:422-431`
**Was:** `validateChildSetupInput` erlaubt `age >= 0`. Family-Setup ist die Eltern-Einwilligung fuer Konten unter 16 (DSGVO Art. 8 DE-Schwelle). Aktuell nur via Pflicht-Checkbox; dokumentiert in `consent_version: family-setup-v1.0-2026-05-14`.
**Empfehlung:** Doppel-Bestaetigungs-Checkbox fuer U13. Plus `parental_consent_recorded: true` im Family-Setup-Audit-Log mit-loggen.
**Aufwand:** ~1h UI + Test.
**Trigger:** Vor erstem U13-Konto (vermutlich Phase 2).

### ADM-4 — Auth-User-Liste 1000-Cap → Pagination

**Severity:** LOW
**Datei:** `nachbar-admin/app/api/admin/settings/users/route.ts:117`
**Was:** `listUsers({page:1, perPage:1000})` — bei >1000 Auth-Usern fehlen Email/lastSignIn fuer Spaeter-Erstellte.
**Empfehlung:** Echte Pagination im Admin-Panel UI.
**Aufwand:** ~2h.
**Trigger:** Vor >800 Auth-Users.

---

## Offen — Pre-Phase-2 (nach Pilot 0)

### YOUTH-2 — Deterministischer phone_hash semantisch korrigieren

**Severity:** MEDIUM (Semantik)
**Datei:** `nachbar-io/lib/services/registration.service.ts:696-698` + Mig 094 Z.19
**Was:** `phone_hash = sha256("registration:${user_id}")`. Pflichtfeld der Tabelle. Da der Hash nur von `user_id` abhaengt, ist er weder echte Telefonnummer noch echter Anonymisator. Bei spaeterer Migration auf "echte" Phone-Hashes kann derselbe User unter zwei Eintraegen erscheinen.
**Empfehlung:** Spalte nullable machen (Mig erforderlich) oder mit explizitem Praefix `notset:${user_id}` arbeiten + im Code dokumentieren.
**Aufwand:** ~1h Mig + Migration der existierenden Daten.
**Trigger:** Bevor SMS-/Phone-Features fuer Youth aktiv werden.

### ADM-1 — Audit-Log Quarter-Scope

**Severity:** HIGH (deprioritized weil aktuell nur super_admin existiert)
**Datei:** `nachbar-admin/app/api/admin/audit-log/route.ts:9-10`
**Was:** `requireAdmin()` reicht fuer GET. Ein `quarter_admin` saehe globale Super-Admin-Aktionen inkl. Vorher/Nachher-Snapshots.
**Empfehlung:** Super-Admin-Gate oder Quarter-Scoping auf `target_id IN (SELECT user_id FROM households WHERE quarter_id = ANY(admin_quarters))`.
**Aufwand:** ~1h.
**Trigger:** Vor erstem `quarter_admin`-Account.

### Externer Pentest

**Severity:** STRATEGIC
**Datei:** `docs/security/pen-test-scope.md`, `docs/security/pentest-vendor-shortlist.md`
**Was:** Beauftragungs-bereit, Frist verschoben bis Umsatz.
**Empfehlung:** Vergabe an AWARE7/ProSec/DSN/Yekta (12-18k EUR).
**Trigger:** MRR > 2k EUR.

---

## Bewusst NICHT im Backlog

- ADM-5 (HouseholdCodeManager Read nicht geloggt) — auf einer rein read-only Liste mit invite_code, das ohnehin im Brief steht: nicht Pilot-Blocker.
- FS-6 (Throwaway-Placeholder-Token-Hash bei pending Friend-Request) — durch Status-Check abgesichert, theoretisches Defense-in-Depth-Issue.
- Refactoring/Code-Style/Performance-Improvements ohne Security-Bezug.

---

## Mini-Audit-Regel als Praevention

Damit dieser Backlog nicht erneut entsteht, gilt ab sofort:

**Bei jeder Welle mit Auth-/RLS-/Admin-Surface ist ein 5-Minuten-Mini-Audit Pflicht** (`.claude/rules/security-mini-audit.md`). RLS-Lese-Pass + Trigger-Inventar + Privilege-Spalten-Sweep + Audit-Trail + Rate-Limit. Output als 3-Zeiler im Codex-Brief oder in der Plan-Datei. Bei CRITICAL/HIGH STOP + Founder.

Phase-1-5-Voll-Audits bleiben noetig vor Pilot 0, Phase-Wechsel, MRR > 2k. Mini-Audit ist Frueherkennung, kein Vollersatz.
