import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Workspace-Klammer enthaelt weitere Lockfiles; nachbar-io ist der App-Root.
  turbopack: {
    root: process.cwd(),
  },

  // Turbopack: Barrel-Exports fuer grosse Icon-Libraries optimieren
  // Verhindert "module factory is not available" Fehler mit lucide-react
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // App-Version aus package.json im Client verfuegbar machen
  env: {
    NEXT_PUBLIC_APP_VERSION:
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      process.env.npm_package_version || require("./package.json").version,
  },

  // Next.js-Header nicht exponieren
  poweredByHeader: false,

  // Security + Performance Headers
  async headers() {
    return [
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
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry Source Maps: hochladen aber nicht im Client exponieren (Sicherheit)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Tunnel-Route: umgeht Ad-Blocker die sentry.io Requests blockieren
  tunnelRoute: "/monitoring",

  // Kein Telemetrie an Sentry waehrend Build
  telemetry: false,

  // Build-Output reduzieren
  silent: true,
});
