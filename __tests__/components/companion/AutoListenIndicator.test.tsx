import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AutoListenIndicator } from '@/components/companion/AutoListenIndicator'

describe('AutoListenIndicator', () => {
  it('zeigt "Ich höre zu..." Text', () => {
    render(<AutoListenIndicator isListening={true} audioLevel={0.5} />)
    expect(screen.getByText('Ich höre zu...')).toBeInTheDocument()
  })

  it('zeigt pulsierenden Ring bei Aktivitaet', () => {
    const { container } = render(
      <AutoListenIndicator isListening={true} audioLevel={0.5} />
    )
    expect(container.querySelector('[data-testid="pulse-ring"]')).toBeInTheDocument()
  })

  it('zeigt nichts wenn nicht aktiv', () => {
    const { container } = render(
      <AutoListenIndicator isListening={false} audioLevel={0} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('Ring-Groesse reagiert auf audioLevel', () => {
    const { container } = render(
      <AutoListenIndicator isListening={true} audioLevel={0.8} />
    )
    const ring = container.querySelector('[data-testid="pulse-ring"]')
    expect(ring).toBeInTheDocument()
  })

  it('hat mindestens 80px Hoehe (Senior-Modus)', () => {
    const { container } = render(<AutoListenIndicator isListening={true} audioLevel={0.3} />)
    const indicator = container.querySelector('[data-testid="listen-indicator"]')
    expect(indicator).toBeInTheDocument()
    expect(indicator!.className).toContain('min-h-[80px]')
  })
})
