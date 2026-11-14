'use client';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
import type { ProductId } from '@/data/experiences';

export function CheckoutForm({
  locale,
  product,
  experience,
  ready,
  signedIn,
}: {
  locale: Locale;
  product: ProductId;
  experience?: string;
  ready: boolean;
  signedIn: boolean;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const membershipPlan = product === 'collection' ? 'family' : 'premium';
  const membershipHref = `/${locale}/checkout?plan=${membershipPlan}${experience ? `&experience=${encodeURIComponent(experience)}` : ''}`;
  const loginHref = `/${locale}/auth/login?next=${encodeURIComponent(membershipHref)}`;

  return (
    <div className="checkout-form">
      <div className="commerce-notice" role="status">
        <strong>
          {c(
            'Thanh toán đã chuyển sang gói Hội viên',
            'Checkout has moved to Membership plans',
            '结账已升级为会员方案',
          )}
        </strong>
        <p>
          {ready
            ? c(
                'Quyền mở khóa toàn bộ bộ hướng dẫn và bản ghi chép thực địa nay được quản lý thống nhất qua gói Hội viên (Premium / Family).',
                'Access to all field guides and story walks is now managed under Membership plans (Premium / Family).',
                '所有深度导览与行程手册现已统一纳入会员方案（Premium / Family）。',
              )
            : c(
                'Bạn vẫn có thể xem trước hành trình miễn phí. Khi kênh thanh toán hội viên được kích hoạt, bạn có thể nâng cấp trực tiếp tại trang thanh toán hội viên.',
                'You can still preview the walks for free. Once membership payment is active, you can upgrade from the membership checkout page.',
                '你仍可免费预览路线。会员支付启用后，即可在会员结账页升级。',
              )}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          <Link className="button" href={signedIn ? membershipHref : loginHref}>
            {signedIn
              ? c('Mở trang gói Hội viên', 'Open Membership checkout', '前往会员结账页')
              : c('Đăng nhập để tiếp tục', 'Sign in to continue', '登录后继续')}
            <ArrowUpRight size={15} />
          </Link>
          <Link className="button secondary" href={`/${locale}/experiences`}>
            {c('Đọc thử miễn phí', 'Try free preview', '免费试读')}
            <ArrowUpRight size={14} />
          </Link>
          <Link className="text-link" href={`/${locale}/partners`}>
            {c('Đặt lịch cho nhóm / trường học', 'Inquire for schools & groups', '团体/学校咨询')}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <p className="experience-meta">
        <ShieldCheck size={15} />
        {c(
          'Xác nhận thanh toán tại máy chủ. Không lưu thông tin ngân hàng.',
          'Server-verified payments. No bank credentials stored.',
          '服务器验证支付，不存储银行凭据。',
        )}
      </p>
    </div>
  );
}
