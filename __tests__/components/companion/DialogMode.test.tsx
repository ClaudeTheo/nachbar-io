import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { DialogMode } from '@/components/companion/DialogMode'

// Mock voice-Module (brauchen Browser-APIs)
vi.mock('@/lib/voice/create-speech-engine', () => ({
  createSpeechEngine: vi.fn().mockReturnValue(null)
}))

vi.mock('@/lib/voice/silence-detector', () => ({
  SilenceDetector: vi.fn().mockImplementation(() => ({
    feedAudioLevel: vi.fn(),
    reset: vi.fn(),
    cleanup: vi.fn(),
    currentLevel: 0,
  }))
}))

vi.mock('@/lib/voice/sentence-stream-tts', () => ({
  SentenceStreamTTS: vi.fn().mockImplementation(() => ({
    feedText: vi.fn().mockReturnValue([]),
    flush: vi.fn().mockReturnValue([]),
    speakSentence: vi.fn().mockResolvedValue(undefined),
    playQueue: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  }))
}))

vi.mock('@/hooks/useStreamingChat', () => ({
  useStreamingChat: vi.fn().mockReturnValue({
    streamingText: '',
    isStreaming: false,
    error: null,
    sendStreaming: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  })
}))

describe('DialogMode', () => {
  afterEach(() => cleanup())
  it('zeigt "Gespräch starten" Button initial', () => {
    render(<DialogMode onMessage={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Gespräch starten/i })).toBeInTheDocument()
  })

  it('Button ist mindestens 80px hoch (Senior-Modus)', () => {
    render(<DialogMode onMessage={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /Gespräch starten/i })
    expect(btn.className).toContain('min-h-[80px]')
  })

  it('zeigt Stopp-Button nach Start', () => {
    render(<DialogMode onMessage={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Gespräch starten/i }))
    expect(screen.getByRole('button', { name: /Stopp/i })).toBeInTheDocument()
  })

  it('Stopp-Button ist 80px hoch', () => {
    render(<DialogMode onMessage={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Gespräch starten/i }))
    const stopBtn = screen.getByRole('button', { name: /Stopp/i })
    expect(stopBtn.className).toContain('min-h-[80px]')
  })

  it('zeigt Text-Fallback Eingabefeld waehrend Dialog', () => {
    render(<DialogMode onMessage={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Gespräch starten/i }))
    expect(screen.getByPlaceholderText(/Text eingeben/i)).toBeInTheDocument()
  })

  it('Stopp kehrt zu Start-Button zurueck', () => {
    render(<DialogMode onMessage={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Gespräch starten/i }))
    fireEvent.click(screen.getByRole('button', { name: /Stopp/i }))
    expect(screen.getByRole('button', { name: /Gespräch starten/i })).toBeInTheDocument()
  })
})
