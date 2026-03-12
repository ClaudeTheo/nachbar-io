# Nachbar.io — Incident Response Plan

**Version:** 1.0
**Datum:** 2026-03-12
**Genehmigt von:** [noch ausstehend]
**Naechste Ueberpruefung:** 2026-06-12

## 1. Zweck und Geltungsbereich

Dieser Plan definiert das Vorgehen bei Sicherheitsvorfaellen, Systemausfaellen
und Datenschutzverletzungen im Nachbar.io Care-Modul. Er gilt fuer alle
Teammitglieder mit Zugriff auf Produktionssysteme.

## 2. Kontaktliste

| Rolle | Name | Kontakt | Erreichbarkeit |
|-------|------|---------|----------------|
| Incident Manager | [TBD] | thomasth@gmx.de | 24/7 |
| Technischer Lead | [TBD] | — | Geschaeftszeiten |
| Datenschutzbeauftragter | [TBD, extern] | — | Geschaeftszeiten |
| Supabase Support | — | support@supabase.io | 24/7 (Business Plan) |
| Twilio Support | — | support.twilio.com | 24/7 |

## 3. Incident-Klassifizierung

### 3.1 Schweregrade

| Stufe | Bezeichnung | Definition | Reaktionszeit |
|-------|-------------|------------|---------------|
| SEV-1 | KRITISCH | SOS-System ausgefallen, keine Benachrichtigungen moeglich | 15 Minuten |
| SEV-2 | HOCH | Einzelne Kanaele ausgefallen (Push ODER SMS ODER Voice) | 1 Stunde |
| SEV-3 | MITTEL | Nicht-kritische Funktion beeintraechtigt (Check-in, Medikamente) | 4 Stunden |
| SEV-4 | NIEDRIG | Kosmetische Fehler, Performance-Degradation | 24 Stunden |

### 3.2 Kategorie-Beispiele

**SEV-1 (KRITISCH):**
- SOS-API antwortet nicht (HTTP 5xx)
- Eskalations-Cron laueft nicht (Heartbeat > 30 Min. ueberfaellig)
- Supabase-Datenbank nicht erreichbar
- Datenbreach (unbefugter Zugriff auf Gesundheitsdaten)

**SEV-2 (HOCH):**
- Push-Notifications werden nicht zugestellt
- SMS/Voice-Kanaele fehlerhaft (Twilio-Ausfall)
- Verschluesselungs-Fehler (Daten nicht entschluesselbar)
- RLS-Policy-Umgehung entdeckt

**SEV-3 (MITTEL):**
- Check-in-Reminder werden nicht gesendet
- Medikamenten-Erinnerungen verzoegert
- Admin-Dashboard nicht erreichbar
- Audit-Log schreibt nicht

**SEV-4 (NIEDRIG):**
- UI-Darstellungsfehler
- Langsame Ladezeiten (>5 Sek.)
- Nicht-kritische Feature-Fehler

## 4. Incident-Response-Ablauf

### Phase 1: Erkennung (Detection)

**Automatische Erkennung:**
- Cron-Heartbeat-Monitor: `care_cron_heartbeats`-Tabelle
  - Status `error` oder `warn` → Admin-Alert via E-Mail
  - Abfrage: `lib/care/cron-heartbeat.ts` → `checkCronHealth()`
- Vercel Log-Alerts: JSON-Logs mit `level: 'error'` und `module: 'care/*'`
- Supabase Database Health: Dashboard-Monitoring

**Manuelle Erkennung:**
- Nutzer-Beschwerden (Pilotphase: direkter Kontakt)
- Tester-Reports via QA-System
- Regelmaessige Log-Pruefung

### Phase 2: Triage (Bewertung)

1. Schweregrad bestimmen (SEV-1 bis SEV-4)
2. Betroffene Systeme identifizieren
3. Anzahl betroffener Nutzer schaetzen
4. Incident-Ticket erstellen (GitHub Issue mit Label `incident`)

### Phase 3: Eindaemmung (Containment)

**SEV-1 Sofortmassnahmen:**
```
1. Statusseite aktualisieren (falls vorhanden)
2. Betroffene Nutzer informieren (SMS an alle Senioren)
3. Fallback aktivieren:
   - SOS-Ausfall: Direkte Telefon-Hotline einrichten
   - DB-Ausfall: Supabase Support kontaktieren
   - API-Ausfall: Vercel Deployment ueberpruefen
4. Workaround implementieren (Feature-Flag, Maintenance-Mode)
```

**SEV-2 Sofortmassnahmen:**
```
1. Betroffenen Kanal deaktivieren
2. Fallback-Kanaele ueberpruefen (Push→SMS→Voice Kaskade)
3. Root-Cause-Analyse starten
```

### Phase 4: Behebung (Eradication)

1. Root Cause identifizieren
2. Fix entwickeln und testen (lokale Tests MUESSEN bestehen)
3. Code-Review (auch bei Hotfix)
4. Deployment via CI/CD-Pipeline (Tests als Gate)
5. Verifikation in Produktion

### Phase 5: Wiederherstellung (Recovery)

1. Alle betroffenen Systeme ueberpruefen
2. Datenintegritaet verifizieren
3. Monitoring fuer 24 Stunden verstaerken
4. Betroffene Nutzer informieren (Entwarnung)

### Phase 6: Nachbereitung (Post-Mortem)

Innerhalb von **48 Stunden** nach Incident-Abschluss:

1. **Post-Mortem-Dokument** erstellen:
   - Timeline des Vorfalls
   - Root Cause Analysis (5-Why-Methode)
   - Was hat funktioniert?
   - Was hat nicht funktioniert?
   - Verbesserungsmassnahmen (mit Fristen und Verantwortlichen)

2. **Risk Register aktualisieren** (`docs/19_RISK_REGISTER.md`)

3. **FMEA aktualisieren** bei neuen Fehlermoden (`docs/16_FMEA_CARE_MODUL.md`)

4. **Traceability Matrix** pruefen auf neue Testluecken

## 5. DSGVO-Datenschutzverletzungen (Art. 33/34)

### 5.1 Meldepflichten

| Bedingung | Frist | Adressat | Formular |
|-----------|-------|----------|----------|
| Risiko fuer Betroffene | 72 Stunden | Aufsichtsbehoerde (LfDI BaWue) | [Online-Meldeformular](https://www.baden-wuerttemberg.datenschutz.de) |
| Hohes Risiko fuer Betroffene | Unverzueglich | Betroffene Personen | Individuelle Benachrichtigung |

### 5.2 Ablauf bei Datenschutzverletzung

```
1. SOFORT: Zugriff sperren / Datenleck stopppen
2. INNERHALB 1h: Incident Manager informieren
3. INNERHALB 4h: Umfang bewerten (welche Daten, wie viele Betroffene)
4. INNERHALB 24h: DSB informieren, Dokumentation beginnen
5. INNERHALB 72h: Meldung an Aufsichtsbehoerde (wenn Risiko besteht)
6. UNVERZUEGLICH: Betroffene informieren (wenn hohes Risiko)
```

### 5.3 Dokumentation

Jede Datenschutzverletzung wird dokumentiert mit:
- Art der Verletzung
- Betroffene Datenkategorien und Anzahl Personen
- Kontakt des DSB
- Wahrscheinliche Folgen
- Ergriffene Gegenmassnahmen
- Zeitpunkt der Entdeckung und Meldung

## 6. Eskalationsmatrix

```
SEV-1: Incident Manager → Technischer Lead → DSB → Aufsichtsbehoerde
SEV-2: Incident Manager → Technischer Lead
SEV-3: Technischer Lead
SEV-4: Entwicklungsteam
```

## 7. Kommunikationsvorlage

### Nutzer-Benachrichtigung (SEV-1/SEV-2)

```
Betreff: Nachbar.io — Wichtige Information

Sehr geehrte Nutzerin, sehr geehrter Nutzer,

wir informieren Sie darueber, dass es aktuell zu Einschraenkungen
bei [BETROFFENE FUNKTION] kommt. Unser Team arbeitet an der Behebung.

[BEI SOS-AUSFALL:]
Im Notfall rufen Sie bitte direkt 112 (Feuerwehr/Rettungsdienst)
oder 110 (Polizei) an.

Wir entschuldigen uns fuer die Unannehmlichkeiten und informieren Sie,
sobald das Problem behoben ist.

Mit freundlichen Gruessen,
Ihr Nachbar.io-Team
```

## 8. Regelmaessige Uebungen

| Uebung | Haeufigkeit | Naechster Termin |
|--------|-------------|------------------|
| Tabletop-Uebung (SEV-1 Szenario) | Halbjaehrlich | 2026-06-01 |
| Failover-Test (DB-Recovery) | Vierteljaehrlich | 2026-04-15 |
| Kommunikations-Test (SMS an Senioren) | Monatlich | 2026-04-01 |

## 9. Anhang

### Checkliste fuer Incident Manager

- [ ] Schweregrad bestimmt
- [ ] Betroffene Systeme identifiziert
- [ ] Incident-Ticket erstellt
- [ ] Team informiert
- [ ] Eindaemmung durchgefuehrt
- [ ] Root Cause identifiziert
- [ ] Fix deployed
- [ ] Produktion verifiziert
- [ ] Betroffene Nutzer informiert
- [ ] Post-Mortem geplant
- [ ] Dokumentation aktualisiert

### Aenderungshistorie

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-03-12 | Erstversion |
