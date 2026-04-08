'use client'

// Stimmen-Einstellungen fuer den KI-Companion
// Session 59: 3 Tempos (Schnell/Normal/Langsam), ash statt onyx, zuklappbar

import { useState, useRef, useCallback } from 'react'
import { Volume2, Square, Loader2, ChevronDown } from 'lucide-react'

export interface VoicePreferences {
  voice: 'nova' | 'ash'     // nova = weiblich, ash = maennlich (warm, akzentfrei)
  speed: number              // 1.15 = schnell, 1.0 = normal, 0.85 = langsam
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

// Vorschau-Saetze je nach Anrede und Stimme
const PREVIEW_TEXTS: Record<string, Record<string, string>> = {
  formal: {
    nova: 'Guten Tag! Ich freue mich, dass Sie da sind. Wie kann ich Ihnen heute helfen?',
    ash: 'Guten Tag! Schön, dass Sie da sind. Wie kann ich Ihnen heute behilflich sein?',
  },
  informal: {
    nova: 'Hallo! Schön, dass du da bist. Wie kann ich dir heute helfen?',
    ash: 'Hey! Gut, dass du da bist. Wie kann ich dir heute helfen?',
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
            style={{ touchAction: 'manipulation' }}
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
    if (previewState === 'playing' || previewState === 'loading') {
      stopPreview()
      return
    }

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
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const audio = new Audio(url)
      audioRef.current = audio

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
      if (err instanceof DOMException && err.name === 'AbortError') return
      audioRef.current = null
      setPreviewState('idle')
    }
  }, [settings.voice, settings.speed, settings.formality, previewState, stopPreview])

  // Migriere alte "onyx" Einstellung zu "ash"
  const currentVoice = settings.voice === 'onyx' as string ? 'ash' : settings.voice

  return (
    <div className="flex flex-col gap-4">
      {/* Stimme: Weiblich / Maennlich */}
      <ToggleGroup
        label="Stimme"
        options={[
          { label: 'Weiblich', value: 'nova', active: currentVoice === 'nova' },
          { label: 'Männlich', value: 'ash', active: currentVoice === 'ash' },
        ]}
        onSelect={(value) => {
          stopPreview()
          onChange({ ...settings, voice: value as 'nova' | 'ash' })
        }}
      />

      {/* Tempo: Schnell / Normal / Langsam */}
      <ToggleGroup
        label="Tempo"
        options={[
          { label: 'Schnell', value: '1.15', active: settings.speed >= 1.1 },
          { label: 'Normal', value: '1.0', active: settings.speed >= 0.95 && settings.speed < 1.1 },
          { label: 'Langsam', value: '0.85', active: settings.speed < 0.95 },
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
        style={{ touchAction: 'manipulation' }}
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

/**
 * Zuklappbarer Wrapper fuer VoiceSettings auf der Profilseite.
 * Spart Platz — oeffnet sich erst bei Klick.
 */
export function CollapsibleVoiceSettings({ settings, onChange }: VoiceSettingsProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-1"
        style={{ touchAction: 'manipulation' }}
      >
        <span className="text-base font-semibold text-[#2D3142]">Stimme einstellen</span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="mt-3">
          <VoiceSettings settings={settings} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
