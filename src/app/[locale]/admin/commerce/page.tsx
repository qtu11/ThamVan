import { redirect, notFound } from 'next/navigation';
import { getViewer } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase/server';
import { commerceStorageReady } from '@/lib/commerce';
import { isLocale } from '@/lib/types';
import { copy, money } from '@/lib/locale-copy';
export default async function CommerceAdmin({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const viewer = await getViewer();
  if (!viewer)
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/admin/commerce`)}`);
  if (!viewer.admin) notFound();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  if (!commerceStorageReady())
    return (
      <div className="container section">
        <h1>{c('Thương mại chưa kết nối', 'Commerce not connected', '商业功能尚未连接')}</h1>
      </div>
    );
  const db = supabaseAdmin();
  const [orders, leads] = await Promise.all([
    db
      .from('commerce_orders')
      .select('order_code,product_id,amount,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('business_leads')
      .select('id,name,email,organization,segment,message,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  return (
    <div className="container section">
      <p className="startup-eyebrow">THÁM VĂN / OPERATIONS</p>
      <h1>{c('Đơn hàng & cơ hội hợp tác', 'Orders & partnership inquiries', '订单与合作请求')}</h1>
      <p>
        {c(
          'Tối đa 100 bản ghi gần nhất mỗi loại. Doanh thu chỉ tính các đơn đã thanh toán, không dùng số liệu minh họa.',
          'Up to 100 recent records of each type. Only verified paid orders count as revenue. No sample figures.',
          '每类最多显示100条最近记录。仅验证已付款订单计入收入，无示例数据。',
        )}
      </p>
      {orders.error || leads.error ? (
        <p role="alert">
          {c(
            'Chưa đọc được dữ liệu. Kiểm tra migration 004 và quyền dịch vụ.',
            'Data unavailable. Check migration 004 and service permissions.',
            '无法读取数据，请检查004迁移与服务权限。',
          )}
        </p>
      ) : (
        <>
          <h2>{c('Đơn hàng', 'Orders', '订单')}</h2>
          <div className="commerce-table">
            <table>
              <thead>
                <tr>
                  {['Order', 'Product', 'Amount', 'Status', 'Created'].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.data.length ? (
                  orders.data.map((order) => (
                    <tr key={order.order_code}>
                      <td>{order.order_code}</td>
                      <td>{order.product_id}</td>
                      <td>{money(order.amount, locale)}</td>
                      <td>{order.status}</td>
                      <td>
                        {new Date(order.created_at).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>{c('Chưa có đơn hàng.', 'No orders yet.', '暂无订单。')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <h2>{c('Yêu cầu hợp tác', 'Partnership inquiries', '合作请求')}</h2>
          <div className="commerce-table">
            <table>
              <thead>
                <tr>
                  {['Organization', 'Contact', 'Segment', 'Brief', 'Status'].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.data.length ? (
                  leads.data.map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.organization}</td>
                      <td>
                        {lead.name}
                        <br />
                        {lead.email}
                      </td>
                      <td>{lead.segment}</td>
                      <td>{lead.message}</td>
                      <td>{lead.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>{c('Chưa có yêu cầu.', 'No inquiries yet.', '暂无请求。')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
