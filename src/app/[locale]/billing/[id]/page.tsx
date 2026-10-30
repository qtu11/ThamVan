import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Clock3, ArrowUpRight } from 'lucide-react';
import { getViewer } from '@/lib/data';
import { supabase } from '@/lib/supabase/server';
import { isLocale } from '@/lib/types';
import { plans, isPaidPlan } from '@/lib/plans';
import { money } from '@/lib/locale-copy';
import { OrderRefresh } from '@/components/commerce/order-refresh';
import { paymentWindowExpired } from '@/lib/commerce';
import { isPaymentUrl } from '@/lib/checkout-url';
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) notFound();
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/auth/login?next=/${locale}/billing/${id}`);
  const db = await supabase();
  const { data: order, error } = await db
    .from('plan_orders')
    .select('id,order_code,plan_id,amount,status,provider,checkout_url,created_at')
    .eq('id', id)
    .eq('user_id', viewer.id)
    .maybeSingle();
  if (error || !order || !isPaidPlan(order.plan_id)) notFound();
  const { data: period } = await db
    .from('memberships')
    .select('starts_at,ends_at,revoked_at')
    .eq('order_id', id)
    .eq('user_id', viewer.id)
    .maybeSingle();
  const paid = order.status === 'paid',
    pending = order.status === 'pending',
    expired = paymentWindowExpired(order.created_at);
  const date = (value: string) =>
    new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return (
    <section className="order-state">
      {paid ? <CheckCircle2 size={35} /> : <Clock3 size={35} />}
      <p className="startup-eyebrow" style={{ marginTop: 20 }}>
        MEMBERSHIP ORDER #{order.order_code}
      </p>
      <h1>
        {paid
          ? 'Thanh toán đã được xác nhận.'
          : pending
            ? 'Đang chờ xác nhận thanh toán.'
            : order.status === 'refunded'
              ? 'Đã ghi nhận hoàn tiền.'
              : 'Đơn đã hủy.'}
      </h1>
      <p>
        {plans[order.plan_id].name} · {money(order.amount, locale)} / tháng
      </p>
      <p>
        {paid
          ? 'Quyền gói được cấp từ xác nhận trên máy chủ.'
          : pending
            ? 'Website chưa nhận xác nhận hợp lệ từ cổng thanh toán. Tham số trên URL không mở quyền gói. Nếu đã trả tiền, giữ mã đơn để đối soát trước khi tạo giao dịch khác.'
            : 'Đơn này không cấp quyền gói.'}
      </p>
      {period && (
        <p>
          Kỳ đã cấp: {date(period.starts_at)} → {date(period.ends_at)}
          {period.revoked_at ? ' · Đã thu hồi' : ''}
        </p>
      )}
      <div className="order-actions">
        {pending && <OrderRefresh locale={locale} pending={!expired} />}{' '}
        {pending && !expired && order.provider === 'payos' && isPaymentUrl(order.checkout_url) && (
          <a className="button secondary" href={order.checkout_url}>
            Mở lại thanh toán <ArrowUpRight size={15} />
          </a>
        )}
        <Link className="button" href={`/${locale}/dashboard?tab=billing`}>
          Quản lý gói <ArrowUpRight size={15} />
        </Link>
      </div>
      {pending && expired && (
        <p className="commerce-notice">
          Đã qua cửa sổ thanh toán dự kiến. Nếu đã chuyển tiền, liên hệ hỗ trợ với mã đơn; không trả
          tiền lại chỉ vì trang chưa cập nhật.
        </p>
      )}
      {process.env.COMMERCE_SUPPORT_EMAIL && (
        <p>
          <a
            className="text-link"
            href={`mailto:${process.env.COMMERCE_SUPPORT_EMAIL}?subject=THAMVAN%20${order.order_code}`}
          >
            Hỗ trợ đơn hàng
          </a>
        </p>
      )}
    </section>
  );
}
