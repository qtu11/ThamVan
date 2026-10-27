'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Download, LoaderCircle } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
import { Captcha } from '@/components/captcha';
export function LeadForm({
  locale,
  ready,
  nonce,
}: {
  locale: Locale;
  ready: boolean;
  nonce?: string;
}) {
  const [busy, setBusy] = useState(false),
    [reference, setReference] = useState(''),
    [error, setError] = useState(''),
    [captcha, setCaptcha] = useState('');
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await fetch('/api/business-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...Object.fromEntries(data.entries()),
          consent: data.get('consent') === 'on',
          locale,
          captcha,
        }),
      });
      const body = await result.json();
      if (!result.ok || !body.reference) {
        setError(
          body.error === 'rateLimit'
            ? c(
                'Bạn đã gửi nhiều yêu cầu. Hãy thử lại sau một giờ.',
                'Too many requests. Please try again in an hour.',
                '请求过多，请一小时后再试。',
              )
            : c(
                'Yêu cầu chưa được lưu. Kiểm tra kết nối hoặc thử lại sau.',
                'Your request has not been saved. Check your connection or try again later.',
                '请求尚未保存，请检查连接或稍后重试。',
              ),
        );
        return;
      }
      setReference(body.reference);
    } catch {
      setError(
        c(
          'Mất kết nối. Yêu cầu chưa được xác nhận.',
          'Connection lost. Your request has not been confirmed.',
          '连接中断，请求尚未确认。',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  function downloadBrief() {
    const text = c(
      'THÁM VĂN — ĐỀ BÀI HỢP TÁC\n\nĐơn vị:\nNgười liên hệ:\nEmail:\nĐối tượng tham gia:\nSố người dự kiến:\nMục tiêu trải nghiệm:\nThời gian mong muốn:\nNgân sách dự kiến:\n\nBản này lưu trên thiết bị, chưa được gửi đến THÁM VĂN.',
      'THÁM VĂN — PARTNERSHIP BRIEF\n\nOrganization:\nContact name:\nEmail:\nAudience:\nExpected participants:\nExperience goals:\nPreferred dates:\nIndicative budget:\n\nThis file is saved locally and has not been sent to THÁM VĂN.',
      'THÁM VĂN — 合作需求\n\n组织：\n联系人：\n邮箱：\n参与对象：\n预计人数：\n体验目标：\n希望时间：\n预算：\n\n此文件仅保存在本地，尚未发送至THÁM VĂN。',
    );
    const url = URL.createObjectURL(
      new Blob(['\ufeff', text], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tham-van-partnership-brief.txt';
    link.click();
    URL.revokeObjectURL(url);
  }
  if (reference)
    return (
      <div className="lead-form" role="status">
        <CheckCircle2 size={35} />
        <h2>
          {c('Đã lưu yêu cầu hợp tác.', 'Your partnership request is saved.', '合作请求已保存。')}
        </h2>
        <p>
          {c('Mã tham chiếu', 'Reference', '参考编号')}: {reference}
        </p>
        <p>
          {c(
            'Đây là yêu cầu tư vấn, chưa phải đặt dịch vụ hoặc xác nhận báo giá.',
            'This is an inquiry, not a booking or confirmed quote.',
            '这是咨询请求，不是预订或已确认的报价。',
          )}
        </p>
      </div>
    );
  return (
    <form className="lead-form" onSubmit={submit}>
      <h2>{c('Kể chúng tôi nghe đề bài.', 'Tell us what you have in mind.', '说说你的想法。')}</h2>
      <p>
        {c(
          'Một yêu cầu rõ ràng là khởi đầu cho hành trình phù hợp.',
          'A clear brief is the start of a thoughtful experience.',
          '清晰的需求，是合适体验的起点。',
        )}
      </p>
      {!ready && (
        <div className="commerce-notice" role="status">
          {c(
            'Kênh nhận yêu cầu trực tuyến chưa được kích hoạt. Bạn có thể tải mẫu đề bài về chuẩn bị trước; thông tin chưa được gửi.',
            'Online inquiries are not activated yet. Download a brief template to prepare; no information has been sent.',
            '在线咨询尚未启用。可先下载需求模板准备资料；信息尚未发送。',
          )}
          <button type="button" className="button secondary" onClick={downloadBrief}>
            <Download size={15} />
            {c('Tải mẫu đề bài', 'Download brief', '下载需求模板')}
          </button>
        </div>
      )}
      <div className="form-pair">
        <label>
          {c('Tên của bạn', 'Your name', '姓名')}
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={254} autoComplete="email" />
        </label>
      </div>
      <label>
        {c('Tên tổ chức', 'Organization', '组织名称')}
        <input
          name="organization"
          required
          minLength={2}
          maxLength={160}
          autoComplete="organization"
        />
      </label>
      <label>
        {c('Bạn đại diện cho', 'You represent', '你代表')}
        <select name="segment">
          <option value="school">
            {c('Trường học / đơn vị giáo dục', 'School / education provider', '学校 / 教育机构')}
          </option>
          <option value="hotel">
            {c('Khách sạn / đơn vị lưu trú', 'Hotel / accommodation', '酒店 / 住宿机构')}
          </option>
          <option value="team">
            {c('Doanh nghiệp / đội ngũ', 'Business / team', '企业 / 团队')}
          </option>
        </select>
      </label>
      <label>
        {c('Bạn muốn tạo trải nghiệm gì?', 'What would you like to create?', '想创建什么体验？')}
        <textarea
          name="message"
          required
          minLength={15}
          maxLength={2000}
          rows={4}
          placeholder={c(
            'Đối tượng, số người, mục tiêu và thời gian dự kiến…',
            'Audience, group size, goals and preferred dates…',
            '对象、人数、目标和预计时间……',
          )}
        />
      </label>
      <label className="trap-field" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="check-label">
        <input type="checkbox" required name="consent" />
        <span>
          {c(
            'Tôi đồng ý lưu thông tin này để THÁM VĂN phản hồi yêu cầu hợp tác, theo',
            'I agree to storage of these details so THÁM VĂN can respond to this inquiry, under the',
            '我同意保存这些信息，以便THÁM VĂN回复合作请求，依据',
          )}{' '}
          <Link className="text-link" href={`/${locale}/privacy`}>
            {c('chính sách quyền riêng tư', 'privacy policy', '隐私政策')}
          </Link>
          .
        </span>
      </label>
      <Captcha nonce={nonce} onToken={setCaptcha} />
      <button
        className="button"
        type="submit"
        disabled={
          busy || !ready || (Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !captcha)
        }
      >
        {busy ? <LoaderCircle size={16} className="spin" /> : <ArrowUpRight size={17} />}{' '}
        {c('Gửi đề bài hợp tác', 'Send partnership inquiry', '发送合作需求')}
      </button>
      {error && (
        <p className="status" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
