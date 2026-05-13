# New-Session-Handover: Youth UI, Tauschboerse und geschuetzte Gruppen

Datum: 2026-05-13
Owner: Codex
Status: lokal umgesetzt und verifiziert, noch nicht gepusht/deployed

## Sofortkontext

Thomas moechte die Jugend-Oberflaeche weiter ausbauen. Die 50+-/Comfort-
Oberflaeche ist visuell eingefroren und darf nicht durch Design-Experimente
veraendert werden. Der Jugendmodus soll eigenstaendig wirken: frisch, dunkel,
map-first, mit lokalem Quartierbezug und eigener Funktionalitaet.

Dieses Handoff fasst die lokale Umsetzung nach den letzten drei Youth-Commits
zusammen. Vor diesem Handoff-Dokument war `master` lokal `ahead 3` gegen
`origin/master`.

## Git-Stand vor diesem Handoff

Lokale Commits, noch nicht gepusht:

- `1225caf feat(youth): add map-first youth UI`
- `b0679ec feat(youth): add exchange and groups surfaces`
- `0a8fdd3 feat(youth): add safe exchange draft flow`

Letzte relevante Map-/Activity-Pin-Commits davor:

- `d19ec28 feat(map): centralize activity pin rules`
- `72e3175 feat(map): refine activity pin symbols`
- `64125cf feat(map): connect activity feed to leaflet`
- `6b1e90c docs(plan): define automatic map pin logic`

## Wichtigste Grenzen

- Kein Push/Deploy ohne ausdrueckliches Founder-Go.
- Kein Prod-DB-Write, kein Migration-Apply, keine Vercel-Env-/Secrets-/
  Billing-/Provider-Live-Aktion ohne Founder-Go.
- Keine neuen laufenden Kosten.
- Keine neue Prod-Migration fuer Youth-Tauschen/Gruppen wurde erstellt oder
  angewendet.
- Kein Medizinprodukt: Care-/Hilfe-Logik bleibt Alltagshilfe/Quartierhilfe,
  keine Diagnose, Behandlung oder medizinische Entscheidung.
- Youth-Exchange ist derzeit ein sicherer lokaler UI-Entwurfsflow, noch keine
  Persistenz und noch kein Live-Marktplatz.

## Umgesetzt

### Jugend Startscreen

Route: `/jugend`

Der Jugendmodus nutzt nun eine eigene map-first Oberflaeche:

- dunkler, moderner Jugend-Stil
- freigegebenes Youth-Hero-Asset
- Quartierskarte oben im Flow
- Activity-Pins ueber `activityMode="youth"`
- kompakter Status, schnelle Aktionen, passende Aufgaben-/Badge-Einstiege

Wichtige Dateien:

- `app/(app)/jugend/page.tsx`
- `modules/youth/components/YouthHomeSurface.tsx`
- `modules/youth/components/YouthDashboardClient.tsx`
- `components/NachbarKarte.tsx`
- `components/nav/NavConfig.ts`

### Jugend Navigation

Fuer `users.ui_mode = youth` ist die Bottom-Navigation jetzt auf Jugend
zugeschnitten:

- Start
- Karte
- Tauschen
- Gruppen

Die alte 50+-Navigation bleibt unberuehrt.

### Tauschen und Verschenken

Routes:

- `/jugend/tauschen`
- `/jugend-tauschen-preview` fuer lokale Sichtprobe

Founder-Entscheidung: keine Verkauf-Funktion im Jugendmodus. Deshalb sind nur
zwei Modi erlaubt:

- Tauschen
- Verschenken

Der Flow ist absichtlich sicher und lokal:

- kein Preisfeld
- kein Zahlungsfeld
- kein Adressfeld
- Pflicht-Check: "Ich teile keine Adresse und kein Geld."
- Vorschaukarte fuer den Entwurf
- Button "Entwurf pruefen"
- noch kein Speichern in Supabase
- noch kein Live-Schalten fuer andere Nutzer

Wichtige Dateien:

- `modules/youth/components/YouthExchangeSurface.tsx`
- `modules/youth/services/exchange-rules.ts`
- `app/(app)/jugend/tauschen/page.tsx`
- `app/jugend-tauschen-preview/page.tsx`

### Geschuetzte Gruppen

Routes:

- `/jugend/gruppen`
- `/jugend-gruppen-preview` fuer lokale Sichtprobe

Der Gruppenbereich ist als geschuetzter Einstieg gebaut:

- Gruppen nur mit Einladung
- Gruppe wird vom Gruender verwaltet
- maximal 10 Mitglieder als UI-/Produktregel
- keine oeffentliche Gruppenliste
- Checkliste vor dem Gruenden
- Hinweise auf Melden/Verlassen
- Link in die vorhandene `chat-groups`-Infrastruktur

Wichtig: Die UI formuliert die Schutzlogik, aber eine echte youth-spezifische
Einladungs-/Alters-/Guardian-Erzwingung auf DB-Ebene ist noch nicht umgesetzt.
Fuer echte Persistenz oder neue Policies waere ein DB-/RLS-Konzept und ggf.
Migration noetig.

Wichtige Dateien:

- `modules/youth/components/YouthGroupsSurface.tsx`
- `app/(app)/jugend/gruppen/page.tsx`
- `app/jugend-gruppen-preview/page.tsx`

## Map-/Activity-Pin-Kontext

Thomas hat die automatische Logik fuer Pins bestaetigt:

- Nutzer sollen nicht frei bestimmen, wie ein Pin aussieht.
- Symbol und Farbe entstehen automatisch aus Typ, Quelle, Dringlichkeit und
  Sichtbarkeit.
- Gruen = normal/aktiv/Quartierhilfe.
- Gelb/Amber = dringend, aber kein Unfall.
- Rot = nur echter Unfall/Notfall/Warnung.
- Blau = z. B. Urlaub/Abwesenheitskontext.
- Hilfe an einer Adresse leuchtet nur im zulaessigen Sichtkreis auf.
- Groessere Outdoor-Veranstaltungen duerfen ausserhalb des Quartiers liegen,
  wenn der Treffpunkt dort ist.
- Sichtbarkeit bleibt serverseitig gefiltert: Nutzer sehen nur, was sie sehen
  duerfen.

Die Activity-Pins sind bereits als separate Arbeit umgesetzt. Der Youth-Screen
nutzt sie nur ueber die vorhandene Karten-Integration.

## Lokale Preview-URLs

Zuletzt lief der lokale Dev-Server auf Port `3005`.

- `http://localhost:3005/jugend-ui-preview`
- `http://localhost:3005/jugend-tauschen-preview`
- `http://localhost:3005/jugend-gruppen-preview`
- `http://localhost:3005/map-activity-pins-preview`

Falls der Server nicht mehr laeuft: `npm run dev` oder passenden freien Port
nutzen. Standard-Port kann durch bereits laufende Server belegt sein.

## Verifikation

Nach dem letzten Youth-Commit `0a8fdd3` war die Verifikation gruen:

- `npx vitest run __tests__/components/youth-home-surface.test.tsx __tests__/components/youth-exchange-surface.test.tsx __tests__/components/youth-groups-surface.test.tsx __tests__/lib/youth-exchange-rules.test.ts __tests__/app/youth-exchange-preview.test.tsx __tests__/app/youth-ui-preview.test.tsx __tests__/middleware/closed-pilot.test.ts components/nav/__tests__/NavConfig.test.ts`
  - 8 Test Files, 46 Tests passed
- gezieltes ESLint auf Youth-/Preview-/Nav-Dateien: gruen
- `npx tsc --noEmit`: gruen
- `npm run build`: gruen
- `git diff --check`: gruen, nur CRLF-Warnungen
- Browser-QA Chrome/Playwright:
  - `/jugend-tauschen-preview` mit Formularflow
  - `/jugend-gruppen-preview`
  - keine Console-Fehler im zweiten Lauf

Screenshots:

- `C:\Users\thoma\AppData\Local\Temp\nachbar-youth-tauschen-flow-2.png`
- `C:\Users\thoma\AppData\Local\Temp\nachbar-youth-gruppen-flow-2.png`

## Offene Produktfragen

Diese Punkte sind bewusst noch nicht final technisch festgelegt:

- Soll "Tauschen" spaeter in einer neuen Youth-spezifischen Tabelle landen oder
  als Adapter auf bestehende Marktplatz-/Help-Request-Infrastruktur?
- Soll "Verschenken" direkt ueber bestehende Marketplace-Logik laufen, falls
  dort ein passender Typ existiert?
- Welche Alters-/Guardian-/Invite-Regeln muessen DB-seitig erzwungen werden?
- Soll die Gruppen-Mitgliedergrenze 10 rein Produktregel bleiben oder RLS/
  Trigger-seitig abgesichert werden?
- Welche Moderations-/Meldeprozesse braucht der Jugendbereich vor Live-Schaltung?

## Spaetere OpenAI-Option

Thomas hat bestaetigt, dass der OpenAI Developers Skill als spaetere Option fuer
die App vorgemerkt werden soll. Noch nicht in die Youth UI einbauen.

Sinnvolle spaetere Einsatzfelder:

- serverseitige Klassifikation von Map-/Activity-Pins aus Ereignissen
- Moderationshilfe fuer Jugend-Tauschen, Verschenken und Gruppen
- Erkennung riskanter Inhalte wie Adressen, Telefonnummern, Geldforderungen
  oder unsichere Treffpunkte
- Admin-Unterstuetzung beim Sortieren und Formulieren von Meldungen
- einfache/barrierearme Textvarianten fuer Comfort/Senior ohne medizinische
  Beratung
- Eval-/Schutztests gegen Datenschutzlecks, Jugendverkauf und medizinische
  Aussagen

Wichtig: OpenAI-API/Provider/Kosten/API-Key nur mit ausdruecklichem Founder-Go.
Keine personenbezogenen Adressen oder sensiblen Inhalte ungeprueft an eine KI
senden. Erste sinnvolle technische Stufe waere ein serverseitiger
Pin-/Moderations-Assistent mit klarer Datenminimierung.

## Naechste sichere Schritte

1. Founder-Review der lokalen Youth-Preview.
2. Falls optisch freigegeben: gezielte Feinschliffe nur in Youth-Komponenten,
   nicht an der eingefrorenen 50+-Oberflaeche.
3. Technischen Persistenzplan fuer Jugend-Tauschen und Gruppen schreiben,
   bevor DB/Migration/RLS angefasst wird.
4. Erst nach Founder-Go: Push/Deploy.

## Startprompt fuer neue Session

```text
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"

Lies:
- AGENTS.md
- CLAUDE.md
- docs/plans/handoff/2026-05-13-codex-new-session-handover-youth-ui-exchange-groups.md
- docs/plans/handoff/2026-05-13-youth-ui-map-first-implementation.md
- docs/plans/handoff/INBOX.md

Pruefe:
- git status --short --branch
- git log --oneline -12

Wichtig:
- Youth UI ist lokal umgesetzt, aber noch nicht gepusht/deployed.
- Keine Prod-DB, keine Migration, keine Vercel-Env/Secrets/Billing/Provider-Aktion
  ohne Founder-Go.
- Kein Push/Deploy ohne Founder-Go.
- 50+-/Comfort-Visual-Polish bleibt eingefroren.
```
