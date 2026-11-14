'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  Coins,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { Locale } from '@/lib/types';
import type { PlanOrder, Submission } from '@/lib/workspace';
import { plans, type MembershipAccess } from '@/lib/plans';
import { copy, money } from '@/lib/locale-copy';
import { ActionForm, EmptyState, Metric } from './common';
import './dashboard.css';

function safeSourceUrl(raw?: string | null) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export type AdminWorkspace = {
  since: string;
  revenue: number;
  refunds: number;
  fees: number;
  expenses: number;
  unrecorded_fees: number;
  profit: number | null;
  customers: number;
  active_memberships: number;
  pending_submissions: number;
  orders: PlanOrder[];
  submissions: Submission[];
  expenses_list: {
    id: string;
    amount: number;
    category: string;
    description: string;
    spent_on: string;
  }[];
  customers_list: {
    id: string;
    display_name: string;
    email: string;
    membership: MembershipAccess;
  }[];
  notifications: { id: string; title: string; body: string; created_at: string }[];
  audit: { id: string; action: string; entity_id: string; created_at: string }[];
  xp_summary: {
    total_xp: number;
    completed_challenges: number;
    explorers: number;
    top_level: number;
  } | null;
};
export function AdminDashboard({
  locale,
  data,
  preview = false,
  initialTab = 'overview',
}: {
  locale: Locale;
  data: AdminWorkspace | null;
  preview?: boolean;
  initialTab?: string;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const dateLocale = locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-GB' : 'vi-VN';
  const tabs = [
    ['overview', 'Điều hành', 'Operations', '运营概览', LayoutDashboard],
    ['orders', 'Đơn & đối soát', 'Orders & reconciliation', '订单与对账', CreditCard],
    ['customers', 'Khách hàng', 'Members', '会员客户', Users],
    ['moderation', 'Duyệt địa điểm', 'Place review', '地点审核', ListChecks],
    ['expenses', 'Chi phí', 'Expenses', '支出记录', Wallet],
    ['plans', 'Gói & tăng trưởng', 'Plans & growth', '套餐与增长', BarChart3],
    ['audit', 'Nhật ký quản trị', 'Audit log', '管理日志', ShieldCheck],
  ] as const;
  const [tab, setTab] = useState(
    tabs.some((item) => item[0] === initialTab) ? initialTab : 'overview',
  );
  const activeTab = tabs.find((item) => item[0] === tab);
  const activeTitle = activeTab ? c(activeTab[1], activeTab[2], activeTab[3]) : '';
  const date = (value: string) =>
    new Date(value).toLocaleString(dateLocale, { timeZone: 'Asia/Ho_Chi_Minh' });
  const value = (key: 'revenue' | 'refunds' | 'fees' | 'expenses') =>
    data ? money(data[key], locale) : '—';
  const statusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return c('Đã thanh toán', 'Paid', '已支付');
      case 'pending':
        return c('Chờ xác nhận', 'Pending', '待确认');
      case 'refunded':
        return c('Đã hoàn tiền', 'Refunded', '已退款');
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
  const expenseCategoryLabel = (category: string) => {
    switch (category) {
      case 'hosting':
        return c('Hạ tầng / AI / bản đồ', 'Infrastructure / AI / maps', '基础设施 / AI / 地图');
      case 'content':
        return c('Nội dung', 'Editorial & content', '内容编撰');
      case 'marketing':
        return c('Marketing', 'Marketing', '市场推广');
      case 'tax':
        return c('Thuế', 'Tax', '税费');
      case 'other':
        return c('Khác', 'Other', '其他');
      default:
        return category;
    }
  };
  return (
    <div className="dashboard-wrap">
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href={`/${locale}/admin/dashboard`}>
          <ShieldCheck size={25} />
          <span>
            THÁM VĂN / ADMIN<small>{c('PHÒNG ĐIỀU HÀNH', 'OPERATIONS CONTROL', '运营管理中心')}</small>
          </span>
        </Link>
        <p className="dashboard-nav-label">
          {c('VẬN HÀNH & TĂNG TRƯỞNG', 'OPERATIONS & GROWTH', '运营与增长')}
        </p>
        <nav aria-label={c('Điều hướng quản trị', 'Admin navigation', '管理导航')}>
          {tabs.map(([id, vi, en, zh, Icon]) => (
            <button
              key={id}
              className={tab === id ? 'selected' : ''}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              {c(vi, en, zh)}
              {id === 'moderation' && !!data?.pending_submissions && (
                <b>{data.pending_submissions}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-discover">
          <Coins size={30} />
          <h3>
            {c('Hiểu dòng tiền.', 'Clear cashflow.', '明晰收支。')}
            <br />
            {c('Giữ chất lượng trải nghiệm.', 'Preserve editorial quality.', '守护体验品质。')}
          </h3>
        </div>
        <Link className="sidebar-back" href={`/${locale}/admin`}>
          {c('Quản lý nội dung', 'Content manager', '内容管理')} <ArrowUpRight size={14} />
        </Link>
        <Link className="sidebar-back" href={`/${locale}/admin/commerce`}>
          {c('Đơn & đối tác', 'Orders & partners', '订单与合作')} <ArrowUpRight size={14} />
        </Link>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p>
              OPERATIONS / {activeTitle}
            </p>
            <span className="dashboard-context">
              {c(
                'Doanh thu hội viên · kỳ theo giờ Việt Nam',
                'Membership revenue · Vietnam timezone',
                '会员营收 · 越南时区结算周期',
              )}
            </span>
          </div>
          <ShieldCheck size={24} />
        </header>
        {!data && (
          <div className="dash-notice" role="status">
            {preview
              ? c(
                  'Bản xem trước quản trị: chưa kết nối dữ liệu thực, không hiển thị số liệu giả lập. Chỉ tài khoản quản trị được phép truy cập khi vận hành.',
                  'Admin preview mode: live workspace data is disconnected and no placeholder figures are fabricated. Only authorized admin accounts may access this desk.',
                  '管理预览模式：暂未连接实时数据，不生成模拟数字。正式环境仅限管理员账户访问。',
                )
              : c(
                  'Không thể tải dữ liệu vận hành lúc này. Vui lòng kiểm tra kết nối cơ sở dữ liệu và quyền quản trị.',
                  'Unable to load operational workspace data right now. Verify database connectivity and admin permissions.',
                  '暂无法加载运营数据，请检查数据库连接与管理员权限。',
                )}
          </div>
        )}
        <div className="dash-page-title">
          <p className="startup-eyebrow">
            {c('THÁM VĂN · ĐIỀU HÀNH DI SẢN', 'THÁM VĂN OPERATIONS · ARCHIVE DESK', 'THÁM VĂN 运营中心 · 遗产档案')}
          </p>
          <h1>{activeTitle}</h1>
          <p>
            {data
              ? c(
                  `Kỳ tài chính từ ${date(data.since)}. Số liệu tổng hợp trực tiếp từ sổ giao dịch hội viên và chi phí đã ghi nhận.`,
                  `Reporting period since ${date(data.since)}. Aggregated directly from verified membership orders and recorded expenses.`,
                  `统计周期自 ${date(data.since)} 起。数据直接汇总自已核验会员订单与已登记支出。`,
                )
              : c(
                  'Kết nối cơ sở dữ liệu để theo dõi đơn hàng, quyền gói, thành viên và chi phí vận hành.',
                  'Connect operational storage to monitor orders, plan entitlements, members, and recorded expenses.',
                  '连接数据存储以跟踪订单、套餐权益、会员客户与运营支出。',
                )}
          </p>
        </div>
        {tab === 'overview' && (
          <>
            <div className="dash-metrics">
              <Metric
                label={c('Doanh thu đã thu', 'Collected revenue', '实收营收')}
                value={value('revenue')}
                detail={c(
                  'Giao dịch đã xác nhận, gồm đơn đã hoàn',
                  'Verified transactions including refunded orders',
                  '已核验交易（含已退款订单）',
                )}
                icon={<Coins size={20} />}
              />
              <Metric
                label={c('Đã hoàn tiền', 'Refunds issued', '已退款金额')}
                value={value('refunds')}
                detail={c(
                  'Hoàn được ghi nhận trong kỳ',
                  'Refunds recorded in this period',
                  '本周期已登记的退款',
                )}
                icon={<CreditCard size={20} />}
              />
              <Metric
                label={c('Chi phí đã nhập', 'Recorded expenses', '已登记支出')}
                value={value('expenses')}
                detail={c(
                  'Chưa phản ánh chi phí chưa ghi sổ',
                  'Excludes unrecorded off-ledger costs',
                  '不包含尚未入账的费用',
                )}
                icon={<Wallet size={20} />}
              />
              <Metric
                label={c('Lãi theo sổ đã nhập', 'Ledger net balance', '账面净结余')}
                value={
                  data?.profit !== null && data
                    ? money(data.profit, locale)
                    : c('Chưa đủ dữ liệu', 'Insufficient data', '数据不足')
                }
                detail={
                  data?.unrecorded_fees
                    ? c(
                        `${data.unrecorded_fees} đơn thiếu phí thanh toán`,
                        `${data.unrecorded_fees} orders missing payment fee`,
                        `${data.unrecorded_fees} 笔订单缺少通道手续费记录`,
                      )
                    : c(
                        'Doanh thu − hoàn − phí − chi phí',
                        'Revenue − refunds − fees − expenses',
                        '营收 − 退款 − 手续费 − 支出',
                      )
                }
                icon={<BarChart3 size={20} />}
              />
            </div>
            <div className="dash-two-columns">
              <section className="dash-panel">
                <h2>{c('Sức khỏe vận hành', 'Operational health', '运营健康度')}</h2>
                <p>
                  {c('Khách hàng:', 'Members:', '注册会员：')}{' '}
                  <strong>{data?.customers ?? '—'}</strong>
                </p>
                <p>
                  {c('Chủ gói đang có hiệu lực:', 'Active plan holders:', '有效付费会员：')}{' '}
                  <strong>{data?.active_memberships ?? '—'}</strong>
                </p>
                <p>
                  {c('Địa điểm chờ duyệt:', 'Pending place submissions:', '待审核地点：')}{' '}
                  <strong>{data?.pending_submissions ?? '—'}</strong>
                </p>
                <p>
                  {c('Phí thanh toán đã ghi:', 'Recorded gateway fees:', '已登记支付手续费：')}{' '}
                  <strong>{value('fees')}</strong>
                </p>
                <p className="help-text">
                  {c(
                    'Lãi theo sổ chỉ phản ánh chi phí đã nhập, chưa là lợi nhuận kế toán cuối cùng. Đơn bán bộ hướng dẫn và đối tác được theo dõi ở mục “Đơn & đối tác”.',
                    'Ledger balance reflects recorded expenses only and is not a final accounting profit figure. Guide packs and partner inquiries are managed under Orders & partners.',
                    '账面净结余仅反映已登记支出，并非最终财务利润。单购路线指南及合作咨询请在“订单与合作”查看。',
                  )}
                </p>
              </section>
              <section className="dash-panel">
                <h2>{c('Tiến độ khám phá (XP)', 'Explorer progress (XP)', '探索进度 (XP)')}</h2>
                <p>
                  {c('Tổng XP đã phát:', 'Total XP awarded:', '累计发放 XP：')}{' '}
                  <strong>{data?.xp_summary?.total_xp ?? '—'}</strong>
                </p>
                <p>
                  {c('Thử thách đã hoàn thành:', 'Challenges completed:', '已完成挑战数：')}{' '}
                  <strong>{data?.xp_summary?.completed_challenges ?? '—'}</strong>
                </p>
                <p>
                  {c('Người chơi có XP:', 'Active explorers with XP:', '获 XP 探索者人数：')}{' '}
                  <strong>{data?.xp_summary?.explorers ?? '—'}</strong>
                </p>
                <p>
                  {c('Cấp độ cao nhất:', 'Highest level:', '最高等级：')}{' '}
                  <strong>{data?.xp_summary?.top_level ?? '—'}</strong>
                </p>
                <p className="help-text">
                  {c(
                    'XP chỉ là tín hiệu tham gia của người dùng, không phải doanh thu. Bảng quản trị không hiển thị lịch sử GPS cá nhân.',
                    'XP measures learner engagement, not revenue. Individual GPS tracks are never exposed to the admin view.',
                    'XP 仅代表用户参与度而非营收，管理后台不展示个人 GPS 轨迹历史。',
                  )}
                </p>
              </section>
              <section className="dash-panel">
                <h2>{c('Hộp thư quản trị', 'Admin inbox', '管理收件箱')}</h2>
                {data?.notifications.length ? (
                  data.notifications.slice(0, 8).map((item) => (
                    <article key={item.id} className="submission-row">
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                      <small>{date(item.created_at)}</small>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title={c('Chưa có thông báo', 'No admin alerts yet', '暂无管理通知')}
                    description={c(
                      'Đề xuất địa điểm mới từ cộng đồng sẽ gửi vào đây để ban biên tập xử lý.',
                      'New place nominations from explorers will appear here for editorial review.',
                      '社区提交的新地点建议将汇集于此等待编辑审核。',
                    )}
                  />
                )}
              </section>
            </div>
          </>
        )}
        {tab === 'orders' && (
          <section className="dash-panel">
            <h2>{c('Đơn gần nhất & phí thực tế', 'Recent orders & gateway fees', '近期订单与实付手续费')}</h2>
            <p>
              {c(
                'Chỉ callback đã xác thực mới mở gói. URL quay về hoặc thao tác thủ công không tự đánh dấu đơn đã thanh toán.',
                'Only verified server callbacks activate entitlements. Return URLs or manual UI actions never mark an order paid.',
                '仅经核验的服务器回调才开通权益，返回链接或界面操作不会将订单标为已支付。',
              )}
            </p>
            <div className="dash-table">
              <table>
                <thead>
                  <tr>
                    {[
                      c('Đơn', 'Order', '订单'),
                      c('Gói', 'Plan', '套餐'),
                      c('Số tiền', 'Amount', '金额'),
                      c('Kênh', 'Channel', '渠道'),
                      c('Trạng thái', 'Status', '状态'),
                      c('Phí đã ghi', 'Recorded fee', '已记手续费'),
                      c('Đối soát phí', 'Reconcile fee', '核对费用'),
                    ].map((text) => (
                      <th key={text}>{text}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        #{order.order_code}
                        <br />
                        <small>{date(order.created_at)}</small>
                      </td>
                      <td>{plans[order.plan_id].name}</td>
                      <td>{money(order.amount, locale)}</td>
                      <td>
                        {order.provider} / {order.method}
                      </td>
                      <td>
                        <span className={`status-tag ${order.status}`}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td>
                        {order.processing_fee === null
                          ? c('Chưa nhập', 'Unrecorded', '未录入')
                          : money(order.processing_fee, locale)}
                      </td>
                      <td>
                        {['paid', 'refunded'].includes(order.status) && (
                          <ActionForm
                            locale={locale}
                            endpoint="/api/admin/workspace"
                            submit={c('Ghi phí', 'Save fee', '保存手续费')}
                            values={(form) => ({
                              action: 'fee',
                              order: order.id,
                              amount: Number(form.get('amount')),
                            })}
                          >
                            <label>
                              <span className="sr-only">
                                {c(`Phí đơn ${order.order_code}`, `Fee for order ${order.order_code}`, `订单 ${order.order_code} 手续费`)}
                              </span>
                              <input
                                name="amount"
                                aria-label={c(
                                  `Phí đơn ${order.order_code}`,
                                  `Fee for order ${order.order_code}`,
                                  `订单 ${order.order_code} 手续费`,
                                )}
                                type="number"
                                min="0"
                                max={order.amount}
                                required
                                placeholder="VND"
                              />
                            </label>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.orders.length && (
                <EmptyState
                  title={c('Chưa có đơn hàng', 'No orders loaded', '暂无订单数据')}
                  description={c(
                    'Bảng hiển thị tối đa 100 đơn mới nhất. Các chỉ số tổng hợp vẫn tính đầy đủ theo kỳ.',
                    'Table displays the latest 100 orders; summary metrics still compute across the full period.',
                    '列表展示最新 100 笔订单，统计指标仍按完整周期汇总计算。',
                  )}
                />
              )}
            </div>
          </section>
        )}
        {tab === 'customers' && (
          <section className="dash-panel">
            <h2>{c('Khách hàng & quyền gói hiện tại', 'Members & active entitlements', '会员与当前套餐权益')}</h2>
            <div className="dash-table">
              <table>
                <thead>
                  <tr>
                    <th>{c('Khách hàng', 'Member', '会员')}</th>
                    <th>Email</th>
                    <th>{c('Gói hiệu lực', 'Active plan', '生效套餐')}</th>
                    <th>{c('Vai trò', 'Role', '角色')}</th>
                    <th>{c('Hết hạn', 'Expires', '到期时间')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.customers_list.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.display_name || c('Chưa đặt tên', 'Unnamed explorer', '未命名探索者')}</td>
                      <td>{customer.email}</td>
                      <td>{plans[customer.membership.plan].name}</td>
                      <td>
                        {customer.membership.is_owner
                          ? c('Chủ tài khoản/gói', 'Account owner', '套餐主账户')
                          : c('Thành viên Family', 'Family member', '家庭成员')}
                      </td>
                      <td>
                        {customer.membership.expires_at
                          ? date(customer.membership.expires_at)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="help-text">
              {c(
                'Tối đa 100 tài khoản gần nhất. Dữ liệu GPS cá nhân được bảo mật riêng tư, không trả về màn hình quản trị.',
                'Shows up to 100 accounts. Private GPS histories are excluded from admin views.',
                '最多展示 100 位会员，个人 GPS 轨迹数据受隐私保护不会在后台返回。',
              )}
            </p>
          </section>
        )}
        {tab === 'moderation' && (
          <section className="dash-panel">
            <h2>{c('Địa điểm do cộng đồng đề xuất', 'Community place nominations', '社区地点推荐')}</h2>
            {data?.submissions.length ? (
              data.submissions.map((item) => {
                const sourceHref = safeSourceUrl(item.source_url);
                return (
                  <article className="admin-moderation" key={item.id}>
                    <span className={`status-tag ${item.status}`}>{statusLabel(item.status)}</span>
                    <h3>{item.name}</h3>
                    <p>
                      {item.address} · {item.region}
                    </p>
                    <p>{item.summary}</p>
                    <p>
                      GPS: {item.latitude}, {item.longitude}
                      {sourceHref && (
                        <>
                          {' '}
                          ·{' '}
                          <a
                            className="text-link"
                            href={sourceHref}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {c('Kiểm tra nguồn', 'Inspect source', '核验来源')} <ArrowUpRight size={13} />
                          </a>
                        </>
                      )}
                    </p>
                    {item.review_note && (
                      <p>
                        {c('Phản hồi:', 'Review note:', '审核意见：')} {item.review_note}
                      </p>
                    )}
                    {item.status === 'pending' && (
                      <>
                        <p className="help-text">
                          {c(
                            'Kiểm tra địa chỉ, nguồn tham khảo và nội dung trước khi duyệt. Khi duyệt, mục sẽ công khai, gửi thông báo cho người gửi và ghi nhật ký.',
                            'Verify address, reference URL, and text before approving. Approval publishes the entry, notifies the author, and logs an audit record.',
                            '审核前请核对地址、来源链接和简介。通过后将公开展示、通知投稿者并写入审计日志。',
                          )}
                        </p>
                        <ActionForm
                          locale={locale}
                          endpoint="/api/admin/workspace"
                          submit={c('Gửi quyết định', 'Submit decision', '提交审核结果')}
                          values={(form) => ({
                            action: 'review',
                            id: item.id,
                            approve: form.get('decision') === 'approve',
                            note: form.get('note'),
                          })}
                        >
                          <div className="dash-form">
                            <label>
                              {c('Quyết định', 'Decision', '审核决定')}
                              <select name="decision">
                                <option value="reject">
                                  {c('Từ chối / cần bổ sung', 'Reject / request changes', '驳回 / 需补充资料')}
                                </option>
                                <option value="approve">
                                  {c('Duyệt và xuất bản', 'Approve & publish', '通过并发布')}
                                </option>
                              </select>
                            </label>
                            <label>
                              {c('Phản hồi có lý do', 'Decision note', '审核理由')}
                              <textarea
                                name="note"
                                minLength={5}
                                maxLength={1000}
                                required
                                rows={2}
                              />
                            </label>
                          </div>
                        </ActionForm>
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <EmptyState
                title={c('Chưa có đề xuất', 'No submissions yet', '暂无投稿记录')}
                description={c(
                  'Địa điểm do thành viên đề xuất chỉ xuất hiện công khai sau khi ban biên tập phê duyệt.',
                  'Community submissions remain private until verified and approved by an admin.',
                  '用户推荐的地点须经管理员核验通过后才会公开发布。',
                )}
              />
            )}
          </section>
        )}
        {tab === 'expenses' && (
          <div className="dash-two-columns">
            <section className="dash-panel">
              <h2>{c('Ghi chi phí thực tế', 'Record operational expense', '登记实际支出')}</h2>
              <ActionForm
                locale={locale}
                disabled={!data}
                endpoint="/api/admin/workspace"
                submit={c('Ghi sổ chi phí', 'Record expense', '登记支出')}
                values={(form) => ({
                  action: 'expense',
                  amount: Number(form.get('amount')),
                  category: form.get('category'),
                  description: form.get('description'),
                  date: form.get('date'),
                })}
              >
                <label>
                  {c('Số tiền VND', 'Amount (VND)', '金额 (VND)')}
                  <input name="amount" type="number" required min="1" max="1000000000" />
                </label>
                <label>
                  {c('Loại chi phí', 'Expense category', '支出类别')}
                  <select name="category">
                    <option value="hosting">
                      {c('Hạ tầng / AI / bản đồ', 'Infrastructure / AI / maps', '基础设施 / AI / 地图')}
                    </option>
                    <option value="content">{c('Nội dung', 'Editorial & content', '内容编撰')}</option>
                    <option value="marketing">{c('Marketing', 'Marketing', '市场推广')}</option>
                    <option value="tax">{c('Thuế', 'Tax', '税费')}</option>
                    <option value="other">{c('Khác', 'Other', '其他')}</option>
                  </select>
                </label>
                <label>
                  {c('Mô tả / chứng từ', 'Description / receipt reference', '说明 / 凭证备注')}
                  <textarea name="description" required minLength={3} maxLength={500} />
                </label>
                <label>
                  {c('Ngày chi', 'Expense date', '支出日期')}
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Intl.DateTimeFormat('en-CA', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    }).format(new Date())}
                  />
                </label>
              </ActionForm>
            </section>
            <section className="dash-panel">
              <h2>{c('Chi phí gần đây', 'Recent expenses', '近期支出')}</h2>
              {data?.expenses_list.length ? (
                data.expenses_list.map((expense) => (
                  <article className="submission-row" key={expense.id}>
                    <strong>{money(expense.amount, locale)}</strong>
                    <p>{expense.description}</p>
                    <small>
                      {expenseCategoryLabel(expense.category)} · {expense.spent_on}
                    </small>
                  </article>
                ))
              ) : (
                <EmptyState
                  title={c('Chưa có chi phí ghi sổ', 'No recorded expenses', '暂无支出记录')}
                  description={c(
                    'Các khoản chi vận hành đã nhập sẽ xuất hiện tại đây.',
                    'Recorded operational outlays will appear here.',
                    '已登记的运营支出将显示在此处。',
                  )}
                />
              )}
            </section>
          </div>
        )}
        {tab === 'plans' && (
          <>
            <section className="dash-panel">
              <h2>{c('Ba gói, một nguồn quyền sử dụng', 'Three plans, single source of entitlements', '三档方案，统一权限基准')}</h2>
              <div className="dash-table">
                <table>
                  <thead>
                    <tr>
                      <th>{c('Gói', 'Plan', '套餐')}</th>
                      <th>{c('Giá / tháng', 'Price / month', '月费')}</th>
                      <th>{c('Thử thách / ngày', 'Challenges / day', '每日挑战数')}</th>
                      <th>{c('Thành viên', 'Seats', '席位数')}</th>
                      <th>{c('AI hành trình', 'AI planner', 'AI 行程')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(plans).map(([id, plan]) => (
                      <tr key={id}>
                        <td>{plan.name}</td>
                        <td>{money(plan.amount, locale)}</td>
                        <td>{plan.challengeLimit ?? c('Không giới hạn', 'Unlimited', '不限')}</td>
                        <td>{plan.seats}</td>
                        <td>{plan.planner ? c('Có', 'Yes', '支持') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="help-text">
                {c(
                  'Giá và quyền được xác thực ở máy chủ. Mọi thay đổi cấu hình gói phải được cập nhật đồng bộ qua mã nguồn và kiểm thử, không chỉnh giá tùy ý từ trình duyệt.',
                  'Pricing and entitlements are enforced server-side. Tier updates require tested configuration releases and cannot be altered client-side.',
                  '价格与权益均在服务器端校验，套餐调整须经代码发布与测试，不可从浏览器端篡改。',
                )}
              </p>
            </section>
            <section className="dash-panel">
              <h2>{c('Doanh thu cần kiểm chứng', 'Auditable revenue channels', '需核验的营收渠道')}</h2>
              <p>
                {c(
                  'Thuê bao Premium và Family là dòng tiền chính. Hợp tác trường học, workshop địa phương và tuyến trải nghiệm tài trợ được hạch toán riêng sau khi ký hợp đồng, không cộng doanh thu dự kiến vào sổ.',
                  'Premium and Family subscriptions are the primary revenue stream. School partnerships, workshops, and sponsored routes are accounted strictly upon signed contract, never as projected figures.',
                  'Premium 与 Family 订阅为核心营收；校园合作、本地工作坊与赞助路线须在正式签约后单独入账，不计入预估收入。',
                )}
              </p>
              <Link className="text-link" href={`/${locale}/admin/commerce`}>
                {c('Xử lý yêu cầu đối tác', 'Manage partner inquiries', '处理合作咨询')} <ArrowUpRight size={14} />
              </Link>
            </section>
          </>
        )}
        {tab === 'audit' && (
          <section className="dash-panel">
            <h2>{c('Nhật ký thay đổi gần nhất', 'Recent audit trail', '近期管理操作日志')}</h2>
            <div className="dash-table">
              <table>
                <thead>
                  <tr>
                    <th>{c('Thời gian', 'Timestamp', '时间')}</th>
                    <th>{c('Hành động', 'Action', '操作')}</th>
                    <th>{c('Bản ghi', 'Entity', '对象 ID')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.audit.map((item) => (
                    <tr key={item.id}>
                      <td>{date(item.created_at)}</td>
                      <td>{item.action}</td>
                      <td>{item.entity_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="help-text">
              {c(
                'Tối đa 50 sự kiện gần nhất. Mọi hoàn tiền phải được xác nhận và đối soát tại cổng thanh toán trước khi ghi nhận vào hệ thống.',
                'Latest 50 events. Refunds must be executed and verified through the payment provider before ledger recording.',
                '最多显示最近 50 条事件。任何退款均须先在支付通道核验完成后再登记入账。',
              )}
            </p>
          </section>
        )}
        <footer className="dashboard-footnote">
          <span>
            <ShieldCheck size={13} />{' '}
            {c('TRUY CẬP XÁC THỰC · DOANH THU GHI SỔ', 'VERIFIED ACCESS / RECORDED REVENUE', '实名鉴权 · 实收记账')}
          </span>
          <span>THÁM VĂN OPERATIONS</span>
        </footer>
      </div>
    </div>
  );
}
