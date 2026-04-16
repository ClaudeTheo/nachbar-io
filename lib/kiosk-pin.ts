function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getKioskPinFromSettings(settings: unknown): string | null {
  if (!isPlainObject(settings)) {
    return null;
  }

  const value = settings.kiosk_pin;
  return typeof value === "string" && /^\d{4}$/.test(value) ? value : null;
}

export function withKioskPinInSettings(
  settings: unknown,
  pin: string | null,
): Record<string, unknown> {
  const nextSettings = isPlainObject(settings) ? { ...settings } : {};

  if (pin && /^\d{4}$/.test(pin)) {
    nextSettings.kiosk_pin = pin;
  } else {
    delete nextSettings.kiosk_pin;
  }

  return nextSettings;
}
