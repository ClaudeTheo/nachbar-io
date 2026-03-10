# Nachbar.io Care-Modul — Technische Architektur

> Zielgruppe: Entwickler, Investoren, technische Partner
> Stand: Maerz 2026 | Pilotquartier: Bad Saeckingen

---

## Inhaltsverzeichnis

1. [Systemuebersicht](#1-systemuebersicht)
2. [Care-Modul Architektur](#2-care-modul-architektur)
3. [Sicherheitsarchitektur](#3-sicherheitsarchitektur)
4. [Eskalations-Pipeline](#4-eskalations-pipeline)
5. [Benachrichtigungssystem](#5-benachrichtigungssystem)
6. [Abo & Feature-Gates](#6-abo--feature-gates)
7. [Seniorengeraet-Unterstuetzung](#7-seniorengeraet-unterstuetzung)
8. [Datenfluss-Diagramme](#8-datenfluss-diagramme)
9. [Deployment-Architektur](#9-deployment-architektur)

---

## 1. Systemuebersicht

Nachbar.io ist eine hyperlokale Pflege- und Community-Plattform fuer Senioren
in Bad Saeckingen. Das System basiert auf Next.js 16 (App Router) als
Full-Stack-Framework mit Supabase (PostgreSQL + Auth + Realtime + Storage)
als Backend-as-a-Service.

### Architekturdiagramm

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│                                                                     │
│  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────────┐ │
│  │   Browser     │  │ PWA (installiert) │  │ Senioren-Geraet      │ │
│  │   /app/(app)  │  │ Service Worker    │  │ /app/(senior)        │ │
│  │              │  │ Web Push API      │  │ E-Ink-optimiert      │ │
│  └──────┬───────┘  └────────┬──────────┘  └──────────┬───────────┘ │
└─────────┼──────────────────┼──────────────────────────┼─────────────┘
          │                  │                          │
          └──────────┬───────┴──────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL (Region: fra1)                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Next.js 16 App Router                      │   │
│  │                                                              │   │
│  │  ┌─────────────────┐  ┌──────────────────────────────────┐  │   │
│  │  │  React Server    │  │        API Routes                │  │   │
│  │  │  Components      │  │  /api/care/sos/*                 │  │   │
│  │  │  + Client Comp.  │  │  /api/care/checkin/*             │  │   │
│  │  │                  │  │  /api/care/medications/*          │  │   │
│  │  │  components/     │  │  /api/care/appointments/*         │  │   │
│  │  │  care/*.tsx       │  │  /api/care/helpers/*             │  │   │
│  │  │                  │  │  /api/care/reports/*              │  │   │
│  │  │                  │  │  /api/care/subscriptions          │  │   │
│  │  │                  │  │  /api/care/health                 │  │   │
│  │  │                  │  │  /api/care/stats                  │  │   │
│  │  └─────────────────┘  └──────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────────┐│   │
│  │  │               Vercel Cron Jobs (4 Stueck)                ││   │
│  │  │  /api/care/cron/escalation     (jede Minute)             ││   │
│  │  │  /api/care/cron/checkin        (alle 5 Min)              ││   │
│  │  │  /api/care/cron/medications    (alle 5 Min)              ││   │
│  │  │  /api/care/cron/appointments   (alle 5 Min)              ││   │
│  │  └──────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ Supabase Client (HTTPS)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                SUPABASE (EU Frankfurt)                               │
│                                                                     │
│  ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐ │
│  │ PostgreSQL │ │   Auth    │ │ Realtime  │ │     Storage       │ │
│  │ + RLS      │ │ (GoTrue) │ │ (WebSocket)│ │ (care_documents)  │ │
│  │ 14 care_*  │ │          │ │           │ │                   │ │
│  │ Tabellen   │ │          │ │           │ │                   │ │
│  └────────────┘ └───────────┘ └───────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Technologie-Stack

| Schicht       | Technologie                        | Zweck                              |
|---------------|------------------------------------|------------------------------------|
| Frontend      | Next.js 16, TypeScript, Tailwind v4| UI + Server-Side Rendering         |
| UI-Bibliothek | shadcn/ui, Lucide Icons            | Konsistente Design-Komponenten     |
| Backend       | Next.js API Routes (App Router)    | RESTful API-Endpunkte              |
| Datenbank     | Supabase PostgreSQL                | Relationale Daten + RLS            |
| Auth          | Supabase Auth (GoTrue)             | Authentifizierung + Session        |
| Realtime      | Supabase Realtime (WebSocket)      | Live-Updates (SOS-Alerts etc.)     |
| Push          | Web Push API + Service Worker      | Benachrichtigungen (PWA-nativ)     |
| Verschluessel.| AES-256-GCM (Node.js crypto)       | Sensible Pflegedaten               |
| Cron          | Vercel Cron Jobs                   | Zeitgesteuerte Prozesse            |
| Hosting       | Vercel (fra1) + Supabase EU        | DSGVO-konformes EU-Hosting         |

---

## 2. Care-Modul Architektur

Das Care-Modul folgt einer strikten Drei-Schicht-Architektur:

```
┌──────────────────────────────────────────────────────────────┐
│  Schicht 1: UI-Komponenten (components/care/*.tsx)            │
│                                                              │
│  SosButton, SosCategoryPicker, SosAlertCard,                │
│  SosStatusTracker, CheckinDialog, CheckinHistory,           │
│  MedicationCard, MedicationList, MedicationLogDialog,       │
│  AppointmentCard, AppointmentList, AppointmentForm,         │
│  HelperCard, HelperList, HelperRegistrationForm,            │
│  FeatureGate, SubscriptionCard, SubscriptionPlans,          │
│  AuditLogViewer, ReportCard, ReportGenerator, ReportList,   │
│  CareErrorBoundary                                          │
│                                                              │
│  Senior-Geraet:                                              │
│  SeniorSosButton, SeniorCheckinButtons,                     │
│  SeniorStatusScreen, SeniorMedicationScreen                 │
└──────────────────────┬───────────────────────────────────────┘
                       │ Hooks (fetch + state)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Schicht 2: Hooks + Bibliothek (lib/care/)                   │
│                                                              │
│  Hooks (lib/care/hooks/):                                    │
│    useSosAlerts, useCheckins, useMedications,               │
│    useDueMedications, useMedicationLogs,                    │
│    useAppointments, useHelpers, useCareProfile,             │
│    useCareRole, useSubscription, useAuditLog,               │
│    useDocuments, useReportData                              │
│                                                              │
│  Kern-Bibliothek:                                            │
│    types.ts       — Typ-Definitionen (30+ Typen)            │
│    constants.ts   — SOS-Kategorien, Eskalation, Plans       │
│    escalation.ts  — Eskalationslogik (shouldEscalate etc.)  │
│    notifications.ts — Multi-Channel Dispatcher              │
│    permissions.ts — Rollenbasierte Zugriffskontrolle        │
│    crypto.ts      — AES-256-GCM Verschluesselung           │
│    audit.ts       — Revisionssicheres Audit-Log             │
│    billing.ts     — Abo-Verwaltung + Feature-Gates          │
│    api-helpers.ts — Gemeinsame API-Hilfsfunktionen          │
│    health.ts      — Gesundheitspruefungen                   │
│                                                              │
│  Channels (lib/care/channels/):                              │
│    push.ts  — Web Push Kanal                                │
│    sms.ts   — SMS via Twilio (Stub)                         │
│    voice.ts — Sprachanruf via Twilio (Stub)                 │
│                                                              │
│  Reports (lib/care/reports/):                                │
│    generator.ts — Bericht-Daten-Generator                   │
│    types.ts     — Report-Typ-Definitionen                   │
└──────────────────────┬───────────────────────────────────────┘
                       │ fetch(/api/care/*)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Schicht 3: API Routes (app/api/care/)                       │
│                                                              │
│  SOS:                                                        │
│    POST /api/care/sos              — SOS ausloesen          │
│    GET  /api/care/sos              — Aktive Alerts listen   │
│    GET  /api/care/sos/[id]         — Alert-Detail           │
│    PATCH /api/care/sos/[id]        — Alert schliessen       │
│    POST /api/care/sos/[id]/respond — Helfer reagiert        │
│    POST /api/care/sos/[id]/escalate — Manuell eskalieren   │
│                                                              │
│  Check-in:                                                   │
│    POST /api/care/checkin          — Check-in abgeben       │
│    GET  /api/care/checkin          — Historie abrufen        │
│    GET  /api/care/checkin/status   — Naechster faelliger    │
│                                                              │
│  Medikamente:                                                │
│    GET  /api/care/medications      — Medikamente listen     │
│    POST /api/care/medications      — Medikament anlegen     │
│    PATCH /api/care/medications/[id] — Medikament aendern    │
│    GET  /api/care/medications/due  — Faellige Einnahmen     │
│    POST /api/care/medications/log  — Einnahme protokollieren│
│                                                              │
│  Termine:                                                    │
│    GET  /api/care/appointments      — Termine listen        │
│    POST /api/care/appointments      — Termin anlegen        │
│    PATCH /api/care/appointments/[id] — Termin aendern       │
│                                                              │
│  Helfer:                                                     │
│    GET  /api/care/helpers           — Helfer listen         │
│    POST /api/care/helpers           — Helfer registrieren   │
│    PATCH /api/care/helpers/[id]     — Helfer aendern        │
│                                                              │
│  Berichte:                                                   │
│    GET  /api/care/reports           — Berichte listen       │
│    POST /api/care/reports           — Bericht generieren    │
│    GET  /api/care/reports/[id]      — Bericht herunterladen │
│    GET  /api/care/reports/data      — Bericht-Daten (JSON)  │
│                                                              │
│  Abonnements:                                                │
│    GET  /api/care/subscriptions     — Abo laden             │
│    POST /api/care/subscriptions     — Plan aendern          │
│    PATCH /api/care/subscriptions    — Kuendigen/Reaktivieren│
│                                                              │
│  System:                                                     │
│    GET  /api/care/health            — Gesundheits-Check     │
│    GET  /api/care/stats             — Statistiken           │
│                                                              │
│  Cron Jobs:                                                  │
│    GET  /api/care/cron/escalation   — Auto-Eskalation       │
│    GET  /api/care/cron/checkin      — Check-in Scheduler    │
│    GET  /api/care/cron/medications  — Med-Erinnerungen      │
│    GET  /api/care/cron/appointments — Termin-Erinnerungen   │
└──────────────────────┬───────────────────────────────────────┘
                       │ Supabase Client (RLS)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Schicht 4: Datenbank (Supabase PostgreSQL)                  │
│                                                              │
│  14 Care-Tabellen (Migrationen 019-032):                    │
│    care_profiles, care_sos_alerts, care_sos_responses,      │
│    care_checkins, care_medications, care_medication_logs,    │
│    care_appointments, care_helpers, care_audit_log,         │
│    care_documents, care_subscriptions                        │
│                                                              │
│  Shared Functions (019_care_shared_functions.sql):           │
│    care_update_updated_at()     — Trigger: updated_at       │
│    is_care_helper_for(uuid)     — RLS: Helfer-Pruefung     │
│    care_helper_role(uuid)       — RLS: Rollen-Pruefung     │
│    prevent_audit_modification() — Trigger: Append-only      │
└──────────────────────────────────────────────────────────────┘
```

### Dateistruktur des Care-Moduls

```
nachbar-io/
├── lib/care/
│   ├── types.ts                  # 30+ Typen und Interfaces
│   ├── constants.ts              # SOS-Kategorien, Eskalation, Plans
│   ├── escalation.ts             # shouldEscalate(), getNextEscalationLevel()
│   ├── notifications.ts          # sendCareNotification() — Multi-Channel
│   ├── permissions.ts            # getCareRole(), canAccessFeature()
│   ├── crypto.ts                 # encrypt(), decrypt() — AES-256-GCM
│   ├── audit.ts                  # writeAuditLog() — Append-only
│   ├── billing.ts                # PLAN_HIERARCHY, canUpgrade(), Pricing
│   ├── api-helpers.ts            # requireAuth(), errorResponse(), careLog()
│   ├── health.ts                 # runCareHealthChecks()
│   ├── channels/
│   │   ├── push.ts               # Web Push via /api/push/send
│   │   ├── sms.ts                # Twilio SMS (Stub)
│   │   └── voice.ts              # Twilio Voice (Stub)
│   ├── hooks/
│   │   ├── useSosAlerts.ts       # + Supabase Realtime Subscription
│   │   ├── useCheckins.ts
│   │   ├── useMedications.ts
│   │   ├── useDueMedications.ts
│   │   ├── useMedicationLogs.ts
│   │   ├── useAppointments.ts
│   │   ├── useHelpers.ts
│   │   ├── useCareProfile.ts
│   │   ├── useCareRole.ts
│   │   ├── useSubscription.ts    # changePlan(), cancelSubscription()
│   │   ├── useAuditLog.ts
│   │   ├── useDocuments.ts
│   │   └── useReportData.ts
│   └── reports/
│       ├── generator.ts          # generateReportData()
│       └── types.ts              # ReportData, ReportCheckinSummary, ...
├── app/api/care/
│   ├── sos/route.ts              # POST (ausloesen), GET (listen)
│   ├── sos/[id]/route.ts         # GET (detail), PATCH (schliessen)
│   ├── sos/[id]/respond/route.ts # POST (Helfer-Reaktion)
│   ├── sos/[id]/escalate/route.ts# POST (manuelle Eskalation)
│   ├── checkin/route.ts          # POST (abgeben), GET (Historie)
│   ├── checkin/status/route.ts   # GET (naechster faelliger)
│   ├── medications/route.ts      # GET (listen), POST (anlegen)
│   ├── medications/[id]/route.ts # PATCH (aendern)
│   ├── medications/due/route.ts  # GET (faellige Einnahmen)
│   ├── medications/log/route.ts  # POST (Einnahme protokollieren)
│   ├── appointments/route.ts     # GET (listen), POST (anlegen)
│   ├── appointments/[id]/route.ts# PATCH (aendern)
│   ├── helpers/route.ts          # GET (listen), POST (registrieren)
│   ├── helpers/[id]/route.ts     # PATCH (aendern/verifizieren)
│   ├── reports/route.ts          # GET (listen), POST (generieren)
│   ├── reports/[id]/route.ts     # GET (herunterladen)
│   ├── reports/data/route.ts     # GET (Bericht-Daten als JSON)
│   ├── subscriptions/route.ts    # GET/POST/PATCH (Abo-Verwaltung)
│   ├── health/route.ts           # GET (Gesundheits-Check)
│   ├── stats/route.ts            # GET (Statistiken)
│   └── cron/
│       ├── escalation/route.ts   # Auto-Eskalation (jede Minute)
│       ├── checkin/route.ts      # Check-in Scheduler (alle 5 Min)
│       ├── medications/route.ts  # Med-Erinnerungen (alle 5 Min)
│       └── appointments/route.ts # Termin-Erinnerungen (alle 5 Min)
├── components/care/
│   ├── index.ts                  # Barrel-Export
│   ├── SosButton.tsx             # Grosser SOS-Knopf (100px)
│   ├── SosCategoryPicker.tsx     # Kategorie-Auswahl (5 Kategorien)
│   ├── SosAlertCard.tsx          # Alert-Anzeige-Karte
│   ├── SosStatusTracker.tsx      # Echtzeit-Status-Tracker
│   ├── CheckinDialog.tsx         # Check-in Eingabe-Dialog
│   ├── CheckinHistory.tsx        # Check-in Verlauf
│   ├── MedicationCard.tsx        # Medikamenten-Karte
│   ├── MedicationList.tsx        # Medikamenten-Liste
│   ├── MedicationLogDialog.tsx   # Einnahme-Protokoll-Dialog
│   ├── AppointmentCard.tsx       # Termin-Karte
│   ├── AppointmentList.tsx       # Termin-Liste
│   ├── AppointmentForm.tsx       # Termin-Formular
│   ├── HelperCard.tsx            # Helfer-Karte
│   ├── HelperList.tsx            # Helfer-Liste
│   ├── HelperRegistrationForm.tsx# Helfer-Registrierung
│   ├── FeatureGate.tsx           # Abo-basierter Feature-Schutz
│   ├── SubscriptionCard.tsx      # Abo-Anzeige
│   ├── SubscriptionPlans.tsx     # Plan-Uebersicht
│   ├── AuditLogViewer.tsx        # Aktivitaetsprotokoll
│   ├── ReportCard.tsx            # Bericht-Karte
│   ├── ReportGenerator.tsx       # Bericht-Generator UI
│   ├── ReportList.tsx            # Bericht-Liste
│   ├── CareErrorBoundary.tsx     # Fehler-Boundary
│   └── senior/
│       ├── SeniorSosButton.tsx         # E-Ink SOS (100px Touch)
│       ├── SeniorCheckinButtons.tsx     # E-Ink Check-in
│       ├── SeniorStatusScreen.tsx       # E-Ink Status
│       └── SeniorMedicationScreen.tsx   # E-Ink Medikamente
├── app/(senior)/
│   ├── layout.tsx                # E-Ink-Layout (20px Font, hoher Kontrast)
│   ├── page.tsx                  # Startseite (Uhr, SOS, Medikamente, Check-in)
│   ├── sos/page.tsx              # SOS-Seite
│   ├── sos/status/page.tsx       # SOS-Status
│   ├── checkin/page.tsx          # Check-in-Seite
│   ├── medications/page.tsx      # Medikamenten-Seite
│   └── confirmed/page.tsx        # Bestaetigung
└── supabase/migrations/
    ├── 019_care_shared_functions.sql  # Gemeinsame DB-Funktionen
    ├── 020_care_profiles.sql          # Pflege-Profile
    ├── 021_care_sos_alerts.sql        # SOS-Alarme
    ├── 022_care_sos_responses.sql     # SOS-Antworten
    ├── 023_care_checkins.sql          # Check-ins
    ├── 024_care_medications.sql       # Medikamente
    ├── 025_care_medication_logs.sql   # Einnahme-Protokolle
    ├── 026_care_appointments.sql      # Termine
    ├── 027_care_helpers.sql           # Helfer
    ├── 028_care_audit_log.sql         # Audit-Log (append-only)
    ├── 029_care_documents.sql         # Dokumente/Berichte
    ├── 030_care_subscriptions.sql     # Abonnements
    ├── 031_care_notifications_update.sql  # Benachrichtigungs-Update
    └── 032_care_senior_checkins_migration.sql  # Senior Check-in Migration
```

---

## 3. Sicherheitsarchitektur

### 3.1 Row Level Security (RLS)

Jede der 14 Care-Tabellen hat aktiviertes RLS mit feingranularen Policies.
Das Berechtigungsmodell basiert auf drei gemeinsamen PostgreSQL-Funktionen
(definiert in `supabase/migrations/019_care_shared_functions.sql`):

```
┌──────────────────────────────────────────────────────────┐
│                    RLS-Policy-Modell                      │
│                                                          │
│  ┌──────────┐                                            │
│  │  Senior   │ → Eigene Daten lesen + schreiben         │
│  │ (auth.uid)│   via: senior_id = auth.uid()            │
│  └──────────┘                                            │
│                                                          │
│  ┌──────────┐                                            │
│  │  Helfer   │ → Zugewiesene Senioren-Daten lesen       │
│  │ (verified)│   via: is_care_helper_for(senior_id)     │
│  └──────────┘   Schreiben nur fuer relative/care_service│
│                  via: care_helper_role(senior_id)        │
│                                                          │
│  ┌──────────┐                                            │
│  │  Admin    │ → Alle Daten lesen + schreiben           │
│  │ (is_admin)│   via: is_admin()                        │
│  └──────────┘                                            │
└──────────────────────────────────────────────────────────┘
```

**Shared Functions:**

| Funktion                         | Zweck                                    | Datei                               |
|----------------------------------|------------------------------------------|-------------------------------------|
| `is_care_helper_for(senior_id)`  | Prueft ob User verifizierter Helfer ist   | `019_care_shared_functions.sql`     |
| `care_helper_role(senior_id)`    | Gibt Helfer-Rolle zurueck (RLS-Filter)   | `019_care_shared_functions.sql`     |
| `prevent_audit_modification()`   | Blockiert UPDATE/DELETE auf Audit-Log    | `019_care_shared_functions.sql`     |
| `care_update_updated_at()`       | Auto-Update von updated_at Spalten       | `019_care_shared_functions.sql`     |

**Beispiel-Policies (care_profiles):**

- `care_profiles_select_own` — Senior sieht eigenes Profil
- `care_profiles_select_helper` — Verifizierter Helfer sieht Profil
- `care_profiles_select_admin` — Admin sieht alle Profile
- `care_profiles_update_helper` — Nur `relative` und `care_service` duerfen updaten

### 3.2 AES-256-GCM Verschluesselung

Sensible Pflegedaten (Notfallkontakt-Telefonnummern, Versicherungsnummern)
werden serverseitig mit AES-256-GCM verschluesselt. Die Implementierung
liegt in `lib/care/crypto.ts`.

```
Klartext → encrypt() → "aes256gcm:<IV>:<AuthTag>:<Ciphertext>"
                              (Base64)   (Base64)    (Base64)

"aes256gcm:..." → decrypt() → Klartext
```

**Eckdaten:**

| Parameter          | Wert                                         |
|--------------------|----------------------------------------------|
| Algorithmus        | AES-256-GCM                                  |
| Schluessellaenge   | 256 Bit (32 Bytes, 64 Hex-Zeichen)           |
| IV-Laenge          | 128 Bit (16 Bytes, zufaellig pro Verschl.)   |
| Auth-Tag-Laenge    | 128 Bit (16 Bytes)                           |
| Schluessel-Quelle  | Umgebungsvariable `CARE_ENCRYPTION_KEY`       |
| Praefix            | `aes256gcm:` (Format-Erkennung)              |

Der Schluessel wird als 64-stelliger Hex-String in der Umgebungsvariable
`CARE_ENCRYPTION_KEY` gespeichert und niemals im Code oder Client-State
exponiert.

### 3.3 Revisionssicheres Audit-Log

Das Audit-Log (`care_audit_log`) ist append-only auf Datenbank-Ebene.
Zwei Trigger verhindern physisch jede Modifikation:

```sql
-- Blockiert UPDATE
CREATE TRIGGER no_audit_update
  BEFORE UPDATE ON care_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Blockiert DELETE
CREATE TRIGGER no_audit_delete
  BEFORE DELETE ON care_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

Die Funktion `prevent_audit_modification()` wirft eine Exception:

```
RAISE EXCEPTION 'care_audit_log: UPDATE und DELETE sind nicht erlaubt (revisionssicher)';
```

**22 auditierte Event-Typen** (definiert in `lib/care/constants.ts`):

| Bereich       | Events                                                        |
|---------------|---------------------------------------------------------------|
| SOS           | `sos_triggered`, `sos_accepted`, `sos_resolved`, `sos_escalated`, `sos_cancelled` |
| Check-in      | `checkin_ok`, `checkin_not_well`, `checkin_missed`, `checkin_escalated` |
| Medikamente   | `medication_taken`, `medication_skipped`, `medication_missed`, `medication_snoozed` |
| Termine       | `appointment_confirmed`, `appointment_missed`                 |
| Helfer        | `helper_registered`, `helper_verified`                        |
| Sonstige      | `visit_logged`, `document_generated`, `profile_updated`, `subscription_changed` |

### 3.4 DSGVO-Konformitaet

| Massnahme                           | Umsetzung                                                  |
|--------------------------------------|-------------------------------------------------------------|
| Datenminimierung                    | Nur `household_id` im Client-State, keine Adressen         |
| EU-Hosting                          | Supabase EU Frankfurt (fra1), Vercel fra1                   |
| Row Level Security                  | Alle 14 Care-Tabellen mit granularen Policies               |
| Verschluesselung at rest            | Supabase-Standard + AES-256-GCM fuer sensible Felder       |
| Verschluesselung in transit         | HTTPS (TLS 1.3) auf allen Verbindungen                     |
| Audit-Trail                         | Lueckenloses, nicht-modifizierbares Protokoll               |
| Loeschbarkeit                       | `ON DELETE CASCADE` auf `user_id` Foreign Keys              |
| Einwilligung                        | Explizite Zustimmung bei Registrierung                      |
| Datentrennung                       | Care-Daten in separaten Tabellen (care_* Praefix)           |

---

## 4. Eskalations-Pipeline

Das Eskalationssystem ist das Herzstuck des Care-Moduls. Es stellt sicher,
dass bei einem SOS-Alarm immer jemand reagiert — durch zeitgesteuerte
Eskalation ueber 4 Stufen mit steigenden Benachrichtigungskanaelen.

### 4.1 Eskalationsstufen

```
┌───────────────────────────────────────────────────────────────────┐
│                    ESKALATIONS-PIPELINE                           │
│                                                                   │
│  Stufe 1: NACHBARN                                               │
│  ├── Zeitpunkt: Sofort (0 Min)                                   │
│  ├── Empfaenger: Verifizierte Nachbar-Helfer                    │
│  ├── Kanaele: Push, In-App                                       │
│  └── Timeout: 5 Minuten                                          │
│           │                                                       │
│           ▼ (automatisch nach 5 Min ohne Reaktion)               │
│                                                                   │
│  Stufe 2: ANGEHOERIGE                                            │
│  ├── Zeitpunkt: +5 Min                                           │
│  ├── Empfaenger: Verifizierte Angehoerige                       │
│  ├── Kanaele: Push, In-App, SMS                                  │
│  └── Timeout: 15 Minuten                                         │
│           │                                                       │
│           ▼ (automatisch nach 15 Min ohne Reaktion)              │
│                                                                   │
│  Stufe 3: PFLEGEDIENST                                           │
│  ├── Zeitpunkt: +15 Min                                          │
│  ├── Empfaenger: Verifizierte Pflegedienst-Helfer               │
│  ├── Kanaele: Push, In-App, SMS, Sprachanruf                    │
│  └── Timeout: 30 Minuten                                         │
│           │                                                       │
│           ▼ (automatisch nach 30 Min ohne Reaktion)              │
│                                                                   │
│  Stufe 4: LEITSTELLE / EXTERNE                                  │
│  ├── Zeitpunkt: +30 Min                                          │
│  ├── Empfaenger: Alle Administratoren                            │
│  ├── Kanaele: SMS, Sprachanruf, Admin-Alert                     │
│  └── Maximale Stufe — keine weitere Eskalation                  │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 Konfigurierbarkeit

Die Eskalations-Timeouts sind pro Senior individuell konfigurierbar
ueber `care_profiles.escalation_config` (JSONB):

```json
{
  "escalate_to_level_2_after_minutes": 5,
  "escalate_to_level_3_after_minutes": 15,
  "escalate_to_level_4_after_minutes": 30
}
```

Standard-Werte werden in `lib/care/constants.ts` als
`DEFAULT_ESCALATION_CONFIG` definiert.

### 4.3 Automatische Eskalation (Cron)

Der Cron-Job `app/api/care/cron/escalation/route.ts` laeuft **jede Minute**
(konfiguriert in `vercel.json`). Ablauf:

1. Alle offenen SOS-Alerts mit `status IN ('triggered', 'notified', 'escalated')`
   und `current_escalation_level < 4` laden
2. Fuer jeden Alert: Eskalationskonfiguration des Seniors laden
3. `shouldEscalate()` aus `lib/care/escalation.ts` aufrufen
4. Bei faelliger Eskalation: Level erhoehen, Helfer benachrichtigen, Audit-Log schreiben
5. Cron-Secret-Authentifizierung via `CRON_SECRET` Header

### 4.4 Manuelle Eskalation

Ueber `POST /api/care/sos/[id]/escalate` kann ein authentifizierter User
einen Alert manuell auf die naechste Stufe heben — unabhaengig vom Timeout.

### 4.5 Eskalationslogik (`lib/care/escalation.ts`)

| Funktion                      | Beschreibung                                    |
|-------------------------------|-------------------------------------------------|
| `shouldEscalate()`            | Prueft ob Timeout abgelaufen (Boolean)          |
| `getNextEscalationLevel()`    | Gibt naechste Stufe zurueck (2-4 oder null)     |
| `getEscalationMeta()`         | Metadaten: Label, Rolle, Kanaele                |
| `minutesUntilEscalation()`    | Verbleibende Minuten bis Auto-Eskalation        |

---

## 5. Benachrichtigungssystem

### 5.1 Multi-Channel-Architektur

Das Benachrichtigungssystem unterstuetzt 5 Kanaele, die je nach
Eskalationsstufe und Abo-Plan aktiviert werden.

```
┌──────────────────────────────────────────────────────────────┐
│              sendCareNotification()                           │
│              (lib/care/notifications.ts)                      │
│                                                              │
│  Eingabe: userId, type, title, body, channels[]             │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌──────┐  ┌───────┐  ┌───────┐ │
│  │ in_app  │  │  push   │  │ sms  │  │ voice │  │ admin │ │
│  │         │  │         │  │      │  │       │  │ alert │ │
│  └────┬────┘  └────┬────┘  └──┬───┘  └───┬───┘  └───┬───┘ │
│       │            │          │           │          │      │
│       ▼            ▼          ▼           ▼          ▼      │
│  Supabase     Web Push    Twilio      Twilio    Supabase   │
│  INSERT       /api/push/  SMS API     Voice     INSERT     │
│  notifi-      send        (Stub)      TTS       notifi-    │
│  cations                  (Stub)      (Stub)    cations    │
│  Tabelle                                        (Admins)   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Kanal-Details

| Kanal         | Implementierung                      | Status      | Datei                          |
|---------------|--------------------------------------|-------------|--------------------------------|
| `in_app`      | Supabase `notifications` Tabelle     | Aktiv       | `lib/care/notifications.ts`    |
| `push`        | Web Push API via `/api/push/send`    | Aktiv       | `lib/care/channels/push.ts`    |
| `sms`         | Twilio SMS API                       | Stub        | `lib/care/channels/sms.ts`     |
| `voice`       | Twilio Voice API (TTS)               | Stub        | `lib/care/channels/voice.ts`   |
| `admin_alert` | In-App fuer alle `is_admin` User     | Aktiv       | `lib/care/notifications.ts`    |

### 5.3 Kanal-Zuordnung nach Eskalationsstufe

| Stufe | Rolle          | push | in_app | sms | voice | admin_alert |
|-------|----------------|------|--------|-----|-------|-------------|
| 1     | Nachbarn       | x    | x      |     |       |             |
| 2     | Angehoerige    | x    | x      | x   |       |             |
| 3     | Pflegedienst   | x    | x      | x   | x     |             |
| 4     | Leitstelle     |      |        | x   | x     | x           |

### 5.4 Benachrichtigungstypen

Definiert als `CareNotificationType` in `lib/care/types.ts`:

- `care_sos` — Neuer SOS-Alarm
- `care_sos_response` — Helfer hat reagiert
- `care_checkin_reminder` — Check-in-Erinnerung
- `care_checkin_missed` — Check-in verpasst
- `care_medication_reminder` — Medikamenten-Erinnerung
- `care_medication_missed` — Medikament nicht eingenommen
- `care_appointment_reminder` — Termin-Erinnerung
- `care_escalation` — Eskalationsbenachrichtigung
- `care_helper_verified` — Helfer verifiziert

---

## 6. Abo & Feature-Gates

### 6.1 Plan-Hierarchie

5 Tarif-Stufen von kostenlos bis Premium (definiert in `lib/care/billing.ts`):

```
┌────────────┬────────────┬────────────┬───────────────┬────────────┐
│  Kostenlos  │   Basis    │  Familie   │ Professionell │  Premium   │
│   (free)    │  (basic)   │  (family)  │(professional) │ (premium)  │
│             │            │            │               │            │
│ Kostenlos   │ ab 4,99 EUR│ ab 9,99 EUR│ ab 19,99 EUR  │ab 29,99 EUR│
│             │  /Monat    │  /Monat    │  /Monat       │  /Monat    │
├────────────┼────────────┼────────────┼───────────────┼────────────┤
│ Check-in   │ Check-in   │ Check-in   │ Check-in      │ Check-in   │
│ Notfall-SOS│ Alle SOS   │ Alle SOS   │ Alle SOS      │ Alle SOS   │
│            │ Medikamente│ Medikamente│ Medikamente   │ Medikamente│
│            │ Termine    │ Termine    │ Termine       │ Termine    │
│            │            │ Angehoerig.│ Angehoerig.   │ Angehoerig.│
│            │            │ Berichte   │ Berichte      │ Berichte   │
│            │            │ Audit-Log  │ Audit-Log     │ Audit-Log  │
│            │            │            │ Multi-Senior  │ Multi-Senior│
│            │            │            │ Pflege-Dashb. │ Pflege-Dashb│
│            │            │            │ Hilfsmittel   │ Hilfsmittel│
│            │            │            │               │ SIM-Fallback│
│            │            │            │               │ SMS-Notif. │
│            │            │            │               │ Voice-Notif│
│            │            │            │               │ Prio-Support│
└────────────┴────────────┴────────────┴───────────────┴────────────┘
```

### 6.2 Feature-Gate-Implementierung

Die Feature-Pruefung erfolgt auf drei Ebenen:

**Ebene 1: Datenbank-Konstanten** (`lib/care/constants.ts`)

```typescript
export const PLAN_FEATURES: Record<CareSubscriptionPlan, string[]> = {
  free: ['checkin', 'medical_emergency_sos'],
  basic: ['checkin', 'sos_all', 'medications', 'appointments'],
  family: ['checkin', 'sos_all', 'medications', 'appointments',
           'relative_dashboard', 'reports', 'audit_log'],
  // ...
};

export function hasFeature(plan, feature): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}
```

**Ebene 2: Server-seitige Pruefung** (`lib/care/permissions.ts`)

```typescript
export async function canAccessFeature(supabase, seniorId, feature): Promise<boolean> {
  // medical_emergency_sos ist IMMER verfuegbar (Sicherheitspflicht)
  if (feature === 'medical_emergency_sos') return true;
  // Plan aus care_subscriptions laden und pruefen
  // Kein Abo = free Plan
}
```

**Ebene 3: UI-Komponente** (`components/care/FeatureGate.tsx`)

```tsx
<FeatureGate feature="reports">
  <ReportGenerator />  {/* Nur sichtbar wenn Plan "reports" enthaelt */}
</FeatureGate>
```

Bei fehlendem Feature zeigt `FeatureGate` einen Upgrade-Hinweis mit Link
zur Abo-Seite (`/care/subscription`).

### 6.3 Sicherheitsregel

**Medizinischer Notfall (`medical_emergency_sos`) ist IMMER verfuegbar** —
unabhaengig vom Abo-Plan. Dies ist eine nicht-verhandelbare
Sicherheitsanforderung, die sowohl in `canAccessFeature()` als auch in
der SOS-API-Route (`app/api/care/sos/route.ts`) geprueft wird.

### 6.4 Trial-System

Bezahlte Plaene starten mit einem **14-Tage-Trial** (definiert in
`app/api/care/subscriptions/route.ts`). Hilfsfunktionen in `lib/care/billing.ts`:

- `isTrialExpired(trialEndsAt)` — Prueft ob Trial abgelaufen
- `trialDaysRemaining(trialEndsAt)` — Verbleibende Trial-Tage
- `canUpgrade(current, target)` — Prueft ob Upgrade moeglich
- `getUpgradeFeatures(current, target)` — Neue Features bei Upgrade
- `minimumPlanForFeature(feature)` — Mindest-Plan fuer Feature

---

## 7. Seniorengeraet-Unterstuetzung

### 7.1 Separater Route-Bereich

Das Senioren-Geraet (z.B. E-Ink-Tablet, stationaeres Touchscreen-Geraet)
hat einen eigenen Route-Bereich unter `app/(senior)/` mit eigenem Layout.

```
app/(senior)/
├── layout.tsx          # E-Ink-Layout
├── page.tsx            # Startseite (Uhr + 3 Buttons)
├── sos/
│   ├── page.tsx        # SOS ausloesen
│   └── status/page.tsx # SOS-Status anzeigen
├── checkin/page.tsx    # Check-in abgeben
├── medications/page.tsx# Medikamente anzeigen
└── confirmed/page.tsx  # Bestaetigung
```

### 7.2 E-Ink-Optimierung (`app/(senior)/layout.tsx`)

```
┌──────────────────────────────────────────┐
│  E-Ink Layout-Regeln:                    │
│                                          │
│  - Hintergrund: Reines Weiss (#FFFFFF)   │
│  - Schrift: 20px Basisgroesse            │
│  - Zeilenhoehe: 1.6                      │
│  - Keine Gradienten                      │
│  - Keine Schatten                        │
│  - Hoher Kontrast (> 4.5:1)            │
│  - Keine BottomNav                       │
│  - Max-Breite: max-w-md (448px)         │
│  - Padding: 24px horizontal, 32px vert.  │
└──────────────────────────────────────────┘
```

### 7.3 Touch-Target-Groessen

Alle interaktiven Elemente auf dem Senioren-Geraet erfuellen die
Mindestanforderung von **80px Touch-Targets**:

| Element            | Groesse (min-height) | Schriftgroesse |
|--------------------|----------------------|----------------|
| SOS-Button         | 100px                | 3xl (30px)     |
| Medikamenten-Button| 80px                 | 2xl (24px)     |
| Check-in-Button    | 80px                 | 2xl (24px)     |

Alle Buttons verwenden `touchAction: 'manipulation'` um 300ms-Verzoegerung
auf Touch-Geraeten zu eliminieren.

### 7.4 Startseite (`app/(senior)/page.tsx`)

Die Startseite zeigt maximal 4 Elemente (max 4 Taps fuer jede Aktion):

1. **Uhrzeit + Datum** — Grosse Anzeige, aktualisiert jede Minute
2. **SOS-Button** — Rot, 100px, sofort erreichbar
3. **Medikamenten-Button** — Blau, 80px, mit naechster Einnahmezeit
4. **Check-in-Button** — Gruen, 80px, mit naechstem faelligen Check-in

### 7.5 Senior-spezifische Komponenten (`components/care/senior/`)

| Komponente                 | Funktion                                    |
|----------------------------|---------------------------------------------|
| `SeniorSosButton.tsx`      | Grosser SOS-Knopf (rot, 100px, 3xl Font)  |
| `SeniorCheckinButtons.tsx` | Vereinfachte Check-in-Eingabe              |
| `SeniorStatusScreen.tsx`   | Status-Anzeige (warte auf Hilfe / OK)      |
| `SeniorMedicationScreen.tsx`| Medikamenten-Liste mit grossen Buttons    |

---

## 8. Datenfluss-Diagramme

### 8.1 SOS-Lebenszyklus

```
┌────────────┐
│   Senior    │
│ drueckt SOS │
└──────┬─────┘
       │ POST /api/care/sos
       │ { category, notes, source: 'app' }
       ▼
┌──────────────────────────┐
│  API: SOS erstellen       │
│  1. Auth-Check            │
│  2. Kategorie validieren  │
│  3. Feature-Gate pruefen  │
│     (medical_emergency    │
│      immer erlaubt!)      │
│  4. INSERT care_sos_alerts│
│     status: 'triggered'   │
│     level: 1              │
│  5. writeAuditLog()       │
│     (sos_triggered)       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Stufe 1: Nachbarn        │
│  benachrichtigen          │
│                           │
│  SELECT care_helpers      │
│  WHERE role='neighbor'    │
│  AND verified             │
│  AND senior IN assigned   │
│                           │
│  sendCareNotification()   │
│  channels: [push, in_app] │
│                           │
│  UPDATE status='notified' │
└──────┬───────────────────┘
       │
       │  Helfer reagiert?
       │
  ┌────┴────┐
  │  JA     │  NEIN (Timeout: 5 Min)
  ▼         ▼
┌──────┐  ┌──────────────────────────┐
│POST  │  │ Cron: /api/care/cron/    │
│/resp │  │ escalation               │
│ond   │  │                          │
│      │  │ shouldEscalate() = true  │
│Accept│  │ → Level 2 (Angehoerige)  │
│ed    │  │ → Neue Kanaele: +SMS     │
│      │  │ → writeAuditLog()        │
│      │  │   (sos_escalated)        │
│      │  └──────┬───────────────────┘
│      │         │
│      │    ┌────┴────┐
│      │    │ Timeout  │ ... Level 3 → Level 4
│      │    └─────────┘
│      │
│Status│
│='acc │
│epted'│
│      │
│Notify│
│Senior│
└──┬───┘
   │
   ▼
┌──────────────────────────┐
│  Helfer ist vor Ort       │
│  POST /respond            │
│  { type: 'arrived' }     │
│  status → 'helper_enroute'│
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  PATCH /api/care/sos/[id]│
│  { status: 'resolved' }  │
│  resolved_by, resolved_at│
│  writeAuditLog()         │
│  (sos_resolved)          │
└──────────────────────────┘
```

### 8.2 Check-in-Fluss

```
┌────────────────────────────────────────────────────────────────┐
│                CHECK-IN LEBENSZYKLUS                            │
│                                                                │
│  Cron: /api/care/cron/checkin (alle 5 Min)                    │
│                                                                │
│  Phase 1 (0-5 Min nach Faelligkeit):                          │
│  ┌────────────────────────────────────┐                       │
│  │ care_profiles                       │                       │
│  │ WHERE checkin_enabled = true        │                       │
│  │                                     │                       │
│  │ Fuer jede checkin_time (z.B. 08:00):│                       │
│  │  → INSERT care_checkins             │                       │
│  │    status: 'reminded'               │                       │
│  │  → Push + In-App Erinnerung         │                       │
│  └────────────────────────────────────┘                       │
│                    │                                            │
│     ┌──────────────┼──────────────┐                            │
│     ▼              │              │                            │
│  Senior meldet     │         Phase 2 (30 Min):                 │
│  sich:             │         ┌─────────────────┐              │
│  POST /checkin     │         │ Zweite Erinnerung│              │
│  {status:'ok'      │         │ reminder_sent_at │              │
│   mood:'good'}     │         │ setzen           │              │
│     │              │         └─────────┬───────┘              │
│     ▼              │                   │                       │
│  completed_at =    │                   │                       │
│  now()             │         Phase 3 (60 Min):                 │
│  Audit: checkin_ok │         ┌─────────────────┐              │
│                    │         │ ESKALATION:      │              │
│  Wenn 'not_well':  │         │ status='missed'  │              │
│  → Angehoerige     │         │ escalated=true   │              │
│    benachrichtigen │         │                  │              │
│                    │         │ Auto-SOS-Alert:  │              │
│  Wenn 'need_help': │         │ source=          │              │
│  → Auto-SOS-Alert  │         │ 'checkin_timeout' │              │
│    ausloesen       │         │                  │              │
│                    │         │ Angehoerige +    │              │
│                    │         │ Pflegedienst     │              │
│                    │         │ benachrichtigen  │              │
│                    │         └─────────────────┘              │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 Medikamenten-Fluss

```
┌────────────────────────────────────────────────────────────────┐
│             MEDIKAMENTEN-ERINNERUNGS-FLUSS                     │
│                                                                │
│  Cron: /api/care/cron/medications (alle 5 Min)                │
│                                                                │
│  ┌─────────────────────────────────────────────────┐          │
│  │ SELECT care_medications WHERE active = true      │          │
│  │                                                  │          │
│  │ Fuer jedes Medikament:                           │          │
│  │   getTodayScheduledTimes(schedule, now)          │          │
│  │   → 'daily':  alle times[]                       │          │
│  │   → 'weekly': nur wenn Wochentag in days[]       │          │
│  └──────────────────────┬──────────────────────────┘          │
│                         │                                      │
│           ┌─────────────┼──────────────────┐                  │
│           ▼             ▼                  ▼                  │
│   Phase 1 (0-5 Min)   Phase Snooze      Phase 2 (60 Min)    │
│   ┌──────────────┐    ┌──────────────┐  ┌──────────────────┐ │
│   │ Erste         │    │ Snooze-Zeit  │  │ Verpasst:         │ │
│   │ Erinnerung   │    │ abgelaufen?  │  │ INSERT med_log   │ │
│   │              │    │              │  │ status='missed'   │ │
│   │ Push + In-App│    │ Re-Erinnerung│  │                   │ │
│   │              │    │ senden       │  │ Audit:            │ │
│   └──────────────┘    └──────────────┘  │ medication_missed │ │
│                                          │                   │ │
│                                          │ Senior + Helfer   │ │
│                                          │ benachrichtigen   │ │
│                                          └──────────────────┘ │
│                                                                │
│  Senior reagiert:                                              │
│  POST /api/care/medications/log                                │
│  ┌────────────┬────────────┬─────────────┐                    │
│  │  'taken'   │ 'skipped'  │  'snoozed'  │                    │
│  │            │            │ +30 Min      │                    │
│  │ confirmed_ │            │ snoozed_    │                    │
│  │ at = now() │            │ until=now+30│                    │
│  │            │            │             │                    │
│  │ Audit:     │ Audit:     │ Audit:      │                    │
│  │ med_taken  │ med_skipped│ med_snoozed │                    │
│  └────────────┴────────────┴─────────────┘                    │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. Deployment-Architektur

### 9.1 Infrastruktur

```
┌──────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT                                 │
│                                                              │
│  ┌─────────────────────────────────┐                        │
│  │       Vercel (fra1)             │                        │
│  │                                  │                        │
│  │  Next.js 16 App                  │                        │
│  │  ├── SSR / RSC                   │                        │
│  │  ├── API Routes (/api/care/*)    │                        │
│  │  ├── Middleware (auth)           │                        │
│  │  └── Static Assets (CDN)        │                        │
│  │                                  │                        │
│  │  Vercel Cron Jobs (6 gesamt):   │                        │
│  │  ├── /api/news/scrape     Mo 07:00                       │
│  │  ├── /api/news/rss        Mi+Sa 07:00                   │
│  │  ├── /api/care/cron/escalation  * * * * *  (1 Min)      │
│  │  ├── /api/care/cron/checkin     */5 * * * * (5 Min)     │
│  │  ├── /api/care/cron/medications */5 * * * * (5 Min)     │
│  │  └── /api/care/cron/appointments */5 * * * * (5 Min)    │
│  │                                  │                        │
│  │  Environment Variables:          │                        │
│  │  ├── NEXT_PUBLIC_SUPABASE_URL    │                        │
│  │  ├── NEXT_PUBLIC_SUPABASE_ANON_KEY                       │
│  │  ├── SUPABASE_SERVICE_ROLE_KEY   │                        │
│  │  ├── CARE_ENCRYPTION_KEY         │                        │
│  │  ├── CRON_SECRET                 │                        │
│  │  ├── TWILIO_SID (future)         │                        │
│  │  ├── TWILIO_AUTH_TOKEN (future)  │                        │
│  │  └── TWILIO_PHONE_NUMBER (future)│                        │
│  └─────────────────┬───────────────┘                        │
│                    │                                         │
│                    │ HTTPS (TLS 1.3)                        │
│                    ▼                                         │
│  ┌─────────────────────────────────┐                        │
│  │  Supabase Cloud (EU Frankfurt)  │                        │
│  │                                  │                        │
│  │  PostgreSQL 15+                  │                        │
│  │  ├── 32 Migrationen (001-032)    │                        │
│  │  ├── RLS auf allen Tabellen      │                        │
│  │  ├── 4 Custom Functions          │                        │
│  │  └── 3 Trigger (Audit, updated_at)                       │
│  │                                  │                        │
│  │  Auth (GoTrue)                   │                        │
│  │  ├── Email/Password              │                        │
│  │  └── Session (JWT)               │                        │
│  │                                  │                        │
│  │  Realtime                        │                        │
│  │  └── postgres_changes            │                        │
│  │      (SOS-Alerts Live-Updates)   │                        │
│  │                                  │                        │
│  │  Storage                         │                        │
│  │  └── care_documents Bucket       │                        │
│  └─────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Vercel Cron Jobs (Care-Modul)

| Cron Job              | Pfad                              | Intervall    | Funktion                                  |
|-----------------------|-----------------------------------|-------------|-------------------------------------------|
| SOS-Eskalation        | `/api/care/cron/escalation`       | Jede Minute | Offene Alerts zeitgesteuert eskalieren    |
| Check-in Scheduler    | `/api/care/cron/checkin`          | Alle 5 Min  | Check-ins erstellen, erinnern, eskalieren |
| Medikamenten-Cron     | `/api/care/cron/medications`      | Alle 5 Min  | Erinnerungen senden, Verpasste markieren  |
| Termin-Erinnerungen   | `/api/care/cron/appointments`     | Alle 5 Min  | Termin-Erinnerungen an Senior + Betreuer  |

Alle Care-Cron-Jobs verwenden `CRON_SECRET`-Authentifizierung:
```
Authorization: Bearer ${CRON_SECRET}
```

### 9.3 Gesundheits-Endpunkt

`GET /api/care/health` (`app/api/care/health/route.ts`) liefert den
Systemzustand ohne Authentifizierung (fuer Monitoring):

**Geprueft werden:**

1. `care_profiles` Tabelle erreichbar (inkl. Response-Zeit)
2. Offene SOS-Alerts (Anzahl aktiver Alerts)
3. Check-in Cron-Aktualitaet (letzter Check-in < 30 Min)
4. Audit-Log Integritaet (Anzahl Eintraege)
5. Subscriptions-Tabelle erreichbar

**Antwort-Format:**
```json
{
  "overall": "ok" | "warn" | "error",
  "checks": [
    { "name": "Care-Profile", "status": "ok", "detail": "5 Profile, 42ms", "responseMs": 42 },
    { "name": "SOS-Alarme", "status": "ok", "detail": "0 aktiv" },
    { "name": "Check-in Cron", "status": "ok", "detail": "Letzter vor 3 Min." },
    { "name": "Audit-Log", "status": "ok", "detail": "1247 Eintraege" },
    { "name": "Abonnements", "status": "ok", "detail": "5 Abonnements" }
  ],
  "timestamp": "2026-03-10T14:30:00.000Z"
}
```

In-Memory-Cache mit 5 Sekunden TTL verhindert ueberlastung bei
haeufigen Health-Check-Anfragen.

### 9.4 Datenbank-Schema (Care-Tabellen)

```
┌──────────────────────┐     ┌──────────────────────┐
│   care_profiles       │     │   care_subscriptions  │
│                      │     │                      │
│ id (PK)              │     │ id (PK)              │
│ user_id (FK→users)   │     │ user_id (FK→users)   │
│ care_level           │     │ plan                  │
│ emergency_contacts   │     │ status                │
│ medical_notes        │     │ trial_ends_at         │
│ preferred_hospital   │     │ current_period_*      │
│ insurance_number     │     │ payment_provider      │
│ checkin_times        │     │ external_sub_id       │
│ checkin_enabled      │     └──────────────────────┘
│ escalation_config    │
└──────────┬───────────┘
           │ user_id
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│   care_sos_alerts     │────▶│  care_sos_responses   │
│                      │     │                      │
│ id (PK)              │     │ id (PK)              │
│ senior_id (FK→users) │     │ sos_alert_id (FK)    │
│ category             │     │ helper_id (FK→users) │
│ status               │     │ response_type        │
│ current_escalation_  │     │ eta_minutes           │
│   level (1-4)        │     │ note                  │
│ escalated_at[]       │     └──────────────────────┘
│ accepted_by          │
│ resolved_by/at       │
│ notes, source        │
└──────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐
│   care_checkins       │     │   care_medications    │
│                      │     │                      │
│ id (PK)              │     │ id (PK)              │
│ senior_id (FK)       │     │ senior_id (FK)       │
│ status               │     │ name, dosage          │
│ mood                 │     │ schedule (JSONB)      │
│ note                 │     │ instructions          │
│ scheduled_at         │     │ managed_by (FK)       │
│ completed_at         │     │ active                │
│ reminder_sent_at     │     └──────────┬───────────┘
│ escalated            │                │
└──────────────────────┘                ▼
                              ┌──────────────────────┐
┌──────────────────────┐     │  care_medication_logs  │
│   care_appointments   │     │                      │
│                      │     │ id (PK)              │
│ id (PK)              │     │ medication_id (FK)   │
│ senior_id (FK)       │     │ senior_id (FK)       │
│ title, type          │     │ scheduled_at          │
│ scheduled_at         │     │ status                │
│ duration_minutes     │     │ confirmed_at          │
│ location             │     │ snoozed_until         │
│ reminder_minutes_    │     └──────────────────────┘
│   before[]           │
│ recurrence           │     ┌──────────────────────┐
│ managed_by (FK)      │     │   care_helpers        │
│ notes                │     │                      │
└──────────────────────┘     │ id (PK)              │
                              │ user_id (FK)         │
┌──────────────────────┐     │ role                  │
│   care_audit_log      │     │ verification_status   │
│   (APPEND-ONLY)      │     │ verified_by (FK)      │
│                      │     │ assigned_seniors[]    │
│ id (PK)              │     │ availability          │
│ senior_id (FK)       │     │ skills[]              │
│ actor_id (FK)        │     │ response_count        │
│ event_type (22 Typen)│     │ avg_response_minutes  │
│ reference_type/id    │     └──────────────────────┘
│ metadata (JSONB)     │
│ created_at           │     ┌──────────────────────┐
│                      │     │   care_documents      │
│ TRIGGER: no UPDATE   │     │                      │
│ TRIGGER: no DELETE   │     │ id (PK)              │
└──────────────────────┘     │ senior_id (FK)       │
                              │ type                  │
                              │ title                 │
                              │ period_start/end      │
                              │ generated_by (FK)     │
                              │ storage_path          │
                              │ file_size_bytes       │
                              └──────────────────────┘
```

### 9.5 Performance-Indizes

| Tabelle            | Index                           | Typ     | Zweck                              |
|--------------------|---------------------------------|---------|------------------------------------|
| care_sos_alerts    | `idx_care_sos_status`           | B-Tree  | Status-basierte Abfragen           |
| care_sos_alerts    | `idx_care_sos_senior`           | B-Tree  | Senior-spezifische Abfragen        |
| care_sos_alerts    | `idx_care_sos_escalation`       | B-Tree  | Cron: offene Alerts finden         |
| care_checkins      | `idx_care_checkins_senior`      | B-Tree  | Senior-spezifische Abfragen        |
| care_checkins      | `idx_care_checkins_scheduled`   | B-Tree  | Cron: faellige Check-ins           |
| care_audit_log     | `idx_care_audit_senior`         | B-Tree  | Senior-spezifische Audit-Abfragen  |
| care_audit_log     | `idx_care_audit_created`        | B-Tree  | Zeitbasierte Audit-Abfragen        |
| care_helpers       | `idx_care_helpers_assigned`     | GIN     | Array-Suche: assigned_seniors      |

---

## Anhang: Umgebungsvariablen

| Variable                        | Erforderlich | Beschreibung                          |
|---------------------------------|-------------|---------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | Ja          | Supabase Projekt-URL                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja          | Supabase oeffentlicher Schluessel     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Ja          | Supabase Admin-Schluessel (Server)    |
| `CARE_ENCRYPTION_KEY`           | Ja          | 64-Hex AES-256 Schluessel             |
| `CRON_SECRET`                   | Empfohlen   | Bearer-Token fuer Cron-Endpunkte      |
| `TWILIO_SID`                    | Optional    | Twilio Account SID (SMS/Voice)        |
| `TWILIO_AUTH_TOKEN`             | Optional    | Twilio Auth-Token                     |
| `TWILIO_PHONE_NUMBER`           | Optional    | Twilio Absender-Nummer                |
