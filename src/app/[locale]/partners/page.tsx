import { headers } from 'next/headers';
import { GraduationCap, Hotel, Building2, Check } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import { isLocale } from '@/lib/types';
import { commerceStorageReady } from '@/lib/commerce';
import { LeadForm } from '@/components/commerce/lead-form';
export default async function Partners({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'vi';
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const nonce = (await headers()).get('x-nonce') || undefined;
  const captchaReady =
    process.env.NODE_ENV !== 'production' ||
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
  return (
    <div className="container">
      <div className="commerce-heading">
        <p className="startup-eyebrow">THÁM VĂN FOR BUSINESS</p>
        <h1>
          {c(
            'Biến văn hóa thành một trải nghiệm đáng nhớ.',
            'Turn local culture into a memorable experience.',
            '让本地文化成为难忘的体验。',
          )}
        </h1>
        <p>
          {c(
            'Một điểm đến, nhiều cách kết nối. Cùng thiết kế hành trình phù hợp với khách, học sinh hoặc đội ngũ của bạn.',
            'One city, many ways to connect. Design a walk around your guests, students or team.',
            '一座城市，多种连接。为宾客、学生或团队设计适合的路线。',
          )}
        </p>
      </div>
      <div className="business-grid">
        <div className="business-offers">
          {[
            [
              GraduationCap,
              c('Học tập qua trải nghiệm', 'Learning through discovery', '在探索中学习'),
              c(
                'Tuyến khám phá theo chủ đề, phiếu quan sát và nội dung thảo luận. Giáo viên giữ quyền tổ chức và kiểm duyệt mục tiêu học tập.',
                'Themed routes, observation worksheets and discussion prompts. Teachers retain responsibility for organization and learning goals.',
                '主题路线、观察记录与讨论提示。教师负责组织安排和学习目标审核。',
              ),
            ],
            [
              Hotel,
              c(
                'City guide mang dấu ấn riêng',
                'A city guide with your identity',
                '有你特色的城市指南',
              ),
              c(
                'Bộ hành trình từ điểm lưu trú, nội dung song ngữ và mã QR mở hướng dẫn. Phạm vi, giấy phép và cập nhật được thống nhất theo hợp đồng.',
                'Walks from your property, bilingual content and QR access. Scope, licensing and updates are agreed in the contract.',
                '从住宿点出发的路线、双语内容和二维码入口。范围、许可与更新按合同约定。',
              ),
            ],
            [
              Building2,
              c(
                'Kết nối đội ngũ với thành phố',
                'Connect your team with the city',
                '让团队连接城市',
              ),
              c(
                'Hành trình văn hóa và nhiệm vụ quan sát theo nhóm. Báo giá riêng theo số người, nội dung biên soạn và mức hỗ trợ.',
                'Cultural trails and group observation tasks. Quotes depend on group size, editorial work and support scope.',
                '文化路线与小组观察任务，按人数、内容制作及支持范围单独报价。',
              ),
            ],
          ].map(([Icon, title, body], index) => {
            const Symbol = Icon as typeof Hotel;
            return (
              <article className="walk-stop" key={index}>
                <Symbol size={28} />
                <h2 style={{ fontSize: 22, marginTop: 15 }}>{title as string}</h2>
                <p>{body as string}</p>
              </article>
            );
          })}
          <ul className="plain-checks">
            <li>
              <Check size={16} />
              {c(
                'Thống nhất phạm vi trước khi báo giá',
                'Agree the scope before quoting',
                '报价前确认范围',
              )}
            </li>
            <li>
              <Check size={16} />
              {c(
                'Không bán thông tin cá nhân của người tham gia',
                'Participant data is not sold',
                '不出售参与者个人资料',
              )}
            </li>
          </ul>
          {process.env.COMMERCE_SUPPORT_EMAIL && (
            <a className="text-link" href={`mailto:${process.env.COMMERCE_SUPPORT_EMAIL}`}>
              {c('Liên hệ qua email', 'Contact by email', '通过邮件联系')}
            </a>
          )}
        </div>
        <LeadForm locale={locale} nonce={nonce} ready={commerceStorageReady() && captchaReady} />
      </div>
    </div>
  );
}
