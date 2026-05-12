# Brief: Claude → Claude (naechste Session) — Aquarell-Position + Stadt-/Baeume-Hintergrund

**Datum:** 2026-05-12 mittag (nach Visual-Polish v7 Iteration 2 Teil-Welle: Landing-Aquarell + App-Shell-Aquarell + Stacking-Fix LIVE).
**Owner:** claude

## Aktueller Stand (LIVE)

- master==origin==Live==`c59823c fix(app-shell): Aquarell-Hintergrund sichtbar machen (Stacking-Context-Fix)`.
- Deploy-Run `25725789585` success. Live-URL: `https://nachbar-io.vercel.app`.
- Visual-Polish v7 Iteration 1 (Dashboard) komplett LIVE: Phase A foundation, B Logo, C-1 Hero v7, C-2 Schnellzugriffe Glas-Tiles, Cleanup, C-3 DiscoverGrid Magazin-Style.
- Iteration 2 angefangen:
  - `ece29f6` Landing `/` mit Aquarell-Hero-Logo + dezenter Symbol-Hintergrund-Layer.
  - `011f8c2` App-Shell-Aquarell via neue `<AppAquarellBackground />`-Component, in `app/(app)/layout.tsx` integriert.
  - `c59823c` Stacking-Context-Fix: `bg-warmwhite` aus Wrapper raus (sonst ueberdeckt es das `-z-10` Layer), Default-Opacity auf 0.15.
- Pilot-Reset vom 2026-05-10 weiterhin gueltig (Prod-DB nur Founder `dbd5e23e-...` mit Adresse Purkersdorfer Strasse 35).
- Vitest gesamt: ~4548 Tests gruen (4543 Baseline + 4 Landing-Aquarell + 5 AppAquarellBackground - Default-Opacity-Test 1x umgestellt).

## Was Founder gerade beanstandet

> "das bild ist nicht auf der richtigen Position es sollte ganz oben sein zudem fehlen noch die bäume und die stadt im hintergrund kommt das noch?"

Zwei Probleme:

### 1) Aquarell-Position falsch

Aktuelle Implementierung von `components/brand/AppAquarellBackground.tsx`:

- `quartierapp-symbol.png` als BG (820×580 Aquarell-Symbol = Tanne + 3 Haeuser + Sonne).
- `object-position: object-right-bottom` auf Mobile, `object-center` auf Desktop.

Founder will: **"ganz oben"** — also `object-top` (oder `object-top-center`). Vermutlich soll das Symbol oben am Header positioniert werden, NICHT mittig/unten.

### 2) Bäume + Stadt im Hintergrund fehlen

Founder erwartet ein groesseres Hintergrundbild **mit Baeumen UND einer Stadt**. Aktuell nutzen wir nur das kompakte Logo-Symbol (Tanne + 3 kleine Haeuser).

**WICHTIG — vorhandenes Asset entdeckt:**

```
public/images/hero-quartier.png            6.5 MB  (Master-Hero)
public/images/hero-quartier.webp           112 KB  (komprimiert, Web)
public/images/hero-quartier-original.webp   93 KB  (Original)
public/images/og-hero-bg.jpg               120 KB  (OG-Bild Variante)
```

Aktuelle Verwendung:

- `components/landing/Hero.tsx` (NICHT auf der Closed-Pilot-Landing aktiv — das ist die OEFFENTLICHE Marketing-Landingpage aus Pre-Closed-Pilot-Zeit; aktuell unused). Nutzt `<img src="/images/hero-quartier.webp" alt="Zwei Nachbarinnen unterhalten sich in einem deutschen Quartier" ...>`.
- `app/opengraph-image.tsx` nutzt `public/images/og-hero-bg.jpg`.

**Vermutung:** `hero-quartier.webp` enthaelt das vom Founder erinnerte Stadt-Bäume-Motiv. Quelle vermutlich aus Marketing-Welle vor Closed-Pilot-Pivot (siehe `components/landing/Hero.tsx` mit Alt-Text "Zwei Nachbarinnen unterhalten sich in einem deutschen Quartier").

## Was die naechste Session sofort tun sollte

1. **Pre-Check (Pflicht):**
   - `public/images/hero-quartier.webp` anschauen (z.B. Browser ueber `nachbar-io.vercel.app/images/hero-quartier.webp` oder lokal `start public/images/hero-quartier.webp`).
   - Klaeren: ist es das gewuenschte Motiv (Bäume + Stadt)? Oder muss ein neues Asset generiert werden?
   - `claude.design`-URLs aus Memory (Pass 42): Main `019e181a-...`, DesignSys `019e1805-...`, Logo-Varianten `019e1847-...`. Falls der Founder das Mockup nochmal teilt: dort ist das gewuenschte Layout sichtbar.

2. **Implementations-Optionen (TDD strict):**

   **Variante A — bestehendes hero-quartier.webp als BG:**
   - `AppAquarellBackground.tsx` umbauen: `src="/images/hero-quartier.webp"`.
   - Position auf `object-top` (oder spezifisch `object-position: top center`).
   - Opacity ggf. neu kalibrieren (foto-realistisch ist anders als Aquarell — vermutlich opacity 0.10-0.15 plus eventuell `mix-blend-mode: multiply` oder `saturate-0` fuer dezente Atmosphaere).
   - Landing `app/page.tsx` BG-Layer ebenfalls anpassen falls gewuenscht.

   **Variante B — neues Aquarell-Asset mit Stadt + Bäumen generieren:**
   - Banana Pro 2 / claude.design Prompt: "Schwarzwald-Stadt-Silhouette mit Tannen-Reihe im Vordergrund, Aquarell-Stil, Cream-Hintergrund #FDF8F3, horizontales Format 1920x600 fuer Web-Hero-Banner".
   - Neues Asset unter `public/brand/quartierapp-bg-stadt-baeume.png` ablegen.
   - In `AppAquarellBackground.tsx` darauf zeigen.

   **Empfehlung Default:** Variante A zuerst (10 min) — Founder sieht Resultat schnell und kann entscheiden. Variante B falls A nicht das richtige Motiv hat.

3. **Position:** `object-top` als Default-Class statt `object-right-bottom`/`object-center`. Eventuell `object-position: top` oder `object-position: 50% 0%`. Tests anpassen.

4. **Verifikation:** vitest, tsc, eslint, npm run build, Browser-Smoke.

5. **Commit + Push + Deploy** (Variante A: Push autonom OK; Vercel-Env/Mig/Provider bleibt Founder-Hand).

## Was die naechste Session NICHT tun sollte

- Bilder ohne Founder-Bestaetigung neu generieren (Banana Pro 2 kostet evtl. Credits) — erst nachfragen.
- `components/landing/Hero.tsx` ungefragt loeschen — ist aktuell unused aber kann fuer spaetere oeffentliche Marketing-Landingpage relevant sein.
- Andere Closed-Pilot-Pfade umbauen (`/login`, `/register`, `/freigabe-ausstehend`, Auth-Layout `(auth)/layout.tsx`) — separate Welle.

## Was Iteration 2 sonst noch offen hat

Aus Plan-Sektion 828-833 (`docs/plans/2026-05-11-dashboard-visual-polish-plan.md`):

- `/care/aerzte`, `/city-services`, `/quartier-info` Per-Page-Polish (durch App-Shell-Aquarell-Layer bekommen sie BG, aber spezifisches Polish fehlt).
- Senior-Pfad `/senior/*` — separate Layout-Datei, Aquarell-Layer NICHT angewendet (Senior-Mode braucht klare Lesbarkeit). Founder-Entscheidung ob Senior auch BG-Layer bekommt.
- Visual-Regression-Tests (Playwright Snapshots).

## Rote Zone (unveraendert)

- Push autonom (Variante A) OK wenn Tests gruen.
- Mig-Apply auf Prod: NEIN ohne Go.
- Vercel-Env/Provider/Geld: NEIN.
- Echte DB-Schreibungen: NUR mit explizitem Founder-Go.

## Memory-Updates dieser Session

- `MEMORY.md` Pass 44 (Visual-Polish v7 LIVE deployed) — sollte um Pass 45 (Iteration-2-Teil-Welle Aquarell-Hintergrund Landing + App-Shell + Stacking-Fix) ergaenzt werden, sobald Folgewelle (Position + Stadt-Bg) durch ist.
- Founder-Wunsch "Bäume + Stadt im Hintergrund" als open Item in INBOX.

## Founder-Identitaet (Reminder)

- E-Mail: thomasth@gmx.de
- User-ID Prod-DB: dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd
- household-ID: 62ab2b52-26c0-4915-8c69-f04162e9348a
- Adresse: Purkersdorfer Strasse 35, 79713 Bad Saeckingen
- Pilot-Quartier: `ee6cfcab-f615-47cd-afe7-808a27cb584b` slug `bad-saeckingen-pilot`

## Letzter Stand der Dateien

| Datei | Stand |
|---|---|
| `app/page.tsx` (Landing) | Aquarell-Hero + Hintergrund-Layer (Symbol opacity 0.18 Desktop / 0.22 Mobile) |
| `app/(app)/layout.tsx` | `<AppAquarellBackground />` als child eines `relative min-h-screen pb-20` (KEIN bg-warmwhite mehr, sonst Stacking-Bug) |
| `components/brand/AppAquarellBackground.tsx` | Default opacity 0.15, `object-right-bottom sm:object-center` — **muss auf `object-top` umgestellt werden** |
| `components/brand/QuartierAppLogo.tsx` | Phase B, full/symbol/mono Varianten |
| `proxy.ts` | `brand/` in matcher-Negativliste (sonst 307-Redirect der Brand-Assets) |
| `public/images/hero-quartier.webp` | UNGENUTZT — Kandidat fuer Stadt-Baeume-BG |
