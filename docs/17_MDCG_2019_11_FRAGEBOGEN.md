# Nachbar.io — MDCG 2019-11 Qualifizierung

> Version 1.0 — Stand: 2026-03-12
> Grundlage: MDCG 2019-11 Rev. 1 — Guidance on Qualification and Classification of Software in MDR/IVDR

---

## 1. Zweck dieses Dokuments

Systematische Pruefung, ob Nachbar.io als Software-Medizinprodukt (SaMD) unter die EU MDR 2017/745 faellt, anhand des offiziellen MDCG 2019-11 Entscheidungsbaums.

---

## 2. Schritt 1: Ist die Software ein Medizinprodukt?

### Frage 1.1: Erfuellt die Software die Definition eines Medizinprodukts (Art. 2 Abs. 1 MDR)?

> *"Medizinprodukt: jedes Instrument, Apparat, Geraet, Software, ... das vom Hersteller zur Anwendung fuer Menschen fuer einen oder mehrere der folgenden spezifischen medizinischen Zwecke bestimmt ist..."*

**Nachbar.io Funktionsmodule vs. MDR-Zwecke:**

| MDR-Zweck (Art. 2 Abs. 1) | SOS-Alert | Check-in | Med.-Erinnerung | Termine | Hilfe |
|---|---|---|---|---|---|
| a) Diagnose | Nein | Nein | Nein | Nein | Nein |
| b) Verhuetung | Nein | Nein | Nein | Nein | Nein |
| c) Ueberwachung (Monitoring) | Nein | Nein* | Nein | Nein | Nein |
| d) Vorhersage/Prognose | Nein | Nein | Nein | Nein | Nein |
| e) Behandlung/Linderung | Nein | Nein | Nein | Nein | Nein |

*\*Check-in: Fragt subjektives Wohlbefinden ab ("ok"/"nicht so gut"/"brauche Hilfe"), erfasst aber KEINE Vitalparameter oder objektive Gesundheitsdaten. Vergleichbar mit einem Anruf "Wie geht es dir?", nicht mit medizinischem Monitoring.*

**Ergebnis Frage 1.1: NEIN** — Nachbar.io hat keinen medizinischen Zweck im Sinne der MDR.

---

### Frage 1.2: Ist die Software ein Zubehoer zu einem Medizinprodukt?

**Antwort: NEIN** — Nachbar.io interagiert mit keinem Medizinprodukt. Das Companion-Device (E-Paper-Anzeige) ist ein reines Anzeigegeraet ohne medizinische Funktion.

---

### Frage 1.3: Ist die Software Teil eines Medizinprodukts?

**Antwort: NEIN** — Nachbar.io ist eine eigenstaendige Anwendung, die nicht in ein Medizinprodukt eingebettet ist.

---

## 3. Schritt 2: Handelt die Software mit Daten fuer individuelle Patienten?

*Dieser Schritt ist nur relevant, wenn Frage 1 mit "Ja" beantwortet wurde. Da Frage 1 mit "Nein" beantwortet wurde, endet der Entscheidungsbaum hier.*

**Zur Vollstaendigkeit dennoch dokumentiert:**

### Frage 2.1: Fuehrt die Software eine Aktion an Daten durch?

Die Aktionen von Nachbar.io an personenbezogenen Daten:

| Aktion | MDCG-Klassifikation | Begruendung |
|---|---|---|
| Medikamenten-Erinnerung senden | Speicherung + Kommunikation | Zeitbasierter Trigger, keine Analyse |
| Check-in-Status speichern | Speicherung | Keine Interpretation/Diagnose |
| SOS-Benachrichtigung weiterleiten | Kommunikation | Weiterleitung an definierte Empfaenger |
| Termin-Erinnerung senden | Speicherung + Kommunikation | Kalender-Erinnerung |
| Bericht generieren | Aggregation | Zaehlung (genommen/verpasst), keine Diagnose |

**MDCG 2019-11 Aussage (Abschnitt 3.3):**
> *"Software, die nur dazu bestimmt ist, Daten zu speichern, zu archivieren, zu kommunizieren, einfach zu suchen oder zu komprimieren [...] qualifiziert nicht als Medizinprodukt."*

**Ergebnis: Alle Aktionen fallen unter "Speicherung und Kommunikation"** — keine der Aktionen erzeugt neue medizinische Information.

---

## 4. Schritt 3: Abgrenzung zu "Lifestyle/Wellbeing"

### MDCG 2019-11 Abschnitt 3.2 — Allgemeines Wohlbefinden

> *"Software fuer allgemeines Wohlbefinden (general wellness) ist kein Medizinprodukt, wenn sie [...] keinen spezifischen medizinischen Zustand diagnostiziert, behandelt oder ueberwacht."*

**Nachbar.io Funktionen im Kontext:**

| Funktion | Wellness/Lifestyle | Medizinisch? |
|---|---|---|
| "Wie geht es Ihnen?" (Check-in) | Subjektive Befindlichkeit | Nein (keine Vitalzeichen) |
| Medikamenten-Erinnerung | Erinnerungshilfe (wie Wecker) | Nein (keine Dosisberechnung) |
| SOS-Kommunikation | Notfall-Kommunikation | Nein (kein Monitoring, keine Diagnose) |
| Termin-Erinnerung | Kalender | Nein |

**Ergebnis: Nachbar.io faellt in die Kategorie "Lifestyle/Wellbeing Software".**

---

## 5. Zusammenfassung Entscheidungsbaum

```
Start: Ist die Software ein Medizinprodukt?
  |
  +-- Hat sie einen medizinischen Zweck (Art. 2 Abs. 1)?
  |     |
  |     +-- NEIN → Software ist KEIN Medizinprodukt
  |
  (Ende)
```

**Gesamtergebnis: Nachbar.io qualifiziert NICHT als Software-Medizinprodukt (SaMD) unter der EU MDR 2017/745.**

---

## 6. Grenzfaelle und Beobachtungspunkte

### 6.1 Funktionen, die bei Erweiterung eine Neubeurteilung erfordern

| Moegliche Erweiterung | Risiko der MDR-Einstufung | Trigger fuer Neubeurteilung |
|---|---|---|
| Blutdruck-/Puls-Eingabe durch Senior | HOCH | Erfassung von Vitalparametern |
| Automatische Sturzerkennung | HOCH | Sensor-basiertes Monitoring |
| KI-Analyse von Check-in-Mustern zur Diagnose | HOCH | Algorithmische Diagnose |
| Medikamenten-Wechselwirkungspruefung | HOCH | Medizinische Entscheidungsunterstuetzung |
| Verknuepfung mit Arztpraxis-System | MITTEL | Kontext wird medizinisch |
| Integration von Blutzucker-Tracker | HOCH | Therapeutische Ueberwachung |

### 6.2 Regelmaessige Pruefung

- **Frequenz:** Bei jeder neuen Funktion im Care-Modul
- **Verantwortlich:** Produktmanagement + Rechtsberatung
- **Dokumentation:** Aktualisierung dieses Fragebogens

---

## 7. Referenzen

1. **EU MDR 2017/745** — Verordnung (EU) 2017/745 ueber Medizinprodukte
2. **MDCG 2019-11 Rev. 1** — Guidance on Qualification and Classification of Software
3. **MDCG 2021-24** — Guidance on Classification of Medical Devices
4. **DIN EN 50134-1:2012** — Sozialalarm-Systeme (Hausnotruf)
5. **Nachbar.io Intended Use Statement** — docs/15_INTENDED_USE_STATEMENT.md
6. **Nachbar.io FMEA Care-Modul** — docs/16_FMEA_CARE_MODUL.md

---

*Erstellt am: 2026-03-12 | Naechste Pruefung: Bei jeder neuen Care-Funktion oder aenderung der Zweckbestimmung*
