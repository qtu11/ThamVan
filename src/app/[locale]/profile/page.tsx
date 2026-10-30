import Link from 'next/link';
import { headers } from 'next/headers';
import { Award, ArrowUpRight } from 'lucide-react';
import { getViewer, getPersonalData, getChallenges } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { ExplorerProfileHeader, Preferences, AccountControls } from '@/components/profile';
import { hasGoogleAuth } from '@/lib/env';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const viewer = await getViewer();
  const personal = viewer ? await getPersonalData() : null;
  const challenges = viewer ? await getChallenges() : [];
  const completed = personal?.progress.filter((p) => p.completed_at) || [];
  return (
    <div className="container section">
      <ExplorerProfileHeader
        locale={locale}
        viewer={viewer}
        completedCount={completed.length}
        savedCount={personal?.saved.length || 0}
      />

      {personal && challenges.length > 0 && (
        <div className="badge-collection">
          {challenges.map((c) => {
            const earned = completed.some((p) => p.challenge_id === c.id);
            return (
              <Link
                className={`badge-token ${earned ? 'earned' : ''}`}
                href={`/${locale}/challenges#${c.id}`}
                key={c.id}
              >
                <Award size={34} />
                <strong>{c.badge}</strong>
                <small>{t(locale, earned ? 'completed' : 'challengeLabel')}</small>
              </Link>
            );
          })}
        </div>
      )}

      <div className="settings-grid">
        <Preferences locale={locale} viewer={viewer} />
        <div>
          {viewer && (
            <AccountControls
              locale={locale}
              viewer={viewer}
              googleEnabled={hasGoogleAuth()}
              nonce={(await headers()).get('x-nonce') || undefined}
            />
          )}
          <section className="settings-card">
            <h2>THÁM VĂN</h2>
            <div className="account-links">
              <Link href={`/${locale}/terms`}>
                {t(locale, 'terms')}
                <ArrowUpRight size={16} />
              </Link>
              <Link href={`/${locale}/privacy`}>
                {t(locale, 'privacy')}
                <ArrowUpRight size={16} />
              </Link>
              <Link href={`/${locale}/credits`}>
                {t(locale, 'credits')}
                <ArrowUpRight size={16} />
              </Link>
              <Link href={`/${locale}/welcome`}>
                {t(locale, 'welcome')}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
