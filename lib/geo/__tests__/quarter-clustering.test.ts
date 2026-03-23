import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assignUserToQuarter } from '../quarter-clustering'
import { createClient } from '@/lib/supabase/server'
import * as photon from '../photon-client'

vi.mock('@/lib/supabase/server')
vi.mock('../photon-client')

const mockRpc = vi.fn()
const mockSupabase = { rpc: mockRpc } as any
vi.mocked(createClient).mockResolvedValue(mockSupabase)
vi.mocked(photon.reverseGeocode).mockResolvedValue({
  city: 'Hamburg',
  district: 'Eimsbüttel',
  state: 'Hamburg',
  country: 'DE',
  quarterName: 'Hamburg — Eimsbüttel',
})

describe('assignUserToQuarter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ruft assign_point_to_quarter RPC auf', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'quarter-uuid-123', error: null })

    const result = await assignUserToQuarter(53.5511, 9.9937)

    expect(mockRpc).toHaveBeenCalledWith('assign_point_to_quarter', {
      p_point: expect.stringContaining('SRID=4326;POINT(9.9937 53.5511)'),
      p_quarter_name: 'Hamburg — Eimsbüttel',
      p_city: 'Hamburg',
      p_state: 'Hamburg',
      p_country: 'DE',
    })
    expect(result).toBe('quarter-uuid-123')
  })

  it('verwendet Fallback-Name bei Reverse-Geocoding-Fehler', async () => {
    vi.mocked(photon.reverseGeocode).mockResolvedValueOnce(null)
    mockRpc.mockResolvedValueOnce({ data: 'quarter-uuid-456', error: null })

    const result = await assignUserToQuarter(51.0, 7.0)

    expect(mockRpc).toHaveBeenCalledWith('assign_point_to_quarter', expect.objectContaining({
      p_quarter_name: 'Neues Quartier',
    }))
    expect(result).toBe('quarter-uuid-456')
  })

  it('wirft Fehler bei RPC-Fehler', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    await expect(assignUserToQuarter(53.5, 9.9)).rejects.toThrow('DB error')
  })
})
