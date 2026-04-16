// lib/security/client-key.ts
// IP-Hash (DSGVO), Session-Hash, Key-Generierung
// IP wird mit taeglichem Salt gehasht → nicht rueckverfolgbar
// Nutzt Web Crypto API (Edge-Runtime-kompatibel)

// Taeglicher Salt: Rotiert um Mitternacht UTC
function getDailySalt(): string {
  return new Date().toISOString().slice(0, 10); // "2026-04-06"
}

// Web Crypto SHA-256 Hash (Edge-kompatibel)
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashIp(ip: string): Promise<string> {
  const hex = await sha256Hex(ip + getDailySalt());
  return hex.slice(0, 16); // 16 Zeichen reichen fuer Eindeutigkeit
}

function normalizeSessionToken(sessionToken: string): string {
  if (!sessionToken.startsWith("base64-")) {
    return sessionToken;
  }

  try {
    const decoded = atob(sessionToken.slice("base64-".length));
    const parsed = JSON.parse(decoded) as {
      access_token?: string;
      refresh_token?: string;
    };

    return parsed.refresh_token || parsed.access_token || sessionToken;
  } catch {
    return sessionToken;
  }
}

export async function hashSession(sessionToken: string): Promise<string> {
  // Supabase-SSR-Cookies beginnen mit einem weitgehend konstanten base64-JSON-
  // Praefix. Fuer session_drift brauchen wir einen wirklich sitzungsindividuellen
  // Fingerprint, deshalb normalisieren wir erst auf den eingebetteten Refresh-
  // oder Access-Token und hashen dann diesen Wert.
  const normalizedToken = normalizeSessionToken(sessionToken);
  const hex = await sha256Hex(normalizedToken);
  return hex.slice(0, 16);
}

export async function hashUserAgent(ua: string): Promise<string> {
  const hex = await sha256Hex(ua);
  return hex.slice(0, 16);
}

export interface ClientKeys {
  ipHash: string;
  userId: string | null;
  sessionHash: string | null;
  deviceHash: string | null;
  headerBitmap: number;
}

// Header-Presence-Bitmap: Echte Browser senden bestimmte Header,
// Bots/Scripts lassen sie oft weg. Nur Score-Faktor, kein Block-Mechanismus.
// Safari/Firefox/iOS/WebViews haben unterschiedliche Bitmaps — das ist normal.
export function buildHeaderPresenceBitmap(headers: {
  get(name: string): string | null;
}): number {
  let bitmap = 0;
  if (headers.get("accept")) bitmap |= 0x01;
  if (headers.get("accept-language")) bitmap |= 0x02;
  if (headers.get("accept-encoding")) bitmap |= 0x04;
  if (headers.get("sec-ch-ua")) bitmap |= 0x08;
  if (headers.get("sec-fetch-site")) bitmap |= 0x10;
  if (headers.get("sec-fetch-mode")) bitmap |= 0x20;
  if (headers.get("upgrade-insecure-requests")) bitmap |= 0x40;
  if (headers.get("referer")) bitmap |= 0x80;
  return bitmap;
}

function buildStableDeviceFingerprintInput(headers: {
  get(name: string): string | null;
}): string {
  return [
    // User-Agent trennt echte Browserfamilien sauber voneinander.
    headers.get("user-agent") || "",
    headers.get("accept-language") || "",
    headers.get("accept-encoding") || "",
    headers.get("sec-ch-ua") || "",
    headers.get("sec-ch-ua-platform") || "",
    headers.get("sec-ch-ua-mobile") || "",
  ].join("|");
}

// Combined Device Hash: nur relativ stabile Client-Signale + Daily Salt.
// Volatile Request-Shape-Header wie referer, sec-fetch-* oder
// upgrade-insecure-requests duerfen hier NICHT einfliessen, weil sie
// zwischen HTML-Navigation, RSC-Fetches und API-Calls derselben Sitzung
// legitimerweise wechseln und sonst False Positives bei session_drift
// und fp_instability ausloesen.
export async function buildDeviceHash(headers: {
  get(name: string): string | null;
}): Promise<string> {
  const hex = await sha256Hex(
    buildStableDeviceFingerprintInput(headers) + getDailySalt(),
  );
  return hex.slice(0, 16);
}

export async function buildClientKeys(request: {
  headers: { get(name: string): string | null };
  ip?: string | null;
  cookies?: {
    get(name: string): { value: string } | undefined;
    getAll?(): { name: string; value: string }[];
  };
}): Promise<ClientKeys> {
  // IP extrahieren (gleiche Logik wie rate-limit.ts)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip =
    forwarded?.split(",")[0].trim() || realIp || request.ip || "unknown";

  // Session-Token extrahieren — primaer aus Authorization-Header,
  // sekundaer aus Supabase SSR Cookies (Format: sb-<project-ref>-auth-token)
  let sessionToken: string | null = null;

  // 1. Authorization-Header (zuverlaessigster Weg)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    sessionToken = authHeader.slice(7);
  }

  // 2. Fallback: Supabase SSR Cookie (Name haengt vom Projekt-Ref ab)
  if (!sessionToken && request.cookies?.getAll) {
    const allCookies = request.cookies.getAll();
    const sbCookie = allCookies.find(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
    );
    if (sbCookie) {
      sessionToken = sbCookie.value;
    }
  }

  return {
    ipHash: await hashIp(ip),
    userId: null, // Wird spaeter aus Auth-Context befuellt (nicht in Middleware verfuegbar)
    sessionHash: sessionToken ? await hashSession(sessionToken) : null,
    deviceHash: await buildDeviceHash(request.headers),
    headerBitmap: buildHeaderPresenceBitmap(request.headers),
  };
}
