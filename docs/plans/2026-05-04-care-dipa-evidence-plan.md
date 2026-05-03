# CareCircle DiPA Evidence Plan

Stand: 2026-05-03
Status: Strategie-/Compliance-Plan fuer spaetere Pruefung, keine
DiPA-Behauptung, keine Erstattungszusage.

## Kurzurteil

CareCircle kann konzeptionell in Richtung DiPA passen, weil digitale
Pflegeanwendungen nach `40a SGB XI` von Pflegebeduerftigen oder in Interaktion
mit Angehoerigen, ehrenamtlich Pflegenden oder ambulanten Pflegeeinrichtungen
genutzt werden koennen, um Selbststaendigkeit/Faehigkeiten zu stabilisieren oder
einer Verschlimmerung entgegenzuwirken.

Das ist aber kein kurzfristiger Markteintritt. DiPA ist ein spaeterer
Evidenz-, Datenschutz-, Sicherheits- und BfArM-Pruefpfad. Bis zu einem
erfolgreichen Verfahren darf nachbar.io weder als DiPA noch als erstattete App
positioniert werden.

## Produktgrenze fuer die DiPA-Pruefung

DiPA-Hypothese, die spaeter geprueft werden kann:

"CareCircle unterstuetzt pflegebeduerftige Menschen in der Haeuslichkeit und
ihre pflegenden Angehoerigen dabei, Alltagsstruktur, soziale Kontakte,
Rueckmeldungen und einfache Unterstuetzung besser zu organisieren."

Nicht behaupten:

- medizinische Diagnose
- Therapie
- Vitaldatenmonitoring
- Hausnotruf oder 24/7-Leitstelle
- automatische Pflegekassen-Erstattung
- aktuelle DiPA-Listung

Moegliche Nutzenlogik:

- stabilere haeusliche Versorgungssituation
- bessere Kommunikation zwischen Senior und Angehoerigen
- weniger unklare "Ist alles in Ordnung?"-Situationen
- frueheres Erkennen nicht-medizinischer Alltagsluecken
- Entlastung pflegender Angehoeriger durch klare Aufgaben und Rueckmeldungen
- Unterstuetzung bei sozialem Kontakt und Tagesstruktur

## Bestehende Nachweise im Repo

Diese Dokumente sind keine DiPA-Nachweise, aber gute Vorarbeit:

- `docs/15_INTENDED_USE_STATEMENT.md`: Zweckbestimmung und Produktgrenzen
- `docs/17_MDCG_2019_11_FRAGEBOGEN.md`: Abgrenzung zu medizinischer Diagnose
- `docs/18_DSFA_CARE_MODUL.md`: Datenschutz-Folgenabschaetzung Care-Modul
- `docs/16_FMEA_CARE_MODUL.md`: FMEA fuer SOS, Check-in, Medikamente, System
- `docs/19_RISK_REGISTER.md`: regulatorische und Datenschutzrisiken
- `docs/20_TRACEABILITY_MATRIX.md`: Anforderungen, Code, Tests, FMEA-Bezug
- `docs/22_VALIDATION_MASTER_PLAN.md`: Validierungsrahmen
- `docs/21_CARECIRCLE_DOMAIN_MODEL.md`: CareCircle-Rollen und
  `caregiver_links` als Master

Wichtig: Fuer DiPA muessten diese Dokumente spaeter auf den exakten
DiPA-Intended-Use zugeschnitten, aktualisiert und extern geprueft werden.

## Evidenzfragen

Die Pilotdaten sollen nicht beweisen, dass nachbar.io medizinisch behandelt.
Sie sollen zeigen, ob CareCircle den pflegerischen Alltag und die haeusliche
Versorgungssituation besser organisierbar macht.

Leitfragen:

1. Nutzen Senioren den Check-in regelmaessig und freiwillig?
2. Reagieren Angehoerige schneller oder strukturierter auf Rueckmeldungen?
3. Werden Hilfeanfragen klarer verteilt und abgeschlossen?
4. Fuehlen sich Angehoerige messbar entlastet?
5. Fuehlen sich Senioren besser angebunden, ohne ueberwacht zu werden?
6. Bleiben sensible Freitexte, Medikamente und Check-in-Notizen geschuetzt?
7. Bleiben Notfall- und Hausnotrufgrenzen fuer Nutzer verstaendlich?

## Metriken fuer einen spaeteren Pilot

### Nutzung und Verlaesslichkeit

- aktivierte Seniorenhaushalte
- aktive CareCircles pro Senior
- Check-in completion rate pro Woche
- Anteil verpasster Check-ins
- Anteil verpasster Check-ins mit rueckgekoppelter Angehoerigenreaktion
- mittlere Rueckmeldezeit im CareCircle
- Anzahl Hilfeanfragen
- Anteil abgeschlossener Hilfeanfragen
- dokumentierte Besuche oder Unterstuetzungsleistungen

### Angehoerigenentlastung

- kurze Baseline-Befragung vor Start
- kurze Befragung nach 6 bis 8 Wochen
- subjektive Belastungsskala, z. B. 1 bis 5
- subjektive Sicherheitsskala, z. B. 1 bis 5
- Freitext nur optional, minimiert und nicht fuer KI-Auswertung

### Seniorensicht

- Verstaendlichkeit der App
- Gefuehl sozialer Anbindung
- Gefuehl von Selbstbestimmung statt Kontrolle
- Anzahl Supportfaelle pro Haushalt
- Abbruchgruende

### Datenschutz und Sicherheit

- Datenschutz-/Supportvorfaelle
- Einwilligungsabbrueche
- Zahl der Rollen-/Zugriffskonflikte
- Zugriff nur ueber aktive `caregiver_links`
- keine Adressdaten im Client-State
- keine externen KI-Aufrufe mit Echtdaten
- Nachweis, dass sensible Felder verschluesselt bleiben

## Datensparsame Erhebung

Prinzipien:

- so viel wie noetig, so wenig wie moeglich
- Aggregation statt Einzelfallauswertung
- keine Gesundheitsdiagnosen ableiten
- keine KI-Auswertung von Check-in- oder Medikamenten-Freitexten
- Pilotberichte nur mit anonymisierten oder pseudonymisierten Kennzahlen
- Loeschfristen aus DSFA beachten
- Survey-Freitexte getrennt pruefen und nur mit Einwilligung auswerten

Nicht erheben:

- Vitalwerte
- Diagnosen
- freie medizinische Verlaufsinterpretationen
- Standortverlauf
- Audio-/Videoaufzeichnungen
- personenbezogene KI-Trainingsdaten

## Voraussetzungen vor BfArM-/DiPA-Schritt

### Produkt und Zweckbestimmung

- DiPA-spezifischen Intended Use schreiben
- klar entscheiden, ob CareCircle als Nicht-Medizinprodukt oder Medizinprodukt
  betrachtet wird; externe regulatorische Pruefung einholen
- Hausnotruf-, Notfall- und Medizinproduktgrenzen erneut haerten
- keine Diagnostik-/Therapie- oder Prognosefunktion einbauen

### Datenschutz und Sicherheit

- DSFA fuer DiPA-Zweck aktualisieren
- AVV-/Providerlage final klaeren
- Verschluesselungs- und RLS-Konzept auditieren
- TOMs fuer BfArM-Unterlagen strukturieren
- Datenexport, Loeschung und Widerruf pruefbar machen

### Qualitaet und Interoperabilitaet

- BfArM-/DiPAV-Anforderungen gegen Repo-Dokumente mappen
- Funktionstauglichkeit mit Tests und Pilotprotokollen belegen
- Barrierefreiheit/Senior Mode dokumentieren
- Support- und Incident-Prozess beschreiben
- Interoperabilitaetsanforderungen separat pruefen

### Evidenzdesign

- Pilotprotokoll mit Ziel, Population, Dauer, Endpunkten schreiben
- Vorher-/Nachher-Fragebogen fuer Angehoerige und Senioren entwerfen
- Datenschutzrechtliche Einwilligung fuer Evaluation erstellen
- Auswertungsplan ohne sensible Freitext-KI definieren
- externe Beratung zu pflegerischem Nutzen einholen

## Fruehester sinnvoller Ablauf

Phase A: Produktgrenze festziehen

- Intended Use aktualisieren
- Wording-Audit durchfuehren
- CareCircle-Rollenmodell technisch und dokumentarisch konsolidieren
- M4-Bundle getrennt halten

Phase B: Quartierspilot

- 20 bis 40 Seniorenhaushalte
- 3 bis 6 Monate Laufzeit
- datensparsame Metriken
- Befragung Angehoerige/Senioren
- Abschlussbericht ohne medizinische Wirkversprechen

Phase C: DiPA-Vorpruefung

- BfArM-Beratung anfragen
- DiPAV-Anforderungskatalog mappen
- Datenschutz-/Sicherheitsluecken inventarisieren
- Evidenzdesign mit externer Fachberatung pruefen

Phase D: Antrag nur bei Reife

- erst nach belastbarem Pilot
- erst nach aktualisierter DSFA/FMEA/Intended Use
- erst nach Rechts-/Regulatory-Review
- erst wenn Finanzierung und laufende Compliance tragbar sind

## Verbotene DiPA-Formulierungen

- "nachbar.io ist eine DiPA"
- "nachbar.io wird als DiPA erstattet"
- "Die Pflegekasse zahlt die App"
- "DiPA-Erstattung garantiert"
- "medizinisch validiert"
- "verhindert Pflegebeduerftigkeit"
- "ersetzt Pflegedienst, Hausnotruf oder Arzt"

## Erlaubte DiPA-Formulierungen

- "DiPA ist ein spaeterer Pruefpfad."
- "CareCircle kann konzeptionell zu DiPA-relevanten Nutzendimensionen passen."
- "Vor einer DiPA-Positionierung braucht es Pilotdaten, Datenschutzpruefung,
  Nutzennachweis und BfArM-Verfahren."
- "Aktuell ist nachbar.io kein DiPA-gelistetes Produkt."

## Quellenstand

Vor externer Nutzung erneut pruefen. Stand dieser Links: 2026-05-03.

- BfArM DiPA-Uebersicht:
  https://www.bfarm.de/DE/Medizinprodukte/Aufgaben/DiGA-und-DiPA/DiPA/_node.html
- BfArM Wissenswertes zu DiPA:
  https://www.bfarm.de/DE/Medizinprodukte/Aufgaben/DiGA-und-DiPA/DiPA/Wissenswertes/_node.html
- BfArM DiPA-FAQ:
  https://www.bfarm.de/DE/Medizinprodukte/_FAQ/DiPA/faq-liste.html
- BfArM DiPA-Leitfaden:
  https://www.bfarm.de/SharedDocs/Downloads/DE/Medizinprodukte/dipa_leitfaden.pdf?__blob=publicationFile
- BMG Digitale Pflegeanwendungen:
  https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-der-pflegeversicherung/leistungen-im-ueberblick/digitale-pflegeanwendungen
- `40a SGB XI`:
  https://www.gesetze-im-internet.de/sgb_11/__40a.html
- `40b SGB XI`:
  https://www.gesetze-im-internet.de/sgb_11/__40b.html

Hinweis: Keine konkreten monatlichen Leistungsbetraege in Marketing-, Partner-
oder Produktunterlagen nennen, bis BMG, Gesetzestext und ggf. aktuelle
Anpassungsbekanntmachungen fuer den Zielzeitpunkt juristisch abgeglichen sind.

## Naechster kleiner Block

Wenn Thomas weiter im Foerderstrategie-Strang bleiben will:

1. Partner-Onepager aus dem UStA-/Quartiersimpulse-Konzept ableiten.
2. Oder: separate Quartiersimpulse-Antragsskizze fuer Kommune schreiben.
3. M4-Hardware-Bundle weiterhin nicht bauen, bis M4.0/M4.1 erledigt sind.
