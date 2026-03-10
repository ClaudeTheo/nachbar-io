# Nachbar.io Care-Modul — Workflow-Dokumentation

> Detaillierte Ablaufbeschreibungen aller Pflege-Workflows.
> Basierend auf dem Quellcode in `lib/care/` und `app/api/care/`.

---

## Inhaltsverzeichnis

1. [SOS-Alert Lebenszyklus](#1-sos-alert-lebenszyklus)
2. [Check-in-Ablauf](#2-check-in-ablauf)
3. [Medikamenten-Verwaltung](#3-medikamenten-verwaltung)
4. [Termin-Erinnerungen](#4-termin-erinnerungen)
5. [Helfer-Verifizierung](#5-helfer-verifizierung)
6. [Eskalationslogik](#6-eskalationslogik)
7. [Bericht-Generierung](#7-bericht-generierung)
8. [Benachrichtigungskanaele](#8-benachrichtigungskanaele)
9. [Feature-Gates (Abo-Plaene)](#9-feature-gates-abo-plaene)

---

## 1. SOS-Alert Lebenszyklus

### Statusuebergaenge

```
                    +----> [cancelled]
                    |
[triggered] --> [notified] --> [accepted] --> [helper_enroute] --> [resolved]
                    |
                    +----> [escalated] --+--> [accepted] --> ...
                                        |
                                        +--> [escalated] (naechste Stufe)
                                        |
                                        +--> Stufe 4: Admin-Alert
```

### Detaillierter Ablauf

#### Phase 1: SOS ausloesen (`POST /api/care/sos`)

```
Senior drueckt SOS-Button
    |
    v
1. Auth-Check: Nutzer authentifiziert?
    |
    v
2. Kategorie validieren:
   - medical_emergency (IMMER verfuegbar, Notfall-Banner mit 112)
   - general_help
   - visit_wanted
   - shopping
   - medication_help
    |
    v
3. Feature-Gate pruefen:
   - medical_emergency -> Feature "medical_emergency_sos" (immer frei)
   - Alle anderen -> Feature "sos_all" (ab Basic-Plan)
    |
    v
4. SOS-Alert in DB anlegen:
   status = 'triggered'
   current_escalation_level = 1
   escalated_at = []
   source = 'app' | 'device' | 'checkin_timeout'
    |
    v
5. Audit-Log: 'sos_triggered'
    |
    v
6. Level-1-Helfer (Nachbarn) ermitteln:
   - role = 'neighbor'
   - verification_status = 'verified'
   - assigned_seniors enthaelt senior_id
    |
    v
7. Benachrichtigung an alle Level-1-Helfer:
   - Kanaele: push + in_app
   - Titel: "NOTFALL: ..." (bei medical_emergency) oder "SOS: ..."
    |
    v
8. Status-Update: 'triggered' -> 'notified'
    |
    v
9. Antwort: SOS-Alert mit Status 201
```

#### Phase 2: Helfer reagiert (`POST /api/care/sos/[id]/respond`)

```
Helfer oeffnet SOS-Benachrichtigung
    |
    v
Reaktionstyp waehlen:
    |
    +--- 'accepted':
    |       |-> Status: 'notified'/'escalated' -> 'accepted'
    |       |-> accepted_by = helper_id
    |       |-> Senior benachrichtigen: "Hilfe ist unterwegs!"
    |       |-> Audit-Log: 'sos_accepted'
    |
    +--- 'arrived':
    |       |-> Status: 'accepted' -> 'helper_enroute'
    |
    +--- 'declined':
    |       |-> Nur Response speichern, kein Status-Update
    |
    +--- 'completed':
            |-> Nur Response speichern
```

#### Phase 3: SOS schliessen (`PATCH /api/care/sos/[id]`)

```
Senior oder Helfer schliesst den Alert
    |
    v
Erlaubte Status-Uebergaenge:
    |
    +--- 'resolved':
    |       |-> resolved_by = user.id
    |       |-> resolved_at = now()
    |       |-> Audit-Log: 'sos_resolved'
    |
    +--- 'cancelled':
            |-> Audit-Log: 'sos_cancelled'
```

#### Phase 4: Manuelle Eskalation (`POST /api/care/sos/[id]/escalate`)

```
Senior oder Helfer eskaliert manuell
    |
    v
1. Naechste Stufe ermitteln (max. 4)
    |
    v
2. Alert aktualisieren:
   - current_escalation_level -> toLevel
   - escalated_at[] += now()
   - status = 'escalated'
    |
    v
3. Helfer der neuen Stufe benachrichtigen:
   - Stufe 2 (Angehoerige): push + in_app + sms
   - Stufe 3 (Pflegedienst): push + in_app + sms + voice
   - Stufe 4 (Leitstelle): admin_alert (alle Admins)
    |
    v
4. Audit-Log: 'sos_escalated' (manual: true)
```

---

## 2. Check-in-Ablauf

### Zeitliche Phasen (Cron: alle 5 Minuten)

```
Geplanter Check-in-Zeitpunkt (z.B. 08:00)
    |
    |  0-5 Min nach Faelligkeit
    v
Phase 1: Check-in erstellen + Erste Erinnerung
    - Status: 'reminded'
    - Push: "Zeit fuer Ihren Check-in"
    |
    | 30-35 Min nach Faelligkeit
    v
Phase 2: Zweite Erinnerung
    - reminder_sent_at = now()
    - Push: "Erinnerung: Bitte melden Sie sich"
    |
    | 60-65 Min nach Faelligkeit
    v
Phase 3: Eskalation
    - Status: 'missed', escalated = true
    - Auto-SOS anlegen (source: 'checkin_timeout')
    - Audit-Log: 'checkin_missed' + 'checkin_escalated'
    - Angehoerige + Pflegedienst benachrichtigen
```

### Check-in abgeben (`POST /api/care/checkin`)

```
Senior meldet sich ein
    |
    v
Status waehlen:
    |
    +--- 'ok': Mir geht es gut
    |       |-> Audit-Log: 'checkin_ok'
    |
    +--- 'not_well': Nicht so gut
    |       |-> Audit-Log: 'checkin_not_well'
    |       |-> Angehoerige benachrichtigen (push + in_app)
    |
    +--- 'need_help': Ich brauche Hilfe
            |-> Audit-Log: 'checkin_not_well'
            |-> Auto-SOS anlegen (category: 'general_help', source: 'checkin_timeout')
```

### Check-in-Status abrufen (`GET /api/care/checkin/status`)

```
Antwort-Struktur:
{
  today: CareCheckin[],       // Heutige Check-ins
  checkinTimes: string[],     // Konfigurierte Zeiten (z.B. ["08:00","20:00"])
  checkinEnabled: boolean,    // Check-ins aktiviert?
  completedCount: number,     // Heute abgeschlossene Check-ins
  totalCount: number,         // Geplante Check-ins pro Tag
  nextDue: string | null,     // Naechster faelliger Zeitpunkt (HH:MM)
  allCompleted: boolean       // Alle heutigen Check-ins erledigt?
}
```

### Konfigurierbare Parameter

| Parameter | Default | Quelle |
|---|---|---|
| Check-in-Zeiten | `["08:00", "20:00"]` | `care_profiles.checkin_times` |
| Check-in aktiviert | `true` | `care_profiles.checkin_enabled` |
| Erinnerung nach | 30 Min | `CHECKIN_DEFAULTS.reminderAfterMinutes` |
| Eskalation nach | 60 Min | `CHECKIN_DEFAULTS.escalateAfterMinutes` |

---

## 3. Medikamenten-Verwaltung

### Medikament anlegen (`POST /api/care/medications`)

```
Angehoeriger/Pflegedienst/Senior legt Medikament an
    |
    v
1. Feature-Gate: 'medications' (ab Basic-Plan)
    |
    v
2. Validierung:
   - Name (Pflicht)
   - Schedule (Pflicht, Typ: daily/weekly/interval)
   - Dosierung, Anweisungen (optional)
    |
    v
3. INSERT in care_medications:
   - managed_by = aktueller User
   - active = true
    |
    v
4. Audit-Log: 'profile_updated' (action: 'created')
```

### Taeglicher Medikamenten-Zyklus (Cron: alle 5 Minuten)

```
Fuer jedes aktive Medikament + jeden heutigen Einnahmezeitpunkt:
    |
    |  Zeitpunkt in der Zukunft?
    +--- Ja: Ueberspringen
    |
    |  Log-Eintrag existiert bereits?
    +--- 'taken'/'skipped'/'missed': Kein Handlungsbedarf
    |
    +--- 'snoozed': Snooze-Zeit abgelaufen?
    |       |--- Ja: Re-Erinnerung senden
    |       |--- Nein: Ueberspringen
    |
    |  Kein Log-Eintrag vorhanden:
    |
    |  0-5 Min nach Faelligkeit
    v
Phase 1: Erste Erinnerung
    - Push: "Zeit fuer Ihr Medikament: [Name] ([Dosierung])"
    - Kanaele: push + in_app
    |
    | 60-65 Min nach Faelligkeit
    v
Phase 2: Verpasst-Markierung
    - INSERT care_medication_logs (status: 'missed')
    - Audit-Log: 'medication_missed'
    - Senior benachrichtigen
    - Angehoerige + Pflegedienst benachrichtigen
```

### Einnahme protokollieren (`POST /api/care/medications/log`)

```
Senior reagiert auf Erinnerung
    |
    v
Status waehlen:
    |
    +--- 'taken':
    |       |-> confirmed_at = now()
    |       |-> Audit-Log: 'medication_taken'
    |
    +--- 'skipped':
    |       |-> Audit-Log: 'medication_skipped'
    |       |-> Angehoerige benachrichtigen: "Medikament uebersprungen"
    |
    +--- 'snoozed':
            |-> snoozed_until = now() + 30 Min
            |-> Audit-Log: 'medication_snoozed'
            |-> Re-Erinnerung wird vom Cron nach Ablauf gesendet
```

### Faellige Medikamente abrufen (`GET /api/care/medications/due`)

```
Berechnung pro aktivem Medikament:
    |
    +--- daily: Alle konfigurierten Zeiten
    +--- weekly: Nur wenn heutiger Wochentag passt
    +--- interval: Nicht vom Cron unterstuetzt
    |
    v
Pro Zeitpunkt: Log-Status pruefen
    - 'pending' (kein Log) | 'taken' | 'skipped' | 'snoozed' | 'missed'
    |
    v
Sortiert nach scheduled_at zurueckgeben
```

---

## 4. Termin-Erinnerungen

### Cron-Ablauf (alle 5 Minuten)

```
Termine im 24-Stunden-Fenster laden
    |
    v
Fuer jeden Termin + jeden Erinnerungszeitpunkt:
    |
    v
1. Erinnerungszeitpunkt berechnen:
   reminder_at = scheduled_at - reminder_minutes_before * 60s
    |
    v
2. Toleranz-Check: |now - reminder_at| < 2.5 Min?
   (Vermeidet doppelte Erinnerungen im 5-Min-Cron-Intervall)
    |
    +--- Ausserhalb: Ueberspringen
    |
    +--- Innerhalb:
         |
         v
3. Senior benachrichtigen:
   "Termin-Erinnerung: [Titel] — in [X] Minuten/Stunden"
   Kanaele: push + in_app
    |
    v
4. Falls managed_by != senior_id:
   Betreuer separat benachrichtigen
```

### Erinnerungs-Zeitpunkte (Standard)

| Minuten vor Termin | Typische Nachricht |
|---|---|
| 60 | "... findet in 1 Stunde statt" |
| 15 | "... findet in 15 Minuten statt" |

Diese Werte werden pro Termin in `reminder_minutes_before` (int[]) konfiguriert.

### Termin-CRUD

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/appointments` | GET | Termine auflisten |
| `/api/care/appointments` | POST | Neuen Termin anlegen |
| `/api/care/appointments/[id]` | GET | Einzelnen Termin laden |
| `/api/care/appointments/[id]` | PATCH | Termin aktualisieren |
| `/api/care/appointments/[id]` | DELETE | Termin loeschen |

---

## 5. Helfer-Verifizierung

### Registrierungs- und Verifizierungsablauf

```
+----------------+          +------------------+          +------------------+
|  Registrierung |          |  Admin-Pruefung  |          |    Verifiziert   |
|   (POST)       |  ------> |   (PATCH)        |  ------> |                  |
|  status:       |          |  status:         |          |  status:         |
|  'pending'     |          |  'pending' ->    |          |  'verified'      |
+----------------+          |  'verified' oder |          +------------------+
                            |  'revoked'       |
                            +------------------+
```

### Phase 1: Registrierung (`POST /api/care/helpers`)

```
Nutzer registriert sich als Helfer
    |
    v
1. Rolle waehlen:
   - 'neighbor' (Nachbar, freiwillig)
   - 'relative' (Angehoeriger)
   - 'care_service' (Professioneller Pflegedienst)
    |
    v
2. Duplikat-Check: Bereits registriert?
   (UNIQUE auf user_id)
    |
    v
3. INSERT care_helpers:
   - verification_status = 'pending'
   - assigned_seniors = [senior_ids]
   - skills, availability (optional)
    |
    v
4. Audit-Log: 'helper_registered'
   (fuer jeden zugewiesenen Senior)
```

### Phase 2: Admin-Verifizierung (`PATCH /api/care/helpers/[id]`)

```
Admin prueft Helfer-Antrag
    |
    v
1. Status aendern:
   |
   +--- 'verified':
   |       |-> verified_by = admin.id
   |       |-> Helfer benachrichtigen: "Sie wurden als Helfer verifiziert"
   |       |-> Kanaele: push + in_app
   |       |-> Audit-Log: 'helper_verified' (fuer jeden zugewiesenen Senior)
   |
   +--- 'revoked':
           |-> Helfer verliert Zugriff auf Senior-Daten
           |-> RLS-Policies greifen sofort (is_care_helper_for() gibt false zurueck)
```

### Berechtigungsmatrix nach Rolle

| Berechtigung | neighbor | relative | care_service |
|---|---|---|---|
| SOS empfangen (Level 1) | Ja | - | - |
| SOS empfangen (Level 2) | - | Ja | - |
| SOS empfangen (Level 3) | - | - | Ja |
| Medikamente verwalten | Nein | Ja | Ja |
| Termine verwalten | Nein | Ja | Ja |
| Profil bearbeiten | Nein | Ja | Ja |
| Berichte erstellen | Nein | Ja | Ja |
| Dokumente einsehen | Nein | Ja | Ja |
| Check-ins einsehen | Ja | Ja | Ja |
| Audit-Log einsehen | Ja | Ja | Ja |

---

## 6. Eskalationslogik

### 4-Stufen-Kaskade

```
  Stufe 1              Stufe 2              Stufe 3              Stufe 4
  Nachbarn             Angehoerige          Pflegedienst         Leitstelle
    |                    |                    |                    |
    | 5 Min              | 15 Min             | 30 Min             |
    | (konfigurierbar)   | (konfigurierbar)   | (konfigurierbar)   |
    |                    |                    |                    |
  push               push                 push                 sms
  in_app             in_app               in_app               voice
                     sms                  sms                  admin_alert
                                          voice
```

### Zeitbasierte Schwellenwerte

| Parameter | Default | Konfiguration |
|---|---|---|
| Level 1 -> 2 | 5 Minuten | `care_profiles.escalation_config.escalate_to_level_2_after_minutes` |
| Level 2 -> 3 | 15 Minuten | `care_profiles.escalation_config.escalate_to_level_3_after_minutes` |
| Level 3 -> 4 | 30 Minuten | `care_profiles.escalation_config.escalate_to_level_4_after_minutes` |

Die Timeouts sind pro Senior in `care_profiles.escalation_config` konfigurierbar.

### Automatische Eskalation (Cron: jede Minute)

```
GET /api/care/cron/escalation
    |
    v
1. Offene Alerts laden:
   - status IN ('triggered', 'notified', 'escalated')
   - current_escalation_level < 4
    |
    v
2. Pro Alert: Eskalations-Check
   a) Referenzzeit bestimmen:
      - Letzter Eintrag in escalated_at[]
      - Oder created_at (wenn noch nicht eskaliert)
   b) Verstrichene Minuten berechnen
   c) Timeout aus escalation_config des Seniors laden
   d) elapsedMinutes >= timeout?
    |
    +--- Nein: Ueberspringen
    |
    +--- Ja: Eskalieren
         |
         v
3. Alert aktualisieren:
   - current_escalation_level += 1
   - escalated_at[] += now()
   - status = 'escalated'
    |
    v
4. Helfer der neuen Stufe benachrichtigen
   (Kanaele je nach Stufe, siehe Tabelle oben)
    |
    v
5. Audit-Log: 'sos_escalated' (automatic: true)
```

### Eskalations-Funktion (`lib/care/escalation.ts`)

| Funktion | Beschreibung |
|---|---|
| `shouldEscalate(level, createdAt, escalatedAt, config)` | Prueft ob Eskalation faellig ist |
| `getNextEscalationLevel(level)` | Gibt naechste Stufe zurueck (oder null bei Level 4) |
| `getEscalationMeta(level)` | Gibt Metadaten zurueck (Label, Rolle, Kanaele) |
| `minutesUntilEscalation(level, createdAt, escalatedAt, config)` | Berechnet verbleibende Minuten bis zur naechsten Eskalation |

---

## 7. Bericht-Generierung

### Ablauf: Bericht erstellen (`POST /api/care/reports`)

```
Angehoeriger/Pflegedienst startet Berichterstellung
    |
    v
1. Feature-Gate: 'reports' (ab Family-Plan)
    |
    v
2. Eingabe validieren:
   - type: care_report_daily | care_report_weekly | care_report_monthly |
           emergency_log | medication_report | care_aid_application |
           tax_summary | usage_report
   - period_start, period_end (Pflicht)
    |
    v
3. Daten sammeln (generateReportData):
   |
   +--- Senior-Profil: Name, Pflegegrad
   |
   +--- Check-ins im Zeitraum:
   |    - Gesamt, OK, Nicht-OK, Verpasst
   |    - Compliance-Rate (% ok / gesamt)
   |
   +--- Medikamenten-Logs:
   |    - Pro Medikament: genommen/uebersprungen/verpasst
   |    - Gesamt-Compliance-Rate
   |
   +--- SOS-Alerts:
   |    - Gesamt, aufgeloest, abgebrochen
   |    - Aufschluesselung nach Kategorie
   |
   +--- Termine:
   |    - Gesamt, vergangen, bevorstehend
   |
   +--- Letzte 50 Audit-Eintraege:
        - Zeitstempel, Ereignistyp (Label), Akteur-Name
    |
    v
4. Dokument in care_documents speichern:
   - Titel automatisch generieren
   - storage_path: reports/{seniorId}/{type}_{start}_{end}.json
   - file_size_bytes berechnen
    |
    v
5. Audit-Log: 'document_generated'
    |
    v
6. Antwort: Dokument-Metadaten mit Status 201
```

### Bericht-Daten abrufen (`GET /api/care/reports/data`)

```
Client ruft Bericht-Daten als JSON ab
    |
    v
1. Feature-Gate pruefen
    |
    v
2. generateReportData() ausfuehren
    |
    v
3. JSON-Antwort mit ReportData-Struktur:
   {
     type, senior, periodStart, periodEnd, generatedAt,
     checkins: { total, ok, notWell, missed, complianceRate },
     medications: { totalMedications, totalDoses, taken, skipped,
                    missed, overallComplianceRate, medications[] },
     sos: { total, resolved, cancelled, byCategory },
     appointments: { total, upcoming, past },
     recentActivity: [ { timestamp, eventType, eventLabel, actorName } ]
   }
```

### Print-to-PDF Ablauf (Client-seitig)

```
1. Client ruft GET /api/care/reports/data auf
    |
    v
2. Client rendert ReportData in HTML-Template
   (Tabellen, Diagramme, Zusammenfassung)
    |
    v
3. Browser-eigene Print-Funktion (window.print())
   oder Print-to-PDF
    |
    v
4. Nutzer speichert als PDF
```

---

## 8. Benachrichtigungskanaele

### Multi-Channel-Architektur (`lib/care/notifications.ts`)

```
sendCareNotification(supabase, payload)
    |
    v
Kanaele (parallel, je nach payload.channels):
    |
    +--- 'in_app':
    |       INSERT in notifications-Tabelle
    |       (user_id, type, title, body, reference_id)
    |
    +--- 'push':
    |       Web Push via /api/push/send
    |       (nutzt push_subscriptions Tabelle)
    |
    +--- 'sms':
    |       [STUB] Twilio SMS Integration
    |       (TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
    |
    +--- 'voice':
    |       [STUB] Twilio Voice Integration
    |       (TTS-Nachricht per Anruf)
    |
    +--- 'admin_alert':
            INSERT in notifications fuer ALLE Admins
            (type: 'care_escalation', Titel mit [ADMIN] Praefix)
```

### Kanal-Zuordnung nach Eskalationsstufe

| Stufe | Rolle | Kanaele |
|---|---|---|
| 1 | Nachbar | push, in_app |
| 2 | Angehoeriger | push, in_app, sms |
| 3 | Pflegedienst | push, in_app, sms, voice |
| 4 | Leitstelle/Admin | sms, voice, admin_alert |

### Stub-Status der Kanaele

| Kanal | Status | Abhaengigkeit |
|---|---|---|
| in_app | Implementiert | Supabase notifications-Tabelle |
| push | Implementiert | Web Push API, VAPID-Keys |
| sms | STUB (nur Logging) | Twilio SDK (geplant) |
| voice | STUB (nur Logging) | Twilio Voice SDK (geplant) |
| admin_alert | Implementiert | Supabase users-Tabelle (is_admin) |

---

## 9. Feature-Gates (Abo-Plaene)

### Plan-Feature-Matrix

| Feature | free | basic | family | professional | premium |
|---|---|---|---|---|---|
| checkin | Ja | Ja | Ja | Ja | Ja |
| medical_emergency_sos | Ja | Ja | Ja | Ja | Ja |
| sos_all | - | Ja | Ja | Ja | Ja |
| medications | - | Ja | Ja | Ja | Ja |
| appointments | - | Ja | Ja | Ja | Ja |
| relative_dashboard | - | - | Ja | Ja | Ja |
| reports | - | - | Ja | Ja | Ja |
| audit_log | - | - | Ja | Ja | Ja |
| multi_senior | - | - | - | Ja | Ja |
| care_dashboard | - | - | - | Ja | Ja |
| care_aid_forms | - | - | - | Ja | Ja |
| sim_fallback | - | - | - | - | Ja |
| sms_notifications | - | - | - | - | Ja |
| voice_notifications | - | - | - | - | Ja |
| priority_support | - | - | - | - | Ja |

### Feature-Gate-Pruefung im Code

```
canAccessFeature(supabase, seniorId, feature)
    |
    v
1. medical_emergency_sos -> immer true (Sicherheitspflicht)
    |
    v
2. Subscription des Seniors laden:
   - plan (default: 'free')
   - status muss 'active' oder 'trial' sein
    |
    v
3. hasFeature(plan, feature) pruefen
   (gegen PLAN_FEATURES Konstante)
    |
    v
4. true/false zurueckgeben
```

### Preisstruktur

| Plan | Preis | Beschreibung |
|---|---|---|
| Kostenlos | 0 EUR | Grundlegende Sicherheit (Check-in + Notfall-SOS) |
| Basis | ab 4,99 EUR/Monat | Alltagshilfe |
| Familie | ab 9,99 EUR/Monat | Fuer Angehoerige (empfohlen) |
| Professionell | ab 19,99 EUR/Monat | Fuer Pflegedienste |
| Premium | ab 29,99 EUR/Monat | Rundum-Schutz mit SMS/Voice |

---

## API-Endpunkte Uebersicht

### SOS

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/sos` | POST | SOS ausloesen |
| `/api/care/sos` | GET | Aktive SOS-Alerts auflisten |
| `/api/care/sos/[id]` | GET | Einzelnen Alert mit Responses laden |
| `/api/care/sos/[id]` | PATCH | Alert schliessen/abbrechen |
| `/api/care/sos/[id]/respond` | POST | Als Helfer reagieren |
| `/api/care/sos/[id]/escalate` | POST | Manuell eskalieren |

### Check-in

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/checkin` | POST | Check-in abgeben |
| `/api/care/checkin` | GET | Check-in-Historie |
| `/api/care/checkin/status` | GET | Heutiger Check-in-Status |

### Medikamente

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/medications` | GET | Medikamente auflisten |
| `/api/care/medications` | POST | Medikament anlegen |
| `/api/care/medications/[id]` | GET | Einzelnes Medikament |
| `/api/care/medications/[id]` | PATCH | Medikament aktualisieren |
| `/api/care/medications/[id]` | DELETE | Medikament deaktivieren (soft) |
| `/api/care/medications/due` | GET | Heute faellige Medikamente |
| `/api/care/medications/log` | POST | Einnahme protokollieren |
| `/api/care/medications/log` | GET | Log-Historie |

### Termine

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/appointments` | GET | Termine auflisten |
| `/api/care/appointments` | POST | Termin anlegen |
| `/api/care/appointments/[id]` | GET | Einzelnen Termin laden |
| `/api/care/appointments/[id]` | PATCH | Termin aktualisieren |
| `/api/care/appointments/[id]` | DELETE | Termin loeschen |

### Helfer

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/helpers` | GET | Helfer auflisten |
| `/api/care/helpers` | POST | Als Helfer registrieren |
| `/api/care/helpers/[id]` | GET | Helfer-Details |
| `/api/care/helpers/[id]` | PATCH | Verifizieren/Aktualisieren |

### Berichte

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/reports` | GET | Dokumente auflisten |
| `/api/care/reports` | POST | Bericht generieren |
| `/api/care/reports/[id]` | GET | Einzelnes Dokument laden |
| `/api/care/reports/data` | GET | Bericht-Daten als JSON |

### System

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/care/health` | GET | Gesundheits-Check (oeffentlich) |
| `/api/care/stats` | GET | Statistiken |
| `/api/care/subscriptions` | GET/POST | Abo-Verwaltung |

### Cron-Jobs

| Endpunkt | Intervall | Beschreibung |
|---|---|---|
| `/api/care/cron/escalation` | Jede Minute | Automatische SOS-Eskalation |
| `/api/care/cron/checkin` | Alle 5 Min | Check-in erstellen/erinnern/eskalieren |
| `/api/care/cron/medications` | Alle 5 Min | Medikamenten-Erinnerungen/Verpasst |
| `/api/care/cron/appointments` | Alle 5 Min | Termin-Erinnerungen versenden |
