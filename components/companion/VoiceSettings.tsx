'use client'

// Stimmen-Einstellungen fuer den KI-Companion
// Drei Toggles: Stimme (Weiblich/Männlich), Tempo (Normal/Langsam), Anrede (Förmlich/Vertraut)

export interface VoicePreferences {
  voice: 'nova' | 'onyx'     // nova = weiblich, onyx = maennlich
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
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4">
      <h3 className="text-base font-semibold text-[#2D3142]">Stimme einstellen</h3>

      {/* Stimme: Weiblich / Männlich */}
      <ToggleGroup
        label="Stimme"
        options={[
          { label: 'Weiblich', value: 'nova', active: settings.voice === 'nova' },
          { label: 'Männlich', value: 'onyx', active: settings.voice === 'onyx' },
        ]}
        onSelect={(value) => onChange({ ...settings, voice: value as 'nova' | 'onyx' })}
      />

      {/* Tempo: Normal / Langsam */}
      <ToggleGroup
        label="Tempo"
        options={[
          { label: 'Normal', value: '1.0', active: settings.speed === 1.0 },
          { label: 'Langsam', value: '0.85', active: settings.speed === 0.85 },
        ]}
        onSelect={(value) => onChange({ ...settings, speed: parseFloat(value) })}
      />

      {/* Anrede: Förmlich / Vertraut */}
      <ToggleGroup
        label="Anrede"
        options={[
          { label: 'Förmlich', value: 'formal', active: settings.formality === 'formal' },
          { label: 'Vertraut', value: 'informal', active: settings.formality === 'informal' },
        ]}
        onSelect={(value) => onChange({ ...settings, formality: value as 'formal' | 'informal' })}
      />
    </div>
  )
}
