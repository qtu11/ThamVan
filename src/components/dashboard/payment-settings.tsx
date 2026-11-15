'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, QrCode } from 'lucide-react';
import { api } from '@/components/ui';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';

/** Admin switch for app_settings.payments_live. Off = checkout shows an unscannable preview QR. */
export function PaymentSettings({
  locale,
  live,
  stored,
  payosConfigured,
  sepayConfigured,
}: {
  locale: Locale;
  live: boolean;
  /** False until migration 010 (app_settings) is applied: the switch cannot be saved yet. */
  stored: boolean;
  payosConfigured: boolean;
  sepayConfigured: boolean;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function toggle() {
    if (busy) return;
    if (
      !live &&
      !window.confirm(
        c(
          'Bật thu tiền thật? Khách sẽ được chuyển tới payOS / SePay và bị trừ tiền.',
          'Turn on real payments? Visitors will be sent to payOS / SePay and charged.',
          '开启真实收款？用户将跳转至 payOS / SePay 并被扣款。',
        ),
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/workspace', { action: 'payments', live: !live });
      router.refresh();
    } catch {
      setError(
        c(
          'Chưa lưu được. Kiểm tra migration 010 (app_settings) đã được áp dụng.',
          'Not saved. Check that migration 010 (app_settings) is applied.',
          '保存失败，请确认已应用迁移 010（app_settings）。',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const blocked = stored && !live && !payosConfigured && !sepayConfigured;
  const provider = (name: string, ok: boolean) => (
    <li>
      {name}:{' '}
      {ok
        ? c('đã cấu hình khóa', 'keys configured', '密钥已配置')
        : c('thiếu biến môi trường', 'missing environment variables', '缺少环境变量')}
    </li>
  );
  return (
    <section className="settings-card" aria-labelledby="payment-settings-title">
      <h2 id="payment-settings-title">
        <QrCode size={18} /> {c('Cổng thanh toán', 'Payment gateway', '支付网关')}
      </h2>
      <p role="status">
        {live
          ? c(
              'ĐANG THU TIỀN THẬT: mã QR / cổng thẻ là thật.',
              'LIVE: real QR codes and card checkout.',
              '真实收款中：二维码与银行卡支付为真实。',
            )
          : c(
              'XEM TRƯỚC: khách chỉ thấy mã QR minh họa, không quét được, không thu tiền.',
              'PREVIEW: visitors see an illustrative QR that cannot be scanned; nothing is charged.',
              '预览：用户只看到无法扫描的示意二维码，不会扣款。',
            )}
      </p>
      {!stored && (
        <p role="alert" className="status danger">
          {c(
            'Chưa có bảng cài đặt: chạy file supabase/migrations/202611150010_app_settings.sql trong Supabase SQL Editor rồi tải lại trang.',
            'Settings table missing: run supabase/migrations/202611150010_app_settings.sql in the Supabase SQL Editor, then reload.',
            '缺少设置表：请在 Supabase SQL Editor 中运行 supabase/migrations/202611150010_app_settings.sql 后刷新。',
          )}
        </p>
      )}
      <ul className="help-text">
        {provider('payOS (VietQR)', payosConfigured)}
        {provider('SePay', sepayConfigured)}
      </ul>
      <button
        type="button"
        className={live ? 'button secondary' : 'button'}
        onClick={toggle}
        disabled={busy || !stored || (!live && !payosConfigured && !sepayConfigured)}
        aria-describedby={blocked ? 'payment-settings-blocked' : undefined}
      >
        {busy && <LoaderCircle size={16} className="spin" />}{' '}
        {live
          ? c('Tắt, quay về xem trước', 'Switch back to preview', '切回预览')
          : c('Bật thu tiền thật', 'Turn on real payments', '开启真实收款')}
      </button>
      {blocked && (
        <p id="payment-settings-blocked" className="help-text">
          {c(
            'Điền khóa payOS (PAYOS_*, COMMERCE_SUPPORT_EMAIL) hoặc SePay (SEPAY_*) trong file env máy chủ trước khi bật.',
            'Add payOS (PAYOS_*, COMMERCE_SUPPORT_EMAIL) or SePay (SEPAY_*) keys to the server env before turning this on.',
            '开启前请先在服务器环境变量中填写 payOS（PAYOS_*、COMMERCE_SUPPORT_EMAIL）或 SePay（SEPAY_*）密钥。',
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="status danger">
          {error}
        </p>
      )}
    </section>
  );
}
