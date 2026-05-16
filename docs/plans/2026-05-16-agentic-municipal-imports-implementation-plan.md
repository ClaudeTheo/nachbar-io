# Agentic Municipal Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe "Import-Posteingang" for QuartierApp so municipal/public content from RSS, iCal, browser-agent output, and later customer-specific legacy systems can become reviewed event or announcement drafts before anything is visible to residents.

**Architecture:** The app remains API-first and human-reviewed. Deterministic sources run inside Next.js services; browser/computer-use agents run outside the app and submit normalized drafts through a signed ingestion boundary. No agent publishes directly to resident-facing tables, care data, medical data, invites, billing, auth, or emergency flows.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase/Postgres/RLS, Vitest, React Testing Library, existing `modules/events`, existing `lib/webhooks.ts` SSRF/HMAC helpers, existing `admin_audit_log`.

---

## Pre-Check Findings

Repo pre-check was run before this plan because this feature could otherwise duplicate infrastructure.

- Existing event crawler: `modules/events/services/event-feed-crawler.service.ts`
- Existing event apply service: `modules/events/services/event-feed-apply.service.ts`
- Existing admin routes: `app/api/admin/quarters/[id]/events/crawl/route.ts` and `app/api/admin/quarters/[id]/events/apply/route.ts`
- Existing Admin UI: `app/(app)/admin/page.tsx`, `app/(app)/admin/components/EventManagement.tsx`, `app/(app)/admin/components/AmtsblattReprocess.tsx`
- Existing public content tables: `events`, `municipal_announcements`, `municipal_config.crawled_events`
- Existing audit tables: `admin_audit_log`, `org_audit_log`
- Existing SSRF/HMAC utilities: `lib/webhooks.ts`
- Existing service-role helper: `lib/supabase/admin.ts`

Decision: extend with a generic municipal import staging layer. Do not build a second crawler platform. Do not put browser automation into the resident app runtime.

## MVP Scope

Build now:

- Staging tables for sources, runs, and drafts.
- Normalizer for event and announcement drafts.
- Import service that writes pending drafts only.
- Review service that approves or rejects drafts.
- Publish on approval to existing `events` or `municipal_announcements`.
- Admin UI tab "Importe" for super-admin review.
- Audit log for import crawl, approve, reject, and publish.
- Deterministic RSS/iCal path reusing `crawlEventFeeds`.

Explicitly not in MVP:

- No agent screenshots in DB.
- No credential storage in DB.
- No reverse-engineered third-party API connector shipped by default.
- No automation for medications, check-ins, emergency, doctor/patient, Stripe, auth, invites, or direct messages.
- No direct production migration apply without Founder-Go.

## File Structure

Create:

- `supabase/migrations/199_municipal_import_pipeline.sql`
- `supabase/rollbacks/199_municipal_import_pipeline.down.sql`
- `__tests__/lib/municipal-import-pipeline-migration.test.ts`
- `modules/municipal-imports/services/types.ts`
- `modules/municipal-imports/services/normalizer.ts`
- `modules/municipal-imports/services/import-drafts.service.ts`
- `modules/municipal-imports/services/review.service.ts`
- `modules/municipal-imports/index.ts`
- `__tests__/modules/municipal-imports/normalizer.test.ts`
- `__tests__/modules/municipal-imports/import-drafts.service.test.ts`
- `__tests__/modules/municipal-imports/review.service.test.ts`
- `app/api/admin/quarters/[id]/imports/crawl/route.ts`
- `app/api/admin/quarters/[id]/imports/drafts/route.ts`
- `app/api/admin/imports/drafts/[draftId]/approve/route.ts`
- `app/api/admin/imports/drafts/[draftId]/reject/route.ts`
- `__tests__/api/admin/municipal-imports.test.ts`
- `app/(app)/admin/components/ImportInbox.tsx`
- `__tests__/components/admin/ImportInbox.test.tsx`

Modify:

- `app/(app)/admin/page.tsx` - add "Importe" tab/button and render `ImportInbox`.
- `modules/events/services/event-feed-crawler.service.ts` - add SSRF guard using existing `isSafeExternalFetchUrl`.
- `__tests__/modules/events/event-feed-crawler.service.test.ts` - cover blocked localhost/private URL.
- `docs/plans/2026-05-16-agentic-municipal-imports-implementation-plan.md` - mark progress only if executing from this plan.

## Security and Product Rules

- All list responses return arrays directly. Example: `GET /api/admin/quarters/[id]/imports/drafts` returns `MunicipalImportDraftDto[]`, not `{ items: [...] }`.
- Public tables are written only after explicit approval.
- `raw_payload` stores normalized source evidence only, max 16 KB, no screenshots, no cookies, no tokens.
- External URLs must pass `isSafeExternalFetchUrl`.
- Browser-agent output enters through normalized JSON only.
- Source configs must not store passwords. Future customer connectors use env/secret-manager references only.
- Audit every privileged action with `admin_audit_log` in MVP.
- Migration is file-first. Applying to Prod is Founder-Go.

---

### Task 1: Migration, Rollback, and Schema Test

**Files:**

- Create: `supabase/migrations/199_municipal_import_pipeline.sql`
- Create: `supabase/rollbacks/199_municipal_import_pipeline.down.sql`
- Create: `__tests__/lib/municipal-import-pipeline-migration.test.ts`

- [ ] **Step 1: Write the failing migration test**

Create `__tests__/lib/municipal-import-pipeline-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "199_municipal_import_pipeline.sql",
);

const ROLLBACK_PATH = join(
  process.cwd(),
  "supabase",
  "rollbacks",
  "199_municipal_import_pipeline.down.sql",
);

describe("199_municipal_import_pipeline migration", () => {
  it("creates staging tables, RLS, and service/admin indexes", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, "utf8").toLowerCase();

    expect(sql).toContain("municipal_import_sources");
    expect(sql).toContain("municipal_import_runs");
    expect(sql).toContain("municipal_import_drafts");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("auth.role() = 'service_role'");
    expect(sql).toContain("is_admin = true");
    expect(sql).toContain("unique");
    expect(sql).toContain("source_hash");
  });

  it("contains a rollback that drops tables and enum types", () => {
    expect(existsSync(ROLLBACK_PATH)).toBe(true);
    const sql = readFileSync(ROLLBACK_PATH, "utf8").toLowerCase();

    expect(sql).toContain("drop table if exists public.municipal_import_drafts");
    expect(sql).toContain("drop table if exists public.municipal_import_runs");
    expect(sql).toContain("drop table if exists public.municipal_import_sources");
    expect(sql).toContain("drop type if exists public.municipal_import_status");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx vitest run __tests__/lib/municipal-import-pipeline-migration.test.ts
```

Expected: FAIL because migration and rollback files do not exist.

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/199_municipal_import_pipeline.sql`:

```sql
-- Migration 199: Municipal Import Pipeline
-- Staging layer for reviewed imports from RSS/iCal/browser-agent output.
-- Apply: Founder-Go only. No automatic production apply.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'municipal_import_source_kind') THEN
    CREATE TYPE public.municipal_import_source_kind AS ENUM (
      'rss',
      'ical',
      'html_paste',
      'browser_agent',
      'internal_api_adapter'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'municipal_import_target') THEN
    CREATE TYPE public.municipal_import_target AS ENUM (
      'event',
      'announcement'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'municipal_import_status') THEN
    CREATE TYPE public.municipal_import_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.municipal_import_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id uuid NOT NULL REFERENCES public.quarters(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  source_kind public.municipal_import_source_kind NOT NULL,
  target_type public.municipal_import_target NOT NULL,
  source_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms_note text,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT municipal_import_sources_no_secret_config
    CHECK (
      config::text NOT ILIKE '%password%' AND
      config::text NOT ILIKE '%token%' AND
      config::text NOT ILIKE '%cookie%' AND
      config::text NOT ILIKE '%secret%'
    )
);

CREATE TABLE IF NOT EXISTS public.municipal_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.municipal_import_sources(id) ON DELETE SET NULL,
  quarter_id uuid NOT NULL REFERENCES public.quarters(id) ON DELETE CASCADE,
  status public.municipal_import_status NOT NULL DEFAULT 'pending',
  started_by uuid REFERENCES auth.users(id),
  request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  found_count integer NOT NULL DEFAULT 0 CHECK (found_count >= 0),
  draft_count integer NOT NULL DEFAULT 0 CHECK (draft_count >= 0),
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.municipal_import_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.municipal_import_runs(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.municipal_import_sources(id) ON DELETE SET NULL,
  quarter_id uuid NOT NULL REFERENCES public.quarters(id) ON DELETE CASCADE,
  target_type public.municipal_import_target NOT NULL,
  external_id text,
  source_url text,
  source_hash text NOT NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  body text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  category text NOT NULL DEFAULT 'sonstiges',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.municipal_import_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  published_table text CHECK (published_table IN ('events', 'municipal_announcements')),
  published_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT municipal_import_drafts_payload_size
    CHECK (octet_length(raw_payload::text) <= 16384),
  CONSTRAINT municipal_import_drafts_event_date
    CHECK (target_type != 'event' OR starts_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS municipal_import_drafts_unique_pending
  ON public.municipal_import_drafts(quarter_id, target_type, source_hash)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_municipal_import_sources_quarter
  ON public.municipal_import_sources(quarter_id);

CREATE INDEX IF NOT EXISTS idx_municipal_import_runs_quarter_started
  ON public.municipal_import_runs(quarter_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_municipal_import_drafts_quarter_status
  ON public.municipal_import_drafts(quarter_id, status, created_at DESC);

ALTER TABLE public.municipal_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_import_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS municipal_import_sources_service_all ON public.municipal_import_sources;
CREATE POLICY municipal_import_sources_service_all
  ON public.municipal_import_sources FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS municipal_import_runs_service_all ON public.municipal_import_runs;
CREATE POLICY municipal_import_runs_service_all
  ON public.municipal_import_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS municipal_import_drafts_service_all ON public.municipal_import_drafts;
CREATE POLICY municipal_import_drafts_service_all
  ON public.municipal_import_drafts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS municipal_import_sources_admin_select ON public.municipal_import_sources;
CREATE POLICY municipal_import_sources_admin_select
  ON public.municipal_import_sources FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS municipal_import_runs_admin_select ON public.municipal_import_runs;
CREATE POLICY municipal_import_runs_admin_select
  ON public.municipal_import_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS municipal_import_drafts_admin_select ON public.municipal_import_drafts;
CREATE POLICY municipal_import_drafts_admin_select
  ON public.municipal_import_drafts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

COMMENT ON TABLE public.municipal_import_sources IS
  'Configured municipal import sources. No credentials or secrets are stored here.';

COMMENT ON TABLE public.municipal_import_runs IS
  'Each crawl or agent-ingest attempt for a municipal import source.';

COMMENT ON TABLE public.municipal_import_drafts IS
  'Human-reviewed drafts produced by deterministic crawlers or external browser agents. Nothing is public until approved.';
```

- [ ] **Step 4: Create rollback**

Create `supabase/rollbacks/199_municipal_import_pipeline.down.sql`:

```sql
DROP TABLE IF EXISTS public.municipal_import_drafts;
DROP TABLE IF EXISTS public.municipal_import_runs;
DROP TABLE IF EXISTS public.municipal_import_sources;

DROP TYPE IF EXISTS public.municipal_import_status;
DROP TYPE IF EXISTS public.municipal_import_target;
DROP TYPE IF EXISTS public.municipal_import_source_kind;
```

- [ ] **Step 5: Run the migration test**

Run:

```bash
npx vitest run __tests__/lib/municipal-import-pipeline-migration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add supabase/migrations/199_municipal_import_pipeline.sql supabase/rollbacks/199_municipal_import_pipeline.down.sql __tests__/lib/municipal-import-pipeline-migration.test.ts
git commit -m "feat(imports): add municipal import staging schema"
```

---

### Task 2: Normalizer and Idempotency Hash

**Files:**

- Create: `modules/municipal-imports/services/types.ts`
- Create: `modules/municipal-imports/services/normalizer.ts`
- Create: `modules/municipal-imports/index.ts`
- Create: `__tests__/modules/municipal-imports/normalizer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/modules/municipal-imports/normalizer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeImportDraft,
  toAnnouncementCategory,
  toEventCategory,
} from "@/modules/municipal-imports/services/normalizer";

describe("municipal import normalizer", () => {
  it("normalizes event drafts and builds a stable source hash", () => {
    const draft = normalizeImportDraft({
      targetType: "event",
      sourceKind: "ical",
      quarterId: "q-1",
      title: "  Sommerfest im Park  ",
      body: "Musik und Begegnung",
      startsAt: "2026-06-06T18:00:00.000Z",
      location: "Kurpark",
      category: "veranstaltung",
      sourceUrl: "https://stadt.test/events.ics",
      externalId: "ical-123",
      rawPayload: { uid: "ical-123" },
    });

    expect(draft.title).toBe("Sommerfest im Park");
    expect(draft.category).toBe("community");
    expect(draft.sourceHash).toMatch(/^[a-f0-9]{64}$/);

    const again = normalizeImportDraft({
      targetType: "event",
      sourceKind: "ical",
      quarterId: "q-1",
      title: "Sommerfest im Park",
      startsAt: "2026-06-06T18:00:00.000Z",
      sourceUrl: "https://stadt.test/events.ics",
      externalId: "ical-123",
      rawPayload: { uid: "ical-123", noisy: true },
    });
    expect(again.sourceHash).toBe(draft.sourceHash);
  });

  it("trims announcement bodies to the DB limit", () => {
    const long = "A".repeat(700);
    const draft = normalizeImportDraft({
      targetType: "announcement",
      sourceKind: "browser_agent",
      quarterId: "q-1",
      title: "Baustelle",
      body: long,
      category: "baustelle",
      sourceUrl: "https://stadt.test/baustelle",
      rawPayload: { extractedBy: "browser-agent" },
    });

    expect(draft.body).toHaveLength(500);
    expect(draft.category).toBe("baustelle");
  });

  it("rejects event drafts without start date", () => {
    expect(() =>
      normalizeImportDraft({
        targetType: "event",
        sourceKind: "rss",
        quarterId: "q-1",
        title: "Ohne Datum",
        rawPayload: {},
      }),
    ).toThrow(/startsAt/);
  });

  it("maps unknown categories conservatively", () => {
    expect(toEventCategory("unknown")).toBe("other");
    expect(toAnnouncementCategory("unknown")).toBe("sonstiges");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx vitest run __tests__/modules/municipal-imports/normalizer.test.ts
```

Expected: FAIL because module files do not exist.

- [ ] **Step 3: Create types**

Create `modules/municipal-imports/services/types.ts`:

```ts
export type MunicipalImportSourceKind =
  | "rss"
  | "ical"
  | "html_paste"
  | "browser_agent"
  | "internal_api_adapter";

export type MunicipalImportTarget = "event" | "announcement";
export type MunicipalImportStatus = "pending" | "approved" | "rejected" | "failed";

export interface ImportDraftInput {
  targetType: MunicipalImportTarget;
  sourceKind: MunicipalImportSourceKind;
  quarterId: string;
  title: string;
  body?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  category?: string | null;
  sourceUrl?: string | null;
  externalId?: string | null;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedImportDraft {
  targetType: MunicipalImportTarget;
  sourceKind: MunicipalImportSourceKind;
  quarterId: string;
  title: string;
  body: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  category: string;
  sourceUrl: string | null;
  externalId: string | null;
  sourceHash: string;
  rawPayload: Record<string, unknown>;
}
```

- [ ] **Step 4: Create normalizer**

Create `modules/municipal-imports/services/normalizer.ts`:

```ts
import { createHash } from "crypto";
import type { ImportDraftInput, NormalizedImportDraft } from "./types";

const ANNOUNCEMENT_BODY_LIMIT = 500;
const TITLE_LIMIT = 160;

export function normalizeImportDraft(
  input: ImportDraftInput,
): NormalizedImportDraft {
  const title = collapseWhitespace(input.title).slice(0, TITLE_LIMIT);
  if (title.length < 2) {
    throw new Error("title muss mindestens 2 Zeichen enthalten.");
  }

  const startsAt = normalizeNullable(input.startsAt);
  if (input.targetType === "event" && !startsAt) {
    throw new Error("startsAt ist fuer event-Imports Pflicht.");
  }

  const bodyLimit =
    input.targetType === "announcement" ? ANNOUNCEMENT_BODY_LIMIT : 1200;
  const body = normalizeNullable(input.body)?.slice(0, bodyLimit) ?? null;
  const location = normalizeNullable(input.location);
  const sourceUrl = normalizeNullable(input.sourceUrl);
  const externalId = normalizeNullable(input.externalId);
  const endsAt = normalizeNullable(input.endsAt);
  const category =
    input.targetType === "event"
      ? toEventCategory(input.category)
      : toAnnouncementCategory(input.category);

  const sourceHash = buildSourceHash({
    quarterId: input.quarterId,
    targetType: input.targetType,
    sourceUrl,
    externalId,
    title,
    startsAt,
  });

  return {
    targetType: input.targetType,
    sourceKind: input.sourceKind,
    quarterId: input.quarterId,
    title,
    body,
    startsAt,
    endsAt,
    location,
    category,
    sourceUrl,
    externalId,
    sourceHash,
    rawPayload: sanitizeRawPayload(input.rawPayload),
  };
}

export function toEventCategory(value: string | null | undefined): string {
  const normalized = normalizeCategory(value);
  if (["community", "sports", "culture", "market", "kids", "seniors", "cleanup", "other"].includes(normalized)) {
    return normalized;
  }
  if (["veranstaltung", "fest", "termin", "rathaus"].includes(normalized)) return "community";
  if (["musik", "konzert", "theater"].includes(normalized)) return "culture";
  if (["markt", "wochenmarkt"].includes(normalized)) return "market";
  return "other";
}

export function toAnnouncementCategory(value: string | null | undefined): string {
  const normalized = normalizeCategory(value);
  if (["verkehr", "baustelle", "veranstaltung", "verwaltung", "warnung", "sonstiges"].includes(normalized)) {
    return normalized;
  }
  if (["event", "events", "termin"].includes(normalized)) return "veranstaltung";
  return "sonstiges";
}

function buildSourceHash(input: {
  quarterId: string;
  targetType: string;
  sourceUrl: string | null;
  externalId: string | null;
  title: string;
  startsAt: string | null;
}): string {
  const stable = [
    input.quarterId,
    input.targetType,
    input.sourceUrl ?? "",
    input.externalId ?? "",
    input.title.toLocaleLowerCase("de-DE"),
    input.startsAt ?? "",
  ].join("|");
  return createHash("sha256").update(stable).digest("hex");
}

function normalizeNullable(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const collapsed = collapseWhitespace(value);
  return collapsed.length > 0 ? collapsed : null;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCategory(value: string | null | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("de-DE")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function sanitizeRawPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(payload);
  if (json.length <= 12000) return payload;
  return { truncated: true, originalLength: json.length };
}
```

- [ ] **Step 5: Create index export**

Create `modules/municipal-imports/index.ts`:

```ts
export * from "./services/types";
export * from "./services/normalizer";
```

- [ ] **Step 6: Run tests**

Run:

```bash
npx vitest run __tests__/modules/municipal-imports/normalizer.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add modules/municipal-imports __tests__/modules/municipal-imports/normalizer.test.ts
git commit -m "feat(imports): normalize municipal import drafts"
```

---

### Task 3: Draft Persistence and Review Services

**Files:**

- Create: `modules/municipal-imports/services/import-drafts.service.ts`
- Create: `modules/municipal-imports/services/review.service.ts`
- Modify: `modules/municipal-imports/index.ts`
- Create: `__tests__/modules/municipal-imports/import-drafts.service.test.ts`
- Create: `__tests__/modules/municipal-imports/review.service.test.ts`

- [ ] **Step 1: Write service tests**

Create tests that use the existing mock-Supabase style from `__tests__/modules/events/event-feed-apply.service.test.ts`.

Test cases for `import-drafts.service.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createImportRun, upsertImportDrafts } from "@/modules/municipal-imports/services/import-drafts.service";

function makeClient() {
  const single = vi.fn(async () => ({ data: { id: "run-1" }, error: null }));
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const upsert = vi.fn(async () => ({ error: null }));
  const updateEq = vi.fn(async () => ({ error: null }));
  const eq = vi.fn(() => updateEq());
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table === "municipal_import_runs") return { insert, update };
    if (table === "municipal_import_drafts") return { upsert };
    return {};
  });
  return { client: { from } as unknown as SupabaseClient, from, insert, upsert, update };
}

describe("municipal import draft persistence", () => {
  it("creates a run and upserts normalized drafts", async () => {
    const { client, from, upsert } = makeClient();
    const run = await createImportRun(client, {
      quarterId: "q-1",
      sourceId: "source-1",
      startedBy: "admin-1",
    });

    expect(run.id).toBe("run-1");
    expect(from).toHaveBeenCalledWith("municipal_import_runs");

    const result = await upsertImportDrafts(client, {
      runId: "run-1",
      sourceId: "source-1",
      quarterId: "q-1",
      drafts: [
        {
          targetType: "event",
          sourceKind: "ical",
          quarterId: "q-1",
          title: "Sommerfest",
          body: null,
          startsAt: "2026-06-06T18:00:00.000Z",
          endsAt: null,
          location: "Kurpark",
          category: "community",
          sourceUrl: "https://stadt.test/events.ics",
          externalId: "1",
          sourceHash: "a".repeat(64),
          rawPayload: { uid: "1" },
        },
      ],
    });

    expect(result.savedCount).toBe(1);
    expect(upsert).toHaveBeenCalled();
  });
});
```

Test cases for `review.service.ts`:

- approving an event inserts into `events` with `user_id = reviewerId`.
- approving an announcement inserts into `municipal_announcements` with `author_id = reviewerId`.
- rejecting a draft sets `status = "rejected"`, `reviewed_by`, `reviewed_at`, and `rejection_reason`.
- approving a non-pending draft throws.
- every approve/reject path inserts into `admin_audit_log`.

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npx vitest run __tests__/modules/municipal-imports/import-drafts.service.test.ts __tests__/modules/municipal-imports/review.service.test.ts
```

Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement draft service**

Create `modules/municipal-imports/services/import-drafts.service.ts` with these exported functions:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedImportDraft } from "./types";

export interface CreateImportRunInput {
  quarterId: string;
  sourceId?: string | null;
  startedBy: string;
}

export interface ImportRunRef {
  id: string;
}

export interface UpsertImportDraftsInput {
  runId: string;
  sourceId?: string | null;
  quarterId: string;
  drafts: NormalizedImportDraft[];
}

export async function createImportRun(
  supabase: SupabaseClient,
  input: CreateImportRunInput,
): Promise<ImportRunRef> {
  const { data, error } = await supabase
    .from("municipal_import_runs")
    .insert({
      quarter_id: input.quarterId,
      source_id: input.sourceId ?? null,
      started_by: input.startedBy,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Import-Lauf konnte nicht erstellt werden.");
  }

  return { id: data.id as string };
}

export async function upsertImportDrafts(
  supabase: SupabaseClient,
  input: UpsertImportDraftsInput,
): Promise<{ savedCount: number }> {
  const rows = input.drafts.map((draft) => ({
    run_id: input.runId,
    source_id: input.sourceId ?? null,
    quarter_id: input.quarterId,
    target_type: draft.targetType,
    external_id: draft.externalId,
    source_url: draft.sourceUrl,
    source_hash: draft.sourceHash,
    title: draft.title,
    body: draft.body,
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
    location: draft.location,
    category: draft.category,
    raw_payload: draft.rawPayload,
    status: "pending",
  }));

  if (rows.length === 0) {
    await finishImportRun(supabase, input.runId, { foundCount: 0, draftCount: 0 });
    return { savedCount: 0 };
  }

  const { error } = await supabase
    .from("municipal_import_drafts")
    .upsert(rows, { onConflict: "quarter_id,target_type,source_hash", ignoreDuplicates: true });

  if (error) throw new Error(error.message ?? String(error));

  await finishImportRun(supabase, input.runId, {
    foundCount: input.drafts.length,
    draftCount: rows.length,
  });

  return { savedCount: rows.length };
}

export async function finishImportRun(
  supabase: SupabaseClient,
  runId: string,
  result: { foundCount: number; draftCount: number; error?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("municipal_import_runs")
    .update({
      status: result.error ? "failed" : "approved",
      found_count: result.foundCount,
      draft_count: result.draftCount,
      error: result.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw new Error(error.message ?? String(error));
}
```

- [ ] **Step 4: Implement review service**

Create `modules/municipal-imports/services/review.service.ts` with:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

interface DraftRow {
  id: string;
  quarter_id: string;
  target_type: "event" | "announcement";
  title: string;
  body: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  category: string;
  source_url: string | null;
  status: string;
}

export async function approveImportDraft(
  supabase: SupabaseClient,
  draftId: string,
  reviewerId: string,
): Promise<{ publishedTable: string; publishedId: string }> {
  const draft = await loadPendingDraft(supabase, draftId);
  const published =
    draft.target_type === "event"
      ? await publishEvent(supabase, draft, reviewerId)
      : await publishAnnouncement(supabase, draft, reviewerId);

  const reviewedAt = new Date().toISOString();
  const { error } = await supabase
    .from("municipal_import_drafts")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: reviewedAt,
      published_table: published.table,
      published_id: published.id,
      updated_at: reviewedAt,
    })
    .eq("id", draftId);
  if (error) throw new Error(error.message ?? String(error));

  await recordAdminAudit(supabase, reviewerId, "municipal_import_approve", draftId, {
    target_type: draft.target_type,
    published_table: published.table,
    published_id: published.id,
  });

  return { publishedTable: published.table, publishedId: published.id };
}

export async function rejectImportDraft(
  supabase: SupabaseClient,
  draftId: string,
  reviewerId: string,
  reason: string,
): Promise<{ rejected: true }> {
  const reviewedAt = new Date().toISOString();
  const { error } = await supabase
    .from("municipal_import_drafts")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: reviewedAt,
      rejection_reason: reason.trim().slice(0, 500) || "Nicht passend",
      updated_at: reviewedAt,
    })
    .eq("id", draftId)
    .eq("status", "pending");
  if (error) throw new Error(error.message ?? String(error));

  await recordAdminAudit(supabase, reviewerId, "municipal_import_reject", draftId, {
    reason: reason.trim().slice(0, 500) || "Nicht passend",
  });

  return { rejected: true };
}

async function loadPendingDraft(
  supabase: SupabaseClient,
  draftId: string,
): Promise<DraftRow> {
  const { data, error } = await supabase
    .from("municipal_import_drafts")
    .select("id, quarter_id, target_type, title, body, starts_at, ends_at, location, category, source_url, status")
    .eq("id", draftId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Import-Entwurf nicht gefunden.");
  const draft = data as DraftRow;
  if (draft.status !== "pending") throw new Error("Import-Entwurf ist nicht mehr offen.");
  return draft;
}

async function publishEvent(
  supabase: SupabaseClient,
  draft: DraftRow,
  reviewerId: string,
): Promise<{ table: "events"; id: string }> {
  if (!draft.starts_at) throw new Error("Event-Import braucht starts_at.");
  const start = new Date(draft.starts_at);
  const end = draft.ends_at ? new Date(draft.ends_at) : null;
  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: reviewerId,
      quarter_id: draft.quarter_id,
      title: draft.title,
      description: draft.body,
      location: draft.location,
      event_date: start.toISOString().slice(0, 10),
      event_time: start.toISOString().slice(11, 16),
      end_time: end ? end.toISOString().slice(11, 16) : null,
      category: draft.category,
    })
    .select("id")
    .single();

  if (error || !data?.id) throw new Error(error?.message ?? "Event konnte nicht veroeffentlicht werden.");
  return { table: "events", id: data.id as string };
}

async function publishAnnouncement(
  supabase: SupabaseClient,
  draft: DraftRow,
  reviewerId: string,
): Promise<{ table: "municipal_announcements"; id: string }> {
  const { data, error } = await supabase
    .from("municipal_announcements")
    .insert({
      quarter_id: draft.quarter_id,
      author_id: reviewerId,
      title: draft.title,
      body: draft.body ?? draft.title,
      source_url: draft.source_url,
      category: draft.category,
      pinned: false,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Bekanntmachung konnte nicht veroeffentlicht werden.");
  }
  return { table: "municipal_announcements", id: data.id as string };
}

async function recordAdminAudit(
  supabase: SupabaseClient,
  adminId: string,
  action: string,
  targetId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: "municipal_import_draft",
    target_id: targetId,
    details,
  });
}
```

- [ ] **Step 5: Export services**

Modify `modules/municipal-imports/index.ts`:

```ts
export * from "./services/types";
export * from "./services/normalizer";
export * from "./services/import-drafts.service";
export * from "./services/review.service";
```

- [ ] **Step 6: Run tests**

Run:

```bash
npx vitest run __tests__/modules/municipal-imports/import-drafts.service.test.ts __tests__/modules/municipal-imports/review.service.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add modules/municipal-imports __tests__/modules/municipal-imports
git commit -m "feat(imports): persist and review municipal import drafts"
```

---

### Task 4: Safe Crawl API Reusing Existing Event Crawler

**Files:**

- Create: `app/api/admin/quarters/[id]/imports/crawl/route.ts`
- Create: `app/api/admin/quarters/[id]/imports/drafts/route.ts`
- Create: `app/api/admin/imports/drafts/[draftId]/approve/route.ts`
- Create: `app/api/admin/imports/drafts/[draftId]/reject/route.ts`
- Create: `__tests__/api/admin/municipal-imports.test.ts`
- Modify: `modules/events/services/event-feed-crawler.service.ts`
- Modify: `__tests__/modules/events/event-feed-crawler.service.test.ts`

- [ ] **Step 1: Add SSRF guard test for crawler**

Append to `__tests__/modules/events/event-feed-crawler.service.test.ts`:

```ts
it("blockiert unsichere externe URLs bevor fetch aufgerufen wird", async () => {
  const fetchMock = vi.fn();
  const result = await crawlEventFeeds({
    rssUrl: "http://localhost:3000/feed.rss",
    fetch: fetchMock as unknown as typeof fetch,
  });

  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.events).toEqual([]);
  expect(result.errors[0]).toMatch(/ungueltiges externes ziel/i);
});
```

- [ ] **Step 2: Update crawler to reuse existing guard**

Modify `modules/events/services/event-feed-crawler.service.ts`:

```ts
import { isSafeExternalFetchUrl } from "@/lib/webhooks";
```

Then update `fetchWithTimeout`:

```ts
async function fetchWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Response> {
  if (!(await isSafeExternalFetchUrl(url))) {
    throw new Error("Ungueltiges externes Ziel.");
  }

  return fetchImpl(url, {
    method: "GET",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent":
        "quartierapp-eventbot/1.0 (Quartier-Events-Crawler)",
    },
  });
}
```

- [ ] **Step 3: Write route tests**

Create `__tests__/api/admin/municipal-imports.test.ts` with tests for:

- unauthenticated crawl returns 401.
- non-admin crawl returns 403.
- crawl with no URL returns 400.
- crawl creates pending drafts, not public events.
- `GET /imports/drafts` returns an array directly.
- approve route calls review service.
- reject route calls review service.

Use route test patterns from `__tests__/api/admin/quarters/events-crawl.test.ts` and `__tests__/api/admin/quarters/events-apply.test.ts` if present; otherwise mirror existing admin route tests in `__tests__/api/admin/feature-flags-preset.test.ts`.

- [ ] **Step 4: Implement super-admin helper locally in routes**

For each route, start with the same auth shape already used in `app/api/admin/quarters/[id]/events/crawl/route.ts`:

```ts
async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin" && profile?.is_admin !== true) {
    return {
      error: NextResponse.json({ error: "Nur Admins" }, { status: 403 }),
    };
  }
  return { user };
}
```

- [ ] **Step 5: Implement crawl route**

`app/api/admin/quarters/[id]/imports/crawl/route.ts`:

- Parse body `{ targetType, rssUrl, icalUrl, fromDate, toDate }`.
- Support `targetType: "event"` only in MVP for RSS/iCal.
- Call `crawlEventFeeds`.
- Normalize events via `normalizeImportDraft`.
- Use `getAdminSupabase()` for staging writes.
- Create run and upsert drafts.
- Return `{ savedCount, foundCount, errors }`.

Key mapping:

```ts
const drafts = result.events.map((event) =>
  normalizeImportDraft({
    targetType: "event",
    sourceKind: event.source,
    quarterId: id,
    title: event.title,
    body: event.description,
    startsAt: event.startDate,
    endsAt: event.endDate,
    location: event.location,
    category: "veranstaltung",
    sourceUrl: event.feedUrl,
    externalId: event.uid,
    rawPayload: event,
  }),
);
```

- [ ] **Step 6: Implement drafts list route**

`app/api/admin/quarters/[id]/imports/drafts/route.ts`:

- Auth: admin only.
- Use regular server client for read, because RLS allows admin select.
- Select pending drafts for the quarter.
- Return the array directly:

```ts
return NextResponse.json(data ?? []);
```

- [ ] **Step 7: Implement approve/reject routes**

Approve route:

- Auth: admin only.
- Use `getAdminSupabase()` for service-role publish.
- Call `approveImportDraft(adminDb, draftId, auth.user.id)`.
- Return result object.

Reject route:

- Auth: admin only.
- Parse `{ reason }`.
- Use `getAdminSupabase()`.
- Call `rejectImportDraft(adminDb, draftId, auth.user.id, reason)`.
- Return `{ rejected: true }`.

- [ ] **Step 8: Run route and crawler tests**

Run:

```bash
npx vitest run __tests__/modules/events/event-feed-crawler.service.test.ts __tests__/api/admin/municipal-imports.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add app/api/admin/quarters app/api/admin/imports modules/events/services/event-feed-crawler.service.ts __tests__/modules/events/event-feed-crawler.service.test.ts __tests__/api/admin/municipal-imports.test.ts
git commit -m "feat(imports): add reviewed municipal import api"
```

---

### Task 5: Admin Import Inbox UI

**Files:**

- Create: `app/(app)/admin/components/ImportInbox.tsx`
- Create: `__tests__/components/admin/ImportInbox.test.tsx`
- Modify: `app/(app)/admin/page.tsx`

- [ ] **Step 1: Write UI tests**

Create `__tests__/components/admin/ImportInbox.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportInbox } from "@/app/(app)/admin/components/ImportInbox";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ImportInbox", () => {
  it("shows pending drafts and approves one draft", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/drafts") && !url.includes("/approve")) {
        return Response.json([
          {
            id: "draft-1",
            target_type: "event",
            title: "Sommerfest",
            body: "Musik im Park",
            starts_at: "2026-06-06T18:00:00.000Z",
            location: "Kurpark",
            category: "community",
            source_url: "https://stadt.test/events.ics",
            created_at: "2026-05-16T10:00:00.000Z",
          },
        ]);
      }
      if (url.includes("/approve")) return Response.json({ publishedTable: "events", publishedId: "event-1" });
      return Response.json([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ImportInbox quarterId="q-1" />);
    expect(await screen.findByText("Sommerfest")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /freigeben/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/imports/drafts/draft-1/approve",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
```

- [ ] **Step 2: Implement component**

Create `app/(app)/admin/components/ImportInbox.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Check, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ImportDraftDto {
  id: string;
  target_type: "event" | "announcement";
  title: string;
  body: string | null;
  starts_at: string | null;
  location: string | null;
  category: string;
  source_url: string | null;
  created_at: string;
}

export function ImportInbox({ quarterId }: { quarterId: string }) {
  const [drafts, setDrafts] = useState<ImportDraftDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadDrafts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/quarters/${quarterId}/imports/drafts`);
      if (!res.ok) throw new Error("Importe konnten nicht geladen werden.");
      const data = (await res.json()) as ImportDraftDto[];
      setDrafts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Importe konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts();
  }, [quarterId]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/imports/drafts/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Freigabe fehlgeschlagen.");
      toast.success("Import freigegeben");
      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch {
      toast.error("Import konnte nicht freigegeben werden");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/imports/drafts/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Im Review verworfen" }),
      });
      if (!res.ok) throw new Error("Ablehnen fehlgeschlagen.");
      toast.success("Import verworfen");
      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch {
      toast.error("Import konnte nicht verworfen werden");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-anthrazit">Import-Posteingang</h2>
          <p className="text-xs text-muted-foreground">Entwuerfe aus externen Quellen vor der Freigabe pruefen.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDrafts} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Keine offenen Import-Entwuerfe.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-anthrazit">{draft.title}</h3>
                      <Badge variant="secondary">{draft.target_type === "event" ? "Event" : "Bekanntmachung"}</Badge>
                    </div>
                    {draft.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{draft.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {draft.location ?? "Ort offen"} {draft.starts_at ? `- ${new Date(draft.starts_at).toLocaleString("de-DE")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(draft.id)} disabled={busyId === draft.id}>
                    <Check className="mr-1 h-4 w-4" />
                    Freigeben
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(draft.id)} disabled={busyId === draft.id}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Verwerfen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into admin page**

Modify `app/(app)/admin/page.tsx`:

- Import `ImportInbox`.
- Add a button similar to Amtsblatt-Pipeline:

```tsx
<button
  onClick={() => setActiveTab("imports")}
  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
    activeTab === "imports"
      ? "border-quartier-green bg-quartier-green/10 text-quartier-green font-medium"
      : "border-input bg-transparent text-muted-foreground hover:bg-muted/50"
  }`}
>
  <FileSpreadsheet className="h-3.5 w-3.5" />
  Importe
</button>
```

- Render:

```tsx
{activeTab === "imports" && <ImportInbox quarterId="00000000-0000-0000-0000-000000000000" />}
```

Then replace the hard-coded quarter id in the same task with the selected/active pilot quarter source already used by other admin components. If no selected quarter helper exists, pass Bad Saeckingen pilot quarter only after reading `QuarterManagement`/`SuperAdminOverview` patterns and keeping the UI super-admin only.

- [ ] **Step 4: Run tests**

Run:

```bash
npx vitest run __tests__/components/admin/ImportInbox.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add "app/(app)/admin/components/ImportInbox.tsx" "app/(app)/admin/page.tsx" __tests__/components/admin/ImportInbox.test.tsx
git commit -m "feat(admin): add municipal import inbox"
```

---

### Task 6: Browser-Agent Boundary, Not Browser Automation in App Runtime

**Files:**

- Create later: `app/api/admin/quarters/[id]/imports/ingest/route.ts`
- Create later: `scripts/municipal-import-agent/README.md`
- Create later: `docs/plans/2026-05-16-agentic-import-worker-runbook.md`

This task is intentionally after the reviewed MVP. It is the safe way to use Browser Use, Computer Use, or internal-API reverse-engineering without turning QuartierApp itself into a bot runner.

- [ ] **Step 1: Define normalized ingestion contract**

Accepted JSON shape:

```json
[
  {
    "targetType": "announcement",
    "sourceKind": "browser_agent",
    "quarterId": "quarter-id",
    "title": "Neue Baustelle",
    "body": "Die Sanarystrasse ist am Montag gesperrt.",
    "category": "baustelle",
    "sourceUrl": "https://stadt.example/bekanntmachungen/123",
    "externalId": "123",
    "rawPayload": {
      "extractedAt": "2026-05-16T10:00:00.000Z",
      "evidence": "HTML text excerpt only, no screenshot"
    }
  }
]
```

- [ ] **Step 2: Gate with HMAC secret**

Use existing `verifyWebhookSignature` from `lib/webhooks.ts`. The route must return 503 when `MUNICIPAL_IMPORT_INGEST_SECRET` is unset. Setting this env in production is Founder-Go.

- [ ] **Step 3: Keep browser worker outside the app**

Worker constraints:

- Runs locally or in a controlled backend job, not in the resident app.
- Uses an explicit account owned by the municipality/customer.
- Captures no screenshots by default.
- Stores no cookies, tokens, or passwords in repo or DB.
- Outputs only normalized JSON drafts.
- Has a per-source legal/AGB note in `municipal_import_sources.terms_note`.

- [ ] **Step 4: Add runbook before first customer connector**

The runbook must answer:

- Which system is accessed?
- Which user account/license is used?
- Which actions are automated?
- Is scraping/automation forbidden by contract?
- Which data categories are touched?
- Where are logs stored?
- How can the connector be disabled?

No customer-specific browser-agent connector ships before this runbook exists.

---

## Verification Matrix

Run after implementation:

```bash
npx vitest run __tests__/lib/municipal-import-pipeline-migration.test.ts __tests__/modules/municipal-imports/normalizer.test.ts __tests__/modules/municipal-imports/import-drafts.service.test.ts __tests__/modules/municipal-imports/review.service.test.ts __tests__/modules/events/event-feed-crawler.service.test.ts __tests__/api/admin/municipal-imports.test.ts __tests__/components/admin/ImportInbox.test.tsx
npx tsc --noEmit
npm run lint
```

Manual smoke, local only:

1. Start local Supabase with `npm run supabase:start`.
2. Apply migration 199 locally only.
3. Start `npm run dev`.
4. Log in as super-admin.
5. Open Admin > Importe.
6. Crawl a known HTTPS iCal/RSS URL.
7. Confirm drafts appear.
8. Approve one event.
9. Confirm it appears under Events.
10. Confirm `admin_audit_log` has approve/publish entry.

## Rollout

1. MVP stays local/dev until migration 199 is reviewed.
2. Founder-Go required before applying migration 199 to Prod.
3. After Prod apply, enable only for super-admin and one pilot quarter.
4. No browser-agent ingest secret in Prod until a source-specific runbook exists.
5. First real use case: Stadt-/Quartiersveranstaltungen and Bekanntmachungen, not care/medical.

## Business Positioning

This implements the useful part of the "APIs are dead" trend without importing the unsafe part:

- QuartierApp remains trustworthy, audited, and App-Store-safe.
- Municipalities can start with their existing websites, PDFs, RSS/iCal, or old systems.
- Agents become import assistants, not invisible decision-makers.
- The sales phrase can be: "Wir integrieren vorhandene kommunale Systeme als gepruefte Entwuerfe - ohne teures Schnittstellenprojekt und ohne Blindflug."

## Self-Review

- Spec coverage: browser/computer-use trend is covered through an external ingestion boundary; API-first QuartierApp is preserved.
- Pre-check coverage: existing event crawler, admin routes, SSRF helper, service-role helper, and audit tables are reused.
- DSGVO/Compliance: no screenshots, no secrets, no care/medical data, no direct publish.
- No placeholders: remaining "later" work is scoped as Task 6 and intentionally blocked by runbook + Founder-Go.
- Type consistency: `targetType` in TypeScript maps to `target_type` in DB rows; status values match migration enum.

