import Link from 'next/link';
import {
  ArrowUpRight,
  Camera,
  Compass,
  Map,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  Footprints,
  Building2,
  GraduationCap,
  Hotel,
  Check,
} from 'lucide-react';
import { getCatalog } from '@/lib/data';
import { isLocale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { HomeExperience } from '@/components/experience/home-experience';
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
      <section className="startup-section container" id="story-walks">
        <div className="startup-section-heading">
          <div>
            <p className="startup-eyebrow">THE STORY WALKS</p>
            <h2>
              {c(
                'Đi một vòng. Hiểu thêm một chút.',
                'A little walk. A deeper connection.',
                '走一小段，了解多一点。',
              )}
            </h2>
            <p>
              {c(
                'Hành trình có chủ đề, điểm dừng và những điều đáng để bạn dừng lại.',
                'Themed walks, thoughtful stops, and details worth slowing down for.',
                '主题路线、精心安排的停靠点，和值得驻足的细节。',
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
      <section className="why-section">
        <div className="container why-layout">
          <div>
            <p className="startup-eyebrow">LESS SCROLLING. MORE SAIGON.</p>
            <h2>
              {c(
                'Thành phố không thiếu điểm đến.',
                'The city has plenty of places.',
                '城市不缺目的地。',
              )}
              <br />
              <span>
                {c('Chỉ thiếu một cách để cảm.', 'Find a way to feel them.', '只缺一种感受方式。')}
              </span>
            </h2>
            <p>
              {c(
                'Không cần gom hai mươi tab để lên một buổi đi chơi. Bắt đầu bằng một hành trình vừa vặn, dành chỗ cho những khám phá ngẫu hứng.',
                'Skip the twenty open tabs. Start with a walk that fits your day, with room for the unexpected.',
                '不用打开二十个标签规划出游。从适合你的一条路线开始，给偶遇留点空间。',
              )}
            </p>
            <Link href={`/${locale}/map`} className="text-link">
              {c('Mở bản đồ khám phá', 'Open the discovery map', '打开探索地图')}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="difference-list">
            {[
              [
                Compass,
                c('Có gu, có chiều sâu', 'Your mood, with meaning', '有品味，有深度'),
                c(
                  'Chọn văn hóa, kiến trúc hoặc nhịp sống địa phương. Mỗi hành trình có một câu chuyện xuyên suốt.',
                  'Choose culture, architecture or local life. Every walk follows a thread.',
                  '选择文化、建筑或本地生活。每条路线都有连贯的故事。',
                ),
              ],
              [
                ShieldCheck,
                c('Tò mò, nhưng có căn cứ', 'Curiosity, with context', '好奇，有据可循'),
                c(
                  'Mở tư liệu gốc để đối chiếu. Nội dung tham khảo luôn được phân biệt với thông tin đã thẩm định.',
                  'Follow the source. Reference material stays clearly distinguished from reviewed content.',
                  '查看原始来源。参考资料与审核内容明确区分。',
                ),
              ],
              [
                Footprints,
                c('Mang về hơn một tấm ảnh', 'Bring back more than photos', '收获不止照片'),
                c(
                  'Nhiệm vụ quan sát và dấu hành trình biến điều bạn vừa thấy thành ký ức của chính mình.',
                  'Observation prompts and personal stamps turn what you see into something you remember.',
                  '观察任务与个人印章，让见闻成为自己的记忆。',
                ),
              ],
            ].map(([Icon, title, body], index) => {
              const Symbol = Icon as typeof Compass;
              return (
                <article key={index}>
                  <span className="difference-icon">
                    <Symbol size={23} />
                  </span>
                  <div>
                    <h3>{title as string}</h3>
                    <p>{body as string}</p>
                  </div>
                  <MoveUpRight size={18} />
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="startup-section container passport-layout">
        <div>
          <p className="startup-eyebrow">YOUR CULTURAL PASSPORT</p>
          <h2>
            {c('Bộ sưu tập này,', 'A collection', '这个收藏，')}
            <br />
            <span className="serif-accent">
              {c('chỉ bạn mới có.', 'only you can make.', '只有你能拥有。')}
            </span>
          </h2>
          <p>
            {c(
              'Một thành phố. Nhiều lần đầu. Mỗi điểm dừng bạn đánh dấu trở thành một phần trong hộ chiếu khám phá của riêng bạn.',
              'One city. So many firsts. Each stop you mark becomes part of your personal discovery passport.',
              '一座城市，无数初次。每个打卡点都成为你专属探索护照的一部分。',
            )}
          </p>
          <ul className="plain-checks">
            <li>
              <Check size={16} />
              {c(
                'Đánh dấu những nơi bạn đã ghé',
                'Mark the places you have visited',
                '标记到访地点',
              )}
            </li>
            <li>
              <Check size={16} />
              {c(
                'Giữ dấu hành trình trên thiết bị',
                'Keep your stamps on this device',
                '在设备上保存足迹',
              )}
            </li>
            <li>
              <Check size={16} />
              {c('Tải kỷ niệm, mang câu chuyện về', 'Download a little keepsake', '下载探索纪念')}
            </li>
          </ul>
          <Link className="text-link" href={`/${locale}/journey`}>
            {c('Xem hành trình của tôi', 'My saved journey', '我的收藏旅程')}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <PassportPreview locale={locale} />
      </section>
      <section className="tools-strip container">
        <Link href={`/${locale}/camera`}>
          <span>
            <Camera size={24} />
          </span>
          <div>
            <small>THÁM VĂN LENS</small>
            <h3>
              {c('Tò mò về một công trình?', 'Curious about a building?', '对一座建筑感到好奇？')}
            </h3>
            <p>
              {c(
                'Mở công cụ tìm hiểu qua ảnh',
                'Explore the photo discovery tool',
                '试试图片探索工具',
              )}
            </p>
          </div>
          <ArrowUpRight size={22} />
        </Link>
        <Link href={`/${locale}/explore`}>
          <span>
            <Map size={24} />
          </span>
          <div>
            <small>THE CITY ATLAS</small>
            <h3>
              {c(
                'Cả thành phố trong tầm tay.',
                'Your city, at your fingertips.',
                '整座城市，触手可及。',
              )}
            </h3>
            <p>
              {c(
                'Tra cứu danh mục địa điểm miễn phí',
                'Browse the free place directory',
                '免费浏览地点目录',
              )}
            </p>
          </div>
          <ArrowUpRight size={22} />
        </Link>
      </section>
      <section className="startup-section container" id="pricing">
        <div className="center-heading">
          <p className="startup-eyebrow">SMALL PRICE. BIG DISCOVERIES.</p>
          <h2>
            {c('Một hành trình xứng đáng.', 'Make the next walk count.', '让下一次漫步更值得。')}
          </h2>
          <p>
            {c(
              'Khám phá miễn phí. Chọn bộ hướng dẫn khi bạn muốn đi sâu hơn.',
              'Explore for free. Choose a guide when you want to go a little deeper.',
              '免费探索，想了解更多时再选择指南。',
            )}
          </p>
        </div>
        <Pricing locale={locale} />
      </section>
      <section className="partner-banner container">
        <div>
          <p className="startup-eyebrow">THÁM VĂN FOR BUSINESS</p>
          <h2>
            {c('Đưa bản sắc vào', 'Bring local culture', '让本地文化融入')}
            <br />
            {c('trải nghiệm của bạn.', 'into your experience.', '你的体验。')}
          </h2>
          <p>
            {c(
              'Thiết kế hành trình học tập cho trường học, city guide cho khách sạn và trải nghiệm văn hóa cho đội ngũ.',
              'Learning trails for schools, city guides for hotels, and cultural experiences for teams.',
              '学校的学习路线、酒店的城市指南、团队的文化体验。',
            )}
          </p>
          <Link className="button" href={`/${locale}/partners`}>
            {c('Cùng tạo một hành trình', 'Let’s build a story walk', '一起设计路线')}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="partner-usecases">
          {[
            [
              GraduationCap,
              c('Trường học', 'Schools', '学校'),
              c('Học ngoài lớp học', 'Learning beyond the classroom', '走出课堂的学习'),
            ],
            [
              Hotel,
              c('Khách sạn', 'Hotels', '酒店'),
              c('Một city guide có bản sắc', 'A city guide with character', '有特色的城市指南'),
            ],
            [
              Building2,
              c('Doanh nghiệp', 'Teams', '企业'),
              c(
                'Kết nối đội ngũ qua văn hóa',
                'Connect your team through culture',
                '以文化连接团队',
              ),
            ],
          ].map(([Icon, title, body], index) => {
            const Symbol = Icon as typeof Hotel;
            return (
              <div key={index}>
                <Symbol size={25} />
                <span>
                  <strong>{title as string}</strong>
                  <small>{body as string}</small>
                </span>
                <ArrowUpRight size={17} />
              </div>
            );
          })}
        </div>
      </section>
      <section className="startup-section container faq-layout">
        <div>
          <p className="startup-eyebrow">A FEW GOOD QUESTIONS</p>
          <h2>{c('Trước khi lên đường.', 'Before you head out.', '出发之前。')}</h2>
          <Sparkles size={40} strokeWidth={1} />
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
                'Không. Danh mục, tìm kiếm và bản đồ được mở miễn phí. Bộ trả phí cung cấp hướng dẫn biên soạn theo tuyến, nhiệm vụ quan sát và bản tải về.',
                'No. The directory, search and map are free. Paid packs add a curated route guide, observation tasks and a downloadable copy.',
                '不需要。目录、搜索和地图免费。付费包增加路线指南、观察任务和下载版本。',
              ),
            ],
            [
              c(
                'Đây có phải tour có hướng dẫn viên?',
                'Is this a guided group tour?',
                '这是有导游的团队游吗？',
              ),
              c(
                'Đây là bộ hướng dẫn số để tự khám phá, không có hướng dẫn viên đi cùng. Bạn tự chọn giờ, kiểm tra giờ mở cửa, vé vào cổng và điều kiện di chuyển trước khi đi.',
                'These are digital, self-guided walks. Choose your own start time and check opening hours, admission and travel conditions before setting off.',
                '这是数字自助漫步，无随行导游。请自行选择时间，并提前确认开放时间、门票及出行条件。',
              ),
            ],
            [
              c(
                'Tôi nhận bộ hướng dẫn như thế nào?',
                'How do I receive my guide?',
                '如何获得指南？',
              ),
              c(
                'Khi mở bán và thanh toán được xác nhận, bộ hướng dẫn mở trong tài khoản đã mua. Bạn có thể đọc trên web hoặc tải bản văn bản để lưu ngoại tuyến.',
                'When sales are enabled and payment is verified, your guide opens in the purchasing account. Read online or download a text copy for offline use.',
                '开放购买且付款验证后，指南在购买账户中解锁。可在线阅读或下载文本离线使用。',
              ),
            ],
            [
              c(
                'Hộ chiếu có xác minh vị trí của tôi không?',
                'Does the passport verify my location?',
                '护照会验证我的位置吗？',
              ),
              c(
                'Không. Dấu hộ chiếu do bạn tự đánh dấu và lưu trên trình duyệt này. Đây là kỷ niệm cá nhân, không phải chứng nhận đến địa điểm hay quyền lợi đổi thưởng.',
                'No. You mark your own stamps, stored in this browser. They are personal keepsakes, not verified visits or reward entitlements.',
                '不会。印章由你手动标记并保存在浏览器中，仅作个人纪念，不是到访证明或奖励凭证。',
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
      <section className="closing-cta container">
        <span aria-hidden="true">✳</span>
        <h2>
          {c('Sài Gòn vẫn còn nhiều điều.', 'There’s more to this city.', '这座城市，还有很多。')}
          <br />
          <span className="serif-accent">
            {c('Ra ngoài, chạm một chút.', 'Go find your story.', '出发，寻找你的故事。')}
          </span>
        </h2>
        <Link className="button" href={`/${locale}/experiences`}>
          {c('Bắt đầu khám phá', 'Start exploring', '开始探索')}
          <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
