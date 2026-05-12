# Brief: Claude → Claude (neue Session) — Welle 6+7 Parallax + Motion

**Datum:** 2026-05-12 abends (nach Bundle 1+2, Dashboard-Karte, Caregiver-Pending alles LIVE).
**Owner:** claude

## Aktueller Stand (LIVE)

- master == origin == Live == `818e753 feat(dashboard-map): Care-Check-in-Status fuer Caregiver (Founder-C / Variante X)`.
- Letzter erfolgreicher Deploy: `25752868239`.
- Vitest gesamt: **4576/4577 passed** (1 skipped, 0 fails — gelegentlich 1-2 Flaky in `__tests__/app/mitessen/page.test.tsx` durch React-DOM-Hydration `window is not defined`, Re-Run gruen).
- Build: success.
- tsc / lint: Exit 0.

## Was in der heutigen Session erledigt wurde (Visual-Polish v7 Dashboard polish)

Quelle: claude.design v7 Handover (gefetcht via `https://api.anthropic.com/v1/design/h/6xVIfy9cxSP2jMsxXo8Lcw`, 8 v7-Wellen + Tageszeit-Phasen + Parallax + Motion).

### Bundle 1 — `ed8e7c2`

- **Welle 2 — NavPill** (`components/brand/NavPill.tsx`): Floating Top-Header mit Aquarell-Symbol links und Avatar-Button rechts. Cream-Glas-BG (warmwhite/85), backdrop-blur, weicher Schatten 0 4px 24px rgba(61,61,80,0.06). z-30 ueber Tageszeit-Tint-Overlay. Senior-Pfad nutzt diese Pill bewusst nicht.
- **Welle 3 — BrandFooter** (`components/brand/BrandFooter.tsx`): Warm-dunkler Footer #2a2a38 mit Eyebrow "· EIN DIGITALES QUARTIER", Magazin-Sig "Ein digitales Quartier für Bad Säckingen.", grosses Logo-Lockup, Meta-Zeile (v{VERSION} · Datenschutz · Impressum · AGB). Full-bleed CSS-Trick (`relative left-1/2 right-1/2 -mx-[50vw] w-screen`). Nur im Dashboard eingesetzt.

### Logo-Hotfix — `20c2511`

Founder: "es sollte keine schrift haben Keine QuartierApp-Beschriftung". `variant="full"` -> `variant="symbol"` auf 5 Pages + NavPill-Wordmark-Text entfernt. Magazin-Sig "Ein digitales Quartier..." im BrandFooter bewusst erhalten (nicht der Logo-Wordmark, sondern editorial copy).

### Bundle 2 — `23f120c` (gefolgt von `f84d95a` Watermarks-Rueckbau)

- **Welle 4 — Ghost-Watermarks**: GEMEINSCHAFT/PFLEGE/STADTTEIL/ENTDECKEN als Cream-on-Cream Riesen-Worte pro Kategorie. Founder: "komisch schrift im hintergrund in beige" → in `f84d95a` wieder entfernt. CATEGORY_FEATURED_HREF-Mapping bleibt aber drin.
- **Welle 5 — Featured-Tiles** (BLEIBT): Pro Kategorie ein grosses gruenes Featured-Tile (col-span-4, min-h-120px, glass-tile-green). Founder-Defaults: `/board` (Nachbarschaft "Brett"), `/my-day` (Hilfe&Pflege "Mein Tag"), `/map` (Quartier-Info "Karte"). Inhalt: 48px Icon-Well + Eyebrow "Heute im Quartier" + Title + Arrow-Chevron rechts.

### Hotfix Kontrast + Eyebrow — `4f38cc3`

- App-Shell-Aquarell-Opacity 0.15 → **0.06** (Founder: Headline-Schrift hatte Kontrast-Konflikt mit Tanne/Sonne).
- Eyebrow auf 4 Pages: `currentQuarter.city` zuerst (statt `name`) → zeigt jetzt "BAD SÄCKINGEN" statt "PURKERSDORFER/SANARY/REBBERG". Mit echtem Ä via Unicode (kein "AE"-Ersatz).

### Dashboard-Karte Step 1 — `23352b1`

Founder: "ich häte gerne diese karte auf der Sartseite der App direkt unter Guten Abend Thomas und über HEute Bad Säckingen". MapThumbnail eingebaut zwischen Hero/Caregivers und "Heute"-Section. previewPoints aus useMapStatuses (Pre-Check fand alles vorhanden — gleicher Hook wie /quartier-info).

### Dashboard-Karte Step 2 — `7678a73`

Founder: "alle drei" (SOS, Hilfe-Anfrage, Care-Check-in). MapThumbnail um Color-Pins erweitert (LampColor-Mapping):
- red = SOS / kritischer Alert (`alerts.is_emergency`)
- yellow = Hilfe-Anfrage (`help_requests.type='need' active`) ODER gelber Alert
- orange = Paket-Annahme heute (`paketannahme`)
- blue = Urlaubsmodus (`vacation_modes`)
- green = Default

Mini-Legende unter der Karte: gruen "Okay" / gelb "Hilfe gesucht" / rot "Notfall" (Orange/Blau nicht erklaert um Rauschen zu reduzieren).

### Dashboard-Karte Step 3 — `818e753`

Founder: "Die Check-in-Meldungen sollte nur Angehoerige Pfleger oder andere berechtigte sehen". Variante X — Caregiver-only:
- Neuer Helper `lib/care/caregiver-pending-checkins.ts` mit `loadCaregiverPendingCheckinHouseholds(supabase, userId, today)`.
  - Aktive caregiver_links des Users laden (revoked_at IS NULL)
  - care_checkins fuer diese Senioren heute mit Status `pending`/`reminded` (nicht `missed` — eskalierte gehen via alerts -> red).
  - household_members joinen → household_ids zurueck.
- Im Dashboard: useEffect lädt das Set, previewPoints ueberlagert baseStatus="green" → "yellow" nur fuer diese household_ids.
- RLS auf `caregiver_links` + `care_checkins` ist zweite Schutzschicht: andere Nutzer bekommen leeres Result.
- 4/4 neue Helper-Tests.

## Tageszeit-Tint, Fonts, App-Shell-Aquarell — bereits vor heutiger Session live

- **Tageszeit-Tint** (Welle 1) komplett umgesetzt vor dieser Session: `components/PhaseDetector.tsx` + 5-Phasen-CSS `[data-phase="..."]` in `app/globals.css:152-200` + body::before Overlay + 60s-Interval. **NICHT neu bauen.**
- **Nunito + Nunito Sans** (Welle 8 fonts) bereits geladen via `next/font/google` in `app/layout.tsx:12+19`.
- **App-Shell-Aquarell**: `components/brand/AppAquarellBackground.tsx` mit `/brand/quartierapp-symbol.png`, `object-contain object-top`, jetzt Opacity 0.06 (siehe Hotfix oben).
- **Landing-Foto**: `app/page.tsx` hat zwei Layer (Foto-BG `landing-bg-foto` + Aquarell-Symbol darueber). Founder 2026-05-12: "Die Landingpage gefaellt mir so" — nicht aendern.

## Offene Wellen (fuer diese neue Session)

### Welle 6 — Quartier-Spaziergang Parallax

Aus claude.design v7-Chat (Iteration 3):
- **L1 Schwarzwald-Fir-Silhouette**: Petrol-Gruen-Aquarell-Wash, opacity ~12%, scrollt mit 5% (fast still). Sitzt am oberen Rand, fades downward.
- **L2 Hochrhein**: Wavy Ink-Line in Rhine-Blau #7AA0B8, opacity ~18%, scrollt mit 20%. Drifts horizontal bei ~40% Hoehe.
- **L3 Bad-Saeckingen-Skyline**: Continuous Ink-Line mit Holzbruecke (covered wooden bridge) unten links + Fridolinsmuenster bell-tower rechts + peaked-roof houses, opacity ~25%, scrollt mit 45%.
- **L4 Foreground Details**: Sparrow (Hero-naehe), Bench (Quartier-Info-Naehe), Windowbox (Schnellzugriffe-naehe), Chalk-Signpost "→ Marktplatz" (Nachbarschaft-naehe). 30-60px, opacity 40-60%, scrollt mit 80%. **Mobile (≤640px): L4 disabled**.

CSS-Animation per scroll-timeline ODER fixed-position + translateX-Drift. **Pure transform/opacity** (kein blur/scale/rotate). prefers-reduced-motion: disabled.

### Welle 7 — Compositor-Motion

- **A) Wind-Drift auf L1**: max 6px translateX, 14s ease-in-out infinite (3px mobile).
- **B) Vogel-Flug**: Sparrow translateX 0→120vw, 8s, fire-and-forget alle 90s. Mobile + prefers-reduced-motion: disabled.
- **C) Watercolor-Breathe**: opacity 0.94↔1.00, 9s, auf Featured-Tile-BGs + Logo.
- **D) Tageszeit-Tint Phase-Fade**: bereits live (transition 1500ms ease, kein Loop).
- **E) Holzbruecke L3-Drift**: 8px translateX, 22s ease-in-out infinite (4px mobile).

Guardrails:
- `will-change: transform` nur auf 4 Layer-Container, nirgendwo sonst.
- Keine Blur-Filter auf grossen Flaechen.
- Keine WebGL / Canvas.
- Keine kontinuierliche JS-Animation-Loops.
- `@media (max-width: 640px)`: L4 + B disabled, L1+L2-Amplitude halbiert.
- `@media (prefers-reduced-motion: reduce)`: A, B, C, E off. D ok.

## Asset-Generierung — VOR Implementation noetig

Founder hat **Variante B** gewaehlt: Real-Aquarell-Assets via claude.design / Banana Pro 2. Ich generiere keine Bilder, sondern bereite **Prompt-Texte** vor, Founder generiert in claude.ai/design (Browser) und uebergibt die PNG-/SVG-Dateien.

**Prompt-Vorschlaege fuer claude.design oder Banana Pro 2:**

### L1 — Schwarzwald-Tannen-Silhouette

```
Hand-painted watercolor silhouette of Black Forest fir trees, low horizon,
viewed from afar. Pale petrol-green wash (#2E7D5E at low saturation),
cream paper background (#FDF8F3). Soft cream fade-out at the bottom edge
so it blends seamlessly into the page. Painterly ink-and-watercolor style,
NO sharp edges, NO photo-realism. Horizontal banner format 1920x300 px.
Single layer, transparent PNG with cream feathering at edges.
```

### L2 — Hochrhein-Wellenlinie

```
Calligraphy-style wavy ink line representing the Hochrhein river. Dusty
Rhine-blue color (#7AA0B8) at low saturation. Three subtle parallel wave
strokes drifting horizontally across the canvas. Transparent background.
Brush-stroke aesthetic, hand-drawn feel, gentle imperfections. Horizontal
banner format 1920x120 px. Transparent PNG.
```

### L3 — Bad-Saeckingen-Skyline mit Fridolinsmuenster + Holzbruecke

```
Continuous hand-drawn ink-line illustration showing the silhouette of
Bad Saeckingen on the Hochrhein. Key features visible from left to
right: the covered wooden bridge "Holzbruecke" with low-pitched
shingle roof on the lower-left third, a row of small Black-Forest
houses with peaked terracotta-tile roofs in the middle, and the bell-
tower of the Fridolinsmuenster church rising on the right side. Single
continuous anthracite ink line color (#3D3D50), 1px stroke weight, very
faint terracotta wash hints in the roof areas. Horizontal banner format
1920x240 px. Transparent PNG.
```

### L4 — Foreground Details (4 Mini-Illustrationen)

```
Four separate small hand-painted ink-and-watercolor vignettes, each in
the same Black-Forest village storybook style (Quentin Blake meets
German Apotheken-Umschau):
1. A small sparrow in flight, ~60x40 px, soft brown wash
2. A wooden park bench with green wash, ~80x50 px, simple side profile
3. A terracotta-clay window box of red geraniums, ~50x40 px
4. A chalk-handwritten wooden signpost "→ Marktplatz" in anthracite,
   ~80x50 px
Each as a separate transparent PNG. Opacity-ready (will be rendered at
40-60% on the page).
```

Founder generiert diese 4 Assets in claude.ai/design, schickt mir die Dateien (PNGs oder SVGs), ich lege sie unter `public/brand/parallax/` ab und implementiere Welle 6 dahin.

## Implementation-Reihenfolge fuer neue Session

1. **Pre-Check (Pflicht):** `Grep -rln "parallax|quartier-spaziergang|schwarzwald|hochrhein|fridolin|holzbrueck"` codebase-weit. **Erwartet:** keine Treffer (alle 4 Layer fehlen, bestaetigt durch Pre-Check 2026-05-12).
2. **Assets ablegen:** Founder hat die generierten Assets uebergeben (oder noch nicht — dann erst nachfragen).
3. **Parallax-Component schreiben** (`components/brand/QuartierSpaziergang.tsx`):
   - 4 fixed-Layer mit z-Index hinter App-Shell-Aquarell (-z-20 oder so).
   - Scroll-Translation per `scroll-timeline` (CSS) ODER `position: sticky` mit translateY-Math.
   - Pro Layer ein Background-Image aus public/brand/parallax/{l1,l2,l3,l4-*}.png.
4. **Mount im `(app)/layout.tsx`**: Component zwischen body und AppAquarellBackground (hinter dem Symbol-Hintergrund).
5. **Tests:** Component-Tests fuer Layer-Existenz + DOM-Order + `aria-hidden`.
6. **Welle 7 — Motion:** CSS-Animations in `app/globals.css` oder in der Component selbst. Compositor-only (transform/opacity). prefers-reduced-motion. Mobile-Disable von L4 + Sparrow.
7. **Verifikation:** tsc / lint / vitest / build.
8. **Live-Smoke**: Founder-eingeloggter Visual-Check.

## Rote Zone (unveraendert)

- Push autonom (Variante A) OK wenn Tests gruen.
- Mig-Apply auf Prod: NEIN.
- Vercel-Env/Provider/Geld: NEIN.
- Asset-Generierung in claude.design / Banana Pro 2: **NUR Founder** (ich bereite Prompts vor).

## Wichtige Pre-Check-Lehren aus dieser Session

1. **claude.design v7 hatte schon Code-Implementierungen.** PhaseDetector, glass-tile-CSS, MapThumbnail, useMapStatuses, mergeMapStatus — alles bereits im Repo. Pre-Check sparte 6+ Stunden Doppel-Arbeit.
2. **Care-Privacy-Pruefung war kritisch.** Naive Implementation von "Care-Check-in-Status auf der Karte" waere DSGVO-Verstoss gewesen. Variante X (Caregiver-only) war die einzige saubere Loesung.
3. **MapThumbnail hat eigenes <Link href="/map">.** Wenn die Komponente in einem weiteren Link gewrappt wird → nested anchor invalid HTML. Im Dashboard musste der Wrapper-Link raus.
4. **Junctions im Worktree erstellen** funktioniert ueber Batch-File (cmd-Aufruf via Bash hat Pfad-Quotierungs-Probleme; PowerShell hatte Permission-Issues). Lesson learned: bei mklink immer ueber `.bat` aufrufen.

## Founder-Identitaet (Reminder)

- E-Mail: thomasth@gmx.de
- User-ID Prod-DB: dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd
- Adresse: Purkersdorfer Strasse 35, 79713 Bad Säckingen
- Pilot-Quartier: `ee6cfcab-f615-47cd-afe7-808a27cb584b` slug `bad-saeckingen-pilot`

## Vorgaenger-Briefe dieser Tagessession

1. `2026-05-12-claude-an-claude-aquarell-position-stadt-baeume.md`
2. `2026-05-12-claude-an-claude-aquarell-foto-live-folgewelle.md`
3. `2026-05-12-claude-an-claude-foto-landing-variante-c.md`
4. `2026-05-12-claude-an-claude-welle-a1-a2-a3-app-polish.md`
5. **dieser Brief** — Welle 6+7 Parallax + Motion Session-Handover
