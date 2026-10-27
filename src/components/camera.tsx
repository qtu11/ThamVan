'use client';
/* eslint-disable @next/next/no-img-element -- User-selected blob previews must stay local. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Upload, ScanLine, X, ArrowUpRight } from 'lucide-react';
import type { Heritage, Locale } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Photo, Status, errorText } from './ui';
type Result = { observation: string; candidates: { id: string; reason: string }[] };
export function CameraExplorer({
  locale,
  available,
  signedIn,
  entries,
}: {
  locale: Locale;
  available: boolean;
  signedIn: boolean;
  entries: Heritage[];
}) {
  const router = useRouter(),
    input = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    mounted = useRef(true),
    requesting = useRef(false),
    [starting, setStarting] = useState(false),
    [canCapture, setCanCapture] = useState(false),
    [live, setLive] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(''),
    [consent, setConsent] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [result, setResult] = useState<Result | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
    setCanCapture(false);
  }
  async function openCamera() {
    if (requesting.current) return;
    requesting.current = true;
    setStarting(true);
    setMessage('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setFile(null);
      setPreview('');
      setConsent(false);
      setResult(null);
      setLive(true);
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
    } catch {
      if (mounted.current) {
        stop();
        setMessage(t(locale, 'cameraDenied'));
      }
    } finally {
      requesting.current = false;
      if (mounted.current) setStarting(false);
    }
  }
  function select(next?: File) {
    if (!next) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(next.type) ||
      next.size === 0 ||
      next.size > 5 * 1024 * 1024
    ) {
      setMessage(t(locale, 'imageHint'));
      return;
    }
    stop();
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setResult(null);
    setMessage('');
    setConsent(false);
  }
  function capture() {
    if (!video.current) return;
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1600 / video.current.videoWidth);
    canvas.width = video.current.videoWidth * ratio;
    canvas.height = video.current.videoHeight * ratio;
    canvas.getContext('2d')?.drawImage(video.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) select(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.88,
    );
  }
  async function analyze() {
    if (!signedIn) {
      router.push(`/${locale}/auth/login?next=/${locale}/camera`);
      return;
    }
    if (!file || !consent) return;
    setPending(true);
    setMessage('');
    setResult(null);
    const form = new FormData();
    form.set('image', file);
    form.set('locale', locale);
    form.set('consent', 'true');
    try {
      const response = await fetch('/api/recognize', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setMessage(errorText(locale, e));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="camera-layout">
      <div>
        <div className={`camera-view ${preview || live ? 'has-image' : ''}`}>
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            hidden={!live}
            onLoadedData={() => setCanCapture(true)}
          />
          {preview && !live && (
            <img
              src={preview}
              alt={t(locale, 'camera')}
              onError={() => {
                setFile(null);
                setPreview('');
                setConsent(false);
                setMessage(t(locale, 'imageHint'));
              }}
            />
          )}
          <div hidden={!!preview || live} className="camera-empty">
            <span className="scan-corners" />
            <Camera size={48} />
            <h2>{t(locale, 'camera')}</h2>
            <p>{t(locale, 'cameraHint')}</p>
          </div>
          {live && (
            <button
              className="camera-close icon-button"
              aria-label={t(locale, 'cancel')}
              onClick={stop}
            >
              <X />
            </button>
          )}
        </div>
        <div className="camera-buttons">
          {live ? (
            <button className="button terracotta" onClick={capture} disabled={!canCapture}>
              <Camera size={18} />
              {t(locale, 'capture')}
            </button>
          ) : (
            <>
              <button className="button secondary" onClick={openCamera} disabled={starting}>
                <Camera size={18} />
                {t(locale, starting ? 'loading' : 'openCamera')}
              </button>
              <button
                className="button secondary"
                onClick={() => input.current?.click()}
                disabled={starting}
              >
                <Upload size={18} />
                {t(locale, preview ? 'retake' : 'chooseImage')}
              </button>
            </>
          )}
          <input
            className="sr-only"
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              select(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
            aria-label={t(locale, 'chooseImage')}
          />
        </div>
        <p className="help-text">{t(locale, 'imageHint')}</p>
        <Status message={message} error />
        {result && (
          <section className="recognition-result">
            <p className="eyebrow">
              <ScanLine size={16} />
              {t(locale, 'possibleMatch')}
            </p>
            <h2>{t(locale, 'evidence')}</h2>
            <p>{result.observation}</p>
            {result.candidates.length ? (
              result.candidates.map((c) => {
                const entry = entries.find((e) => e.id === c.id);
                return entry ? (
                  <div className="recognition-match" key={c.id}>
                    <Photo entry={entry} />
                    <div>
                      <Link href={`/${locale}/explore/${entry.slug}`}>
                        <h3>
                          {entry.name} <ArrowUpRight size={17} />
                        </h3>
                      </Link>
                      <p>{c.reason}</p>
                    </div>
                  </div>
                ) : null;
              })
            ) : (
              <p>{t(locale, 'noMatch')}</p>
            )}
          </section>
        )}
      </div>
      <aside className="camera-aside">
        <span className="eyebrow">THÁM VĂN LENS</span>
        <h2>{t(locale, 'lookCloser')}</h2>
        <p>{t(locale, 'visionNote')}</p>
        {!available && <Status message={t(locale, 'visionUnavailable')} />}
        <label className="check-label">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t(locale, 'visionConsent')}</span>
        </label>
        <Link className="text-link" href={`/${locale}/privacy`}>
          {t(locale, 'privacy')}
          <ArrowUpRight size={15} />
        </Link>
        <button
          className="button terracotta"
          disabled={!file || !consent || pending || !available}
          onClick={analyze}
        >
          <ScanLine size={19} />
          {t(locale, pending ? 'analyzing' : 'analyze')}
        </button>
        <Link className="button secondary" href={`/${locale}/explore`}>
          {t(locale, 'search')}
          <ArrowUpRight size={17} />
        </Link>
      </aside>
    </div>
  );
}
