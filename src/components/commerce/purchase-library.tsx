import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase/server';
import { experiences, experienceText } from '@/data/experiences';
import { copy, money } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';

export async function PurchaseLibrary({ locale, userId }: { locale: Locale; userId: string }) {
  const db = await supabase();
  const { data, error } = await db
    .from('commerce_orders')
    .select('id,order_code,product_id,experience_slug,status,amount')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  if (error)
    return (
      <div className="commerce-notice" role="status">
        {c(
          'Chưa tải được thư viện mua hàng. Kiểm tra lại sau; quyền truy cập không được cấp khi chưa đọc được trạng thái thanh toán.',
          'The purchase library is unavailable. Try again later; access is not granted without a verified payment record.',
          '购买库暂时不可用。请稍后重试，未验证付款记录不会授予权限。',
        )}
      </div>
    );
  const owned = experiences.filter((item) =>
    data.some(
      (order) =>
        order.status === 'paid' &&
        (order.product_id === 'collection' || order.experience_slug === item.slug),
    ),
  );
  return (
    <section className="purchase-library">
      <h2>
        <BookOpen size={22} />
        {c('Bộ hướng dẫn đã mua', 'Your purchased guides', '已购指南')}
      </h2>
      {owned.length ? (
        <div className="purchased-guides">
          {owned.map((item) => (
            <Link
              className="button secondary"
              href={`/${locale}/experiences/${item.slug}`}
              key={item.slug}
            >
              {experienceText(item.title, locale)}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      ) : (
        <p>
          {c(
            'Chưa có bộ hướng dẫn đã thanh toán. Bạn có thể đọc mẫu miễn phí ở các trang hành trình.',
            'No paid guides yet. Preview a first stop for free on each story walk page.',
            '暂无已付款指南。可在每条路线页面免费预览第一站。',
          )}
        </p>
      )}
      {data.length > 0 && (
        <details>
          <summary>
            {c('Đơn hàng gần đây', 'Recent orders', '最近订单')} ({data.length})
          </summary>
          <ul className="purchase-orders">
            {data.map((order) => (
              <li key={order.id}>
                <Link href={`/${locale}/orders/${order.id}`}>
                  #{order.order_code} · {money(order.amount, locale)} · {order.status}
                  <ArrowUpRight size={13} />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
