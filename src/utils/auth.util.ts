import bcrypt from 'bcryptjs';
import crypto from 'crypto';


/**
 * Hàm băm chuỗi (Dùng khi Đăng ký / Đổi mật khẩu)
 */
export const hashString = async (password: string) => {
  const saltRounds = 10; // Độ an toàn tiêu chuẩn
  return await bcrypt.hash(password, saltRounds);
};


export const compareString = async (plainPassword: string, hashedPassword: string) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};


export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
