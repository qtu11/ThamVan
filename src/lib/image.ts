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
    .jpeg({ quality: 80 })
    .toBuffer();
}

/** Compact variant used for fast visual clue extraction on Step 1 before catalog grounding. */
export async function compactRecognitionImage(bytes: Uint8Array) {
  return sharp(Buffer.from(bytes), {
    limitInputPixels: 24_000_000,
    animated: false,
    failOn: 'error',
  })
    .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
}
