# NINA + DWD + UBA + LGL-BW Hausumringe — Welle-1-Integration

> **Fuer Claude / Codex:** Dies ist der Phase-A-Plan aus dem Handoff
> `docs/plans/2026-04-16-external-apis-research-handoff.md`.
> **Phase B** (Tasks 4-11, 13, 14) wird von **Codex GPT-5.4 xhigh** ausgefuehrt.
> **Phase C** (Task 12) und **Phase D** (Tasks 15, 16) macht **Claude**.
> Vor Phase B-Start: REQUIRED SUB-SKILL `superpowers:executing-plans`.

**Goal:** Welle 1 der externen-API-Anbindung ausliefern — vier kostenlose
amtliche Quellen (NINA, DWD, UBA, LGL-BW Hausumringe) einheitlich hinter
Feature-Flags, mit DWD-Hitze-×-Heartbeat-Eskalation als Killer-Feature
fuer Senioren.

**Architecture:**
1. Alle Provider-Clients liegen unter `lib/integrations/<provider>/` und
   liefern normalisierte Typen (`NinaWarning`, `DwdWarning`, `UbaReading`).
2. Ein einzelner Batch-Cronjob `/api/cron/external-warnings` zieht pro
   Lauf alle aktiven Quartiere ab und schreibt in `external_warning_cache`
   (Migration 158). Kein Client greift je direkt gegen NINA/DWD/UBA.
3. Read-Pfad laeuft ueber `/api/warnings/...` mit `checkFeatureAccess()`-
   Wrapper (`lib/feature-flags-server.ts`) pro Provider-Flag.
4. Frontend-Komponente `<ExternalWarningBanner />` zeigt aggregiert,
   Attribution im Footer Pflicht (keine Warnung ohne Quellenangabe).
5. DWD-Hitze loest zusaetzlich den bestehenden Heartbeat-Escalation-Pfad
   aus (`escalation_events` aus Migration 154).
6. LGL-BW Hausumringe ist reiner Kartenlayer-Hook, kein DB-Cache noetig
   (WMS-Tiles werden von Leaflet gecached).

**Tech Stack:**
- Next.js 16 (App Router), TypeScript strict
- Supabase (Migrationen 157 + 158)
- `fast-xml-parser` fuer CAP-1.2-XML (bereits in `package.json` — vorab
  verifizieren, sonst `npm i fast-xml-parser`)
- Vitest + Fixtures fuer Parser-Tests
- Vercel Cron (Registrierung in `vercel.json`)
- Leaflet `TileLayer.WMS` fuer LGL-BW-Outlines

**Migrations-Abhaengigkeiten (zwingend vor Code-Deploy):**
- `supabase/migrations/157_external_api_flags.sql` (NICHT ANGEWENDET, Founder-Go Pflicht)
- `supabase/migrations/158_external_warning_cache.sql` (NICHT ANGEWENDET)

**Apply-Weg (Founder-Entscheidung 4):** MCP `apply_migration`, strikt
sequenziell. Keine `supabase db push`-Variante, um Drift gegen die 156
vorhandenen Migrationen zu vermeiden. Konkreter Ablauf:

```
0) Supabase-Dashboard: PITR-Aktivierungsstand pruefen (MEMORY-TODO).
   Bei 157/158 low-risk (ALTER TABLE + CREATE TABLE, 0 Nutzer),
   aber gute Gewohnheit vor erstem Produktiv-Deploy.

1) mcp__f9a85960-...__apply_migration
     name:  "external_api_flags"
     query: <Inhalt 157_external_api_flags.sql>

2) mcp__f9a85960-...__execute_sql
     <die 3 Verifikations-SELECTs aus der Fussnote von 157>

3) mcp__f9a85960-...__apply_migration
     name:  "external_warning_cache"
     query: <Inhalt 158_external_warning_cache.sql>

4) mcp__f9a85960-...__execute_sql
     <die 5 Verifikations-SELECTs aus der Fussnote von 158>

5) Lokal committen (NICHT pushen):
   git add supabase/migrations/157_external_api_flags.sql \
           supabase/migrations/158_external_warning_cache.sql
   git commit -m "chore(db): add external API flags + warning cache"
```

**Rechtliche Vorgaben (aus Handoff Abschnitt „Rechtsrisiko-Matrix"):**
- NINA  → Quelle „Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)"
- DWD   → Quelle „Deutscher Wetterdienst"
- UBA   → Quelle „Umweltbundesamt", dl-de/by-2-0
- LGL-BW → LGL-Anzeige durch Founder bevor Flag auf `enabled=true` geht

---

## Rollout-Reihenfolge

```
Phase A (Claude, bereits erledigt):
  1. Migration 157 entwerfen        — DONE, Datei vorhanden
  2. Migration 158 entwerfen        — DONE, Datei vorhanden
  3. Dieses Plan-Dokument           — DONE

                ↓ Founder-Go  ↓

Phase B (Codex GPT-5.4 xhigh, 1-2 lange Sessions):
  4.  NINA Client + Types                          (xhigh)
  5.  NINA CAP-Parser + Tests                      (xhigh)
  6.  DWD Client + CAP-Parser + Tests              (xhigh)
  7.  LGL-BW Outlines — WMS TileLayer-Hook         (xhigh)
  8.  API-Routen /api/warnings/{nina,dwd,uba}      (high)
  9.  Batch-Cron /api/cron/external-warnings       (xhigh)
  10. Vitest-Suite fuer Clients                    (medium)
  11. UBA Client + Route                           (high)
  13. Frontend: <ExternalWarningBanner /> + Attrib (high)
  14. Admin-UI: „Externe APIs"-Gruppe in FeatureFlagManager  (xhigh)

                ↓

Phase C (Claude):
  12. DWD-Hitze × Heartbeat-Escalation-Trigger

                ↓

Phase D (Claude):
  15. Integration-Review (RLS + checkFeatureAccess + Attribution)
  16. Rechts-Pruefung (NINA-Attribution-Text, LGL-Anzeige-Formular)

                ↓

Phase E (Mensch):
  17. Manuelle Verifikation Bad Saeckingen + Founder-Freigabe
      — KEIN Push nach master ohne Founder-Go.
```

**Cron-Budget (aus Handoff-Frage 3):**
- Bad Saeckingen einzeln: 6 Req/h × 24 h × 3 Provider = **432 Req/Tag**.
- Vercel Hobby-Limit: 100.000 Req/Tag — sehr weit entfernt.
- Fuer jetzt pro Quartier einzeln fetchen. Batch-Fetcher mit
  `Promise.allSettled()` + Fair-Use-Sleep einbauen, damit bei 50
  Quartieren spaeter (dann 7.200 Req/Tag × 3 = 21.600 Req/Tag) kein
  Umbau noetig ist.

---

## Task 4: NINA Client + Types (Codex xhigh)

**Ziel:** REST-Client fuer `https://warnung.bund.de/api31/dashboard/{ARS}.json`
mit Retry, Timeout und Typen.

**Files:**
- Create: `lib/integrations/nina/client.ts`
- Create: `lib/integrations/nina/types.ts`
- Create: `lib/integrations/nina/__tests__/client.test.ts`
- Create: `lib/integrations/nina/__tests__/fixtures/nina-bad-saeckingen.json`

**Step 1: Fixture ablegen**

Realen NINA-Dashboard-Response fuer `08337007` einmal manuell per
`curl https://warnung.bund.de/api31/dashboard/08337007.json` ziehen
und als Fixture speichern. (Alternativ: ein gaengiger Stand von 2025 aus
der NINA-Doku — Hauptsache valides JSON mit mindestens einer Warnung.)

**Step 2: Typen**

```ts
// lib/integrations/nina/types.ts
export type NinaSeverity = "Minor" | "Moderate" | "Severe" | "Extreme" | "Unknown";

export interface NinaDashboardItem {
  id: string;            // z.B. "mow.DE-BBK-W-1234567"
  version: string;       // sent timestamp
  startDate: string;     // ISO 8601
  expiresDate?: string;
  severity: NinaSeverity;
  urgency: string;
  type: string;          // "Update", "Alert", "Cancel"
  i18nTitle: Record<string, string>;
  payload: {
    data: {
      headline: string;
      description?: string;
      instruction?: string;
      category?: string;
      event?: string;
      area?: Array<{ areaDesc: string; geocode?: Array<{ valueName: string; value: string }> }>;
    };
  };
}

export interface NinaFetchResult {
  ars: string;
  fetchedAt: Date;
  warnings: NinaDashboardItem[];
}
```

**Step 3: Client mit Retry + Timeout**

```ts
// lib/integrations/nina/client.ts
import type { NinaDashboardItem, NinaFetchResult } from "./types";

const NINA_BASE = "https://warnung.bund.de/api31";
const FETCH_TIMEOUT_MS = 10_000;
const RETRY_ATTEMPTS = 2;

export async function fetchNinaWarnings(ars: string): Promise<NinaFetchResult> {
  const url = `${NINA_BASE}/dashboard/${encodeURIComponent(ars)}.json`;
  const warnings = await fetchWithRetry<NinaDashboardItem[]>(url);
  return { ars, fetchedAt: new Date(), warnings };
}

async function fetchWithRetry<T>(url: string, attempt = 0): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "nachbar.io/1.0 (+https://nachbar.io)" },
    });
    if (!res.ok) throw new Error(`NINA ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } catch (err) {
    if (attempt < RETRY_ATTEMPTS) {
      await sleep(500 * 2 ** attempt);
      return fetchWithRetry<T>(url, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

**Step 4: Tests (TDD — vor Implementation schreiben!)**

```ts
// lib/integrations/nina/__tests__/client.test.ts
import { describe, it, expect, vi } from "vitest";
import { fetchNinaWarnings } from "../client";
import fixture from "./fixtures/nina-bad-saeckingen.json";

describe("fetchNinaWarnings", () => {
  it("parses a real NINA dashboard response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    } as Response);

    const result = await fetchNinaWarnings("08337007");
    expect(result.ars).toBe("08337007");
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("retries on transient failures", async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls < 2) throw new Error("ECONNRESET");
      return { ok: true, json: async () => [] } as unknown as Response;
    });

    const result = await fetchNinaWarnings("08337007");
    expect(result.warnings).toEqual([]);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("throws after exhausting retries", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("5xx"));
    await expect(fetchNinaWarnings("08337007")).rejects.toThrow();
  });
});
```

**Step 5: Run + Commit**

```bash
cd "C:/Users/thoma/Documents/New project/nachbar-io"
npx vitest run lib/integrations/nina/__tests__/client.test.ts
# Erwartet: 3 Tests gruen

git add lib/integrations/nina supabase/migrations/157_external_api_flags.sql
git commit -m "feat(integrations): NINA client with retry"
```

---

## Task 5: NINA CAP-Parser (Codex xhigh)

**Ziel:** NINA-Dashboard-Items zu `ExternalWarningCacheRow` normalisieren,
kompatibel mit Migration 158.

**Files:**
- Create: `lib/integrations/nina/parser.ts`
- Create: `lib/integrations/nina/__tests__/parser.test.ts`

**Step 1: Parser-Funktion**

```ts
// lib/integrations/nina/parser.ts
import type { NinaDashboardItem } from "./types";
import type { Database } from "@/lib/supabase/database.types";

type CacheInsert = Database["public"]["Tables"]["external_warning_cache"]["Insert"];

const SEVERITY_MAP: Record<string, CacheInsert["severity"]> = {
  Minor: "minor",
  Moderate: "moderate",
  Severe: "severe",
  Extreme: "extreme",
};

export function toCacheRow(
  item: NinaDashboardItem,
  ctx: { quarterId?: string; ars: string; batchId: string },
): CacheInsert {
  const data = item.payload?.data ?? {};
  return {
    provider: "nina",
    external_id: item.id,
    external_version: item.version ?? null,
    quarter_id: ctx.quarterId ?? null,
    ars: ctx.ars,
    warncell_id: null,
    headline: data.headline ?? item.i18nTitle?.DE ?? "Warnung",
    description: data.description ?? null,
    instruction: data.instruction ?? null,
    severity: SEVERITY_MAP[item.severity] ?? "unknown",
    category: data.category ?? null,
    event_code: data.event ?? null,
    onset_at: item.startDate ? new Date(item.startDate).toISOString() : null,
    expires_at: item.expiresDate ? new Date(item.expiresDate).toISOString() : null,
    sent_at: item.version ? new Date(item.version).toISOString() : null,
    status: item.type === "Cancel" ? "cancelled" : "active",
    raw_payload: item as unknown as CacheInsert["raw_payload"],
    attribution_text:
      "Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)",
    attribution_url: `https://warnung.bund.de/meldung/${item.id}`,
    fetch_batch_id: ctx.batchId,
  };
}
```

**Step 2: Tests (TDD)**

```ts
// lib/integrations/nina/__tests__/parser.test.ts
import { describe, it, expect } from "vitest";
import { toCacheRow } from "../parser";
import fixture from "./fixtures/nina-bad-saeckingen.json";

describe("toCacheRow", () => {
  const ctx = { ars: "08337007", batchId: "00000000-0000-0000-0000-000000000001" };

  it("maps a real NINA item to a valid cache row", () => {
    const [first] = fixture;
    const row = toCacheRow(first, ctx);
    expect(row.provider).toBe("nina");
    expect(row.external_id).toBe(first.id);
    expect(row.attribution_text).toMatch(/BBK/);
    expect(["minor", "moderate", "severe", "extreme", "unknown"]).toContain(row.severity);
  });

  it("marks Cancel type as cancelled", () => {
    const row = toCacheRow(
      { ...fixture[0], type: "Cancel" } as never,
      ctx,
    );
    expect(row.status).toBe("cancelled");
  });

  it("falls back to DE title if headline missing", () => {
    const item = {
      ...fixture[0],
      payload: { data: {} },
      i18nTitle: { DE: "Fallback" },
    } as never;
    const row = toCacheRow(item, ctx);
    expect(row.headline).toBe("Fallback");
  });
});
```

**Step 3: Run + Commit**

```bash
npx vitest run lib/integrations/nina/__tests__/parser.test.ts
git add lib/integrations/nina/parser.ts lib/integrations/nina/__tests__
git commit -m "feat(integrations): NINA cache-row parser"
```

---

## Task 6: DWD Client + CAP-Parser (Codex xhigh)

**Ziel:** CAP-1.2-XML-Feed von
`https://opendata.dwd.de/weather/alerts/cap/COMMUNEUNION_DWD_STAT/` (oder
gezielteren Endpunkt mit WarnCellID-Filter) abrufen, parsen und in
Cache-Rows umwandeln.

**Files:**
- Create: `lib/integrations/dwd/client.ts`
- Create: `lib/integrations/dwd/parser.ts`
- Create: `lib/integrations/dwd/types.ts`
- Create: `lib/integrations/dwd/__tests__/client.test.ts`
- Create: `lib/integrations/dwd/__tests__/parser.test.ts`
- Create: `lib/integrations/dwd/__tests__/fixtures/dwd-hitze.cap.xml`

**Step 1: Fixture**

Ein echtes CAP-1.2-XML aus dem DWD-Archiv (Hitzewarnung bevorzugt) als
statische Datei hinterlegen, damit Tests deterministisch sind.

**Step 2: `fast-xml-parser` verfuegbar machen**

```bash
cd "C:/Users/thoma/Documents/New project/nachbar-io"
npm ls fast-xml-parser || npm i fast-xml-parser
```

**Step 3: Client (gleiches Muster wie NINA — Fetch + Retry + Timeout)**

Endpunkt laesst sich auf zwei Arten adressieren:
- `COMMUNEUNION_DWD_STAT/Z_CAP_*.xml` (rolling ZIP, aufwendig)
- Besser fuer MVP: JSON-Endpunkt `https://maps.dwd.de/geoserver/dwd/ows?service=WFS&request=GetFeature&typeName=dwd:Warnungen_Gemeinden&outputFormat=json&cql_filter=WARNCELLID=...`

Entscheidung fuer WFS/JSON + `WARNCELLID` ist pragmatisch: kein XML-Overhead
im Client, Bad Saeckingen ist ein stabiles Feature-ID, und der Rueckfall auf
CAP-XML ist dokumentiert.

```ts
// lib/integrations/dwd/client.ts
export async function fetchDwdWarnings(warncellId: string) { /* analog zu NINA */ }
```

**Step 4: Parser (CAP-1.2 → CacheInsert)**

Severity-Mapping analog zu NINA. Zusaetzlich `event_code` aus CAP `<eventCode>`,
`warncell_id` aus `<areaDesc>` extrahieren. Attribution fix:
`"Quelle: Deutscher Wetterdienst"`.

**Step 5: Tests — gleiche drei Grundfaelle wie NINA**
- realer Fixture parsed
- Cancel markiert
- Hitze-Severity korrekt auf `severe`/`extreme` gemapped

**Step 6: Commit**

```bash
git add lib/integrations/dwd package.json package-lock.json
git commit -m "feat(integrations): DWD warnings via WFS JSON"
```

---

## Task 7: LGL-BW Hausumringe (Codex xhigh)

**Ziel:** WMS-TileLayer in Leaflet einblenden, abhaengig von
`LGL_BW_BUILDING_OUTLINES_ENABLED`. Kein DB-Cache, kein Server-Roundtrip.

**Files:**
- Create: `components/map/lgl-bw-outlines-layer.tsx`
- Modify: `components/map/LeafletMapInner.tsx` (neuen Layer registrieren,
  genauen Anker-Block beim Lesen der Datei ermitteln)

**Endpunkt (aus Handoff):**
```
Base-URL:  https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ALKIS_Hausumringe
Parameter (von react-leaflet an WMS-Server angehaengt):
  SERVICE=WMS, VERSION=1.3.0, REQUEST=GetMap, LAYERS=Hausumringe,
  FORMAT=image/png, TRANSPARENT=true
BBOX, WIDTH, HEIGHT, CRS werden je Tile automatisch gesetzt.
```

**Step 1: Layer-Komponente (`<WMSTileLayer>` aus react-leaflet 5)**

`react-leaflet@5.0.0` ist im Projekt installiert (package.json). Der korrekte
Weg fuer WMS-Layer ist die `<WMSTileLayer>`-Komponente — sie kapselt
`L.tileLayer.wms` intern und baut die BBOX/CRS-Parameter pro Tile selbst.
KEINE `<TileLayer url="...{bbox}...">`-Variante (die erkennt `{bbox}` nicht
als Platzhalter).

```tsx
// components/map/lgl-bw-outlines-layer.tsx
"use client";
import { WMSTileLayer } from "react-leaflet";
import { useFeatureFlag } from "@/lib/feature-flags";

type UserCtx = { role: string; plan: string; quarter_id?: string };

export function LglBwOutlinesLayer({ userCtx }: { userCtx: UserCtx }) {
  const enabled = useFeatureFlag("LGL_BW_BUILDING_OUTLINES_ENABLED", userCtx);
  if (!enabled) return null;

  return (
    <WMSTileLayer
      url="https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ALKIS_Hausumringe"
      layers="Hausumringe"
      format="image/png"
      transparent={true}
      version="1.3.0"
      opacity={0.7}
      zIndex={400}
      attribution='© <a href="https://www.lgl-bw.de" target="_blank" rel="noreferrer">LGL Baden-Wuerttemberg</a>'
    />
  );
}
```

**Step 2: Integration in `LeafletMapInner.tsx`**

Die bestehende `<TileLayer url={tileUrl} />` (MapTiler + OSM) bleibt als
Basiskarte, der neue WMS-Layer wird **darueber** gerendert. Einfach
direkt unter den bestehenden `<TileLayer>`-Block im JSX einsetzen.

**Step 2: Manueller Test**

```bash
npm run dev
# Karte oeffnen, Flag via Admin-UI oder direkt in DB aktivieren
# UPDATE feature_flags SET enabled = true WHERE "key" = 'LGL_BW_BUILDING_OUTLINES_ENABLED';
# Layer muss bei Bad Saeckingen-Zoom sichtbar sein
```

**Step 3: Commit**

```bash
git add components/map
git commit -m "feat(map): LGL-BW Hausumringe WMS layer"
```

---

## Task 8: API-Routen /api/warnings/{nina,dwd,uba} (Codex high)

**Ziel:** GET-Endpunkte lesen ausschliesslich aus `external_warning_cache`,
filtern nach `quarter_id` des eingeloggten Nutzers, liefern Array.

**Files:**
- Create: `app/api/warnings/nina/route.ts`
- Create: `app/api/warnings/dwd/route.ts`
- Create: `app/api/warnings/uba/route.ts`
- Create: `lib/integrations/__shared__/list-warnings.ts`

**Shared Helper (DRY):**

```ts
// lib/integrations/__shared__/list-warnings.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";
import { getUserQuarterId } from "@/lib/quarters/helpers";

type Provider = "nina" | "dwd" | "uba";

const FLAG_BY_PROVIDER: Record<Provider, string> = {
  nina: "NINA_WARNINGS_ENABLED",
  dwd: "DWD_WEATHER_WARNINGS_ENABLED",
  uba: "UBA_AIR_QUALITY_ENABLED",
};

export async function listWarnings(provider: Provider) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  // Flag-Check (prueft nur `enabled`, nicht required_plans/roles/quarters —
  // fuer Welle 1 ok, weil Warnungen keine Plan-/Rollen-Gates haben.)
  const allowed = await isFeatureEnabledServer(supabase, FLAG_BY_PROVIDER[provider]);
  if (!allowed) return NextResponse.json([]); // keine 404 — leere Liste ist erwartet

  // Quartier-Scoping: jeder Nutzer sieht nur Warnungen fuer sein eigenes
  // Quartier. Ohne dieses Filter wuerde der Cache alle Quartiere leaken.
  const quarterId = await getUserQuarterId(supabase, user.id);
  if (!quarterId) return NextResponse.json([]); // Nutzer ohne Quartier sieht nichts

  const { data, error } = await supabase
    .from("external_warning_cache")
    .select("id, headline, description, severity, onset_at, expires_at, attribution_text, attribution_url")
    .eq("provider", provider)
    .eq("status", "active")
    .eq("quarter_id", quarterId)
    .gte("expires_at", new Date().toISOString())
    .order("severity", { ascending: false })
    .order("sent_at", { ascending: false });

  if (error) {
    console.error(`[warnings/${provider}]`, error);
    return NextResponse.json([], { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
```

**Zwei wichtige Hinweise fuer Codex:**

1. `getUserQuarterId(supabase, userId)` existiert bereits in
   `lib/quarters/helpers.ts` — NICHT neu implementieren.
2. `isFeatureEnabledServer` prueft derzeit nur das `enabled`-Flag, NICHT
   `required_plans` / `required_roles` / `enabled_quarters`. Fuer
   Warnungs-Routes in Welle 1 ist das akzeptabel (Warnungen sind allgemein
   verfuegbar). Wenn spaetere Features ein echtes Server-seitiges
   Plan/Role-Gate brauchen, muss `lib/feature-flags-server.ts`
   entsprechend erweitert werden — separater Task, nicht Welle 1.

Jede der drei Routen ist dann:

```ts
// app/api/warnings/nina/route.ts
export const dynamic = "force-dynamic";
import { listWarnings } from "@/lib/integrations/__shared__/list-warnings";
export async function GET() { return listWarnings("nina"); }
```

**API-Response-Format:** Arrays zurueckgeben (CLAUDE.md-Regel). Nicht
`{ items: [...] }`.

---

## Task 9: Batch-Cron /api/cron/external-warnings (Codex xhigh)

**Ziel:** Alle 10 Min pro aktivem Quartier NINA + DWD + UBA ziehen, Cache
aktualisieren, Sync-Log schreiben.

**Files:**
- Create: `app/api/cron/external-warnings/route.ts`
- Modify: `vercel.json` — Eintrag hinzufuegen:
  ```json
  { "path": "/api/cron/external-warnings", "schedule": "*/10 * * * *" }
  ```

**Skeleton (folgt dem etablierten Muster aus `app/api/cron/analytics/route.ts`):**

```ts
// app/api/cron/external-warnings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { fetchNinaWarnings } from "@/lib/integrations/nina/client";
import { toCacheRow as ninaToCacheRow } from "@/lib/integrations/nina/parser";
// analog DWD + UBA

export const dynamic = "force-dynamic";
export const maxDuration = 120; // konsistent mit amtsblatt-sync; Vercel Hobby max 60, Pro max 300

export async function GET(request: NextRequest) {
  // Cron-Auth: 2-stufige Pruefung (etabliertes Muster, siehe analytics/route.ts)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/external-warnings] CRON_SECRET nicht konfiguriert");
    return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const admin = getAdminSupabase(); // service_role — bypasst RLS
  const batchId = crypto.randomUUID();

  const { data: quarters } = await admin
    .from("quarters")
    .select("id, slug, bbk_ars, bw_ars")
    .eq("status", "active")
    .not("bbk_ars", "is", null);

  const results = await Promise.allSettled(
    (quarters ?? []).map(async (q) => {
      const ninaResult = await fetchNinaWarnings(q.bbk_ars!);
      const rows = ninaResult.warnings.map((w) =>
        ninaToCacheRow(w, { quarterId: q.id, ars: q.bbk_ars!, batchId }),
      );
      if (rows.length > 0) {
        await admin.from("external_warning_cache").upsert(rows, {
          onConflict: "provider,external_id,external_version",
          ignoreDuplicates: true,
        });
      }
      await admin.from("external_warning_sync_log").insert({
        batch_id: batchId,
        provider: "nina",
        quarter_id: q.id,
        ars: q.bbk_ars,
        status: "success",
        warnings_fetched: rows.length,
        finished_at: new Date().toISOString(),
      });
      return { quarter: q.slug, count: rows.length };
    }),
  );

  // TODO analog DWD + UBA
  return NextResponse.json({ batchId, results: results.map((r) => r.status) });
}
```

**Wichtig (CLAUDE.md-Regeln):**
- Cron IMMER ueber `getAdminSupabase()`, nie `createClient()`. Sonst greifen
  RLS-Policies und Inserts schlagen fehl.
- CRON_SECRET-Check zweistufig: erst pruefen dass die Variable gesetzt ist
  (500 bei Konfigurationsfehler), dann Bearer-Token vergleichen (401 bei
  falschem Token). Ein fehlender Secret darf nicht zu 401 fuehren — sonst
  ist der Endpoint bei Config-Fehler oeffentlich offen aussehen wuerde.
- `maxDuration = 120`: identisch zu `amtsblatt-sync` und innerhalb Vercel
  Hobby-Limit (60 s) ist unrealistisch fuer 50 Quartiere × 3 Provider.
  Bei Vercel Hobby-Plan muss auf 60 reduziert und Batch-Chunking eingefuehrt
  werden (Folge-Task). Bei Pro: bis 300 moeglich.

---

## Task 10: Vitest-Suite (Codex medium)

**Ziel:** 90%+ Parser-Coverage, Client-Mocks, keine echten HTTP-Calls.

Tests entstehen bereits in Tasks 4-6. Task 10 ist das Final-Audit:
- Alle `lib/integrations/*/__tests__` laufen gruen via `npm run test`.
- Keine `fetch`-Aufrufe gegen echte Endpunkte (mit `vi.fn()` ueberschrieben).
- `npx tsc --noEmit` sauber.

```bash
npm run test -- lib/integrations
npx tsc --noEmit
```

---

## Task 11: UBA Client + Route (Codex high)

**Ziel:** `https://www.umweltbundesamt.de/api/air_data/v2/` Station-Ids in
BW ziehen, Messwerte PM10/PM2.5/NO2/O3 normalisieren, Cache-Row pro
Station je Messzeitpunkt.

**Files:**
- Create: `lib/integrations/uba/client.ts`
- Create: `lib/integrations/uba/parser.ts`
- Create: `lib/integrations/uba/__tests__/*`
- Create: `app/api/warnings/uba/route.ts` (bereits in Task 8 angelegt, nur
  sicherstellen dass er existiert)

UBA ist kein klassisches Warnsystem sondern liefert Messwerte. Parser
erzeugt trotzdem `CacheInsert`-Zeilen mit `severity` abhaengig vom
Luftqualitaetsindex:
- LQI 1-2 → ignorieren (nichts einfuegen)
- LQI 3 → `minor`
- LQI 4 → `moderate`
- LQI 5 → `severe`

Attribution: `"Quelle: Umweltbundesamt, dl-de/by-2-0"`.

---

## Task 13: `<ExternalWarningBanner />` + Attribution-Footer (Codex high)

**Ziel:** UI-Komponente, die aktive Warnungen pro Provider anzeigt.

**Files:**
- Create: `components/warnings/external-warning-banner.tsx`
- Create: `components/warnings/attribution-footer.tsx`
- Create: `components/warnings/__tests__/external-warning-banner.test.tsx`

**Regeln fuer UI (Handoff + CLAUDE.md „Kritische Regeln" + Founder-Entscheidung 2):**
- Notfall-Banner-Farblogik NICHT ueberschreiben: Rot nur fuer 112/110,
  Warnung = Amber `#F59E0B`. NINA-`extreme` daher Amber + starker
  Kontrast, NICHT Rot.
- Senior-Mode: min. 80px Touch-Target fuer „Warnung anzeigen"-Button,
  min. 4.5:1 Kontrast.
- `<AttributionFooter />` ist Pflicht — eine `attribution_text`-Quelle pro
  sichtbarer Warnung, kleine Schriftgroesse erlaubt (14px min), aber sichtbar.
- `<AttributionFooter />` verlinkt zusaetzlich auf `/datenquellen`
  (Text: „Mehr zu Datenquellen"). Kein Inline-Link zur externen Lizenz
  aus dem Warn-Element heraus — Nutzerfluss bleibt in der App.

**Abruf-Pattern:**

```tsx
// Kein Direct-Fetch von NINA/DWD. Nur ueber die eigenen /api/warnings/*-Routen.
const nina = await fetch("/api/warnings/nina", { cache: "no-store" });
```

**Test (TDD):**
- Rendert nichts bei leerer Liste
- Rendert Attribution bei genau einer Warnung
- Sortiert severe vor moderate

---

## Task 14: Admin-UI — Gruppierung „Externe APIs" in FeatureFlagManager

**Korrektur gegenueber Handoff:** Ein separates `nachbar-admin/`-Repo
existiert in diesem Workspace NICHT. Der Admin-Bereich lebt in
`nachbar-io` unter `app/(app)/admin/`. Die Feature-Flag-Verwaltung ist
bereits implementiert — `app/(app)/admin/components/FeatureFlagManager.tsx`
(rund 150 Zeilen, laedt alle Flags, toggelt `enabled` per Switch).

**Ziel:** Die neuen 10 externen-API-Flags erscheinen automatisch, weil der
Manager alle Flags auflistet. Zusaetzlich: sinnvolle Gruppierung einbauen,
damit die Liste bei 28 Flags nicht unuebersichtlich wird.

**Files:**
- Modify: `app/(app)/admin/components/FeatureFlagManager.tsx`
- Eventuell neu (falls Codex die Gruppierung in Sub-Komponente auslagert):
  `app/(app)/admin/components/FeatureFlagGroup.tsx`

**Kein separates Deployment noetig** — Admin-Seite ist Teil der nachbar-io
App, wird mit der Haupt-App ausgeliefert.

**Gruppierung (in FeatureFlagManager.tsx einfuegen):**

```ts
// Definition VOR der return-Anweisung
const FLAG_GROUPS: Array<{ title: string; pattern: RegExp }> = [
  { title: "Kern-Module",     pattern: /^(BOARD|EVENTS|NEWS|MARKETPLACE|BUSINESSES|INVITATIONS|HEARTBEAT)/ },
  { title: "Care / Plus",     pattern: /^(CAREGIVER|VIDEO_CALL)/ },
  { title: "Organisation",    pattern: /^(ORG_|MODERATION|QUARTER_STATS)/ },
  { title: "Arzt-Portal",     pattern: /^(APPOINTMENTS|VIDEO_CONSULT|GDT)/ },
  { title: "Externe APIs",    pattern: /^(NINA|DWD|UBA|DELFI|LGL_BW|OSM|BKG|BFARM|DIGA|GKV)/ },
  { title: "Admin / Sonstige", pattern: /^(ADMIN|REFERRAL|QUARTER_PROGRESS|PILOT)/ },
];
```

Beim Rendern: Flags nach Gruppe sortieren, pro Gruppe eine
`<section>`-Ueberschrift. Flags, die in kein Pattern fallen, landen unter
„Unsortiert" — das macht neue Flags sofort sichtbar, falls das Muster
mal nicht greift.

**Hinweis:** Die 10 neuen Flags haben alle `admin_override=true`
(Migration 157). In der UI sollte das neben dem Toggle mit einem
kleinen Badge „Admin-Override" sichtbar sein — Muster ist im
`FLAG_DESCRIPTIONS`-Mapping oben in der Datei erkennbar.

---

## Task 12 (CLAUDE): DWD-Hitze × Heartbeat-Eskalation

**Ziel:** Bei aktiver DWD-Hitzewarnung (severity `severe`/`extreme`) +
Heartbeat-Status `reminder_24h` oder Check-in `red`/`yellow` bei einem
Senior → zusaetzliche Alert-Mail an Angehoerige triggern, ueber das bestehende
2-Stufen-Eskalations-System aus Migration 154.

**Files:**
- Modify: `app/api/care/cron/heartbeat-escalation/route.ts` — neuer Zweig
  pruft `external_warning_cache` auf DWD-Hitze fuer das Quartier des
  Seniors, bevor alert_48h-Logik greift. Statt „alert_48h nur bei 48h
  Inaktivitaet" → „alert_48h bereits bei 24h + aktive Hitzewarnung".
- Modify: `lib/care/channels/*` — Hitze-Kontext in Benachrichtigungstext
  mit aufnehmen (`"Es herrscht aktuell Hitzewarnung (Stufe 3) in Bad Saeckingen."`).
- Create: `lib/care/__tests__/heartbeat-heat-escalation.test.ts`

**Warum Claude, nicht Codex:**
- Cross-Modul-Trigger (DWD × Heartbeat × Caregiver-Alert × Eskalations-Tabelle).
- Muss mit Migration 154's Stage-Werten `reminder_24h` / `alert_48h`
  konsistent bleiben. First-Pass-Accuracy wichtig (Handoff: Claude 95% vs
  Codex 88%).

**Kriterien (TDD):**

```ts
describe("heartbeat-heat-escalation", () => {
  it("fires alert_48h at 24h inactivity when active DWD heat warning exists for quarter", async () => { /* ... */ });
  it("does NOT fire early without heat warning", async () => { /* ... */ });
  it("includes heat warning context in notification text", async () => { /* ... */ });
  it("respects caregiver_link.revoked_at (no alert if caregiver access revoked)", async () => { /* ... */ });
});
```

**Rechts-/DSGVO-Check:** Angehoerige sehen weiterhin nur den Status
(Heartbeat + Alert-Ausloeser), NICHT den Inhalt. Die Hitze-Kontext-Zeile
in der Mail ist oeffentliche Info und damit unbedenklich.

---

## Task 15 (CLAUDE): Integration-Review

**Was wird geprueft:**

1. **RLS-Konsistenz:** Alle neuen Tabellen/Views haben `ENABLE ROW LEVEL
   SECURITY`. Keine neue Tabelle ohne mindestens `SELECT`- und `ALL`-
   Policy. Service-Role-Policy explizit.
2. **checkFeatureAccess-Wrapping:** Jede neue `/api/warnings/*`- und
   `/api/cron/external-warnings`-Route verwendet `isFeatureEnabledServer()`
   bzw. `checkFeatureAccess()`. Kein Bypass via Env-Flag.
3. **Attribution-Pflicht:** Jede UI-Komponente, die Warnungen rendert,
   zeigt `attribution_text`. Grep nach `<ExternalWarningBanner>`-Usages;
   jedes Usage muss `<AttributionFooter>` mitrendern.
4. **API-Response-Format:** Alle neuen Routen, die Listen zurueckgeben,
   nutzen `NextResponse.json([...])`, niemals `{ items: [] }`.
5. **Cron-Admin-Client:** `/api/cron/external-warnings` nutzt
   `getAdminSupabase()`, nicht `createClient()`.
6. **Kein harter Stop bei Deaktivierung:** Wenn ein Flag aus ist, geben
   Routen ein leeres Array zurueck, keine 404. Damit das Frontend sauber
   degradiert.

**Output:** Review-Protokoll als Commit-Message der Form `review(welle-1): ...`
oder separates Markdown unter `docs/reviews/2026-04-??-welle-1-review.md`.

---

## Task 16 (CLAUDE): Rechts-Texte + `/datenquellen`-Seite

**Was wird formuliert (Founder-Entscheidung 2 umgesetzt):**

1. **Pro-Warnung-Fusszeile-Texte** (kurz, 14px min), die im DB-Feld
   `external_warning_cache.attribution_text` landen:
   - NINA: `"Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)"`
   - DWD:  `"Quelle: Deutscher Wetterdienst"`
   - UBA:  `"Quelle: Umweltbundesamt, dl-de/by-2-0"`
2. **Neue Public-Seite `/datenquellen`** (kein Auth-Gate, ueber
   Public-Footer erreichbar):
   - Files:
     - Create: `app/datenquellen/page.tsx`
     - Modify: `components/layout/public-footer.tsx` (oder aequivalent —
       Pfad per Grep ermitteln, die Footer-Komponente hat bereits
       Impressum/Datenschutz-Links)
   - Inhalt (Entwurf, Claude finalisiert den Wortlaut):
     - Abschnitt NINA: Vollstaendiger Name, Link zu
       https://www.bbk.bund.de, Nutzungsbedingungen-Link.
     - Abschnitt DWD: Verweis auf GeoNutzV (BGBl. I 2013 S. 362),
       Link zu https://www.dwd.de.
     - Abschnitt UBA: Link zu dl-de/by-2-0
       (https://www.govdata.de/dl-de/by-2-0), Link zu
       https://www.umweltbundesamt.de, Datenhalter-Nennung.
     - Haftungsausschluss: "Alle Warnungen sind amtliche Fremdinhalte.
       Keine Gewaehr fuer Vollstaendigkeit, Aktualitaet oder Richtigkeit.
       Bei konkreter Gefahrenlage bitte die offiziellen Kanaele der
       Quelle zusaetzlich pruefen."
3. **LGL-BW-Anzeige-Formular** — kurze How-To-Notiz fuer den Founder:
   - Recherche: https://www.lgl-bw.de → Geodatenzentrum → Nutzungshinweise
   - Anzeige-Formular identifizieren, Link ins docs/admin-Verzeichnis
   - Keine Anwaltspruefung, Founder fuellt direkt aus (Entscheidung 1)
4. **Impressum**: keine Aenderung — Datenquellen haben eigene Seite,
   damit Impressum nicht zu voll wird.
5. **Datenschutz**: nur Satz ergaenzen: „Wir verarbeiten oeffentliche
   amtliche Warnungen (NINA/DWD/UBA). Dabei werden **keine
   personenbezogenen Daten uebertragen**. Details siehe Seite
   [Datenquellen](/datenquellen)."

**Output:** Commit mit `/datenquellen`-Seite + Datenschutz-Snippet +
Markdown-Memo an Founder mit LGL-Anzeige-Schritten.

---

## Task 17 (Mensch): Verifikation + Founder-Freigabe

**Checkliste:**

- [ ] Migrationen 157 + 158 auf Cloud-Supabase angewendet (MCP)
- [ ] Bad Saeckingen hat `bbk_ars = '08337007'` (SELECT verifiziert)
- [ ] Admin-UI zeigt die 10 neuen Flags unter „Externe APIs"
- [ ] Flag `NINA_WARNINGS_ENABLED` testweise aktiv, `enabled_quarters` enthaelt
      Bad-Saeckingen-UUID
- [ ] `curl /api/warnings/nina` als Bad-Saeckingen-Mitglied liefert leeres
      Array ODER eine Warnung (nicht 404)
- [ ] Cronjob `/api/cron/external-warnings` hat in Vercel Dashboard mind.
      einmal `200 OK` geloggt
- [ ] DWD-Hitze-Simulation: manuell Zeile mit `event_code='HITZE'` + `severity='severe'`
      in `external_warning_cache` einfuegen; Heartbeat-Cron schreibt
      `alert_48h` bei bestehender 24h-Inaktivitaet.
- [ ] LGL-BW-Layer ist in Leaflet-Karte sichtbar bei Zoom ≥ 17
- [ ] Attribution-Footer sichtbar unter jeder Warnung
- [ ] Founder-Go vor Aktivierung weiterer Quartiere

---

## Risiken + Mitigation

| Risiko | Wahrscheinl. | Impact | Mitigation |
|---|---|---|---|
| NINA-API down | mittel | niedrig | Client-Retry + leerer Fallback. Cache zeigt zuletzt gesehene Warnungen, bis expires_at abgelaufen. |
| DWD CAP-XML schema change | niedrig | mittel | Parser ist isoliert in eigenem Modul. Bei Schema-Bruch faellt nur DWD aus, Rest laeuft. |
| Vercel-Cron-Timeouts bei > 50 Quartieren | mittel | mittel | `Promise.allSettled` + `maxDuration=300`. Bei 50+ Quartieren Batch in kleinere Chunks aufsplitten (Folge-Task). |
| Falsche Attribution-Formulierung | niedrig | hoch (Abmahnrisiko) | Task 16 — vor Produktiv-Aktivierung Founder-Freigabe. |
| LGL-BW-Anzeige nicht eingereicht | mittel | niedrig | Flag bleibt `false`, bis Founder das Formular eingereicht hat. |

---

## Getroffene Entscheidungen (Founder-Go 2026-04-16)

1. **LGL-BW-Anzeige-Formular:** Founder selbst befuellt + einreicht.
   Kein Anwalt. Frist: bevor das erste Nachbar-Plus-Abo (8,90 EUR) live
   geht — davor ist Nutzung nicht-kommerziell. Bis dahin Flag
   `LGL_BW_BUILDING_OUTLINES_ENABLED` auf `false`.
2. **Attribution:** Beides — kleine Fusszeile pro Warnung + neue
   Sammel-Seite `/datenquellen` mit Links zu dl-de/by-2-0, BBK-NB,
   GeoNutzV. Nicht im Datenschutz-Abschnitt (dort geht's um
   personenbezogene Daten, die hier nicht vorkommen).
3. **Cronjob-Frequenz:** Einheitlich alle 10 Min, ein Vercel-Cron-Eintrag.
   Provider-Splitting (5/10/30) ist YAGNI bei einem Pilotquartier —
   intelligente Skip-Logik bleibt spaeterer Folge-Task, falls Skalierung
   es verlangt.
4. **Migrations-Apply:** Nach Founder-Go via MCP `apply_migration`,
   strikt 157 zuerst, dann 158. Kein `supabase db push` (Drift-Risiko
   gegen 156 vorhandene Migrationen).

**Weiterhin offen (Welle 2/3, nicht Welle 1):**
- OSM-Export-Frage: darf Marktplatz-CSV OSM-POIs enthalten? Anwalt
  notwendig bei Welle-2-Start.
- Welle-2-Prioritaet: OSM POIs vor DELFI — bleibt bis Pilot-Feedback
  offen.

---

## Commit-Strategie

- Jede Task ist ein eigener Commit (`feat(integrations): ...`).
- Migrationen NICHT mit Code-Commit mischen: erst `chore(db): add migration 157/158`
  separat committen, damit Rollback granular bleibt.
- Nach Phase B: **kein Push zu origin/master**. Founder zieht den
  Fernausloeser.
- Master-Branch direkt, keine Feature-Branches (CLAUDE.md-Regel: Solo-Workflow).

---

## Referenzen

- Handoff: `docs/plans/2026-04-16-external-apis-research-handoff.md`
- Migrationen: `supabase/migrations/157_external_api_flags.sql`,
  `supabase/migrations/158_external_warning_cache.sql`
- Feature-Flag-Infra: `lib/feature-flags.ts`, `lib/feature-flags-server.ts`
- Heartbeat-Escalation-Integration: `app/api/care/cron/heartbeat-escalation/route.ts`,
  Migration 154
