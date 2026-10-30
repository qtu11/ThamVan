import Link from 'next/link';
import { ArrowUpRight, Check, Users, Sparkles } from 'lucide-react';
import { plans, type PlanId } from '@/lib/plans';
import { copy, money } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
export function MembershipPricing({ locale }: { locale: Locale }) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const features: Record<PlanId, string[]> = {
    free: [
      c(
        'Chụp ảnh, tìm hiểu địa điểm và bản đồ',
        'Camera, place discovery and map',
        '拍照、地点探索和地图',
      ),
      c('Tối đa 5 thử thách mỗi ngày', 'Up to 5 challenges each day', '每天最多5次挑战'),
      c(
        'Lưu lịch sử, timeline và ghi hành trình GPS',
        'Visit history, timeline and GPS recording',
        '到访历史、时间线和GPS记录',
      ),
      c(
        'Thông báo web trên thiết bị tương thích',
        'Web push on compatible devices',
        '兼容设备的网页推送',
      ),
    ],
    premium: [
      c('Tất cả tính năng Free', 'Everything in Free', '包含Free全部功能'),
      c('Không giới hạn số thử thách/ngày', 'Unlimited daily challenges', '每日挑战不限'),
      c(
        'Đọc và tải toàn bộ bộ hướng dẫn hiện có',
        'Read and download all current route guides',
        '阅读下载当前全部路线指南',
      ),
      c(
        'Dashboard cá nhân và quản lý thanh toán',
        'Personal dashboard and billing',
        '个人控制台及账单管理',
      ),
    ],
    family: [
      c('Toàn bộ tính năng Premium', 'Everything in Premium', '包含Premium全部功能'),
      c(
        '4 thành viên, dữ liệu cá nhân độc lập',
        '4 members, private individual histories',
        '4位成员，独立个人历史',
      ),
      c(
        'AI lập lịch trình từ 1–7 ngày theo khu vực',
        'AI itineraries for 1–7 days by area',
        '按区域生成1–7天AI行程',
      ),
      c(
        'Mời và quản lý thành viên gia đình',
        'Invite and manage your family',
        '邀请及管理家庭成员',
      ),
    ],
  };
  return (
    <>
      <div className="pricing-grid">
        {(Object.keys(plans) as PlanId[]).map((id) => (
          <article
            key={id}
            className={`price-card ${id === 'premium' ? 'featured-price' : ''}`}
            data-plan={id}
          >
            {id === 'premium' && (
              <span className="price-recommend">
                {c('KHÁM PHÁ KHÔNG GIỚI HẠN', 'EXPLORE MORE', '探索更多')}
              </span>
            )}
            <p className="plan-name">
              {id === 'family' ? (
                <Users size={18} />
              ) : id === 'premium' ? (
                <Sparkles size={18} />
              ) : null}{' '}
              {plans[id].name}
            </p>
            <p>
              {id === 'free'
                ? c('Bắt đầu từ sự tò mò', 'Start with curiosity', '从好奇开始')
                : id === 'premium'
                  ? c('Cho người thích đi và khám phá', 'For the curious explorer', '适合探索者')
                  : c('Cả nhà, cùng một hành trình', 'A shared family adventure', '全家的探索之旅')}
            </p>
            <div className="plan-amount">{money(plans[id].amount, locale)}</div>
            <small>
              {id === 'free'
                ? c('luôn miễn phí', 'always free', '永久免费')
                : c('/ tháng', '/ month', '/ 月')}
            </small>
            <Link
              className={`button ${id === 'premium' ? '' : 'secondary'}`}
              href={id === 'free' ? `/${locale}/dashboard` : `/${locale}/checkout?plan=${id}`}
            >
              {id === 'free'
                ? c('Bắt đầu miễn phí', 'Start for free', '免费开始')
                : c(`Chọn ${plans[id].name}`, `Choose ${plans[id].name}`, `选择${plans[id].name}`)}
              <ArrowUpRight size={15} />
            </Link>
            <ul>
              {features[id].map((text) => (
                <li key={text}>
                  <Check size={16} />
                  {text}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="section-caption">
        {c(
          'Giá theo tháng, không tự gia hạn hoặc tự trừ tiền. Free tính 5 thử thách/ngày theo giờ Việt Nam. Các giới hạn chống lạm dụng vẫn áp dụng. AI cần kết nối dịch vụ; thông báo phụ thuộc quyền thiết bị.',
          'Monthly plans, no automatic renewal or charges. Free allows 5 daily challenges in Vietnam time. Abuse controls still apply. AI requires a connected provider; notifications depend on device permissions.',
          '按月套餐，不自动续费或扣款。Free按越南时间每日5次挑战，仍适用反滥用限制。AI需连接服务，通知取决于设备权限。',
        )}
      </p>
    </>
  );
}
