'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, Trophy, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { t } from '@/lib/i18n';
export function Welcome({ locale }: { locale: Locale }) {
  const router = useRouter(),
    [step, setStep] = useState(0),
    [consent, setConsent] = useState(false);
  function done(destination: string) {
    document.cookie = 'tv-onboarded=1;path=/;max-age=31536000;SameSite=Lax';
    router.push(destination);
  }
  return (
    <div className="welcome-card">
      <div className="welcome-symbol">
        {step === 0 ? (
          <Image src="/images/logo.png" alt="THÁM VĂN" width={100} height={120} />
        ) : step === 3 ? (
          <ShieldCheck size={64} />
        ) : step === 2 ? (
          <ShieldCheck size={64} />
        ) : (
          <Camera size={64} />
        )}
      </div>
      <span className="eyebrow">THÁM VĂN · 0{step + 1}/04</span>
      <h1>
        {t(
          locale,
          step === 0 ? 'welcome' : step === 1 ? 'camera' : step === 2 ? 'terms' : 'permissionTitle',
        )}
      </h1>
      <p>
        {t(
          locale,
          step === 0
            ? 'welcomeDesc'
            : step === 1
              ? 'cameraHint'
              : step === 2
                ? 'consent'
                : 'permissionDesc',
        )}
      </p>
      {step === 1 && (
        <div className="welcome-features">
          <span>
            <Camera />
            {t(locale, 'camera')}
          </span>
          <span>
            <MapPin />
            {t(locale, 'nearby')}
          </span>
          <span>
            <Trophy />
            {t(locale, 'challenges')}
          </span>
        </div>
      )}
      {step === 2 && (
        <>
          <div className="legal-links">
            <Link href={`/${locale}/terms`} target="_blank">
              {t(locale, 'terms')}
            </Link>
            <Link href={`/${locale}/privacy`} target="_blank">
              {t(locale, 'privacy')}
            </Link>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{t(locale, 'consent')}</span>
          </label>
        </>
      )}
      <div className="welcome-progress" aria-label={`${step + 1}/4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i === step ? 'current' : ''} />
        ))}
      </div>
      <div className="welcome-buttons">
        {step > 0 && (
          <button className="button secondary" onClick={() => setStep(step - 1)}>
            {t(locale, 'previous')}
          </button>
        )}
        {step < 3 ? (
          <button
            className="button"
            disabled={step === 2 && !consent}
            onClick={() => setStep(step + 1)}
          >
            {t(locale, 'next')}
            <ArrowRight size={17} />
          </button>
        ) : (
          <button className="button" onClick={() => done(`/${locale}/auth/register`)}>
            {t(locale, 'register')}
            <ArrowRight size={17} />
          </button>
        )}
      </div>
      <button className="text-link" onClick={() => done(`/${locale}`)}>
        {t(locale, 'skip')}
      </button>
    </div>
  );
}
