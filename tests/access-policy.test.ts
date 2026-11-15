import { it, expect } from 'vitest';
import { isPublicPath, isApiPath, loginRedirectPath } from '@/lib/access-policy';

it('identifies public pages correctly', () => {
  expect(isPublicPath('/')).toBe(true);
  expect(isPublicPath('/vi/auth/login')).toBe(true);
  expect(isPublicPath('/en/auth/register')).toBe(true);
  expect(isPublicPath('/zh/auth/forgot')).toBe(true);
  expect(isPublicPath('/vi/auth/reset')).toBe(true);
  expect(isPublicPath('/vi/terms')).toBe(true);
  expect(isPublicPath('/en/privacy')).toBe(true);
  expect(isPublicPath('/zh/credits')).toBe(true);
  expect(isPublicPath('/auth/callback')).toBe(true);
  expect(isPublicPath('/auth/confirm')).toBe(true);
  expect(isPublicPath('/auth/google/callback')).toBe(true);
  expect(isPublicPath('/manifest.webmanifest')).toBe(true);
  expect(isPublicPath('/robots.txt')).toBe(true);
  expect(isPublicPath('/favicon.ico')).toBe(true);
  expect(isPublicPath('/images/logo.png')).toBe(true);
  expect(isPublicPath('/_next/static/chunk.js')).toBe(true);
});

it('blocks protected pages when unauthenticated', () => {
  expect(isPublicPath('/vi')).toBe(false);
  expect(isPublicPath('/en')).toBe(false);
  expect(isPublicPath('/zh')).toBe(false);
  expect(isPublicPath('/vi/map')).toBe(false);
  expect(isPublicPath('/vi/explore')).toBe(false);
  expect(isPublicPath('/vi/camera')).toBe(false);
  expect(isPublicPath('/vi/challenges')).toBe(false);
  expect(isPublicPath('/vi/journey')).toBe(false);
  expect(isPublicPath('/vi/profile')).toBe(false);
  expect(isPublicPath('/vi/admin')).toBe(false);
  expect(isPublicPath('/vi/welcome')).toBe(false);
  expect(isPublicPath('/vi/checkout')).toBe(false);
});

it('protects API endpoints and permits only public ones', () => {
  expect(isApiPath('/api/auth')).toBe(true);
  expect(isApiPath('/api/tiles/1/2/3')).toBe(true);
  expect(isApiPath('/vi/map')).toBe(false);

  expect(isPublicPath('/api/auth')).toBe(true);
  expect(isPublicPath('/api/auth/google')).toBe(true);
  expect(isPublicPath('/api/captcha')).toBe(true);
  expect(isPublicPath('/api/payments/payos')).toBe(true);
  expect(isPublicPath('/api/payments/sepay')).toBe(true);

  expect(isPublicPath('/api/assistant')).toBe(false);
  expect(isPublicPath('/api/locate')).toBe(false);
  expect(isPublicPath('/api/nearby')).toBe(false);
  expect(isPublicPath('/api/route')).toBe(false);
  expect(isPublicPath('/api/saved')).toBe(false);
  expect(isPublicPath('/api/profile')).toBe(false);
  expect(isPublicPath('/api/account/delete')).toBe(false);
  expect(isPublicPath('/api/admin')).toBe(false);
});

it('rejects path traversal or malicious encoding attacks', () => {
  expect(isPublicPath('/vi/auth/login/../../admin')).toBe(false);
  expect(isPublicPath('/vi/terms//admin')).toBe(false);
  expect(isPublicPath('/api/auth/%2e%2e/assistant')).toBe(false);
});

it('builds clean login redirect URLs', () => {
  expect(loginRedirectPath('/vi/map', '')).toBe('/vi/auth/login?next=%2Fvi%2Fmap');
  expect(loginRedirectPath('/en/profile', '?tab=security')).toBe('/en/auth/login?next=%2Fen%2Fprofile%3Ftab%3Dsecurity');
  expect(loginRedirectPath('/vi', '')).toBe('/vi/auth/login');
  expect(loginRedirectPath('/', '', 'zh')).toBe('/zh/auth/login');
});
