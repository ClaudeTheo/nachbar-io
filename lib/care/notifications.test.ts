// lib/care/notifications.test.ts
// Nachbar.io — Tests fuer Multi-Channel Benachrichtigungen mit Fallback-Kaskade

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks MUESSEN vor dem Import definiert werden
vi.mock('./channels/push', () => ({
  sendPush: vi.fn().mockResolvedValue(true),
}));

vi.mock('./channels/sms', () => ({
  sendSms: vi.fn().mockResolvedValue(true),
}));

vi.mock('./channels/voice', () => ({
  initiateCall: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/notifications-server', () => ({
  safeInsertNotification: vi.fn().mockResolvedValue({ success: true }),
}));

import { sendCareNotification } from './notifications';
import { sendPush } from './channels/push';
import { sendSms } from './channels/sms';
import { initiateCall } from './channels/voice';
import { safeInsertNotification } from '@/lib/notifications-server';

// Einfacher Supabase-Mock fuer Admin-Queries
function createMockSupabase(admins: Array<{ id: string }> = [{ id: 'admin-1' }]) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: admins, error: null }),
      }),
    }),
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('sendCareNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const basePayload = {
    userId: 'user-1',
    type: 'care_sos' as const,
    title: 'SOS-Alert',
    body: 'Hilfe benoetigt',
  };

  describe('In-App-Kanal', () => {
    it('schreibt In-App-Notification wenn in_app in channels', async () => {
      const supabase = createMockSupabase();
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['in_app'],
      });

      expect(safeInsertNotification).toHaveBeenCalledWith(supabase, expect.objectContaining({
        user_id: 'user-1',
        type: 'care_sos',
        title: 'SOS-Alert',
        body: 'Hilfe benoetigt',
        read: false,
      }));
      expect(result.in_app).toBe(true);
    });
  });

  describe('Push-Kanal', () => {
    it('sendet Push wenn push in channels', async () => {
      const supabase = createMockSupabase();
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['push'],
      });

      expect(sendPush).toHaveBeenCalledWith(supabase, expect.objectContaining({
        userId: 'user-1',
        title: 'SOS-Alert',
      }));
      expect(result.push).toBe(true);
      expect(result.anyDelivered).toBe(true);
    });
  });

  describe('SMS-Kanal', () => {
    it('sendet SMS wenn sms in channels und phone vorhanden', async () => {
      const supabase = createMockSupabase();
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['sms'],
        phone: '+4915112345678',
      });

      expect(sendSms).toHaveBeenCalledWith({
        phone: '+4915112345678',
        message: 'SOS-Alert: Hilfe benoetigt',
      });
      expect(result.sms).toBe(true);
    });

    it('sendet keine SMS wenn phone fehlt', async () => {
      const supabase = createMockSupabase();
      await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['sms'],
        // Kein phone
      });

      expect(sendSms).not.toHaveBeenCalled();
    });
  });

  describe('Voice-Kanal', () => {
    it('startet Anruf wenn voice in channels und phone vorhanden', async () => {
      const supabase = createMockSupabase();
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['voice'],
        phone: '+4915112345678',
      });

      expect(initiateCall).toHaveBeenCalledWith({
        phone: '+4915112345678',
        ttsMessage: 'SOS-Alert. Hilfe benoetigt',
      });
      expect(result.voice).toBe(true);
    });
  });

  describe('Admin-Alert-Kanal', () => {
    it('sendet In-App-Notification an alle Admins', async () => {
      const supabase = createMockSupabase([{ id: 'admin-1' }, { id: 'admin-2' }]);
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['admin_alert'],
      });

      // 2 Admins = 2 Notifications
      expect(safeInsertNotification).toHaveBeenCalledTimes(2);
      expect(result.admin_alert).toBe(true);
      expect(result.anyDelivered).toBe(true);
    });
  });

  describe('Fallback-Kaskade', () => {
    it('faellt auf SMS zurueck wenn Push fehlschlaegt und enableFallback=true', async () => {
      vi.mocked(sendPush).mockResolvedValueOnce(false); // Push schlaegt fehl
      const supabase = createMockSupabase();

      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['push'], // Nur Push angefordert
        phone: '+4915112345678',
        enableFallback: true,
      });

      expect(sendPush).toHaveBeenCalled();
      expect(sendSms).toHaveBeenCalled(); // Fallback auf SMS
      expect(result.push).toBe(false);
      expect(result.sms).toBe(true);
      expect(result.anyDelivered).toBe(true);
    });

    it('faellt auf Voice zurueck wenn Push UND SMS fehlschlagen', async () => {
      vi.mocked(sendPush).mockResolvedValueOnce(false);
      vi.mocked(sendSms).mockResolvedValueOnce(false);
      const supabase = createMockSupabase();

      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['push'],
        phone: '+4915112345678',
        enableFallback: true,
      });

      expect(sendPush).toHaveBeenCalled();
      expect(sendSms).toHaveBeenCalled();
      expect(initiateCall).toHaveBeenCalled(); // Fallback auf Voice
      expect(result.push).toBe(false);
      expect(result.sms).toBe(false);
      expect(result.voice).toBe(true);
      expect(result.anyDelivered).toBe(true);
    });

    it('nutzt keine Fallback-Kaskade wenn enableFallback=false', async () => {
      vi.mocked(sendPush).mockResolvedValueOnce(false);
      const supabase = createMockSupabase();

      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['push'],
        phone: '+4915112345678',
        enableFallback: false,
      });

      expect(sendPush).toHaveBeenCalled();
      expect(sendSms).not.toHaveBeenCalled();
      expect(initiateCall).not.toHaveBeenCalled();
      expect(result.anyDelivered).toBe(false);
    });

    it('nutzt keine Fallback-Kaskade ohne Telefonnummer', async () => {
      vi.mocked(sendPush).mockResolvedValueOnce(false);
      const supabase = createMockSupabase();

      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['push'],
        // Kein phone
        enableFallback: true,
      });

      expect(sendSms).not.toHaveBeenCalled();
      expect(initiateCall).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Channel', () => {
    it('sendet ueber mehrere Kanaele gleichzeitig', async () => {
      const supabase = createMockSupabase();
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['in_app', 'push', 'sms'],
        phone: '+4915112345678',
      });

      expect(safeInsertNotification).toHaveBeenCalled();
      expect(sendPush).toHaveBeenCalled();
      expect(sendSms).toHaveBeenCalled();
      expect(result.in_app).toBe(true);
      expect(result.push).toBe(true);
      expect(result.sms).toBe(true);
      expect(result.anyDelivered).toBe(true);
    });
  });

  describe('anyDelivered Logik', () => {
    it('ist false wenn nur in_app erfolgreich ist (kein Echtzeit-Kanal)', async () => {
      const supabase = createMockSupabase();
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['in_app'],
      });

      // in_app zaehlt nicht als Echtzeit-Kanal
      expect(result.in_app).toBe(true);
      expect(result.anyDelivered).toBe(false);
    });

    it('ist true wenn mindestens ein Echtzeit-Kanal erfolgreich ist', async () => {
      const supabase = createMockSupabase();
      const result = await sendCareNotification(supabase, {
        ...basePayload,
        channels: ['push'],
      });

      expect(result.anyDelivered).toBe(true);
    });
  });
});
