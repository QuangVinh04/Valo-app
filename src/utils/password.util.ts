import { randomInt } from 'node:crypto';

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*';
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

const pickRandomChar = (chars: string): string => chars[randomInt(chars.length)];

const shuffle = (value: string): string => {
  const chars = value.split('');

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
};

export const generateTemporaryPassword = (length = 12): string => {
  const password = [
    pickRandomChar(LOWERCASE),
    pickRandomChar(UPPERCASE),
    pickRandomChar(DIGITS),
    pickRandomChar(SYMBOLS),
  ];

  while (password.length < length) {
    password.push(pickRandomChar(ALL_CHARS));
  }

  return shuffle(password.join(''));
};
