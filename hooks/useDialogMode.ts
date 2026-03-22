'use client'

import { useState, useCallback, useRef } from 'react'

// State-Machine fuer den Dialog-Modus:
// idle -> greeting -> listening -> processing -> speaking -> listening (Loop)
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
}

export function useDialogMode(): UseDialogModeReturn {
  const [state, setState] = useState<DialogState>('idle')
  const [audioLevel, setAudioLevel] = useState(0)
  const greetingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current)
      greetingTimeoutRef.current = null
    }
    setAudioLevel(0)
    setState('idle')
  }, [])

  // Transkript verarbeiten: listening -> processing (oder idle bei Abschied)
  const handleTranscript = useCallback((text: string) => {
    if (isFarewell(text)) {
      setState('idle')
      setAudioLevel(0)
      return
    }
    setState('processing')
  }, [isFarewell])

  // KI-Antwort erhalten -> speaking
  const setResponse = useCallback((_text: string) => {
    setState('speaking')
  }, [])

  // TTS fertig gesprochen -> listening (weiter zuhoeren)
  const setSpeakingDone = useCallback(() => {
    setState('listening')
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
  }
}
