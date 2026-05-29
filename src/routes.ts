import type { Express } from 'express';

import authRoutes from './routes/auth.routes.js';
import groupRoutes from './routes/group.routes.js';
import userRoutes from './routes/user.routes.js';
import conversationRoutes from './routes/conversation.routes.js';


const BASE_AUTH_PATH = '/api/v1/auth';
const BASE_GROUP_PATH = '/api/v1/groups';
const BASE_USER_PATH = '/api/v1/users';
const BASE_CONVERSATION_PATH = '/api/v1/conversations';

const appRoutes = (app: Express): void => {
  app.use(BASE_AUTH_PATH, authRoutes);
  app.use(BASE_GROUP_PATH, groupRoutes);
  app.use(BASE_USER_PATH, userRoutes);
  app.use(BASE_CONVERSATION_PATH, conversationRoutes);
};

export { appRoutes, BASE_AUTH_PATH, BASE_GROUP_PATH, BASE_USER_PATH, BASE_CONVERSATION_PATH };
