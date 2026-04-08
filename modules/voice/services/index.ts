// modules/voice/services/index.ts — Barrel Export fuer Companion-Services

export { loadQuarterContext } from "./context-loader";
export { buildSystemPrompt } from "./system-prompt";
export type { QuarterContext } from "./system-prompt";
export { companionTools, WRITE_TOOLS } from "./tools";
export { isWriteTool, executeCompanionTool } from "./tool-executor";
export type { ToolResult } from "./tool-executor";
export { getIOSAudioManager, resetIOSAudioManager } from "./ios-audio-manager";
export type { IOSAudioManager } from "./ios-audio-manager";
