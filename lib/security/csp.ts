const supabaseDomain = "uylszchlyhbpbmslcnka.supabase.co";

export type ContentSecurityPolicyOptions = {
  isDevelopment?: boolean;
  nonce?: string;
  supabaseUrl?: string;
};

export type ContentSecurityPolicyContext = {
  nonce: string;
  policy: string;
  requestHeaders: Headers;
};

function isLocalSupabaseUrl(supabaseUrl: string) {
  return (
    supabaseUrl.startsWith("http://127.0.0.1:54321") ||
    supabaseUrl.startsWith("http://localhost:54321")
  );
}

function createNonce() {
  const randomValue = crypto.randomUUID();
  if (typeof btoa === "function") {
    return btoa(randomValue);
  }

  return Buffer.from(randomValue).toString("base64");
}

export function buildContentSecurityPolicy({
  isDevelopment = process.env.NODE_ENV === "development",
  nonce,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
}: ContentSecurityPolicyOptions = {}) {
  const localSupabaseConnectSources =
    isDevelopment || isLocalSupabaseUrl(supabaseUrl)
      ? " http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:54321"
      : "";
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`
    : `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`;
  const styleSrc = "style-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://api.maptiler.com https://cdnjs.cloudflare.com https://*.supabase.co",
    "font-src 'self'",
    `connect-src 'self' https://${supabaseDomain} wss://${supabaseDomain}${localSupabaseConnectSources} https://api.anthropic.com https://api.open-meteo.com https://api.twilio.com https://*.ingest.de.sentry.io https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://api.maptiler.com`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    `frame-src 'self' https://meet.jit.si https://app.sprechstunde.online ${process.env.JITSI_BASE_URL ? process.env.JITSI_BASE_URL : ""}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function createContentSecurityPolicyContext(
  incomingHeaders: Headers,
): ContentSecurityPolicyContext {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({ nonce });
  const requestHeaders = new Headers(incomingHeaders);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  return {
    nonce,
    policy,
    requestHeaders,
  };
}

export function applyContentSecurityPolicy<T extends Response>(
  response: T,
  policy: string,
) {
  response.headers.set("Content-Security-Policy", policy);
  return response;
}
