import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { copy, money } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
import { products } from '@/data/experiences';

export function Pricing({ locale }: { locale: Locale }) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const plans = [
    {
      name: 'City Explorer',
      tag: c('Bắt đầu với sự tò mò', 'Start with curiosity', '从好奇开始'),
      price: 0,
      suffix: c('luôn miễn phí', 'always free', '永久免费'),
      features: [
        c('Danh mục và bản đồ địa điểm', 'Place directory and map', '地点目录和地图'),
        c('Tìm kiếm theo chủ đề', 'Search by topic', '按主题搜索'),
        c('Xem trước các hành trình', 'Preview every story walk', '预览所有路线'),
      ],
      href: `/${locale}/explore`,
      action: c('Khám phá miễn phí', 'Explore for free', '免费探索'),
    },
    {
      name: 'Story Walk',
      tag: c('Một buổi đi chơi có chiều sâu', 'One walk, a deeper connection', '一次有深度的漫步'),
      price: products.walk.amount,
      suffix: c('/ một hành trình', '/ one story walk', '/ 一条路线'),
      features: [
        c('Một bộ hướng dẫn theo tuyến', 'One curated route guide', '一份精选路线指南'),
        c('Nhiệm vụ quan sát tại từng điểm', 'Observation tasks at each stop', '每站观察任务'),
        c(
          'Bản văn bản tải về ngoại tuyến',
          'Downloadable text for offline use',
          '可下载的离线文本',
        ),
      ],
      href: `/${locale}/experiences`,
      action: c('Chọn hành trình', 'Choose a walk', '选择路线'),
      featured: true,
    },
    {
      name: 'Saigon Collection',
      tag: c('Ba câu chuyện, một thành phố', 'Three stories, one city', '三个故事，一座城市'),
      price: products.collection.amount,
      suffix: c('/ trọn bộ 3 hành trình', '/ all 3 story walks', '/ 全部三条路线'),
      features: [
        c('Cả ba bộ hướng dẫn Sài Gòn', 'All three Saigon route guides', '全部三份西贡路线指南'),
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
