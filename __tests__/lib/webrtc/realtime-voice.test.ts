// Tests fuer den WebRTC-Realtime-Client — compliance-kritisch:
// das Senior-Mikrofon MUSS bei jedem Teardown-Pfad gestoppt werden,
// auch wenn die Sitzung waehrend des asynchronen Verbindungsaufbaus endet.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RealtimeVoiceSession } from "@/lib/webrtc/realtime-voice";

interface MockTrack {
  stop: ReturnType<typeof vi.fn>;
  enabled: boolean;
  kind: string;
}

function makeTrack(): MockTrack {
  return { stop: vi.fn(), enabled: true, kind: "audio" };
}

function makeStream(tracks: MockTrack[]) {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
  } as unknown as MediaStream;
}

let pcInstances: MockPC[];

class MockPC {
  closed = false;
  connectionState = "new";
  ontrack: ((event: unknown) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  constructor() {
    pcInstances.push(this);
  }
  createDataChannel() {
    return { close: vi.fn(), onmessage: null, onopen: null };
  }
  addTrack() {}
  createOffer() {
    return Promise.resolve({ sdp: "offer" });
  }
  setLocalDescription() {
    return Promise.resolve();
  }
  setRemoteDescription() {
    return Promise.resolve();
  }
  close() {
    this.closed = true;
  }
}

function makeAudioEl() {
  return { play: () => Promise.resolve(), srcObject: null } as unknown as HTMLAudioElement;
}

describe("RealtimeVoiceSession", () => {
  beforeEach(() => {
    pcInstances = [];
    vi.stubGlobal("RTCPeerConnection", MockPC);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("answer") }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("stoppt einen Mikrofon-Stream, der erst NACH dem Teardown aufloest (Race)", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    let resolveGum: (value: MediaStream) => void = () => {};
    const getUserMedia = vi.fn(
      () =>
        new Promise<MediaStream>((res) => {
          resolveGum = res;
        }),
    );
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    const session = new RealtimeVoiceSession({});
    const connectPromise = session.connect({
      clientSecret: "cs",
      model: "m",
      audioElement: makeAudioEl(),
    });

    // Teardown, waehrend getUserMedia noch nicht aufgeloest ist
    session.end();
    // getUserMedia loest jetzt auf — der Stream trifft auf eine bereits
    // beendete Sitzung und muss trotzdem gestoppt werden.
    resolveGum(stream);
    await connectPromise;

    expect(track.stop).toHaveBeenCalled();
    // Nach dem Teardown darf keine (bezahlte) PeerConnection mehr entstehen.
    expect(pcInstances.length).toBe(0);
  });

  it("stoppt alle Mikrofon-Tracks und schliesst die PeerConnection bei end()", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const session = new RealtimeVoiceSession({});
    await session.connect({ clientSecret: "cs", model: "m", audioElement: makeAudioEl() });
    session.end();

    expect(track.stop).toHaveBeenCalled();
    expect(pcInstances[0].closed).toBe(true);
  });

  it("beendet die Sitzung und gibt das Mikrofon frei bei Verbindungsabbruch", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    const onError = vi.fn();

    const session = new RealtimeVoiceSession({ onError });
    await session.connect({ clientSecret: "cs", model: "m", audioElement: makeAudioEl() });

    const pc = pcInstances[0];
    pc.connectionState = "failed";
    pc.onconnectionstatechange?.();

    expect(onError).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });
});
