import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initLogger } from './middlewares/logging.js';
import router from './routes/routes.js';

dotenv.config();
const app = express();
const { requestLogger, detailedLogger } = initLogger();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(requestLogger); // Logging de requisições HTTP
app.use(detailedLogger); // Logging detalhado

// Rotas
app.use('/api', router);
app.get(['/healthcheck', '/api/healthcheck'], (req, res) => {
  res.status(200).json({ status: 'OK' });
});

export default app;
