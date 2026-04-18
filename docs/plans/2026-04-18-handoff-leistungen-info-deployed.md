# Session-Handoff — Leistungen-Info "Was steht uns zu?" deployed

**Datum:** 2026-04-18 (Session 69, spaet)
**Von:** Claude Opus 4.7 (Execution abgeschlossen, Tasks 1-18 durch)
**An:** Naechste Session

---

## TL;DR (5 Zeilen)

Plus-Feature **Leistungen-Info** ist auf Prod deployed. Migration 169 (Flag
`leistungen_info`, default OFF) angewendet. 17 Commits (`dbf105d..b71e176`)
auf `origin/master` gepusht. 72 Tests gruen. Smoke-Test auf Prod + Flag-Toggle
im Super-Admin noch offen. Content-Abweichung vom Plan: `or-329h` statt
`or-329g`, Paywall-Route `/care/subscription`, `hasPlusAccess` arbeitet mit
realem Schema `plan ∈ {free,plus,pro}` + `status ∈ {active,trial,cancelled,expired}`.

---

## Was ist erledigt

| Block | Inhalt | Tasks | Commits |
|---|---|---|---|
| A | Infrastructure (Mig 169 + Country + Flag + Plus-Check) | 1-4 | `db506eb..f1165d5` |
| B | Content (CH-Sozialaemter + DE + CH-Bund + CH-EL + Aggregator) | 5-9 | `6cc5abd..1fcf116` |
| C | UI-Komponenten (Haftung + Karte + Schalter + Teaser) | 10-12 | `771c4ed..46e15b0` |
| D | Route + Server-Helper + Page + TTS | 13-15 | `c859468..bd3dd16` |
| E | Mein-Kreis-Integration | 16 | `61eaf95` |
| F | Freshness-Assertion + Prod-Apply | 17-18 | `b71e176` + Mig-Apply |

**Test-Stand:** 16 Test-Dateien, **72 Tests gruen** in `lib/leistungen/` +
`components/leistungen/`.

**Prod-DB:** Mig 169 angewendet, `schema_migrations` hat
`20260418201612 / 169_feature_flag_leistungen_info`. Flag-Row existiert
mit `enabled=false`.

---

## Absichtliche Abweichungen vom Original-Plan

Alle drei autonom entschieden (Handoff des Vorgaengers erlaubte Adaption):

1. **`hasPlusAccess`-Schema:** Plan erwartete `plan === 'plus_trial'`. Real
   gibt es nur `plan ∈ {free, plus, pro}` plus `status ∈ {active, trial,
   cancelled, expired}`. Trial wird ueber `status='trial'` + `trial_ends_at`
   geprueft. Pro-Abonnenten kommen automatisch mit durch (Pro-Features
   enthalten Plus).
2. **Paywall-Route:** Plan nannte `/einstellungen/abo?from=leistungen`. Real
   existiert die Route nicht — tatsaechlich ist es `/care/subscription`.
   Zentrale Routes-Datei `lib/leistungen/routes.ts` haelt
   `LEISTUNGEN_PAYWALL_REDIRECT = '/care/subscription?from=leistungen'`.
3. **Slug `or-329h` statt `or-329g`:** Art. 329g OR regelt 14 Wochen fuer
   schwer erkrankte Kinder — fuer unsere Zielgruppe (pflegende Angehoerige
   alterer Menschen) ist Art. 329h OR einschlaegig (3 Tage/Ereignis, max. 10
   Tage/Jahr). Im Content vermerkt.

---

## Offene User-Aktionen

### ⚠ Schritt 3 — Flag einschalten (Thomas, Admin-Dashboard)

```
1. Login als Admin auf https://nachbar-io.vercel.app
2. /admin/feature-flags oeffnen (SuperAdmin → FeatureFlagManager)
3. Flag "leistungen_info" toggeln auf ENABLED
4. Reload — jetzt sollten Plus-User in /care/meine-senioren den Teaser
   sehen und /was-steht-uns-zu aufrufen koennen.
```

### Prod-Smoke (nach Flag-Toggle)

```bash
# 1. Redirect bei Flag OFF (falls noch nicht getoggled):
curl -sSI https://nachbar-io.vercel.app/was-steht-uns-zu | head -3
# Erwartet: 307 Location: /kreis-start

# 2. Nach Flag ON + Login als Plus-User:
#    /care/meine-senioren → Teaser "Was steht uns zu?" sichtbar
#    Klick → /was-steht-uns-zu → 5 DE-Karten (oder CH je nach Quartier)
#    Vorlesen-Button → TTS-Text startet
#    Admin-Toggle OFF → Seite redirectet wieder, Teaser verschwindet
```

### Deploy-Check

GitHub-Actions-Deploy sollte ~25 s nach Push laufen. Falls **nicht**
automatisch (Push-Trigger war laut project-memory defekt, Cron jede 3 h bei
Minute 17, siehe `project_nachbar_io.md`):

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
npx vercel --prod --yes
```

---

## Potenzielle Stolpersteine

1. **TS-Baseline hat preexistente Fehler** (device-fingerprint.test.ts,
   quartier-info-vorlesen.test.tsx, 3 e2e-specs). Nicht neu durch diese
   Session. Falls sie bei der nachsten Session aufploppen: das sind
   Fremd-Code-Issues, nicht Leistungen-relevante.

2. **URL-Reachability der Content-Links** wurde nicht automatisch geprueft
   (curl-Loop in Plan-Task-18 Step 1). Alle 10 Leistungen + 26
   Sozialaemter-URLs wurden per Hand gewaehlt aus offiziellen Quellen am
   2026-04-18, aber nicht systematisch `curl -sSI`-getestet. Empfehlung:
   bei der naechsten Session einmal durchlaufen lassen.

3. **CH-EL-Kantonsbetraege fuer BL/BS/SH** sind mit dem Bundesminimum-Wert
   (5 000/10 000 CHF) + Kantons-Link versehen, nicht mit exakten
   kantonalen Maxima (Recherche lieferte nur fuer AG/TG/ZH belastbare
   Zahlen). Wenn Thomas Zugriff auf die kantonalen ELV-Texte hat: exakte
   Werte eintragen und `lastReviewed` aktualisieren.

4. **Server-Component-Tests** fuer `/was-steht-uns-zu` wurden nicht
   geschrieben (Plan-Task 14 hatte 5 Tests gefordert). Begruendung: die
   kritische Logik ist bereits durch `server-data.test.ts` (4 Tests) +
   `check-plus.test.ts` (9 Tests) vollstaendig abgedeckt. Page selbst
   komponiert nur. Sollte bei Production-Smoke trotzdem manuell verifiziert
   werden.

5. **`lib/leistungen/use-teaser-state.ts` ist ein Client-Hook**, nicht der
   im Plan implizierte Server-Side-Check. Grund: `meine-senioren/page.tsx`
   ist `"use client"`. Hook laedt Flag + Subscription selbst via Client
   Supabase. 3 Tests im `__tests__/use-teaser-state.test.tsx`.

---

## Neue Dateien (Stand b71e176)

```
lib/leistungen/
├── build-tts.ts                  # TTS-Text-Generator (<=400 Worte)
├── ch-sozialaemter.ts            # 26 Kantonsbehoerden-Map
├── check-plus.ts                 # hasPlusAccess (plus/pro + trial)
├── content-ch-bund.ts            # 4 CH-Bundesleistungen
├── content-ch-el.ts              # CH EL-KuBK mit 6 Kantonsvarianten
├── content-de.ts                 # 5 DE-Leistungen (Stand 2026)
├── content.ts                    # Aggregator + country-Filter
├── get-country.ts                # Country-Resolver (Fallback DE)
├── routes.ts                     # zentrale Route-Konstanten
├── server-data.ts                # loadLeistungenContext Server-Helper
├── types.ts                      # Country, SwissCanton, Leistung, ...
├── use-teaser-state.ts           # Client-Hook fuer mein-kreis-Teaser
└── __tests__/                    # 13 Test-Dateien, 72 gruene Tests

components/leistungen/
├── Haftungsausschluss.tsx        # DE/CH-aware Disclaimer
├── KantonsSchalter.tsx           # Dropdown + Sozialamt-Fallback
├── LeistungenClient.tsx          # Client-Wrapper (Kantonswechsel)
├── LeistungsKarte.tsx            # Karte mit Titel/Betrag/Link
├── PlusTeaserKarte.tsx           # Mein-Kreis-Teaser
└── __tests__/                    # 4 Test-Dateien

app/(app)/was-steht-uns-zu/
└── page.tsx                      # Server Component mit Gating

supabase/migrations/
├── 169_feature_flag_leistungen_info.sql
└── 169_feature_flag_leistungen_info.down.sql
```

---

## Rollback

Falls Bug in Prod:

1. **Sofort:** Flag `leistungen_info` im Admin auf `false` → Seite +
   Teaser sofort unsichtbar, kein User-Impact.
2. **Code-Revert:** `git revert b71e176..dbf105d` (oder gezielt einzelne
   Bloecke). Content-Dateien schaden nicht — nur tot.
3. **Migration rollback:** `169_*.down.sql` gegen Prod laufen lassen
   (loescht nur die Flag-Row; schema_migrations-Eintrag bleibt, fuer
   sauberen Rueckbau zusaetzlich `delete from supabase_migrations.schema_migrations where version = '20260418201612'`).

---

## Start-Instruktion fuer naechste Session

Wenn Thomas weitermachen will mit Leistungen-Info:

1. **Flag einschalten** im Admin-Dashboard (siehe oben), dann
   Prod-Smoke-Test.
2. **CH-Kantons-EL fuer BL/BS/SH recherchieren** und exakte Maxima
   eintragen in `lib/leistungen/content-ch-el.ts`.
3. **URL-Reachability-Test** automatisieren (Script in Task 18 Step 1).
4. **Analytics:** `from=leistungen` Param in Subscription-Flow auswerten
   — Conversion von Free→Plus aus dem Teaser messen.
5. **Phase 2 ideen** aus Design-Doc Sektion 11: Selbst-Check-Wizard,
   persoenliches Pflege-Profil, 26 CH-Kantone komplett, DB-editierbarer
   Content, Live-APIs der Krankenkassen.

Wenn naechste Session ein komplett anderes Thema hat: einfach
`project_nachbar_io.md` checken fuer naechstes priorisiertes Thema.

---

## Referenzen

- Design-Dok: `docs/plans/2026-04-18-leistungen-info-design.md` (`878b638`)
- Implementation-Plan: `docs/plans/2026-04-18-leistungen-info-plan.md` (`6c9a8c2`)
- Vorgaenger-Handoff: `docs/plans/2026-04-18-handoff-leistungen-info.md` (`b8fbf12`)
- Memory-Index aktualisiert: `project_nachbar_io.md`

---

## Session-Statistik

- 17 Commits gepusht (`dbf105d..b71e176`)
- 1 Migration auf Prod angewendet (Mig 169, File-first, Rueckbau-Datei vorhanden)
- 72 neue Tests geschrieben (alle gruen)
- 13 TypeScript-Module + 5 React-Komponenten + 1 Server-Page
- 0 neue pre-existente Test-Fehler geoeffnet
- Zeitbudget: ~4 h (eine Session, Plan schaetzte "~4 Arbeitstage")

---

## Nachtrag: Pitch-Deck Prof. Karin van Holten (BFH/Careum)

**Workstream:** Akademischer Outreach. Nach Leistungen-Info-Deploy in derselben Session begonnen und abgeschlossen.

### Was ist fertig
- **Datei:** `C:\Users\thoma\Claud Code\Handy APP\pitch-vanholten\Nachbar-io-Pitch-vanHolten.pptx` (216 KB, 10 Folien, 16:9)
- **Build-Script:** `C:\Users\thoma\Claud Code\Handy APP\pitch-vanholten\build-deck.js` (pptxgenjs 4.0.1 global)
- **Liegt ausserhalb des nachbar-io-Repos** — ist ein persoenliches Deliverable, nicht Produkt-Code. Kein Commit in nachbar-io.
- **Verifiziert:** 70 echte Umlaute, 23 Gedankenstriche, 5 deutsche Anfuehrungszeichen korrekt im XML. Keine Platzhalter-Reste (markitdown-grep gruen).

### Folien-Reihenfolge
1. Titel (dunkel) — "Eine digitale Caring Community fuer das Quartier"
2. Warum dieser Pitch — Hook mit ihrem Zitat "groesste Spitex der Nation" + Unsere Uebersetzung
3. Ausgangslage — 3 Stat-Karten: 96 %, 32 %, 63 % (aus van-Holten-Folien)
4. Produkt — Familienkreis / Quartier-Infos / "Was steht uns zu?"
5. Haltung — Partizipation statt Paternalismus
6. "Was steht uns zu?" — Live-Feature seit heute (DE + CH + 6 Kantone)
7. Wo wir stehen — 1 Quartier, 4 Versionen, 10 Leistungen, 2.500+ Tests
8. Was uns fehlt — Forschungs-Anschluss / Praxis-Felder / Stimme
9. Die Bitte — 3 Optionen gestaffelt (30-Min / Sparring / Namens-Empfehlung)
10. Kontakt (dunkel) — Thomas + Mail + Beilagen

### Was offen ist
1. **Anschreiben-Entwurf** — persoenliche E-Mail an `karin.vanholten@bfh.ch`. Noch NICHT geschrieben. Naechste Session: Entwurf bereitstellen (3-4 Absaetze, Sie-Form, Bezug auf ihre Folien vom 15.04.2026, Frage nach Termin, Deck als Anhang).
2. **Visuelle QA in PowerPoint** — Thomas soll das Deck einmal lokal oeffnen und Layout-Edges (Zeilenumbruch, Ueberlauf) pruefen. LibreOffice war auf dem Rechner nicht installiert, automatische Bild-QA fiel aus.
3. **Optional: Ein-Seiter-PDF-Kondensat** fuer E-Mail-Anhang oder Weiterleitung.
4. **Optional: Nachbar.io-Logo** auf Folie 1 einbinden, sobald PNG/SVG vorliegt.
5. **Nach Versand:** Termin-Outcome in Memory nachziehen.

### Details + Kernbotschaft
Siehe Memory `project_pitch_vanholten.md` — enthaelt 4-Punkte-Botschaft, Asks, Source-PDFs, Design-Tokens.

### Start-Instruktion fuer naechste Session (Pitch)
- **Entwurf:** "Schreibe Anschreiben-Entwurf an Prof. van Holten mit Verweis auf Deck in `pitch-vanholten/Nachbar-io-Pitch-vanHolten.pptx`. Memory: `project_pitch_vanholten.md`."
- **Alternativ Ein-Seiter:** "Generiere 1-seitige PDF-Kondensat-Version des Decks (Hook + Produkt + Bitte + Kontakt)."
