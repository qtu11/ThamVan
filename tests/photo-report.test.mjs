import { it, expect } from 'vitest';
import { photoReport } from '../scripts/lib/photo-report.mjs';

it('escapes externally sourced names and credits and never embeds a missing image as a photograph', () => {
  const page = photoReport(
    [
      {
        id: 'HCM-0001',
        name: '<script>alert(1)</script>',
        address: '<b>Unsafe</b>',
        image: '/images/hcm-0001-test.jpg',
        source: 'javascript:alert(1)',
        attribution: { author: '<img src=x onerror=alert(1)>' },
      },
      { id: 'HCM-0002', name: 'Missing', image: null },
    ],
    { VerifiedImages: 0 },
    '2026-10-27',
  );
  expect(page).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(page).not.toContain('href="javascript:');
  expect(page).not.toContain('src="null"');
  expect(page).toContain('Cần duyệt trước khi xuất bản');
});
