# Quartiergemeinschaft Nutzung und Leise Empfehlungen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QuartierApp soll sich zuerst wie eine echte Quartiergemeinschaft aller Generationen anfuehlen; Nachbarn-hinzufuegen und App-empfehlen bleiben wichtige, aber leise Wachstumsmechanismen.

**Architecture:** Keine neue Growth-Engine und keine neue Datenbanklogik in dieser Welle. Die erste Umsetzung ist eine sichere lokale IA-/Copy-/UI-Umordnung in bestehenden Oberflaechen: Dashboard-Entdecken, Kontakte/Mein Kreis, Einladungen und lokale Preview. Empfehlungen erscheinen kontextuell nach Nutzenmomenten, nicht als dominanter Haupt-CTA.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, lucide-react, Vitest, bestehende Supabase-/Invite-Tabellen nur ueber vorhandene Services.

---

## Fuer Claude

Thomas hat die lokale Vorschau unter `http://127.0.0.1:3012/menu-structure-preview` freigegeben. Seine Korrektur war wichtig:

- Nicht "Nachbar hinzufuegen" als wichtigste Funktion aufblasen.
- Wichtigster Produktkern ist die Quartiergemeinschaft aller Generationen.
- Nachbarn hinzufuegen und App empfehlen sollen nicht vernachlaessigt werden, aber als natuerlicher, leiser Mechanismus wirken.
- Wissenschaftliche Richtung: Nutzer bleiben, wenn sie Nutzen, Einfachheit, Zugehoerigkeit und Vertrauen erleben. Empfehlung folgt nach einem Erfolgsmoment.

Aktuelle lokale Preview-Commits:

- `6fcafed feat(ui): emphasize community growth in menu preview`
- `006ecce feat(ui): balance community invite prominence`

Rote Gates bleiben unveraendert:

- Kein Push ohne Founder-Go.
- Keine Prod-DB, keine Migration, kein Deploy ohne Founder-Go.
- Keine neuen laufenden Kosten.
- Keine Referral-Rewards, Geldvorteile, Gewinnspiele oder manipulative Gamification ohne separate Compliance-Entscheidung.

## Evidenzbasis

Diese Quellen sind fuer die Produktlogik relevant, nicht als akademischer Selbstzweck:

- Technology Acceptance Model: Nutzung steigt mit wahrgenommener Nuetzlichkeit und Einfachheit. Quelle: https://aisel.aisnet.org/misq/vol13/iss3/6/
- UTAUT: Erwarteter Nutzen, Bedienaufwand, sozialer Einfluss und unterstuetzende Bedingungen treiben Akzeptanz. Quelle: https://doi.org/10.2307/30036540
- Self-Determination Theory: Motivation haelt, wenn Autonomie, Kompetenz und Verbundenheit entstehen. Quelle: https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf
- App-Engagement-Reviews: Personalisierung, relevante Trigger, soziale Unterstuetzung und einfache Routinen wirken besser als generische Pushs. Quellen: https://pmc.ncbi.nlm.nih.gov/articles/PMC9231655/ und https://pmc.ncbi.nlm.nih.gov/articles/PMC8510293/
- Growth-Loops: Produktnutzen soll den naechsten Nutzer erzeugen; Invite-Prompts funktionieren am besten als Teil eines echten Nutzenmoments. Quelle: https://www.reforge.com/blog/growth-loops

Produktuebersetzung fuer QuartierApp:

1. Erst lokaler Nutzen: "Was passiert heute in meinem Quartier?"
2. Dann Zugehoerigkeit: "Welche Menschen/Gruppen/Hilfewege gibt es?"
3. Dann leise Einladung: "Wen aus meiner Strasse sollte ich dazuholen?"
4. Nie als Hauptwerbung: keine Promo-Code-Sprache, keine aggressive Empfehlungsmechanik.

## File Structure

Voraussichtliche Schreib-Scope fuer eine sichere lokale Umsetzung:

- Modify: `components/dashboard/DiscoverGrid.tsx`
  - Kategorie `Nachbarschaft` zu `Gemeinschaft` umbenennen.
  - Gemeinschaft als Menschen-/Quartierleben-Bereich framen.
  - Kein dominanter Invite-Tile in der ersten Reihe.
- Modify: `components/dashboard/__tests__/DiscoverGrid.test.tsx`
  - Tests fuer neue Headline/Kategorie und unveraenderte Tile-Sichtbarkeit anpassen.
- Modify: `app/(app)/dashboard/page.tsx`
  - Wenn ueberhaupt, nur Copy in Richtung "Quartiergemeinschaft" schaerfen.
  - Keine neue Datenabfrage.
- Modify: `app/(app)/kontakte/page.tsx`
  - Kontakte als "Mein Kreis / Menschen im Quartier" deutlicher machen.
  - Bestehenden `Nachbar hinzufuegen`-Pfad als sekundaren CTA behalten.
- Modify: `app/(app)/kontakte/neu/page.tsx`
  - Copy weniger technisch, mehr "bekannte Person einladen".
- Modify: `app/(app)/invitations/page.tsx`
  - Empfehlungsseite persoenlicher formulieren: "QuartierApp zeigen" statt Wachstums-/Promo-Sprache.
- Modify: `app/menu-structure-preview/MenuStructurePreviewClient.tsx`
  - Nach echter UI-Anpassung synchron halten.
- Optional Modify: `components/nav/NavConfig.ts`
  - Nur wenn Thomas explizit Go gibt, Aktiv-Nav spaeter von `Gesundheit` auf `Hilfe` drehen. Nicht in erster Welle erzwingen.

Nicht anfassen in dieser Welle:

- Supabase-Migrationen
- RLS/Policies
- Prod-DB
- Billing/Stripe
- Push/Deploy
- Neue Referral-Reward-Tabellen

## Task 1: Dashboard-Entdecken auf Gemeinschaft rahmen

**Files:**
- Modify: `components/dashboard/__tests__/DiscoverGrid.test.tsx`
- Modify: `components/dashboard/DiscoverGrid.tsx`

- [ ] **Step 1: Test fuer Kategorie-Copy aktualisieren**

In `components/dashboard/__tests__/DiscoverGrid.test.tsx` die Tests, die bisher "Nachbarschaft" erwarten, auf "Gemeinschaft" umstellen. Der Test soll weiterhin sicherstellen, dass die bestehenden Kacheln sichtbar bleiben.

Konkrete Erwartung:

```ts
expect(container.textContent).toContain("Gemeinschaft");
expect(container.textContent).toContain("Brett");
expect(container.textContent).toContain("Hilfe");
expect(container.textContent).toContain("Marktplatz");
expect(container.textContent).toContain("Gruppen");
expect(container.textContent).toContain("Veranstaltungen");
```

- [ ] **Step 2: Rotlauf pruefen**

Run:

```bash
npx vitest run components/dashboard/__tests__/DiscoverGrid.test.tsx
```

Expected: FAIL, solange `DiscoverGrid.tsx` noch "Nachbarschaft" rendert.

- [ ] **Step 3: Implementierung minimal halten**

In `components/dashboard/DiscoverGrid.tsx` nur Copy/Label aendern:

```ts
const CATEGORY_LABELS: Record<TileCategory, string> = {
  nachbarschaft: "Gemeinschaft",
  hilfe_pflege: "Hilfe & Pflege",
  quartier_info: "Quartier-Info",
  mehr: "Mehr Funktionen",
};
```

Die interne Kategorie-ID `nachbarschaft` bleibt erhalten, damit Feature-Flags, Tests und Datenstruktur stabil bleiben.

- [ ] **Step 4: Gruenlauf pruefen**

Run:

```bash
npx vitest run components/dashboard/__tests__/DiscoverGrid.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/DiscoverGrid.tsx components/dashboard/__tests__/DiscoverGrid.test.tsx
git commit -m "feat(ui): frame discover section as community"
```

## Task 2: Kontakte als Gemeinschaftsanker schaerfen

**Files:**
- Modify: `app/(app)/kontakte/page.tsx`
- Modify: `app/(app)/kontakte/neu/page.tsx`
- Add/Modify tests only if existing page tests are present after pre-check.

- [ ] **Step 1: Pre-Check**

Run:

```bash
rg -n "kontakte|Mein Kreis|Nachbar hinzufuegen|Nachbar hinzufügen|Kontaktanfrage" app __tests__ components modules
```

Expected: Existing routes `/kontakte` and `/kontakte/neu` are found. Do not create new routes.

- [ ] **Step 2: Copy-Ziel festlegen**

Use these exact UX rules:

- Page headline should communicate "Menschen im Quartier" or "Mein Kreis".
- `Nachbar hinzufuegen` remains visible but not more visually dominant than page title/content.
- Avoid "Empfehlen Sie die App" as primary copy on contacts.
- Keep Siezen and calm tone.

- [ ] **Step 3: Implementieren**

In `app/(app)/kontakte/page.tsx`, keep the existing link to `/kontakte/neu`, but adjust surrounding copy toward:

```tsx
<h1>Menschen im Quartier</h1>
<p>Hier sehen Sie vertraute Kontakte, Familie und Nachbarn, mit denen Sie sich im Quartier verbinden.</p>
```

If the file already uses another heading component, preserve that component and only replace text.

In `app/(app)/kontakte/neu/page.tsx`, make the flow feel personal:

```tsx
<h1>Nachbar hinzufuegen</h1>
<p>Laden Sie eine Person ein, die Sie aus Ihrem Haus, Ihrer Strasse oder Ihrem Quartier kennen.</p>
```

- [ ] **Step 4: Verify**

Run:

```bash
npx tsc --noEmit
npx eslint 'app/(app)/kontakte/page.tsx' 'app/(app)/kontakte/neu/page.tsx'
```

Expected: both commands pass.

- [ ] **Step 5: Browser-Sichtprobe**

Open locally:

```text
http://127.0.0.1:3012/kontakte
http://127.0.0.1:3012/kontakte/neu
```

Expected: The CTA is present, but the page reads as community/trust first.

- [ ] **Step 6: Commit**

```bash
git add 'app/(app)/kontakte/page.tsx' 'app/(app)/kontakte/neu/page.tsx'
git commit -m "feat(ui): make contacts feel like quartier community"
```

## Task 3: Einladungen persoenlich statt promotional formulieren

**Files:**
- Modify: `app/(app)/invitations/page.tsx`
- Modify: `__tests__/lib/invitations.test.ts` only if copy assertions exist there.

- [ ] **Step 1: Pre-Check**

Run:

```bash
rg -n "Promo|Code|Einladung|einladen|empfehlen|neighbor_invitations" app/\(app\)/invitations __tests__ lib
```

Expected: Existing invitations page and invitation tests are found. Do not create a new invitation service.

- [ ] **Step 2: Copy-Regeln anwenden**

Use these exact language rules:

- Prefer "QuartierApp zeigen" or "persoenlich einladen".
- Avoid "Referral", "Promo-Code", "Belohnung", "Bonus" for adults/seniors.
- For youth, any friend invite must stay behind existing guardian/consent flows.

- [ ] **Step 3: Implementieren**

In `app/(app)/invitations/page.tsx`, adjust visible page copy so the intent reads:

```tsx
<h1>QuartierApp persoenlich zeigen</h1>
<p>Laden Sie Menschen ein, die wirklich zu Ihrem Quartier gehoeren. Eine persoenliche Einladung wirkt besser als Werbung.</p>
```

Preserve existing data loading, invite limits, status lists and Supabase calls.

- [ ] **Step 4: Verify**

Run:

```bash
npx tsc --noEmit
npx eslint 'app/(app)/invitations/page.tsx'
npx vitest run __tests__/lib/invitations.test.ts
```

Expected: all pass. If `__tests__/lib/invitations.test.ts` does not touch UI copy, it should remain green.

- [ ] **Step 5: Commit**

```bash
git add 'app/(app)/invitations/page.tsx' __tests__/lib/invitations.test.ts
git commit -m "feat(ui): make invitations personal and quiet"
```

## Task 4: Dashboard nicht mit Invite-CTA ueberfrachten

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Test: existing dashboard tests if they assert text; otherwise rely on `tsc`, `eslint`, build and browser.

- [ ] **Step 1: Pre-Check**

Run:

```bash
rg -n "Heute|Quick|Nachrichten|Neuigkeiten|city-services|DiscoverGrid|invitations|kontakte" 'app/(app)/dashboard/page.tsx' components __tests__
```

Expected: Dashboard already has "Heute" links, notification bell, map thumbnail and `DiscoverGrid`.

- [ ] **Step 2: Decide no new top-level Invite button**

Do not add a dashboard hero button for "App empfehlen". The dashboard should communicate usefulness first:

- Today/local info
- Map/neighborhood status
- Discover/community section
- Existing notification bell

- [ ] **Step 3: Optional copy-only change**

If copy around DiscoverGrid or Today section needs sharpening, use calm language such as:

```tsx
"Was heute in Ihrem Quartier wichtig ist."
"Gemeinschaft, Hilfe und lokale Informationen an einem Ort."
```

Do not add new state, new data fetches, new DB writes, or new notification logic.

- [ ] **Step 4: Verify**

Run:

```bash
npx tsc --noEmit
npx eslint 'app/(app)/dashboard/page.tsx'
npm run build
```

Expected: all pass.

- [ ] **Step 5: Browser-Sichtprobe**

Open:

```text
http://127.0.0.1:3012/dashboard
```

Expected: Page feels like useful Quartier overview, not a referral landing page.

- [ ] **Step 6: Commit**

```bash
git add 'app/(app)/dashboard/page.tsx'
git commit -m "feat(ui): keep dashboard focused on quartier usefulness"
```

## Task 5: Preview und Handoff synchron halten

**Files:**
- Modify: `app/menu-structure-preview/MenuStructurePreviewClient.tsx`
- Modify: `docs/plans/handoff/2026-05-15-codex-an-claude-quartiergemeinschaft-nutzung-growth-plan.md` only if execution discovers a better final wording.

- [ ] **Step 1: Compare real UI with preview**

Open:

```text
http://127.0.0.1:3012/menu-structure-preview
```

Expected: Preview still matches the implemented direction:

- Quartiergemeinschaft first
- Nachbar hinzufuegen secondary
- App empfehlen secondary
- No aggressive growth language

- [ ] **Step 2: Adjust preview copy if real implementation changed wording**

Keep the accepted principle:

```text
Leise Wachstumslogik der Quartiergemeinschaft
```

Do not re-promote "Nachbar hinzufuegen" into the first row unless Thomas explicitly asks.

- [ ] **Step 3: Verify**

Run:

```bash
npx tsc --noEmit
npx eslint app/menu-structure-preview/MenuStructurePreviewClient.tsx
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add app/menu-structure-preview/MenuStructurePreviewClient.tsx docs/plans/handoff/2026-05-15-codex-an-claude-quartiergemeinschaft-nutzung-growth-plan.md
git commit -m "docs(ui): sync community growth handoff"
```

## Task 6: Final verification bundle

**Files:**
- No new files unless a test had to be updated.

- [ ] **Step 1: Run focused tests**

```bash
npx vitest run components/dashboard/__tests__/DiscoverGrid.test.tsx __tests__/lib/invitations.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full safe checks**

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: PASS; `git diff --check` may only show CRLF warnings if Windows normalizes line endings.

- [ ] **Step 3: Browser QA**

Check these pages locally:

```text
http://127.0.0.1:3012/menu-structure-preview
http://127.0.0.1:3012/dashboard
http://127.0.0.1:3012/kontakte
http://127.0.0.1:3012/kontakte/neu
http://127.0.0.1:3012/invitations
```

Expected:

- Gemeinschaft is prominent.
- Invite/recommend is findable but not loud.
- No mobile text clipping.
- No console errors.
- Touch targets remain comfortable.

- [ ] **Step 4: Stop at gates**

Do not push, deploy, migrate or touch Prod DB. Report exact commit hashes and remaining questions to Thomas.

## Rueckfragen fuer Thomas, falls Claude unsicher wird

1. Soll `Aktiv` Bottom-Nav spaeter wirklich `Start / Quartier / Hilfe / Ich` werden, oder bleibt `Gesundheit` dort vorerst?
2. Soll `Gemeinschaft` eine eigene Hub-Seite werden, oder reicht zuerst die Umbenennung von `Nachbarschaft` plus Kontakte/Einladungen?
3. Duerfen Jugendliche Freunde aktiv einladen, oder nur ueber bestehende Eltern-/Guardian-Freigabe-Flows?
4. Soll es Anerkennung fuer Empfehlungen geben? Empfehlung: vorerst nur weiche Anerkennung, keine Punkte/Geld/Rewards.

## Definition of Done

- Thomas sieht in der echten App, nicht nur in der Preview: Quartiergemeinschaft ist der emotionale Startpunkt.
- Nutzer koennen Nachbarn/Kontakte finden und hinzufuegen, ohne dass die App nach Referral-Marketing aussieht.
- App-Empfehlung ist auffindbar und persoenlich formuliert.
- Wissenschaftliche Leitlinie ist dokumentiert und im Handoff nachvollziehbar.
- Alle lokalen Checks sind gruen.
- Kein Push/Deploy/Prod-DB/Migration ohne Founder-Go.
