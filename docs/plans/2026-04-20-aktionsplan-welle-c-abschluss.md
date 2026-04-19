# Aktions-Plan — Welle-C-Abschluss-Tag (2026-04-20)

**Datum:** 2026-04-20
**Vorgaenger-Handoff:** `docs/plans/2026-04-19-handoff-welle-c-c6b-c7-c6c-done.md`
**Ziel:** 5 Optionen abarbeiten + Founder-Selbsttest

---

## Reihenfolge fuer den Tag

| # | Option | Wer macht's | Dauer | Founder-Input noetig? |
|---|---|---|---|---|
| 1 | E — Browser-Smoke (Claude testet Welle C lokal) | Claude | 15-20 min | nein |
| 2 | Test-Umgebung fuer Founder aufsetzen | Claude | 5-10 min | nein |
| 3 | Founder-Klick-Through | Founder | 15-30 min | ja (waehrend Claude an D+A weiterarbeitet) |
| 4 | D — AVV-Notiz-Memory | Claude (parallel zu 3) | 15 min | nein |
| 5 | A — Push-Vorbereitung | Claude (nach 3+4) | 30-45 min | kurz fuer Notar-Datum-Bestaetigung |
| 6 | B — F7 cache_control-Rename | Claude | 60-90 min | nein |
| 7 | C — C8 Caregiver-Scope (NUR wenn Founder die 3 Architektur-Fragen beantwortet hat) | Claude + Founder | 2-3 h | ja, **vor Start** |

**Realistisch geschaetzt: 4-6 Stunden Claude-Zeit + 30-45 min Founder-Klick-Zeit.** Eventuell zwei Sessions noetig (Kontext-Limit).

---

## Option E — Browser-Smoke-Test (Schritt 1, Claude allein)

**Voraussetzung:** `AI_PROVIDER=mock` in `.env.local`. Aktuell NICHT gesetzt — Claude haengt es vor Test-Start an.

**Schritte (Claude):**
1. `.env.local` erweitern um `AI_PROVIDER=mock`
2. `npm run dev` starten (Port 3000)
3. Pruefen ob Mig 173+174 lokal noetig sind (Senior-Login zeigt's)
4. Browser-Tools (preview_start) auf `http://localhost:3000`
5. Login als Senior-Test-Account (Email: `senior-test@quartierapp.de` oder via DB-Seed)
6. Senior-Home -> "🤝 KI kennenlernen" klicken
7. Banner "Brauche Erlaubnis" sehen
8. "Einwilligung erteilen" klicken
9. Wizard offen, Test-Eingabe "Mein Name ist Anna"
10. Mock-Antwort sehen (mock-Provider gibt Standard-Reply)
11. /profil/gedaechtnis oeffnen, Liste pruefen
12. Loeschen testen
13. Toggle umschalten

**Was berichtet wird:** Screenshots + Bericht "alles okay" oder "Bug XYZ in Schritt N".

**Bei Bug:** sofort fix (TDD-Loop), neuer Smoke.

---

## Test-Umgebung fuer Founder (Schritt 2, Claude setzt auf)

Claude bereitet vor:
- Dev-Server laeuft schon (von Schritt 1)
- Kurzanleitung mit URL `http://localhost:3000` + Senior-Login-Daten
- Klick-Anleitung als Markdown-Datei `docs/founder-test-anleitung.md` (entsteht morgen)
- Was Founder testen soll: die 11 Schritte oben, aber selbst durchklicken

**Founder-Voraussetzung:** Lokaler Browser. **Keine Mikrofon-Erlaubnis noetig** fuer den Standard-Test (Tippen reicht). Nur wenn er STT testen will: Mikro freigeben.

---

## Option D — AVV-Notiz (Schritt 4, parallel)

Memory-Eintrag `project_avv_notar_27042026.md` mit:
- Was beim Notar genau zu tun ist
- Welche Dokumente mitnehmen (AVV-Anthropic, AVV-Mistral, GmbH-Gruendungsurkunde)
- Wer unterschreibt (Geschaeftsfuehrer)
- Was DANACH zu tun ist (AVV-PDFs in IONOS-Cloud, Anthropic-Konsole hochladen)
- Welche Vercel-Env-Vars zu setzen (ANTHROPIC_API_KEY, MISTRAL_API_KEY, AI_PROVIDER=claude)

---

## Option A — Push-Vorbereitung (Schritt 5)

Erzeugt: `docs/plans/2026-04-27-push-checklist-welle-c.md` mit:

**Vor-Push (am Tag X):**
1. Founder-Bestaetigung "AVV signiert" (sonst STOP)
2. Founder setzt `ANTHROPIC_API_KEY` + `MISTRAL_API_KEY` in Vercel-Env (3 Environments)
3. Claude pruefed `git log --oneline 5de2a58..HEAD` — sollte 22 Commits sein
4. Claude laeuft `npx tsc --noEmit` + Smoke-Suite — alle gruen?
5. Claude entscheidet `app/datenschutz/page.tsx`-Diff (committen oder verwerfen)
6. Claude pruefed `npm audit` (keine neuen kritischen Vulns)

**Push-Reihenfolge (rote Zone, Founder-Go pro Schritt):**
1. Mig 173 via MCP `apply_migration` auf Prod
2. Mig 174 via MCP `apply_migration` auf Prod
3. Founder setzt `AI_PROVIDER=claude` in Vercel
4. `git push origin master`
5. Vercel-Build pruefen, Smoke-Test in Prod (kennenlernen-Flow)
6. Bei Problem: `AI_PROVIDER=off` zurueckschalten (sofort), Mig-Rollback waere Mig 174.down.sql + 173.down.sql

**Rollback-Plan** auch dokumentiert.

---

## Option B — F7 cache_control-Rename (Schritt 6)

Pre-Check:
- `system_cached`-Aufrufer greppen (3 Stellen erwartet)
- `lib/ai/types.ts` Type aendern: `system_cached?: boolean` → `cache_control?: { system?: boolean; messages?: boolean }`
- `lib/ai/providers/claude.ts` Mapping anpassen
- Mistral + Mock ignorieren weiter

TDD strict: Tests vor Code, RED → GREEN. Drei Substeps:
1. Type aendern + Tests anpassen
2. Claude-Provider mapping anpassen
3. Aufrufer migrieren (route.ts + Tests)

Erwartung: ~150 LOC delta + 3 Commits.

---

## Option C — C8 Caregiver-Scope (Schritt 7, ARCHITEKTUR-BLOCKED)

**ZUERST: Founder beantwortet 3 Fragen** (sonst kein Start):

### Frage 1 — Schreibrecht?
Sollen Angehoerige (caregiver) per Schreibrecht im Senior-Memory eintragen duerfen
(z.B. "Mama mag keine Bohnen"), oder nur lesen?

- **a) Nur Lesen** → C8 wird sehr klein (~30 min, nur API-Erweiterung)
- **b) Lesen + Schreiben** → mittlerer Aufwand (2-3h, Caregiver-Wizard ODER Caregiver-Eingabe-Page)
- **c) Lesen + Schreiben + Anhaengen-an-Senior-Wizard** → grosser Aufwand (4-5h, Multi-Actor-Wizard)

### Frage 2 — Sichtbarkeit fuer den Senior?
Wenn Caregiver schreibt: Sieht der Senior den Eintrag mit Hinweis "von Tochter Anna"?
Kann der Senior Caregiver-Eintraege loeschen?

- **a) Voll transparent** → Senior sieht alles + kann loeschen (UX-konsistent, DSGVO-stark)
- **b) Caregiver-Eintraege nur fuer KI sichtbar, nicht fuer Senior** → komplex, abgeraten

### Frage 3 — Eingabe-Ort fuer Caregiver?
Wo gibt der Caregiver Eintraege ein?

- **a) Eigene Caregiver-Seite** `/caregiver/senior/{id}/gedaechtnis` — sauberste Trennung
- **b) Caregiver-Modus im Senior-Wizard** — gemeinsame Sitzung — komplex
- **c) Beim Erst-Setup im Caregiver-Onboarding** — eingeschraenkt, nicht laufend nutzbar

**Empfehlung Claude:** **1b + 2a + 3a** — Lesen+Schreiben, voll transparent, eigene Caregiver-Seite. Saubere Trennung, DSGVO-stark, mittlerer Aufwand.

Wenn Founder diese Empfehlung uebernimmt: ~2-3h fuer komplette Implementierung mit Tests.

---

## Was Founder tun MUSS bevor morgen losgeht

1. **C8-Fragen ueberlegen** (siehe oben). Reicht: "ich nehme Claude-Empfehlung" oder spezifische Antworten.
2. **Notar-Termin 27.04. bestaetigen** (oder Datum korrigieren).
3. **AVV-Dokumente** finden / herunterladen:
   - https://www.anthropic.com/legal/dpa
   - https://mistral.ai/terms/#data-processing-addendum

---

## Was Claude HEUTE NACHT noch macht

- Diesen Aktions-Plan committen (Founder-Verfuegbar morgen)
- Memory-System hat Schluss-Handoff bereits eingespielt
- Keine Code-Aenderungen mehr (sauberer Stop)

---

## Start-Prompt fuer morgen (copy-paste-fertig)

**Wenn Founder die 5-Punkte-Liste komplett angeht:**

```
Wir machen heute den 5-Punkte-Welle-C-Abschluss. Bitte lies ZUERST:
1. nachbar-io/docs/plans/2026-04-20-aktionsplan-welle-c-abschluss.md
2. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c6b-c7-c6c-done.md

Reihenfolge:
- Schritt 1: Option E (Browser-Smoke-Test, Claude allein, ~15min)
- Schritt 2: Test-Umgebung fuer Founder aufsetzen
- Schritt 3: Founder klickt durch (parallel zu 4+5)
- Schritt 4: Option D (AVV-Notiz, ~15min)
- Schritt 5: Option A (Push-Vorbereitung, ~30-45min)
- Schritt 6: Option B (F7 Rename, TDD, ~60-90min)
- Schritt 7: Option C (C8 Caregiver-Scope, NUR wenn Founder Architektur-Fragen
  beantwortet hat — siehe Aktionsplan)

C8-Architektur-Antworten Founder: [HIER deine Antworten zu Frage 1+2+3 oder
"nimm Claude-Empfehlung 1b+2a+3a"]

Modell: Sonnet 4.7 ok fuer E/D/A/B. Opus 4.7 fuer C (Architektur). Wenn Du
merkst dass Kontext knapp wird (~65%): zwischenzeitlich Handoff schreiben,
ggf. C in eine zweite Session schieben.

Arbeitsweise: TDD strict, Pre-Check first, kein Push (rote Zone bleibt fuer
27.04.), best-practice automatisch.
```

**Wenn Founder NUR Browser-Test will (kuerzeste Variante):**

```
Mach Option E (Browser-Smoke-Test fuer Welle C) und setze die
Test-Umgebung fuer mich auf. Klick-Anleitung als Markdown.
Andere Optionen verschiebe ich auf naechste Session.
```

---

## Risiken die heute Abend nicht behoben werden koennen

- **Mig 173+174 lokal noch nicht apply** — kann morgen erkannt werden, dann via MCP `apply_migration` lokal applyen (nicht Prod, lokal harmlos)
- **Mock-Provider-Antwort qualitaet unbekannt** — gibt vermutlich Lorem-Ipsum, reicht aber fuer Flow-Test
- **Senior-Test-Account-Existenz unklar** — falls keiner da ist: morgen schnell einen anlegen via Supabase-Studio
- **Mikrofon-Permission im Browser** — Founder muss freigeben oder STT-Test ueberspringen
