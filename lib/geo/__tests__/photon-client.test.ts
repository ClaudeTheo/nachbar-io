import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchAddress, reverseGeocode, type PhotonFeature } from '../photon-client'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('photon-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchAddress', () => {
    it('sendet korrekte Query an Photon API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      })

      await searchAddress('Bahnhofstraße Hamburg')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('photon.komoot.de/api/?q=Bahnhofstra'),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it('gibt leeres Array zurück bei weniger als 3 Zeichen', async () => {
      const result = await searchAddress('Ba')
      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('parst Photon-Ergebnis in AddressSuggestion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            geometry: { coordinates: [9.9937, 53.5511] },
            properties: {
              name: 'Bahnhofstraße',
              postcode: '20095',
              city: 'Hamburg',
              state: 'Hamburg',
              country: 'Deutschland',
              osm_id: 123456,
            },
          }],
        }),
      })

      const results = await searchAddress('Bahnhofstraße Hamburg')

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        street: 'Bahnhofstraße',
        postalCode: '20095',
        city: 'Hamburg',
        state: 'Hamburg',
        country: 'DE',
        lat: 53.5511,
        lng: 9.9937,
        displayText: 'Bahnhofstraße, 20095 Hamburg',
      })
    })

    it('gibt leeres Array zurück bei Netzwerkfehler', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const result = await searchAddress('Hamburg')
      expect(result).toEqual([])
    })

    it('gibt leeres Array zurück bei HTTP-Fehler', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })
      const result = await searchAddress('Hamburg')
      expect(result).toEqual([])
    })
  })

  describe('reverseGeocode', () => {
    it('gibt Stadtteil und Stadt zurück', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            properties: {
              city: 'Hamburg',
              district: 'Eimsbüttel',
              state: 'Hamburg',
              country: 'Deutschland',
            },
          }],
        }),
      })

      const result = await reverseGeocode(53.5511, 9.9937)

      expect(result).toEqual({
        city: 'Hamburg',
        district: 'Eimsbüttel',
        state: 'Hamburg',
        country: 'DE',
        quarterName: 'Hamburg — Eimsbüttel',
      })
    })

    it('verwendet Straßenname wenn kein Stadtteil', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            properties: {
              city: 'Bad Säckingen',
              street: 'Purkersdorfer Straße',
              state: 'Baden-Württemberg',
              country: 'Deutschland',
            },
          }],
        }),
      })

      const result = await reverseGeocode(47.5535, 7.9640)

      expect(result).toEqual({
        city: 'Bad Säckingen',
        district: undefined,
        state: 'Baden-Württemberg',
        country: 'DE',
        quarterName: 'Bad Säckingen — Purkersdorfer Straße',
      })
    })

    it('gibt null zurück bei Fehler', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const result = await reverseGeocode(53.5511, 9.9937)
      expect(result).toBeNull()
    })
  })
})
