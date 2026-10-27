import { Camera } from 'lucide-react';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { hasVision, hasSupabase } from '@/lib/env';
import { getViewer, getCatalog } from '@/lib/data';
import { CameraExplorer } from '@/components/camera';
export default async function CameraPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <Camera size={16} /> THÁM VĂN LENS
        </p>
        <h1>{t(locale, 'camera')}</h1>
        <p>{t(locale, 'cameraDesc')}</p>
      </div>
      <CameraExplorer
        locale={locale}
        available={hasVision() && hasSupabase()}
        signedIn={!!(await getViewer())}
        entries={await getCatalog()}
      />
    </div>
  );
}
