# QuartierApp — E-Mail-Template Design

## Status: FREIGEGEBEN (2026-03-18)

## Ziel
Alle 6 Supabase Auth E-Mail-Templates einheitlich auf QuartierApp-Branding umstellen.
Konsistent, vertrauenswürdig, produktionsreif.

## Gemeinsames Layout (alle 6 Templates)

```
┌─────────────────────────────────┐
│     QuartierApp  (#2D3142)      │  Header
├─────────────────────────────────┤
│  Titel (h2)                     │
│  Erklärungs-Text (Siezen)       │
│  [OTP-Code-Box]  (nur 2+6)     │
│  [Grüner Button] (nur 1-5)     │
│  Fallback-Link   (unter Button) │
│  Sicherheitshinweis (alle)      │
├─────────────────────────────────┤
│  QuartierApp — Ihr digitaler    │
│  Dorfplatz                      │
└─────────────────────────────────┘
```

## Design-Tokens
- Header: #2D3142, weiß, 22px bold
- Button: #4CAF87, weiß, 16px bold, padding 14px 32px, border-radius 8px
- Code-Box: #f0f0f0, border-radius 12px, 32px bold, letter-spacing 8px
- Body: max-width 560px, border-radius 16px, box-shadow, white card
- Hintergrund: #f5f5f5
- Font: Segoe UI, Tahoma, Verdana, sans-serif

## Template-Definitionen

### 1. Confirm Signup
- **Betreff:** QuartierApp - Registrierung bestätigen
- **Titel:** Registrierung bestätigen
- **Text:** Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr QuartierApp-Konto zu aktivieren.
- **OTP:** Nein
- **Button:** E-Mail bestätigen → {{ .ConfirmationURL }}

### 2. Magic Link (bereits deployed)
- **Betreff:** QuartierApp - Ihr Anmelde-Code
- **Titel:** Ihr Anmelde-Code
- **Text:** Verwenden Sie diesen Code, um sich bei QuartierApp anzumelden:
- **OTP:** Ja → {{ .Token }}
- **Button:** Oder per Link anmelden → {{ .ConfirmationURL }}

### 3. Recovery (Passwort zurücksetzen)
- **Betreff:** QuartierApp - Passwort zurücksetzen
- **Titel:** Passwort zurücksetzen
- **Text:** Sie haben eine Passwortzurücksetzung angefordert. Klicken Sie auf den Button, um ein neues Passwort zu setzen.
- **OTP:** Nein
- **Button:** Neues Passwort setzen → {{ .ConfirmationURL }}

### 4. Email Change
- **Betreff:** QuartierApp - Neue E-Mail-Adresse bestätigen
- **Titel:** Neue E-Mail-Adresse bestätigen
- **Text:** Bitte bestätigen Sie die Änderung Ihrer E-Mail-Adresse.
- **OTP:** Nein
- **Button:** Änderung bestätigen → {{ .ConfirmationURL }}
- **Hinweis:** {{ .NewEmail }} Variable verfügbar, wird im Text verwendet

### 5. Invite
- **Betreff:** QuartierApp - Einladung zu QuartierApp
- **Titel:** Sie wurden zu QuartierApp eingeladen
- **Text:** Sie wurden eingeladen, QuartierApp zu nutzen — die Quartiers-App für Ihre Nachbarschaft.
- **OTP:** Nein
- **Button:** Einladung annehmen → {{ .ConfirmationURL }}

### 6. Reauthentication
- **Betreff:** QuartierApp - Sicherheitscode
- **Titel:** Sicherheitscode
- **Text:** Zur Bestätigung Ihrer Identität geben Sie bitte diesen Code in der App ein:
- **OTP:** Ja → {{ .Token }}
- **Button:** Kein Button
- **Hinweis:** "Diesen Code in der App eingeben" unter Code-Box

## Gemeinsame Textbausteine

### Fallback-Link (unter jedem Button)
> Button funktioniert nicht? Diesen Link im Browser öffnen:
> {{ .ConfirmationURL }}

### Sicherheitshinweis (alle 6 Templates)
> Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren. Ihr Konto bleibt sicher.

### Footer (alle 6 Templates)
> QuartierApp — Ihr digitaler Dorfplatz

## Technische Umsetzung
- Deploy via Supabase Management API (PATCH /v1/projects/{id}/config/auth)
- Subjects: mailer_subjects_* Keys
- Bodies: mailer_templates_*_content Keys
- OTP-Länge: mailer_otp_length = 6 (bereits gesetzt)
