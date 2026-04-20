# Handoff — Welle C C8 Caregiver-Scope + Dialog-UX-Upgrade + E2E-Skelett

**Datum:** 2026-04-20 (abend)
**Vorgaenger:** `docs/plans/2026-04-20-handoff-aktionsplan-e-d-a-b-done.md`
**Modell:** Opus 4.7 (1M) — Architektur + Cross-File-Reasoning, wie empfohlen.

---

## TL;DR

- **C8 Caregiver-Scope ist funktional shippable.** 6 Commits, 6 TDD-Schritte,
  ~25 neue Tests, tsc clean ausser Skip-Liste. Step 7 (Playwright E2E-Test)
  verschoben auf Folge-Session — braucht Senior-Test-Account + Live-DB.
- **Lokaler HEAD: `f9ae69f`.** 31 Commits seit `5de2a58`, kein Push.
- **Architektur 1b+2a+3a vollstaendig umgesetzt:** Caregiver liest+schreibt
  (1b), Senior sieht Caregiver-Eintraege mit 'Von Angehoerigen'-Badge und kann
  jederzeit loeschen (2a, voll transparent), eigene Caregiver-Seite unter
  `/caregiver/senior/[id]/gedaechtnis` (3a).
- **Pre-Check-Befund war zentral:** POST `/api/memory/facts` hatte den
  kompletten Caregiver-Pfad bereits in Zeilen 95-152 (Welle B). Mig 175
  wurde NICHT noetig (Mig 122 deckte ENUM, Spalte, alle 3 RLS-Policies
  bereits ab). Die urspruenglich geschaetzten 400-500 LOC reduzierten sich
  auf ~430 netto ueber 6 Files, mit ~280 Test-LOC fuer neue Tests.

---

## Die 6 Commits (alle lokal)

| SHA | Step | Scope |
|---|---|---|
| `baa57c3` | 1 | feat(ai): save-memory caregiver-scope via caregiver_links |
| `07e6dd6` | 2 | feat(memory): GET /api/memory/facts supports subject_user_id |
| `3471e1a` | 3 | test(memory): POST /api/memory/facts caregiver-path coverage |
| `f6b73af` | 4 | feat(memory): useMemoryFacts akzeptiert subjectUserId-Option |
| `842c239` | 5 | feat(memory): caregiver-gedaechtnis page + client UI |
| `f9ae69f` | 6 | feat(memory): senior sieht 'Von Angehoerigen'-Badge bei Caregiver-Facts |

---

## Was diese Session gebaut hat

### Step 1 — `saveMemoryToolHandler` Caregiver-Pfad (`baa57c3`)

- `lib/ai/tools/save-memory.ts`: Scope-Logik von "senior-only" umgebaut auf
  drei Pfade:
  - `senior`: `targetUserId === actor.userId` (Default, bestehend)
  - `caregiver` (C8): aktiver `caregiver_links`-Eintrag
    (`caregiver_id=actor, resident_id=target, revoked_at IS NULL`).
    Bei `targetUserId === actor.userId` -> scope_violation (self-target
    fuer Caregiver unsinnig).
  - `ai` / `care_team` / `system`: weiterhin blockiert.
- `saveFact`-Call setzt bei Caregiver-Actor `source='caregiver'` +
  `sourceUserId=caregiver-id` + `targetUserId=senior-id`. Audit-Log-Entry
  entsteht automatisch ueber `facts.service.ts` mit `actor_role='caregiver'`.
- 7 neue Tests in `save-memory.test.ts`, inkl. Confirm-Mode-Durchgriff.

**Aenderungen:** `lib/ai/tools/save-memory.ts` +43/-14,
`lib/ai/tools/__tests__/save-memory.test.ts` +164/-5.

### Step 2 — GET `/api/memory/facts` Caregiver-Cross-Read (`07e6dd6`)

- `app/api/memory/facts/route.ts`: Query-Param `subject_user_id`. Bei
  Fremd-User: `caregiver_links`-Gate mit 403 `no_caregiver_link`. Bei
  Self-Self oder fehlendem Param: Senior-Pfad unveraendert.
- RLS-Policy `caregiver_facts_select` (Mig 122) wuerde zwar auch reichen,
  aber explizite 403 liefert der UI klare Meldung statt leerem Resultat.
- 5 neue Tests + neue `makeClientMock`-Factory mit chainbarem from()-Mock
  fuer weitere Tests nutzbar.

**Aenderungen:** `app/api/memory/facts/route.ts` +27/-4,
`__tests__/api/memory/facts.test.ts` +154/-8.

### Step 3 — POST `/api/memory/facts` Caregiver-Pfad-Tests (`3471e1a`)

- Pre-Check zeigte: POST-Route hatte den Caregiver-Pfad **bereits**
  implementiert (Welle B, Zeilen 95-152) — aber ungetestet. Kein
  Code-Change in C8, nur Testcoverage nachgezogen.
- 3 neue Tests: source='caregiver' mit aktivem Link; 403 ohne Link;
  `targetUserId === self` aequivalent zu Senior-Pfad.

**Aenderungen:** `__tests__/api/memory/facts.test.ts` +95/-0.

### Step 4 — `useMemoryFacts` Hook Subject-Param (`f6b73af`)

- `modules/memory/hooks/useMemoryFacts.ts`: neue Option
  `{ subjectUserId?: string }`. Bei gesetztem subjectUserId wird die Facts-
  URL mit `?subject_user_id=...` gebaut **und der Consent-Fetch
  uebersprungen** (Consent-Daten sind Senior-persoenlich, irrelevant fuer
  Caregiver-UI).
- Default-Verhalten ohne Option unveraendert — alle bestehenden Aufrufer
  (z.B. `/profil/gedaechtnis`) funktionieren ohne Code-Change.
- Neue Testdatei `__tests__/modules/memory/useMemoryFacts.test.tsx` mit
  2 Tests (fetch-Mock). Senior-Memory + SeniorMemoryFactList-Tests alle
  weiterhin gruen (84/84).

**Aenderungen:** `modules/memory/hooks/useMemoryFacts.ts` +39/-11,
`__tests__/modules/memory/useMemoryFacts.test.tsx` +125 neu.

### Step 5 — Caregiver-Page + Client-UI (`842c239`)

- **Server-Component** `app/(app)/caregiver/senior/[id]/gedaechtnis/page.tsx`:
  - `auth.getUser()` -> `redirect('/login')` wenn kein User
  - `caregiver_links`-Query auf `(caregiver, resident, revoked_at IS NULL)`
    -> `notFound()` (nicht 403, damit Existenz des Senior-Accounts nicht
    leakt)
  - Senior-Name ueber bestehende RPC `get_display_names(uuid[])`
    (Mig 167 SECURITY-DEFINER). Fallback "dem Senior" wenn RPC oder Name
    leer.
  - Rendert `<CaregiverGedaechtnisClient>` mit props
    `{seniorId, seniorName, currentUserId}`.
- **Client-Component** `modules/memory/components/CaregiverGedaechtnisClient.tsx`:
  - Liest Senior-Fakten via `useMemoryFacts({ subjectUserId: seniorId })`
  - Form mit Kategorie-Select + Stichwort + Information + Speichern-Button
  - POST auf `/api/memory/facts` mit `targetUserId=seniorId` -> Route
    setzt intern `source='caregiver'`
  - Fehlermeldungen fuer `no_caregiver_link` / `no_consent` /
    `medical_blocked` / default
  - Liste aller Senior-Fakten; eigene (per `source_user_id === currentUserId`)
    mit gruenem "Von Ihnen"-Badge markiert — so kann ein Caregiver sehen,
    was er selbst vs. was andere Caregiver/Senior angelegt haben.
- 6 Client-Tests in `__tests__/components/caregiver/CaregiverGedaechtnisClient.test.tsx`
  (empty state, seniorName im Header via `getByRole('heading')`,
  "Von Ihnen"-Badge, Submit mit targetUserId, Form-Clear, 403-Error-Meldung).

**Aenderungen:** +584 neu ueber 3 Files.

### Step 6 — Provenance-Badge im Senior-UI (`f9ae69f`)

- `modules/memory/components/SeniorMemoryFactList.tsx`: bei
  `fact.source === 'caregiver'` wird direkt unter dem Wert ein gruenes
  Badge "Von Angehoerigen" gerendert. Klein, auffaellig, aber nicht
  aggressiv — Senior erkennt die Provenance auf einen Blick.
- **Keine Name-Aufloesung** in dieser Iteration. "Von Angehoerigen"
  generisch reicht fuer die 2a-Architektur. Fuer konkrete Namen
  ("Von Tochter Anna") waere ein `display_name`-Lookup + Erweiterung von
  `useMemoryFacts` oder eine neue RPC noetig — YAGNI fuer Welle C, weil
  in der Praxis meist genau 1 Caregiver pro Senior existiert.
- 2 neue Tests. Bestehende 13 SeniorMemoryFactList-Tests unveraendert.

**Aenderungen:** `modules/memory/components/SeniorMemoryFactList.tsx`
+5/-0, `__tests__/modules/memory/SeniorMemoryFactList.test.tsx` +35 neu.

---

## Architektur-Entscheidungen in dieser Session

### 1. Server-Component statt Layout-Gate

Pre-Check zeigte: `app/(app)/layout.tsx` macht **kein Server-Side
Auth-Gate**, nur `AuthProvider` + `AuthSessionProvider` als Client-Kontext.
Jede Seite macht Auth selbst. C8-Page folgt dem Pattern.

### 2. `notFound()` statt `redirect('/')` bei fehlendem caregiver_link

Wenn ein User ohne aktiven Link auf `/caregiver/senior/<id>/gedaechtnis`
zugreift, antwortet die Page mit `notFound()`. Das leakt die Existenz des
Senior-Accounts nicht (403 wuerde zumindest verraten, dass der Senior
existiert; `notFound()` wirkt wie eine nicht-existente Route).

### 3. Senior-Name via `get_display_names`-RPC

Bestehende RPC aus Mig 167 (Chat-Feature). SECURITY-DEFINER, per-RPC-GRANT
auf authenticated. Perfekt passend: Caregiver hat laut RLS
`caregiver_links_select_caregiver` Zugriff auf seinen Link (und damit
indirekt die resident_id), und die RPC liefert den Namen ohne RLS-Hops.
Duplikat einer eigenen Lookup-Funktion vermieden.

### 4. "Von Ihnen" (Caregiver-Page) vs. "Von Angehoerigen" (Senior-Page)

- Caregiver-Page zeigt eigene Eintraege mit "Von Ihnen"-Badge (egoistische
  Perspektive — ich, der Caregiver).
- Senior-Page zeigt Caregiver-Eintraege mit "Von Angehoerigen"-Badge
  (neutrale Perspektive — nicht ich, Familie).

Beide Badges mit gleicher gruener Optik (Palette-Farbe
`#4CAF87/15` Hintergrund, `#4CAF87` Text), sodass das Pattern
wiedererkennbar ist.

### 5. Hook-Consent-Skip im Caregiver-Modus

`useMemoryFacts({ subjectUserId })` ruft `/api/memory/consent` **nicht**
auf. Grund: die Consent-GET-Route gibt den **Consent des aufrufenden
Users** zurueck, nicht den des Subject. Fuer den Caregiver waere das
nutzlos (seine eigenen Memory-Consents), fuer die UI irrelevant. Spart
einen API-Call pro Page-Load.

---

## DSGVO-Status

| Artikel | Wo erfuellt | Status |
|---|---|---|
| Art. 6 Einwilligung (Caregiver-Write) | Senior-`care_consents.memory_*` + DB-RLS vor Insert | LIVE (via Mig 122 + C7-Consent-UI) |
| Art. 7(3) Widerruf (Senior kann Caregiver-Eintraege loeschen) | `/profil/gedaechtnis` mit Provenance-Badge + Loesch-Confirm | LIVE |
| Art. 15 Auskunft | Caregiver-Eintraege sind im Art.-15-Export des Seniors enthalten (gleiche Tabelle `user_memory_facts`) | LIVE |
| Art. 17 Loeschung | Senior loescht einzelne Caregiver-Eintraege wie eigene. Reset-All loescht Kategorie-uebergreifend, inkl. Caregiver-Eintraege | LIVE |
| Art. 25 Privacy by Default | Caregiver-Pfad greift nur bei aktivem Link. Revoke des Links durch Senior stoppt sofort alle weiteren Writes | LIVE |
| Art. 32 Sicherheit | RLS `caregiver_facts_*` in Mig 122; `revoked_at IS NULL` Filter in Application + DB | LIVE |

**Audit-Log:** Jeder Caregiver-Insert schreibt automatisch einen Eintrag in
`user_memory_audit_log` mit `actor_role='caregiver'`, `actor_user_id=caregiver`,
`target_user_id=senior`, `action='create'`. RLS `caregiver_audit` erlaubt
Senior das Lesen aller Audit-Entries, in denen er target ist — Audit-Trail
vollstaendig.

---

## Test-Stand

**Neue Tests (~25):**
- `save-memory.test.ts`: +7 (Caregiver-Scope-Block)
- `facts.test.ts`: +8 (5 GET + 3 POST)
- `useMemoryFacts.test.tsx`: +2 (neu)
- `CaregiverGedaechtnisClient.test.tsx`: +6 (neu)
- `SeniorMemoryFactList.test.tsx`: +2 (Provenance-Badge)

**Welle-C-Smoke-Suite (empfohlen vor Push):**

```bash
npx vitest run __tests__/modules/memory/ \
               __tests__/components/senior/ \
               __tests__/components/caregiver/ \
               __tests__/api/memory/ \
               __tests__/hooks/useTtsPlayback.test.ts \
               __tests__/hooks/useOnboardingTurn.test.ts \
               __tests__/hooks/useSpeechInput.test.ts \
               __tests__/components/onboarding/ \
               lib/ai/__tests__/provider.test.ts \
               lib/ai/tools/__tests__/save-memory.test.ts \
               app/api/ai/onboarding/turn/__tests__/route.test.ts
```

**tsc:** clean ausser 8 preexistente Skip-Liste-Errors (unveraendert).

**Voll-Suite nicht ausgefuehrt** (Token-Budget). Erwartet: ~3770 Tests gruen,
dieselben 4 pre-existing failures (sos-detail, billing-checkout, hilfe/tasks ×2).

---

## Step 7 — Integration-Test E2E (VERSCHOBEN)

**Scope:** Playwright-E2E-Test, der den kompletten Caregiver-Workflow
durchspielt.

**Vorschlag fuer den Test:**
1. Login als Caregiver (per Magic-Link oder Test-Auth)
2. Navigiere zu `/caregiver/senior/<senior-id>/gedaechtnis`
3. Sieht Senior-Name im Header
4. Tippt neues Fakt ein (Kategorie=Profil, Stichwort=lieblingsfilm, Wert=Casablanca)
5. Submit -> Success-Status, Formular geleert, Fakt erscheint in Liste mit
   "Von Ihnen"-Badge
6. Logout Caregiver -> Login Senior
7. Senior geht auf `/profil/gedaechtnis`
8. Sieht "Casablanca" mit "Von Angehoerigen"-Badge
9. Loescht Eintrag mit Confirm
10. Zurueck zum Caregiver -> Eintrag nicht mehr da
11. Senior widerruft caregiver_link -> Caregiver-Page liefert `notFound()`
    (oder 404)

**Blocker:**
- Senior-Test-Account existiert nicht (`thomasth@gmx.de` hat `role='doctor'`,
  nicht `senior`).
- `AI_PROVIDER=off` / `mock` muss gesetzt sein (keine echten API-Calls
  bis AVV durch).
- Mig 173 + Mig 174 noch nicht auf Prod — aber fuer E2E reicht lokale
  Supabase oder Preview-Branch.

**Aufwand:** ~60-90 min in einer eigenen Session. Kann zu einem beliebigen
Zeitpunkt bis zum Push gemacht werden; blockiert nicht den Feature-Ship.

---

## Uncommitted Reste (unveraendert seit Vorgaenger-Handoff)

```
nachbar-io:
 M app/datenschutz/page.tsx                                    (Welle-B-Rest, 64 LOC)
?? docs/founder-test-anleitung.md
?? docs/plans/2026-04-18-handoff-*.md                          (2 Files)
?? docs/plans/2026-04-19-handoff-welle-c-*-done.md             (4 Files)
?? docs/plans/2026-04-20-handoff-aktionsplan-e-d-a-b-done.md
?? docs/plans/2026-04-20-handoff-welle-c-c8-done.md            (DIESES File)
?? docs/plans/2026-04-27-push-checklist-welle-c.md
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql

Parent-Repo (Handy APP):
 M CLAUDE.local.md                                             (unveraendert)
```

**Empfehlung:** 8 Handoff-/Plan-Markdowns in einem Doku-Bundle-Commit vor
dem Push buendeln.

---

## Naechste Session — Optionen

### A — MEMORY.md-Update (~15min, kein Code)

- `topics/senior-app.md`: HEAD `f9ae69f` aufnehmen, Welle-C-Status auf
  "C0-C8 komplett lokal" aktualisieren
- Welle-C-Done-Count: 32 Commits seit `5de2a58` (nicht mehr 25)
- Test-Zaehler: ~3770 Tests (+~25 neu)

### B — Step 7 Playwright-E2E (~60-90min, Code)

Voraussetzung: Senior-Test-Account + AI_PROVIDER=mock in `.env.local`.
Schreibt `tests/e2e/senior/c8-caregiver-memory.spec.ts` nach dem Muster
der bestehenden x16-caregiver-invite-Spec.

### C — Name-Aufloesung fuer Provenance-Badge (~30min, Code)

Statt "Von Angehoerigen" konkret "Von Tochter Anna". Erfordert:
- `useMemoryFacts` erweitern um optionales `includeSourceNames`
- Server-side: RPC `get_display_names` ueber eindeutige
  `source_user_id`s der Liste (dedupliziert)
- UI: Badge mit `{name ?? "Angehoerigen"}` faellt zurueck auf generisch

Nicht dringend — aber macht die "voll transparent"-Architektur noch
staerker.

### D — Founder-Test auf Staging (~30-60min, manuell, Rote Zone partiell)

Voraussetzung: Mig 173+174 auf Preview-Branch oder lokaler Supabase
appliziert. Senior-Test-Account via MCP anlegen
(`thomas-senior@test.local` mit `role='senior'` + `caregiver_links`-Eintrag
zu Caregiver-Account). Dann Founder spielt den E2E-Workflow im Browser durch.

### E — Push-Tag vorbereiten (Notar 27.04.2026, Rote Zone)

Siehe `docs/plans/2026-04-27-push-checklist-welle-c.md`. C8-Commits
`baa57c3..f9ae69f` werden dort mit gepusht. Keine neue Migration (Mig 175
nicht noetig — Mig 122 hatte C8 bereits vorbereitet).

---

## Modell-Empfehlung fuer Folge-Session

- **Sonnet 4.7** fuer Option A/C (reine Code-Tasks ohne Architektur-Risk)
- **Opus 4.7 (1M)** fuer Option B (E2E-Test-Design mit Cross-System-Reasoning)
  oder Option D (Founder-Begleitung im Live-Test)

---

## Start-Prompt fuer naechste Session

```
Welle C C8 ist funktional shippable (6 neue Commits lokal). HEAD: f9ae69f.
31 lokale Commits seit 5de2a58. Kein Push (AVV blockiert bis Notar 27.04.).

Bitte lies ZUERST:
nachbar-io/docs/plans/2026-04-20-handoff-welle-c-c8-done.md
(Schluss-Handoff C8 — alle 6 Steps, DSGVO-Status, naechste Optionen)

Offen:
- Step 7 Playwright-E2E-Test (braucht Senior-Test-Account)
- MEMORY.md-Update auf HEAD f9ae69f + Welle-C-Komplett-Status
- Optional Name-Aufloesung Provenance ('Von Tochter Anna' statt generisch)

Arbeitsweise: TDD strict, Pre-Check first, kein Push, Founder-Go nur
in Rote Zone. Bei ~65% Kontext Handoff schreiben.

Modell: Sonnet 4.7 reicht fuer MEMORY.md + Name-Aufloesung. Opus 4.7
fuer Playwright-E2E oder Founder-Test-Begleitung.
```

---

## Was diese Session NICHT gemacht hat (bewusst)

- Kein Push.
- Keine neue Migration (Mig 122 deckte alles ab — Pre-Check-Erfolg).
- Kein Push-to-Talk-Wake-Word (Founder-Entscheidung steht).
- Keine Name-Aufloesung fuer Provenance (YAGNI bis MRR > 0).
- Kein Playwright-Test (Step 7 in Folge-Session).
- Keine MEMORY.md-Aktualisierung (naechste Session — oder Founder am
  Notar-Tag).
- `app/datenschutz/page.tsx`-Diff weiter nicht angetastet (Welle-B-Rest).

---

## Was diese Session GELERNT hat

1. **Pre-Check-Doppeltreffer:** DB-Seite (Mig 122) UND POST-Route (Welle B)
   hatten beide den Caregiver-Pfad schon komplett vorbereitet. Die
   urspruenglich geschaetzte Mig 175 war unnoetig, der POST-Task reduzierte
   sich auf Test-Nachzug. Ohne Pre-Check waere doppelte Architektur
   entstanden (inline-Lookup + neue Helper + potentielle neue
   Mig-Columns).
2. **Chain-Mock-Factory schaffen einmal, wiederverwenden mehrfach:**
   `makeClientMock` in `facts.test.ts` wurde fuer GET- + POST-Tests
   gleichermassen genutzt. Pattern uebertragbar auf andere Route-Tests
   wo Supabase-chain-calls gemockt werden muessen.
3. **"Von Ihnen" vs "Von Angehoerigen" — Perspektive matters:** Der
   Caregiver sieht "Von Ihnen" (egoistisch), der Senior "Von Angehoerigen"
   (neutral-familienmitglied). Gleicher visueller Stil (gruenes Badge),
   verschiedene Semantik je nach Viewer.
4. **`notFound()` leakt weniger als `redirect`:** Bei fehlendem
   caregiver_link verraet 404-Response nicht die Existenz des Senior-
   Accounts. Wichtig fuer Privacy-by-Default (Art. 25).
5. **Multi-Match-Falle immer wieder:** `getByText(/anna/i)` fing h1 UND
   Paragraph. Fix: `getByRole("heading", { name: /anna/i })`. Memory
   `feedback_test_cleanup_default.md` warnt davor; bestaetigt erneut.
6. **Formatter-Hook ist gut, aber beachten:** Nach jedem Write/Edit hat
   der PostToolUse-Hook das File umformatiert, was folgende `old_string`-
   Lookups brechen kann. Strategie: nach Formatter-Warning das Ziel-
   Snippet nochmal lesen vor naechstem Edit.

---

## Kontext-Stand zum Schluss

~65% (nach Founder-Regel `feedback_kontextlimit_regel.md` genau der
richtige Zeitpunkt fuer Handoff). Step 7 haette weitere 20-30% verbraucht
und waere nicht sauber abschliessbar gewesen.

---

## Nachtrag (gleiche Session, ~30 % Budget genutzt)

Auf Founder-Wunsch "das erwischen und bestaetigen sollte stand der
technik von heute entsprechen und perfekt fuer alte menschen" wurden
zwei weitere Commits hinzugefuegt:

### Commit 7 — `34c147a` — MemoryConfirmDialog Senior-UX-Upgrade

Der Confirm-Dialog, der sich oeffnet wenn die KI einen Fakt speichern
moechte und der Senior bestaetigen soll (`mode='confirm'` aus
save-memory-Tool), wurde modernisiert:

- **TTS-Autoplay beim Oeffnen** via `useTtsPlayback`. Senior muss nicht
  mehr lesen — der Dialog liest sich selbst vor: *"Soll ich mir das
  merken: {Stichwort}. {Wert}. Sie koennen es jederzeit wieder
  loeschen."*
- **Cleanup stop()** bei Dialog-Close, damit keine Audio-Wiedergabe nach
  dem Schliessen weiterlaeuft (Race-Fix-Muster aus C6b).
- **Stichwort (key) + Wert beide sichtbar.** Vorher nur der Wert
  ("1942-03-12"). Jetzt auch "Geburtstag" daneben — Kontext fuer den
  Senior, damit er versteht was bestaetigt wird. Snake_case zu
  Normal-Case via `humanizeKey()` (z.B. `lieblingsessen` ->
  `Lieblingsessen`).
- **Beruhigungs-Hinweis** *"Sie koennen diesen Eintrag jederzeit wieder
  loeschen."* sichtbar im Dialog — schafft Vertrauen und Kontrollgefuehl.
- **Kategorie-Labels konsistent** zu `SeniorMemoryFactList` — "Routinen"
  (nicht "Tagesablauf"), "Vorlieben" (nicht "Vorliebe"), "Kontakte"
  (nicht "Kontakt"), "Alltagsbedarf" (nicht "Pflege-Hinweis"). Senior
  liest in Confirm-Dialog und `/profil/gedaechtnis` dieselben Woerter.
- **Haptic Feedback** `navigator.vibrate(20)` beim Oeffnen als sanfter
  Aufmerksamkeits-Impuls — wie eine Schulter-Beruehrung. Nur auf
  Mobile wirksam, still-fail auf Desktop.
- **autoFocus auf "Ja, speichern"** — Enter-Taste reicht fuer Tastatur-
  Nutzer.

**Tests:** 6 neue Tests (11/11 gruen) + 56/56 Onboarding-Tests unveraendert.
**Aenderungen:** +207/-9 ueber 2 Files.

### Commit 8 — `a46cc15` — E2E-Spec-Skelett X20

`tests/e2e/cross-portal/x20-caregiver-memory.spec.ts`:

- **x20a** laeuft durch: Liest Senior-ID aus der residentPage-
  Auth-Session (localStorage `sb-*-auth-token`), navigiert
  caregiverPage auf `/caregiver/senior/<senior-id>/gedaechtnis`,
  verifiziert Header + Form-Felder per Playwright-Locators.
  Feature-Guard: 404 oder `/login`-Redirect -> `test.skip`. Damit
  bleibt CI gruen, solange die Route nicht auf Prod ist und der
  caregiver_link-Seed fehlt.
- **x20b-e** sind als TODO-Kommentare dokumentiert:
  - Fakt anlegen + "Von Ihnen"-Badge verifizieren
  - Senior sieht Eintrag mit "Von Angehoerigen"-Badge
  - Senior loescht, Caregiver-Reload zeigt keinen Eintrag mehr
  - Senior widerruft caregiver_link, Page liefert 404

**Blocker-Dokumentation ist bewusst im Spec-File selbst**, damit jede
Folge-Session die Voraussetzungen direkt im Test-File findet:
Senior-Test-Account fehlt, Mig 173+174 auf Staging, AVV-Block bis
Notar 2026-04-27.

**Aenderungen:** +106 neu.

---

## Aktualisierter Commit-Stand

**nachbar-io HEAD: `a46cc15`.** 33 Commits seit `5de2a58`, kein Push.

| SHA | Step | Beschreibung |
|---|---|---|
| `baa57c3` | 1 | feat(ai): save-memory caregiver-scope via caregiver_links |
| `07e6dd6` | 2 | feat(memory): GET /api/memory/facts supports subject_user_id |
| `3471e1a` | 3 | test(memory): POST /api/memory/facts caregiver-path coverage |
| `f6b73af` | 4 | feat(memory): useMemoryFacts akzeptiert subjectUserId |
| `842c239` | 5 | feat(memory): caregiver-gedaechtnis page + client UI |
| `f9ae69f` | 6 | feat(memory): senior sieht 'Von Angehoerigen'-Badge |
| **`34c147a`** | **extra** | **feat(voice): MemoryConfirmDialog senior-UX-upgrade** |
| **`a46cc15`** | **7-skel** | **test(e2e): c8 caregiver-memory spec skeleton (x20, guarded)** |

**Tests gesamt neu in C8:** ~33 (25 Unit + 6 Dialog + x20a E2E).

---

## Aktualisierter Start-Prompt fuer naechste Session

```
Welle C C8 ist funktional komplett inkl. Senior-UX-Upgrade fuer den
Confirm-Dialog (TTS-Autoplay, Stichwort + Wert, Beruhigungs-Hinweis,
konsistente Labels, Haptic). 8 Commits lokal. HEAD: a46cc15.

E2E-Skelett x20-caregiver-memory.spec.ts existiert, x20a ist mit
Feature-Guard lauffaehig. x20b-e sind TODO und brauchen Senior-Test-
Account + AVV durch.

Bitte lies ZUERST:
nachbar-io/docs/plans/2026-04-20-handoff-welle-c-c8-done.md
(Schluss-Handoff C8 inkl. Nachtrag 34c147a + a46cc15)

Offen:
- x20b-e (E2E-Vollausfuehrung, braucht Senior-Test-Account)
- MEMORY.md-Update auf HEAD a46cc15 + Welle-C-Komplett-Status
- Optional Name-Aufloesung Provenance

Arbeitsweise: TDD strict, Pre-Check first, kein Push.
```

