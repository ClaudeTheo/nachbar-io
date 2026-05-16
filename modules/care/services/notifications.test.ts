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

import { getCareNotificationRecipients, sendCareNotification } from './notifications';
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

function createRecipientSupabase() {
  const tableData: Record<string, unknown[]> = {
    care_helpers: [
      { user_id: 'legacy-relative', role: 'relative' },
      { user_id: 'duplicate-relative', role: 'relative' },
    ],
    caregiver_links: [
      { caregiver_id: 'link-relative', relationship_type: 'child' },
      { caregiver_id: 'duplicate-relative', relationship_type: 'friend' },
      { caregiver_id: 'volunteer-link', relationship_type: 'volunteer' },
    ],
  };

  return {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.contains = vi.fn().mockResolvedValue({
        data: tableData[table] ?? [],
        error: null,
      });
      chain.is = vi.fn().mockResolvedValue({
        data: tableData[table] ?? [],
        error: null,
      });
      return chain;
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
        message: expect.stringContaining('QuartierApp'),
      });
      expect(result.sms).toBe(true);
    });

    it('sendet an Twilio keine Care-Titel oder Freitexte', async () => {
      const supabase = createMockSupabase();
      await sendCareNotification(supabase, {
        ...basePayload,
        title: 'Frau Mueller braucht Hilfe',
        body: 'Schwindel seit 30 Minuten, bitte Wohnung 2 anrufen',
        channels: ['sms'],
        phone: '+4915112345678',
      });

      const message = vi.mocked(sendSms).mock.calls[0]?.[0]?.message ?? '';
      expect(message).toContain('QuartierApp');
      expect(message).not.toContain('Frau Mueller');
      expect(message).not.toContain('Schwindel');
      expect(message).not.toContain('Wohnung 2');
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
        ttsMessage: expect.stringContaining('QuartierApp'),
      });
      expect(result.voice).toBe(true);
    });

    it('gibt an Twilio Voice keine Care-Titel oder Freitexte', async () => {
      const supabase = createMockSupabase();
      await sendCareNotification(supabase, {
        ...basePayload,
        title: 'Frau Mueller braucht Hilfe',
        body: 'Schwindel seit 30 Minuten, bitte Wohnung 2 anrufen',
        channels: ['voice'],
        phone: '+4915112345678',
      });

      const ttsMessage =
        vi.mocked(initiateCall).mock.calls[0]?.[0]?.ttsMessage ?? '';
      expect(ttsMessage).toContain('QuartierApp');
      expect(ttsMessage).not.toContain('Frau Mueller');
      expect(ttsMessage).not.toContain('Schwindel');
      expect(ttsMessage).not.toContain('Wohnung 2');
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

      await sendCareNotification(supabase, {
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

describe('getCareNotificationRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('kombiniert Legacy-Helfer und aktive CareCircle-Links dedupliziert nach Rolle', async () => {
    const supabase = createRecipientSupabase();

    const recipients = await getCareNotificationRecipients(supabase, {
      seniorId: 'senior-1',
      roles: ['relative'],
    });

    expect(recipients.map((recipient) => recipient.userId)).toEqual([
      'legacy-relative',
      'duplicate-relative',
      'link-relative',
    ]);
    expect(recipients).not.toContainEqual(
      expect.objectContaining({ userId: 'volunteer-link' }),
    );
  });
});
