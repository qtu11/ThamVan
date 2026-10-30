import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { authDestination } from '@/lib/auth-policy';
import { isLocale } from '@/lib/types';
import { getViewer } from '@/lib/data';
import { Shell } from '@/components/shell';
import { siteUrl } from '@/lib/env';
import type { Metadata } from 'next';
import { copy } from '@/lib/locale-copy';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  return {
    title: {
      default: copy(
        locale,
        'THÁM VĂN — Đi để thấy. Chạm để hiểu.',
        'THÁM VĂN — Walk. Discover. Connect.',
        'THÁM VĂN — 漫步，发现，连接。',
      ),
      template: '%s · THÁM VĂN',
    },
    description: copy(
      locale,
      'Khám phá Sài Gòn qua hành trình văn hóa tự dẫn, bản đồ địa điểm và hộ chiếu khám phá cá nhân. Xem trước miễn phí, chọn bộ hướng dẫn cho câu chuyện của bạn.',
      'Discover Saigon through self-guided cultural walks, a place atlas and your personal discovery passport. Preview for free and choose your next story.',
      '通过自助文化漫步、地点地图与个人探索护照发现西贡。免费预览，选择下一段故事。',
    ),
    metadataBase: new URL(siteUrl()),
  };
}
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getViewer();
  if (user && !user.acceptedTerms) {
    const current = (await headers()).get('x-app-path') || `/${locale}`;
    const path = new URL(current, 'https://internal.invalid').pathname;
    if (
      ![
        `/${locale}/terms`,
        `/${locale}/privacy`,
        `/${locale}/credits`,
        `/${locale}/auth/consent`,
      ].includes(path)
    )
      redirect(
        `/${locale}/auth/consent?next=${encodeURIComponent(authDestination(current, locale))}`,
      );
  }
  return (
    <Shell locale={locale} signedIn={!!user} isAdmin={!!user?.admin}>
      {children}
    </Shell>
  );
}
