'use client';
import '../dashboard/dashboard.css';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Landmark,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { copy, money } from '@/lib/locale-copy';
import { plans, type PaidPlanId } from '@/lib/plans';
import { isPaymentUrl } from '@/lib/checkout-url';
import type { Locale } from '@/lib/types';
export function MembershipCheckout({
  locale,
  plan,
  bankReady,
  cardReady,
  signedIn,
}: {
  locale: Locale;
  plan: PaidPlanId;
  bankReady: boolean;
  cardReady: boolean;
  signedIn: boolean;
}) {
  const [method, setMethod] = useState<'bank' | 'card'>(!bankReady && cardReady ? 'card' : 'bank'),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  function mapCheckoutError(code?: string) {
    if (code === 'FAMILY_ACTIVE')
      return c(
        'Gói Family đang hiệu lực. Bạn có thể gia hạn Family hoặc chọn Premium khi hết hạn.',
        'Family is active. Renew Family or choose Premium after expiry.',
        'Family仍有效，请续费Family或到期后选择Premium。',
      );
    if (code === 'rateLimit')
      return c(
        'Bạn vừa tạo nhiều phiên thanh toán. Hãy đợi một lát rồi thử lại.',
        'Too many checkout attempts. Please wait a moment and try again.',
        '付款请求过多，请稍后再试。',
      );
    if (code === 'authRequired')
      return c(
        'Vui lòng đăng nhập lại để tiếp tục thanh toán an toàn.',
        'Please sign in again to continue safely to checkout.',
        '请重新登录以安全继续付款。',
      );
    if (code === 'termsRequired')
      return c(
        'Hãy đánh dấu đồng ý điều khoản gói thành viên trước khi thanh toán.',
        'Please accept the membership terms before continuing.',
        '付款前请先同意会员条款。',
      );
    if (code === 'checkoutUnavailable')
      return c(
        'Cổng thanh toán tạm thời chưa sẵn sàng hoặc đang bảo trì. Chưa có khoản tiền nào bị trừ.',
        'The payment gateway is temporarily unavailable. No payment has been charged.',
        '支付网关暂不可用，本次操作未扣款。',
      );
    return c(
      'Chưa tạo được thanh toán. Không có khoản tiền nào được thu từ thao tác này.',
      'Checkout was not created. This action has not charged you.',
      '尚未创建付款，此操作未扣款。',
    );
  }
  async function pay() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/membership/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, method, locale, consent }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(mapCheckoutError(result?.error));
        return;
      }
      if (result.provider === 'payos' && isPaymentUrl(result.url)) {
        window.location.assign(result.url);
        return;
      }
      if (
        result.provider === 'sepay' &&
        result.action === 'https://pay.sepay.vn/v1/checkout/init' &&
        Array.isArray(result.fields)
      ) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = result.action;
        for (const pair of result.fields) {
          if (
            !Array.isArray(pair) ||
            pair.length !== 2 ||
            typeof pair[0] !== 'string' ||
            typeof pair[1] !== 'string'
          )
            throw new Error('invalidCheckout');
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = pair[0];
          input.value = pair[1];
          form.append(input);
        }
        document.body.append(form);
        form.submit();
        return;
      }
      throw new Error('invalidCheckout');
    } catch {
      setError(
        c(
          'Kết nối bị gián đoạn. Hãy thử lại sau.',
          'Connection interrupted. Please try again.',
          '连接中断，请重试。',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const ready = method === 'bank' ? bankReady : cardReady;
  return (
    <section className="membership-checkout">
      <div className="checkout-plan">
        <span>
          <ShieldCheck size={24} />
        </span>
        <div>
          <small>THÁM VĂN MEMBERSHIP</small>
          <h2>{plans[plan].name}</h2>
        </div>
        <strong>
          {money(plans[plan].amount, locale)}
          <small>/{c('tháng', 'month', '月')}</small>
        </strong>
      </div>
      <ul className="plain-checks">
        {[
          c(
            'Toàn bộ tính năng cơ bản, không giới hạn số thử thách/ngày',
            'All core features, unlimited daily challenges',
            '全部基础功能，每日挑战无限',
          ),
          plan === 'family'
            ? c(
                'Tối đa 4 thành viên, mỗi người có lịch sử riêng',
                'Up to 4 members, each with a private history',
                '最多4位成员，独立隐私历史',
              )
            : c('Dành cho một tài khoản cá nhân', 'For one personal account', '单个个人账户'),
          plan === 'family'
            ? c(
                'AI lập hành trình theo số ngày và điểm đến',
                'AI itineraries by days and destination',
                'AI按天数和目的地规划行程',
              )
            : c(
                'Hướng dẫn chuyên sâu và tải bộ hành trình',
                'In-depth guides and route downloads',
                '深度指南与路线下载',
              ),
        ].map((text) => (
          <li key={text}>
            <CheckCircle2 size={16} />
            {text}
          </li>
        ))}
      </ul>
      <div
        className="payment-methods"
        role="group"
        aria-label={c('Phương thức thanh toán', 'Payment method', '付款方式')}
      >
        <button type="button" onClick={() => setMethod('bank')} aria-pressed={method === 'bank'}>
          <Landmark size={19} />
          <strong>VietQR</strong>
          <small>
            payOS ·{' '}
            {bankReady
              ? c('Đang mở', 'Active', '已启用')
              : c('Sắp kích hoạt', 'Pending', '待启用')}
          </small>
        </button>
        <button type="button" onClick={() => setMethod('card')} aria-pressed={method === 'card'}>
          <CreditCard size={19} />
          <strong>Visa / Mastercard</strong>
          <small>
            SePay ·{' '}
            {cardReady
              ? c('Đang mở', 'Active', '已启用')
              : c('Sắp kích hoạt', 'Pending', '待启用')}
          </small>
        </button>
      </div>
      {!ready && (
        <div className="commerce-notice" role="status">
          <p style={{ margin: 0 }}>
            {c(
              'Phương thức này chưa được chủ website kích hoạt. Website chưa thu tiền trong giai đoạn này.',
              'This payment gateway is not activated yet. No payment is collected at this time.',
              '此付款方式尚未启用在线收款，目前不会产生任何扣款。',
            )}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {method === 'bank' && cardReady && (
              <button type="button" className="button secondary" onClick={() => setMethod('card')}>
                {c('Chuyển sang thẻ Visa / Mastercard (SePay)', 'Switch to Card (SePay)', '改用银行卡 (SePay)')}
              </button>
            )}
            {method === 'card' && bankReady && (
              <button type="button" className="button secondary" onClick={() => setMethod('bank')}>
                {c('Chuyển sang VietQR (payOS)', 'Switch to VietQR (payOS)', '改用 VietQR (payOS)')}
              </button>
            )}
            {!bankReady && !cardReady && (
              <>
                <Link className="button secondary" href={`/${locale}/partners`}>
                  {c('Liên hệ giữ chỗ / đối tác', 'Contact / reserve access', '联系预约 / 合作')}
                  <ArrowUpRight size={14} />
                </Link>
                <Link className="button secondary" href={`/${locale}/experiences`}>
                  {c('Xem trước miễn phí', 'Browse free previews', '免费预览路线')}
                  <ArrowUpRight size={14} />
                </Link>
                <Link className="text-link" href={`/${locale}/explore`}>
                  {c('Khám phá 1.400+ địa điểm miễn phí', 'Explore 1,400+ places free', '免费探索 1,400+ 地点')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
      <p className="help-text">
        {c(
          'Hiệu lực một tháng lịch sau khi thanh toán được xác nhận. Gia hạn cùng gói nối tiếp kỳ còn lại. Không tự trừ tiền, không lưu số thẻ/CVV trên THÁM VĂN.',
          'Valid for one calendar month after verified payment. Same-plan renewals extend the remaining term. No automatic charge; THÁM VĂN does not store card numbers or CVV.',
          '验证付款后有效一个自然月。同套餐续费衔接剩余期限，不自动扣款，THÁM VĂN不存储卡号或CVV。',
        )}
      </p>
      {plan === 'family' && (
        <p className="help-text">
          {c(
            'Nếu đang dùng Premium, Family bắt đầu khi xác nhận thanh toán; phần Premium còn lại không tự hoàn hoặc khấu trừ.',
            'If Premium is active, Family starts at verified payment; remaining Premium time is not automatically refunded or credited.',
            '已有Premium时，Family自验证付款时开始，剩余Premium期限不自动退款或抵扣。',
          )}
        </p>
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
                'Tôi đồng ý tổng giá, kỳ hạn và',
                'I agree to the total price, term and',
                '我同意总价、期限及',
              )}{' '}
              <Link href={`/${locale}/terms`}>
                {c('điều khoản gói thành viên', 'membership terms', '会员条款')}
              </Link>
              .
            </span>
          </label>
          <button className="button" disabled={!ready || !consent || busy} onClick={pay}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUpRight size={17} />}{' '}
            {c('Thanh toán', 'Pay', '付款')} {money(plans[plan].amount, locale)}
          </button>
        </>
      ) : (
        <Link
          className="button"
          href={`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/checkout?plan=${plan}`)}`}
        >
          {c('Đăng nhập để nâng cấp', 'Sign in to upgrade', '登录以升级')}
          <ArrowUpRight size={17} />
        </Link>
      )}
      {error && (
        <p role="alert" className="status danger">
          {error}
        </p>
      )}
    </section>
  );
}
