import { Trophy } from 'lucide-react';
import { getCatalog, getChallenges, getPersonalData, getViewer } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { ChallengeList } from '@/components/challenge-list';
export default async function Challenges({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const [entries, challenges, personal, viewer] = await Promise.all([
    getCatalog(),
    getChallenges(),
    getPersonalData(),
    getViewer(),
  ]);
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">
          <Trophy size={16} /> {t(locale, 'challengeLabel')}
        </p>
        <h1>{t(locale, 'challenges')}</h1>
        <p>{t(locale, 'challengeIntro')}</p>
      </div>
      <ChallengeList
        challenges={challenges}
        entries={entries}
        locale={locale}
        progress={personal.progress}
        signedIn={!!viewer}
      />
      <p className="help-text section">{t(locale, 'pointNote')}</p>
    </div>
  );
}
