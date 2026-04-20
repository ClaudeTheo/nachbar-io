# Codex-Review-Brief — Hausverwaltungs-Modul (Brainstorming-Ergebnis vor Freigabe)

**Datum:** 2026-04-21
**Autor:** Claude Opus 4.7 (1M)
**Adressat:** OpenAI Codex (hoechste Stufe)
**Status:** Brainstorming abgeschlossen, vor Founder-Freigabe, **noch kein Design-Plan, noch kein Code**.

---

## 1) Kontext

Founder will ein neues Modul fuer Hausverwaltungen / Hausmeister, "aehnlich wie das Arzt-, Civic- oder Pflege-Portal". Memory + Strategie sagen: civic/pflege/admin sind 2026-04-09 **eingefroren** (7 Portale, 0 Umsatz). Risiko: gleiche Falle.

In dieser Brainstorming-Session wurden gemeinsam mit dem Founder geklaert:
- **Zielgruppe:** Variante B — Hausverwaltung als zahlender B2B-Kunde, eigenes Login, eigene Pro-Stufe.
- **Validierung:** Founder hat **bereits einen konkreten Hausverwalter-Kontakt** in Bad Saeckingen.
- **Marktrecherche** wurde durchgefuehrt (Casavi, etg24, immocloud, Immoware24, Hausify, objego). Markt ist gesaettigt mit Vollpaket-Anbietern.
- **Strategischer Pivot vorgeschlagen:** Wir bauen NICHT noch eine Hausverwaltungssoftware, sondern den **"Senior-Mieter-Kanal"** als Add-on fuer Hausverwaltungen, die Casavi/Excel schon nutzen, aber an der Telefon-Last ihrer Senior-Mieter scheitern.

## 2) Pre-Check-Befunde (codebase-weit)

| Stichwort | Befund |
|---|---|
| `*ticket*`, `*meldung*` Module | NICHT vorhanden — muss neu gebaut werden |
| `property_manager`, `hausmeister`, `hausverwaltung` als Code-Symbol | nur in Plan-Dokumenten, kein Code |
| `org_type` Enum (Mig 073) | enthaelt **bereits** `'housing'` — Architektur konzeptionell vorgesehen, ungenutzt |
| `organizations`, `org_members` (Mig 073) | nutzbar, inkl. `assigned_quarters`, `stripe_customer_id`, `avv_signed_at` |
| `households.postal_code/city/position_*` (Mig 156) | Haeuser identifizierbar, nutzbar |
| `magic_link` Pattern | im Auth-Flow vorhanden, fuer externe Hausmeister-Onboarding nutzbar |
| Push-Pipeline (Mig 161-167 Chat) | wiederverwendbar fuer Hausmitteilungen |
| TTS-Layer-1-Cache (Mig 168) | wiederverwendbar fuer "Brief vorlesen" |
| Voice-Pipeline | wiederverwendbar fuer Maengel-Diktat |
| `app/(app)/hilfe/` | Nachbar-zu-Nachbar-Vermittlung (Helfer/Senior), KEIN Hausverwaltungs-Konzept — sauber abgrenzbar |

## 3) Vorschlag, den Codex pruefen soll

### 3.1 Strategischer Pivot

Weg vom "Casavi-Klon", hin zum "Senior-Mieter-Frontend fuer Hausverwaltungen". Begruendung: Casavi/Immocloud bedienen den 35-65jaehrigen Mieter mit Smartphone. Niemand bedient den Senior-Mieter ueber 70, der weder Casavi-App noch Email-Anhang oeffnet. Genau unsere Kernzielgruppe. Wir konkurrieren nicht, wir komplementieren.

### 3.2 Funktionsumfang Phase 1 (MVP, 4 Funktionen)

| # | Funktion | Senior-Seite | Hausverwalter-Seite |
|---|---|---|---|
| 1 | Maengel-Meldung | Foto + Voice ("Heizung tropft"), Adresse aus `households` | Liste mit Status (offen/in Arbeit/erledigt), Foto, Sprachtranskript |
| 2 | Hausmitteilungen | Push + Vorlese-Funktion | Texteingabe + Zielauswahl (Haus/Wohnung) + Lesebestaetigung |
| 3 | Dokumenten-Postfach | Button "Briefe von HV", PDF mit Vorlese-Funktion | Upload PDF + Empfangsbestaetigung |
| 4 | Termine | Kalender-Karte + 1h-Erinnerung | Termin anlegen, Mieter bestaetigt/verschiebt |

Schluesselverwaltung, Wartungskette, Familienkreis-Eskalation, Mehrsprachigkeit: **bewusst Phase 2**.

### 3.3 Architektur — Weg B-leicht

```
nachbar-io/app/
  (app)/hausverwaltung/        ← NEU: Senior-Mieter-UI (4 Phase-1-Funktionen)
  (verwalter)/cockpit/...      ← NEU: Hausverwalter-Cockpit, eigenes Layout
  api/hausverwaltung/...       ← NEU: gemeinsame API
```

Keine zweite Next.js-App, kein eigenes Repo. Eine neue Migration **175** fuer:
- `housing_associations` (Org-Bindung an Haeuser/Adressen)
- `maintenance_tickets`
- `housing_announcements`
- `housing_documents`
- RLS-Rolle `housing_admin` + `housing_resident_link`

Geschaetzt 12-18 Tasks, ~3 Sessions.

### 3.4 Abgrenzung gegen `app/(app)/hilfe/`

| | Nachbar-Hilfe | Hausverwaltung |
|---|---|---|
| Wer | Nachbar zu Nachbar | Mieter zu Hausverwaltung |
| Bezahlung | privat / unentgeltlich | Pflicht der Hausverwaltung |
| Status-Modell | Match-basiert | Ticket-Status-Pipeline |

Zwei separate Module, keine Code-Ueberlappung.

### 3.5 Billing

| Stufe | Preis | Wer zahlt |
|---|---|---|
| Pro Hausverwaltung Klein | 49 EUR/Mo | Hausverwaltung, bis 50 Senior-Mieter, 1 Cockpit-User |
| Pro Hausverwaltung Mittel | 149 EUR/Mo | Hausverwaltung, bis 200 Senior-Mieter, 3 Cockpit-User |
| Pro Hausverwaltung Gross | individuell | >200 Mieter |
| Senior-Mieter | 0 EUR | App gratis (HV zahlt) |

Stripe-Setup nutzt bestehende `organizations.stripe_customer_id` aus Mig 073.

### 3.6 Zeitrahmen + Tor-Bedingungen

- Welle C Push (laufend) — Notar 27.04. + AVV; vorher kein HV-Code
- Phase-1 MVP — ~3 Sessions, **erst nach Hausverwalter-Termin mit Pilot-Zusage**
- Pilot-Test 4 Wochen — erst MVP fertig + zahlungsbereit
- Phase 2 — erst nach 5 aktiven Mietern + 1 zahlende HV

---

## 4) Was Codex tun soll

1. Lese die folgenden Dateien in dieser Reihenfolge:
   - `nachbar-io/docs/plans/2026-04-21-hausverwaltung-codex-review-brief.md` (diese Datei)
   - `nachbar-io/docs/plans/2026-04-20-handoff-session-end-hausmeister-next.md` (Weg A vs B Vorgeschichte)
   - `nachbar-io/supabase/migrations/073_organizations.sql` (Org-Architektur, `housing` Enum-Wert)
   - `nachbar-io/supabase/migrations/156_household_position_metadata.sql` (Adress-Bindung)
   - `nachbar-io/app/(app)/hilfe/page.tsx` + `nachbar-io/modules/hilfe/services/types.ts` (Abgrenzung)
   - `nachbar-io/CLAUDE.md` + `.claude/rules/pre-check.md` (Repo-Regeln)
   - `memory/project_strategic_review_2026_04_09.md` falls erreichbar (Strategie-Kontext)

2. Pruefe punktweise gegen den echten Code-Stand:
   - **Pre-Check-Tabelle (Abschnitt 2):** Stimmen die Befunde? Gibt es uebersehene bestehende Module/Tabellen, die wir wiederverwenden koennten? Besonders relevant: `app/api/`, `modules/`, neuere Migrationen >156.
   - **Pivot-These (Abschnitt 3.1):** Realistisch oder wishful thinking? Gibt es einen technischen oder regulatorischen Grund, warum die Senior-Mieter-Add-on-Position nicht haltbar ist?
   - **Funktionsumfang (Abschnitt 3.2):** Sind die 4 Phase-1-Funktionen technisch in 3 Sessions machbar mit dem bestehenden Stack? Oder fehlen Bausteine?
   - **Architektur (Abschnitt 3.3):** Ist die Routen-Trennung `(app)/hausverwaltung/` vs `(verwalter)/cockpit/` mit dem Next.js 16 App-Router-Layout sauber loesbar (zwei Layouts, RLS-konforme Auth-Trennung)? Risiko mit Middleware oder Layout-Composition?
   - **RLS (Abschnitt 3.3):** Ist eine neue Rolle `housing_admin` zusaetzlich zu `org_admin/org_viewer` noetig oder reicht ein neues `org_member_role`-Enum-Wert?
   - **Billing (Abschnitt 3.5):** Stripe-Mehr-Stufe mit bestehender Pro-Community-Infra technisch sauber, oder Konflikte mit aktuellen Subscription-Webhooks?
   - **Abgrenzung Hilfe (Abschnitt 3.4):** Tatsaechlich keine Ueberschneidung im Code? Pruefe `modules/hilfe/services/types.ts` und `app/api/hilfe/*`.

3. Bei jedem geprueften Punkt eine Bewertung: **OK** / **NACHBESSERN (mit konkretem Vorschlag)** / **SHOWSTOPPER (mit Begruendung)**.

## 5) Was Codex NICHT tun darf

- **Kein Code schreiben.** Dies ist Brainstorming-Review, kein Implementation-Auftrag.
- **Keine eigene Komplett-Architektur als Gegenvorschlag.** Wenn der Vorschlag fundamental falsch ist, sage es als SHOWSTOPPER mit 2-3 Saetzen Begruendung — kein 800-Zeilen-Alternativ-Plan.
- **Keine Migration anwenden, kein DB-Write, kein Git-Push.**
- **Keine 5 Alternativ-Funktionsumfaenge** durchspielen. Pruefe den vorgelegten — nicht andere Designraeume.
- **Kein neuer Pivot zu Variante A oder C.** Founder hat sich fuer Variante B entschieden, das ist gesetzt.
- **Keine Tagessuche / Monats-Roadmap.** Founder denkt in Reihenfolgen + Voraussetzungen, nicht in Tagen (siehe Memory `feedback_keine_datums.md`).

## 6) Wann Codex stoppen soll

- **Sofort** wenn ein **regulatorischer Showstopper** entdeckt wird, der das ganze Modul blockiert (z.B. Mietrecht, BGB, WEG-Recht, Datenschutz fuer Mieter-Kommunikation, AVV-Konflikt).
- **Sofort** wenn die Pre-Check-Tabelle (Abschnitt 2) gravierend falsch ist — insbesondere wenn bestehende Infrastruktur uebersehen wurde, die das Bauen ueberfluessig machen wuerde.
- **Sofort** wenn der `housing` org_type tatsaechlich schon irgendwo aktiv genutzt wird und der Vorschlag damit kollidiert.

In allen anderen Faellen normal durchpruefen und am Ende zurueckmelden.

## 7) Was Codex am Ende zurueckmelden soll

Antwort-Format strikt:

```
GESAMT-EMPFEHLUNG: GO | GO mit Korrekturen | NO-GO

Pre-Check:        [OK | NACHBESSERN | SHOWSTOPPER] — kurze Begruendung
Pivot-These:      [OK | NACHBESSERN | SHOWSTOPPER] — kurze Begruendung
Funktionsumfang:  [OK | NACHBESSERN | SHOWSTOPPER] — kurze Begruendung
Architektur:      [OK | NACHBESSERN | SHOWSTOPPER] — kurze Begruendung
RLS:              [OK | NACHBESSERN | SHOWSTOPPER] — kurze Begruendung
Billing:          [OK | NACHBESSERN | SHOWSTOPPER] — kurze Begruendung
Abgrenzung Hilfe: [OK | NACHBESSERN | SHOWSTOPPER] — kurze Begruendung

Konkrete Korrekturen (falls "NACHBESSERN"):
1. <Sektion> — <was aendern> — <warum>
2. ...

Showstopper (falls vorhanden):
- <was> — <warum> — <welche Datei/Migration belegt es>

Risiken, die Claude nicht erwaehnt hat:
- ...
```

Ablage der Antwort: als neue Markdown-Datei `nachbar-io/docs/plans/2026-04-21-hausverwaltung-codex-review-antwort.md`, oder direkt in den Chat. Founder entscheidet je nach Laenge.

---

**Hinweis fuer Codex:** Founder-Regeln aus dem Repo:
- Kein Push (rote Zone bis Notar 27.04.).
- Pre-Check pflicht vor jedem Code-Vorschlag.
- AVV-Block: Anthropic + Mistral AVV werden erst nach GmbH-Eintragung 27.04. unterschrieben.
- Solo-Setup, direkt auf master, kein PR-Flow.
