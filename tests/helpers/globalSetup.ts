import { execSync } from 'child_process';

// Run migrations against the test database before any tests.
export default async function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: 'file:./prisma/test.db',
    },
    stdio: 'inherit',
  });
}