import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        ...['vi', 'en', 'zh'].flatMap((l) => [
          `/${l}/admin`,
          `/${l}/profile`,
          `/${l}/journey`,
          `/${l}/auth/`,
          `/${l}/orders/`,
          `/${l}/checkout`,
        ]),
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
