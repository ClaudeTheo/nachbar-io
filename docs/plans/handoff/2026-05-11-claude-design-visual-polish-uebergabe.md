---
date: 2026-05-11 spaetabend (UTC+2)
from: Claude Opus 4.7 (1M context) — Session Pass 38/39
to: Naechste Session (Integration in Next.js)
status: Mockup-Stand v6 finalisiert in claude.design. Integration ins Repo offen. Founder hat aktuell keine claude.ai-Tokens mehr — weitere Mockup-Iterationen pausiert.
tldr: Branch feature/dashboard-visual-polish hat Logo-Assets + DESIGN.md + Design-Doc + Plan committed. claude.design-Mockup-Reihe v1-v6 generiert, v6 ist Referenz fuer Integration. Naechste Session: Logo-Component + Dashboard-Polish + Quartier-Spaziergang-Background + 5-Phasen-Tageszeit-Tint + Glas-Tiles in Next.js uebersetzen, SOS NUR in Senior-Layout.
---

# Visual-Polish Uebergabe — claude.design-Mockup-Reihe v1-v6

## Repo-Stand

**Branch:** `feature/dashboard-visual-polish`
**HEAD:** `c13be9d feat(brand): QuartierApp Logo-Assets aus Banana Pro 2 + Brand-Doku`
**Upstream:** sync (gepusht)

**Branch-Commits (seit master `0c1375d`):**
1. `eb6af77 docs(design): DESIGN.md fuer Claude Design Onboarding (9-Sektionen-Standardformat)`
2. `c13be9d feat(brand): QuartierApp Logo-Assets aus Banana Pro 2 + Brand-Doku`

Working tree clean.

---

## Was im Repo schon liegt

### Brand-Assets (`public/brand/`)
- `quartierapp-master.png` (1856×2254) — Banana Pro 2 Master, finale v2 (2026-05-11 20:59)
- `quartierapp-logo.png` (1380×1000) — Full Logo + Wordmark + Subtitle + Hairline
- `quartierapp-symbol.png` (820×580) — Symbol only, fuer Nav-Pill
- `quartierapp-app-icon-1024.png` (1024×1024) — App-Icon iOS/Android
- `quartierapp-favicon-{16,32,64,180,512}.png`
- `source/` — 4 Banana-Pro-Iterationen als Backup
- `BRAND.md` — komplette Asset-Doku mit Color-Palette, Crop-Koordinaten, Integration-TODO, Open Questions

### DESIGN.md (Repo-Root)
9-Sektionen-Standardformat fuer claude.design. Wird automatisch beim Repo-Connect gelesen.

### Plan-Dokumente
- `docs/plans/2026-05-11-frontend-design-top-level-brief.md` (231 Z., 17-Punkte-Negativliste)
- `docs/plans/2026-05-11-dashboard-visual-polish-design.md` (204 Z., Founder-approved)
- `docs/plans/2026-05-11-dashboard-visual-polish-plan.md` (833 Z., TDD-Implementation-Plan)

---

## claude.design Mockup-Reihe (alle nicht im Repo, leben in claude.ai/design)

**Projekt-URL:** `https://claude.ai/design/p/019e181a-1a40-70a0-9987-322141f90b7a`
**Design-System-URL:** `https://claude.ai/design/p/019e1805-b160-7895-b090-fb8ef8a1146c` ("Nachbar.io Design System")
**Logo-Varianten-URL:** `https://claude.ai/design/p/019e1847-87ba-7548-806c-8bf03432f338`

### Iteration 1 — verworfen
"Druckwerk-Ruhe" (Approach 1). Founder fand es zu nuechtern/leer. → PIVOT zu Mastercard-Stil.

### Iteration 2 — Mastercard-Hybrid-Basis ✓
Mastercard-Atmosphaere: oversized pill radii (20/40/999 px), ghost watermarks, eyebrow + accent dot, asymmetric featured tiles, 64/96 px section padding, weight 450 body, weight 500-600 headings, **LIVE-Brand erhalten** (Petrol-Gruen `#2E7D5E`, Nunito/Nunito Sans, Warmwhite `#FDF8F3`, Anthrazit `#3D3D50`).

### Iteration 3 — Logo + Quartier-Spaziergang ✓
- Logo-Slot `<LogoSymbol>` Placeholder in Nav-Pill (PNG-Swap bei Integration)
- 4 Parallax-Layer mit `scroll-timeline` + `feTurbulence + feDisplacementMap`-Filter:
  - L1 (5 % Speed): Schwarzwald-Tannen-Silhouette, 12 % Opacity
  - L2 (20 %): Hochrhein-Wellenlinie in Rhine-Blue `#7AA0B8`, 18 %
  - L3 (45 %): Bad-Saeckingen-Skyline mit Fridolinsmuenster-Turm + Holzbruecke, durchgehende ink-line in Anthrazit, 25 %
  - L4 (80 %): Foreground-Details (Sperling, Wegweiser `→ Marktplatz`, Holzbaenkchen, Blumenkasten)
- Tageszeit-Tint ≤ 3 % (initial subtil)
- SOS-Pill mit Satellite-Phone-Icon-Pattern noch drin

### Iteration 4 — SOS weg + "Heute in Ihrem Quartier" Anker ✓
- SOS-Pill **entfernt** vom Standard-Dashboard (gehoert nur in Senior-App, siehe `app/senior/layout.tsx:54-65` Notruf-Leiste)
- Statt SOS-Gap: H2 "Heute in Ihrem Quartier." + Eyebrow `• SAMSTAG, 11. MAI` als eleganter Re-Flow-Anker
- Sperling-Detail von SOS zum Hero verschoben

### Iteration 5 — Tageszeit-Tint 5-8 % + Bewegung ✓
**5 Tageszeit-Phasen:**
- **Morgen (06-11):** amber-warm radial top-right + dawn-pink Streifen
- **Mittag (11-15):** clean cream, kein Overlay
- **Nachmittag (15-19):** honey-gold Wash von oben (Show-Variante)
- **Abend (19-23):** Rhine-Blue Wash vom unteren Drittel
- **Nacht (23-06):** subtle warmer Mond-Glow oben-mittig — NIE dunkel
- 5-Phasen-Vergleichsstreifen am Top des Mockups
- Auto-Detection per `Date().getHours()` + 1× pro Minute Hour-Check

**Compositor-only Bewegung:**
- A) Wind-Drift Tannen-L1: max 6 px translateX, 14 s ease-in-out infinite (3 px mobile)
- B) Vogel-Flug: 0→120vw translateX, 8 s, every 90 s, tablet+ only (mobile + reduced-motion = off)
- C) Watercolor-Atmen Aquarell-Bloecke + Logo: opacity 0.94-1.00, 9 s, infinite
- D) Tageszeit-Tint Phase-Fade: 1.5 s ease, einmalig pro Phasenwechsel
- E) Skyline-Drift L3 Holzbruecke: max 8 px translateX, 22 s, infinite (4 px mobile)

**Performance-Guardrails:**
- `will-change: transform` NUR auf 4 Layer-Containern, sonst nirgendwo
- `@media (prefers-reduced-motion: reduce)` → A/B/C/E aus, D bleibt
- `@media (max-width: 640px)` → B aus, L4 weg, L1+L2 halbe Amplitude
- KEINE Blur-Filter (ausser via SVG-Filter), KEINE WebGL, KEIN Canvas, KEINE JS-Animation-Loops
- Nur Transform-Translate + Opacity (GPU)

### Iteration 6 — Glas-Effekt nach CSS-Fix ✓
**Glas auf Schnellzugriffe + Featured-Tiles** (Variante C):
- Tile-BG: `rgba(255, 252, 249, 0.55)` (cream) / `rgba(46, 125, 94, 0.78)` (green-featured)
- `backdrop-filter: blur(8px) saturate(120%)` desktop / `blur(4px) saturate(110%)` mobile
- Top-Edge-Highlight: `1px linear-gradient rgba(255,255,255,0.5) → transparent`
- `@supports (backdrop-filter: blur(8px))` Wrapper, Fallback auf v5 solid
- **CSS-Cascade-Fix:** `.dash .schnell-tile` / `.dash .feat-tile` Selector-Bumps (sonst keine Sichtbarkeit)
- Tageszeit-Tint scheint klar durch das Glas
- Founder hat Variante C bestaetigt: "Glas auf alle Buttons"

### Iteration 7 — gestartet, **nicht fertig generiert** (claude.ai-Tokens leer)
**Wunsch von Founder:** Glas auf ALLEN Tiles + ALLEN Buttons, **deutlich sichtbar**:
- Lower Alpha: `rgba(255,252,249, 0.40)` / `rgba(46,125,94, 0.65)` — mehr Bleed-Through
- Blur 12 px desktop, 6 px mobile
- Stronger Top-Edge-Highlight: `1.5px gradient line rgba(255,255,255,0.7) → transparent`
- Inner-Shadow bottom: `inset 0 -1px 2px rgba(0,0,0,0.04)`
- Tageszeit-Tint hochgedreht auf **10 %** im Showcase (vorher 5-8 %)
- Glas auf: 4 Schnellzugriffe + Featured-Tiles + ALLE DiscoverGrid-Tiles + Search/Avatar/Satellite-Arrow-Buttons + Hero-Buttons
- Solid bleibt: Nav-Pill-Body, Footer, Typography, SOS (Senior-only), DiscoverGrid-Sub-Tiles?

**Status:** v7-Prompt im Chat ABGESCHICKT in claude.design, aber Generierung evtl. unvollstaendig wegen Token-Leere. Naechste Session: v7-Tab pruefen + ggf. neu triggern wenn Tokens regeneriert.

---

## Was die naechste Session machen sollte

### Option I — Integration ins Repo (Code-Job, ~3-4 h)

**Phase A — Foundation (Tokens + globals.css)**
- Tageszeit-Tint CSS-Variablen + Phase-Detection-Script (Hour-Check 1× pro Min)
- Neue Color-Tokens ergaenzen: Amber-Sun `#F59E0B`, Rhine-Blue `#7AA0B8`, Terracotta `#C26B43`, Cream-Pink `#E8D5C4`, Lifted-Cream `#FFFCF9`
- 5-Phasen Tint-Overlays als `<div>` mit absoluter Positionierung + `transition: background 1500ms ease`
- Glas-Tile-Klasse `.glass-tile` mit `@supports (backdrop-filter: ...)` Wrapper + v5-Solid-Fallback

**Phase B — Logo-Integration**
- `app/icon.png` ← `public/brand/quartierapp-favicon-512.png` (Next.js Auto-Favicon)
- `app/apple-icon.png` ← `public/brand/quartierapp-favicon-180.png`
- `app/favicon.ico` aus 32/16-Pixel-Bundle (Multi-Resolution `.ico` mit z.B. `png-to-ico`)
- `components/brand/QuartierAppLogo.tsx` Component:
  - Props: `variant: 'symbol' | 'full' | 'mono'` + `size: number | 'sm' | 'md' | 'lg'`
  - Verwendung: `<QuartierAppLogo variant="symbol" size={40} />` in Nav-Pill, `variant="full" size="lg"` im Footer-Signatur
- `manifest.json` Icons aktualisieren

**Phase C — Dashboard-Sections**
- `app/(app)/dashboard/page.tsx` umstrukturieren:
  - Eyebrow `• MONTAG · 11. MAI · BAD SÄCKINGEN` (mit accent dot)
  - Hero `Guten Morgen, {firstName}.` (H1 36 px / 1.15 / 600 / -0.02em)
  - Wetter typografisch (Temperatur `14°` tabular-nums + Bedingung + Hoechstwert/Wind)
  - **KEIN SOS-Pill** (nur Senior-Layout)
  - "Heute in Ihrem Quartier." Anker mit Eyebrow `• SAMSTAG, 11. MAI`
  - 4 Schnellzugriffe als Glas-Tiles
  - DiscoverGrid 4 Categories mit Ghost-Watermarks (GEMEINSCHAFT, PFLEGE, STADTTEIL, ENTDECKEN), Eyebrow + accent dot, asymmetric featured tiles, hairline divider
  - Footer mit `<QuartierAppLogo variant="full" />`-Signatur
- Section-Padding 64 mobile / 96 tablet+
- Pill-Radii konsequent 20/40/999 px

**Phase D — Quartier-Spaziergang-Background**
- `components/background/QuartierSpaziergang.tsx`:
  - 4 SVG-Layer als `position: fixed` Komponenten
  - `scroll-timeline` Animation mit X-Translate (Parallax 5/20/45/80 % Speed)
  - `prefers-reduced-motion: reduce` → keine Animation
  - `@media (max-width: 640px)` → L4 weg, L1+L2 halbe Amplitude
  - `will-change: transform` auf jedem Layer-Container
- SVG-Assets (handgezeichnet, `feTurbulence + feDisplacementMap`-Filter optional):
  - `public/brand/bg/schwarzwald-tannen.svg` (L1)
  - `public/brand/bg/hochrhein-welle.svg` (L2)
  - `public/brand/bg/bad-saeckingen-skyline.svg` (L3 — Holzbruecke + Fridolinsmuenster + Haeuser-Linien)
  - `public/brand/bg/foreground-details/{sparrow,wegweiser-marktplatz,bench,windowbox}.svg` (L4)
- Pro Quartier konfigurierbar: `quarters.bg_motif_set` Spalte (Mig spaeter, fuer Pilot Hardcoded `bad-saeckingen`)

**Phase E — Glas-Tiles**
- `<GlassTile>` Component mit `@supports`-Wrapper
- Variante `cream` (rgba 0.40 background) und `green` (rgba 0.65 background)
- Top-Edge-Highlight + Inner-Bottom-Shadow als Pseudo-Elements
- Mobile blur 6 px, desktop 12 px (laut v7-Spec)
- `prefers-reduced-motion`: keine Aenderung
- Save-Data / low-power Detection (optional, graceful degrade auf v5 solid)

**Phase F — SOS Senior-only**
- `app/senior/layout.tsx` + `app/(senior)/layout.tsx` bestehende Notruf-Leiste **bleibt** unveraendert
- Visual-Polish auf Senior-Notruf-Leiste optional als separate Iteration (groessere Radius, Phone-Icon als Satellite-CTA Mastercard-Stil)

**Phase G — Bewegungs-Effekte**
- CSS Keyframes fuer Wind-Drift, Watercolor-Atmen, Skyline-Drift, Vogel-Flug
- Auf Layer-Container via `animation-name + animation-duration + animation-iteration-count`
- Vogel-Flug als `setTimeout` Trigger every 90s (kein Loop, fire-and-forget per Re-Append)
- `prefers-reduced-motion: reduce` deaktiviert A/B/C/E komplett

**Phase H — Tests + Verifikation**
- Vitest-Snapshots fuer neue Komponenten anpassen (`QuartierAppLogo`, `QuartierSpaziergang`, `GlassTile`)
- Bestehende Dashboard-Tests gruen halten (Class-Selektor-Anpassungen wo noetig)
- `npx tsc --noEmit` clean
- `npx eslint .` clean
- `npm run build` clean
- Browser-MCP Vor/Nach-Screenshots auf Mobile 375 + Tablet 768

**Phase I — Founder-Review + Merge**
- Branch-Preview oder lokaler Dev-Server-Test
- Founder klickt durch, gibt OK / "anders X"
- Bei OK: Merge nach `master`, Live-Deploy via `gh workflow run deploy.yml -R ClaudeTheo/nachbar-io --ref master`
- Auto-Memory + Vault-Update

### Option II — Erst v7 fertig generieren

Sobald Founder claude.ai-Tokens hat (nach Token-Regeneration oder Plan-Upgrade):
1. claude.design Tab `Dashboard polish v7.html` checken — ggf. unfertig, dann v7-Prompt re-senden
2. Founder Sichtpruefung: passt der maximale Glas-Effekt?
3. Wenn JA → Option I als Code-Job
4. Wenn NEIN → eine weitere Tweak-Iteration (z.B. Glas-Intensitaet reduziert, oder andere Details)

---

## Wichtige Founder-Entscheidungen (durable)

1. **Approach 1 "Druckwerk-Ruhe" verworfen** — zu nuechtern. Mastercard-Stil approved.
2. **Logo-Variante:** Haus-Cluster + Schwarzwald-Tanne + Aquarell (Banana Pro 2 v2 final). Wordmark Serif (NICHT Nunito) — eigene Marken-Typografie.
3. **SOS-Pill nur in Senior-App** (`app/senior/*` + `app/(senior)/*`). Standard-Dashboard `/dashboard` hat KEINE SOS-Pill — passt auch zum aktuellen LIVE-Code (der Standard-Dashboard hat aktuell auch keine prominente SOS-Pill).
4. **Quartier-Spaziergang-Hintergrund** mit 4 Parallax-Layern (Schwarzwald + Hochrhein + Skyline mit Holzbruecke + Fridolinsmuenster + Foreground-Details).
5. **5 Tageszeit-Phasen** mit 5-8 % Tint (10 % im v7-Showcase) — Morgen/Mittag/Nachmittag/Abend/Nacht. NIE dark-Mode — Senior-Augen brauchen helles BG.
6. **Glas-Effekt** auf ALLEN Tiles + Buttons (gegen urspruengliches DESIGN.md-Don't, aber bewusste Entscheidung). Performance-sicher (compositor-only, narrow-area only, `@supports`-Fallback).
7. **EmergencyBanner Modal** (FMEA FM-NB-02, RPZ 60→12) bleibt unangetastet — Compliance-Pflicht.

---

## Brand-DNA (LIVE in `app/globals.css` + DESIGN.md)

| Token | Hex | Verwendung |
|---|---|---|
| Petrol-Green | `#2E7D5E` | Primary CTA, Marken-Akzent |
| Quartier-Green-Light | `#4CAF87` | Hover/Active-Accent |
| Quartier-Green-Dark | `#245F49` | Pressed/Focus |
| Anthrazit | `#3D3D50` | Body, Headlines, Icons |
| Anthrazit-Light | `#56566E` | Sekundaer-Text |
| Warmwhite | `#FDF8F3` | Page-BG |
| Card / Lifted-Cream | `#FFFCF9` | Card-BG (heller als Page) |
| Lightgray | `#F5F0EB` | Sekundaer-BG, Inputs |
| Border | `#EBE5DD` | Standard-Border (beige) |
| Alert-Amber | `#F59E0B` | Warnungen, Tageszeit-Akzent (Morgen-Wash) |
| Emergency-Red | `#EF4444` | NUR Senior-SOS, NIE als Marketing-CTA |
| Rhine-Blue (NEU) | `#7AA0B8` | Hochrhein, Abend-Tint, Foreground-Details |
| Terracotta (NEU) | `#C26B43` | Hausdaecher im Logo, Akzent-Roof-Color |
| Cream-Pink (NEU) | `#E8D5C4` | Atmospheric Wash, Dawn-Light |

**Fonts:** Nunito (Headings) + Nunito Sans (Body) via `next/font/google` in `app/layout.tsx`. Logo-Wordmark **eigene Serif** (PNG-rendered, keine separate Font im Repo).

---

## Verbleibende Open Questions

- **Echtes Transparent-PNG fuer Logo**: alle Banana-Pro-Files sind RGBA mit Alpha=255 (opaque). Cream-BG matched Warmwhite — funktioniert visuell wie transparent solange Page-BG Warmwhite ist. Falls Logo auf Petrol-Green / Photo-BG noetig: nachgenerieren in Banana Pro 2 ODER Chroma-Key-Conversion via Sharp.
- **SVG-Version des Logos**: PNG funktioniert, aber SVG waere sauberer fuer beliebige Groessen + Dark-Mode-Vorbereitung. Optionen: Vectorizer.AI, Adobe Image Trace, claude.design SVG-Generierung mit Master als Referenz.
- **Mono Line-Art**: im Master-File enthalten, aber Crop war fehlerhaft. Re-crop mit besseren Koordinaten ODER neu generieren mit "line art only" Banana-Pro-Prompt.
- **`quarters.bg_motif_set` Migration**: pro Quartier konfigurierbare Hintergrund-Layer. Fuer Pilot Bad-Saeckingen hardcoded — Migration spaeter wenn 2. Quartier dazu kommt.
- **Glas-Performance auf Low-End-Mobile**: 30+ Glas-Elemente koennten ruckeln. Bei realer Geraete-Tests dies pruefen — bei Bedarf Save-Data + low-power Detection mit Graceful-Degrade auf v5 Solid.

---

## URLs zum Wiederfinden

| Was | URL |
|---|---|
| claude.design Projekt Dashboard | https://claude.ai/design/p/019e181a-1a40-70a0-9987-322141f90b7a |
| claude.design Design-System | https://claude.ai/design/p/019e1805-b160-7895-b090-fb8ef8a1146c |
| claude.design Logo-Varianten | https://claude.ai/design/p/019e1847-87ba-7548-806c-8bf03432f338 |
| getdesign.md Mastercard (Referenz-Stil) | https://getdesign.md/mastercard/design-md |
| awesome-claude-design Galerie | https://github.com/VoltAgent/awesome-claude-design |
| GitHub Branch | https://github.com/ClaudeTheo/nachbar-io/tree/feature/dashboard-visual-polish |

---

## Naechster Schritt fuer den Founder

1. **Tokens regenerieren lassen** (claude.ai Pro/Max-Account) — falls v7 noch sehen will
2. **ODER:** Direkt zur Integration gehen via Claude Code (kein claude.ai-Token noetig, nur Claude-Code-Budget)
3. **Bei Integration:** Naechste Session starten mit Read auf dieses Handover-File + `feature/dashboard-visual-polish` Branch checkout. Phase A starten.

---

Ende der Uebergabe.
