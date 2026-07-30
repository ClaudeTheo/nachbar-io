# Security-Mini-Audit — K7-Abschluss + kiosk_devices-Hash-Umstellung (2026-07-30)

Scope: Branch `claude/k7-kiosk-token-hardening` — Mig 204 (DROP device_tokens.token),
Klartext-Fallback-Entfernung in `lib/device/auth.ts`, Hash-Lookup in den drei
Kiosk-Routen (`app/api/escalation/sos`, `app/api/care/emergency-profile/kiosk`,
`app/api/kiosk/companion`). Auftrag: Founder 30.07.; Task-ID
`2026-07-30-nachbar-io-k7-kiosk-token-hardening` (Register).

## 1. RLS-Lese-Pass (device_tokens)

- RLS enabled seit Mig 033; Policies seit Mig 042: SELECT/INSERT/UPDATE/DELETE
  fuer verifizierte Haushaltsmitglieder (`household_members.verified_at IS NOT NULL`)
  oder `is_admin()`.
- **Befund (durch Mig 204 behoben):** Bis zum Apply von 204 koennen
  Haushaltsmitglieder ueber die SELECT-Policy die KLARTEXT-Tokens ihrer
  Haushalts-Geraete lesen. Nach dem DROP ist nur noch der SHA-256-Hash lesbar.
- Keine Policy referenziert die `token`-Spalte (nur `household_id`) — der DROP
  kollidiert nicht mit bestehenden Policies. Mig 204 aendert keine Policies.

## 2. Trigger-Inventar

- Keine Trigger auf `device_tokens` in Migrationen oder Baseline-Snapshot
  (grep ueber `supabase/migrations/`). Mig 204 fuegt keine hinzu.

## 3. Privilege-Spalten-Sweep

- Spalten nach 204: id, household_id, token_hash (NOT NULL, UNIQUE),
  device_name, last_seen_at, created_at — keine Privilege-/Rollenspalten.
- Neu: UNIQUE-Index auf token_hash (ersetzt non-unique idx_device_tokens_hash);
  `.single()`-Lookup in auth.ts setzt Eindeutigkeit jetzt DB-seitig durch.
- INSERT-Pfad: DB-Default fuer Klartext-Token entfaellt; Neuanlage nur noch mit
  extern erzeugtem Token + Hash (SQL-Anleitung im Migrationskommentar).
  Es existiert KEIN App-Code, der device_tokens anlegt (verifiziert per grep) —
  kein Pfad bricht.

## 4. Audit-Trail

- Unveraendert: Kiosk-SOS schreibt weiter `audit_log`; Device-Auth pflegt
  `last_seen_at`. Keine Audit-Pfade entfernt.

## 5. Rate-Limit

- Unveraendert: `authenticateDevice` und die Kiosk-Routen haben kein eigenes
  Rate-Limit (Bestandslage). Risiko sinkt durch Hash-only-Lookup; dediziertes
  Limit bleibt bewusst ausserhalb des Scopes (kein Fix-Marathon, 0 echte Nutzer).

## Kiosk-Routen (kiosk_devices)

- Prod-Beleg 30.07. (read-only, list_tables): Tabelle `kiosk_devices` existiert
  NICHT in Prod und in keiner Migration — der DB-Lookup ist heute toter Pfad,
  real greift immer der ENV-Vergleich (`KIOSK_DEVICE_TOKEN`).
- Umstellung: Lookup vergleicht jetzt `device_token_hash` = SHA-256(Header-Token);
  Klartext-Spaltenvergleich entfernt. Wird die Tabelle je eingefuehrt, MUSS sie
  `device_token_hash` speichern (Kommentar in allen drei Routen).
- ENV-Vergleich bewusst unveraendert gelassen (chirurgischer Eingriff).

## Verifikation

- TDD: 4 neue Tests zuerst RED (belegt), dann GREEN; Gesamtlauf Vitest gruen
  (Zahlen im Commit/Register), `npx tsc --noEmit` Exit 0, ESLint (8 geaenderte
  Dateien) Exit 0.
- Prod-Vorabcheck fuer Mig 204: 2 Zeilen, beide `token_hash` konsistent, 0 NULL.
- `lib/supabase/database.types.ts` enthaelt die `token`-Spalte noch — Typen
  werden erst NACH Prod-Apply von 204 regeneriert (bewusst, Quelle ist Prod).

## Gates

- Kein Push, kein Deploy, kein Prod-Apply — alles Founder-Hand.
- DB-Schema mit Compliance-Bezug: Codex-Gegenreview vor Merge erforderlich.
