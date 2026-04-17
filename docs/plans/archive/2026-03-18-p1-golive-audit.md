# P1 Go-Live Audit — QuartierApp

**Datum:** 2026-03-18
**Erstellt von:** Claude Code Audit
**Version:** 1.0
**Geltungsbereich:** Pilotbetrieb Bad Säckingen (~30 Haushalte, Invite-Code-Pflicht), Desktop Chrome

---

## Scope

**In Scope:**
- DNS (SPF/DKIM/DMARC für quartierapp.de)
- 6 Supabase Auth E-Mail-Templates (Absender, Betreff, Design, Links)
- Auth-Flows im Code (Callback, OTP, Magic Link, Registration)
- Rate-Limiting (App-Level + Supabase-Level)
- Security Headers (CSP, HSTS, X-Frame-Options etc.)
- Abuse-Schutz (CAPTCHA, Brute-Force, E-Mail-Enumeration)

**Out of Scope:**
- Device-Tests (iPhone, Android, Pi) → P3
- Penetration Test → P3 (Frist: 2026-05-31)
- AVVs und DSGVO-Dokumentation → P2
- Supabase RLS-Audit (separate Aufgabe)
- Performance/Lighthouse

---

## Teil 1: Automatisierter Audit

### 1.1 DNS / E-Mail-Zustellbarkeit

| Prüfpunkt | Status | Befund |
|-----------|--------|--------|
| SPF-Record | **PASS** | `v=spf1 include:amazonses.com ~all` auf `send.quartierapp.de` |
| DKIM-Record | **PASS** | `resend._domainkey.quartierapp.de` konfiguriert |
| DMARC-Record | **TODO** | `p=none` — für Testphase akzeptabel. Vor breiterem Rollout auf `p=quarantine` erhöhen. Langfristig `p=reject`, sobald SPF/DKIM-Zustellung stabil verifiziert ist |
| Absendername | **PASS** | "QuartierApp" — professionell, kein "noreply" im Anzeigenamen |
| Absender-Adresse | **PASS** | `noreply@quartierapp.de` — eigene Domain, kein @supabase |
| MX-Record | **PASS** | `feedback-smtp.eu-west-1.amazonses.com` (Bounce-Handling) |

### 1.2 E-Mail-Templates (6 Templates)

| Template | Betreff | OTP | Button | Fallback-Link | Sicherheitshinweis | Status |
|----------|---------|-----|--------|---------------|---------------------|--------|
| Confirm Signup | "QuartierApp - Registrierung bestätigen" | Nein | Ja | Ja | Ja | **PASS** |
| Magic Link | "QuartierApp - Ihr Anmelde-Code" | 6-stellig | Ja | Ja | Ja | **PASS** |
| Recovery | "QuartierApp - Passwort zurücksetzen" | Nein | Ja | Ja | Ja | **PASS** |
| Email Change | "QuartierApp - Neue E-Mail-Adresse bestätigen" | Nein | Ja | Ja | Ja | **PASS** |
| Invite | "QuartierApp - Einladung zu QuartierApp" | Nein | Ja | Ja | Ja | **PASS** |
| Reauthentication | "QuartierApp - Sicherheitscode" | 6-stellig | Nein | Nein | Ja | **PASS** |

**Template-Design:**

| Prüfpunkt | Status | Befund |
|-----------|--------|--------|
| Einheitliches Layout | **PASS** | Alle 6 Templates gleiche Struktur (Header/Body/Footer) |
| Branding-Farben | **PASS** | #2D3142 Header, #4CAF87 Button — konsistent mit App |
| Font-Stack | **PASS** | Segoe UI, Tahoma, Verdana — webmail-sicher |
| Responsive Breite | **PASS** | max-width 560px — mobiltauglich |
| Tonalität | **PASS** | Siezen, sachlich, kein Marketing-Jargon |
| Spam-Risiko Betreff | **PASS** | Kein "Gratis", kein "!!!", kein ALL-CAPS |
| Link-Domain | **TODO** | Confirmation-Links zeigen auf Supabase-Subdomain — kein Sicherheitsblocker, aber Trust-/Branding-Nachteil. Langfristig eigenen Auth-Redirect unter quartierapp.de einrichten |

### 1.3 Auth-Flows (Code-Audit)

| Prüfpunkt | Status | Befund |
|-----------|--------|--------|
| PKCE Code Exchange | **PASS** | `/auth/callback/route.ts` — korrekt, code → session |
| Redirect-Validierung | **PASS** | `origin` aus Request URL, `next` defaulted auf `/dashboard`, kein offener Redirect |
| OTP-Verifikation | **PASS** | `verifyOtp({ type: "email" })` korrekt |
| Registrierung Server-seitig | **TODO** | Admin-API mit `email_confirm: true` — alle Accounts (auch Self-Service via Adresse) werden sofort als bestätigt markiert. Im Pilot mit Invite-Code-Pflicht akzeptabel (Code-Besitz als Verifizierung). Bei öffentlichem Rollout ohne Invite-Gate sicherheitskritisch: Angreifer könnte beliebige E-Mail-Adressen registrieren ohne Besitznachweis. Vor Rollout: `email_confirm: false` für Self-Service, E-Mail-Bestätigung erzwingen |
| Passwort-Login Fallback | **PASS** | Vorhanden, generische Fehlermeldung ("E-Mail oder Passwort ist falsch") |
| OTP Resend | **PASS** | Eigener Button, 60s Cooldown |
| OTP Auto-Submit | **PASS** | Nach 6. Ziffer automatisch |
| Paste-Support | **PASS** | Clipboard-Paste in OTP-Felder |
| Recovery-Flow | **FAIL** | Kein "Passwort vergessen"-Link auf Login-Seite. Template existiert, aber kein UI-Trigger. Solange Passwort-Login sichtbar angeboten wird, ist das kein Schönheitsfehler — Nutzer, die ihr Passwort vergessen, haben keinen Weg zurück |

### 1.4 Rate-Limiting & Abuse-Schutz

| Prüfpunkt | Status | Befund |
|-----------|--------|--------|
| API Rate-Limiting | **PASS** | Sliding Window, IP-basiert, 429 + Retry-After Header |
| Auth-Endpunkte | **PASS** | `/api/register/` = 5 Req/60s |
| Client-Side OTP-Cooldown | **PASS** | 30s nach Senden, 60s nach Resend |
| Supabase OTP Rate Limit | **PASS** | 60s Cooldown serverseitig |
| E-Mail-Versand Limit | **PASS** | 10/h (Supabase) + 100/Tag (Resend Free) |
| CAPTCHA | **FAIL** | Nicht implementiert. Registration + Login ohne Bot-Schutz. Automatisierte Account-Erstellung möglich |
| Exponential Backoff | **FAIL** | Kein Backoff bei wiederholten Fehlversuchen. Nur festes Rate-Limit |
| E-Mail-Enumeration (Registration) | **TODO** | `/api/register/complete` gibt 409 bei existierender E-Mail zurück. Fehlermeldung generisch, aber HTTP-Status 409 vs 200 ermöglicht systematisches Scannen. Empfehlung: Immer 200 zurückgeben, Duplikat-Handling intern |
| E-Mail-Enumeration (Login) | **TODO** | `signInWithOtp` gibt bei nicht-existierender E-Mail keinen Fehler — gut. Aber bei Rate-Limit-Treffer ändert sich die Response, was auf existierende Accounts schließen lassen kann |
| E-Mail-Enumeration (OTP) | **FAIL** | Unterschiedliche Meldungen: "abgelaufen" vs "falsch". Angreifer kann gültige von ungültigen Codes unterscheiden. Empfehlung: Einheitliche Fehlermeldung |
| Recovery Rate-Limit | **TODO** | Recovery-Flow existiert nicht im UI. Erst nach Implementierung sauber testbar |

### 1.5 Security Headers

| Header | Status | Wert |
|--------|--------|------|
| Content-Security-Policy | **PASS** | Restriktiv, `frame-ancestors 'none'`, `object-src 'none'` |
| X-Frame-Options | **PASS** | `DENY` |
| X-Content-Type-Options | **PASS** | `nosniff` |
| Referrer-Policy | **PASS** | `strict-origin-when-cross-origin` |
| HSTS | **PASS** | 2 Jahre + includeSubDomains + preload |
| Permissions-Policy | **PASS** | Camera/Mic/Geo nur `self` |
| X-Powered-By | **PASS** | Entfernt |

---

## Teil 2: Manuelle Testanleitung

**Testumgebung:** Desktop Chrome (aktuelle Version), quartierapp.de (Deployment: Vercel)
**E-Mail-Postfach:** Testkonto mit Zugang zu GMX/Gmail/Outlook
**Admin-Zugang:** Testkonto mit Admin-Rechten in Supabase

---

### Flow 1: Confirm Signup (Registrierung mit Invite-Code)

**Ziel:** Neuer Account per Invite-Code → E-Mail mit OTP → Code eingeben → Dashboard

**Voraussetzungen:**
- Gültiger Invite-Code (aus Supabase `households.invite_code`)
- Neue, noch nicht registrierte E-Mail-Adresse

| # | Aktion | Erwartetes Ergebnis |
|---|--------|---------------------|
| 1 | `/register` öffnen | Entry-Seite: zwei Pfade (Invite-Code / Quartier finden) |
| 2 | "Ich habe einen Einladungscode" wählen | Invite-Code-Eingabe erscheint |
| 3 | Gültigen Code eingeben → "Code prüfen" | Schritt 2: Name + E-Mail-Formular |
| 4 | Name + neue E-Mail eingeben → "Anmelde-Code senden" | Ladeindikator, dann OTP-Eingabe (6 Felder) |
| 5 | E-Mail-Postfach prüfen | E-Mail von "QuartierApp" `<noreply@quartierapp.de>`, Betreff: "QuartierApp - Ihr Anmelde-Code" |
| 6 | Absender, Design, Code-Box, Button, Sicherheitshinweis prüfen | Einheitliches Template, 6-stelliger Code sichtbar, grüner Button vorhanden |
| 7 | 6-stelligen Code eingeben (oder einfügen) | Auto-Submit nach 6. Ziffer → Weiterleitung zu `/welcome` |
| 8 | Onboarding-Slides durchklicken | Dashboard erreicht, User ist eingeloggt |

**Typische Fehlerbilder:**
- E-Mail landet im Spam → SPF/DKIM-Problem
- "Zu viele Versuche" → Rate-Limit zu niedrig
- Code "abgelaufen" → OTP-Expiry zu kurz oder Zeitversatz
- 409 "Bereits registriert" → E-Mail schon vergeben

**Status:** `[ ] PASS / FAIL / TODO`

---

### Flow 2: Magic Link / Login (Bestehender Account)

**Ziel:** Login per OTP-Code + alternativ per Magic-Link-Button in E-Mail

**Voraussetzungen:**
- Bereits registrierter Account

| # | Aktion | Erwartetes Ergebnis |
|---|--------|---------------------|
| 1 | `/login` öffnen | Login-Seite, E-Mail-Feld, "Anmelde-Code senden" Button |
| 2 | E-Mail eingeben → "Anmelde-Code senden" | 30s Cooldown startet, Modus wechselt zu OTP-Eingabe |
| 3 | E-Mail-Postfach prüfen | E-Mail: "QuartierApp - Ihr Anmelde-Code", Code + Button |
| 4a | **Pfad A — OTP:** 6-stelligen Code eingeben | Auto-Submit → Weiterleitung zu `/dashboard` |
| 4b | **Pfad B — Magic Link:** Grünen Button in E-Mail klicken | Browser öffnet `/auth/callback?code=xxx` → Redirect zu `/dashboard` |
| 5 | Dashboard prüfen | User ist eingeloggt, Name korrekt angezeigt |
| 6 | "Erneut senden" testen (nach 60s-Cooldown) | Neuer Code per E-Mail, alter Code ungültig |

**Typische Fehlerbilder:**
- Magic-Link-Button führt zu `/login?error=auth_callback_failed` → PKCE-Exchange fehlgeschlagen
- "Bitte warten (30s)" dauerhaft → Client-State hängt
- Zweiter Tab: Magic Link in Tab 1 geklickt, Tab 2 nicht aktualisiert

**Status:** `[ ] PASS / FAIL / TODO`

---

### Flow 3: Recovery (Passwort zurücksetzen)

**Ziel:** Passwort vergessen → Recovery-E-Mail → neues Passwort setzen

**Voraussetzungen:**
- Registrierter Account mit Passwort

| # | Aktion | Erwartetes Ergebnis |
|---|--------|---------------------|
| 1 | `/login` öffnen → "Stattdessen mit Passwort anmelden" | Passwort-Login-Formular |
| 2 | "Passwort vergessen"-Link suchen | **AKTUELL NICHT VORHANDEN** |
| 3-6 | (nicht testbar) | Recovery-Template deployed, kein UI-Trigger |

**Aktueller Zustand:** Flow nicht testbar. Template existiert in Supabase, aber kein UI-Weg `resetPasswordForEmail()` auszulösen.

**Maßnahme:** Siehe Blocker B-2 in Teil 3.

**Status:** `[ ] TODO — UI fehlt`

---

### Flow 4: Email Change (E-Mail-Adresse ändern)

**Ziel:** Eingeloggter Nutzer ändert E-Mail → Bestätigung an neue Adresse → aktiv

**Voraussetzungen:**
- Eingeloggter Account
- Zweite E-Mail-Adresse verfügbar
- Profil-/Settings-Seite mit E-Mail-Änderungsfunktion

| # | Aktion | Erwartetes Ergebnis |
|---|--------|---------------------|
| 1 | Einloggen → Profil-/Settings-Seite öffnen | E-Mail-Feld sichtbar |
| 2 | E-Mail-Änderungsfunktion suchen | **Prüfen:** Existiert UI-Element? |
| 3 | Neue E-Mail eingeben → Bestätigen | Supabase sendet E-Mail an neue Adresse |
| 4 | Postfach der neuen Adresse prüfen | E-Mail: "QuartierApp - Neue E-Mail-Adresse bestätigen" |
| 5 | Button in E-Mail klicken | `/auth/callback` → E-Mail im Profil aktualisiert |
| 6 | Ausloggen → mit neuer E-Mail einloggen | Login funktioniert |

**Hinweis:** Abhängig davon, ob Profil-/Settings-Seite `updateUser({ email })` implementiert. Falls nicht: TODO.

**Status:** `[ ] PASS / FAIL / TODO`

---

### Flow 5: Invite (Admin lädt User ein)

**Ziel:** Admin erstellt Einladung → E-Mail an neuen Nutzer → Registrierung

**Voraussetzungen:**
- Admin-Zugang zu Supabase Dashboard

| # | Aktion | Erwartetes Ergebnis |
|---|--------|---------------------|
| 1 | Supabase Dashboard → Authentication → "Invite user" | E-Mail-Feld |
| 2 | Einladung senden | E-Mail wird über Resend/SMTP versendet |
| 3 | Postfach des eingeladenen Nutzers prüfen | E-Mail: "QuartierApp - Einladung zu QuartierApp" |
| 4 | Absender, Design, Button prüfen | QuartierApp-Branding, "Einladung annehmen" Button |
| 5 | Button klicken | `/auth/callback` → Account aktiv |

**Hinweis:** Invite-Flow wird im Pilot primär nicht genutzt (Zugang über Invite-Code auf `/register`). Test über Supabase Dashboard möglich, aber kein Pflicht-Test für Pilot-Go-Live.

**Status:** `[ ] PASS / FAIL / TODO`

---

### Flow 6: Reauthentication (Sicherheitscode für sensible Aktionen)

**Ziel:** Sensible Aktion → Sicherheitscode per E-Mail → Code eingeben → bestätigt

**Voraussetzungen:**
- Eingeloggter Account
- Aktion, die `reauthenticate()` auslöst

| # | Aktion | Erwartetes Ergebnis |
|---|--------|---------------------|
| 1 | Einloggen → sensible Aktion auslösen | **Prüfen:** Welche Aktionen lösen Reauthentication aus? |
| 2 | Reauthentication-Dialog | Code-Eingabe-Feld |
| 3 | E-Mail-Postfach prüfen | E-Mail: "QuartierApp - Sicherheitscode", 6-stelliger Code, kein Button |
| 4 | Code eingeben | Aktion wird ausgeführt |

**Hinweis:** Abhängig davon, ob Frontend-Aktionen `supabase.auth.reauthenticate()` aufrufen. Template deployed, UI-Trigger unklar. Separat testbar, sobald eine Aktion diesen Flow auslöst.

**Status:** `[ ] PASS / FAIL / TODO`

---

### Testbarkeit der 6 Flows

| Flow | Testbar? | Grund |
|------|----------|-------|
| 1. Confirm Signup | **Ja** | Vollständig über `/register` |
| 2. Magic Link / Login | **Ja** | Vollständig über `/login` |
| 3. Recovery | **Nein** | Kein UI-Trigger |
| 4. Email Change | **Teilweise** | Abhängig von Profil-/Settings-Seite |
| 5. Invite | **Ja (Dashboard)** | Über Supabase Dashboard, nicht über eigenes UI |
| 6. Reauthentication | **Teilweise** | Abhängig von UI-Trigger für `reauthenticate()` |

---

## Teil 3: Zusammenfassung — Blocker, Empfehlungen, Go-Live-Entscheidung

### 3.1 Gesamtstatus

Die E-Mail-Infrastruktur ist solide: Eigene Domain (quartierapp.de), SPF/DKIM konfiguriert, 6 professionelle Templates mit einheitlichem Branding. Security Headers sind produktionsreif (HSTS, CSP, X-Frame-Options). OTP-Login funktioniert mit Client- und Server-seitigen Rate-Limits.

Offene Risiken betreffen primär Abuse-Schutz (kein CAPTCHA, kein Backoff), eine zu freizügige Account-Bestätigung (`email_confirm: true` für Self-Service) und fehlende UI-Flows (Recovery, ggf. Email Change, Reauthentication). Die E-Mail-Enumeration über Registration-Endpoint und OTP-Fehlermeldungen ist möglich, aber für den Pilotbetrieb (30 Haushalte, Invite-Code-Pflicht) vertretbar.

### 3.2 Bedingte Go-Live-Blocker

Diese Punkte sind Blocker unter bestimmten Bedingungen. Die jeweilige Bedingung bestimmt, ob eine Maßnahme vor Go-Live erforderlich ist.

| # | Thema | Blocker wenn | Maßnahme |
|---|-------|-------------|----------|
| B-1 | `email_confirm: true` bei Self-Service | Self-Service-Registrierung ohne Invite-Code-Gate öffentlich erreichbar | **Falls Pilot mit Invite-Code-Pflicht:** Kein Blocker — Invite-Code-Besitz als Verifizierung dokumentieren. **Falls öffentlicher Rollout:** `email_confirm: false` für Self-Service, E-Mail-Bestätigung erzwingen |
| B-2 | Recovery-Flow fehlt (UI) | Passwort-Login-Fallback im Pilot sichtbar | **Falls Passwort-Login sichtbar:** "Passwort vergessen"-Link + Recovery-Seite implementieren. **Falls Passwort-Login ausgeblendet:** Kein Blocker — OTP/Magic Link als einziger Login-Weg genügt |
| B-3 | OTP-Fehlermeldungen unterscheidbar | Immer (unabhängig von Pilot-Konfiguration) | Fehlermeldungen vereinheitlichen: "Code ungültig oder abgelaufen. Bitte fordern Sie einen neuen an." |

### 3.3 Vor Go-Live empfohlen (nicht zwingend blockierend)

| # | Thema | Risiko | Empfehlung |
|---|-------|--------|------------|
| E-1 | CAPTCHA fehlt | Automatisierte Account-Erstellung / OTP-Anfragen durch Bots | Turnstile (Cloudflare, kostenlos) oder hCaptcha auf Registration + Login |
| E-2 | Kein Exponential Backoff | Brute-Force auf Passwort-Login wird nur durch festes Rate-Limit gebremst | Backoff oder temporäre IP-Sperre nach >10 Fehlversuchen |
| E-3 | E-Mail-Enumeration (Registration) | 409 vs 200 verrät ob E-Mail registriert ist | Immer 200 zurückgeben, Duplikat-Handling intern |
| E-4 | E-Mail-Enumeration (Login) | Rate-Limit-Response bei existierenden Accounts unterschiedlich | Response-Verhalten angleichen |
| E-5 | DMARC `p=none` | Spoofing-Schutz nicht aktiv | Auf `p=quarantine` erhöhen sobald Zustellbarkeit verifiziert |
| E-6 | Link-Domain in E-Mails | Confirmation-Links auf Supabase-Subdomain — Trust-/Branding-Nachteil | Langfristig Custom Auth Domain unter quartierapp.de |

### 3.4 Später / P2 / P3

| Thema | Priorität | Bemerkung |
|-------|-----------|-----------|
| Email-Change-Flow testen | P2 | Abhängig von Profil-/Settings-Seite |
| Reauthentication-Flow testen | P2 | Template deployed, UI-Trigger unklar |
| Invite-Flow über eigenes Admin-UI | P2 | Aktuell nur über Supabase Dashboard testbar |
| Invite-Flow E2E-Test (Flow 5) | P2 | Im Pilot nicht primärer Zugangsweg — separat testen |
| Device-Tests (iPhone, Android, Pi) | P3 | Separate Testphase |
| Penetration Test extern | P3 | Frist: 2026-05-31 |
| AVVs (Supabase, Resend, Vercel, Twilio) | P2 | DSGVO-Pflicht vor öffentlichem Betrieb |
| Recovery Rate-Limit bewerten | P2 | Erst nach Recovery-UI-Implementierung testbar |
| DMARC auf `p=reject` | P3 | Nach stabilem Betrieb mit `p=quarantine` |

### 3.5 Go-Live-Entscheidung

**Einstufung: Bedingt go-live-fähig**

Diese Einstufung gilt für den **Pilotbetrieb** (Bad Säckingen, ~30 Haushalte, Invite-Code-Pflicht) mit Fokus auf **Desktop Chrome**. Device-Tests (iPhone Safari, Android Chrome, iPad, Pi 5) stehen noch aus und sind nicht Bestandteil dieser Go-Live-Bewertung.

Für den Pilotbetrieb mit Invite-Code-Gate ist die Anwendung go-live-fähig, sofern die unten genannten Bedingungen erfüllt werden. Für einen breiten öffentlichen Rollout ohne Invite-Code-Gate sind die offenen Abuse- und Enumeration-Risiken noch nicht ausreichend adressiert.

### 3.6 Bedingungen für "Go-Live-fähig" (Pilot)

- [x] **B-1 entschieden:** `email_confirm: true` als bewusste Pilot-Entscheidung dokumentiert (Invite-Code als Verifizierung). Kommentar in `app/api/register/complete/route.ts` (Zeile 76-85). Nicht für öffentlichen Rollout ohne Invite-Gate.
- [x] **B-2 entschieden:** Passwort-Login-Fallback ausgeblendet via `PILOT_HIDE_PASSWORD_LOGIN` in `app/(auth)/login/page.tsx` (Zeile 20). Reaktivierung: Flag auf `false` setzen + Recovery-Flow implementieren.
- [x] **B-3 umgesetzt:** OTP-Fehlermeldungen vereinheitlicht auf "Code ungültig oder abgelaufen. Bitte fordern Sie einen neuen an." in `components/auth/OtpCodeEntry.tsx` (Zeile 108).
- [ ] **E2E-Auth-Test (Flow 1):** Confirm Signup mit Invite-Code erfolgreich durchlaufen
- [ ] **E2E-Auth-Test (Flow 2):** Magic Link / OTP Login erfolgreich durchlaufen
- [ ] **Zustellbarkeit:** Test-Mail an GMX/Gmail/Outlook — kein Spam, korrekte Darstellung
- [ ] **SPF/DKIM/DMARC:** Prüfung via mail-tester.com oder mxtoolbox.com bestanden
