'use client';
import { useState } from 'react';
import { Users, UserPlus, Link2 } from 'lucide-react';
import type { MembershipAccess } from '@/lib/plans';
import { dateFormat } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
import { ActionForm } from './common';
export function FamilyManager({
  locale,
  access,
  members,
  signedIn,
  invite,
}: {
  locale: Locale;
  access: MembershipAccess | null;
  members: { member_id: string; joined_at: string }[];
  signedIn: boolean;
  invite?: string;
}) {
  const [link, setLink] = useState('');
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  return (
    <div className="dash-two-columns">
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>{c('GÓI FAMILY · 04 THÀNH VIÊN', 'FAMILY PLAN · 04 SEATS', '家庭套餐 · 04 位成员')}</small>
            <h2>{c('Cùng khám phá, riêng tư cho mỗi người.', 'Explore together with private spaces.', '同行探索，各自隐私独立。')}</h2>
          </div>
          <Users size={26} />
        </div>
        <p>
          {c(
            'Chủ gói và tối đa 3 người được mời. Mỗi thành viên có lịch sử, GPS và thông báo riêng; chủ gói không tự động xem được vị trí của thành viên.',
            'Account holder plus up to 3 invited members. Each member keeps separate history, GPS tracks and alerts; seat owners never auto-view member locations.',
            '含主账号及最多 3 位受邀成员。每位成员拥有独立的探索记录、GPS 轨迹与通知，主账号无法自动查看其他成员位置。',
          )}
        </p>
        {access?.plan === 'family' && access.is_owner ? (
          <>
            <div className="family-capacity">
              <strong>
                {members.length + 1}
                <small>/4</small>
              </strong>
              <span>{c('thành viên trong gia đình', 'family seats active', '位家庭成员')}</span>
            </div>
            <div className="family-person">
              <span className="dash-avatar">TV</span>
              <div>
                <strong>{c('Bạn · Chủ gói', 'You · Plan owner', '您 · 主账号')}</strong>
                <small>{c('Quản lý thanh toán và thành viên', 'Manages billing and seats', '管理账单与成员席位')}</small>
              </div>
            </div>
            {members.map((member, index) => (
              <div className="family-person" key={member.member_id}>
                <span className="dash-avatar">0{index + 2}</span>
                <div>
                  <strong>
                    {c(`Thành viên ${index + 2}`, `Member ${index + 2}`, `成员 ${index + 2}`)}
                  </strong>
                  <small>
                    {member.member_id.slice(0, 8)} · {dateFormat(locale, member.joined_at)}
                  </small>
                </div>
                <ActionForm
                  locale={locale}
                  values={() => ({
                    action: 'family',
                    operation: 'remove',
                    member: member.member_id,
                  })}
                  submit={c('Xóa khỏi nhóm', 'Remove seat', '移出家庭组')}
                >
                  <span className="sr-only">
                    {c('Xóa thành viên khỏi gói gia đình', 'Remove family member', '从家庭组移除成员')}
                  </span>
                </ActionForm>
              </div>
            ))}
            <ActionForm
              locale={locale}
              disabled={members.length >= 3}
              submit={c('Tạo lời mời dùng một lần', 'Create single-use invite', '生成一次性邀请')}
              values={() => ({ action: 'family', operation: 'invite' })}
              onSuccess={(result) => {
                if (typeof result.token === 'string')
                  setLink(
                    `${location.origin}/${locale}/dashboard?tab=family&invite=${result.token}`,
                  );
              }}
            >
              <UserPlus size={22} />
              <p>
                {c(
                  'Lời mời hết hạn sau 7 ngày, chỉ dùng được một lần. Chia sẻ riêng cho đúng người.',
                  'Invitations expire after 7 days and work once. Share privately with the intended person.',
                  '邀请链接 7 天内有效且仅限使用一次，请私下发送给受邀人。',
                )}
              </p>
            </ActionForm>
            {link && (
              <label>
                {c('Liên kết mời', 'Invite link', '邀请链接')}
                <input readOnly value={link} onFocus={(event) => event.target.select()} />
              </label>
            )}
          </>
        ) : (
          <div className="dash-notice">
            {access?.plan === 'family'
              ? c(
                  'Bạn đang dùng quyền thành viên từ chủ gói.',
                  'You currently have member access shared from the family owner.',
                  '您当前正在使用主账号共享的家庭成员权益。',
                )
              : c(
                  'Bạn chưa có gói Family đang hiệu lực.',
                  'You do not have an active Family plan yet.',
                  '您尚未开通有效的家庭套餐。',
                )}
            {access?.plan === 'family' && !access.is_owner && (
              <ActionForm
                locale={locale}
                submit={c('Rời gia đình', 'Leave family', '退出家庭组')}
                values={() => ({ action: 'family', operation: 'leave' })}
              >
                <p>
                  {c(
                    'Rời nhóm sẽ kết thúc quyền Family được chia sẻ cho bạn.',
                    'Leaving ends the shared Family benefits on your account.',
                    '退出后将终止此家庭套餐赋予您的共享权益。',
                  )}
                </p>
              </ActionForm>
            )}
          </div>
        )}
      </section>
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>{c('NHẬN LỜI MỜI GIA ĐÌNH', 'JOIN A FAMILY', '加入家庭组')}</small>
            <h2>{c('Bạn có lời mời?', 'Have an invite code?', '已有邀请码？')}</h2>
          </div>
          <Link2 size={24} />
        </div>
        <p>
          {c(
            'Dán mã lời mời từ chủ gói. Tham gia là tự nguyện và không chia sẻ lịch sử vị trí của bạn.',
            'Paste an invite token from the plan owner. Joining is voluntary and never shares your location history.',
            '粘贴主账号提供的邀请码。加入完全自愿，不会共享您的个人位置历史。',
          )}
        </p>
        <ActionForm
          locale={locale}
          disabled={!signedIn}
          submit={c('Tham gia gia đình', 'Join family', '加入家庭')}
          values={(data) => ({
            action: 'family',
            operation: 'accept',
            token: String(data.get('token')).trim(),
          })}
        >
          <label>
            {c('Mã lời mời', 'Invite token', '邀请码')}
            <input
              name="token"
              defaultValue={invite || ''}
              required
              pattern="[0-9a-fA-F-]{36}"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </label>
          <label className="check-label">
            <input type="checkbox" required />
            <span>
              {c(
                'Tôi đồng ý tham gia nhóm này. Có thể rời nhóm bất cứ lúc nào.',
                'I agree to join this family group and may leave at any time.',
                '我同意加入该家庭组，并可随时退出。',
              )}
            </span>
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
