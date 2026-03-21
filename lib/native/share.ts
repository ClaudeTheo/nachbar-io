// Native Share Helper — nutzt Capacitor Share Plugin oder Web Share API
import { Share } from '@capacitor/share';
import { isNative } from './platform';

interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
}

/**
 * Teilt Inhalt via nativer Share-API (iOS/Android) oder Web Share API
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  if (isNative()) {
    try {
      await Share.share(options);
      return true;
    } catch {
      return false; // Nutzer hat abgebrochen
    }
  }

  // Web Fallback: Web Share API (falls verfuegbar)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(options);
      return true;
    } catch {
      return false;
    }
  }

  // Letzter Fallback: URL in Zwischenablage
  if (options.url && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(options.url);
    return true;
  }

  return false;
}
