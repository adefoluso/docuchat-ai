import dotenv from 'dotenv';
import {prisma} from '../src/lib/prisma';
dotenv.config({ path: '.env.test' });
dotenv.config();

export async function resetDatabase() {
  await prisma.usageLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(overrides = {}) {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('TestPassword1!', 4);
  return prisma.user.create({
    data: {
      email: 'test@docuchat.dev',
      passwordHash: hash,
      ...overrides,
    },
  });
}
