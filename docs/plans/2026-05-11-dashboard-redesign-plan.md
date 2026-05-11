# Dashboard-Redesign — Uebersichtlichkeit & Logik Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Startseite (`/dashboard`) so umbauen, dass sie uebersichtlicher und logisch nach Senior-Tauglichkeit gruppiert ist — weniger kognitive Last, klare Hierarchie, keine doppelten Funktionen.

**Architecture:** DiscoverGrid bleibt zentrale Tile-Liste, wird aber in 4 semantische Kategorien gruppiert (statt einer flachen Liste). Die 4 Schnellzugriff-Kacheln werden auf "Heute"-Aktionen fokussiert und um den `KI-Assistent`-Pfad bereinigt (AVV-blockiert, fuehrt zu 503). FeatureGate fuer KI-Assistent wird zu `DISCOVER_TILE_*`-Verhalten konsistent gemacht.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind v4, Lucide-Icons, Vitest, bestehende `feature_flags`-Tabelle (Mig 192).

---

## Analyse aktueller Stand (`/dashboard`)

| Section | Sichtbar fuer | Probleme |
|---|---|---|
| Hero (Avatar + Begruessung + Wetter) | Alle | OK |
| `ExternalWarningBanner maxItems=3` | Alle (wenn Warnungen) | OK seit Pkt C |
| Caregivers-Avatare | Plus-Plan + caregiver_links | OK |
| SOS-Kachel (gross, rot) | Alle | OK |
| 4 Schnellzugriffe (Check-in, Nachrichten, Neuigkeiten, KI-Assistent) | Alle | **KI-Assistent fuehrt zu 503** (AVV-blockiert) · **Nachrichten doppelt** (auch im DiscoverGrid als "Chat") |
| `DiscoverGrid` (12 Primary + 13 Secondary flat) | Alle | **25 Tiles ohne Gruppierung**, kognitive Last hoch fuer Senioren |

---

## Probleme (was nicht uebersichtlich ist)

1. **Doppelte Funktion:** "Nachrichten" als Schnellzugriff + "Chat" als Tile in Secondary. User unklar welche zu welcher Funktion fuehrt.
2. **Toter Pfad:** "KI-Assistent" als Schnellzugriff fuehrt aktuell garantiert zu 503 (AI_PROVIDER_OFF=true + Care-Consent fehlt — wartet auf §5 AVV).
3. **Flache 25-Tile-Liste:** Kein Senior-User scannt 25 Items. 8-Sekunden-Regel verletzt.
4. **Tab vs. Tile inkonsistent:** "Karte", "Maengel", "Rathaus" sind Quartier-Themen, liegen aber im Dashboard-DiscoverGrid statt im `/quartier-info`-Tab.
5. **"Kalender"-Tile zweideutig:** Verlinkt auf `/waste-calendar` (Muellkalender), aber Wort "Kalender" laesst Veranstaltungs-Kalender erwarten. Senior-Erwartungsbruch.
6. **"Neuigkeiten" Schnellzugriff** verlinkt auf `/news`, aber `/news` hat keinen DiscoverGrid-Eintrag. Inkonsistent zwischen den beiden Listen.

---

## Empfehlung — Variante B (Drei-Stufen-Modell)

Klare Hierarchie nach Nutzungs-Frequenz:

```
┌─ Hero: Begruessung + Wetter
├─ Warnungen (wenn aktiv)
├─ Angehoerige-Schnellzugriff (wenn vorhanden)
├─ SOS-Kachel
│
├─ HEUTE-Aktionen (3 Kacheln, taeglich genutzt):
│  · Check-in       (Selbst-Status)
│  · Nachrichten    (Unread Badge)
│  · Neuigkeiten    (Quartiers-News)
│
└─ ENTDECKEN — 4 Kategorien:
   ├─ Nachbarschaft (5 Tiles):
   │  · Brett · Hilfe · Marktplatz · Gruppen · Veranstaltungen
   │
   ├─ Hilfe & Pflege (5 Tiles):
   │  · Mein Tag · Aufgabentafel · Einkaufshilfe ·
   │    Pflegegrad · Sprechstunde
   │
   ├─ Quartier-Info (5 Tiles):
   │  · Karte · Muellkalender · Rathaus · Maengel · Praevention
   │
   ├─ Mehr Funktionen (10 Tiles hinter "Mehr entdecken"):
   │  · Experten · Handwerker · Leihboerse · Mitessen ·
   │    Chat · Wer hat? · Pakete · Fundbuero ·
   │    Laerm-Meldung · Tipps
```

**Aenderungen ggue. aktuell:**

| Punkt | Vorher | Nachher |
|---|---|---|
| KI-Assistent Schnellzugriff | Sichtbar (fuehrt zu 503) | **Entfernt** bis §5 AVV (kommt spaeter zurueck als Hero-Bot) |
| "Nachrichten" Schnellzugriff + "Chat"-Tile | Beide sichtbar | Nur Schnellzugriff (taeglich); "Chat"-Tile entfernt |
| "Kalender"-Label | `/waste-calendar` mit Label "Kalender" | Umbenennen in "Muellkalender" (eindeutig) |
| DiscoverGrid-Tile-Anordnung | Flach 12+13 alphabetisch-zufaellig | 4 Kategorien mit Headlines |
| Kategorie-Granularitaet | Eine grosse Liste | 5+5+5+10 Tiles in Sektionen |

**Aenderungen via Admin-Toggle** (keine Code-Aenderung noetig):
- Founder kann fuer Pilot z.B. `DISCOVER_TILE_HANDWERKER`, `..._LEIHBOERSE` etc. abschalten, falls noch nicht implementiert/nicht relevant — sehen die User dann gar nicht.

---

## Alternativen (zum Vergleich, falls Founder anders entscheidet)

**Variante A — Minimal:** Schnellzugriffe komplett weg, alles ins DiscoverGrid. Weniger Code-Aufwand, aber taegliche Aktionen versteckt unter der Tile-Liste.

**Variante C — Personalisiert:** Schnellzugriffe sind die 3 zuletzt genutzten Tiles. Setzt Analytics-Tabelle voraus + Cron-Job. ~10x mehr Aufwand. Erst sinnvoll ab ~50 aktiven Nutzern.

---

## Implementation Tasks (Variante B)

### Task 1: KI-Assistent-Schnellzugriff hinter Flag setzen

**Files:**
- Modify: `app/(app)/dashboard/page.tsx:296-310`
- Test: `app/(app)/dashboard/__tests__/page.test.tsx` (NEU falls fehlt, sonst erweitern)

**Step 1: Failing-Test schreiben**

```tsx
it("blendet KI-Assistent-Schnellzugriff aus wenn AI_PROVIDER_OFF=true", async () => {
  mockGetFeatureFlags.mockResolvedValueOnce([
    { key: "AI_PROVIDER_OFF", enabled: true, /* ... */ }
  ]);
  render(<DashboardPage />);
  await waitFor(() => {
    expect(screen.queryByText("KI-Assistent")).not.toBeInTheDocument();
  });
});
```

**Step 2:** `npx vitest run app/\(app\)/dashboard/__tests__/page.test.tsx -t "KI-Assistent"` → Erwartung: FAIL

**Step 3: Implementation**

In `dashboard/page.tsx` den KI-Assistent-Block (Zeilen ~296-310) in eine `<FeatureGate feature="DASHBOARD_AI_QUICK_ACCESS" fallback={null}>` wrappen — Default-Verhalten: Flag fehlt → ausgeblendet (Founder schaltet ein wenn AVV durch).

Plus Migration 193 (file-only, Founder-Go fuer Apply):
```sql
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('DASHBOARD_AI_QUICK_ACCESS', false,
   'KI-Assistent als Schnellzugriff auf Dashboard (default off bis AVV durch)')
ON CONFLICT (key) DO NOTHING;
```

**Step 4:** Test laufen → PASS

**Step 5:** Commit `fix(dashboard): hide KI-Assistent quick-access until AVV (§5)`

---

### Task 2: "Nachrichten"-Schnellzugriff bereinigen — "Chat"-Tile aus DiscoverGrid raus

**Files:**
- Modify: `components/dashboard/DiscoverGrid.tsx:140-148` (secondary "Chat"-Eintrag entfernen)
- Modify: `components/dashboard/__tests__/DiscoverGrid.test.tsx:84-97` (Test "secondary enthaelt ...")
- Optional: Migration 193 erweitern um `DELETE FROM feature_flags WHERE key='DISCOVER_TILE_MESSAGES'` oder Flag auf disabled-Default

**Step 1: Test anpassen**

Existing `it("secondary enthaelt Mein Tag + Pakete + Pflegegrad-Navigator")` — Pruefung dass `/messages` nicht mehr im DiscoverGrid ist.

**Step 2:** Run Test → FAIL

**Step 3:** `/messages`-Tile aus `secondaryItems` entfernen.

**Step 4:** Run Test → PASS

**Step 5:** Commit `refactor(discover): drop Chat tile (duplicate of Nachrichten quick-access)`

---

### Task 3: DiscoverGrid in 4 Kategorien aufteilen

**Files:**
- Modify: `components/dashboard/DiscoverGrid.tsx` — neue Daten-Struktur mit `category`-Property pro Tile
- Modify: `components/dashboard/__tests__/DiscoverGrid.test.tsx`

**Step 1: Failing-Tests**

```tsx
it("rendert Kategorie-Headlines (Nachbarschaft, Hilfe & Pflege, Quartier-Info)", () => {
  render(<DiscoverGrid />);
  expect(screen.getByText("Nachbarschaft")).toBeInTheDocument();
  expect(screen.getByText("Hilfe & Pflege")).toBeInTheDocument();
  expect(screen.getByText("Quartier-Info")).toBeInTheDocument();
});

it("Nachbarschaft enthaelt Brett + Hilfe + Marktplatz + Gruppen + Veranstaltungen", () => {
  // ... Test scoped to category section
});
```

**Step 2:** Run Tests → FAIL

**Step 3: Implementation**

Datentyp erweitern:
```ts
interface DiscoverItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bgColor: string;
  iconColor: string;
  flagKey: string;
  category: "nachbarschaft" | "hilfe_pflege" | "quartier_info" | "mehr";
}
```

Tiles re-mappen:
- `nachbarschaft`: Brett, Hilfe, Marktplatz, Gruppen, Veranstaltungen
- `hilfe_pflege`: Mein Tag, Aufgabentafel, Einkaufshilfe, Pflegegrad, Sprechstunde
- `quartier_info`: Karte, Muellkalender, Rathaus, Maengel, Praevention
- `mehr`: Experten, Handwerker, Leihboerse, Mitessen, Wer hat?, Pakete, Fundbuero, Laerm-Meldung, Tipps

Render-Struktur:
```tsx
<section>
  <CategorySection title="Nachbarschaft" tiles={nachbarschaftTiles} />
  <CategorySection title="Hilfe & Pflege" tiles={hilfePflegeTiles} />
  <CategorySection title="Quartier-Info" tiles={quartierInfoTiles} />
  {!expanded && <button>Mehr entdecken</button>}
  {expanded && <CategorySection title="Mehr Funktionen" tiles={mehrTiles} />}
</section>
```

**Step 4:** Run Tests → PASS

**Step 5:** Commit `feat(dashboard): group DiscoverGrid into 4 semantic categories`

---

### Task 4: "Kalender"-Tile umbenennen → "Muellkalender"

**Files:**
- Modify: `components/dashboard/DiscoverGrid.tsx` — `label: "Kalender"` → `label: "Muellkalender"`
- Modify: `components/dashboard/__tests__/DiscoverGrid.test.tsx` — kleinen Label-Test

**Step 1: Test**
```tsx
it("/waste-calendar-Tile traegt eindeutiges Label 'Muellkalender'", () => {
  render(<DiscoverGrid />);
  const tile = screen.getByRole("link", { name: /Muellkalender/ });
  expect(tile.getAttribute("href")).toBe("/waste-calendar");
});
```

**Step 2:** Run → FAIL

**Step 3:** Label aendern.

**Step 4:** Run → PASS

**Step 5:** Commit `fix(discover): rename Kalender to Muellkalender (avoids confusion with Veranstaltungskalender)`

---

### Task 5: Manueller Live-Smoke nach Deploy

**Steps:**
1. `git push origin master` (autonom OK via Variante A)
2. `gh workflow run "Deploy to Vercel Production" -R ClaudeTheo/nachbar-io --ref master`
3. Wait for green (~4-6 Min)
4. Founder-Hand: `https://nachbar-io.vercel.app/dashboard` hart refreshen, visuelle Verifikation der 4 Kategorien
5. Founder-Hand: `https://nachbar-io.vercel.app/admin` → FeatureFlagManager → Tile abschalten und Live-Verifikation der Verschwindung

---

## Open Questions (Founder-Entscheidung)

1. **Kategorie-Aufteilung Q1:** Ist die Zuordnung Tile→Kategorie OK? Beispiele zum Bestreiten:
   - "Praevention" in Quartier-Info statt Hilfe & Pflege (weil oft Stadt-Angebote)
   - "Pakete" in Nachbarschaft statt Mehr (weil nachbarschaftliche Hilfe)
   - "Mitessen" in Nachbarschaft statt Mehr

2. **"Neuigkeiten"-Schnellzugriff verlinkt auf `/news`** — soll `/news` zusaetzlich als Tile in "Quartier-Info" auftauchen? Aktuell ist es **nur** Schnellzugriff, kein Tile.

3. **SOS-Kachel-Position:** Aktuell zwischen Caregivers und Schnellzugriffen. Wuerde "ganz oben (unter Hero)" mehr Sinn machen?

4. **Tile-Count pro Kategorie:** 5/5/5/10 — geht das auch z.B. 4/4/4/13? Designaesthetik vs. Senior-Tauglichkeit.

5. **Englische Label-Reste?** Pre-Check hat "Events" gefunden (ist jetzt "Veranstaltungen"). Lohnt ein Audit-Lauf auf weitere englische UI-Labels?

---

## Migration-Anhang (file-only, Founder-Go fuer Apply)

```sql
-- 193_dashboard_ai_quick_access.sql
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('DASHBOARD_AI_QUICK_ACCESS', false,
   'KI-Assistent als Schnellzugriff auf Dashboard (default off bis §5 AVV durch)')
ON CONFLICT (key) DO NOTHING;
```
