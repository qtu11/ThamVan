import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowUpRight, Download, LockKeyhole, Clock3, MapPin } from 'lucide-react';
import { getCatalog } from '@/lib/data';
import { isLocale, textFor } from '@/lib/types';
import { copy, money } from '@/lib/locale-copy';
import { findExperience, experienceText, products } from '@/data/experiences';
import { guideFor } from '@/data/walk-guides';
import { ownsExperience } from '@/lib/commerce';
export default async function Walk({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ time?: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const experience = findExperience(slug);
  if (!experience) notFound();
  const [entries, owned, query] = await Promise.all([
    getCatalog(),
    ownsExperience(slug),
    searchParams,
  ]);
  const stops = experience.stops
    .map((stop) => entries.find((entry) => entry.slug === stop))
    .filter((entry) => entry !== undefined);
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  return (
    <div className="container commerce-body">
      <div className="commerce-heading">
        <Link className="text-link" href={`/${locale}/experiences`}>
          ← {c('Các hành trình', 'All story walks', '全部路线')}
        </Link>
        <p className="startup-eyebrow" style={{ marginTop: 25 }}>
          STORY WALK / {experience.theme.toUpperCase()}
        </p>
        <h1>{experienceText(experience.title, locale)}</h1>
        <p>{experienceText(experience.description, locale)}</p>
        <p className="experience-meta">
          <span>
            <Clock3 size={14} />
            {experience.minutes} {c('phút dự kiến', 'estimated min', '分钟（估计）')}
          </span>
          <span>
            <MapPin size={14} />
            {stops.length} {c('điểm dừng', 'stops', '站')}
          </span>
        </p>
      </div>
      <div className="walk-hero">
        <Image
          src={experience.image}
          alt={experienceText(experience.title, locale)}
          fill
          sizes="90vw"
          priority
        />
      </div>
      <div className="walk-layout">
        <div>
          <h2>{c('Câu chuyện trên từng bước chân', 'A story at every stop', '每一步都有故事')}</h2>
          {query.time && Number(query.time) < experience.minutes && (
            <div className="walk-logistics">
              <p>
                {c(
                  `Bạn chọn ${query.time === '90' ? '90' : '150'} phút. Toàn tuyến dự kiến ${experience.minutes} phút; hãy chọn một phần tuyến hoặc dành thêm thời gian, không cần đi vội.`,
                  `Your selected time is shorter than this walk’s estimated ${experience.minutes} minutes. Explore part of the route or allow more time.`,
                  `你选择的时间短于本路线预计的${experience.minutes}分钟。可探索部分路线或安排更多时间。`,
                )}
              </p>
            </div>
          )}
          <div className="walk-logistics">
            <p>
              {c(
                'Tự khám phá, không có hướng dẫn viên. Thời gian chưa tính chờ đợi, ăn uống và tham quan trong nhà. Kiểm tra giờ mở cửa, vé riêng và tuyến đi thực tế trước khi đi. Các địa điểm có thể thay đổi.',
                'Self-guided, with no accompanying guide. Times exclude queues, meals and indoor visits. Check opening hours, admission and the actual route before setting off. Places may change.',
                '自助漫步，无随行导游。时长不含排队、用餐及室内参观。出发前请确认开放时间、门票和实际路线。地点信息可能变化。',
              )}
            </p>
          </div>
          {stops.map((stop, index) => {
            const visible = owned || index === 0;
            const guide = visible ? guideFor(stop.slug, locale) : null;
            return (
              <article key={stop.slug} className={`walk-stop ${visible ? '' : 'locked-stop'}`}>
                <h3>
                  <span>{index + 1}</span>
                  {stop.name}
                  {!visible && <LockKeyhole size={14} />}
                </h3>
                {visible && (
                  <>
                    <p>{textFor(stop.translations, locale).summary}</p>
                    <div className="walk-task">
                      <strong>{c('Dừng lại và quan sát', 'Pause and notice', '停下观察')}</strong>
                      {guide?.observation}
                    </div>
                    <p>{guide?.reflection}</p>
                    <Link href={`/${locale}/explore/${stop.slug}`} className="text-link">
                      {c(
                        'Đọc tư liệu & nguồn tham khảo',
                        'Read background and sources',
                        '阅读资料与来源',
                      )}
                      <ArrowUpRight size={14} />
                    </Link>
                  </>
                )}
              </article>
            );
          })}
          {!owned && (
            <div className="walk-lock">
              <LockKeyhole size={22} />
              <h3>
                {c(
                  'Đó mới là điểm dừng đầu tiên.',
                  'That’s just the first stop.',
                  '这只是第一站。',
                )}
              </h3>
              <p>
                {c(
                  'Mở bộ hướng dẫn để đọc nhiệm vụ quan sát của toàn tuyến và tải bản văn bản về thiết bị. Danh mục tư liệu địa điểm vẫn miễn phí.',
                  'Unlock every observation prompt and download a text copy of the route. The place directory remains free.',
                  '解锁所有观察任务并下载路线文本。地点目录仍然免费。',
                )}
              </p>
              <Link className="button" href={`/${locale}/checkout?plan=premium`}>
                {c('Xem bộ hướng dẫn', 'View guide pack', '查看指南')}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
        </div>
        <aside className="walk-sidebar">
          <p className="startup-eyebrow">YOUR NEXT STORY</p>
          <h2>
            {c(
              'Một gói tháng. Nhiều câu chuyện.',
              'One monthly plan. More stories.',
              '每月套餐，更多故事。',
            )}
          </h2>
          <div className="walk-price">{money(products.walk.amount, locale)} / tháng</div>
          <p>
            {c(
              'Đọc và tải toàn bộ bộ hướng dẫn trong thời hạn Premium hoặc Family. Không tự gia hạn.',
              'Read and download all guides during an active Premium or Family term. No automatic renewal.',
              'Premium或Family有效期内可阅读和下载全部指南，不自动续费。',
            )}
          </p>
          {owned ? (
            <a className="button" href={`/api/experiences/${slug}/download?locale=${locale}`}>
              <Download size={16} />
              {c('Tải hướng dẫn', 'Download guide', '下载指南')}
            </a>
          ) : (
            <Link className="button" href={`/${locale}/checkout?plan=premium`}>
              {c('Xem chi tiết mua', 'View checkout', '查看购买详情')}
              <ArrowUpRight size={16} />
            </Link>
          )}
          <Link className="text-link" href={`/${locale}/map`}>
            {c('Mở bản đồ địa điểm', 'Open place map', '打开地点地图')}
            <ArrowUpRight size={14} />
          </Link>
          <p className="section-caption">
            {c(
              'Không bao gồm vé, ăn uống, vận chuyển hoặc quyền vào khu vực hạn chế. Nội dung tham khảo; các bài tập là gợi ý biên soạn.',
              'Admission, food, transport and restricted-area access are excluded. Background is reference material; tasks are editorial suggestions.',
              '不包含门票、餐饮、交通或限制区域权限。背景为参考资料，任务为编辑建议。',
            )}
          </p>
        </aside>
      </div>
    </div>
  );
}
