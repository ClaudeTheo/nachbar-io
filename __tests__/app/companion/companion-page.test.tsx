import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

// Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}))

// Mock voice-Module
vi.mock('@/lib/voice/create-speech-engine', () => ({
  createSpeechEngine: vi.fn().mockReturnValue(null)
}))
vi.mock('@/lib/voice/silence-detector', () => ({
  SilenceDetector: vi.fn().mockImplementation(() => ({
    feedAudioLevel: vi.fn(), reset: vi.fn(), cleanup: vi.fn(), currentLevel: 0,
  }))
}))
vi.mock('@/lib/voice/sentence-stream-tts', () => ({
  SentenceStreamTTS: vi.fn().mockImplementation(() => ({
    feedText: vi.fn().mockReturnValue([]), flush: vi.fn().mockReturnValue([]),
    speakSentence: vi.fn().mockResolvedValue(undefined),
    playQueue: vi.fn().mockResolvedValue(undefined), stop: vi.fn(),
  }))
}))
vi.mock('@/hooks/useStreamingChat', () => ({
  useStreamingChat: vi.fn().mockReturnValue({
    streamingText: '', isStreaming: false, error: null,
    sendStreaming: vi.fn().mockResolvedValue(undefined), reset: vi.fn(),
  })
}))

import CompanionPage from '@/app/(app)/companion/page'

describe('CompanionPage', () => {
  afterEach(() => cleanup())

  it('zeigt Tab-Leiste mit Chat und Gespräch', () => {
    render(<CompanionPage />)
    expect(screen.getByTestId('tab-chat')).toBeInTheDocument()
    expect(screen.getByTestId('tab-dialog')).toBeInTheDocument()
  })

  it('zeigt Chat-Modus als Standard', () => {
    render(<CompanionPage />)
    expect(screen.getByTestId('companion-chat')).toBeInTheDocument()
  })

  it('kann zwischen Chat und Dialog wechseln', () => {
    render(<CompanionPage />)
    // Zu Dialog wechseln
    fireEvent.click(screen.getByTestId('tab-dialog'))
    expect(screen.getByRole('button', { name: /Gespräch starten/i })).toBeInTheDocument()

    // Zurueck zu Chat
    fireEvent.click(screen.getByTestId('tab-chat'))
    expect(screen.getByTestId('companion-chat')).toBeInTheDocument()
  })
})
