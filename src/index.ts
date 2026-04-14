import "dotenv/config";
import { createServer } from "node:http";
import { prisma } from "./lib/prisma";

const port = Number(process.env.PORT ?? 4000);

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", database: "connected" }));
    } catch {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "error", database: "disconnected" }));
    }
    return;
  }

  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      message: "DocuChat backend is running",
      health: "/health",
    }),
  );
});

async function bootstrap() {
  await prisma.$connect();
  server.listen(port, () => {
    console.log(`DocuChat backend running on http://localhost:${port}`);
  });
}

bootstrap().catch(async (error) => {
  console.error("Failed to start backend:", error);
  await prisma.$disconnect();
  process.exit(1);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
