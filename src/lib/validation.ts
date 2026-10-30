import { z } from 'zod';
import { kinds, locales } from './types';
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-zA-Z]/)
  .regex(/[0-9]/);
export const authSchema = z.object({
  email: z.email().max(254),
  password: z.string().max(128).optional(),
  display_name: z.string().trim().min(2).max(80).optional(),
  consent: z.boolean().optional(),
  locale: z.enum(locales),
  next: z.string().max(500).optional(),
  captcha: z.string().max(2048).optional(),
});
export const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  locale: z.enum(locales),
  radius_km: z.number().int().min(3).max(10),
  notifications: z.boolean(),
});
export const savedSchema = z.object({
  entry_id: z.union([z.uuid(), z.string().regex(/^HCM-[A-Z0-9-]{1,80}$/)]),
  collection: z.string().trim().max(80).optional(),
  visited: z.boolean().optional(),
});
const translationSchema = z.object({
  summary: z.string().trim().min(10).max(1200),
  story: z.string().trim().min(10).max(10000),
  detail: z.string().trim().min(5).max(4000),
});
const isHttps = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
};
const httpsUrl = z.url().max(1000).refine(isHttps);
const safeImage = (v: string) => {
  if (!v || /^\/images\/[a-z0-9.-]+$/i.test(v)) return true;
  try {
    return (
      isHttps(v) &&
      new URL(v).hostname ===
        new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfigured.invalid').hostname
    );
  } catch {
    return false;
  }
};
export const heritageSchema = z
  .object({
    id: z.union([z.uuid(), z.string().regex(/^[A-Za-z0-9-]+$/)]).optional(),
    slug: z
      .string()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().trim().min(2).max(160),
    kind: z.enum(kinds),
    region: z.string().trim().min(1).max(100),
    translations: z.object({ vi: translationSchema, en: translationSchema, zh: translationSchema }),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    image: z.string().max(1000).refine(safeImage).nullable(),
    image_author: z.string().max(500),
    image_license: z.string().max(100),
    image_source: httpsUrl.nullable(),
    sources: z
      .array(
        z.object({
          title: z.string().min(1).max(200),
          url: httpsUrl,
          publisher: z.string().min(1).max(100),
          accessed: z.iso.date(),
        }),
      )
      .min(1)
      .max(20),
    status: z.enum(['draft', 'published', 'archived']),
    verification: z.enum(['reference', 'reviewed']),
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null))
  .refine((v) => !v.image || Boolean(v.image_author && v.image_license && v.image_source));
const challengeText = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(1000),
  question: z.string().min(5).max(500),
  options: z.array(z.string().min(1).max(300)).length(4),
});
export const challengeSchema = z.object({
  id: z.uuid().optional(),
  entry_id: z.union([z.uuid(), z.string().regex(/^[A-Za-z0-9-]+$/)]),
  translations: z.object({ vi: challengeText, en: challengeText, zh: challengeText }),
  points: z.number().int().min(1).max(100),
  badge: z.string().min(1).max(80),
  status: z.enum(['draft', 'published', 'archived']),
  expires_at: z.iso.datetime({ offset: true }).nullable(),
  correct_option: z.number().int().min(0).max(3),
});
