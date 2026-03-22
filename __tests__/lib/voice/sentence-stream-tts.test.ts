import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SentenceStreamTTS } from '@/lib/voice/sentence-stream-tts'

// Mock Audio fuer jsdom (play/onended werden nicht nativ unterstuetzt)
class MockAudio {
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  play() {
    // Simuliere sofortiges Ende
    setTimeout(() => this.onended?.(), 0)
    return Promise.resolve()
  }
}
vi.stubGlobal('Audio', MockAudio)

describe('SentenceStreamTTS', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('Audio', MockAudio)
  })

  it('erkennt vollstaendige Saetze', () => {
    const tts = new SentenceStreamTTS()
    const sentences = tts.extractSentences('Hallo. Wie geht es Ihnen? Gut.')
    expect(sentences).toEqual(['Hallo.', 'Wie geht es Ihnen?', 'Gut.'])
  })

  it('puffert unvollstaendige Saetze', () => {
    const tts = new SentenceStreamTTS()
    const s1 = tts.feedText('Hallo, das ')
    expect(s1).toEqual([])  // Kein vollstaendiger Satz
    const s2 = tts.feedText('ist ein Test. Und ')
    expect(s2).toEqual(['Hallo, das ist ein Test.'])
    const s3 = tts.flush()
    expect(s3).toEqual(['Und'])  // Rest-Buffer (getrimmt)
  })

  it('startet TTS fuer ersten Satz sofort', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['audio-data'], { type: 'audio/mpeg' }))
    )
    const tts = new SentenceStreamTTS()
    // speakSentence braucht Audio-Kontext, testen wir nur den fetch
    await tts.speakSentence('Hallo.')
    expect(mockFetch).toHaveBeenCalledWith('/api/voice/tts', expect.objectContaining({
      method: 'POST'
    }))
  })

  it('flush gibt leeres Array bei leerem Buffer', () => {
    const tts = new SentenceStreamTTS()
    expect(tts.flush()).toEqual([])
  })

  it('stop leert den Buffer', () => {
    const tts = new SentenceStreamTTS()
    tts.feedText('Hallo, das ist ')
    tts.stop()
    expect(tts.flush()).toEqual([])
  })

  it('uebergibt konfigurierte Stimme an TTS API', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['audio-data'], { type: 'audio/mpeg' }))
    )
    const tts = new SentenceStreamTTS({ voice: 'alloy' })
    await tts.speakSentence('Test.')
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.voice).toBe('alloy')
  })
})
