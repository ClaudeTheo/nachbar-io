# Brief: Claude → Codex — Tag-Übergabe 2026-05-13 (Nachmittag)

**Datum:** 2026-05-13 Mittag/Nachmittag
**Owner ab jetzt:** Codex
**Letzter Sender:** Claude (Visual-Polish Tag 2 — 8 Commits)

---

## Aktueller Stand (LIVE)

- `master == origin == LIVE == 04c1694 fix(ui): VoiceFAB immer sichtbar + SOS-Icon groesser/staerker`
- Deploy Run [25790214192](https://github.com/ClaudeTheo/nachbar-io/actions/runs/25790214192) — alle 3 Jobs grün ✅
- HTTP 200 auf `https://nachbar-io.vercel.app/`
- Vitest: **6 passed** (QuartierSpaziergang) + **13 passed** (BugReportButton) + **19 passed** (SOS + Voice) — alle grün
- tsc / eslint / build: Exit 0

---

## Was heute (Tag 2) geändert wurde — 8 Commits

### 1. `d2c016f` — Quartier-Spaziergang Parallax wiederhergestellt (Codex Option 3)

Codex hat Option 3 implementiert: neue Assets mit **echter Transparenz** (Chroma-Key, `alpha=0` an den Ecken). Claude hat gepusht (Codex-Account ThomasTh1977 hat nur READ-Zugriff auf ClaudeTheo/nachbar-io).

**Was live ist:**
- `components/brand/QuartierSpaziergang.tsx` — 4 fixed atmospheric Layer hinter der App-Shell (`-z-20`)
- `app/globals.css` — Welle-7-Motion-Block (qs-wind, qs-bridge-drift, qs-bird-fly, qs-breathe)
- `public/brand/parallax/` — 7 PNGs mit echter Transparenz + `mix-blend-mode: multiply`
- `__tests__/components/brand/QuartierSpaziergang.test.tsx` — 6 Tests

**Opacities nach Founder-Feedback (`422b92c`):**
| Layer | Opacity |
|---|---|
| L1 Schwarzwald (top-0) | 18% |
| L2 Hochrhein (top-34vh) | 14% |
| L3 Skyline (top-60vh) | 20% |
| L4 Vignetten (Spatz/Bank/Blumenkasten/Wegweiser) | 35–40% |

**Positionen:**
- L1: `top-0` (ganz oben)
- L2: `top-[34vh]`
- L3: `top-[60vh]` ← wurde von `78vh` hochgezogen (war von BottomNav verdeckt)
- L4: Spatz `top-[13vh]` rechts, Bank `top-[44vh]` links, Blumenkasten `top-[59vh]` rechts, Wegweiser `top-[73vh]` links

### 2. `78cc102` — NavPill entfernt

Founder: "Das braucht es nicht." `NavPill` aus `app/(app)/layout.tsx` entfernt (Import + Mount). `pt-20` → `pt-4` auf dem PendingVerificationBanner-Wrapper angepasst.

### 3. `b7f8b57` + `f7890ca` — BugReportButton immer sichtbar

`resolveFabVisibility` versteckte den Button auf Mobile unter 320px Scroll-Tiefe. `fabVisible = true` fest gesetzt, Scroll-Listener entfernt. Test angepasst.

### 4. `d6aad74` — FloatingHelpButton auf halbe Bildschirmhöhe

`FloatingHelpButton` (`/alerts/new`, gelbes Dreieck-Icon) war `bottom: calc(4.5rem + safe-area)` — direkt über BottomNav. Founder: "zu weit unten, nicht gut zum Drücken." Jetzt `top: calc(50vh - 28px)` rechts — Bildschirmmitte, gut greifbar.

### 5. `04c1694` — VoiceAssistantFAB + SosHeaderIcon

- **VoiceAssistantFAB**: Dasselbe Scroll-Hide wie BugReportButton hatte → entfernt, `fabVisible = true` fest.
- **SosHeaderIcon**: `top-3 → top-4`, `h-11 → h-12` (etwas größer), Border `30% → 60%` Opacity (deutlicher).

---

## Aktueller Layout-Stand `app/(app)/layout.tsx`

```tsx
<QuartierSpaziergang />        // -z-20 (Parallax-Hintergrund)
<AppAquarellBackground />      // -z-10 (Aquarell-Symbol)
// NavPill ENTFERNT
<SosHeaderIcon />              // fixed top-4 right-4 z-40 (auf allen Seiten außer Dashboard)
// ... Hauptinhalt pt-4 (war pt-20 wegen NavPill)
<BugReportButton />            // fixed bottom-24 left-3 z-40, immer sichtbar
<VoiceAssistantFAB />          // immer sichtbar (kein Scroll-Hide)
<BottomNav />                  // fixed bottom-0
```

---

## Floating Buttons — Übersicht (alle LIVE)

| Button | Position | Icon | Immer sichtbar? |
|---|---|---|---|
| `FloatingHelpButton` | `fixed right-4 top-[50vh-28px]` | TriangleAlert gelb | ✅ |
| `BugReportButton` | `fixed bottom-24 left-3` | Bug amber | ✅ (heute gefixt) |
| `VoiceAssistantFAB` | `fixed right-4 bottom-24` (ca.) | Mikrofon | ✅ (heute gefixt) |
| `SosHeaderIcon` | `fixed right-4 top-4` (außer Dashboard) | ShieldAlert rot | ✅ |

---

## Was noch offen sein könnte (keine explizite Founder-Entscheidung)

1. **L4-Vignetten Position-Feinjustage** — die top-Werte (13/44/59/73vh) sind erste Schätzung, nie live mit Founder abgestimmt. Wenn er sagt "Spatz zu hoch" → einfach top-Wert anpassen.

2. **VoiceAssistantFAB genaue Position** — der Button ist mit `visible={fabVisible}` an `FABButton` übergeben. `FABButton` bestimmt die finale CSS-Position (lies `modules/voice/components/assistant/FABButton.tsx`). Falls er auf dem selben Spot wie ein anderer Button sitzt → Position in FABButton anpassen.

3. **Founder-"und"** — Founder hat heute zweimal "und" getippt ohne den Satz zu beenden. Beide Male nicht weiter ausgeführt. Falls er sich meldet und noch etwas will: einfach umsetzen.

---

## Rote Zone (unveraendert)

- Push autonom OK (Variante A — gilt fort).
- Mig-Apply auf Prod: NEIN ohne Founder-Go.
- Vercel-Env / Provider-Live / Geld: NEIN.
- Asset-Generierung in claude.design / Banana Pro 2: NUR Founder.

---

## Durable Facts

- **Live-URL:** `https://nachbar-io.vercel.app`
- **Deploy:** `gh workflow run "Deploy to Vercel Production" --ref master`
- **Repo:** `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` (eigenes Git, origin `ClaudeTheo/nachbar-io`)
- **Founder:** Thomas Theobald, `thomasth@gmx.de`
- **Push-Zugriff:** Nur Claude (ClaudeTheo) kann pushen — Codex-Account ThomasTh1977 hat READ-only

## Kontext-Files

1. Diese Datei — Tag-2-Stand
2. `docs/plans/handoff/2026-05-13-claude-an-codex-welle-6-7-revert-uebergabe.md` — Morgen-Übergabe (Welle 6+7 Revert + 3 Optionen, heute abgeschlossen)
3. `CLAUDE.md` + `.claude/rules/pre-check.md` — Pre-Check-Pflicht
4. `~/.claude/projects/.../memory/MEMORY.md` — Projekt-Gesamtstand

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
