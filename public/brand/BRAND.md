# QuartierApp — Brand Assets

> **Stand:** 2026-05-11 spaetabend. Branch `feature/dashboard-visual-polish`.
> **Source:** Banana Pro 2 (Gemini Image) Generierung am 2026-05-11 ab 20:53.

---

## Finale Logo-Variante

**Konzept:** Haus-Cluster mit Schwarzwald-Tanne, Aquarell-Stil
**Komposition:** Drei Haeuser mit terracotta-roten Daechern, davor links eine geometrisch-aquarellige Tanne (Schwarzwald-Symbol), dahinter eine goldene Sonne. Die Szene liegt auf zwei sich ueberlappenden Aquarell-Quadraten in dusty Rhine-Blue (`#5A6F89` und `#7E8FA3`).

**Wordmark:** "QuartierApp" in einer eleganten Serif (NICHT Nunito), weight 600, Farbe `#3D3D50`. Subtitle "IHR DIGITALES QUARTIER" in spaced caps (+0.08em tracking) darunter.

**Typografie-Strategie:** Logo darf eigene Marken-Typografie (Serif) haben. UI-Headings bleiben Nunito (siehe `app/globals.css`). Dies ist gaengig (z.B. Apple Newsroom).

---

## Asset-Liste

| File | Use | Resolution |
|---|---|---|
| `quartierapp-master.png` | **Master file** (Brand-Bible-Layout mit allen Varianten) | 1856×2254 |
| `quartierapp-logo.png` | **Full Logo** (Symbol + Wordmark + Subtitle + Hairline-Trenner) — fuer Landing/Footer | 1380×1000 |
| `quartierapp-symbol.png` | **Symbol-only** (Aquarell-Szene ohne Wordmark) — fuer Nav-Pill, Header | 820×580 |
| `quartierapp-app-icon-1024.png` | **App-Icon** (iOS/Android/PWA) | 1024×1024 |
| `quartierapp-favicon-512.png` | Favicon high-res | 512×512 |
| `quartierapp-favicon-180.png` | Favicon `apple-touch-icon` | 180×180 |
| `quartierapp-favicon-64.png` | Favicon medium | 64×64 |
| `quartierapp-favicon-32.png` | Favicon browser-tab | 32×32 |
| `quartierapp-favicon-16.png` | Favicon kleinste Stufe | 16×16 |

**Source-Backups** in `source/`:
- `v1-first-20-53.png` — erste Banana-Pro-Generierung
- `v1-iter-20-54.png` — erste Iteration v1
- `v2-iter-20-57.png` — v2 Zwischenschritt
- `v2-final-20-59.png` — **finale Variante, Master fuer alle Crops**

---

## Wichtige technische Notizen

### 1. Cream-Hintergrund matched Warmwhite

Das Master-PNG hat einen warmen Cream-Hintergrund (`#FDF8F3` etwa) — **exakt der Page-Background-Token `--color-warmwhite`** in `app/globals.css`. Auf der App sehen die Logo-Crops daher **visuell aus wie transparent**, weil die Cream-Pixel mit dem Page-BG verschmelzen.

**Konsequenz:** Logo nur auf Warmwhite-Background platzieren. Auf anderen Hintergruenden (z.B. Petrol-Green-Sektion, Hero-Image) erscheint ein sichtbares Cream-Rechteck. Falls Logo dort gebraucht: `quartierapp-mono.png` (Line Art Variante, noch zu generieren) verwenden, ODER explizit transparente Variante in Banana Pro 2 nachgenerieren.

### 2. Wordmark-Schrift NICHT in Repo

Die Serif-Schrift des Wordmarks ist Teil des PNG-Rendering aus Banana Pro 2. Es ist **kein** separater Font im Repo. Wenn Wordmark als Text (z.B. dynamisch im HTML) gerendert werden soll, brauchen wir entweder:
- Den Font identifizieren + via `next/font/google` einbinden (vermutlich Playfair Display, Lora oder eine vergleichbare warme Serif)
- ODER PNG-Logo als ganzes nutzen (kein Text-Rendering noetig)

Aktueller Plan: Logo immer als PNG (Symbol + Wordmark zusammen). Erst spaeter pruefen, ob dynamisches Text-Rendering noetig ist.

### 3. Crop-Koordinaten aus Master

Die Bestandteile wurden via Sharp aus dem Master gecroppt (siehe `scripts/crop-brand-assets.ts` — TBD). Aktuelle Koordinaten:

```
Master:     1856 × 2254
Symbol:     left=540 top=60 width=820 height=580
Full Logo:  left=240 top=40 width=1380 height=1000
App-Icon:   left=380 top=1380 width=460 height=460 → resize 1024×1024
Favicons:   Symbol crop → resize {512,180,64,32,16}
```

Falls Master-File ausgetauscht wird (neue Banana-Pro-Generierung): Koordinaten verifizieren + ggf. anpassen.

---

## Color Palette (Logo-Akzente)

Banana Pro 2 hat folgende Akzente im Aquarell verwendet:

| Token | Hex | Verwendung im Logo |
|---|---|---|
| Petrol-Green | `#2E7D5E` | Tanne (Hauptfarbe) |
| Quartier-Green-Light | `#4CAF87` | Tanne (zweiter Ton) |
| Terracotta | `#C26B43` | Hausdaecher |
| Cream-Pink | `#E8D5C4` | Hauswaende (warm-light) |
| Amber Sun | `#F59E0B` | Sonne (gold) |
| Rhine Blue (dark) | `#5A6F89` | Hinterer Aquarell-Block (Hochrhein-Andeutung) |
| Rhine Blue (light) | `#7E8FA3` | Vorderer Aquarell-Block |
| Anthrazit | `#3D3D50` | Wordmark, Subtitle |
| Cream (BG) | `#FDF8F3` | Page-Background (= Warmwhite) |

Diese Palette wird auch in der DESIGN.md als erweiterte Akzent-Palette dokumentiert (in der Iteration-3-Welle).

---

## Integration TODO

- [ ] `app/icon.png` → `quartierapp-favicon-512.png` kopieren (Next.js Auto-Favicon)
- [ ] `app/apple-icon.png` → `quartierapp-favicon-180.png` kopieren
- [ ] `app/favicon.ico` → aus `quartierapp-favicon-32.png` (oder Multi-Resolution `.ico` generieren)
- [ ] `components/brand/QuartierAppLogo.tsx` — React-Component mit `<Image>` Wrapper, Props `variant: 'symbol' | 'full' | 'mono'` + `size`
- [ ] Floating Nav-Pill auf Dashboard verwendet `<QuartierAppLogo variant="symbol" size={40} />` plus Wordmark daneben
- [ ] Footer-Signatur verwendet `<QuartierAppLogo variant="full" size="lg" />`
- [ ] Open Graph / `app/opengraph-image.tsx` Logo einbinden
- [ ] `manifest.json` Icons aktualisieren

---

## Open Questions

- **Echtes Transparent-PNG**: Banana Pro 2 hat es nicht generiert (alle Files Alpha=255). Falls Logo auf nicht-Warmwhite-BG noetig (z.B. SOS-Pill, Hero-Photo): neu generieren mit explizitem "transparent background" Prompt ODER Chroma-Key-Conversion via Sharp.
- **SVG-Version v2**: Die Founder-Auswahl aus `quartierapp-logo-v2/` wird bewusst 1:1 als Raster-Master gefuehrt:
  - `quartierapp-logo-v2-symbol.png` — transparenter Master der ausgewaehlten runden Vorlage.
  - `quartierapp-logo-v2-symbol.svg` — SVG-Wrapper mit exakt eingebettetem PNG-Master, keine freie Vektorinterpretation.
  - `quartierapp-logo-v2-symbol-on-dark.png` / `.svg` — Dark-Background-Variante: Haus- und Personenformen weiss, damit sie auf Schwarz/Anthrazit sichtbar bleiben.
  - `quartierapp-logo-v2-symbol-mono.svg` — Kompatibilitaetsdatei, ebenfalls exakt eingebetteter PNG-Master statt abweichender Mono-Interpretation.
  - `quartierapp-logo-v2-app-icon.svg` — SVG-Wrapper mit exakt eingebettetem App-Icon-PNG.
  Ein echter Pfad-Vektor kann spaeter separat erstellt werden, darf aber nur anhand dieser 1:1 Vorlage freigegeben werden.
- **Mono Line-Art**: Im Master-File enthalten, aber Crop war fehlerhaft (zeigt nur Label). TBD: genauere Crop-Koordinaten extrahieren ODER neu via Banana Pro 2 mit "line art only" Prompt.
