// Haptic Feedback Helpers — nur auf nativen Plattformen aktiv
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';

export async function hapticLight() {
  if (!isNative()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticMedium() {
  if (!isNative()) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticSuccess() {
  if (!isNative()) return;
  await Haptics.notification({ type: NotificationType.Success });
}

export async function hapticError() {
  if (!isNative()) return;
  await Haptics.notification({ type: NotificationType.Error });
}
