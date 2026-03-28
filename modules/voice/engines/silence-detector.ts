// lib/voice/silence-detector.ts
// Erkennt Stille im Audio-Stream fuer den Dialog-Modus

export interface SilenceDetectorOptions {
  silenceThreshold: number    // 0-1, default 0.05
  silenceDurationMs: number   // default 3000
  onSilence: () => void
  onLevelChange?: (level: number) => void
}

export class SilenceDetector {
  private silenceStartTime: number | null = null
  private _currentLevel = 0
  private active = true

  constructor(private options: SilenceDetectorOptions) {}

  get currentLevel() { return this._currentLevel }

  feedAudioLevel(level: number) {
    if (!this.active) return
    this._currentLevel = level
    this.options.onLevelChange?.(level)

    if (level < this.options.silenceThreshold) {
      if (this.silenceStartTime === null) {
        this.silenceStartTime = Date.now()
      } else if (Date.now() - this.silenceStartTime >= this.options.silenceDurationMs) {
        this.options.onSilence()
        this.silenceStartTime = null // Reset nach Trigger
      }
    } else {
      this.silenceStartTime = null
    }
  }

  reset() { this.silenceStartTime = null }
  cleanup() { this.active = false }
}
