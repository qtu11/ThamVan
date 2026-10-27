import { it, expect } from 'vitest';
import sharp from 'sharp';
import { normalizeRecognitionImage } from '@/lib/image';
it('decodes images, bounds dimensions, and strips original metadata', async () => {
  const input = await sharp({
    create: { width: 1800, height: 100, channels: 3, background: 'green' },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: 'private metadata' } })
    .toBuffer();
  expect((await sharp(input).metadata()).exif).toBeDefined();
  const output = await normalizeRecognitionImage(input);
  const metadata = await sharp(output).metadata();
  expect(metadata.format).toBe('jpeg');
  expect(metadata.width).toBe(1600);
  expect(metadata.exif).toBeUndefined();
});
it('rejects a spoofed image body without contacting an AI provider', async () => {
  await expect(
    normalizeRecognitionImage(new TextEncoder().encode('<script>bad</script>')),
  ).rejects.toThrow();
});
