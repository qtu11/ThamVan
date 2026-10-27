import { z } from 'zod';
export const visionOutputSchema = z.object({
  observation: z.string().max(1500),
  candidates: z.array(z.object({ id: z.string().max(100), reason: z.string().max(800) })).max(3),
});
export function hasImageSignature(buffer: Uint8Array, type: string) {
  if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => buffer[i] === n);
  if (type === 'image/webp')
    return (
      String.fromCharCode(...buffer.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...buffer.slice(8, 12)) === 'WEBP'
    );
  return false;
}
export async function limitedBody(request: Pick<Request, 'headers' | 'body'>, max: number) {
  if (Number(request.headers.get('content-length')) > max) throw new Error('TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('EMPTY');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error('TOO_LARGE');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
