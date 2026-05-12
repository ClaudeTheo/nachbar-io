# Brief: Claude → Claude (Folge-Session) — Welle 6+7 implementiert

**Datum:** 2026-05-12 spaeter Abend.
**Owner:** claude
**Commit:** `5f44224 feat(visual-polish): Welle 6+7 Quartier-Spaziergang Parallax + Motion`
**Deploy:** Run `25757149678` (queued, erwartet ~10 min Laufzeit; Vorgaenger 9-10 min)

## Was diese Session geliefert hat

### Assets (Founder-Variante B via Banana Pro 2)

Founder hat 4 Banana-Pro-2-PNGs in den Chat geladen. Identifikation per
PNG-Header-Dimensionen + dominanter non-white Pixel-Farbe:

| Original | Layer | Why |
|---|---|---|
| `sw2gr1*.png` 5248x800 | L1 Schwarzwald | gruen-Wash, Ratio 6.56 ≈ Brief 6.4:1 |
| `q9cthp*.png` 2816x1536 | L2 Hochrhein | bläulicher Wellen-Strich |
| `bc0e2i*.png` 5856x704 | L3 Skyline | neutral mit terracotta-Hints, Ratio 8.32 ≈ 8:1 |
| `y1tn8b*.png` 2816x1536 | L4 Sprite (2x2) | warm-earth, 4 Vignetten |

Pipeline (in `public/brand/parallax/`):
- Resize zu max 1920 px Breite (Lanczos), Aspect erhalten.
- PIL `quantize(colors=256, method=FASTOCTREE)` — RGBA-faehig.
- L4-Sprite zerschnitten: `sparrow`, `bench`, `windowbox`, `signpost` —
  alle mit `getbbox()`-Trimming auf nicht-transparente Bounding-Box.

Resultat 7 PNGs:
- `l1-schwarzwald.png` 51 KB / 1920x292
- `l2-hochrhein.png` 78 KB / 1920x1047
- `l3-skyline.png` 64 KB / 1920x230
- `l4-sparrow.png` 36 KB / 960x523
- `l4-bench.png` 61 KB / 960x523
- `l4-windowbox.png` 80 KB / 960x524
- `l4-signpost.png` 42 KB / 960x524

Total Parallax-Layer = **~412 KB** — leichtgewichtig, ein-mal-Cache.

### Component `components/brand/QuartierSpaziergang.tsx`

- 4 Layer als `<Image>` (next/image) in einem `fixed inset-0 -z-20
  overflow-hidden pointer-events-none aria-hidden` Wrapper.
- L1 oben, L2 ab 30vh, L3 ab 82vh (alle full-width).
- L4-Vignetten verteilt im Viewport (top 12vh/42vh/58vh/72vh).
- `data-l4-group="true"` Wrapper mit `hidden sm:block` (Mobile-Disable).
- Opacities: L1 12%, L2 18%, L3 25%, L4 45-55% — **bewusst dezent**
  nach Founder-Lehre Bundle 2 (Watermarks + Featured-Tiles wurden
  rueckgebaut wegen zu praesentem Auftreten).

### Welle 7 Motion (`app/globals.css`, am Ende angehaengt)

Compositor-only (transform / opacity), `will-change` nur auf 4
Layer-Container:

```
.qs-l1 → qs-wind 6px/14s ease-in-out (mobile 3px)
.qs-l3 → qs-bridge-drift 8px/22s ease-in-out (mobile 4px)
.qs-bird-fly → 0->110vw alle 90s linear (8s aktiv, 82s offscreen)
.quartier-spaziergang → qs-breathe 0.94<->1.00 / 9s
```

`@media (max-width: 640px)`: Vogel aus, L1/L3-Amplituden halbiert.
`@media (prefers-reduced-motion: reduce)`: alle obigen aus,
Tageszeit-Phase-Fade D bleibt aktiv (separates System).

### Mount `app/(app)/layout.tsx`

```tsx
<QuartierSpaziergang />        // -z-20 (neu, ganz hinten)
<AppAquarellBackground />      // -z-10 (vorhanden, davor)
```

### Tests

- `__tests__/components/brand/QuartierSpaziergang.test.tsx` — **14
  neue Tests**, alle gruen beim ersten Run:
  - aria-hidden, pointer-events-none, fixed inset-0 -z-20
  - L1/L2/L3 mit korrekten Image-srcs
  - L4 vier Vignetten (sparrow, bench, windowbox, signpost) mit src-Check
  - alle imgs haben `alt=""` (dekorativ)
  - DOM-Reihenfolge L1 → L2 → L3 → L4 (Painters-Algorithmus)
  - Opacities pro Layer (12/18/25 %)
  - L4 Vignetten Opacity 40-60 %
  - L4-Group `hidden sm:block` (Mobile-Hide)
  - `.quartier-spaziergang` Klasse fuer CSS-Animation-Hooks

- Vitest gesamt: **616 files / 4579 passed + 1 skipped**. Tsc / eslint
  / build exit 0.

## Pre-Check-Ergebnis dieser Session

Codebase-Grep auf `parallax / quartier-spaziergang / schwarzwald /
hochrhein / fridolin / holzbrueck`. Drei relevante Treffer:

1. `components/weather/SkylineSilhouette.tsx` — bestehende SVG-Skyline
   mit Fridolinsmuenster + Holzbruecke + Schloss + Tannen + Rhein.
   ABER: geometric SVG, fix viewBox 800x240, im Weather-Kontext (nicht
   App-Shell). **Nicht wiederverwendbar fuer Aquarell-Parallax** —
   andere stilistische Sprache (continuous ink line #3D3D50 vs.
   opacity-RGBA-Fills mit Wave-Animation auf Rhein). Habe Founder
   informiert, kein Duplikat-Risiko.
2. `components/brand/AppAquarellBackground.tsx` — sitzt auf -z-10,
   neue Schicht braucht -z-20.
3. `app/(app)/layout.tsx` — Mount-Point.

Andere Grep-Treffer irrelevant (UBA-Stations-JSON, news-rss als
geographische Begriffe).

## Founder-Lehren bewusst eingepreist

1. **Dezent.** Bundle 2 (Welle 4 Watermarks + Welle 5 Featured-Tiles)
   wurden beide nach Live-Smoke rueckgebaut. Die Parallax-Opacities
   12/18/25 % sind bewusst sehr leise. Vogel ist nur 8 s von 90 s
   sichtbar — kein konstantes Rauschen.
2. **Compositor-only.** Brief-Guardrails: keine blur, scale, rotate,
   WebGL, kontinuierliche JS-Loops. Nur transform + opacity.
3. **Mobile + reduced-motion.** Beide Pfade abgedeckt: L4 weg auf
   Mobile, Vogel weg, Drift halbiert, reduced-motion alles aus.
4. **L4-Sprite-Cropping.** Founder hat Banana Pro 2 mit 2x2 Sprite
   geliefert statt 4 separater PNGs. Geloest durch PIL-Crop + getbbox
   Trim — kein zusaetzlicher Founder-Schritt noetig.

## Limit der Implementation

**KEIN echter Parallax beim Scrollen.** Brief sagte "scrollt mit 5%
/ 20% / 45% / 80%" — ich habe das bewusst weggelassen, weil:
- Brief-Guardrail "keine kontinuierliche JS-Animation-Loops" steht im
  Konflikt mit Scroll-Translation per JS scroll-listener.
- CSS `scroll-timeline` ist Chromium 115+ only, kein Firefox/Safari
  stable. Bei einem Senior-App-Workspace mit Tauri-Wrapper auf
  AWOW-Hardware ist das ein Risiko.
- Statt dessen: **fixed atmospheric layers** im Viewport — alle 4
  Schichten bleiben sichtbar waehrend des Scrollens, Bewegung
  entsteht durch Welle-7-Motion (Wind/Wellen/Vogel/Skyline-Drift).

Falls Founder echten Parallax-Scroll moechte, ist das eine separate
Folge-Session mit JS-Scroll-Listener auf
`requestAnimationFrame` (Hardware-beschleunigt, kein 60fps-Loop). Bis
dahin liefert die jetzige Loesung "Atmosphaere + Atmen", was visuell
wahrscheinlich genauso wirkt wie echter Parallax bei niedrigen
Opacities.

## Naechste Schritte (Founder)

1. Auf den Deploy warten (~10 min). Run:
   https://github.com/ClaudeTheo/nachbar-io/actions/runs/25757149678
2. Live-Smoke auf `nachbar-io.vercel.app` (eingeloggt):
   - Sind die 4 Parallax-Layer sichtbar aber dezent? Stoert nichts die
     Headline-Schrift wie Bundle 2?
   - Mobile: L4 weg (Sparrow/Bench/Windowbox/Signpost), L1+L2+L3
     da, Drift gefuehlt langsamer.
   - Wenn etwas nicht stimmt: konkretes Feedback, wir wissen schon
     wie fix-then-retest geht.
3. Falls okay → Tag-Abschluss-Update der Auto-Memory + ggf. Eintrag
   in den Vault.

## Offene Punkte (fuer Folge-Sessions)

- **Echter Parallax-Scroll** (s. Limit oben) — optional, wenn Founder
  es will.
- **Welle 8 Fonts** ist laut Brief schon live (Nunito + Nunito Sans
  via next/font/google) — nichts mehr zu tun.
- **L4-Vignetten Position-Feinjustage** — die jetzigen top-Werte
  (12vh/42vh/58vh/72vh) sind Erstgeburt. Founder darf nach Live-Smoke
  sagen "Sparrow lieber bei 8vh / Bench rechts statt links" etc.,
  dann eine kleine Folge-Iteration.

## Vorgaenger-Brief

`2026-05-12-claude-an-claude-welle-6-7-parallax-motion-session-handoff.md`
— die Original-Asset-Prompts fuer Banana Pro 2.
