import "dotenv/config";
import { prisma } from "./lib/prisma";
import app from "./app";

const port = Number(process.env.PORT ?? 4000);
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