import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/kiosk/', '/admin/'],
    },
    sitemap: 'https://nachbar-io.vercel.app/sitemap.xml',
  }
}
