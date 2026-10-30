'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  LocateFixed,
  MapPin,
  Pause,
  Play,
  Square,
  Trash2,
  Video,
} from 'lucide-react';
import type { TrackPoint, Trip, Visit } from '@/lib/workspace';
import type { Locale } from '@/lib/types';
import { distanceKm } from '@/lib/geo';
import { api } from '@/components/ui';
import { workspaceError } from '@/lib/workspace-errors';

function project(points: TrackPoint[]) {
  if (!points.length) return [];
  const cosine = Math.cos(
    ((points.reduce((sum, p) => sum + p.latitude, 0) / points.length) * Math.PI) / 180,
  );
  const xs = points.map((p) => p.longitude * cosine),
    ys = points.map((p) => -p.latitude);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, (maxY - minY) * 1.7, 0.0005);
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  return points.map((_, index) => ({
    x: 480 + ((xs[index] - cx) / span) * 800,
    y: 270 + ((ys[index] - cy) / span) * 800,
  }));
}
function draw(canvas: HTMLCanvasElement, points: TrackPoint[], progress: number, title: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const coords = project(points);
  const shown = Math.max(1, Math.ceil(progress * coords.length));
  ctx.fillStyle = '#edf3ef';
  ctx.fillRect(0, 0, 960, 540);
  ctx.strokeStyle = '#d5e0d8';
  ctx.lineWidth = 1;
  for (let x = 0; x < 960; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 540);
    ctx.stroke();
  }
  for (let y = 0; y < 540; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#173f37';
  ctx.font = '600 21px Arial';
  ctx.fillText('THÁM VĂN / MY TRAVEL STORY', 35, 42);
  ctx.font = '15px Arial';
  ctx.fillText(title.slice(0, 70), 35, 70);
  if (coords.length) {
    ctx.beginPath();
    coords.forEach((point, index) =>
      index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
    );
    ctx.strokeStyle = '#c1d2c7';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    coords
      .slice(0, shown)
      .forEach((point, index) =>
        index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
      );
    ctx.strokeStyle = '#497f69';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    const tip = coords[Math.min(shown - 1, coords.length - 1)];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#8e6ca9';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  let km = 0;
  for (let i = 1; i < Math.min(shown, points.length); i++)
    km += distanceKm(points[i - 1], points[i]);
  ctx.fillStyle = '#173f37';
  ctx.font = '600 30px Arial';
  ctx.fillText(`${km.toFixed(2)} km`, 35, 490);
  ctx.font = '13px Arial';
  ctx.fillText('Ước tính từ GPS đã ghi · Sơ đồ hành trình, không phải bản đồ đường đi', 35, 518);
}
export function TravelTimeline({
  locale,
  trips,
  visits,
  signedIn,
}: {
  locale: Locale;
  trips: Trip[];
  visits: Visit[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(trips[0]?.id || ''),
    [points, setPoints] = useState<TrackPoint[]>([]),
    [progress, setProgress] = useState(1),
    [playing, setPlaying] = useState(false),
    [tracking, setTracking] = useState(false),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [message, setMessage] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null),
    watch = useRef<number | null>(null),
    sequence = useRef(0),
    lastTime = useRef(0),
    session = useRef<string | null>(null),
    sending = useRef(false),
    playback = useRef(1);
  const current = trips.find((trip) => trip.id === selected);
  const totalKm = useMemo(
    () => points.slice(1).reduce((sum, point, index) => sum + distanceKm(points[index], point), 0),
    [points],
  );
  useEffect(() => {
    if (!selected || tracking) return;
    let cancelled = false;
    fetch(`/api/travel/points?session=${selected}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Không tải được các điểm GPS.');
        return response.json();
      })
      .then((result) => {
        if (cancelled) return;
        setPoints(result.points);
        sequence.current = (result.points.at(-1)?.sequence ?? -1) + 1;
        lastTime.current = result.points.length
          ? new Date(result.points.at(-1).recorded_at).getTime()
          : 0;
        setProgress(1);
      })
      .catch(() => {
        if (!cancelled)
          setMessage('Chưa tải được dữ liệu GPS. Kiểm tra kết nối và quyền truy cập.');
      });
    return () => {
      cancelled = true;
    };
  }, [selected, tracking]);
  useEffect(() => {
    playback.current = progress;
    if (canvas.current && !exporting)
      draw(canvas.current, points, progress, current?.name || 'Hành trình của bạn');
  }, [points, progress, current?.name, exporting]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - last) / 10000;
      last = now;
      const next = Math.min(1, playback.current + elapsed);
      playback.current = next;
      setProgress(next);
      if (next >= 1) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  useEffect(() => {
    const stopWatching = () => {
      if (watch.current !== null) {
        navigator.geolocation.clearWatch(watch.current);
        watch.current = null;
      }
      if (session.current) {
        const id = session.current;
        session.current = null;
        void fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trip', operation: 'stop', session: id }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    const visibility = () => {
      if (document.hidden) {
        stopWatching();
        setTracking(false);
        setMessage('Đã dừng ghi khi trang bị ẩn. Mở lại và bấm bắt đầu để ghi tiếp.');
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      stopWatching();
    };
  }, []);
  async function start(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (!navigator.geolocation) throw new Error('Thiết bị chưa hỗ trợ định vị.');
      const name = String(new FormData(event.currentTarget).get('name'));
      const result = await api('/api/workspace', {
        action: 'trip',
        operation: 'start',
        name,
        consent: true,
      });
      session.current = result.id;
      setSelected(result.id);
      setTracking(true);
      const existing = await fetch(`/api/travel/points?session=${result.id}`).then((response) =>
        response.json(),
      );
      if (Array.isArray(existing.points)) {
        setPoints(existing.points);
        sequence.current = (existing.points.at(-1)?.sequence ?? -1) + 1;
        lastTime.current = existing.points.length
          ? new Date(existing.points.at(-1).recorded_at).getTime()
          : 0;
      }
      watch.current = navigator.geolocation.watchPosition(
        async (position) => {
          const time = position.timestamp;
          if (
            sending.current ||
            time - lastTime.current < 10000 ||
            position.coords.accuracy > 150 ||
            !session.current
          )
            return;
          sending.current = true;
          const point: TrackPoint = {
            sequence: sequence.current++,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            recorded_at: new Date(time).toISOString(),
          };
          try {
            await api('/api/workspace', {
              action: 'trip',
              operation: 'point',
              session: session.current,
              ...point,
              time: point.recorded_at,
            });
            lastTime.current = time;
            setPoints((previous) => [...previous, point].slice(-2000));
            setProgress(1);
          } catch (error) {
            setMessage(workspaceError(error instanceof Error ? error.message : 'error', locale));
          } finally {
            sending.current = false;
          }
        },
        () => {
          if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
          watch.current = null;
          setTracking(false);
          setMessage(
            'Chưa có quyền GPS hoặc không lấy được vị trí. Không có điểm mới nào được ghi.',
          );
          if (session.current) {
            void api('/api/workspace', {
              action: 'trip',
              operation: 'stop',
              session: session.current,
            }).catch(() => {});
            session.current = null;
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chưa bắt đầu ghi được.');
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setTracking(false);
    const id = session.current;
    session.current = null;
    if (id)
      try {
        await api('/api/workspace', { action: 'trip', operation: 'stop', session: id });
        router.refresh();
      } catch {
        setMessage('Đã dừng GPS trên thiết bị; chưa đồng bộ kết thúc phiên lên máy chủ.');
      }
  }
  async function exportVideo() {
    if (!canvas.current || points.length < 2) return;
    setMessage('');
    if (!('MediaRecorder' in window) || !canvas.current.captureStream) {
      setMessage('Trình duyệt chưa hỗ trợ xuất video. Bạn vẫn có thể xem tua nhanh trên web.');
      return;
    }
    setPlaying(false);
    setExporting(true);
    const stream = canvas.current.captureStream(24);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';
    try {
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });
      recorder.start();
      const started = performance.now();
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const part = Math.min(1, (now - started) / 8000);
          if (canvas.current)
            draw(canvas.current, points, part, current?.name || 'Hành trình của bạn');
          if (part >= 1) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      recorder.stop();
      const blob = await finished;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tham-van-travel.${mime.includes('webm') ? 'webm' : 'mp4'}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage('Chưa xuất được video trên thiết bị này.');
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      setExporting(false);
      setProgress(1);
    }
  }
  return (
    <div className="timeline-layout">
      <section className="dash-panel timeline-player">
        <div className="dash-panel-heading">
          <div>
            <small>YOUR JOURNEY IN MOTION</small>
            <h2>Bản đồ thời gian của riêng bạn.</h2>
          </div>
          <MapPin size={26} />
        </div>
        <div className="timeline-map">
          <canvas
            ref={canvas}
            width={960}
            height={540}
            aria-label="Sơ đồ tuyến đường từ các điểm GPS đã ghi"
          />
          {!points.length && (
            <div className="timeline-map-empty">
              <LocateFixed size={35} />
              <strong>Chưa có dấu đường GPS.</strong>
              <span>Bật ghi chuyến đi để tạo video từ quãng đường thực tế của bạn.</span>
            </div>
          )}
        </div>
        <div className="replay-controls">
          <button
            className="icon-button"
            disabled={points.length < 2 || exporting || tracking}
            aria-label={playing ? 'Tạm dừng tua nhanh' : 'Xem tua nhanh'}
            onClick={() => {
              if (progress >= 1) setProgress(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <input
            aria-label="Tiến độ tua nhanh"
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={(event) => {
              setPlaying(false);
              setProgress(Number(event.target.value));
            }}
            disabled={points.length < 2 || exporting || tracking}
          />
          <strong>{points.length > 1 ? `${totalKm.toFixed(2)} km` : '— km'}</strong>
        </div>
        <div className="dash-actions">
          <button
            className="button secondary"
            disabled={points.length < 2 || tracking || exporting}
            onClick={exportVideo}
          >
            <Video size={16} />
            {exporting ? 'Đang xuất video 8 giây…' : 'Tải video tua nhanh'}
          </button>
          {selected && (
            <button
              className="button quiet"
              disabled={tracking || exporting}
              onClick={async () => {
                try {
                  await api('/api/workspace', {
                    action: 'trip',
                    operation: 'delete',
                    session: selected,
                  });
                  setSelected('');
                  setPoints([]);
                  router.refresh();
                } catch {
                  setMessage('Chưa xóa được chuyến đi.');
                }
              }}
            >
              <Trash2 size={15} />
              Xóa chuyến đi
            </button>
          )}
        </div>
        <p className="help-text">
          Khoảng cách ước tính theo các điểm GPS đã ghi, không phải km xác nhận từ đường giao thông.
          Chỉ ghi khi trang đang mở; tự dừng khi trang bị ẩn. Bản phát lại hiển thị tối đa 2.000
          điểm, không lấy địa điểm tự đánh dấu để giả quãng đường.
        </p>
        {message && (
          <p className="status" role="status">
            {message}
          </p>
        )}
      </section>
      <div>
        <section className="dash-panel">
          <h2>
            <LocateFixed size={20} /> Ghi chuyến đi
          </h2>
          {tracking ? (
            <button className="button" onClick={stop}>
              <Square size={16} />
              Dừng ghi GPS
            </button>
          ) : (
            <form className="dash-form" onSubmit={start}>
              <label>
                Tên chuyến đi
                <input name="name" maxLength={100} required defaultValue="Một vòng Sài Gòn" />
              </label>
              <label className="check-label">
                <input type="checkbox" required />
                <span>
                  Tôi đồng ý lưu các điểm GPS vào tài khoản trong lúc ghi. Có thể dừng và xóa chuyến
                  đi.
                </span>
              </label>
              <button className="button" disabled={!signedIn || busy}>
                <LocateFixed size={16} />
                {busy ? 'Đang bắt đầu…' : 'Bắt đầu ghi chuyến đi'}
              </button>
            </form>
          )}
          <label style={{ marginTop: 20 }}>
            Chuyến đi đã lưu
            <select
              value={selected}
              disabled={tracking || exporting}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Chọn chuyến đi</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} · {new Date(trip.started_at).toLocaleDateString('vi-VN')}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="dash-panel">
          <h2>Những nơi đã ghé</h2>
          {visits.length ? (
            <div className="visit-timeline">
              {visits.slice(0, 20).map((visit) => (
                <article key={visit.id}>
                  <span className="visit-timeline-dot" />
                  <time>
                    {new Date(visit.visited_at).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </time>
                  <Link href={`/${locale}/explore/${visit.entry_slug}`}>{visit.place_name}</Link>
                  <small>
                    {visit.method === 'gps' ? 'Check-in theo vị trí cung cấp' : 'Bạn tự đánh dấu'}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p>Chưa có địa điểm đã ghi nhận. Mở trang địa điểm và bấm “Đánh dấu đã ghé”.</p>
          )}
          <Link className="text-link" href={`/${locale}/explore`}>
            <ArrowDownToLine size={15} />
            Khám phá thêm địa điểm
          </Link>
        </section>
      </div>
    </div>
  );
}
