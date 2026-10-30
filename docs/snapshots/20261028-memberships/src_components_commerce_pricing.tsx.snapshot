import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { copy, money } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
import { products } from '@/data/experiences';

export function Pricing({ locale }: { locale: Locale }) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const plans = [
    {
      name: c('City Explorer (111 gói Free)', 'City Explorer (111 Free Packs)', '城市探索者 (111个免费包)'),
      tag: c('111 gói khám phá di sản miễn phí', '111 free heritage exploration packs', '111个免费文化探索包'),
      price: 0,
      suffix: c('111 gói miễn phí trọn đời', '111 free packs forever', '111个永久免费包'),
      features: [
        c('111 gói khám phá di sản và văn hóa miễn phí', '111 curated free heritage packs', '111个精选免费遗产探索包'),
        c('Danh mục và bản đồ 1500+ địa điểm', 'Place directory & map with 1500+ sites', '1500+地点目录与地图'),
        c('Tìm kiếm theo chủ đề văn hóa', 'Search by topic & theme', '按文化主题搜索'),
        c('Xem trước toàn bộ các hành trình', 'Preview every story walk', '预览所有路线'),
      ],
      href: `/${locale}/explore`,
      action: c('Khám phá 111 gói free', 'Explore 111 free packs', '探索111个免费包'),
    },
    {
      name: c('Bản Premium', 'Premium Edition', '高级版'),
      tag: c('Trải nghiệm văn hóa chuyên sâu', 'In-depth cultural journey', '深度文化体验'),
      price: products.walk.amount,
      suffix: c('/ một hành trình (39k)', '/ one story walk (39k)', '/ 单条路线 (39k)'),
      features: [
        c('Một bộ hướng dẫn số chuyên sâu theo tuyến', 'One curated in-depth route guide', '一份精选深度路线指南'),
        c('Nhiệm vụ quan sát và câu hỏi suy ngẫm', 'Observation tasks and reflection questions', '每站观察任务与记录思考'),
        c(
          'Bản văn bản tải về ngoại tuyến không giới hạn',
          'Unlimited offline downloadable text',
          '无限制离线下载文本',
        ),
        c(
          'Lưu vĩnh viễn trong tài khoản cá nhân',
          'Lifetime access in your account',
          '个人账户永久保留',
        ),
      ],
      href: `/${locale}/experiences`,
      action: c('Mua bản Premium (39k)', 'Get Premium (39k)', '获取高级版 (39k)'),
      featured: true,
    },
    {
      name: c('Trọn bộ Premium', 'All Premium Walks', '全套高级版'),
      tag: c('Ba câu chuyện, một thành phố', 'Three stories, one city', '三个故事，一座城市'),
      price: products.collection.amount,
      suffix: c('/ trọn bộ 3 hành trình', '/ all 3 story walks', '/ 全部三条路线'),
      features: [
        c('Cả ba bộ hướng dẫn Sài Gòn chuyên sâu', 'All three Saigon in-depth guides', '全部三份西贡深度指南'),
        c(
          'Đọc lại trong tài khoản đã mua',
          'Revisit in your purchasing account',
          '在购买账户中重复阅读',
        ),
        c('Tải riêng từng hành trình', 'Download each walk individually', '单独下载每条路线'),
      ],
      href: `/${locale}/checkout?product=collection`,
      action: c('Xem trọn bộ', 'View the collection', '查看完整收藏'),
    },
  ];
  return (
    <>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`price-card ${plan.featured ? 'featured-price' : ''}`}
          >
            {plan.featured && (
              <span className="price-recommend">
                {c('BẮT ĐẦU TỪ ĐÂY', 'A GOOD PLACE TO START', '从这里开始')}
              </span>
            )}
            <p className="plan-name">{plan.name}</p>
            <p>{plan.tag}</p>
            <div className="plan-amount">
              {plan.price ? money(plan.price, locale) : c('Miễn phí', 'Free', '免费')}
            </div>
            <small>{plan.suffix}</small>
            <Link className={`button ${plan.featured ? '' : 'secondary'}`} href={plan.href}>
              {plan.action}
              <ArrowUpRight size={16} />
            </Link>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="section-caption">
        {c(
          'Thanh toán một lần, không tự gia hạn. Chỉ thu tiền khi cổng thanh toán đã được kích hoạt. Chưa bao gồm vé tham quan và dịch vụ tại điểm đến.',
          'One-time payment. No automatic renewal. Payments open only when checkout is activated. Admission and on-site services are excluded.',
          '一次性付款，无自动续费。支付开通后才可收款。不包含门票及现场服务。',
        )}
      </p>
    </>
  );
}
