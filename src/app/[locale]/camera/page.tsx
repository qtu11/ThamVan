import type { Metadata } from 'next';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { hasVision, hasSupabase } from '@/lib/env';
import { getViewer } from '@/lib/data';
import { CameraExplorer } from '@/components/camera';
import './camera.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return { title: t(isLocale(raw) ? raw : 'vi', 'camera') };
}

export default async function CameraPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  return (
    <CameraExplorer
      locale={locale}
      available={hasVision() && hasSupabase()}
      signedIn={!!(await getViewer())}
    />
  );
}
