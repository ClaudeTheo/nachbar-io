# QuartierApp Care: Digital unterstuetztes Angebot zur Unterstuetzung im Alltag fuer Senioren zuhause

Stand: 2026-05-03
Status: Arbeitsentwurf fuer Partnergespraeche, keine Rechtsberatung, keine
Erstattungszusage.

## Kurzpositionierung

QuartierApp Care ist keine isolierte "Pflegekassen-App". Der realistische
Startpunkt ist ein digital unterstuetztes Service- und Partnerangebot fuer
Senioren zuhause: Angehoerige, lokale Helfer, Nachbarschaftshilfe, Kommune und
ggf. Pflegedienst arbeiten ueber eine gemeinsame CareCircle-Struktur zusammen.

Die App dient dabei als Koordinations-, Erinnerungs-, Check-in- und
Dokumentationsschicht. Die foerder- oder abrechenbare Leistung ist nicht
automatisch die Software allein, sondern ein anerkanntes oder partnergetragenes
Unterstuetzungsangebot im Alltag, ein kommunaler Quartierspilot oder im
Einzelfall ein Hardware-/Einrichtungs-Bundle.

## Problem

Viele aeltere Menschen leben zuhause relativ selbststaendig, brauchen aber
regelmaessige kleine Hilfen: Erinnerung, Rueckmeldung, Besuch, Begleitung,
einfache Alltagskoordination und schnelle Einbindung von Angehoerigen. Familien
organisieren diese Hilfe haeufig informell per Telefon, Chat und Zuruf. Dadurch
entstehen Luecken, Doppelarbeit und Unsicherheit.

Gleichzeitig gibt es in Quartieren oft Hilfsbereitschaft, Ehrenamt,
Nachbarschaftshilfe und kommunale Seniorenarbeit. Was fehlt, ist haeufig eine
einfache, datensparsame und seniorentaugliche Struktur, die diese Beteiligten im
Alltag verbindet.

## Angebot

Arbeitstitel:
"Digital begleitete Nachbarschaftshilfe und Angehoerigenentlastung im Quartier"

Bausteine:

- CareCircle fuer Senior, Angehoerige und zugelassene Helfer
- regelmaessige Check-ins und Statusmeldungen
- einfache Hilfeanforderungen und Rueckmeldungen
- Erinnerungen fuer Alltagstermine
- Koordination von Besuchs- und Hilfeleistungen
- Dokumentation fuer Partner-/Traegerprozesse
- optional Echo Show oder Tablet als niedrigschwelliger Zugang zuhause
- ruhige seniorengerechte Oberflaeche mit wenigen Schritten

## Zielpilot Bad Saeckingen

Pilotname:
"Digital unterstuetztes Senioren- und Nachbarschaftsquartier Bad Saeckingen"

Vorschlag fuer den ersten Pilot:

- 20 bis 40 Seniorenhaushalte
- Start im Quartier Bad Saeckingen, z. B. Purkersdorfer Strasse,
  Sanarystrasse, Oberer Rebberg
- Einbindung von Angehoerigen pro Haushalt
- lokale Helfer oder bestehende Nachbarschaftshilfe
- optional Echo Show oder Tablet fuer Haushalte ohne Smartphone-Routine
- 3 bis 6 Monate erste Auswertung
- Workshops oder Beteiligungsformate mit Senioren, Angehoerigen und lokalen
  Partnern

Erfolgskriterien:

- Senioren werden regelmaessiger erreicht.
- Angehoerige sehen frueher, ob alles in Ordnung ist.
- Hilfeanfragen gehen an die passende Person statt in unklare Chatverlaeufe.
- Lokale Partner koennen Hilfen besser dokumentieren.
- Datenschutz und Zweckbindung bleiben nachvollziehbar.

## Foerder- und Finanzierungswege

### 1. `45b`/UStA: bester operativer Startweg

Pflegebeduerftige in haeuslicher Pflege haben nach BMG-Informationen Anspruch
auf einen Entlastungsbetrag von bis zu 131 EUR monatlich, zweckgebunden fuer
qualitaetsgesicherte Entlastungsleistungen und Angebote zur Unterstuetzung im
Alltag. Fuer nach Landesrecht anerkannte Angebote ist die Anerkennung zentral.

Strategie fuer nachbar.io:

- zuerst mit einem bereits anerkannten UStA-Partner arbeiten
- nachbar.io als digitale Infrastruktur fuer Koordination und Dokumentation
  positionieren
- Softwarekosten nicht als automatisch erstattete App behaupten
- spaeter pruefen, ob ein eigenes oder gemeinsames Angebot anerkennungsfaehig
  ist

Moegliche Partner:

- anerkannte Nachbarschaftshilfe
- DRK, Caritas, Diakonie oder anderer Wohlfahrtstraeger
- Seniorenbuero oder Quartiersprojekt
- ambulanter Pflegedienst
- Kommune oder Landkreis mit zivilgesellschaftlichem Partner

Offene Partnerfragen:

- Ist das Angebot des Partners bereits nach UStA anerkannt?
- Welche konkreten Leistungen sind anerkannt?
- Darf digitale Koordination Teil der Leistungserbringung oder Dokumentation
  sein?
- Wer stellt Rechnung, Nachweis und Qualitaetssicherung?
- Welche Schulung brauchen Helferinnen und Helfer?

#### Arbeitsmodell UStA-Partnerweg

Ziel ist ein Partner-first-Modell. Nachbar.io soll im ersten Schritt nicht
selbst als anerkannter Anbieter auftreten, sondern die digitale Infrastruktur
fuer einen vorhandenen anerkannten Traeger oder ein anerkennungsfaehiges
Projekt liefern.

Moegliche Angebotsformulierung:

"Digital begleitete Alltagsunterstuetzung im Quartier: koordinierte
Nachbarschaftshilfe, Angehoerigenentlastung, Check-ins und dokumentierte
Unterstuetzungsleistungen fuer Senioren zuhause."

Rollen:

- UStA-Partner: Anerkennung, Fachaufsicht, Schulung, Qualitaetssicherung,
  Leistungs-/Abrechnungslogik
- nachbar.io: Technik, CareCircle, Aufgaben-/Besuchskoordination,
  Dokumentationsoberflaeche, Export-/Nachweisunterstuetzung
- Senior/Angehoerige: Einwilligung, CareCircle, Rueckmeldung, ggf.
  Leistungsbestaetigung
- Helfer: dokumentierte Hilfeleistung nach Partnerregeln

Bestehende nachbar.io-Bausteine, die fuer diesen Weg wiederverwendbar sind:

- `modules/hilfe/components/SessionDocForm.tsx`: Zeiterfassung,
  Taetigkeitskategorie, Dauer-/Betragsberechnung, Signaturfelder
- `modules/hilfe/services/pdf-receipt.ts`: Einzelquittung mit Leistungsnachweis
  und Rahmenbedingungen
- `modules/hilfe/services/pdf-monthly-report.ts`: monatliche Sammelabrechnung
  fuer Einsaetze
- `modules/hilfe/services/hilfe-core.service.ts`: Budget- und
  Bundesland-Regel-Pruefung fuer Nachbarschaftshilfe
- `modules/hilfe/components/HelperRegistrationForm.tsx`: Helferregistrierung,
  Rahmenbedingungen, Schulungsnachweis je Bundesland
- CareCircle-Logik aus dem Care-Modul: Verbindung von Senior, Angehoerigen und
  autorisierten Unterstuetzern

Wichtig fuer die Produktgrenze: Diese Bausteine ersetzen keine UStA-Anerkennung
und keine rechtliche Abrechnungserlaubnis. Sie koennen aber die Arbeit eines
anerkannten Partners dokumentierbarer und einfacher machen.

Partnergespraech: Kernfragen fuer den ersten Termin:

1. Welche UStA-Leistungen sind beim Partner bereits anerkannt?
2. Welche Taetigkeiten duerfen ehrenamtliche oder nachbarschaftliche Helfer
   erbringen?
3. Welche Dokumentation verlangt der Partner heute?
4. Kann die digitale Einsatzdokumentation als Vorstufe oder Anlage genutzt
   werden?
5. Wer darf gegenueber Pflegekasse oder Senior abrechnen?
6. Welche Qualitaetssicherungs- und Schulungsnachweise muessen im System
   sichtbar sein?
7. Welche Daten duerfen Angehoerige sehen, und was bleibt beim Traeger?
8. Soll nachbar.io eine reine Technikpauschale, eine Partnerlizenz oder ein
   projektbezogenes Setup abrechnen?

Erste pruefbare Pilotvariante:

- ein anerkannter Partner
- 10 bis 15 Seniorenhaushalte
- 5 bis 10 Helfer oder Ehrenamtliche
- Einsatzdokumentation ueber vorhandene Hilfe-Logik
- CareCircle fuer Angehoerigenkommunikation
- monatliche Auswertung ohne sensible Freitexte in Aggregaten
- manuelle Abrechnung bleibt beim Partner, bis rechtlich/fachlich geklaert ist,
  ob und wie digitale Nachweise uebernommen werden

### 2. Quartiersimpulse BW: bester Pilotweg

Quartiersimpulse richtet sich an Staedte, Gemeinden, kommunale Verbuende und
Landkreise in Baden-Wuerttemberg. Foerdervoraussetzungen sind u. a. ein Bezug
zu Pflege und Unterstuetzung im Alter oder alters-/generationengerechter
Quartiersentwicklung, Buergerbeteiligung, zivilgesellschaftliche Kooperation und
kommunale Unterstuetzung.

Strategie fuer nachbar.io:

- Antragsteller: Kommune, kommunaler Verbund oder Landkreis mit Kommune
- nachbar.io: Technologiepartner
- zivilgesellschaftlicher Partner: Nachbarschaftshilfe, Verein,
  Wohlfahrtstraeger oder Seniorenarbeit
- Inhalt: Pilot mit 20 bis 40 Haushalten, Beteiligungsformaten,
  CareCircle-Struktur und datensparsamer Evaluation

Dieser Weg passt zur QuartierApp-Erzaehlung besonders gut, weil nicht die App
im Mittelpunkt steht, sondern ein lokales Versorgungs- und Beteiligungsmodell.

#### Arbeitsmodell Quartiersimpulse-Pilot

Projekttitel fuer eine kommunale Skizze:
"Digital unterstuetztes Senioren- und Nachbarschaftsquartier Bad Saeckingen"

Projektziel:

Senioren zuhause sollen laenger sozial angebunden, besser erreichbar und
alltagspraktisch unterstuetzt bleiben. Angehoerige, lokale Helfer und kommunale
Partner erhalten eine einfache Struktur fuer Check-ins, Hilfeanfragen,
Besuche, Rueckmeldungen und datensparsame Auswertung.

Antragsteller-/Rollenlogik:

- bevorzugter Antragsteller: Stadt/Gemeinde Bad Saeckingen
- alternativ: Landkreis oder kommunaler Verbund mit lokaler Kommune
- notwendiger Partner: zivilgesellschaftlicher Traeger, Verein,
  Nachbarschaftshilfe oder Wohlfahrtstraeger
- nachbar.io: Technologiepartner, nicht alleiniger Foerdermittelempfaenger
- Senioren/Angehoerige: Beteiligte und Rueckmeldegruppe

Pilotumfang:

- 20 bis 40 Seniorenhaushalte
- 3 bis 6 Monate erste Wirkungs- und Nutzungsbeobachtung
- ein bis zwei Quartiersworkshops vor Start
- einfache Schulungsformate fuer Senioren, Angehoerige und Helfer
- optional Geraetezugang fuer Haushalte ohne Smartphone-Routine
- Datenschutz- und Einwilligungsprozess vor Aktivierung

Moeglicher Ablauf:

1. Vorgespräch Kommune, Sozialpartner, nachbar.io
2. Auswahl Pilotquartier und Zielgruppe
3. Beteiligungsworkshop mit Senioren, Angehoerigen, Helfern
4. Datenschutz-/Einwilligungs- und Rollenmodell finalisieren
5. Onboarding von 20 bis 40 Haushalten
6. 6 bis 8 Wochen begleitete Nutzung
7. Zwischenauswertung und Anpassung
8. Abschlussbericht mit Lernpunkten, nicht mit medizinischen Wirkversprechen

Datensparsame Evaluationsmetriken:

- Anzahl aktivierter Seniorenhaushalte
- Anzahl aktiver CareCircles
- Check-in-Nutzung pro Woche
- beantwortete und unbeantwortete Hilfeanfragen
- dokumentierte Besuche oder Unterstuetzungen
- durchschnittliche Rueckmeldezeit im CareCircle
- subjektive Entlastung Angehoeriger per kurzer Befragung
- subjektives Sicherheits- und Kontaktgefuehl der Senioren
- Anzahl Datenschutz-/Supportvorfaelle

Kommunale Nutzenargumente:

- vorhandene Nachbarschaftshilfe wird sichtbarer und koordinierbarer
- Angehoerige werden entlastet, ohne dass eine 24/7-Leitstelle behauptet wird
- Quartiersarbeit erhaelt konkrete Beteiligungs- und Nutzungsdaten
- Senioren ohne digitale Routine koennen ueber einfache Geraete einbezogen
  werden
- das Projekt bleibt lokal, sozial und datensparsam statt rein kommerziell

Nicht in den Antrag schreiben:

- keine Aussage, dass die App selbst durch Pflegekassen erstattet wird
- keine Hausnotruf- oder Notfallleitstellen-Positionierung
- keine medizinische Nutzenbehauptung
- keine DiPA-Behauptung

### 3. `40 Abs. 4 SGB XI`: nur Hardware-/Einrichtungs-Bundle im Einzelfall

Der Weg ueber wohnumfeldverbessernde Massnahmen ist nicht fuer eine reine App
zu verwenden. Plausibel kann spaeter ein Paket sein, das die haeusliche
Alltagsorganisation konkret erleichtert:

- Echo Show oder Tablet
- fester Standort oder Halterung
- Einrichtung und WLAN-Anbindung
- CareCircle-Konfiguration
- Schulung
- Uebergabeprotokoll

Wichtig: Das ist ein Einzelfallantrag. Die Pflegekasse entscheidet. Das
M4-Pflegekassen-PDF bleibt blockiert, bis M4.0 Pflegestuetzpunkt-Feedback und
M4.1 Bundle-Definition erledigt sind.

### 4. DiPA: spaeter, nicht als MVP-Weg

DiPA passt konzeptionell, weil digitale Pflegeanwendungen nach BfArM die
Selbststaendigkeit und Faehigkeiten von Pflegebeduerftigen unterstuetzen oder
die Kommunikation mit Angehoerigen und Pflegefachkraeften verbessern koennen.
Der Weg ist aber pruefungs-, nachweis-, datenschutz- und nutzenintensiv.

Strategie fuer nachbar.io:

- keine aktuelle DiPA-Behauptung
- keine Bewerbung als erstattungsfaehige DiPA
- erst Pilotdaten, DSFA/FMEA, Intended-Use-Grenze und Datenschutzreife sammeln
- spaeter BfArM-Beratung und Verzeichnisfaehigkeit pruefen

Ausgearbeitet ist dieser spaetere Pfad im separaten Plan:
`docs/plans/2026-05-04-care-dipa-evidence-plan.md`. Er definiert
Evidenzfragen, Pilotmetriken, Datenschutzgrenzen und Voraussetzungen fuer einen
moeglichen spaeteren BfArM-/DiPA-Schritt. Keine konkreten monatlichen
Leistungsbetraege in Partner- oder Marketingunterlagen nennen, bis die aktuelle
Rechtslage fuer den Zielzeitpunkt separat geprueft wurde.

### 5. Innovations- und Startup-Foerderung

Startup- und Innovationsprogramme sind eher Entwicklungskapital oder
Partnerprojekt-Finanzierung. Sie ersetzen keine nutzerbezogene Erstattung, koennen
aber Pilot, Compliance, Datenschutz, Voice/Tablet-Zugang, Evaluation und
Partnerintegration finanzieren.

## Rollenmodell im Pilot

Kommune oder Landkreis:

- politischer und raeumlicher Rahmen
- Zugang zu Quartier, Seniorenarbeit und Beteiligungsformaten
- moeglicher Antragsteller fuer Quartiersimpulse

Anerkannter UStA- oder Sozialpartner:

- Leistungserbringung oder Traegerrolle
- Anerkennung, Qualitaetssicherung, Schulung, Abrechnung
- fachliche Rueckbindung an Pflege-/Alltagsunterstuetzung

nachbar.io:

- digitale Infrastruktur
- CareCircle, Check-ins, Hilfeanforderung, Dokumentation
- seniorengerechte App-/Tablet-/Echo-Nutzung
- technische und datenschutzbezogene Begleitung

Angehoerige:

- Einladung in den CareCircle
- Rueckmeldung und Eskalationskontakt
- Entlastung durch klarere Alltagskoordination

Lokale Helfer:

- dokumentierte Hilfeleistung
- klare Aufgaben und Rueckmeldungen
- Einbindung nach Regeln des Partners

## Datenschutz- und Produktgrenzen

- Keine Adressdaten im Client-State; nur `household_id`.
- Sensitive Care-Felder bleiben verschluesselt.
- Notfallkommunikation ist kein Hausnotruf.
- Keine medizinische Leistungszusage.
- Keine automatische Pflegekassen-Erstattung behaupten.
- Keine Echtpersonen- oder Echtdaten-KI fuer Konzept- oder Pilotvorbereitung.

## Wording-Freeze

### Nicht verwenden

- "Die App wird erstattet."
- "Die Pflegekasse zahlt nachbar.io."
- "Garantierte Foerderung."
- "`40 SGB XI`-foerderfaehig" ohne Einzelfall- und Entscheidungs-Hinweis.
- "DiPA-zugelassen" vor BfArM-Listung.
- "Hausnotruf" fuer die CareCircle-/Check-in-Funktion.

### Verwendbar

- "Kann Teil eines anerkannten Unterstuetzungsangebots im Alltag sein."
- "Kann ueber anerkannte Partner und je nach Landesrecht abrechenbar werden."
- "Hardware/Einrichtung kann im Einzelfall beantragt werden; die Pflegekasse
  entscheidet."
- "Nachbar.io ist Technologiepartner fuer Quartiers- und Care-Koordination."
- "Allgemeine Information, keine Rechtsberatung und keine Erstattungszusage."

## Quellenstand fuer weitere Pruefung

Vor externer Nutzung erneut gegenpruefen. Stand dieser Links: 2026-05-03.

- `45a SGB XI`: https://www.gesetze-im-internet.de/sgb_11/__45a.html
- `45b SGB XI`: https://www.gesetze-im-internet.de/sgb_11/__45b.html
- BMG Entlastungsbetrag / Unterstuetzungsangebote:
  https://www.bundesgesundheitsministerium.de/pflege-zu-hause/weitere-leistungen-und-angebote-zur-unterstuetzung-im-alltag
- Baden-Wuerttemberg UStA-Fachstelle:
  https://www.usta-bw.de/anerkennung/wichtigste-informationen/
- UStA-Zustaendigkeit Stadt-/Landkreise:
  https://www.usta-bw.de/anerkennung/zustaendige-stelle/
- Quartiersimpulse BW:
  https://allianz-fuer-beteiligung.de/foerderprogramme/foerderprogramm-quartiersimpulse/
- `40 SGB XI`: https://www.gesetze-im-internet.de/sgb_11/__40.html
- BMG Zuschuesse zur Wohnungsanpassung:
  https://www.bundesgesundheitsministerium.de/pflege-zu-hause/zuschuesse-zur-wohnungsanpassung
- BfArM DiPA:
  https://www.bfarm.de/DE/Medizinprodukte/Aufgaben/DiGA-und-DiPA/DiPA/_node.html
- BfArM DiPA Wissenswertes:
  https://www.bfarm.de/DE/Medizinprodukte/Aufgaben/DiGA-und-DiPA/DiPA/Wissenswertes/_node.html

## Naechste Entscheidungen

1. Thomas priorisiert 5 bis 10 lokale Gespraechspartner in Bad Saeckingen.
2. Thomas klaert M4.0 beim Pflegestuetzpunkt: Ist ein Hardware-/Einrichtungs-
   Bundle grundsaetzlich anschlussfaehig?
3. Thomas/Codex definieren M4.1 Bundle-Varianten, aber ohne PDF-Generator.
4. Danach kann Codex einen konkreten Partner-Onepager und eine
   Quartiersimpulse-Skizze aus diesem Entwurf ableiten.
5. Separat spaeter: Wording-Audit fuer bestehende Hilfe-Seiten und Dokus.

Erstelltes Gespraechsdokument:

- `docs/plans/2026-05-04-care-quartier-partner-onepager.md`

## Arbeitsstand Task 3+4

Ergaenzt am 2026-05-03 abend:

- UStA-Partnerweg mit wiederverwendbaren `modules/hilfe`-Bausteinen
- Partnergespraechsfragen fuer einen anerkannten Traeger
- erste pruefbare Pilotvariante fuer 10 bis 15 Haushalte mit Partner
- Quartiersimpulse-Pilotmodell mit kommunaler Rollenlogik
- datensparsame Evaluationsmetriken und klare Nicht-Behauptungen

Noch offen:

- konkrete Partnerliste Bad Saeckingen priorisieren
- Partner-Onepager als separates Gespraechsdokument ableiten
- Quartiersimpulse-Antragsskizze erst nach kommunalem Interesse vertiefen
- M4.0/M4.1 bleiben Founder-Hand; kein Pflegekassen-PDF

Ergaenzt am 2026-05-03 spaetabend:

- DiPA als separater spaeterer Evidenzpfad dokumentiert
- keine DiPA-Vertriebsbehauptung, keine Erstattungszusage und keine konkreten
  Betragsclaims
- bestehende Intended-Use-/DSFA-/FMEA-/Traceability-Dokumente als Vorarbeit
  verlinkt, nicht als fertigen DiPA-Nachweis behandelt

Ergaenzt am 2026-05-03 spaetabend:

- Partner-Onepager fuer Kommune/UStA-Traeger/Nachbarschaftshilfe erstellt
- Fokus: Gespraechsanker, Rollenmodell, Pilotumfang, sichere Formulierungen
- keine Antrags-, Erstattungs-, DiPA- oder Hausnotrufbehauptung
