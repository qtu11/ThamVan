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
import { money } from '@/lib/locale-copy';
import { ActionForm, EmptyState, Metric } from './common';
import './dashboard.css';
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
  const [tab, setTab] = useState(initialTab);
  const tabs = [
    ['overview', 'Điều hành', LayoutDashboard],
    ['orders', 'Đơn & đối soát', CreditCard],
    ['customers', 'Khách hàng', Users],
    ['moderation', 'Duyệt địa điểm', ListChecks],
    ['expenses', 'Chi phí', Wallet],
    ['plans', 'Gói & tăng trưởng', BarChart3],
    ['audit', 'Nhật ký quản trị', ShieldCheck],
  ] as const;
  const date = (value: string) =>
    new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const value = (key: 'revenue' | 'refunds' | 'fees' | 'expenses') =>
    data ? money(data[key], locale) : '—';
  return (
    <div className="dashboard-wrap">
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href={`/${locale}/admin/dashboard`}>
          <ShieldCheck size={25} />
          <span>
            THÁM VĂN / ADMIN<small>BUSINESS CONTROL ROOM</small>
          </span>
        </Link>
        <p className="dashboard-nav-label">VẬN HÀNH & TĂNG TRƯỞNG</p>
        <nav aria-label="Điều hướng quản trị">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? 'selected' : ''}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
              {id === 'moderation' && !!data?.pending_submissions && (
                <b>{data.pending_submissions}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-discover">
          <Coins size={30} />
          <h3>
            Hiểu dòng tiền.
            <br />
            Giữ chất lượng trải nghiệm.
          </h3>
        </div>
        <Link className="sidebar-back" href={`/${locale}/admin`}>
          Quản lý nội dung <ArrowUpRight size={14} />
        </Link>
        <Link className="sidebar-back" href={`/${locale}/admin/commerce`}>
          Đơn cũ & đối tác <ArrowUpRight size={14} />
        </Link>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p>OPERATIONS / {tabs.find((item) => item[0] === tab)?.[1]}</p>
            <span className="dashboard-context">Doanh thu membership · kỳ theo giờ Việt Nam</span>
          </div>
          <ShieldCheck size={24} />
        </header>
        {!data && (
          <div className="dash-notice" role="status">
            {preview
              ? 'Bản xem trước quản trị: chưa kết nối dữ liệu, không hiển thị số liệu giả. Khi kết nối Supabase, chỉ tài khoản admin mới được mở trang này.'
              : 'Chưa đọc được dữ liệu vận hành. Kiểm tra migration 005–007 và quyền quản trị.'}
          </div>
        )}
        <div className="dash-page-title">
          <p className="startup-eyebrow">BUILD A BUSINESS PEOPLE COME BACK TO</p>
          <h1>{tabs.find((item) => item[0] === tab)?.[1]}</h1>
          <p>
            {data
              ? `Kỳ tài chính từ ${date(data.since)}. Số liệu tổng hợp trực tiếp từ sổ giao dịch membership và chi phí đã nhập.`
              : 'Kết nối hệ thống để theo dõi đơn hàng, quyền gói, khách hàng và chi phí.'}
          </p>
        </div>
        {tab === 'overview' && (
          <>
            <div className="dash-metrics">
              <Metric
                label="Doanh thu đã thu"
                value={value('revenue')}
                detail="Giao dịch đã xác nhận, gồm đơn đã hoàn"
                icon={<Coins size={20} />}
              />
              <Metric
                label="Đã hoàn tiền"
                value={value('refunds')}
                detail="Hoàn được ghi nhận trong tháng"
                icon={<CreditCard size={20} />}
              />
              <Metric
                label="Chi phí đã nhập"
                value={value('expenses')}
                detail="Chưa phản ánh chi phí chưa ghi sổ"
                icon={<Wallet size={20} />}
              />
              <Metric
                label="Lãi theo sổ đã nhập"
                value={
                  data?.profit !== null && data ? money(data.profit, locale) : 'Chưa đủ dữ liệu'
                }
                detail={
                  data?.unrecorded_fees
                    ? `${data.unrecorded_fees} đơn thiếu phí thanh toán`
                    : 'Doanh thu − hoàn − phí − chi phí'
                }
                icon={<BarChart3 size={20} />}
              />
            </div>
            <div className="dash-two-columns">
              <section className="dash-panel">
                <h2>Sức khỏe vận hành</h2>
                <p>
                  Khách hàng: <strong>{data?.customers ?? '—'}</strong>
                </p>
                <p>
                  Chủ gói đang có hiệu lực: <strong>{data?.active_memberships ?? '—'}</strong>
                </p>
                <p>
                  Địa điểm chờ duyệt: <strong>{data?.pending_submissions ?? '—'}</strong>
                </p>
                <p>
                  Phí thanh toán đã ghi: <strong>{value('fees')}</strong>
                </p>
                <p className="help-text">
                  Lãi theo sổ chỉ phản ánh chi phí đã nhập, chưa là lợi nhuận kế toán cuối cùng. Đơn
                  cũ bán bộ hướng dẫn được theo dõi ở mục “Đơn cũ & đối tác”.
                </p>
              </section>
              <section className="dash-panel">
                <h2>Hộp thư quản trị</h2>
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
                    title="Chưa có thông báo đã tải"
                    description="Đề xuất địa điểm mới sẽ gửi vào đây để quản trị xử lý."
                  />
                )}
              </section>
            </div>
          </>
        )}
        {tab === 'orders' && (
          <section className="dash-panel">
            <h2>Đơn gần nhất & phí thực tế</h2>
            <p>
              Chỉ callback đã xác thực mới mở gói. URL quay về hoặc thao tác admin không đánh dấu
              đơn thành đã trả tiền.
            </p>
            <div className="dash-table">
              <table>
                <thead>
                  <tr>
                    {[
                      'Đơn',
                      'Gói',
                      'Số tiền',
                      'Kênh',
                      'Trạng thái',
                      'Phí đã ghi',
                      'Đối soát phí',
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
                        <span className={`status-tag ${order.status}`}>{order.status}</span>
                      </td>
                      <td>
                        {order.processing_fee === null
                          ? 'Chưa nhập'
                          : money(order.processing_fee, locale)}
                      </td>
                      <td>
                        {['paid', 'refunded'].includes(order.status) && (
                          <ActionForm
                            locale={locale}
                            endpoint="/api/admin/workspace"
                            submit="Ghi phí"
                            values={(form) => ({
                              action: 'fee',
                              order: order.id,
                              amount: Number(form.get('amount')),
                            })}
                          >
                            <label>
                              <span className="sr-only">Phí đơn {order.order_code}</span>
                              <input
                                name="amount"
                                aria-label={`Phí đơn ${order.order_code}`}
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
                  title="Chưa có đơn đã tải"
                  description="Danh sách giới hạn 100 đơn mới nhất. Số liệu tổng hợp không giới hạn theo danh sách này."
                />
              )}
            </div>
          </section>
        )}
        {tab === 'customers' && (
          <section className="dash-panel">
            <h2>Khách hàng & quyền gói hiện tại</h2>
            <div className="dash-table">
              <table>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Email</th>
                    <th>Gói hiệu lực</th>
                    <th>Vai trò</th>
                    <th>Hết hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.customers_list.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.display_name || 'Chưa đặt tên'}</td>
                      <td>{customer.email}</td>
                      <td>{plans[customer.membership.plan].name}</td>
                      <td>
                        {customer.membership.is_owner ? 'Chủ tài khoản/gói' : 'Thành viên Family'}
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
              Tối đa 100 khách hàng. Lịch sử GPS cá nhân không được trả về dashboard quản trị này.
            </p>
          </section>
        )}
        {tab === 'moderation' && (
          <section className="dash-panel">
            <h2>Địa điểm do cộng đồng đề xuất</h2>
            {data?.submissions.length ? (
              data.submissions.map((item) => (
                <article className="admin-moderation" key={item.id}>
                  <span className={`status-tag ${item.status}`}>{item.status}</span>
                  <h3>{item.name}</h3>
                  <p>
                    {item.address} · {item.region}
                  </p>
                  <p>{item.summary}</p>
                  <p>
                    GPS: {item.latitude}, {item.longitude} ·{' '}
                    <a
                      className="text-link"
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Kiểm tra nguồn <ArrowUpRight size={13} />
                    </a>
                  </p>
                  {item.review_note && <p>Phản hồi: {item.review_note}</p>}
                  {item.status === 'pending' && (
                    <>
                      <p className="help-text">
                        Kiểm tra địa chỉ, nguồn và nội dung trước khi duyệt. Duyệt sẽ công khai nội
                        dung, gửi thông báo cho người đề xuất và ghi nhật ký.
                      </p>
                      <ActionForm
                        locale={locale}
                        endpoint="/api/admin/workspace"
                        submit="Gửi quyết định"
                        values={(form) => ({
                          action: 'review',
                          id: item.id,
                          approve: form.get('decision') === 'approve',
                          note: form.get('note'),
                        })}
                      >
                        <div className="dash-form">
                          <label>
                            Quyết định
                            <select name="decision">
                              <option value="reject">Từ chối / cần bổ sung</option>
                              <option value="approve">Duyệt và xuất bản</option>
                            </select>
                          </label>
                          <label>
                            Phản hồi có lý do
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
              ))
            ) : (
              <EmptyState
                title="Chưa có đề xuất đã tải"
                description="Địa điểm của khách hàng chỉ xuất hiện công khai sau khi admin duyệt."
              />
            )}
          </section>
        )}
        {tab === 'expenses' && (
          <div className="dash-two-columns">
            <section className="dash-panel">
              <h2>Ghi chi phí thực tế</h2>
              <ActionForm
                locale={locale}
                disabled={!data}
                endpoint="/api/admin/workspace"
                submit="Ghi sổ chi phí"
                values={(form) => ({
                  action: 'expense',
                  amount: Number(form.get('amount')),
                  category: form.get('category'),
                  description: form.get('description'),
                  date: form.get('date'),
                })}
              >
                <label>
                  Số tiền VND
                  <input name="amount" type="number" required min="1" max="1000000000" />
                </label>
                <label>
                  Loại chi phí
                  <select name="category">
                    <option value="hosting">Hạ tầng / AI / bản đồ</option>
                    <option value="content">Nội dung</option>
                    <option value="marketing">Marketing</option>
                    <option value="tax">Thuế</option>
                    <option value="other">Khác</option>
                  </select>
                </label>
                <label>
                  Mô tả / chứng từ
                  <textarea name="description" required minLength={3} maxLength={500} />
                </label>
                <label>
                  Ngày chi
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
              <h2>Chi phí gần đây</h2>
              {data?.expenses_list.map((expense) => (
                <article className="submission-row" key={expense.id}>
                  <strong>{money(expense.amount, locale)}</strong>
                  <p>{expense.description}</p>
                  <small>
                    {expense.category} · {expense.spent_on}
                  </small>
                </article>
              ))}
            </section>
          </div>
        )}
        {tab === 'plans' && (
          <>
            <section className="dash-panel">
              <h2>Ba gói, một nguồn quyền sử dụng</h2>
              <div className="dash-table">
                <table>
                  <thead>
                    <tr>
                      <th>Gói</th>
                      <th>Giá / tháng</th>
                      <th>Thử thách / ngày</th>
                      <th>Thành viên</th>
                      <th>AI hành trình</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(plans).map(([id, plan]) => (
                      <tr key={id}>
                        <td>{plan.name}</td>
                        <td>{money(plan.amount, locale)}</td>
                        <td>{plan.challengeLimit ?? 'Không giới hạn'}</td>
                        <td>{plan.seats}</td>
                        <td>{plan.planner ? 'Có' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="help-text">
                Giá và quyền được kiểm tra ở máy chủ. Thay đổi cấu hình gói cần cập nhật có kiểm
                thử, không sửa giá tùy ý từ trình duyệt.
              </p>
            </section>
            <section className="dash-panel">
              <h2>Doanh thu cần kiểm chứng</h2>
              <p>
                Thuê bao Premium và Family là dòng tiền chính. Hợp tác trường học, workshop địa
                phương và tuyến trải nghiệm tài trợ có thể bổ sung sau khi có hợp đồng; không cộng
                doanh thu dự kiến vào sổ.
              </p>
              <Link className="text-link" href={`/${locale}/admin/commerce`}>
                Xử lý yêu cầu đối tác <ArrowUpRight size={14} />
              </Link>
            </section>
          </>
        )}
        {tab === 'audit' && (
          <section className="dash-panel">
            <h2>Nhật ký thay đổi gần nhất</h2>
            <div className="dash-table">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hành động</th>
                    <th>Bản ghi</th>
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
              Tối đa 50 sự kiện gần nhất. Không có nút giả hoàn tiền: hoàn tiền cần thực hiện và đối
              soát tại cổng thanh toán, rồi ghi nhận qua dịch vụ quản trị.
            </p>
          </section>
        )}
        <footer className="dashboard-footnote">
          <span>
            <ShieldCheck size={13} /> VERIFIED ACCESS / RECORDED REVENUE
          </span>
          <span>THÁM VĂN OPERATIONS</span>
        </footer>
      </div>
    </div>
  );
}
