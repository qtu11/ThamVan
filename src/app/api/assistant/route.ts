import { NextResponse } from 'next/server';
import { getCatalog, getHcmPlacesData } from '@/lib/data';
import { isLocale, type Locale } from '@/lib/types';
import {
  answerAssistantQuery,
  heritageToAssistantItem,
  type AssistantCatalogItem,
} from '@/lib/chatbot-knowledge';

export const dynamic = 'force-dynamic';

let cachedItems: AssistantCatalogItem[] | null = null;

async function getAssistantItems() {
  if (cachedItems && cachedItems.length > 0) return cachedItems;
  let catalog;
  try {
    catalog = await getCatalog();
  } catch {
    catalog = await getHcmPlacesData();
  }
  const mapped = catalog.map(heritageToAssistantItem);
  if (mapped.length > 0) cachedItems = mapped;
  return mapped;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLocale = searchParams.get('locale') || 'vi';
    const locale: Locale = isLocale(rawLocale) ? rawLocale : 'vi';
    const query = (searchParams.get('q') || '').trim().slice(0, 160);
    if (!query) {
      return NextResponse.json({ error: 'EMPTY_QUERY' }, { status: 400 });
    }
    const items = await getAssistantItems();
    const reply = answerAssistantQuery(query, locale, items);
    return NextResponse.json(reply, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return NextResponse.json({ error: 'ASSISTANT_UNAVAILABLE' }, { status: 500 });
  }
}
