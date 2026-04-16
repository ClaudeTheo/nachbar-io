# Codex Phase B Prompt — Welle 1 Externe APIs

> **Zweck:** In Codex CLI (`codex`, GPT-5.4 xhigh reasoning) einfuegen und
> ausfuehren. Claude hat Phase A abgeschlossen, die DB-Schicht liegt auf
> Supabase, der Plan ist geschrieben. Codex faehrt die komplette Code-Schicht
> der Welle 1 runter.
>
> **Kein Umstricken der Architektur.** Kein Rewrite bestehender Module.
> Der Scope ist gesetzt, die Kollisionspunkte sind unten benannt.

---

## Startsatz (ab hier in Codex einfuegen)

Du arbeitest in `C:/Users/thoma/Documents/New project/nachbar-io` auf
`master`. HEAD ist `84d1f5b` (`docs(plans): Welle 1 integration plan`),
lokal **7 Commits vor origin/master**, **nichts gepusht, nichts deployed**.

Du bist **Codex GPT-5.4 xhigh** und fuehrst **Phase B** aus:
Tasks **4, 5, 6, 7, 8, 9, 10, 11, 13, 14** aus dem Plan-Dokument.
Tasks 1-3 (DB + Plan) sind von Claude erledigt. Tasks 12, 15, 16 bleiben
fuer Claude, Task 17 fuer den Menschen. **Nicht anfassen.**

### Pflicht-Lektuere vor erstem Code

1. `docs/plans/2026-04-17-nina-dwd-integration.md` (1005 Zeilen, massgeblich)
2. `docs/plans/2026-04-16-external-apis-research-handoff.md` (Recherche-Grundlage,
   Rechtsrisiko-Matrix, API-Endpunkte)
3. `CLAUDE.md` — insbesondere die „Kritische Regeln"-Sektion zu Cron-Auth,
   Admin-Client, API-Response-Format und Notfall-Banner-Farben
4. `supabase/migrations/157_external_api_flags.sql` (Feature-Flag-Seeds)
5. `supabase/migrations/158_external_warning_cache.sql` (Ziel-Schema fuer
   die Parser)

### DB-Stand (bereits auf Cloud-Supabase angewendet + verifiziert)

- Projekt: `uylszchlyhbpbmslcnka`, Postgres 17.6.1
- `quarters` hat neue Spalten `bbk_ars`, `bw_ars`. Bad Saeckingen geseedet
  mit `'08337007'` (beide).
- `external_warning_cache` + `external_warning_sync_log` existieren mit
  voller RLS. `UNIQUE NULLS NOT DISTINCT (provider, external_id, external_version)`.
  `attribution_text` ist **NOT NULL** — jeder Upsert ohne Attribution
  schlaegt am DB-Constraint fehl.
- 10 Feature-Flags existieren, **alle `enabled=false`**, alle
  `admin_override=true`. Nicht waehrend Phase B scharfschalten; das macht
  der Founder manuell ueber die Admin-UI nach Phase D.

Typen-Generierung nach jeder Schema-Anpassung — aber die ist hier schon
passiert, also einmal am Anfang:

```bash
npm run db:types
```

Falls das fehlschlaegt (Supabase-CLI-Login), nicht blockieren — die
`Database`-Typen in `lib/supabase/database.types.ts` sind fuer Parser
nicht zwingend, `raw_payload` kann als `JSONB` / `unknown` typisiert werden.

---

## Scope: Phase B

Strikte Reihenfolge, ein Commit pro Task, `npx tsc --noEmit` + `npm run test`
nach jedem Commit gruen.

| # | Task | Reasoning | Kernartefakte |
|---|------|-----------|---------------|
| 4  | NINA Client + Types           | xhigh   | `lib/integrations/nina/{client.ts,types.ts}` + Vitest |
| 5  | NINA CAP-Parser               | xhigh   | `lib/integrations/nina/parser.ts` + Vitest |
| 6  | DWD Client + Parser           | xhigh   | `lib/integrations/dwd/{client,parser,types}.ts` + Vitest |
| 7  | LGL-BW Hausumringe Layer      | xhigh   | `components/map/lgl-bw-outlines-layer.tsx` + Integration in bestehenden Map-Inner |
| 8  | /api/warnings/{nina,dwd,uba}  | high    | Routen + `lib/integrations/__shared__/list-warnings.ts` |
| 9  | Batch-Cron                    | xhigh   | `app/api/cron/external-warnings/route.ts` + `vercel.json`-Eintrag |
| 10 | Vitest-Audit                  | medium  | alle Parser/Clients gruen, keine echten HTTP-Calls |
| 11 | UBA Client + Route            | high    | `lib/integrations/uba/*` (Client + Parser + Tests) |
| 13 | `<ExternalWarningBanner />`   | high    | `components/warnings/{external-warning-banner,attribution-footer}.tsx` + Tests |
| 14 | Admin-UI Gruppierung          | xhigh   | `app/(app)/admin/components/FeatureFlagManager.tsx` erweitern |

Konkrete Code-Skelette, Endpunkt-URLs, Severity-Mappings und Attribution-Texte
stehen im Plan-Dokument unter „Task 4" bis „Task 14" und sind dort **autoritativ**.

---

## Wichtige Repo-Fakten (Claude hat diese beim Verify-Pass festgestellt)

### 1. `fast-xml-parser` ist NICHT installiert

```bash
npm ls fast-xml-parser || npm i fast-xml-parser
```

Erst danach Task 6 (DWD CAP-XML-Parser) starten.

### 2. ACHTUNG Kollision: `/api/cron/nina-sync` existiert bereits

- Datei: `app/api/cron/nina-sync/route.ts`
- Service: `modules/info-hub/services/nina-sync.service.ts`
- Tabellen: `info_hub_*` aus Migration 118
- Vercel-Cron: taeglich 7 Uhr (`0 7 * * *`)
- **Das ist ein paralleles Info-Hub-NINA-System, NICHT Teil der Welle 1.**

**Was das fuer Codex bedeutet:**

- Den bestehenden `/api/cron/nina-sync` **nicht anfassen**, nicht umbauen,
  nicht ersetzen.
- Den bestehenden Service **nicht importieren** — neuer Code geht unter
  `lib/integrations/nina/`, nicht in `modules/info-hub/`.
- Neuer Cron heisst `/api/cron/external-warnings`. Beide laufen parallel,
  bis ein spaeterer Folge-Task beide Pfade konsolidiert.
- Keine neue Migration, die `info_hub_*`-Spalten oder -Tabellen aendert.

### 3. Map-Integration-Punkt

Die Leaflet-Map-Inner-Komponente liegt unter `components/LeafletMapInner.tsx`
(Top-Level `components/`, **nicht** `components/map/`). `components/map/`
enthaelt nur `MapThumbnail.tsx`.

Fuer Task 7:

- Neue Layer-Komponente unter `components/map/lgl-bw-outlines-layer.tsx`
  (neues Verzeichnis ist ok, dient als Ordner fuer externe Layer).
- Import in `components/LeafletMapInner.tsx` am sinnvollen Punkt neben
  den bestehenden `<TileLayer>`-Bloecken.
- `<WMSTileLayer>` aus `react-leaflet@5.0.0` — **nicht** `<TileLayer>`
  mit `{bbox}`-Platzhaltern (der Plan hat die Begruendung).

### 4. Cron-Auth-Muster — `analytics/route.ts` ist die Referenz

Das 2-stufige Pattern steht in `app/api/cron/analytics/route.ts`:

```ts
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  console.error("[cron/external-warnings] CRON_SECRET nicht konfiguriert");
  return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
}
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
}
```

Der bestehende `nina-sync/route.ts` macht es einzeilig (`!cronSecret ||
authHeader !== ...`). Das ist eine **Repo-Inkonsistenz** — Codex folgt
dem `analytics/route.ts`-Muster, nicht dem kuerzeren.

### 5. Helper, die **existieren** und genutzt werden muessen

- `getAdminSupabase()` — `lib/supabase/admin.ts` (Service-Role, bypasst RLS)
- `isFeatureEnabledServer(supabase, flagKey)` — `lib/feature-flags-server.ts`
  prueft **nur** `enabled`. Reicht fuer Welle 1.
- `getUserQuarterId(supabase, userId)` — `lib/quarters/helpers.ts`
  joint `household_members → households.quarter_id`. **Zwingend** fuer
  die Read-Routen (Task 8), damit keine Cross-Quartier-Warnungen
  durchrutschen.

**Nicht neu implementieren.** Immer importieren.

### 6. Vercel-Cron-Schedule fuer Task 9

`vercel.json` hat aktuell 27 Crons, zuletzt `/api/cron/retention-cleanup`.
Neuer Eintrag ans Ende der `"crons"`-Liste:

```json
{ "path": "/api/cron/external-warnings", "schedule": "*/10 * * * *" }
```

Nur ein Eintrag, nicht pro Provider splitten (Founder-Entscheidung 3).

### 7. `maxDuration = 120`

Vercel Hobby hat 60 s Limit, Pro bis 300. Der Projekt-Plan laeuft auf Pro,
`amtsblatt-sync` nutzt 120 — dem folgt der neue Cron. Wenn bei Deployment
ein Hobby-Plan-Fehler kommt, auf 60 reduzieren und Batch-Chunking einfuehren
(Folge-Task, nicht Welle 1).

---

## Kritische Regeln (nicht verhandelbar)

**Aus CLAUDE.md:**

- Cron IMMER ueber `getAdminSupabase()`, nie `createClient()`. Sonst greifen
  RLS-Policies und Inserts schlagen fehl.
- Notfall-Banner-Rot ist reserviert fuer 112/110. NINA/DWD-Warnungen ab
  `severe`/`extreme` nutzen **Amber `#F59E0B`** + klaren Kontrast.
- Senior-Mode: min. 80 px Touch-Target, min. 4.5:1 Kontrast.
- API-Routen geben **Arrays** zurueck, nicht `{ items: [...] }`.

**Aus dem Plan + dem 9-Bug-Verify-Pass von Claude:**

- `attribution_text` ist **NOT NULL** im Cache. Jeder Upsert ohne
  Attribution bricht. Der Parser muss pro Provider den festen Text setzen
  (Plan Task 5 / Task 16 hat die Wortlaute).
- `UNIQUE NULLS NOT DISTINCT` verhindert Duplikate auch bei
  `external_version=NULL`. Kein Fake-Fallback-Wert („unknown" / „0") in
  `external_version` einfuegen.
- Bad Saeckingen ARS ist der verifizierte 8-stellige AGS `08337007`.
  Nicht auf 12 Stellen padden, nicht neu „konstruieren".
- Kein Admin-UI-Refactor mit Link auf `/nachbar-admin/...` — das Portal
  existiert nicht. Admin-Seiten leben unter `app/(app)/admin/`.
- Read-Routen `/api/warnings/*` **muessen** `getUserQuarterId()` prueffen
  und mit `.eq("quarter_id", quarterId)` filtern.
- `maxDuration = 120` (nicht 300) — Hobby-Begrenzung beachtet.

**Scope-Disziplin:**

- Keine anderen Migrationen anfassen (156, 157, 158 sind abgeschlossen).
- `info_hub_*`-Tabellen / `modules/info-hub/` nicht aendern.
- `.playwright-cli/`, `output/`, `node_modules/` nicht committen.
- **Nichts pushen nach `origin/master`.** Der Founder zieht den Trigger
  nach Phase D.
- Keine Feature-Branches — Solo-Workflow, direkt auf `master` committen.

---

## Commit-Strategie

Jeder Task = ein Commit. Konvention:

```
feat(integrations): NINA client + retry       # Task 4
feat(integrations): NINA cache-row parser     # Task 5
feat(integrations): DWD warnings via WFS      # Task 6
feat(map): LGL-BW Hausumringe WMS layer       # Task 7
feat(api): /api/warnings/{nina,dwd,uba}       # Task 8
feat(cron): batch external-warnings           # Task 9
test(integrations): vitest audit pass         # Task 10
feat(integrations): UBA air-quality client    # Task 11
feat(ui): ExternalWarningBanner + attribution # Task 13
feat(admin): feature-flag group "Externe APIs"# Task 14
```

Tests + `npx tsc --noEmit` nach **jedem** Commit gruen. Bei Bruch:
Commit zurueckhalten, Fix erst, dann commit.

Optional `fast-xml-parser`-Install in Task 6-Commit einbetten
(`package.json` + `package-lock.json` mit committen).

---

## Quality-Gate (nicht abkuerzen)

- `npx tsc --noEmit` sauber.
- `npm run test` alle Suiten gruen (nicht nur `lib/integrations`).
  Wenn bestehende Tests dadurch brechen, ist etwas am neuen Code falsch.
- Keine echten HTTP-Calls in Tests — `vi.fn()` Mock fuer `global.fetch`.
- Fixtures unter `__tests__/fixtures/` ablegen, nicht inline.
- `raw_payload` im Cache ist `JSONB`. Beim Insert als JS-Objekt uebergeben,
  Supabase serialisiert selbst. Nicht `JSON.stringify()`-en.

---

## Exit-Kriterien fuer Phase B

Phase B ist **done**, wenn **alle** zutrifft:

1. 10 Commits auf `master`, einer pro Task 4-11, 13, 14.
2. `npm run test` komplett gruen.
3. `npx tsc --noEmit` sauber.
4. `vercel.json` hat genau einen neuen `/api/cron/external-warnings`-Eintrag
   mit `*/10 * * * *`.
5. `package.json` hat `fast-xml-parser` als dependency.
6. Admin-UI rendert die 10 neuen Flags unter Gruppe „Externe APIs" (visuell
   bestaetigt via `npm run dev` + Admin-Seite).
7. Manueller Smoke gegen DB ist noch **nicht** noetig — das macht Phase C
   und Task 17 (Mensch).
8. **Kein `git push`** gelaufen.

---

## Wenn etwas blockiert

Regel: **3 Versuche, dann stoppen.**

- NINA-Endpunkt gibt 500: Retry-Logik testen, real-fetch einmal manuell
  mit `curl` probieren, wenn weiter tot → Fixture trotzdem ablegen und
  weitermachen, Doku-Hinweis im Test-Kommentar.
- DWD-WFS gibt anderes Schema als erwartet: Fixture fixieren, Parser
  drumherum bauen, danach Note im Commit-Message.
- Vercel-Typ-Fehler bei `maxDuration`: `export const maxDuration: number = 120`
  mit Type-Annotation.
- Bei echtem Blocker (Repo-Verhalten widerspricht Plan): stoppen, ein kurzes
  Memo unter `docs/plans/2026-04-17-codex-blocker-YYYYMMDDHHMM.md` ablegen
  und an Claude zurueckgeben. Nicht raten.

---

## Erwartetes Handoff zurueck an Claude

Nach Phase B muss Claude mit Phase C starten koennen. Was Claude braucht:

- Letzten Commit-Hash (`git rev-parse HEAD`)
- `git log --oneline master origin/master..HEAD` — Liste der neuen Commits
- Kurze Textdatei `docs/plans/2026-04-17-phase-b-handoff.md` mit:
  - Welche Tasks abgeschlossen (4-11, 13, 14 — alle oder Teilmenge?)
  - Welche Tests laufen (Anzahl + letzte Vitest-Ausgabe)
  - Welche Blockers du gesehen hast und wie geloest
  - Welche Feature-Flags du fuer manuelles Test-Scharfschalten empfiehlst
    (vermutlich nur `NINA_WARNINGS_ENABLED` fuer Bad Saeckingen)
  - Welche Teile NICHT fertig sind und warum

Dieses Handoff-Dokument ist **Teil** von Task 10 (audit) und kommt mit dem
entsprechenden Commit.

---

## Was NICHT zu Phase B gehoert (Hands off)

- **Task 12** — DWD-Hitze × Heartbeat-Eskalation (Claude, Phase C).
  Finger weg von `app/api/care/cron/heartbeat-escalation/route.ts` und
  `lib/care/channels/`.
- **Task 15** — Integration-Review (Claude, Phase D).
- **Task 16** — `/datenquellen`-Seite + Rechtstexte (Claude, Phase D).
- **Task 17** — Manuelle Verifikation (Founder, Phase E).
- **Flag-Scharfschaltung** — Founder entscheidet pro Quartier.
- **LGL-BW-Anzeige-Einreichung** — Founder selbst.
- **Neue Migrationen** — keine in Phase B. Das Schema ist fix.
- **origin/master-Push** — Founder only.

---

## Kurzform (wenn obige Startsatz-Region zu lang ist)

> Arbeite in `C:/Users/thoma/Documents/New project/nachbar-io` auf `master`
> (HEAD `84d1f5b`). Lies zuerst `docs/plans/2026-04-17-nina-dwd-integration.md`
> und `docs/plans/2026-04-17-codex-phase-b-prompt.md`. Fuehre **Phase B**
> (Tasks 4-11, 13, 14) streng nach den beiden Dokumenten aus, einen Commit
> pro Task, nichts pushen, `info_hub/nina-sync` nicht anfassen,
> `fast-xml-parser` vor Task 6 installieren, `analytics/route.ts`-
> Cron-Auth-Muster fuer Task 9 verwenden. Nach Phase B: Handoff-Memo
> `docs/plans/2026-04-17-phase-b-handoff.md` an Claude.
