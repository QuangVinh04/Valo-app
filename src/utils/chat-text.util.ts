import { Role } from '@prisma/client';

export interface ChatContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildChatContext(
  history: Array<{ senderType: Role; content: string }>
): ChatContextMessage[] {
  return [
    {
      role: 'system',
      content: 'You are a helpful assistant.',
    },
    ...history.map(message => ({
      role: message.senderType,
      content: message.content,
    })),
  ];
}