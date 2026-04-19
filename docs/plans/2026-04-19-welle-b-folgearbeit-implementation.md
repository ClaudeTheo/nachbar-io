# Welle B Folgearbeit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Schliesst zwei offene Luecken in Welle B (QR-Pairing): (1) TTS-Voiceover auf Pair-Seite fuer Senior-UX, (2) 6-stelliger Code-Pairing-Flow als Alternative zum QR-Scan.

**Architecture:** Teil 1 = statische MP3 via `<audio autoplay>`; keine Server-Route. Teil 2 = Redis-Only 6-stelliger Code, semantisch getrennt von `caregiver_invites`. Beide Teile nutzen vorhandene `device_refresh_tokens`-Tabelle beim Claim, keine DB-Migration.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Vitest, @testing-library/react, Upstash Redis (via `lib/security/redis.ts`), OpenAI TTS (einmalig fuer MP3).

**Referenz-Design:** `docs/plans/2026-04-19-welle-b-folgearbeit-design.md` (`880ed47`).

---

## Teil 1 — TTS-Voiceover (~1h, 3 Tasks)

### Task 1: MP3 generieren

**Files:**
- Create: `nachbar-io/scripts/generate-pair-welcome-audio.ts`
- Create: `nachbar-io/public/audio/pair-welcome.mp3` (Output)

**Step 1: Script schreiben**

```ts
// nachbar-io/scripts/generate-pair-welcome-audio.ts
// Einmalig: erzeugt public/audio/pair-welcome.mp3 via OpenAI TTS.
// Ausfuehrung: `npx tsx scripts/generate-pair-welcome-audio.ts`
// Nach erfolgreichem Lauf MP3 committen, Script bleibt reproduzierbar.

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import OpenAI from "openai";
import { SENIOR_VOICE_INSTRUCTIONS } from "../modules/voice/services/system-prompt";

const TEXT =
  "Bitte bitten Sie einen Angehoerigen, diesen Code mit dem Handy abzufotografieren. " +
  "Oder tippen Sie unten auf, Ich habe einen Code.";

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY fehlt in env");
  const openai = new OpenAI({ apiKey });

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "ash",
    input: TEXT,
    speed: 0.95,
    instructions: SENIOR_VOICE_INSTRUCTIONS,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const target = resolve(process.cwd(), "public/audio/pair-welcome.mp3");
  await writeFile(target, buffer);
  console.log(`Geschrieben: ${target} (${buffer.length} Bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 2: Script ausfuehren (Gelbe Zone — OpenAI-Call, ~0.5 Cent)**

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
mkdir -p public/audio
npx tsx scripts/generate-pair-welcome-audio.ts
```

Expected: `Geschrieben: .../public/audio/pair-welcome.mp3 (XXXXX Bytes)` mit Byte-Groesse > 10000.

**Step 3: MP3 verifizieren**

```bash
ls -la public/audio/pair-welcome.mp3
file public/audio/pair-welcome.mp3
```

Expected: Dateigroesse > 10 KB, Typ `Audio file with ID3 version 2.x, contains: MPEG ADTS, layer III`.

**Step 4: Commit**

```bash
git add scripts/generate-pair-welcome-audio.ts public/audio/pair-welcome.mp3
git commit -m "feat(senior-app): generate pair-welcome TTS audio for senior pair page

Einmaliges Script + generiertes MP3 (ash voice, 0.95 speed, SENIOR_VOICE_INSTRUCTIONS).
Wird in Teil 2 (pair/page.tsx) als autoplay audio eingebunden.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Audio-Element in Pair-Seite, Tests

**Files:**
- Modify: `nachbar-io/app/(senior)/pair/page.tsx`
- Modify: `nachbar-io/__tests__/app/senior/pair.test.tsx`

**Step 1: Failing Tests schreiben**

Hinzufuegen zu `__tests__/app/senior/pair.test.tsx` (nach den bestehenden 4 Tests):

```tsx
it("spielt pair-welcome.mp3 genau einmal beim ersten Mount", async () => {
  mockStartOk();
  alwaysStatus({ status: "pending" });
  const playMock = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.play = playMock;

  const { default: PairPage } = await import("@/app/(senior)/pair/page");
  render(<PairPage />);
  await waitFor(() => {
    expect(screen.getByTestId("pair-welcome-audio")).toBeInTheDocument();
  });
  const audio = screen.getByTestId("pair-welcome-audio") as HTMLAudioElement;
  expect(audio).toHaveAttribute("src", "/audio/pair-welcome.mp3");
  expect(playMock).toHaveBeenCalledTimes(1);
});

it("spielt Audio NICHT erneut bei Token-Renewal", async () => {
  vi.useFakeTimers();
  mockStartOk();
  // zweiter Start (nach Renewal) kommt nicht automatisch, wir simulieren manuell
  alwaysStatus({ status: "pending" });
  const playMock = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.play = playMock;

  const { default: PairPage } = await import("@/app/(senior)/pair/page");
  render(<PairPage />);
  await waitFor(() => {
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  // 9-min-Renewal triggern
  fetchMock.mockImplementationOnce(async () => ({
    ok: true,
    json: async () => ({ token: "eyJRENEWED", pair_id: "pid-2" }),
  }));
  vi.advanceTimersByTime(9 * 60 * 1000 + 100);
  await vi.waitFor(() => {
    // play darf NICHT erneut aufgerufen sein
    expect(playMock).toHaveBeenCalledTimes(1);
  });
  vi.useRealTimers();
});
```

**Step 2: Tests rot laufen lassen**

```bash
cd nachbar-io
npx vitest run __tests__/app/senior/pair.test.tsx
```

Expected: 2 neue Tests FAIL (kein `pair-welcome-audio` im DOM).

**Step 3: Implementierung in `app/(senior)/pair/page.tsx`**

In der `SeniorPairPage`-Komponente nach den bestehenden `useEffect`s und vor `if (state.kind === "loading")` hinzufuegen:

```tsx
const audioPlayedRef = useRef(false);
const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  if (audioPlayedRef.current) return;
  if (state.kind !== "active") return;
  audioPlayedRef.current = true;
  audioRef.current?.play().catch(() => {
    // Autoplay-Policy blockt — stumm schlucken, visueller Text steht ja da
  });
}, [state.kind]);
```

Im Render (`kind === "active"`-Branch, nach dem QR-Block und vor dem Hinweistext) das Audio-Element einfuegen:

```tsx
<audio
  ref={audioRef}
  src="/audio/pair-welcome.mp3"
  data-testid="pair-welcome-audio"
  preload="auto"
/>
```

**Step 4: Tests laufen lassen**

```bash
npx vitest run __tests__/app/senior/pair.test.tsx
```

Expected: Alle 6 Tests PASS.

**Step 5: TypeScript + Lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: clean.

**Step 6: Commit**

```bash
git add app/\(senior\)/pair/page.tsx __tests__/app/senior/pair.test.tsx
git commit -m "feat(senior-app): play pair-welcome audio once on pair page mount

Autoplay on first mount of active state. No replay on 9-min token renewal.
Autoplay policy failures silent (visual text remains).

+2 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Teil 2 — 6-stelliger Code-Pairing (~3-4h, 8 Tasks)

### Task 3: `lib/device-pairing/pair-code.ts` + Tests

**Files:**
- Create: `nachbar-io/lib/device-pairing/pair-code.ts`
- Create: `nachbar-io/lib/device-pairing/__tests__/pair-code.test.ts`

**Step 1: Failing Tests schreiben**

```ts
// lib/device-pairing/__tests__/pair-code.test.ts
import { describe, it, expect } from "vitest";
import {
  generatePairCode,
  PAIR_CODE_REDIS_TTL_SECONDS,
  pairCodeRedisKey,
} from "../pair-code";

describe("pair-code", () => {
  it("generatePairCode liefert 6-stellige numerische Strings", () => {
    for (let i = 0; i < 100; i++) {
      const code = generatePairCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("generatePairCode liefert gleichverteilte Codes (keine fuehrenden Nullen verloren)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 500; i++) codes.add(generatePairCode());
    // Mindestens 95% unique ueber 500 Zuege = ausreichend random
    expect(codes.size).toBeGreaterThan(475);
    // Mindestens 1 Code mit fuehrender Null erwarten (P ~40%)
    const withLeadingZero = Array.from(codes).filter((c) => c.startsWith("0"));
    expect(withLeadingZero.length).toBeGreaterThan(0);
  });

  it("pairCodeRedisKey baut Key mit Prefix pair-code:", () => {
    expect(pairCodeRedisKey("123456")).toBe("pair-code:123456");
  });

  it("TTL ist 600 Sekunden (10 Minuten)", () => {
    expect(PAIR_CODE_REDIS_TTL_SECONDS).toBe(600);
  });
});
```

**Step 2: Rot laufen lassen**

```bash
npx vitest run lib/device-pairing/__tests__/pair-code.test.ts
```

Expected: FAIL, Modul existiert nicht.

**Step 3: Implementierung**

```ts
// lib/device-pairing/pair-code.ts
// 6-stelliger numerischer Pair-Code, Redis-Only persistiert.
// Nutzung: siehe app/api/device/pair/start-code/route.ts und claim-by-code/route.ts.

import { randomInt } from "node:crypto";

export const PAIR_CODE_REDIS_TTL_SECONDS = 600; // 10 Minuten

/** Erzeugt einen kryptografisch sicheren 6-stelligen numerischen Code. */
export function generatePairCode(): string {
  // crypto.randomInt ist gleichverteilt, keine Modulo-Bias.
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export function pairCodeRedisKey(code: string): string {
  return `pair-code:${code}`;
}

export type PairCodePayload = {
  senior_user_id: string;
  caregiver_id: string;
  created_at: string;
};
```

**Step 4: Gruen laufen lassen**

```bash
npx vitest run lib/device-pairing/__tests__/pair-code.test.ts
```

Expected: 4 Tests PASS.

**Step 5: Commit**

```bash
git add lib/device-pairing/pair-code.ts lib/device-pairing/__tests__/pair-code.test.ts
git commit -m "feat(device-pairing): add pair-code module (6-digit numeric codes, 10min TTL)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `POST /api/device/pair/start-code` Route + Tests

**Files:**
- Create: `nachbar-io/app/api/device/pair/start-code/route.ts`
- Create: `nachbar-io/__tests__/api/device/pair-start-code.test.ts`

**Step 1: Failing Tests schreiben**

```ts
// __tests__/api/device/pair-start-code.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const fromMock = vi.fn();
const redisSetMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({ set: redisSetMock }),
}));

async function callRoute(body: unknown) {
  const { POST } = await import("@/app/api/device/pair/start-code/route");
  const req = new NextRequest("http://x/api/device/pair/start-code", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return POST(req);
}

describe("POST /api/device/pair/start-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 wenn nicht eingeloggt", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await callRoute({ senior_user_id: "u-senior" });
    expect(res.status).toBe(401);
  });

  it("400 wenn senior_user_id fehlt", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-care" } } });
    const res = await callRoute({});
    expect(res.status).toBe(400);
  });

  it("403 wenn kein aktiver caregiver_link", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-care" } } });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({ maybeSingle: async () => ({ data: null }) }),
          }),
        }),
      }),
    });
    const res = await callRoute({ senior_user_id: "u-senior" });
    expect(res.status).toBe(403);
  });

  it("200 + 6-stelliger Code + Redis-Eintrag bei Happy Path", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-care" } } });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({ maybeSingle: async () => ({ data: { id: "link-1" } }) }),
          }),
        }),
      }),
    });
    redisSetMock.mockResolvedValue("OK");

    const res = await callRoute({ senior_user_id: "u-senior" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { code: string; expires_in: number };
    expect(json.code).toMatch(/^\d{6}$/);
    expect(json.expires_in).toBe(600);
    expect(redisSetMock).toHaveBeenCalledTimes(1);
    const [key, value, opts] = redisSetMock.mock.calls[0];
    expect(key).toBe(`pair-code:${json.code}`);
    expect(JSON.parse(value as string)).toMatchObject({
      senior_user_id: "u-senior",
      caregiver_id: "u-care",
    });
    expect(opts).toEqual({ ex: 600 });
  });

  it("503 wenn Redis nicht verfuegbar", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-care" } } });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({ maybeSingle: async () => ({ data: { id: "link-1" } }) }),
          }),
        }),
      }),
    });
    vi.doMock("@/lib/security/redis", () => ({ getSecurityRedis: () => null }));
    vi.resetModules();

    const res = await callRoute({ senior_user_id: "u-senior" });
    expect(res.status).toBe(503);
  });
});
```

**Step 2: Rot laufen lassen**

```bash
npx vitest run __tests__/api/device/pair-start-code.test.ts
```

**Step 3: Implementierung**

```ts
// app/api/device/pair/start-code/route.ts
// Angehoeriger erzeugt 6-stelligen Pair-Code fuer Senior-Geraet.
// Auth: Caregiver mit aktivem caregiver_link zum senior_user_id.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSecurityRedis } from "@/lib/security/redis";
import {
  generatePairCode,
  pairCodeRedisKey,
  PAIR_CODE_REDIS_TTL_SECONDS,
  type PairCodePayload,
} from "@/lib/device-pairing/pair-code";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "ungueltiger JSON-Body" },
      { status: 400 },
    );
  }
  const body =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const senior_user_id =
    typeof body.senior_user_id === "string" ? body.senior_user_id : null;
  if (!senior_user_id) {
    return NextResponse.json(
      { error: "senior_user_id erforderlich" },
      { status: 400 },
    );
  }

  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", user.id)
    .eq("resident_id", senior_user_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) {
    return NextResponse.json(
      { error: "Kein aktiver caregiver_link fuer dieses Senior-Konto" },
      { status: 403 },
    );
  }

  const redis = getSecurityRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Pairing-Service nicht verfuegbar (Redis)" },
      { status: 503 },
    );
  }

  const code = generatePairCode();
  const payload: PairCodePayload = {
    senior_user_id,
    caregiver_id: user.id,
    created_at: new Date().toISOString(),
  };
  await redis.set(pairCodeRedisKey(code), JSON.stringify(payload), {
    ex: PAIR_CODE_REDIS_TTL_SECONDS,
  });

  return NextResponse.json({
    code,
    expires_in: PAIR_CODE_REDIS_TTL_SECONDS,
  });
}
```

**Step 4: Gruen laufen lassen**

```bash
npx vitest run __tests__/api/device/pair-start-code.test.ts
```

Expected: 5 Tests PASS.

**Step 5: Commit**

```bash
git add app/api/device/pair/start-code/route.ts __tests__/api/device/pair-start-code.test.ts
git commit -m "feat(device-pairing): POST /api/device/pair/start-code — caregiver erzeugt 6-stelligen Code

+5 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `POST /api/device/pair/claim-by-code` Route + Tests

**Files:**
- Create: `nachbar-io/app/api/device/pair/claim-by-code/route.ts`
- Create: `nachbar-io/__tests__/api/device/pair-claim-by-code.test.ts`

**Step 1: Failing Tests schreiben**

```ts
// __tests__/api/device/pair-claim-by-code.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const redisGetMock = vi.fn();
const redisDelMock = vi.fn();
const redisIncrMock = vi.fn();
const redisExpireMock = vi.fn();
const adminInsertMock = vi.fn();

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    get: redisGetMock,
    del: redisDelMock,
    incr: redisIncrMock,
    expire: redisExpireMock,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: () => ({ insert: adminInsertMock }),
  }),
}));

async function callRoute(body: unknown, ip = "1.2.3.4") {
  const { POST } = await import("@/app/api/device/pair/claim-by-code/route");
  const req = new NextRequest("http://x/api/device/pair/claim-by-code", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
  return POST(req);
}

describe("POST /api/device/pair/claim-by-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisIncrMock.mockResolvedValue(1);
  });

  it("400 wenn code fehlt", async () => {
    const res = await callRoute({ device_id: "d-1" });
    expect(res.status).toBe(400);
  });

  it("400 wenn device_id fehlt", async () => {
    const res = await callRoute({ code: "123456" });
    expect(res.status).toBe(400);
  });

  it("400 wenn Code-Format falsch", async () => {
    const res = await callRoute({ code: "abc123", device_id: "d-1" });
    expect(res.status).toBe(400);
  });

  it("401 wenn Code nicht in Redis (abgelaufen/falsch)", async () => {
    redisGetMock.mockResolvedValue(null);
    const res = await callRoute({ code: "123456", device_id: "d-1" });
    expect(res.status).toBe(401);
  });

  it("200 + refresh_token + Redis DEL bei Happy Path", async () => {
    redisGetMock.mockResolvedValue(
      JSON.stringify({
        senior_user_id: "u-senior",
        caregiver_id: "u-care",
        created_at: new Date().toISOString(),
      }),
    );
    adminInsertMock.mockResolvedValue({ error: null });

    const res = await callRoute({ code: "123456", device_id: "d-1" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      refresh_token: string;
      user_id: string;
      device_id: string;
      expires_at: string;
    };
    expect(json.refresh_token).toMatch(/^[0-9a-f]{64}$/);
    expect(json.user_id).toBe("u-senior");
    expect(json.device_id).toBe("d-1");
    expect(redisDelMock).toHaveBeenCalledWith("pair-code:123456");
  });

  it("429 nach 5 Fehlversuchen (Rate-Limit)", async () => {
    redisIncrMock.mockResolvedValue(6);
    const res = await callRoute({ code: "999999", device_id: "d-1" });
    expect(res.status).toBe(429);
  });

  it("Replay-Schutz: zweiter Claim desselben Codes 401", async () => {
    redisGetMock.mockResolvedValueOnce(
      JSON.stringify({
        senior_user_id: "u-senior",
        caregiver_id: "u-care",
        created_at: new Date().toISOString(),
      }),
    );
    adminInsertMock.mockResolvedValue({ error: null });
    const r1 = await callRoute({ code: "123456", device_id: "d-1" });
    expect(r1.status).toBe(200);

    redisGetMock.mockResolvedValueOnce(null); // schon geloescht
    const r2 = await callRoute({ code: "123456", device_id: "d-2" });
    expect(r2.status).toBe(401);
  });
});
```

**Step 2: Rot laufen lassen**

```bash
npx vitest run __tests__/api/device/pair-claim-by-code.test.ts
```

**Step 3: Implementierung**

```ts
// app/api/device/pair/claim-by-code/route.ts
// Senior-Geraet claimt einen 6-stelligen Code. Kein Auth (Senior hat noch keine Session).
// Rate-Limit: 5 Fehlversuche / IP+device_id / Stunde.

import { NextResponse, type NextRequest } from "next/server";
import { getSecurityRedis } from "@/lib/security/redis";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  pairCodeRedisKey,
  type PairCodePayload,
} from "@/lib/device-pairing/pair-code";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from "@/lib/device-pairing/refresh-token";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1h

function rateLimitKey(ip: string, device_id: string): string {
  return `pair-code-rl:${ip}:${device_id}`;
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "ungueltiger JSON-Body" },
      { status: 400 },
    );
  }
  const body =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const code = typeof body.code === "string" ? body.code : null;
  const device_id =
    typeof body.device_id === "string" ? body.device_id : null;

  if (!code) {
    return NextResponse.json({ error: "code erforderlich" }, { status: 400 });
  }
  if (!device_id) {
    return NextResponse.json(
      { error: "device_id erforderlich" },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Code-Format ungueltig (6 Ziffern erwartet)" },
      { status: 400 },
    );
  }

  const redis = getSecurityRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Pairing-Service nicht verfuegbar (Redis)" },
      { status: 503 },
    );
  }

  // Rate-Limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rlKey = rateLimitKey(ip, device_id);
  const attempts = await redis.incr(rlKey);
  if (attempts === 1) {
    await redis.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
  }
  if (attempts > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte eine Stunde warten." },
      { status: 429 },
    );
  }

  // Code pruefen
  const raw_payload = await redis.get<string>(pairCodeRedisKey(code));
  if (!raw_payload) {
    return NextResponse.json(
      { error: "Code ungueltig oder abgelaufen" },
      { status: 401 },
    );
  }
  const payload =
    typeof raw_payload === "string"
      ? (JSON.parse(raw_payload) as PairCodePayload)
      : (raw_payload as PairCodePayload);

  // Refresh-Token erzeugen + persistieren (selbe Tabelle wie QR-Flow)
  const refresh_token = generateRefreshToken();
  const token_hash = hashRefreshToken(refresh_token);
  const expires_at = refreshTokenExpiry();

  const admin = getAdminSupabase();
  const { error: insertError } = await admin
    .from("device_refresh_tokens")
    .insert({
      user_id: payload.senior_user_id,
      device_id,
      token_hash,
      pairing_method: "code",
      user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
      expires_at: expires_at.toISOString(),
    });
  if (insertError) {
    return NextResponse.json(
      { error: "Konnte refresh_token nicht speichern" },
      { status: 500 },
    );
  }

  // Redis: Code loeschen (single-use)
  await redis.del(pairCodeRedisKey(code));

  return NextResponse.json({
    refresh_token,
    user_id: payload.senior_user_id,
    device_id,
    expires_at: expires_at.toISOString(),
  });
}
```

**Step 4: Gruen laufen lassen**

```bash
npx vitest run __tests__/api/device/pair-claim-by-code.test.ts
```

Expected: 7 Tests PASS.

**Step 5: Commit**

```bash
git add app/api/device/pair/claim-by-code/route.ts __tests__/api/device/pair-claim-by-code.test.ts
git commit -m "feat(device-pairing): POST /api/device/pair/claim-by-code — senior claimt code

Rate-Limit 5/h pro IP+device_id, Single-Use via Redis DEL, rotiert in device_refresh_tokens.

+7 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `PairCodeNumpad`-Komponente + Tests

**Files:**
- Create: `nachbar-io/components/senior/PairCodeNumpad.tsx`
- Create: `nachbar-io/__tests__/components/senior/PairCodeNumpad.test.tsx`

**Step 1: Failing Tests schreiben**

```tsx
// __tests__/components/senior/PairCodeNumpad.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PairCodeNumpad } from "@/components/senior/PairCodeNumpad";

describe("PairCodeNumpad", () => {
  it("rendert 10 Ziffern-Tasten + Loeschen + Abbrechen", () => {
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={vi.fn()} />);
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole("button", { name: String(i) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /loeschen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abbrechen/i })).toBeInTheDocument();
  });

  it("zeigt eingegebene Ziffern, maximal 6", () => {
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={vi.fn()} />);
    for (const d of ["1", "2", "3", "4", "5", "6", "7"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    // 7. Ziffer wird ignoriert
    expect(screen.getByTestId("numpad-display")).toHaveTextContent("123456");
  });

  it("Loeschen entfernt letzte Ziffer", () => {
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: /loeschen/i }));
    expect(screen.getByTestId("numpad-display")).toHaveTextContent("1");
  });

  it("ruft onSubmit mit 6-stelligem Code bei 6. Ziffer", () => {
    const onSubmit = vi.fn();
    render(<PairCodeNumpad onSubmit={onSubmit} onCancel={vi.fn()} />);
    for (const d of ["8", "4", "7", "3", "0", "2"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    expect(onSubmit).toHaveBeenCalledWith("847302");
  });

  it("ruft onCancel bei Abbrechen-Klick", () => {
    const onCancel = vi.fn();
    render(<PairCodeNumpad onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /abbrechen/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Rot laufen lassen**

```bash
npx vitest run __tests__/components/senior/PairCodeNumpad.test.tsx
```

**Step 3: Implementierung**

```tsx
// components/senior/PairCodeNumpad.tsx
// Vollbild-Numpad fuer 6-stelligen Pair-Code. Senior-UX: 80px-Tasten, 4.5:1 Kontrast.
"use client";

import { useState } from "react";

type Props = {
  onSubmit: (code: string) => void;
  onCancel: () => void;
};

const DIGIT_ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["loeschen", "0", "abbrechen"],
];

export function PairCodeNumpad({ onSubmit, onCancel }: Props) {
  const [digits, setDigits] = useState("");

  const addDigit = (d: string) => {
    if (digits.length >= 6) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 6) {
      onSubmit(next);
    }
  };

  const del = () => setDigits((s) => s.slice(0, -1));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-semibold">Code eingeben</h1>
      <p className="text-2xl leading-relaxed">
        Tippen Sie den 6-stelligen Code ein, den Ihnen Ihr Angehoeriger genannt hat.
      </p>
      <div
        data-testid="numpad-display"
        className="font-mono text-5xl tracking-widest"
        aria-label="Eingegebener Code"
      >
        {digits.padEnd(6, "_")}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {DIGIT_ROWS.flat().map((label) => {
          if (label === "loeschen") {
            return (
              <button
                key="loeschen"
                type="button"
                onClick={del}
                aria-label="Loeschen"
                className="h-20 min-w-[80px] rounded-lg bg-gray-200 px-6 text-xl"
              >
                Loeschen
              </button>
            );
          }
          if (label === "abbrechen") {
            return (
              <button
                key="abbrechen"
                type="button"
                onClick={onCancel}
                aria-label="Abbrechen"
                className="h-20 min-w-[80px] rounded-lg bg-gray-200 px-6 text-xl"
              >
                Abbrechen
              </button>
            );
          }
          return (
            <button
              key={label}
              type="button"
              onClick={() => addDigit(label)}
              aria-label={label}
              className="h-20 w-20 rounded-lg bg-anthrazit text-3xl text-white"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 4: Gruen laufen lassen**

```bash
npx vitest run __tests__/components/senior/PairCodeNumpad.test.tsx
```

Expected: 5 Tests PASS.

**Step 5: Commit**

```bash
git add components/senior/PairCodeNumpad.tsx __tests__/components/senior/PairCodeNumpad.test.tsx
git commit -m "feat(senior-app): add PairCodeNumpad component (80px touch targets, 6-digit)

+5 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Integration in Pair-Seite + Tests

**Files:**
- Modify: `nachbar-io/app/(senior)/pair/page.tsx`
- Modify: `nachbar-io/__tests__/app/senior/pair.test.tsx`

**Step 1: Failing Tests schreiben (Ergaenzung)**

```tsx
// Ergaenzung in __tests__/app/senior/pair.test.tsx:
it("Klick auf 'Ich habe einen Code' oeffnet Numpad", async () => {
  mockStartOk();
  alwaysStatus({ status: "pending" });
  const { default: PairPage } = await import("@/app/(senior)/pair/page");
  render(<PairPage />);
  await waitFor(() => {
    expect(screen.getByText(/ich habe einen code/i)).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText(/ich habe einen code/i));
  await waitFor(() => {
    expect(screen.getByTestId("numpad-display")).toBeInTheDocument();
  });
});

it("Numpad-Submit claimt Code und navigiert bei Success", async () => {
  mockStartOk();
  // 1. /start wird gemockt (initial), 2. /claim-by-code beim Submit
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (typeof url === "string" && url.includes("/api/device/pair/status")) {
      return { ok: true, json: async () => ({ status: "pending" }) } as Response;
    }
    if (typeof url === "string" && url.endsWith("/api/device/pair/claim-by-code")) {
      return {
        ok: true,
        json: async () => ({
          refresh_token: "rt-by-code-456",
          user_id: "u-senior-b",
          device_id: "dev-x",
          expires_at: "2026-10-19T00:00:00.000Z",
        }),
      } as Response;
    }
    // initial /start
    return {
      ok: true,
      json: async () => ({ token: "eyJTEST", pair_id: "pid-1" }),
    } as Response;
  });

  const { default: PairPage } = await import("@/app/(senior)/pair/page");
  render(<PairPage />);
  await waitFor(() => {
    expect(screen.getByText(/ich habe einen code/i)).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText(/ich habe einen code/i));
  for (const d of ["1", "2", "3", "4", "5", "6"]) {
    fireEvent.click(await screen.findByRole("button", { name: d }));
  }
  await waitFor(() => {
    expect(window.localStorage.getItem("nachbar.senior.refresh_token")).toBe(
      "rt-by-code-456",
    );
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});

it("Numpad Abbrechen kehrt zum QR zurueck", async () => {
  mockStartOk();
  alwaysStatus({ status: "pending" });
  const { default: PairPage } = await import("@/app/(senior)/pair/page");
  render(<PairPage />);
  await waitFor(() => {
    expect(screen.getByText(/ich habe einen code/i)).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText(/ich habe einen code/i));
  fireEvent.click(await screen.findByRole("button", { name: /abbrechen/i }));
  await waitFor(() => {
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });
});
```

Dazu oben `fireEvent` importieren (falls nicht schon da).

**Step 2: Rot laufen lassen**

```bash
npx vitest run __tests__/app/senior/pair.test.tsx
```

**Step 3: Implementierung — pair-page.tsx Integration**

In `app/(senior)/pair/page.tsx`:

- `PairState` erweitern:
```tsx
type PairState =
  | { kind: "loading" }
  | { kind: "active"; token: string; pair_id: string }
  | { kind: "code-entry" }
  | { kind: "paired" }
  | { kind: "error"; message: string };
```

- Import ergaenzen:
```tsx
import { PairCodeNumpad } from "@/components/senior/PairCodeNumpad";
```

- `'Ich habe einen Code'`-Button: `onClick` statt Alert:
```tsx
<button
  type="button"
  onClick={() => setState({ kind: "code-entry" })}
  className="text-lg text-anthrazit underline"
>
  Ich habe einen Code
</button>
```

- Neuer Branch im Render (vor `active`-Branch):
```tsx
if (state.kind === "code-entry") {
  return (
    <PairCodeNumpad
      onCancel={() => {
        setState({ kind: "loading" });
        void startPairing();
      }}
      onSubmit={async (code) => {
        try {
          const device_id = getOrCreateDeviceId();
          const res = await fetch("/api/device/pair/claim-by-code", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code, device_id }),
          });
          if (!res.ok) {
            setState({
              kind: "error",
              message:
                "Der Code ist nicht gueltig oder abgelaufen. Bitte erneut versuchen.",
            });
            return;
          }
          const data = (await res.json()) as {
            refresh_token: string;
            user_id: string;
            device_id: string;
            expires_at?: string;
          };
          window.localStorage.setItem(REFRESH_TOKEN_LS_KEY, data.refresh_token);
          window.localStorage.setItem(USER_ID_LS_KEY, data.user_id);
          if (data.expires_at) {
            window.localStorage.setItem(REFRESH_EXPIRES_LS_KEY, data.expires_at);
          }
          setState({ kind: "paired" });
          stopAll();
          router.push("/");
        } catch {
          setState({
            kind: "error",
            message: "Es gab einen Fehler. Bitte erneut versuchen.",
          });
        }
      }}
    />
  );
}
```

**Step 4: Gruen laufen lassen + Typecheck**

```bash
npx vitest run __tests__/app/senior/pair.test.tsx
npx tsc --noEmit
npm run lint
```

Expected: Alle Tests PASS, TS + Lint clean.

**Step 5: Commit**

```bash
git add app/\(senior\)/pair/page.tsx __tests__/app/senior/pair.test.tsx
git commit -m "feat(senior-app): wire 'Ich habe einen Code' button to PairCodeNumpad + claim-by-code flow

+3 integration tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: End-to-End Vitest-Integration (Code-Flow)

**Files:**
- Create: `nachbar-io/__tests__/integration/device-pairing-code-flow.test.ts`

**Step 1: Test schreiben**

```ts
// __tests__/integration/device-pairing-code-flow.test.ts
// E2E in-process: caregiver start-code -> senior claim-by-code -> refresh_token
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const fromMock = vi.fn();
const redisStore = new Map<string, string>();
const redisCounters = new Map<string, number>();
const adminInsertMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("@/lib/security/redis", () => ({
  getSecurityRedis: () => ({
    get: async (k: string) => redisStore.get(k) ?? null,
    set: async (k: string, v: string) => {
      redisStore.set(k, v);
      return "OK";
    },
    del: async (k: string) => {
      redisStore.delete(k);
      return 1;
    },
    incr: async (k: string) => {
      const n = (redisCounters.get(k) ?? 0) + 1;
      redisCounters.set(k, n);
      return n;
    },
    expire: async () => true,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: () => ({ insert: adminInsertMock }),
  }),
}));

describe("device-pairing code flow E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
    redisCounters.clear();
    adminInsertMock.mockResolvedValue({ error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: "u-care" } } });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({ maybeSingle: async () => ({ data: { id: "link-1" } }) }),
          }),
        }),
      }),
    });
  });

  it("Happy-Path: caregiver erzeugt Code, senior claimt ihn", async () => {
    const { POST: start } = await import(
      "@/app/api/device/pair/start-code/route"
    );
    const { POST: claim } = await import(
      "@/app/api/device/pair/claim-by-code/route"
    );

    const r1 = await start(
      new NextRequest("http://x/api/device/pair/start-code", {
        method: "POST",
        body: JSON.stringify({ senior_user_id: "u-senior" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(r1.status).toBe(200);
    const { code } = (await r1.json()) as { code: string };
    expect(code).toMatch(/^\d{6}$/);

    const r2 = await claim(
      new NextRequest("http://x/api/device/pair/claim-by-code", {
        method: "POST",
        body: JSON.stringify({ code, device_id: "d-senior-1" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "9.9.9.9",
        },
      }),
    );
    expect(r2.status).toBe(200);
    const payload = (await r2.json()) as { refresh_token: string; user_id: string };
    expect(payload.user_id).toBe("u-senior");
    expect(payload.refresh_token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("Replay: zweiter Claim desselben Codes ist 401", async () => {
    const { POST: start } = await import(
      "@/app/api/device/pair/start-code/route"
    );
    const { POST: claim } = await import(
      "@/app/api/device/pair/claim-by-code/route"
    );
    const r1 = await start(
      new NextRequest("http://x/start", {
        method: "POST",
        body: JSON.stringify({ senior_user_id: "u-senior" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const { code } = (await r1.json()) as { code: string };

    const c1 = await claim(
      new NextRequest("http://x/claim", {
        method: "POST",
        body: JSON.stringify({ code, device_id: "d-1" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "1.1.1.1",
        },
      }),
    );
    expect(c1.status).toBe(200);

    const c2 = await claim(
      new NextRequest("http://x/claim", {
        method: "POST",
        body: JSON.stringify({ code, device_id: "d-2" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "2.2.2.2",
        },
      }),
    );
    expect(c2.status).toBe(401);
  });
});
```

**Step 2: Rot laufen lassen**

```bash
npx vitest run __tests__/integration/device-pairing-code-flow.test.ts
```

Expected: PASS (alle Routen existieren schon aus Tasks 4+5).

**Step 3: Commit**

```bash
git add __tests__/integration/device-pairing-code-flow.test.ts
git commit -m "test(device-pairing): E2E in-process code-pairing flow (happy + replay)

+2 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Full Sweep (Typecheck, Lint, alle Tests der Folgearbeit)

**Step 1: Full Test Sweep ueber neue Files**

```bash
cd nachbar-io
npx vitest run \
  lib/device-pairing/__tests__/pair-code.test.ts \
  __tests__/api/device/pair-start-code.test.ts \
  __tests__/api/device/pair-claim-by-code.test.ts \
  __tests__/components/senior/PairCodeNumpad.test.tsx \
  __tests__/app/senior/pair.test.tsx \
  __tests__/integration/device-pairing-code-flow.test.ts
```

Expected: alle gruen, **~29 Tests gesamt** (2 TTS + 5 pair-code + 5 start-code + 7 claim-by-code + 5 Numpad + 3 neue pair-page + 2 Integration).

**Step 2: TSC + Lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: clean (keine neuen Errors; 8 preexistente E2E-TS-Errors dulden).

**Step 3: Regressionstest Welle B**

```bash
npx vitest run \
  lib/device-pairing/__tests__/token.test.ts \
  lib/device-pairing/__tests__/refresh-token.test.ts \
  lib/device-pairing/__tests__/use-refresh-rotation.test.ts \
  __tests__/api/device/pair-start.test.ts \
  __tests__/api/device/pair-claim.test.ts \
  __tests__/api/device/pair-status.test.ts \
  __tests__/api/device/pair-refresh.test.ts \
  __tests__/integration/device-pairing-flow.test.ts
```

Expected: alle 48 Welle-B-Tests bleiben gruen.

**Step 4: Handoff-Doc schreiben**

`docs/plans/2026-04-19-handoff-welle-b-folgearbeit-done.md` mit:
- Commit-Liste (alle aus Task 1-9)
- Test-Zahlen vorher/nachher
- Rote Zone: Push auf master (Welle B + Folgearbeit)
- Kein Migrations-Bedarf
- Bekannte offene Punkte: Caregiver-UI "Code erzeugen" (separate Session)

**Step 5: Commit Handoff**

```bash
git add docs/plans/2026-04-19-handoff-welle-b-folgearbeit-done.md
git commit -m "docs(plans): handoff welle-b folgearbeit done (TTS + code-pairing)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Rote-Zone-Items (nur mit Founder-Go)

- `git push origin master` (Welle B + Folgearbeit zusammen)
- OpenAI-Call in Task 1 (Gelbe Zone, ~0.5 Cent)

## Stolpersteine

- **Redis-Mocking**: Tests nutzen `vi.mock("@/lib/security/redis", ...)` — IP-Tracking sorgfaeltig mocken.
- **`refresh-token.ts`-Wiederverwendung**: die Hash-/Generate-Funktionen stammen aus Welle B, nicht neu schreiben.
- **`admin`-Client**: nur in Claim-Routes, nie in Start-Code-Route.
- **Pairing-Method `'code'`**: muss als Enum-Wert in der existierenden Tabelle akzeptiert werden (Mig 172 definiert Check-Constraint — kontrollieren, evtl. Doc-Hinweis, dass `'code'` erlaubt ist).

## Verification nach jedem Teil

Vor "done" pro Teil pruefen:

- Tests der betroffenen Files gruen
- `npx tsc --noEmit` clean
- `npm run lint` clean
- `git status` clean (alle Files committed)
