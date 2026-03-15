// lib/consultation/provider.ts
// Nachbar.io — Videosprechstunde Provider-Abstraction
// Unterstuetzt: Jitsi Meet (community) + MeetOne (medical/KBV-zertifiziert)

export interface ConsultationRoom {
  roomId: string;
  joinUrl: string;
  hostUrl: string;
}

export interface ConsultationProvider {
  name: string;
  type: 'community' | 'medical';
  createRoom(slotId: string): Promise<ConsultationRoom>;
  endRoom(roomId: string): Promise<void>;
}

// Jitsi Meet — fuer Quartiers-Beratung (kostenlos, Self-Hosted moeglich)
export class JitsiProvider implements ConsultationProvider {
  name = 'Jitsi Meet';
  type = 'community' as const;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.JITSI_BASE_URL || 'https://meet.jit.si';
  }

  async createRoom(slotId: string): Promise<ConsultationRoom> {
    const roomId = `nachbar-${slotId.slice(0, 8)}`;
    return {
      roomId,
      joinUrl: `${this.baseUrl}/${roomId}`,
      hostUrl: `${this.baseUrl}/${roomId}`,
    };
  }

  async endRoom(): Promise<void> {
    // Jitsi-Rooms schliessen sich automatisch wenn alle Teilnehmer gehen
  }
}

// MeetOne — fuer aerztliche Sprechstunden (KBV-zertifiziert)
// Dokumentation: REST-API + OAuth 2.0
// Login: https://app.meetone.io
export class MeetOneProvider implements ConsultationProvider {
  name = 'MeetOne';
  type = 'medical' as const;

  async createRoom(slotId: string): Promise<ConsultationRoom> {
    // Phase 1: MeetOne-Link manuell im Admin-UI eintragen (join_url Feld)
    // Phase 2: MeetOne REST-API automatisch aufrufen (nach API-Docs von Stefan Botzenhart)
    // POST https://api.meetone.io/v1/sessions (OAuth 2.0 Bearer Token)
    return {
      roomId: `meetone-${slotId.slice(0, 8)}`,
      joinUrl: '', // Wird manuell gesetzt oder via API
      hostUrl: '',
    };
  }

  async endRoom(): Promise<void> {
    // MeetOne beendet Sessions automatisch
  }
}

// Factory-Funktion
export function getProvider(type: 'community' | 'medical'): ConsultationProvider {
  if (type === 'community') return new JitsiProvider();
  return new MeetOneProvider();
}
