export type SupabaseMockChainMethod =
  | "select"
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "in"
  | "order"
  | "limit"
  | "single"
  | "maybeSingle"
  | "update"
  | "set"
  | "insert"
  | "delete"
  | "is";

export type MockChainable<T = unknown> = Partial<
  Record<SupabaseMockChainMethod, (...args: unknown[]) => unknown>
> &
  PromiseLike<T>;
