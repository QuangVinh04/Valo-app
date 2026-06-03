import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import env from './config/env.js';
import { appRoutes } from './routes.js';
import { swaggerDocument } from './config/swagger.js';
import { requestLogger } from './middlewares/request-logger.middleware.js';
import { globalErrorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerDocument);
});

appRoutes(app);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
