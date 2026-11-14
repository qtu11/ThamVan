'use client';
/* eslint-disable @next/next/no-img-element -- User-selected blob previews must stay local. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Upload,
  ScanLine,
  X,
  ArrowUpRight,
  Compass,
  ImagePlus,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Images,
  Sparkles,
} from 'lucide-react';
import type { Locale } from '@/lib/types';
import {
  deviceLocationSchema,
  freshLocation,
  type DeviceLocation,
  type RecognitionResult,
} from '@/lib/recognition';
import { t } from '@/lib/i18n';
import { Status, errorText } from './ui';
import { RecognitionResultView } from './recognition-result';
import { toStoredPhotoDataUrl, useJourneyPhotos } from '@/lib/journey-photos';

type CameraTab = 'capture' | 'explore';

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
    [locationMessage, setLocationMessage] = useState(''),
    [tab, setTab] = useState<CameraTab>('capture'),
    [zoom, setZoom] = useState(1),
    [offset, setOffset] = useState({ x: 0, y: 0 }),
    [searchQuery, setSearchQuery] = useState(''),
    [libraryNotice, setLibraryNotice] = useState(''),
    [savedNotice, setSavedNotice] = useState(''),
    [permissionNotice, setPermissionNotice] = useState(false);
  const { photos, save: savePhoto } = useJourneyPhotos();
  const permissionSeen = useRef(false);

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
      analysisController.current?.abort();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined' || permissionSeen.current) return;
    permissionSeen.current = true;
    let accepted = false;
    try {
      accepted = !!localStorage.getItem('tv-permission-notice');
    } catch {
      /* Storage unavailable: the notice simply shows again next time. */
    }
    if (!accepted) {
      const timer = window.setTimeout(() => setPermissionNotice(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
    setCanCapture(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }
  async function getLocation() {
    if (!window.isSecureContext || !navigator.geolocation) throw new Error('locationDenied');
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('locationDenied')), {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }),
    );
    const next = deviceLocationSchema.parse({
      source: 'device',
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    });
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
      setTab('capture');
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
    setLibraryNotice('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }
  function capture() {
    if (!video.current || !canCapture || !video.current.videoWidth || !video.current.videoHeight)
      return;
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1600 / video.current.videoWidth);
    canvas.width = video.current.videoWidth * ratio;
    canvas.height = video.current.videoHeight * ratio;
    canvas.getContext('2d')?.drawImage(video.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob && mounted.current)
          select(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
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
      const response = await fetch('/api/recognize', {
        method: 'POST',
        body: form,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      });
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
  async function persistToJourney() {
    if (!file) return;
    const dataUrl = await toStoredPhotoDataUrl(file);
    const matched = result?.candidates.find((candidate) => candidate.entry);
    const entry = matched?.entry;
    const saved = savePhoto({
      name: entry?.name || (file.name || t(locale, 'camera')),
      region: entry?.address || '',
      slug: entry?.slug || null,
      dataUrl,
    });
    if (saved) setSavedNotice(t(locale, 'photoSaved'));
    else setSavedNotice(t(locale, 'imageHint'));
  }

  const filteredPhotos = photos.filter((photo) =>
    searchQuery.trim()
      ? `${photo.name} ${photo.region}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true,
  );

  return (
    <div className="camera-layout">
      <div>
        {/* Phone-style capture surface */}
        <div className={`phone-camera ${preview || live ? 'has-image' : ''}`}>
          <div
            className="phone-camera-screen camera-view"
            style={{ height: 'auto', border: 'none' }}
          >
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
                style={{
                  transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
                }}
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
              <Camera size={44} />
              <h2>{t(locale, 'camera')}</h2>
              <p>{t(locale, 'cameraHint')}</p>
            </div>

            {/* Rule-of-thirds framing grid */}
            <div className="phone-camera-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            {/* Live zoom + framing controls */}
            {(live || !!preview) && (
              <div className="phone-camera-tools">
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}
                  disabled={zoom <= 1}
                  aria-label={t(locale, 'zoomOut')}
                  title={t(locale, 'zoomOut')}
                >
                  <Minus size={16} />
                </button>
                <span className="phone-camera-zoom-value">{zoom.toFixed(1)}×</span>
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}
                  disabled={zoom >= 3}
                  aria-label={t(locale, 'zoomIn')}
                  title={t(locale, 'zoomIn')}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
                  aria-label={t(locale, 'resetZoom')}
                  title={t(locale, 'resetZoom')}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}

            {/* Frame slider for re-framing the shot */}
            {live && (
              <div className="phone-camera-frame">
                <input
                  type="range"
                  min={-40}
                  max={40}
                  value={offset.x}
                  onChange={(event) =>
                    setOffset((current) => ({ ...current, x: Number(event.target.value) }))
                  }
                  aria-label={t(locale, 'captureFrameHint')}
                />
              </div>
            )}

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

          {/* Shutter row */}
          <div className="phone-camera-controls">
            <button
              type="button"
              className="phone-camera-side"
              onClick={() => input.current?.click()}
              disabled={starting || pending}
              aria-label={t(locale, 'chooseImage')}
            >
              <Images size={20} />
            </button>
            <button
              type="button"
              className="phone-shutter"
              onClick={live ? capture : openCamera}
              disabled={!live && (starting || pending)}
              aria-label={t(locale, 'capture')}
            >
              <span />
            </button>
            <button
              type="button"
              className="phone-camera-side"
              onClick={() => setTab(tab === 'capture' ? 'explore' : 'capture')}
              aria-label={t(locale, 'exploreSection')}
            >
              <Compass size={20} />
            </button>
          </div>
          <p className="help-text phone-camera-hint">{t(locale, 'captureFrameHint')}</p>
        </div>

        <div className="camera-buttons">
          {!live && (
            <>
              <button
                className="button secondary"
                onClick={openCamera}
                disabled={starting || pending}
              >
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
        {libraryNotice && (
          <p className="camera-library-notice" role="status">
            <ImagePlus size={15} />
            {libraryNotice}
          </p>
        )}
        <p className="help-text">{t(locale, 'imageHint')}</p>
        <Status message={message} error />
        <Status message={savedNotice} />
        {pending && (
          <button className="button secondary" onClick={() => analysisController.current?.abort()}>
            {t(locale, 'cancel')}
          </button>
        )}
        {file && (
          <div className="camera-save-row">
            <button className="button secondary" onClick={persistToJourney} disabled={pending}>
              <Save size={17} />
              {t(locale, 'captureAndSave')}
            </button>
          </div>
        )}
        {result && <RecognitionResultView result={result} locale={locale} />}
      </div>
      <aside className="camera-aside">
        <span className="eyebrow">THÁM VĂN LENS</span>
        <h2>{t(locale, 'lookCloser')}</h2>
        <p>{t(locale, 'visionNote')}</p>
        {!available && (
          <div>
            <Status message={t(locale, 'visionUnavailable')} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              <Link className="text-link" href={`/${locale}/explore`}>
                {t(locale, 'explore')} <ArrowUpRight size={14} />
              </Link>
              <Link className="text-link" href={`/${locale}/map`}>
                {t(locale, 'mapView')} <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        )}
        {!signedIn && (
          <div className="commerce-notice" role="status" style={{ marginTop: 10 }}>
            <p style={{ margin: 0 }}>{t(locale, 'authRequired')}</p>
            <Link
              className="text-link"
              href={`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/camera`)}`}
              style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {t(locale, 'login')}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}

        <div className="camera-aside-tabs" role="tablist" aria-label={t(locale, 'captureAndSave')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'capture'}
            className={tab === 'capture' ? 'active' : ''}
            onClick={() => setTab('capture')}
          >
            <Camera size={14} />
            {t(locale, 'captureAndSave')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'explore'}
            className={tab === 'explore' ? 'active' : ''}
            onClick={() => setTab('explore')}
          >
            <Search size={14} />
            {t(locale, 'exploreSection')}
          </button>
        </div>

        {tab === 'capture' ? (
          <>
            <div className="recognition-location">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={shareLocation}
                  disabled={pending}
                  onChange={(event) => void toggleLocation(event.target.checked)}
                />
                <span>{t(locale, 'lensLocationConsent')}</span>
              </label>
              <p className="help-text">{t(locale, 'lensLocationNote')}</p>
              <p className="help-text" role="status">
                {locating
                  ? t(locale, 'lensLocating')
                  : location
                    ? `${t(locale, 'lensLocationReady')} ${Math.round(location.accuracy)} m`
                    : t(locale, 'lensNoLocation')}
              </p>
              <Status message={locationMessage} error />
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={consent}
                disabled={pending}
                onChange={(e) => setConsent(e.target.checked)}
              />
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
            <button
              className="button secondary"
              onClick={() => {
                setLibraryNotice('');
                setTab('explore');
              }}
            >
              <ImagePlus size={17} />
              {t(locale, 'imageSearch')}
            </button>
          </>
        ) : (
          <div className="camera-explore-panel">
            <label className="search-box">
              <Search size={17} />
              <span className="sr-only">{t(locale, 'imageSearch')}</span>
              <input
                type="search"
                maxLength={100}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t(locale, 'imageSearchHint')}
              />
            </label>
            <p className="help-text">{t(locale, 'imageSearchHint')}</p>
            {filteredPhotos.length ? (
              <div className="camera-explore-gallery">
                {filteredPhotos.map((photo) => (
                  <figure key={photo.id}>
                    <img src={photo.dataUrl} alt={photo.name} loading="lazy" />
                    <figcaption>
                      <strong>{photo.name}</strong>
                      {photo.region && <small>{photo.region}</small>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="camera-explore-empty">
                <Sparkles size={18} />
                {t(locale, 'journeyEmptyPhotos')}
              </p>
            )}
            <Link className="button secondary" href={`/${locale}/explore`}>
              {t(locale, 'explore')}
              <ArrowUpRight size={17} />
            </Link>
            <Link className="button secondary" href={`/${locale}/map`}>
              {t(locale, 'mapView')}
              <ArrowUpRight size={17} />
            </Link>
          </div>
        )}
      </aside>

      {/* One-time permission & terms notice */}
      {permissionNotice && (
        <div className="permission-overlay" role="dialog" aria-modal="true" aria-label={t(locale, 'permissionNoticeTitle')}>
          <div className="permission-card">
            <h2>{t(locale, 'permissionNoticeTitle')}</h2>
            <ul>
              <li>
                <strong>{t(locale, 'permissionLocation')}</strong>
                <span>{t(locale, 'permissionLocationBody')}</span>
              </li>
              <li>
                <strong>{t(locale, 'permissionImage')}</strong>
                <span>{t(locale, 'permissionImageBody')}</span>
              </li>
              <li>
                <strong>{t(locale, 'permissionTerms')}</strong>
                <span>{t(locale, 'permissionTermsBody')}</span>
              </li>
            </ul>
            <div className="permission-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setPermissionNotice(false)}
              >
                {t(locale, 'permissionLater')}
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  try {
                    localStorage.setItem('tv-permission-notice', 'accepted');
                  } catch {
                    /* Storage unavailable: the notice will show again. */
                  }
                  setPermissionNotice(false);
                }}
              >
                {t(locale, 'permissionAccept')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
