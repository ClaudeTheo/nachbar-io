# Codex Brief — Pilot Readiness Checkpoint

**Datum:** 2026-04-14
**Repo:** `nachbar-io`
**Status:** Abgearbeitet

---

## Kontext

Beim Pilot-Readiness-Abgleich war der Login-Flow nicht mehr konsistent mit der
freigegebenen Pilot-Konfiguration:

- Der Passwort-Login war im UI wieder sichtbar.
- Der Recovery-Flow ist weiterhin nicht implementiert.
- Audit, E2E-Spezifikation und Pilot-Go-Live-Entscheidung gehen fuer den Pilot
  explizit von OTP/Magic-Link als einzigem Login-Weg aus.

Damit bestand das Risiko, dass Pilotnutzer einen Login-Weg sehen, der im
Pilotbetrieb bewusst nicht supportet ist.

---

## Ziel

Die freigegebene Pilot-Posture wiederherstellen und gegen erneute Regression
absichern.

---

## Umsetzung

1. Passwort-Login im Pilot wieder ausblenden.
2. Regressionstest fuer die Login-Seite ergaenzen.
3. Pilot-Readiness-Dokumentation auf den April-Checkpoint anheben und die
   OTP-only-Entscheidung sichtbar referenzieren.

---

## Ergebnis

- `app/(auth)/login/page.tsx`
  Passwort-Login wieder auf Pilot-Standard gesetzt (`PILOT_HIDE_PASSWORD_LOGIN = true`).
- `__tests__/app/login-page.test.tsx`
  Test deckt ab, dass im Pilot nur der OTP/Magic-Link-Einstieg sichtbar ist.
- `docs/PILOT_READINESS.md`
  Stand aktualisiert und Pilot-Zugang / Nachweise ergaenzt.

---

## Manuelle Sichtpruefung

### Lokal auf Branch `feat/pilot-readiness`

- Login-Seite zeigt nur E-Mail-Feld und `Anmelde-Code senden`.
- Passwort-Toggle ist nicht sichtbar.
- Screenshot: `output/playwright/login-local-visual.png`

### Live-Deployment `nachbar-io.vercel.app`

- Login-Seite zeigt aktuell noch den Passwort-Toggle
  `Stattdessen mit Passwort anmelden`.
- Das bestaetigt, dass der produktive Stand den Fix noch nicht enthaelt.
- OTP-Screen und Resend-Cooldown wurden visuell geprueft:
  - `output/playwright/login-live-otp-visual.png`
  - `output/playwright/login-live-resend-cooldown.png`
  - `output/playwright/register-live-entry.png`
  - `output/playwright/register-live-invite-step.png`
  - `output/playwright/register-live-identity-step.png`
  - `output/playwright/register-live-otp-visual.png`
  - `output/playwright/register-live-resend-cooldown.png`

---

## Nicht Teil dieses Briefs

- Recovery-Flow bauen
- Passwort-Login fuer den breiten Rollout reaktivieren
- Oeffentlichen Rollout ohne Invite-Code absichern

Diese Themen bleiben separat und sind bereits im Go-Live-Audit dokumentiert.
