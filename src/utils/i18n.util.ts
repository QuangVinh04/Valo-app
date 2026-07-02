export type SupportedLanguage = 'en' | 'vi';

const fallbackLanguage: SupportedLanguage = 'en';

const messages = {
  en: {
    INTERNAL_SERVER_ERROR: 'Internal server error',
    VALIDATION_FAILED: 'Validation failed',
    BAD_REQUEST: 'Bad request',
    UNAUTHORIZED: 'Unauthorized',
    ACCESS_FORBIDDEN: 'Access forbidden',
    ROUTE_NOT_FOUND: 'Route not found',
    RATE_LIMIT_EXCEEDED: 'Too many requests',
    FORBIDDEN: 'Forbidden',
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_IN_USE: 'Email already in use',
    INVALID_CREDENTIALS: 'Invalid email or password',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    PASSWORD_TOO_SHORT: 'Password too short',
    INVALID_EXPIRED_OTP: 'Invalid or expired OTP',
    ORIGIN_HEADER_IS_MISSING: 'Origin header is missing',
    INVALID_TOKEN: 'Invalid token',
    EMAIL_SEND_FAILED: 'Email send failed',
    GROUP_NOT_FOUND: 'Group not found',
    GROUP_NAME_ALREADY_IN_USE: 'Group name already in use',
    CONVERSATION_NOT_FOUND: 'Conversation not found',
    MESSAGE_NOT_FOUND: 'Message not found',
    AUTH_HEADER_MISSING: 'Authorization header missing or malformed',
    INVALID_TOKEN_PAYLOAD: 'Invalid token payload',
    ACCESS_DENIED_NO_PERMISSIONS: 'Access denied. No permissions found.',
    ACCESS_DENIED_INSUFFICIENT_PERMISSIONS: 'Access denied. Insufficient permissions.',
    REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
    NO_REFRESH_TOKEN_FOUND: 'No refresh token found for user',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token',
    CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
    NEW_PASSWORD_SAME_AS_CURRENT: 'New password must be different from current password',
    PASSWORD_CONFIRM_MISMATCH: 'New password and confirm password do not match',
    FULL_NAME_REQUIRED: 'fullName is required',
    INVALID_EMAIL: 'Invalid email',
    INVALID_USERNAME: 'Invalid username',
    PASSWORD_REQUIRED: 'password is required',
    NEW_PASSWORD_MIN: 'newPassword must be at least 8 characters',
    NEW_PASSWORD_MAX: 'newPassword must be at most 128 characters',
    NEW_PASSWORD_UPPERCASE: 'newPassword must contain at least one uppercase letter',
    NEW_PASSWORD_LOWERCASE: 'newPassword must contain at least one lowercase letter',
    NEW_PASSWORD_NUMBER: 'newPassword must contain at least one number',
    NEW_PASSWORD_SYMBOL: 'newPassword must contain at least one symbol',
    CONFIRM_PASSWORD_MIN: 'confirmPassword must be at least 8 characters',
  },
  vi: {
    INTERNAL_SERVER_ERROR: 'Lỗi máy chủ nội bộ',
    VALIDATION_FAILED: 'Dữ liệu không hợp lệ',
    BAD_REQUEST: 'Yêu cầu không hợp lệ',
    UNAUTHORIZED: 'Chưa xác thực',
    ACCESS_FORBIDDEN: 'Không có quyền truy cập',
    ROUTE_NOT_FOUND: 'Không tìm thấy đường dẫn',
    RATE_LIMIT_EXCEEDED: 'Quá nhiều yêu cầu',
    FORBIDDEN: 'Không được phép',
    USER_NOT_FOUND: 'Không tìm thấy người dùng',
    EMAIL_ALREADY_IN_USE: 'Email đã được sử dụng',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
    MISSING_REQUIRED_FIELDS: 'Thiếu thông tin bắt buộc',
    PASSWORD_TOO_SHORT: 'Mật khẩu quá ngắn',
    INVALID_EXPIRED_OTP: 'OTP không hợp lệ hoặc đã hết hạn',
    ORIGIN_HEADER_IS_MISSING: 'Thiếu Origin header',
    INVALID_TOKEN: 'Token không hợp lệ',
    EMAIL_SEND_FAILED: 'Gửi email thất bại',
    GROUP_NOT_FOUND: 'Không tìm thấy nhóm',
    GROUP_NAME_ALREADY_IN_USE: 'Tên nhóm đã được sử dụng',
    CONVERSATION_NOT_FOUND: 'Không tìm thấy cuộc trò chuyện',
    MESSAGE_NOT_FOUND: 'Không tìm thấy tin nhắn',
    AUTH_HEADER_MISSING: 'Thiếu hoặc sai định dạng Authorization header',
    INVALID_TOKEN_PAYLOAD: 'Nội dung token không hợp lệ',
    ACCESS_DENIED_NO_PERMISSIONS: 'Không có quyền truy cập. Không tìm thấy quyền.',
    ACCESS_DENIED_INSUFFICIENT_PERMISSIONS: 'Không có quyền truy cập. Bạn không đủ quyền.',
    REFRESH_TOKEN_REQUIRED: 'Refresh token là bắt buộc',
    NO_REFRESH_TOKEN_FOUND: 'Không tìm thấy refresh token của người dùng',
    INVALID_REFRESH_TOKEN: 'Refresh token không hợp lệ',
    CURRENT_PASSWORD_INCORRECT: 'Mật khẩu hiện tại không đúng',
    NEW_PASSWORD_SAME_AS_CURRENT: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    PASSWORD_CONFIRM_MISMATCH: 'Mật khẩu mới và mật khẩu xác nhận không khớp',
    FULL_NAME_REQUIRED: 'Họ và tên là bắt buộc',
    INVALID_EMAIL: 'Email không hợp lệ',
    INVALID_USERNAME: 'Tên đăng nhập không hợp lệ',
    PASSWORD_REQUIRED: 'Mật khẩu là bắt buộc',
    NEW_PASSWORD_MIN: 'Mật khẩu mới phải có ít nhất 8 ký tự',
    NEW_PASSWORD_MAX: 'Mật khẩu mới không được vượt quá 128 ký tự',
    NEW_PASSWORD_UPPERCASE: 'Mật khẩu mới phải có ít nhất một chữ hoa',
    NEW_PASSWORD_LOWERCASE: 'Mật khẩu mới phải có ít nhất một chữ thường',
    NEW_PASSWORD_NUMBER: 'Mật khẩu mới phải có ít nhất một chữ số',
    NEW_PASSWORD_SYMBOL: 'Mật khẩu mới phải có ít nhất một ký tự đặc biệt',
    CONFIRM_PASSWORD_MIN: 'Mật khẩu xác nhận phải có ít nhất 8 ký tự',
  },
} as const;

type MessageKey = keyof typeof messages.en;

const messageKeyByLegacyText: Record<string, MessageKey> = Object
  .entries(messages.en)
  .reduce<Record<string, MessageKey>>((acc, [key, message]) => {
    acc[message] = key as MessageKey;
    return acc;
  }, {});

export function resolveLanguage(acceptLanguage: string | string[] | undefined): SupportedLanguage {
  const header = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;

  if (header?.toLowerCase().startsWith('vi')) {
    return 'vi';
  }

  return fallbackLanguage;
}

export function translateMessage(
  language: SupportedLanguage,
  message: string,
  key?: string
): string {
  const messageKey = key && key in messages.en
    ? key as MessageKey
    : messageKeyByLegacyText[message];

  if (!messageKey) {
    return message;
  }

  return messages[language][messageKey] || messages[fallbackLanguage][messageKey] || message;
}
