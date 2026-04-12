// lib/offline-queue.test.ts
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OfflineQueue } from "./offline-queue";

let queue: OfflineQueue;
beforeEach(() => {
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
    await queue.enqueue("/api/care/checkin", '{"a":2}');
    await queue.flush();

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
    await queue.enqueue("/api/care/checkin", '{"seq":2}');
    await queue.flush();

    expect(bodies).toEqual(['{"seq":1}', '{"seq":2}']);
    expect(await queue.count()).toBe(0);
  });
});

describe("OfflineQueue — TTL", () => {
  it("flush discards entries older than 72h", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await queue.enqueue("/api/heartbeat", '{"old":true}');

    // Hack createdAt to 73h ago via raw IndexedDB access
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("nachbar_offline", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    const all = await new Promise<any[]>((res) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result);
    });
    all[0].createdAt = Date.now() - 73 * 60 * 60 * 1000;
    store.put(all[0]);
    await new Promise<void>((res) => {
      tx.oncomplete = () => res();
    });
    db.close();

    await queue.flush();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(await queue.count()).toBe(0);
  });
});

describe("OfflineQueue — dedup", () => {
  it("skips heartbeat enqueue if same URL entry exists within 60s", async () => {
    await queue.enqueue("/api/heartbeat", '{"a":1}');
    await queue.enqueue("/api/heartbeat", '{"a":2}');
    expect(await queue.count()).toBe(1);
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
      await queue.enqueue(`/api/test/${i}`, `{"i":${i}}`);
    }
    expect(await queue.count()).toBe(50);

    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    await queue.flush();
    const bodies = mockFetch.mock.calls.map((c: any) => c[1].body);
    expect(bodies).not.toContain('{"i":0}');
    expect(bodies).toContain('{"i":50}');
  });
});
