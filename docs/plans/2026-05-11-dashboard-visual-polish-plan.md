# Dashboard Visual-Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Top-Level-Visual-Polish auf `/dashboard` (Iteration 1 "Druckwerk-Ruhe") — Typografie/Spacing/Color-Foundation anheben + Hero/SOS/Tiles/Mikro-Interaktionen visuell auf Niveau bringen, ohne Information-Architecture-Aenderungen.

**Architecture:** Foundation-Tokens in `app/globals.css` + Tailwind v4 `@theme inline` zuerst — damit reichen sich Style-Aenderungen automatisch durch alle Komponenten, die schon Tailwind-Klassen nutzen. Dashboard-spezifische Komponenten werden danach selektiv angefasst (Hero, SOS, DiscoverGrid-Tile, Kategorie-Header, Quick-Access). Mikro-Interaktionen via globale Transition-Rules + Lucide-Stroke-Default. Branch `feature/dashboard-visual-polish`, Browser-MCP-Screenshots zur Verifikation, Merge nach Founder-Final-OK.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui v2, Lucide-Icons, Vitest, Playwright (Browser-MCP fuer Vor/Nach-Verifikation).

**Vorab:**
- Design-Dokument: `docs/plans/2026-05-11-dashboard-visual-polish-design.md` (committed `d45af11`).
- Pre-Check-Regel: `.claude/rules/pre-check.md` — bei jeder neuen Komponente oder Token-Aenderung VOR Edit pruefen, was schon existiert. Pre-Check ist jeweils erste Task einer Phase.
- TDD pragmatisch: Visual-Polish hat begrenzte TDD-Surface. Bei Verhaltens-Aenderungen (Toast-Position, Loading-State-Verhalten) Tests first. Bei reinem Class-Name-/CSS-Token-Update keine neuen Tests — bestehende Tests muessen gruen bleiben (Class-Assertions ggf. mitziehen).

---

## Phase A — Foundation (Tokens & Globals)

### Task A0: Branch erstellen

**Files:**
- Branch: `feature/dashboard-visual-polish` (off `master` HEAD `d45af11`)

**Step 1: Pruefen, dass master clean und up-to-date ist**

Run: `cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && git status && git fetch origin && git log --oneline -3`
Expected: `working tree clean`, master `d45af11` == origin/master.

**Step 2: Branch erstellen + checkouten**

Run: `cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && git checkout -b feature/dashboard-visual-polish`
Expected: `Switched to a new branch 'feature/dashboard-visual-polish'`.

**Step 3: Push leeren Branch upstream**

Run: `git push -u origin feature/dashboard-visual-polish`
Expected: Branch published, Tracking set.

---

### Task A1: Pre-Check Foundation-Tokens

**Pflicht-Pre-Check** (Regel `.claude/rules/pre-check.md`): bestehende Color-/Typo-/Spacing-Strukturen vor Edit identifizieren.

**Files:**
- Read: `app/globals.css`, `tailwind.config.ts` (falls vorhanden), `app/layout.tsx`

**Step 1: globals.css scannen**

Run: `Read app/globals.css` (volle Datei).
Expected: identifizieren wo bisherige `--primary`, `--card`, `--background`, `--foreground` Tokens definiert sind (`:root` Block), und ob `@theme inline` Block existiert (Tailwind v4 Pattern).

**Step 2: tailwind.config.ts pruefen**

Run: `Glob "tailwind.config.*"`.
Expected: Tailwind v4 kann ohne config laufen (CSS-only Tokens), aber falls vorhanden, Color-Mappings dokumentieren.

**Step 3: layout.tsx pruefen wegen font-import**

Run: `Read app/layout.tsx`.
Expected: Inter-Font-Loading-Pattern erkennen (`next/font/google`-Inter mit subsets/weights), damit neue Weights/Letter-Spacing kompatibel sind.

**Step 4: Treffer-Bericht**

Falls bereits Tokens fuer Anthrazit/Quartier-Green/Warmwhite existieren: STOP, melden, Adapter-Pfad entscheiden (alte Tokens neu mappen statt parallel neue anlegen). Bei fehlenden: weiter mit A2.

**Step 5: Commit (Doku-only)**

Kein Commit hier — Pre-Check ist Read-only.

---

### Task A2: Color-Tokens in globals.css

**Files:**
- Modify: `app/globals.css`

**Step 1: Existing `:root`-Block lokalisieren**

Im File suchen nach `:root {` Block. Innerhalb des Blocks neue Token-Variablen ergaenzen (oder, falls noch nicht vorhanden, Block anlegen).

**Step 2: Tokens ergaenzen**

Direkt unter den bestehenden `--primary` etc. Variablen einfuegen:

```css
:root {
  /* ... existing tokens ... */

  /* Nachbar.io Visual-Polish Iteration 1 — siehe docs/plans/2026-05-11-dashboard-visual-polish-design.md */
  --anthrazit:        #2D3142;
  --anthrazit-soft:   #2D3142cc;
  --anthrazit-mute:   #2D314299;
  --anthrazit-line:   #2D314214;
  --anthrazit-tint:   #2D31420a;

  --quartier-green:   #4CAF87;
  --green-tint:       #4CAF8714;
  --green-line:       #4CAF8733;

  --warmwhite:        #FAFAF7;
  --warmwhite-up:     #FFFFFF;
  --warmwhite-down:   #F4F4EE;

  --alert-amber:      #F59E0B;
  --amber-tint:       #F59E0B14;

  --emergency-red:    #EF4444;
}
```

**Step 3: Bestehende `--background` und `--foreground` Mapping anpassen**

Im selben `:root`-Block bestehende Aliases auf neue Werte mappen (Reihenfolge: zuerst Tokens definiert, dann Aliases referenzieren):

```css
:root {
  /* ... new tokens above ... */

  --background: var(--warmwhite);
  --foreground: var(--anthrazit);
  --card: var(--warmwhite-up);
  --card-foreground: var(--anthrazit);
  --border: var(--anthrazit-line);
  --muted-foreground: var(--anthrazit-mute);
}
```

**Schritt 3-Risiko:** Falls bestehende `--card` / `--border` woanders im Repo via Hex-Wert (z.B. `bg-[#FFFFFF]`) gesetzt werden, hat das Mapping keinen Effekt. Pre-Check in Task A1 sollte solche Faelle gefunden haben.

**Step 4: Run dev-server und sicher gehen, dass nichts kaputt ist**

Run: `cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io" && npm run build` (oder `npx next build` als Sanity-Check).
Expected: 0 errors. Falls Token-Mapping-Konflikte, Aenderungen reduzieren.

**Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): foundation color tokens for visual-polish iteration 1"
```

---

### Task A3: Tailwind @theme inline — Color-Klassen registrieren

**Files:**
- Modify: `app/globals.css` (gleicher File, anderer Block)

**Step 1: Pruefen ob `@theme inline` Block existiert**

Im globals.css nach `@theme inline {` suchen.

**Step 2: Block erweitern (oder anlegen)**

Falls vorhanden, neue Color-Keys ergaenzen. Falls nicht, Block anlegen:

```css
@theme inline {
  --color-anthrazit: var(--anthrazit);
  --color-anthrazit-soft: var(--anthrazit-soft);
  --color-anthrazit-mute: var(--anthrazit-mute);
  --color-anthrazit-line: var(--anthrazit-line);
  --color-anthrazit-tint: var(--anthrazit-tint);

  --color-quartier-green: var(--quartier-green);
  --color-green-tint: var(--green-tint);
  --color-green-line: var(--green-line);

  --color-warmwhite: var(--warmwhite);
  --color-warmwhite-up: var(--warmwhite-up);
  --color-warmwhite-down: var(--warmwhite-down);

  --color-alert-amber: var(--alert-amber);
  --color-amber-tint: var(--amber-tint);

  --color-emergency-red: var(--emergency-red);
}
```

**Step 3: Dev-Test**

Run: `npx next build` (oder Lint).
Expected: 0 errors.

**Step 4: Smoke-Test in einer beliebigen Datei**

Temporaer in `app/page.tsx` (oder einer einfachen Komponente) eine Klasse wie `text-anthrazit` oder `bg-warmwhite-up` einfuegen. Browser oeffnen, Inspektor schauen, Farbwert verifizieren. Aenderung zurueckdrehen.

**Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): tailwind @theme inline keys for new color tokens"
```

---

### Task A4: Body-Defaults (Font-Size + Color + Background)

**Files:**
- Modify: `app/globals.css`

**Step 1: `body` Selektor anpassen**

In globals.css den `body` Selektor (oder `html, body`) suchen und Aenderung anwenden:

```css
body {
  font-family: var(--font-inter), system-ui, -apple-system, sans-serif;
  font-size: 18px;
  line-height: 1.6;
  color: var(--anthrazit);
  background: var(--warmwhite);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'ss01' on, 'cv01' on; /* Inter-Stylistic-Set 01 — etwas distinguiertere Buchstaben */
}
```

**Step 2: Mono-Num-Utility ergaenzen**

Im globals.css, im Bereich nach `@theme inline`:

```css
.font-tnum {
  font-feature-settings: 'tnum' on;
  font-variant-numeric: tabular-nums;
}
```

**Step 3: Build + manueller Check**

Run: `npx next build`.
Expected: 0 errors.

Browser oeffnen auf einer beliebigen Seite (z.B. `/`). Body-Text sollte sichtbar groesser sein (18 px statt vorher 14-16).

**Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): body defaults (18px, anthrazit, warmwhite, tabular-nums utility)"
```

---

### Task A5: Lucide-Icon Default-Stroke 1.5

**Files:**
- Modify: `app/globals.css`

**Step 1: SVG-Override-Regel ergaenzen**

```css
/* Lucide-Icons: feiner Stroke fuer Magazin-Anmutung. Override via class .stroke-2 wenn explizit dicker noetig. */
svg.lucide {
  stroke-width: 1.5;
}
```

**Step 2: Build + visueller Spot-Check**

Run: `npx next build`.
Expected: 0 errors. Browser, beliebige Seite mit Icons, Icons sollten feiner gezeichnet wirken.

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): lucide default stroke-width 1.5 for magazine feel"
```

---

### Task A6: Globale Transition-Rules

**Files:**
- Modify: `app/globals.css`

**Step 1: Transition-Utility-Klasse ergaenzen**

```css
/* Visual-Polish: durchgaengig sanfte Color-Transitions, niemals Bewegung. */
.transition-polish {
  transition-property: background-color, border-color, color, opacity, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
```

**Step 2: Auf `body` als sehr generische Default-Transition setzen (optional)**

Vorsicht: zu breit kann Performance kosten. Stattdessen pro Komponente die Klasse `transition-polish` setzen.

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): transition-polish utility (150ms ease-out, color-only)"
```

---

### Task A7: Foundation-Verifikation (Tests + Build)

**Files:**
- Run: alle bestehenden Tests, tsc, lint.

**Step 1: tsc**

Run: `npx tsc --noEmit`.
Expected: 0 errors.

**Step 2: vitest**

Run: `npx vitest run`.
Expected: 4515/4515 gruen (gleicher Stand wie auf master).

**Step 3: eslint**

Run: `npx eslint .`.
Expected: 0 errors/warnings (bzw. nur preexistente).

**Step 4: Browser-MCP Baseline-Screenshot**

`/dashboard` auf lokal-Dev oder Branch-Preview oeffnen, Screenshot machen (Mobile 375px + Tablet 768px). Als "Vor-Foundation"-Bild speichern.

**Step 5: Commit (nur falls Test-Class-Assertions angepasst werden mussten)**

```bash
git add __tests__/...
git commit -m "test: align class assertions with new foundation tokens"
```

---

## Phase B — Dashboard-Page-Struktur

### Task B1: Pre-Check Dashboard-Komponenten-Struktur

**Files:**
- Read: `app/(app)/dashboard/page.tsx`, `components/dashboard/*`, `components/discover-grid/*`

**Step 1: Tree analysieren**

Run: `Glob "components/dashboard/**/*.tsx"` und `Glob "components/discover/**/*.tsx"`.
Expected: vollstaendige Liste der Dashboard-Komponenten.

**Step 2: Page-Datei lesen**

Run: `Read app/(app)/dashboard/page.tsx` (volle Datei).
Expected: Sektion-Reihenfolge identifizieren, Sektion-Abstaende identifizieren, Container-max-Width identifizieren.

**Step 3: Treffer-Bericht**

Falls Page-Layout bereits Sektion-Abstaende via Tailwind-Klassen (`space-y-12`, `gap-12`) setzt: notieren welche Klassen zu aendern sind. Falls inline-Styles: dokumentieren.

**Step 4: Kein Commit (Read-only)**

---

### Task B2: Page-Padding + Sektion-Abstand in dashboard/page.tsx

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Step 1: Sektion-Abstaende auf 48px**

Tailwind: `space-y-12` (= 48 px). Falls bisher `space-y-6` oder `space-y-8`, aendern.

**Step 2: Page-Padding mobile/tablet**

Tailwind: `px-5 sm:px-8` (= 20px mobile, 32px ab `sm:` 640px+) bzw. `md:px-8` ab Tablet (768px) — abhaengig von vorhandenem Pattern.

**Step 3: Build + Browser-Check**

Run: `npx next build`. Browser oeffnen, Dashboard, visuell pruefen ob Sektionen mehr Atemraum haben.

**Step 4: Bestehende Tests laufen**

Run: `npx vitest run __tests__/app/dashboard`.
Expected: gruen.

**Step 5: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat(design): dashboard page padding + section rhythm 48px"
```

---

### Task B3: Hero (Begruessung + Wetter) typografisch

**Files:**
- Identify: `Glob "components/**/*Hero*.tsx"` + `Glob "components/**/*Greeting*.tsx"`
- Modify: gefundene Komponente (Hero/Begruessungs-Komponente)

**Step 1: Komponente identifizieren**

Run: `Grep "Guten Morgen|Guten Tag|Guten Abend"` in `components/`.
Expected: 1-2 Treffer.

**Step 2: Test-Snapshot vor Aenderung**

Run: `npx vitest run` mit Filter auf Hero/Greeting Tests.
Expected: bestehende Tests gruen.

**Step 3: Anpassen — Hero typografisch**

- Container: `<section className="flex items-start justify-between gap-6">`
- Links: `<div><h1 className="text-[36px] leading-[1.15] font-semibold tracking-[-0.02em] text-anthrazit">Guten Morgen, {firstName}</h1><p className="mt-2 text-sm font-medium tracking-[0.01em] text-anthrazit-mute">{weekday}, {datum} · Bad Saeckingen</p></div>`
- Rechts: Wetter — siehe Task B4.
- Avatar entfernen (falls vorhanden).

**Step 4: Tests anpassen wo Class-Assertions noetig sind**

Run: `npx vitest run`.
Expected: gruen.

**Step 5: Commit**

```bash
git add components/.../Hero*.tsx __tests__/...
git commit -m "feat(design): hero greeting typographically — no card container, no avatar"
```

---

### Task B4: Wetter typografisch (eigene Komponente oder im Hero)

**Files:**
- Identify: `Grep "weather|wetter"` in `components/`.
- Modify: Wetter-Komponente

**Step 1: Komponente lokalisieren**

**Step 2: Anpassen**

- Container: rechtsbuendig im Hero.
- Temperatur: `<span className="text-[32px] font-semibold tabular-nums text-anthrazit">{temp}°</span>`
- Wort: `<span className="block text-base text-anthrazit-soft">{condition}</span>`
- Zusatz: `<span className="block text-sm text-anthrazit-mute">{wind} · Pollen {pollen}</span>`
- Kein farbiges Icon-Bubble. Wenn unbedingt ein Symbol noetig: kleines monochromes Anthrazit-Icon (Cloud/Sun/Drop) 18px neben dem Wort.

**Step 3: Tests gruen halten**

**Step 4: Commit**

```bash
git add components/.../Weather*.tsx
git commit -m "feat(design): weather typographic — temp tabular-nums, no icon bubble"
```

---

### Task B5: SOS-Kachel Padding + Icon-Position

**Files:**
- Identify: `Glob "components/**/SOS*.tsx"` + `Grep "Notruf 112"`
- Modify: SOS-Komponente

**Step 1: Komponente lokalisieren**

**Step 2: Anpassen**

- Container: `<button className="w-full bg-emergency-red text-white rounded-2xl px-6 py-8 sm:py-10 flex items-center justify-between gap-4 shadow-sm hover:bg-[#DC3F3F] active:bg-[#C23636] transition-polish">`
- Text links: `<span className="text-2xl font-semibold tracking-[-0.01em]">Notruf 112</span>`
- Icon rechts: `<Phone className="h-6 w-6 shrink-0" strokeWidth={2} />` (SOS-Icon darf etwas dicker)
- Kein Emoji.

**Step 3: Tests + a11y-Check**

Run: `npx vitest run`. Pruefen ob a11y-Label "Notruf 112 anrufen" gesetzt ist (`aria-label`).

**Step 4: Commit**

```bash
git add components/.../SOS*.tsx
git commit -m "feat(design): SOS card — padding, icon right, word-before-number"
```

---

## Phase C — Tiles (DiscoverGrid + Schnellzugriffe)

### Task C1: Pre-Check Tile-Komponenten

**Files:**
- Read: `components/dashboard/DiscoverGrid.tsx`, `components/dashboard/QuickAccess.tsx` (oder analoge)

**Step 1: Tile-Strukturen identifizieren**

Run: `Read components/dashboard/DiscoverGrid.tsx`. Identifizieren: wo wird die Tile-Card gerendert, welche Klassen werden gesetzt, woher kommt der Icon-Hintergrund.

**Step 2: Treffer-Bericht**

Falls eine `Tile`-Sub-Komponente bereits abstrahiert ist (z.B. `<DiscoverTile>`): Edit dort. Falls inline gerendert: refactor zu Sub-Komponente als Teil dieser Task (eine Komponente = eine Source-of-Truth).

**Step 3: Kein Commit (Read-only)**

---

### Task C2: DiscoverGrid Tile-Komponente

**Files:**
- Modify: `components/dashboard/DiscoverGrid.tsx` (oder die abstrahierte `Tile`-Sub-Komponente).

**Step 1: Tile-Klassen**

```tsx
<a
  href={tile.href}
  className="
    group relative flex flex-col gap-2
    rounded-xl border border-anthrazit-line bg-warmwhite-up
    px-5 py-5
    min-h-[88px]
    transition-polish
    hover:bg-warmwhite-down hover:border-green-line
    active:bg-green-tint
    focus-visible:outline-2 focus-visible:outline-quartier-green focus-visible:outline-offset-2
  "
>
  <Icon className="h-5 w-5 text-anthrazit" />
  <span className="text-[18px] font-semibold leading-[1.35] text-anthrazit">{tile.label}</span>
  {tile.sub && <span className="text-base text-anthrazit-soft leading-[1.5]">{tile.sub}</span>}
  {tile.badge && (
    <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-green-tint px-2 py-0.5 text-sm font-medium text-anthrazit">
      {tile.badge}
    </span>
  )}
</a>
```

**Step 2: Tests anpassen**

Run: `npx vitest run components/dashboard/__tests__/DiscoverGrid.test.tsx`.
Expected: gruen. Bei Class-Assertion-Brueche: Selektor auf Text/Role wechseln.

**Step 3: Visueller Check**

Browser auf Dashboard, Tile-Optik validieren.

**Step 4: Commit**

```bash
git add components/dashboard/DiscoverGrid.tsx __tests__/...
git commit -m "feat(design): DiscoverGrid tile — hairline border, small icon, no shadow"
```

---

### Task C3: DiscoverGrid Kategorie-Headlines

**Files:**
- Modify: `components/dashboard/DiscoverGrid.tsx`

**Step 1: Header pro Kategorie**

```tsx
<section className="space-y-4">
  <header className="space-y-1">
    <h2 className="text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] text-anthrazit">
      {category.label}
    </h2>
    <div className="h-px bg-anthrazit-line" aria-hidden />
  </header>
  <div className="grid grid-cols-2 gap-4">
    {category.tiles.map(...)}
  </div>
</section>
```

**Step 2: Tests gruen halten**

**Step 3: Commit**

```bash
git add components/dashboard/DiscoverGrid.tsx
git commit -m "feat(design): DiscoverGrid category headers with hairline divider"
```

---

### Task C4: Schnellzugriffe-Tiles auf gleiche Bauart

**Files:**
- Identify: `Grep "Check-in|Schnellzugriff|QuickAccess"` in `components/`.
- Modify: gefundene Komponente.

**Step 1: Komponente lokalisieren**

**Step 2: Tile-Bauart angleichen**

Gleicher Tile-Stil wie DiscoverGrid (C2). Falls 4 Tiles im 2x2-Grid: `grid grid-cols-2 gap-4`. Falls 1x4-Reihe auf Tablet: `sm:grid-cols-4`.

**Step 3: Tests gruen halten**

**Step 4: Commit**

```bash
git add components/.../QuickAccess*.tsx
git commit -m "feat(design): quick-access tiles match DiscoverGrid style"
```

---

## Phase D — Mikro-Interaktionen + Toasts

### Task D1: Pre-Check Loading-States + Toast-System

**Files:**
- Read: `components/ui/skeleton.tsx` (shadcn), Toast-Config (`sonner` o.ae.)
- Grep: `Skeleton|toast|Toaster`

**Step 1: Loading-State-Mechanismus identifizieren**

**Step 2: Toast-System identifizieren**

Run: `Grep "Toaster|toast.success|toast.error"`. Identifizieren welche Library (sonner / react-hot-toast / shadcn-toast).

**Step 3: Treffer-Bericht**

Kein Commit (Read-only).

---

### Task D2: Loading-State ohne Pulse

**Files:**
- Modify: `components/ui/skeleton.tsx` (oder analog)

**Step 1: Pulse-Animation entfernen**

Bisher: typischerweise `animate-pulse bg-muted`. Aendern auf: `bg-anthrazit-tint opacity-60` ohne Pulse-Animation.

```tsx
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md bg-anthrazit-tint opacity-60", className)}
      {...props}
    />
  );
}
```

**Step 2: Tests gruen halten**

**Step 3: Commit**

```bash
git add components/ui/skeleton.tsx
git commit -m "feat(design): skeleton loader — static dim, no pulse animation"
```

---

### Task D3: Toast-Position bottom + Theme

**Files:**
- Modify: `app/layout.tsx` (oder wo `<Toaster>` gemountet wird)

**Step 1: Toaster-Props anpassen**

Sonner:
```tsx
<Toaster
  position="bottom-center"
  duration={5000}
  toastOptions={{
    className: "bg-anthrazit text-white border border-anthrazit",
    style: { fontSize: "16px", padding: "16px 20px", borderRadius: "12px" },
  }}
/>
```

**Step 2: Smoke-Test**

Eine Aktion ausloesen die Toast zeigt (z.B. Bug-Report senden), pruefen ob Toast unten erscheint.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(design): toaster bottom-center, anthrazit theme, 5s duration"
```

---

## Phase E — Verifikation + Merge-Vorbereitung

### Task E1: Voller Test-Lauf

**Step 1: tsc**

Run: `npx tsc --noEmit`.
Expected: 0 errors.

**Step 2: vitest**

Run: `npx vitest run`.
Expected: 4515/4515 gruen (oder mit angepassten Class-Assertions wieder gruen).

**Step 3: eslint**

Run: `npx eslint .`.
Expected: 0 errors.

**Step 4: Build**

Run: `npx next build`.
Expected: 0 errors.

**Step 5: Falls Anpassungen noetig sind, fixen + commiten.**

---

### Task E2: Browser-MCP Vor/Nach-Screenshots

**Step 1: Dev-Server starten**

Run: `npm run dev` (Port 3000, lokaler Supabase).
Expected: Server laeuft.

**Step 2: Login als Founder**

Browser-MCP: `/auth/login`, Magic-Link an `theovonbald@gmail.com` (oder Test-Bypass falls vorhanden in lokaler Env).

**Step 3: Dashboard auf 375 px**

Browser-MCP: viewport 375x812 (iPhone-Standard), `/dashboard`, full-page-screenshot. Speichern unter `docs/design-screenshots/2026-05-11-after-mobile.png`.

**Step 4: Dashboard auf 768 px**

Browser-MCP: viewport 768x1024 (iPad-portrait), `/dashboard`, full-page-screenshot. Speichern unter `docs/design-screenshots/2026-05-11-after-tablet.png`.

**Step 5: Vergleich gegen Vor-Stand-Screenshots** (aus Task A7) — visueller Diff.

**Step 6: Commit Screenshots**

```bash
git add docs/design-screenshots/
git commit -m "docs(design): visual-polish before/after screenshots"
```

---

### Task E3: Founder-Sichtpruefung auf Branch-Preview

**Step 1: Branch zu Vercel-Preview pushen**

Run: `git push` (Branch ist schon upstream getrackt). Vercel-Preview-Build startet automatisch falls Repo das hat. Falls nicht: `vercel deploy --no-prod` ausfuehren.

**Step 2: Founder-Link bereitstellen**

Preview-URL kommt von Vercel zurueck. Founder klickt durch.

**Step 3: Feedback einsammeln**

**Step 4: Bei "passt": weiter zu E4. Bei "anders": iterieren (zurueck zur entsprechenden Phase).**

---

### Task E4: Merge zu master + Live-Deploy

**Step 1: Auf master wechseln**

Run: `git checkout master && git pull origin master`.

**Step 2: Branch mergen (no-ff fuer klare History)**

Run: `git merge --no-ff feature/dashboard-visual-polish -m "feat(design): merge Dashboard Visual-Polish Iteration 1"`.

**Step 3: Push**

Run: `git push origin master`.

**Step 4: Live-Deploy**

Run: `gh workflow run deploy.yml -R ClaudeTheo/nachbar-io --ref master`. Watch via `gh run watch`.

**Step 5: Smoke nach Deploy**

Browser auf `https://nachbar-io.vercel.app/dashboard` (Founder eingeloggt). Verifizieren dass Live-Stand der Branch-Variante entspricht.

---

### Task E5: Auto-Memory + Vault-Update

**Step 1: project_session_handover.md aktualisieren**

Pass-38 (Dashboard Visual-Polish Iteration 1 LIVE) eintragen. Master-HEAD aktualisieren. Tests-Count aktualisieren.

**Step 2: Bei strategischer Bedeutung Vault-Eintrag**

Falls Founder im Sichttest gesagt hat "ja, jetzt fuehlt sich das nach Produkt an" — Vault-Notiz in `firmen-gedaechtnis/03_Entscheidungen/` ergaenzen. Optional.

**Step 3: Commits** in Outer-Repo via Auto-Dream-Bot, kein manueller Commit noetig.

---

## Risiken-Watchpoints (waehrend Execution)

| Risiko | Erkennen | Reaktion |
|---|---|---|
| Body 18px sprengt `max-w-md`-Container in Senior-Layouts | Tile-Text bricht unerwartet um | Per-Komponente `text-base` (16) statt `text-lg` (18) reduzieren — Senior-Layout ist eigene Story, hier konservativ. |
| `--card` Mapping kollidiert mit hartkodierten `bg-white` | Cards bleiben rein-weiss statt warm-weiss | `bg-card` statt `bg-white` Sweep — separater Task, nicht in dieser Iteration. |
| Skeleton-Anpassung bricht Loading-Test-Snapshots | vitest rot | Snapshots aktualisieren bewusst (Class-Assertion auf `bg-anthrazit-tint`). |
| Toast-Position aendert Tests die `top` annehmen | vitest rot | Test-Annahme anpassen ODER Toast-Position als prop konfigurierbar machen. |
| Lucide-Stroke-1.5 macht Icons in anderen Apps der gleichen Repo (z.B. Senior-Layout) zu zart | Senior-User koennen Icons nicht erkennen | Lucide-Override per `data-page="dashboard"`-Scope statt global. |

---

## Definition of Done (Iteration 1)

- Alle Phasen A-E durch.
- `npm run build` clean, `npx tsc --noEmit` clean, `npx eslint` clean.
- `npx vitest run` clean (vorher 4515, nachher 4515 minimum).
- Branch `feature/dashboard-visual-polish` zu master gemergt.
- Master deployed zu nachbar-io.vercel.app.
- Founder hat im Sichttest "passt"-Verdict gegeben.
- Vor/Nach-Screenshots committed in `docs/design-screenshots/`.
- Auto-Memory `project_session_handover.md` aktualisiert.

**Out-of-Scope fuer Iteration 1 (faellt in Folge-Iterationen):**
- Photo-/Pattern-Schicht (Iteration 2).
- Landing-Page `/`.
- `/care/aerzte`, `/city-services`, `/quartier-info`.
- Senior-Pfad `/senior/*` (nur via Foundation-Tokens passive Aenderungen).
- Visual-Regression-Test-Setup (Playwright Snapshots).
