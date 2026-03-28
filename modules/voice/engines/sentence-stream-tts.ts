// lib/voice/sentence-stream-tts.ts
// Satz-basiertes TTS-Streaming: Text wird satzweise an die TTS-API gesendet
// Erster Satz startet sofort, weitere werden gepipelined

export interface SentenceStreamTTSOptions {
  voice?: string
  onSpeakingDone?: () => void
  onError?: (error: Error) => void
}

export class SentenceStreamTTS {
  private buffer = ''
  private options: SentenceStreamTTSOptions

  constructor(options?: SentenceStreamTTSOptions) {
    this.options = options ?? {}
  }

  // Streaming: Text reinfuehren, fertige Saetze zurueckgeben
  feedText(delta: string): string[] {
    this.buffer += delta
    const sentences: string[] = []
    const regex = /[^.!?]*[.!?]+\s*/g
    let match
    let lastIndex = 0
    while ((match = regex.exec(this.buffer)) !== null) {
      sentences.push(match[0].trim())
      lastIndex = regex.lastIndex
    }
    this.buffer = this.buffer.slice(lastIndex)
    return sentences
  }

  // Rest-Buffer ausgeben (am Ende des Streams)
  flush(): string[] {
    if (this.buffer.trim()) {
      const rest = [this.buffer.trim()]
      this.buffer = ''
      return rest
    }
    return []
  }

  // Text in Saetze aufteilen (fuer nicht-streaming Nutzung)
  extractSentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) ?? [text]
  }

  // Einzelnen Satz per TTS-API sprechen
  async speakSentence(sentence: string): Promise<void> {
    const res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: sentence,
        voice: this.options.voice ?? 'nova'
      })
    })
    if (!res.ok) return

    // Audio abspielen (im Browser-Kontext)
    if (typeof window === 'undefined') return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    return new Promise<void>((resolve) => {
      audio.onended = () => { setTimeout(() => URL.revokeObjectURL(url), 3000); resolve() }
      audio.onerror = () => {
        setTimeout(() => URL.revokeObjectURL(url), 3000)
        this.options.onError?.(new Error('[TTS] Audio-Wiedergabefehler'))
        resolve()
      }
      const playResult = audio.play()
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          console.warn('[TTS] audio.play() blockiert (Safari/iOS Stummschalter?)')
          URL.revokeObjectURL(url)
          this.options.onError?.(new Error('[TTS] Wiedergabe blockiert — Stummschalter oder fehlende User-Geste'))
          resolve()
        })
      }
    })
  }

  // Satz-Queue abspielen (sequenziell)
  async playQueue(sentences: string[]): Promise<void> {
    for (const sentence of sentences) {
      await this.speakSentence(sentence)
    }
    this.options.onSpeakingDone?.()
  }

  // Buffer leeren (z.B. bei Stopp)
  stop() { this.buffer = '' }
}
