# Brief: Claude → Claude (naechste Session) — Foto auf Landing (Variante C), App-Shell zurueck auf Symbol

**Datum:** 2026-05-12 ~14:05 (nach Founder-Korrektur "Foto ist nur Landing, nicht App").
**Owner:** claude

## Aktueller Stand (LIVE)

- master==origin==Live==`6412caa refactor(visual-polish): Foto auf Landing (Variante C), App-Shell zurueck auf Symbol`.
- Deploy Run `25732824418` success (Lint&Test 6m13s, Build&Deploy ~3m).
- Live-Smoke:
  - `https://nachbar-io.vercel.app/` → 200 (27 KB)
  - `https://nachbar-io.vercel.app/images/hero-quartier.webp` → 200, 112 KB, `image/webp`
- Visual-Smoke Desktop 1280×800: Foto-BG mit Stadt-Baeume-Nachbarinnen + Aquarell-Symbol als Brand-Anker mittig oben — Layering funktioniert, Text gut lesbar.
- Visual-Smoke Mobile 375×812: Foto-BG sichtbar, Symbol prominenter Anker im Hero, Text gut lesbar.

## Was wurde umgesetzt (Variante C)

### Rueckbau App-Shell

- `components/brand/AppAquarellBackground.tsx`:
  - src zurueck auf `/brand/quartierapp-symbol.png` (vorher Foto)
  - `object-cover` → `object-contain` (Symbol braucht contain, nicht beschnitten)
  - Default-Opacity 0.10 → 0.15 (Symbol vertraegt mehr als Foto)
  - `object-top` bleibt (Founder-Wunsch "ganz oben" unveraendert)
- `__tests__/components/brand/AppAquarellBackground.test.tsx`:
  - src-Pattern auf `/quartierapp-symbol/`, Test fuer `object-contain`, Opacity 0.15.

### Landing-Erweiterung (Variante C)

- `app/page.tsx`:
  - Neuer Foto-BG-Layer **vor** dem Symbol-Layer im DOM:
    ```tsx
    <div aria-hidden data-testid="landing-bg-foto"
         className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]">
      <Image src="/images/hero-quartier.webp" fill
             className="select-none object-cover object-top" />
    </div>
    ```
  - Bestehender Symbol-Layer bleibt unveraendert (object-top + opacity-[0.18]).
  - DOM-Order: Foto → Symbol → Content. Symbol rendert oben drueber als Brand-Anker.
- `__tests__/app/closed-pilot-page.test.tsx`:
  - Neuer Test `zeigt das Quartier-Hero-Foto als zusaetzliche Atmosphaere-Schicht` prueft Existenz + aria-hidden + src + DOM-Order.

### Verifikation lokal

- `npx tsc --noEmit`: Exit 0
- `npm run lint`: Exit 0
- `npx vitest run` (gesamt): **4555/4556 passed** (+4 vs Pass 44 Baseline)
- `npm run build`: success

## Warum das jetzt richtig ist

- Phase-1-Produkt ist "Familienkreis + Quartier-Infos". Landing zeigt **Quartier-Realitaet** (Foto: zwei Generationen + Stadt + Baeume) plus **Brand-Marke** (Aquarell-Symbol).
- App-Shell ist Werkzeug-Modus fuer eingeloggte Nutzer — dort braucht es **Brand-Atmosphaere ohne Ablenkung** (nur Symbol, dezent, object-contain, Opacity 0.15).
- Foto auf App-Shell war Irrweg: zu viel visuelles Rauschen waehrend Nutzung; Foto-Stil bricht zudem mit der Aquarell-Brand-Bibel.

## Layer-Architektur Landing (von hinten nach vorne)

1. `bg-warmwhite` (page-BG via Tailwind-Token)
2. **NEU:** Foto-BG (z-0, opacity 0.12, object-cover object-top, vollflaechig)
3. Aquarell-Symbol-BG Desktop (z-0, opacity 0.18, contain, object-top)
4. Aquarell-Symbol-BG Mobile (z-0, opacity 0.22, contain)
5. Content (relative z-10)

## Rote Zone (unveraendert)

- Push autonom (Variante A) OK wenn Tests gruen.
- Mig-Apply auf Prod: NEIN ohne Go.
- Vercel-Env/Provider/Geld: NEIN.
- Bilder generieren (Banana Pro 2 / claude.design): NUR mit Founder-Go.

## Offene Punkte (Iteration 2)

- Founder-Feedback zur neuen Landing-Optik abwarten (Foto-Opacity 0.12 / Symbol-Opacity 0.18 — beide Zahlen sind kalibriert, aber Designer-Auge moeglich).
- `/care/aerzte`, `/city-services`, `/quartier-info` Per-Page-Polish.
- Senior-Pfad `/senior/*` — BG-Layer Decision (vermutlich kein Foto/Symbol, klare Lesbarkeit hat Vorrang).
- Visual-Regression-Tests (Playwright Snapshots).
- **Founder-Frage offen: altersabhaengiges Design** (Jugend / Erwachsene / Senior). Senior-Modus existiert bereits — Erweiterung machbar aber verdreifacht Pflegelast. Persona+Switch-Mechanik klaeren bevor implementiert.

## Vorgaenger-Briefe dieser Tagessession

- `nachbar-io/docs/plans/handoff/2026-05-12-claude-an-claude-aquarell-position-stadt-baeume.md` — Erstwunsch (Position oben + Stadt-Baeume)
- `nachbar-io/docs/plans/handoff/2026-05-12-claude-an-claude-aquarell-foto-live-folgewelle.md` — Foto in App-Shell (jetzt rueckgebaut)
- **dieser Brief** — Variante C: Foto auf Landing, Symbol bleibt App-Shell

## Founder-Identitaet (Reminder)

- E-Mail: thomasth@gmx.de
- User-ID Prod-DB: dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd
- Adresse: Purkersdorfer Strasse 35, 79713 Bad Saeckingen
- Pilot-Quartier: `ee6cfcab-f615-47cd-afe7-808a27cb584b` slug `bad-saeckingen-pilot`
