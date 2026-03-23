import { createClient } from '@/lib/supabase/server'
import { reverseGeocode } from './photon-client'

/**
 * Weist einen Nutzer basierend auf Koordinaten einem Quartier zu.
 * Nutzt den PostGIS assign_point_to_quarter Algorithmus.
 * Erstellt automatisch ein neues Quartier wenn keines in Reichweite.
 */
export async function assignUserToQuarter(
  lat: number,
  lng: number
): Promise<string> {
  // Reverse Geocoding fuer Quartier-Name
  const geo = await reverseGeocode(lat, lng)
  const quarterName = geo?.quarterName ?? 'Neues Quartier'
  const city = geo?.city ?? ''
  const state = geo?.state ?? ''
  const country = geo?.country ?? 'DE'

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('assign_point_to_quarter', {
    p_point: `SRID=4326;POINT(${lng} ${lat})`,
    p_quarter_name: quarterName,
    p_city: city,
    p_state: state,
    p_country: country,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as string
}
