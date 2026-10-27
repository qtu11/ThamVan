import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/data';
import { siteUrl } from '@/lib/env';
import { locales } from '@/lib/types';
import { experiences } from '@/data/experiences';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getCatalog();
  return locales.flatMap((locale) => [
    ...['', '/explore', '/map', '/challenges', '/experiences', '/partners'].map((route) => ({
      url: `${siteUrl()}/${locale}${route}`,
      changeFrequency: 'weekly' as const,
      priority: route ? 0.7 : 1,
    })),
    ...experiences.map((item) => ({
      url: `${siteUrl()}/${locale}/experiences/${item.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...entries.map((e) => ({
      url: `${siteUrl()}/${locale}/explore/${e.slug}`,
      lastModified: e.updated_at,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]);
}
