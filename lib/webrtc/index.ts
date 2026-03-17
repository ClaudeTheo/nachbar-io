// WebRTC Modul — Oeffentliche API fuer Nachbar Plus Video-Anrufe
export { WebRTCSignaling } from './signaling';
export { PeerConnectionManager, getIceServers, isConnectionDegraded } from './peer-connection';
export type {
  SignalingMessage,
  SignalingEventType,
  CallState,
  PeerConnectionConfig,
  SignalingCallback,
  ConnectionQuality,
  TurnConfig,
  MediaMode,
} from './types';
