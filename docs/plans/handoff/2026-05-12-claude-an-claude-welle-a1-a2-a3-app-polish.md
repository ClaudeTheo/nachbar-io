# Brief: Claude → Claude (naechste Session) — Welle A1+A2+A3 App-Polish LIVE

**Datum:** 2026-05-12 spaeter Nachmittag (nach "nun die app" → Variante A: Per-Page-Polish).
**Owner:** claude

## Aktueller Stand (LIVE)

- master==origin==Live==`77274e6 feat(visual-polish): A3 — /quartier-info Magazin-Hero + Brand-Tokens`.
- Deploys:
  - Run `25734111990` (Welle A1 `/care/aerzte`) → ~10m success
  - Run `25734879285` (Welle A2+A3 `/city-services` + `/quartier-info`) → 3m+3m success
- Live HTTP: Landing 200, Health 200, App-Pages 307 (Closed-Pilot, wie erwartet).

## Was wurde umgesetzt

### Neue Komponente

`components/brand/MagazineHeader.tsx` — wiederverwendbares Hero-Pattern fuer alle App-Pages:
- Eyebrow (accent-dot + UPPERCASE + tracking-[0.08em], `text-anthrazit-light`)
- H1 (36 px / 600 / -0.02em, `text-anthrazit`)
- Subtitle (optional, `text-anthrazit-light`)
- Back-Link (optional, ArrowLeft im Eyebrow-Bereich)
- Actions (optional, rechts neben dem Titel)
- 5 Unit-Tests (5/5 passed)

### Welle A1 — `/care/aerzte` (Commit `11293f7`)

- PageHeader → MagazineHeader (Eyebrow "AERZTE · QUARTIER")
- Hex `#2D3142` → `text-anthrazit`, `#4CAF87` → `quartier-green`, `#3F9572` → `quartier-green-dark`
- `bg-gray-100` (Filter) → `bg-lifted-cream`
- Aerzte-Cards: `border bg-white` → `border-anthrazit-tint bg-lifted-cream`
- Loading-Skeleton: `bg-muted` → `bg-lifted-cream`
- Empty-State: Lifted-Cream + Hairline + zwei Zeilen
- Footer-Logo (opacity-70)
- Umlaute repariert (Ärzte, Orthopädie)

### Welle A2 — `/city-services` (Commit `f26e850`)

- PageHeader → MagazineHeader (Eyebrow "RATHAUS · QUARTIER", Subtitle "Bekanntmachungen, Services, Buerger-Wiki")
- Tab-Bar: `bg-gray-100`/`bg-white` → `bg-lifted-cream`/`bg-warmwhite`
- Rathaus-Card: `bg-gradient-to-r from-blue-50` → `bg-lifted-cream` + Hairline
- Quicklinks + Wiki-Details: `bg-white shadow-soft` → `bg-lifted-cream` + Hairline
- Suchfeld: `border bg-white` → `border-anthrazit-tint bg-lifted-cream`
- Bekanntmachungs-Karten: `bg-white shadow-soft` → `bg-lifted-cream` + Hairline
- Spinner: `border-[#4CAF87]` → `border-quartier-green` (3x)
- Footer-Logo
- Test-Anpassung: `bg-white` → `bg-warmwhite` (active-Tab-Style)

### Welle A3 — `/quartier-info` (Commit `77274e6`)

- 3x Custom-Header (No-Quarter + Error + Main) → MagazineHeader mit Refresh-Action
- Lokale `refreshAction` const haelt das DRY
- 10x Karten-Pattern Bulk-Replace: `rounded-2xl bg-white shadow-sm border border-gray-100` → `rounded-2xl border border-anthrazit-tint bg-lifted-cream`
- Bulk-Replace `hover:bg-gray-100` → `hover:bg-anthrazit-tint`, `border-gray-100` → `border-anthrazit-tint`
- Pollen-Bar Track: `bg-gray-100` → `bg-anthrazit-tint`
- Footer-Logo
- ArrowLeft-Import entfernt (von MagazineHeader uebernommen)

## Verifikation

- `npx tsc --noEmit`: Exit 0
- `npm run lint`: Exit 0
- `npx vitest run` (gesamt): **4560/4561 passed** (1 skipped, 0 fails) — +5 MagazineHeader-Tests
- `npx vitest run __tests__/app/city-services/`: 59/59 passed
- `npm run build`: success
- Live HTTP-Smoke: alle 200/307 wie erwartet

## Visueller Check (manuell durch Founder)

App-Pages sind hinter Login (Closed-Pilot). Founder muss einloggen, um:
- `/care/aerzte` → Magazin-Hero + Lifted-Cream-Karten visuell zu pruefen
- `/city-services` → Tab-Bar + alle drei Tabs (Bekanntmachungen, Services, Wiki)
- `/quartier-info` → Hero mit Refresh-Action + alle Sections

Bei Feinjustage (z.B. Spacing zwischen Sections, Subtitle-Wortlaut, BG-Color-Sattigung) einfach Bescheid sagen.

## Brand-Token-Migration Status

| Hex/Generic-Color | Brand-Token | Pages migrated |
|---|---|---|
| `#2D3142` text | `text-anthrazit` | aerzte ✓ |
| `#4CAF87` text/bg | `quartier-green` | aerzte ✓, city ✓ |
| `#3F9572` hover | `quartier-green-dark` | aerzte ✓ |
| `bg-gray-100` | `bg-lifted-cream` / `bg-anthrazit-tint` | aerzte ✓, city ✓, quartier-info ✓ |
| `bg-gray-50` hover | `bg-warmwhite` | aerzte ✓, city ✓, quartier-info ✓ |
| `bg-white` (Karten) | `bg-lifted-cream` | aerzte ✓, city ✓, quartier-info ✓ |
| `border-gray-100/200` | `border-anthrazit-tint` | aerzte ✓, city ✓, quartier-info ✓ |
| `shadow-soft` (auf Karten) | Hairline-Border statt Schatten | aerzte ✓, city ✓, quartier-info ✓ |

Eine Menge Pages haben den alten Stil noch. Wenn der Founder weitermachen will, sind die naechsten logischen Kandidaten:
- `/care` (Care-Index, vermutlich PageHeader + alte Karten)
- `/care/checkin`
- `/notifications`
- `/messages/*`
- `/news`
- `/sos/status`
- `/welcome`
- Auth-Pages (`/login`, `/register`, `/freigabe-ausstehend`)

## Rote Zone (unveraendert)

- Push autonom (Variante A) OK wenn Tests gruen.
- Mig-Apply auf Prod: NEIN.
- Vercel-Env/Provider/Geld: NEIN.

## Offene Punkte (uebergreifend)

- Founder-Frage **altersabhaengiges Design** (Jugend / Erwachsene / Senior) noch nicht beantwortet — Persona + Switch-Mechanik klaeren bevor implementiert.
- Per-Page-Polish auf restliche App-Pages ausdehnen (~10-15 Pages).
- Visual-Regression-Tests (Playwright Snapshots) fuer die polishten Pages.
- Senior-Pfad `/senior/*` braucht eigene Entscheidung (klar lesbar vs. BG-Layer).

## Vorgaenger-Briefe (heute)

1. `2026-05-12-claude-an-claude-aquarell-position-stadt-baeume.md` — Initial-Wunsch
2. `2026-05-12-claude-an-claude-aquarell-foto-live-folgewelle.md` — Foto in App-Shell (rueckgebaut)
3. `2026-05-12-claude-an-claude-foto-landing-variante-c.md` — Variante C: Foto auf Landing, App-Shell-Rueckbau
4. **dieser Brief** — Welle A1+A2+A3 App-Polish

## Founder-Identitaet (Reminder)

- E-Mail: thomasth@gmx.de
- User-ID Prod-DB: dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd
- Pilot-Quartier: `ee6cfcab-f615-47cd-afe7-808a27cb584b` slug `bad-saeckingen-pilot`
