import { MetadataRoute } from 'next'
import { isClosedPilotMode } from '@/lib/closed-pilot'

export default function robots(): MetadataRoute.Robots {
  if (isClosedPilotMode()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/kiosk/', '/admin/'],
    },
    sitemap: 'https://nachbar-io.vercel.app/sitemap.xml',
  }
}
