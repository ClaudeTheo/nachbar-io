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
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://${supabaseDomain} wss://${supabaseDomain} https://api.anthropic.com https://api.open-meteo.com https://api.twilio.com`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const nextConfig: NextConfig = {
  // Next.js-Header nicht exponieren
  poweredByHeader: false,

  // Security Headers fuer alle Routen
  async headers() {
    return [
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
            value: "camera=(), microphone=(), geolocation=(self)",
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
