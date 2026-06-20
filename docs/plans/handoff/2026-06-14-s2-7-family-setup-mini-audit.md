# Mini-Audit (vorgezogen, read-only) — S2-7 Family-Setup / Geräte-Pairing

> **Pflicht-Audit** für Welle S2 Schritt 7 (`.claude/rules/security-mini-audit.md`), vorab gefahren
> 2026-06-14, damit die Welle direkt nach dem S1/S2-Push gebaut werden kann. **Read-only, kein Code geändert.**

## Scope
S2-7 baut laut `docs/plans/2026-06-12-senior-welt-familienkreis-wellenplan.md` (Schritt 7):
- (a) **„Link teilen"** in `SetupQrCard` — teilt nur die bestehende `setupUrl` (navigator.share/Copy). **Kein neues Backend, keine neue Fläche.**
- (b) **„Gerät verbinden"** auf `/care/meine-senioren/[seniorId]` → ruft die **bestehende** Route `POST /api/device/pair/start-code`, zeigt den 6-stelligen Code groß; der Senior gibt ihn am vorhandenen Numpad ein → `POST /api/device/pair/claim-by-code`.

→ **S2-7 ist eine UI-Brücke zu bereits existierenden Pairing-Routen.** Audit-Fokus = diese Routen.

## 5-Punkte-Checklist

1. **RLS/Authz auf der Code-Erzeugung (`start-code`):** ✅ Caller muss eingeloggt sein (401 sonst) **und** einen aktiven `caregiver_link` zum Senior haben (`caregiver_id=auth.uid()`, `resident_id=senior`, `revoked_at IS NULL`, sonst 403). → **Nur ein verifizierter Betreuer *dieses* Seniors kann einen Pairing-Code erzeugen. Kein IDOR / kein Account-Takeover.** Codes liegen in Redis (kein DB-Table → keine RLS nötig), Payload bindet `senior_user_id + caregiver_id`.
2. **Trigger-Inventar:** Pairing-Codes sind Redis-only (kein Table-Trigger). `device_refresh_tokens` wird nur via `getAdminSupabase()` (service_role) beschrieben, Token **gehasht** (`hashRefreshToken`). Keine privilege-relevanten BEFORE-UPDATE-Trigger im Pairing-Pfad nötig.
3. **Privilege-Spalten-Sweep:** Keine. Der Claim erzeugt ausschließlich einen `device_refresh_tokens`-Eintrag (gebunden an `payload.senior_user_id`), setzt keine Rollen-/Admin-/Trust-Spalten. `senior_user_id` kommt aus dem Redis-Payload, **nicht** aus Client-Input → keine Manipulation der Ziel-Identität.
4. **Audit-Trail:** ⚠️ **LOW-Finding.** Weder `start-code` noch `claim-by-code` schreiben einen dedizierten Security-Audit-Log-Eintrag. Der `device_refresh_tokens`-Row (mit `pairing_method='code'`, `user_agent`, Zeitstempel, `user_id`, `device_id`) dient als **impliziter** Nachweis „Gerät X an Senior Y gepairt". Empfehlung (Backlog): expliziten Audit-Insert beim erfolgreichen Claim ergänzen (wer/wann/Methode) — verbessert Traceability, kein Blocker.
5. **Rate-Limit / Brute-Force (`claim-by-code` = Code-Lookup):** ✅ **Redis-basiert (edge-konsistent), 5 Fehlversuche/IP/Stunde** (`pair-code-rl:<ip>`, `incr` + `expire`). Code = 6 Ziffern, **10-min-TTL**, **Single-Use** (DELETE nach Claim = Replay-Schutz), Format-Validierung. → Single-IP-Brute praktisch unmöglich (Code lebt nur 10 min). ⚠️ **LOW-Finding:** Rate-Limit ist **nur per-IP**, kein globaler Zähler pro Code → ein verteilter Angreifer (viele IPs) ist innerhalb der 10-min-Fenster nicht hart begrenzt. 6 Ziffern (1 Mio) + 10 min + Single-Use macht das unrealistisch; Backlog-Härtung (globaler Versuchszähler pro Code ODER 8-stellig alphanumerisch) vor Public-Launch.

## Pflicht-Ausgabe

```text
Mini-Audit S2-7 (2026-06-14, vorgezogen):
- RLS/Trigger geprueft: device pair start-code (caregiver_links-Authz, revoked_at-Check), claim-by-code (Redis-Code, device_refresh_tokens via service_role, Token gehasht)
- Findings: 0 CRITICAL/HIGH | PAIR-1 LOW (kein dedizierter Audit-Log beim Claim, device_refresh_tokens-Row = impliziter Nachweis) | PAIR-2 LOW (Rate-Limit per-IP, kein globaler Per-Code-Zaehler — distributed brute theoretisch, durch 10-min-TTL+Single-Use unrealistisch)
- Audit-Trail: implizit (device_refresh_tokens-Row) | Rate-Limit: Redis 5/IP/h (edge-konsistent), 10-min-Code-TTL, Single-Use
```

## Verdict
**GRÜN — kein STOP.** S2-7 führt keine neue Auth-/RLS-Fläche ein; die zugrundeliegenden Pairing-Routen sind korrekt gegatet. Die zwei LOW-Findings (PAIR-1 Audit-Log, PAIR-2 Per-Code-Rate-Limit) sind **Backlog-Härtung vor Public-Launch**, kein Pilot-Blocker (0 Nutzer). **S2-7 ist freigegeben zum Bauen** (nach dem laufenden S1/S2-Push, wenn der Working Tree wieder sauber ist).

> Hinweis: Die anderen Mini-Audit-Pflicht-Wellen (SB = RLS-Mig für Senior-Lesezugriff auf `kiosk_photos/_reminders`; AA = Consent-Mig auf `caregiver_links`) sind **noch offen** und werden je zu Beginn ihrer Welle gefahren.
