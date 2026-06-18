import type { Express } from 'express';

import authRoutes from './routes/auth.routes.js';
import groupRoutes from './routes/group.routes.js';
import userRoutes from './routes/user.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import messageRoutes from './routes/message.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';


const BASE_AUTH_PATH = '/api/v1/auth';
const BASE_GROUP_PATH = '/api/v1/groups';
const BASE_USER_PATH = '/api/v1/users';
const BASE_CONVERSATION_PATH = '/api/v1/conversations';
const BASE_MESSAGE_PATH = '/api/v1/messages';
const BASE_ATTACHMENT_PATH = '/api/v1/attachments';

const appRoutes = (app: Express): void => {
  app.use(BASE_AUTH_PATH, authRoutes);
  app.use(BASE_GROUP_PATH, groupRoutes);
  app.use(BASE_USER_PATH, userRoutes);
  app.use(BASE_CONVERSATION_PATH, conversationRoutes);
  app.use(BASE_MESSAGE_PATH, messageRoutes);
  app.use(BASE_ATTACHMENT_PATH, attachmentRoutes);
};

export { appRoutes, BASE_AUTH_PATH, BASE_GROUP_PATH, BASE_USER_PATH, BASE_CONVERSATION_PATH, BASE_MESSAGE_PATH, BASE_ATTACHMENT_PATH };
