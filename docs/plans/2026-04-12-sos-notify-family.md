# J-1: SOS Notify Family — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a senior taps "Angehörige benachrichtigen" in the SOS sheet, send SMS to all emergency_contacts from their CareProfile.

**Architecture:** New service `notifyFamily` loads CareProfile → filters contacts with valid phone → sends SMS via existing `sendSms`. New thin API route `POST /api/sos/notify-family` calls the service. Frontend `SosConfirmationSheet` calls the API with loading/error/success states.

**Tech Stack:** Next.js API route, Supabase, Twilio SMS (`sendSms`), Vitest

---

### Task 1: Service — `notifyFamily`

**Files:**
- Create: `lib/sos/notify-family.ts`
- Test: `__tests__/lib/sos/notify-family.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/lib/sos/notify-family.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyFamily } from "@/lib/sos/notify-family";

// Mock sendSms
vi.mock("@/modules/care/services/channels/sms", () => ({
  sendSms: vi.fn().mockResolvedValue(true),
}));

// Mock getCareProfile (from modules/care/services/profile.service)
vi.mock("@/modules/care/services/profile.service", () => ({
  getCareProfile: vi.fn(),
}));

import { sendSms } from "@/modules/care/services/channels/sms";
import { getCareProfile } from "@/modules/care/services/profile.service";

const mockSendSms = vi.mocked(sendSms);
const mockGetCareProfile = vi.mocked(getCareProfile);

function fakeSupabase() {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { display_name: "Erna Müller" },
      error: null,
    }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

const CONTACTS = [
  { name: "Hans", phone: "+491701234567", role: "relative", priority: 1, relationship: "Sohn" },
  { name: "Maria", phone: "+491709876543", role: "relative", priority: 2, relationship: "Tochter" },
];

describe("notifyFamily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends SMS to all emergency contacts", async () => {
    mockGetCareProfile.mockResolvedValue({ emergency_contacts: CONTACTS });
    const sb = fakeSupabase();

    const result = await notifyFamily(sb, "user-123");

    expect(mockGetCareProfile).toHaveBeenCalledWith(sb, "user-123", "user-123");
    expect(mockSendSms).toHaveBeenCalledTimes(2);
    expect(mockSendSms).toHaveBeenCalledWith({
      phone: "+491701234567",
      message: expect.stringContaining("Erna Müller"),
    });
    expect(result).toEqual({ notified: 2, failed: 0 });
  });

  it("returns { notified: 0 } when no CareProfile exists", async () => {
    mockGetCareProfile.mockResolvedValue(null);
    const sb = fakeSupabase();

    const result = await notifyFamily(sb, "user-123");

    expect(mockSendSms).not.toHaveBeenCalled();
    expect(result).toEqual({ notified: 0, failed: 0 });
  });

  it("returns { notified: 0 } when emergency_contacts is empty", async () => {
    mockGetCareProfile.mockResolvedValue({ emergency_contacts: [] });
    const sb = fakeSupabase();

    const result = await notifyFamily(sb, "user-123");

    expect(mockSendSms).not.toHaveBeenCalled();
    expect(result).toEqual({ notified: 0, failed: 0 });
  });

  it("counts failed SMS separately", async () => {
    mockGetCareProfile.mockResolvedValue({ emergency_contacts: CONTACTS });
    mockSendSms.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const sb = fakeSupabase();

    const result = await notifyFamily(sb, "user-123");

    expect(result).toEqual({ notified: 1, failed: 1 });
  });

  it("skips contacts without phone number", async () => {
    mockGetCareProfile.mockResolvedValue({
      emergency_contacts: [
        { name: "Hans", phone: "", role: "relative", priority: 1, relationship: "Sohn" },
        ...CONTACTS.slice(1),
      ],
    });
    const sb = fakeSupabase();

    const result = await notifyFamily(sb, "user-123");

    expect(mockSendSms).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ notified: 1, failed: 0 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/sos/notify-family.test.ts`
Expected: FAIL — `Cannot find module '@/lib/sos/notify-family'`

**Step 3: Write minimal implementation**

```ts
// lib/sos/notify-family.ts
// J-1: Sendet SMS an alle Notfallkontakte eines Seniors

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCareProfile } from "@/modules/care/services/profile.service";
import { sendSms } from "@/modules/care/services/channels/sms";
import type { EmergencyContact } from "@/lib/care/types";

export interface NotifyFamilyResult {
  notified: number;
  failed: number;
}

export async function notifyFamily(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotifyFamilyResult> {
  // CareProfile laden (userId == seniorId, eigenes Profil)
  const profile = await getCareProfile(supabase, userId, userId);

  const contacts: EmergencyContact[] = profile?.emergency_contacts ?? [];
  const withPhone = contacts.filter((c) => c.phone && c.phone.length > 0);

  if (withPhone.length === 0) {
    return { notified: 0, failed: 0 };
  }

  // Name des Seniors fuer SMS-Text laden
  const { data: user } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .single();

  const seniorName = user?.display_name ?? "Ihr Angehöriger";
  const message = `${seniorName} hat den Notfall-Knopf gedrückt und braucht Ihre Hilfe. Bitte melden Sie sich umgehend.`;

  const results = await Promise.all(
    withPhone.map((c) => sendSms({ phone: c.phone, message })),
  );

  const notified = results.filter(Boolean).length;
  return { notified, failed: results.length - notified };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/sos/notify-family.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add lib/sos/notify-family.ts __tests__/lib/sos/notify-family.test.ts
git commit -m "feat(sos): add notifyFamily service with tests (J-1)"
```

---

### Task 2: API Route — `POST /api/sos/notify-family`

**Files:**
- Create: `app/api/sos/notify-family/route.ts`
- Test: `app/api/sos/notify-family/route.test.ts`

**Step 1: Write the failing test**

```ts
// app/api/sos/notify-family/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/sos/notify-family", () => ({
  notifyFamily: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { notifyFamily } from "@/lib/sos/notify-family";

const mockCreateClient = vi.mocked(createClient);
const mockNotifyFamily = vi.mocked(notifyFamily);

function makeRequest() {
  return new NextRequest("http://localhost/api/sos/notify-family", {
    method: "POST",
  });
}

describe("POST /api/sos/notify-family", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 200 with notified count on success", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    } as any);
    mockNotifyFamily.mockResolvedValue({ notified: 2, failed: 0 });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ notified: 2, failed: 0 });
  });

  it("returns 500 on service error", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    } as any);
    mockNotifyFamily.mockRejectedValue(new Error("DB down"));

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/sos/notify-family/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

**Step 3: Write minimal implementation**

```ts
// app/api/sos/notify-family/route.ts
// J-1: SMS an alle Notfallkontakte des eingeloggten Seniors senden

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyFamily } from "@/lib/sos/notify-family";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  try {
    const result = await notifyFamily(supabase, user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[sos/notify-family] Fehler:", err);
    return NextResponse.json(
      { error: "Benachrichtigung fehlgeschlagen" },
      { status: 500 },
    );
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/sos/notify-family/route.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add app/api/sos/notify-family/route.ts app/api/sos/notify-family/route.test.ts
git commit -m "feat(sos): add POST /api/sos/notify-family route (J-1)"
```

---

### Task 3: Frontend — Wire up `SosConfirmationSheet`

**Files:**
- Modify: `components/sos/SosConfirmationSheet.tsx`
- Test: `components/sos/SosConfirmationSheet.test.tsx` (create)

**Step 1: Write the failing test**

```tsx
// components/sos/SosConfirmationSheet.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SosConfirmationSheet } from "./SosConfirmationSheet";

// Mock SosContext
vi.mock("./SosContext", () => ({
  useSos: vi.fn().mockReturnValue({ isOpen: true, closeSos: vi.fn() }),
}));

import { useSos } from "./SosContext";
const mockUseSos = vi.mocked(useSos);

describe("SosConfirmationSheet", () => {
  let closeSos: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    closeSos = vi.fn();
    mockUseSos.mockReturnValue({ isOpen: true, openSos: vi.fn(), closeSos });
    global.fetch = vi.fn();
  });

  it("calls /api/sos/notify-family on button click and shows success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ notified: 2, failed: 0 }),
    });

    render(<SosConfirmationSheet />);
    fireEvent.click(screen.getByTestId("sos-notify-caregivers"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/sos/notify-family", {
        method: "POST",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/benachrichtigt/i)).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Fehler" }),
    });

    render(<SosConfirmationSheet />);
    fireEvent.click(screen.getByTestId("sos-notify-caregivers"));

    await waitFor(() => {
      expect(screen.getByText(/fehlgeschlagen/i)).toBeInTheDocument();
    });
  });

  it("shows no-contacts hint when notified is 0", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ notified: 0, failed: 0 }),
    });

    render(<SosConfirmationSheet />);
    fireEvent.click(screen.getByTestId("sos-notify-caregivers"));

    await waitFor(() => {
      expect(screen.getByText(/keine angehörigen/i)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/sos/SosConfirmationSheet.test.tsx`
Expected: FAIL — tests fail because `handleNotifyCaregivers` still uses `alert()`

**Step 3: Update `SosConfirmationSheet.tsx`**

Replace the `handleNotifyCaregivers` function and add state. Key changes:

1. Add state: `loading`, `feedback` (success/error/no-contacts message)
2. Replace `alert()` with `fetch('/api/sos/notify-family', { method: 'POST' })`
3. Show feedback message instead of the button after the call
4. Auto-close after 3 seconds on success

```tsx
// Replace handleNotifyCaregivers and add imports/state:

// Add to imports:
import { useState } from "react";

// Add state inside component:
const [loading, setLoading] = useState(false);
const [feedback, setFeedback] = useState<{
  type: "success" | "error" | "no-contacts";
  text: string;
} | null>(null);

// Replace handleNotifyCaregivers:
async function handleNotifyCaregivers() {
  setLoading(true);
  setFeedback(null);
  try {
    const res = await fetch("/api/sos/notify-family", { method: "POST" });
    if (!res.ok) {
      setFeedback({ type: "error", text: "Benachrichtigung fehlgeschlagen. Bitte versuchen Sie es erneut." });
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (data.notified === 0 && data.failed === 0) {
      setFeedback({ type: "no-contacts", text: "Keine Angehörigen hinterlegt." });
    } else {
      setFeedback({
        type: "success",
        text: `${data.notified} Angehörige benachrichtigt.`,
      });
      setTimeout(() => closeSos(), 3000);
    }
  } catch {
    setFeedback({ type: "error", text: "Benachrichtigung fehlgeschlagen. Bitte versuchen Sie es erneut." });
  }
  setLoading(false);
}

// In the JSX, replace the Angehörige button with:
{feedback ? (
  <div
    className={`mb-3 rounded-xl p-4 text-center text-lg font-bold ${
      feedback.type === "success"
        ? "bg-green-100 text-green-800"
        : feedback.type === "no-contacts"
          ? "bg-gray-100 text-gray-600"
          : "bg-red-100 text-red-800"
    }`}
    style={{ minHeight: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}
  >
    {feedback.text}
  </div>
) : (
  // existing button, add disabled={loading} and opacity
)}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/sos/SosConfirmationSheet.test.tsx`
Expected: 3 tests PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All 3053+ tests PASS (no regressions)

**Step 6: Commit**

```bash
git add components/sos/SosConfirmationSheet.tsx components/sos/SosConfirmationSheet.test.tsx
git commit -m "feat(sos): wire up notify-family in SosConfirmationSheet (J-1)"
```

---

### Task 4: Full suite verification + cleanup commit

**Step 1:** Run `npx vitest run` — all tests pass
**Step 2:** Run `git status` — working tree clean
**Step 3:** Verify no lint issues: `npx next lint --quiet` (if configured)
