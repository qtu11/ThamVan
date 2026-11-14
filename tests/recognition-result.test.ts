import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, writeFile } from 'node:fs/promises';
vi.mock('server-only', () => ({}));
import { RecognitionResultView } from '@/components/recognition-result';
import { finalizeRecognition } from '@/lib/recognition';
import { catalog } from '@/data/catalog';

it('renders a GPS-conflict result with real catalog sources and an inspectable UI fixture', async () => {
  const entry = catalog[0];
  const result = finalizeRecognition(
    {
      observation: 'Mái ngói đỏ và cổng có họa tiết trang trí.',
      candidates: [
        {
          id: entry.id,
          reason: 'Đặc điểm kiến trúc tương đồng; cần đối chiếu thêm biển tên.',
          evidence: ['Mái ngói và cổng có họa tiết'],
        },
      ],
      objects: [
        {
          name: 'Cổng trang trí',
          description: 'Mái ngói đỏ, các chi tiết đối xứng.',
          culturalContext: null,
          placeId: entry.id,
        },
      ],
      limitations: ['Ảnh có thể đã được chụp ở thời điểm khác.'],
    },
    { observation: 'Cổng', visibleText: [], searchHints: [] },
    [entry],
    {
      source: 'device',
      latitude: 21.03,
      longitude: 105.85,
      accuracy: 15,
      timestamp: Date.now(),
    },
  );
  const markup = renderToStaticMarkup(
    createElement(RecognitionResultView, { result, locale: 'vi' }),
  );
  expect(markup).toContain('Ảnh và vị trí hiện tại chưa khớp');
  expect(markup).toContain('Cổng trang trí');
  expect(markup).toContain(entry.sources[0].url);
  expect(markup).not.toContain('undefined');
  const directory = 'docs/verification/recognition-2026-10-31';
  await mkdir(directory, { recursive: true });
  await writeFile(
    `${directory}/result-fixture.html`,
    `<!-- Deterministic test fixture, not a live AI result. -->\n${markup}`,
    'utf8',
  );
});
