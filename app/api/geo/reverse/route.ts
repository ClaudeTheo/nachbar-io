import { NextRequest, NextResponse } from 'next/server'

const PHOTON_BASE = 'https://photon.komoot.io'
const TIMEOUT_MS = 5000

/**
 * GET /api/geo/reverse?lat=53.5511&lng=9.9937
 * Proxy fuer Photon Reverse Geocoding — gibt Stadt + Stadtteil zurueck
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'lat und lng sind erforderlich' },
      { status: 400 }
    )
  }

  const params = new URLSearchParams({
    lat,
    lon: lng,
    lang: searchParams.get('lang') ?? 'de',
  })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(`${PHOTON_BASE}/reverse?${params}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'QuartierApp/1.0 (nachbar.io)' },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ features: [] })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ features: [] })
  }
}
