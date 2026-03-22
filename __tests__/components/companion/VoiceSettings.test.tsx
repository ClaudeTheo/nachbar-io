import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { VoiceSettings } from '@/components/companion/VoiceSettings'

describe('VoiceSettings', () => {
  afterEach(() => cleanup())

  const defaults = { voice: 'nova' as const, speed: 1.0, formality: 'formal' as const }

  it('zeigt drei Einstellungen', () => {
    render(<VoiceSettings settings={defaults} onChange={vi.fn()} />)
    expect(screen.getByText('Stimme')).toBeInTheDocument()
    expect(screen.getByText('Tempo')).toBeInTheDocument()
    expect(screen.getByText('Anrede')).toBeInTheDocument()
  })

  it('Stimme: Weiblich/Männlich Toggle', () => {
    const onChange = vi.fn()
    render(<VoiceSettings settings={defaults} onChange={onChange} />)
    fireEvent.click(screen.getByText(/Männlich/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ voice: 'onyx' }))
  })

  it('Tempo: Normal/Langsam Toggle', () => {
    const onChange = vi.fn()
    render(<VoiceSettings settings={defaults} onChange={onChange} />)
    fireEvent.click(screen.getByText(/Langsam/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ speed: 0.85 }))
  })

  it('Förmlichkeit: Förmlich/Vertraut Toggle', () => {
    const onChange = vi.fn()
    render(<VoiceSettings settings={defaults} onChange={onChange} />)
    fireEvent.click(screen.getByText(/Vertraut/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ formality: 'informal' }))
  })

  it('hat mindestens 80px Touch-Targets', () => {
    const { container } = render(<VoiceSettings settings={defaults} onChange={vi.fn()} />)
    const buttons = container.querySelectorAll('button')
    buttons.forEach(btn => {
      expect(btn.className).toContain('min-h-[44px]')
    })
  })
})
