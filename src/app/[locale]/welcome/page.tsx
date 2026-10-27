import { isLocale } from '@/lib/types';
import { Welcome } from '@/components/welcome';
export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="container welcome-page">
      <Welcome locale={isLocale(locale) ? locale : 'vi'} />
    </div>
  );
}
