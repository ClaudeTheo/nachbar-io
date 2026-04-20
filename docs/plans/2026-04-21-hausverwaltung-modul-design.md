# Design-Plan — Hausverwaltungs-Modul fuer QuartierApp

**Datum:** 2026-04-21 (Iteration 2, Design nach zwei Codex-Review-Runden)
**Autor:** Claude Opus 4.7 (1M)
**Status:** Architektur-Entscheidungen gesetzt, Funktions-Priorisierung offen bis Hausverwalter-Email-Antwort.
**Vorgeschichte:**
- Iteration 1 Brief: `docs/plans/2026-04-21-hausverwaltung-codex-review-brief.md`
- Iteration 1 Antwort (NO-GO, Showstopper): `docs/plans/2026-04-21-hausverwaltung-codex-review-antwort.md`
- V2-Brief: `docs/plans/2026-04-21-hausverwaltung-codex-v2-brief.md`
- V2-Antwort (GO mit Korrekturen): Codex liefert im Chat (noch nicht als Datei abgelegt; Inhalt hier eingearbeitet).
- 1-Pager fuer Founder-Email: `docs/plans/2026-04-21-hausverwaltung-1pager-hausverwalter.md`

---

## 1) Zielbild (kurz)

Eine **Bewohner-App fuer Senioren und Familien**, die auch **ohne Hausverwaltung** funktioniert. Wenn die eigene Hausverwaltung mitmacht, bekommt der Bewohner eine zusaetzliche Kachel "Hausverwaltung" mit vier Funktionen — Bedienung per Antippen, Sprache und Foto, ohne Texteingabe-Pflicht. Die Hausverwaltung arbeitet in einem schmalen Cockpit im Browser. Fuer die Hausverwaltung ist das ein **dokumentierter Bewohner-Kanal mit Eingangsbestaetigung** — keine neue Verwaltungssoftware, kein Ersatz fuer Casavi/Immoware24/etg24, kein Buchhaltungs-/Nebenkosten-/WEG-System.

**Sprache:** "dokumentierter Kanal", "nachvollziehbarer Meldeweg", "Eingangsbestaetigung", "beweisstaerker". Kein Einsatz von "rechtssicher" (juristisch unhaltbare Werbeaussage).

## 2) Strategische Rahmenbedingungen (gesetzt)

- **Free-first:** Bewohner-App bleibt grundsaetzlich frei nutzbar, auch ohne Quartier, ohne Gruppe, ohne Hausverwaltung.
- **Hausverwaltung ist optionaler B2B-Layer**, kein Eintritt zur App.
- **Keine zweite Endnutzer-App** — dieselbe Bewohner-App in normaler und Senior-Modus-Darstellung.
- **`civic` wird gezielt adaptiert**, NICHT als ganzer Business-Strang reaktiviert. Pflege/admin bleiben eingefroren.
- **Welle-C-Push ist nicht betroffen.** Der Hausverwaltungs-Code beginnt erst nach Notar 27.04. + AVV + Welle-C-Push.
- **MRR-Vor-Ausbau-Regel gilt weiter:** civic-Reaktivierung ist kein Freibrief fuer Pro-Community-Vertrieb.

## 3) Architektur-Entscheidungen (9 Festlegungen)

Alle Festlegungen nach Codex V1-Review (NO-GO-Korrekturen) und V2-Review (GO-mit-Korrekturen) konsolidiert.

### F1 — Free-first via Schatten-Quartier "Offenes Quartier Deutschland"

- **Entscheidung:** Bewohner ohne Quartier-Wahl werden einem Pseudo-Quartier "Offenes Quartier Deutschland" zugeordnet. RLS-Standard-Pattern `get_user_quarter_id()` (Mig 051/052) laeuft unveraendert.
- **Alternative verworfen:** Echter NULL-Refactor von `households.quarter_id` waere 8-10 Tabellen + flaechiger RLS-Umbau + Welle-C-Kollision.
- **Realistischer Scope (Codex-Korrektur):** Nicht 5, sondern **~15-20 Stellen**:
  - `app/(auth)/register/components/RegisterStepAddress.tsx` (Skip-Option im Flow)
  - `app/(auth)/register/components/RegisterStepIdentity.tsx`
  - `lib/services/registration.service.ts` (`completeRegistration()`)
  - `lib/services/household.service.ts` (Quartier-Zuordnung bei Haushaltsanlage)
  - `QuarterProvider` + Quarter-Hooks
  - Frontend-Queries mit `.eq("quarter_id", currentQuarter.id)` in: Dashboard, Reports, Board, Help, Marketplace, News, Events
  - UI-Maskierung: "Offenes Quartier" wird als "ohne Quartier" dargestellt
  - Seed-Migration mit UUID-fixem Pseudo-Quartier
- **Risiko:** Onboarding-Drift (`modules/onboarding/components/OnboardingFlow.tsx` referenziert `quarter_memberships`, das nicht existiert) — vor Umsetzung klaeren.

### F2 — HV-Org in `civic_organizations` mit `type='housing'`

- **Entscheidung:** `civic_organizations.type` (Mig 114, `text NOT NULL DEFAULT 'kommune'`) wird um den Wert `'housing'` erweitert. Kein ENUM, daher keine ENUM-Migration noetig.
- **`'housing'` in `organizations.org_type` (Mig 073)** wird als **deprecated** markiert (kein Drop, nur Doku).
- **Codex-Korrektur akzeptiert:** civic-seitig reicht der Type-Add fuer Postfach/Mitteilungen. Aber `/org`, `/api/organizations`, Nav und Teile von Billing/Push haengen weiter an `organizations/org_members`.
- **Konsequenz F6:** Cockpit-Nav muss civic-aware gemacht werden (siehe F6).

### F3 — `municipal_reports` erweitern statt duplizieren

- **Entscheidung:** `report_category` ENUM (Mig 097) wird um Hausverwaltungs-Werte erweitert:
  - Neu: `heating, water, electrical, elevator, noise, common_area, mailbox, other_housing`
  - Bestehend bleibt: `street, lighting, greenery, waste, vandalism, other`
- **Neue Spalte:** `municipal_reports.target_org_id UUID NULL REFERENCES civic_organizations(id)`
  - `NULL` = Quartier-Maengel (wie bisher)
  - Gesetzt = Mietsache-Maengel an diese HV
- **RLS-Policies:**
  - Bestehende `reports_insert` / `reports_select` bleiben fuer `target_org_id IS NULL`.
  - Neue Policies: `housing_reports_insert` (Bewohner mit `housing_resident_links`-Verknuepfung), `housing_reports_select_staff` (civic_members mit role=admin in der civic_organization).
- **Codex-Korrektur akzeptiert:** Auch App-Seite muss mit:
  - `lib/municipal/types.ts` — ReportCategory-Typ erweitern
  - `lib/municipal/constants.ts` — Kategorien-Labels
  - `app/(app)/reports/new/page.tsx` — Formular mit target-Auswahl
  - `app/(app)/org/reports/OrgReportsClient.tsx` — Org-Filter
  - `municipal_report_comments`-RLS target-aware machen

### F4 — `civic_appointments` erweitern statt `housing_appointments` neu

- **Alte Festlegung verworfen:** Neue `housing_appointments`-Tabelle.
- **Neue Festlegung (Codex-Korrektur):** `civic_appointments` existiert bereits (Mig 114, Zeilen 372-396) mit Feldern `scheduled_at`, `service_type`. Wird erweitert um:
  - `civic_org_id UUID NULL REFERENCES civic_organizations(id)`  (NULL = Rathaus, gesetzt = Hausverwaltung)
  - `household_id UUID NULL REFERENCES households(id)` (fuer HV-Termine: welche Wohnung)
  - `category TEXT` (heating/water/... analog zu F3)
  - `notes TEXT NULL`
  - `created_by UUID REFERENCES auth.users(id)`
  - `updated_at TIMESTAMPTZ DEFAULT now()`
  - `reminder_at TIMESTAMPTZ NULL` (fuer 1h-Vorher-Push)
  - `status text DEFAULT 'vorgeschlagen' CHECK (status IN ('vorgeschlagen','bestaetigt','verschoben','erledigt'))`
- **RLS:** Bewohner sieht eigene Termine (eigener household_id oder user_id), civic_members mit Staff-Rolle in der civic_organization sehen alle Org-Termine.
- **Vorbild:** `065_consultation_slots.sql` fuer Reminder-Pattern (scheduled_at + duration_minutes).

### F5 — Hausverwalter-Validation als harte Vorbedingung (Email-Tor)

- **Kein Code**, bis der Hausverwalter-Kontakt auf die 1-Pager-Email geantwortet hat.
- **1-Pager-Text:** `docs/plans/2026-04-21-hausverwaltung-1pager-hausverwalter.md`
- **Auswertungstabelle** ist am Ende des 1-Pagers fuer jede Antwort-Variante hinterlegt.

### F6 — Cockpit als Adaption von `app/(app)/org/`, aber mit civic-aware Nav

- **Entscheidung:** HV-Cockpit unter `app/(app)/org/housing/*`. Wiederverwendung von `app/(app)/org/layout.tsx` (1616 B) und bestehendem Nav-Pattern.
- **Codex-Korrektur akzeptiert:** `/org`-Nav (`components/nav/NavConfig.ts`), `app/api/organizations/route.ts` und `modules/admin/services/organizations.service.ts` nutzen heute `organizations/org_members`. Fuer Housing-Rolle muessen diese **civic-aware** gemacht werden:
  - `NavConfig.ts` liefert Housing-Nav-Items, wenn User in `civic_members` mit einem civic_org vom type='housing' ist
  - `/api/organizations` liefert auch civic_organizations-Mitgliedschaften
  - Guards in `modules/admin/services/organizations.service.ts` pruefen beide Welten
- **Alternative verworfen:** Eigene Routen-Gruppe `(verwalter)/` oder eigene App — waere Doppel-Pflege und widerspraeche "minimale civic-Adaption".

### F7 — Resident-Link als eigene Tabelle, NICHT org_members-Rolle

- **Entscheidung:** Neue Tabelle `housing_resident_links`:
  ```
  id UUID PRIMARY KEY,
  civic_org_id UUID NOT NULL REFERENCES civic_organizations(id),
  household_id UUID NOT NULL REFERENCES households(id),
  user_id UUID NULL REFERENCES auth.users(id),  -- optional, fuer per-User-Verknuepfung
  linked_by UUID NOT NULL REFERENCES auth.users(id), -- HV-Staff, der verknuepft hat
  linked_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL,
  UNIQUE(civic_org_id, household_id)
  ```
- **Codex-Korrektur akzeptiert:** `org_members` mit `role='resident'` wuerde Bewohner in Staff-UI ziehen — schlechtes Muster.
- **Vorbild existiert:** `132_pflege_resident_assignments.sql`, `071_caregiver_links.sql`.
- **RLS:** Bewohner sieht eigene Verknuepfung (household_id oder user_id match), civic_members sehen Verknuepfungen der eigenen civic_organization.

### F8 — Kachel-Einhaengung pragmatisch in 4 Stellen (kein Registry-Refactor)

- **Entscheidung:** HV-Kachel (Conditional "wenn `housing_resident_links` fuer User existiert") wird in 4 Stellen einzeln eingefuegt:
  - `components/dashboard/QuickActions.tsx` (normale App)
  - `components/dashboard/DiscoverGrid.tsx` (normale App, Discover)
  - `app/(senior)/kreis-start/page.tsx` (Senior-Startseite 1)
  - `app/senior/home/page.tsx` (Senior-Startseite 2)
- **Codex-Hinweis akzeptiert:** Kachel-Registry waere sauberer, aber eigenes Refactor-Thema, nicht MVP.
- **Risiko:** Produkt-Drift zwischen `/kreis-start` und `/senior/home` — Test pflicht, beide Pfade identisch zu halten.

### F9 — Push ueber bestehende Pipeline, aber mit Fix fuer Org-Staff-Lookup

- **Entscheidung:** HV-Mitteilungen und Status-Updates nutzen bestehende Push-Infrastruktur (`lib/push-delivery.ts`, Mig 161-167 Chat).
- **Codex-Korrektur akzeptiert:** `notifyOrgStaff()` in `lib/push-delivery.ts` sucht in `organizations/org_members` — muss **zusaetzlich civic_organizations/civic_members** unterstuetzen, sonst erreichen Mitteilungen die HV-Staff nicht.
- **Channels:** Bewohner auf bestehendem `io`-Portal, HV-Staff auf `civic`-Portal. Kein neuer `housing`-Channel noetig.
- **Notification-Type:** `notifications`-Constraint (Mig 037) kennt heute keinen `housing`-Type. Entweder vorhandenen Type (`system` / `announcement`) wiederverwenden ODER Constraint erweitern. Entscheidung im Implementation-Plan.

## 4) Funktionsumfang — 4 Funktionen (Priorisierung offen)

Diese Sektion bleibt **offen bis zur Hausverwalter-Email-Antwort** auf Frage 2 des 1-Pagers: "Welches der vier Themen wuerden Sie zuerst sehen wollen?". Die Technik aller 4 ist im Design-Plan vorgesehen; die Reihenfolge im Implementation-Plan haengt von der Antwort ab.

| # | Funktion | Bewohner-Seite | Cockpit-Seite | Technische Basis |
|---|---|---|---|---|
| 1 | **Maengelmeldung** | Kategorie antippen (F3-Enum-Werte), Foto + Voice, "Abschicken" | Tabelle mit Status, Foto, Sprachtranskript, Status-Aenderung | F3 (`municipal_reports` + target_org_id + Enum-Erweiterung) |
| 2 | **Hausmitteilungen** | Liste im Posteingang, Vorlesen-Button | Texteingabe + Zielauswahl (alle / Haus / Wohnung) + Lesebestaetigung-Anzeige | `municipal_announcements` (Mig 098) + F2 target_org-Filter + F9 Push |
| 3 | **Dokumenten-Postfach** | Button "Briefe", PDF mit Vorlesen-Button | Upload PDF + Zielauswahl + Empfangsbestaetigung | `civic_messages` + `civic_message_attachments` (Mig 146/149) + F2 |
| 4 | **Termine** | Kalender-Karte, 1h-Vorher-Erinnerung | Termin anlegen, Mieter bestaetigt/verschiebt | F4 (`civic_appointments` erweitert) |

**Sprachbausteine** (aus bestehenden nachbar-io-Bausteinen wiederverwendet, nicht dupliziert):
- TTS-Vorlesen: TTS-Layer-1-Cache (Mig 168) NUR fuer Standardphrasen ("Neue Mitteilung von Ihrer Hausverwaltung"). **Niemals fuer privaten Briefinhalt oder Mieter-Namen.** Privatpfad ohne Cache fuer sensitive Texte.
- Voice-Diktat: Voice-Pipeline (`modules/voice/services/tool-executor.ts`). **Risiko:** `issue_reports`-Referenz im Tool-Executor zeigt auf nicht-existente Tabelle. Vor MVP entweder umleiten auf `municipal_reports` oder Voice-Tool fuer Housing neu anbinden.

## 5) Migrationen (geplant, nicht angewendet)

Alle idempotent nach `.claude/rules/db-migrations.md`. File-first-Regel: Dateien vor Prod-Apply.

| Nr | Name | Inhalt (Kurz) |
|---|---|---|
| **175** | `housing_foundation.sql` | `civic_organizations.type`-Doku-Update (keine Schema-Aenderung, da text NOT NULL). Seed: Schatten-Quartier "Offenes Quartier Deutschland" mit fixer UUID. |
| **176** | `housing_report_category_expand.sql` | `report_category`-Enum um 8 Werte erweitert. `municipal_reports.target_org_id` Spalte + Index + RLS-Policy-Update. |
| **177** | `housing_appointments_expand.sql` | `civic_appointments` um Felder civic_org_id, household_id, category, notes, created_by, updated_at, reminder_at, status. RLS anpassen. |
| **178** | `housing_resident_links.sql` | Neue Tabelle `housing_resident_links` + RLS (Bewohner eigene, civic_members eigene Org). |
| **179** | `housing_notification_type.sql` | Entscheidung aus F9: entweder bestehenden Type wiederverwenden oder Constraint erweitern. |
| (179b?) | `organizations_housing_deprecated.sql` | Doku-Kommentar im `organizations.org_type`-Check: `'housing'` deprecated. Kein Drop. |

**`.down.sql`-Dateien** pflicht.

## 6) RLS-Skizze (nicht in DDL, nur Prinzip)

- **Bewohner-Ebene:** sieht eigene Meldungen/Mitteilungen/Dokumente/Termine + die seiner HV (ueber `housing_resident_links`).
- **Staff-Ebene:** civic_members mit Role `admin` oder `viewer` in civic_organization vom type='housing' sehen alle Meldungen/... fuer ihre Org.
- **Bewohner kann nicht sehen:** andere Bewohner der gleichen HV (anonymisiert).
- **Staff kann nicht sehen:** Bewohner anderer HVs.
- **Admin-Override:** `is_admin = true` sieht alles (wie bisher).

## 7) UI-Routen-Karte

```
app/
  (auth)/register/                        ← Schatten-Quartier-Skip hier integrieren (F1)
  (app)/
    dashboard/                            ← QuickActions hat HV-Kachel (F8)
    reports/                              ← bestehend; target_org-aware (F3)
      new/                                ← Formular mit Target-Auswahl
    org/                                  ← bestehend
      housing/                            ← NEU: HV-Cockpit (F6)
        page.tsx                          ← Uebersicht
        reports/                          ← Maengelliste
        announcements/                    ← Mitteilungen
        documents/                        ← Postfach
        appointments/                     ← Termine
        residents/                        ← verknuepfte Mietparteien
  (senior)/
    kreis-start/                          ← HV-Kachel hier (F8)
  senior/
    home/                                 ← HV-Kachel hier (F8)
```

## 8) Tor-Bedingungen (gesetzt)

1. **Hausverwalter-Email-Antwort** (Frage 2 aus 1-Pager) bestimmt Priorisierung der 4 Funktionen.
2. **Welle-C-Push** (33-50 Commits, AVV-blockiert bis Notar 27.04.) muss vorher live sein.
3. **GmbH-Eintragung + AVV Anthropic/Mistral** erst nach Notar-Termin.
4. **Kein Push in Rote Zone** bis alle drei Tor-Bedingungen gruen sind.

## 9) Risiken + Mitigationen

| Risiko | Wahrsch. | Mitigation |
|---|---|---|
| Hausverwalter-Email-Antwort ist "kein Schmerz" | mittel | Modul wird gestoppt, Memory-Update, Idee zur Akte. Keine Code-Verschwendung. |
| Scope-Kriechen "civic als Business-Strang" | niedrig | Strategische Festlegung schwarz-auf-weiss: pflege/admin bleiben eingefroren. |
| Schatten-Quartier-Scope explodiert ueber 20 Stellen | mittel | Implementation-Plan als Vorab-Inventur; bei >30 Stellen Halt und Neu-Entscheidung. |
| Dritte Org-Welt (neue `housing_organizations`) durch Nachlaessigkeit | niedrig | Codex-V2 hat geprueft; V3-Brief nicht noetig; Code-Reviews halten wachsam. |
| Voice-Tool `issue_reports`-Referenz bricht Maengel-Diktat | hoch | Vor MVP-Start Voice-Tool-Executor an `municipal_reports` umleiten oder Housing-Tool neu. |
| TTS-Cache-Missbrauch fuer private Mieterpost | hoch | DSGVO/AVV-Risiko. Separater Privatpfad ohne Cache fuer sensitive Texte. Explizit im Implementation-Plan. |
| Produkt-Drift `/kreis-start` vs `/senior/home` durch Doppel-Einhaengung | mittel | E2E-Test pflicht, beide Routen identisch zu halten. |
| Onboarding-Drift `quarter_memberships` | niedrig | Vor F1-Umsetzung pruefen, ob `quarter_memberships` eine tote Referenz oder eine vergessene Tabelle ist. |

## 10) Was NICHT im MVP ist (explizit)

- Keine Buchhaltung, keine Nebenkostenabrechnung, keine WEG-Beschluss-Sammlung, keine Nebenkostenverteilung.
- Keine Schluesselverwaltung (Phase 2 wenn ueberhaupt).
- Keine Wartungstermin-Kette mit Handwerker-Koordination (Phase 2).
- Keine Familienkreis-Eskalation ("Tochter sieht Muttermitteilungen") — Phase 2.
- Keine Mehrsprachigkeit fuer Migrationshintergrund — Phase 2.
- Keine Integration mit Casavi/Immoware24/etg24 per API — Phase 3.
- Keine Nebenkosten-Erklaerungs-KI — Phase 3.
- Keine Dashboard-Registry als Refactor (Kachel wird hart an 4 Stellen eingehaengt).

## 11) Naechste Schritte

1. **Founder-Aktion:** Email rausschicken (1-Pager-Text in `docs/plans/2026-04-21-hausverwaltung-1pager-hausverwalter.md`). Tor zur Code-Phase.
2. **Claude-Aktion parallel (auf Founder-Signal):** `superpowers:writing-plans` aufrufen mit diesem Design-Plan als Input. Erzeugt `docs/plans/2026-04-21-hausverwaltung-modul-implementation.md` mit konkretem Task-Graphen.
3. **Kein Code** bis Welle-C-Push live + Email-Antwort da + GmbH eingetragen + AVV unterschrieben.
4. **Nach Email-Antwort:** Priorisierung der 4 Funktionen in Sektion 4 ausfuellen, Implementation-Plan entsprechend sortieren.

## 12) Konsens aus 2 Codex-Review-Runden

| Iteration | Urteil | Kernbefund |
|---|---|---|
| 1 | NO-GO | Pre-Check-Showstopper: vorhandene civic-Infra (municipal_reports, municipal_announcements, civic_messages, civic_appointments, /org) uebersehen. |
| 2 | GO mit Korrekturen | 5 Festlegungen tragen, 9 konkrete Korrekturen geliefert (Scope Schatten-Quartier, Org-Welt-Dualitaet in Nav/Push/Guards, App-Seite bei Enum-Erweiterung, Appointment-Felder-Ergaenzung, Resident-Link-Tabelle, Kachel-Einhaengung an 4 Stellen). Alle in diesem Design-Plan verarbeitet.

Kein V3-Brief mehr noetig. Implementation-Plan geht direkt aus diesem Design heraus.

---

**Hinweis:** Dieser Design-Plan ist Konsens aus Brainstorming, Marktrecherche, Pre-Check, Iteration 1 NO-GO, Iteration 2 GO. Abweichungen vom Founder erst nach ausdruecklicher Ablehnung einer Festlegung.
