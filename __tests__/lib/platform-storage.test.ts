import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('Platform Storage (Web-Modus)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should use localStorage.getItem on web', async () => {
    const { getStorage } = await import('@/lib/platform-storage');
    localStorage.setItem('test-key', 'test-value');
    const result = await getStorage('test-key');
    expect(result).toBe('test-value');
  });

  it('should use localStorage.setItem on web', async () => {
    const { setStorage } = await import('@/lib/platform-storage');
    await setStorage('test-key', 'hello');
    expect(localStorage.getItem('test-key')).toBe('hello');
  });

  it('should use localStorage.removeItem on web', async () => {
    const { removeStorage } = await import('@/lib/platform-storage');
    localStorage.setItem('remove-me', 'value');
    await removeStorage('remove-me');
    expect(localStorage.getItem('remove-me')).toBeNull();
  });

  it('should return null for missing keys', async () => {
    const { getStorage } = await import('@/lib/platform-storage');
    const result = await getStorage('nonexistent');
    expect(result).toBeNull();
  });
});
