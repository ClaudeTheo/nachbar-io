# J-5: Offline Queue — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Queue failed heartbeat/checkin POSTs in IndexedDB and replay them when the device comes back online, preventing false SOS escalations.

**Architecture:** Generic `OfflineQueue` class backed by IndexedDB. Main thread only (no SW). Heartbeat hook and checkin button catch fetch errors, enqueue, and flush on `online` event or next successful mount.

**Tech Stack:** IndexedDB (via idb-keyval-style wrapper), Vitest + fake-indexeddb, React hooks

---

### Task 1: Install fake-indexeddb

**Files:**
- Modify: `package.json`

**Step 1: Install dev dependency**

Run: `npm install -D fake-indexeddb`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add fake-indexeddb for offline queue tests (J-5)"
```

---

### Task 2: OfflineQueue — core enqueue/flush

**Files:**
- Create: `lib/offline-queue.ts`
- Create: `lib/offline-queue.test.ts`

**Step 1: Write the failing tests**

```typescript
// lib/offline-queue.test.ts
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OfflineQueue } from "./offline-queue";

// Fresh DB per test
let queue: OfflineQueue;
beforeEach(() => {
  // Delete the database between tests
  indexedDB.deleteDatabase("nachbar_offline");
  queue = new OfflineQueue();
});

describe("OfflineQueue", () => {
  it("enqueue stores an entry and count returns 1", async () => {
    await queue.enqueue("/api/heartbeat", '{"source":"app"}');
    expect(await queue.count()).toBe(1);
  });

  it("flush sends queued POSTs and empties queue on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await queue.enqueue("/api/heartbeat", '{"source":"app"}');
    await queue.flush();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/heartbeat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"source":"app"}',
      }),
    );
    expect(await queue.count()).toBe(0);
  });

  it("flush stops on first network error (still offline)", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("offline"));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await queue.enqueue("/api/heartbeat", '{"a":1}');
    await queue.enqueue("/api/heartbeat", '{"a":2}');
    await queue.flush();

    // Both entries still in queue — flush stopped at first failure
    expect(await queue.count()).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("flush processes FIFO order", async () => {
    const bodies: string[] = [];
    const mockFetch = vi.fn().mockImplementation((_url, opts) => {
      bodies.push(opts.body);
      return Promise.resolve({ ok: true });
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await queue.enqueue("/api/heartbeat", '{"seq":1}');
    await queue.enqueue("/api/heartbeat", '{"seq":2}');
    await queue.flush();

    expect(bodies).toEqual(['{"seq":1}', '{"seq":2}']);
    expect(await queue.count()).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/offline-queue.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// lib/offline-queue.ts
// Nachbar.io — Offline-Queue: speichert fehlgeschlagene POSTs in IndexedDB
// und sendet sie bei Reconnect nach.

const DB_NAME = "nachbar_offline";
const STORE_NAME = "queue";
const DB_VERSION = 1;

interface QueueEntry {
  id?: number; // auto-increment
  url: string;
  body: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class OfflineQueue {
  async enqueue(url: string, body: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: QueueEntry = { url, body, createdAt: Date.now() };
    store.add(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async flush(): Promise<void> {
    const db = await openDB();
    const entries = await this.getAll(db);

    for (const entry of entries) {
      try {
        const res = await fetch(entry.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: entry.body,
        });
        if (!res.ok) {
          break; // Server-Fehler — spaeter nochmal versuchen
        }
        // Erfolg — Eintrag loeschen
        await this.delete(db, entry.id!);
      } catch {
        break; // Netzwerk-Fehler — immer noch offline
      }
    }
    db.close();
  }

  async count(): Promise<number> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    const result = await new Promise<number>((resolve, reject) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });
    db.close();
    return result;
  }

  private getAll(db: IDBDatabase): Promise<QueueEntry[]> {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private delete(db: IDBDatabase, id: number): Promise<void> {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/** Singleton fuer App-weite Nutzung */
export const offlineQueue = new OfflineQueue();
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/offline-queue.test.ts`
Expected: 4 PASS

**Step 5: Commit**

```bash
git add lib/offline-queue.ts lib/offline-queue.test.ts
git commit -m "feat: add OfflineQueue with IndexedDB enqueue/flush (J-5)"
```

---

### Task 3: OfflineQueue — TTL, dedup, max entries

**Files:**
- Modify: `lib/offline-queue.test.ts`
- Modify: `lib/offline-queue.ts`

**Step 1: Write failing tests**

Append to `lib/offline-queue.test.ts`:

```typescript
describe("OfflineQueue — TTL", () => {
  it("flush discards entries older than 72h", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    // Manually insert an old entry
    await queue.enqueue("/api/heartbeat", '{"old":true}');
    // Hack: overwrite createdAt to 73h ago
    const db = await (queue as any).openDB();
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    const all = await new Promise<any[]>((res) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result);
    });
    all[0].createdAt = Date.now() - 73 * 60 * 60 * 1000;
    store.put(all[0]);
    await new Promise<void>((res) => { tx.oncomplete = () => res(); });
    db.close();

    await queue.flush();

    // Entry discarded, not sent
    expect(mockFetch).not.toHaveBeenCalled();
    expect(await queue.count()).toBe(0);
  });
});

describe("OfflineQueue — dedup", () => {
  it("skips heartbeat enqueue if same URL entry exists within 60s", async () => {
    await queue.enqueue("/api/heartbeat", '{"a":1}');
    await queue.enqueue("/api/heartbeat", '{"a":2}');
    expect(await queue.count()).toBe(1); // second one skipped
  });

  it("allows enqueue for different URLs", async () => {
    await queue.enqueue("/api/heartbeat", '{"a":1}');
    await queue.enqueue("/api/care/checkin", '{"b":1}');
    expect(await queue.count()).toBe(2);
  });
});

describe("OfflineQueue — max entries", () => {
  it("evicts oldest when exceeding 50 entries", async () => {
    for (let i = 0; i < 51; i++) {
      // Use different URLs to avoid dedup
      await queue.enqueue(`/api/test/${i}`, `{"i":${i}}`);
    }
    expect(await queue.count()).toBe(50);

    // Verify oldest (i=0) was evicted, newest (i=50) kept
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    await queue.flush();
    const bodies = mockFetch.mock.calls.map((c: any) => c[1].body);
    expect(bodies).not.toContain('{"i":0}');
    expect(bodies).toContain('{"i":50}');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/offline-queue.test.ts`
Expected: 3 new tests FAIL

**Step 3: Update implementation**

Changes to `lib/offline-queue.ts`:
- Add constants: `const MAX_ENTRIES = 50;` and `const TTL_MS = 72 * 60 * 60 * 1000;` and `const DEDUP_MS = 60_000;`
- Update `enqueue()`: check dedup (same URL entry within DEDUP_MS), then add, then evict if count > MAX_ENTRIES
- Update `flush()`: skip and delete entries where `Date.now() - createdAt > TTL_MS`
- Expose `openDB` as package-private for test access (or make test use raw indexedDB)

Updated `enqueue`:
```typescript
async enqueue(url: string, body: string): Promise<void> {
  const db = await openDB();

  // Dedup: skip if same URL entry exists within DEDUP_MS
  const existing = await this.getAll(db);
  const now = Date.now();
  const hasDuplicate = existing.some(
    (e) => e.url === url && now - e.createdAt < DEDUP_MS,
  );
  if (hasDuplicate) {
    db.close();
    return;
  }

  // Add entry
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.add({ url, body, createdAt: now } as QueueEntry);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Evict oldest if over MAX_ENTRIES
  const allAfter = await this.getAll(db);
  if (allAfter.length > MAX_ENTRIES) {
    const toEvict = allAfter
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, allAfter.length - MAX_ENTRIES);
    for (const entry of toEvict) {
      await this.delete(db, entry.id!);
    }
  }

  db.close();
}
```

Updated `flush` (TTL check):
```typescript
async flush(): Promise<void> {
  const db = await openDB();
  const entries = await this.getAll(db);
  const now = Date.now();

  for (const entry of entries) {
    // TTL: discard entries older than 72h
    if (now - entry.createdAt > TTL_MS) {
      await this.delete(db, entry.id!);
      continue;
    }

    try {
      const res = await fetch(entry.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: entry.body,
      });
      if (!res.ok) break;
      await this.delete(db, entry.id!);
    } catch {
      break;
    }
  }
  db.close();
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/offline-queue.test.ts`
Expected: all 7 tests PASS

**Step 5: Commit**

```bash
git add lib/offline-queue.ts lib/offline-queue.test.ts
git commit -m "feat: add TTL, dedup, and max-entries to OfflineQueue (J-5)"
```

---

### Task 4: Wire useHeartbeat to OfflineQueue

**Files:**
- Modify: `modules/care/hooks/useHeartbeat.ts` (path alias: `lib/care/hooks/useHeartbeat.ts`)
- Modify: `__tests__/hooks/useHeartbeat.test.ts`

**Step 1: Write failing tests**

Add to `__tests__/hooks/useHeartbeat.test.ts`:

```typescript
// Add mock for offline-queue at the top with other mocks
const mockEnqueue = vi.fn();
const mockFlush = vi.fn();
vi.mock("@/lib/offline-queue", () => ({
  offlineQueue: {
    enqueue: (...args: unknown[]) => mockEnqueue(...args),
    flush: (...args: unknown[]) => mockFlush(...args),
  },
}));
```

Add these test cases:

```typescript
it("enqueues heartbeat when fetch fails (offline)", async () => {
  mockFetch.mockRejectedValue(new Error("Failed to fetch"));

  await act(async () => {
    renderHook(() => useHeartbeat());
  });

  expect(mockEnqueue).toHaveBeenCalledWith(
    "/api/heartbeat",
    expect.stringContaining('"source":"app"'),
  );
});

it("flushes offline queue on mount", async () => {
  await act(async () => {
    renderHook(() => useHeartbeat());
  });

  expect(mockFlush).toHaveBeenCalled();
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/hooks/useHeartbeat.test.ts`
Expected: 2 new FAIL

**Step 3: Update useHeartbeat implementation**

```typescript
// Add import at top
import { offlineQueue } from "@/lib/offline-queue";

// In sendHeartbeat, change the catch block:
const bodyStr = JSON.stringify({
  source: "app",
  device_type: getDeviceType(),
});

try {
  await fetch("/api/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyStr,
  });
} catch {
  // Offline — queue for later
  offlineQueue.enqueue("/api/heartbeat", bodyStr).catch(() => {});
}

// Add flush call at end of useEffect (after sendHeartbeat call):
offlineQueue.flush().catch(() => {});
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/hooks/useHeartbeat.test.ts`
Expected: all 6 tests PASS

**Step 5: Commit**

```bash
git add modules/care/hooks/useHeartbeat.ts __tests__/hooks/useHeartbeat.test.ts
git commit -m "feat: wire useHeartbeat to OfflineQueue for offline resilience (J-5)"
```

---

### Task 5: Wire DailyCheckinButton to OfflineQueue

**Files:**
- Modify: `modules/care/components/checkin/DailyCheckinButton.tsx` (path alias: `components/care/DailyCheckinButton.tsx`)
- Modify: `modules/care/components/checkin/DailyCheckinButton.test.tsx`

**Step 1: Write failing test**

Add to `DailyCheckinButton.test.tsx`:

```typescript
// Add mock for offline-queue at top
const mockEnqueue = vi.fn();
vi.mock("@/lib/offline-queue", () => ({
  offlineQueue: {
    enqueue: (...args: unknown[]) => mockEnqueue(...args),
    flush: vi.fn(),
  },
}));
```

Add test case:

```typescript
it("zeigt Offline-Hinweis und enqueued bei Netzwerkfehler", async () => {
  // Status laden — ausstehend
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        checkinEnabled: true,
        completedCount: 0,
        totalCount: 1,
        allCompleted: false,
      }),
  });

  render(<DailyCheckinButton />);

  await waitFor(() => {
    expect(screen.getByTestId("checkin-button")).toBeInTheDocument();
  });

  // Stimmungsauswahl oeffnen
  fireEvent.click(screen.getByTestId("checkin-button"));

  // Check-in POST wird Netzwerkfehler werfen
  mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

  // Mood-Button klicken
  fireEvent.click(screen.getByTestId("mood-good"));

  await waitFor(() => {
    // Offline-Hinweis statt "Verbindungsfehler"
    expect(
      screen.getByText(/wird gesendet sobald Sie wieder online sind/i),
    ).toBeInTheDocument();
  });

  // Enqueue aufgerufen
  expect(mockEnqueue).toHaveBeenCalledWith(
    "/api/care/checkin",
    expect.stringContaining('"status":"ok"'),
  );
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run modules/care/components/checkin/DailyCheckinButton.test.tsx`
Expected: FAIL

**Step 3: Update DailyCheckinButton implementation**

In `submitCheckin`:
```typescript
// Add import at top
import { offlineQueue } from "@/lib/offline-queue";

// Change the catch block in submitCheckin:
const bodyStr = JSON.stringify({
  status: option.status,
  mood: option.mood,
});

try {
  const res = await fetch("/api/care/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyStr,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    setError(data?.error ?? "Check-in fehlgeschlagen");
    setPhase("mood");
    return;
  }

  setCompletedCount((prev) => prev + 1);
  setPhase("done");
  showPointsToast("checkin");
} catch {
  // Offline — queue and show friendly message
  offlineQueue.enqueue("/api/care/checkin", bodyStr).catch(() => {});
  setError("Wird gesendet sobald Sie wieder online sind");
  setPhase("mood");
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run modules/care/components/checkin/DailyCheckinButton.test.tsx`
Expected: all 5 tests PASS

**Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: all pass (minus the known pre-existing heartbeat-escalation failures)

**Step 6: Commit**

```bash
git add modules/care/components/checkin/DailyCheckinButton.tsx modules/care/components/checkin/DailyCheckinButton.test.tsx
git commit -m "feat: wire DailyCheckinButton to OfflineQueue with friendly offline message (J-5)"
```

---

### Task 6: Online-event flush in useHeartbeat

**Files:**
- Modify: `modules/care/hooks/useHeartbeat.ts`
- Modify: `__tests__/hooks/useHeartbeat.test.ts`

**Step 1: Write failing test**

```typescript
it("flushes offline queue when online event fires", async () => {
  mockFlush.mockClear();

  await act(async () => {
    renderHook(() => useHeartbeat());
  });

  // Reset flush count from mount
  const mountFlushCount = mockFlush.mock.calls.length;

  // Simulate online event
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });

  expect(mockFlush.mock.calls.length).toBeGreaterThan(mountFlushCount);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/hooks/useHeartbeat.test.ts`
Expected: FAIL

**Step 3: Update useHeartbeat to add online listener**

Add inside `useEffect`, after `sendHeartbeat()`:

```typescript
const handleOnline = () => {
  offlineQueue.flush().catch(() => {});
};
window.addEventListener("online", handleOnline);

return () => {
  window.removeEventListener("online", handleOnline);
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/hooks/useHeartbeat.test.ts`
Expected: all 7 tests PASS

**Step 5: Commit**

```bash
git add modules/care/hooks/useHeartbeat.ts __tests__/hooks/useHeartbeat.test.ts
git commit -m "feat: flush offline queue on online event in useHeartbeat (J-5)"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (minus known pre-existing resident-status failures)

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

**Step 3: Commit any fixes if needed, then update design doc**

Mark J-5 as complete in design doc header.
