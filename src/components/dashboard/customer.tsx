'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Compass,
  CreditCard,
  Gem,
  LayoutDashboard,
  MapPin,
  Plus,
  Route,
  Settings2,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import type { AccountWorkspace } from '@/lib/workspace';
import type { Locale } from '@/lib/types';
import { plans } from '@/lib/plans';
import { copy, money } from '@/lib/locale-copy';
import { MembershipPricing } from '@/components/membership/pricing';
import { ActionForm, EmptyState, Metric } from './common';
import { PushSettings } from './notifications';
import { Planner } from './planner';
import { FamilyManager } from './family';
import { TravelTimeline } from './timeline';
import './dashboard.css';

export function CustomerDashboard({
  locale,
  name,
  signedIn,
  data,
  unavailable,
  pushConnected,
  aiConnected,
  regions,
  places,
  initialTab,
  invite,
}: {
  locale: Locale;
  name: string;
  signedIn: boolean;
  data: AccountWorkspace | null;
  unavailable: boolean;
  pushConnected: boolean;
  aiConnected: boolean;
  regions: string[];
  places: { slug: string; name: string }[];
  initialTab: string;
  invite?: string;
}) {
  const tabs = [
    ['overview', 'Tổng quan', 'Overview', LayoutDashboard],
    ['billing', 'Gói & thanh toán', 'Plan & billing', CreditCard],
    ['timeline', 'Timeline map', 'Timeline map', Route],
    ['planner', 'AI lên lịch trình', 'AI planner', Sparkles],
    ['contributions', 'Đóng góp địa điểm', 'Contributions', Plus],
    ['family', 'Gia đình', 'Family', Users],
    ['notifications', 'Thông báo', 'Notifications', Bell],
    ['settings', 'Cài đặt', 'Settings', Settings2],
  ] as const;
  const [tab, setTab] = useState(
    tabs.some((item) => item[0] === initialTab) ? initialTab : 'overview',
  );
  const router = useRouter();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const access = data?.access;
  const notices = data?.notifications.filter((notice) => !notice.read_at).length;
  const dates = (value: string) =>
    new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const nav = (id: string) => {
    setTab(id);
    router.replace(`/${locale}/dashboard?tab=${id}`, { scroll: false });
  };
  return (
    <div className="dashboard-wrap">
      <aside className="dashboard-sidebar">
        <Link href={`/${locale}/dashboard`} className="dashboard-brand">
          <Compass size={25} />
          <span>
            MY THÁM VĂN<small>YOUR EXPLORER SPACE</small>
          </span>
        </Link>
        <p className="dashboard-nav-label">
          {c('KHÔNG GIAN CỦA BẠN', 'YOUR WORKSPACE', '你的空间')}
        </p>
        <nav aria-label={c('Dashboard khách hàng', 'Customer dashboard', '客户控制台')}>
          {tabs.map(([id, vi, en, Icon]) => (
            <button
              key={id}
              className={tab === id ? 'selected' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => nav(id)}
            >
              <Icon size={18} />
              <span>{locale === 'en' ? en : vi}</span>
              {id === 'notifications' && !!notices && <b>{notices}</b>}
              {id === 'planner' && <small>FAMILY</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-discover">
          <span aria-hidden="true">✳</span>
          <h3>
            Đi một vòng.
            <br />
            Thêm một câu chuyện.
          </h3>
          <Link href={`/${locale}/map`}>
            Mở bản đồ <ArrowUpRight size={14} />
          </Link>
        </div>
        <Link className="sidebar-back" href={`/${locale}/explore`}>
          <ArrowUpRight size={16} />
          Trở lại khám phá
        </Link>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p>
              MY THÁM VĂN <span>/</span> {tabs.find((item) => item[0] === tab)?.[1]}
            </p>
            <span className="dashboard-context">
              {c('Không gian khám phá cá nhân', 'Your personal discovery space', '个人探索空间')}
            </span>
          </div>
          <div className="dashboard-top-actions">
            <button
              className="icon-button"
              aria-label="Mở thông báo"
              onClick={() => nav('notifications')}
            >
              <Bell size={18} />
              {!!notices && <i />}
            </button>
            <span className="dash-avatar">
              {signedIn ? name.slice(0, 2).toLocaleUpperCase('vi') : 'TV'}
            </span>
            <div>
              <strong>{name}</strong>
              <small>
                {access
                  ? plans[access.plan].name
                  : signedIn
                    ? 'Chưa tải được gói'
                    : 'Chế độ xem trước'}
              </small>
            </div>
          </div>
        </header>
        {!signedIn && (
          <div className="dashboard-preview-note">
            <span>
              <Compass size={17} />
              {c(
                'Đang xem trước dashboard. Đăng nhập để lưu hành trình, mua gói và đóng góp địa điểm.',
                'Dashboard preview. Sign in to save journeys, buy a plan and contribute places.',
                '控制台预览，登录以保存旅程、购买套餐和贡献地点。',
              )}
            </span>
            <Link href={`/${locale}/auth/login?next=/${locale}/dashboard`}>
              Đăng nhập <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
        {unavailable && (
          <div className="dash-notice" role="status">
            Chưa đọc được dữ liệu dashboard. Gói và lịch sử không được giả lập; kiểm tra kết nối và
            migration membership.
          </div>
        )}
        {tab === 'overview' && (
          <>
            <section className="dashboard-welcome">
              <div>
                <p className="startup-eyebrow">A NEW DAY, A NEW STORY</p>
                <h1>
                  {c('Chào', 'Hello', '你好')}, {signedIn?name.split(' ').at(-1):'nhà khám phá'}
                  <span>.</span>
                  <br />
                  {c('Hôm nay mình đi đâu?', 'Where will today take you?', '今天想去哪里？')}
                </h1>
                <p>
                  Mỗi điểm đến bạn ghé là một mảnh ghép của thành phố. Giữ lại hành trình và tìm câu
                  chuyện tiếp theo.
                </p>
                <div className="dash-actions">
                  <Link className="button" href={`/${locale}/map`}>
                    Khám phá quanh tôi <ArrowUpRight size={17} />
                  </Link>
                  <Link className="button secondary" href={`/${locale}/camera`}>
                    <Camera size={17} />
                    Chụp để khám phá
                  </Link>
                </div>
              </div>
              <div className="dashboard-passport" aria-hidden="true">
                <Compass size={38} strokeWidth={1} />
                <span>
                  THÁM VĂN
                  <br />
                  <small>EXPLORER PASSPORT</small>
                </span>
                <div>
                  <MapPin size={25} />
                  <Route size={25} />
                  <Trophy size={25} />
                </div>
                <p>SAIGON / YOUR STORY</p>
              </div>
            </section>
            <div className="dash-metrics">
              <Metric
                label="Địa điểm đã ghé"
                value={data ? new Set(data.visits.map((visit) => visit.entry_slug)).size : '—'}
                detail="Trong 100 lượt ghé gần nhất"
                icon={<MapPin size={20} />}
              />
              <Metric
                label="Thử thách hôm nay"
                value={
                  access
                    ? `${access.challenge_used}${access.challenge_limit === null ? '' : ` / ${access.challenge_limit}`}`
                    : '—'
                }
                detail={
                  access?.challenge_limit === null
                    ? 'Không giới hạn số thử thách'
                    : 'Theo ngày tại Việt Nam'
                }
                icon={<Trophy size={20} />}
              />
              <Metric
                label="Chuyến đi đã ghi"
                value={data ? data.trips.length : '—'}
                detail="GPS được ghi khi bạn đồng ý"
                icon={<Route size={20} />}
              />
              <Metric
                label="Lịch trình AI"
                value={data ? data.itineraries.length : '—'}
                detail="Bản đã tạo, chờ bạn kiểm tra"
                icon={<Sparkles size={20} />}
              />
            </div>
            <div className="dashboard-overview-grid">
              <section className="dash-panel">
                <div className="dash-panel-heading">
                  <div>
                    <small>YOUR NEXT STEPS</small>
                    <h2>Tiếp tục hành trình</h2>
                  </div>
                  <button className="text-link" onClick={() => nav('timeline')}>
                    Xem tất cả <ChevronRight size={16} />
                  </button>
                </div>
                {data?.visits.length ? (
                  <div className="recent-visits">
                    {data.visits.slice(0, 4).map((visit) => (
                      <Link key={visit.id} href={`/${locale}/explore/${visit.entry_slug}`}>
                        <span>
                          <MapPin size={19} />
                        </span>
                        <div>
                          <strong>{visit.place_name}</strong>
                          <small>
                            {dates(visit.visited_at)} ·{' '}
                            {visit.method === 'gps' ? 'GPS cung cấp' : 'Tự đánh dấu'}
                          </small>
                        </div>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Một điểm đến đầu tiên?"
                    description="Chưa có lượt ghé được ghi nhận. Chọn một nơi trong bản đồ, rồi đánh dấu khi bạn đã đến."
                  >
                    <Link className="text-link" href={`/${locale}/explore`}>
                      Tìm địa điểm <ArrowUpRight size={15} />
                    </Link>
                  </EmptyState>
                )}
              </section>
              <section className="dash-panel current-plan-panel">
                <div className="dash-panel-heading">
                  <div>
                    <small>YOUR MEMBERSHIP</small>
                    <h2>{access ? plans[access.plan].name : 'Gói dành cho bạn'}</h2>
                  </div>
                  <Gem size={25} />
                </div>
                <p>
                  {access?.plan === 'family'
                    ? 'Gia đình 4 thành viên, AI lên lịch trình và toàn bộ tính năng Premium.'
                    : access?.plan === 'premium'
                      ? 'Khám phá không giới hạn thử thách, đọc và tải bộ hướng dẫn chuyên sâu.'
                      : 'Bắt đầu với Free. Nâng cấp khi bạn muốn đi xa hơn cùng thành phố.'}
                </p>
                {access?.expires_at && (
                  <div className="plan-expiry">
                    <CalendarDays size={16} />
                    Hiệu lực đến {dates(access.expires_at)}
                  </div>
                )}
                <div className="plan-meter">
                  <span
                    style={{
                      width: access?.challenge_limit
                        ? `${Math.min(100, (access.challenge_used / access.challenge_limit) * 100)}%`
                        : '100%',
                    }}
                  />
                </div>
                <small>
                  {access?.challenge_limit === null
                    ? 'Không giới hạn số thử thách/ngày'
                    : access
                      ? `Còn ${Math.max(0, 5 - access.challenge_used)} thử thách hôm nay`
                      : 'Free có 5 thử thách mỗi ngày'}
                </small>
                <button className="button" onClick={() => nav('billing')}>
                  {access?.plan === 'free' || !access
                    ? 'Khám phá các gói'
                    : 'Quản lý gói & gia hạn'}
                  <ArrowUpRight size={16} />
                </button>
                <p className="plan-footnote">Free · Premium 39k · Family 89k / tháng</p>
              </section>
            </div>
            <section className="dashboard-ai-banner">
              <span>
                <Sparkles size={27} />
              </span>
              <div>
                <small>PREMIUM FAMILY</small>
                <h2>2 ngày ở Sài Gòn. Một lịch trình cho cả nhà.</h2>
                <p>
                  Chọn khu vực, thời gian và sở thích. AI gợi ý các địa điểm từ danh mục có nguồn.
                </p>
              </div>
              <button className="button secondary" onClick={() => nav('planner')}>
                Lên kế hoạch <ArrowUpRight size={16} />
              </button>
            </section>
          </>
        )}
        {tab === 'billing' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">PLANS THAT FIT YOUR JOURNEY</p>
              <h1>Gói & thanh toán</h1>
              <p>Chỉ ba gói. Không tự trừ tiền. Quyền truy cập mở sau xác nhận thanh toán.</p>
            </div>
            <MembershipPricing locale={locale} />
            <section className="dash-panel" style={{ marginTop: 30 }}>
              <div className="dash-panel-heading">
                <h2>Lịch sử thanh toán</h2>
                <CreditCard size={22} />
              </div>
              <div className="dash-table">
                <table>
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Gói</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data?.orders.length ? (
                      data.orders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.order_code}</td>
                          <td>{plans[order.plan_id].name}</td>
                          <td>{money(order.amount, locale)}</td>
                          <td>
                            <span className={`status-tag ${order.status}`}>{order.status}</span>
                          </td>
                          <td>{dates(order.created_at)}</td>
                          <td>
                            <Link href={`/${locale}/billing/${order.id}`}>
                              Xem đơn <ArrowUpRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          Chưa có dữ liệu đơn hàng đã tải. Đơn chờ không được tính là đã thanh toán.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {tab === 'timeline' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">YOUR TRAVEL TIMELINE</p>
              <h1>Lưu lại những km bạn đã đi.</h1>
              <p>Quay lại hành trình bằng các điểm GPS do bạn chủ động ghi.</p>
            </div>
            <TravelTimeline
              locale={locale}
              trips={data?.trips || []}
              visits={data?.visits || []}
              signedIn={signedIn && !!data}
            />
          </>
        )}
        {tab === 'planner' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">FAMILY AI PLANNER</p>
              <h1>Từ “đi đâu?” đến một lịch trình.</h1>
            </div>
            <Planner
              locale={locale}
              regions={regions}
              places={places}
              itineraries={data?.itineraries || []}
              allowed={access?.plan === 'family'}
              ready={aiConnected}
            />
          </>
        )}
        {tab === 'family' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">GOOD STORIES ARE BETTER TOGETHER</p>
              <h1>Gia đình của bạn</h1>
            </div>
            <FamilyManager
              locale={locale}
              access={access || null}
              members={data?.family || []}
              signedIn={signedIn && !!data}
              invite={invite}
            />
          </>
        )}
        {tab === 'contributions' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">A CITY BUILT BY ITS EXPLORERS</p>
              <h1>Thêm một địa điểm đáng được biết đến.</h1>
              <p>
                Đề xuất sẽ gửi đến quản trị viên. Chỉ nội dung được duyệt mới xuất hiện trong danh
                mục công khai.
              </p>
            </div>
            <div className="dash-two-columns">
              <section className="dash-panel">
                <h2>Gửi đề xuất địa điểm</h2>
                <ActionForm
                  locale={locale}
                  disabled={!signedIn || !data}
                  submit="Gửi admin xét duyệt"
                  values={(form) => ({
                    action: 'submitPlace',
                    name: form.get('name'),
                    address: form.get('address'),
                    region: form.get('region'),
                    summary: form.get('summary'),
                    latitude: Number(form.get('latitude')),
                    longitude: Number(form.get('longitude')),
                    source: form.get('source'),
                    consent: true,
                  })}
                >
                  <label>
                    Tên địa điểm
                    <input name="name" required minLength={3} maxLength={160} />
                  </label>
                  <label>
                    Địa chỉ
                    <input name="address" required minLength={5} maxLength={250} />
                  </label>
                  <label>
                    Khu vực
                    <input
                      name="region"
                      required
                      minLength={2}
                      maxLength={80}
                      list="submission-regions"
                    />
                    <datalist id="submission-regions">
                      {regions.map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </datalist>
                  </label>
                  <div className="form-pair">
                    <label>
                      Vĩ độ
                      <input
                        name="latitude"
                        type="number"
                        step="any"
                        min="8"
                        max="12"
                        required
                        placeholder="10.78"
                      />
                    </label>
                    <label>
                      Kinh độ
                      <input
                        name="longitude"
                        type="number"
                        step="any"
                        min="105"
                        max="108"
                        required
                        placeholder="106.70"
                      />
                    </label>
                  </div>
                  <label>
                    Giới thiệu có thể kiểm tra
                    <textarea name="summary" minLength={30} maxLength={2000} rows={4} required />
                  </label>
                  <label>
                    Đường dẫn nguồn HTTPS
                    <input
                      name="source"
                      type="url"
                      maxLength={1000}
                      required
                      placeholder="https://…"
                    />
                  </label>
                  <label className="check-label">
                    <input type="checkbox" required />
                    <span>
                      Tôi có quyền chia sẻ nội dung này, không đưa dữ liệu cá nhân nhạy cảm và đồng
                      ý để quản trị kiểm duyệt trước khi xuất bản.
                    </span>
                  </label>
                </ActionForm>
              </section>
              <section className="dash-panel">
                <h2>Đề xuất của tôi</h2>
                {data?.submissions.length ? (
                  data.submissions.map((item) => (
                    <article className="submission-row" key={item.id}>
                      <span className={`status-tag ${item.status}`}>{item.status}</span>
                      <h3>{item.name}</h3>
                      <p>{item.address}</p>
                      <small>{dates(item.created_at)}</small>
                      {item.review_note && (
                        <div className="dash-notice">Phản hồi quản trị: {item.review_note}</div>
                      )}
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title="Chưa có đề xuất"
                    description="Các đề xuất đã gửi và phản hồi duyệt sẽ được lưu ở đây."
                  />
                )}
              </section>
            </div>
          </>
        )}
        {tab === 'notifications' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">STAY CONNECTED</p>
              <h1>Thông báo của bạn</h1>
            </div>
            <PushSettings locale={locale} ready={pushConnected} signedIn={signedIn} />
            <section className="dash-panel" style={{ marginTop: 25 }}>
              <h2>Hộp thư trong ứng dụng</h2>
              {data?.notifications.length ? (
                data.notifications.map((notice) => (
                  <article
                    className={`notification-row ${notice.read_at ? '' : 'unread'}`}
                    key={notice.id}
                  >
                    <Bell size={18} />
                    <div>
                      <strong>{notice.title}</strong>
                      <p>{notice.body}</p>
                      <small>{dates(notice.created_at)}</small>
                    </div>
                    {!notice.read_at && (
                      <ActionForm
                        locale={locale}
                        submit="Đã đọc"
                        values={() => ({ action: 'readNotification', id: notice.id })}
                      >
                        <span className="sr-only">Đánh dấu thông báo đã đọc</span>
                      </ActionForm>
                    )}
                  </article>
                ))
              ) : (
                <EmptyState
                  title="Chưa có thông báo"
                  description="Phản hồi đề xuất và các cập nhật sẽ xuất hiện ở đây. Không cần bật push để đọc thông báo trong ứng dụng."
                />
              )}
            </section>
          </>
        )}
        {tab === 'settings' && (
          <>
            <div className="dash-page-title">
              <h1>Tài khoản & quyền riêng tư</h1>
              <p>Bạn quyết định dữ liệu nào được lưu và thiết bị nào được nhận thông báo.</p>
            </div>
            <section className="dash-panel">
              <h2>Quản lý tài khoản</h2>
              <p>
                Chỉnh hồ sơ, ngôn ngữ, xuất dữ liệu và xóa tài khoản tại trang Cá nhân. Video tạo từ
                hành trình GPS chỉ tải về thiết bị khi bạn yêu cầu.
              </p>
              <div className="dash-actions">
                <Link className="button" href={`/${locale}/profile`}>
                  Mở cài đặt cá nhân <ArrowUpRight size={15} />
                </Link>
                <Link className="button secondary" href={`/${locale}/privacy`}>
                  Chính sách dữ liệu
                </Link>
              </div>
            </section>
          </>
        )}
        <footer className="dashboard-footnote">
          <span>
            <CheckCircle2 size={13} /> YOUR DATA. YOUR JOURNEY.
          </span>
          <span>
            THÁM VĂN ·{' '}
            {c(
              'Khám phá có nguồn, hành trình của bạn.',
              'Sourced discovery. Your journey.',
              '有据探索，专属旅程。',
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}

