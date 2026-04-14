import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};
function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL!;
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
}
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}