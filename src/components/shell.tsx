'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Compass,
  Map,
  Route,
  UserRound,
  Globe,
  ArrowUpRight,
  Menu,
  X,
  WifiOff,
  Building2,
  Home,
  Trophy,
  Camera,
} from 'lucide-react';
import { t, localeName } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { locales, type Locale } from '@/lib/types';
import { SecurityGuard } from './security-guard';
import { Chatbot } from './chatbot';
import { NearbyAlerts } from './nearby-alerts';

export type PartnerRole = 'team' | 'school' | 'hotel' | '';

function subscribePartnerRole(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('tv-partner-role-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('tv-partner-role-change', callback);
  };
}

function getPartnerRoleSnapshot(): PartnerRole {
  try {
    const stored = localStorage.getItem('tv-partner-role') as PartnerRole | null;
    return stored && ['team', 'school', 'hotel'].includes(stored) ? stored : '';
  } catch {
    return '';
  }
}

export function Shell({
  locale,
  signedIn,
  isAdmin = false,
  children,
}: {
  locale: Locale;
  signedIn: boolean;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter(),
    params = useSearchParams();
  const [menu, setMenu] = useState(false),
    [offline, setOffline] = useState(false);
  const partnerRole = useSyncExternalStore(
    subscribePartnerRole,
    getPartnerRoleSnapshot,
    () => '' as PartnerRole,
  );
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);

  const dashboardHref = isAdmin ? '/admin/dashboard' : '/dashboard';
  const dashboardLabel = isAdmin
    ? c('Dashboard (Quản trị)', 'Dashboard (Admin)', '控制台（管理）')
    : partnerRole === 'team'
      ? c('Dashboard (Doanh nghiệp)', 'Dashboard (Business)', '控制台 (企业)')
      : partnerRole === 'school'
        ? c('Dashboard (Giáo dục)', 'Dashboard (Education)', '控制台 (教育)')
        : partnerRole === 'hotel'
          ? c('Dashboard (Lưu trú)', 'Dashboard (Hospitality)', '控制台 (酒店)')
          : 'Dashboard';

  const links = [
    {
      label: c('Khám phá', 'Explore', '探索'),
      to: '/explore',
      Icon: Compass,
      children: [
        { label: t(locale, 'listView'), to: '/explore', Icon: Compass },
        { label: t(locale, 'mapView'), to: '/map', Icon: Map },
      ],
    },
    {
      label: c('Hành trình trải nghiệm', 'Story walks', '故事漫步'),
      to: '/experiences',
      Icon: Route,
    },
    { label: t(locale, 'challenges'), to: '/challenges', Icon: Trophy },
    { label: c('Cho doanh nghiệp', 'For business', '企业合作'), to: '/partners', Icon: Building2 },
  ];
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  function changeLanguage(value: string) {
    document.cookie = `tv-locale=${value};path=/;max-age=31536000;SameSite=Lax`;
    setMenu(false);
    router.push(`/${value}${path.slice(3)}${params.size ? `?${params.toString()}` : ''}`);
    router.refresh();
  }
  const isActive = (to: string) =>
    path === `/${locale}${to}` || (!!to && path.startsWith(`/${locale}${to}/`));
  return (
    <>
      <SecurityGuard />
      <NearbyAlerts locale={locale} />
      <a className="skip-link" href="#content">
        {c('Đến nội dung chính', 'Skip to content', '跳到主内容')}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link
            href={`/${locale}`}
            className="brand"
            aria-label={`THÁM VĂN · ${t(locale, 'home')}`}
          >
            <Image
              src="/images/logo.png"
              alt=""
              width={34}
              height={40}
              style={{ height: 'auto' }}
              className="brand-logo-image"
            />
            <span>
              THÁM VĂN
              <small>
                {c('SỔ TAY THỰC ĐỊA SÀI GÒN', 'SAIGON HERITAGE FIELD-GUIDE', '西贡城市遗产手记')}
              </small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label={t(locale, 'explore')}>
            {links.map(({ label, to, children }) => (
              <div key={to} className={`nav-item ${children ? 'has-children' : ''}`}>
                <Link
                  className={isActive(to) ? 'active' : ''}
                  aria-current={isActive(to) ? 'page' : undefined}
                  href={`/${locale}${to}`}
                >
                  {label}
                </Link>
                {children && (
                  <div className="nav-submenu">
                    {children.map((child) => (
                      <Link
                        key={child.to}
                        href={`/${locale}${child.to}`}
                        className={isActive(child.to) ? 'active' : ''}
                        aria-current={isActive(child.to) ? 'page' : undefined}
                      >
                        <child.Icon size={14} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="header-actions">
            <label className="language">
              <Globe size={14} />
              <span className="sr-only">{t(locale, 'language')}</span>
              <select value={locale} onChange={(event) => changeLanguage(event.target.value)}>
                {locales.map((value) => (
                  <option key={value} value={value}>
                    {localeName[value]}
                  </option>
                ))}
              </select>
            </label>
            <Link
              className="button small header-login"
              href={`/${locale}/${signedIn || partnerRole ? dashboardHref.replace(/^\//, '') : 'auth/login'}`}
            >
              {(signedIn || partnerRole) && <UserRound size={15} />}
              {signedIn || partnerRole ? dashboardLabel : t(locale, 'login')}
              <ArrowUpRight size={13} />
            </Link>
            <button
              className="icon-button menu-toggle"
              aria-label={
                menu
                  ? c('Đóng menu', 'Close menu', '关闭菜单')
                  : c('Mở menu', 'Open menu', '打开菜单')
              }
              aria-expanded={menu}
              aria-controls="mobile-navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav
            className="mobile-menu"
            id="mobile-navigation"
            aria-label={c('Điều hướng di động', 'Mobile navigation', '移动导航')}
          >
            {[
              { label: t(locale, 'home'), to: '', Icon: Home },
              { label: c('Khám phá', 'Explore', '探索'), to: '/explore', Icon: Compass },
              {
                label: c('Hành trình trải nghiệm', 'Story walks', '故事漫步'),
                to: '/experiences',
                Icon: Route,
              },
              { label: t(locale, 'challenges'), to: '/challenges', Icon: Trophy },
              {
                label: c('Cho doanh nghiệp', 'For business', '企业合作'),
                to: '/partners',
                Icon: Building2,
              },
              {
                label: t(locale, 'profile'),
                to: '/profile',
                Icon: UserRound,
              },
            ].map(({ label, to, Icon }) => (
              <Link key={to} href={`/${locale}${to}`} onClick={() => setMenu(false)}>
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      {offline && (
        <div className="offline" role="status">
          <WifiOff size={16} />
          {t(locale, 'offline')}
        </div>
      )}
      <main id="content">{children}</main>
      <footer className="site-footer">
        <div className="footer-top">
          <Link href={`/${locale}`} className="brand">
            <Image
              src="/images/logo.png"
              width={34}
              height={40}
              alt=""
              style={{ height: 'auto' }}
              className="brand-logo-image"
            />
            <span>
              THÁM VĂN
              <small>
                {c(
                  'Những hành trình nhỏ. Một kết nối sâu hơn với thành phố.',
                  'Small walks. A deeper connection to the city.',
                  '小小漫步，与城市更深地连接。',
                )}
              </small>
            </span>
          </Link>
          <div className="footer-offers">
            <Link href={`/${locale}/experiences`}>
              {c('Hành trình trải nghiệm', 'Story walks', '故事漫步')}
            </Link>
            <Link href={`/${locale}/partners`}>{c('Hợp tác', 'Partnerships', '合作')}</Link>
            <Link href={`/${locale}/journey`}>{c('Đã lưu', 'Saved places', '收藏地点')}</Link>
            {!path.startsWith(`/${locale}/auth`) && <Chatbot locale={locale} />}
          </div>
          <Link href={`/${locale}/experiences`}>
            {c('Mở bản đồ hành trình', 'Browse story walks', '探索城市漫步')}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} THÁM VĂN ·{' '}
            {c('ẤN PHẨM THỰC ĐỊA SÀI GÒN', 'SAIGON HERITAGE FIELD-GUIDE', '西贡文化遗产图文手记')}
          </span>
          <div>
            <Link href={`/${locale}/terms`}>{t(locale, 'terms')}</Link>
            <Link href={`/${locale}/privacy`}>{t(locale, 'privacy')}</Link>
            <Link href={`/${locale}/credits`}>{t(locale, 'credits')}</Link>
          </div>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label={t(locale, 'home')}>
        {[
          { label: t(locale, 'home'), to: '', Icon: Home },
          { label: c('Khám phá', 'Explore', '探索'), to: '/explore', Icon: Compass },
          {
            label: t(locale, 'cameraShort'),
            to: '/camera',
            Icon: Camera,
            featured: true,
          },
          { label: t(locale, 'challenges'), to: '/challenges', Icon: Trophy },
          { label: t(locale, 'profile'), to: '/profile', Icon: UserRound },
        ].map(({ label, to, Icon, featured }) => (
          <Link
            key={to}
            href={`/${locale}${to}`}
            className={`${isActive(to) ? 'active' : ''} ${featured ? 'bottom-nav-featured' : ''}`}
            aria-current={isActive(to) ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">
              <Icon size={featured ? 24 : 20} />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
