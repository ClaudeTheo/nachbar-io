# Nachbar.io — Testanleitung für Pilottester

**Version:** 1.0 | **Datum:** 11. März 2026
**App-URL:** https://nachbar-io.vercel.app
**Kontakt bei Problemen:** Thomas (Admin)

---

## Willkommen als Tester!

Vielen Dank, dass Sie Nachbar.io testen! Diese App verbindet Nachbarn in Bad Säckingen digital miteinander — Nachbarschaftshilfe, lokale Infos und Quartiersleben auf einen Blick.

**Wichtig:** Sie testen eine Vorab-Version. Fehler und Verbesserungsvorschläge sind ausdrücklich erwünscht! Notieren Sie alles, was Ihnen auffällt.

---

## 1. Registrierung

### So erstellen Sie Ihr Konto

1. Öffnen Sie **https://nachbar-io.vercel.app** auf Ihrem Smartphone
2. Tippen Sie auf **"Registrieren"**
3. **Schritt 1:** E-Mail-Adresse und Passwort eingeben (mind. 8 Zeichen)
4. **Schritt 2:** Wählen Sie **"Adresse manuell angeben"**
5. **Schritt 3:** Wählen Sie eine beliebige Straße und Hausnummer aus dem Quartier
6. **Schritt 4:** Geben Sie einen Anzeigenamen ein (Vorname reicht)
7. **Schritt 5:** Wählen Sie Ihren UI-Modus (Normal oder Seniorenmodus)
8. Nach der Registrierung: **Thomas wird Ihre Adresse bestätigen** — Sie erhalten dann vollen Zugang

> **Hinweis:** Solange die Adresse nicht bestätigt ist, sehen Sie ein gelbes Banner oben in der App. Das ist normal!

---

## 2. Testaufgaben — Checkliste

Bitte gehen Sie die folgenden Aufgaben der Reihe nach durch und haken Sie ab, was funktioniert hat. Notieren Sie bei Problemen kurz, was passiert ist.

### A. Grundlagen (jeder Tester)

- [ ] **A1** — App im Browser öffnen und Startseite sehen
- [ ] **A2** — Registrierung abschließen (alle 5 Schritte)
- [ ] **A3** — Nach Freischaltung: Dashboard sehen mit Begrüßung
- [ ] **A4** — Untere Navigationsleiste: alle 5 Tabs antippen (Dashboard, Hilfe, Karte, Marktplatz, Profil)
- [ ] **A5** — App als PWA installieren (Browser zeigt "Zum Startbildschirm hinzufügen")

### B. Profil & Einstellungen

- [ ] **B1** — Profil öffnen und Anzeigenamen prüfen
- [ ] **B2** — Profil bearbeiten: Bio-Text hinzufügen
- [ ] **B3** — Push-Benachrichtigungen aktivieren (Profil → Benachrichtigungen)
- [ ] **B4** — Urlaubsmodus ein- und ausschalten (Profil → Urlaubsmodus)
- [ ] **B5** — Hilfe-Center öffnen und FAQ lesen
- [ ] **B6** — Reputation-Seite öffnen (Profil → Meine Reputation)

### C. Quartierskarte

- [ ] **C1** — Karte öffnen und alle 3 Straßen sehen (Purkersdorfer, Sanary, Oberer Rebberg)
- [ ] **C2** — Auf ein Haus tippen → Info-Panel öffnet sich
- [ ] **C3** — Lampe antippen → Farbe wechselt (Grün → Rot → Gelb → Grün)
- [ ] **C4** — Straßenfilter nutzen (nur eine Straße anzeigen)

### D. Hilfe-System

- [ ] **D1** — Neuen Hilfe-Eintrag erstellen (z.B. "Suche jemanden zum Blumen gießen")
- [ ] **D2** — Kategorie und Dringlichkeit wählen
- [ ] **D3** — Hilfe-Eintrag eines anderen Testers sehen
- [ ] **D4** — Auf einen Hilfe-Eintrag antworten/sich melden

### E. Marktplatz & Börsen

- [ ] **E1** — Marktplatz öffnen und bestehende Angebote sehen
- [ ] **E2** — Neues Angebot erstellen (z.B. "Verschenke Blumentöpfe")
- [ ] **E3** — Leihbörse öffnen
- [ ] **E4** — Neuen Leihbörse-Eintrag erstellen (z.B. "Bohrmaschine zu verleihen")
- [ ] **E5** — "Wer hat?" nutzen — Suchanfrage stellen

### F. Community-Features

- [ ] **F1** — Schwarzes Brett (Board) öffnen und lesen
- [ ] **F2** — Veranstaltungen (Events) öffnen
- [ ] **F3** — Neues Event erstellen (z.B. "Grillabend am Samstag")
- [ ] **F4** — Tipps-Seite öffnen und neuen Tipp schreiben
- [ ] **F5** — Lokale Nachrichten (News) lesen
- [ ] **F6** — Umfragen (Polls) öffnen
- [ ] **F7** — Neue Umfrage erstellen (z.B. "Sollen wir ein Straßenfest machen?")

---

## 3. Kommunikation testen (WICHTIG — zu zweit!)

**Diese Tests erfordern mindestens 2 Tester gleichzeitig.** Koordinieren Sie sich z.B. per Telefon oder WhatsApp.

### G. Nachrichten zwischen Nachbarn

- [ ] **G1** — Tester A öffnet "Nachrichten" in der Navigation
- [ ] **G2** — Tester A sucht Tester B und sendet eine Kontaktanfrage mit Nachricht
- [ ] **G3** — Tester B öffnet "Nachrichten" → sieht die Kontaktanfrage
- [ ] **G4** — Tester B nimmt die Anfrage an
- [ ] **G5** — Tester A sendet eine Nachricht an Tester B
- [ ] **G6** — Tester B sieht die Nachricht **in Echtzeit** (ohne Seite neu zu laden!)
- [ ] **G7** — Tester B antwortet → Tester A sieht die Antwort in Echtzeit
- [ ] **G8** — Prüfen: Ungelesene Nachrichten werden als Zahl am Nachrichten-Icon angezeigt

### H. Push-Benachrichtigungen (zu zweit!)

> **Voraussetzung:** Beide Tester haben Push-Benachrichtigungen aktiviert (siehe B3)

- [ ] **H1** — Tester A erstellt einen neuen Hilfe-Eintrag
- [ ] **H2** — Tester B prüft: Kommt eine Push-Benachrichtigung auf dem Handy an?
- [ ] **H3** — Tester B tippt auf die Push-Benachrichtigung → wird zur richtigen Seite geleitet
- [ ] **H4** — Benachrichtigungs-Center (Glocke oben) öffnen → alle Benachrichtigungen sehen
- [ ] **H5** — Einzelne Benachrichtigung als gelesen markieren
- [ ] **H6** — Prüfen: Ungelesene Benachrichtigungen werden als rote Zahl an der Glocke angezeigt

### I. Einladungssystem (zu zweit!)

- [ ] **I1** — Tester A öffnet Profil → "Nachbar einladen"
- [ ] **I2** — Tester A erstellt eine Einladung per WhatsApp-Link
- [ ] **I3** — Prüfen: WhatsApp öffnet sich mit vorgefertigtem Text und Link
- [ ] **I4** — Tester A öffnet "Meine Einladungen" → sieht die offene Einladung
- [ ] **I5** — (Optional) Neuer Tester C registriert sich über den Einladungslink
- [ ] **I6** — Tester A bekommt Benachrichtigung: "Nachbar hat Einladung angenommen! +50 Punkte"
- [ ] **I7** — Tester A prüft Reputation → Punkte sind gestiegen

---

## 4. Sonderfälle testen

### J. Notfall-System

> **ACHTUNG:** Dies testet das Notfall-Banner. Bitte NICHT den echten Notruf wählen!

- [ ] **J1** — Neuen Hilfe-Eintrag erstellen und Kategorie "Feuer/Brand" wählen
- [ ] **J2** — Prüfen: **Rotes Banner erscheint sofort mit "Rufen Sie zuerst 112 an!"**
- [ ] **J3** — Das Banner muss ÜBER allem anderen stehen — nichts darf es verdecken
- [ ] **J4** — Gleichen Test mit Kategorie "Medizinischer Notfall" und "Kriminalität/Einbruch"

### K. Seniorenmodus

- [ ] **K1** — Im Profil den Seniorenmodus aktivieren
- [ ] **K2** — Prüfen: Schrift wird deutlich größer
- [ ] **K3** — Prüfen: Buttons sind mindestens fingerkuppengroß (80px)
- [ ] **K4** — Prüfen: Kontraste sind gut lesbar (dunkle Schrift auf hellem Grund)
- [ ] **K5** — Jede Hauptaktion in maximal 4 Taps erreichbar?
- [ ] **K6** — Seniorenmodus wieder deaktivieren

### L. DSGVO & Datenschutz

- [ ] **L1** — Impressum-Seite öffnen und lesen
- [ ] **L2** — Datenschutz-Seite öffnen und lesen
- [ ] **L3** — Profil → "Daten exportieren" → JSON-Datei wird heruntergeladen
- [ ] **L4** — Prüfen: In der exportierten Datei stehen keine Adressen anderer Nachbarn
- [ ] **L5** — (Am Ende aller Tests) Konto löschen testen: Profil → Konto löschen

---

## 5. Allgemeine Qualität

### M. Aussehen & Bedienung

- [ ] **M1** — App sieht auf dem Handy gut aus (kein abgeschnittener Text, keine Überlappungen)
- [ ] **M2** — Alle Texte sind auf Deutsch und im "Sie"-Form
- [ ] **M3** — Farben: Hauptfarbe ist Grün, Warnungen sind Gelb/Amber (nicht Rot!)
- [ ] **M4** — Rot wird NUR für den Notruf-Banner (112/110) verwendet
- [ ] **M5** — Ladezeiten: Seiten laden innerhalb von 2-3 Sekunden
- [ ] **M6** — Fehlermeldungen sind verständlich (kein Englisch, kein technisches Kauderwelsch)

### N. Offline & PWA

- [ ] **N1** — App als PWA installieren ("Zum Startbildschirm hinzufügen")
- [ ] **N2** — App vom Startbildschirm öffnen → sieht aus wie eine echte App (kein Browser-Rahmen)
- [ ] **N3** — WLAN kurz ausschalten → App zeigt sinnvolle Offline-Meldung (nicht weiße Seite)

---

## 6. Feedback-Formular

Bitte füllen Sie nach dem Test folgendes aus und senden Sie es an Thomas:

**Name / Anzeigename:** ____________________
**Getestetes Gerät:** (z.B. iPhone 14, Samsung Galaxy S23) ____________________
**Browser:** (z.B. Safari, Chrome) ____________________
**Datum:** ____________________

### Was hat gut funktioniert?
_____________________________________________________________________
_____________________________________________________________________

### Was hat NICHT funktioniert? (Aufgaben-Nr. angeben)
_____________________________________________________________________
_____________________________________________________________________

### Was war verwirrend oder unklar?
_____________________________________________________________________
_____________________________________________________________________

### Was fehlt Ihnen? Was würden Sie sich wünschen?
_____________________________________________________________________
_____________________________________________________________________

### Gesamteindruck (1-5 Sterne): ⭐ ____

---

## Zeitplan für den Testdurchlauf

| Phase | Dauer | Was |
|-------|-------|-----|
| **Vorbereitung** | 5 Min. | Registrierung (A1-A5) |
| **Solo-Tests** | 20 Min. | Profil, Karte, Hilfe, Marktplatz (B-F) |
| **Paar-Tests** | 20 Min. | Nachrichten, Push, Einladungen (G-I) |
| **Sonderfälle** | 10 Min. | Notfall, Seniorenmodus, DSGVO (J-L) |
| **Qualität** | 5 Min. | Aussehen, Offline, PWA (M-N) |
| **Feedback** | 5 Min. | Formular ausfüllen |
| **Gesamt** | **~65 Min.** | |

---

## Technische Hinweise

- **Beste Erfahrung:** Chrome auf Android oder Safari auf iPhone
- **Push-Benachrichtigungen:** Müssen im Browser UND in den Handy-Einstellungen erlaubt sein
- **Keine echten Daten:** Verwenden Sie keine sensiblen persönlichen Daten beim Testen
- **Screenshot bei Fehlern:** Machen Sie bei Problemen einen Screenshot und notieren Sie die Aufgaben-Nr.

---

*Vielen Dank für Ihre Hilfe! Ihr Feedback macht Nachbar.io besser für alle Nachbarn.* 🏡
