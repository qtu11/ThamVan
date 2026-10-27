import { isLocale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { ExperienceCards } from '@/components/experience/experience-cards';
import { Pricing } from '@/components/commerce/pricing';
export default async function Experiences({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  return (
    <div className="container commerce-body">
      <div className="commerce-heading">
        <p className="startup-eyebrow">THE STORY WALKS / SAIGON EDITION</p>
        <h1>
          {copy(
            locale,
            'Chọn một hành trình. Mang về một câu chuyện.',
            'Choose a walk. Bring home a story.',
            '选择一条路线，带回一个故事。',
          )}
        </h1>
        <p>
          {copy(
            locale,
            'Ba góc nhìn về thành phố. Xem trước điểm dừng đầu tiên miễn phí, rồi chọn bộ hướng dẫn hợp với bạn.',
            'Three perspectives on the city. Preview the first stop for free, then choose your guide.',
            '三个城市视角。免费预览第一站，再选择适合的指南。',
          )}
        </p>
      </div>
      <ExperienceCards locale={locale} />
      <div className="startup-section">
        <div className="center-heading">
          <h2>
            {copy(
              locale,
              'Đi sâu hơn, theo nhịp của bạn.',
              'Go deeper, at your pace.',
              '按自己的节奏，探索更多。',
            )}
          </h2>
        </div>
        <Pricing locale={locale} />
      </div>
    </div>
  );
}
