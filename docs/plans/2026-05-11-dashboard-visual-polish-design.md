# Dashboard Visual-Polish — Design

> **Datum:** 2026-05-11 spaetabend (Pass 38, nach Pass 37b `a0e1928`)
> **Approach:** Iteration 1 = "Druckwerk-Ruhe" (Approach 1 aus Brainstorming-Brief). Iteration 2 spaeter optional mit Photo-Schicht.
> **Scope:** Visual-Polish-Pass auf bestehender Struktur (Variante B nach Pass 35-37). Keine Information-Architecture-Aenderungen.
> **Strategie:** Branch `feature/dashboard-visual-polish`, Browser-MCP Vor/Nach-Screenshots, Push erst nach Founder-Final-OK.
> **Founder-Approval:** Approach + Foundation + Hero/SOS + Tiles/Interaktionen — bestaetigt 2026-05-11 spaetabend.

---

## Ziel

Das Niveau des Dashboards anheben, sodass es nicht nach "Standard-AI-Output" (Vercel-Template, shadcn-Default, Stripe-Klon) aussieht — sondern wie ein bewusst gestaltetes deutsches Senior-Produkt mit Druckwerk-Anmutung.

**Erfolgs-Kriterium aus Sicht der Tochter (45):** "Sieht serioes aus" / "Das traue ich meiner Mutter zu" / "Wirkt wie etwas, wofuer ich Geld bezahle". **Nicht** akzeptabel: "Sieht modern aus" / "Cool gemacht".

---

## Foundation (Typografie · Spacing · Color)

### Typografie-Skala (Inter, durchgaengig)

| Rolle | px | LH | Weight | Letter-Spacing | Einsatz |
|---|---|---|---|---|---|
| H1 Display | 36 | 1.15 | 600 | -0.02em | Hero-Begruessung |
| H2 Section | 22 | 1.3 | 600 | -0.01em | DiscoverGrid Kategorie-Headlines |
| H3 Card | 18 | 1.35 | 600 | 0 | Tile-Titel |
| Body | 18 | 1.6 | 400 | 0 | Fliesstext, Tile-Subline |
| Body-Small | 16 | 1.5 | 400 | 0 | Caregivers, Card-Meta |
| Caption | 14 | 1.4 | 500 | 0.01em | Labels, Datums-Linien |
| Mono-Num | inherit | inherit | 500 | 0 | Zahlen via `font-feature-settings: 'tnum'` |

**Wichtigste Aenderungen ggue Status quo:**
- Body 18 px Default (vorher 14-16).
- Headlines **600** (nicht 700, nicht 400).
- Headlines negativ-LS (-0.01 bis -0.02) fuer Magazin-Anmutung.
- Captions +0.01em LS + Weight 500 — wirkt wie gesetzte Zeitungs-Subhead.

### Spacing-Rhythmus (8-px-Grid strikt)

```
Sektion-Abstand vertikal:      48 px
Card-Innen-Padding:            24 px
Tile-Innen-Padding:            20 px (Ausnahme, sonst zu eng)
Tile-Gap im Grid:              16 px
Inline-Gap (Icon-zu-Text):     12 px
Stack-Gap innerhalb Card:      8 px
Hero-zu-erste-Sektion:         32 px
Page-Padding (mobile):         20 px
Page-Padding (tablet+):        32 px
```

**Wichtigste Aenderung:** Sektion-Abstand 48 px (vorher 24-32) — das ist der groesste visuelle Hebel. Atemraum macht Top-Level aus.

### Color-Tokens (in `app/globals.css` unter `:root`)

```css
--anthrazit:        #2D3142;
--anthrazit-soft:   #2D3142cc; /* 80% */
--anthrazit-mute:   #2D314299; /* 60% */
--anthrazit-line:   #2D314214; /* 8%  Hairlines */
--anthrazit-tint:   #2D31420a; /* 4%  Hover-BG */

--quartier-green:   #4CAF87;
--green-tint:       #4CAF8714; /* 8% Aktiv-BG */
--green-line:       #4CAF8733; /* 20% Hover-Border */

--warmwhite:        #FAFAF7;   /* Page-BG */
--warmwhite-up:     #FFFFFF;   /* Card-BG */
--warmwhite-down:   #F4F4EE;   /* Tile-Hover-BG */

--alert-amber:      #F59E0B;
--amber-tint:       #F59E0B14;

--emergency-red:    #EF4444;
```

**Einsatz-Regeln:**
1. Body-Text immer **Anthrazit**, nie schwarz.
2. Cards heller als Page-BG (`--warmwhite-up` auf `--warmwhite`). Subtile Erhebung ohne Schatten.
3. **Hairlines statt Borders.** `1px solid var(--anthrazit-line)` (8% alpha).
4. **Quartier-Gruen ist Aktiv-Signal, nicht Deko.** Hover-Border, neue/ungelesene Items, OK-Zustand. NICHT fuer Headlines, Default-Icons, Default-Buttons.
5. **Tile-Hover:** BG `#FFFFFF` → `#F4F4EE`, Border → `--green-line`. Keine Scale/Shadow.
6. **Schatten nur an 2 Stellen:** SOS-Kachel (subtle), BugReport-FAB (subtle).

---

## Hero (Begruessung + Wetter)

- Offener Bereich, **kein Card-Container**, nur Typografie auf Page-BG.
- Links: "Guten Morgen, Thomas" als H1. Subline "Samstag, 11. Mai · Bad Saeckingen" als Caption-Style (14 px, anthrazit-mute).
- Rechts: Wetter typografisch — Temperatur gross in tabular-nums, darunter Wort ("bewoelkt"), darunter Mini-Info (Wind, Pollen). Kein farbiges Icon-Bubble.
- Kein Avatar im Hero (Avatare nur wo Identitaet entscheidet).
- **Anmutung:** Aufmacher einer Lokal-Zeitung.

## SOS-Kachel

- Bleibt rot `--emergency-red`, prominent, subtler Schatten.
- **Innenpadding mind. 32 px** (jetzt enger). Wichtig durch Ruhe, nicht durch Knall.
- "Notruf 112" — Wort vor Zahl. Lucide-`Phone`-Icon (24 px) **rechts** vom Text.
- Aktiv-State (Tap): BG 10 % dunkler. Keine Scale/Pulse.

## Tiles (Schnellzugriffe + DiscoverGrid — gleiche Bauart)

- Card-BG `#FFFFFF` auf Page `#FAFAF7`. **Hairline-Border**, kein Schatten.
- **Icon klein (20 px), oben-links, gleiche Farbe wie Tile-Titel** (anthrazit). Keine farbige Bubble.
- **Tile-Titel** ist H3 (18 px / 600). Wort-getrieben.
- Subline (1 Zeile) als Body-Small (16 px, anthrazit-soft).
- **Badge** (Counts) als Pille rechts-oben: `--green-tint` BG, anthrazit-Text, 14 px. Rot nur bei harten Errors.
- **Hover:** BG → `#F4F4EE`, Border → `--green-line`. Keine Bewegung.
- **Tap:** BG kurz → `--green-tint`, zurueck.

## DiscoverGrid Kategorie-Headlines

- Jede der 4 Kategorien bekommt H2 (22 px / 600) ueber der Tile-Reihe.
- Optional Caption-Zeile darunter — wenn unklar, weglassen.
- Hairline-Trenner unter der Headline, volle Breite. Magazin-Sektion-Trenner-Anmutung.

## Mikro-Interaktionen (durchgaengig)

- Transitions: **150 ms ease-out**. Nicht schneller, nicht langsamer.
- Animierte Properties nur: `background-color`, `border-color`, `color`, `opacity`. **Kein transform**, kein scale, kein translate.
- Loading-States: gedimmtes Text-Layout (`opacity: 0.4`) **ohne** Bewegung. Keine Skeleton-Pulse-Animationen.
- Toasts: unten in einer Bar (nicht oben-rechts), Anthrazit-BG mit weissem Text, Auto-dismiss 5 s.

---

## Was technisch passiert (Edit-Liste fuer Iteration 1)

### Schicht A — Foundation (Tokens)

1. `app/globals.css`
   - Neue CSS-Variablen unter `:root` (oben aufgelistete Color-Tokens).
   - Mapping bestehender Tokens (`--card`, `--border`, `--muted-foreground` etc.) auf neue Variablen, damit bestehende Komponenten automatisch mitkommen.
   - `body { font-size: 18px; line-height: 1.6; color: var(--anthrazit); background: var(--warmwhite); }`
2. Tailwind v4 `@theme inline`-Block
   - `--color-anthrazit-line`, `--color-warmwhite-up`, `--color-warmwhite-down`, `--color-green-tint`, `--color-green-line` registrieren, damit Klassen wie `bg-warmwhite-up`, `border-anthrazit-line` direkt nutzbar sind.

### Schicht B — Dashboard-Komponenten

3. `app/(app)/dashboard/page.tsx`
   - Page-Padding mobile/tablet anpassen.
   - Sektion-Abstaende auf 48 px hochziehen.
4. `components/dashboard/HeroGreeting.tsx` (oder analog — falls eigene Komponente existiert)
   - Typografie-Klassen anpassen.
   - Wetter neu strukturieren (typografisch).
   - Avatar entfernen.
5. `components/dashboard/SOSCard.tsx` (oder analog)
   - Padding hochziehen, Icon-Position rechts, Aktiv-State auf BG-Tint umstellen.
6. `components/dashboard/DiscoverGrid.tsx`
   - Tile-Komponente: Icon klein, oben-links, Hairline-Border, neue Hover-Logik.
   - Kategorie-Header mit H2 + Hairline-Trenner.
7. `components/dashboard/QuickAccess.tsx` (oder analog — 4 Schnellzugriffe)
   - Gleiche Tile-Bauart wie DiscoverGrid (Konsistenz).
8. `components/ui/badge.tsx` (vermutlich shadcn) — Variant `subtle-green` ergaenzen falls noetig.
9. Toast-System (`sonner` o.ae.) konfigurieren — Position `bottom-center`, Theme anthrazit, Duration 5000 ms.

### Schicht C — Mikro-Interaktionen

10. Globale Transition-Klasse oder CSS-Rule: `transition: background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out, opacity 150ms ease-out;`
11. Loading-State-Komponenten (`<Skeleton>` aus shadcn): Pulse-Animation entfernen, durch statisches dimming ersetzen.

### Schicht D — Tests

12. Vitest-Component-Tests fuer veraenderte Komponenten anpassen (Selectoren bleiben gleich, aber Class-Name-Assertions teilweise anpassen). Keine neuen Test-Cases noetig fuer reines Visual-Polish — Verhalten aendert sich nicht.
13. Playwright-Visual-Regressions sind im Repo nicht etabliert — werden in dieser Iteration **nicht** eingefuehrt (eigener Plan, eigener Zeitpunkt).

---

## Was NICHT in Iteration 1 ist (YAGNI)

- Photo-Schicht (Schwarzwald-Foto, Topografie-Pattern) — Iteration 2 falls Founder nach Live-Check Waerme wuenscht.
- Landing-Page `/` — eigener Pass, eigener Plan.
- `/care/aerzte`, `/city-services`, `/quartier-info` — folgen nach Dashboard-Approval, eigene Plaene.
- Senior-Pfad `/senior/*` (auch wenn Komponenten ueberlappen) — eigener Pass, eigener Plan. Foundation-Tokens reichen die meisten Aenderungen automatisch durch, ohne dass Senior-Layout angefasst werden muss.
- Dark Mode — explizit ausgeschlossen (Senior-Augen brauchen Hell-Hintergrund).
- Component-Library-Doku/Stories — eigener Plan.

---

## Erfolgs-Verifikation

1. **Tests gruen:** vitest 4515+/4515+ (keine neuen Tests, Class-Assertions ggf. angepasst), tsc clean, eslint clean.
2. **Browser-MCP Vor/Nach-Screenshots** auf Branch-Preview-URL (Vercel-Preview oder lokaler Dev-Server) auf zwei Viewports: mobile 375 px + tablet 768 px.
3. **Founder-Sichtpruefung:** Founder klickt durchs Dashboard auf Branch-Preview. Subjektiver Eindruck: "passt" oder "anders". Bei "anders" konkretes Stichwort, iterieren.
4. **Tochter-Test (informell):** Founder kann eine reale 40-65-jaehrige Person fragen "Wuerdest Du das Deiner Mutter zumuten?". Optional.

---

## Risiken + Gegenmaßnahmen

| Risiko | Wirkung | Gegenmaßnahme |
|---|---|---|
| Foundation-Token-Mapping bricht bestehende Komponenten in nicht-Dashboard-Pfaden (z.B. `/care`, `/quartier-info`) | Visuelle Regression an unsichtbarer Stelle | Branch-Preview vor Merge — Founder klickt mehrere Top-Routes durch, bevor Merge. Bei Bedarf Tokens defensiv mappen (alte Werte als Fallback). |
| Body 18 px sprengt Layout-Annahmen (max-w-md zu eng fuer den groesseren Text) | Umbrueche an unerwarteten Stellen | Auf Mobile zuerst pruefen — wenn `max-w-md` zu eng, geht hoch auf `max-w-lg` ODER per-screen prufen. |
| Senior-Layouts `/senior` werden parallel veraendert weil sie auf gleiche Tokens zugreifen | Senior-App ggf. unbeabsichtigt anders | Pre-Check vor Foundation-Edit: Wie greift `app/senior/layout.tsx` auf Tokens zu? Falls direkte Hex-Werte: bleiben unangetastet. Falls Variablen: ggf. eigene Senior-Tokens behalten. |
| Lucide-Icon-Default-Stroke (2 px) wirkt zu dick fuer kleines 20-px-Icon | Tile-Optik unruhig | Globaler Lucide-Override: `stroke-width: 1.5` als Default in `globals.css` oder Tile-Component. |
| Toast-Position-Aenderung (top → bottom) bricht bestehende UX-Erwartung in App | Verwirrung wenn Nutzer Toast erwarten oben | Aenderung im Plan dokumentiert, bei Founder-Check besonders pruefen ob er das wahrnimmt. Reversible. |

---

## Naechster Schritt

Implementation-Plan via `superpowers:writing-plans` Skill. Der Plan zerlegt die obige Edit-Liste in TDD-konforme Task-Sequenz mit Verifikation-Punkten. Dann Branch + Implementation + Browser-MCP-Iteration.
