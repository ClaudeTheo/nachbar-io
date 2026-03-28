// modules/voice/index.ts — Barrel Export fuer Voice-Modul
// Sammelt: Engines (Sprach-Ein/Ausgabe), Services (Companion-KI), Komponenten

// Engines (Speech Recognition, TTS, Silence Detection)
export * from "./engines";

// Services (Companion Chat Backend-Logik)
export * from "./services";

// Komponenten werden direkt importiert (React-Komponenten nicht ueber Barrel)
