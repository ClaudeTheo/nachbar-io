# Nachbar.io — Admin-Anleitung

**Version:** 1.0
**Stand:** 13.03.2026
**Zielgruppe:** Quartier-Admins und Super-Admins

---

## Inhaltsverzeichnis

1. [Rollenuebersicht](#1-rollenuebersicht)
2. [Zugang zum Admin-Dashboard](#2-zugang-zum-admin-dashboard)
3. [Dashboard-Navigation](#3-dashboard-navigation)
4. [Plattform-Uebersicht (Super-Admin)](#4-plattform-uebersicht-super-admin)
5. [Quartier-Uebersicht](#5-quartier-uebersicht)
6. [Quartier-Verwaltung (Super-Admin)](#6-quartier-verwaltung-super-admin)
7. [Nutzer-Verwaltung](#7-nutzer-verwaltung)
8. [Haushalte verwalten](#8-haushalte-verwalten)
9. [Invite-Codes](#9-invite-codes)
10. [Inhalte & Moderation](#10-inhalte--moderation)
11. [News verwalten](#11-news-verwalten)
12. [Events verwalten](#12-events-verwalten)
13. [Push-Benachrichtigungen](#13-push-benachrichtigungen)
14. [Systemstatus & Health-Checks](#14-systemstatus--health-checks)
15. [Test-Management](#15-test-management)
16. [Weitere System-Werkzeuge](#16-weitere-system-werkzeuge)
17. [Notfall-Protokoll](#17-notfall-protokoll)
18. [Haeufige Fragen (FAQ)](#18-haeufige-fragen-faq)

---

## 1. Rollenuebersicht

Nachbar.io verwendet ein dreistufiges Rollensystem:

| Eigenschaft | Nutzer | Quartier-Admin | Super-Admin |
|---|---|---|---|
| Eigene Inhalte erstellen | Ja | Ja | Ja |
| Eigenes Quartier sehen | Ja | Ja | Alle Quartiere |
| Admin-Dashboard oeffnen | Nein | Ja | Ja |
| Nutzer verwalten | Nein | Eigenes Quartier | Alle |
| Nutzer sperren/entsperren | Nein | Eigenes Quartier | Alle |
| Admin-Rechte vergeben | Nein | Nein | Ja |
| Inhalte moderieren | Nein | Eigenes Quartier | Alle |
| Push-Nachrichten senden | Nein | Eigenes Quartier | Alle |
| Invite-Codes verwalten | Nein | Eigenes Quartier | Alle |
| Quartiere erstellen | Nein | Nein | Ja |
| Quartiere bearbeiten | Nein | Eigenes Quartier | Alle |
| System-Health einsehen | Nein | Nein | Ja |
| Datenbank-Uebersicht | Nein | Nein | Ja |
| API-Tester nutzen | Nein | Nein | Ja |
| DevOps-Panel nutzen | Nein | Nein | Ja |
| Test-Management | Nein | Ja | Ja |

### Trust-Levels

Jeder Nutzer hat zusaetzlich ein Trust-Level, das die Vertrauensstufe im Quartier widerspiegelt:

- **Neu:** Frisch registriert, eingeschraenkte Sichtbarkeit
- **Verifiziert:** Adresse geprueft, voller Zugang zum Quartier
- **Vertrauenswuerdig:** Langjaehriger, aktiver Nachbar
- **Admin:** Verwaltungsrechte
- **Gesperrt:** Kein Zugang (bei Verstoessen)

---

## 2. Zugang zum Admin-Dashboard

### Option A: Ueber die Haupt-App

1. Melden Sie sich unter **https://nachbar-io.vercel.app/login** an
2. Tippen Sie auf das **Menue-Symbol** (drei Striche) unten rechts
3. Waehlen Sie **Admin-Dashboard**

> **Hinweis:** Der Menuepunkt erscheint nur, wenn Ihr Konto Admin-Rechte besitzt (`is_admin = true`).

### Option B: Externes Admin-Portal (empfohlen)

Das Admin-Portal ist unter **https://nachbar-admin.vercel.app** erreichbar — unabhaengig von der Haupt-App. Selbst wenn die Haupt-App Probleme hat, bleibt das Admin-Portal funktionsfaehig.

**Dreifache Sicherheit:**
1. **Admin-PIN eingeben** — 6-stelliger Zugangs-PIN (erhalten Sie vom Super-Admin)
2. **Anmelden** — Mit Ihrem Admin-E-Mail und Passwort
3. **Automatische Pruefung** — Nur Konten mit Admin-Rechten werden zugelassen

> **Wichtig:** Bei unbekannter PIN oder Zugangsproblemen wenden Sie sich an den Super-Admin (thomasth@gmx.de).

---

## 3. Dashboard-Navigation

Das Admin-Dashboard gliedert sich in zwei Bereiche:

### Primaere Tabs (obere Leiste)

| Tab | Symbol | Beschreibung |
|---|---|---|
| **Plattform** | Globe | Plattformweite Uebersicht aller Quartiere (nur Super-Admin) |
| **Uebersicht** | BarChart | Quartier-Statistiken und Schnellzugriff |
| **Feed** | Activity | Aktivitaets-Feed mit aktuellen Ereignissen |
| **Nutzer** | Users | Nutzerliste mit Such- und Filterfunktionen |
| **Haushalte** | Home | Haushaltsverwaltung |
| **Inhalte** | FileText | Alerts, Hilfegesuche, Marktplatz, Fundbuero |
| **News** | Newspaper | Nachrichtenartikel erstellen und verwalten |
| **Events** | Calendar | Veranstaltungen erstellen und verwalten |

### System-Werkzeuge (Dropdown-Menue)

Unter **"System & Werkzeuge"** finden Sie weitere Funktionen:

| Werkzeug | Beschreibung |
|---|---|
| **Push** | Push-Benachrichtigungen an Nutzer senden |
| **Codes** | Invite-Codes erstellen und verwalten |
| **Karte** | Karten-Editor fuer SVG-Quartierskarte |
| **Quartiere** | Quartierverwaltung (erstellen, bearbeiten) |
| **System-Health** | Systemstatus, Health-Checks, Cron-Jobs |
| **Externe Links** | Nuetzliche externe Ressourcen |
| **Datenbank** | Datenbank-Statistiken (Tabellengroessen) |
| **API-Tester** | Direkte API-Aufrufe testen |
| **DevOps** | Deployment- und CI/CD-Informationen |
| **Tests** | Test-Sessions und QA-Management |

---

## 4. Plattform-Uebersicht (Super-Admin)

> **Nur fuer Super-Admins verfuegbar.** Wird automatisch als Starttab geladen.

Die Plattform-Uebersicht zeigt aggregierte Kennzahlen ueber alle Quartiere:

- **Quartiere gesamt** (Aktiv / Entwurf / Archiviert)
- **Nutzer gesamt** (plattformweit)
- **Aktive Alerts** (plattformweit)
- **Hilfegesuche** (plattformweit)

### Quartier-Karten

Fuer jedes Quartier sehen Sie eine Karte mit:
- Name, Stadt, Status (Aktiv/Entwurf/Archiviert)
- Bewohnerzahl, aktive Alerts, Hilfegesuche
- Erstellungsdatum

### Neues Quartier erstellen

Klicken Sie auf **"+ Neues Quartier"**, um den Quartier-Assistenten zu starten (siehe Abschnitt 6).

---

## 5. Quartier-Uebersicht

Der Tab **Uebersicht** zeigt die wichtigsten Kennzahlen Ihres Quartiers:

### Schnellstatistiken

- **Nutzer gesamt** — Alle registrierten Bewohner (mit Trend gegenueber Vorwoche)
- **Belegungsquote** — Anteil belegter Haushalte (gruen ab 50%, gelb darunter)
- **Offene Meldungen** — Unerledigte Alerts (orange hervorgehoben bei > 0)
- **Aktive Hilfegesuche** — Laufende Hilfeanfragen
- **Marktplatz-Inserate** — Aktive Angebote/Gesuche
- **Anstehende Events** — Zukuenftige Veranstaltungen

### Quartierspuls (Letzte 7 Tage)

Zeigt Trends der letzten Woche:
- Neue Nutzer
- Belegungsquote
- Erledigte Alerts
- Nutzer im Seniorenmodus

### Verifizierungs-Warteschlange

Ganz oben erscheint die **Verifizierungs-Queue**: Neu registrierte Nutzer, deren Adresse noch bestaetigt werden muss. Pruefen und verifizieren Sie diese zeitnah.

### Schnellzugriff

Vier Kacheln fuer haeufige Aktionen:
- Offene Meldungen anzeigen
- Nutzer verwalten
- Push senden
- News erstellen

---

## 6. Quartier-Verwaltung (Super-Admin)

### Neues Quartier erstellen — Der 5-Schritte-Assistent

#### Schritt 1: Grunddaten
- **Name** (Pflicht) — z.B. "Bad Saeckingen — Altstadt"
- **Stadt** (Pflicht) — z.B. "Bad Saeckingen"
- **Bundesland** — Auswahl aus allen 16 Bundeslaendern
- **Beschreibung** — Optionaler Freitext
- **Kontakt-E-Mail** — E-Mail-Adresse des Quartier-Admins

#### Schritt 2: Standort
- **Breitengrad** (Pflicht) — z.B. 47.5535
- **Laengengrad** (Pflicht) — z.B. 7.9640
- **Zoom-Level** — 14 (Stadtteil) bis 19 (Einzelhaeuser), Standard: 17

> **Tipp:** Koordinaten finden Sie in Google Maps (Rechtsklick → Koordinaten kopieren) oder auf OpenStreetMap.

Die Bounding-Box (~500m um das Zentrum) wird automatisch berechnet.

#### Schritt 3: Konfiguration
- **Invite-Praefix** (Pflicht) — Grossbuchstaben, max. 10 Zeichen (z.B. "REBBERG"). Wird fuer Einladungscodes verwendet: REBBERG-A1B2
- **Maximale Haushalte** — Obergrenze fuer das Quartier (Standard: 50)
- **Module aktivieren/deaktivieren:**
  - Care-Modul (Senioren-Betreuung, SOS, Medikamente)
  - Marktplatz (Angebote/Gesuche)
  - Veranstaltungen
  - Umfragen
  - Notfall-Banner (112/110 Anzeige bei Notfallkategorien)

> **WICHTIG:** Das Notfall-Banner sollte IMMER aktiviert bleiben. Es zeigt bei Notfallmeldungen automatisch die Notrufnummern 112/110 an.

#### Schritt 4: Karte
Waehlen Sie den Karten-Typ:
- **SVG-Karte (individuell)** — Spaeter ein Luftbild hochladen und Haeuser manuell platzieren. Ideal fuer kleine Quartiere.
- **Leaflet / OpenStreetMap (automatisch)** — Nutzt OSM-Kacheln basierend auf den Koordinaten. Ideal fuer groessere Quartiere.

Der Karten-Typ kann spaeter in den Einstellungen geaendert werden.

#### Schritt 5: Uebersicht & Aktivierung
- Pruefen Sie alle Angaben in der Zusammenfassung
- Waehlen Sie:
  - **Als Entwurf speichern** — Quartier wird erstellt, ist aber noch nicht sichtbar
  - **Sofort aktivieren** — Quartier ist sofort aktiv, Bewohner koennen beitreten

### Quartier bearbeiten

In der Quartierverwaltung (System-Werkzeuge → Quartiere) koennen Sie:
- Quartier-Details aendern (Name, Beschreibung, Kontakt)
- Module ein-/ausschalten
- Status aendern (Entwurf → Aktiv → Archiviert)
- Quartier-Admins zuweisen

---

## 7. Nutzer-Verwaltung

### Neuen Nutzer anlegen

1. Oeffnen Sie den Tab **Nutzer**
2. Klicken Sie auf **"Konto fuer Nachbar erstellen"**
3. Fuellen Sie die Felder aus:
   - **Name** (Pflicht) — z.B. "Erika Mueller"
   - **Strasse** (Pflicht) — Auswahl aus den Quartier-Strassen
   - **Hausnummer** (Pflicht)
   - **E-Mail** (optional) — Falls nicht angegeben, wird eine automatische E-Mail generiert
   - **Modus** — "Seniorenmodus" (groessere Schrift/Buttons) oder "Normal"
4. Klicken Sie auf **"Konto erstellen"**
5. **WICHTIG:** Die Zugangsdaten (E-Mail + temporaeres Passwort) werden einmalig angezeigt. Notieren Sie diese und geben Sie sie dem Nutzer weiter. Das Passwort kann danach nicht mehr angezeigt werden!

### Nutzer suchen und filtern

- **Suchfeld:** Suche nach Name oder Trust-Level
- **Aktivitaetsfilter:**
  - Alle — Zeigt alle Nutzer
  - Aktiv (30d) — Nutzer, die in den letzten 30 Tagen aktiv waren
  - Inaktiv — Nutzer ohne Aktivitaet seit 30+ Tagen
- **Statistik-Pillen:** Zeigen Anzahl Nutzer, Admins, Senioren, Gesperrte

### Nutzer bearbeiten

Tippen Sie auf einen Nutzer, um die erweiterten Aktionen zu oeffnen:

**Trust-Level aendern:**
- Neu → Verifiziert → Vertrauenswuerdig → Admin
- Waehlen Sie das gewuenschte Level per Knopfdruck

**UI-Modus aendern:**
- **Normal** — Standard-Ansicht
- **Seniorenmodus** — Groessere Touch-Targets (80px), erhoehter Kontrast (4.5:1), vereinfachte Navigation

**Admin-Rechte vergeben/entziehen:**
- Klicken Sie auf "Zum Admin machen" bzw. "Admin entziehen"
- Super-Admin-Rechte koennen nur direkt in der Datenbank vergeben werden

**Nutzer sperren:**
- Klicken Sie auf "Sperren" — Trust-Level wird auf "banned" gesetzt
- Gesperrte Nutzer koennen sich nicht mehr anmelden
- Zum Entsperren klicken Sie auf "Entsperren"

---

## 8. Haushalte verwalten

Im Tab **Haushalte** sehen Sie alle registrierten Haushalte:

- Strasse und Hausnummer
- Anzahl der Bewohner
- Verifizierungsstatus
- Zugeordnetes Quartier

Haushalte werden typischerweise ueber **Invite-Codes** angelegt (siehe Abschnitt 9).

---

## 9. Invite-Codes

Invite-Codes sind der primaere Weg, wie neue Bewohner Zugang zum Quartier erhalten.

### So funktionieren Invite-Codes

1. Ein Admin erstellt einen Haushalt mit automatisch generiertem Code
2. Der Code wird dem Bewohner mitgeteilt (Briefkasten, persoenlich, QR-Code)
3. Der Bewohner gibt den Code bei der Registrierung ein
4. Er wird automatisch dem richtigen Haushalt und Quartier zugeordnet

### Invite-Code-Verwaltung oeffnen

System-Werkzeuge → **Codes**

### Statistiken

Oben sehen Sie drei Kennzahlen:
- **Gesamt-Codes** — Alle erstellten Codes
- **Verwendet** — Codes, mit denen sich Nutzer registriert haben
- **Unbenutzt** — Noch verfuegbare Codes

### Quartier-Filter

Falls mehrere Quartiere existieren, koennen Sie nach Quartier filtern. Codes werden dann mit dem Quartier-spezifischen Praefix generiert.

### Neuen Haushalt + Code anlegen

1. Waehlen Sie die **Strasse** aus der Dropdown-Liste
2. Geben Sie die **Hausnummer** ein
3. Optional: Geben Sie **Koordinaten** ein (Lat/Lng)
4. Klicken Sie auf **"Haushalt + Code erstellen"**

Der kryptografisch sichere Code wird automatisch generiert.

### Code-Aktionen

Fuer jeden unbenutzten Code stehen drei Aktionen zur Verfuegung:

| Symbol | Aktion | Beschreibung |
|---|---|---|
| Kopieren | Code kopieren | Kopiert den Code in die Zwischenablage |
| Erneuern | Code erneuern | Generiert einen neuen Code (alter wird ungueltig) |
| Loeschen | Code widerrufen | Loescht den Haushalt und den Code |

### QR-Codes drucken

Unter **"QR-Codes drucken"** koennen Sie:
- **Alle Codes** auf einmal drucken
- Codes nach **Strasse** filtern und drucken

Es oeffnet sich eine Druckansicht mit QR-Codes, die direkt ausgedruckt und in Briefkaesten verteilt werden koennen.

### Verwendete Codes

Klicken Sie auf **"Verwendete Codes"**, um zu sehen, welche Codes bereits eingeloest wurden. Hier sehen Sie auch die Anzahl der Bewohner pro Haushalt. Auch bei verwendeten Codes koennen Sie den Code erneuern (z.B. wenn ein Code kompromittiert wurde).

---

## 10. Inhalte & Moderation

Im Tab **Inhalte** koennen Sie alle nutzererstellten Inhalte einsehen und moderieren:

### Meldungen (Alerts)

- Status: Offen / In Bearbeitung / Erledigt
- Kategorien: Laerm, Beschaedigung, Verdaechtig, Sonstiges
- Bei Notfall-Kategorien (fire, medical, crime) wird automatisch das **Notfall-Banner mit 112/110** angezeigt
- Sie koennen Meldungen schliessen oder loeschen

### Hilfegesuche

- Offene Hilfsanfragen aus der Nachbarschaft
- Status aendern: Aktiv → Erledigt

### Marktplatz

- Aktive Angebote und Gesuche
- Eintraege bei Verstoessen entfernen

### Fundbuero

- Verlorene und gefundene Gegenstaende
- Status: Offen → Zugeordnet → Erledigt

---

## 11. News verwalten

Im Tab **News** koennen Sie Nachrichtenartikel fuer das Quartier erstellen:

- **Titel und Inhalt** verfassen
- **Kategorie** waehlen (Quartier, Stadt, Allgemein)
- Artikel **veroeffentlichen** oder als **Entwurf** speichern
- Bestehende Artikel **bearbeiten** oder **loeschen**

---

## 12. Events verwalten

Im Tab **Events** koennen Sie Veranstaltungen erstellen:

- **Titel, Beschreibung, Ort** angeben
- **Datum und Uhrzeit** festlegen
- **Kategorie** waehlen (Nachbarschaftsfest, Workshop, Sport, etc.)
- Events **bearbeiten** oder **absagen**

---

## 13. Push-Benachrichtigungen

System-Werkzeuge → **Push**

### Nachricht erstellen

1. Geben Sie einen **Titel** ein (kurz und praegnant)
2. Verfassen Sie den **Nachrichtentext**
3. Waehlen Sie die **Zielgruppe:**
   - **Alle** — Alle Nutzer des Quartiers
   - **Strasse** — Nur Bewohner einer bestimmten Strasse
   - **Senioren** — Nur Nutzer im Seniorenmodus
4. Waehlen Sie die **Dringlichkeit:**
   - **Normal** — Standard-Benachrichtigung
   - **Wichtig** — Hervorgehobene Darstellung
   - **Dringend** — Sofortige Aufmerksamkeit
5. Klicken Sie auf **"Nachricht senden"**
6. **Bestaetigen** Sie den Versand im Bestaetigungsdialog

### Broadcast-Verlauf

Unter der Eingabe sehen Sie die letzten gesendeten Broadcasts mit:
- Titel und Text
- Zeitpunkt
- Anzahl der Empfaenger

> **Vorsicht:** Push-Benachrichtigungen koennen nicht zurueckgerufen werden. Pruefen Sie Titel und Text sorgfaeltig vor dem Versand.

---

## 14. Systemstatus & Health-Checks

> **Primaer fuer Super-Admins.** System-Werkzeuge → **System-Health**

### Automatischer Health-Check

Das System fuehrt alle **30 Sekunden** automatisch Health-Checks durch:

| Pruefung | Was wird geprueft |
|---|---|
| API | Erreichbarkeit der Backend-API |
| Datenbank | Verbindung zu Supabase PostgreSQL |
| Auth | Authentifizierungsdienst |
| Cron-Jobs | Heartbeat der 4 Cron-Jobs (Eskalation, Medikamente, Check-in, Heartbeat) |

### Status-Ampel

- **Gruen (OK):** Alles laeuft normal
- **Gelb (Warnung):** Nicht-kritisches Problem erkannt
- **Rot (Fehler):** Kritisches Problem — sofortige Aufmerksamkeit erforderlich

### Umgebungsvariablen

Zeigt an, ob alle kritischen Umgebungsvariablen konfiguriert sind (aus Datenschutzgruenden werden nur Status, keine Werte angezeigt):
- Supabase URL und Key
- VAPID Public Key (fuer Push)
- Anthropic API Key (fuer KI-News)

### Cron-Job-Monitoring

Die Care-Modul-Cron-Jobs werden ueberwacht:
- **Eskalation** — Prueft ueberfaellige SOS-Alerts
- **Medikamente** — Sendet Medikamenten-Erinnerungen
- **Check-in** — Prueft ueberfaellige Senioren-Check-ins
- **Heartbeat** — Prueft die Cron-Job-Ausfuehrung selbst

> **Bei einem roten Status:** Pruefen Sie die Vercel-Logs unter https://vercel.com oder kontaktieren Sie den technischen Support.

---

## 15. Test-Management

System-Werkzeuge → **Tests**

### Testmodus

In der aktuellen Pilotphase sind **alle Nutzer automatisch Tester**. Der Testmodus ermoeglicht:

- **Test-Sessions** starten und beenden
- **Testpunkte** abarbeiten (60 Testpunkte in 10 Testpfaden)
- **Ergebnisse** erfassen (bestanden/fehlgeschlagen/uebersprungen)
- **Reports** generieren und per E-Mail versenden

### Test-Sessions verwalten

1. Starten Sie eine neue **Test-Session** fuer einen Nutzer
2. Der Nutzer sieht im Test-Panel seine Aufgaben
3. Fortschritt wird automatisch erfasst:
   - 40% Seitenabdeckung (automatisch)
   - 60% Manuelle Tests (vom Tester erfasst)
4. Bei Abschluss wird ein **E-Mail-Report** an den Admin gesendet

---

## 16. Weitere System-Werkzeuge

### Karten-Editor (System-Werkzeuge → Karte)

Bearbeiten Sie die SVG-Quartierskarte:
- Haeuser positionieren
- Strassen zuordnen
- Koordinaten anpassen

### Datenbank-Uebersicht (System-Werkzeuge → Datenbank)

Zeigt Statistiken zu allen Datenbanktabellen:
- Tabellenname
- Anzahl der Eintraege
- Letzte Aktualisierung

### API-Tester (System-Werkzeuge → API-Tester)

Testen Sie API-Endpunkte direkt aus dem Dashboard:
- HTTP-Methode waehlen (GET, POST, PUT, DELETE)
- Endpunkt eingeben
- Request-Body angeben
- Antwort einsehen

### DevOps-Panel (System-Werkzeuge → DevOps)

Informationen zu Deployment und CI/CD:
- Aktueller Deployment-Status
- Build-Logs
- GitHub Actions Workflow-Status

### Externe Links (System-Werkzeuge → Externe Links)

Direktlinks zu wichtigen externen Diensten:
- Supabase Dashboard
- Vercel Dashboard
- GitHub Repository

---

## 17. Notfall-Protokoll

### Automatischer Notfall-Banner

Bei Meldungen der Kategorien **fire** (Brand), **medical** (Medizinisch) oder **crime** (Kriminalitaet) wird **automatisch** ein roter Notfall-Banner angezeigt:

```
╔══════════════════════════════════════╗
║  NOTRUF: 112 (Feuerwehr/Rettung)   ║
║  POLIZEI: 110                        ║
║                                      ║
║  [112 anrufen]    [110 anrufen]      ║
╚══════════════════════════════════════╝
```

- Der Banner erscheint **immer zuerst**, bevor andere Inhalte gezeigt werden
- Zwei explizite Buttons zum direkten Anruf
- Der Banner kann nicht durch Escape geschlossen werden — nur ueber die zwei Buttons

> **KRITISCH:** Dieses Verhalten darf NIEMALS deaktiviert werden. Es ist eine Sicherheitsanforderung.

### SOS-Alert-Eskalation (Care-Modul)

Wenn ein Senior einen SOS-Alert ausloest:

1. **Push-Benachrichtigung** an alle Care-Helfer
2. Falls keine Reaktion: **SMS** an registrierte Helfer (nach Timeout)
3. Falls keine Reaktion: **Sprachanruf** an registrierte Helfer (nach weiterem Timeout)
4. Jeder Kanal hat **3 Wiederholungsversuche** mit exponentiellem Backoff

> **Als Admin:** Ueberwachen Sie offene SOS-Alerts im Inhalte-Tab. Eskalieren Sie bei Bedarf manuell per Telefon.

---

## 18. Haeufige Fragen (FAQ)

### Wie vergebe ich Super-Admin-Rechte?

Super-Admin-Rechte koennen nur direkt in der Datenbank vergeben werden:
1. Oeffnen Sie das Supabase Dashboard
2. Navigieren Sie zu **Table Editor → users**
3. Setzen Sie das Feld `role` auf `super_admin`

### Ein Nutzer hat sein Passwort vergessen — was tun?

1. Bitten Sie den Nutzer, auf der Login-Seite auf **"Passwort vergessen"** zu klicken
2. Alternativ: Erstellen Sie ein neues Konto ueber die Nutzerverwaltung

### Wie deaktiviere ich ein Quartier?

1. Oeffnen Sie System-Werkzeuge → **Quartiere**
2. Waehlen Sie das Quartier aus
3. Aendern Sie den Status auf **"Archiviert"**

Archivierte Quartiere sind fuer Bewohner nicht mehr sichtbar, die Daten bleiben aber erhalten.

### Warum zeigt die Uebersicht "0 Nutzer" an?

Die Nutzerzahl wird ueber die Haushaltszugehoerigkeit berechnet. Stellen Sie sicher, dass:
- Haushalte dem richtigen Quartier zugeordnet sind (`quarter_id`)
- Nutzer ueber Invite-Codes einem Haushalt beigetreten sind

### Wie sende ich einen Push an alle Quartiere gleichzeitig?

Derzeit koennen Push-Benachrichtigungen nur pro Quartier gesendet werden. Als Super-Admin koennen Sie den Vorgang fuer jedes aktive Quartier wiederholen.

### Was bedeuten die Farben im Systemstatus?

- **Gruen:** System laeuft einwandfrei
- **Gelb:** Nicht-kritisches Problem (z.B. ein optionaler Dienst ist nicht konfiguriert)
- **Rot:** Kritisches Problem — Nutzer koennten betroffen sein, pruefen Sie die Logs

### Wie finde ich die Vercel-Logs bei einem Fehler?

1. Oeffnen Sie https://vercel.com
2. Waehlen Sie das Projekt **nachbar-io**
3. Klicken Sie auf **Deployments** → aktuellstes Deployment
4. Waehlen Sie **Functions** und dann die betroffene Route

---

*Bei weiteren Fragen wenden Sie sich an thomasth@gmx.de.*
