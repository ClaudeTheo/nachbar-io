import { describe, expect, it, vi } from "vitest";

import { listUnverifiedNeighbors } from "@/lib/services/vouching.service";

function fluentResult(data: unknown) {
  const result = { data, error: null };
  const chain: Record<string, unknown> & PromiseLike<typeof result> = {
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "eq", "limit", "in"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("listUnverifiedNeighbors circle privacy", () => {
  it("beendet eine RLS-leere Mitgliedersuche ohne Folgeabfrage", async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(
        fluentResult({ households: { quarter_id: "quarter-1" } }),
      )
      .mockReturnValueOnce(fluentResult([]))
      .mockImplementation(() => fluentResult([]));

    const result = await listUnverifiedNeighbors(
      { from } as never,
      "user-own",
    );

    expect(result).toEqual([]);
    expect(from).toHaveBeenCalledTimes(2);
    expect(from).not.toHaveBeenCalledWith("neighbor_vouches");
  });
});
