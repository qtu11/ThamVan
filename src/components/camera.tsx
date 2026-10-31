'use client';
/* eslint-disable @next/next/no-img-element -- User-selected blob previews must stay local. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Upload, ScanLine, X, ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { deviceLocationSchema, freshLocation, type DeviceLocation, type RecognitionResult } from '@/lib/recognition';
import { t } from '@/lib/i18n';
import { Photo, Status, errorText } from './ui';
export function CameraExplorer({
  locale,
  available,
  signedIn,
}: {
  locale: Locale;
  available: boolean;
  signedIn: boolean;
}) {
  const router = useRouter(),
    input = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    mounted = useRef(true),
    requesting = useRef(false),
    analyzing = useRef(false),
    locationRequest = useRef(0),
    analysisController = useRef<AbortController | null>(null),
    [starting, setStarting] = useState(false),
    [canCapture, setCanCapture] = useState(false),
    [live, setLive] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(''),
    [consent, setConsent] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [result, setResult] = useState<RecognitionResult | null>(null),
    [shareLocation, setShareLocation] = useState(false),
    [location, setLocation] = useState<DeviceLocation | null>(null),
    [locating, setLocating] = useState(false),
    [locationMessage, setLocationMessage] = useState('');
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
      locationRequest.current++;
      analysisController.current?.abort();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
    setCanCapture(false);
  }
  async function getLocation() {
    if (!window.isSecureContext || !navigator.geolocation) throw new Error('locationDenied');
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('locationDenied')), {
        enableHighAccuracy: true, timeout: 12000, maximumAge: 0,
      }));
    const next = deviceLocationSchema.parse({ source: 'device', latitude: position.coords.latitude,
      longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp });
    if (!freshLocation(next)) throw new Error('locationExpired');
    return next;
  }
  async function toggleLocation(enabled: boolean) {
    const id = ++locationRequest.current;
    setShareLocation(enabled);
    setLocation(null);
    setLocationMessage('');
    setResult(null);
    setLocating(enabled);
    if (!enabled) return;
    try {
      const next = await getLocation();
      if (mounted.current && id === locationRequest.current) setLocation(next);
    } catch {
      if (mounted.current && id === locationRequest.current) {
        setShareLocation(false);
        setLocationMessage(t(locale, 'locationDenied'));
      }
    } finally {
      if (mounted.current && id === locationRequest.current) setLocating(false);
    }
  }
  async function openCamera() {
    if (requesting.current || analyzing.current) return;
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
    if (!next || analyzing.current) return;
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
    if (!video.current || !canCapture || !video.current.videoWidth || !video.current.videoHeight) return;
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1600 / video.current.videoWidth);
    canvas.width = video.current.videoWidth * ratio;
    canvas.height = video.current.videoHeight * ratio;
    canvas.getContext('2d')?.drawImage(video.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob && mounted.current) select(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
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
    if (!file || !consent || analyzing.current || locating) return;
    analyzing.current = true;
    const controller = new AbortController();
    analysisController.current = controller;
    setPending(true);
    setMessage('');
    setResult(null);
    const form = new FormData();
    form.set('image', file);
    form.set('locale', locale);
    form.set('consent', 'true');
    try {
      if (shareLocation) {
        const current = location && freshLocation(location) ? location : await getLocation();
        if (!mounted.current || controller.signal.aborted) return;
        setLocation(current);
        form.set('locationConsent', 'true');
        form.set('location', JSON.stringify(current));
      }
      const response = await fetch('/api/recognize', { method: 'POST', body: form,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (mounted.current) setResult(data);
    } catch (e) {
      if (mounted.current && !controller.signal.aborted) {
        setMessage(errorText(locale, e));
      }
    } finally {
      analyzing.current = false;
      if (mounted.current) setPending(false);
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
              <button className="button secondary" onClick={openCamera} disabled={starting || pending}>
                <Camera size={18} />
                {t(locale, starting ? 'loading' : 'openCamera')}
              </button>
              <button
                className="button secondary"
                onClick={() => input.current?.click()}
                disabled={starting || pending}
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
        {pending && <button className="button secondary" onClick={() => analysisController.current?.abort()}>{t(locale, 'cancel')}</button>}
        {result && (
          <section className="recognition-result" aria-live="polite">
            <p className="eyebrow">
              <ScanLine size={16} />
              {t(locale, 'possibleMatch')}
            </p>
            <h2>{t(locale, result.assessment === 'nearby_match' ? 'lensNearby' : result.assessment === 'location_conflict' ? 'lensConflict' : result.assessment === 'visual_only' ? 'lensVisualOnly' : 'lensUncertain')}</h2>
            <p className="help-text">{t(locale, 'lensLocationNote')}</p>
            <h2>{t(locale, 'evidence')}</h2>
            <p>{result.observation}</p>
            {result.visibleText.length > 0 && <p><strong>{t(locale, 'lensVisibleText')}: </strong>{result.visibleText.join(' · ')}</p>}
            {result.objects.length > 0 && <div className="recognition-objects">
              <h3>{t(locale, 'lensObjects')}</h3>
              {result.objects.map((object, index) => <article key={index}>
                <h4>{object.name}</h4><p>{object.description}</p>
                {object.placeId && <p className="help-text">{result.candidates.find((candidate) => candidate.id === object.placeId)?.entry.name}</p>}
                {object.culturalContext && <p>{object.culturalContext}</p>}
              </article>)}
            </div>}
            {result.candidates.length ? (
              result.candidates.map((c) => {
                const entry = c.entry;
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
                      <ul>{c.evidence.map((evidence, index) => <li key={index}>{evidence}</li>)}</ul>
                      {entry.address && <p className="help-text">{entry.address}</p>}
                      {c.distanceMeters !== null && <p className="help-text">{t(locale, 'lensDistance')}: {c.distanceMeters} m · {t(locale, c.locationAssessment === 'nearby' ? 'lensNearCandidate' : c.locationAssessment === 'conflict' ? 'lensFarCandidate' : 'lensWeakCandidate')}</p>}
                      {entry.sources.length > 0 && <details><summary>{t(locale, 'sources')}</summary>
                        <ul>{entry.sources.map((source, index) => <li key={index}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>
                      </details>}
                    </div>
                  </div>
                ) : null;
              })
            ) : (
              <p>{t(locale, 'noMatch')}</p>
            )}
            {result.limitations.length > 0 && <div><h3>{t(locale, 'lensLimitations')}</h3><ul>{result.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></div>}
          </section>
        )}
      </div>
      <aside className="camera-aside">
        <span className="eyebrow">THÁM VĂN LENS</span>
        <h2>{t(locale, 'lookCloser')}</h2>
        <p>{t(locale, 'visionNote')}</p>
        {!available && <Status message={t(locale, 'visionUnavailable')} />}
        <div className="recognition-location">
          <label className="check-label">
            <input type="checkbox" checked={shareLocation} disabled={pending}
              onChange={(event) => void toggleLocation(event.target.checked)} />
            <span>{t(locale, 'lensLocationConsent')}</span>
          </label>
          <p className="help-text">{t(locale, 'lensLocationNote')}</p>
          <p className="help-text" role="status">{locating ? t(locale, 'lensLocating') : location ? `${t(locale, 'lensLocationReady')} ${Math.round(location.accuracy)} m` : t(locale, 'lensNoLocation')}</p>
          <Status message={locationMessage} error />
        </div>
        <label className="check-label">
          <input type="checkbox" checked={consent} disabled={pending} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t(locale, 'visionConsent')}</span>
        </label>
        <Link className="text-link" href={`/${locale}/privacy`}>
          {t(locale, 'privacy')}
          <ArrowUpRight size={15} />
        </Link>
        <button
          className="button terracotta"
          disabled={!file || !consent || pending || locating || !available}
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
