# Nachbar.io Care-Modul — API-Referenz

Vollstaendige Dokumentation aller REST-Endpunkte des Care-Moduls (`/api/care/*`).

**Basis-URL:** `/api/care`
**Authentifizierung:** Supabase Auth (JWT via Cookie)
**Cron-Autorisierung:** `Authorization: Bearer <CRON_SECRET>` Header

---

## Inhaltsverzeichnis

1. [SOS-System](#1-sos-system)
2. [Check-in-System](#2-check-in-system)
3. [Medikamenten-Verwaltung](#3-medikamenten-verwaltung)
4. [Termin-Verwaltung](#4-termin-verwaltung)
5. [Helfer-Verwaltung](#5-helfer-verwaltung)
6. [Berichte & Dokumente](#6-berichte--dokumente)
7. [Abonnements](#7-abonnements)
8. [Statistiken](#8-statistiken)
9. [Gesundheits-Check](#9-gesundheits-check)
10. [Cron-Jobs](#10-cron-jobs)

---

## 1. SOS-System

### POST `/api/care/sos` — SOS ausloesen

Loest einen neuen SOS-Alert aus und benachrichtigt Level-1-Helfer (Nachbarn).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | `medical_emergency_sos` (Kategorie `medical_emergency`) oder `sos_all` (alle anderen) |

**Request Body:**

```typescript
{
  category: CareSosCategory;      // Pflicht — z.B. 'medical_emergency', 'general_help'
  notes?: string;                 // Optional — Freitext-Hinweis
  source?: CareSosSource;         // Optional — Standard: 'app'
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | SOS-Alert erfolgreich erstellt. Gibt das Alert-Objekt zurueck. |
| `400` | Kategorie fehlt oder ungueltig. |
| `401` | Nicht authentifiziert. |
| `403` | Feature nicht im aktuellen Abo-Plan enthalten. |
| `500` | Datenbank-Fehler beim Erstellen. |

---

### GET `/api/care/sos` — Aktive SOS-Alerts abrufen

Listet aktive SOS-Alerts mit Antworten und Senior-Profil.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `status` | `string` | Komma-getrennte Statusliste. Standard: `triggered,notified,accepted,helper_enroute,escalated` |
| `senior_id` | `string` | Optional — filtert nach Senior-ID |

**Antwort (200):**

```typescript
Array<CareSosAlert & {
  responses: Array<{
    id: string;
    helper_id: string;
    response_type: CareSosResponseType;
    eta_minutes: number | null;
    note: string | null;
    created_at: string;
    helper: { display_name: string; avatar_url: string | null };
  }>;
  senior: { display_name: string; avatar_url: string | null };
}>
```

| Status | Beschreibung |
|---|---|
| `200` | Liste der Alerts (kann leer sein). |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/sos/[id]` — Einzelnen SOS-Alert abrufen

Laedt einen SOS-Alert mit allen Antworten und Senior-Profil.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Pfad-Parameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `id` | `string` (UUID) | ID des SOS-Alerts |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Alert-Objekt mit Antworten und Senior-Profil. |
| `401` | Nicht authentifiziert. |
| `404` | Alert nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

### PATCH `/api/care/sos/[id]` — SOS-Alert schliessen oder abbrechen

Setzt den Status auf `resolved` oder `cancelled`.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:**

```typescript
{
  status: 'resolved' | 'cancelled';  // Pflicht
  notes?: string;                     // Optional — Abschlussnotiz
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Aktualisiertes Alert-Objekt. |
| `400` | Status fehlt oder ungueltig (nur `resolved`, `cancelled` erlaubt). |
| `401` | Nicht authentifiziert. |
| `404` | Alert nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/sos/[id]/respond` — Auf SOS-Alert reagieren

Ein Helfer reagiert auf einen aktiven Alert (annehmen, ablehnen, eingetroffen, abgeschlossen).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:**

```typescript
{
  response_type: 'accepted' | 'declined' | 'arrived' | 'completed';  // Pflicht
  eta_minutes?: number;   // Optional — geschaetzte Ankunftszeit in Minuten
  note?: string;          // Optional — Freitext
}
```

**Seiteneffekte:**
- Bei `accepted`: Alert-Status wird auf `accepted` gesetzt, Senior wird per Push benachrichtigt.
- Bei `arrived`: Alert-Status wird auf `helper_enroute` gesetzt.

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | Reaktion gespeichert. |
| `400` | Reaktionstyp fehlt oder ungueltig. |
| `401` | Nicht authentifiziert. |
| `404` | Alert nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/sos/[id]/escalate` — SOS-Alert manuell eskalieren

Hebt den Alert auf die naechste Eskalationsstufe (1 -> 2 -> 3 -> 4).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:** Keiner erforderlich.

**Eskalationsstufen:**

| Stufe | Rolle | Kanaele |
|---|---|---|
| 1 | Nachbarn (`neighbor`) | Push, In-App |
| 2 | Angehoerige (`relative`) | Push, In-App, SMS |
| 3 | Pflegedienst (`care_service`) | Push, In-App, SMS, Voice |
| 4 | Kein Helfer (Admin-Alert) | Admin-Alert |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Aktualisiertes Alert-Objekt mit neuer Eskalationsstufe. |
| `400` | Maximale Eskalationsstufe (4) bereits erreicht. |
| `401` | Nicht authentifiziert. |
| `404` | Alert nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

## 2. Check-in-System

### POST `/api/care/checkin` — Check-in abgeben

Senior meldet seinen Zustand. Bei `need_help` wird automatisch ein SOS-Alert erstellt.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:**

```typescript
{
  status: 'ok' | 'not_well' | 'need_help';  // Pflicht
  mood?: CareCheckinMood;                    // Optional — Stimmung
  note?: string;                             // Optional — Freitext
  scheduled_at?: string;                     // Optional — ISO-Zeitstempel des geplanten Check-ins
}
```

**Seiteneffekte:**
- Bei `not_well`: Angehoerige werden per Push benachrichtigt.
- Bei `need_help`: SOS-Alert (Kategorie `general_help`, Quelle `checkin_timeout`) wird automatisch erstellt.
- Falls `scheduled_at` angegeben: bestehender ausstehender Check-in wird aktualisiert (Upsert).

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | Check-in gespeichert. |
| `400` | Status fehlt oder ungueltig. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/checkin` — Check-in-Historie abrufen

Gibt die letzten Check-ins eines Seniors zurueck.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | Eingeloggter User | Senior-ID |
| `limit` | `number` | `30` | Maximale Anzahl (1-100) |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Array von Check-in-Objekten, absteigend nach `scheduled_at`. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/checkin/status` — Heutiger Check-in-Status

Gibt den Tages-Check-in-Status mit Fortschritt und naechstem faelligen Zeitpunkt zurueck.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | Eingeloggter User | Senior-ID |

**Antwort (200):**

```typescript
{
  today: CareCheckin[];        // Heutige Check-ins
  checkinTimes: string[];      // Konfigurierte Zeiten (z.B. ['08:00', '12:00', '18:00'])
  checkinEnabled: boolean;     // Ob Check-ins aktiviert sind
  completedCount: number;      // Abgeschlossene heute
  totalCount: number;          // Gesamtzahl konfigurierter Zeiten
  nextDue: string | null;      // Naechster faelliger Zeitpunkt (HH:MM) oder null
  allCompleted: boolean;       // Alle heutigen Check-ins erledigt?
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Status-Objekt. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler (Check-ins oder Care-Profil). |

---

## 3. Medikamenten-Verwaltung

### GET `/api/care/medications` — Medikamente abrufen

Listet alle (aktiven) Medikamente eines Seniors.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | Eingeloggter User | Senior-ID |
| `include_inactive` | `'true'` | `false` | Auch deaktivierte Medikamente anzeigen |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Array von Medikament-Objekten. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/medications` — Medikament anlegen

Erstellt ein neues Medikament mit Einnahme-Zeitplan.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | `medications` |

**Request Body:**

```typescript
{
  name: string;                  // Pflicht — Medikamentenname
  schedule: MedicationSchedule;  // Pflicht — Einnahme-Zeitplan
  dosage?: string;               // Optional — z.B. '500mg'
  instructions?: string;         // Optional — Einnahmehinweise
  senior_id?: string;            // Optional — Standard: eingeloggter User
}
```

**MedicationSchedule-Typen:**

```typescript
{ type: 'daily'; times: string[] }          // z.B. times: ['08:00', '20:00']
{ type: 'weekly'; days: string[]; time: string }  // z.B. days: ['Montag'], time: '09:00'
{ type: 'interval'; ... }                   // Intervall-basiert
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | Medikament erstellt. |
| `400` | Name/Zeitplan fehlt oder Zeitplan-Typ ungueltig. |
| `401` | Nicht authentifiziert. |
| `403` | Feature `medications` nicht im aktuellen Plan. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/medications/[id]` — Einzelnes Medikament abrufen

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Medikament-Objekt. |
| `401` | Nicht authentifiziert. |
| `404` | Medikament nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

### PATCH `/api/care/medications/[id]` — Medikament aktualisieren

Aktualisiert erlaubte Felder eines Medikaments.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body (alle Felder optional):**

```typescript
{
  name?: string;
  dosage?: string;
  schedule?: MedicationSchedule;
  instructions?: string;
  active?: boolean;
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Aktualisiertes Medikament-Objekt. |
| `400` | Keine aenderbaren Felder angegeben. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### DELETE `/api/care/medications/[id]` — Medikament deaktivieren

Soft-Delete: Setzt `active` auf `false` (kein physisches Loeschen).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | `{ success: true }` |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/medications/due` — Heute faellige Medikamente

Berechnet alle heute faelligen Einnahmen mit aktuellem Einnahme-Status.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | Eingeloggter User | Senior-ID |

**Antwort (200):**

```typescript
Array<{
  medication: CareMedication;
  scheduled_at: string;            // ISO-Zeitstempel (z.B. '2026-03-10T08:00:00')
  status: 'pending' | 'taken' | 'skipped' | 'snoozed' | 'missed';
  snoozed_until: string | null;
}>
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Sortierte Liste faelliger Medikamente. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/medications/log` — Einnahme protokollieren

Protokolliert eine Medikamenten-Einnahme (genommen, uebersprungen, verschoben).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:**

```typescript
{
  medication_id: string;   // Pflicht — Medikament-UUID
  status: 'taken' | 'skipped' | 'snoozed';  // Pflicht
  scheduled_at: string;    // Pflicht — geplanter Einnahmezeitpunkt (ISO)
}
```

**Seiteneffekte:**
- Bei `snoozed`: `snoozed_until` wird automatisch berechnet (Standard-Snooze-Dauer aus Konstanten).
- Bei `skipped`: Angehoerige werden per Push benachrichtigt.
- Upsert-Logik: Vorhandener Log-Eintrag fuer dieselbe Medikament/Zeit-Kombination wird aktualisiert.

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | Log-Eintrag erstellt/aktualisiert. |
| `400` | Pflichtfelder fehlen oder Status ungueltig. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/medications/log` — Log-Historie abrufen

Gibt Einnahme-Logs zurueck, optional gefiltert nach Medikament.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | Eingeloggter User | Senior-ID |
| `medication_id` | `string` | — | Optional — nach Medikament filtern |
| `limit` | `number` | `50` | Maximale Anzahl (max. 100) |

**Antwort (200):**

```typescript
Array<CareMedicationLog & {
  medication: { name: string; dosage: string | null };
}>
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Array von Log-Eintraegen mit Medikament-Info. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

## 4. Termin-Verwaltung

### GET `/api/care/appointments` — Termine abrufen

Listet Termine eines Seniors, standardmaessig nur zukuenftige.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | Eingeloggter User | Senior-ID |
| `upcoming` | `'true'` / `'false'` | `'true'` | Nur zukuenftige Termine |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Array von Termin-Objekten, aufsteigend nach `scheduled_at`. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/appointments` — Termin anlegen

Erstellt einen neuen Termin mit optionalen Erinnerungen.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | `appointments` |

**Request Body:**

```typescript
{
  title: string;                          // Pflicht
  scheduled_at: string;                   // Pflicht — ISO-Zeitstempel
  type?: CareAppointmentType;             // Optional — Standard: 'other'
  duration_minutes?: number;              // Optional — Standard: 60
  location?: string;                      // Optional
  reminder_minutes_before?: number[];     // Optional — Standard: [60, 15]
  recurrence?: Record<string, unknown>;   // Optional — Wiederholungs-Regel
  notes?: string;                         // Optional
  senior_id?: string;                     // Optional — Standard: eingeloggter User
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | Termin erstellt. |
| `400` | Titel oder Termindatum fehlt. |
| `401` | Nicht authentifiziert. |
| `403` | Feature `appointments` nicht im aktuellen Plan. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/appointments/[id]` — Einzelnen Termin abrufen

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Termin-Objekt. |
| `401` | Nicht authentifiziert. |
| `404` | Termin nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

### PATCH `/api/care/appointments/[id]` — Termin aktualisieren

Aktualisiert erlaubte Felder eines Termins.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body (alle Felder optional):**

```typescript
{
  title?: string;
  type?: CareAppointmentType;
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string;
  reminder_minutes_before?: number[];
  notes?: string;
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Aktualisiertes Termin-Objekt. |
| `400` | Keine aenderbaren Felder angegeben. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### DELETE `/api/care/appointments/[id]` — Termin loeschen

Hard-Delete: Termin wird endgueltig geloescht.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | `{ success: true }` |
| `401` | Nicht authentifiziert. |
| `404` | Termin nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

## 5. Helfer-Verwaltung

### GET `/api/care/helpers` — Helfer auflisten

Listet Helfer mit User-Profil, optional gefiltert.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | — | Nur Helfer, die diesem Senior zugewiesen sind |
| `role` | `string` | — | Nur Helfer mit dieser Rolle (`neighbor`, `relative`, `care_service`) |
| `status` | `string` | `'verified'` | Verifizierungsstatus-Filter. `'all'` fuer alle. |

**Antwort (200):**

```typescript
Array<CareHelper & {
  user: { display_name: string; avatar_url: string | null };
}>
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Array von Helfer-Objekten. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/helpers` — Als Helfer registrieren

Registriert den eingeloggten Nutzer als Helfer (Status: `pending`).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:**

```typescript
{
  role: 'neighbor' | 'relative' | 'care_service';  // Pflicht
  skills?: string[];                                 // Optional
  availability?: Record<string, unknown>;            // Optional
  senior_ids?: string[];                             // Optional — zugewiesene Senioren
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | Helfer-Objekt mit User-Profil. |
| `400` | Rolle fehlt oder ungueltig. |
| `401` | Nicht authentifiziert. |
| `409` | Nutzer ist bereits als Helfer registriert. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/helpers/[id]` — Helfer-Details abrufen

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Antwort (200):**

```typescript
CareHelper & {
  user: { display_name: string; avatar_url: string | null };
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Helfer-Objekt mit User-Profil. |
| `401` | Nicht authentifiziert. |
| `404` | Helfer nicht gefunden. |
| `500` | Datenbank-Fehler. |

---

### PATCH `/api/care/helpers/[id]` — Helfer aktualisieren / verifizieren

Aktualisiert Helfer-Daten. Bei Verifizierung wird der Helfer per Push benachrichtigt.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body (alle Felder optional):**

```typescript
{
  verification_status?: 'pending' | 'verified' | 'rejected';
  assigned_seniors?: string[];
  skills?: string[];
  availability?: Record<string, unknown>;
  role?: CareHelperRole;
}
```

**Seiteneffekte:**
- Bei `verification_status: 'verified'`: Helfer erhaelt Push-Benachrichtigung; `verified_by` wird automatisch auf den aktuellen User gesetzt.

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Aktualisiertes Helfer-Objekt mit User-Profil. |
| `400` | Keine aenderbaren Felder angegeben. |
| `401` | Nicht authentifiziert. |
| `500` | Datenbank-Fehler. |

---

## 6. Berichte & Dokumente

### GET `/api/care/reports` — Dokumente auflisten

Listet alle gespeicherten Berichte/Dokumente fuer einen Senior.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | `reports` |

**Query-Parameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `senior_id` | `string` | Eingeloggter User | Senior-ID |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Array von Dokument-Objekten (max. 50, absteigend nach Erstellungsdatum). |
| `401` | Nicht autorisiert. |
| `403` | Feature `reports` nicht im aktuellen Plan. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/reports` — Bericht generieren

Generiert einen neuen Bericht fuer einen Zeitraum und speichert ihn als Dokument.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | `reports` |

**Request Body:**

```typescript
{
  type: CareDocumentType;    // Pflicht
  period_start: string;      // Pflicht — ISO-Datum (z.B. '2026-03-01')
  period_end: string;        // Pflicht — ISO-Datum (z.B. '2026-03-10')
  senior_id?: string;        // Optional — Standard: eingeloggter User
}
```

**Gueltige Berichtstypen (`CareDocumentType`):**

| Typ | Label |
|---|---|
| `care_report_daily` | Tagesbericht |
| `care_report_weekly` | Wochenbericht |
| `care_report_monthly` | Monatsbericht |
| `emergency_log` | Notfall-Protokoll |
| `medication_report` | Medikamenten-Bericht |
| `care_aid_application` | Pflegehilfsmittel-Antrag |
| `tax_summary` | Steuer-Zusammenfassung |
| `usage_report` | Nutzungsbericht |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `201` | Generiertes Dokument-Objekt. |
| `400` | Typ ungueltig oder Zeitraum fehlt. |
| `401` | Nicht autorisiert. |
| `403` | Feature `reports` nicht im aktuellen Plan. |
| `500` | Generierung fehlgeschlagen oder Datenbank-Fehler. |

---

### GET `/api/care/reports/[id]` — Einzelnen Bericht laden

Laedt ein Dokument per ID.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Dokument-Objekt. |
| `401` | Nicht autorisiert. |
| `404` | Dokument nicht gefunden. |

---

### GET `/api/care/reports/data` — Bericht-Daten (JSON)

Gibt Bericht-Daten als JSON fuer clientseitiges Rendering zurueck (ohne persistentes Speichern).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | `reports` |

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `senior_id` | `string` | Optional — Standard: eingeloggter User |
| `period_start` | `string` | Pflicht — ISO-Datum |
| `period_end` | `string` | Pflicht — ISO-Datum |
| `type` | `CareDocumentType` | Pflicht — Berichtstyp |

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Generierte Bericht-Daten als JSON. |
| `400` | Pflichtparameter fehlen. |
| `401` | Nicht autorisiert. |
| `403` | Feature `reports` nicht im aktuellen Plan. |
| `500` | Generierung fehlgeschlagen. |

---

## 7. Abonnements

### GET `/api/care/subscriptions` — Aktuelles Abo laden

Gibt das Abo des eingeloggten Users zurueck. Ohne Abo wird ein virtuelles Free-Abo erzeugt.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Antwort (200):**

```typescript
{
  id: string | null;
  user_id: string;
  plan: CareSubscriptionPlan;          // 'free' | 'basic' | 'family' | 'professional' | 'premium'
  status: 'active' | 'trial' | 'cancelled' | 'expired';
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_provider: string | null;
  external_subscription_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Abo-Objekt (oder virtuelles Free-Abo). |
| `401` | Nicht autorisiert. |
| `500` | Datenbank-Fehler. |

---

### POST `/api/care/subscriptions` — Abo erstellen oder Plan aendern

Erstellt ein neues Abo oder aendert den Plan eines bestehenden. Bezahlte Plaene starten mit 14-Tage-Trial.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:**

```typescript
{
  plan: 'free' | 'basic' | 'family' | 'professional' | 'premium';  // Pflicht
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Bestehendes Abo aktualisiert. |
| `201` | Neues Abo erstellt (inkl. Trial bei bezahlten Plaenen). |
| `400` | Plan fehlt oder ungueltig. |
| `401` | Nicht autorisiert. |
| `500` | Datenbank-Fehler. |

---

### PATCH `/api/care/subscriptions` — Abo kuendigen oder reaktivieren

Aendert den Status eines bestehenden Abos.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Request Body:**

```typescript
{
  status: 'cancelled' | 'active';  // Pflicht
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Aktualisiertes Abo-Objekt. |
| `400` | Status fehlt oder ungueltig. |
| `401` | Nicht autorisiert. |
| `404` | Kein Abo gefunden. |
| `500` | Datenbank-Fehler. |

---

## 8. Statistiken

### GET `/api/care/stats` — Aggregierte Pflege-Statistiken

Liefert umfangreiche aggregierte Statistiken. Ohne `senior_id` sind Admin-Rechte erforderlich (systemweite Daten).

| Eigenschaft | Wert |
|---|---|
| **Auth** | Erforderlich |
| **Feature-Gate** | Keins |

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `senior_id` | `string` | Optional — ohne = systemweite Statistiken (Admin erforderlich) |

**Antwort (200):**

```typescript
{
  seniors: { total: number; active: number };
  sos: {
    total: number;
    resolved: number;
    avgResponseMinutes: number | null;
    last7Days: number;
  };
  checkins: {
    total: number;
    complianceRate: number;       // Prozent (0-100)
    last7Days: number;
  };
  medications: {
    totalMeds: number;
    complianceRate: number;       // Prozent (0-100)
    last7Days: number;
  };
  appointments: { total: number; upcoming: number };
  helpers: { total: number; verified: number };
  documents: { total: number };
  subscriptions: {
    free: number;
    basic: number;
    family: number;
    professional: number;
    premium: number;
  };
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Statistik-Objekt. |
| `401` | Nicht autorisiert. |
| `403` | Ohne `senior_id` und ohne Admin-Rechte. |
| `500` | Datenbank-Fehler. |

---

## 9. Gesundheits-Check

### GET `/api/care/health` — System-Gesundheit pruefen

Oeffentlicher Endpunkt fuer Monitoring-Systeme. Ergebnis wird 5 Sekunden gecacht.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Nicht erforderlich |
| **Feature-Gate** | Keins |

**Antwort (200):**

```typescript
{
  overall: 'ok' | 'warn' | 'error';
  checks: Array<{
    name: string;
    status: 'ok' | 'warn' | 'error';
    detail?: string;
  }>;
  timestamp: string;  // ISO-Zeitstempel
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Gesundheitsstatus (kann `overall: 'error'` enthalten). |
| `500` | Systemfehler — gibt dennoch ein Fehlerobjekt zurueck. |

---

## 10. Cron-Jobs

Alle Cron-Endpunkte verwenden `GET`-Methode und werden ueber Vercel Cron aufgerufen.
Authentifizierung erfolgt via `Authorization: Bearer <CRON_SECRET>` Header (konfigurierbar ueber `process.env.CRON_SECRET`).

---

### GET `/api/care/cron/escalation` — Automatische SOS-Eskalation

Prueft alle offenen SOS-Alerts und eskaliert bei Zeitablauf automatisch auf die naechste Stufe.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Cron-Secret (Bearer Token) |
| **Intervall** | Jede Minute |

**Logik:**
- Laedt alle offenen Alerts (Status: `triggered`, `notified`, `escalated`) mit Stufe < 4.
- Prueft je Alert die Eskalationskonfiguration des Seniors (`care_profiles.escalation_config`).
- Wenn Zeit abgelaufen: automatische Eskalation auf naechste Stufe + Helfer-Benachrichtigung.

**Antwort (200):**

```typescript
{
  checked: number;     // Gepruefte Alerts
  escalated: number;   // Eskalierte Alerts
  timestamp: string;
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Ergebnis-Zusammenfassung. |
| `401` | Ungueltiges oder fehlendes Cron-Secret. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/cron/checkin` — Check-in-Scheduler

Erstellt geplante Check-ins, sendet Erinnerungen und eskaliert verpasste Check-ins.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Cron-Secret (Bearer Token) |
| **Intervall** | Alle 5 Minuten |

**Drei-Phasen-Logik:**

| Phase | Zeitpunkt | Aktion |
|---|---|---|
| 1 — Erstellen | 0-5 Min nach Faelligkeit | Check-in-Eintrag anlegen + erste Push-Erinnerung |
| 2 — Erinnern | 30-35 Min nach Faelligkeit | Zweite Push-Erinnerung an den Senior |
| 3 — Eskalieren | 60-65 Min nach Faelligkeit | Status `missed`, automatischer SOS-Alert, Angehoerige + Pflegedienst benachrichtigen |

**Antwort (200):**

```typescript
{
  created: number;     // Erstellte Check-ins
  reminded: number;    // Gesendete Erinnerungen
  escalated: number;   // Eskalierte (verpasste) Check-ins
  timestamp: string;
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Ergebnis-Zusammenfassung. |
| `401` | Ungueltiges oder fehlendes Cron-Secret. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/cron/medications` — Medikamenten-Erinnerungen

Sendet Erinnerungen fuer faellige Einnahmen und protokolliert verpasste Medikamente.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Cron-Secret (Bearer Token) |
| **Intervall** | Alle 5 Minuten |

**Logik:**
- Laedt alle aktiven Medikamente und berechnet heutige Einnahmezeitpunkte.
- **Phase 1 (0-5 Min):** Erste Erinnerung per Push senden.
- **Snooze-Ablauf:** Re-Erinnerung nach abgelaufener Snooze-Zeit.
- **Verpasst-Markierung:** Nach konfigurierter Frist (`MEDICATION_DEFAULTS.missedAfterMinutes`) wird der Eintrag als `missed` protokolliert + Senior und Angehoerige benachrichtigt.

**Antwort (200):**

```typescript
{
  ok: true;
  reminders: number;   // Gesendete Erinnerungen
  missed: number;      // Als verpasst markierte Einnahmen
  timestamp: string;
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Ergebnis-Zusammenfassung. |
| `401` | Ungueltiges oder fehlendes Cron-Secret. |
| `500` | Datenbank-Fehler. |

---

### GET `/api/care/cron/appointments` — Termin-Erinnerungen

Sendet Termin-Erinnerungen basierend auf den konfigurierten `reminder_minutes_before`-Werten.

| Eigenschaft | Wert |
|---|---|
| **Auth** | Cron-Secret (Bearer Token) |
| **Intervall** | Alle 5 Minuten |

**Logik:**
- Laedt alle Termine der naechsten 24 Stunden.
- Fuer jeden Erinnerungszeitpunkt (`reminder_minutes_before`) wird geprueft, ob er im aktuellen 5-Minuten-Fenster (+/- 2,5 Min Toleranz) liegt.
- Push-Benachrichtigung an Senior und (falls abweichend) an den Betreuer (`managed_by`).

**Antwort (200):**

```typescript
{
  ok: true;
  sent: number;       // Gesendete Erinnerungen
  timestamp: string;
}
```

**Antworten:**

| Status | Beschreibung |
|---|---|
| `200` | Ergebnis-Zusammenfassung. |
| `401` | Ungueltiges oder fehlendes Cron-Secret. |
| `500` | Datenbank-Fehler. |

---

## Allgemeine Fehlerformate

Alle Endpunkte geben Fehler im folgenden Format zurueck:

```typescript
{
  error: string;                    // Fehlerbeschreibung auf Deutsch
  requiredFeature?: string;         // Nur bei 403: benoetigtes Feature
}
```

## Authentifizierung

- **User-Endpunkte:** Supabase Auth via Cookie-basiertem JWT. Alle Endpunkte (ausser `/health`) erfordern eine gueltige Session.
- **Cron-Endpunkte:** `Authorization: Bearer <CRON_SECRET>` Header. Falls `CRON_SECRET` nicht konfiguriert ist, ist der Endpunkt ohne Authentifizierung zugaenglich.

## Feature-Gates

Feature-Gates pruefen ueber `canAccessFeature()` / `requireFeature()`, ob der aktuelle Abo-Plan des Users das Feature unterstuetzt:

| Feature-Key | Beschreibung |
|---|---|
| `medical_emergency_sos` | Medizinischer Notfall-SOS (in allen Plaenen enthalten) |
| `sos_all` | Alle SOS-Kategorien |
| `medications` | Medikamenten-Verwaltung |
| `appointments` | Termin-Verwaltung |
| `reports` | Berichte und Dokumente |

## Audit-Logging

Alle schreibenden Operationen erzeugen Audit-Log-Eintraege ueber `writeAuditLog()`. Audit-Fehler blockieren niemals die Hauptoperation (non-blocking, errors werden geloggt aber nicht an den Client weitergegeben).
