'use client';
import '@/lib/abort-polyfill';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Compass, MapPin, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';
import {
  answerAssistantQuery,
  defaultQuickPrompts,
  type AssistantActionLink,
  type AssistantPlaceMatch,
  type AssistantReply,
} from '@/lib/chatbot-knowledge';

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
  places?: AssistantPlaceMatch[];
  links?: AssistantActionLink[];
  followUps?: string[];
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  borderRadius: 999,
  border: '1px solid rgba(15, 43, 35, 0.16)',
  background: '#ffffff',
  color: '#0f2b23',
  fontSize: '0.78rem',
  lineHeight: 1.3,
  cursor: 'pointer',
  textAlign: 'left',
  textDecoration: 'none',
};

const placeCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  marginTop: 8,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(15, 43, 35, 0.14)',
  background: '#faf8f3',
  fontSize: '0.82rem',
};

export function Chatbot({ locale }: { locale: Locale }) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'intro',
      role: 'bot',
      text: t(locale, 'chatbotIntro'),
      followUps: defaultQuickPrompts(locale),
      links: [
        { label: t(locale, 'explore'), href: `/${locale}/explore` },
        { label: t(locale, 'mapView'), href: `/${locale}/map` },
        { label: t(locale, 'challenges'), href: `/${locale}/challenges` },
      ],
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    return () => {
      fetchControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function ask(rawText: string) {
    const text = rawText.trim().slice(0, 160);
    if (!text) return;

    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    const userId = `u-${++seqRef.current}`;
    const botId = `b-${++seqRef.current}`;
    const localReply = answerAssistantQuery(text, locale);

    setMessages((current) => [
      ...current,
      { id: userId, role: 'user', text },
      {
        id: botId,
        role: 'bot',
        text: localReply.text,
        places: localReply.places,
        links: localReply.links,
        followUps: localReply.followUps,
      },
    ]);
    setQuery('');

    // Enrich seamlessly from the full 1,426+ Saigon server archive without bloating client bundle
    void fetch(`/api/assistant?q=${encodeURIComponent(text)}&locale=${encodeURIComponent(locale)}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as AssistantReply;
      })
      .then((serverReply) => {
        if (!serverReply || controller.signal.aborted || !serverReply.text) return;
        setMessages((current) =>
          current.map((msg) =>
            msg.id === botId
              ? {
                  ...msg,
                  text: serverReply.text,
                  places: serverReply.places,
                  links: serverReply.links,
                  followUps: serverReply.followUps,
                }
              : msg,
          ),
        );
      })
      .catch(() => {
        // Keep synchronous local editorial response on offline/timeout
      });
  }

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(query);
  }

  return (
    <>
      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="chatbot-panel"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        <span>{t(locale, 'chatbot')}</span>
      </button>

      {open && (
        <section className="chatbot-panel" id="chatbot-panel" aria-label={t(locale, 'chatbotTitle')}>
          <header>
            <span className="chatbot-avatar" aria-hidden="true">
              <BookOpen size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <strong>{t(locale, 'chatbotTitle')}</strong>
              <small>{t(locale, 'chatbotDisclaimer')}</small>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={c('Đóng sổ tay hỏi đáp', 'Close field desk', '关闭服务台')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </header>

          <div className="chatbot-messages" ref={listRef}>
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-message ${message.role}`}>
                <span style={{ display: 'block' }}>{message.text}</span>

                {message.role === 'bot' && message.places && message.places.length > 0 && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                    {message.places.map((place) => (
                      <div key={place.slug} style={placeCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                          <strong style={{ fontSize: '0.84rem' }}>{place.name}</strong>
                          <span style={{ opacity: 0.72, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {place.region}
                          </span>
                        </div>
                        {place.address && (
                          <span style={{ opacity: 0.78, fontSize: '0.76rem' }}>{place.address}</span>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
                          <Link
                            href={place.href}
                            onClick={() => setOpen(false)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontWeight: 600,
                              color: '#8f3f27',
                            }}
                          >
                            {c('Đọc hồ sơ', 'Read story', '阅读档案')}
                            <ArrowUpRight size={13} />
                          </Link>
                          <Link
                            href={place.mapHref}
                            onClick={() => setOpen(false)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontWeight: 600,
                              color: '#0f2b23',
                            }}
                          >
                            <MapPin size={12} />
                            {c('Xem bản đồ', 'Open map', '打开地图')}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {message.role === 'bot' && message.links && message.links.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {message.links.map((link) => (
                      <Link
                        key={`${message.id}-${link.href}`}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        style={chipStyle}
                      >
                        <Compass size={12} />
                        <span>{link.label}</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    ))}
                  </div>
                )}

                {message.role === 'bot' && message.followUps && message.followUps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {message.followUps.map((promptText) => (
                      <button
                        key={`${message.id}-${promptText}`}
                        type="button"
                        onClick={() => ask(promptText)}
                        style={{
                          ...chipStyle,
                          background: 'rgba(15, 43, 35, 0.05)',
                        }}
                      >
                        <Sparkles size={11} />
                        <span>{promptText}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form className="chatbot-form" onSubmit={send}>
            <label className="sr-only" htmlFor="chatbot-input">
              {t(locale, 'chatbotPlaceholder')}
            </label>
            <input
              id="chatbot-input"
              type="search"
              maxLength={160}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(locale, 'chatbotPlaceholder')}
            />
            <button type="submit" aria-label={t(locale, 'chatbotSend')}>
              <Send size={17} />
            </button>
          </form>

          <p className="chatbot-links">
            <Link href={`/${locale}/challenges`} onClick={() => setOpen(false)}>
              {t(locale, 'challenges')}
            </Link>
            <Link href={`/${locale}/map`} onClick={() => setOpen(false)}>
              {t(locale, 'mapView')}
            </Link>
            <Link href={`/${locale}/camera`} onClick={() => setOpen(false)}>
              {t(locale, 'camera')}
            </Link>
            <Link href={`/${locale}/experiences`} onClick={() => setOpen(false)}>
              Story Walks
            </Link>
          </p>
        </section>
      )}
    </>
  );
}
