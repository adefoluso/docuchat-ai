import { execSync } from 'child_process';

export default async function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: 'file:./prisma/test.db',
    },
    stdio: 'inherit',
  });
}