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
    await queue.enqueue("/api/heartbeat", '{"a":2}');
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
    await queue.enqueue("/api/heartbeat", '{"seq":2}');
    await queue.flush();

    expect(bodies).toEqual(['{"seq":1}', '{"seq":2}']);
    expect(await queue.count()).toBe(0);
  });
});
