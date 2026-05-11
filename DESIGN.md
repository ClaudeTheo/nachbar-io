# nachbar.io / QuartierApp — DESIGN.md

> **Format:** 9-Sektionen-Standardformat fuer Claude Design (Anthropic Labs).
> **Stand:** 2026-05-11. Branch `feature/dashboard-visual-polish`.
> **Zweck:** Source-of-Truth fuer Claude Design beim Repo-Connect — Brand, Tokens, Regeln, Don'ts.

---

## 1. Visual Theme & Atmosphere

**Kernton:** Warm, persoenlich, vertrauensvoll. Eine deutsche Familien- und Senior-App, die sich wie ein gut gestaltetes Lokalblatt anfuehlt — nicht wie ein Tech-Startup, nicht wie ein Behoerden-Portal.

**Zielgruppe:**

- **Primaer:** Senior:innen 65-95 in Klein- und Mittelstadt-Quartieren. Lesen mit Lesebrille bei 100 % Helligkeit. Erwarten Print-Zeitungs-Aesthetik (Sueddeutsche, Lokalblatt, Apotheken-Umschau). Verstehen "Klicken Sie auf Anmelden", verstehen NICHT "Tap to onboard". Brechen ab bei: Hover-Animationen, Skeleton-Loadern, "Magie"-Sprache, Onboarding-Wizards mit 5 Schritten.
- **Sekundaer:** Toechter und Soehne 40-65, die das Produkt fuer ihre Eltern bewerten. Vertrauen dem Produkt nur wenn es **ruhig, sachlich, deutsch-solide** wirkt.

**Pilot-Kontext:** Bad Saeckingen (Schwarzwald-Sued, 17.000 Einwohner). 1 echter Pilot-User, vor Markt-Launch, 0 Vertraege.

**Anmutung gewuenscht:**
- IKEA Place fuer Senior:innen (Klarheit, grosse Targets, Wort-Buttons)
- Apotheken-Umschau-Magazin (Print-Hierarchie, ruhige Flaechen)
- Frankfurter-Allgemeine-Quarterly (typografische Ruhe)
- Stadthaus-Webseiten kleinerer deutscher Staedte (Lokal-Patriotismus, Sachlichkeit)

**Bewusst NICHT:**
- Linear, Vercel, Stripe-Marketing-Pages (zu jung, zu tech, zu cool)
- Notion, Loom, Cron-Style (zu modern, zu hip)
- Default-shadcn-Template-Look auf vercel.app/templates
- Apps die "magic", "AI-powered", "intelligent" sagen

**Tonalitaet (verhandlungsfrei):**
- IMMER Siezen, niemals Duzen.
- IMMER deutsch. Keine englischen Lehnwoerter wenn vermeidbar ("Events" → "Veranstaltungen", "Login" → "Anmelden", "Dashboard" → "Startseite", "Onboarding" → "Erste Schritte").
- Sachlich, ruhig, leise. Kein Marketing-Hype, keine Ausrufezeichen, keine Wortwitze, keine Emoji-Headlines.
- Konkretheit vor Versprechen ("Die Muellabfuhr kommt morgen um 7 Uhr" — nicht "Verpassen Sie nie wieder einen Termin!").
- Vertrauen vor Begeisterung ("Hier sind Ihre Nachbarn" — nicht "Entdecken Sie Ihre Community!").

---

## 2. Color Palette & Roles

**Diese Tokens sind LIVE im Repo (`app/globals.css`) und Code-autoritativ.** Claude Design soll bei diesen Hex-Werten bleiben, nicht eigene Farben einfuehren.

```css
/* Brand-Primaer */
--color-quartier-green:       #2e7d5e;  /* Petrol-Gruen — Primary CTA, Marken-Akzent */
--color-quartier-green-light: #4caf87;  /* Helleres Akzent-Gruen (Hover-Tint, OK-State) */
--color-quartier-green-dark:  #245f49;  /* Active/Pressed-State */

/* Text */
--color-anthrazit:        #3d3d50;  /* Body-Text, Headlines, Icons */
--color-anthrazit-light:  #56566e;  /* Sekundaer-Text, Sublines */
--color-muted-foreground: #6b7280;  /* Captions, Meta-Daten */

/* Backgrounds */
--color-warmwhite:        #fdf8f3;  /* Page-Background — warmes Off-White */
--color-card:             #fffcf9;  /* Card-Background — minimal heller als Page */
--color-lightgray:        #f5f0eb;  /* Sekundaer-BG, Inputs, Muted */

/* Borders */
--color-border:           #ebe5dd;  /* Standard-Border — warmer Beige-Ton */

/* Status */
--color-alert-amber:        #f59e0b;  /* Warnungen */
--color-alert-amber-light:  #fcd34d;  /* Amber-Tint */
--color-emergency-red:      #ef4444;  /* NUR fuer 112/110 SOS-Banner */
--color-success-green:      #22c55e;  /* Bestaetigung */
--color-info-blue:          #3b82f6;  /* Info-Hinweise */

/* Icon Backgrounds (subtle Tinted Circles, je nach Kontext) */
--color-icon-bg-blue:    #dbeafe;
--color-icon-bg-green:   #dcfce7;
--color-icon-bg-orange:  #ffedd5;
--color-icon-bg-purple:  #ede9fe;
--color-icon-bg-gray:    #f3f4f6;
--color-icon-bg-red:     #fee2e2;
--color-icon-bg-amber:   #fef3c7;
```

**Einsatz-Regeln:**

- **Primary-Buttons / CTAs:** `--color-quartier-green` (Petrol). Text weiss.
- **Aktiv-Zustaende / Hover-Akzent:** `--color-quartier-green-light` (helleres Mint). NICHT als Default-Brand-Color einsetzen.
- **Notfall-Rot** NUR fuer 112/110-Notruf-Banner. Niemals fuer andere Warnungen — dafuer Amber.
- **Warm-Off-White ist Pflicht** als Page-BG. Reines `#FFFFFF` wirkt klinisch.
- **Cards sind `#fffcf9`** — minimal heller als Page, kein Schatten als einzige Trennung sondern Farbtiefe + subtile shadow-soft.

---

## 3. Typography Rules

**Fonts (Pflicht — `next/font/google` geladen in `app/layout.tsx`):**

```css
--font-heading: 'Nunito', sans-serif;        /* h1-h4 — leicht runder als Inter */
--font-sans:    'Nunito Sans', sans-serif;   /* Body, Buttons, Inputs */
```

Begruendung: Nunito ist optisch waermer als Inter und fuer Senior-Augen tendenziell besser lesbar (offenere Counter, weichere Strichkontraste).

**Type-Scale:**

| Rolle | px | line-height | Weight | Letter-Spacing | Wo |
|---|---|---|---|---|---|
| H1 Display | 32-36 | 1.15 | 700 | -0.01em | Hero-Begruessung, Page-Titles |
| H2 Section | 22-24 | 1.3 | 700 | -0.005em | Kategorie-Headlines im Dashboard |
| H3 Card | 18-20 | 1.35 | 600 | 0 | Tile-Titel, Card-Headlines |
| Body | 18 | 1.6 | 400 | 0 | Fliesstext, Tile-Sublines |
| Body-Small | 16 | 1.5 | 400 | 0 | Card-Meta, sekundaer-Text |
| Caption | 14 | 1.4 | 500 | 0.01em | Labels, Datums-Linien, Mikro-Hinweise |
| Mono-Num | inherit | inherit | 500 | 0 | Zahlen mit `font-variant-numeric: tabular-nums` |

**Wichtigste Regeln:**
- Body **18 px** als Default (NICHT 14/16) — Senior-Lesbarkeit, nicht-verhandelbar.
- Headlines **600-700** (NICHT 800/Black, NICHT 300/Light).
- Headlines bekommen leicht negativen LS (-0.005 bis -0.01em).
- Zeilenhoehe grosszuegig (Body 1.6).
- Niemals positives LS fuer Body (wirkt "tech").

---

## 4. Component Stylings

**Bestehende Utility-Klassen im Repo (`app/globals.css`) — diese sind Source-of-Truth:**

### Cards

```css
.card-content {
  background: var(--card);   /* #fffcf9 */
  border-radius: 1rem;        /* 16 px */
  border: none;
  box-shadow: 0 1px 4px rgba(61, 61, 80, 0.04);
  transition: box-shadow 0.15s ease;
}
.card-content:hover {
  box-shadow: 0 4px 12px rgba(61, 61, 80, 0.08);
}
```

### Layered Shadows (Apple-Style, zwei Ebenen fuer natuerliche Tiefe)

```css
.shadow-soft       /* Default-Card-Shadow */
.shadow-soft-hover /* Hover-Variante */
.shadow-hero       /* Hero-Card-Variante */
.shadow-nav        /* Bottom-Nav (umgedreht, von unten) */
```

### Interaktive Cards (mit haptischem Feedback)

```css
.card-interactive:active   { transform: scale(0.97); }
.card-interactive:hover    { transform: translateY(-2px); box-shadow: ... }
```

Hinweis: das Repo hat **Apple-Style-haptische Mikro-Animationen**. Claude Design soll dabei bleiben — sie sind LIVE-Konvention. Visual-Polish-Ziel ist **Typografie + Spacing**, nicht Bewegungs-Entzug.

### Buttons (shadcn-Basis + nachbar-Tokens)

- **Primary:** `bg-quartier-green text-white rounded-xl px-6 py-4 text-base font-semibold` — 56 px Mindest-Hoehe.
- **Secondary:** `bg-transparent border border-border text-anthrazit hover:bg-lightgray rounded-xl px-6 py-4`.
- **Senior-Variante:** `min-h-[80px]` Touch-Target, `text-lg`, `font-semibold`.
- **Notfall (SOS):** `bg-emergency-red text-white rounded-2xl text-2xl font-bold` — mind. 80 px Hoehe, gross.

### Inputs

- `bg-lightgray border border-border rounded-xl px-4 py-3 text-base`
- Focus: `outline-2 outline-quartier-green outline-offset-2`
- Senior-Variante: `min-h-[56px]`, `text-lg`.

### Badges

- **Default:** `bg-quartier-green-light/15 text-quartier-green-dark text-sm font-medium px-2 py-0.5 rounded-full`
- **Alert:** `bg-amber-tint text-anthrazit`
- **Notfall:** `bg-emergency-red text-white` (sparsam — nur bei harten Errors)

---

## 5. Layout Principles

**8-px-Grid strikt.** Alle Spacings sind Vielfache von 8 (Ausnahmen `20 px`, `12 px` fuer Tile-Padding und Inline-Gaps OK).

```
Sektion-Abstand vertikal (Dashboard):   48 px
Card-Innen-Padding:                     24 px
Tile-Innen-Padding:                     20 px
Tile-Gap im Grid:                       16 px
Inline-Gap (Icon-zu-Text):              12 px
Stack-Gap innerhalb Card:               8 px
Hero-zu-erste-Sektion:                  32 px
Page-Padding (mobile):                  20 px
Page-Padding (tablet+):                 32 px
```

**Container-Breiten:**
- Senior-Layout: `max-w-md` (= 28 rem) auf Mobile, `max-w-lg` ab Tablet.
- Standard-App: `max-w-2xl` (Content) / `max-w-7xl` (Dashboard mit DiscoverGrid).

**Grid:**
- DiscoverGrid: 2-Spalten auf Mobile, 3-4 ab Tablet. `gap-4` (16 px).
- Schnellzugriffe: 2x2 oder 1x4 je nach Viewport.

**Whitespace ist Pflicht.** Lieber eine Sektion mehr Atemraum als eine Zeile mehr Inhalt.

---

## 6. Depth & Elevation

**Hierarchie der Schatten (LIVE im Repo):**

| Klasse | Wo | Werte |
|---|---|---|
| `.shadow-soft` | Default-Cards, Tiles im Ruhezustand | `0 1px 3px rgba(61,61,80,0.04), 0 4px 12px rgba(61,61,80,0.03)` |
| `.shadow-soft-hover` | Hover-Zustand von Cards/Tiles | `0 2px 6px rgba(61,61,80,0.06), 0 8px 24px rgba(61,61,80,0.05)` |
| `.shadow-hero` | Hero-Card (Begruessung) | gleich wie `shadow-soft` |
| `.shadow-nav` | Bottom-Nav-Bar | `0 -1px 8px rgba(61,61,80,0.06)` |

**Glassmorphism — eine Ausnahme, NUR fuer Bottom-Nav:**

```css
.glass-nav {
  background: rgba(253, 248, 243, 0.85);  /* Warmwhite mit Alpha */
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(235, 229, 221, 0.5);
}
```

Glassmorphism ist ausserhalb der Bottom-Nav **verboten**. Keine "Frosted Cards", keine transparenten Header. Bottom-Nav ist die einzige zugelassene Stelle (LIVE-Konvention).

**Radien (`--radius: 0.625rem` = 10 px Base):**

```
--radius-sm:  6 px   (Buttons-Small, Badges)
--radius-md:  8 px   (Inputs, Selects)
--radius-lg:  10 px  (Default — kleine Cards)
--radius-xl:  14 px  (Standard-Cards, Tiles)
--radius-2xl: 18 px  (Hero, SOS-Kachel)
```

Niemals `rounded-full` ausser bei Avataren und FABs.

---

## 7. Do's and Don'ts

### Do
- Typografie traegt die Hierarchie (Groesse + Gewicht + Abstand), nicht Farbe + Card-Style.
- Generoeser Sektion-Abstand (48 px). Atemraum macht "Top-Level" aus.
- Warm-Off-White-Hintergrund mit minimal hellerem Card-BG.
- Hairlines + Layered Shadows (zwei Ebenen, sehr subtil).
- Mikro-Copy menschlich + konkret ("Tochter Anna hat sich heute um 9:12 Uhr gemeldet" — nicht "Care-link active").
- States ueber Farbtiefe (aktiv = stronger green, inaktiv = oblique tinted).
- Lokale Verankerung sichtbar ("Bad Saeckingen" im Header, echte Strassennamen).
- Apple-Style haptische Mikro-Animationen sind OK (LIVE-Konvention) — `card-interactive:active scale(0.97)`, `translateY(-2px)` hover, `float`/`btn-bounce`/`badge-pop`.

### Don't
- **Hero-Section mit Full-Bleed Gradient** (purple/pink/blue blob).
- **Generic Lucide-Icon-Lineart** mit farbigem Background-Tile als einzige Visual-Hierarchie.
- **Glassmorphism ausserhalb Bottom-Nav** (transparente Content-Cards, blurred Modal-Backgrounds verboten).
- **Stat-Counter-Hero** ("10.000+ Nachbarn vernetzt").
- **Testimonial-Carousel** mit runden Avatar-Fotos und Stern-Ratings.
- **"Trusted by"-Logo-Wall.**
- **Storyset/unDraw/Lottie-Standard-Illustrationen.**
- **Floating Action Buttons mit Plus-Symbol und Pulse-Animation.** (FAB ist erlaubt nur fuer Bug-Report mit dezenter `float`-Animation — kein Pulse.)
- **Bottom-Sheets die von unten reinsliden** ausser fuer bewussten Senior-Use-Case (Termin-Popup, Bug-Report-Sheet).
- **Toast-Notifications oben rechts** mit Checkmark + Progress-Bar (statt unten in Bar).
- **Onboarding-Tour** mit Spotlight-Cutouts und "Skip"-Button.
- **Dark Mode** (Senior-Augen brauchen Hell-Hintergrund — `:root .dark` ist im Repo definiert aber nicht aktiv genutzt; nicht foerdern).
- **Sidebar-Navigation links mit Collapse-Toggle** (Desktop-Pattern, ueberfordert).
- **Headline-Verlauf-Text-Gradient.**
- **Cards mit `border-2 border-{color}-500`** als Hover-State (statt subtile Border-Color-Aenderung).
- **"Beta", "AI", "Smart" oder "Powered by"** als Badge.
- **English UI-Strings** (`Submit` → `Senden`, `Continue` → `Weiter`).

---

## 8. Responsive Behavior

**Breakpoints (Tailwind v4-Defaults):**

```
sm:  640 px   (grosses Smartphone / kleines Tablet)
md:  768 px   (Tablet portrait)
lg: 1024 px   (Tablet landscape / kleines Laptop)
xl: 1280 px   (Desktop)
```

**Mobile-First**, aber Tablet (768 px+) ist gleichwertiger Ziel-Viewport — Senior:innen nutzen oft iPad oder vergleichbare Tablets.

**Touch-Targets:**

- **Standard-App:** Mindestens **56 px** Hoehe fuer alle interaktiven Elemente.
- **Senior-Layouts (`app/(senior)/*`, `app/senior/*`):** Mindestens **80 px** Touch-Targets. Pflicht, nicht-verhandelbar.
- **Notfall-Buttons (SOS):** 80 px+ auch im Standard-App.

**Schriftgroessen pro Breakpoint:**
- Body bleibt 18 px Mobile + Tablet. Optional `lg:text-[17px]` ab Desktop (kompaktere Breite rechtfertigt etwas kleiner). Nicht Pflicht.
- H1 32 px Mobile → 36 px Tablet+.

**Kontrast-Pflicht: 4.5:1 minimum, Ziel 7:1.**
- `text-anthrazit` auf `bg-warmwhite` = 8.6:1 (gut).
- `text-quartier-green` auf `bg-warmwhite` = 4.3:1 (NICHT fuer Body, NUR fuer Headlines/CTAs).
- `text-muted-foreground` auf `bg-warmwhite` = 4.7:1 (gerade noch, nicht fuer wichtige Infos verwenden).

---

## 9. Agent Prompt Guide

### Reusable Prompts fuer Claude Design Chat

#### Prompt A — Dashboard Visual-Polish (Pilot-Iteration)

```
Mach mir das nachbar.io Dashboard auf Top-Level-Niveau, ohne die LIVE-Brand zu wechseln.

Kontext: senior-fokussierte deutsche Familien-App, Pilot Bad Saeckingen.
Bestehende Komponenten siehe `components/dashboard/*` im verbundenen Repo.

Aufgabe: bessere Typografie-Hierarchie (Hero, Section-Headlines, Tile-Titel),
generoeserer Sektion-Abstand (48 px), Hairline-Detail-Disziplin. KEIN Brand-Wechsel
(Petrol-Gruen bleibt, Nunito bleibt, Warmwhite bleibt). KEINE neue Information-Architecture.

Anti-Patterns explizit vermeiden — siehe DESIGN.md Sektion 7.

Output: HTML/CSS-Mockup eines kompletten Dashboards auf 375 px (mobile) und 768 px (tablet).
Sektionen: Hero (Begruessung + Wetter), SOS-Kachel, 4 Schnellzugriffe (Check-in,
Nachrichten, Neuigkeiten, Bekanntmachungen), DiscoverGrid in 4 Kategorien
(Nachbarschaft, Hilfe & Pflege, Quartier-Info, Mehr entdecken).

Halte Tile-Anzahl + Section-Reihenfolge wie im aktuellen Code. Polish nur Typo +
Spacing + Detail.
```

#### Prompt B — Aerzte-Verzeichnis (`/care/aerzte`)

```
Mach mir das Aerzte-Verzeichnis fuer nachbar.io.

Kontext: 51 OSM-Aerzte fuer das Quartier Bad Saeckingen. Tochter (45) und Senior (75)
muessen schnell den richtigen Arzt finden, anrufen, navigieren.

Aufgabe: Liste von 51 Aerzte-Cards. Jede Card zeigt: Name, Fachgebiet,
Adresse (mit Distanz "240 m"), Telefonnummer GROSS, Anrufen-Button (80 px Touch),
Website-Button (subtle). Filter oben: Fachgebiet-Pills (Hausarzt, Frauenheilkunde,
Kinder, etc.).

Anmutung: wie ein gut layoutete Apotheken-Umschau-Doppelseite "Aerzte in
der Umgebung" — Print-DNA, Telefonnummer ist die Heldin der Card.

Halte die LIVE-Brand (Petrol-Gruen, Nunito, Warmwhite). 4.5:1 Kontrast Pflicht.
Senior-Touch-Targets 80 px fuer Anrufen-Button.
```

#### Prompt C — Rathaus-Bekanntmachungen (`/city-services`)

```
Mach mir die Rathaus-Bekanntmachungen-Liste auf Magazin-Niveau.

Kontext: 130+ amtliche Bekanntmachungen aus dem Amtsblatt Bad Saeckingen. Soll sich
wie ein Stadtblatt-Layout anfuehlen, nicht wie ein Twitter-Feed.

Aufgabe: Liste mit Sektion-Trennern (Hairlines), grossen Headlines pro Eintrag,
Datums-Caption oben, Body-Text 18 px, "Weiterlesen"-Link. Gruppen nach Datum
(z.B. "Diese Woche" / "Letzte Woche" / "Aelter").

Anmutung: Frankfurter-Allgemeine-Lokalteil. Sehr ruhig. Keine Cards mit Schatten,
sondern Hairline-getrennte Eintraege auf der Page direkt.
```

### Prompt-Anti-Pattern (NICHT verwenden)

- "Mach das mit AI-Gefuehl" — fuehrt zu Magic-Sprache.
- "Modern und sleek" — fuehrt zu generic SaaS.
- "Wie Linear" — fuehrt zu Linear-Klon.
- "Mit Glassmorphism" — verboten ausser Bottom-Nav.

### Wenn unsicher

Frage konkret zurueck nach Tochter-Akzeptanz:
"Wuerde eine 45-jaehrige Tochter diesen Screen ihrer 78-jaehrigen Mutter zumuten,
und wuerde sie ihn als 'serioes' beschreiben — nicht als 'modern' oder 'cool'?"

Wenn nein → reduzieren, beruhigen, deutsche Worte gegen englische Lehnwoerter
tauschen, Mikro-Animationen entfernen, Typografie groesser machen.

---

## Verweise auf Code

- **Tokens:** `app/globals.css` (Zeilen 18-119 fuer Tokens, 121-176 fuer Component-Klassen)
- **Layout-Setup:** `app/layout.tsx` (Nunito + Nunito Sans loading)
- **Senior-Pflicht-Patterns:** `app/(senior)/layout.tsx`, `app/senior/layout.tsx`
- **Brand-Brief (Langform):** `docs/plans/2026-05-11-frontend-design-top-level-brief.md`
- **Design-Doc Iteration 1:** `docs/plans/2026-05-11-dashboard-visual-polish-design.md`
- **Implementation-Plan:** `docs/plans/2026-05-11-dashboard-visual-polish-plan.md`
- **CLAUDE.md** (Repo-Regeln): Achtung — CLAUDE.md ist beim Brand-Stand teilweise veraltet (nennt #2D3142/#4CAF87/Inter). Code ist autoritativ.
