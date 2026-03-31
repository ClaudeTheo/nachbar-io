# Nachbar.io Care-Modul — Datenbankschema

> Dokumentation aller care_*-Tabellen, RLS-Policies, Beziehungen und Audit-Mechanismen.
> Basierend auf den Migrationen 019-032 (`supabase/migrations/`).

---

## Inhaltsverzeichnis

1. [Gemeinsame Funktionen](#1-gemeinsame-funktionen)
2. [Tabellen-Uebersicht](#2-tabellen-uebersicht)
3. [Tabellen im Detail](#3-tabellen-im-detail)
4. [RLS-Policies Zusammenfassung](#4-rls-policies-zusammenfassung)
5. [Fremdschluessel-Beziehungen](#5-fremdschluessel-beziehungen)
6. [Append-Only Audit-Log](#6-append-only-audit-log)
7. [Verschluesselte Felder](#7-verschluesselte-felder)
8. [Entity-Relationship Uebersicht](#8-entity-relationship-uebersicht)

---

## 1. Gemeinsame Funktionen

Migration `019_care_shared_functions.sql` definiert Hilfsfunktionen, die von allen Care-Tabellen genutzt werden:

| Funktion | Typ | Beschreibung |
|---|---|---|
| `care_update_updated_at()` | TRIGGER | Setzt `updated_at = now()` bei jedem UPDATE |
| `is_care_helper_for(p_senior_id uuid)` | SECURITY DEFINER | Prueft ob der aktuelle User ein verifizierter Helfer fuer den Senior ist |
| `care_helper_role(p_senior_id uuid)` | SECURITY DEFINER | Gibt die Helfer-Rolle (`neighbor`, `relative`, `care_service`) zurueck |
| `prevent_audit_modification()` | TRIGGER | Blockiert UPDATE/DELETE auf `care_audit_log` mit Exception |

---

## 2. Tabellen-Uebersicht

| # | Tabelle | Migration | Beschreibung |
|---|---|---|---|
| 1 | `care_profiles` | 020 | Pflegeprofil eines Seniors (Pflegegrad, Notfallkontakte, Check-in-Zeiten) |
| 2 | `care_sos_alerts` | 021 | SOS-Alarme mit Eskalationsstufen |
| 3 | `care_sos_responses` | 022 | Reaktionen von Helfern auf SOS-Alarme |
| 4 | `care_checkins` | 023 | Taegliche Check-ins (geplant, erinnert, abgeschlossen, verpasst) |
| 5 | `care_medications` | 024 | Medikamenten-Stammdaten mit Einnahmeplan |
| 6 | `care_medication_logs` | 025 | Einnahme-Protokolle (taken/skipped/snoozed/missed) |
| 7 | `care_appointments` | 026 | Termine mit Erinnerungsintervallen |
| 8 | `care_helpers` | 027 | Helfer-Registrierung, Verifizierung, Zuweisungen |
| 9 | `care_audit_log` | 028 | Revisionssicheres Aktivitaetsprotokoll (append-only) |
| 10 | `care_documents` | 029 | Generierte Berichte und Dokumente |
| 11 | `care_subscriptions` | 030 | Abo-Plaene und Abrechnungsstatus |

Zusaetzlich:
- Migration 031 erweitert die bestehende `notifications`-Tabelle um Care-spezifische Typen.
- Migration 032 migriert bestehende `senior_checkins`-Daten nach `care_checkins`.

---

## 3. Tabellen im Detail

### 3.1 care_profiles

```
Migration: 020_care_profiles.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `user_id` | uuid | NOT NULL, UNIQUE, FK -> users(id) ON DELETE CASCADE | — | Zugehoeriger User |
| `care_level` | text | CHECK IN ('none','1','2','3','4','5') | `'none'` | Pflegegrad |
| `emergency_contacts` | jsonb | — | `'[]'` | Notfallkontakte (verschluesselte Telefonnummern) |
| `medical_notes` | text | — | — | Medizinische Hinweise |
| `preferred_hospital` | text | — | — | Bevorzugtes Krankenhaus |
| `insurance_number` | text | — | — | Versicherungsnummer |
| `checkin_times` | jsonb | — | `'["08:00","20:00"]'` | Geplante Check-in-Uhrzeiten |
| `checkin_enabled` | boolean | — | `true` | Check-ins aktiviert |
| `escalation_config` | jsonb | — | `{"escalate_to_level_2_after_minutes":5,...}` | Eskalations-Timeout-Konfiguration |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |
| `updated_at` | timestamptz | — | `now()` | Letztes Update (Trigger) |

**Trigger:** `care_profiles_updated_at` -> `care_update_updated_at()`

---

### 3.2 care_sos_alerts

```
Migration: 021_care_sos_alerts.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `senior_id` | uuid | NOT NULL, FK -> users(id) | — | Betroffener Senior |
| `category` | text | NOT NULL, CHECK IN ('medical_emergency','general_help','visit_wanted','shopping','medication_help') | — | SOS-Kategorie |
| `status` | text | NOT NULL, CHECK IN ('triggered','notified','accepted','helper_enroute','resolved','cancelled','escalated') | `'triggered'` | Aktueller Status |
| `current_escalation_level` | int | CHECK BETWEEN 1 AND 4 | `1` | Eskalationsstufe |
| `escalated_at` | timestamptz[] | — | `'{}'` | Array der Eskalations-Zeitstempel |
| `accepted_by` | uuid | FK -> users(id) | — | Helfer, der angenommen hat |
| `resolved_by` | uuid | FK -> users(id) | — | Wer den Alert geschlossen hat |
| `resolved_at` | timestamptz | — | — | Abschlusszeitpunkt |
| `notes` | text | — | — | Zusatznotizen |
| `source` | text | CHECK IN ('app','device','checkin_timeout') | `'app'` | Ausloesequelle |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |

**Indizes:**
- `idx_care_sos_status` auf `status`
- `idx_care_sos_senior` auf `senior_id`
- `idx_care_sos_escalation` auf `(status, current_escalation_level, created_at)`

---

### 3.3 care_sos_responses

```
Migration: 022_care_sos_responses.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `sos_alert_id` | uuid | NOT NULL, FK -> care_sos_alerts(id) ON DELETE CASCADE | — | Zugehoeriger SOS-Alert |
| `helper_id` | uuid | NOT NULL, FK -> users(id) | — | Reagierender Helfer |
| `response_type` | text | NOT NULL, CHECK IN ('accepted','declined','arrived','completed') | — | Art der Reaktion |
| `eta_minutes` | int | — | — | Geschaetzte Ankunftszeit in Minuten |
| `note` | text | — | — | Optionale Notiz |
| `created_at` | timestamptz | — | `now()` | Zeitpunkt der Reaktion |

---

### 3.4 care_checkins

```
Migration: 023_care_checkins.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `senior_id` | uuid | NOT NULL, FK -> users(id) | — | Senior |
| `status` | text | NOT NULL, CHECK IN ('ok','not_well','need_help','missed','reminded') | — | Check-in-Status |
| `mood` | text | CHECK IN ('good','neutral','bad') | — | Stimmungswert |
| `note` | text | — | — | Freitext-Notiz |
| `scheduled_at` | timestamptz | NOT NULL | — | Geplanter Check-in-Zeitpunkt |
| `completed_at` | timestamptz | — | — | Abschlusszeitpunkt |
| `reminder_sent_at` | timestamptz | — | — | Zeitpunkt der zweiten Erinnerung |
| `escalated` | boolean | — | `false` | Wurde an Helfer eskaliert? |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |

**Indizes:**
- `idx_care_checkins_senior` auf `senior_id`
- `idx_care_checkins_scheduled` auf `scheduled_at`

---

### 3.5 care_medications

```
Migration: 024_care_medications.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `senior_id` | uuid | NOT NULL, FK -> users(id) | — | Senior |
| `name` | text | NOT NULL | — | Medikamentenname |
| `dosage` | text | — | — | Dosierung (z.B. "500mg") |
| `schedule` | jsonb | NOT NULL | — | Einnahmeplan (daily/weekly/interval) |
| `instructions` | text | — | — | Einnahmehinweise |
| `managed_by` | uuid | FK -> users(id) | — | Verwalter (Angehoeriger/Pflegedienst) |
| `active` | boolean | — | `true` | Aktiv (soft-delete bei false) |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |
| `updated_at` | timestamptz | — | `now()` | Letztes Update (Trigger) |

**Trigger:** `care_medications_updated_at` -> `care_update_updated_at()`

**Schedule-Format (jsonb):**
```json
// Taeglich:
{ "type": "daily", "times": ["08:00", "13:00", "20:00"] }

// Woechentlich:
{ "type": "weekly", "days": ["Montag", "Mittwoch", "Freitag"], "time": "09:00" }

// Intervall:
{ "type": "interval", "every_hours": 8 }
```

---

### 3.6 care_medication_logs

```
Migration: 025_care_medication_logs.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `medication_id` | uuid | NOT NULL, FK -> care_medications(id) ON DELETE CASCADE | — | Zugehoeriges Medikament |
| `senior_id` | uuid | NOT NULL, FK -> users(id) | — | Senior |
| `scheduled_at` | timestamptz | NOT NULL | — | Geplanter Einnahmezeitpunkt |
| `status` | text | NOT NULL, CHECK IN ('taken','skipped','snoozed','missed') | — | Einnahmestatus |
| `confirmed_at` | timestamptz | — | — | Bestaetigung (bei 'taken') |
| `snoozed_until` | timestamptz | — | — | Verschoben bis (bei 'snoozed') |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |

**Indizes:**
- `idx_care_med_logs_senior` auf `senior_id`
- `idx_care_med_logs_scheduled` auf `scheduled_at`

---

### 3.7 care_appointments

```
Migration: 026_care_appointments.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `senior_id` | uuid | NOT NULL, FK -> users(id) | — | Senior |
| `title` | text | NOT NULL | — | Termintitel |
| `type` | text | CHECK IN ('doctor','care_service','therapy','other') | `'other'` | Terminart |
| `scheduled_at` | timestamptz | NOT NULL | — | Terminzeitpunkt |
| `duration_minutes` | int | — | `60` | Dauer in Minuten |
| `location` | text | — | — | Ort |
| `reminder_minutes_before` | int[] | — | `'{60,15}'` | Erinnerungsintervalle (Minuten vor Termin) |
| `recurrence` | jsonb | — | — | Wiederholungsregel (optional) |
| `managed_by` | uuid | FK -> users(id) | — | Verwalter |
| `notes` | text | — | — | Zusatznotizen |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |
| `updated_at` | timestamptz | — | `now()` | Letztes Update (Trigger) |

**Trigger:** `care_appointments_updated_at` -> `care_update_updated_at()`

---

### 3.8 care_helpers

```
Migration: 027_care_helpers.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `user_id` | uuid | NOT NULL, UNIQUE, FK -> users(id) | — | Zugehoeriger User |
| `role` | text | NOT NULL, CHECK IN ('neighbor','relative','care_service') | — | Helfer-Rolle |
| `verification_status` | text | CHECK IN ('pending','verified','revoked') | `'pending'` | Verifizierungsstatus |
| `verified_by` | uuid | FK -> users(id) | — | Admin, der verifiziert hat |
| `assigned_seniors` | uuid[] | — | `'{}'` | Zugewiesene Senioren (Array) |
| `availability` | jsonb | — | — | Verfuegbarkeitszeiten |
| `skills` | text[] | — | `'{}'` | Faehigkeiten/Qualifikationen |
| `response_count` | int | — | `0` | Anzahl Reaktionen |
| `avg_response_minutes` | float | — | — | Durchschnittliche Reaktionszeit |
| `created_at` | timestamptz | — | `now()` | Registrierungszeitpunkt |
| `updated_at` | timestamptz | — | `now()` | Letztes Update (Trigger) |

**Index:** `idx_care_helpers_assigned` GIN-Index auf `assigned_seniors` (fuer Array-Contains-Abfragen)

**Trigger:** `care_helpers_updated_at` -> `care_update_updated_at()`

---

### 3.9 care_audit_log

```
Migration: 028_care_audit_log.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `senior_id` | uuid | NOT NULL, FK -> users(id) | — | Betroffener Senior |
| `actor_id` | uuid | NOT NULL, FK -> users(id) | — | Handelnde Person (oder 'system') |
| `event_type` | text | NOT NULL, CHECK IN (22 Werte, siehe unten) | — | Ereignistyp |
| `reference_type` | text | — | — | Referenz-Tabelle |
| `reference_id` | uuid | — | — | Referenz-Datensatz-ID |
| `metadata` | jsonb | — | `'{}'` | Zusaetzliche strukturierte Daten |
| `created_at` | timestamptz | NOT NULL | `now()` | Zeitstempel (unveraenderlich) |

**Erlaubte event_type-Werte:**
- SOS: `sos_triggered`, `sos_accepted`, `sos_resolved`, `sos_escalated`, `sos_cancelled`
- Check-in: `checkin_ok`, `checkin_not_well`, `checkin_missed`, `checkin_escalated`
- Medikamente: `medication_taken`, `medication_skipped`, `medication_missed`, `medication_snoozed`
- Termine: `appointment_confirmed`, `appointment_missed`
- Sonstiges: `visit_logged`, `helper_registered`, `helper_verified`, `document_generated`, `profile_updated`, `subscription_changed`

**Indizes:**
- `idx_care_audit_senior` auf `senior_id`
- `idx_care_audit_created` auf `created_at`

**Append-Only Trigger (siehe Abschnitt 6):**
- `no_audit_update` BEFORE UPDATE -> `prevent_audit_modification()`
- `no_audit_delete` BEFORE DELETE -> `prevent_audit_modification()`

---

### 3.10 care_documents

```
Migration: 029_care_documents.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `senior_id` | uuid | NOT NULL, FK -> users(id) | — | Zugehoeriger Senior |
| `type` | text | NOT NULL, CHECK IN (8 Werte) | — | Dokumenttyp |
| `title` | text | NOT NULL | — | Anzeigename |
| `period_start` | date | — | — | Berichtszeitraum Start |
| `period_end` | date | — | — | Berichtszeitraum Ende |
| `generated_by` | uuid | NOT NULL, FK -> users(id) | — | Wer den Bericht erstellt hat |
| `storage_path` | text | NOT NULL | — | Pfad im Supabase Storage |
| `file_size_bytes` | int | — | — | Dateigroesse |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |

**Erlaubte type-Werte:**
`care_report_daily`, `care_report_weekly`, `care_report_monthly`, `emergency_log`, `medication_report`, `care_aid_application`, `tax_summary`, `usage_report`

---

### 3.11 care_subscriptions

```
Migration: 030_care_subscriptions.sql
```

| Spalte | Typ | Constraints | Default | Beschreibung |
|---|---|---|---|---|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Primaerschluessel |
| `user_id` | uuid | NOT NULL, UNIQUE, FK -> users(id) ON DELETE CASCADE | — | Zugehoeriger User |
| `plan` | text | CHECK IN ('free','basic','family','professional','premium') | `'free'` | Abo-Plan |
| `status` | text | CHECK IN ('active','trial','cancelled','expired') | `'trial'` | Abo-Status |
| `trial_ends_at` | timestamptz | — | — | Trial-Enddatum |
| `current_period_start` | date | — | — | Aktuelle Abrechnungsperiode Start |
| `current_period_end` | date | — | — | Aktuelle Abrechnungsperiode Ende |
| `payment_provider` | text | — | — | Zahlungsanbieter |
| `external_subscription_id` | text | — | — | Externe Abo-ID (Zahlungsanbieter) |
| `created_at` | timestamptz | — | `now()` | Erstellungszeitpunkt |
| `updated_at` | timestamptz | — | `now()` | Letztes Update (Trigger) |

**Trigger:** `care_subscriptions_updated_at` -> `care_update_updated_at()`

---

### 3.12 notifications (Erweiterung)

```
Migration: 031_care_notifications_update.sql
```

Die bestehende `notifications`-Tabelle wird um folgende Care-spezifische Typen erweitert:

| Neuer Typ | Beschreibung |
|---|---|
| `care_sos` | Neuer SOS-Alert |
| `care_sos_response` | Reaktion auf SOS |
| `care_checkin_reminder` | Check-in-Erinnerung |
| `care_checkin_missed` | Verpasster Check-in |
| `care_medication_reminder` | Medikamenten-Erinnerung |
| `care_medication_missed` | Verpasstes Medikament |
| `care_appointment_reminder` | Termin-Erinnerung |
| `care_escalation` | Eskalations-Benachrichtigung |
| `care_helper_verified` | Helfer-Verifizierung |

---

## 4. RLS-Policies Zusammenfassung

Alle Care-Tabellen haben `ROW LEVEL SECURITY` aktiviert. Das Berechtigungsmodell folgt einem 3-Stufen-Schema:

| Stufe | Berechtigung | Pruefregel |
|---|---|---|
| Eigene Daten | Senior sieht/aendert eigene Daten | `user_id = auth.uid()` oder `senior_id = auth.uid()` |
| Helfer-Zugriff | Verifizierte Helfer sehen Daten ihrer zugewiesenen Senioren | `is_care_helper_for(senior_id)` |
| Admin-Zugriff | Administratoren sehen alle Daten | `is_admin()` |

### Detaillierte RLS-Policies pro Tabelle

| Tabelle | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `care_profiles` | own + helper + admin | own | own + helper(relative/care_service) + admin | - |
| `care_sos_alerts` | own + helper + admin | own | own + helper + admin | - |
| `care_sos_responses` | helper/senior des Alerts + admin | helper (eigene) | - | - |
| `care_checkins` | own + helper + admin | own | own + admin | - |
| `care_medications` | own + helper + admin | own + helper(relative/care_service) + admin | managed_by + helper(relative/care_service) + admin | - |
| `care_medication_logs` | own + helper + admin | own | - | - |
| `care_appointments` | own + helper + admin | own + helper(relative/care_service) + admin | managed_by + helper(relative/care_service) + admin | managed_by + helper(relative/care_service) + admin |
| `care_helpers` | alle verifizierten Mitglieder | own | own + admin | - |
| `care_audit_log` | own + helper + admin | authentifiziert | BLOCKIERT (Trigger) | BLOCKIERT (Trigger) |
| `care_documents` | own + helper + admin | helper(relative/care_service) + admin | - | - |
| `care_subscriptions` | own + admin | own | own + admin | - |

**Anmerkungen:**
- `helper(relative/care_service)` bedeutet: nur Helfer mit der Rolle `relative` oder `care_service` (nicht `neighbor`)
- Die `care_audit_log`-Tabelle erlaubt INSERT fuer alle authentifizierten User, blockiert aber UPDATE und DELETE per Trigger
- `care_helpers` SELECT ist fuer alle verifizierten Quartiersmitglieder offen (`is_verified_member()`)

---

## 5. Fremdschluessel-Beziehungen

```
users (Haupt-Tabelle)
  |
  |--- 1:1 --- care_profiles (user_id -> users.id, ON DELETE CASCADE)
  |--- 1:1 --- care_subscriptions (user_id -> users.id, ON DELETE CASCADE)
  |--- 1:1 --- care_helpers (user_id -> users.id, UNIQUE)
  |
  |--- 1:N --- care_sos_alerts (senior_id -> users.id)
  |               |--- 1:N --- care_sos_responses (sos_alert_id -> care_sos_alerts.id, ON DELETE CASCADE)
  |
  |--- 1:N --- care_checkins (senior_id -> users.id)
  |
  |--- 1:N --- care_medications (senior_id -> users.id)
  |               |--- 1:N --- care_medication_logs (medication_id -> care_medications.id, ON DELETE CASCADE)
  |
  |--- 1:N --- care_appointments (senior_id -> users.id)
  |
  |--- 1:N --- care_audit_log (senior_id -> users.id, actor_id -> users.id)
  |
  |--- 1:N --- care_documents (senior_id -> users.id, generated_by -> users.id)
```

### Zusaetzliche Fremdschluessel innerhalb der Care-Tabellen:

| Von | Spalte | Nach | ON DELETE |
|---|---|---|---|
| `care_profiles` | `user_id` | `users(id)` | CASCADE |
| `care_sos_alerts` | `senior_id` | `users(id)` | - |
| `care_sos_alerts` | `accepted_by` | `users(id)` | - |
| `care_sos_alerts` | `resolved_by` | `users(id)` | - |
| `care_sos_responses` | `sos_alert_id` | `care_sos_alerts(id)` | CASCADE |
| `care_sos_responses` | `helper_id` | `users(id)` | - |
| `care_checkins` | `senior_id` | `users(id)` | - |
| `care_medications` | `senior_id` | `users(id)` | - |
| `care_medications` | `managed_by` | `users(id)` | - |
| `care_medication_logs` | `medication_id` | `care_medications(id)` | CASCADE |
| `care_medication_logs` | `senior_id` | `users(id)` | - |
| `care_appointments` | `senior_id` | `users(id)` | - |
| `care_appointments` | `managed_by` | `users(id)` | - |
| `care_helpers` | `user_id` | `users(id)` | - |
| `care_helpers` | `verified_by` | `users(id)` | - |
| `care_audit_log` | `senior_id` | `users(id)` | - |
| `care_audit_log` | `actor_id` | `users(id)` | - |
| `care_documents` | `senior_id` | `users(id)` | - |
| `care_documents` | `generated_by` | `users(id)` | - |
| `care_subscriptions` | `user_id` | `users(id)` | CASCADE |

---

## 6. Append-Only Audit-Log

Die Tabelle `care_audit_log` ist revisionssicher implementiert:

### Mechanismus

1. **BEFORE UPDATE Trigger** (`no_audit_update`): Wirft eine Exception bei jedem UPDATE-Versuch.
2. **BEFORE DELETE Trigger** (`no_audit_delete`): Wirft eine Exception bei jedem DELETE-Versuch.
3. Beide nutzen die Funktion `prevent_audit_modification()`, die folgende Fehlermeldung wirft:
   `care_audit_log: UPDATE und DELETE sind nicht erlaubt (revisionssicher)`

### Konsequenzen

- Eintraege koennen nur per INSERT hinzugefuegt werden
- Bestehende Eintraege sind unveraenderlich (immutable)
- Auch Administratoren koennen keine Eintraege aendern oder loeschen
- Der `created_at`-Zeitstempel ist `NOT NULL` und per Default `now()` gesetzt
- Kein `updated_at`-Feld vorhanden (nicht noetig bei append-only)

### Anwendung im Code

Die Funktion `writeAuditLog()` in `lib/care/audit.ts` kapselt alle INSERT-Operationen. Audit-Fehler werden geloggt, blockieren aber niemals den Hauptprozess.

---

## 7. Verschluesselte Felder

### AES-256-GCM Verschluesselung

Die Verschluesselung wird in `lib/care/crypto.ts` implementiert:

| Parameter | Wert |
|---|---|
| Algorithmus | AES-256-GCM |
| Schluessel | `CARE_ENCRYPTION_KEY` (Umgebungsvariable, 32 Bytes / 64 Hex-Zeichen) |
| IV-Laenge | 16 Bytes (zufaellig generiert) |
| Auth-Tag-Laenge | 16 Bytes |
| Speicherformat | `aes256gcm:<iv_base64>:<authTag_base64>:<ciphertext_base64>` |

### Verschluesselte Datenfelder

| Tabelle | Feld | Beschreibung |
|---|---|---|
| `care_profiles` | `emergency_contacts` -> `phone` (AES-256-GCM) | Telefonnummern der Notfallkontakte innerhalb des JSONB, verschluesselt gespeichert |
| `care_profiles` | `insurance_number` | Krankenversicherungsnummer |

**Hinweis:** Die Verschluesselung erfolgt auf Anwendungsebene (Application-Level Encryption), nicht in der Datenbank. Die Werte werden vor dem INSERT verschluesselt und nach dem SELECT entschluesselt.

---

## 8. Entity-Relationship Uebersicht

```
+------------------+        +--------------------+        +---------------------+
|     users        |        |   care_profiles    |        |  care_subscriptions |
|------------------|  1:1   |--------------------|  1:1   |---------------------|
| id (PK)          |------->| user_id (FK,UQ)    |<-------| user_id (FK,UQ)     |
| display_name     |        | care_level         |        | plan                |
| is_admin         |        | emergency_contacts |        | status              |
+------------------+        | checkin_times      |        | trial_ends_at       |
       |                    | escalation_config  |        +---------------------+
       |                    +--------------------+
       |
       |  1:N                          1:N                         1:N
       +---------->+------------------+    +------------------+    +--------------------+
       |           | care_sos_alerts  |    | care_checkins    |    | care_appointments  |
       |           |------------------|    |------------------|    |--------------------|
       |           | senior_id (FK)   |    | senior_id (FK)   |    | senior_id (FK)     |
       |           | category         |    | status           |    | title              |
       |           | status           |    | mood             |    | type               |
       |           | escalation_level |    | scheduled_at     |    | scheduled_at       |
       |           | accepted_by (FK) |    | completed_at     |    | reminder_min_before|
       |           +------------------+    | escalated        |    | managed_by (FK)    |
       |                |                  +------------------+    +--------------------+
       |                | 1:N
       |                v
       |           +--------------------+
       |           | care_sos_responses |
       |           |--------------------|
       |           | sos_alert_id (FK)  |
       |           | helper_id (FK)     |
       |           | response_type      |
       |           | eta_minutes        |
       |           +--------------------+
       |
       |  1:N                                    1:N
       +---------->+------------------+          +--------------------+
       |           | care_medications |          |  care_helpers      |
       |           |------------------|          |--------------------|
       |           | senior_id (FK)   |          | user_id (FK,UQ)    |
       |           | name             |          | role               |
       |           | schedule (jsonb) |          | verification_status|
       |           | managed_by (FK)  |          | assigned_seniors[] |
       |           +------------------+          | verified_by (FK)   |
       |                |                        +--------------------+
       |                | 1:N
       |                v
       |           +----------------------+
       |           | care_medication_logs |
       |           |----------------------|
       |           | medication_id (FK)   |
       |           | senior_id (FK)       |
       |           | status               |
       |           | snoozed_until        |
       |           +----------------------+
       |
       |  1:N                                    1:N
       +---------->+------------------+          +--------------------+
                   | care_audit_log   |          |  care_documents    |
                   |------------------|          |--------------------|
                   | senior_id (FK)   |          | senior_id (FK)     |
                   | actor_id (FK)    |          | type               |
                   | event_type       |          | generated_by (FK)  |
                   | reference_type   |          | storage_path       |
                   | reference_id     |          +--------------------+
                   | [APPEND-ONLY]    |
                   +------------------+
```

---

## Migrationsreihenfolge

Die Migrationen muessen in numerischer Reihenfolge ausgefuehrt werden, da Abhaengigkeiten bestehen:

1. **019** — Shared Functions (muessen vor allen Tabellen existieren)
2. **020-027** — Tabellen (unabhaengig voneinander, aber alle benoetigen 019)
3. **028** — Audit-Log (referenziert users, nutzt `prevent_audit_modification` aus 019)
4. **029-030** — Documents und Subscriptions
5. **031** — Notifications-Erweiterung (ALTER auf bestehende Tabelle)
6. **032** — Datenmigration (benoetigt `care_checkins` aus 023)
