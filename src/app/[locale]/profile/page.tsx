import Link from 'next/link';
import { Award, ArrowUpRight } from 'lucide-react';
import { getViewer, getPersonalData, getChallenges, getAllMapPlaces } from '@/lib/data';
import { isLocale, kinds } from '@/lib/types';
import { t } from '@/lib/i18n';
import { ExplorerProfileHeader, Preferences, AccountControls } from '@/components/profile';
import { PersonalJourney } from '@/components/personal-journey';
import { hasGoogleAuth } from '@/lib/env';
import './profile.css';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const [viewer, personal, challenges, allEntries] = await Promise.all([
    getViewer(),
    getPersonalData(),
    getChallenges(),
    getAllMapPlaces(),
  ]);
  const safePersonal = viewer ? personal : null;
  const completed = safePersonal?.progress.filter((p) => p.completed_at) || [];
  const savedList = safePersonal?.saved || [];
  const savedIds = new Set(savedList.map((s) => s.entry_id));
  const savedEntries = allEntries.filter((e) => savedIds.has(e.id));
  const topicTotals = kinds
    .map((kind) => {
      const total = allEntries.filter((e) => e.kind === kind).length;
      const done = savedEntries.filter((e) => e.kind === kind).length;
      return { kind, done, total };
    })
    .filter((item) => item.total > 0);
  const visitedCount = savedList.filter((s) => s.visited_at).length;

  return (
    <div className="container section">
      <ExplorerProfileHeader
        locale={locale}
        viewer={viewer}
        completedCount={completed.length}
        savedCount={savedList.length}
        visitedCount={visitedCount}
        progress={safePersonal?.progress || []}
        topicTotals={topicTotals}
        savedEntries={savedEntries}
        savedRecords={savedList}
        challenges={challenges}
      />

      <PersonalJourney
        locale={locale}
        viewer={viewer}
        saved={savedList}
        progress={safePersonal?.progress || []}
        entries={savedEntries}
      />

      {safePersonal && challenges.length > 0 && (
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
