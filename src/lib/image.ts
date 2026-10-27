import sharp from 'sharp';
// Decode with a pixel ceiling and re-encode without EXIF/GPS or other source metadata.
export async function normalizeRecognitionImage(bytes: Uint8Array) {
  return sharp(Buffer.from(bytes), {
    limitInputPixels: 24_000_000,
    animated: false,
    failOn: 'error',
  })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}
