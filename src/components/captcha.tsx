'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export function Captcha({ onToken, nonce }: { onToken: (token: string) => void; nonce?: string }) {
  const container = useRef<HTMLDivElement>(null),
    callback = useRef(onToken),
    [ready, setReady] = useState(false);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!ready || !container.current || !window.turnstile) return;
    const id = window.turnstile.render(container.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      callback: (token: string) => callback.current(token),
      'expired-callback': () => callback.current(''),
      'error-callback': () => callback.current(''),
    });
    return () => window.turnstile?.remove(id);
  }, [ready]);
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        nonce={nonce}
        onReady={() => setReady(true)}
      />
      <div className="captcha" ref={container} />
    </>
  );
}
