import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { getCatalog } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { HomeExperience } from '@/components/experience/home-experience';
import { HomeDiscoveryHub } from '@/components/home-discovery-hub';
import { ExperienceCards } from '@/components/experience/experience-cards';
import { Pricing } from '@/components/commerce/pricing';
import { PassportPreview } from '@/components/experience/passport-preview';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const entries = await getCatalog();
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  return (
    <>
      <HomeExperience locale={locale} count={entries.length} />
      <HomeDiscoveryHub entries={entries} locale={locale} />

      <section className="startup-section container" id="story-walks">
        <div className="startup-section-heading">
          <div>
            <p className="startup-eyebrow">THE STORY WALKS</p>
            <h2>
              {c(
                'Hành trình tự khám phá theo chủ đề',
                'Themed self-guided story walks',
                '主题自助探索路线',
              )}
            </h2>
            <p>
              {c(
                'Lộ trình gọn gàng, điểm dừng chọn lọc và câu chuyện văn hóa có nguồn đối chiếu.',
                'Curated stops, clear routes, and cultural stories backed by verified sources.',
                '精选停靠点、清晰路线与有据可查的文化故事。',
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
            'Thời gian là ước tính tự khám phá. Giá bộ hướng dẫn không gồm vé vào cửa, ăn uống hay di chuyển.',
            'Self-guided durations are estimates. Guide prices exclude admission, food and transport.',
            '自助游时长仅为估计。指南价格不包含门票、餐饮及交通。',
          )}
        </p>
      </section>

      <section className="startup-section container passport-layout">
        <div>
          <p className="startup-eyebrow">YOUR CULTURAL PASSPORT</p>
          <h2>
            {c('Lưu dấu hành trình,', 'Collect your stamps,', '记录探索足迹，')}
            <br />
            <span className="serif-accent">
              {c('giữ trọn ký ức di sản.', 'keep your heritage story.', '留存专属遗产记忆。')}
            </span>
          </h2>
          <p>
            {c(
              'Mỗi điểm dừng bạn ghé thăm hoặc thử thách hoàn thành đều được ghi dấu vào hộ chiếu khám phá cá nhân.',
              'Every stop you mark or challenge you complete becomes part of your personal discovery passport.',
              '每个打卡点与完成的挑战都会成为你个人探索护照的一部分。',
            )}
          </p>
          <ul className="plain-checks">
            <li>
              <Check size={16} />
              {c('Đánh dấu nhanh các điểm di sản đã ghé', 'Mark heritage stops you have visited', '快速标记到访遗产地点')}
            </li>
            <li>
              <Check size={16} />
              {c('Lưu trữ ngay trên trình duyệt thiết bị', 'Saved directly on your device browser', '直接保存在设备浏览器中')}
            </li>
            <li>
              <Check size={16} />
              {c('Tải bản lưu hộ chiếu bất cứ lúc nào', 'Download your passport keepsake anytime', '随时下载探索护照纪念')}
            </li>
          </ul>
          <Link className="text-link" href={`/${locale}/journey`}>
            {c('Xem hành trình của tôi', 'My saved journey', '我的收藏旅程')}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <PassportPreview locale={locale} />
      </section>

      <section className="startup-section container" id="pricing">
        <div className="center-heading">
          <p className="startup-eyebrow">PLANS & GUIDES</p>
          <h2>
            {c('Khám phá miễn phí. Mở rộng khi cần.', 'Explore free. Upgrade anytime.', '免费探索，按需升级。')}
          </h2>
          <p>
            {c(
              'Tra cứu danh mục và bản đồ hoàn toàn miễn phí, hoặc chọn gói hội viên để mở khóa toàn bộ tính năng nâng cao.',
              'Use the directory and map for free, or choose a plan to unlock full guides and member tools.',
              '免费使用目录与地图，或选择会员方案解锁完整指南与高级功能。',
            )}
          </p>
        </div>
        <Pricing locale={locale} />
      </section>

      <section className="startup-section container faq-layout">
        <div>
          <p className="startup-eyebrow">FAQ</p>
          <h2>{c('Câu hỏi thường gặp', 'Common questions', '常见问题')}</h2>
        </div>
        <div>
          {[
            [
              c(
                'Tôi có cần mua để dùng website?',
                'Do I have to pay to explore?',
                '需要付费才能使用网站吗？',
              ),
              c(
                'Không. Danh mục, tìm kiếm, bản đồ và đố vui cơ bản được mở miễn phí. Gói trả phí mở khóa hướng dẫn chuyên sâu và tiện ích nâng cao.',
                'No. The directory, search, map and basic quizzes are free. Paid plans unlock deep route guides and advanced member tools.',
                '不需要。目录、搜索、地图和基础问答免费开放。付费方案解锁深度路线指南与高级工具。',
              ),
            ],
            [
              c(
                'Đây có phải tour có hướng dẫn viên?',
                'Is this a guided group tour?',
                '这是有导游的团队游吗？',
              ),
              c(
                'Đây là nền tảng số để bạn tự khám phá theo nhịp riêng. Bạn chủ động chọn giờ đi và kiểm tra điều kiện mở cửa tại điểm đến.',
                'This is a digital self-guided platform. You choose your own pace and check venue opening hours before visiting.',
                '这是数字自助探索平台。你可以自由安排时间并在出发前确认景点开放情况。',
              ),
            ],
            [
              c(
                'Hộ chiếu có xác minh vị trí của tôi không?',
                'Does the passport verify my location?',
                '护照会验证我的位置吗？',
              ),
              c(
                'Dấu hộ chiếu mẫu trên trang chủ được lưu cục bộ trên trình duyệt làm kỷ niệm cá nhân. Khi check-in thử thách trên trang địa điểm, bạn có thể dùng GPS trong phạm vi 300 m.',
                'Preview stamps on the home page are stored locally in your browser. For challenge check-ins on place pages, optional GPS within 300 m is supported.',
                '首页预览印章保存在本地浏览器中作为个人纪念。在地点页面打卡挑战时支持 300 米内 GPS 验证。',
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
