export class HttpStatusError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
  ) {
    super(`HTTP ${status} ${statusText} for ${url}`);
    this.name = "HttpStatusError";
  }
}

type ParseAs = "json" | "text";

interface FetchWithRetryOptions extends RequestInit {
  parseAs?: ParseAs;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWithRetry<T>(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<T> {
  const {
    headers,
    parseAs = "json",
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...requestInit
  } = options;

  return fetchWithRetryAttempt<T>(url, {
    headers,
    parseAs,
    retryAttempts,
    retryDelayMs,
    timeoutMs,
    requestInit,
    attempt: 0,
  });
}

async function fetchWithRetryAttempt<T>(
  url: string,
  ctx: {
    attempt: number;
    headers?: HeadersInit;
    parseAs: ParseAs;
    retryAttempts: number;
    retryDelayMs: number;
    timeoutMs: number;
    requestInit: RequestInit;
  },
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.timeoutMs);
  const mergedHeaders = new Headers(ctx.headers);

  if (!mergedHeaders.has("User-Agent")) {
    mergedHeaders.set("User-Agent", "nachbar.io/1.0 (+https://nachbar.io)");
  }

  try {
    const response = await fetch(url, {
      ...ctx.requestInit,
      cache: "no-store",
      headers: mergedHeaders,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpStatusError(response.status, response.statusText, url);
    }

    if (ctx.parseAs === "text") {
      return (await response.text()) as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (ctx.attempt < ctx.retryAttempts && shouldRetry(error)) {
      await sleep(ctx.retryDelayMs * 2 ** ctx.attempt);
      return fetchWithRetryAttempt<T>(url, {
        ...ctx,
        attempt: ctx.attempt + 1,
      });
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof HttpStatusError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }

  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return error instanceof Error;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
