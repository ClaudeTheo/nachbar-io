# Multi-Quartier & Super-Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Nachbar.io from a single-quarter app into a multi-quarter platform with a Super-Admin UI that allows managing multiple neighborhoods in different cities.

**Architecture:** Extend the existing `quarters` table with configuration fields, add `quarter_id` foreign keys to all content tables, introduce a role-based access model (super_admin / quarter_admin / user), and build a comprehensive Super-Admin dashboard for quarter lifecycle management. All existing data migrates into the pilot quarter.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS v4, shadcn/ui

---

## Existing State (Important Context)

- `quarters` table EXISTS (Migration 034) with: id, name, slug, center_lat/lng, zoom_level, bounds_*
- `households.quarter_id` EXISTS (Migration 035) — already links to quarters
- `map_houses.quarter_id` EXISTS (Migration 035) — already links to quarters
- `households.street_name` has CHECK constraint limiting to 3 specific streets — MUST BE REMOVED
- `users.is_admin` boolean exists — no role column yet
- `QuarterManagement.tsx` exists with basic CRUD — needs major expansion
- Pilot quarter slug: `bad-saeckingen-pilot`
- 76 houses hardcoded in `lib/map-houses.ts` with pixel coordinates
- Invite codes are global (no quarter association)
- All content tables (alerts, posts, events, etc.) have NO quarter_id yet

## Key Files Reference

- Schema: `supabase/migrations/001_initial_schema.sql`
- Quarters: `supabase/migrations/034_quarters_table.sql`, `035_map_houses_geo.sql`
- Types: `lib/supabase/types.ts` (449 lines)
- Admin page: `app/(app)/admin/page.tsx`
- Admin components: `app/(app)/admin/components/` (17 files)
- QuarterManagement: `app/(app)/admin/components/QuarterManagement.tsx`
- Map: `components/NachbarKarte.tsx`, `lib/map-houses.ts`
- Invite codes: `lib/invite-codes.ts`
- Auth middleware: `lib/supabase/middleware.ts`, `middleware.ts`
- Constants: `lib/constants.ts`
- RLS helpers: defined in migrations (is_verified_member, is_admin, etc.)

---

## Task 1: Database Migration — Extend quarters table

**Files:**
- Create: `supabase/migrations/051_multi_quarter_foundation.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Nachbar.io — Migration 051: Multi-Quartier Foundation
-- Erweitert quarters-Tabelle, fuegt quarter_id zu Content-Tabellen,
-- fuehrt Rollen-System ein, aktualisiert RLS
-- ============================================================

-- ============================================================
-- 1. USERS: Role column
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('super_admin', 'quarter_admin', 'user'));

-- Bestehende Admins migrieren
UPDATE users SET role = 'super_admin' WHERE is_admin = true AND role = 'user';

-- ============================================================
-- 2. QUARTERS: Erweiterte Felder
-- ============================================================
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'BW';
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'DE';
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS map_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS max_households INTEGER DEFAULT 50;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS invite_prefix TEXT UNIQUE;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE quarters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Pilotquartier aktualisieren
UPDATE quarters SET
    city = 'Bad Saeckingen',
    state = 'BW',
    country = 'DE',
    invite_prefix = 'PILOT',
    status = 'active',
    map_config = jsonb_build_object(
        'type', 'svg',
        'viewBox', '0 0 1083 766',
        'backgroundImage', '/map-quartier.jpg'
    )
WHERE slug = 'bad-saeckingen-pilot';

-- ============================================================
-- 3. HOUSEHOLDS: Entferne street_name CHECK constraint
-- ============================================================
-- Alte Constraint entfernen (erlaubt beliebige Strassennamen pro Quartier)
ALTER TABLE households DROP CONSTRAINT IF EXISTS households_street_name_check;

-- quarter_id NOT NULL machen (existiert bereits, aber nullable)
-- Erst sicherstellen dass alle zugeordnet sind
UPDATE households SET quarter_id = (
    SELECT id FROM quarters WHERE slug = 'bad-saeckingen-pilot'
) WHERE quarter_id IS NULL;

ALTER TABLE households ALTER COLUMN quarter_id SET NOT NULL;

-- Unique constraint anpassen: pro Quartier unique
ALTER TABLE households DROP CONSTRAINT IF EXISTS households_street_name_house_number_key;
ALTER TABLE households ADD CONSTRAINT households_quarter_street_house_unique
    UNIQUE(quarter_id, street_name, house_number);

-- ============================================================
-- 4. CONTENT TABELLEN: quarter_id hinzufuegen
-- ============================================================

-- alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE alerts SET quarter_id = (
    SELECT h.quarter_id FROM households h WHERE h.id = alerts.household_id
) WHERE quarter_id IS NULL;

-- help_requests
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE help_requests SET quarter_id = (
    SELECT h.quarter_id FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = help_requests.user_id AND hm.verified_at IS NOT NULL
    LIMIT 1
) WHERE quarter_id IS NULL;

-- marketplace_items
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE marketplace_items SET quarter_id = (
    SELECT h.quarter_id FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = marketplace_items.user_id AND hm.verified_at IS NOT NULL
    LIMIT 1
) WHERE quarter_id IS NULL;

-- lost_found
ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE lost_found SET quarter_id = (
    SELECT h.quarter_id FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = lost_found.user_id AND hm.verified_at IS NOT NULL
    LIMIT 1
) WHERE quarter_id IS NULL;

-- events
ALTER TABLE events ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE events SET quarter_id = (
    SELECT h.quarter_id FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = events.user_id AND hm.verified_at IS NOT NULL
    LIMIT 1
) WHERE quarter_id IS NULL;

-- news_items (nullable — NULL = global news)
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);

-- invite_codes (falls vorhanden)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_codes') THEN
        ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
    END IF;
END $$;

-- conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE conversations SET quarter_id = (
    SELECT h.quarter_id FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = conversations.user_a AND hm.verified_at IS NOT NULL
    LIMIT 1
) WHERE quarter_id IS NULL;

-- polls
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'polls') THEN
        ALTER TABLE polls ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
    END IF;
END $$;

-- skills
ALTER TABLE skills ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE skills SET quarter_id = (
    SELECT h.quarter_id FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = skills.user_id AND hm.verified_at IS NOT NULL
    LIMIT 1
) WHERE quarter_id IS NULL;

-- leihboerse_items
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leihboerse_items') THEN
        ALTER TABLE leihboerse_items ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
    END IF;
END $$;

-- paketannahme
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paketannahme') THEN
        ALTER TABLE paketannahme ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
    END IF;
END $$;

-- vacation_modes
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vacation_modes') THEN
        ALTER TABLE vacation_modes ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
    END IF;
END $$;

-- noise_warnings
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'noise_warnings') THEN
        ALTER TABLE noise_warnings ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
    END IF;
END $$;

-- care_sos_alerts
ALTER TABLE care_sos_alerts ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES quarters(id);
UPDATE care_sos_alerts SET quarter_id = (
    SELECT h.quarter_id FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = care_sos_alerts.senior_id AND hm.verified_at IS NOT NULL
    LIMIT 1
) WHERE quarter_id IS NULL;

-- Indizes fuer quarter_id
CREATE INDEX IF NOT EXISTS idx_alerts_quarter ON alerts(quarter_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_quarter ON help_requests(quarter_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_quarter ON marketplace_items(quarter_id);
CREATE INDEX IF NOT EXISTS idx_events_quarter ON events(quarter_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_quarter ON lost_found(quarter_id);
CREATE INDEX IF NOT EXISTS idx_care_sos_quarter ON care_sos_alerts(quarter_id);

-- ============================================================
-- 5. QUARTER-ADMIN Zuordnungstabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS quarter_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(quarter_id, user_id)
);

ALTER TABLE quarter_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY quarter_admins_read ON quarter_admins
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY quarter_admins_write ON quarter_admins
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ============================================================
-- 6. RLS HELPER FUNCTIONS
-- ============================================================

-- Gibt die quarter_id des aktuellen Nutzers zurueck
CREATE OR REPLACE FUNCTION get_user_quarter_id()
RETURNS UUID AS $$
    SELECT h.quarter_id
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = auth.uid() AND hm.verified_at IS NOT NULL
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prueft ob Nutzer Super-Admin ist
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prueft ob Nutzer Quarter-Admin fuer ein bestimmtes Quartier ist
CREATE OR REPLACE FUNCTION is_quarter_admin_for(p_quarter_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM quarter_admins
        WHERE user_id = auth.uid() AND quarter_id = p_quarter_id
    ) OR is_super_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Aktualisiere is_admin() um Rollen zu beruecksichtigen
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND (is_admin = true OR role IN ('super_admin', 'quarter_admin'))
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Step 2: Verify the migration SQL is valid**

Run: `cd nachbar-io && npx supabase db lint --schema public` (if available) or manual review.

**Step 3: Commit**

```bash
git add supabase/migrations/051_multi_quarter_foundation.sql
git commit -m "feat: add multi-quarter foundation migration (051)

- Extend quarters table with city, map_config, settings, status, invite_prefix
- Add role column to users (super_admin, quarter_admin, user)
- Add quarter_id to all content tables (alerts, help_requests, marketplace, etc.)
- Create quarter_admins assignment table
- Add RLS helper functions (get_user_quarter_id, is_super_admin, is_quarter_admin_for)
- Remove street_name CHECK constraint for multi-quarter support
- Migrate existing data to pilot quarter"
```

---

## Task 2: TypeScript Types — Quarter & Role Types

**Files:**
- Modify: `lib/supabase/types.ts`
- Create: `lib/quarters/types.ts`

**Step 1: Create quarter types file**

```typescript
// lib/quarters/types.ts
// Typen fuer Multi-Quartier-System

export type UserRole = 'super_admin' | 'quarter_admin' | 'user';

export type QuarterStatus = 'draft' | 'active' | 'archived';

export interface Quarter {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  description: string | null;
  contact_email: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  bounds_sw_lat: number;
  bounds_sw_lng: number;
  bounds_ne_lat: number;
  bounds_ne_lng: number;
  map_config: MapConfig;
  settings: QuarterSettings;
  max_households: number;
  status: QuarterStatus;
  invite_prefix: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MapConfig {
  type: 'svg' | 'leaflet';
  viewBox?: string;            // z.B. "0 0 1083 766"
  backgroundImage?: string;    // URL zum Luftbild
  houses?: MapHouseConfig[];   // Haus-Positionen (SVG-Modus)
  tileUrl?: string;            // Leaflet Tile-URL (optional)
}

export interface MapHouseConfig {
  id: string;
  x: number;
  y: number;
  label: string;
  street: string;
  houseNumber: string;
}

export interface QuarterSettings {
  allowSelfRegistration?: boolean;    // Nutzer koennen sich selbst registrieren
  requireVerification?: boolean;      // Adressverifikation erforderlich
  enableCareModule?: boolean;         // Care-Modul aktiviert
  enableMarketplace?: boolean;        // Marktplatz aktiviert
  enableEvents?: boolean;             // Veranstaltungen aktiviert
  enablePolls?: boolean;              // Umfragen aktiviert
  emergencyBannerEnabled?: boolean;   // Notfall-Banner aktiv
  maxMembersPerHousehold?: number;    // Max Mitglieder pro Haushalt
  defaultLanguage?: string;           // Sprache (de, en, fr, ...)
}

export interface QuarterAdmin {
  id: string;
  quarter_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  // Joined fields
  user?: {
    display_name: string;
    email_hash: string;
  };
}

export interface QuarterWithStats extends Quarter {
  stats: {
    houseCount: number;
    householdCount: number;
    residentCount: number;
    activeAlerts: number;
    activePosts: number;
  };
}
```

**Step 2: Update User type in lib/supabase/types.ts**

Add `role` field to the existing User interface:

```typescript
// In der bestehenden User-Interface:
role: 'super_admin' | 'quarter_admin' | 'user';
```

Also add `quarter_id` to interfaces that need it: Household, Alert, HelpRequest, MarketplaceItem, etc.

**Step 3: Commit**

```bash
git add lib/quarters/types.ts lib/supabase/types.ts
git commit -m "feat: add TypeScript types for multi-quarter system"
```

---

## Task 3: Quarter Context Provider

**Files:**
- Create: `lib/quarters/quarter-context.tsx`
- Create: `lib/quarters/hooks.ts`

**Step 1: Create the QuarterProvider**

```typescript
// lib/quarters/quarter-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Quarter } from "./types";

interface QuarterContextType {
  currentQuarter: Quarter | null;
  allQuarters: Quarter[];         // nur fuer Super-Admins
  loading: boolean;
  switchQuarter: (quarterId: string) => void;
  refreshQuarter: () => Promise<void>;
}

const QuarterContext = createContext<QuarterContextType | null>(null);

export function QuarterProvider({ children }: { children: ReactNode }) {
  const [currentQuarter, setCurrentQuarter] = useState<Quarter | null>(null);
  const [allQuarters, setAllQuarters] = useState<Quarter[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadQuarter() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // User-Profil mit Rolle laden
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "super_admin") {
      // Super-Admin: Alle Quartiere laden
      const { data: quarters } = await supabase
        .from("quarters")
        .select("*")
        .order("name");
      if (quarters) {
        setAllQuarters(quarters);
        // Zuletzt gewaehltes Quartier aus localStorage
        const savedId = localStorage.getItem("selected_quarter_id");
        const found = quarters.find(q => q.id === savedId);
        setCurrentQuarter(found ?? quarters[0] ?? null);
      }
    } else {
      // Normaler Nutzer / Quarter-Admin: Eigenes Quartier laden
      const { data: membership } = await supabase
        .from("household_members")
        .select("households(quarter_id)")
        .eq("user_id", user.id)
        .not("verified_at", "is", null)
        .limit(1)
        .single();

      const quarterId = (membership?.households as { quarter_id: string } | null)?.quarter_id;
      if (quarterId) {
        const { data: quarter } = await supabase
          .from("quarters")
          .select("*")
          .eq("id", quarterId)
          .single();
        if (quarter) setCurrentQuarter(quarter);
      }
    }
    setLoading(false);
  }

  function switchQuarter(quarterId: string) {
    const found = allQuarters.find(q => q.id === quarterId);
    if (found) {
      setCurrentQuarter(found);
      localStorage.setItem("selected_quarter_id", quarterId);
    }
  }

  async function refreshQuarter() {
    setLoading(true);
    await loadQuarter();
  }

  useEffect(() => { loadQuarter(); }, []);

  return (
    <QuarterContext.Provider value={{
      currentQuarter, allQuarters, loading, switchQuarter, refreshQuarter
    }}>
      {children}
    </QuarterContext.Provider>
  );
}

export function useQuarter() {
  const ctx = useContext(QuarterContext);
  if (!ctx) throw new Error("useQuarter must be used within QuarterProvider");
  return ctx;
}
```

**Step 2: Create hooks file**

```typescript
// lib/quarters/hooks.ts
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "./types";

// Hook: Aktuelle Nutzer-Rolle
export function useUserRole() {
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data?.role) setRole(data.role as UserRole);
      }
      setLoading(false);
    }
    load();
  }, []);

  return {
    role,
    loading,
    isSuperAdmin: role === "super_admin",
    isQuarterAdmin: role === "quarter_admin",
    isAdmin: role === "super_admin" || role === "quarter_admin",
  };
}
```

**Step 3: Wire QuarterProvider into the app layout**

In `app/(app)/layout.tsx`, wrap children with `<QuarterProvider>`.

**Step 4: Commit**

```bash
git add lib/quarters/quarter-context.tsx lib/quarters/hooks.ts app/(app)/layout.tsx
git commit -m "feat: add QuarterProvider context and useUserRole hook"
```

---

## Task 4: Quarter Switcher Component (Super-Admin)

**Files:**
- Create: `components/QuarterSwitcher.tsx`

**Step 1: Build the quarter switcher dropdown**

A dropdown in the app header that only appears for super_admins, showing all quarters with their status badge. Selecting a quarter switches the context.

Uses: `useQuarter()` for data + switch, `useUserRole()` to conditionally render.

Design: shadcn/ui Select with quarter name + city + status badge. Green dot for active, grey for archived, yellow for draft.

**Step 2: Add to app header/layout**

Insert `<QuarterSwitcher />` into the top navigation bar, visible only for super_admins.

**Step 3: Commit**

```bash
git add components/QuarterSwitcher.tsx
git commit -m "feat: add QuarterSwitcher dropdown for super admins"
```

---

## Task 5: Super-Admin Dashboard — Quarter Lifecycle

**Files:**
- Rewrite: `app/(app)/admin/components/QuarterManagement.tsx` (complete rewrite)
- Create: `app/api/admin/quarters/route.ts` (CRUD API)
- Create: `app/api/admin/quarters/[id]/route.ts` (single quarter API)
- Create: `app/api/admin/quarters/[id]/admins/route.ts` (quarter admin management)

**Step 1: Create Quarter CRUD API**

`POST /api/admin/quarters` — Create new quarter (super_admin only)
`GET /api/admin/quarters` — List all quarters with stats
`PUT /api/admin/quarters/[id]` — Update quarter settings
`DELETE /api/admin/quarters/[id]` — Archive quarter (soft delete via status='archived')

Security: All routes check `role === 'super_admin'`.

**Step 2: Create Quarter Admin Assignment API**

`GET /api/admin/quarters/[id]/admins` — List admins for quarter
`POST /api/admin/quarters/[id]/admins` — Assign user as quarter admin
`DELETE /api/admin/quarters/[id]/admins` — Remove quarter admin

**Step 3: Rewrite QuarterManagement.tsx**

New features:
- **Quarter-Karten** mit Status-Badge (draft/active/archived), Stadt, Bewohnerzahl
- **Neues Quartier anlegen:** Name, Stadt, Bundesland, Koordinaten, Invite-Prefix, Beschreibung
- **Quartier bearbeiten:** Alle Felder, inkl. Settings-Toggles (Care, Marketplace, Events etc.)
- **Map-Config bearbeiten:** Hintergrundbild hochladen, SVG-ViewBox setzen
- **Admin zuweisen:** Nutzer suchen und als Quarter-Admin zuweisen
- **Status aendern:** draft → active → archived
- **Statistik-Dashboard:** Haushalte, Bewohner, aktive Alerts, offene Hilfegesuche pro Quartier

**Step 4: Commit**

```bash
git add app/api/admin/quarters/ app/(app)/admin/components/QuarterManagement.tsx
git commit -m "feat: rebuild QuarterManagement with full lifecycle CRUD and admin assignment"
```

---

## Task 6: Household Management — Per-Quarter

**Files:**
- Modify: `app/(app)/admin/components/HouseholdManagement.tsx`
- Modify: `app/api/admin/create-user/route.ts`

**Step 1: Update HouseholdManagement to be quarter-aware**

- Add quarter filter dropdown at top
- Remove hardcoded street name assumptions
- Allow creating households with ANY street name (no more CHECK constraint)
- Show quarter name in household cards
- Batch-create households (CSV import: Strasse, Hausnummer, Lat, Lng)

**Step 2: Update create-user API to accept quarter_id**

When admin creates a user, the household must be linked to the correct quarter.

**Step 3: Commit**

```bash
git add app/(app)/admin/components/HouseholdManagement.tsx app/api/admin/create-user/route.ts
git commit -m "feat: make HouseholdManagement quarter-aware with flexible street names"
```

---

## Task 7: Invite Code System — Per-Quarter

**Files:**
- Modify: `lib/invite-codes.ts`
- Modify: `app/(app)/admin/components/InviteCodeManager.tsx`

**Step 1: Update invite code generation to include quarter prefix**

Format: `{QUARTER_PREFIX}-{RANDOM}` e.g. `PILOT-ACDF-5679` or `REBBERG-XHKM-3472`

Quarter prefix comes from `quarters.invite_prefix`.

**Step 2: Update InviteCodeManager**

- Filter by quarter
- Show quarter badge on each code
- Generate codes with quarter prefix
- Validate that invite code matches the household's quarter

**Step 3: Commit**

```bash
git add lib/invite-codes.ts app/(app)/admin/components/InviteCodeManager.tsx
git commit -m "feat: add quarter-prefixed invite codes"
```

---

## Task 8: Map Editor — Per-Quarter

**Files:**
- Modify: `app/(app)/admin/components/MapEditor.tsx`
- Modify: `components/NachbarKarte.tsx`
- Modify: `lib/map-houses.ts`

**Step 1: Update MapEditor to be quarter-aware**

- Load map_config from quarter's JSONB field
- Support uploading a new background image per quarter (Supabase Storage)
- House positions saved to `map_houses` table with `quarter_id`
- Allow adding streets per quarter (no hardcoded list)

**Step 2: Update NachbarKarte to use quarter context**

- Read map_config from `useQuarter().currentQuarter.map_config`
- Load houses from `map_houses` WHERE `quarter_id = currentQuarter.id`
- Background image from `map_config.backgroundImage`
- ViewBox from `map_config.viewBox`

**Step 3: Update map-houses.ts**

- Remove hardcoded DEFAULT_HOUSES (or keep as fallback for pilot only)
- Add function `loadQuarterHouses(quarterId)` that queries Supabase

**Step 4: Commit**

```bash
git add app/(app)/admin/components/MapEditor.tsx components/NachbarKarte.tsx lib/map-houses.ts
git commit -m "feat: make map system quarter-aware with dynamic config"
```

---

## Task 9: RLS Policy Updates — Quarter Isolation

**Files:**
- Create: `supabase/migrations/052_quarter_rls_policies.sql`

**Step 1: Write RLS migration**

Update RLS policies for ALL content tables to include quarter isolation:

```sql
-- Beispiel fuer alerts:
DROP POLICY IF EXISTS alerts_select ON alerts;
CREATE POLICY alerts_select ON alerts FOR SELECT USING (
    quarter_id = get_user_quarter_id()
    OR is_super_admin()
    OR is_quarter_admin_for(quarter_id)
);
```

Apply same pattern to: alerts, help_requests, marketplace_items, lost_found, events, news_items, conversations, polls, skills, leihboerse_items, paketannahme, vacation_modes, noise_warnings, care_sos_alerts.

Super-admins see ALL quarters. Quarter-admins see their assigned quarters. Users see only their quarter.

**Step 2: Commit**

```bash
git add supabase/migrations/052_quarter_rls_policies.sql
git commit -m "feat: add quarter-isolated RLS policies for all content tables"
```

---

## Task 10: Content Creation — Auto-set quarter_id

**Files:**
- Modify: Multiple API routes that create content

**Step 1: Update all content-creating API routes**

In every API route that creates alerts, help_requests, marketplace_items, events, etc.:
- Lookup the user's quarter_id via their household membership
- Set `quarter_id` on the new record

Affected routes (check each):
- `app/api/alerts/route.ts`
- `app/api/care/sos/route.ts`
- All other POST routes for content creation

**Step 2: Add helper function**

```typescript
// lib/quarters/helpers.ts
export async function getUserQuarterId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .limit(1)
    .single();
  return (data?.households as { quarter_id: string } | null)?.quarter_id ?? null;
}
```

**Step 3: Commit**

```bash
git add lib/quarters/helpers.ts app/api/
git commit -m "feat: auto-set quarter_id on all content creation"
```

---

## Task 11: Super-Admin Overview Dashboard

**Files:**
- Create: `app/(app)/admin/components/SuperAdminOverview.tsx`
- Modify: `app/(app)/admin/page.tsx`

**Step 1: Build cross-quarter overview**

Dashboard showing:
- Total quarters (active/draft/archived)
- Total users across all quarters
- Global alert count, help requests, marketplace items
- Per-quarter mini-cards with key metrics
- Quick-actions: Create quarter, View system health

**Step 2: Update admin page routing**

- Super-admin sees SuperAdminOverview as default tab
- Quarter-admin sees their quarter's overview (existing dashboard, filtered)
- Add "Quartier-Verwaltung" tab (only super-admin)

**Step 3: Commit**

```bash
git add app/(app)/admin/components/SuperAdminOverview.tsx app/(app)/admin/page.tsx
git commit -m "feat: add SuperAdminOverview dashboard with cross-quarter metrics"
```

---

## Task 12: Quarter Onboarding Wizard

**Files:**
- Create: `app/(app)/admin/components/QuarterWizard.tsx`

**Step 1: Build a step-by-step wizard for creating a new quarter**

Steps:
1. **Grunddaten:** Name, Stadt, Bundesland, Beschreibung
2. **Standort:** Koordinaten eingeben oder auf Karte klicken, Bounding Box
3. **Karte:** Luftbild hochladen, ViewBox definieren, oder "Leaflet-Modus" waehlen
4. **Einstellungen:** Module aktivieren/deaktivieren (Care, Marketplace, Events...)
5. **Admin:** Quarter-Admin zuweisen (Nutzer suchen oder neuen anlegen)
6. **Invite-Prefix:** Prefix fuer Invite-Codes festlegen
7. **Uebersicht & Aktivierung:** Zusammenfassung, Status auf "active" setzen

Uses a multi-step form with shadcn/ui Card layout and progress indicator.

**Step 2: Commit**

```bash
git add app/(app)/admin/components/QuarterWizard.tsx
git commit -m "feat: add QuarterWizard for guided quarter creation"
```

---

## Task 13: Update Existing Content Queries — Quarter Filtering

**Files:**
- Modify: Multiple page.tsx and API routes

**Step 1: Audit and update all data-fetching queries**

Every page that loads content (alerts, help, marketplace, events, etc.) must filter by `quarter_id`.

Pattern: Use `useQuarter().currentQuarter.id` in client components, or `getUserQuarterId()` in API routes.

Key pages to update:
- `app/(app)/dashboard/page.tsx` — Stats filtered by quarter
- `app/(app)/alerts/page.tsx` — Alerts for current quarter
- `app/(app)/help/page.tsx` — Help requests for current quarter
- `app/(app)/marketplace/page.tsx` — Marketplace for current quarter
- `app/(app)/events/page.tsx` — Events for current quarter
- `app/(app)/lost-found/page.tsx` — Lost & found for current quarter
- `app/(app)/news/page.tsx` — News for current quarter (or global)
- `app/(app)/map/page.tsx` — Map for current quarter

**Step 2: Commit per module (split into logical commits)**

---

## Task 14: Tests

**Files:**
- Create: `lib/quarters/__tests__/quarter-context.test.tsx`
- Create: `lib/quarters/__tests__/helpers.test.ts`
- Create: `lib/quarters/__tests__/hooks.test.ts`
- Modify: Existing test files to add quarter_id mocks

**Step 1: Write unit tests for quarter helpers**

- `getUserQuarterId()` returns correct quarter
- `getUserQuarterId()` returns null for unverified users

**Step 2: Write tests for QuarterProvider**

- Loads user's quarter on mount
- Super-admin loads all quarters
- `switchQuarter()` changes current quarter
- `switchQuarter()` persists to localStorage

**Step 3: Write tests for useUserRole**

- Returns 'user' for normal users
- Returns 'super_admin' for admins
- Returns correct `isSuperAdmin`, `isQuarterAdmin`, `isAdmin` flags

**Step 4: Update existing tests to include quarter_id in mocks**

**Step 5: Commit**

```bash
git add lib/quarters/__tests__/
git commit -m "test: add unit tests for multi-quarter system"
```

---

## Task 15: Constants & Cleanup

**Files:**
- Modify: `lib/constants.ts`

**Step 1: Remove hardcoded quarter-specific constants**

Move `QUARTER_CENTER`, `QUARTER_STREETS`, `BOUNDING_BOX` etc. into the quarter's database record. Keep as fallback constants only.

**Step 2: Update imports across codebase**

Replace direct constant usage with `useQuarter().currentQuarter` where possible.

**Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "refactor: move quarter-specific constants to database config"
```

---

## Task 16: Build Verification & Final Testing

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 2: Run unit tests**

Run: `npm run test`
Expected: All tests pass

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 4: Manual smoke test**

1. Login as super_admin → See quarter switcher → Can create new quarter
2. Create new quarter "Test-Quartier" with wizard
3. Assign quarter admin
4. Switch between quarters → Content filters correctly
5. Login as quarter_admin → See only assigned quarter
6. Login as normal user → See only own quarter

**Step 5: Final commit**

```bash
git commit -m "chore: verify build and tests pass for multi-quarter feature"
```

---

## Execution Order & Dependencies

```
Task 1 (DB Migration) ←── Foundation, alles andere haengt davon ab
    ↓
Task 2 (Types) ←── Task 3-15 brauchen die Types
    ↓
Task 3 (Context Provider) + Task 10 (Helper) ←── parallel moeglich
    ↓
Task 4 (Switcher) + Task 5 (Quarter CRUD) + Task 9 (RLS) ←── parallel moeglich
    ↓
Task 6 (Households) + Task 7 (Invite Codes) + Task 8 (Map) ←── parallel moeglich
    ↓
Task 11 (Overview Dashboard) + Task 12 (Wizard) ←── parallel moeglich
    ↓
Task 13 (Content Queries) ←── braucht alles vorherige
    ↓
Task 14 (Tests) + Task 15 (Cleanup) ←── parallel moeglich
    ↓
Task 16 (Build Verification)
```

## Estimated Effort

| Task | Estimated Time |
|------|---------------|
| 1. DB Migration | 30 min |
| 2. Types | 15 min |
| 3. Context Provider | 30 min |
| 4. Quarter Switcher | 20 min |
| 5. Quarter CRUD + Admin UI | 60 min |
| 6. Household Management | 30 min |
| 7. Invite Codes | 20 min |
| 8. Map System | 45 min |
| 9. RLS Policies | 30 min |
| 10. Content Creation | 30 min |
| 11. Overview Dashboard | 30 min |
| 12. Quarter Wizard | 45 min |
| 13. Content Queries | 45 min |
| 14. Tests | 30 min |
| 15. Constants Cleanup | 15 min |
| 16. Build Verification | 15 min |
| **TOTAL** | **~8 Stunden** |
