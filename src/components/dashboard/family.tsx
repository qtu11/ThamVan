'use client';
import { useState } from 'react';
import { Users, UserPlus, Link2 } from 'lucide-react';
import type { MembershipAccess } from '@/lib/plans';
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
  return (
    <div className="dash-two-columns">
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>PREMIUM FAMILY / 04 SEATS</small>
            <h2>Cùng khám phá, riêng tư cho mỗi người.</h2>
          </div>
          <Users size={26} />
        </div>
        <p>
          Chủ gói và tối đa 3 người được mời. Mỗi thành viên có lịch sử, GPS và thông báo riêng; chủ
          gói không tự động xem được vị trí của thành viên.
        </p>
        {access?.plan === 'family' && access.is_owner ? (
          <>
            <div className="family-capacity">
              <strong>
                {members.length + 1}
                <small>/4</small>
              </strong>
              <span>thành viên trong gia đình</span>
            </div>
            <div className="family-person">
              <span className="dash-avatar">TV</span>
              <div>
                <strong>Bạn · Chủ gói</strong>
                <small>Quản lý thanh toán và thành viên</small>
              </div>
            </div>
            {members.map((member, index) => (
              <div className="family-person" key={member.member_id}>
                <span className="dash-avatar">0{index + 2}</span>
                <div>
                  <strong>Thành viên {index + 2}</strong>
                  <small>
                    {member.member_id.slice(0, 8)} ·{' '}
                    {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                  </small>
                </div>
                <ActionForm
                  locale={locale}
                  values={() => ({
                    action: 'family',
                    operation: 'remove',
                    member: member.member_id,
                  })}
                  submit="Xóa khỏi nhóm"
                >
                  <span className="sr-only">Xóa thành viên khỏi gói gia đình</span>
                </ActionForm>
              </div>
            ))}
            <ActionForm
              locale={locale}
              disabled={members.length >= 3}
              submit="Tạo lời mời dùng một lần"
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
                Lời mời hết hạn sau 7 ngày, chỉ dùng được một lần. Chia sẻ riêng cho đúng người.
              </p>
            </ActionForm>
            {link && (
              <label>
                Liên kết mời
                <input readOnly value={link} onFocus={(event) => event.target.select()} />
              </label>
            )}
          </>
        ) : (
          <div className="dash-notice">
            {access?.plan === 'family'
              ? 'Bạn đang dùng quyền thành viên từ chủ gói.'
              : 'Bạn chưa có gói Family đang hiệu lực.'}
            {access?.plan === 'family' && !access.is_owner && (
              <ActionForm
                locale={locale}
                submit="Rời gia đình"
                values={() => ({ action: 'family', operation: 'leave' })}
              >
                <p>Rời nhóm sẽ kết thúc quyền Family được chia sẻ cho bạn.</p>
              </ActionForm>
            )}
          </div>
        )}
      </section>
      <section className="dash-panel">
        <div className="dash-panel-heading">
          <div>
            <small>JOIN A FAMILY</small>
            <h2>Bạn có lời mời?</h2>
          </div>
          <Link2 size={24} />
        </div>
        <p>
          Dán mã lời mời từ chủ gói. Tham gia là tự nguyện và không chia sẻ lịch sử vị trí của bạn.
        </p>
        <ActionForm
          locale={locale}
          disabled={!signedIn}
          submit="Tham gia gia đình"
          values={(data) => ({
            action: 'family',
            operation: 'accept',
            token: String(data.get('token')).trim(),
          })}
        >
          <label>
            Mã lời mời
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
            <span>Tôi đồng ý tham gia nhóm này. Có thể rời nhóm bất cứ lúc nào.</span>
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
