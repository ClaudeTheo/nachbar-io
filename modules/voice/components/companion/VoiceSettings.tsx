'use client'

// Stimmen-Einstellungen für den KI-Companion
// Drei Toggles: Stimme (Weiblich/Maennlich), Tempo (Normal/Langsam), Anrede (Foermlich/Vertraut)
// + Vorschau-Button zum Probehören der aktuellen Stimme

import { useState, useRef, useCallback } from 'react'
import { Volume2, Square, Loader2 } from 'lucide-react'

export interface VoicePreferences {
  voice: 'nova' | 'onyx'     // nova = weiblich, onyx = männlich
  speed: number               // 1.0 = normal, 0.85 = langsam
  formality: 'formal' | 'informal'
}

interface VoiceSettingsProps {
  settings: VoicePreferences
  onChange: (settings: VoicePreferences) => void
}

interface ToggleOption {
  label: string
  value: string
  active: boolean
}

// Vorschau-Sätze je nach Anrede und Stimme
const PREVIEW_TEXTS: Record<string, Record<string, string>> = {
  formal: {
    nova: 'Guten Tag, ich bin Ihre digitale Nachbarschaftshelferin. Wie kann ich Ihnen heute behilflich sein?',
    onyx: 'Guten Tag, ich bin Ihr digitaler Nachbarschaftshelfer. Wie kann ich Ihnen heute behilflich sein?',
  },
  informal: {
    nova: 'Hallo, ich bin deine digitale Nachbarschaftshelferin. Wie kann ich dir heute helfen?',
    onyx: 'Hallo, ich bin dein digitaler Nachbarschaftshelfer. Wie kann ich dir heute helfen?',
  },
}

function ToggleGroup({
  label,
  options,
  onSelect,
}: {
  label: string
  options: ToggleOption[]
  onSelect: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#2D3142]">{label}</span>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              opt.active
                ? 'bg-[#4CAF87] text-white'
                : 'border border-border bg-white text-[#2D3142]/70 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function VoiceSettings({ settings, onChange }: VoiceSettingsProps) {
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setPreviewState('idle')
  }, [])

  const playPreview = useCallback(async () => {
    // Falls gerade abgespielt wird: stoppen
    if (previewState === 'playing' || previewState === 'loading') {
      stopPreview()
      return
    }

    // iOS Safari Audio Unlock (BUG-01):
    // Audio-Element SYNCHRON im Button-Click-Handler erstellen und stummschalten.
    // Dies "entsperrt" Audio fuer die gesamte Session, auch nach async Fetch.
    const audio = new Audio()
    audio.volume = 0
    try { await audio.play() } catch { /* iOS braucht dies zum Unlock */ }
    audio.pause()
    audio.volume = 1
    audioRef.current = audio

    setPreviewState('loading')
    abortRef.current = new AbortController()

    try {
      const text = PREVIEW_TEXTS[settings.formality]?.[settings.voice]
        || PREVIEW_TEXTS.formal.nova

      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.voice,
          speed: settings.speed,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        setPreviewState('idle')
        audioRef.current = null
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Dasselbe Audio-Element wiederverwenden (bereits durch iOS unlocked)
      audio.src = url

      audio.onended = () => {
        setTimeout(() => URL.revokeObjectURL(url), 3000)
        setPreviewState('idle')
        audioRef.current = null
      }

      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setPreviewState('idle')
        audioRef.current = null
      }

      await audio.play()
      setPreviewState('playing')
    } catch (err) {
      // AbortError ignorieren (Nutzer hat abgebrochen)
      if (err instanceof DOMException && err.name === 'AbortError') return
      audioRef.current = null
      setPreviewState('idle')
    }
  }, [settings.voice, settings.speed, settings.formality, previewState, stopPreview])

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4">
      <h3 className="text-base font-semibold text-[#2D3142]">Stimme einstellen</h3>

      {/* Stimme: Weiblich / Maennlich */}
      <ToggleGroup
        label="Stimme"
        options={[
          { label: 'Weiblich', value: 'nova', active: settings.voice === 'nova' },
          { label: 'Männlich', value: 'onyx', active: settings.voice === 'onyx' },
        ]}
        onSelect={(value) => {
          stopPreview()
          onChange({ ...settings, voice: value as 'nova' | 'onyx' })
        }}
      />

      {/* Tempo: Normal / Langsam */}
      <ToggleGroup
        label="Tempo"
        options={[
          { label: 'Normal', value: '1.0', active: settings.speed === 1.0 },
          { label: 'Langsam', value: '0.85', active: settings.speed === 0.85 },
        ]}
        onSelect={(value) => {
          stopPreview()
          onChange({ ...settings, speed: parseFloat(value) })
        }}
      />

      {/* Anrede: Foermlich / Vertraut */}
      <ToggleGroup
        label="Anrede"
        options={[
          { label: 'Förmlich', value: 'formal', active: settings.formality === 'formal' },
          { label: 'Vertraut', value: 'informal', active: settings.formality === 'informal' },
        ]}
        onSelect={(value) => {
          stopPreview()
          onChange({ ...settings, formality: value as 'formal' | 'informal' })
        }}
      />

      {/* Vorschau-Button */}
      <button
        onClick={playPreview}
        className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
          previewState === 'playing'
            ? 'bg-[#2D3142] text-white'
            : 'border border-[#4CAF87] text-[#4CAF87] hover:bg-[#4CAF87]/10'
        }`}
      >
        {previewState === 'loading' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Wird geladen...
          </>
        )}
        {previewState === 'playing' && (
          <>
            <Square className="h-4 w-4" />
            Stoppen
          </>
        )}
        {previewState === 'idle' && (
          <>
            <Volume2 className="h-4 w-4" />
            Stimme anhören
          </>
        )}
      </button>
    </div>
  )
}
