# Handoff — B6 Task 6.2 + 6.3 vorgezogen, naechste Session: Hausmeister-Brainstorming

**Vorgaenger:** `docs/plans/2026-04-21-handoff-b1-b3-done-b4-vorbereitet.md`
**Modell diese Session:** Sonnet 4.7 (Doku-Tasks)
**nachbar-io HEAD:** `47c9d11` (47 Commits seit `5de2a58`, **kein Push**)
**Parent-Repo HEAD:** `14c70f6` (unveraendert seit Vorgaenger)

---

## Was diese Session fertig wurde

Aus dem Haertungs-Plan B6 wurden zwei Tasks vorgezogen (Variante B aus
dem Vorgaenger-Handoff). Damit ist alles an Push-Vorbereitung erledigt,
was Claude autonom machen konnte.

| Task | Commit | Beschreibung |
|---|---|---|
| B6 Task 6.2 | `328c354` | Release-Notes-Draft `2026-04-27-release-notes-welle-c.md` (236 Zeilen). C0-C8-Featureliste, Mig 173 + 174, Test-Stand 3480/3/0, DSGVO Art. 6/7(3)/15/17/25/32, bekannte Einschraenkungen (AI_PROVIDER=off, x20b-e optional, "Von Angehoerigen" generisch). |
| B6 Task 6.3 | `47c9d11` | Push-Checklist auf Stand `47c9d11` aktualisiert. HEAD + Commit-Anzahl, Voll-Suite-Erwartung 3480/3/0, Skip-Liste leer, Verweis auf Release-Notes. Alte `nach erfolgreichem Push`-Liste durchgestrichen + um Haertungs-Reststeps erweitert. |

Auf Founder-Wunsch hin wurde **kein** weiterer Plan-Schritt automatisch
weitergebaut. B6 Task 6.1 (Final-Re-Verify) bleibt fuer den Push-Tag,
B4 + B5 sind weiterhin offen.

---

## Founder-Pivot waehrend der Session

Nach kurzer Diskussion ueber B5 (Senior-Test-Konto + E2E x20b-e) hat der
Founder die Reihenfolge geaendert: **erst Hausmeister-/Hausverwaltungs-
Modul brainstormen**, B5 zurueck in die Schublade.

Zur Strategie-Frage Hausmeister-Modul existiert bereits Material:

- `memory/project_hausmeister_modul_wunsch.md` — 5-Fragen-Liste, Red Flags
- `docs/plans/2026-04-20-handoff-session-end-hausmeister-next.md` — Weg A
  (eigenes Portal) vs Weg B (Feature in nachbar-io), Empfehlung Weg B mit
  klarer Rollen-Trennung, Start-Prompt-Vorlage

Brainstorming wurde diese Session **nicht** mehr durchgefuehrt — Founder
will lieber in einer frischen Session mit Opus-Tiefe einsteigen.

---

## Naechste Session — Start-Prompt (zum Kopieren)

```
Ich moechte mit Dir das Hausmeister-/Hausverwaltungs-Modul brainstormen.
Vorher Welle C / Push noch nicht — der laeuft erst wenn Notar + AVV durch
sind. Brainstorming heisst: kein Code, nur Konzept klaeren.

Bitte lies in dieser Reihenfolge:
1. nachbar-io/docs/plans/2026-04-21-handoff-b6-vorgezogen-hausmeister-next.md
   (= dieser Handoff, Stand der Welle C + Pivot zum Hausmeister-Thema)
2. nachbar-io/docs/plans/2026-04-20-handoff-session-end-hausmeister-next.md
   (Weg A vs Weg B, Empfehlung Weg B + Klaerungsfragen)
3. memory/project_hausmeister_modul_wunsch.md
   (5-Fragen-Liste, Red Flags)
4. memory/project_strategic_review_2026_04_09.md
   (Strategie: civic/pflege/admin sind eingefroren — Phase-1-Fokus)

Dann nutze superpowers:brainstorming und kläre mit mir nacheinander:
- Wer ist der Haupt-Nutzer (Mieter, Hausmeister, Hausverwaltung,
  Eigentuemer)?
- Welche 3-5 Funktionen zuerst (Meldung, Termin, Dokument, Ankuendigung,
  Schluesselverwaltung)?
- Portal (eigenes nachbar-hausmeister) oder Feature (Route in
  nachbar-io)? — Vor-/Nachteile mit mir durchgehen.
- Wie grenzen wir das ab gegen das bestehende Hilfe-Modul
  (app/(app)/hilfe/)?
- Billing: Plus-Feature (8,90 EUR) oder eigene Pro-Stufe?
- Zeitrahmen: kleiner MVP oder gross?

KEIN Code in dieser Session. Erst nach Scope/Architektur-Einigung
schreibst Du einen Design-Plan via superpowers:writing-plans.

Modell-Empfehlung: Opus 4.7 (1M) fuer Strategie + Architektur-Tiefe.
Sonnet 4.7 erst spaeter fuer mechanische Umsetzung.

Arbeitsweise: kein Push, Pre-Check first, eine Frage auf einmal.
Kontext-Stand nachbar-io: HEAD 47c9d11, 47 Commits seit 5de2a58, kein
Push. AVV blockiert bis Notar.
```

---

## Status der Plan-Bausteine (Haertungs-Runde)

| # | Baustein | Status |
|---|---|---|
| B1 | Bestandsaufnahme | ✅ DONE |
| B2 | Test-Fixes | ✅ DONE (3480/3/0) |
| B3 | tsc clean | ✅ DONE (0 Errors) |
| B4 | Senior-Walkthrough | 🟡 Checkliste bereit, Termin offen |
| B5 | E2E x20b-e (optional) | ⏳ pausiert nach Founder-Pivot zu Hausmeister |
| B6 Task 6.1 | Final-Re-Verify | ⏳ erst am Push-Tag |
| B6 Task 6.2 | Release-Notes Draft | ✅ DONE (`328c354`) |
| B6 Task 6.3 | Push-Checklist update | ✅ DONE (`47c9d11`) |
| B6 Task 6.4 | Final Doku-Commit | wird Push-Tag-Run, schliesst neue Walkthrough-Fixes ein |

---

## Offene Founder-Entscheidungen

Aus dieser Session sind drei Mini-Entscheidungen offen geblieben — sie
blocken nichts Akutes, aber sollten irgendwann fallen:

1. **B5 Senior-Seed: lokal oder Preview-Branch?** — Founder hatte zuerst
   "OK fuer Test-Konto" gegeben (lokal war meine Empfehlung), dann auf
   Hausmeister umgepivotet. Wenn B5 doch nochmal hochkommt: lokal.
2. **`app/datenschutz/page.tsx`-Diff (+64 LOC):** § 5.11 KI-Assistent
   inkl. Mistral-Block, AVV-Erwaehnung. Drei Optionen:
   - A — Verwerfen, neu schreiben nach AVV-Signatur
   - B — Anpassen ("AVV vorbereitet" statt "liegt vor", Anthropic
     ergaenzen) und mit-committen
   - C — Liegen lassen bis Notar-Tag, dann committen + pushen
   Empfehlung: **C** (Text wird rechtlich exakt korrekt, Aufwand Null).
3. **Hausmeister-Modul Strategie** — Brainstorming naechste Session.

---

## Uncommitted Reste (unveraendert seit Vorgaenger)

```
M  app/datenschutz/page.tsx                                      (Welle-B-Rest, 64 LOC)
?? docs/plans/2026-04-20-handoff-session-end-hausmeister-next.md (Strategie-Material)
?? docs/plans/2026-04-20-handoff-welle-c-c8-done.md              (Welle-C-Schluss)
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql     (Backup)
```

Plus diese Datei (vor Commit) und die zwei Release-/Checklist-Files
(committet als `328c354` + `47c9d11`).

---

## Memory-Aenderungen diese Session

- Neu: `memory/feedback_keine_datums.md` — keine Wochentag-/Datums-
  Zuweisungen in Plaenen, nur Reihenfolge + Voraussetzungen (Founder
  denkt asynchron in Abhaengigkeiten, nicht in Tagen).
- `MEMORY.md` Index entsprechend ergaenzt.

---

## Was diese Session nicht gemacht hat (bewusst)

- Kein Push.
- Keine Code-Aenderungen (nur Doku).
- Kein B5 (Pivot zu Hausmeister).
- Kein Hausmeister-Brainstorming (Founder will frische Session).
- Keine Aenderung am `app/datenschutz/page.tsx`-Diff (Founder-Entscheidung
  pendent).

---

**Handoff-Autor:** Claude Sonnet 4.7
**Naechste Modell-Empfehlung:** Opus 4.7 (1M) fuer Hausmeister-Brainstorming.
