import "dotenv/config";
import express from 'express';
import { prisma } from "./lib/prisma";
import './events/auth.events';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import { swaggerSpec } from './config/swagger';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHanndler';
import { authenticate } from "./middleware/auth";

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'DocuChat backend is running', health: '/health' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', authenticate, documentRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` },
  });
});

app.use(errorHandler);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

export default app;