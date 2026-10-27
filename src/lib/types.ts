export const locales = ['vi', 'en', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const kinds = ['monument', 'architecture', 'nature', 'craft', 'symbol', 'festival'] as const;
export type Kind = (typeof kinds)[number];
export type Translation = { summary: string; story: string; detail: string };
export type Source = { title: string; url: string; publisher: string; accessed: string };
export type Heritage = {
  id: string;
  slug: string;
  name: string;
  kind: Kind;
  region: string;
  translations: Record<Locale, Translation>;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  image_author: string;
  image_license: string;
  image_source: string | null;
  sources: Source[];
  status: 'draft' | 'published' | 'archived';
  verification: 'reference' | 'reviewed';
  updated_at: string;
  category?: string;
  categoryGroup?: string;
  address?: string;
  aliases?: string[];
  hasGps?: boolean;
  hasImage?: boolean;
  description?: string;
  history?: string;
  referenceUrl?: string;
};
export type ChallengeText = {
  title: string;
  description: string;
  question: string;
  options: string[];
};
export type Challenge = {
  id: string;
  entry_id: string;
  translations: Record<Locale, ChallengeText>;
  points: number;
  badge: string;
  status: string;
  expires_at: string | null;
};
export type Profile = {
  id: string;
  display_name: string;
  locale: Locale;
  radius_km: number;
  notifications: boolean;
  terms_version: string | null;
  consented_at: string | null;
};
export type Saved = {
  entry_id: string;
  collection: string;
  saved_at: string;
  visited_at: string | null;
};
export type Progress = {
  challenge_id: string;
  joined_at: string;
  completed_at: string | null;
  awarded_points: number;
};
export type Viewer = {
  id: string;
  email: string;
  profile: Profile;
  admin: boolean;
  acceptedTerms: boolean;
  providers: string[];
};
export const isLocale = (v: string): v is Locale => locales.includes(v as Locale);
export function textFor<T>(translations: Partial<Record<Locale, T>>, locale: Locale): T {
  return (translations[locale] ?? translations.vi) as T;
}
