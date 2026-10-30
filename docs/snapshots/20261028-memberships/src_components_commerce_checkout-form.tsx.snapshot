'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import { isPaymentUrl } from '@/lib/checkout-url';
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
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, experience, locale, consent }),
      });
      const result = await response.json();
      if (!response.ok || !isPaymentUrl(result.url)) {
        setError(
          result.error === 'alreadyOwned'
            ? c(
                'Bạn đã sở hữu bộ hướng dẫn này. Mở lại từ trang hành trình.',
                'You already own this guide. Open it from its story walk page.',
                '你已拥有此指南，请从路线页面打开。',
              )
            : result.error === 'rateLimit'
              ? c(
                  'Bạn đã tạo nhiều đơn. Hãy đợi một lúc rồi thử lại.',
                  'Too many orders. Please wait before trying again.',
                  '订单过多，请稍后再试。',
                )
              : c(
                  'Chưa tạo được liên kết thanh toán. Chưa có khoản tiền nào được thu từ thao tác này. Hãy thử lại sau.',
                  'Checkout could not be created. This action has not charged you. Please try again later.',
                  '无法创建付款链接，此操作未扣款，请稍后再试。',
                ),
        );
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError(
        c(
          'Kết nối bị gián đoạn. Kiểm tra mạng rồi thử lại.',
          'Connection interrupted. Check your network and try again.',
          '连接中断，请检查网络后重试。',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const next = `/${locale}/checkout?product=${product}${experience ? `&experience=${experience}` : ''}`;
  return (
    <div className="checkout-form">
      {!ready && (
        <div className="commerce-notice" role="status">
          <strong>
            {c('Bộ hướng dẫn chưa mở bán', 'Guide sales are not open yet', '指南尚未开放购买')}
          </strong>
          <p>
            {c(
              'Bạn vẫn có thể xem trước hành trình miễn phí. Website sẽ chỉ thu tiền khi kênh thanh toán và chính sách bán hàng đã được kích hoạt.',
              'You can still preview the walks for free. Checkout opens when payment processing and sales policies are activated.',
              '你仍可免费预览路线。支付和销售政策启用后才开放购买。',
            )}
          </p>
        </div>
      )}
      {signedIn ? (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              {c(
                'Tôi đã xem nội dung bộ hướng dẫn, tổng giá và',
                'I have reviewed the guide contents, total price and',
                '我已查看指南内容、总价和',
              )}{' '}
              <Link href={`/${locale}/terms`} className="text-link">
                {c('điều khoản mua hàng', 'purchase terms', '购买条款')}
              </Link>
              .{' '}
              {c(
                'Tôi hiểu đây là sản phẩm số tự khám phá, không bao gồm vé hoặc hướng dẫn viên.',
                'I understand this is a self-guided digital product, without tickets or a guide.',
                '我了解这是自助数字产品，不含门票或导游。',
              )}
            </span>
          </label>
          <button className="button" disabled={!ready || !consent || busy} onClick={checkout}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUpRight size={17} />}{' '}
            {c('Tiếp tục với payOS', 'Continue with payOS', '通过payOS继续')}
          </button>
        </>
      ) : (
        <Link className="button" href={`/${locale}/auth/login?next=${encodeURIComponent(next)}`}>
          {c('Đăng nhập để lưu quyền truy cập', 'Sign in to keep your guide', '登录以保存指南权限')}
          <ArrowUpRight size={17} />
        </Link>
      )}
      {error && (
        <p className="status" role="alert">
          {error}
        </p>
      )}
      <p className="experience-meta">
        <ShieldCheck size={15} />
        {c(
          'Xác nhận thanh toán tại máy chủ. Không lưu thông tin ngân hàng.',
          'Server-verified payments. No bank credentials stored.',
          '服务器验证支付，不存储银行凭据。',
        )}
      </p>
      <Link className="text-link" href={`/${locale}/experiences`}>
        {c('Tiếp tục xem trước miễn phí', 'Continue with free previews', '继续免费预览')}
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
