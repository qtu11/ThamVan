import type { Locale } from './types';

export function copy(locale: Locale, vi: string, en: string, zh: string) {
  return locale === 'en' ? en : locale === 'zh' ? zh : vi;
}
export function money(value: number, locale: Locale = 'vi') {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}
