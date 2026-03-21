// Nachbar.io — Capacitor-Konfiguration
// Native App-Wrapper fuer Android und iOS
// Die App laedt die gehostete Web-App von Vercel

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.quartierapp.app",
  appName: "QuartierApp",
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
  ios: {
    // iOS-spezifische Einstellungen
    backgroundColor: "#FDF8F3",
    contentInset: "automatic",
    scheme: "QuartierApp",
    // Keyboard-Verhalten
    scrollEnabled: true,
  },
  plugins: {
    // Push-Notifications (Web Push via VAPID — kein FCM noetig)
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // Status-Bar Konfiguration
    StatusBar: {
      style: "DARK",
      backgroundColor: "#2D3142",
    },
    // Kamera-Berechtigungen
    Camera: {
      presentationStyle: "popover",
    },
  },
};

export default config;
