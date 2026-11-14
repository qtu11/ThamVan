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
import { copy } from '@/lib/locale-copy';
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
function draw(
  canvas: HTMLCanvasElement,
  points: TrackPoint[],
  progress: number,
  title: string,
  locale: Locale,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const coords = project(points);
  const shown = Math.max(1, Math.ceil(progress * coords.length));
  ctx.fillStyle = '#f7f1e3';
  ctx.fillRect(0, 0, 960, 540);
  ctx.strokeStyle = '#e5dac4';
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
  ctx.strokeStyle = '#d4c6ab';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 928, 508);

  ctx.fillStyle = '#114436';
  ctx.font = '600 20px Georgia, "Times New Roman", serif';
  ctx.fillText(
    copy(
      locale,
      'THÁM VĂN · NHẬT KÝ HÀNH TRÌNH',
      'THÁM VĂN · SAIGON FIELD JOURNAL',
      'THÁM VĂN · 西贡旅程日志',
    ),
    35,
    46,
  );
  ctx.fillStyle = '#4c463d';
  ctx.font = '15px sans-serif';
  ctx.fillText(title.slice(0, 70), 35, 72);
  if (coords.length) {
    ctx.beginPath();
    coords.forEach((point, index) =>
      index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
    );
    ctx.strokeStyle = '#cbbca1';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    coords
      .slice(0, shown)
      .forEach((point, index) =>
        index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
      );
    ctx.strokeStyle = '#114436';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    const tip = coords[Math.min(shown - 1, coords.length - 1)];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#963a1b';
    ctx.fill();
    ctx.strokeStyle = '#f7f1e3';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  let km = 0;
  for (let i = 1; i < Math.min(shown, points.length); i++)
    km += distanceKm(points[i - 1], points[i]);
  ctx.fillStyle = '#114436';
  ctx.font = '600 30px Georgia, "Times New Roman", serif';
  ctx.fillText(`${km.toFixed(2)} km`, 35, 484);
  ctx.fillStyle = '#5e584d';
  ctx.font = '12.5px sans-serif';
  ctx.fillText(
    copy(
      locale,
      'Ước tính từ GPS đã ghi · Sơ đồ tuyến hành trình cá nhân',
      'Estimated from recorded GPS points · Personal route diagram',
      '依据已记录 GPS 估算 · 个人路线示意图',
    ),
    35,
    508,
  );
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
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const dateLocale = locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-GB' : 'vi-VN';
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
        if (!response.ok)
          throw new Error(
            copy(
              locale,
              'Không tải được các điểm GPS.',
              'Could not load GPS points.',
              '无法加载 GPS 轨迹点。',
            ),
          );
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
          setMessage(
            copy(
              locale,
              'Chưa tải được dữ liệu GPS. Kiểm tra kết nối và quyền truy cập.',
              'Could not load GPS track. Check your connection and access.',
              '暂无法加载 GPS 数据，请检查网络和权限。',
            ),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [selected, tracking, locale]);
  useEffect(() => {
    playback.current = progress;
    if (canvas.current && !exporting)
      draw(
        canvas.current,
        points,
        progress,
        current?.name || copy(locale, 'Hành trình của bạn', 'Your journey', '您的旅程'),
        locale,
      );
  }, [points, progress, current?.name, exporting, locale]);
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
        setMessage(
          copy(
            locale,
            'Đã dừng ghi khi trang bị ẩn. Mở lại và bấm bắt đầu để ghi tiếp.',
            'Recording stopped when the tab was hidden. Reopen and press start to resume.',
            '页面隐藏后已停止记录，请重新打开并点击开始以继续。',
          ),
        );
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      stopWatching();
    };
  }, [locale]);
  async function start(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (!navigator.geolocation)
        throw new Error(
          c(
            'Thiết bị chưa hỗ trợ định vị.',
            'Geolocation is not supported on this device.',
            '当前设备不支持定位功能。',
          ),
        );
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
            c(
              'Chưa có quyền GPS hoặc không lấy được vị trí. Không có điểm mới nào được ghi.',
              'GPS permission denied or unavailable. No new points were recorded.',
              '未获得 GPS 权限或无法定位，未记录任何新轨迹点。',
            ),
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
      setMessage(
        error instanceof Error
          ? error.message
          : c('Chưa bắt đầu ghi được.', 'Could not start recording.', '未能开始记录。'),
      );
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
        setMessage(
          c(
            'Đã dừng GPS trên thiết bị; chưa đồng bộ kết thúc phiên lên máy chủ.',
            'Stopped device GPS; could not sync session end to the server.',
            '已停止设备 GPS；尚未将结束状态同步至服务器。',
          ),
        );
      }
  }
  async function exportVideo() {
    if (!canvas.current || points.length < 2) return;
    setMessage('');
    if (!('MediaRecorder' in window) || !canvas.current.captureStream) {
      setMessage(
        c(
          'Trình duyệt chưa hỗ trợ xuất video. Bạn vẫn có thể xem tua nhanh trên web.',
          'Video export is not supported in this browser. You can still replay the route above.',
          '当前浏览器暂不支持导出视频，您仍可在网页中回放轨迹。',
        ),
      );
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
            draw(
              canvas.current,
              points,
              part,
              current?.name || c('Hành trình của bạn', 'Your journey', '您的旅程'),
              locale,
            );
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
      setMessage(
        c(
          'Chưa xuất được video trên thiết bị này.',
          'Could not export video on this device.',
          '无法在此设备上导出视频。',
        ),
      );
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
            <small>{c('HÀNH TRÌNH TRONG CHUYỂN ĐỘNG', 'YOUR JOURNEY IN MOTION', '移动中的旅程')}</small>
            <h2>{c('Bản đồ thời gian của riêng bạn.', 'Your personal timeline map.', '您的专属时间轴地图。')}</h2>
          </div>
          <MapPin size={26} />
        </div>
        <div className="timeline-map">
          <canvas
            ref={canvas}
            width={960}
            height={540}
            aria-label={c(
              'Sơ đồ tuyến đường từ các điểm GPS đã ghi',
              'Route diagram from recorded GPS coordinates',
              '基于已记录 GPS 坐标生成的路线图',
            )}
          />
          {!points.length && (
            <div className="timeline-map-empty">
              <LocateFixed size={35} />
              <strong>{c('Chưa có dấu đường GPS.', 'No GPS track yet.', '尚无 GPS 轨迹记录。')}</strong>
              <span>
                {c(
                  'Bật ghi chuyến đi để tạo video từ quãng đường thực tế của bạn.',
                  'Start recording a trip to turn your real route into an animated replay.',
                  '开启行程记录即可根据真实路线生成回放视频。',
                )}
              </span>
            </div>
          )}
        </div>
        <div className="replay-controls">
          <button
            className="icon-button"
            disabled={points.length < 2 || exporting || tracking}
            aria-label={
              playing
                ? c('Tạm dừng tua nhanh', 'Pause replay', '暂停回放')
                : c('Xem tua nhanh', 'Play replay', '播放回放')
            }
            onClick={() => {
              if (progress >= 1) setProgress(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <input
            aria-label={c('Tiến độ tua nhanh', 'Replay progress', '回放进度')}
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
            {exporting
              ? c('Đang xuất video 8 giây…', 'Exporting 8s video…', '正在导出 8 秒视频…')
              : c('Tải video tua nhanh', 'Download replay video', '下载回放视频')}
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
                  setMessage(c('Chưa xóa được chuyến đi.', 'Could not delete trip.', '无法删除该行程。'));
                }
              }}
            >
              <Trash2 size={15} />
              {c('Xóa chuyến đi', 'Delete trip', '删除行程')}
            </button>
          )}
        </div>
        <p className="help-text">
          {c(
            'Khoảng cách ước tính theo các điểm GPS đã ghi, không phải km xác nhận từ đường giao thông. Chỉ ghi khi trang đang mở; tự dừng khi trang bị ẩn. Bản phát lại hiển thị tối đa 2.000 điểm, không lấy địa điểm tự đánh dấu để giả quãng đường.',
            'Distance is estimated from recorded GPS coordinates, not road odometer mileage. Recording runs only while this tab stays open and stops automatically when hidden. Replay renders up to 2,000 points and never fabricates distance from self-marked visits.',
            '里程按已记录的 GPS 坐标估算，并非道路实测距离。仅在页面打开时记录，隐藏后自动停止。回放最多渲染 2,000 个轨迹点，不会用手动打卡地点虚构距离。',
          )}
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
            <LocateFixed size={20} /> {c('Ghi chuyến đi', 'Record a trip', '记录行程')}
          </h2>
          {tracking ? (
            <button className="button" onClick={stop}>
              <Square size={16} />
              {c('Dừng ghi GPS', 'Stop GPS recording', '停止 GPS 记录')}
            </button>
          ) : (
            <form className="dash-form" onSubmit={start}>
              <label>
                {c('Tên chuyến đi', 'Trip name', '行程名称')}
                <input
                  name="name"
                  maxLength={100}
                  required
                  defaultValue={c('Một vòng Sài Gòn', 'A Walk Around Saigon', '漫步西贡一圈')}
                />
              </label>
              <label className="check-label">
                <input type="checkbox" required />
                <span>
                  {c(
                    'Tôi đồng ý lưu các điểm GPS vào tài khoản trong lúc ghi. Có thể dừng và xóa chuyến đi.',
                    'I agree to store GPS points in my account while recording. Trips can be stopped and deleted anytime.',
                    '我同意在记录期间将 GPS 坐标保存至账户，并可随时停止或删除行程。',
                  )}
                </span>
              </label>
              <button className="button" disabled={!signedIn || busy}>
                <LocateFixed size={16} />
                {busy
                  ? c('Đang bắt đầu…', 'Starting…', '正在启动…')
                  : c('Bắt đầu ghi chuyến đi', 'Start recording trip', '开始记录行程')}
              </button>
            </form>
          )}
          <label style={{ marginTop: 20 }}>
            {c('Chuyến đi đã lưu', 'Saved trips', '已保存的行程')}
            <select
              value={selected}
              disabled={tracking || exporting}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">{c('Chọn chuyến đi', 'Choose a trip', '选择行程')}</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} · {new Date(trip.started_at).toLocaleDateString(dateLocale)}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="dash-panel">
          <h2>{c('Những nơi đã ghé', 'Visited places', '已到访地点')}</h2>
          {visits.length ? (
            <div className="visit-timeline">
              {visits.slice(0, 20).map((visit) => (
                <article key={visit.id}>
                  <span className="visit-timeline-dot" />
                  <time>
                    {new Date(visit.visited_at).toLocaleString(dateLocale, {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </time>
                  <Link href={`/${locale}/explore/${visit.entry_slug}`}>{visit.place_name}</Link>
                  <small>
                    {visit.method === 'gps'
                      ? c('Check-in theo vị trí cung cấp', 'GPS position check-in', 'GPS 定位打卡')
                      : c('Bạn tự đánh dấu', 'Self-marked', '手动标记')}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p>
              {c(
                'Chưa có địa điểm đã ghi nhận. Mở trang địa điểm và bấm “Đánh dấu đã ghé”.',
                'No places recorded yet. Open any place dossier and click “Mark as visited”.',
                '尚无记录地点。打开任意地点档案点击“标记为已到访”即可添加。',
              )}
            </p>
          )}
          <Link className="text-link" href={`/${locale}/explore`}>
            <ArrowDownToLine size={15} />
            {c('Khám phá thêm địa điểm', 'Explore more places', '探索更多地点')}
          </Link>
        </section>
      </div>
    </div>
  );
}
