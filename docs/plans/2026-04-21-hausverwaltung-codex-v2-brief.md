# Codex-Review V2 — Hausverwaltungs-Modul (nach Founder-Festlegungen)

**Datum:** 2026-04-21 (Iteration 2)
**Autor:** Claude Opus 4.7 (1M)
**Adressat:** OpenAI Codex (hoechste Stufe)
**Vorgeschichte:**
- Iteration 1 Brief: `nachbar-io/docs/plans/2026-04-21-hausverwaltung-codex-review-brief.md`
- Iteration 1 Antwort (NO-GO, Showstopper): `nachbar-io/docs/plans/2026-04-21-hausverwaltung-codex-review-antwort.md`
- Showstopper voll akzeptiert. Strategischer Pivot: Weg A (civic gezielt adaptieren, NICHT als Business-Strang reaktivieren).

**Status:** Founder hat 5 Architektur-Entscheidungen getroffen. Dieser V2-Brief bittet Codex, die **konkrete Adaptions-Architektur** auf Basis dieser Festlegungen zu pruefen — NICHT die Strategie noch einmal zu hinterfragen.

---

## 1) Founder-Festlegungen (gesetzt, kein Re-Brainstorm)

| # | Entscheidung | Begruendung (kurz) |
|---|---|---|
| 1 | **Free-first via Schatten-Quartier** "Offenes Quartier Deutschland". Bewohner ohne echte Quartier-Wahl wird automatisch zugeordnet, UI maskiert das als "ohne Quartier". | NULL-Refactor waere 8-10 Tabellen + flaechiger RLS-Umbau; Schatten-Quartier ist ~5 Stellen + 1 Seed. |
| 2 | **HV-Org lebt in `civic_organizations` mit neuem `type='housing'`**. Der `'housing'`-Wert in `organizations.org_type` (Mig 073) wird als deprecated markiert (kein Drop). | Alle nutzbaren Bausteine (Postfach, Messages, Reports, Announcements) haengen schon an `civic_organizations`. Adaption ist Type-Add, kein Tabellen-Refactor. |
| 3 | **Schadens-Taxonomie: `report_category` ENUM erweitern + `municipal_reports.target_org_id` UUID NULL Spalte.** RLS filtert Quartier-Maengel (target=NULL) vs HV-Maengel (target=civic_org). | Strukturell identische Use Cases (Foto + Voice + Status), zwei Inhalte. Eigene Tabelle waere Duplikat. |
| 4 | **Termine: Neue minimale `housing_appointments`-Tabelle.** Felder: `id, civic_org_id, household_id, title, slot_start, slot_end, status, created_at`. | `care_appointments` ist Pflege-Kontext mit falschen Feldern. Filter waere Schema-Vergewaltigung. |
| 5 | **Hausverwalter-Validation als harte Vorbedingung vor Code:** schriftlicher Email-Touch mit 1-Pager + Mock-Bildern + 3 Ja/Nein-Fragen. Kein Vor-Ort-Termin noetig. | Architektur-Entscheidungen muessen am realen Schmerz validiert werden, sonst Risiko "civic-Falle 2.0". |

**Strategische Eckpunkte (gesetzt):**
- Free-first: App ist ohne HV nutzbar.
- HV ist optionaler B2B-Layer, kein Eintritt zur App.
- Eine Bewohner-App, in beiden Modi (normal + Senior-Dashboard) als Kachel "Hausverwaltung" sichtbar bei Verknuepfung.
- HV-Cockpit als Adaption von `app/(app)/org/` (Variante a aus Iteration 1).
- Keine Buchhaltung, keine Nebenkostenabrechnung, kein WEG-System.
- Sprache: "dokumentierter Kanal" / "Eingangsbestaetigung" / "beweisstaerker", NICHT "rechtssicher".

## 2) Was Codex pruefen soll

**Gezielte Architektur-Pruefpunkte (NICHT die ganze Strategie nochmal):**

### 2.1 Schatten-Quartier (Festlegung 1)
- Liste alle Tabellen, deren `quarter_id` gesetzt ist mit `NOT NULL` ODER `REFERENCES quarters(id)`.
- Welche RLS-Policies nutzen `get_user_quarter_id()` und wuerden mit Schatten-Quartier kollidieren oder sauber durchlaufen?
- Wo muesste die Onboarding-Logik aendern, um Schatten-Quartier-Zuweisung beim Skip zu setzen?
- Konkrete Bewertung: Ist 5-Stellen-Aufwand realistisch? Wenn nein, was ist die ehrliche Schaetzung?

### 2.2 civic_organizations + type='housing' (Festlegung 2)
- Hat `civic_organizations` heute eine `type`-Spalte, oder muss sie hinzugefuegt werden?
- Welche bestehenden civic-Bereiche (Postfach, Messages, Reports, Announcements) haben einen Org-Pointer auf `civic_organizations`? Liste sie mit Migration + Spalte.
- Welche RLS-Policies in `civic_messages`, `civic_message_attachments`, `municipal_reports`, `municipal_announcements` filtern heute nach `civic_organizations` — und wuerden ohne Aenderung mit `type='housing'` funktionieren?
- Bewertung: Ist die Type-Erweiterung Migration-Pflicht oder reicht ein App-seitiges Mapping?

### 2.3 report_category Enum-Erweiterung + target_org_id (Festlegung 3)
- Pruefe `municipal_reports` Schema (Mig 097): Gibt es schon eine Org-Bindung oder reine Quartier-Bindung?
- ENUM-Erweiterung um `heating, water, electrical, elevator, noise, common_area, mailbox, other_housing` — gibt es Konflikte mit bestehender UI/Logik, die nur die alten 6 Werte kennt?
- Schlage RLS-Policy-Skizze fuer die Trennung Quartier-Maengel vs HV-Maengel — gibt es eine bestehende Policy, die als Vorbild taugt?
- Bewertung: Reicht 1 Migration (ENUM erweitern + Spalte + Index + Policy), oder muss flaechig refactored werden?

### 2.4 housing_appointments Mini-Tabelle (Festlegung 4)
- Pruefe das vorgeschlagene Schema gegen bestehende RLS-Konventionen (Bewohner sieht eigene + HV-Org-Mitglieder sehen alle Org-Termine).
- Gibt es im Repo ein Termin-/Slot-/Booking-Pattern, das adaptiert werden sollte (statt von 0 anzufangen)?
- Bewertung: Reicht die vorgeschlagene Felder-Liste, oder fehlen kritische Felder (Recurrence, Erinnerung, Hauptverantwortlicher)?

### 2.5 Cockpit-Variante (a): Adaption von `app/(app)/org/`
- Liste die heutige Struktur von `app/(app)/org/` (layout, page, announcements, reports, weitere?).
- Wo muesste eine `app/(app)/org/housing/` Subroute eingehaengt werden, ohne das bestehende Layout zu zerschiessen?
- Welche bestehenden Org-Komponenten (Navi, Layout, Auth-Guard) sind direkt wiederverwendbar?
- Bewertung: Ist Variante (a) tatsaechlich die kleinste Adaption, oder gibt es eine versteckte Falle?

### 2.6 Querschnittsfragen
- **Bewohner-App-Kachel:** Wie wird die HV-Verknuepfung im Bewohner-Layout heute gepruefe-bar? Brauchen wir eine neue `housing_resident_link`-Tabelle, oder reicht ein Eintrag in `org_members` mit Role `resident`?
- **Push:** Ist die bestehende Push-Pipeline (Mig 161-167 Chat) ohne Anpassung fuer HV-Mitteilungen nutzbar, oder braucht's einen neuen Channel-Type?
- **Senior-Dashboard:** Wo wird die Kachel-Liste fuer das Senior-Dashboard heute zusammengestellt — und wo muesste die HV-Kachel eingehaengt werden?

## 3) Was Codex NICHT tun darf

- **Kein Code schreiben.**
- **Keine Strategie-Re-Diskussion.** 5 Festlegungen sind gesetzt, nicht zur Debatte.
- **Keine Migration anwenden, kein DB-Write, kein Push.**
- **Keine dritte Org-Welt vorschlagen** (`housing_organizations` o.ae.). Wenn `civic_organizations + type='housing'` einen Showstopper hat, sage es als Showstopper — NICHT als Gegenvorschlag mit neuer Tabelle.
- **Keine Tagessuche / Monats-Roadmap.**
- **Keine Schaetzung in Stunden oder Wochen** — Founder denkt in Sessions/Voraussetzungen, nicht in Zeit.
- **Kein Vorgriff auf den Hausverwalter-Termin** — Festlegung 5 bleibt Founder-Aktion.

## 4) Wann Codex stoppen soll

- Wenn eine der 5 Festlegungen einen **echten Showstopper** im Code hat, der nicht mit kleiner Anpassung loesbar ist.
- Wenn `civic_organizations` strukturell NICHT um einen Type erweiterbar ist (z.B. fest verdrahtete Type-Spalte, die nicht migriert werden kann).
- Wenn ein **regulatorischer Showstopper** auftaucht (Mietrecht, BGB, DSGVO bei Mieter-Adressdaten).

## 5) Was Codex am Ende zurueckmelden soll

Antwort-Format:

```
GESAMT-EMPFEHLUNG: GO mit Korrekturen | NO-GO

Festlegung 1 (Schatten-Quartier):    [OK | NACHBESSERN | SHOWSTOPPER] — kurz
Festlegung 2 (civic_orgs+housing):    [OK | NACHBESSERN | SHOWSTOPPER] — kurz
Festlegung 3 (report_category+target):[OK | NACHBESSERN | SHOWSTOPPER] — kurz
Festlegung 4 (housing_appointments):  [OK | NACHBESSERN | SHOWSTOPPER] — kurz
Festlegung 5 (Validation-Tor):        OK (nicht zu pruefen, Founder-Aktion)
Cockpit (a) Adaption org/:            [OK | NACHBESSERN | SHOWSTOPPER] — kurz
Querschnitt (Link/Push/Kachel):       [OK | NACHBESSERN | SHOWSTOPPER] — kurz

Konkrete Korrekturen (falls "NACHBESSERN"):
1. <Festlegung X> — <was aendern> — <warum, mit Datei/Migration>
2. ...

Showstopper (falls vorhanden):
- <Festlegung X> — <was bricht> — <Datei/Migration als Beleg>

Kleinere Risiken/Hinweise (max. 5):
- ...
```

Ablage: neue Datei `nachbar-io/docs/plans/2026-04-21-hausverwaltung-codex-v2-antwort.md`.

---

**Hinweis fuer Codex:**
- Iteration-1-Antwort hat Pre-Check-Showstopper voll markiert. Dieser V2-Brief baut darauf auf — du musst den Pre-Check NICHT von vorne machen, nur die 5 Adaptions-Festlegungen pruefen.
- Founder-Regeln: Kein Push (rote Zone bis Notar 27.04.), kein DB-Write, AVV-Block bis 27.04.
- Dritt-Welt-Falle: `housing_organizations` als Tabelle waere die dritte Org-Welt. Wenn das auftaucht: STOP.
