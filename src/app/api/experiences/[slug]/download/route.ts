import { findExperience, experienceText } from '@/data/experiences';
import { guideFor } from '@/data/walk-guides';
import { ownsExperience } from '@/lib/commerce';
import { getCatalog } from '@/lib/data';
import { isLocale, textFor } from '@/lib/types';
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findExperience(slug);
  if (!item) return new Response('Not found', { status: 404 });
  if (!(await ownsExperience(slug)))
    return new Response('Purchase required', {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  const lang = new URL(request.url).searchParams.get('locale') || 'vi';
  const locale = isLocale(lang) ? lang : 'vi';
  const entries = await getCatalog();
  const content = [
    `# THÁM VĂN — ${experienceText(item.title, locale)}`,
    experienceText(item.description, locale),
    'Self-guided digital guide. Admission, meals and transport are excluded. Check opening hours and routes locally. Reference material and editorial observation prompts; not expert certification.',
    ...item.stops.map((slug, index) => {
      const entry = entries.find((item) => item.slug === slug);
      if (!entry) return '';
      const guide = guideFor(slug, locale);
      return `## ${index + 1}. ${entry.name}\n\n${textFor(entry.translations, locale).summary}\n\n${guide.observation}\n\n${guide.reflection}\n\n${entry.sources.map((source) => `${source.title}: ${source.url}`).join('\n')}`;
    }),
  ].join('\n\n');
  return new Response('\ufeff' + content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="tham-van-${slug}.md"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
