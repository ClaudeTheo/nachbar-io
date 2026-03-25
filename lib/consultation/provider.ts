// lib/consultation/provider.ts
// Nachbar.io — Videosprechstunde Provider-Abstraction
// Unterstuetzt: Jitsi Meet (community, nur fuer Tests) + sprechstunde.online (medical/KBV-zertifiziert)

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

// Jitsi Meet — fuer Quartiers-Beratung (nur fuer Tests, Self-Hosted moeglich)
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

// sprechstunde.online — fuer aerztliche Sprechstunden (KBV-zertifiziert)
// API-Aufrufe erfolgen im nachbar-arzt Portal, hier nur Provider-Abstraction
export class SprechstundeOnlineProvider implements ConsultationProvider {
  name = 'sprechstunde.online';
  type = 'medical' as const;

  async createRoom(slotId: string): Promise<ConsultationRoom> {
    // join_url wird vom Arzt-Portal (nachbar-arzt) via sprechstunde.online API gesetzt
    return {
      roomId: `sprechstunde-${slotId.slice(0, 8)}`,
      joinUrl: '', // Wird vom Arzt-Portal gesetzt
      hostUrl: '',
    };
  }

  async endRoom(): Promise<void> {
    // sprechstunde.online beendet Sessions automatisch
  }
}

// Factory-Funktion
export function getProvider(type: 'community' | 'medical'): ConsultationProvider {
  if (type === 'community') return new JitsiProvider();
  return new SprechstundeOnlineProvider();
}
