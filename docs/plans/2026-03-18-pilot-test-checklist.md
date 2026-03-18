# Pilot-Testcheckliste — Flow 1 + Flow 2

**Datum:** 2026-03-18
**Testumgebung:** Desktop Chrome (aktuell), nachbar-io.vercel.app
**Voraussetzungen:** Gültiger Invite-Code, Zugang zu E-Mail-Postfach (GMX/Gmail/Outlook)
**Teststatus:** Teilweise verifiziert — manueller Abschluss ausstehend

---

## Flow 1: Registrierung (Confirm Signup)

**Status: TODO — Manueller Test ausstehend**

Voraussetzungen für manuellen Test:
- Ungenutzter Invite-Code (aus Supabase `households.invite_code`)
- Neue, noch nicht registrierte E-Mail-Adresse

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

**Status: Teilweise bestanden — manueller Abschluss ausstehend**

### Automatisiert verifiziert (2026-03-18, Claude Code + Chrome DevTools)

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 2.1 | `/login` öffnen | Login-Seite, E-Mail-Feld, "Anmelde-Code senden" Button | **PASS** |
| 2.2 | Registrierte E-Mail → "Anmelde-Code senden" | 30s Cooldown startet, OTP-Eingabe erscheint | **PASS** |
| 2.N1 | Falschen OTP-Code eingeben | "Code ungültig oder abgelaufen. Bitte fordern Sie einen neuen an." | **PASS** (B-3 verifiziert) |
| 2.N4 | Passwort-Toggle suchen | **Nicht sichtbar** (B-2 ausgeblendet) | **PASS** (B-2 verifiziert) |

### Manueller Abschluss ausstehend (durch Projektinhaber)

| # | Schritt | Erwartung | Ergebnis |
|---|---------|-----------|----------|
| 2.3 | E-Mail-Postfach prüfen | "QuartierApp - Ihr Anmelde-Code", Code + Button | `[ ]` |
| 2.4a | **Pfad A — OTP:** 6-stelligen Code eingeben | Auto-Submit → Weiterleitung zu `/dashboard` | `[ ]` |
| 2.4b | **Pfad B — Magic Link:** Grünen Button in E-Mail klicken | `/auth/callback` → Redirect zu `/dashboard` | `[ ]` |
| 2.5 | Dashboard prüfen | User eingeloggt, Name korrekt | `[ ]` |
| 2.6 | Ausloggen → erneut einloggen | Wiederholter Login funktioniert | `[ ]` |
| 2.N2 | "Erneut senden" vor 60s-Cooldown | Button deaktiviert | `[ ]` |
| 2.N3 | "Erneut senden" nach 60s-Cooldown | Neuer Code per E-Mail | `[ ]` |
| 2.N5 | Nicht registrierte E-Mail → OTP senden | Kein Fehler sichtbar (Anti-Enumeration) | `[ ]` |

---

## Blocker-Verifizierung (2026-03-18)

| Blocker | Prüfpunkt | Ergebnis | Methode |
|---------|-----------|----------|---------|
| **B-2** | Passwort-Login-Toggle nicht sichtbar auf `/login` | **PASS** | Live-Snapshot nachbar-io.vercel.app |
| **B-3** | Falscher OTP-Code → einheitliche Meldung | **PASS** — "Code ungültig oder abgelaufen. Bitte fordern Sie einen neuen an." | Live-Test mit Code 123456 |
| **B-1** | `email_confirm: true` dokumentiert | **PASS** | Code-Review `register/complete/route.ts:76-85` |

---

## Zustellbarkeit (einmalig, manuell)

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
| Flow 1 (Registrierung) | 13 | 0 / 13 | 13 (manuell) |
| Flow 2 (Login) | 12 | 4 / 12 | 8 (manuell) |
| Blocker B-1/B-2/B-3 | 3 | 3 / 3 | 0 |
| Zustellbarkeit | 5 | 0 / 5 | 5 (manuell) |
| **Gesamt** | **33** | **7 / 33** | **26** |

**Automatisiert verifiziert:** 7 Tests (Login-Seite, OTP-Versand, B-2 Passwort-Toggle, B-3 Fehlermeldung, B-1 Dokumentation)
**Manueller Abschluss:** 26 Tests (erfordern echten OTP-Code, Invite-Code, E-Mail-Postfach-Zugang)

**Tester:** _______________
**Datum:** _______________
**Go-Live-Freigabe:** `[ ] JA` / `[ ] NEIN` — Grund: _______________

### Hinweise für manuellen Abschluss
- Keine OTP-Codes im Chat verwenden
- Flow 1 benötigt ungenutzten Invite-Code + neue E-Mail
- Flow 2 benötigt bestehenden Account + E-Mail-Zugang
- Zustellbarkeit: Test-Mail an GMX, Gmail und Outlook prüfen
- User-Reset erst freigeben, wenn Flow 1 + 2 vollständig bestanden
