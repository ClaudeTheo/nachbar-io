export type RealtimeVoiceState =
  | "idle"
  | "connecting"
  | "live"
  | "ended"
  | "error";

export interface RealtimeVoiceCallbacks {
  onStateChange?: (state: RealtimeVoiceState) => void;
  onUserSpeakingChange?: (speaking: boolean) => void;
  onAssistantSpeakingChange?: (speaking: boolean) => void;
  onError?: (message: string) => void;
}

type RealtimeEvent = {
  type?: string;
};

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export class RealtimeVoiceSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private microphone: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private state: RealtimeVoiceState = "idle";

  constructor(private readonly callbacks: RealtimeVoiceCallbacks) {}

  async connect(input: {
    clientSecret: string;
    model: string;
    audioElement: HTMLAudioElement;
  }): Promise<void> {
    this.setState("connecting");
    this.audioElement = input.audioElement;

    try {
      this.microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      this.setState("error");
      this.callbacks.onError?.(
        "Bitte erlauben Sie den Mikrofonzugriff und versuchen Sie es erneut.",
      );
      return;
    }

    try {
      const connection = new RTCPeerConnection();
      this.peerConnection = connection;

      connection.ontrack = (event) => {
        const stream = event.streams[0];
        if (!this.audioElement || !stream) return;
        this.audioElement.srcObject = stream;
        void this.audioElement.play().catch(() => {});
      };

      for (const track of this.microphone.getAudioTracks()) {
        connection.addTrack(track, this.microphone);
      }

      const dataChannel = connection.createDataChannel("oai-events");
      this.dataChannel = dataChannel;
      dataChannel.onmessage = (event) => this.handleEvent(String(event.data));
      dataChannel.onopen = () => this.setState("live");

      connection.onconnectionstatechange = () => {
        if (
          connection.connectionState === "failed" ||
          connection.connectionState === "disconnected"
        ) {
          this.callbacks.onError?.("Die Sprachverbindung wurde unterbrochen.");
          this.end();
        }
      };

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      const response = await fetch(
        `${REALTIME_CALLS_URL}?model=${encodeURIComponent(input.model)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );

      if (!response.ok) throw new Error("realtime_connection_failed");
      await connection.setRemoteDescription({
        type: "answer",
        sdp: await response.text(),
      });
    } catch {
      this.setState("error");
      this.callbacks.onError?.(
        "Die Sprachsitzung konnte nicht gestartet werden.",
      );
      this.cleanup();
    }
  }

  setMicEnabled(enabled: boolean): void {
    for (const track of this.microphone?.getAudioTracks() ?? []) {
      track.enabled = enabled;
    }
  }

  end(): void {
    this.cleanup();
    if (this.state !== "error") this.setState("ended");
  }

  private handleEvent(raw: string): void {
    let event: RealtimeEvent;
    try {
      event = JSON.parse(raw) as RealtimeEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case "input_audio_buffer.speech_started":
        this.callbacks.onUserSpeakingChange?.(true);
        break;
      case "input_audio_buffer.speech_stopped":
        this.callbacks.onUserSpeakingChange?.(false);
        break;
      case "output_audio_buffer.started":
        this.callbacks.onAssistantSpeakingChange?.(true);
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
      case "response.done":
        this.callbacks.onAssistantSpeakingChange?.(false);
        break;
      case "error":
        this.callbacks.onError?.(
          "Die Sprach-KI konnte gerade nicht antworten.",
        );
        break;
      default:
        break;
    }
  }

  private setState(state: RealtimeVoiceState): void {
    if (this.state === state) return;
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private cleanup(): void {
    try {
      this.dataChannel?.close();
    } catch {}
    for (const track of this.microphone?.getTracks() ?? []) track.stop();
    try {
      this.peerConnection?.close();
    } catch {}
    if (this.audioElement) this.audioElement.srcObject = null;
    this.dataChannel = null;
    this.peerConnection = null;
    this.microphone = null;
  }
}
