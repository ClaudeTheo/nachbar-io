# Brief: Claude → Codex — Tag-Uebergabe 2026-05-13

**Datum:** 2026-05-13 morgen.
**Owner heute:** codex.
**Letzter Sender:** claude (Welle 6+7 Quartier-Spaziergang LIVE + Revert in einer Nacht).

## Aktueller Stand (LIVE)

- master == origin == LIVE == `89e0917 revert(visual-polish): Welle 6+7 Quartier-Spaziergang raus`.
- Deploy Run [25780530302](https://github.com/ClaudeTheo/nachbar-io/actions/runs/25780530302) — alle 3 Jobs gruen.
- HTTP 200 auf `https://nachbar-io.vercel.app/`. HTTP 404 auf `/brand/parallax/l1-schwarzwald.png` (bestaetigt: Assets sind weg).
- Vitest: **4575 passed + 1 skipped + 1 known-flaky** (`__tests__/app/mitessen/page.test.tsx` — React-DOM-Hydration `window is not defined`, Re-Run gruen → 8/8 OK).
- tsc / eslint / build: Exit 0.

Effektiv ist Live also der Pass-51-Stand wie vor der Welle-6+7-Session — alles was zwischen `2002cb1` und `5f44224` nicht-revert-bar war (Handover-Briefe `64b5814`, `33e26e5`) bleibt als Doku im Repo, aber keine Code-Aenderung mehr aktiv.

## Was gestern Abend (2026-05-12) passiert ist

### 1. Welle 6+7 implementiert + deployed

Commit `5f44224 feat(visual-polish): Welle 6+7 Quartier-Spaziergang Parallax + Motion`. Inhalt:
- Component `components/brand/QuartierSpaziergang.tsx` mit 4 fixed-Layern hinter dem App-Shell-Aquarell (-z-20 hinter dem bestehenden -z-10 von `AppAquarellBackground`).
- L1 Schwarzwald-Tannen oben, L2 Hochrhein-Wellen Mitte (~30 vh), L3 Bad-Saeckingen-Skyline mit Holzbruecke + Fridolinsmuenster unten (~82 vh), L4 vier Foreground-Vignetten (Sparrow, Bench, Windowbox, Marktplatz-Signpost; mobile <=640 px hidden).
- Welle 7 Motion via CSS-Animation (compositor-only):
  - `.qs-l1 → qs-wind 6 px / 14 s ease-in-out`
  - `.qs-l3 → qs-bridge-drift 8 px / 22 s ease-in-out`
  - `.qs-bird-fly → 0 → 110 vw alle 90 s linear` (8 s aktiv, 82 s offscreen)
  - `.quartier-spaziergang → qs-breathe 0.94 ↔ 1.00 / 9 s`
- Mobile-Disable: Vogel-Flug aus, Drift-Amplituden halbiert.
- `@media (prefers-reduced-motion: reduce)`: alle Compositor-Animations aus, Tageszeit-Phase-Fade D bleibt.
- 14 neue Tests in `__tests__/components/brand/QuartierSpaziergang.test.tsx`, alle direkt gruen.
- 7 PNGs in `public/brand/parallax/` (5.5 MB Banana-Pro-2-Originale → 412 KB nach Resize 1920 w + PIL FASTOCTREE-Quantize 256 Colors + L4-Sprite-Cropping in 4 Einzel-Vignetten).

Deployed Run [25757149678](https://github.com/ClaudeTheo/nachbar-io/actions/runs/25757149678).

### 2. Founder-Live-Smoke negativ → komplett-Revert

Founder-Wortlaut: *"Die letzte kleine Aenderung ist nicht gut gegangen. Entgegen unserer Vermutung sind diese Bilder nicht transparent. Das eine sieht ganz unten mit dem langen Baum und mit einem langen Wald, das sieht ganz gut aus. Alle anderen finde ich zu grauchen. Kannst du das bitte wieder rueckgaengig machen?"*

Commit `89e0917 revert(visual-polish): Welle 6+7 Quartier-Spaziergang raus` — 11 Files / 453 deletions. Deployed Run `25780530302`.

## Diagnose des Schiefgangs

Die 4 Banana-Pro-2-PNGs sahen im Chat-Preview transparent aus (Schachbrett-Pattern hinter den Aquarell-Vignetten). Das war aber nur das Browser-Image-Viewer-Render. Tatsaechlich hatten die Bilder einen **cream / weissen Hintergrund einbaeckt**, nicht echte Alpha-Transparenz.

Gegen unseren cream App-BG (`#fdf8f3 --background`) hoben sich besonders L2 Hochrhein (1920×1047 px) und L4-Sprite-Bereiche als rechteckige graue Felder ab — daher "graupig". L1 Schwarzwald (1920×292 px, schmaler Streifen) fiel weniger auf weil die petrol-gruenen Tannen den weissen BG visuell uebermalen — daher "das eine sieht ganz gut aus".

## Pre-Check-Lehre fuer dich (Codex)

**Vor jedem Bilder-Asset-Workflow zuerst Alpha-Stichprobe machen.** Banana Pro 2 / Gemini liefert oft "transparent-aussehende" PNGs, die in Wirklichkeit RGBA mit `alpha=255` und cream-Background sind. Pruef-Snippet:

```python
from PIL import Image
img = Image.open(path).convert('RGBA')
corners = [
    img.getpixel((0, 0)),
    img.getpixel((img.width - 1, 0)),
    img.getpixel((0, img.height - 1)),
    img.getpixel((img.width - 1, img.height - 1)),
]
print('corner alphas:', [c[3] for c in corners])
# Alle == 255 → opaque, nicht transparent.
# Mindestens eines == 0 → echte Transparenz vorhanden.
```

Wenn opaque mit cream / weissem BG kommt → entweder neuer Asset-Gen-Schritt mit explizitem Prompt-Suffix "transparent background, alpha-isolated, no white fill, PNG-32 RGBA", oder Background-Removal-Pipeline (`rembg`, `pillow-heif`, Photoshop). NIE einfach annehmen "Banana Pro liefert transparent".

## Offen / Founder-Optionen fuer heute

Founder hat in der Antwort 3 Optionen explizit genannt, noch keine Entscheidung:

1. **Tag-Abschluss bei Pass-51-Stand.** Visual-Polish v7 bleibt bei Welle 1-3 LIVE (Tageszeit-Tint, NavPill, BrandFooter). Welle 4 (Watermarks) + Welle 5 (Featured-Tiles) + Welle 6+7 alle rueckgebaut. Founder hat heute schon drei Rueckbau-Runden gemacht — moeglich dass er den ruhigen Stand bewusst behalten will. **Default-Erwartung bei mir.**

2. **Nur L1 zurueck als minimales Element.** Tannen-Asset gefaellt ihm. Konkret: sehr leiser horizontaler Streifen direkt unter dem NavPill (oder ganz oben am Header), mit `mix-blend-mode: multiply` + opacity ~8-10 %, damit der weisse BG gegen cream `#fdf8f3` quasi verschwindet. Nutzt das bestehende `l1-schwarzwald.png` Asset (im git history bei `5f44224` — kann via `git show 5f44224:public/brand/parallax/l1-schwarzwald.png > path` rausgeholt werden). ~30 min Arbeit inkl. Tests.

3. **Neue Assets mit echter Transparenz.** Founder regeneriert in claude.design / Banana Pro 2 mit explizitem Transparenz-Prompt. Dann komplette Welle 6+7 sauber neu bauen mit Alpha-Verifikation als ersten Pipeline-Schritt. ~2-3 h.

**Warte auf Founder-Entscheidung bevor du anfaengst.** Frag ihn falls er nicht von alleine antwortet — heute war ein hin und her.

## Kontext-Files fuer dich

Lies in dieser Reihenfolge:

1. **Diese Datei** — Tag-Stand und Optionen.
2. `docs/plans/handoff/2026-05-12-claude-an-claude-welle-6-7-parallax-motion-session-handoff.md` — Original-Plan mit 4 Asset-Prompts fuer Banana Pro 2 (claude.design v7 Output, ist die Vorlage falls Option 3 gewaehlt wird).
3. `docs/plans/handoff/2026-05-12-claude-an-claude-welle-6-7-parallax-motion-implemented.md` — Implementation-Details (jetzt obsolet, aber beschreibt die Component-Architektur die du brauchst falls Option 2 oder 3).
4. `docs/plans/handoff/2026-05-12-claude-an-claude-welle-a1-a2-a3-app-polish.md` — Welle A1/A2/A3 die VOR Welle 6+7 LIVE gingen (Magazin-Hero etc.).
5. `CLAUDE.md` + `.claude/rules/pre-check.md` — die uebliche Pre-Check-Pflicht.

## Falls Option 2 (nur L1 zurueck) — konkreter Plan

```
1. Pre-Check: Grep "mix-blend-mode" + "qs-l1" + "QuartierSpaziergang"
   im Repo. Erwartung: keine Treffer ausser in den 3 Handover-Briefen.
2. Asset wieder rein:
   cd nachbar-io
   git show 5f44224:public/brand/parallax/l1-schwarzwald.png \
     > public/brand/parallax/l1-schwarzwald.png
3. Test schreiben (TDD red):
   __tests__/components/brand/AppAquarellBackground.test.tsx ergaenzen
   ODER neue Mini-Component nur fuer L1 (sauberer fuer spaeter).
4. Mini-Component oder Inline in (app)/layout.tsx:
   - fixed top-0 left-0 w-full
   - mix-blend-mode: multiply (CSS, kein Tailwind-default — ggf.
     style={{mixBlendMode:'multiply'}})
   - opacity 0.08-0.10
   - z-Index hinter AppAquarellBackground (-z-20)
   - aria-hidden, pointer-events-none
   - next/image mit width 1920, height 292
5. Verifikation: tsc / lint / vitest / build.
6. Push autonom (Variante A) + Deploy via workflow_dispatch.
7. Founder-Live-Smoke — Achtung: er hat heute 3× rueckgebaut, also
   sehr konservativ. Lieber MEHR Subtilitaet (opacity 0.06 statt 0.10).
```

## Falls Option 3 (neue Assets) — konkreter Plan

```
1. Pre-Check: public/brand/parallax/ sollte leer / nicht-existent
   sein (Revert hat das geleert).
2. Asset-Uebergabe von Founder abwarten. Erwartung: er liefert
   7 PNGs (oder 4 wenn er kein L4-Sprite-Split macht).
3. ALPHA-CHECK als ERSTER Schritt (s. Python-Snippet oben). Wenn
   alle opaque → zurueck zu Founder mit der Bitte um Re-Gen mit
   explizitem Transparenz-Prompt. Nicht mit weissem BG arbeiten.
4. Wenn echte Transparenz → Resize 1920 w + Quantize wie gehabt.
5. Component, Motion, Mount, Tests — wie in
   `2026-05-12-claude-an-claude-welle-6-7-parallax-motion-implemented.md`
   beschrieben. Der CSS-Animation-Block fuer globals.css ist dort
   1:1 kopierbar. Component-File auch.
6. Wichtig: Founder hat klar gemacht "dezent, ruhig". Opacities
   bleiben bei 12 / 18 / 25 % fuer L1/L2/L3, L4 bei 40-55 %.
7. Push + Deploy + Live-Smoke wie ueblich.
```

## Rote Zone (unveraendert)

- Push autonom OK (Variante A — Founder-Bestaetigung gilt fort).
- Mig-Apply auf Prod: NEIN ohne Founder-Go.
- Vercel-Env / Provider-Live / Geld: NEIN.
- Asset-Generierung in claude.design / Banana Pro 2: NUR Founder.

## Durable Facts (fuer schnellen Zugriff)

- **Founder:** Thomas Theobald, `thomasth@gmx.de`, User-ID Prod-DB `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd`, Purkersdorfer Strasse 35, 79713 Bad Saeckingen.
- **Pilot-Quartier-ID:** `ee6cfcab-f615-47cd-afe7-808a27cb584b` (Bad Saeckingen) slug `bad-saeckingen-pilot`.
- **Founder-Household-ID:** `62ab2b52-...` (Purkersdorfer 35).
- **Live-URL:** `https://nachbar-io.vercel.app` (Closed Pilot, ueber NextAuth-Magic-Link).
- **Deploy-Workflow:** nur `workflow_dispatch` — Trigger via `gh workflow run "Deploy to Vercel Production" --ref master`.
- **App-Aquarell (Welle 0, bereits LIVE):** `components/brand/AppAquarellBackground.tsx`, sitzt auf `-z-10`, opacity 0.06, Asset `/brand/quartierapp-symbol.png`. Falls L1 zurueckkommt: das soll dahinter sitzen (`-z-20`), nicht ersetzen.
- **NavPill (Welle 2, LIVE):** `components/brand/NavPill.tsx`, z-30, top-3.
- **BrandFooter (Welle 3, LIVE):** `components/brand/BrandFooter.tsx`, nur im Dashboard.
- **Tageszeit-Tint (Welle 1, LIVE):** `components/PhaseDetector.tsx` + `[data-phase=...]` CSS in `app/globals.css:152-200`.

## Tag-Plan-Vorschlag fuer dich heute

1. Diese Datei lesen (5 min).
2. Auto-Memory `~/.claude/projects/.../memory/MEMORY.md` lesen — speziell Pass-51-Eintrag und Founder-Gates (5 min).
3. Vault `firmen-gedaechtnis/06_KI-Zusammenarbeit/` Letzte Briefe von Founder oder Claude scannen — gibt Hinweise zur Tages-Prioritaet (10 min).
4. Frag Founder gezielt: *"Option 1 / 2 / 3 zu Welle 6+7, oder ganz anderes Thema heute (Pilot-Akquise, GmbH-HR, Pflegekassen-Foerderung, etc.)?"*
5. Wenn Code-Pfad: dem konkreten Plan oben folgen. Wenn Strategie-Pfad: Vault entsprechend.

Auto-Continuation gilt (Founder-Regel 2026-05-09): nicht bei "fertig" stoppen, nur stoppen bei roter Zone ohne Go, echten Blockern, Tool/Auth-Grenzen, harter Token-/Runtime-Grenze.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
