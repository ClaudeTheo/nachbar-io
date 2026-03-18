# Pilot-Testcheckliste — Flow 1 + Flow 2

**Datum:** 2026-03-18
**Testumgebung:** Desktop Chrome (aktuell), quartierapp.de
**Voraussetzungen:** Gültiger Invite-Code, Zugang zu E-Mail-Postfach (GMX/Gmail/Outlook)

---

## Flow 1: Registrierung (Confirm Signup)

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 1.1 | `/register` öffnen | Entry-Seite mit zwei Pfaden (Invite-Code / Quartier finden) | `[ ]` |
| 1.2 | "Ich habe einen Einladungscode" wählen | Invite-Code-Eingabefeld erscheint | `[ ]` |
| 1.3 | Gültigen Code eingeben → "Code prüfen" | Schritt 2: Name + E-Mail-Formular | `[ ]` |
| 1.4 | Name + neue E-Mail → "Anmelde-Code senden" | Ladeindikator, dann OTP-Eingabe (6 Felder) | `[ ]` |
| 1.5 | E-Mail-Postfach prüfen | Absender: "QuartierApp" `<noreply@quartierapp.de>` | `[ ]` |
| 1.6 | Betreff prüfen | "QuartierApp - Ihr Anmelde-Code" | `[ ]` |
| 1.7 | Template prüfen | Einheitliches Design, 6-stelliger Code, grüner Button, Sicherheitshinweis | `[ ]` |
| 1.8 | 6-stelligen Code eingeben | Auto-Submit nach 6. Ziffer → Weiterleitung zu `/welcome` | `[ ]` |
| 1.9 | Onboarding-Slides durchklicken | Dashboard erreicht, User eingeloggt | `[ ]` |

**Negativtests Flow 1:**

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 1.N1 | Ungültigen Invite-Code eingeben | Fehlermeldung, kein Weiterkommen | `[ ]` |
| 1.N2 | Bereits registrierte E-Mail verwenden | Fehlermeldung (409) | `[ ]` |
| 1.N3 | Falschen OTP-Code eingeben | "Code ungültig oder abgelaufen. Bitte fordern Sie einen neuen an." | `[ ]` |
| 1.N4 | Passwort-Login-Toggle suchen | **Nicht sichtbar** (B-2 ausgeblendet) | `[ ]` |

---

## Flow 2: Login (Magic Link / OTP)

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 2.1 | `/login` öffnen | Login-Seite, E-Mail-Feld, "Anmelde-Code senden" Button | `[ ]` |
| 2.2 | Registrierte E-Mail → "Anmelde-Code senden" | 30s Cooldown startet, OTP-Eingabe erscheint | `[ ]` |
| 2.3 | E-Mail-Postfach prüfen | "QuartierApp - Ihr Anmelde-Code", Code + Button | `[ ]` |
| 2.4a | **Pfad A — OTP:** 6-stelligen Code eingeben | Auto-Submit → Weiterleitung zu `/dashboard` | `[ ]` |
| 2.4b | **Pfad B — Magic Link:** Grünen Button in E-Mail klicken | `/auth/callback` → Redirect zu `/dashboard` | `[ ]` |
| 2.5 | Dashboard prüfen | User eingeloggt, Name korrekt | `[ ]` |
| 2.6 | Ausloggen → erneut einloggen | Wiederholter Login funktioniert | `[ ]` |

**Negativtests Flow 2:**

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 2.N1 | Falschen OTP-Code eingeben | "Code ungültig oder abgelaufen. Bitte fordern Sie einen neuen an." | `[ ]` |
| 2.N2 | "Erneut senden" vor 60s-Cooldown | Button deaktiviert | `[ ]` |
| 2.N3 | "Erneut senden" nach 60s-Cooldown | Neuer Code per E-Mail | `[ ]` |
| 2.N4 | Passwort-Toggle suchen | **Nicht sichtbar** (B-2 ausgeblendet) | `[ ]` |
| 2.N5 | Nicht registrierte E-Mail → OTP senden | Kein Fehler sichtbar (Anti-Enumeration) | `[ ]` |

---

## Zustellbarkeit (einmalig)

| # | Prüfpunkt | Erwartung | Ergebnis |
|---|-----------|-----------|----------|
| Z.1 | Test-Mail an GMX empfangen | Nicht im Spam, korrekte Darstellung | `[ ]` |
| Z.2 | Test-Mail an Gmail empfangen | Nicht im Spam, korrekte Darstellung | `[ ]` |
| Z.3 | Test-Mail an Outlook empfangen | Nicht im Spam, korrekte Darstellung | `[ ]` |
| Z.4 | SPF/DKIM via mail-tester.com | Score >= 8/10 | `[ ]` |
| Z.5 | DMARC-Record prüfen (mxtoolbox.com) | `v=DMARC1; p=none` vorhanden | `[ ]` |

---

## Zusammenfassung

| Bereich | Tests | Bestanden | Offen |
|---------|-------|-----------|-------|
| Flow 1 (Registrierung) | 13 | _ / 13 | _ |
| Flow 2 (Login) | 12 | _ / 12 | _ |
| Zustellbarkeit | 5 | _ / 5 | _ |
| **Gesamt** | **30** | **_ / 30** | **_** |

**Tester:** _______________
**Datum:** _______________
**Go-Live-Freigabe:** `[ ] JA` / `[ ] NEIN` — Grund: _______________
