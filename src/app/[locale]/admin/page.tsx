import { notFound } from 'next/navigation';
import Link from 'next/link';
import { copy } from '@/lib/locale-copy';
import { ShieldCheck } from 'lucide-react';
import { getViewer } from '@/lib/data';
import { supabase } from '@/lib/supabase/server';
import { isLocale, type Heritage, type Challenge } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Admin } from '@/components/admin';
import { AuthGate } from '@/components/auth-gate';
export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const viewer = await getViewer();
  if (!viewer)
    return (
      <div className="container section">
        <AuthGate locale={locale} next={`/${locale}/admin`} />
      </div>
    );
  if (!viewer.admin) notFound();
  const db = await supabase();
  const [entries, challenges, reports, audit] = await Promise.all([
    db.from('heritage_entries').select('*').order('updated_at', { ascending: false }).limit(500),
    db.from('challenges').select('*').order('created_at', { ascending: false }).limit(200),
    db
      .from('content_reports')
      .select('id,entry_id,reason,status,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('audit_events')
      .select('id,actor_id,action,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (entries.error || challenges.error || reports.error || audit.error)
    throw new Error('ADMIN_LOAD_FAILED');
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <ShieldCheck size={17} /> THÁM VĂN
        </p>
        <h1>{t(locale, 'admin')}</h1>
        <p>{t(locale, 'adminIntro')}</p>
        <Link className="button secondary" href={`/${locale}/admin/commerce`}>
          {copy(
            locale,
            'Đơn hàng & yêu cầu hợp tác',
            'Orders & partnership inquiries',
            '订单与合作请求',
          )}
        </Link>
      </div>
      <Admin
        locale={locale}
        entries={entries.data as Heritage[]}
        challenges={challenges.data as Challenge[]}
        reports={reports.data}
        audit={audit.data}
      />
    </div>
  );
}
