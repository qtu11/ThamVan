import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { payosReady, sepayReady } from '@/lib/membership-checkout';
import { isPaidPlan } from '@/lib/plans';
import { MembershipCheckout } from '@/components/membership/checkout';
export default async function Checkout({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; product?: string }>;
}) {
  const [{ locale: raw }, query] = await Promise.all([params, searchParams]);
  const locale = isLocale(raw) ? raw : 'vi';
  if (!isPaidPlan(query.plan))
    redirect(`/${locale}/checkout?plan=${query.product === 'collection' ? 'family' : 'premium'}`);
  const viewer = await getViewer();
  return (
    <div className="container membership-purchase">
      <div className="commerce-heading">
        <p className="startup-eyebrow">THÁM VĂN MEMBERSHIP</p>
        <h1>
          {copy(
            locale,
            'Thành phố rộng hơn. Trải nghiệm sâu hơn.',
            'More of the city. More to discover.',
            '探索更广，体验更深。',
          )}
        </h1>
        <p>
          {copy(
            locale,
            'Ba gói rõ ràng. Chọn cách bạn muốn khám phá.',
            'Three clear plans. Choose your way to explore.',
            '三个明确套餐，选择你的探索方式。',
          )}
        </p>
      </div>
      <MembershipCheckout
        locale={locale}
        plan={query.plan}
        bankReady={payosReady()}
        cardReady={sepayReady()}
        signedIn={!!viewer}
      />
    </div>
  );
}
