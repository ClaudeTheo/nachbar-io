import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddressAutocomplete } from '../address-autocomplete'
import * as photon from '@/lib/geo/photon-client'

vi.mock('@/lib/geo/photon-client')
const mockSearch = vi.mocked(photon.searchAddress)

describe('AddressAutocomplete', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearch.mockResolvedValue([])
  })

  it('rendert ein Suchfeld mit Placeholder', () => {
    render(<AddressAutocomplete onSelect={mockOnSelect} />)
    expect(screen.getByPlaceholderText(/adresse eingeben/i)).toBeInTheDocument()
  })

  it('sucht nicht bei weniger als 3 Zeichen', async () => {
    render(<AddressAutocomplete onSelect={mockOnSelect} />)
    const input = screen.getByPlaceholderText(/adresse eingeben/i)
    await userEvent.type(input, 'Ba')

    // Warten auf Debounce
    await new Promise((r) => setTimeout(r, 400))
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('zeigt Vorschläge nach Eingabe', async () => {
    mockSearch.mockResolvedValueOnce([
      {
        street: 'Bahnhofstraße',
        postalCode: '20095',
        city: 'Hamburg',
        state: 'Hamburg',
        country: 'DE',
        lat: 53.5511,
        lng: 9.9937,
        displayText: 'Bahnhofstraße, 20095 Hamburg',
      },
    ])

    render(<AddressAutocomplete onSelect={mockOnSelect} />)
    const input = screen.getByPlaceholderText(/adresse eingeben/i)
    await userEvent.type(input, 'Bahnhof Hamburg')

    await waitFor(() => {
      expect(screen.getByText('Bahnhofstraße, 20095 Hamburg')).toBeInTheDocument()
    })
  })

  it('ruft onSelect bei Klick auf Vorschlag', async () => {
    mockSearch.mockResolvedValueOnce([
      {
        street: 'Bahnhofstraße',
        postalCode: '20095',
        city: 'Hamburg',
        state: 'Hamburg',
        country: 'DE',
        lat: 53.5511,
        lng: 9.9937,
        displayText: 'Bahnhofstraße, 20095 Hamburg',
      },
    ])

    render(<AddressAutocomplete onSelect={mockOnSelect} />)
    const input = screen.getByPlaceholderText(/adresse eingeben/i)
    await userEvent.type(input, 'Bahnhof Hamburg')

    await waitFor(() => {
      expect(screen.getByText('Bahnhofstraße, 20095 Hamburg')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Bahnhofstraße, 20095 Hamburg'))

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        street: 'Bahnhofstraße',
        city: 'Hamburg',
        lat: 53.5511,
      })
    )
  })

  it('zeigt Fehlermeldung bei Photon-Ausfall', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Network'))

    render(<AddressAutocomplete onSelect={mockOnSelect} />)
    const input = screen.getByPlaceholderText(/adresse eingeben/i)
    await userEvent.type(input, 'Hamburg Bahnhof')

    await waitFor(() => {
      expect(
        screen.getByText(/adresssuche vorübergehend nicht verfügbar/i)
      ).toBeInTheDocument()
    })
  })

  it('schließt Vorschläge nach Auswahl', async () => {
    mockSearch.mockResolvedValueOnce([
      {
        street: 'Teststraße',
        postalCode: '12345',
        city: 'Teststadt',
        state: 'NRW',
        country: 'DE',
        lat: 51.0,
        lng: 7.0,
        displayText: 'Teststraße, 12345 Teststadt',
      },
    ])

    render(<AddressAutocomplete onSelect={mockOnSelect} />)
    const input = screen.getByPlaceholderText(/adresse eingeben/i)
    await userEvent.type(input, 'Teststraße')

    await waitFor(() => {
      expect(screen.getByText('Teststraße, 12345 Teststadt')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Teststraße, 12345 Teststadt'))

    expect(screen.queryByText('Teststraße, 12345 Teststadt')).not.toBeInTheDocument()
  })
})
