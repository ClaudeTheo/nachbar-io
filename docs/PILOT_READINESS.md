# Nachbar.io — Pilot-Readiness-Dokument

> Zielgruppe: Kommunen, Pflegeorganisationen, Investoren
> Stand: April 2026 | Pilotquartier: Bad Saeckingen

---

## Inhaltsverzeichnis

1. [Projektuebersicht](#1-projektuebersicht)
2. [Funktionsumfang](#2-funktionsumfang)
3. [Technische Architektur](#3-technische-architektur)
4. [DSGVO-Konformitaet](#4-dsgvo-konformitaet)
5. [Seniorengeraet-Unterstuetzung](#5-seniorengeraet-unterstuetzung)
6. [Pilot-Anforderungen](#6-pilot-anforderungen)
7. [Monetarisierung](#7-monetarisierung)
8. [Skalierbarkeit](#8-skalierbarkeit)
9. [Naechste Schritte](#9-naechste-schritte)

---

## 1. Projektuebersicht

### Was ist Nachbar.io?

Nachbar.io ist eine hyperlokale Seniorenhilfe-Plattform, die aeltere Menschen
in ihrem Wohnquartier mit Nachbarn, Angehoerigen und professionellen
Pflegediensten vernetzt. Die Plattform verbindet digitale Pflege-Koordination
mit nachbarschaftlichem Engagement und ermoeglicht es Seniorinnen und
Senioren, sicher und selbstbestimmt in ihrer vertrauten Umgebung zu leben.

### Pilotquartier

| Merkmal | Details |
|---|---|
| **Standort** | Bad Saeckingen (Baden-Wuerttemberg) |
| **Strassen** | Purkersdorfer Strasse, Sanarystrasse, Oberer Rebberg |
| **Haushalte** | ca. 30 bis 40 Haushalte |
| **Geo-Zentrum** | 47,5535 Grad N / 7,9640 Grad E |
| **Quartierskarte** | Interaktive SVG-Karte mit 76 erfassten Haeusern |

### Kerngedanke

Nachbar.io schliesst die Luecke zwischen professioneller Pflege und
informeller Nachbarschaftshilfe. Die Plattform baut auf drei Saeulen auf:

- **Sicherheit:** Automatisierte SOS-Eskalation, taegliche Check-ins
  und Medikamenten-Erinnerungen schuetzen Seniorinnen und Senioren.
- **Vernetzung:** Nachbarn, Angehoerige und Pflegedienste werden in ein
  koordiniertes Hilfsnetzwerk eingebunden.
- **Transparenz:** Lueckenlose Dokumentation und Pflegeberichte
  unterstuetzen Angehoerige und Pflegedienste bei der Betreuung.

---

## 2. Funktionsumfang

### 2.1 SOS-Notruf-System

Das SOS-System bietet fuenf Hilfe-Kategorien: Medizinischer Notfall,
Allgemeine Hilfe, Besuch gewuenscht, Einkauf/Besorgung und
Medikamentenhilfe. Bei einem medizinischen Notfall wird sofort ein
Banner mit der Notrufnummer 112 angezeigt, bevor jegliche andere
Aktion erfolgt.

**4-Stufen-Eskalation mit Echtzeit-Tracking:**

| Stufe | Empfaenger | Zeitfenster | Benachrichtigungskanaele |
|---|---|---|---|
| 1 | Nachbarn (verifiziert) | Sofort | Push, In-App |
| 2 | Angehoerige | Nach 5 Minuten | Push, In-App, SMS |
| 3 | Pflegedienst | Nach 15 Minuten | Push, In-App, SMS, Sprachanruf |
| 4 | Leitstelle / Administration | Nach 30 Minuten | SMS, Sprachanruf, Admin-Alert |

Alle Zeitintervalle sind pro Senior individuell konfigurierbar. Die
Eskalation erfolgt automatisch per Cron-Job (jede Minute) oder kann
manuell durch die betroffene Person oder Helfende ausgeloest werden.
Der gesamte Lebenszyklus eines SOS-Alerts wird in Echtzeit verfolgt:
Ausgeloest, Benachrichtigt, Angenommen, Helfer unterwegs, Geloest.

### 2.2 Taegliche Check-ins

Seniorinnen und Senioren erhalten zu konfigurierbaren Uhrzeiten
(Standard: 08:00 und 20:00 Uhr) eine Check-in-Aufforderung. Drei
Antwortmoeglichkeiten stehen zur Verfuegung: "Mir geht es gut",
"Nicht so gut" oder "Ich brauche Hilfe".

**Automatische Eskalation bei versaeumtem Check-in:**

- Nach 30 Minuten: Zweite Erinnerung per Push-Benachrichtigung
- Nach 60 Minuten: Automatische Eskalation mit SOS-Ausloesung
  (Angehoerige und Pflegedienst werden sofort informiert)

Bei der Antwort "Nicht so gut" werden Angehoerige informiert. Bei
"Ich brauche Hilfe" wird automatisch ein SOS-Alert ausgeloest.

### 2.3 Medikamenten-Verwaltung

Die Medikamenten-Verwaltung umfasst Stammdatenpflege (Name, Dosierung,
Einnahmeplan, Anweisungen) sowie automatische Erinnerungen. Drei
Einnahmeplan-Typen werden unterstuetzt: taeglich, woechentlich und
intervallbasiert.

**Erinnerungs- und Eskalationsablauf:**

- Zum geplanten Einnahmezeitpunkt: Push-Erinnerung an den Senior
- Reaktionsmoeglichkeiten: Genommen, Uebersprungen oder 30 Minuten verschieben
- Nach 60 Minuten ohne Reaktion: Automatische Markierung als verpasst
  mit Benachrichtigung an Angehoerige und Pflegedienst

Angehoerige und Pflegedienste koennen Medikamente im Namen des Seniors
verwalten und erhalten Compliance-Berichte.

### 2.4 Termin-Management

Arzttermine, Pflegedienst-Besuche, Therapien und sonstige Termine
werden zentral verwaltet. Jeder Termin unterstuetzt konfigurierbare
Erinnerungszeitpunkte (Standard: 60 Minuten und 15 Minuten vorher).
Betreuer, die einen Termin im Namen des Seniors verwalten, erhalten
separate Erinnerungen.

### 2.5 Helfer-Netzwerk mit Verifizierung

Drei Helfer-Rollen stehen zur Verfuegung:

| Rolle | Beschreibung | SOS-Stufe |
|---|---|---|
| Nachbar | Freiwilliger Helfer aus der Nachbarschaft | Stufe 1 |
| Angehoerige/r | Familienangehoerige des Seniors | Stufe 2 |
| Pflegedienst | Professioneller Pflegedienstleister | Stufe 3 |

Alle Helfenden durchlaufen einen Verifizierungsprozess. Erst nach
administrativer Pruefung und Freigabe erhalten sie Zugriff auf
Senior-Daten. Die Zugriffsrechte sind nach Rolle differenziert:
Nachbarn koennen Check-ins einsehen und auf SOS reagieren.
Angehoerige und Pflegedienste haben darueber hinaus Zugriff auf
Medikamente, Termine, Berichte und Profildaten.

### 2.6 Pflege-Berichte

Das Berichtssystem generiert umfassende Auswertungen in acht
Berichtstypen: Tages-, Wochen- und Monatsberichte, Notfall-Protokolle,
Medikamentenberichte, Pflegehilfsmittel-Antraege, Steuerzusammenfassungen
und Nutzungsberichte.

Jeder Bericht enthaelt:
- Check-in-Statistiken mit Compliance-Rate
- Medikamenten-Compliance pro Praeparat
- SOS-Alert-Uebersicht nach Kategorie
- Terminuebersicht
- Aktivitaetsprotokoll der letzten Ereignisse

Berichte koennen als PDF exportiert werden (ueber die Browser-eigene
Druckfunktion) und dienen als Nachweis gegenueber Pflegekassen und
Behoerden.

### 2.7 Abo-basiertes Modell

Nachbar.io bietet fuenf Abonnement-Stufen mit klarem Feature-Gating.
Der medizinische Notruf (112) ist in allen Stufen kostenfrei verfuegbar,
da dies eine Sicherheitspflicht darstellt. Details zu den einzelnen
Stufen finden Sie in Abschnitt 7 (Monetarisierung).

### 2.8 Interaktive Quartierskarte

Eine SVG-basierte Quartierskarte zeigt alle 76 erfassten Haeuser auf
drei Strassen. Jedes Haus wird als interaktives Element dargestellt
mit Statusanzeige (aktiv, inaktiv, Hilfe benoetigt). Die Karte
basiert auf einem Luftbild des Quartiers und wird als Overlay gerendert.

### 2.9 Community-Features

Neben den Pflege-Funktionen bietet Nachbar.io Community-Module fuer
das gesamte Quartier: Schwarzes Brett fuer Ankuendigungen, Marktplatz
fuer Tausch- und Hilfsangebote, Veranstaltungskalender sowie eine
KI-gestuetzte lokale Nachrichtenzusammenfassung.

---

## 3. Technische Architektur

### Fuer Entscheidungstraeger zusammengefasst

Nachbar.io ist als moderne Web-Anwendung konzipiert, die keine
Installation ueber einen App Store erfordert. Die Plattform laeuft
im Browser und kann auf dem Startbildschirm von Smartphones und
Tablets installiert werden (Progressive Web App).

### Kerntechnologien

| Bereich | Loesung | Vorteil |
|---|---|---|
| Anwendung | Next.js 16, TypeScript | Bewaehrtes, modernes Web-Framework |
| Benutzeroberflaeche | Tailwind CSS, shadcn/ui | Konsistentes, barrierefreies Design |
| Datenbank | Supabase PostgreSQL | EU-Rechenzentrum Frankfurt, DSGVO-konform |
| Authentifizierung | Supabase Auth | Sichere Anmeldung mit Sitzungsverwaltung |
| Echtzeitkommunikation | Supabase Realtime (WebSocket) | Sofortige Updates bei SOS-Alarmen |
| Benachrichtigungen | Web Push API | Keine Abhaengigkeit von Drittanbietern |
| Verschluesselung | AES-256-GCM | Militaerstandard fuer medizinische Daten |
| Hosting | Vercel (Frankfurt) + Supabase (Frankfurt) | Vollstaendiges EU-Hosting |

### Sicherheitsarchitektur

- **Verschluesselung sensibler Daten:** Alle medizinischen Daten,
  Telefonnummern von Notfallkontakten und Versicherungsnummern werden
  mit AES-256-GCM verschluesselt gespeichert. Der Schluessel wird als
  Umgebungsvariable verwaltet und ist nicht im Quellcode enthalten.

- **Lueckenloses Audit-Log:** Jede sicherheitsrelevante Aktion wird in
  einem revisionssicheren Protokoll festgehalten (append-only). Einmal
  geschriebene Eintraege koennen weder veraendert noch geloescht werden.
  Dies wird durch einen Datenbank-Trigger technisch erzwungen.

- **Automatisierte Prozesse:** Vier Cron-Jobs ueberwachen kontinuierlich:
  SOS-Eskalation (jede Minute), Check-in-Erinnerungen (alle 5 Minuten),
  Medikamenten-Erinnerungen (alle 5 Minuten) und Termin-Erinnerungen
  (alle 5 Minuten).

---

## 4. DSGVO-Konformitaet

### Privacy by Design

Nachbar.io wurde von Grund auf nach dem Prinzip "Privacy by Design"
entwickelt. Datenschutz ist kein nachtraegliches Feature, sondern
integraler Bestandteil der Architektur.

### Technische Massnahmen

| Massnahme | Umsetzung |
|---|---|
| **Row Level Security (RLS)** | Auf allen 11 Care-Tabellen aktiviert. Jede Datenbankabfrage wird automatisch auf die Rechte des angemeldeten Nutzers beschraenkt. |
| **Rollenbasierte Zugriffskontrolle** | Senioren sehen nur eigene Daten. Helfer sehen nur Daten der ihnen zugewiesenen Senioren. Administratoren haben eingeschraenkt erweiterten Zugriff. |
| **Verschluesselung medizinischer Daten** | AES-256-GCM-Verschluesselung fuer Telefonnummern der Notfallkontakte, Versicherungsnummern und medizinische Notizen. |
| **Keine Weitergabe an Dritte** | Keine Integration von Drittanbieter-Tracking, Analyse-Tools oder Werbenetzwerken. Push-Benachrichtigungen erfolgen ueber die native Web Push API ohne externe Dienste. |
| **EU-Rechenzentrum** | Sowohl die Anwendung (Vercel, Region Frankfurt) als auch die Datenbank (Supabase, Region Frankfurt) werden ausschliesslich in der EU gehostet. Alle Daten verbleiben in Deutschland. |
| **Revisionssicheres Audit-Log** | Append-only Protokoll aller sicherheitsrelevanten Aktionen. UPDATE- und DELETE-Operationen auf der Audit-Tabelle werden per Datenbank-Trigger blockiert. |
| **Helfer-Verifizierung** | Zugriff auf Senior-Daten erst nach administrativer Pruefung und Freigabe. Entzug der Berechtigung wirkt sofort ueber RLS-Policies. |

### Loeschkonzept

Beim Loeschen eines Nutzerkontos werden alle personenbezogenen Daten
kaskadierend geloescht (ON DELETE CASCADE auf allen Fremdschluesselbeziehungen).
Das Audit-Log wird dabei anonymisiert, nicht geloescht, um die Nachvollziehbarkeit
fuer aktive Pflegebeziehungen zu wahren.

---

## 5. Seniorengeraet-Unterstuetzung

### Optimiert fuer aeltere Nutzerinnen und Nutzer

Nachbar.io bietet einen dedizierten Seniorenmodus, der speziell fuer
die Beduerfnisse aelterer Menschen und Geraete mit eingeschraenkter
Darstellung (z. B. E-Ink-Displays) entwickelt wurde.

### Barrierefreiheits-Standards

| Kriterium | Umsetzung |
|---|---|
| **Touch-Ziele** | Mindestens 80 x 80 Pixel fuer alle interaktiven Elemente (uebertrifft WCAG-Empfehlung von 44 px) |
| **Kontrast** | Mindestens 4,5:1 Kontrastverhaeltnis (WCAG AA-Standard) |
| **Maximale Interaktionstiefe** | Jede Aktion ist in maximal 3 bis 4 Taps erreichbar |
| **Farbschema** | Amber (#F59E0B) fuer Warnungen, Rot (#EF4444) ausschliesslich fuer Notruf-Banner (112/110) |
| **Schriftgroesse** | Grosse, gut lesbare Schrift (Inter-Schriftfamilie) |
| **Layout** | Vereinfachte Senioren-Oberflaeche mit reduzierter Informationsdichte |

### Senioren-spezifische Oberflaechen

Die Plattform bietet dedizierte Seiten fuer die Senioren-Nutzung:

- **SOS-Seite:** Grosser Notruf-Button mit Kategorieauswahl und
  Echtzeit-Status-Tracking
- **Check-in-Seite:** Drei grosse Buttons fuer die Tagesbefindlichkeit
- **Medikamenten-Seite:** Uebersichtliche Liste mit grossen
  Bestaetigung-Buttons
- **Startseite:** Kompakte Statusuebersicht mit den wichtigsten Aktionen

---

## 6. Pilot-Anforderungen

### Mindestvoraussetzungen fuer den Pilotstart

| Anforderung | Minimum | Empfehlung |
|---|---|---|
| **Teilnehmende Seniorinnen/Senioren** | 10 Personen | 15 bis 20 Personen |
| **Registrierte Helferinnen/Helfer** | 20 Personen | 30+ Personen (mind. 2 pro Senior) |
| **Pflegedienst-Partner** | 1 Pflegedienst | 2 Pflegedienste |
| **Internet-Zugang** | Stabiles WLAN oder Mobilfunk bei allen Teilnehmenden | — |
| **Endgeraete** | Smartphone oder Tablet pro Teilnehmer (Android/iOS/PC) | — |
| **Kommunale Kontaktperson** | 1 Ansprechpartner bei der Kommune | — |
| **Pilot-Dauer** | 3 Monate | 6 Monate |

### Technische Voraussetzungen

- Moderner Webbrowser (Chrome, Safari, Firefox, Edge)
- Internet-Verbindung (WLAN oder Mobilfunknetz)
- Push-Benachrichtigungen muessen im Browser erlaubt sein
- Keine App-Installation erforderlich (PWA-basiert)

### Pilot-Zugang und Freigabestatus

- **Registrierung:** Zugang fuer Pilotteilnehmende ueber Einladungscode oder
  freigegebene Pilot-Haushalte.
- **Login im Pilot:** OTP / Magic Link per E-Mail ist der freigegebene
  Standardweg.
- **Passwort-Login:** Im Pilot bewusst ausgeblendet, bis ein vollstaendiger
  Recovery-Flow vorhanden ist.
- **Freigabenachweise:** Siehe
  `docs/plans/2026-03-18-p1-golive-audit.md`,
  `docs/plans/2026-03-18-pilot-test-checklist.md` und
  `docs/plans/2026-04-14-codex-brief-pilot-readiness.md`.

### Organisatorische Vorbereitung

1. **Einverstaendniserklaerungen:** Datenschutz-Einwilligung aller
   Teilnehmenden (Vorlage wird bereitgestellt)
2. **Schulung:** Einfuehrungsveranstaltung fuer Senioren und Helfende
   (ca. 2 Stunden, mit praktischen Uebungen)
3. **Begleitperson:** Mindestens eine Person, die waehrend der
   Pilotphase als Ansprechpartner zur Verfuegung steht
4. **Feedback-Schleifen:** Zweiwoechtentliche Rueckmelderunden mit
   Teilnehmenden zur kontinuierlichen Verbesserung
5. **Evaluationskriterien:** Gemeinsame Definition der Erfolgskriterien
   vor Pilotstart

---

## 7. Monetarisierung

### 5-Stufen-Abonnement-Modell

Nachbar.io verfolgt ein transparentes Abo-Modell. Der medizinische
Notruf (112-Weiterleitung) ist in allen Stufen kostenfrei, da
Sicherheit nicht hinter einer Bezahlschranke stehen darf.

#### Kostenlos (0 EUR/Monat)

- Taegliche Check-ins mit Erinnerungen und automatischer Eskalation
- Medizinischer Notfall-SOS (sofortige 112-Weiterleitung)

#### Basis (ab 4,99 EUR/Monat)

Alle Funktionen der kostenlosen Stufe, zusaetzlich:
- Alle SOS-Kategorien (Allgemeine Hilfe, Besuch, Einkauf, Medikamentenhilfe)
- Medikamenten-Verwaltung mit automatischen Erinnerungen
- Termin-Management mit konfigurierbaren Erinnerungen

#### Familie (ab 9,99 EUR/Monat) — *Empfohlen*

Alle Funktionen der Basis-Stufe, zusaetzlich:
- Angehoerigen-Dashboard mit Statusuebersicht
- Pflegeberichte (Tages-, Wochen-, Monatsberichte) mit PDF-Export
- Vollstaendiges Aktivitaetsprotokoll (Audit-Log)

#### Professionell (ab 19,99 EUR/Monat)

Alle Funktionen der Familien-Stufe, zusaetzlich:
- Verwaltung mehrerer Seniorinnen/Senioren (Multi-Senior)
- Pflege-Dashboard mit Uebersicht aller Betreuten
- Pflegehilfsmittel-Antraege

#### Premium (ab 29,99 EUR/Monat)

Alle Funktionen der Professionell-Stufe, zusaetzlich:
- SIM-Fallback fuer Offline-Szenarien
- SMS-Benachrichtigungen
- Sprach-Benachrichtigungen (automatisierte Anrufe)
- Prioritaets-Support

### B2B-Option fuer Pflegedienste

Fuer Pflegedienste, die Nachbar.io in ihren Arbeitsalltag integrieren
moechten, wird ein individuelles B2B-Modell angeboten. Dieses umfasst
die professionelle Stufe fuer alle betreuten Seniorinnen und Senioren,
ein zentrales Pflege-Dashboard, Berichts-Export fuer Pflegekassen sowie
individuelle Konditionen je nach Anzahl der betreuten Personen.

---

## 8. Skalierbarkeit

### Multi-Quartier-Faehigkeit

Nachbar.io ist von Beginn an fuer die Erweiterung auf mehrere Quartiere
konzipiert. Das Datenmodell unterstuetzt die Zuordnung von Nutzern zu
verschiedenen Quartieren. Die interaktive Quartierskarte kann fuer neue
Standorte individuell erstellt werden.

### Mandantenmodell

Fuer die Skalierung auf Stadtebene ist ein Mandantenmodell geplant,
das verschiedenen Kommunen oder Traegern eine eigene Instanz mit
individuellem Branding und separater Datenhaltung ermoeglicht.

### Technische Skalierung

| Komponente | Skalierungsstrategie |
|---|---|
| **Frontend** | Vercel Edge Network mit globalem CDN und automatischer Skalierung |
| **Datenbank** | Supabase horizontale Skalierung (Read Replicas, Connection Pooling) |
| **Benachrichtigungen** | Multi-Channel-Architektur mit austauschbaren Kanaelen (Push, SMS, Voice) |
| **Cron-Jobs** | Vercel Cron mit konfigurierbaren Intervallen |

### Geplante Erweiterungen

- Phasenmodell: Pilot (1 Quartier) -> Multi-Quartier -> Stadtebene -> Plattform
- API-Schnittstellen fuer Drittanbieter-Integration
- White-Label-Faehigkeit fuer kommunale Partner

---

## 9. Naechste Schritte

### Zeitplan

| Zeitraum | Meilenstein |
|---|---|
| **Q2 2026** | Pilotstart in Bad Saeckingen (Purkersdorfer Strasse, Sanarystrasse, Oberer Rebberg) |
| **Q2 bis Q3 2026** | 3-monatige Pilotphase mit laufender Evaluation |
| **Q3 2026** | Auswertung der Pilotergebnisse, Anpassungen basierend auf Nutzerfeedback |
| **Q4 2026** | Expansion auf weitere Quartiere in Bad Saeckingen |
| **Q4 2026** | Partnergewinnung: Pflegedienste und Kommunen in der Region |
| **2027** | Ausweitung auf weitere Staedte in Baden-Wuerttemberg |

### Konkrete naechste Schritte

1. **Pilotstart vorbereiten:** Teilnehmer gewinnen, Schulungen planen,
   Einverstaendniserklaerungen einholen
2. **Kommunale Partnerschaft:** Vereinbarung mit der Stadt Bad Saeckingen
   ueber Begleitung und Unterstuetzung der Pilotphase
3. **Pflegedienst-Partner:** Mindestens einen lokalen Pflegedienst als
   Partner gewinnen (Stufe 3 der Eskalationskette)
4. **Evaluation definieren:** Erfolgskriterien und Metriken fuer die
   Pilotphase gemeinsam festlegen
5. **Feedback-Prozess einrichten:** Regelmaessige Rueckmelderunden mit
   allen Beteiligten waehrend der Pilotphase

### Kontakt

Fuer Fragen, Partnerschaften oder eine Demonstration der Plattform
wenden Sie sich bitte an:

**[Kontaktdaten werden vor Veroeffentlichung ergaenzt]**

---

*Dieses Dokument wird laufend aktualisiert. Letzter Stand: April 2026.*
