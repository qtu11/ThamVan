import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { products, findExperience, experienceText } from '@/data/experiences';
import { isLocale } from '@/lib/types';
import { copy, money } from '@/lib/locale-copy';
import { checkoutReady } from '@/lib/commerce';
import { getViewer } from '@/lib/data';
import { CheckoutForm } from '@/components/commerce/checkout-form';
export default async function Checkout({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; experience?: string }>;
}) {
  const [{ locale: raw }, query] = await Promise.all([params, searchParams]);
  const locale = isLocale(raw) ? raw : 'vi';
  const productId =
    query.product === 'collection' ? 'collection' : query.product === 'walk' ? 'walk' : null;
  if (!productId) notFound();
  const experience = productId === 'walk' ? findExperience(query.experience || '') : null;
  if (productId === 'walk' && !experience) notFound();
  const product = products[productId],
    viewer = await getViewer();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  return (
    <>
      <div className="container commerce-heading">
        <p className="startup-eyebrow">YOUR NEXT DISCOVERY</p>
        <h1>
          {c(
            'Chuyến đi bắt đầu từ đây.',
            'Your next story starts here.',
            '下一段故事，从这里开始。',
          )}
        </h1>
        <p>
          {c(
            'Xem rõ bạn nhận được gì, trước khi quyết định.',
            'Know exactly what is included before you decide.',
            '决定之前，先了解你会获得什么。',
          )}
        </p>
      </div>
      <div className="container checkout-layout">
        <section className="checkout-card">
          <p className="startup-eyebrow">
            {productId === 'walk' ? 'STORY WALK' : 'SAIGON COLLECTION'}
          </p>
          <h2>
            {experience
              ? experienceText(experience.title, locale)
              : c(
                  'Trọn bộ ba hành trình Sài Gòn',
                  'All three Saigon story walks',
                  '全部三条西贡路线',
                )}
          </h2>
          <ul className="plain-checks">
            <li>
              <Check size={16} />
              {c(
                `${product.routes} bộ hướng dẫn số biên soạn theo tuyến`,
                `${product.routes} curated digital route guide${product.routes > 1 ? 's' : ''}`,
                `${product.routes}份精选数字路线指南`,
              )}
            </li>
            <li>
              <Check size={16} />
              {c(
                'Nhiệm vụ quan sát và câu hỏi suy ngẫm',
                'Observation prompts and reflection questions',
                '观察任务和思考问题',
              )}
            </li>
            <li>
              <Check size={16} />
              {c(
                'Đọc trên web, tải bản văn bản ngoại tuyến',
                'Read online and download a text copy',
                '在线阅读和下载文本',
              )}
            </li>
          </ul>
          <div className="checkout-total">
            <span>{c('Tổng thanh toán', 'Total', '总计')}</span>
            <strong>{money(product.amount, locale)}</strong>
          </div>
          <p>
            {c(
              'Thanh toán một lần. Không tự gia hạn. Giá hiển thị là tổng giá bộ hướng dẫn. Không bao gồm vé, ăn uống, di chuyển hoặc hướng dẫn viên.',
              'One-time payment, no renewal. The displayed amount is the total guide price. Admission, food, transport and a guide are excluded.',
              '一次性付款，无续费。显示金额为指南总价，不包含门票、餐饮、交通和导游。',
            )}
          </p>
          <p>
            {c(
              'Quyền đọc gắn với tài khoản mua và chỉ mở sau xác nhận thanh toán. Giữ mã đơn để đối soát khi cần hỗ trợ.',
              'Access is tied to the purchasing account and opens only after payment verification. Keep your order code for support.',
              '阅读权限绑定购买账户，并在付款验证后开启。请保留订单编号以便查询。',
            )}
          </p>
        </section>
        <section className="checkout-card">
          <h2>{c('Sẵn sàng khám phá?', 'Ready to discover?', '准备好探索了吗？')}</h2>
          <CheckoutForm
            locale={locale}
            product={productId}
            experience={experience?.slug}
            ready={checkoutReady()}
            signedIn={!!viewer}
          />
        </section>
      </div>
    </>
  );
}
