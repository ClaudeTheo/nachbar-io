import type { NextConfig } from "next";

// Supabase-Projekt-Domain fuer CSP connect-src
const supabaseDomain = "uylszchlyhbpbmslcnka.supabase.co";

// Content-Security-Policy: Schutz vor XSS, Clickjacking, Daten-Exfiltration
// 'unsafe-inline' noetig fuer Next.js Inline-Scripts und Tailwind-Styles
// 'unsafe-eval' nur im Development (Webpack HMR)
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com https://*.supabase.co",
  "font-src 'self'",
  `connect-src 'self' https://${supabaseDomain} wss://${supabaseDomain} https://api.anthropic.com https://api.open-meteo.com https://api.twilio.com`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  // Jitsi Meet (Community/Tests) + sprechstunde.online (aerztliche Videosprechstunde)
  `frame-src 'self' https://meet.jit.si https://app.sprechstunde.online ${process.env.JITSI_BASE_URL ? process.env.JITSI_BASE_URL : ''}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const nextConfig: NextConfig = {
  // Turbopack: Barrel-Exports fuer grosse Icon-Libraries optimieren
  // Verhindert "module factory is not available" Fehler mit lucide-react
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // App-Version aus package.json im Client verfuegbar machen
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || require("./package.json").version,
  },

  // Next.js-Header nicht exponieren
  poweredByHeader: false,

  // Security + Performance Headers
  async headers() {
    return [
      // Static Assets: Langzeit-Cache (Content-Hash im Dateinamen = sicher)
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Icons + Fonts: 30 Tage Cache
      {
        source: "/icons/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      // Security Headers fuer alle Routen
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            // Kamera + Mikrofon fuer Videosprechstunde erlauben (self + Jitsi iframe)
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
