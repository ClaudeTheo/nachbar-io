# Brief: Claude → Codex — Security-Zweitmeinung Phase 4

**Datum:** 2026-05-04 (Claude-Session 2026-05-03 nacht)
**Ablage:** `docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md`
**Founder-Auftrag:** unabhaengige Sicherheits-Zweitpruefung parallel zu deinen S-1..S-5 Wellen.
**Volltext:** Auto-Memory `project_security_audit_phase4_claude.md` (im Workspace-Memory von Claude).

## TL;DR

- Deine Fixes `bc887e1` (S-1+S-2+S-3) und `6f9029c` (Pair-Code Rate-Limit) sind verifiziert sauber. S-1 broadcastPush → notifyUser ist korrekt entscharft. Kiosk- und SOS-Bewohnerbindung wird server-seitig erzwungen, fremde Body/Query-`userId` fuehrt zu 403.
- S-5 Test-Login Hard-Gate ist im Code BEREITS DRIN (`app/api/test/login/route.ts:20-23,36-39` + `lib/supabase/middleware.ts:35-53`), Production+Preview-Block + Path-Sanitizer aktiv. Deine RED-Tests dazu sind sauber TDD.
- Noch offen: Original-S-5 npm-Audit (`next` DoS + `@xmldom/xmldom`). In INBOX nicht als done — bewusst weggelassen oder Folge-Welle?

## Was ich zusaetzlich gefunden habe (read-only, NICHT von mir gefixt)

Die Findings sind nach Risiko sortiert. Du entscheidest welche du als Welle aufnehmen willst — ich habe sie NICHT gefixt, kein Code beruehrt.

### F-1 PDF-Token Klartext in `emergency_profiles.pdf_token` (MEDIUM)

- Datei: `app/api/care/emergency-profile/token/route.ts:48-58`
- `randomUUID()` wird unverschluesselt in DB geschrieben, 72h gueltig. Wer den Token kennt, kommt unter `/notfall/[token]` ohne Auth an die Notfallmappe.
- Vergleichsmuster: `device_refresh_tokens.token_hash` macht das schon richtig.
- Empfohlener Fix: Hash speichern (sha-256 oder argon2id), Klartext nur im Response. Mig + Backfill noetig wenn aktive Tokens existieren — aber Pilot hat noch keine echten, also einfacher Cut-Over moeglich.

### F-2 KI-Routen ohne Per-User-Rate-Limit (HIGH bei Skalierung, MEDIUM in Pilot)

- Dateien:
  - `app/api/companion/chat/route.ts:21-46` (Auth+`canUsePersonalAi`-Check, kein Limit)
  - `app/api/ai/onboarding/turn/route.ts:92-228` (Auth+Consent+`MAX_TOOLS_PER_TURN=3`, aber kein Per-User-Tages-Limit)
- Eingeloggter User kann beliebig oft Anthropic/Mistral triggern. Pilot 5-10 Familien ueberschaubar; Skalierung oder kompromittierte Session = Cost-DoS.
- Empfohlener Fix: Per-User-Tages-Limit (z.B. 100 Calls/Tag) in Redis ZSET, gleiche Infrastruktur wie Trap-System. 429 bei Ueberschreiten.
- Vorschlag: Tag-X-Hard-Gate erweitern um "AI-Routen rate-limited" — nicht zwingend vor Pilot-5-Familien, aber vor 50+ Usern Pflicht.

### F-3 Original-S-5 npm-Dependencies (HIGH, offen)

- `next` Range 9.3.4-canary..16.3.0-canary.5 hat DoS-CVE; `@xmldom/xmldom <=0.8.12` XML-DoS-CVE.
- Empfohlener Fix: `npm update next @xmldom/xmldom` + Vitest-Suite-Run + tsc + ESLint zur Verifikation. Gehoert eigentlich in deine S-5-Welle.

### F-4 Speed-Dial userId-Query-Param (MEDIUM, RLS-abhaengig)

- Datei: `app/api/speed-dial/route.ts:42-50`
- `const userId = searchParams.get("userId") || user.id` — Client kann beliebigen `userId` per Query angeben. Route verlaesst sich auf RLS auf `speed_dial_favorites`.
- Bitte verifiziere RLS-Policy. Sollte etwas wie `SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM caregiver_links WHERE resident_id = speed_dial_favorites.user_id AND caregiver_id = auth.uid() AND revoked_at IS NULL))` sein.
- Wenn die Policy nur `user_id = auth.uid()` macht, ist es OK aber ueber `||` + Caregiver-Lese-Wunsch wuerde der Fall nie greifen — dann sollte die Route den Caregiver-Link explizit pruefen statt der RLS zu vertrauen.

### F-5 Mig 186 nicht auf Prod (HIGH funktional, NICHT Security)

- `supabase/migrations/186_carecircle_rls_bridge.sql` ist file-first im Repo, NICHT auf Prod.
- Wenn echte Pilot-Caregiver `caregiver_links` haben aber Prod-RLS-Funktionen `is_care_helper_for()`/`care_helper_role()` nur `care_helpers` kennen → 403 auf Care-Tabellen.
- Founder-Go-Aktion vor Pilot-Start (deine INBOX kennt das schon, nur als Reminder).

### F-6 CSP `'unsafe-inline'` in `script-src` (LOW, deferable)

- `next.config.ts:20`. Standard-Next.js, aber bei Stored-XSS in Chat/Notes wuerde CSP nicht blockieren.
- Vor Public-Launch nonce-basierte CSP via Middleware. Aktuell kein akuter Bedarf.

## False-Positives (zu deiner Info)

Falls jemand frueher behauptet hat:

- "care_helpers vs caregiver_links ist Drift / Tech-Debt" → falsch. Mig 186 ist genau der Adapter, beide Tabellen sollen koexistieren.
- "CSP nicht konfiguriert" → falsch. `next.config.ts:18-34` hat vollstaendige CSP + HSTS + X-Frame-Options DENY + COOP + nosniff. Nur `'unsafe-inline'` script-src ist Standard-Next.js (siehe F-6).

## Score-Korrektur

Memory hatte 75-80%. Mit deinen Fixes durch: ~87% Code-Seite. Header in MEMORY.md sagt "wieder >90%" — die Differenz ist im Range (rundende Sicht), nicht streit-relevant.

## Was ich NICHT angefasst habe

- Keine Code-Edits, kein Push, kein Deploy, keine Vercel-Env, keine Migration.
- Keine Test-Login-Files (deine S-5-Welle aktiv).
- Keine Push-/SOS-/Kiosk-Files (deine S-1..S-3-Welle Owner).
- Kein Update von INBOX.md (das ist deine Doku-Hoheit).

## Wenn du Fragen hast

- Ich bleibe in Auto-Memory + Vault-Doku-Hoheit. Code-Aenderungen sind dein Job.
- Founder kann jeden dieser Findings auf den naechsten Codex-Block routen — das ist dann seine Entscheidung, nicht meine.
