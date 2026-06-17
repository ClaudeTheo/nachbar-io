# Spiele + Senior-Features — Implementierungs-Wellenplan (D0 / SB / SP1 / SP2 / AA)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **Erstellt:** 2026-06-12 (Fable 5), Auftrag: `Uebergabe-an-Fable5-Session-2026-06-12-Implementierungsplan-Spiele-Senior-Features.md` (KI-Inbox).
> **Quellen:** `2026-06-12-media4care-analyse-ergebnis.md` + `2026-06-12-senior-app-wettbewerber-benchmark.md` + `2026-06-12-senior-welt-familienkreis-wellenplan.md` (S1/S2/S3).
> **Status: WARTET AUF FOUNDER-GO.** Founder bestätigt die Reihenfolge → dann Umsetzung. Kein `git push` ohne Founder-Go.

**Goal:** Die rechtlich grün geprüften Feature-Kandidaten aus Media4Care-Analyse + Wettbewerber-Benchmark als kleine, andockende Wellen umsetzen: Tagesrätsel, „Paare finden" mit Familienfotos, Senior-Bildschirm (Foto-Karussell + Sticky Notes), Auto-Annahme von Anrufen, plus Doku-/Wording-Welle.

**Architecture:** Konsequent **Adapter statt Neubau** — der frische Pre-Check (unten) zeigt: Sticky Notes, Familienfotos, Foto-Karussell und Auto-Annahme existieren bereits vollständig im Terminal-/Kiosk-Pfad (Geräte-Token). Die Wellen bringen diese Bausteine in die authentifizierte `(senior)`-Shell. Dafür sind zwei kleine Migrationen nötig (RLS-Lesezugriff für Senioren, Senior-Consent für Auto-Annahme) → je ein Pflicht-Mini-Audit.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, Supabase (RLS, EU Frankfurt), Vitest + RTL, bestehende Module (`modules/gamification`, `modules/care`, `lib/video-calls`, `components/terminal`).

---

## 0. Verhältnis zum bestehenden Wellenplan S1/S2/S3

Dieser Plan **ersetzt nichts**. Er dockt an `2026-06-12-senior-welt-familienkreis-wellenplan.md` an:

- **S1 (Eine Senior-Welt)** und **S2 (Senior-Hälfte Familienkreis)** bleiben unverändert die ersten beiden Code-Wellen. Spiele sind Bindungs-Features — sie wirken erst, wenn Nachricht/Anruf/Kreis rund sind.
- **S3 („Erster gemeinsamer Moment")** geht in der **Welle SB (Senior-Bildschirm)** auf — wie in der Übergabe empfohlen.
- Nur **D0 (Doku/Texte)** ist sofort und parallel möglich, weil sie keinen Code anfasst.

## 1. Pre-Check-Ergebnis (frisch gegrept 2026-06-12, gleiche Session)

Bestandskarte der Übergabe **bestätigt** — und um **drei wesentliche Funde erweitert**, die den Plan verkleinern bzw. präzisieren:

| Was | Wo (Datei:Zeile) | Konsequenz für den Plan |
|---|---|---|
| Kiosk-Quiz (10 Fragen hardcodiert, 5/Tag tagesrotierend) | `app/(kiosk)/kiosk/games/quiz/page.tsx:36` (`getDailyQuestions`) | SP1: Rotation-Mechanik extrahieren, nicht neu erfinden |
| Kiosk-„Memory" (4×4 Emoji-Paare) | `app/(kiosk)/kiosk/games/memory/page.tsx:93` + `games/page.tsx:20` + `kiosk.css:323` | SP1: Rename „Paare finden" = genau 3 Code-Stellen + 1 CSS-Kommentar |
| Gamification | `modules/gamification/services/points.service.ts:15` (`awardPoints(supabase, userId, action)`), `constants.ts` (`POINTS_CONFIG` mit `dailyLimit`) | SP1: Teilnahme-Aktion ist 2-Zeilen-Eintrag + Server-Route |
| **NEU 1: Sticky Notes + Familienfotos existieren komplett** | Mig `083_kiosk_photos_reminders.sql` (`kiosk_photos`, `kiosk_reminders` mit `type='sticky'` und **`acknowledged_at`**), Services `modules/care/services/caregiver/kiosk-{photos,reminders}.service.ts`, Angehörigen-Form `modules/care/components/kiosk/KioskReminderForm.tsx` | SB: KEIN neues Schema, KEINE neue Angehörigen-UI. Nur Senior-Lesezugriff + Quittungs-Pfad fehlen |
| **NEU 2: Foto-Karussell existiert** | `components/terminal/ScreensaverOverlay.tsx` (15-s-Slides, Fotos + Stickys), `lib/terminal/useIdleTimer.ts`, Screens `FamilienFotosScreen.tsx` / `ErinnerungenScreen.tsx` — alle nur im Terminal-Pfad `app/terminal/[token]/` | SB: Adapter in die `(senior)`-Shell statt Neubau |
| **NEU 3: Auto-Annahme existiert komplett (Terminal)** | Mig `084_auto_answer_fields.sql` (`caregiver_links.auto_answer_allowed/_start/_end`), pure getestete Logik `lib/video-calls/auto-answer.ts` (`shouldAutoAnswer` inkl. Ruhezeiten + Overnight-Fenstern), Countdown-UI `components/terminal/video/KioskIncomingCall.tsx`, Härtungs-Plan W3AJ 2026-05-08 | AA: nur Senior-Consent-Feld + Senior-Shell-Overlay + Opt-in-UI fehlen |
| **RLS-Lücke (Folge aus NEU 1):** `kiosk_photos`/`kiosk_reminders` SELECT-Policies decken nur Caregiver (via `caregiver_links`) und Uploader — der **Senior selbst darf die Daten seines Haushalts NICHT lesen** (Terminal liest über Geräte-Token-API daran vorbei). UPDATE (`acknowledged_at`) ebenso nur `created_by` | Mig 083, Policies `kiosk_photos_select` / `kiosk_reminders_select/update` | SB braucht 1 Migration (neue SELECT-Policy) + API-Route für die Quittung → **Mini-Audit Pflicht** |
| `GlobalCallListener` nur im `(app)`-Layout | `app/(app)/layout.tsx`; Senior-Mount kommt in **S2 Schritt 5** | AA setzt auf S2 auf |
| kreis-start: **„Genau 4 Kacheln"-Regel** (Design-Doc 2026-04-10 §3) + Sekundär-Aktionen-Grid darunter | `app/(senior)/kreis-start/page.tsx:4` + `:94` (`kreis-start-secondary-actions`) | Tagesrätsel + Stickys kommen NICHT als 5. Kachel, sondern unter die Kacheln |
| „Mein Tag" leitet Dichte aus `users.ui_mode` ab | `app/(app)/my-day/page.tsx:69` | SP1: Failure-free-Variante automatisch aus `simple`-Modus, kein eigener Bereich |
| Wording-Doku ohne Spiele-Abschnitt | `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md` (Stand 2026-05-25) | D0-1 |
| Migrations-Namensschema aktuell: Timestamp | Letzte: `20260610193356_spatial_ref_sys_rls_readonly.sql` | Neue Migs als `2026MMDDHHMMSS_<name>.sql` — **vermeidet auch die bekannte Mig-Nr-199-Kollision** (PR #38 vs. geplante Municipal-Pipeline) |
| Kein `modules/spiele` vorhanden | Glob/Grep leer | SP1 legt das Modul neu an (kein Duplikat-Risiko) |

## 2. Nicht verhandelbare Regeln (aus den Analysen)

1. **Kein Medizinprodukt (RPP-001):** Spiele = Unterhaltung/Beschäftigung. **Bann-Wörter** (UI, Code-Strings, Marketing): „Gedächtnistraining, Gehirnjogging, kognitives Training, Therapie, Prävention*, Sturzprophylaxe, hält geistig fit, fördert Gedächtnis/Konzentration, misst/erkennt …". Erlaubt: „Tagesrätsel, Denkpause, Rätselspaß, gemeinsam spielen, Freude, Verbindung". (*„Prävention" nur im bestehenden Kurs-Kontext `modules/praevention`, nie für Spiele.) SP1 baut dafür einen automatischen Wording-Guard-Test.
2. **Spiele ohne Auswertung:** keine personenbezogene Ergebnis-Speicherung, kein Verlauf, kein Angehörigen-Einblick in Spielleistung. `awardPoints` nur fürs Mitmachen (`daily_puzzle`-Teilnahme), kein Leaderboard, keine Ergebnis-Events.
3. **Markennamen tabu:** „Memory" (Ravensburger), „Dalli Klick", „Famileo", „Komp", „GrandPad", „DIPS", „Media4Care" … — Mechaniken frei, Namen/Inhalte nicht (Benchmark Kap. 4).
4. **Senior-Mode:** ≥80 px Touch-Targets, ≥4.5:1 Kontrast, max. 4 Taps pro Aktion; kreis-start behält exakt 4 Kacheln.
5. **TDD strikt** (`.claude/rules/testing.md`), Sofort-Commit nach Verifikation, Pre-Check als erster Todo jeder Welle (`.claude/rules/pre-check.md`).
6. **Mini-Audit Pflicht** für SB und AA (`.claude/rules/security-mini-audit.md`) — beide fassen RLS/Consent-Pfade an. Pflicht-Ausgabe-Block am Ende der jeweiligen Welle in DIESER Datei ergänzen.
7. **Rote Zone:** kein Push, kein Prod-Migration-Apply, keine neuen Kosten ohne Founder-Go. Migrationen **File-first** (`.claude/rules/db-migrations.md`).

## 3. Reihenfolge + Aufwand (Empfehlung)

| # | Welle | Inhalt | Aufwand | Hängt ab von | Mini-Audit |
|---|---|---|---|---|---|
| 1 | **D0** Doku/Texte | Wording-Guardrails Spiele-Abschnitt, Pilot-Argumente, Großdruck-Anleitung, 50 Rätsel-Fragen (Entwurf) | S | nichts — **sofort, parallel** | nein |
| 2 | **S1 → S2** | bestehender Plan, unverändert | M / M–L | — | S2: ja (dort definiert) |
| 3 | **SB** Senior-Bildschirm | S3 „Erster gemeinsamer Moment" + Foto-Karussell-Ruhezustand + Sticky Notes mit „Gesehen"-Quittung | S–M | S2 | **JA** (RLS-Mig) |
| 4 | **SP1** Spiele-Welle | „Memory"→„Paare finden"-Rename + Tagesrätsel (failure-free) auf „Mein Tag" + kreis-start + Teilnahme-Punkte | S | S2 (Empfehlung); Rename jederzeit vorziehbar | nein |
| 5 | **SP2** Familienfoto-Spiele | „Paare finden" mit Familienfotos + „Erinnerung der Woche"-Diashow | M | SB (nutzt RLS + Foto-Pfade) | nein |
| 6 | **AA** Auto-Annahme | Senior-Consent + Countdown-Overlay in der Senior-Shell | M | S2 (GlobalCallListener im Senior-Layout) | **JA** (Consent-Mig) |

**Backlog (bewusst NICHT geplant, nur notiert):** „Familienpost" (gedruckte Familien-/Quartierszeitung — erst manueller PDF-Test im Pilot, 0 Kosten, Founder-Hand; Druck/Porto später = neue Kosten → Founder-Go), Mängelmelder (Civic/B2G, Post-Pilot), Brief-Code-Verifikation.

---

## Welle D0 — Doku-/Text-Welle (S, kein Code, sofort)

### Task D0-1: Wording-Guardrails um Abschnitt „Spiele & Aktivierung" erweitern

**Files:**
- Modify: `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md`

**Step 1:** Nach dem Abschnitt „Care- und Senior-Wording" neuen Abschnitt einfügen (Text aus Media4Care-Analyse Kap. 4.3, durch Benchmark Kap. 4 bestätigt):

```markdown
## Spiele & Aktivierung

Spiele sind Unterhaltung, Beschaeftigung und gemeinsame Zeit - nie Medizin.

Erlaubt:

- "Tagesraetsel", "Denkpause", "Spiel & Spass", "gemeinsam spielen"
- "Beschaeftigung", "Zeitvertreib", "kleine Aufgabe des Tages"
- "aktiv bleiben im Quartier" (sozial gemeint), "Freude am Knobeln"

Nicht verwenden:

- "Gedaechtnistraining", "Gehirnjogging", "kognitives Training"
- "geistig fit halten", "Demenz-Praevention/-Vorbeugung"
- "Therapie", "therapeutisch", "Sturzprophylaxe"
- "foerdert Gedaechtnis/Konzentration/Reaktion", "wissenschaftlich belegt"
- "verhindert/verlangsamt Abbau", "misst geistige Fitness", "erkennt Veraenderungen"

Begruendung: Wirkversprechen veraendern die Zweckbestimmung Richtung
Medizinprodukt (Lumosity-FTC-Lehre, RPP-001). Mess-/Erkennungs-Claims
zusaetzlich Art.-9-/Ueberwachungs-Risiko. Spielergebnisse werden nicht
gespeichert und nicht ausgewertet (Produktregel, Founder-Entscheidung 3
aus der Media4Care-Analyse 2026-06-12).
```

**Step 2:** „Stand:"-Zeile auf aktuelles Datum heben.
**Step 3:** Verifizieren (Datei lesen), dann Commit: `docs: add games & activation section to wording guardrails`

### Task D0-2: Pilot-Material — Anti-Scam-Story + Kommunen-Preisargument

**Step 1 (Pre-Check):** `Grep: pilot.*brief|flyer|multiplikator` in `docs/` — vorhandenes Pilot-Material lokalisieren (nicht doppelt anlegen; ggf. neue Datei `docs/pilot/pilot-argumente.md`).
**Step 2:** Zwei Textbausteine ergänzen (Wording-Regeln aus Benchmark Kap. 4 beachten — sachlich, ohne Wettbewerber-Namen):
- **Anti-Scam:** „Ein geschlossener, geprüfter Kreis: Nur eingeladene, verifizierte Menschen erreichen Ihre Angehörigen. Das **hilft**, vor Enkeltrick & Spam zu **schützen**." (NIE „verhindert Betrug".)
- **Kommunen-Preis:** Pro Community (79 EUR/Monat ≈ 950 EUR/Jahr) gegen marktübliche ~1 EUR/Einwohner/Jahr stellen — „Bruchteil der Marktpreise", eigene Zahlen nennen, keine Namen.
**Step 3:** Commit: `docs: add anti-scam story and municipal pricing argument to pilot material`

### Task D0-3: Großdruck-Anleitung (4 Seiten) fürs Pilot-Onboarding

**Step 1 (Pre-Check):** `app/(auth)/onboarding-anleitung/page.tsx` lesen — Inhalte wiederverwenden, nicht neu erfinden.
**Step 2:** Create `docs/pilot/grossdruck-anleitung.md`: 4 Seiten Inhalt (1: Gerät an + App öffnen, 2: Die 4 Kacheln, 3: Nachricht & Anruf, 4: Hilfe + Notfall 112). Große Schrift gedacht (≥14 pt Druck), Siezen, je Seite max. 5 Schritte. Founder druckt/layoutet selbst (Canva) — **kein neuer Dienstleister, keine Kosten**.
**Step 3:** Commit: `docs: add 4-page large-print pilot onboarding guide`

### Task D0-4: 50 Tagesrätsel-Fragen entwerfen (Inhalt für SP1)

**Step 1:** Create `docs/plans/2026-06-12-tagesraetsel-fragen-entwurf.md`: 50 eigene Fragen (~15 mit Bad-Säckingen-/Hochrhein-Bezug), je Frage: Fragetext, 4 Antwort-Optionen, beste Antwort, **1–3 Sätze „Geschichte"** (failure-free: wird nach jeder Antwort gezeigt). Nur eigene Formulierungen, kein fremdes Material (UrhG/§ 87a). Sprichwörter/Volksgut erlaubt.
**Step 2:** **Founder prüft jede Frage auf Richtigkeit** (KI-Entwurf ≠ Faktenprüfung) — Review-Vermerk in die Datei.
**Step 3:** Commit: `docs: draft 50 daily puzzle questions incl. local Bad Saeckingen set`

**Definition of Done D0:** Guardrails enthalten Spiele-Abschnitt; Pilot-Argumente + Anleitung + Fragen-Entwurf liegen als Doku vor; Founder hat Fragen-Review offen markiert oder erledigt.

---

## Welle SB — Senior-Bildschirm (S–M, nach S2) — **Mini-Audit Pflicht**

**Ziel:** Der Senior-Bildschirm lebt von der Familie: „Erster gemeinsamer Moment" (S3), Foto-Karussell im Leerlauf, Sticky Notes mit Ein-Tap-Quittung. Alles auf vorhandener Terminal-/Care-Infrastruktur.

### Task SB-0: Pre-Check + Mini-Audit (erster Todo der Welle)

**Step 1:** Frischer Grep: `kiosk_photos|kiosk_reminders|ScreensaverOverlay|useIdleTimer|acknowledged_at` — Stand gegen Abschnitt 1 dieses Plans verifizieren (Code ist autoritativ).
**Step 2:** Mini-Audit nach `.claude/rules/security-mini-audit.md` (RLS-Lese-Pass auf `kiosk_photos`/`kiosk_reminders`, Trigger-Inventar, Privilege-Sweep, Audit-Trail-Frage für Quittung, Rate-Limit-Frage für neue Routen). Pflicht-Block am Ende dieser Welle eintragen. **Bei CRITICAL/HIGH: STOP + Founder.**

### Task SB-1: Migration — Senior-Lesezugriff auf Haushalts-Fotos/-Zettel

**Files:**
- Create: `supabase/migrations/2026MMDDHHMMSS_senior_household_kiosk_read.sql` (Timestamp beim Anlegen setzen; `ls supabase/migrations | sort` gegen Kollision)

**Step 1 (RED):** Integrationstest/SQL-Erwartung dokumentieren: verifiziertes Haushaltsmitglied (resident) kann `kiosk_photos` (nur `visible = true`) und `kiosk_reminders` seines Haushalts SELECTen; fremde Haushalte nicht; UPDATE bleibt verwehrt.
**Step 2:** Migration schreiben:

```sql
-- Senior-Lesezugriff: verifizierte Haushaltsmitglieder sehen Fotos/Zettel
-- ihres eigenen Haushalts (bisher nur Caregiver + Uploader, Mig 083).
CREATE POLICY kiosk_photos_select_household_member ON kiosk_photos
  FOR SELECT USING (
    visible = true
    AND household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  );

CREATE POLICY kiosk_reminders_select_household_member ON kiosk_reminders
  FOR SELECT USING (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    )
  );
```

Kein UPDATE/INSERT/DELETE für Haushaltsmitglieder — die Quittung läuft über SB-4-Route (RLS kann Spalten nicht einschränken).
**Step 3:** **File-first:** Datei committen. **Prod-Apply = Rote Zone, separater Founder-Go.** Lokal gegen lokalen Stack testen (`npm run supabase:start`).
**Step 4:** Commit: `feat(db): allow verified household members to read kiosk photos and reminders`

### Task SB-2: S3 „Erster gemeinsamer Moment" + Foto auf Senior-Home

Umsetzung exakt nach S3-Plan (`2026-06-12-senior-welt-familienkreis-wellenplan.md` Welle S3, Punkte 1+2): Nach Pairing wird der Angehörige zum ersten Foto/zur Sprachnachricht aufgefordert; neuestes Familienfoto erscheint groß auf dem Senior-Home mit Ein-Tap-Sprachantwort (chat-media + `AudioRecorder` existieren).

**Step 1 (RED):** RTL-Test: `kreis-start` zeigt bei vorhandenem Foto die Foto-Karte mit Sprachantwort-Button (≥80 px).
**Step 2:** Implementieren als Komponente `modules/care/components/senior/FamilienMomentCard.tsx`, eingebunden unter dem Kachel-Grid (4-Kacheln-Regel bleibt unangetastet).
**Step 3:** Tests grün → Commit: `feat(senior): first shared moment photo card on senior home`

### Task SB-3: Foto-Karussell als Ruhezustand der Senior-Shell

**Files:**
- Create: `modules/care/components/senior/SeniorScreensaver.tsx` (+ Test)
- Create: `app/api/senior/photos/route.ts` (Signed URLs)
- Modify: `app/(senior)/layout.tsx` (Mount)

**Step 1 (Pre-Check):** Lesen, wie `lib/services/device.service.ts` Signed URLs für `kiosk_photos.storage_path` erzeugt — gleiches Muster übernehmen (Adapter).
**Step 2 (RED):** Test für `GET /api/senior/photos`: liefert nur Fotos des eigenen Haushalts (User-Kontext-Client, RLS aus SB-1 greift), Array-Format (nie `{ items }`), Signed URLs mit Ablauf.
**Step 3:** Route implementieren; danach Komponente: `useIdleTimer`-Muster aus `lib/terminal/useIdleTimer.ts` wiederverwenden (Idle ≥ 2 min → Vollbild-Karussell, 15-s-Slides wie `ScreensaverOverlay`, Tap beendet). Kein Neubau der Slide-Logik — so viel wie möglich aus `ScreensaverOverlay.tsx` extrahieren/teilen.
**Step 4 (RED→GREEN):** RTL-Test: Karussell erscheint nach Idle, verschwindet bei Tap, zeigt Caption.
**Step 5:** Commit: `feat(senior): family photo screensaver in senior shell`

### Task SB-4: Sticky Notes auf dem Senior-Home + „Gesehen"-Quittung

**Files:**
- Create: `modules/care/components/senior/StickyNotesList.tsx` (+ Test)
- Create: `app/api/senior/reminders/[id]/acknowledge/route.ts` (+ Test)
- Modify: `app/(senior)/kreis-start/page.tsx` (Liste unter den Kacheln)

**Step 1 (RED):** API-Test: POST acknowledge setzt `acknowledged_at` nur wenn (a) User verifiziertes Mitglied des Reminder-Haushalts, (b) `acknowledged_at IS NULL`; sonst 403/409. Erfolg erzeugt Notification + Push an `created_by` — **Payload ohne Zettel-Inhalt** („Ihr Zettel wurde gesehen ❤", Datensparsamkeits-Regel aus S2 Schritt 1; `safeInsertNotification` + `sendPush` aus S2 wiederverwenden).
**Step 2:** Route implementieren (Admin-Client + eigene Checks, da RLS-UPDATE bewusst nicht geöffnet wird).
**Step 3 (RED→GREEN):** RTL-Test StickyNotesList: zeigt aktive Stickys (`type='sticky'`, `acknowledged_at IS NULL`) als große Zettel-Karten mit „Gesehen ❤"-Button ≥80 px; nach Tap verschwindet der Zettel.
**Step 4:** Auf kreis-start unterhalb der Sekundär-Aktionen einbinden (4-Kacheln-Regel!). Medikamenten-Zettel bleiben, was sie sind: selbst eingetragene Kalender-Hinweise (Guardrails-Sprache, keine neue Logik).
**Step 5:** Commit: `feat(senior): family sticky notes with one-tap seen receipt`

**Tests SB gesamt:** RLS-Verhalten (SB-1), API-Routen (SB-3/SB-4), RTL für alle drei UI-Bausteine.
**Definition of Done SB:** Senior sieht im Leerlauf Familienfotos, auf dem Home den neuesten Familien-Moment + offene Zettel, kann mit einem Tap quittieren — Familie bekommt die Quittung als Push ohne Inhalt. Kein einziger neuer Datentyp, keine neue Angehörigen-UI (KioskReminderForm/Foto-Upload existieren).
**Mini-Audit-Block:**

```text
Mini-Audit Welle SB (2026-06-17):
- RLS/Trigger geprueft: kiosk_photos, kiosk_reminders, household_members (Mig 083 + Baseline-Snapshot)
- Trigger: KEINE auf kiosk_photos/kiosk_reminders (kein BEFORE-UPDATE, keine sticky-Privilege-Spalten)
- Findings: 0 CRITICAL / 0 HIGH. SB-1 ergaenzt nur SELECT-Policies (verifizierte Haushaltsmitglieder,
  household_id IN verified-members; Fotos zusaetzlich visible=true). Kein neuer Schreibpfad zu Privileg-Spalten.
  acknowledged_at wird in SB-4 bewusst via Admin-Client + eigene Checks gesetzt (RLS-UPDATE bleibt zu).
  2 MEDIUM-Designvorgaben umgesetzt: acknowledge-Route = duenne Route + Service mit verified-member-Check +
  IS-NULL-Doppel-Ack-Guard; Quittungs-Push ohne Zettel-Inhalt (Datensparsamkeit).
- Audit-Trail: Quittung erzeugt Notification + Push an created_by (= Nachweis); keine auth-/rollen-/consent-
  relevante Aktion -> kein admin_audit_log-Pflichteintrag noetig.
- Rate-Limit: middleware-Default /api/ (60/min, In-Memory — RL-1-Backlog). Push-Spam zusaetzlich begrenzt durch
  idempotenten Ack (1 Push pro Zettel) + Haushalts-Scoping. Kein Token-/Code-Lookup -> kein Brute-Force-Surface.
- Migration file-first, NICHT prod-applied (Founder-Go).
```

---

## Welle SP1 — Spiele-Welle: Tagesrätsel + Rename (S, nach S2; SP1-1 jederzeit vorziehbar)

### Task SP1-1: „Memory" → „Paare finden" (Marken-Fix, ~10 min)

**Files:**
- Modify: `app/(kiosk)/kiosk/games/memory/page.tsx:18,93` (Kommentar + `<h1>🧠 Memory</h1>` → „Paare finden")
- Modify: `app/(kiosk)/kiosk/games/page.tsx:5,20` (Menü-Label + Kommentar)
- Modify: `app/(kiosk)/kiosk/kiosk.css:323` (Kommentar)

**Step 1:** Alle „Memory"-Vorkommen ersetzen (Route-Ordnername `games/memory/` darf bleiben — nicht nutzersichtbar, aber wenn trivial: in `games/paare-finden/` umbenennen + Verweise anpassen).
**Step 2:** `Grep: -i "memory" app/(kiosk)` → nur noch erlaubte Treffer (z. B. React `useMemo`).
**Step 3:** `npm run lint && npx tsc --noEmit` → Commit: `fix(kiosk): rename Memory game to Paare finden (trademark)`

### Task SP1-2: Modul `modules/spiele` — Tagesrätsel-Logik (pure, getestet)

**Files:**
- Create: `modules/spiele/data/tagesraetsel-fragen.ts` (aus D0-4, **nur Founder-geprüfte Fragen**)
- Create: `modules/spiele/services/tagesraetsel.service.ts`
- Create: `modules/spiele/services/__tests__/tagesraetsel.service.test.ts`
- Create: `modules/spiele/__tests__/wording-guard.test.ts`

**Step 1 (RED):** Test: `getDailyQuestions(date, fragen)` liefert deterministisch 5 Fragen pro Tag (gleicher Tag = gleiche Auswahl, Folgetag rotiert) — Logik aus `app/(kiosk)/kiosk/games/quiz/page.tsx:36` extrahieren, mit injizierbarem Datum (testbar, keine `new Date()`-Abhängigkeit im Service).

```ts
export interface TagesraetselFrage {
  q: string;
  options: string[];
  answer: number;   // Index der besten Antwort
  story: string;    // failure-free: wird nach JEDER Antwort gezeigt
  lokal?: boolean;  // Bad-Saeckingen-/Hochrhein-Frage
}

export function getDailyQuestions(
  date: Date,
  fragen: TagesraetselFrage[],
  count = 5,
): TagesraetselFrage[] { /* dayOfYear-Rotation wie Kiosk-Quiz */ }
```

**Step 2 (GREEN):** Implementieren, Tests grün.
**Step 3 (RED→GREEN) Wording-Guard:** Test, der alle `.ts/.tsx` unter `modules/spiele/` + `app/(senior)/raetsel/` einliest und auf Bann-Wörter prüft (`/gedächtnistraining|gehirnjogging|kognitiv|therap|prophylaxe|geistig fit|gedächtnis/i` — Liste aus Regel 1). Schlägt fehl, sobald jemand verbotenes Wording eincheckt.
**Step 4:** Kiosk-Quiz auf den Service umstellen (eine Quelle, DRY) — Kiosk behält sein Score-Verhalten (client-only).
**Step 5:** Commit: `feat(spiele): daily puzzle service with rotation + wording guard tests`

### Task SP1-3: Tagesrätsel-UI — failure-free für Senioren, Karte auf „Mein Tag"

**Files:**
- Create: `modules/spiele/components/Tagesraetsel.tsx` (+ Test)
- Create: `app/(senior)/raetsel/page.tsx`
- Modify: `app/(senior)/kreis-start/page.tsx` (Sekundär-Aktion „Tagesrätsel", NICHT 5. Kachel)
- Modify: `app/(app)/my-day/page.tsx` (kleine Tagesimpuls-Karte)

**Step 1 (RED):** RTL-Tests: (a) `failureFree`-Modus zeigt **keine** Rot-/Falsch-Markierung — jede Antwort öffnet die `story` („Interessant! …"); (b) Standard-Modus wie Kiosk-Quiz; (c) keinerlei Persistenz der Antworten (kein Storage-/Supabase-Write im Komponententest); (d) Buttons ≥80 px im failure-free-Modus.
**Step 2 (GREEN):** Komponente mit Prop `failureFree: boolean`; Senior-Page setzt `failureFree` aus `ui_mode === 'simple'` ab (Muster `my-day/page.tsx:69`), Wording „Tagesrätsel — kleine Denkpause". Ein Vorschlag pro Tag, kein Streak-Zähler, kein Score im failure-free-Modus.
**Step 3:** Einstiege verdrahten: Sekundär-Aktion auf kreis-start (Muster `kreis-start-termine-link`), Karte auf „Mein Tag" (density-aware).
**Step 4:** `npm run test && npx tsc --noEmit` → Commit: `feat(spiele): failure-free daily puzzle on senior shell and my-day`

### Task SP1-4: Teilnahme-Punkte (nur Mitmachen, nie Ergebnis)

**Files:**
- Modify: `modules/gamification/services/constants.ts` (`daily_puzzle: { points: 5, dailyLimit: 1 }` + Label „Tagesrätsel ausprobiert")
- Create: `app/api/spiele/teilnahme/route.ts` (+ Test)

**Step 1 (RED):** API-Test: POST vergibt serverseitig genau 1×/Tag Punkte für die **hartkodierte** Aktion `daily_puzzle` (Client kann keine Aktion wählen); unauthentifiziert → 401. **Kein Request-Feld für richtig/falsch — die Route nimmt gar keine Spielergebnisse an.**
**Step 2 (GREEN):** Route ruft `awardPoints(supabase, user.id, "daily_puzzle")` beim Öffnen des Rätsels (fire-and-forget vom Client).
**Step 3:** Commit: `feat(spiele): participation-only points for daily puzzle`

**Definition of Done SP1:** Kein „Memory" mehr im Produkt; Senior öffnet das Tagesrätsel in ≤2 Taps von kreis-start, beantwortet 5 Fragen ohne jede Fehler-Beschämung und ohne dass irgendein Ergebnis gespeichert wird; Wording-Guard-Test schützt die Bann-Liste dauerhaft.

**Mini-Audit-Block (SP1-4 — neue API-Surface):**

```text
Mini-Audit SP1-4 (2026-06-17):
- Trigger: neue API-Route mit personenbezogenem Schreibpfad (points_log INSERT +
  users.total_points/points_level UPDATE via awardPoints) -> Mini-Audit Pflicht.
- RLS/Trigger geprueft: points_log, users. Route nutzt User-Kontext-Client
  (createClient, Cookie-Auth) — IDENTISCHES Muster wie bestehende /api/points/award
  + checkin/group_post (alle awardPoints mit User-Client). Keine neue Tabelle, keine
  neue Policy, keine Migration -> kein Trigger-Inventar-Delta.
- Privilege-Spalten-Sweep: Route schreibt ausschliesslich total_points + points_level
  (via awardPoints). KEIN Zugriff auf is_admin/role/trust_level/settings/consent.
  Aktion serverseitig HARTKODIERT "daily_puzzle" (POST ohne Request-Parameter) ->
  Client kann keine hoeherwertige Aktion waehlen. STRENGER als /api/points/award
  (dort waehlt der Client die Aktion aus POINTS_CONFIG).
- Findings: 0 CRITICAL / 0 HIGH.
- Pre-Check-Konflikt (Code vs. Handover): Handover forderte Closed-Pilot-Whitelist
  fuer /api/spiele/*. CODE IST AUTORITATIV — der 503 closed_pilot trifft NUR
  User-lose Calls (lib/supabase/middleware.ts:181, `!user`). /api/spiele/teilnahme
  ist authentifiziert; die Whitelist (CLOSED_PILOT_PUBLIC_API_PATHS) ist laut Regel
  feedback_closed_pilot_whitelist_pflege ausschliesslich fuer Cron/Webhook/Service.
  ENTSCHEIDUNG: NICHT whitelisten (Aufnahme wuerde die Route oeffentlich machen und
  der 401-Anforderung widersprechen). Festgenagelt per Test in
  __tests__/lib/closed-pilot.test.ts (isClosedPilotPublicApiPath -> false).
- Audit-Trail: points_log ist der Pro-Vergabe-Nachweis. Keine auth-/rollen-/consent-
  relevante Aktion -> kein admin_audit_log-Pflichteintrag.
- Rate-Limit: /api/-middleware-Default (In-Memory ~60/min, RL-1-Backlog). Idempotent
  durch awardPoints-Tageslimit (dailyLimit:1 -> max. 1 Vergabe/User/Tag, egal wie oft
  der Ping feuert). Kein Token-/Code-Lookup -> kein Brute-Force-Surface. Closed-Pilot:
  unauth -> 503; eingeloggt-aber-nicht-freigegeben -> 403 pilot_approval_pending.
- Keine Migration -> kein Prod-Apply noetig.
```

---

## Welle SP2 — Familienfoto-Spiele (M, nach SB)

### Task SP2-1: „Paare finden" mit Familienfotos

**Files:**
- Create: `modules/spiele/components/PaareFinden.tsx` (+ Test) — Mechanik aus `app/(kiosk)/kiosk/games/memory/page.tsx` extrahieren (Karten-Flip, Paar-Logik), Kiosk-Seite auf die geteilte Komponente umstellen
- Create: `app/(senior)/spiele/paare-finden/page.tsx`

**Step 1 (RED):** Tests: (a) Grid skaliert nach Fotomenge (≥8 Fotos → 4×4; 4–7 → 3×4 bzw. 2×3; <4 → Emoji-Fallback wie bisher); (b) Foto-Karten nutzen Signed URLs aus `GET /api/senior/photos` (SB-3); (c) kein Timer, kein Score-Vergleich, Abschluss-Text ohne Leistungs-Feedback („Schön gespielt!" statt „Super Gedächtnis!").
**Step 2 (GREEN):** Implementieren; Einstieg über die kreis-start-Sekundär-Aktionen oder die Rätsel-Seite („Noch ein Spiel?" — max. 4 Taps).
**Step 3:** Commit: `feat(spiele): pairs game with family photos`

### Task SP2-2: „Erinnerung der Woche" — Biografie-Diashow

**Files:**
- Create: `modules/spiele/services/erinnerung-der-woche.service.ts` (+ Test): deterministische Wochen-Auswahl (ISO-Woche rotiert über `kiosk_photos` mit `caption`)
- Create: `modules/care/components/senior/ErinnerungDerWoche.tsx` (+ Test)
- Modify: Senior-Home/Karussell-Einbindung (SB-3-Slides um Wochen-Slide ergänzen)

**Step 1 (RED):** Service-Test: gleiche Woche = gleiches Foto, nur Fotos **mit** Caption (Angehörige laden Foto + 1 Satz — Upload-UI existiert: `KioskReminderForm`-Nachbarschaft bzw. Caregiver-Foto-Upload aus Mig 083, `caption ≤ 100`).
**Step 2 (GREEN):** Anzeige groß mit Caption als „Geschichte", Ein-Tap-Sprachantwort (Baustein aus SB-2 wiederverwenden). Kein „Gedächtnistraining"-Label — Wording-Guard-Pfad erweitern (`modules/care/components/senior/Erinnerung*`).
**Step 3:** Commit: `feat(senior): memory-of-the-week family slideshow`

**Definition of Done SP2:** Familie lädt Fotos + Satz; Senior spielt „Paare finden" mit den eigenen Fotos und sieht wöchentlich eine Erinnerung — alles kreis-intern (Supabase EU), nichts wird ausgewertet.

---

## Welle AA — Auto-Annahme von Anrufen in der Senior-Shell (M, nach S2) — **Mini-Audit Pflicht**

**Heute:** Auto-Annahme existiert NUR im Terminal-Pfad; `auto_answer_allowed` setzt der **Angehörige** (`caregiver-misc.service.ts`). **Neu:** Auto-Annahme greift in der Senior-Shell erst, wenn **zusätzlich der Senior ausdrücklich eingewilligt hat** — jederzeit abschaltbar, sichtbarer Countdown.

### Task AA-0: Pre-Check + Mini-Audit (erster Todo der Welle)

Frischer Grep (`auto_answer|shouldAutoAnswer|KioskIncomingCall|GlobalCallListener`) + Mini-Audit (neuer Consent-Pfad auf `caregiver_links`, neue Senior-Route, Audit-Trail-Pflicht für Consent-Änderungen, Rate-Limit-Frage). Pflicht-Block unten eintragen. Bei CRITICAL/HIGH: STOP + Founder.

### Task AA-1: Migration — Senior-Consent-Feld

**Files:**
- Create: `supabase/migrations/2026MMDDHHMMSS_auto_answer_senior_consent.sql`

```sql
-- Auto-Annahme braucht BEIDE Seiten: Angehoeriger erlaubt (Mig 084)
-- UND Senior willigt ausdruecklich ein (neu). NULL = keine Einwilligung.
ALTER TABLE caregiver_links
  ADD COLUMN auto_answer_senior_consented_at TIMESTAMPTZ;
```

File-first, lokal testen, **Prod-Apply nur mit Founder-Go**. Commit: `feat(db): senior consent column for call auto-answer`

### Task AA-2: `shouldAutoAnswer` um Senior-Consent erweitern

**Files:**
- Modify: `lib/video-calls/auto-answer.ts` + `lib/video-calls/__tests__/auto-answer.test.ts`
- Modify: Terminal-Aufrufer (`lib/services/device.service.ts`, `components/terminal/screens/VideochatScreen.tsx`) + deren Tests

**Step 1 (RED):** Tests: `seniorConsentedAt: string | null` ist Pflichtfeld im `AutoAnswerContact`; `null` → niemals Auto-Annahme, alle bestehenden Regeln (revoked, Zeitfenster, Ruhezeiten) bleiben.
**Step 2 (GREEN):** Feld ergänzen, Aufrufer anpassen. ⚠️ **Bewusste Verschärfung:** Auch das Terminal nimmt dann erst nach Senior-Einwilligung automatisch an (bei 0 echten Nutzern verlustfrei — dem Founder beim Review explizit nennen).
**Step 3:** Commit: `feat(video): require explicit senior consent for auto-answer`

### Task AA-3: Senior-Opt-in-UI

**Files:**
- Create: `app/(senior)/einstellungen/anrufe/page.tsx` (+ RTL-Test)
- Create: `app/api/senior/auto-answer-consent/route.ts` (+ Test)

**Step 1 (RED):** API-Test: POST `{ caregiverLinkId, consent: boolean }` — nur der **resident** des Links darf setzen/entziehen; Erfolg schreibt `auto_answer_senior_consented_at` (now() bzw. NULL) **und einen Audit-Eintrag** (bestehende `*_audit`-Infrastruktur per Grep finden — Mini-Audit-Punkt 4).
**Step 2 (GREEN):** Route mit Admin-Client + Ownership-Check. UI: pro Kontakt ein großer Schalter „Anrufe von <Vorname> automatisch annehmen" + Klartext: „Nur Menschen aus Ihrem Kreis. Sie sehen vorher immer eine Ankündigung und können jederzeit ablehnen oder dies hier abschalten." Kein „Überwachungs"-Wording.
**Step 3:** Commit: `feat(senior): auto-answer opt-in settings per contact`

### Task AA-4: Countdown-Overlay in der Senior-Shell

**Files:**
- Create: `components/video/AutoAnswerCountdown.tsx` (+ Test) — Muster aus `components/terminal/video/KioskIncomingCall.tsx` (dort: Countdown, Annahme, Abbruch) wiederverwenden/extrahieren
- Modify: `components/video/GlobalCallListener.tsx` (Auto-Annahme-Zweig; mounted im `(senior)`-Layout seit S2 Schritt 5)

**Step 1 (RED):** RTL-Tests: eingehender Anruf von Kontakt mit beidseitigem Opt-in → sichtbarer Countdown (10 s, „Anruf von <Name> wird gleich angenommen") mit „Ablehnen"-Button ≥80 px; Ablehnen bricht ab; ohne Senior-Consent → normales Klingeln.
**Step 2 (GREEN):** Implementieren — Entscheidung ausschließlich über `shouldAutoAnswer` (eine Wahrheit).
**Step 3:** Commit: `feat(senior): visible auto-answer countdown in senior shell`

**Definition of Done AA:** Auto-Annahme funktioniert nur bei beidseitigem Opt-in, innerhalb der Zeitfenster, mit sichtbarem Countdown und Ein-Tap-Abbruch; Senior kann sie jederzeit selbst abschalten; jede Consent-Änderung ist auditiert.
**Mini-Audit-Block:** _nach AA-0 hier eintragen._

---

## Stop-Punkte (gelten für jede Welle)

- Kein `git push`, kein Deploy, kein Prod-Migration-Apply ohne Founder-Go (Migrationen File-first; lokaler Stack zum Testen).
- Keine neuen Kosten (kein Druckdienst, keine Content-Lizenzen, keine Provider).
- Keine Medizinprodukt-/DiPA-Aussagen, keine Wirkversprechen — Wording-Guard-Test ist Pflichtbestandteil von SP1.
- Bei Konflikt Plan ↔ Code: **Code ist autoritativ**, stoppen und melden.
- Token-Regel: bei ~60–65 % Kontext stoppen und Handoff schreiben.
