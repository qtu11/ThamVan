import { notFound, redirect } from 'next/navigation';
import { AdminDashboard, type AdminWorkspace } from '@/components/dashboard/admin-dashboard';
import { getViewer } from '@/lib/data';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { isLocale } from '@/lib/types';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale: raw } = await params;
  const query = await searchParams;
  const tab = [
    'overview',
    'orders',
    'customers',
    'moderation',
    'expenses',
    'plans',
    'audit',
  ].includes(query.tab || '')
    ? query.tab
    : 'overview';
  const locale = isLocale(raw) ? raw : 'vi';
  if (!hasSupabase())
    return <AdminDashboard locale={locale} data={null} preview initialTab={tab} />;
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/auth/login?next=/${locale}/admin/dashboard`);
  if (!viewer.admin) notFound();
  const db = await supabase();
  const result = await db.rpc('admin_workspace');
  return (
    <AdminDashboard
      locale={locale}
      data={result.error ? null : (result.data as AdminWorkspace)}
      initialTab={tab}
    />
  );
}
