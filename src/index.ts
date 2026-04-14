import "dotenv/config";
import express from 'express';
import { prisma } from "./lib/prisma";
import './events/auth.events';
import authRoutes from './routes/auth';

const port = Number(process.env.PORT ?? 4000);

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

// Register auth routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'DocuChat backend is running',
    health: '/health',
  });
});

let server: ReturnType<typeof app.listen>;

async function bootstrap() {
  await prisma.$connect();
  server = app.listen(port, () => {
    console.log(`DocuChat backend running on http://localhost:${port}`);
  });
}

bootstrap().catch(async (error) => {
  console.error('Failed to start backend:', error);
  await prisma.$disconnect();
  process.exit(1);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
