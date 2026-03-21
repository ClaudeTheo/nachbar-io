// Payment-Konfiguration mit PILOT_MODE + iOS Review Protection
// Apple Guideline 3.1.1: Consumer-Subscriptions auf iOS nur via IAP
import { isIOS } from '@/lib/native/platform';

type SaleModel = 'consumer' | 'enterprise' | 'p2p_service';
type PaymentMethod = 'apple_iap' | 'stripe' | 'web_contract' | 'disabled';

interface ProductPaymentConfig {
  saleModel: SaleModel;
  ios: PaymentMethod;
  web: PaymentMethod;
}

const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === 'true';

const PAYMENT_CONFIG: Record<string, ProductPaymentConfig> = {
  // Nachbar Plus (Consumer-Abo)
  PLUS_CONSUMER: {
    saleModel: 'consumer',
    ios: PILOT_MODE ? 'disabled' : 'apple_iap',
    web: PILOT_MODE ? 'disabled' : 'stripe',
  },
  // Pro Community (B2B-Vertrag)
  PRO_B2B: {
    saleModel: 'enterprise',
    ios: 'disabled', // Immer Web-only (B2B = kein IAP noetig)
    web: PILOT_MODE ? 'disabled' : 'stripe',
  },
  // Pro Medical (B2B-Vertrag)
  MEDICAL: {
    saleModel: 'enterprise',
    ios: 'disabled',
    web: PILOT_MODE ? 'disabled' : 'stripe',
  },
  // Video-Credit (1:1 Service)
  VIDEO_1TO1: {
    saleModel: 'p2p_service',
    ios: PILOT_MODE ? 'disabled' : 'stripe',
    web: PILOT_MODE ? 'disabled' : 'stripe',
  },
};

/**
 * Gibt die aktive Zahlungsmethode fuer ein Produkt zurueck.
 * Beruecksichtigt Plattform (iOS/Web) und PILOT_MODE.
 */
export function getPaymentMethod(product: string): PaymentMethod {
  const config = PAYMENT_CONFIG[product];
  if (!config) return 'disabled';

  const platform = isIOS() ? 'ios' : 'web';
  const method = config[platform];

  // Review-Schutzregel: iOS-Consumer ohne IAP = ausgeblendet
  if (platform === 'ios' && config.saleModel === 'consumer' && method !== 'apple_iap' && method !== 'disabled') {
    return 'disabled';
  }

  return method;
}

/**
 * Prueft ob Zahlungen fuer ein Produkt aktiviert sind.
 */
export function isPaymentEnabled(product: string): boolean {
  return getPaymentMethod(product) !== 'disabled';
}
