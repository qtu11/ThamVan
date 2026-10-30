import { copy } from './locale-copy';
import type { Locale } from './types';
export function workspaceError(code: string, locale: Locale) {
  if (code === 'RATE_LIMIT') code = 'rateLimit';
  const errors: Record<string, [string, string, string]> = {
    FAMILY_FULL: [
      'Gia đình đã đủ 4 thành viên.',
      'Your family already has four members.',
      '家庭已满4人。',
    ],
    FAMILY_REQUIRED: [
      'Chức năng này cần gói Premium Family đang hiệu lực.',
      'An active Premium Family plan is required.',
      '需要有效的Premium Family套餐。',
    ],
    INVITE_INVALID: [
      'Lời mời không hợp lệ, đã dùng hoặc hết hạn.',
      'This invite is invalid, expired or already used.',
      '邀请无效、过期或已使用。',
    ],
    FAMILY_ALREADY_JOINED: [
      'Tài khoản đã thuộc một gia đình. Rời nhóm hiện tại trước khi tham gia nhóm khác.',
      'You already belong to a family. Leave it before joining another.',
      '你已属于一个家庭，请先退出再加入。',
    ],
    DAILY_CHALLENGE_LIMIT: [
      'Bạn đã dùng 5 thử thách hôm nay. Nâng cấp Premium để tiếp tục không giới hạn số thử thách.',
      'You have used five challenges today. Upgrade to Premium for unlimited challenges.',
      '今天已使用5次挑战，升级Premium可解锁无限挑战。',
    ],
    rateLimit: [
      'Bạn thao tác quá nhanh. Hãy chờ một chút rồi thử lại.',
      'Too many requests. Please wait and try again.',
      '请求过快，请稍后再试。',
    ],
    GPS_JUMP: [
      'Điểm GPS nhảy quá xa đã bị loại.',
      'An implausible GPS jump was rejected.',
      '已过滤异常GPS跳点。',
    ],
    tooFar: [
      'Bạn cần ở cách địa điểm không quá 300 m và có GPS chính xác.',
      'GPS check-in requires being within 300 m of the place.',
      'GPS签到需要距离地点300米以内。',
    ],
    aiUnavailable: [
      'AI lập lịch trình chưa được kết nối. Chưa có lịch trình nào được tạo.',
      'The AI planner is not connected. No itinerary was generated.',
      'AI规划器尚未连接，未生成行程。',
    ],
    itineraryFailed: [
      'AI chưa tạo được lịch trình hợp lệ. Không có bản đề xuất nào được lưu; hãy thử lại sau.',
      'AI could not produce a valid itinerary. No draft was saved; please try later.',
      'AI未生成有效行程，未保存草稿，请稍后重试。',
    ],
    insufficientPlaces: [
      'Khu vực và sở thích này chưa có đủ địa điểm để tạo lịch trình. Hãy đổi lựa chọn.',
      'There are not enough matching places. Please change the region or interests.',
      '符合条件的地点不足，请更换区域或兴趣。',
    ],
  };
  const value = errors[code];
  return value
    ? copy(locale, ...value)
    : copy(
        locale,
        'Thao tác chưa hoàn tất. Kiểm tra kết nối rồi thử lại.',
        'The action could not be completed. Check your connection and try again.',
        '操作未完成，请检查连接后重试。',
      );
}
