// Nachbar.io — Capacitor Initialisierung
// Wird beim App-Start aufgerufen fuer native Platform-Features

import { Capacitor } from '@capacitor/core';

/**
 * Initialisiert native Capacitor-Features wenn auf nativer Platform
 * Wird in der Root-Layout Komponente aufgerufen
 */
export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Status-Bar konfigurieren
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#2D3142' });

    // App-Lifecycle: Beim Resume die Seite aktualisieren
    const { App } = await import('@capacitor/app');
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App kommt in den Vordergrund — Service Worker pruefen
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(reg => {
            reg?.update();
          });
        }
      }
    });

    // Back-Button auf Android: Navigation zurueck oder App minimieren
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });

    console.log('[capacitor] Native Features initialisiert');
  } catch (err) {
    console.warn('[capacitor] Initialisierung fehlgeschlagen:', err);
  }
}
