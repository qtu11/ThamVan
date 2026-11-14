import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Clock3, ArrowUpRight } from 'lucide-react';
import { getViewer } from '@/lib/data';
import { supabase } from '@/lib/supabase/server';
import { isLocale } from '@/lib/types';
import { plans, isPaidPlan } from '@/lib/plans';
import { copy, money } from '@/lib/locale-copy';
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
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
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
    new Date(value).toLocaleString(
      locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : 'en-GB',
      { timeZone: 'Asia/Ho_Chi_Minh' },
    );
  return (
    <section className="order-state">
      {paid ? <CheckCircle2 size={35} /> : <Clock3 size={35} />}
      <p className="startup-eyebrow" style={{ marginTop: 20 }}>
        {c('ĐƠN THÀNH VIÊN', 'MEMBERSHIP ORDER', '会员订单')} #{order.order_code}
      </p>
      <h1>
        {paid
          ? c(
              'Thanh toán đã được xác nhận.',
              'Payment has been verified.',
              '付款已获服务器核验。',
            )
          : pending
            ? c(
                'Đang chờ xác nhận thanh toán.',
                'Awaiting payment confirmation.',
                '等待支付确认。',
              )
            : order.status === 'refunded'
              ? c(
                  'Đã ghi nhận hoàn tiền.',
                  'Refund has been recorded.',
                  '已登记退款。',
                )
              : c('Đơn đã hủy.', 'Order cancelled.', '订单已取消。')}
      </h1>
      <p>
        {plans[order.plan_id].name} · {money(order.amount, locale)} / {c('tháng', 'month', '月')}
      </p>
      <p>
        {paid
          ? c(
              'Quyền gói được cấp từ xác nhận trên máy chủ.',
              'Plan benefits were granted from verified server confirmation.',
              '会员权益已通过服务器核验自动开通。',
            )
          : pending
            ? c(
                'Website chưa nhận xác nhận hợp lệ từ cổng thanh toán. Tham số trên URL không mở quyền gói. Nếu đã trả tiền, giữ mã đơn để đối soát trước khi tạo giao dịch khác.',
                'The server has not yet received valid confirmation from the payment gateway. URL parameters never unlock paid plans. If you already transferred, keep this order code for verification before creating another transaction.',
                '网站尚未收到支付网关的有效回调，URL 参数不会解锁权益。若已完成转账，请保留订单号以便核对，勿重复下单。',
              )
            : c('Đơn này không cấp quyền gói.', 'This order does not grant plan access.', '此订单未授予会员权益。')}
      </p>
      {period && (
        <p>
          {c('Kỳ đã cấp:', 'Active period:', '有效期限：')} {date(period.starts_at)} →{' '}
          {date(period.ends_at)}
          {period.revoked_at ? c(' · Đã thu hồi', ' · Revoked', ' · 已撤销') : ''}
        </p>
      )}
      <div className="order-actions">
        {pending && <OrderRefresh locale={locale} pending={!expired} />}{' '}
        {pending && !expired && order.provider === 'payos' && isPaymentUrl(order.checkout_url) && (
          <a className="button secondary" href={order.checkout_url}>
            {c('Mở lại thanh toán', 'Reopen payment', '重新打开支付')} <ArrowUpRight size={15} />
          </a>
        )}
        <Link className="button" href={`/${locale}/dashboard?tab=billing`}>
          {c('Quản lý gói', 'Manage plan', '管理套餐')} <ArrowUpRight size={15} />
        </Link>
      </div>
      {pending && expired && (
        <p className="commerce-notice">
          {c(
            'Đã qua cửa sổ thanh toán dự kiến. Nếu đã chuyển tiền, liên hệ hỗ trợ với mã đơn; không trả tiền lại chỉ vì trang chưa cập nhật.',
            'The expected payment window has elapsed. If you have already paid, contact support with your order code instead of paying twice.',
            '预计支付窗口已过。如已完成付款，请凭订单号联系客服核实，切勿重复付款。',
          )}
        </p>
      )}
      {process.env.COMMERCE_SUPPORT_EMAIL && (
        <p>
          <a
            className="text-link"
            href={`mailto:${process.env.COMMERCE_SUPPORT_EMAIL}?subject=THAMVAN%20${order.order_code}`}
          >
            {c('Hỗ trợ đơn hàng', 'Order support', '订单支持')}
          </a>
        </p>
      )}
    </section>
  );
}
