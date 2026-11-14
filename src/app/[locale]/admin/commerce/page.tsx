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
  const dateLocale = locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-GB' : 'vi-VN';
  const orderStatusLabel = (status: string) => {
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
      default:
        return status;
    }
  };
  const productLabel = (productId: string) =>
    productId === 'collection'
      ? c('Trọn bộ Saigon Collection', 'Saigon Collection', '西贡全套路线')
      : c('Gói hành trình đơn', 'Story Walk Guide', '单条漫步指南');
  const segmentLabel = (segment: string) => {
    switch (segment) {
      case 'school':
        return c('Trường học / Giáo dục', 'School / Education', '学校与教育');
      case 'hotel':
        return c('Khách sạn / Lưu trú', 'Hotel / Hospitality', '酒店与住宿');
      case 'team':
        return c('Doanh nghiệp / Đội ngũ', 'Team / Corporate', '企业与团队');
      default:
        return segment;
    }
  };
  const leadStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return c('Mới tiếp nhận', 'New', '新提交');
      case 'contacted':
        return c('Đã liên hệ', 'Contacted', '已联系');
      case 'closed':
        return c('Đã hoàn tất', 'Closed', '已归档');
      default:
        return status;
    }
  };
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
      <p className="startup-eyebrow">
        {c('THÁM VĂN · ĐỐI SOÁT THƯƠNG MẠI', 'THÁM VĂN / OPERATIONS', 'THÁM VĂN · 商业运营')}
      </p>
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
            'Chưa đọc được dữ liệu thương mại lúc này. Vui lòng kiểm tra kết nối cơ sở dữ liệu.',
            'Commercial records are currently unavailable. Check database connectivity.',
            '暂无法读取商业数据，请检查数据库连接与权限。',
          )}
        </p>
      ) : (
        <>
          <h2>{c('Đơn hàng', 'Orders', '订单')}</h2>
          <div className="commerce-table">
            <table>
              <thead>
                <tr>
                  {[
                    c('Mã đơn', 'Order', '订单号'),
                    c('Sản phẩm', 'Product', '产品'),
                    c('Số tiền', 'Amount', '金额'),
                    c('Trạng thái', 'Status', '状态'),
                    c('Ngày tạo', 'Created', '创建时间'),
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.data.length ? (
                  orders.data.map((order) => (
                    <tr key={order.order_code}>
                      <td>{order.order_code}</td>
                      <td>{productLabel(order.product_id)}</td>
                      <td>{money(order.amount, locale)}</td>
                      <td>{orderStatusLabel(order.status)}</td>
                      <td>
                        {new Date(order.created_at).toLocaleString(dateLocale, {
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
                  {[
                    c('Đơn vị', 'Organization', '机构'),
                    c('Liên hệ', 'Contact', '联系人'),
                    c('Phân khúc', 'Segment', '合作类型'),
                    c('Nội dung', 'Brief', '需求说明'),
                    c('Trạng thái', 'Status', '状态'),
                  ].map((label) => (
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
                      <td>{segmentLabel(lead.segment)}</td>
                      <td>{lead.message}</td>
                      <td>{leadStatusLabel(lead.status)}</td>
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
