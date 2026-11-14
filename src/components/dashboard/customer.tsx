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
    ['overview', 'Tổng quan', 'Overview', '概览', LayoutDashboard],
    ['billing', 'Gói & thanh toán', 'Plan & billing', '套餐与支付', CreditCard],
    ['timeline', 'Timeline map', 'Timeline map', '旅程地图', Route],
    ['planner', 'AI lên lịch trình', 'AI planner', 'AI 行程规划', Sparkles],
    ['contributions', 'Đóng góp địa điểm', 'Contributions', '地点投稿', Plus],
    ['family', 'Gia đình', 'Family', '家庭成员', Users],
    ['notifications', 'Thông báo', 'Notifications', '通知消息', Bell],
    ['settings', 'Cài đặt', 'Settings', '账户设置', Settings2],
  ] as const;
  const [tab, setTab] = useState(
    tabs.some((item) => item[0] === initialTab) ? initialTab : 'overview',
  );
  const router = useRouter();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const dateLocale = locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-GB' : 'vi-VN';
  const access = data?.access;
  const notices = data?.notifications.filter((notice) => !notice.read_at).length;
  const activeTab = tabs.find((item) => item[0] === tab);
  const dates = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale, { timeZone: 'Asia/Ho_Chi_Minh' });
  const statusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return c('Đã thanh toán', 'Paid', '已支付');
      case 'pending':
        return c('Chờ xác nhận', 'Pending', '待确认');
      case 'cancelled':
      case 'failed':
        return c('Đã hủy', 'Cancelled', '已取消');
      case 'approved':
        return c('Đã duyệt', 'Approved', '已通过');
      case 'rejected':
        return c('Từ chối', 'Rejected', '已驳回');
      default:
        return status;
    }
  };
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
            MY THÁM VĂN<small>{c('KHÔNG GIAN DI SẢN', 'SAIGON HERITAGE DESK', '西贡遗产空间')}</small>
          </span>
        </Link>
        <p className="dashboard-nav-label">
          {c('KHÔNG GIAN CỦA BẠN', 'YOUR WORKSPACE', '你的空间')}
        </p>
        <nav aria-label={c('Dashboard khách hàng', 'Customer dashboard', '客户控制台')}>
          {tabs.map(([id, vi, en, zh, Icon]) => (
            <button
              key={id}
              className={tab === id ? 'selected' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => nav(id)}
            >
              <Icon size={18} />
              <span>{c(vi, en, zh)}</span>
              {id === 'notifications' && !!notices && <b>{notices}</b>}
              {id === 'planner' && <small>FAMILY</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-discover">
          <span aria-hidden="true">✳</span>
          <h3>
            {c('Đi một vòng.', 'Take a walk.', '走一圈。')}
            <br />
            {c('Thêm một câu chuyện.', 'Collect another story.', '收藏一段故事。')}
          </h3>
          <Link href={`/${locale}/map`}>
            {c('Mở bản đồ', 'Open map', '打开地图')} <ArrowUpRight size={14} />
          </Link>
        </div>
        <Link className="sidebar-back" href={`/${locale}/explore`}>
          <ArrowUpRight size={16} />
          {c('Trở lại khám phá', 'Back to explore', '返回探索')}
        </Link>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p>
              MY THÁM VĂN <span>/</span> {activeTab ? c(activeTab[1], activeTab[2], activeTab[3]) : ''}
            </p>
            <span className="dashboard-context">
              {c('Không gian khám phá cá nhân', 'Your personal discovery space', '个人探索空间')}
            </span>
          </div>
          <div className="dashboard-top-actions">
            <button
              className="icon-button"
              aria-label={c('Mở thông báo', 'Open notifications', '打开通知')}
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
                    ? c('Chưa tải được gói', 'Plan unavailable', '暂未读取套餐')
                    : c('Chế độ xem trước', 'Preview mode', '预览模式')}
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
              {c('Đăng nhập', 'Sign in', '登录')} <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
        {unavailable && (
          <div className="dash-notice" role="status">
            {c(
              'Không thể tải dữ liệu tài khoản lúc này. Vui lòng thử lại sau ít phút.',
              'Unable to load workspace data right now. Please try again shortly.',
              '暂无法加载账户工作台数据，请稍后重试。',
            )}
          </div>
        )}
        {tab === 'overview' && (
          <>
            <section className="dashboard-welcome">
              <div>
                <p className="startup-eyebrow">
                  {c('SỔ TAY THỰC ĐỊA SÀI GÒN', 'SAIGON FIELD DESK', '西贡实地手札')}
                </p>
                <h1>
                  {c('Chào', 'Hello', '你好')},{' '}
                  {signedIn ? name.split(' ').at(-1) : c('nhà khám phá', 'Explorer', '探索者')}
                  <span>.</span>
                  <br />
                  {c('Hôm nay mình đi đâu?', 'Where will today take you?', '今天想去哪里？')}
                </h1>
                <p>
                  {c(
                    'Mỗi điểm đến bạn ghé là một mảnh ghép của thành phố. Giữ lại hành trình và tìm câu chuyện tiếp theo.',
                    'Every place you visit adds a piece to the city archive. Save your journey and uncover the next story.',
                    '你到访的每一处都是城市记忆的拼图。保存行程，继续发现下一段故事。',
                  )}
                </p>
                <div className="dash-actions">
                  <Link className="button" href={`/${locale}/map`}>
                    {c('Khám phá quanh tôi', 'Explore nearby', '探索周边')} <ArrowUpRight size={17} />
                  </Link>
                  <Link className="button secondary" href={`/${locale}/camera`}>
                    <Camera size={17} />
                    {c('Chụp để khám phá', 'Recognize by camera', '拍照识景')}
                  </Link>
                </div>
                {data?.xp && (
                  <p className="dashboard-xp-pill">
                    <Sparkles size={14} />
                    <span>
                      {c(
                        `Cấp ${data.xp.level} · ${data.xp.earned} XP · Còn ${data.xp.toNext} XP tới cấp tiếp theo`,
                        `Level ${data.xp.level} · ${data.xp.earned} XP · ${data.xp.toNext} XP to next level`,
                        `等级 ${data.xp.level} · ${data.xp.earned} XP · 距下一级还差 ${data.xp.toNext} XP`,
                      )}
                    </span>
                  </p>
                )}
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
                label={c('Địa điểm đã ghé', 'Places visited', '已访地点')}
                value={data ? new Set(data.visits.map((visit) => visit.entry_slug)).size : '—'}
                detail={c(
                  'Trong 100 lượt ghé gần nhất',
                  'Across your 100 most recent visits',
                  '最近 100 次到访记录内',
                )}
                icon={<MapPin size={20} />}
              />
              <Metric
                label={c('Thử thách hôm nay', 'Daily challenges', '今日挑战')}
                value={
                  access
                    ? `${access.challenge_used}${access.challenge_limit === null ? '' : ` / ${access.challenge_limit}`}`
                    : '—'
                }
                detail={
                  access?.challenge_limit === null
                    ? c(
                        'Không giới hạn số thử thách',
                        'Unlimited challenges',
                        '每日挑战次数不限',
                      )
                    : c(
                        'Theo ngày tại Việt Nam',
                        'Daily allowance (Vietnam time)',
                        '按越南时间每日计算',
                      )
                }
                icon={<Trophy size={20} />}
              />
              <Metric
                label={c('Chuyến đi đã ghi', 'Recorded trips', '已记录行程')}
                value={data ? data.trips.length : '—'}
                detail={c(
                  'GPS được ghi khi bạn đồng ý',
                  'GPS recorded only with your consent',
                  '仅在您授权时记录 GPS',
                )}
                icon={<Route size={20} />}
              />
              <Metric
                label={c('Lịch trình AI', 'AI itineraries', 'AI 行程')}
                value={data ? data.itineraries.length : '—'}
                detail={c(
                  'Bản đã tạo, chờ bạn kiểm tra',
                  'Generated drafts awaiting review',
                  '已生成并待您确认的行程',
                )}
                icon={<Sparkles size={20} />}
              />
            </div>
            <div className="dashboard-overview-grid">
              <section className="dash-panel">
                <div className="dash-panel-heading">
                  <div>
                    <small>{c('NHẬT KÝ GẦN ĐÂY', 'YOUR NEXT STEPS', '近期足迹')}</small>
                    <h2>{c('Tiếp tục hành trình', 'Continue your journey', '继续您的旅程')}</h2>
                  </div>
                  <button className="text-link" onClick={() => nav('timeline')}>
                    {c('Xem tất cả', 'View all', '查看全部')} <ChevronRight size={16} />
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
                            {visit.method === 'gps'
                              ? c('GPS xác nhận', 'GPS verified', 'GPS 实地验证')
                              : c('Tự đánh dấu', 'Self-marked', '手动标记')}
                          </small>
                        </div>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={c('Một điểm đến đầu tiên?', 'Ready for your first stop?', '准备打卡第一站了吗？')}
                    description={c(
                      'Chưa có lượt ghé được ghi nhận. Chọn một nơi trong bản đồ, rồi đánh dấu khi bạn đã đến.',
                      'No visits recorded yet. Pick a landmark on the map and mark it once you arrive.',
                      '尚无到访记录。请在地图中选择一处地标，抵达后即可打卡保存。',
                    )}
                  >
                    <Link className="text-link" href={`/${locale}/explore`}>
                      {c('Tìm địa điểm', 'Find places', '查找地点')} <ArrowUpRight size={15} />
                    </Link>
                  </EmptyState>
                )}
              </section>
              <section className="dash-panel current-plan-panel">
                <div className="dash-panel-heading">
                  <div>
                    <small>{c('HỘI VIÊN THÁM VĂN', 'YOUR MEMBERSHIP', '会员方案')}</small>
                    <h2>
                      {access ? plans[access.plan].name : c('Gói dành cho bạn', 'Plans for you', '您的会员方案')}
                    </h2>
                  </div>
                  <Gem size={25} />
                </div>
                <p>
                  {access?.plan === 'family'
                    ? c(
                        'Gia đình 4 thành viên, AI lên lịch trình và toàn bộ tính năng Premium.',
                        'Up to 4 family members, AI itinerary planner, and all Premium features.',
                        '支持 4 位家庭成员、AI 行程规划及全部 Premium 功能。',
                      )
                    : access?.plan === 'premium'
                      ? c(
                          'Khám phá không giới hạn thử thách, đọc và tải bộ hướng dẫn chuyên sâu.',
                          'Unlimited daily challenges with full access to in-depth field guides.',
                          '无限次每日挑战，畅读并下载深度实地指南。',
                        )
                      : c(
                          'Bắt đầu với Free. Nâng cấp khi bạn muốn đi xa hơn cùng thành phố.',
                          'Start with Free and upgrade whenever you want deeper itineraries and tools.',
                          '从 Free 版起步，随时升级解锁更多城市探索功能。',
                        )}
                </p>
                {access?.expires_at && (
                  <div className="plan-expiry">
                    <CalendarDays size={16} />
                    {c('Hiệu lực đến', 'Valid until', '有效期至')} {dates(access.expires_at)}
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
                    ? c(
                        'Không giới hạn số thử thách/ngày',
                        'Unlimited challenges per day',
                        '每日挑战次数无限制',
                      )
                    : access
                      ? c(
                          `Còn ${Math.max(0, (access.challenge_limit ?? 5) - access.challenge_used)} thử thách hôm nay`,
                          `${Math.max(0, (access.challenge_limit ?? 5) - access.challenge_used)} challenges remaining today`,
                          `今日还剩 ${Math.max(0, (access.challenge_limit ?? 5) - access.challenge_used)} 次挑战`,
                        )
                      : c(
                          'Free có 5 thử thách mỗi ngày',
                          'Free includes 5 challenges per day',
                          'Free 版每日含 5 次挑战',
                        )}
                </small>
                <button className="button" onClick={() => nav('billing')}>
                  {access?.plan === 'free' || !access
                    ? c('Khám phá các gói', 'Explore plans', '查看套餐')
                    : c('Quản lý gói & gia hạn', 'Manage plan & renewal', '管理与续费')}
                  <ArrowUpRight size={16} />
                </button>
                <p className="plan-footnote">
                  {c(
                    'Free · Premium 39k · Family 89k / tháng',
                    'Free · Premium 39k · Family 89k VND / month',
                    'Free · Premium 39k · Family 89k 越盾 / 月',
                  )}
                </p>
              </section>
            </div>
            <section className="dashboard-ai-banner">
              <span>
                <Sparkles size={27} />
              </span>
              <div>
                <small>PREMIUM FAMILY</small>
                <h2>
                  {c(
                    '2 ngày ở Sài Gòn. Một lịch trình cho cả nhà.',
                    '2 days in Saigon. One itinerary for the whole family.',
                    '两天西贡行，一份全家人的行程单。',
                  )}
                </h2>
                <p>
                  {c(
                    'Chọn khu vực, thời gian và sở thích. AI gợi ý các địa điểm từ danh mục có nguồn.',
                    'Pick districts, pace, and interests. AI drafts stops strictly from sourced heritage records.',
                    '选择区域、时长与兴趣，AI 基于有据可查的遗产名录为您编排路线。',
                  )}
                </p>
              </div>
              <button className="button secondary" onClick={() => nav('planner')}>
                {c('Lên kế hoạch', 'Plan itinerary', '开始规划')} <ArrowUpRight size={16} />
              </button>
            </section>
          </>
        )}
        {tab === 'billing' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">
                {c('GÓI HỘI VIÊN THÁM VĂN', 'PLANS THAT FIT YOUR JOURNEY', '适合您旅程的方案')}
              </p>
              <h1>{c('Gói & thanh toán', 'Plan & billing', '套餐与支付')}</h1>
              <p>
                {c(
                  'Chỉ ba gói. Không tự trừ tiền. Quyền truy cập mở sau xác nhận thanh toán.',
                  'Three transparent tiers. No silent recurring charges. Access opens after payment verification.',
                  '仅设三档套餐，无静默扣费，付款核验后即刻开通权益。',
                )}
              </p>
            </div>
            <MembershipPricing locale={locale} />
            <section className="dash-panel" style={{ marginTop: 30 }}>
              <div className="dash-panel-heading">
                <h2>{c('Lịch sử thanh toán', 'Payment history', '支付记录')}</h2>
                <CreditCard size={22} />
              </div>
              <div className="dash-table">
                <table>
                  <thead>
                    <tr>
                      <th>{c('Mã đơn', 'Order code', '订单号')}</th>
                      <th>{c('Gói', 'Plan', '套餐')}</th>
                      <th>{c('Số tiền', 'Amount', '金额')}</th>
                      <th>{c('Trạng thái', 'Status', '状态')}</th>
                      <th>{c('Ngày tạo', 'Created', '创建时间')}</th>
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
                            <span className={`status-tag ${order.status}`}>
                              {statusLabel(order.status)}
                            </span>
                          </td>
                          <td>{dates(order.created_at)}</td>
                          <td>
                            <Link href={`/${locale}/billing/${order.id}`}>
                              {c('Xem đơn', 'View order', '查看订单')} <ArrowUpRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          {c(
                            'Chưa có đơn hàng nào. Khi bạn tạo yêu cầu nâng cấp hoặc mua trải nghiệm, trạng thái sẽ cập nhật tại đây.',
                            'No orders recorded yet. Upgrade requests and experience orders will appear here.',
                            '暂无订单记录。您创建的套餐升级或体验订单将在此更新状态。',
                          )}
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
              <p className="startup-eyebrow">
                {c('NHẬT KÝ THỰC ĐỊA', 'YOUR TRAVEL TIMELINE', '实地旅程时间轴')}
              </p>
              <h1>
                {c(
                  'Lưu lại những km bạn đã đi.',
                  'Keep every kilometer you have walked.',
                  '珍藏您走过的每一公里。',
                )}
              </h1>
              <p>
                {c(
                  'Quay lại hành trình bằng các điểm GPS do bạn chủ động ghi.',
                  'Replay your routes from GPS coordinates recorded with your explicit consent.',
                  '通过您主动记录的 GPS 坐标重温沿途轨迹。',
                )}
              </p>
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
              <h1>
                {c(
                  'Từ “đi đâu?” đến một lịch trình.',
                  'From “where should we go?” to a structured itinerary.',
                  '从“去哪儿？”到一份完整出行计划。',
                )}
              </h1>
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
              <p className="startup-eyebrow">
                {c('CÙNG ĐI CÙNG NHỚ', 'GOOD STORIES ARE BETTER TOGETHER', '同行共享记忆')}
              </p>
              <h1>{c('Gia đình của bạn', 'Your family group', '您的家庭群组')}</h1>
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
              <p className="startup-eyebrow">
                {c('ĐÓNG GÓP HỒ SƠ DI SẢN', 'A CITY ARCHIVE BUILT TOGETHER', '共建城市档案')}
              </p>
              <h1>
                {c(
                  'Thêm một địa điểm đáng được biết đến.',
                  'Nominate a landmark worth documenting.',
                  '推荐一处值得收录的文化地标。',
                )}
              </h1>
              <p>
                {c(
                  'Đề xuất sẽ gửi đến ban biên tập kiểm duyệt nguồn. Chỉ nội dung được duyệt mới xuất hiện trong danh mục công khai.',
                  'Submissions are reviewed by our editorial team for source verification before joining the public archive.',
                  '投稿将提交编辑团队核验来源，仅通过审核的内容会收入公开名录。',
                )}
              </p>
            </div>
            <div className="dash-two-columns">
              <section className="dash-panel">
                <h2>{c('Gửi đề xuất địa điểm', 'Submit a place nomination', '提交地点推荐')}</h2>
                <ActionForm
                  locale={locale}
                  disabled={!signedIn || !data}
                  submit={c('Gửi admin xét duyệt', 'Submit for editorial review', '提交管理员审核')}
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
                    {c('Tên địa điểm', 'Place name', '地点名称')}
                    <input name="name" required minLength={3} maxLength={160} />
                  </label>
                  <label>
                    {c('Địa chỉ', 'Address', '地址')}
                    <input name="address" required minLength={5} maxLength={250} />
                  </label>
                  <label>
                    {c('Khu vực', 'District / region', '区域 / 郡县')}
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
                      {c('Vĩ độ', 'Latitude', '纬度')}
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
                      {c('Kinh độ', 'Longitude', '经度')}
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
                    {c('Giới thiệu có thể kiểm tra', 'Verifiable summary', '可核验简介')}
                    <textarea name="summary" minLength={30} maxLength={2000} rows={4} required />
                  </label>
                  <label>
                    {c('Đường dẫn nguồn HTTPS', 'HTTPS reference URL', 'HTTPS 参考来源链接')}
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
                      {c(
                        'Tôi có quyền chia sẻ nội dung này, không đưa dữ liệu cá nhân nhạy cảm và đồng ý để quản trị kiểm duyệt trước khi xuất bản.',
                        'I have the right to share this record, omit sensitive personal data, and agree to editorial review prior to publication.',
                        '我确认有权分享此内容、不含敏感个人信息，并同意经审核后再公开收录。',
                      )}
                    </span>
                  </label>
                </ActionForm>
              </section>
              <section className="dash-panel">
                <h2>{c('Đề xuất của tôi', 'My submissions', '我的投稿记录')}</h2>
                {data?.submissions.length ? (
                  data.submissions.map((item) => (
                    <article className="submission-row" key={item.id}>
                      <span className={`status-tag ${item.status}`}>
                        {statusLabel(item.status)}
                      </span>
                      <h3>{item.name}</h3>
                      <p>{item.address}</p>
                      <small>{dates(item.created_at)}</small>
                      {item.review_note && (
                        <div className="dash-notice">
                          {c('Phản hồi quản trị:', 'Editorial note:', '审核意见：')} {item.review_note}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title={c('Chưa có đề xuất', 'No submissions yet', '暂无投稿')}
                    description={c(
                      'Các đề xuất đã gửi và phản hồi duyệt sẽ được lưu ở đây.',
                      'Submitted landmarks and editorial feedback will be archived here.',
                      '您提交的地点建议和审核反馈将保存在此处。',
                    )}
                  />
                )}
              </section>
            </div>
          </>
        )}
        {tab === 'notifications' && (
          <>
            <div className="dash-page-title">
              <p className="startup-eyebrow">
                {c('CẬP NHẬT TÀI KHOẢN', 'STAY CONNECTED', '消息动态')}
              </p>
              <h1>{c('Thông báo của bạn', 'Your notifications', '您的通知')}</h1>
            </div>
            <PushSettings locale={locale} ready={pushConnected} signedIn={signedIn} />
            <section className="dash-panel" style={{ marginTop: 25 }}>
              <h2>{c('Hộp thư trong ứng dụng', 'In-app inbox', '应用内收件箱')}</h2>
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
                        submit={c('Đã đọc', 'Mark read', '标为已读')}
                        values={() => ({ action: 'readNotification', id: notice.id })}
                      >
                        <span className="sr-only">
                          {c('Đánh dấu thông báo đã đọc', 'Mark notification as read', '将通知标为已读')}
                        </span>
                      </ActionForm>
                    )}
                  </article>
                ))
              ) : (
                <EmptyState
                  title={c('Chưa có thông báo', 'No notifications', '暂无通知')}
                  description={c(
                    'Phản hồi đề xuất và các cập nhật sẽ xuất hiện ở đây. Không cần bật push để đọc thông báo trong ứng dụng.',
                    'Review updates and account notices appear here without requiring browser push.',
                    '审核反馈和账户动态会在此显示，无需开启浏览器推送即可查看。',
                  )}
                />
              )}
            </section>
          </>
        )}
        {tab === 'settings' && (
          <>
            <div className="dash-page-title">
              <h1>{c('Tài khoản & quyền riêng tư', 'Account & privacy', '账户与隐私设置')}</h1>
              <p>
                {c(
                  'Bạn quyết định dữ liệu nào được lưu và thiết bị nào được nhận thông báo.',
                  'You control which activity records are saved and which devices receive notifications.',
                  '由您决定保留哪些记录以及哪些设备接收通知。',
                )}
              </p>
            </div>
            <section className="dash-panel">
              <h2>{c('Quản lý tài khoản', 'Account management', '账户管理')}</h2>
              <p>
                {c(
                  'Chỉnh hồ sơ, ngôn ngữ, xuất dữ liệu và xóa tài khoản tại trang Cá nhân. Video tạo từ hành trình GPS chỉ tải về thiết bị khi bạn yêu cầu.',
                  'Edit your profile, language, export archive, or delete your account from the Profile page. GPS replay videos are rendered and downloaded locally on request.',
                  '您可以在个人档案页修改资料、语言、导出或删除数据。GPS 回放视频仅在您请求时于本地生成下载。',
                )}
              </p>
              <div className="dash-actions">
                <Link className="button" href={`/${locale}/profile`}>
                  {c('Mở cài đặt cá nhân', 'Open profile settings', '打开个人设置')}{' '}
                  <ArrowUpRight size={15} />
                </Link>
                <Link className="button secondary" href={`/${locale}/privacy`}>
                  {c('Chính sách dữ liệu', 'Privacy policy', '隐私政策')}
                </Link>
              </div>
            </section>
          </>
        )}
        <footer className="dashboard-footnote">
          <span>
            <CheckCircle2 size={13} /> {c('DỮ LIỆU CỦA BẠN', 'YOUR DATA. YOUR JOURNEY.', '您的资料 · 您的旅程')}
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

