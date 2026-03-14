// Nachbar.io — Plattform-agnostischer Storage-Wrapper
// Native: @capacitor/preferences (persistenter Key-Value Store)
// Web: localStorage

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export async function getStorage(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function setStorage(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function removeStorage(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}
