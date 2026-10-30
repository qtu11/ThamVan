'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CalendarDays, LoaderCircle, MapPin, Sparkles } from 'lucide-react';
import { api } from '@/components/ui';
import { workspaceError } from '@/lib/workspace-errors';
import type { Locale } from '@/lib/types';
import type { Itinerary } from '@/lib/workspace';
export function Planner({
  locale,
  regions,
  places,
  itineraries,
  allowed,
  ready,
}: {
  locale: Locale;
  regions: string[];
  places: { slug: string; name: string }[];
  itineraries: Itinerary[];
  allowed: boolean;
  ready: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const current = itineraries.find((item) => item.id === selected) || itineraries[0];
  return (
    <div className="planner-layout">
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>FAMILY AI PLANNER</small>
            <h2>Một chuyến đi, vừa vặn với cả nhà.</h2>
          </div>
          <Sparkles size={25} />
        </div>
        <p>
          Chọn khoảng thời gian và khu vực. AI sắp xếp những địa điểm trong dữ liệu THÁM VĂN thành
          một lịch trình để bạn xem lại trước khi đi.
        </p>
        {!allowed && (
          <div className="dash-notice">
            Lập lịch trình AI dành cho Premium Family.{' '}
            <Link href={`/${locale}/checkout?plan=family`}>Xem gói 89.000đ/tháng →</Link>
          </div>
        )}
        {!ready && (
          <p className="help-text">
            Dịch vụ AI chưa kết nối. Website sẽ không tạo lịch trình giả để thay thế.
          </p>
        )}
        <form
          className="dash-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            const form = new FormData(event.currentTarget);
            try {
              const result = await api('/api/itineraries', {
                days: Number(form.get('days')),
                hours: Number(form.get('hours')),
                region: String(form.get('region')),
                pace: String(form.get('pace')),
                interests: form.getAll('interests'),
                locale,
              });
              setSelected(result.id);
              router.refresh();
            } catch (error) {
              setError(workspaceError(error instanceof Error ? error.message : 'error', locale));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-pair">
            <label>
              Số ngày
              <select name="days" defaultValue="2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <option key={day} value={day}>
                    {day} ngày
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mỗi ngày có
              <select name="hours" defaultValue="6">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} giờ
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Khu vực muốn khám phá
            <select name="region">
              {regions.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </label>
          <label>
            Nhịp độ
            <select name="pace">
              <option value="relaxed">Thảnh thơi, có thời gian nghỉ</option>
              <option value="balanced">Cân bằng trải nghiệm</option>
              <option value="active">Năng động, nhiều điểm dừng</option>
            </select>
          </label>
          <fieldset>
            <legend>Sở thích của cả nhà</legend>
            <div className="dash-checkboxes">
              {[
                ['monument', 'Di tích'],
                ['architecture', 'Kiến trúc'],
                ['nature', 'Thiên nhiên'],
                ['craft', 'Làng nghề'],
              ].map(([value, title]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    name="interests"
                    value={value}
                    defaultChecked={value === 'monument' || value === 'architecture'}
                  />
                  {title}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="button" disabled={busy || !allowed || !ready}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{' '}
            {busy ? 'Đang xây lịch trình…' : 'Tạo lịch trình của gia đình'}
          </button>
          {error && (
            <p role="alert" className="status danger">
              {error}
            </p>
          )}
        </form>
      </section>
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>YOUR TRAVEL DRAFTS</small>
            <h2>Lịch trình đã tạo</h2>
          </div>
          <CalendarDays size={24} />
        </div>
        {itineraries.length ? (
          <>
            <label>
              Chọn bản lịch trình
              <select value={current?.id} onChange={(event) => setSelected(event.target.value)}>
                {itineraries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <h3 style={{ marginTop: 25 }}>{current.title}</h3>
            <p className="help-text">
              AI đề xuất từ danh mục có nguồn. Giờ đi là gợi ý; hãy kiểm tra giờ mở cửa, vé, thời
              tiết và tuyến di chuyển thực tế.
            </p>
            {current.days.map((day) => (
              <article className="planner-day" key={day.day}>
                <h3>Ngày {day.day}</h3>
                {day.stops.map((stop) => (
                  <div className="planner-stop" key={stop.slug}>
                    <time>{stop.time}</time>
                    <div>
                      <Link href={`/${locale}/explore/${stop.slug}`}>
                        <MapPin size={14} />
                        {places.find((place) => place.slug === stop.slug)?.name || stop.slug}
                        <ArrowUpRight size={13} />
                      </Link>
                      <p>{stop.reason}</p>
                      <small>{stop.minutes} phút tại điểm</small>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </>
        ) : (
          <div className="dash-empty">
            <Sparkles size={35} />
            <h3>Lịch trình đầu tiên đang chờ bạn.</h3>
            <p>Không có lịch trình đã lưu. Khi tạo thành công, bản đề xuất sẽ xuất hiện ở đây.</p>
          </div>
        )}
      </section>
    </div>
  );
}
