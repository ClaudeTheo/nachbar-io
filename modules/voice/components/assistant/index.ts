// components/voice-assistant/index.ts
// Nachbar.io — Barrel-Export fuer Voice-Assistant Subkomponenten

export { FABButton } from "./FABButton";
export { VoiceSheetContent } from "./SheetContent";
export { PushToTalkButton } from "./PushToTalkButton";
export { ToolResultsDisplay } from "./ToolResultsDisplay";
export type {
  SheetState,
  ChatMessage,
  CompanionToolResult,
  CompanionConfirmation,
  CompanionResponse,
} from "./types";
export { MAX_EXCHANGES } from "./types";
