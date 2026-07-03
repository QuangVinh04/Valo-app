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