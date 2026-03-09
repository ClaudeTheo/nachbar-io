// Nachbar.io — Capacitor-Konfiguration
// Native App-Wrapper fuer Android (und spaeter iOS)
// Die App laedt die gehostete Web-App von Vercel

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.nachbar.app",
  appName: "Nachbar.io",
  // Web-App wird von Vercel geladen (SSR + API Routes bleiben erhalten)
  server: {
    url: "https://nachbar-io.vercel.app",
    cleartext: false,
  },
  android: {
    // Status-Bar Farbe passend zum Design
    backgroundColor: "#2D3142",
    // WebView-Einstellungen
    allowMixedContent: false,
  },
  plugins: {
    // Push-Notifications (native, zuverlaessiger als Web Push auf Mobilgeraeten)
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
