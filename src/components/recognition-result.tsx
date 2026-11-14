'use client';
import Link from 'next/link';
import { ScanLine, ArrowUpRight, MapPin, Sparkles, Info } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';
import { formatDistance } from '@/lib/routing';
import type { RecognitionResult } from '@/lib/recognition';
import type { Locale } from '@/lib/types';
import { Photo } from './ui';

export function RecognitionResultView({
  result,
  locale,
}: {
  result: RecognitionResult;
  locale: Locale;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const { subject, place } = result;
  const hasMatch = result.candidates.length > 0;
  return (
    <section className="recognition-result" aria-live="polite">
      <p className="eyebrow">
        <Sparkles size={16} />
        {c('AI PHÂN TÍCH', 'AI ANALYSIS', 'AI 分析')}
      </p>

      {subject ? (
        <div className="lens-answer">
          <h2>{subject.name}</h2>
          <p className="lens-answer-tags">
            {subject.category && <span className="lens-tag">{subject.category}</span>}
            <span className={`lens-tag certainty-${subject.certainty}`}>
              {subject.certainty === 'high'
                ? c('Khá chắc chắn', 'Fairly certain', '较为确定')
                : subject.certainty === 'medium'
                  ? c('Có khả năng', 'Likely', '可能')
                  : c('Chưa chắc chắn', 'Uncertain', '不确定')}
            </span>
          </p>
          <h3>{c('Đây là gì?', 'What is it?', '这是什么？')}</h3>
          <p>{subject.whatItIs}</p>
          {subject.generalUse && (
            <>
              <h3>{c('Thường dùng để làm gì?', 'What is it normally for?', '通常有什么用途？')}</h3>
              <p>{subject.generalUse}</p>
            </>
          )}
          <h3>
            {c('Ở vị trí này, nó để làm gì?', 'What is it for at this spot?', '在这个位置它有什么作用？')}
          </h3>
          {place?.label && (
            <p className="lens-place">
              <MapPin size={14} aria-hidden="true" />
              <span>
                {place.feature ? `${place.feature} · ` : ''}
                {place.label}
              </span>
            </p>
          )}
          {subject.purposeHere ? (
            <p>{subject.purposeHere}</p>
          ) : (
            <p className="help-text">
              {result.location.provided
                ? c(
                    'Chưa đủ căn cứ để nói vai trò của vật tại đúng vị trí này. Hãy chụp thêm bối cảnh xung quanh hoặc biển tên gần đó.',
                    'Not enough evidence to say what it does at this exact spot. Try including more of the surroundings or a nearby sign.',
                    '依据不足，无法说明它在此处的作用。请拍下更多周围环境或附近的标牌。',
                  )
                : c(
                    'Chưa có vị trí của thiết bị nên AI chỉ trả lời theo hình ảnh. Bật quyền vị trí cho trang này rồi chụp lại để biết vật này phục vụ gì ở nơi bạn đứng.',
                    'The device location was not available, so the AI answered from the image alone. Allow location for this site and shoot again to learn what it is for where you stand.',
                    '未获取到设备位置，AI 仅根据图片作答。请允许本站使用位置后重新拍摄。',
                  )}
            </p>
          )}
          {result.origin === 'gallery' && result.location.provided && (
            <p className="help-text">
              {c(
                'Ảnh lấy từ thư viện: vị trí hiện tại của bạn có thể khác nơi chụp ảnh.',
                'Picked from your library: where you are now may differ from where the photo was taken.',
                '图片来自相册：你当前的位置可能与拍摄地点不同。',
              )}
            </p>
          )}
          {result.location.quality === 'approximate' && (
            <p className="help-text">
              {c(
                'Tín hiệu định vị đang yếu nên vị trí chỉ gần đúng.',
                'Positioning is weak right now, so the location is only approximate.',
                '当前定位信号较弱，位置仅为大致范围。',
              )}
            </p>
          )}
        </div>
      ) : (
        <h2>{c('Chưa nhận ra vật trong ảnh', 'Could not make out the subject', '未能识别图片中的物体')}</h2>
      )}

      <h3>{t(locale, 'evidence')}</h3>
      <p>{result.observation}</p>
      {result.visibleText.length > 0 && (
        <p>
          <strong>{t(locale, 'lensVisibleText')}: </strong>
          {result.visibleText.join(' · ')}
        </p>
      )}

      {result.objects.length > 0 && (
        <div className="recognition-objects">
          <h3>{t(locale, 'lensObjects')}</h3>
          {result.objects.map((object, index) => (
            <article key={index}>
              <h4>{object.name}</h4>
              <p>{object.description}</p>
              {object.purpose && (
                <p>
                  <strong>{c('Công dụng: ', 'Purpose: ', '用途：')}</strong>
                  {object.purpose}
                </p>
              )}
              {object.placeId && (
                <p className="help-text">
                  {
                    result.candidates.find((candidate) => candidate.id === object.placeId)?.entry
                      .name
                  }
                </p>
              )}
              {object.culturalContext && <p>{object.culturalContext}</p>}
            </article>
          ))}
        </div>
      )}

      <div className="lens-catalog">
        <p className="eyebrow">
          <ScanLine size={16} />
          {t(locale, 'possibleMatch')}
        </p>
        {hasMatch && (
          <h3>
            {t(
              locale,
              result.assessment === 'nearby_match'
                ? 'lensNearby'
                : result.assessment === 'location_conflict'
                  ? 'lensConflict'
                  : result.assessment === 'visual_only'
                    ? 'lensVisualOnly'
                    : 'lensUncertain',
            )}
          </h3>
        )}
        {hasMatch ? (
          result.candidates.map((candidate) => {
            const entry = candidate.entry;
            return (
              <div className="recognition-match" key={candidate.id}>
                <Photo entry={entry} />
                <div>
                  <Link href={`/${locale}/explore/${entry.slug}`}>
                    <h4 className="recognition-match-name">
                      {entry.name} <ArrowUpRight size={17} />
                    </h4>
                  </Link>
                  <p style={{ margin: '2px 0 8px' }}>
                    <Link
                      className="text-link"
                      href={`/${locale}/map?focus=${encodeURIComponent(entry.slug)}`}
                    >
                      <MapPin size={14} /> {t(locale, 'mapView')} <ArrowUpRight size={13} />
                    </Link>
                  </p>
                  <p>{candidate.reason}</p>
                  <ul>
                    {candidate.evidence.map((evidence, index) => (
                      <li key={index}>{evidence}</li>
                    ))}
                  </ul>
                  {entry.address && <p className="help-text">{entry.address}</p>}
                  {candidate.distanceMeters !== null && (
                    <p className="help-text">
                      {c('Cách bạn khoảng', 'About', '距你约')}{' '}
                      {formatDistance(candidate.distanceMeters, locale)}
                      {c('', ' away', '')} ·{' '}
                      {t(
                        locale,
                        candidate.locationAssessment === 'nearby'
                          ? 'lensNearCandidate'
                          : candidate.locationAssessment === 'conflict'
                            ? 'lensFarCandidate'
                            : 'lensWeakCandidate',
                      )}
                    </p>
                  )}
                  {entry.sources.length > 0 && (
                    <details>
                      <summary>{t(locale, 'sources')}</summary>
                      <ul>
                        {entry.sources.map((source, index) => (
                          <li key={index}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="help-text">
            {c(
              'Chưa có hồ sơ nào trong danh bạ THÁM VĂN khớp với ảnh này.',
              'No record in the THÁM VĂN archive matches this photo yet.',
              'THÁM VĂN 档案中暂无与此图片相符的记录。',
            )}
          </p>
        )}
      </div>

      {place && place.nearby.length > 0 && (
        <div className="lens-nearby">
          <h3>{c('Quanh bạn có', 'Around you', '你周围有')}</h3>
          <ul>
            {place.nearby.map((poi, index) => (
              <li key={index}>
                <span>{poi.name}</span>
                <small>{formatDistance(poi.distanceMeters, locale)}</small>
              </li>
            ))}
          </ul>
          <Link className="text-link" href={`/${locale}/map`}>
            <MapPin size={14} /> {t(locale, 'mapView')} <ArrowUpRight size={13} />
          </Link>
          <p className="help-text">
            {c('Dữ liệu địa điểm: © OpenStreetMap', 'Place data: © OpenStreetMap', '地点数据：© OpenStreetMap')}
          </p>
        </div>
      )}

      {result.limitations.length > 0 && (
        <div>
          <h3>{t(locale, 'lensLimitations')}</h3>
          <ul>
            {result.limitations.map((limitation, index) => (
              <li key={index}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="lens-disclaimer">
        <Info size={14} aria-hidden="true" />
        {c(
          'AI có thể nhầm. Hãy đối chiếu với biển chỉ dẫn và nguồn chính thức tại chỗ.',
          'AI can be wrong. Check against on-site signage and official sources.',
          'AI 可能出错，请以现场标识和官方信息为准。',
        )}
      </p>
    </section>
  );
}
