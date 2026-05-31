# Profi-Vertical-Lösch-FKs — Folge-Welle (Planung)

**Datum:** 2026-05-31
**Status:** PLANUNG (keine Migration geschrieben, keine Code-Änderung)
**Autor:** Claude (Analyse gegen Prod `uylszchlyhbpbmslcnka` read-only verifiziert)
**Kontext:** Letzter offener Block-A-Punkt (Pre-Pilot-Audit 2026-05-29). Knüpft an
`2026-05-29-dsgvo-cluster-b-betroffenenrechte-plan.md` Zeile 52 an (dort wurde die Profi-Vertical-FK-Welle
explizit **vertagt**).

> **Pre-Check (Regel `.claude/rules/pre-check.md`):** Bestehende Infrastruktur gesucht und gefunden —
> `lib/services/gdpr/user-data-registry.ts` (kanonische Registry + dokumentierte Vertagung Z. 14-17/226-228),
> `lib/services/gdpr/account-deletion.service.ts` (fail-loud), Migrationen `20260529140000` (Teil 1) +
> `20260530120000` (Teil 2, Nicht-Profi-Aktoren, idempotent/drift-tolerant). **Diese Welle erweitert die
> bestehende Single-Source-Architektur — sie baut nichts neu.** Es existiert KEIN Soft-Delete-/Retention-
> Marker-Schema und KEIN fristengesteuerter Cron für Profi-Daten — das ist genuin offen.

---

## 1. Ausgangslage

Beim DSGVO-Löschkonzept (PR #29–#31) wurden Care-/Memory-/Group-Daten (Teil 1) und 25 Nicht-Profi-Aktor-FKs
(Teil 2, → `SET NULL`) umgestellt. **51 Foreign Keys auf `users(id)` stehen weiterhin auf `NO ACTION`** und
blockieren damit jedes `DELETE public.users` für betroffene Nutzer. Verifiziert gegen Prod (`pg_constraint`):
**genau 51, alle Profi-Vertical** (Medical, Civic/OZG, Prevention, Pflege-Profi, Practice/Team).

**Wirkung heute:** `account-deletion.service.ts` ist fail-loud — ein nicht umgestellter FK lässt die RPC
`gdpr_delete_user` werfen → ServiceError 500. Konkret: **ein Arzt-/Civic-/Prevention-aktiver Nutzer ist
derzeit gar nicht löschbar** (kein Silent-Fail, aber auch kein Erfolg). Im geschlossenen Resident-Pilot
ist das aktuell folgenlos (0 Profi-Nutzer außer dem nicht-löschbaren Founder).

`nachbar-arzt/supabase/migrations/` ist leer — alle Profi-Tabellen liegen im `nachbar-io`-Schema.

## 2. Die 51 FKs (Prod-verifiziert)

Parent ist `auth.users` außer wo „public" vermerkt. Alle aktuell `ON DELETE NO ACTION`.

| # | Tabelle | Spalte(n) | Parent | NOT NULL | Vertical |
|---|---|---|---|---|---|
| 1-2 | anamnesis_forms | doctor_id / patient_id | auth | ja / nein | Medical |
| 3-4 | appointments | doctor_id / patient_id | auth | ja / nein | Medical |
| 5-7 | medical_documents | doctor_id / patient_id / uploader_id | auth | ja | Medical |
| 8-9 | medical_message_threads | doctor_id / patient_id | auth | ja | Medical |
| 10-11 | medical_messages | sender_id / recipient_id | auth | ja | Medical |
| 12-13 | doctor_reviews | doctor_id / patient_id | auth | ja | Medical |
| 14-15 | prescription_requests | doctor_id / patient_id | auth | ja | Medical |
| 16 | prescriptions | resident_id | public | ja | Medical |
| 17-18 | recall_reminders | doctor_id / patient_id | auth | ja | Medical |
| 19-20 | waiting_room | doctor_id / patient_id | auth | ja | Medical |
| 21 | practices | owner_id | auth | ja | Practice |
| 22 | practice_members | doctor_id | auth | ja | Practice |
| 23 | team_messages | sender_id | public | ja | Practice-Team |
| 24 | team_read_receipts | user_id | public | ja | Practice-Team |
| 25-26 | pflege_resident_assignments | assigned_by / revoked_by | auth | ja / nein | Pflege-Profi |
| 27 | civic_announcements | created_by | auth | nein | Civic |
| 28 | civic_appointments | created_by | auth | nein | Civic |
| 29 | civic_document_requests | requested_by | auth | nein | Civic |
| 30 | civic_events | created_by | auth | nein | Civic |
| 31 | civic_surveys | created_by | auth | nein | Civic |
| 32 | civic_survey_votes | user_id | auth | ja | Civic |
| 33 | civic_message_attachments | uploaded_by | auth | ja | Civic |
| 34-36 | civic_messages | citizen_user_id / sender_user_id / read_by | auth | ja/ja/nein | Civic |
| 37 | citizen_reports | reported_by | auth | nein | Civic/OZG |
| 38 | construction_sites | created_by | auth | nein | Civic/OZG |
| 39 | crisis_alerts | created_by | auth | nein | Civic/OZG |
| 40 | municipal_announcements | author_id | auth | nein | Civic/OZG |
| 41 | prevention_courses | instructor_id | public | ja | Prevention |
| 42 | prevention_course_content | updated_by | public | nein | Prevention |
| 43-45 | prevention_enrollments | user_id / payer_user_id / certificate_issued_by | public | ja/nein/nein | Prevention |
| 46 | prevention_group_calls | instructor_id | public | ja | Prevention |
| 47-48 | prevention_messages | sender_id / recipient_id | public | ja / nein | Prevention |
| 49 | prevention_payments | payer_user_id | public | nein | Prevention |
| 50 | prevention_reviews | user_id | public | ja | Prevention |
| 51 | prevention_visibility_consent | user_id | public | ja | Prevention |

Bereits gelöst (NICHT Teil der 51): `doctor_profiles`, `doctor_consents`, `civic_members` (CASCADE),
`practice_announcements` (CASCADE), `civic_audit_log` (SET NULL).

## 3. Strategie-Gruppen (Vorschlag — pro FK vor Bau final klassifizieren)

**Gruppe A — Aktor-/Bezugs-FKs OHNE eigene Aufbewahrungspflicht → `SET NULL`.**
Sofort lösbar, gleiches sicheres/idempotente Muster wie Teil 2. Bezug anonymisieren, fachliche Zeile bleibt.
NOT-NULL-Spalten vorher nullable machen. Kandidaten: alle `civic_*.created_by/requested_by/uploaded_by/
author_id/read_by`, `citizen_reports`, `construction_sites`, `crisis_alerts`, `municipal_announcements`,
`prevention_*.instructor_id/updated_by/certificate_issued_by`, `pflege_resident_assignments.assigned_by/
revoked_by`. **Kein Rechtsthema — keine Albiez-Abnahme nötig.**

**Gruppe B — Behandlungsdaten mit §630f-Pflicht (10 Jahre ab Behandlungsende) → getrennte Löschung.**
NICHT CASCADE, NICHT SET NULL der Patientenakte. Tabellen: `anamnesis_forms`, `appointments`,
`medical_documents`, `medical_message_threads`, `medical_messages`, `prescription_requests`, `prescriptions`,
`recall_reminders`, `waiting_room`, `doctor_reviews`. Empfehlung: Behandlungsdaten in pseudonymisierten
Aufbewahrungs-Zustand überführen (`auth.users`-Verknüpfung lösen, fachliche Patient-Referenz über separate
fristengesteuerte ID) + `retention_until = behandlungsende + 10 J` + Cron, der erst nach Fristablauf hart
löscht. **Braucht dokumentiertes Konzept (DSFA erweitern) + Albiez-Abnahme vor erstem Arzt-Nutzer.**

**Gruppe C — Praxis-/Prevention-Mitgliedschaft & Abrechnung → gemischt.**
`prevention_enrollments`/`_payments` (Zahlungs-/Rechnungsbezug → §147 AO 10 J, wie Buchhaltung in Teil 2 →
`SET NULL`, Beleg bleibt). `practices.owner_id`/`practice_members`/`team_*`/`prevention_reviews`/
`_visibility_consent`/`_messages` (Aktivität → Subjekt, ggf. CASCADE oder SET NULL — pro Tabelle prüfen).

## 4. Empfohlener Split

| Teil | Inhalt | Aufwand | Rechtsabnahme | Wann |
|---|---|---|---|---|
| **Teil 3 (jetzt machbar)** | Gruppe A + Abrechnungs-SET-NULL aus C (~16-20 FKs) | klein, etabliertes Muster | nein | autonom mit Founder-Go, eine Migration |
| **Teil 4 (vor Profi-Pilot)** | Gruppe B §630f-Behandlungsakte (~16 FKs) + Retention-Cron + DSFA-Erweiterung | groß | **ja (Albiez)** | vor erstem Arzt-/Pflege-Profi-Nutzer |

**Begründung Split:** Civic/OZG ist KEIN 10-Jahre-Fall. Ein (künftiger) Bürger im Civic-Pilot wäre durch
Gruppe-A-FKs **grundlos** nicht löschbar. Teil 3 räumt das mit dem schon abgenommenen SET-NULL-Muster aus —
ohne das rechtlich komplexe §630f-Konzept abzuwarten. Teil 4 bleibt bewusst vor dem Profi-Pilot, weil es
ein Rechts- nicht nur Technik-Thema ist.

## 5. Mini-Audit-Skizze (Regel `.claude/rules/security-mini-audit.md`)

Bei Bau von Teil 3 Pflicht-Block ausfüllen. Voraussichtlich:
- **RLS/Trigger:** FK-ON-DELETE-Änderung ist Policy-neutral (nur `ALTER TABLE … DROP/ADD CONSTRAINT`).
  Prüfen, dass keine NOT-NULL→NULL-Lockerung einen RLS-WRITE-Pfad öffnet (SET NULL nur auf Aktor-Spalten,
  nicht auf Scope-/Owner-Spalten, die RLS nutzt).
- **Privilege-Spalten:** keine `is_admin`/`role`/`trust_level` betroffen.
- **Audit-Trail:** Löschung protokolliert weiterhin via `data_requests` (bestehend).
- **Rate-Limit:** unverändert (Lösch-Anfrage 3/h In-Memory).
- **Registry-Konsistenz:** `migration-consistency.test.ts` um die neuen FKs erweitern (RED→GREEN).

## 6. Offene Fragen (Founder / Albiez)

1. **Split-Freigabe:** Teil 3 (Gruppe A SET NULL) jetzt bauen — ja/nein? (Sicher, kein Rechtsthema,
   macht Nicht-Medical-Profi-Nutzer löschbar.)
2. **§630f-Frist-Modell (Teil 4):** 10 Jahre ab Behandlungsende (nicht ab Konto-Löschung). Braucht Albiez-
   Abnahme + DSFA-Erweiterung (`docs/18_DSFA_CARE_MODUL.md` Z. 118-127 deckt 10-J-Medical bisher NICHT ab).
3. **Gruppe C pro Tabelle:** Welche Prevention-Tabellen sind Abrechnung (§147 AO, SET NULL) vs. reine
   Aktivität (CASCADE)? Vor Bau final festlegen.

## 7. Bewusst NICHT getan

- Keine Migration geschrieben (Founder entscheidet über Teil-3-Bau).
- Keine Prod-Änderung.
- Branch-Replay-Test nicht möglich (Prod-Drift stoppt Replay bei Mig 002) → wie Cluster B:
  Migration-Static-Test + synthetischer Prod-Lösch-Test beim Apply.
