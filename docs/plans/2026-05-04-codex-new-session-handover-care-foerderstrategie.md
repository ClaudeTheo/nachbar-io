# Neue Session-Übergabe: Care-Förderstrategie und Partnerpfad

Stand: 2026-05-03 spätabend
Repo: `nachbar-io`
Branch: `master`
Start-HEAD vor dieser Übergabe: `9791332 docs(strategy): add local care partner shortlist`
Art: Strategie-/Doku-Übergabe, keine Codeänderung

## Kurzstatus

Der Care-/CareCircle-Privacy-Härtungsstrang ist bis `9791332` gepusht und der
Förderstrategie-Strang wurde als reine Doku sauber aufgebaut. Es gab keine
Prod-Aktion, keinen Deploy, keine Migration, keine Vercel-/Provider-/Kostenaktion
und keine Kontaktaufnahme mit Partnern.

Die wichtigsten Doku-Artefakte liegen jetzt im Repo und sind miteinander
verlinkt:

- `docs/plans/2026-05-03-foerderstrategie-care-quartier-plan.md`
- `docs/plans/handoff/2026-05-03-codex-an-claude-foerderstrategie-care-quartier.md`
- `docs/plans/2026-05-04-care-quartier-foerderkonzept-draft.md`
- `docs/plans/2026-05-04-care-dipa-evidence-plan.md`
- `docs/plans/2026-05-04-care-quartier-partner-onepager.md`
- `docs/plans/2026-05-04-care-quartiersimpulse-antragsskizze.md`
- `docs/plans/2026-05-04-care-quartier-partner-shortlist-bad-saeckingen.md`

## Strategisches Ergebnis

Die passende Förderlogik für nachbar.io Care ist nicht "App wird bezahlt",
sondern:

1. **§45b/UStA über Partner** als stärkster wiederkehrender operativer Weg.
2. **Quartiersimpulse BW** als kommunaler Pilotweg für Bad Säckingen.
3. **§40 Abs. 4 SGB XI** nur als späterer Hardware-/Einrichtungs-Bundle-Pfad im
   Einzelfall.
4. **DiPA** nur als späterer Evidenz-, Datenschutz- und BfArM-Prüfpfad.
5. **Startup-/Innovationsförderung** nur als Entwicklungskapital, nicht als
   Nutzererstattung.

Sichere Kurzformulierung:

> Nachbar.io Care kann als digitale Infrastruktur für ein partnergetragenes
> Unterstützungsangebot im Alltag oder einen kommunalen Quartierspilot dienen.
> Ob und wie Leistungen abrechenbar oder förderfähig sind, hängt vom anerkannten
> Angebot, vom Landesrecht und von den zuständigen Stellen ab.

## Erledigte Blöcke seit Förderstrategie-Start

### 1. Handover und Plan

Commits:

- `d861f29 chore(strategy): lock care funding plan block`
- `1388578 docs(strategy): plan care funding paths`
- `0b44711 docs(strategy): clean care funding handover whitespace`

Ergebnis:

- Förderstrategie-Handover geschrieben.
- Ausführbarer Plan für UStA/§45b, Quartiersimpulse, §40-Bundle, DiPA und spätere
  Wording-Audits geschrieben.

### 2. Förderkonzept-Draft

Commits:

- `66c8049 chore(strategy): lock care funding concept draft`
- `512ec60 docs(strategy): draft care funding concept`

Ergebnis:

- 2-Seiten-Förderkonzept als Arbeitsentwurf erstellt.
- Quellen-/Wording-Freeze mit offiziellen Links aufgenommen.
- Keine Erstattungszusage.

### 3. UStA-Partnerweg und Quartiersimpulse-Modell

Commits:

- `a96eb49 chore(strategy): lock care partner pilot models`
- `23ad006 docs(strategy): detail care partner pilot models`

Ergebnis:

- Bestehende `modules/hilfe`-Bausteine als mögliche Partner-Infrastruktur
  dokumentiert.
- Quartiersimpulse-Pilotmodell als kommunale Skizze ausgearbeitet.

### 4. DiPA-Evidenzplan

Commits:

- `0c933d6 chore(strategy): lock care dipa evidence plan`
- `4f2239f docs(strategy): plan care dipa evidence path`

Ergebnis:

- DiPA als späterer Prüfpfad dokumentiert.
- Evidenzfragen, Pilotmetriken, Datenschutzgrenzen und Voraussetzungen
  beschrieben.
- Keine aktuellen DiPA- oder Betragsclaims.

### 5. Partner-Onepager

Commits:

- `1d9f2eb chore(strategy): lock care partner onepager`
- `a88e749 docs(strategy): add care partner onepager`

Ergebnis:

- Gesprächsdokument für Kommune, UStA-Träger, Nachbarschaftshilfe oder
  Wohlfahrtspartner erstellt.
- Fokus: Angebot, Rollen, Einstiegswege, Pilot, Fragen, sichere Formulierung.

### 6. Quartiersimpulse-Antragsskizze light

Commits:

- `06fa703 chore(strategy): lock quartiersimpulse sketch`
- `e88ca9b docs(strategy): add quartiersimpulse sketch`

Ergebnis:

- Interne kommunale Gesprächsskizze für Bad Säckingen erstellt.
- Kein echter Antrag, keine Förderzusage, keine Betrags-/Fristversprechen.

### 7. Lokale Partner-Shortlist

Commits:

- `6b845e6 chore(strategy): lock care partner shortlist`
- `9791332 docs(strategy): add local care partner shortlist`

Ergebnis:

- Erste lokale Gesprächspartner priorisiert:
  Pflegestützpunkt Landkreis Waldshut, Stadtseniorenrat Bad Säckingen,
  Stadt/Seniorenrat, Pflegeunterstützer Bad Säckingen, Caritas, AWO, DRK.
- Gesprächsleitfaden mit sicheren Grenzen geschrieben.

## Harte Sperren

Nicht bauen oder auslösen:

- kein M4-Pflegekassen-PDF
- kein §40-Antragsgenerator
- keine Migration
- kein Prod-Schreiben
- kein Deploy
- keine Vercel-Env-/Provider-/Kostenänderung
- keine Kontaktaufnahme im Namen von Thomas
- keine Echtdaten-KI
- keine alten untracked Handoff-Dateien oder `.codex-welle-d-3001.pid`
  anfassen

M4 bleibt blockiert, bis beides erledigt ist:

- **M4.0:** Thomas klärt beim Pflegestützpunkt/Pflegekasse die Bundle-Logik.
- **M4.1:** Thomas/Codex definieren ein konkretes Bundle
  (Gerät, Halterung, Einrichtung, Schulung, CareCircle-Konfiguration,
  laufende App-/Servicegebühr getrennt).

Erst danach darf M4.2 PDF/Antragshelfer überhaupt wieder diskutiert werden.

## Wording-Regeln

Nicht sagen:

- "Die App wird von der Pflegekasse bezahlt."
- "Pflegekasse zahlt nachbar.io."
- "Förderung ist garantiert."
- "§40-förderfähig" ohne Einzelfall- und Entscheidungs-Hinweis.
- "nachbar.io ist DiPA" oder "DiPA-Erstattung".
- "Hausnotruf" für CareCircle/Check-ins.

Sicher sagen:

- "Kann Teil eines anerkannten Unterstützungsangebots im Alltag sein."
- "Kann über anerkannte Partner und je nach Landesrecht abrechenbar werden."
- "Hardware/Einrichtung kann im Einzelfall beantragt werden; die Pflegekasse
  entscheidet."
- "Nachbar.io ist Technologiepartner für Quartiers- und Care-Koordination."
- "Allgemeine Information, keine Rechtsberatung und keine Erstattungszusage."

## Aktueller Arbeitsbaum

Vor dieser Übergabe war `master...origin/master` synchron. Es lagen nur bekannte
untracked Dateien herum, die nicht angefasst werden sollen:

- `.codex-welle-d-3001.pid`
- `docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md`
- `docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md`
- `docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md`

Diese Dateien sind bewusst untracked geblieben.

## Nächste sinnvolle Blöcke

### Option A: Kontaktvorlagen schreiben

Wenn Thomas die nächsten Kontakte angehen will:

- kurze Telefonnotiz für Pflegestützpunkt Landkreis Waldshut
- kurze E-Mail an Stadtseniorenrat Bad Säckingen
- kurze E-Mail an Stadt/Seniorenrat oder Fachbereich Soziales
- kurze E-Mail an Pflegeunterstützer Bad Säckingen

Wichtig: Nur Vorlagen schreiben, nicht senden.

### Option B: Umlaute-/Lesbarkeits-Pass für neue Strategie-Doku

Thomas hat zuletzt gesagt: "achte auf die umaute". Für neue Doku ab jetzt echte
Umlaute verwenden. Ein optionaler kleiner Block könnte die seit heute erstellten
Strategiedokumente auf Lesbarkeit mit Umlauten prüfen. Dateinamen und technische
IDs bleiben ASCII-freundlich.

### Option C: Wording-Audit im bestehenden Produkt

Es gibt bestehende riskante Texte, z. B. in `app/(app)/hilfe/...`, die nach
direkter Pflegekassen-Zahlung klingen können. Dieser Block wäre **Code-/UI-Text**
und braucht Pre-Check, Guard-Test und gezielte Änderungen. Nicht nebenbei in der
Strategie-Doku anfassen.

### Option D: Zurück zu CareCircle/Care-Privacy-Härtung

Vor dem Strategieblock wurden T-14b/c/d erledigt:

- `/care/meine-senioren` nutzt aktive `caregiver_links`.
- Check-in-/Medikationsbenachrichtigungen nutzen Legacy `care_helpers` plus
  aktive `caregiver_links`.
- Cron-Checkin-Eskalation nutzt denselben Empfänger-Resolver.

Ein möglicher nächster Codeblock wäre ein weiterer CareCircle-Bypass-/RLS-/PII-
Audit mit TDD/Guard-Tests. Dafür wieder streng Pre-Check, Tests, minimale Fixes.

## Startanweisung für neue Session

1. `AGENTS.md` lesen.
2. `memory/project_session_handover.md` lesen, falls vorhanden.
3. Diese Datei lesen:
   `docs/plans/2026-05-04-codex-new-session-handover-care-foerderstrategie.md`
4. `docs/plans/handoff/INBOX.md` lesen.
5. `git status --short --branch` prüfen.
6. Alte untracked Handoffs/PID nicht anfassen.
7. Bei Strategie-Doku echte Umlaute verwenden.
8. M4-PDF nicht bauen.

## Verifikation dieses Übergabeblocks

Für diese Übergabe vorgesehen:

- Datei mit `Get-Content` zurücklesen
- `git diff --check`
- `git status --short --branch`
- nur diese Übergabe + INBOX committen und pushen
