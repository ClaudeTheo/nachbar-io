'use client'

import { useState, useCallback, useRef } from 'react'

// State-Machine fuer den Dialog-Modus:
// idle -> greeting -> listening -> processing -> speaking -> listening (Loop)
// listening -> silence_check (nach 3s Stille) -> idle (nach 3s ohne Antwort)
// Jederzeit: -> idle (Stopp-Button oder Abschied)
export type DialogState =
  | 'idle'
  | 'greeting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'silence_check'

// Abschiedswoerter (normalisiert, lowercase)
const FAREWELL_WORDS = [
  'tschuess',
  'tschüss',
  'auf wiedersehen',
  'danke das wars',
  'danke, das wars',
  'fertig',
  'ende',
  'das reicht',
  'bis dann',
  'ciao',
  'bye',
]

// Timeout fuer silence_check -> idle (3 Sekunden)
const SILENCE_CHECK_TIMEOUT_MS = 3000

export interface UseDialogModeReturn {
  state: DialogState
  audioLevel: number
  startDialog: () => void
  stopDialog: () => void
  handleTranscript: (text: string) => void
  isFarewell: (text: string) => boolean
  setAudioLevel: (level: number) => void
  setResponse: (text: string) => void
  setSpeakingDone: () => void
  triggerSilenceCheck: () => void
}

export function useDialogMode(): UseDialogModeReturn {
  const [state, setState] = useState<DialogState>('idle')
  const [audioLevel, setAudioLevel] = useState(0)
  const greetingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Alle Timer aufraumen
  const clearTimers = useCallback(() => {
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current)
      greetingTimeoutRef.current = null
    }
    if (silenceCheckTimeoutRef.current) {
      clearTimeout(silenceCheckTimeoutRef.current)
      silenceCheckTimeoutRef.current = null
    }
  }, [])

  // Prueft ob ein Text eine Abschiedsphrase enthaelt
  const isFarewell = useCallback((text: string): boolean => {
    const normalized = text.toLowerCase().trim()
    return FAREWELL_WORDS.some(word => normalized.includes(word))
  }, [])

  // Dialog starten: idle -> greeting -> listening
  const startDialog = useCallback(() => {
    setState('greeting')
    // Nach kurzem Greeting automatisch zu listening wechseln
    greetingTimeoutRef.current = setTimeout(() => {
      setState('listening')
    }, 1500)
  }, [])

  // Dialog sofort beenden
  const stopDialog = useCallback(() => {
    clearTimers()
    setAudioLevel(0)
    setState('idle')
  }, [clearTimers])

  // Transkript verarbeiten: listening/silence_check -> processing (oder idle bei Abschied)
  const handleTranscript = useCallback((text: string) => {
    // Silence-Check Timer abbrechen (User hat geantwortet)
    if (silenceCheckTimeoutRef.current) {
      clearTimeout(silenceCheckTimeoutRef.current)
      silenceCheckTimeoutRef.current = null
    }

    if (isFarewell(text)) {
      clearTimers()
      setState('idle')
      setAudioLevel(0)
      return
    }
    setState('processing')
  }, [isFarewell, clearTimers])

  // KI-Antwort erhalten -> speaking
  const setResponse = useCallback((_text: string) => {
    setState('speaking')
  }, [])

  // TTS fertig gesprochen -> listening (weiter zuhoeren)
  const setSpeakingDone = useCallback(() => {
    setState('listening')
  }, [])

  // Nach 3s Stille: "Noch etwas?" -> silence_check
  // Dann nach weiteren 3s ohne Antwort -> idle
  const triggerSilenceCheck = useCallback(() => {
    setState('silence_check')

    // Nach 3s ohne Eingabe: Dialog beenden
    silenceCheckTimeoutRef.current = setTimeout(() => {
      setState('idle')
      setAudioLevel(0)
    }, SILENCE_CHECK_TIMEOUT_MS)
  }, [])

  return {
    state,
    audioLevel,
    startDialog,
    stopDialog,
    handleTranscript,
    isFarewell,
    setAudioLevel,
    setResponse,
    setSpeakingDone,
    triggerSilenceCheck,
  }
}
