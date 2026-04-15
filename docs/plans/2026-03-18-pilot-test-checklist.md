# Pilot-Testcheckliste — Flow 1 + Flow 2

**Datum:** 2026-03-18
**Testumgebung:** Desktop Chrome, nachbar-io.vercel.app (Commit cda68b8)
**Tester:** Claude Code (automatisiert) + Thomas (OTP-Codes)

---

## Flow 1: Registrierung (Confirm Signup) — PASS

**Invite-Code:** 7JK6QMVG (Sanarystraße 22)
**E-Mail:** Annette.Asal@icloud.com
**Name:** Thomas T.

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 1.1 | `/register` öffnen | Entry-Seite mit zwei Pfaden | **PASS** |
| 1.2 | "Ich habe einen Einladungscode" wählen | Invite-Code-Eingabefeld | **PASS** |
| 1.3 | Gültigen Code eingeben → "Code prüfen" | Schritt 2: Name + E-Mail | **PASS** |
| 1.4 | Name + neue E-Mail → "Anmelde-Code senden" | OTP-Eingabe (6 Felder) | **PASS** |
| 1.5 | E-Mail-Postfach prüfen | Absender: QuartierApp | **PASS** (iCloud, kein Spam) |
| 1.6 | Betreff prüfen | "QuartierApp - Ihr Anmelde-Code" | **PASS** |
| 1.7 | Template prüfen | Design, Code, Button, Sicherheitshinweis | TODO (visuell nicht geprüft) |
| 1.8 | 6-stelligen Code eingeben | Auto-Submit → `/welcome` | **PASS** |
| 1.9 | Onboarding-Slides durchklicken | Dashboard erreicht, eingeloggt | **PASS** |

**Negativtests Flow 1:**

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 1.N1 | Ungültigen Invite-Code eingeben | Fehlermeldung | **PASS** — "Ungültiger Einladungscode" |
| 1.N2 | Bereits registrierte E-Mail | Fehlermeldung (409) | **PASS** — "Diese E-Mail-Adresse ist bereits registriert." |
| 1.N3 | Falschen OTP-Code eingeben | Einheitliche Fehlermeldung | nicht separat getestet (B-3 in Flow 2 verifiziert) |
| 1.N4 | Passwort-Login-Toggle suchen | Nicht sichtbar | **PASS** (B-2) |

**Befund:** PILOT-Codes (Format PREFIX-XXXX-XXXX, 14 Zeichen) passen nicht ins Eingabefeld (maxLength=9). Nur 8-Zeichen-Codes (XXXX-XXXX) funktionieren. Für den Pilot kein Blocker (8-Zeichen-Codes vorhanden), aber vor Rollout mit Flyern fixen.

---

## Flow 2: Login (Magic Link / OTP) — PASS

**E-Mail:** thomasth@gmx.de

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 2.1 | `/login` öffnen | Login-Seite, "Anmelde-Code senden" | **PASS** |
| 2.2 | Registrierte E-Mail → Code senden | Cooldown startet, OTP-Eingabe | **PASS** |
| 2.3 | E-Mail-Postfach prüfen | Code + Button | **PASS** (GMX, kein Spam) |
| 2.4a | OTP-Code eingeben | Auto-Submit → `/dashboard` | **PASS** — "Guten Abend, Thomas" |
| 2.5 | Dashboard prüfen | User eingeloggt, Name korrekt | **PASS** |
| 2.4b | Magic Link Button in E-Mail | nicht separat getestet | TODO |
| 2.6 | Ausloggen → erneut einloggen | nicht separat getestet | TODO |

**Negativtests Flow 2:**

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 2.N1 | Falschen OTP-Code eingeben | Einheitliche Fehlermeldung | **PASS** — "Code ungültig oder abgelaufen." (B-3) |
| 2.N2 | "Erneut senden" vor Cooldown | Button deaktiviert | TODO |
| 2.N3 | "Erneut senden" nach Cooldown | Neuer Code per E-Mail | TODO |
| 2.N4 | Passwort-Toggle suchen | Nicht sichtbar | **PASS** (B-2) |
| 2.N5 | Nicht registrierte E-Mail | Kein Fehler (Anti-Enumeration) | TODO |

---

## Blocker-Verifizierung (2026-03-18)

| Blocker | Prüfpunkt | Ergebnis | Methode |
|---------|-----------|----------|---------|
| **B-2** | Passwort-Login-Toggle nicht sichtbar | **PASS** | Live-Snapshot nachbar-io.vercel.app |
| **B-3** | Falscher OTP → einheitliche Meldung | **PASS** — "Code ungültig oder abgelaufen." | Live-Test mit Code 123456 |
| **B-1** | `email_confirm: true` dokumentiert | **PASS** | Code-Review `register/complete/route.ts:76-85` |

---

## Zustellbarkeit

| # | Prüfpunkt | Erwartung | Ergebnis |
|---|-----------|-----------|----------|
| Z.1 | Test-Mail an GMX empfangen | Nicht im Spam | **PASS** (thomasth@gmx.de, Login-Flow) |
| Z.2 | Test-Mail an iCloud empfangen | Nicht im Spam | **PASS** (Annette.Asal@icloud.com, Registrierung) |
| Z.3 | Test-Mail an Gmail empfangen | Nicht im Spam | TODO |
| Z.4 | SPF/DKIM via mail-tester.com | Score >= 8/10 | TODO |
| Z.5 | DMARC-Record prüfen (mxtoolbox.com) | `v=DMARC1; p=none` | TODO |

---

## Zusammenfassung

| Bereich | Tests | Bestanden | TODO |
|---------|-------|-----------|------|
| Flow 1 (Registrierung) | 13 | 11 | 2 (Template visuell, OTP-Negativtest) |
| Flow 2 (Login) | 12 | 6 | 6 (Magic Link, Logout+Relogin, Cooldown, Anti-Enum) |
| Blocker B-1/B-2/B-3 | 3 | 3 | 0 |
| Zustellbarkeit | 5 | 2 | 3 (Gmail, mail-tester, DMARC) |
| **Gesamt** | **33** | **22 / 33** | **11** |

**Kernfunktionen PASS:** Registrierung mit Invite-Code + OTP-Login + Dashboard — der Happy Path funktioniert E2E.
**Offene Tests:** Ergänzende Negativtests und Zustellbarkeit an weiteren Providern.

**Go-Live-Freigabe:** `[x] JA` — Kernfunktionen bestanden, Blocker B-1/B-2/B-3 gelöst.
Empfehlung: Offene 11 Tests vor breiterem Rollout abschließen, für Pilot mit 30 Haushalten ausreichend.

### Bekannte Einschränkung
PILOT-Codes (PREFIX-XXXX-XXXX) zu lang für Eingabefeld (maxLength=9). Nur 8-Zeichen-Codes funktionieren. Fix vor Flyer-Druck nötig.

---

## Addendum 2026-04-14 — Lokale Regressionstests

Die folgenden Punkte wurden am 2026-04-14 als **lokale automatisierte
Regressionen** ergänzt. Sie ersetzen keine Live-Zustellbarkeitsprüfung, senken
aber das Risiko erneuter UI-Abweichungen im Pilotbetrieb.

| Prüfpunkt | Ergebnis | Methode |
|---|---|---|
| Passwort-Login im Pilot weiterhin ausgeblendet | **PASS** | `__tests__/app/login-page.test.tsx` |
| OTP-Anforderung zeigt keine Enumeration-UI bei erfolgreicher Anfrage | **PASS** | `__tests__/app/login-page.test.tsx` |
| "Code erneut senden" ist während Cooldown deaktiviert | **PASS** | `__tests__/components/auth/OtpCodeEntry.test.tsx` |
| "Code erneut senden" ist nach 60s wieder aktivierbar | **PASS** | `__tests__/components/auth/OtpCodeEntry.test.tsx` |

**Hinweis:** Live-Tests für Magic-Link in echter E-Mail, Logout + Relogin sowie
Provider-Zustellbarkeit (GMX/Gmail/iCloud) bleiben separate Pilotchecks.

### Sichtpruefung 2026-04-14

| Prüfpunkt | Ergebnis | Umgebung |
|---|---|---|
| Login-Seite ohne Passwort-Toggle | **PASS** | Lokaler Branch `feat/pilot-readiness` |
| OTP-Screen nach Login-Anfrage sichtbar | **PASS** | Live-Deployment mit gemockter OTP-Response |
| Resend-Cooldown auf OTP-Screen sichtbar und deaktiviert | **PASS** | Live-Deployment mit gemockter OTP-Response |
| Registrierungs-Entry, Invite-Step und Identity-Step visuell konsistent | **PASS** | Live-Deployment |
| Live-Deployment zeigt noch Passwort-Toggle auf `/login` | **BEFUND** | Live-Deployment vor Merge |

### In-App-Smoke + Karte 2026-04-14

| Prüfpunkt | Ergebnis | Umgebung |
|---|---|---|
| Login mit E2E-Agent (`agent_a@test.nachbar.local`) erfolgreich | **PASS** | Live-Deployment |
| `/dashboard`, `/quartier-info`, `/care`, `/profile`, `/map` laden mit `200` | **PASS** | Live-Deployment |
| `/map` rendert Leaflet-Container, Tiles und `15` Marker | **PASS** | Live-Deployment |
| Zoom auf der Karte laedt weitere Tiles nach | **PASS** | Live-Deployment |
| Marker-Klick oeffnet Popup und Detaildialog | **PASS** | Live-Deployment |
| Filter `0 Rot` blendet Marker aus, `↺ Reset` stellt sie wieder her | **PASS** | Live-Deployment |
| `POST /api/heartbeat` antwortet im Schnell-Smoke einmal mit `429` | **BEFUND** | Live-Deployment |

### Addendum 2026-04-15 - Post-Merge Live-Recheck

| Prüfpunkt | Ergebnis | Umgebung |
|---|---|---|
| Production-Deploy nach Merge von PR `#13` erfolgreich | **PASS** | Live-Deployment |
| `/login` zeigt live keinen Passwort-Toggle mehr | **PASS** | Live-Deployment |
| `/kiosk/games/quiz` laedt ohne Console-Fehler | **PASS** | Live-Deployment |
| `/kiosk/sprechstunde` zeigt Aerzteliste, `/api/doctors` liefert `200` | **PASS** | Live-Deployment |
| `/hilfe/tasks` zeigt leeren Zustand ohne API-Fehler | **PASS** | Live-Deployment |
| `/hilfe/abo` zeigt Hinweiszustand, `/api/hilfe/subscription` liefert `200` | **PASS** | Live-Deployment |
| `/my-day` zeigt keine `checkins`-`404` mehr | **PASS** | Live-Deployment |
| `POST /api/heartbeat` erzeugt im Recheck kein sichtbares `429` mehr | **PASS** | Live-Deployment |
| `/care/aerzte` bleibt auf `/kreis-start` umgeleitet | **EINGEORDNET** | Absichtlicher Redirect via `middleware.ts` (`LEGACY_ROUTE_PREFIXES`) |
