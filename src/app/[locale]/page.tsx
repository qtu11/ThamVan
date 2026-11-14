import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { getCatalog } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { HomeExperience } from '@/components/experience/home-experience';
import { HomeAds } from '@/components/home-ads';
import { HomeDiscoveryHub } from '@/components/home-discovery-hub';
import { ExperienceCards } from '@/components/experience/experience-cards';
import { PassportPreview } from '@/components/experience/passport-preview';
import { Pricing } from '@/components/commerce/pricing';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const entries = await getCatalog();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);

  return (
    <>
      <HomeExperience locale={locale} count={entries.length} />
      <HomeAds locale={locale} />
      <HomeDiscoveryHub entries={entries} locale={locale} />

      <section className="startup-section container" id="story-walks">
        <div className="startup-section-heading">
          <div>
            <p className="startup-eyebrow">
              {c('TẬP LỘ TRÌNH · STORY WALKS', 'THE STORY WALKS', '主题探索档案 · STORY WALKS')}
            </p>
            <h2>
              {c(
                'Hành trình tự khám phá theo chủ đề',
                'Themed self-guided story walks',
                '主题自助探索路线',
              )}
            </h2>
            <p>
              {c(
                'Tuyến đi gọn ghẽ, từng điểm dừng có bản đồ vị trí và câu chuyện văn hóa trích nguồn rõ ràng.',
                'Curated stops, clear walking routes, and cultural stories backed by verified historical sources.',
                '精选停靠点、清晰步行路线与有据可查的城市文化档案。',
              )}
            </p>
          </div>
          <Link className="text-link" href={`/${locale}/experiences`}>
            {c('Xem các hành trình', 'All story walks', '查看全部路线')}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <ExperienceCards locale={locale} />
        <p className="section-caption">
          {c(
            'Thời lượng là ước tính khi tự đi bộ khám phá. Giá ấn phẩm số không bao gồm vé tham quan, ẩm thực hay phương tiện.',
            'Self-guided durations are walking estimates. Digital guide access excludes venue tickets, food, and transport.',
            '自助漫步时长为步行参考。数字手册费用不包含景点门票、餐饮与交通。',
          )}
        </p>
      </section>

      <section className="startup-section container passport-layout" id="passport">
        <div>
          <p className="startup-eyebrow">
            {c('HỘ CHIẾU THỰC ĐỊA · PASSPORT', 'CULTURAL PASSPORT', '实地探索护照 · PASSPORT')}
          </p>
          <h2>
            {c(
              'Lưu lại từng con dấu qua mỗi góc phố',
              'Collect field stamps across the city',
              '收集每一条街区的实地探索印章',
            )}
          </h2>
          <p>
            {c(
              'Mỗi lần ghé một bến sông, ngôi chùa cổ hay công trình kiến trúc, bạn có thể đóng dấu kỷ niệm ngay vào cuốn hộ chiếu cá nhân.',
              'Each time you visit a riverfront wharf, heritage temple, or historic landmark, stamp your personal cultural passport.',
              '每当走过江畔码头、古刹庭院或历史建筑，都可以为自己的文化护照盖下一枚纪念印章。',
            )}
          </p>
          <ul className="plain-checks">
            <li>
              <Check size={16} aria-hidden="true" />
              <span>
                {c(
                  'Đóng dấu trải nghiệm lưu trực tiếp trên trình duyệt của bạn.',
                  'Interactive stamps saved locally in your browser.',
                  '互动印章即时保存在当前浏览器中。',
                )}
              </span>
            </li>
            <li>
              <Check size={16} aria-hidden="true" />
              <span>
                {c(
                  'Hỗ trợ đối chiếu GPS trong 300 m khi thực hiện thử thách tại điểm đến.',
                  'Optional 300 m GPS verification on place challenge check-ins.',
                  '地点页面挑战打卡支持 300 米范围 GPS 对照。',
                )}
              </span>
            </li>
            <li>
              <Check size={16} aria-hidden="true" />
              <span>
                {c(
                  'Xuất bản ghi nhật ký hộ chiếu thành tệp cá nhân bất cứ lúc nào.',
                  'Download your personal stamp record anytime.',
                  '可随时导出个人盖章记录备份。',
                )}
              </span>
            </li>
          </ul>
          <Link className="text-link" href={`/${locale}/journey`}>
            {c('Mở sổ hành trình của tôi', 'Open my journey log', '打开我的旅程手册')}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <PassportPreview locale={locale} />
      </section>

      <section className="startup-section container" id="pricing">
        <div className="center-heading">
          <p className="startup-eyebrow">
            {c('HỘI VIÊN & ẤN PHẨM · PLANS', 'PLANS & GUIDES', '会员与指南方案 · PLANS')}
          </p>
          <h2>
            {c('Khám phá miễn phí. Mở rộng khi cần.', 'Explore free. Upgrade anytime.', '免费探索，按需升级。')}
          </h2>
          <p>
            {c(
              'Toàn bộ danh mục di sản và bản đồ mở miễn phí. Chọn gói hội viên khi muốn đọc trọn bộ lộ trình chuyên sâu và lưu không giới hạn.',
              'The heritage archive and map stay free. Choose a membership to unlock complete route monographs and family tools.',
              '遗产档案目录与地图永久免费开放；需要完整深度漫步指南与家庭工具时可升级方案。',
            )}
          </p>
        </div>
        <Pricing locale={locale} />
      </section>

      <section className="startup-section container faq-layout" id="faq">
        <div>
          <p className="startup-eyebrow">
            {c('GIẢI ĐÁP THỰC ĐỊA · FAQ', 'FIELD NOTES & FAQ', '常见问题 · FAQ')}
          </p>
          <h2>{c('Câu hỏi thường gặp', 'Common questions', '常见问题')}</h2>
        </div>
        <div>
          {[
            [
              c(
                'Tôi có cần trả phí để tra cứu di sản trên THÁM VĂN?',
                'Do I have to pay to explore THÁM VĂN?',
                '浏览与查阅资料需要付费吗？',
              ),
              c(
                'Không. Kho tư liệu di sản, tìm kiếm, bản đồ và các câu đố cơ bản luôn mở miễn phí. Gói hội viên chỉ dành cho lộ trình chuyên sâu và tiện ích mở rộng.',
                'No. The heritage archive, search, interactive map, and core quizzes remain free. Paid plans unlock deep route guides and extended features.',
                '不需要。遗产档案库、搜索、交互地图和基础问答均免费开放。付费方案仅用于解锁深度路线与高级功能。',
              ),
            ],
            [
              c(
                'Đây có phải tour có hướng dẫn viên đi kèm?',
                'Is this an escorted group tour?',
                '这是带导游的跟团游吗？',
              ),
              c(
                'Đây là ấn phẩm và sổ tay số để bạn tự túc khám phá theo nhịp riêng. Bạn chủ động khung giờ và kiểm tra giờ mở cửa của từng điểm.',
                'This is a digital self-guided field guide. You choose your own schedule and confirm opening hours at each venue.',
                '这是一个数字自助探索手记平台，您可以自由安排行程并在出发前确认各场所开放时间。',
              ),
            ],
            [
              c(
                'Hộ chiếu di sản có yêu cầu chia sẻ vị trí của tôi không?',
                'Does the passport track my GPS location?',
                '文化护照会自动追踪我的位置吗？',
              ),
              c(
                'Con dấu hộ chiếu trên trang chủ chỉ lưu cục bộ trên trình duyệt để bạn tự đánh dấu. Tính năng đối chiếu GPS 300 m chỉ bật khi bạn chủ động check-in tại trang địa điểm.',
                'Stamps on the home page are stored only in your browser for personal keeping. Optional 300 m GPS verification is requested only when checking in on a place page.',
                '首页的护照印章仅由您手动标记并保存在本地浏览器中。300 米 GPS 验证仅在您主动前往地点页面打卡时触发。',
              ),
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span>+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
