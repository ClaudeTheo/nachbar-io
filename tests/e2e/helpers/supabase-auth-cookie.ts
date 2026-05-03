// Helper fuer Supabase-SSR-Cookies in Playwright Auth-Setups.
// @supabase/ssr nutzt base64url-kodierte Cookie-Werte mit max. 3180 Zeichen.

export const SUPABASE_SSR_COOKIE_CHUNK_SIZE = 3180;

export interface SupabaseSessionCookieInput {
  storageKey: string;
  sessionJson: string;
  currentUrl: string;
}

export interface SupabaseSessionCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax";
}

export function getSupabaseStorageKey(supabaseUrl: string): string {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

function encodeSupabaseCookieValue(value: string): string {
  return `base64-${Buffer.from(value, "utf8").toString("base64url")}`;
}

function chunkValue(value: string): string[] {
  if (value.length <= SUPABASE_SSR_COOKIE_CHUNK_SIZE) return [value];

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += SUPABASE_SSR_COOKIE_CHUNK_SIZE) {
    chunks.push(value.slice(i, i + SUPABASE_SSR_COOKIE_CHUNK_SIZE));
  }
  return chunks;
}

export function buildSupabaseSessionCookies({
  storageKey,
  sessionJson,
  currentUrl,
}: SupabaseSessionCookieInput): SupabaseSessionCookie[] {
  const current = new URL(currentUrl);
  const encoded = encodeSupabaseCookieValue(sessionJson);
  const chunks = chunkValue(encoded);
  const cookieBase = {
    domain: current.hostname,
    path: "/",
    httpOnly: false,
    secure: current.protocol === "https:",
    sameSite: "Lax" as const,
  };

  if (chunks.length === 1) {
    return [{ ...cookieBase, name: storageKey, value: chunks[0] }];
  }

  return chunks.map((value, i) => ({
    ...cookieBase,
    name: `${storageKey}.${i}`,
    value,
  }));
}
