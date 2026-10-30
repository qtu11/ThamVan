import { z } from 'zod';
export const itineraryInput = z.object({
  days: z.number().int().min(1).max(7),
  hours: z.number().int().min(2).max(10),
  region: z.string().trim().min(2).max(80),
  interests: z
    .array(z.enum(['monument', 'architecture', 'nature', 'craft', 'symbol', 'festival']))
    .min(1)
    .max(6),
  pace: z.enum(['relaxed', 'balanced', 'active']),
  locale: z.enum(['vi', 'en', 'zh']),
});
export const itineraryOutput = z.object({
  title: z.string().min(3).max(150),
  days: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        stops: z
          .array(
            z.object({
              slug: z.string().max(100),
              time: z.string().regex(/^(0[6-9]|1[0-9]|20):[0-5]\d$/),
              minutes: z.number().int().min(15).max(180),
              reason: z.string().min(5).max(500),
            }),
          )
          .min(1)
          .max(8),
      }),
    )
    .min(1)
    .max(7),
});
export function validateItinerary(value: unknown, slugs: Set<string>, days: number, hours: number) {
  const parsed = itineraryOutput.parse(value);
  if (parsed.days.length !== days) throw new Error('INVALID_DAY_COUNT');
  const seen = new Set<string>();
  for (const [index, day] of parsed.days.entries()) {
    if (day.day !== index + 1) throw new Error('INVALID_DAY_ORDER');
    let end = 0;
    let first = 0;
    for (const [stopIndex, stop] of day.stops.entries()) {
      if (!slugs.has(stop.slug) || seen.has(stop.slug)) throw new Error('INVALID_PLACE');
      seen.add(stop.slug);
      const [h, m] = stop.time.split(':').map(Number);
      const start = h * 60 + m;
      if (!stopIndex) first = start;
      if (start < end) throw new Error('OVERLAPPING_STOPS');
      end = start + stop.minutes;
    }
    if (end - first > hours * 60) throw new Error('DAY_TOO_LONG');
  }
  return parsed;
}
