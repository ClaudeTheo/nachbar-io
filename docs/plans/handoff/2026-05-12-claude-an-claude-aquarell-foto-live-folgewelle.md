# Brief: Claude → Claude (naechste Session) — Quartier-Foto-BG LIVE + Proxy-Hotfix

**Datum:** 2026-05-12 ~12:35 (nach Folgewelle: Aquarell-Symbol → Quartier-Foto + Position oben + Proxy-Fix LIVE).
**Owner:** claude

## Aktueller Stand (LIVE)

- master==origin==Live==`2e7aa45 fix(proxy): /images/ in Middleware-Negativliste — Hero-BG oeffentlich`.
- Vorheriger Commit: `0ba9f51 feat(app-shell): Visual-Polish v7 Iteration 2 — Quartier-Foto als BG (object-top)`.
- Deploys:
  - Run `25727684355` (commit 0ba9f51) → 9m28s success
  - Run `25728634174` (commit 2e7aa45) → ~9m success
- Live-Smoke:
  - `https://nachbar-io.vercel.app/` → 200, 26 KB
  - `https://nachbar-io.vercel.app/images/hero-quartier.webp` → 200, 112 KB, `image/webp`
  - `https://nachbar-io.vercel.app/api/health` → 200
- Visual-Smoke (Browser):
  - Landing Desktop 1280×800: Aquarell-Symbol mittig/oben hinter Hero, Tanne+Haeuser+Sonne sichtbar.
  - Landing Mobile 375×812: Aquarell-Symbol zentriert oben.
  - Direkt-URL `/images/hero-quartier.webp`: zeigt erwartetes Stadt-Baeume-Motiv (zwei Frauen mit Fahrrad, weisse Stadthaeuser, Strassen-Baeume, Hecken).

## Was wurde umgesetzt

### Variante A aus Vorgaenger-Brief

- `components/brand/AppAquarellBackground.tsx`:
  - src `/brand/quartierapp-symbol.png` → `/images/hero-quartier.webp`
  - `object-contain object-right-bottom sm:object-center` → `object-cover object-top` (Stadt-Silhouette bleibt sichtbar oben)
  - Default-Opacity 0.15 → 0.10 (Foto intensiver als Aquarell-Logo, deshalb staerker zurueckgenommen fuer Lesbarkeit)
  - Doku-Update: "Schwarzwald-Aquarell" → "Quartier-Hintergrund (Stadt + Bäume + Nachbarinnen)"
- `__tests__/components/brand/AppAquarellBackground.test.tsx`:
  - src-Pattern `/quartierapp-symbol/` → `/hero-quartier/`
  - Default-Opacity-Test 0.15 → 0.10
  - Neuer Test: `object-top` + `object-cover` (Founder-Wunsch)
- `app/page.tsx` (Landing):
  - Desktop-BG-Symbol: `-right-32 h-[120%] w-[110%]` + `object-right-top` → `inset-x-0 h-[120%] w-full` + `object-top`
  - Symbol-Bild selbst unveraendert (Landing behaelt Pure-Brand-Aquarell — Foto ist nur App-Shell)
- `closed-pilot-page.test.tsx`: keine Anpassung noetig (src-Regex erlaubt schon Symbol).

### Hotfix nach Live-Smoke

- `proxy.ts`: matcher-Negativliste um `images/` ergaenzt (analog zu `brand/`). Ohne den Fix wurde `/images/hero-quartier.webp` mit HTTP 307 zum Login redirected (Closed-Pilot-Mode-Auth-Pipeline).
- `__tests__/middleware/matcher-config.test.ts`: neuer Snapshot-Test schuetzt Negativliste gegen Regression (`brand/`, `images/`, `_next/static`, `_next/image`).

### Verifikation lokal

- `npx tsc --noEmit`: Exit 0
- `npm run lint`: Exit 0
- `npx vitest run __tests__/components/brand/AppAquarellBackground.test.tsx __tests__/app/closed-pilot-page.test.tsx __tests__/middleware/`: 67/67 passed
- `npx vitest run` (gesamt): 4551/4552 passed (1 skipped, 0 fails) — Baseline +9 Tests
- `npm run build`: success

### CI-Flakiness beobachtet

Deploy-Run 1 (`25727684355`) initial fail in Lint&Test mit: `Uncaught Exception: ReferenceError: window is not defined` in `__tests__/app/mitessen/page.test.tsx` (React-DOM-Hydration ohne window). Lokal grueen, Pass-44-Run grueen, Re-Run gruen. Pre-existing-Flakiness, kein Code-Problem dieser Session — aber im Hinterkopf behalten falls erneut auftritt.

## Founder-Befund nach Smoke

Founder hat zum aktuellen Stand noch nichts gesagt — Folgewelle wurde autonom (Variante A) umgesetzt nach Brief-Vorgabe. Naechste Session: Founder-Feedback zur App-Shell-BG abwarten.

Mut-Punkte fuer naechste Session:
- Ist Foto-Opacity 0.10 das richtige Mass? Founder kann via prop `<AppAquarellBackground opacity={0.08} />` oder ueber Tailwind-Token feinjustieren.
- Foto-Stil vs Aquarell-Brand: konsistent inkonsistent (Landing = Pure-Brand-Aquarell-Symbol, App-Shell = Quartier-Realitaet-Foto). Falls Founder Aquarell-Stil auch fuer App-Shell will: Variante B aus altem Brief (neues Aquarell-Asset mit Stadt + Baeumen via Banana Pro 2 / claude.design). Aber: Bilder ohne Founder-Bestaetigung NICHT generieren — erst nachfragen.

## Was Iteration 2 noch offen hat (unveraendert seit Vorgaenger-Brief)

Aus Plan-Sektion 828-833 (`docs/plans/2026-05-11-dashboard-visual-polish-plan.md`):

- `/care/aerzte`, `/city-services`, `/quartier-info` Per-Page-Polish (App-Shell-BG laeuft bereits durch).
- Senior-Pfad `/senior/*` — separate Layout-Datei, BG-Layer NICHT angewendet (Senior-Mode braucht klare Lesbarkeit). Founder-Entscheidung ob Senior auch BG-Layer bekommt.
- Visual-Regression-Tests (Playwright Snapshots).

Plus aus dieser Session:
- Eventuell Saturate/Filter auf BG-Foto, falls 0.10 noch zu farbig wirkt (z.B. `saturate-[0.7]` oder `grayscale-[0.3]`).
- Andere oeffentliche statische Pfade pruefen, ob noch andere im proxy-Matcher fehlen (z.B. neue `public/...`-Unterverzeichnisse).

## Rote Zone (unveraendert)

- Push autonom (Variante A) OK wenn Tests gruen.
- Mig-Apply auf Prod: NEIN ohne Go.
- Vercel-Env/Provider/Geld: NEIN.
- Echte DB-Schreibungen: NUR mit explizitem Founder-Go.
- Bilder generieren (Banana Pro 2 / claude.design): NUR mit Founder-Go.

## Memory-Updates dieser Session

- `MEMORY.md` Pass 46 erweitert um Quartier-Foto-BG LIVE + Proxy-Hotfix-Commit `2e7aa45`.
- Founder-Erkenntnis fuer Pre-Check-Regel: **proxy.ts matcher-Negativliste mitpruefen bei neuen oeffentlichen statischen Assets.** Bei `images/`-Pfad wurde das ueberhaupt erst beim Live-Smoke auffaellig. Ohne den Schritt waere das Visual-Bug LIVE geblieben.

## Letzter Stand der Dateien

| Datei | Stand |
|---|---|
| `components/brand/AppAquarellBackground.tsx` | hero-quartier.webp, `object-cover object-top`, Default-Opacity 0.10 |
| `app/page.tsx` (Landing) | Aquarell-Symbol inset-x-0 + object-top (Desktop), Mobile-Variante unveraendert |
| `proxy.ts` | Matcher-Negativliste mit `images/` ergaenzt (Live-fix nach Smoke) |
| `__tests__/components/brand/AppAquarellBackground.test.tsx` | src `/hero-quartier/`, Opacity 0.10, object-top + object-cover |
| `__tests__/middleware/matcher-config.test.ts` | NEU — Snapshot-Test fuer Matcher-Negativliste |
| `public/images/hero-quartier.webp` | UNVERAENDERT (112 KB), jetzt aktiv im App-Shell-BG |

## Live-URLs zur Verifikation

- Landing: https://nachbar-io.vercel.app/
- Hero-Foto direkt: https://nachbar-io.vercel.app/images/hero-quartier.webp
- Health: https://nachbar-io.vercel.app/api/health

## Founder-Identitaet (Reminder)

- E-Mail: thomasth@gmx.de
- User-ID Prod-DB: dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd
- household-ID: 62ab2b52-26c0-4915-8c69-f04162e9348a
- Adresse: Purkersdorfer Strasse 35, 79713 Bad Saeckingen
- Pilot-Quartier: `ee6cfcab-f615-47cd-afe7-808a27cb584b` slug `bad-saeckingen-pilot`
