export const PASSWORD_TOKEN_PURPOSE = {
  INVITATION: 'INVITATION',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD'
} as const;

export type PasswordTokenPurpose =
  (typeof PASSWORD_TOKEN_PURPOSE)[keyof typeof PASSWORD_TOKEN_PURPOSE];
