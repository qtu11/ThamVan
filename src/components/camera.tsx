'use client';
/* eslint-disable @next/next/no-img-element -- Captured/selected blob previews must stay local. */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Images,
  LoaderCircle,
  LogIn,
  MapPin,
  MapPinOff,
  RefreshCcw,
  RotateCcw,
  Save,
  SwitchCamera,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';
import '@/lib/abort-polyfill';
import type { Locale } from '@/lib/types';
import {
  freshLocation,
  type CaptureOrigin,
  type DeviceLocation,
  type RecognitionResult,
} from '@/lib/recognition';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { useDeviceConsent, type ConsentItem } from '@/lib/device-consent';
import { locationSupport, requestDeviceLocation } from '@/lib/device-location';
import { toStoredPhotoDataUrl, useJourneyPhotos } from '@/lib/journey-photos';
import { errorText } from './ui';
import { PermissionGate } from './permission-gate';
import { RecognitionResultView } from './recognition-result';

type Shot = { file: File; url: string; origin: CaptureOrigin };
type CameraState = 'idle' | 'starting' | 'live' | 'denied' | 'unsupported';
type LocationState = 'off' | 'locating' | 'ready' | 'unavailable';
type Analysis =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'done'; result: RecognitionResult }
  | { status: 'error'; message: string }
  | { status: 'login' }
  | { status: 'unavailable' };

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD = 5 * 1024 * 1024;
const MAX_EDGE = 1600;
const DIGITAL_ZOOM_MAX = 4;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type ZoomCapability = { min: number; max: number };
type ExtendedCapabilities = MediaTrackCapabilities & {
  zoom?: { min?: number; max?: number };
  torch?: boolean;
};

/** Fit any picked photo inside the upload limits; phone originals are routinely larger. */
async function prepareImage(file: File): Promise<File | null> {
  if (ACCEPTED.includes(file.type) && file.size > 0 && file.size <= MAX_UPLOAD * 0.9) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88),
    );
    return blob && blob.size <= MAX_UPLOAD
      ? new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      : null;
  } catch {
    return null;
  }
}

export function CameraExplorer({
  locale,
  available,
  signedIn,
}: {
  locale: Locale;
  available: boolean;
  signedIn: boolean;
}) {
  const c = useCallback(
    (vi: string, en: string, zh: string) => copy(locale, vi, en, zh),
    [locale],
  );
  const { consent, accept } = useDeviceConsent();
  const { save: savePhoto } = useJourneyPhotos();

  const video = useRef<HTMLVideoElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const hardwareZoom = useRef<ZoomCapability | null>(null);
  const location = useRef<DeviceLocation | null>(null);
  const controller = useRef<AbortController | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTap = useRef(0);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [zoomMax, setZoomMax] = useState(DIGITAL_ZOOM_MAX);
  const [opticalZoom, setOpticalZoom] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [torch, setTorch] = useState<'none' | 'off' | 'on'>('none');
  const [locationState, setLocationState] = useState<LocationState>('off');
  const [shot, setShot] = useState<Shot | null>(null);
  const [analysis, setAnalysis] = useState<Analysis>({ status: 'idle' });
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);

  const consentReady = Boolean(consent);
  const wantsLocation = Boolean(consent?.location);
  const reviewing = Boolean(shot);

  // The capture screen is a full-viewport surface: keep the page behind it from scrolling.
  useEffect(() => {
    document.documentElement.classList.add('lens-open');
    return () => document.documentElement.classList.remove('lens-open');
  }, []);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const url = shot?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [shot]);

  // Live camera: runs only while consent exists and no shot is being reviewed.
  useEffect(() => {
    if (!consentReady || reviewing) return;
    let cancelled = false;
    const element = video.current;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported');
        return;
      }
      setCameraState('starting');
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        const track = media.getVideoTracks()[0];
        const capabilities = (track?.getCapabilities?.() || {}) as ExtendedCapabilities;
        const min = capabilities.zoom?.min;
        const max = capabilities.zoom?.max;
        if (typeof min === 'number' && typeof max === 'number' && min > 0 && max > min * 1.2) {
          hardwareZoom.current = { min, max };
          setOpticalZoom(true);
          setZoomMax(Math.min(8, max / min));
        } else {
          hardwareZoom.current = null;
          setOpticalZoom(false);
          setZoomMax(DIGITAL_ZOOM_MAX);
        }
        setTorch(capabilities.torch ? 'off' : 'none');
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        if (element) {
          element.srcObject = media;
          await element.play().catch(() => undefined);
        }
        if (!cancelled) setCameraState('live');
      } catch {
        if (!cancelled) setCameraState('denied');
      }
    })();
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      hardwareZoom.current = null;
      if (element) element.srcObject = null;
    };
  }, [consentReady, reviewing, facing, attempt]);

  // Device position, kept fresh in the background so the shutter never waits on GPS.
  useEffect(() => {
    if (!wantsLocation) return;
    let cancelled = false;
    let watch: number | null = null;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (locationSupport()) {
        setLocationState('unavailable');
        return;
      }
      setLocationState((current) => (current === 'ready' ? current : 'locating'));
      watch = navigator.geolocation.watchPosition(
        (position) => {
          if (cancelled) return;
          const next: DeviceLocation = {
            source: 'device',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy > 0 ? position.coords.accuracy : 50,
            timestamp: position.timestamp,
          };
          const previous = location.current;
          // Keep a sharp GPS lock over a momentary coarse reading.
          if (
            previous &&
            freshLocation(previous) &&
            next.accuracy > previous.accuracy * 2.5 &&
            previous.accuracy < 100
          )
            return;
          location.current = next;
          setLocationState('ready');
        },
        () => {
          if (cancelled || (location.current && freshLocation(location.current))) return;
          void requestDeviceLocation(10_000)
            .then((fix) => {
              if (cancelled) return;
              location.current = fix;
              setLocationState('ready');
            })
            .catch(() => {
              if (cancelled || (location.current && freshLocation(location.current))) return;
              location.current = null;
              setLocationState('unavailable');
            });
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
    })();
    return () => {
      cancelled = true;
      if (watch !== null) navigator.geolocation.clearWatch?.(watch);
    };
  }, [wantsLocation, attempt]);

  const applyZoom = useCallback(
    (value: number) => {
      const next = clamp(Number(value.toFixed(2)), 1, reviewing ? DIGITAL_ZOOM_MAX : zoomMax);
      setZoom(next);
      if (next === 1) setOffset({ x: 0, y: 0 });
      const hardware = hardwareZoom.current;
      const track = stream.current?.getVideoTracks()[0];
      if (!reviewing && hardware && track)
        void track
          .applyConstraints({
            advanced: [
              { zoom: clamp(hardware.min * next, hardware.min, hardware.max) } as object,
            ],
          })
          .catch(() => undefined);
    },
    [reviewing, zoomMax],
  );

  const analyze = useCallback(
    async (file: File, origin: CaptureOrigin) => {
      controller.current?.abort();
      if (!signedIn) {
        setAnalysis({ status: 'login' });
        return;
      }
      if (!available) {
        setAnalysis({ status: 'unavailable' });
        return;
      }
      const current = new AbortController();
      controller.current = current;
      setAnalysis({ status: 'pending' });
      const form = new FormData();
      form.set('image', file);
      form.set('locale', locale);
      form.set('consent', 'true');
      form.set('origin', origin);
      try {
        if (wantsLocation) {
          let fix = location.current && freshLocation(location.current) ? location.current : null;
          if (!fix) fix = await requestDeviceLocation(8000).catch(() => null);
          if (current.signal.aborted) return;
          if (fix) {
            location.current = fix;
            setLocationState('ready');
            form.set('locationConsent', 'true');
            form.set('location', JSON.stringify(fix));
          }
        }
        const response = await fetch('/api/recognize', {
          method: 'POST',
          body: form,
          signal: AbortSignal.any([current.signal, AbortSignal.timeout(60_000)]),
        });
        const data = await response.json().catch(() => ({ error: 'error' }));
        if (current.signal.aborted) return;
        if (response.status === 401) {
          setAnalysis({ status: 'login' });
          return;
        }
        if (!response.ok) throw new Error(data.error);
        setAnalysis({ status: 'done', result: data as RecognitionResult });
      } catch (error) {
        if (current.signal.aborted) return;
        setAnalysis({
          status: 'error',
          message:
            error instanceof DOMException && error.name === 'TimeoutError'
              ? t(locale, 'visionTimeout')
              : errorText(locale, error),
        });
      }
    },
    [available, locale, signedIn, wantsLocation],
  );

  const acceptShot = useCallback(
    (file: File, origin: CaptureOrigin) => {
      setShot({ file, url: URL.createObjectURL(file), origin });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setSaved(false);
      setNotice('');
      void analyze(file, origin);
    },
    [analyze],
  );

  function capture() {
    const element = video.current;
    if (cameraState !== 'live' || !element?.videoWidth || !element.videoHeight) return;
    // Hardware zoom is already in the frame; digital zoom is applied by cropping the centre.
    const digital = hardwareZoom.current ? 1 : zoom;
    const sw = element.videoWidth / digital;
    const sh = element.videoHeight / digital;
    const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(
      element,
      (element.videoWidth - sw) / 2,
      (element.videoHeight - sh) / 2,
      sw,
      sh,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    canvas.toBlob(
      (blob) => {
        if (blob) acceptShot(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), 'camera');
      },
      'image/jpeg',
      0.9,
    );
  }

  async function pick(file?: File) {
    if (!file) return;
    const prepared = await prepareImage(file);
    if (!prepared) {
      setNotice(t(locale, 'imageHint'));
      return;
    }
    acceptShot(prepared, 'gallery');
  }

  function retake() {
    controller.current?.abort();
    setShot(null);
    setAnalysis({ status: 'idle' });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNotice('');
  }

  async function toggleTorch() {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || torch === 'none') return;
    const next = torch === 'on' ? 'off' : 'on';
    try {
      await track.applyConstraints({ advanced: [{ torch: next === 'on' } as object] });
      setTorch(next);
    } catch {
      setTorch('none');
    }
  }

  async function saveToJourney() {
    if (!shot) return;
    const result = analysis.status === 'done' ? analysis.result : null;
    const entry = result?.candidates[0]?.entry;
    const stored = savePhoto({
      name: entry?.name || result?.subject?.name || t(locale, 'camera'),
      region: entry?.address || result?.place?.label || '',
      slug: entry?.slug || null,
      dataUrl: await toStoredPhotoDataUrl(shot.file),
    });
    setSaved(Boolean(stored));
    setNotice(stored ? t(locale, 'photoSaved') : t(locale, 'imageHint'));
  }

  // Pinch with two fingers, drag to pan a zoomed still, double-tap to jump between 1× and 2×.
  const gesture = {
    onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...pointers.current.values()];
      if (points.length === 2) {
        pinch.current = {
          distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1,
          zoom,
        };
        drag.current = null;
      } else if (points.length === 1) {
        drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
        const now = event.timeStamp;
        if (now - lastTap.current < 300) applyZoom(zoom > 1.05 ? 1 : 2);
        lastTap.current = now;
      }
    },
    onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...pointers.current.values()];
      if (points.length === 2 && pinch.current) {
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        applyZoom(pinch.current.zoom * (distance / pinch.current.distance));
      } else if (points.length === 1 && drag.current && reviewing && zoom > 1) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const limitX = (bounds.width * (zoom - 1)) / 2;
        const limitY = (bounds.height * (zoom - 1)) / 2;
        setOffset({
          x: clamp(drag.current.ox + event.clientX - drag.current.x, -limitX, limitX),
          y: clamp(drag.current.oy + event.clientY - drag.current.y, -limitY, limitY),
        });
      }
    },
    onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      if (pointers.current.size === 0) drag.current = null;
    },
    onWheel(event: React.WheelEvent<HTMLDivElement>) {
      applyZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.89));
    },
  };

  const digitalScale = !reviewing && opticalZoom ? 1 : zoom;
  const zoomStops = [1, 2, 3].filter((stop) => stop <= (reviewing ? DIGITAL_ZOOM_MAX : zoomMax) + 0.01);
  const loginHref = `/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/camera`)}`;

  if (consent === undefined)
    return (
      <div className="lens" aria-busy="true">
        <h1 className="sr-only">{t(locale, 'camera')}</h1>
        <p className="lens-loading" role="status">
          <LoaderCircle size={22} className="spin" aria-hidden="true" />
          {t(locale, 'loading')}
        </p>
      </div>
    );

  if (!consent)
    return (
      <div className="lens">
        <h1 className="sr-only">{t(locale, 'camera')}</h1>
        <PermissionGate
          locale={locale}
          onAccept={(choice: Record<ConsentItem, boolean>) => accept(choice)}
        />
      </div>
    );

  return (
    <div className={`lens ${reviewing ? 'is-review' : 'is-live'}`}>
      <h1 className="sr-only">{t(locale, 'camera')}</h1>
      <div className="lens-stage">
        <div
          className="lens-surface"
          {...gesture}
          onPointerCancel={gesture.onPointerUp}
          aria-label={c(
            'Khung ngắm: chụm hai ngón tay để phóng to hoặc thu nhỏ',
            'Viewfinder: pinch with two fingers to zoom in or out',
            '取景框：双指捏合可放大或缩小',
          )}
          role="group"
        >
          <video
            ref={video}
            className={`lens-video ${facing === 'user' ? 'is-mirrored' : ''}`}
            autoPlay
            playsInline
            muted
            hidden={reviewing}
            style={{ transform: `${facing === 'user' ? 'scaleX(-1) ' : ''}scale(${digitalScale})` }}
          />
          {shot && (
            <img
              className="lens-still"
              src={shot.url}
              alt={c('Ảnh vừa chụp', 'Captured photo', '刚拍摄的照片')}
              draggable={false}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
              onError={() => {
                setNotice(t(locale, 'imageHint'));
                retake();
              }}
            />
          )}
          {!reviewing && cameraState === 'live' && (
            <div className="lens-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        <div className="lens-top">
          <Link
            className="lens-icon"
            href={`/${locale}`}
            aria-label={c('Đóng camera', 'Close camera', '关闭相机')}
          >
            <X size={22} />
          </Link>
          <button
            type="button"
            className={`lens-chip ${locationState === 'ready' ? 'is-on' : ''}`}
            onClick={() => {
              if (locationState !== 'ready' && wantsLocation) setAttempt((value) => value + 1);
            }}
            aria-live="polite"
          >
            {locationState === 'ready' ? (
              <MapPin size={14} aria-hidden="true" />
            ) : (
              <MapPinOff size={14} aria-hidden="true" />
            )}
            {locationState === 'ready'
              ? c('Đang dùng vị trí của bạn', 'Using your location', '正在使用你的位置')
              : locationState === 'locating'
                ? c('Đang định vị…', 'Locating…', '正在定位…')
                : c('Chưa có vị trí · chạm để thử lại', 'No location · tap to retry', '未获取位置 · 点击重试')}
          </button>
          <div className="lens-top-actions">
            {!reviewing && torch !== 'none' && (
              <button
                type="button"
                className="lens-icon"
                onClick={toggleTorch}
                aria-pressed={torch === 'on'}
                aria-label={c('Đèn flash', 'Flash light', '闪光灯')}
              >
                {torch === 'on' ? <Zap size={20} /> : <ZapOff size={20} />}
              </button>
            )}
            {!reviewing && cameraState === 'live' && (
              <button
                type="button"
                className="lens-icon"
                onClick={() => setFacing((value) => (value === 'user' ? 'environment' : 'user'))}
                aria-label={c('Đổi camera trước/sau', 'Switch camera', '切换前后摄像头')}
              >
                <SwitchCamera size={20} />
              </button>
            )}
          </div>
        </div>

        {!reviewing && cameraState !== 'live' && (
          <div className="lens-fallback" role="status">
            {cameraState === 'starting' || cameraState === 'idle' ? (
              <p>
                <LoaderCircle size={20} className="spin" aria-hidden="true" />
                {c('Đang mở camera…', 'Opening the camera…', '正在打开相机…')}
              </p>
            ) : (
              <>
                <p>
                  {cameraState === 'unsupported'
                    ? c(
                        'Trình duyệt này không mở được camera (cần HTTPS hoặc localhost). Bạn vẫn có thể chọn ảnh từ thư viện.',
                        'This browser cannot open the camera (HTTPS or localhost is required). You can still pick a photo from your library.',
                        '此浏览器无法打开相机（需要 HTTPS 或 localhost）。你仍可从相册选择图片。',
                      )
                    : t(locale, 'cameraDenied')}
                </p>
                <div className="lens-fallback-actions">
                  <button type="button" className="lens-pill" onClick={() => input.current?.click()}>
                    <Images size={16} /> {t(locale, 'chooseImage')}
                  </button>
                  {cameraState === 'denied' && (
                    <button
                      type="button"
                      className="lens-pill ghost"
                      onClick={() => setAttempt((value) => value + 1)}
                    >
                      <RefreshCcw size={16} /> {c('Thử lại', 'Try again', '重试')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {(cameraState === 'live' || reviewing) && zoomStops.length > 1 && (
          <div className="lens-zoom" role="group" aria-label={c('Mức thu phóng', 'Zoom level', '缩放级别')}>
            {zoomStops.map((stop) => (
              <button
                key={stop}
                type="button"
                className={Math.abs(zoom - stop) < 0.15 ? 'active' : ''}
                aria-pressed={Math.abs(zoom - stop) < 0.15}
                onClick={() => applyZoom(stop)}
              >
                {stop}×
              </button>
            ))}
            {zoomStops.every((stop) => Math.abs(zoom - stop) >= 0.15) && (
              <span className="lens-zoom-value">{zoom.toFixed(1)}×</span>
            )}
          </div>
        )}

        {!reviewing && (
          <div className="lens-bottom">
            <button
              type="button"
              className="lens-side"
              onClick={() => input.current?.click()}
              aria-label={t(locale, 'chooseImage')}
            >
              <Images size={22} />
              <span>{c('Thư viện', 'Library', '相册')}</span>
            </button>
            <button
              type="button"
              className="lens-shutter"
              onClick={capture}
              disabled={cameraState !== 'live'}
              aria-label={t(locale, 'capture')}
            >
              <span />
            </button>
            <p className="lens-side lens-hint">
              {c('Chụm 2 ngón để zoom', 'Pinch to zoom', '双指捏合缩放')}
            </p>
          </div>
        )}
      </div>

      {shot && (
        <section
          className="lens-sheet"
          aria-label={c('Kết quả phân tích', 'Analysis result', '分析结果')}
        >
          <div className="lens-sheet-actions">
            <button type="button" className="lens-pill" onClick={retake}>
              <RotateCcw size={16} /> {c('Chụp lại', 'Retake', '重拍')}
            </button>
            <button type="button" className="lens-pill ghost" onClick={() => input.current?.click()}>
              <Images size={16} /> {c('Chọn ảnh khác', 'Pick another', '选择其他图片')}
            </button>
            <button
              type="button"
              className="lens-pill ghost"
              onClick={saveToJourney}
              disabled={saved}
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? c('Đã lưu', 'Saved', '已保存') : c('Lưu vào hành trình', 'Save to journey', '保存到旅程')}
            </button>
          </div>

          {analysis.status === 'pending' && (
            <div className="lens-pending" role="status">
              <LoaderCircle size={22} className="spin" aria-hidden="true" />
              <div>
                <strong>{c('AI đang phân tích ảnh…', 'The AI is analysing your photo…', 'AI 正在分析图片…')}</strong>
                <p>
                  {locationState === 'ready'
                    ? c(
                        'Đang đối chiếu vật trong ảnh với nơi bạn đang đứng.',
                        'Matching what is in the photo with where you are standing.',
                        '正在将图片内容与你所在的位置进行对照。',
                      )
                    : c(
                        'Chưa có vị trí nên AI sẽ trả lời theo hình ảnh.',
                        'No location yet, so the AI will answer from the image alone.',
                        '尚未获取位置，AI 将仅根据图片作答。',
                      )}
                </p>
              </div>
              <button type="button" className="lens-pill ghost" onClick={retake}>
                {t(locale, 'cancel')}
              </button>
            </div>
          )}

          {analysis.status === 'login' && (
            <div className="lens-message" role="status">
              <strong>{c('Đăng nhập để AI phân tích ảnh', 'Sign in for AI analysis', '登录后即可使用 AI 分析')}</strong>
              <p>{t(locale, 'authRequired')}</p>
              <Link className="lens-pill" href={loginHref}>
                <LogIn size={16} /> {t(locale, 'login')}
              </Link>
            </div>
          )}

          {analysis.status === 'unavailable' && (
            <div className="lens-message" role="status">
              <p>{t(locale, 'visionUnavailable')}</p>
              <Link className="lens-pill ghost" href={`/${locale}/map`}>
                <MapPin size={16} /> {t(locale, 'mapView')}
              </Link>
            </div>
          )}

          {analysis.status === 'error' && (
            <div className="lens-message is-error" role="alert">
              <p>{analysis.message}</p>
              <button
                type="button"
                className="lens-pill"
                onClick={() => void analyze(shot.file, shot.origin)}
              >
                <RefreshCcw size={16} /> {c('Phân tích lại', 'Analyse again', '重新分析')}
              </button>
            </div>
          )}

          {analysis.status === 'done' && (
            <RecognitionResultView result={analysis.result} locale={locale} />
          )}
        </section>
      )}

      {notice && (
        <p className="lens-toast" role="status">
          {notice}
        </p>
      )}

      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        tabIndex={-1}
        aria-label={t(locale, 'chooseImage')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = '';
          void pick(file);
        }}
      />
    </div>
  );
}
