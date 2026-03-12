# Nachbar.io — Intended Use Statement (Zweckbestimmung)

> Version 1.0 — Stand: 2026-03-12
> Rechtsgrundlage: EU MDR 2017/745, MDCG 2019-11, DSGVO Art. 5/6/9

---

## 1. Produktbezeichnung

**Nachbar.io** — Hyperlokale Nachbarschafts- und Senioren-Unterstuetzungsplattform

## 2. Hersteller

Nachbar.io (Betreiber, kein Medizinproduktehersteller)
Pilotstandort: Bad Saeckingen, Baden-Wuerttemberg

## 3. Zweckbestimmung (Intended Purpose)

Nachbar.io ist eine **Kommunikations- und Koordinationsplattform**, die:

1. **Nachbarschaftliche Vernetzung** in einem definierten Quartier (3 Strassen, ~30-40 Haushalte) ermoeglicht
2. **Nicht-medizinische Alltagsunterstuetzung** fuer Senioren koordiniert (Einkaufshilfe, Gesellschaft, Besorgungen)
3. **Erinnerungsfunktionen** bereitstellt (Medikamenten-Erinnerungen, Termin-Erinnerungen, Check-ins)
4. **Einen SOS-Alarmierungsmechanismus** anbietet, der Nachbarn, Angehoerige und Pflegedienste ueber eine Eskalationskaskade informiert

## 4. Ausdruecklich NICHT beabsichtigte Zwecke

Nachbar.io ist **KEIN**:

- **Medizinprodukt** im Sinne der EU MDR 2017/745
- **Hausnotrufsystem** nach DIN EN 50134-1:2012
- **Telemedizin-Anwendung** oder **Fernueberwachungssystem**
- **Diagnostik-Werkzeug** oder **Therapie-Unterstuetzung**
- Ersatz fuer den **offiziellen Notruf** (112/110)
- Ersatz fuer **professionelle Pflege** oder **aerztliche Behandlung**

## 5. Zielgruppe (Intended Users)

### 5.1 Primaere Nutzer
- **Senioren** (65+ Jahre) im Pilotquartier, die selbststaendig oder mit Unterstuetzung leben
- **Technische Faehigkeiten:** Grundlegende Smartphone-Bedienung (Seniorenmodus mit grossen Touch-Targets)

### 5.2 Sekundaere Nutzer
- **Angehoerige** (Familienmitglieder, die nicht vor Ort wohnen)
- **Nachbarn** (freiwillige Helfer im Quartier)
- **Pflegedienste** (professionelle Pfleger mit Verifizierung)

### 5.3 Nicht vorgesehene Nutzer
- Personen ausserhalb des verifizierten Quartiers
- Kinder unter 16 Jahren
- Medizinisches Fachpersonal in klinischer Funktion

## 6. Nutzungsumgebung (Use Environment)

- **Geographisch:** Pilotquartier Bad Saeckingen (Purkersdorfer Strasse, Sanarystrasse, Oberer Rebberg)
- **Technisch:** Smartphone/Tablet mit Internetzugang (PWA), optional Companion-Device (E-Paper)
- **Zeitlich:** 24/7 verfuegbar, Check-ins zu konfigurierbaren Zeiten
- **Netzwerk:** WiFi oder Mobilfunk erforderlich (kein Offline-Notfallmodus)

## 7. Funktionsmodule und ihre Klassifikation

### 7.1 SOS-Alarmierung
- **Funktion:** Benachrichtigung von Nachbarn, Angehoerigen, Pflegedienst ueber 4-Stufen-Kaskade
- **Klassifikation:** Kommunikationstool, KEIN Hausnotruf
- **Abgrenzung zu DIN EN 50134:** Keine garantierte Leitstellenanbindung, kein zertifiziertes Empfangszentrum, keine SLA-garantierte Reaktionszeit
- **Sicherheitsmassnahme:** Bei medizinischem Notfall wird IMMER zuerst der offizielle Notruf (112/110) angezeigt (EmergencyBanner, FMEA FM-NB-02)

### 7.2 Check-in-System
- **Funktion:** Regelmaessige Wohlbefindensabfrage mit automatischer Eskalation bei Nicht-Antwort
- **Klassifikation:** Soziale Kontrollfunktion (wie Nachbar-klingelt-an), KEIN Vitalzeichen-Monitoring
- **Abgrenzung:** Erfasst KEINE medizinischen Daten (Blutdruck, Puls, etc.)
- **Eskalation:** Auto-SOS nach 60 Min Nicht-Antwort (source: checkin_timeout)

### 7.3 Medikamenten-Erinnerung
- **Funktion:** Zeitbasierte Erinnerungen an Medikamenteneinnahme
- **Klassifikation:** Erinnerungstool (wie Wecker/Kalender), KEIN Medikamentenmanagement-System
- **Abgrenzung:** Keine Wechselwirkungspruefung, keine Dosisberechnung, keine Verknuepfung mit Arzt/Apotheke
- **Haftungsausschluss:** App uebernimmt KEINE Verantwortung fuer korrekte Einnahme

### 7.4 Termin-Erinnerungen
- **Funktion:** Erinnerungen an Arzt- und sonstige Termine
- **Klassifikation:** Kalenderfunktion, kein medizinischer Kontext
- **Abgrenzung:** Kein Zusammenhang mit Behandlungsplaenen

### 7.5 Nachbarschaftshilfe
- **Funktion:** Koordination von Einkaufshilfe, Besorgungen, Gesellschaft
- **Klassifikation:** Soziale Vernetzung, rein organisatorisch

## 8. Regulatorische Einordnung

### 8.1 EU MDR 2017/745 — Nicht anwendbar
Nachbar.io erfuellt KEINES der drei Kriterien fuer ein Medizinprodukt (Art. 2 Abs. 1):
1. **Kein medizinischer Zweck:** Dient der sozialen Koordination, nicht Diagnose/Therapie/Ueberwachung
2. **Keine physiologische Wirkung:** Misst/beeinflusst keine Koerperfunktionen
3. **Kein Eingriff in den Koerper:** Rein digitale Kommunikationsplattform

### 8.2 MDCG 2019-11 Entscheidungsbaum
- **Frage 1:** Ist die Software ein Medizinprodukt? → Nein (kein medizinischer Zweck)
- **Frage 2:** Fuehrt die Software eine Aktion an Daten durch, die sich von Speicherung/Kommunikation unterscheidet? → Nein (reine Kommunikation + zeitbasierte Erinnerungen)
- **Ergebnis:** Software qualifiziert NICHT als Medizinprodukt

### 8.3 DIN EN 50134 Hausnotruf — Nicht anwendbar
Unterschiede zu einem zertifizierten Hausnotrufsystem:
| Kriterium | Hausnotruf (DIN EN 50134) | Nachbar.io |
|---|---|---|
| Empfangszentrum | Zertifizierte Leitstelle 24/7 | Keine Leitstelle |
| Reaktionszeit-SLA | Definiert (z.B. < 60 Sek.) | Keine SLA |
| Redundante Kommunikation | GSM + Festnetz | Internet-only |
| Batterie-Backup | Min. 24h | Geraeteabhaengig |
| Zertifizierung | CE nach DIN EN 50134 | Keine |
| Haftung | Betreiber der Leitstelle | Keine Haftung fuer Reaktionszeit |

## 9. Datenschutz-Klassifikation (DSGVO)

### 9.1 Verarbeitete Datenarten
| Datenart | DSGVO-Kategorie | Schutzmassnahme |
|---|---|---|
| Name, Adresse, Telefon | Personenbezogen (Art. 6) | RLS, Pseudonymisierung |
| Medikamentennamen, Dosierung | Gesundheitsdaten (Art. 9) | AES-256-GCM Verschluesselung |
| Check-in-Stimmung (Mood) | Gesundheitsdaten (Art. 9) | AES-256-GCM Verschluesselung |
| SOS-Kategorie, Notizen | Gesundheitsdaten (Art. 9) | AES-256-GCM Verschluesselung |
| Termin-Typ, Notizen | Gesundheitsdaten (Art. 9) | AES-256-GCM Verschluesselung |

### 9.2 Rechtsgrundlage
- **Art. 6 Abs. 1 lit. a DSGVO:** Einwilligung fuer allgemeine Nutzung
- **Art. 9 Abs. 2 lit. a DSGVO:** Ausdrueckliche Einwilligung fuer Gesundheitsdaten
- **Art. 6 Abs. 1 lit. f DSGVO:** Berechtigtes Interesse fuer SOS-Eskalation an Helfer

## 10. Risikomanagement-Verweis

Die sicherheitsrelevanten Risiken sind in der **FMEA Care-Modul** (docs/16_FMEA_CARE_MODUL.md) dokumentiert:
- 20 identifizierte Gefahren (Hazards)
- 3 kritische Risiken mit Sofortmassnahmen (RPZ >= 60)
- Laufendes Monitoring ueber Cron-Heartbeat-System

## 11. Haftungsausschluss (fuer AGB)

> **Nachbar.io ist ein Kommunikationswerkzeug und kein Ersatz fuer professionelle Rettungsdienste, Pflegeleistungen oder aerztliche Versorgung.**
>
> Der Betreiber uebernimmt keine Haftung fuer:
> - Verzoegerungen oder Ausfaelle bei der SOS-Benachrichtigung
> - Nicht-Reaktion von Helfern auf SOS-Alerts
> - Versaeumte Medikamenteneinnahmen trotz Erinnerung
> - Technische Stoerungen (Internetausfall, Serverausfall)
>
> Bei lebensbedrohlichen Notfaellen rufen Sie IMMER zuerst 112 (Feuerwehr/Rettungsdienst) oder 110 (Polizei) an.

## 12. Aenderungsmanagement

Dieses Dokument muss aktualisiert werden bei:
- Hinzufuegen neuer Funktionsmodule
- Aendern der Zielgruppe oder des Nutzungskontexts
- Aendern der Datenverarbeitungsprozesse
- Regulatorischen Aenderungen (EU MDR, DSGVO)
- Ergebnis der DSFA (falls Hochrisiko festgestellt wird)

---

*Erstellt am: 2026-03-12 | Naechste Pruefung: 2026-06-12 (quartalsweise)*
