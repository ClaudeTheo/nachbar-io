# Pilot 0 Druckvorlage: Hausnummer-Code

Datum: 2026-05-15
Status: Arbeitsfassung fuer Founder-Freigabe vor Druck
Quelle: Codex-Abnahme `2026-05-15-pilot-registrierung-abnahme-und-brieftext.md` + Claude-Review `docs/plans/handoff/2026-05-15-claude-an-codex-pilot0-hausnummercode-review.md`

## Founder-Entscheidungen als Arbeitsannahme

Diese Druckvorlage folgt den konservativen Empfehlungen aus Claudes Review:

| Entscheidung | Annahme fuer diese Vorlage |
|---|---|
| E1 Brief-Reichweite | Nur 5-10 handausgewaehlte Pilotfamilien, persoenlich uebergeben oder eingeworfen. |
| E2 Senioren-Setup | Nicht im ersten Brief erklaeren. Nur ein kurzer Hinweis auf spaeteres persoenliches Gespraech. |
| E3 Support-Kanal | Persoenliche E-Mail + Telefonnummer als Platzhalter. Pilot-Mailbox erst spaeter. |

Vor Druck bitte `{{SUPPORT_EMAIL}}`, `{{SUPPORT_TELEFON}}`, `{{HAUSNUMMER_CODE}}` und `{{REGISTRIERUNGS_LINK}}` ersetzen.

## Platzhalter

| Platzhalter | Bedeutung |
|---|---|
| `{{HAUSNUMMER_CODE}}` | Bestehender `households.invite_code` fuer diesen Haushalt. |
| `{{REGISTRIERUNGS_LINK}}` | Empfohlen: `https://nachbar-io.vercel.app/register` |
| `{{SUPPORT_EMAIL}}` | Persoenlicher Pilot-Support, z.B. Gmail bis HR-Eintragung. |
| `{{SUPPORT_TELEFON}}` | Telefonnummer fuer Pilotfamilien. |
| `{{ANREDE_ADRESSE}}` | Optional: Strasse/Hausnummer oder persoenliche Anrede. |

## A4-Brief

### Kopf

```text
QuartierApp Bad Saeckingen
Pilot 0 - persoenliche Einladung

Thomas Theobald
{{SUPPORT_EMAIL}}
{{SUPPORT_TELEFON}}
```

### Betreff

```text
Ihr Zugang zur QuartierApp fuer Bad Saeckingen
```

### Brieftext

```text
Guten Tag,

ich heisse Thomas Theobald und wohne in Bad Saeckingen. Ich teste in unserem Quartier eine kleine digitale Nachbarschaftshilfe. Sie hilft, mit Familie und Nachbarn im Alltag in Verbindung zu bleiben - und Hinweise aus dem Quartier, zum Beispiel Wetter, Muellabfuhr und Warnungen, an einem Ort zu sehen.

Der Pilot ist bewusst klein. Ich suche fuenf bis zehn Haushalte in unserer Nachbarschaft, die mithelfen, das Programm gut und verstaendlich zu machen.

Fuer Ihre Adresse habe ich einen Hausnummer-Code vorbereitet:

{{HAUSNUMMER_CODE}}

Bitte geben Sie diesen Code bei der Anmeldung ein. Er ordnet Sie Ihrem Haushalt zu.

Der Code ist fuer Ihren Haushalt gedacht. Bitte teilen Sie ihn nicht oeffentlich - nicht im Treppenhaus und nicht in Chats. Wenn der Code aus Versehen herauskommt, melden Sie sich bei mir, und ich richte einen neuen ein.

Wichtig:
Im Notfall waehlen Sie immer zuerst 112 (Rettungsdienst) oder 110 (Polizei).
Diese App ist kein medizinisches Geraet und ersetzt keinen Notruf. Sie ist eine Verbindung zur Familie und zum Quartier.

So melden Sie sich an:

1. Oeffnen Sie diese Seite:
   {{REGISTRIERUNGS_LINK}}

   Die Adresse beginnt mit:
   https://nachbar-io.vercel.app

   Bitte pruefen Sie das, bevor Sie etwas eingeben.

2. Waehlen Sie "Hausnummer-Code".

3. Geben Sie den Code aus diesem Brief ein.

4. Folgen Sie den weiteren Schritten.

Wenn in Ihrem Haushalt eine Jugendliche oder ein Jugendlicher ab 14 Jahren mitnutzen moechte, koennen Sie den Hausnummer-Code dafuer freigeben. Bitte besprechen Sie das vorher.

Im Jugendmodus gibt es keine Zahlungen, keine Auszahlungen, keine Wallet und keine Anzeige exakter privater Adressen. Pflegedaten sind ausgeschlossen.

Kinder unter 14 Jahren koennen sich im Test nicht selbst anmelden - auch nicht mit Ihrem Hausnummer-Code.

Wenn ein Kind unter 14 Zugang braucht, richten wir das spaeter ueber Ihren Eltern- oder Betreuerzugang ein.

Wenn Sie spaeter auch fuer eine Seniorin oder einen Senior in Ihrer Familie mitdenken moechten, sprechen wir das im persoenlichen Termin durch. Im ersten Schritt geht es nur um Ihren eigenen Zugang.

Datenschutz kurz:
Ihre Daten liegen bei Supabase in Frankfurt am Main. Es gibt keine Werbung und kein Tracking durch Dritte. Sie koennen jederzeit Schluss machen, dann werden Ihre Daten geloescht. Eine ausfuehrliche Datenschutz-Kurzinfo bekommen Sie zusaetzlich.

Wenn der Code nicht funktioniert, Sie unsicher sind oder etwas nicht klappt:

E-Mail: {{SUPPORT_EMAIL}}
Telefon: {{SUPPORT_TELEFON}} (Mo-Fr 10-18 Uhr)

Ich antworte spaetestens innerhalb von zwei Werktagen.

Bitte nennen Sie nur Ihre Strasse und Hausnummer, nicht mehr Daten als noetig.

Vielen Dank, dass Sie den Pilot mit mir ausprobieren.

Thomas Theobald
```

## QR-Karte / Rueckseite

Kurzfassung fuer eine QR-Karte, Rueckseite oder unteren Briefabschnitt:

```text
QuartierApp Bad Saeckingen

1. QR-Code scannen oder Link oeffnen:
   nachbar-io.vercel.app/register

2. "Hausnummer-Code" waehlen.

3. Code aus diesem Brief eingeben:
   {{HAUSNUMMER_CODE}}

Im Notfall: 112 (Rettung) oder 110 (Polizei) waehlen.

Der Code ist fuer Ihren Haushalt. Bitte nicht oeffentlich teilen.

Jugendliche ab 14 starten eingeschraenkt im Jugendmodus.
Kinder unter 14 nur ueber Eltern- oder Betreuerzugang.

Thomas Theobald
{{SUPPORT_EMAIL}}
{{SUPPORT_TELEFON}}
```

## Druck-Checkliste

Vor Druck:

- [ ] E1 bestaetigt: nur 5-10 handausgewaehlte Haushalte.
- [ ] E2 bestaetigt: Senioren-Setup nicht im ersten Brief erklaeren.
- [ ] E3 bestaetigt: finale Support-E-Mail und Telefonnummer.
- [ ] Pro Haushalt `{{HAUSNUMMER_CODE}}` ersetzt.
- [ ] Link sichtbar als `https://nachbar-io.vercel.app/register`, kein Shortlink.
- [ ] QR-Code fuehrt exakt auf `https://nachbar-io.vercel.app/register`.
- [ ] 112/110-Hinweis sichtbar im Hauptbrief und auf der Kurzkarte.
- [ ] Kein Aushang-Code, keine 3-Codes-Logik, kein Ersatzcode-Versprechen.
- [ ] Kein Payment, keine Wallet, keine Coins, kein Job-Marktplatz erwaehnt.
- [ ] Datenschutz-Kurzinfo separat beilegen oder im Gespraech anbieten.

## Wenn ein Code geleakt ist

Pilot 0 baut bewusst kein Ersatzcode-System.

Operativer Ablauf:

1. Haushalt meldet sich bei Thomas.
2. Thomas rotiert `households.invite_code` manuell per SQL oder Admin-Werkzeug, falls vorhanden.
3. Bestehende registrierte Haushaltsmitglieder bleiben erhalten.
4. Neuer Brief wird manuell zugestellt.

Das ist eine Rote-Zone-Aktion, weil es ein Prod-DB-Write ist. Nicht ohne Founder-Go ausfuehren.

## Bewusst nicht in dieser Vorlage

- Kein Senioren-/Angehoerigen-Setup als eigener Flow.
- Kein Eltern-Bestaetigungsworkflow als technisches Versprechen.
- Kein Ersatzcode-Versprechen.
- Keine oeffentlichen Aushang-Codes.
- Keine Zahlungs- oder Verdienstversprechen.
- Keine KI-Funktion mit personenbezogenen Daten.
