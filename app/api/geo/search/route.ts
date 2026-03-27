import { NextRequest, NextResponse } from 'next/server'

const PHOTON_BASE = 'https://photon.komoot.io'
const TIMEOUT_MS = 5000

/**
 * GET /api/geo/search?q=Hauptstraße+Berlin&limit=5
 * Proxy für Photon Forward Geocoding — vermeidet CORS/DNS-Probleme im Browser
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q = searchParams.get('q')

  if (!q || q.length < 3) {
    return NextResponse.json({ features: [] })
  }

  // Photon .io erwartet separate layer-Parameter (nicht comma-separated)
  const params = new URLSearchParams({
    q,
    lang: searchParams.get('lang') ?? 'de',
    limit: searchParams.get('limit') ?? '5',
  })
  params.append('layer', 'house')
  params.append('layer', 'street')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(`${PHOTON_BASE}/api/?${params}`, {
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
