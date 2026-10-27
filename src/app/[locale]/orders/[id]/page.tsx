import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Clock3, ArrowUpRight } from 'lucide-react';
import { getViewer } from '@/lib/data';
import { supabase } from '@/lib/supabase/server';
import { isLocale } from '@/lib/types';
import { copy, money } from '@/lib/locale-copy';
import { experiences, experienceText } from '@/data/experiences';
import { isPaymentUrl } from '@/lib/checkout-url';
import { OrderRefresh } from '@/components/commerce/order-refresh';
import { paymentWindowExpired } from '@/lib/commerce';
export default async function Order({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) notFound();
  const viewer = await getViewer();
  if (!viewer)
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/orders/${id}`)}`);
  const db = await supabase();
  const { data: order, error } = await db
    .from('commerce_orders')
    .select('id,order_code,product_id,experience_slug,amount,status,checkout_url,created_at')
    .eq('id', id)
    .eq('user_id', viewer.id)
    .maybeSingle();
  if (error || !order) notFound();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const paid = order.status === 'paid';
  const refunded = order.status === 'refunded';
  const pending = order.status === 'pending';
  const expired = paymentWindowExpired(order.created_at);
  return (
    <section className="order-state">
      {paid ? <CheckCircle2 size={35} /> : <Clock3 size={35} />}
      <p className="startup-eyebrow" style={{ marginTop: 20 }}>
        ORDER #{order.order_code}
      </p>
      <h1>
        {paid
          ? c('Bộ hướng dẫn đã mở.', 'Your guide is ready.', '指南已解锁。')
          : refunded
            ? c('Đơn hàng đã hoàn tiền.', 'This order was refunded.', '此订单已退款。')
            : !pending
              ? c('Đơn hàng đã hủy.', 'This order was cancelled.', '此订单已取消。')
              : c(
                  'Đang chờ xác nhận thanh toán.',
                  'Waiting for verified payment.',
                  '等待付款验证。',
                )}
      </h1>
      <p>
        {money(order.amount, locale)} ·{' '}
        {order.product_id === 'collection' ? 'Saigon Collection' : 'Story Walk'}
      </p>
      <p>
        {paid
          ? c(
              'Thanh toán đã được máy chủ xác nhận. Mở hành trình bên dưới để đọc và tải bộ hướng dẫn.',
              'Payment has been verified by the server. Open your walk below to read and download the guide.',
              '服务器已验证付款。打开下面路线即可阅读和下载指南。',
            )
          : refunded
            ? c(
                'Đơn được ghi nhận hoàn toàn bộ tiền. Quyền đọc và tải bộ hướng dẫn từ đơn này đã dừng.',
                'A full refund has been recorded. This order no longer grants reading or download access.',
                '已记录全额退款，此订单不再提供阅读或下载权限。',
              )
            : !pending
              ? c(
                  'Đơn này không cấp quyền truy cập. Nếu đã chuyển tiền, giữ mã đơn và liên hệ hỗ trợ để đối soát.',
                  'This order does not grant access. If you have sent payment, keep the order code and contact support.',
                  '此订单不授予访问权限。如已付款，请保留订单编号并联系支持。',
                )
              : c(
                  'Chưa có xác nhận từ kênh thanh toán. Tham số trên đường dẫn quay về không được dùng để mở quyền truy cập. Trạng thái tự kiểm tra trong một phút; bạn có thể kiểm tra lại sau.',
                  'The payment channel has not confirmed this order. Return-URL parameters never unlock access. This page checks for one minute; you can check again later.',
                  '支付渠道尚未确认此订单，返回网址参数不会解锁权限。此页面自动检查一分钟，你也可稍后手动检查。',
                )}
      </p>
      <div className="order-actions">
        {paid ? (
          experiences
            .filter(
              (item) => order.product_id === 'collection' || item.slug === order.experience_slug,
            )
            .map((item) => (
              <Link className="button" key={item.slug} href={`/${locale}/experiences/${item.slug}`}>
                {experienceText(item.title, locale)}
                <ArrowUpRight size={15} />
              </Link>
            ))
        ) : pending ? (
          <>
            <OrderRefresh locale={locale} pending={!expired} />
            {!expired && isPaymentUrl(order.checkout_url) && (
              <a className="button" href={order.checkout_url}>
                {c('Mở lại thanh toán', 'Reopen checkout', '重新打开付款')}
                <ArrowUpRight size={15} />
              </a>
            )}
          </>
        ) : null}
      </div>
      {pending && expired && (
        <p className="commerce-notice">
          {c(
            'Liên kết thanh toán đã hết thời gian dự kiến. Nếu đã chuyển tiền, giữ mã đơn và liên hệ hỗ trợ; không cần trả tiền lại.',
            'The checkout window has expired. If you have already paid, keep this order code and contact support; do not pay again.',
            '付款窗口已过期。如已付款，请保留订单编号并联系支持，无需重复付款。',
          )}
        </p>
      )}
      {process.env.COMMERCE_SUPPORT_EMAIL && (
        <p style={{ marginTop: 25 }}>
          <a
            className="text-link"
            href={`mailto:${process.env.COMMERCE_SUPPORT_EMAIL}?subject=THAMVAN%20${order.order_code}`}
          >
            {c('Liên hệ hỗ trợ đơn hàng', 'Contact order support', '联系订单支持')}
          </a>
        </p>
      )}
    </section>
  );
}
