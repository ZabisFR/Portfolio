import type { MetadataRoute } from 'next';
import { PROJECTS } from '@/content/projects';
import { SITE } from '@/content/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    ...PROJECTS.map((p) => ({
      url: `${SITE.url}/projets/${p.slug}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: p.featured ? 0.9 : 0.6,
    })),
    { url: `${SITE.url}/mentions-legales`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
