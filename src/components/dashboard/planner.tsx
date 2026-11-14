'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CalendarDays, Compass, LoaderCircle, MapPin, Sparkles } from 'lucide-react';
import { api } from '@/components/ui';
import { copy } from '@/lib/locale-copy';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const current = itineraries.find((item) => item.id === selected) || itineraries[0];
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);

  const interestOptions: readonly [string, string][] = [
    ['monument', c('Di tích', 'Monuments', '古迹')],
    ['architecture', c('Kiến trúc', 'Architecture', '建筑')],
    ['symbol', c('Biểu tượng & Di sản', 'Landmarks & Symbols', '地标与象征')],
    ['nature', c('Thiên nhiên', 'Nature', '自然')],
    ['craft', c('Làng nghề & Chợ', 'Crafts & Markets', '手工艺与市集')],
    ['festival', c('Lễ hội & Sinh hoạt', 'Festivals & Culture', '节庆与民俗')],
  ];

  return (
    <div className="planner-layout">
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>FAMILY AI PLANNER</small>
            <h2>
              {c(
                'Một chuyến đi, vừa vặn với cả nhà.',
                'One shared route, paced for your whole family.',
                '一趟贴合全家人步调的城市漫步。',
              )}
            </h2>
          </div>
          <Sparkles size={25} />
        </div>
        <p>
          {c(
            'Chọn khoảng thời gian và khu vực. AI sắp xếp những địa điểm có nguồn từ dữ liệu THÁM VĂN thành lịch trình gợi ý để bạn xem lại trước khi đi.',
            'Choose your dates, hours and district. AI arranges verified sites from THÁM VĂN into a suggested draft you can review before heading out.',
            '选择天数、每日时长与区域，AI 将从 THÁM VĂN 已核验档案中为你编排可预览的建议行程。',
          )}
        </p>
        {!allowed && (
          <div className="dash-notice">
            <p style={{ margin: 0 }}>
              {c(
                'Lập lịch trình AI dành cho Premium Family. Trong lúc cân nhắc, bạn vẫn có thể trải nghiệm miễn phí các lộ trình tuyển chọn hoặc tự ghim điểm trên bản đồ.',
                'AI itinerary planning is for Premium Family. You can still explore curated story walks and browse the heritage map for free.',
                'AI 行程规划属于 Premium Family。你仍可免费试读精选路线或浏览城市遗产地图。',
              )}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              <Link className="button" href={`/${locale}/checkout?plan=family`}>
                {c('Xem gói Family', 'View Family plan', '查看 Family 套餐')}
                <ArrowUpRight size={15} />
              </Link>
              <Link className="button secondary" href={`/${locale}/experiences`}>
                {c('Lộ trình tuyển chọn', 'Story walks', '精选漫步路线')}
              </Link>
            </div>
          </div>
        )}
        {!ready && (
          <div className="dash-notice">
            <p className="help-text" style={{ margin: 0 }}>
              {c(
                'Dịch vụ AI lập lịch trình hiện đang bảo trì hoặc chưa kết nối. Website không tạo lịch trình giả để thay thế.',
                'The AI planner provider is temporarily disconnected. THÁM VĂN never fabricates placeholder itineraries.',
                'AI 行程服务暂未连接，网站不会生成虚假占位行程。',
              )}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              <Link className="button secondary" href={`/${locale}/experiences`}>
                <Compass size={15} />
                {c('Xem lộ trình biên tập sẵn', 'Browse curated walks', '浏览编辑精选路线')}
              </Link>
              <Link className="button secondary" href={`/${locale}/map`}>
                <MapPin size={15} />
                {c('Mở bản đồ Sài Gòn', 'Open Saigon map', '打开西贡地图')}
              </Link>
            </div>
          </div>
        )}
        <form
          className="dash-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const form = new FormData(event.currentTarget);
            const interests = form.getAll('interests');
            if (!interests.length) {
              setErrorCode('invalidInput');
              setError(
                c(
                  'Hãy chọn ít nhất 1 chủ đề yêu thích để AI lựa chọn điểm dừng phù hợp.',
                  'Select at least one interest so the planner can match relevant heritage stops.',
                  '请至少选择 1 项兴趣主题以便匹配合适站点。',
                ),
              );
              return;
            }
            setBusy(true);
            setError('');
            setErrorCode('');
            try {
              const result = await api('/api/itineraries', {
                days: Number(form.get('days')),
                hours: Number(form.get('hours')),
                region: String(form.get('region')),
                pace: String(form.get('pace')),
                interests,
                locale,
              });
              setSelected(result.id);
              router.refresh();
            } catch (err) {
              const code = err instanceof Error ? err.message : 'error';
              setErrorCode(code);
              setError(workspaceError(code, locale));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-pair">
            <label>
              {c('Số ngày', 'Days', '天数')}
              <select name="days" defaultValue="2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <option key={day} value={day}>
                    {day} {c('ngày', day === 1 ? 'day' : 'days', '天')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {c('Mỗi ngày có', 'Hours per day', '每日时长')}
              <select name="hours" defaultValue="6">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} {c('giờ', 'hours', '小时')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {c('Khu vực muốn khám phá', 'Area to explore', '探索区域')}
            <select name="region">
              {regions.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </label>
          <label>
            {c('Nhịp độ', 'Pace', '节奏')}
            <select name="pace">
              <option value="relaxed">
                {c('Thảnh thơi, có thời gian nghỉ', 'Relaxed, with rest breaks', '轻松悠闲，预留休息')}
              </option>
              <option value="balanced">
                {c('Cân bằng trải nghiệm', 'Balanced pace', '节奏均衡')}
              </option>
              <option value="active">
                {c('Năng động, nhiều điểm dừng', 'Active, more stops', '充实探索，更多站点')}
              </option>
            </select>
          </label>
          <fieldset>
            <legend>{c('Sở thích của cả nhà', 'Family interests', '兴趣主题')}</legend>
            <div className="dash-checkboxes">
              {interestOptions.map(([value, title]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    name="interests"
                    value={value}
                    defaultChecked={
                      value === 'monument' || value === 'architecture' || value === 'symbol'
                    }
                  />
                  {title}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="button" disabled={busy || !allowed || !ready}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{' '}
            {busy
              ? c('Đang xây lịch trình…', 'Building itinerary…', '正在生成行程…')
              : c('Tạo lịch trình của gia đình', 'Create family itinerary', '生成家庭行程')}
          </button>
          {error && (
            <div role="alert" className="status danger">
              <p style={{ margin: 0 }}>{error}</p>
              {errorCode === 'insufficientPlaces' && (
                <p style={{ margin: '6px 0 0', fontSize: '0.9em' }}>
                  {c(
                    'Gợi ý: Hãy đánh dấu thêm mục "Biểu tượng & Di sản" hoặc giảm số ngày để phù hợp với số địa điểm hiện có của khu vực này.',
                    'Tip: Enable "Landmarks & Symbols" or choose fewer days to match the documented sites in this district.',
                    '建议：勾选“地标与象征”或减少天数以匹配该区域的收录数量。',
                  )}
                </p>
              )}
              {(errorCode === 'insufficientPlaces' || errorCode === 'itineraryFailed') && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  <Link className="text-link" href={`/${locale}/explore`}>
                    {c('Xem danh bạ theo quận', 'Browse places by district', '按区浏览地点')}
                    <ArrowUpRight size={14} />
                  </Link>
                  <Link className="text-link" href={`/${locale}/experiences`}>
                    {c('Xem lộ trình mẫu', 'Explore curated walks', '查看精选路线')}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </form>
      </section>
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>YOUR TRAVEL DRAFTS</small>
            <h2>{c('Lịch trình đã tạo', 'Saved itineraries', '已生成的行程')}</h2>
          </div>
          <CalendarDays size={24} />
        </div>
        {itineraries.length ? (
          <>
            <label>
              {c('Chọn bản lịch trình', 'Select a draft', '选择行程草稿')}
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
              {c(
                'AI đề xuất từ danh mục có nguồn. Giờ đi là gợi ý; hãy kiểm tra giờ mở cửa, vé, thời tiết và tuyến di chuyển thực tế.',
                'AI draft built from documented records. Suggested times are estimates; verify opening hours, tickets, weather and transit.',
                '由收录资料生成的 AI 建议行程，时间仅供参考，请核实开放时间、门票与实时路况。',
              )}
            </p>
            {current.days.map((day) => (
              <article className="planner-day" key={day.day}>
                <h3>
                  {c('Ngày', 'Day', '第')} {day.day}
                  {locale === 'zh' ? '天' : ''}
                </h3>
                {day.stops.map((stop) => (
                  <div className="planner-stop" key={stop.slug}>
                    <time>{stop.time}</time>
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                        <Link href={`/${locale}/explore/${stop.slug}`}>
                          <MapPin size={14} />
                          {places.find((place) => place.slug === stop.slug)?.name || stop.slug}
                          <ArrowUpRight size={13} />
                        </Link>
                        <Link
                          className="text-link"
                          href={`/${locale}/map?focus=${encodeURIComponent(stop.slug)}`}
                          style={{ fontSize: '0.84em' }}
                        >
                          {c('Bản đồ', 'Map', '地图')}
                          <ArrowUpRight size={12} />
                        </Link>
                      </div>
                      <p>{stop.reason}</p>
                      <small>
                        {stop.minutes} {c('phút tại điểm', 'min at stop', '分钟停留')}
                      </small>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </>
        ) : (
          <div className="dash-empty">
            <Sparkles size={35} />
            <h3>
              {c(
                'Lịch trình đầu tiên đang chờ bạn.',
                'Your first itinerary awaits.',
                '你的第一份家庭行程等待开启。',
              )}
            </h3>
            <p>
              {c(
                'Chưa có lịch trình đã lưu. Khi tạo thành công, bản đề xuất sẽ xuất hiện ở đây — hoặc bạn có thể khám phá ngay các Story Walks tuyển chọn.',
                'No saved drafts yet. Generated plans appear here, or jump straight into our curated Saigon Story Walks.',
                '暂无保存的行程。生成后将显示在此处，你也可以先浏览精选西贡故事漫步路线。',
              )}
            </p>
            <Link className="button secondary" href={`/${locale}/experiences`} style={{ marginTop: 12 }}>
              {c('Khám phá Story Walks', 'Explore Story Walks', '探索精选漫步')}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
