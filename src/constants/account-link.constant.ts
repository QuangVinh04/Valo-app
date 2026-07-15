export const ACCOUNT_LINK_TYPE = {
  INVITE: 'INVITE',
  RESET_PASSWORD: 'RESET_PASSWORD'
} as const;

export type AccountLinkType = (typeof ACCOUNT_LINK_TYPE)[keyof typeof ACCOUNT_LINK_TYPE];
