import Link from 'next/link';
import { headers } from 'next/headers';
import { UserRound, Award, Bookmark, Trophy, ArrowUpRight } from 'lucide-react';
import { getViewer, getPersonalData, getChallenges } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Preferences, AccountControls } from '@/components/profile';
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
      <div className="page-heading">
        <p className="eyebrow">
          <UserRound size={16} /> THÁM VĂN EXPLORER
        </p>
        <h1>{viewer?.profile.display_name || t(locale, 'profile')}</h1>
        <p>{viewer ? viewer.email : t(locale, 'profileIntro')}</p>
      </div>
      {personal ? (
        <>
          <div className="profile-stats">
            <div>
              <Bookmark size={22} />
              <strong>{personal.saved.length}</strong>
              <span>{t(locale, 'savedPlaces')}</span>
            </div>
            <div>
              <Trophy size={22} />
              <strong>{completed.reduce((n, p) => n + p.awarded_points, 0)}</strong>
              <span>{t(locale, 'points')}</span>
            </div>
            <div>
              <Award size={22} />
              <strong>{completed.length}</strong>
              <span>{t(locale, 'badge')}</span>
            </div>
          </div>
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
        </>
      ) : (
        <div className="guest-profile">
          <p>{t(locale, 'authRequired')}</p>
          <Link className="button" href={`/${locale}/auth/login`}>
            {t(locale, 'login')}
            <ArrowUpRight size={17} />
          </Link>
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
